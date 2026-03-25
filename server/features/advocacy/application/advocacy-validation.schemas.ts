// ============================================================================
// ADVOCACY COORDINATION - Validation Schemas
// ============================================================================
// Validation schemas for advocacy and campaign inputs.
// Uses shared validation primitives for consistency.
// ============================================================================

import {
  CommonSchemas,
  createEnumSchema,
  DateRangeSchema,
  PaginationSchema,
  SearchSchema,
  z,
} from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Shared primitives — re-exported for consumers that import from this module
// ============================================================================

export { DateRangeSchema, PaginationSchema, SearchSchema };

// ============================================================================
// Local primitives
// ============================================================================

/**
 * Accepts US 5-digit and ZIP+4 formats.
 * Adjust the regex if the project targets non-US postal codes.
 */
const ZipCodeSchema = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format');

// ============================================================================
// Enums
// ============================================================================

export const CampaignTypeSchema = createEnumSchema([
  'petition',
  'letter_writing',
  'phone_banking',
  'social_media',
  'grassroots',
  'coalition',
  'awareness',
] as const);

export const CampaignStatusSchema = createEnumSchema([
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled',
] as const);

export const ActionTypeSchema = createEnumSchema([
  'sign_petition',
  'send_letter',
  'make_call',
  'share_social',
  'attend_event',
  'donate',
  'volunteer',
] as const);

export const TargetTypeSchema = createEnumSchema([
  'legislator',
  'committee',
  'agency',
  'official',
  'organization',
] as const);

// ============================================================================
// Campaign schemas
// ============================================================================

/**
 * Core campaign fields shared between Create and Update.
 * No defaults here — they are applied per-schema below so that
 * Zod's `.partial()` chaining does not collapse defaults to `never`.
 */
const CampaignBaseSchema = z.object({
  title:        CommonSchemas.title,
  description:  CommonSchemas.description,
  type:         CampaignTypeSchema,
  goal:         z.string().min(10).max(500),
  target_count: z.number().int().positive().optional(),
  tags:         z.array(z.string().max(50)).max(20).optional(),
  is_public:    z.boolean(),
});

export const CreateCampaignSchema = DateRangeSchema.merge(CampaignBaseSchema).extend({
  organizer_id: CommonSchemas.id,
  bill_id:      CommonSchemas.id.optional(),
  is_public:    z.boolean().default(true),
});

/**
 * All fields optional; status transitions are enforced server-side.
 * Derived from CampaignBaseSchema (not CreateCampaignSchema) to avoid
 * the `.default()` → `.partial()` type collapse bug in Zod v3.
 */
export const UpdateCampaignSchema = CampaignBaseSchema
  .extend({
    status:   CampaignStatusSchema,
    end_date: z.string().datetime(),
  })
  .partial();

export const GetCampaignsSchema = PaginationSchema.extend({
  type:         CampaignTypeSchema.optional(),
  status:       CampaignStatusSchema.optional(),
  bill_id:      CommonSchemas.id.optional(),
  organizer_id: CommonSchemas.id.optional(),
  tags:         z.array(z.string().max(50)).max(20).optional(),
  active_only:  z.boolean().default(false),
});

export const SearchCampaignsSchema = PaginationSchema.extend({
  query:  CommonSchemas.searchQuery,
  type:   CampaignTypeSchema.optional(),
  status: CampaignStatusSchema.optional(),
});

// ============================================================================
// Action schemas
// ============================================================================

/** Metadata carried alongside a recorded advocacy action. */
const ActionMetadataSchema = z.object({
  message:         z.string().max(5_000).optional(),
  phone_number:    CommonSchemas.phone.optional(),
  email_sent:      z.boolean().optional(),
  social_platform: z.string().max(50).optional(),
});

const RecordActionBaseSchema = z.object({
  campaign_id: CommonSchemas.id,
  user_id:     CommonSchemas.id,
  action_type: ActionTypeSchema,
  target_id:   CommonSchemas.id.optional(),
  target_type: TargetTypeSchema.optional(),
  metadata:    ActionMetadataSchema.optional(),
});

export const RecordActionSchema = RecordActionBaseSchema.refine(
  (d: z.infer<typeof RecordActionBaseSchema>) =>
    (d.target_id == null) === (d.target_type == null),
  {
    message: 'target_id and target_type must both be present or both absent',
    path: ['target_type'],
  },
);

export const GetActionsSchema = PaginationSchema.extend({
  campaign_id: CommonSchemas.id.optional(),
  user_id:     CommonSchemas.id.optional(),
  action_type: ActionTypeSchema.optional(),
  start_date:  z.string().datetime().optional(),
  end_date:    z.string().datetime().optional(),
});

/** Submit feedback on completed action */
export const ActionFeedbackSchema = z.object({
  rating:   z.number().int().min(1).max(5),
  comment:  z.string().max(1_000).optional(),
});

/** Complete action with outcome data */
export const CompleteActionSchema = z.object({
  outcome: z.object({
    successful: z.boolean(),
    impactNotes: z.string().max(2_000).optional(),
  }).optional(),
  actualTimeMinutes: z.number().int().positive().optional(),
});

