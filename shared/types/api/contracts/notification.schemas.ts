/**
 * Notification API Validation Schemas
 * Zod schemas for runtime validation of notification endpoints
 */

import { z } from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateNotificationRequestSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

export const GetNotificationsRequestSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  unreadOnly: z.boolean().optional(),
});

export const MarkNotificationReadRequestSchema = z.object({
  id: z.string().uuid(),
});

export const DeleteNotificationRequestSchema = z.object({
  id: z.string().uuid(),
});

export const UpdateNotificationPreferencesRequestSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  channels: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    inApp: z.boolean().optional(),
  }).optional(),
  filters: z.record(z.boolean()).optional(),
});

export const TestNotificationFilterRequestSchema = z.object({
  filters: z.record(z.boolean()),
  sampleNotification: z.object({
    type: z.string(),
    title: z.string(),
    message: z.string(),
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

const NotificationPreferencesSchema = z.object({
  userId: z.string().uuid(),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  channels: z.object({
    email: z.boolean(),
    push: z.boolean(),
    inApp: z.boolean(),
  }),
  filters: z.record(z.boolean()).optional(),
});

const NotificationStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  unread: z.number().int().nonnegative(),
  read: z.number().int().nonnegative(),
});

export const CreateNotificationResponseSchema = z.object({
  notification: NotificationSchema,
});

export const GetNotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});

export const MarkNotificationReadResponseSchema = z.object({
  success: z.boolean(),
  notification: NotificationSchema,
});

export const MarkAllNotificationsReadResponseSchema = z.object({
  success: z.boolean(),
  count: z.number().int().nonnegative(),
});

export const DeleteNotificationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const GetNotificationStatsResponseSchema = z.object({
  stats: NotificationStatsSchema,
});

export const GetNotificationPreferencesResponseSchema = z.object({
  preferences: NotificationPreferencesSchema,
});

export const UpdateNotificationPreferencesResponseSchema = z.object({
  preferences: NotificationPreferencesSchema,
});

export const TestNotificationFilterResponseSchema = z.object({
  wouldReceive: z.boolean(),
  reason: z.string(),
});

export const GetNotificationServiceStatusResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'down']),
  uptime: z.number().nonnegative(),
  lastCheck: z.date(),
  metrics: z.object({
    totalSent: z.number().int().nonnegative(),
    totalFailed: z.number().int().nonnegative(),
    averageDeliveryTime: z.number().nonnegative(),
  }),
});
