/**
 * Feature Flags - Validation Schemas
 * 
 * Zod schemas for validating feature flag inputs.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// USER TARGETING SCHEMAS
// ============================================================================

export const UserTargetingSchema = z.object({
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
});

export const ABTestConfigSchema = z.object({
  variants: z.array(z.string()).min(2).max(10),
  distribution: z.array(z.number().min(0).max(100)),
}).refine(
  (data) => data.variants.length === data.distribution.length,
  { message: 'Variants and distribution arrays must have the same length' }
).refine(
  (data) => data.distribution.reduce((sum, val) => sum + val, 0) === 100,
  { message: 'Distribution percentages must sum to 100' }
);

// ============================================================================
// FLAG MANAGEMENT SCHEMAS
// ============================================================================

export const CreateFlagSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-_]+$/, 'Flag name must be lowercase alphanumeric with hyphens/underscores'),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().min(0).max(100).default(0),
  userTargeting: UserTargetingSchema.optional(),
  abTestConfig: ABTestConfigSchema.optional(),
  dependencies: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const UpdateFlagSchema = CreateFlagSchema.partial().omit({ name: true });

export const GetFlagSchema = z.object({
  flagName: z.string().min(1).max(100),
});

export const DeleteFlagSchema = z.object({
  flagName: z.string().min(1).max(100),
});

export const ToggleFlagSchema = z.object({
  flagName: z.string().min(1).max(100),
  enabled: z.boolean(),
});

export const UpdateRolloutSchema = z.object({
  flagName: z.string().min(1).max(100),
  percentage: z.number().min(0).max(100),
});

// ============================================================================
// FLAG EVALUATION SCHEMAS
// ============================================================================

export const FlagEvaluationContextSchema = z.object({
  userId: z.string().optional(),
  userAttributes: z.record(z.any()).optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  timestamp: z.date().optional(),
});

export const IsEnabledSchema = z.object({
  flagName: z.string().min(1).max(100),
  context: FlagEvaluationContextSchema.optional(),
});

// ============================================================================
// ANALYTICS SCHEMAS
// ============================================================================

export const GetAnalyticsSchema = z.object({
  flagName: z.string().min(1).max(100),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateFlagInput = z.infer<typeof CreateFlagSchema>;
export type UpdateFlagInput = z.infer<typeof UpdateFlagSchema>;
export type GetFlagInput = z.infer<typeof GetFlagSchema>;
export type DeleteFlagInput = z.infer<typeof DeleteFlagSchema>;
export type ToggleFlagInput = z.infer<typeof ToggleFlagSchema>;
export type UpdateRolloutInput = z.infer<typeof UpdateRolloutSchema>;
export type IsEnabledInput = z.infer<typeof IsEnabledSchema>;
export type GetAnalyticsInput = z.infer<typeof GetAnalyticsSchema>;
export type UserTargeting = z.infer<typeof UserTargetingSchema>;
export type ABTestConfig = z.infer<typeof ABTestConfigSchema>;
export type FlagEvaluationContext = z.infer<typeof FlagEvaluationContextSchema>;
