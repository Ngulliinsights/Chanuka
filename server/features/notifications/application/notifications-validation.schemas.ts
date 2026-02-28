/**
 * Notifications Feature - Validation Schemas
 * 
 * Zod schemas for validating notification-related inputs.
 * Uses common schemas from validation helpers for consistency.
 */

import { z } from 'zod';
import { CommonSchemas } from '@server/infrastructure/validation/validation-helpers';

// ============================================================================
// Notification Type and Priority Enums
// ============================================================================

export const NotificationTypeSchema = z.enum([
  'bill_update',
  'comment_reply',
  'verification_status',
  'system_alert',
  'bill_status_change',
  'new_comment',
  'amendment',
  'voting_scheduled',
  'sponsor_update',
  'engagement_milestone',
  'moderation_action',
  'achievement'
]);

export const NotificationPrioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'urgent'
]);

export const NotificationChannelSchema = z.enum([
  'in_app',
  'email',
  'sms',
  'push',
  'webhook'
]);

export const NotificationStatusSchema = z.enum([
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'cancelled'
]);

// ============================================================================
// Notification Creation and Update Schemas
// ============================================================================

export const CreateNotificationSchema = z.object({
  user_id: CommonSchemas.id,
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  priority: NotificationPrioritySchema.default('normal'),
  channels: z.array(NotificationChannelSchema).min(1).max(5).default(['in_app']),
  related_bill_id: CommonSchemas.id.optional(),
  related_comment_id: CommonSchemas.id.optional(),
  related_user_id: CommonSchemas.id.optional(),
  action_url: CommonSchemas.url.optional(),
  metadata: z.record(z.any()).optional(),
  expires_at: z.string().datetime().optional(),
});

export const UpdateNotificationSchema = z.object({
  status: NotificationStatusSchema.optional(),
  read_at: z.string().datetime().optional(),
});

export const BulkCreateNotificationsSchema = z.object({
  user_ids: z.array(CommonSchemas.id).min(1).max(1000),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  priority: NotificationPrioritySchema.default('normal'),
  channels: z.array(NotificationChannelSchema).min(1).max(5).default(['in_app']),
  related_bill_id: CommonSchemas.id.optional(),
  metadata: z.record(z.any()).optional(),
});

// ============================================================================
// Notification Preferences Schemas
// ============================================================================

export const UpdatePreferencesSchema = z.object({
  user_id: CommonSchemas.id,
  preferences: z.object({
    enabled_channels: z.array(NotificationChannelSchema).optional(),
    enabled_types: z.array(NotificationTypeSchema).optional(),
    quiet_hours: z.object({
      enabled: z.boolean(),
      start_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
      timezone: z.string().max(50),
    }).optional(),
    frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional(),
    digest_enabled: z.boolean().optional(),
  }),
});

export const GetPreferencesSchema = z.object({
  user_id: CommonSchemas.id,
});

// ============================================================================
// Bill Tracking Schemas
// ============================================================================

export const TrackBillSchema = z.object({
  user_id: CommonSchemas.id,
  bill_id: CommonSchemas.id,
  notification_types: z.array(NotificationTypeSchema).min(1).max(10),
  channels: z.array(NotificationChannelSchema).min(1).max(5),
});

export const UntrackBillSchema = z.object({
  user_id: CommonSchemas.id,
  bill_id: CommonSchemas.id,
});

export const GetTrackedBillsSchema = z.object({
  user_id: CommonSchemas.id,
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

// ============================================================================
// Alert Preferences Schemas
// ============================================================================

export const CreateAlertPreferenceSchema = z.object({
  user_id: CommonSchemas.id,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  is_active: z.boolean().default(true),
  conditions: z.object({
    bill_categories: z.array(z.string().max(100)).optional(),
    bill_statuses: z.array(z.string().max(50)).optional(),
    sponsor_ids: z.array(CommonSchemas.id).optional(),
    keywords: z.array(z.string().max(100)).optional(),
    location: z.string().max(200).optional(),
  }),
  alert_types: z.array(z.object({
    type: NotificationTypeSchema,
    enabled: z.boolean(),
    priority: NotificationPrioritySchema,
    channels: z.array(NotificationChannelSchema),
  })).min(1).max(10),
});

export const UpdateAlertPreferenceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  is_active: z.boolean().optional(),
  conditions: z.object({
    bill_categories: z.array(z.string().max(100)).optional(),
    bill_statuses: z.array(z.string().max(50)).optional(),
    sponsor_ids: z.array(CommonSchemas.id).optional(),
    keywords: z.array(z.string().max(100)).optional(),
    location: z.string().max(200).optional(),
  }).optional(),
  alert_types: z.array(z.object({
    type: NotificationTypeSchema,
    enabled: z.boolean(),
    priority: NotificationPrioritySchema,
    channels: z.array(NotificationChannelSchema),
  })).optional(),
});

// ============================================================================
// Query and Filter Schemas
// ============================================================================

export const GetNotificationsSchema = z.object({
  user_id: CommonSchemas.id,
  type: NotificationTypeSchema.optional(),
  status: NotificationStatusSchema.optional(),
  priority: NotificationPrioritySchema.optional(),
  unread_only: z.boolean().default(false),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: CommonSchemas.page.optional(),
  limit: CommonSchemas.limit.optional(),
});

export const MarkAsReadSchema = z.object({
  notification_ids: z.array(CommonSchemas.id).min(1).max(100),
});

export const MarkAllAsReadSchema = z.object({
  user_id: CommonSchemas.id,
  before_date: z.string().datetime().optional(),
});

export const DeleteNotificationsSchema = z.object({
  notification_ids: z.array(CommonSchemas.id).min(1).max(100),
});

// ============================================================================
// Analytics Schemas
// ============================================================================

export const GetNotificationStatsSchema = z.object({
  user_id: CommonSchemas.id.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(['type', 'channel', 'priority', 'status']).optional(),
});

export const GetDeliveryStatsSchema = z.object({
  notification_type: NotificationTypeSchema.optional(),
  channel: NotificationChannelSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;
export type BulkCreateNotificationsInput = z.infer<typeof BulkCreateNotificationsSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
export type GetPreferencesInput = z.infer<typeof GetPreferencesSchema>;
export type TrackBillInput = z.infer<typeof TrackBillSchema>;
export type UntrackBillInput = z.infer<typeof UntrackBillSchema>;
export type GetTrackedBillsInput = z.infer<typeof GetTrackedBillsSchema>;
export type CreateAlertPreferenceInput = z.infer<typeof CreateAlertPreferenceSchema>;
export type UpdateAlertPreferenceInput = z.infer<typeof UpdateAlertPreferenceSchema>;
export type GetNotificationsInput = z.infer<typeof GetNotificationsSchema>;
export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>;
export type MarkAllAsReadInput = z.infer<typeof MarkAllAsReadSchema>;
export type DeleteNotificationsInput = z.infer<typeof DeleteNotificationsSchema>;
export type GetNotificationStatsInput = z.infer<typeof GetNotificationStatsSchema>;
export type GetDeliveryStatsInput = z.infer<typeof GetDeliveryStatsSchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
