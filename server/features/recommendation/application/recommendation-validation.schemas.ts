/**
 * Recommendation Feature - Validation Schemas
 * 
 * Zod schemas for validating recommendation engine inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Recommendation Type and Strategy Enums
// ============================================================================

export const RecommendationTypeSchema = z.enum([
  'bill',
  'user',
  'topic',
  'discussion',
  'expert',
  'resource'
]);

export const RecommendationStrategySchema = z.enum([
  'collaborative_filtering',
  'content_based',
  'hybrid',
  'trending',
  'personalized',
  'similar_users'
]);

export const RecommendationReasonSchema = z.enum([
  'similar_interests',
  'popular_in_category',
  'trending_now',
  'expert_recommended',
  'based_on_activity',
  'similar_to_viewed',
  'frequently_viewed_together'
]);

// ============================================================================
// Recommendation Request Schemas
// ============================================================================

export const GetRecommendationsSchema = z.object({
  user_id: CommonSchemas.id,
  type: RecommendationTypeSchema,
  strategy: RecommendationStrategySchema.default('hybrid'),
  limit: z.number().int().positive().max(50).default(10),
  exclude_ids: z.array(CommonSchemas.id).max(100).optional(),
  filters: z.object({
    category: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    min_relevance_score: z.number().min(0).max(1).default(0.3),
  }).optional(),
});

export const GetBillRecommendationsSchema = z.object({
  user_id: CommonSchemas.id,
  based_on_bill_id: CommonSchemas.id.optional(),
  strategy: RecommendationStrategySchema.default('hybrid'),
  limit: z.number().int().positive().max(50).default(10),
  include_reasons: z.boolean().default(true),
});

export const GetUserRecommendationsSchema = z.object({
  user_id: CommonSchemas.id,
  recommendation_type: z.enum(['experts', 'similar_users', 'active_users']).default('similar_users'),
  limit: z.number().int().positive().max(50).default(10),
  filters: z.object({
    expertise: z.array(z.string().max(100)).optional(),
    min_reputation: z.number().int().nonnegative().optional(),
  }).optional(),
});

export const GetTopicRecommendationsSchema = z.object({
  user_id: CommonSchemas.id,
  based_on_interests: z.boolean().default(true),
  based_on_activity: z.boolean().default(true),
  limit: z.number().int().positive().max(50).default(10),
});

// ============================================================================
// Similar Items Schemas
// ============================================================================

export const GetSimilarBillsSchema = z.object({
  bill_id: CommonSchemas.id,
  similarity_threshold: z.number().min(0).max(1).default(0.5),
  limit: z.number().int().positive().max(50).default(10),
  include_score: z.boolean().default(true),
});

export const GetSimilarUsersSchema = z.object({
  user_id: CommonSchemas.id,
  similarity_metric: z.enum(['interests', 'activity', 'expertise', 'combined']).default('combined'),
  limit: z.number().int().positive().max(50).default(10),
});

// ============================================================================
// Personalization Schemas
// ============================================================================

export const UpdateUserPreferencesSchema = z.object({
  user_id: CommonSchemas.id,
  preferences: z.object({
    favorite_categories: z.array(z.string().max(100)).max(20).optional(),
    blocked_categories: z.array(z.string().max(100)).max(20).optional(),
    preferred_complexity: z.enum(['simple', 'moderate', 'complex', 'any']).optional(),
    notification_frequency: z.enum(['immediate', 'daily', 'weekly', 'never']).optional(),
  }),
});

export const RecordInteractionSchema = z.object({
  user_id: CommonSchemas.id,
  item_id: CommonSchemas.id,
  item_type: RecommendationTypeSchema,
  interaction_type: z.enum(['view', 'click', 'like', 'share', 'comment', 'save', 'dismiss']),
  duration_seconds: z.number().int().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
});

export const RecordFeedbackSchema = z.object({
  user_id: CommonSchemas.id,
  recommendation_id: CommonSchemas.id,
  feedback_type: z.enum(['helpful', 'not_helpful', 'irrelevant', 'already_seen']),
  comments: z.string().max(500).optional(),
});

// ============================================================================
// Trending and Popular Schemas
// ============================================================================

export const GetTrendingSchema = z.object({
  type: RecommendationTypeSchema,
  timeframe: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  category: z.string().max(100).optional(),
  limit: z.number().int().positive().max(50).default(10),
});

export const GetPopularSchema = z.object({
  type: RecommendationTypeSchema,
  timeframe: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
  category: z.string().max(100).optional(),
  limit: z.number().int().positive().max(50).default(10),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetRecommendationStatsSchema = z.object({
  user_id: CommonSchemas.id.optional(),
  type: RecommendationTypeSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(['type', 'strategy', 'reason', 'date']).optional(),
});

export const GetEngagementMetricsSchema = z.object({
  recommendation_type: RecommendationTypeSchema.optional(),
  strategy: RecommendationStrategySchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const GetPersonalizationScoreSchema = z.object({
  user_id: CommonSchemas.id,
  include_breakdown: z.boolean().default(true),
});

// ============================================================================
// Model Training and Optimization Schemas
// ============================================================================

export const RefreshRecommendationsSchema = z.object({
  user_id: CommonSchemas.id,
  force_recalculation: z.boolean().default(false),
});

export const GetModelPerformanceSchema = z.object({
  strategy: RecommendationStrategySchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  metrics: z.array(z.enum(['accuracy', 'precision', 'recall', 'ctr', 'engagement'])).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GetRecommendationsInput = z.infer<typeof GetRecommendationsSchema>;
export type GetBillRecommendationsInput = z.infer<typeof GetBillRecommendationsSchema>;
export type GetUserRecommendationsInput = z.infer<typeof GetUserRecommendationsSchema>;
export type GetTopicRecommendationsInput = z.infer<typeof GetTopicRecommendationsSchema>;
export type GetSimilarBillsInput = z.infer<typeof GetSimilarBillsSchema>;
export type GetSimilarUsersInput = z.infer<typeof GetSimilarUsersSchema>;
export type UpdateUserPreferencesInput = z.infer<typeof UpdateUserPreferencesSchema>;
export type RecordInteractionInput = z.infer<typeof RecordInteractionSchema>;
export type RecordFeedbackInput = z.infer<typeof RecordFeedbackSchema>;
export type GetTrendingInput = z.infer<typeof GetTrendingSchema>;
export type GetPopularInput = z.infer<typeof GetPopularSchema>;
export type GetRecommendationStatsInput = z.infer<typeof GetRecommendationStatsSchema>;
export type GetEngagementMetricsInput = z.infer<typeof GetEngagementMetricsSchema>;
export type GetPersonalizationScoreInput = z.infer<typeof GetPersonalizationScoreSchema>;
export type RefreshRecommendationsInput = z.infer<typeof RefreshRecommendationsSchema>;
export type GetModelPerformanceInput = z.infer<typeof GetModelPerformanceSchema>;
export type RecommendationType = z.infer<typeof RecommendationTypeSchema>;
export type RecommendationStrategy = z.infer<typeof RecommendationStrategySchema>;
export type RecommendationReason = z.infer<typeof RecommendationReasonSchema>;
