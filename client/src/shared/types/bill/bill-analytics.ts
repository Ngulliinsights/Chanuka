/**
 * Bill Analytics Types
 *
 * Types for bill engagement metrics, analytics, user interactions,
 * and engagement tracking.
 *
 * @module shared/types/bill
 */

import type { Bill } from './bill-base';

// ============================================================================
// Bill Analytics Types
// ============================================================================

/**
 * Comprehensive analytics for a bill
 *
 * @example
 * const analytics: BillAnalytics = {
 *   billId: '12345',
 *   title: 'Education Reform Act',
 *   views: 15420,
 *   engagement_score: 8.5,
 *   comments_count: 342,
 *   votes_count: 890,
 *   shares_count: 234,
 *   sentiment_score: 0.65,
 *   demographics: {...}
 * };
 */
export interface BillAnalytics {
  readonly bill_id: string;
  readonly title: string;
  readonly views: number;
  readonly engagement_score: number;
  readonly comments_count: number;
  readonly votes_count: number;
  readonly shares_count: number;
  readonly time_spent_avg: number;
  readonly bounce_rate: number;
  readonly conversion_rate: number;
  readonly trending_score: number;
  readonly sentiment_score: number;
  readonly demographics: DemographicsAnalysis;
  readonly timeline: readonly AnalyticsTimeline[];
  readonly lastUpdated: string;
}

/**
 * Demographics breakdown for bill engagement
 */
export interface DemographicsAnalysis {
  readonly age_groups: Record<string, number>;
  readonly locations: Record<string, number>;
  readonly political_affiliation: Record<string, number>;
  readonly education_level?: Record<string, number>;
  readonly occupation?: Record<string, number>;
}

/**
 * Timeline entry for analytics data
 */
export interface AnalyticsTimeline {
  readonly date: string;
  readonly views: number;
  readonly engagement: number;
  readonly comments?: number;
  readonly shares?: number;
  readonly sentiment?: number;
}

/**
 * Summary statistics across multiple bills
 */
export interface AnalyticsSummary {
  readonly total_bills: number;
  readonly total_views: number;
  readonly total_engagement: number;
  readonly average_time_spent: number;
  readonly top_categories: readonly CategoryAnalytics[];
  readonly trending_bills: readonly TrendingBill[];
  readonly period: {
    readonly start: string;
    readonly end: string;
  };
}

/**
 * Analytics for a category
 */
export interface CategoryAnalytics {
  readonly category: string;
  readonly views: number;
  readonly engagement: number;
  readonly trending: boolean;
  readonly trend_direction: 'up' | 'down' | 'stable';
  readonly trend_percentage: number;
}

/**
 * Trending bill information
 */
export interface TrendingBill {
  readonly bill_id: string;
  readonly title: string;
  readonly trend_score: number;
  readonly views_24h: number;
  readonly engagement_24h: number;
  readonly position: number;
  readonly change?: number;
}

/**
 * User engagement summary
 */
export interface UserEngagementSummary {
  readonly userId: number;
  readonly totalBillsViewed: number;
  readonly totalCommentsMade: number;
  readonly totalVotes: number;
  readonly totalSharesCompleted: number;
  readonly averageTimeSpent: number;
  readonly engagementScore: number;
  readonly favoriteCategories: readonly string[];
  readonly trackedBills: number;
  readonly savedItems: number;
  readonly lastActivity: string;
}

/**
 * Engagement analytics for a bill
 */
export interface EngagementAnalytics {
  readonly billId: number;
  readonly views: number;
  readonly uniqueVisitors: number;
  readonly avgTimeOnPage: number;
  readonly bounceRate: number;
  readonly clicks: number;
  readonly comments: number;
  readonly commentEngagementRate: number;
  readonly votes: number;
  readonly shares: number;
  readonly conversions: number;
  readonly conversionRate: number;
  readonly period: {
    readonly start: string;
    readonly end: string;
  };
}

/**
 * Geographic analysis
 */
export interface GeographicAnalytics {
  readonly location: string;
  readonly views: number;
  readonly engagement: number;
  readonly population?: number;
  readonly affectedPopulation?: number;
  readonly sentiment?: number;
  readonly representativeBills?: number;
}

