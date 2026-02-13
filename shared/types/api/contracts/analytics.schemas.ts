/**
 * Analytics API Validation Schemas
 * Zod schemas for runtime validation of analytics endpoints
 */

import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

export const GetAnalyticsMetricsRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
});

export const GetBillAnalyticsRequestSchema = z.object({
  billId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const GetUserAnalyticsRequestSchema = z.object({
  userId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const TrackEventRequestSchema = z.object({
  eventType: z.string().min(1),
  eventData: z.record(z.unknown()),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  timestamp: z.date().optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

const AnalyticsMetricsSchema = z.object({
  totalViews: z.number().int().nonnegative(),
  uniqueVisitors: z.number().int().nonnegative(),
  averageSessionDuration: z.number().nonnegative(),
  bounceRate: z.number().min(0).max(1),
  topPages: z.array(z.object({
    path: z.string(),
    views: z.number().int().nonnegative(),
    uniqueVisitors: z.number().int().nonnegative(),
  })),
});

const BillAnalyticsSchema = z.object({
  billId: z.string().uuid(),
  views: z.number().int().nonnegative(),
  uniqueViewers: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  votes: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  engagementRate: z.number().min(0).max(1),
  averageTimeSpent: z.number().nonnegative(),
});

const UserAnalyticsSchema = z.object({
  userId: z.string().uuid(),
  totalSessions: z.number().int().nonnegative(),
  totalPageViews: z.number().int().nonnegative(),
  averageSessionDuration: z.number().nonnegative(),
  lastActive: z.date(),
  topActions: z.array(z.object({
    action: z.string(),
    count: z.number().int().nonnegative(),
  })),
});

export const GetAnalyticsMetricsResponseSchema = z.object({
  metrics: AnalyticsMetricsSchema,
  period: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
});

export const GetBillAnalyticsResponseSchema = z.object({
  analytics: BillAnalyticsSchema,
  period: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
});

export const GetUserAnalyticsResponseSchema = z.object({
  analytics: UserAnalyticsSchema,
  period: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
});

export const TrackEventResponseSchema = z.object({
  success: z.boolean(),
  eventId: z.string().uuid(),
  timestamp: z.date(),
});
