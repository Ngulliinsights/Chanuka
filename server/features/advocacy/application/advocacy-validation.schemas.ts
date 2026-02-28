/**
 * Advocacy Feature - Validation Schemas
 * 
 * Zod schemas for validating advocacy and campaign inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Campaign and Action Enums
// ============================================================================

export const CampaignTypeSchema = z.enum([
  'petition',
  'letter_writing',
  'phone_banking',
  'social_media',
  'grassroots',
  'coalition',
  'awareness'
]);

export const CampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
]);

export const ActionTypeSchema = z.enum([
  'sign_petition',
  'send_letter',
  'make_call',
  'share_social',
  'attend_event',
  'donate',
  'volunteer'
]);

export const TargetTypeSchema = z.enum([
  'legislator',
  'committee',
  'agency',
  'official',
  'organization'
]);

// ============================================================================
// Campaign Creation and Update Schemas
// ============================================================================

export const CreateCampaignSchema = z.object({
  title: CommonSchemas.title,
  description: CommonSchemas.description,
  type: CampaignTypeSchema,
  bill_id: CommonSchemas.id.optional(),
  goal: z.string().min(10).max(500),
  target_count: z.number().int().positive().optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  organizer_id: CommonSchemas.id,
  tags: z.array(z.string().max(50)).max(20).optional(),
  is_public: z.boolean().default(true),
});

export const UpdateCampaignSchema = z.object({
  title: CommonSchemas.title.optional(),
  description: CommonSchemas.description.optional(),
  status: CampaignStatusSchema.optional(),
  goal: z.string().min(10).max(500).optional(),
  target_count: z.number().int().positive().optional(),
  end_date: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  is_public: z.boolean().optional(),
});

// ============================================================================
// Action Schemas
// ============================================================================

export const RecordActionSchema = z.object({
  campaign_id: CommonSchemas.id,
  user_id: CommonSchemas.id,
  action_type: ActionTypeSchema,
  target_id: CommonSchemas.id.optional(),
  target_type: TargetTypeSchema.optional(),
  metadata: z.object({
    message: z.string().max(5000).optional(),
    phone_number: CommonSchemas.phone.optional(),
    email_sent: z.boolean().optional(),
    social_platform: z.string().max(50).optional(),
  }).optional(),
});

export const GetActionsSchema = z.object({
  campaign_id: CommonSchemas.id.optional(),
  user_id: CommonSchemas.id.optional(),
  action_type: ActionTypeSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Target Management Schemas
// ============================================================================

export const AddTargetSchema = z.object({
  campaign_id: CommonSchemas.id,
  target_type: TargetTypeSchema,
  name: CommonSchemas.name,
  title: z.string().max(200).optional(),
  email: CommonSchemas.email.optional(),
  phone: CommonSchemas.phone.optional(),
  address: z.string().max(500).optional(),
  district: z.string().max(100).optional(),
  party: z.string().max(50).optional(),
});

export const UpdateTargetSchema = z.object({
  name: CommonSchemas.name.optional(),
  title: z.string().max(200).optional(),
  email: CommonSchemas.email.optional(),
  phone: CommonSchemas.phone.optional(),
  address: z.string().max(500).optional(),
  district: z.string().max(100).optional(),
  party: z.string().max(50).optional(),
});

// ============================================================================
// Petition Schemas
// ============================================================================

export const SignPetitionSchema = z.object({
  campaign_id: CommonSchemas.id,
  user_id: CommonSchemas.id,
  signature_data: z.object({
    name: CommonSchemas.name,
    email: CommonSchemas.email,
    zip_code: z.string().regex(/^\d{5}(-\d{4})?$/),
    comment: z.string().max(1000).optional(),
    is_public: z.boolean().default(false),
  }),
});

export const GetSignaturesSchema = z.object({
  campaign_id: CommonSchemas.id,
  include_private: z.boolean().default(false),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Letter Writing Schemas
// ============================================================================

export const GenerateLetterSchema = z.object({
  campaign_id: CommonSchemas.id,
  target_id: CommonSchemas.id,
  template_id: CommonSchemas.id.optional(),
  personalization: z.object({
    salutation: z.string().max(100).optional(),
    personal_story: z.string().max(2000).optional(),
    closing: z.string().max(200).optional(),
  }).optional(),
});

export const SendLetterSchema = z.object({
  campaign_id: CommonSchemas.id,
  user_id: CommonSchemas.id,
  target_id: CommonSchemas.id,
  letter_content: z.string().min(100).max(10000),
  delivery_method: z.enum(['email', 'postal', 'fax']),
});

// ============================================================================
// Query and Filter Schemas
// ============================================================================

export const GetCampaignsSchema = z.object({
  type: CampaignTypeSchema.optional(),
  status: CampaignStatusSchema.optional(),
  bill_id: CommonSchemas.id.optional(),
  organizer_id: CommonSchemas.id.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  active_only: z.boolean().default(false),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const SearchCampaignsSchema = z.object({
  query: CommonSchemas.searchQuery,
  type: CampaignTypeSchema.optional(),
  status: CampaignStatusSchema.optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetCampaignStatsSchema = z.object({
  campaign_id: CommonSchemas.id,
  include_demographics: z.boolean().default(false),
  include_timeline: z.boolean().default(true),
});

export const GetImpactMetricsSchema = z.object({
  campaign_id: CommonSchemas.id,
  metrics: z.array(z.enum([
    'participation_rate',
    'reach',
    'engagement',
    'conversion',
    'target_response'
  ])).optional(),
});

export const GetLeaderboardSchema = z.object({
  campaign_id: CommonSchemas.id.optional(),
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('all'),
  metric: z.enum(['actions', 'signatures', 'letters', 'calls']).default('actions'),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
export type RecordActionInput = z.infer<typeof RecordActionSchema>;
export type GetActionsInput = z.infer<typeof GetActionsSchema>;
export type AddTargetInput = z.infer<typeof AddTargetSchema>;
export type UpdateTargetInput = z.infer<typeof UpdateTargetSchema>;
export type SignPetitionInput = z.infer<typeof SignPetitionSchema>;
export type GetSignaturesInput = z.infer<typeof GetSignaturesSchema>;
export type GenerateLetterInput = z.infer<typeof GenerateLetterSchema>;
export type SendLetterInput = z.infer<typeof SendLetterSchema>;
export type GetCampaignsInput = z.infer<typeof GetCampaignsSchema>;
export type SearchCampaignsInput = z.infer<typeof SearchCampaignsSchema>;
export type GetCampaignStatsInput = z.infer<typeof GetCampaignStatsSchema>;
export type GetImpactMetricsInput = z.infer<typeof GetImpactMetricsSchema>;
export type GetLeaderboardInput = z.infer<typeof GetLeaderboardSchema>;
export type CampaignType = z.infer<typeof CampaignTypeSchema>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type TargetType = z.infer<typeof TargetTypeSchema>;