/**
 * Demographic segment analysis
 */
export interface DemographicSegmentAnalytics {
  readonly segment: string;
  readonly views: number;
  readonly engagement: number;
  readonly sentiment: number;
  readonly primaryInterests: readonly string[];
  readonly actionTaken: number;
}

/**
 * Comment analytics
 */
export interface CommentAnalytics {
  readonly billId: number;
  readonly totalComments: number;
  readonly averageCommentLength: number;
  readonly averageSentiment: number;
  readonly topComments: readonly CommentStat[];
  readonly commentTimeline: readonly CommentTimelineEntry[];
  readonly moderationFlags: number;
  readonly expertComments: number;
}

/**
 * Comment statistic entry
 */
export interface CommentStat {
  readonly id: number;
  readonly authorId: number;
  readonly content: string;
  readonly upvotes: number;
  readonly downvotes: number;
  readonly sentiment: number;
  readonly createdAt: string;
}

/**
 * Comment timeline entry
 */
export interface CommentTimelineEntry {
  readonly date: string;
  readonly count: number;
  readonly averageSentiment: number;
  readonly flaggedCount: number;
}

/**
 * Share analytics
 */
export interface ShareAnalytics {
  readonly billId: number;
  readonly totalShares: number;
  readonly sharesByPlatform: Record<string, number>;
  readonly shareTimeline: readonly ShareTimelineEntry[];
  readonly shareConversion: number;
}

/**
 * Share timeline entry
 */
export interface ShareTimelineEntry {
  readonly date: string;
  readonly count: number;
  readonly platform: string;
}

/**
 * Vote analytics
 */
export interface VoteAnalytics {
  readonly billId: number;
  readonly totalVotes: number;
  readonly supportVotes: number;
  readonly opposeVotes: number;
  readonly supportPercentage: number;
  readonly sentimentByVoteType: Record<string, number>;
  readonly voteTimeline: readonly VoteTimelineEntry[];
}

/**
 * Vote timeline entry
 */
export interface VoteTimelineEntry {
  readonly date: string;
  readonly supportCount: number;
  readonly opposeCount: number;
  readonly totalCount: number;
}

// ============================================================================
// Analytics Filters
// ============================================================================

/**
 * Filters for analytics queries
 */
export interface AnalyticsFilters {
  readonly dateRange?: {
    readonly start: string;
    readonly end: string;
  };
  readonly billStatus?: string[];
  readonly categories?: string[];
  readonly location?: string;
  readonly tags?: string[];
  readonly minimumViews?: number;
  readonly minimumEngagement?: number;
  readonly sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  readonly demographic?: string;
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQueryParams {
  readonly filters: AnalyticsFilters;
  readonly metrics?: string[];
  readonly groupBy?: 'category' | 'location' | 'date' | 'demographic';
  readonly orderBy?: 'views' | 'engagement' | 'trending' | 'recent';
  readonly limit?: number;
  readonly offset?: number;
}

// ============================================================================
// Analytics Response Types
// ============================================================================

/**
 * Generic analytics response
 */
export interface AnalyticsResponse<T> {
  readonly data: T[];
  readonly summary: {
    readonly total: number;
    readonly average: number;
    readonly highest: number;
    readonly lowest: number;
  };
  readonly period: {
    readonly start: string;
    readonly end: string;
  };
  readonly generatedAt: string;
}

/**
 * Paginated analytics response
 */
export interface PaginatedAnalyticsResponse<T> extends AnalyticsResponse<T> {
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if value is BillAnalytics
 */
export function isBillAnalytics(value: unknown): value is BillAnalytics {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.bill_id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.views === 'number' &&
    typeof obj.engagement_score === 'number'
  );
}

/**
 * Type guard to check if value is UserEngagementSummary
 */
export function isUserEngagementSummary(value: unknown): value is UserEngagementSummary {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.userId === 'number' &&
    typeof obj.totalBillsViewed === 'number' &&
    typeof obj.engagementScore === 'number'
  );
}
