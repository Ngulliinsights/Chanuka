/**
 * Engagement Analytics Validation Schemas
 * 
 * Zod schemas for validating engagement analytics inputs
 */

import { z } from 'zod';

// ============================================================================
// Input Schemas
// ============================================================================

export const GetUserEngagementMetricsSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  timeframe: z.enum(['7d', '30d', '90d']).optional().default('30d'),
});

export const GetBillEngagementMetricsSchema = z.object({
  bill_id: z.string().uuid('Invalid bill ID format'),
});

export const TrackEngagementSchema = z.object({
  bill_id: z.string().uuid('Invalid bill ID format'),
  user_id: z.string().uuid('Invalid user ID format'),
  engagement_type: z.enum(['view', 'comment', 'share', 'vote', 'bookmark']),
  metadata: z.record(z.any()).optional(),
});

export const GetTrendingBillsSchema = z.object({
  limit: z.number().int().positive().max(50).optional().default(10),
  timeframe: z.enum(['24h', '7d', '30d']).optional().default('7d'),
  category: z.string().optional(),
});

export const GetEngagementLeaderboardSchema = z.object({
  limit: z.number().int().positive().max(100).optional().default(10),
  timeframe: z.enum(['7d', '30d', '90d']).optional().default('30d'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GetUserEngagementMetricsInput = z.infer<typeof GetUserEngagementMetricsSchema>;
export type GetBillEngagementMetricsInput = z.infer<typeof GetBillEngagementMetricsSchema>;
export type TrackEngagementInput = z.infer<typeof TrackEngagementSchema>;
export type GetTrendingBillsInput = z.infer<typeof GetTrendingBillsSchema>;
export type GetEngagementLeaderboardInput = z.infer<typeof GetEngagementLeaderboardSchema>;
