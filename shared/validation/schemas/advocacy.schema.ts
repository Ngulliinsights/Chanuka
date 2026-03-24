/**
 * Advocacy Feature - Shared Validation Schemas
 *
 * Zod schemas for validating advocacy-related inputs.
 * Shared between client and server for consistent validation.
 *
 * Uses common.ts as single source of truth for shared primitives:
 * - IDs, pagination, search queries
 * - Date ranges, email, URL validation
 * - User role schema
 *
 * Aligned with:
 * - server/features/advocacy/domain/types.ts
 * - server/features/advocacy/presentation/advocacy-router.ts
 */

import { z } from 'zod';
import {
  nonEmptyString,
  optionalNonEmptyString,
  paginationSchema,
  dateRangeSchema,
  userIdSchema,
  billIdSchema,
} from './common';

// ============================================================================
// PRIMITIVE SCHEMAS - ID Validation
// ============================================================================

/**
 * Campaign ID schema - UUID format
 * Used across all campaign operations
 */
export const campaignIdSchema = z.string().uuid('Invalid campaign ID format');

/**
 * UUID string for general entity references
 */
const uuidSchema = z.string().uuid('Invalid UUID format');

// ============================================================================
// ADVOCACY ENUMS - SINGLE SOURCE OF TRUTH
// ============================================================================

/**
 * Campaign Type Enum
 *
 * Aligned with domain/types.ts:
 * - petition: Petition-based campaigns
 * - letter_writing: Letter writing campaigns
 * - phone_banking: Phone banking campaigns
 * - social_media: Social media awareness campaigns
 * - grassroots: Grassroots organization campaigns
 * - coalition: Coalition building campaigns
 * - awareness: General awareness campaigns
 */
export const CampaignTypeSchema = z.enum(
  ['petition', 'letter_writing', 'phone_banking', 'social_media', 'grassroots', 'coalition', 'awareness'],
  {
    errorMap: () => ({
      message: 'Invalid campaign type. Must be one of: petition, letter_writing, phone_banking, social_media, grassroots, coalition, awareness',
    }),
  }
);

/**
 * Campaign Status Enum
 *
 * Aligned with domain/types.ts
 */
export const CampaignStatusSchema = z.enum(
  ['draft', 'active', 'paused', 'completed', 'cancelled'],
  {
    errorMap: () => ({
      message: 'Invalid campaign status. Must be one of: draft, active, paused, completed, cancelled',
    }),
  }
);

/**
 * Action Type Enum
 */
export const ActionTypeSchema = z.enum(
  ['sign_petition', 'call_representative', 'send_email', 'share_social', 'attend_event', 'donate'],
  {
    errorMap: () => ({
      message:
        'Invalid action type. Must be one of: sign_petition, call_representative, send_email, share_social, attend_event, donate',
    }),
  }
);

// ============================================================================
// CAMPAIGN SCHEMAS
// ============================================================================

/**
 * Create Campaign Request Schema
 *
 * Validates input when creating a new campaign.
 * Used in: POST /api/advocacy/campaigns
 */
