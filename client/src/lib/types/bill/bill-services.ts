/**
 * Bill Services Types
 *
 * Types for API responses, service operations, and data persistence
 * related to bills.
 *
 * @module shared/types/bill
 */

import type {
  Bill,
  BillAnalysis,
  BillAction,
  BillVersion,
  CommitteeAssignment,
  VoteRecord,
} from './bill-base';

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Paginated response for bill listings
 */
export interface PaginatedBillsResponse {
  readonly data: Bill[];
  readonly pagination: {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
  };
  readonly generatedAt: string;
}

/**
 * Single bill response
 */
export interface BillResponse {
  readonly data: Bill;
  readonly generatedAt: string;
}

/**
 * Bill analysis response
 */
export interface BillAnalysisResponse {
  readonly data: BillAnalysis;
  readonly generatedAt: string;
}

/**
 * Create/update response wrapper
 */
export interface CreateResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly timestamp: string;
}

/**
 * Update response
 */
export interface UpdateResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly changes?: Record<string, unknown>;
  readonly error?: string;
  readonly timestamp: string;
}

/**
 * Delete response
 */
export interface DeleteResponse {
  readonly success: boolean;
  readonly id?: number | string;
  readonly error?: string;
  readonly timestamp: string;
}

/**
 * List response wrapper
 */
export interface ListResponse<T> {
  readonly items: T[];
  readonly total: number;
  readonly count: number;
  readonly hasMore: boolean;
  readonly timestamp: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly timestamp: string;
}


/**
 * Global bills statistics
 */
export interface BillsStats {
  readonly totalBills: number;
  readonly billsByStatus: Record<string, number>;
  readonly activeBills: number;
  readonly passedBills: number;
  readonly upcomingVotes: number;
  readonly trendingBills?: number;
}

/**
 * Bill update event type for tracking service
 */
export interface BillUpdate {
  readonly type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 'sponsor_change';
  readonly data: {
    readonly billId: number;
    readonly title?: string;
    readonly oldStatus?: string;
    readonly newStatus?: string;
    readonly commentCount?: number;
    readonly viewCount?: number;
    readonly shareCount?: number;
    readonly timestamp: string;
    readonly [key: string]: any;
  };
}

// ============================================================================
// Bill Action and History Types
// ============================================================================

/**
 * Bill timeline with actions
 */
export interface BillTimeline {
  readonly billId: number;
  readonly actions: readonly BillAction[];
  readonly firstAction: string;
  readonly lastAction: string;
  readonly status: string;
  readonly progressPercentage: number;
}

/**
 * Bill history record
 */
export interface BillHistory {
  readonly billId: number;
  readonly changes: readonly BillChange[];
  readonly totalChanges: number;
  readonly firstModified: string;
  readonly lastModified: string;
}

/**
 * Individual bill change
 */
export interface BillChange {
  readonly fieldName: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly changedAt: string;
  readonly changedBy: string;
  readonly reason?: string;
}

// ============================================================================
// Committee and Vote Types
// ============================================================================

/**
 * Committee assignment list
 */
export interface CommitteeAssignmentResponse {
  readonly billId: number;
  readonly assignments: readonly CommitteeAssignment[];
  readonly activeAssignments: number;
}

/**
 * Vote summary response
 */
export interface VoteSummaryResponse {
  readonly billId: number;
  readonly chamber: 'House' | 'Senate' | 'Both';
  readonly totalVotes: number;
  readonly yeaVotes: number;
  readonly nayVotes: number;
  readonly absenteeVotes: number;
  readonly yesPercentage: number;
  readonly noPercentage: number;
  readonly passed: boolean;
  readonly voteDate: string;
  readonly details?: readonly VoteRecord[];
}

// ============================================================================
// Engagement and Tracking Types
// ============================================================================

/**
 * Bill engagement metrics
 */
export interface BillEngagementMetrics {
  readonly billId: number;
  readonly views: number;
  readonly uniqueVisitors: number;
  readonly timeSpentAvg: number;
  readonly bounceRate: number;
  readonly trackingCount: number;
  readonly commentCount: number;
  readonly voteCount: number;
  readonly shareCount: number;
  readonly engagementRate: number;
}

