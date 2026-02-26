/**
 * Analytics API Contracts
 * Type-safe API contracts for analytics-related endpoints
 */

import { BillId, UserId } from '../../core/branded';

// ============================================================================
// Domain Types
// ============================================================================

export interface BillAnalytics {
  billId: BillId;
  views: number;
  uniqueViewers: number;
  comments: number;
  votes: number;
  shares: number;
  engagementRate: number;
  averageTimeSpent: number;
}

export interface UserAnalytics {
  userId: UserId;
  totalSessions: number;
  totalPageViews: number;
  averageSessionDuration: number;
  lastActive: Date;
  topActions: Array<{
    action: string;
    count: number;
  }>;
}

export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  totalBills: number;
  totalComments: number;
  totalVotes: number;
  engagementRate: number;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Get Analytics Metrics Request (query params)
 */
export interface GetAnalyticsMetricsRequest {
  startDate?: string;
  endDate?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Get Bill Analytics Request (path params)
 */
export interface GetBillAnalyticsRequest {
  billId: BillId;
  startDate?: string;
  endDate?: string;
}

/**
 * Get User Analytics Request (path params)
 */
export interface GetUserAnalyticsRequest {
  userId: UserId;
  startDate?: string;
  endDate?: string;
}

/**
 * Track Event Request
 */
export interface TrackEventRequest {
  eventType: string;
  eventData: Record<string, unknown>;
  userId?: UserId;
  sessionId?: string;
  timestamp?: Date;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Get Analytics Metrics Response
 */
export interface GetAnalyticsMetricsResponse {
  metrics: AnalyticsMetrics;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Get Bill Analytics Response
 */
export interface GetBillAnalyticsResponse {
  analytics: BillAnalytics;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Get User Analytics Response
 */
export interface GetUserAnalyticsResponse {
  analytics: UserAnalytics;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Track Event Response
 */
export interface TrackEventResponse {
  success: boolean;
  eventId: string;
  timestamp: Date;
}