export const CreateCampaignSchema = z.object({
  title: nonEmptyString('Campaign title', 5, 200),
  description: nonEmptyString('Campaign description', 20, 5000),
  type: CampaignTypeSchema,
  goal: nonEmptyString('Campaign goal', 10, 1000),
  billId: billIdSchema.optional(),
  targetCount: z.number().int().positive('Target count must be a positive integer').optional(),
  tags: z
    .array(z.string().max(50, 'Tag must be at most 50 characters'))
    .max(20, 'Maximum 20 tags allowed')
    .default([]),
  isPublic: z.boolean().default(true),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * Update Campaign Request Schema
 *
 * Validates input when updating an existing campaign.
 * All fields are optional to support partial updates.
 * Used in: PUT /api/advocacy/campaigns/:id
 */
export const UpdateCampaignSchema = z.object({
  title: nonEmptyString('Campaign title', 5, 200).optional(),
  description: nonEmptyString('Campaign description', 20, 5000).optional(),
  status: CampaignStatusSchema.optional(),
  goal: nonEmptyString('Campaign goal', 10, 1000).optional(),
  targetCount: z.number().int().positive('Target count must be a positive integer').optional(),
  tags: z
    .array(z.string().max(50, 'Tag must be at most 50 characters'))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
  isPublic: z.boolean().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * Campaign ID Path Parameter
 *
 * Validates campaign ID in URL paths.
 * Used in: GET, PUT, DELETE /api/advocacy/campaigns/:id
 */
export const CampaignIdParamSchema = z.object({
  id: campaignIdSchema,
});

/**
 * Get Campaign Query Parameters
 *
 * Validates query parameters when retrieving a single campaign.
 * Used in: GET /api/advocacy/campaigns/:id
 */
export const GetCampaignQuerySchema = z.object({
  includeActions: z.boolean().optional().default(true),
  includeStats: z.boolean().optional().default(true),
  includeAnalytics: z.boolean().optional().default(false),
});

/**
 * Get Campaigns (List) Query Parameters
 *
 * Validates query parameters when listing campaigns with filters and pagination.
 * Used in: GET /api/advocacy/campaigns
 */
export const GetCampaignsQuerySchema = z
  .object({
    type: CampaignTypeSchema.optional(),
    status: CampaignStatusSchema.optional(),
    billId: billIdSchema.optional(),
    organizerId: userIdSchema.optional(),
    tags: z.array(z.string()).optional(),
    search: z.string().max(500, 'Search query must be at most 500 characters').optional(),
    activeOnly: z.boolean().optional(),
  })
  .merge(paginationSchema);

/**
 * Campaign Filters Object (used in services)
 *
 * Validated filters for campaign queries.
 */
export const CampaignFiltersSchema = z.object({
  type: CampaignTypeSchema.optional(),
  status: CampaignStatusSchema.optional(),
  billId: billIdSchema.optional(),
  organizerId: userIdSchema.optional(),
  tags: z.array(z.string()).optional(),
  activeOnly: z.boolean().optional(),
});

/**
 * Campaign Metrics Query Schema
 *
 * Validates parameters when retrieving campaign metrics.
 * Used in: GET /api/advocacy/campaigns/:id/metrics
 */
export const CampaignMetricsQuerySchema = z.object({
  includeDemographics: z.boolean().optional().default(false),
  timeRange: z.enum(['last_7_days', 'last_30_days', 'last_90_days', 'all_time']).optional().default('last_30_days'),
});

/**
 * Join Campaign Request Schema
 *
 * Validates data when user joins a campaign.
 * Used in: POST /api/advocacy/campaigns/:id/join
 */
export const JoinCampaignSchema = z.object({
  campaignId: campaignIdSchema,
});

/**
 * Leave Campaign Request Schema
 *
 * Validates data when user leaves a campaign.
 * Used in: POST /api/advocacy/campaigns/:id/leave
 */
export const LeaveCampaignSchema = z.object({
  campaignId: campaignIdSchema,
});

// ============================================================================
// ACTION SCHEMAS
// ============================================================================

/**
 * Create Action Request Schema
 *
 * Validates input when recording an advocacy action.
 * Used in: POST /api/advocacy/actions
 */
export const CreateActionSchema = z.object({
  campaignId: campaignIdSchema,
  type: ActionTypeSchema,
  metadata: z.record(z.any()).optional(),
});

/**
 * Action ID Path Parameter
 *
 * Validates action ID in URL paths.
 * Used in: GET, DELETE /api/advocacy/actions/:id
 */
export const ActionIdParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Get Actions (List) Query Parameters
 *
 * Validates query parameters when listing actions with filters.
 * Used in: GET /api/advocacy/actions
 */
export const GetActionsQuerySchema = z
  .object({
    campaignId: campaignIdSchema.optional(),
    userId: userIdSchema.optional(),
    type: ActionTypeSchema.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .merge(paginationSchema);

/**
 * Action Filters Object (used in services)
 *
 * Validated filters for action queries.
 */
export const ActionFiltersSchema = z.object({
  campaignId: campaignIdSchema.optional(),
  userId: userIdSchema.optional(),
  type: ActionTypeSchema.optional(),
});

// ============================================================================
// CAMPAIGN ANALYTICS & REPORTING SCHEMAS
// ============================================================================

/**
 * Campaign Analytics Query Schema
 *
 * Validates parameters when retrieving campaign analytics.
 * Used in: GET /api/advocacy/campaigns/:id/analytics
 */
export const CampaignAnalyticsQuerySchema = z.object({
  timeRange: z.enum(['last_7_days', 'last_30_days', 'last_90_days', 'all_time']).optional().default('last_30_days'),
  includeComparison: z.boolean().optional().default(false),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
});

/**
 * Campaign Search Query Schema
 *
 * Validates parameters when searching campaigns.
 * Used in: GET /api/advocacy/campaigns/search
 */
export const CampaignSearchQuerySchema = z.object({
  q: nonEmptyString('Search query', 1, 500),
  type: CampaignTypeSchema.optional(),
  status: CampaignStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Trending Campaigns Query Schema
 *
 * Validates parameters when retrieving trending campaigns.
 * Used in: GET /api/advocacy/campaigns/trending
 */
export const TrendingCampaignsQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(10),
  timeRange: z.enum(['last_7_days', 'last_30_days', 'last_90_days']).optional().default('last_30_days'),
});

// ============================================================================
// USER-CAMPAIGN RELATIONSHIP SCHEMAS
// ============================================================================

/**
 * Get User Campaigns Query Schema
 *
 * Validates parameters when retrieving campaigns for a specific user.
 * Used in: GET /api/advocacy/users/:userId/campaigns
 */
export const GetUserCampaignsQuerySchema = z
  .object({
    status: CampaignStatusSchema.optional(),
    role: z.enum(['organizer', 'participant']).optional(),
  })
  .merge(paginationSchema);

/**
 * Get Campaigns by Bill Query Schema
 *
 * Validates parameters when retrieving campaigns associated with a bill.
 * Used in: GET /api/advocacy/bills/:billId/campaigns
 */
export const GetCampaignsByBillQuerySchema = paginationSchema;

// ============================================================================
// TYPE EXPORTS - Inferred from Zod Schemas
// ============================================================================

// Enum Types
export type CampaignType = z.infer<typeof CampaignTypeSchema>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;

// Request Input Types
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
export type CreateActionInput = z.infer<typeof CreateActionSchema>;
export type JoinCampaignInput = z.infer<typeof JoinCampaignSchema>;
export type LeaveCampaignInput = z.infer<typeof LeaveCampaignSchema>;

// Query Parameter Types
export type CampaignIdParam = z.infer<typeof CampaignIdParamSchema>;
export type GetCampaignQuery = z.infer<typeof GetCampaignQuerySchema>;
export type GetCampaignsQuery = z.infer<typeof GetCampaignsQuerySchema>;
export type GetActionsQuery = z.infer<typeof GetActionsQuerySchema>;
export type CampaignMetricsQuery = z.infer<typeof CampaignMetricsQuerySchema>;
export type CampaignAnalyticsQuery = z.infer<typeof CampaignAnalyticsQuerySchema>;
export type CampaignSearchQuery = z.infer<typeof CampaignSearchQuerySchema>;
export type TrendingCampaignsQuery = z.infer<typeof TrendingCampaignsQuerySchema>;
export type GetUserCampaignsQuery = z.infer<typeof GetUserCampaignsQuerySchema>;

// Filter Types
export type CampaignFilters = z.infer<typeof CampaignFiltersSchema>;
export type ActionFilters = z.infer<typeof ActionFiltersSchema>;

// ============================================================================
// HELPER FUNCTIONS FOR ROUTE HANDLERS
// ============================================================================

/**
 * Validates and parses campaign ID from URL parameter
 *
 * @param param - Raw parameter from URL
 * @returns Parsed campaign ID
 * @throws ZodError if invalid
 */
export function parseCampaignId(param: unknown): string {
  return CampaignIdParamSchema.parse({ id: param }).id;
}

/**
 * Validates and parses action ID from URL parameter
 *
 * @param param - Raw parameter from URL
 * @returns Parsed action ID
 * @throws ZodError if invalid
 */
export function parseActionId(param: unknown): string {
  return ActionIdParamSchema.parse({ id: param }).id;
}
