/**
 * Analytics Feature - Validation Schemas
 * 
 * Zod schemas for validating analytics-related inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Analytics Type and Metric Enums
// ============================================================================

export const MetricTypeSchema = z.enum([
  'engagement',
  'views',
  'comments',
  'shares',
  'votes',
  'user_activity',
  'bill_activity',
  'search_activity',
  'verification_activity'
]);

export const TimeframeSchema = z.enum([
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'all'
]);

export const GroupBySchema = z.enum([
  'hour',
  'day',
  'week',
  'month',
  'category',
  'status',
  'user',
  'bill'
]);

export const AggregationTypeSchema = z.enum([
  'sum',
  'avg',
  'min',
  'max',
  'count',
  'median'
]);

// ============================================================================
// Basic Analytics Query Schemas
// ============================================================================

export const GetMetricSchema = z.object({
  metric: MetricTypeSchema,
  entity_type: z.enum(['bill', 'user', 'comment', 'discussion']).optional(),
  entity_id: CommonSchemas.id.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  timeframe: TimeframeSchema.default('week'),
  group_by: GroupBySchema.optional(),
});

export const GetEngagementStatsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  user_id: CommonSchemas.id.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  timeframe: TimeframeSchema.default('week'),
});

export const GetBillAnalyticsSchema = z.object({
  bill_id: CommonSchemas.id,
  metrics: z.array(MetricTypeSchema).min(1).max(10).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: GroupBySchema.optional(),
});

export const GetUserAnalyticsSchema = z.object({
  user_id: CommonSchemas.id,
  metrics: z.array(MetricTypeSchema).min(1).max(10).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: GroupBySchema.optional(),
});

// ============================================================================
// Aggregation and Reporting Schemas
// ============================================================================

export const AggregateMetricsSchema = z.object({
  metrics: z.array(MetricTypeSchema).min(1).max(10),
  aggregation: AggregationTypeSchema.default('sum'),
  filters: z.object({
    category: z.string().max(100).optional(),
    status: z.string().max(50).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  }).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: GroupBySchema.optional(),
});

export const GenerateReportSchema = z.object({
  report_type: z.enum([
    'engagement_summary',
    'user_activity',
    'bill_performance',
    'trending_topics',
    'verification_stats',
    'custom'
  ]),
  metrics: z.array(MetricTypeSchema).optional(),
  filters: z.object({
    category: z.string().max(100).optional(),
    status: z.string().max(50).optional(),
    user_role: z.string().max(50).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  }).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
});

// ============================================================================
// Trending and Popular Content Schemas
// ============================================================================

export const GetTrendingBillsSchema = z.object({
  timeframe: TimeframeSchema.default('week'),
  category: z.string().max(100).optional(),
  metric: MetricTypeSchema.default('engagement'),
  limit: CommonSchemas.limit.optional(),
});

export const GetPopularCommentsSchema = z.object({
  bill_id: CommonSchemas.id.optional(),
  timeframe: TimeframeSchema.default('week'),
  metric: z.enum(['likes', 'endorsements', 'replies', 'engagement']).default('engagement'),
  limit: CommonSchemas.limit.optional(),
});

export const GetActiveUsersSchema = z.object({
  timeframe: TimeframeSchema.default('week'),
  activity_type: z.enum(['comments', 'verifications', 'votes', 'all']).default('all'),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Real-time Analytics Schemas
// ============================================================================

export const GetRealTimeStatsSchema = z.object({
  metrics: z.array(MetricTypeSchema).min(1).max(5),
  refresh_interval: z.number().int().positive().max(60).default(5), // seconds
});

export const TrackEventSchema = z.object({
  event_type: z.string().min(1).max(100),
  entity_type: z.enum(['bill', 'user', 'comment', 'discussion', 'search']),
  entity_id: CommonSchemas.id,
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().datetime().optional(),
});

// ============================================================================
// Dashboard and Visualization Schemas
// ============================================================================

export const GetDashboardDataSchema = z.object({
  dashboard_type: z.enum([
    'overview',
    'bills',
    'users',
    'engagement',
    'moderation',
    'custom'
  ]),
  widgets: z.array(z.string().max(100)).max(20).optional(),
  timeframe: TimeframeSchema.default('week'),
  refresh: z.boolean().default(false),
});

export const GetChartDataSchema = z.object({
  chart_type: z.enum(['line', 'bar', 'pie', 'area', 'scatter']),
  metric: MetricTypeSchema,
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: GroupBySchema.default('day'),
  filters: z.record(z.any()).optional(),
});

// ============================================================================
// Comparison and Benchmark Schemas
// ============================================================================

export const CompareBillsSchema = z.object({
  bill_ids: z.array(CommonSchemas.id).min(2).max(10),
  metrics: z.array(MetricTypeSchema).min(1).max(10),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const CompareUsersSchema = z.object({
  user_ids: z.array(CommonSchemas.id).min(2).max(10),
  metrics: z.array(MetricTypeSchema).min(1).max(10),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const GetBenchmarksSchema = z.object({
  entity_type: z.enum(['bill', 'user', 'category']),
  entity_id: CommonSchemas.id.optional(),
  metrics: z.array(MetricTypeSchema).min(1).max(10),
  comparison_group: z.enum(['category', 'status', 'timeframe', 'all']).default('all'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GetMetricInput = z.infer<typeof GetMetricSchema>;
export type GetEngagementStatsInput = z.infer<typeof GetEngagementStatsSchema>;
export type GetBillAnalyticsInput = z.infer<typeof GetBillAnalyticsSchema>;
export type GetUserAnalyticsInput = z.infer<typeof GetUserAnalyticsSchema>;
export type AggregateMetricsInput = z.infer<typeof AggregateMetricsSchema>;
export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;
export type GetTrendingBillsInput = z.infer<typeof GetTrendingBillsSchema>;
export type GetPopularCommentsInput = z.infer<typeof GetPopularCommentsSchema>;
export type GetActiveUsersInput = z.infer<typeof GetActiveUsersSchema>;
export type GetRealTimeStatsInput = z.infer<typeof GetRealTimeStatsSchema>;
export type TrackEventInput = z.infer<typeof TrackEventSchema>;
export type GetDashboardDataInput = z.infer<typeof GetDashboardDataSchema>;
export type GetChartDataInput = z.infer<typeof GetChartDataSchema>;
export type CompareBillsInput = z.infer<typeof CompareBillsSchema>;
export type CompareUsersInput = z.infer<typeof CompareUsersSchema>;
export type GetBenchmarksInput = z.infer<typeof GetBenchmarksSchema>;
export type MetricType = z.infer<typeof MetricTypeSchema>;
export type Timeframe = z.infer<typeof TimeframeSchema>;
export type GroupBy = z.infer<typeof GroupBySchema>;
export type AggregationType = z.infer<typeof AggregationTypeSchema>;