/**
 * User tracking preference
 */
export interface BillTrackingPreference {
  readonly userId: number;
  readonly billId: number;
  readonly tracked: boolean;
  readonly trackingType?: 'status' | 'analysis' | 'comments' | 'all';
  readonly notificationEnabled: boolean;
  readonly notificationFrequency?: 'immediate' | 'daily' | 'weekly';
  readonly savedAt: string;
  readonly lastNotified?: string;
}

/**
 * Bill notification
 */
export interface BillNotification {
  readonly id: string;
  readonly userId: string;
  readonly billId: string;
  readonly type: 'status_update' | 'new_analysis' | 'comment' | 'vote_change';
  readonly message: string;
  readonly read: boolean;
  readonly createdAt: string;
  readonly actionUrl?: string;
}

/**
 * Batch bill operation
 */
export interface BatchBillOperation<T> {
  readonly operation: 'create' | 'update' | 'delete';
  readonly items: T[];
}

/**
 * Batch operation response
 */
export interface BatchOperationResponse<T> {
  readonly successful: T[];
  readonly failed: Array<{
    readonly item: T;
    readonly error: string;
  }>;
  readonly total: number;
  readonly successCount: number;
  readonly failureCount: number;
}

// ============================================================================
// Search and Filter Types
// ============================================================================

/**
 * Search result for bills
 */
export interface BillSearchResult {
  readonly id: string;
  readonly billNumber: string;
  readonly title: string;
  readonly summary: string;
  readonly status: string;
  readonly relevanceScore: number;
  readonly matchedFields?: string[];
  readonly highlightedText?: string;
}

/**
 * Bill search response
 */
export interface BillSearchResponse {
  readonly results: readonly BillSearchResult[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly query: string;
  readonly executionTime: number;
}

// ============================================================================
// Comparison and Aggregation Types
// ============================================================================

/**
 * Bill comparison
 */
export interface BillComparison {
  readonly bill1Id: number;
  readonly bill2Id: number;
  readonly bill1: Bill;
  readonly bill2: Bill;
  readonly similarities: readonly string[];
  readonly differences: readonly BillDifference[];
  readonly compatibilityScore: number;
}

/**
 * Difference in bill comparison
 */
export interface BillDifference {
  readonly field: string;
  readonly bill1Value: unknown;
  readonly bill2Value: unknown;
  readonly type: 'addition' | 'removal' | 'modification';
}

/**
 * Bill aggregation
 */
export interface BillAggregation {
  readonly metric: string;
  readonly values: readonly AggregationValue[];
  readonly total: number;
  readonly average?: number;
  readonly median?: number;
}

/**
 * Aggregation value
 */
export interface AggregationValue {
  readonly key: string;
  readonly count: number;
  readonly percentage: number;
  readonly trend?: 'up' | 'down' | 'stable';
}

// ============================================================================
// Sync and Cache Types
// ============================================================================

/**
 * Sync request
 */
export interface SyncRequest {
  readonly billId?: number;
  readonly lastSync?: string;
  readonly includeRelated?: boolean;
}

/**
 * Sync response
 */
export interface SyncResponse {
  readonly bills: readonly Bill[];
  readonly actions: readonly BillAction[];
  readonly analyses: readonly BillAnalysis[];
  readonly timestamp: string;
  readonly hasMore: boolean;
}

/**
 * Cached item
 */
export interface CachedItem<T> {
  readonly data: T;
  readonly cachedAt: string;
  readonly expiresAt: string;
  readonly etag?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for PaginatedBillsResponse
 */
export function isPaginatedBillsResponse(value: unknown): value is PaginatedBillsResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.data) && typeof obj.pagination === 'object';
}

/**
 * Type guard for BillEngagementMetrics
 */
export function isBillEngagementMetrics(value: unknown): value is BillEngagementMetrics {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.billId === 'number' &&
    typeof obj.views === 'number' &&
    typeof obj.engagementRate === 'number'
  );
}
