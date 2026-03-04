/**
 * Advocacy Feature - Shared Validation Schemas
 * 
 * Zod schemas for validating advocacy-related inputs.
 * Shared between client and server for consistent validation.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

const IdSchema = z.number().int().positive();
const PageSchema = z.number().int().positive().default(1);
const LimitSchema = z.number().int().positive().max(100).default(20);

// ============================================================================
// Advocacy Type Enums
// ============================================================================

export const CampaignTypeSchema = z.enum([
  'petition',
  'call_to_action',
  'letter_writing',
  'social_media',
  'grassroots'
]);

export const CampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'archived'
]);

export const ActionTypeSchema = z.enum([
  'sign_petition',
  'call_representative',
  'send_email',
  'share_social',
  'attend_event',
  'donate'
]);

// ============================================================================
// Campaign Schemas
// ============================================================================

export const CreateCampaignSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  type: CampaignTypeSchema,
  bill_id: IdSchema.optional(),
  goal: z.number().int().positive().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const UpdateCampaignSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(5000).optional(),
  status: CampaignStatusSchema.optional(),
  goal: z.number().int().positive().optional(),
  end_date: z.string().datetime().optional(),
});

export const GetCampaignSchema = z.object({
  campaign_id: IdSchema,
  include_actions: z.boolean().default(true),
  include_stats: z.boolean().default(true),
});

export const GetCampaignsSchema = z.object({
  type: CampaignTypeSchema.optional(),
  status: CampaignStatusSchema.optional(),
  bill_id: IdSchema.optional(),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

// ============================================================================
// Action Schemas
// ============================================================================

export const CreateActionSchema = z.object({
  campaign_id: IdSchema,
  user_id: IdSchema,
  type: ActionTypeSchema,
  metadata: z.record(z.any()).optional(),
});

export const GetActionsSchema = z.object({
  campaign_id: IdSchema.optional(),
  user_id: IdSchema.optional(),
  type: ActionTypeSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

export const GetCampaignStatsSchema = z.object({
  campaign_id: IdSchema,
  include_demographics: z.boolean().default(false),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CampaignType = z.infer<typeof CampaignTypeSchema>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
export type GetCampaignInput = z.infer<typeof GetCampaignSchema>;
export type GetCampaignsInput = z.infer<typeof GetCampaignsSchema>;
export type CreateActionInput = z.infer<typeof CreateActionSchema>;
export type GetActionsInput = z.infer<typeof GetActionsSchema>;
export type GetCampaignStatsInput = z.infer<typeof GetCampaignStatsSchema>;