/** Skip action with optional reason */
export const SkipActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ============================================================================
// Impact Tracking schemas
// ============================================================================

export const RecordImpactSchema = z.object({
  impactType: z.string().max(100),
  value: z.union([z.number(), z.string()]),
  description: z.string().max(2_000).optional(),
  evidenceLinks: z.array(z.string().url()).max(10).optional(),
});

// ============================================================================
// Target schemas
// ============================================================================

/** Shared contact fields used by both Add and Update target schemas. */
const TargetContactSchema = z.object({
  name:     CommonSchemas.name,
  title:    z.string().max(200).optional(),
  email:    CommonSchemas.email.optional(),
  phone:    CommonSchemas.phone.optional(),
  address:  z.string().max(500).optional(),
  district: z.string().max(100).optional(),
  party:    z.string().max(50).optional(),
});

export const AddTargetSchema = TargetContactSchema.extend({
  campaign_id: CommonSchemas.id,
  target_type: TargetTypeSchema,
});

/** All contact fields optional for PATCH-style updates. */
export const UpdateTargetSchema = TargetContactSchema.partial();

// ============================================================================
// Petition schemas
// ============================================================================

export const SignPetitionSchema = z.object({
  campaign_id:    CommonSchemas.id,
  user_id:        CommonSchemas.id,
  signature_data: z.object({
    name:      CommonSchemas.name,
    email:     CommonSchemas.email,
    zip_code:  ZipCodeSchema,
    comment:   z.string().max(1_000).optional(),
    is_public: z.boolean().default(false),
  }),
});

export const GetSignaturesSchema = PaginationSchema.extend({
  campaign_id:     CommonSchemas.id,
  include_private: z.boolean().default(false),
});

// ============================================================================
// Letter-writing schemas
// ============================================================================

const LetterPersonalizationSchema = z.object({
  salutation:     z.string().max(100).optional(),
  personal_story: z.string().max(2_000).optional(),
  closing:        z.string().max(200).optional(),
});

export const GenerateLetterSchema = z.object({
  campaign_id:     CommonSchemas.id,
  target_id:       CommonSchemas.id,
  template_id:     CommonSchemas.id.optional(),
  personalization: LetterPersonalizationSchema.optional(),
});

export const SendLetterSchema = z.object({
  campaign_id:     CommonSchemas.id,
  user_id:         CommonSchemas.id,
  target_id:       CommonSchemas.id,
  letter_content:  z.string().min(100).max(10_000),
  delivery_method: z.enum(['email', 'postal', 'fax']),
});

// ============================================================================
// Analytics schemas
// ============================================================================

export const GetCampaignStatsSchema = z.object({
  campaign_id:          CommonSchemas.id,
  include_demographics: z.boolean().default(false),
  include_timeline:     z.boolean().default(true),
});

export const ImpactMetricSchema = z.enum([
  'participation_rate',
  'reach',
  'engagement',
  'conversion',
  'target_response',
]);

export const GetImpactMetricsSchema = z.object({
  campaign_id: CommonSchemas.id,
  metrics:     z.array(ImpactMetricSchema).min(1).optional(),
});

export const GetLeaderboardSchema = PaginationSchema.extend({
  campaign_id: CommonSchemas.id.optional(),
  timeframe:   z.enum(['day', 'week', 'month', 'all']).default('all'),
  metric:      z.enum(['actions', 'signatures', 'letters', 'calls']).default('actions'),
});

// ============================================================================
// Inferred types
// ============================================================================

export type CreateCampaignInput   = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput   = z.infer<typeof UpdateCampaignSchema>;
export type GetCampaignsInput     = z.infer<typeof GetCampaignsSchema>;
export type SearchCampaignsInput  = z.infer<typeof SearchCampaignsSchema>;

export type RecordActionInput     = z.infer<typeof RecordActionSchema>;
export type GetActionsInput       = z.infer<typeof GetActionsSchema>;

export type AddTargetInput        = z.infer<typeof AddTargetSchema>;
export type UpdateTargetInput     = z.infer<typeof UpdateTargetSchema>;

export type SignPetitionInput     = z.infer<typeof SignPetitionSchema>;
export type GetSignaturesInput    = z.infer<typeof GetSignaturesSchema>;

export type GenerateLetterInput   = z.infer<typeof GenerateLetterSchema>;
export type SendLetterInput       = z.infer<typeof SendLetterSchema>;

export type GetCampaignStatsInput = z.infer<typeof GetCampaignStatsSchema>;
export type GetImpactMetricsInput = z.infer<typeof GetImpactMetricsSchema>;
export type GetLeaderboardInput   = z.infer<typeof GetLeaderboardSchema>;

export type CampaignType          = z.infer<typeof CampaignTypeSchema>;
export type CampaignStatus        = z.infer<typeof CampaignStatusSchema>;
export type ActionType            = z.infer<typeof ActionTypeSchema>;
export type TargetType            = z.infer<typeof TargetTypeSchema>;
export type ImpactMetric          = z.infer<typeof ImpactMetricSchema>;