/**
 * Notifications Feature - Shared Validation Schemas
 * 
 * Zod schemas for validating notification-related inputs.
 * Shared between client and server for consistent validation.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

const IdSchema = z.number().int().positive();
const UrlSchema = z.string().url();
const PageSchema = z.number().int().positive().default(1);
const LimitSchema = z.number().int().positive().max(100).default(20);

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
  user_id: IdSchema,
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  priority: NotificationPrioritySchema.default('normal'),
  channels: z.array(NotificationChannelSchema).min(1).max(5).default(['in_app']),
  related_bill_id: IdSchema.optional(),
  related_comment_id: IdSchema.optional(),
  related_user_id: IdSchema.optional(),
  action_url: UrlSchema.optional(),
  metadata: z.record(z.any()).optional(),
  expires_at: z.string().datetime().optional(),
});

export const UpdateNotificationSchema = z.object({
  status: NotificationStatusSchema.optional(),
  read_at: z.string().datetime().optional(),
});

export const BulkCreateNotificationsSchema = z.object({
  user_ids: z.array(IdSchema).min(1).max(1000),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  priority: NotificationPrioritySchema.default('normal'),
  channels: z.array(NotificationChannelSchema).min(1).max(5).default(['in_app']),
  related_bill_id: IdSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

// ============================================================================
// Notification Preferences Schemas
// ============================================================================

export const UpdatePreferencesSchema = z.object({
  user_id: IdSchema,
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
  user_id: IdSchema,
});

// ============================================================================
// Bill Tracking Schemas
// ============================================================================

export const TrackBillSchema = z.object({
  user_id: IdSchema,
  bill_id: IdSchema,
  notification_types: z.array(NotificationTypeSchema).min(1).max(10),
});

export const UntrackBillSchema = z.object({
  user_id: IdSchema,
  bill_id: IdSchema,
});

export const GetTrackedBillsSchema = z.object({
  user_id: IdSchema,
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

// ============================================================================
// Notification Query Schemas
// ============================================================================

export const GetNotificationsSchema = z.object({
  user_id: IdSchema,
  type: NotificationTypeSchema.optional(),
  status: NotificationStatusSchema.optional(),
  priority: NotificationPrioritySchema.optional(),
  unread_only: z.boolean().default(false),
  page: PageSchema.optional(),
  limit: LimitSchema.optional(),
});

export const MarkAsReadSchema = z.object({
  notification_ids: z.array(IdSchema).min(1).max(100),
});

export const MarkAllAsReadSchema = z.object({
  user_id: IdSchema,
  before_date: z.string().datetime().optional(),
});

export const DeleteNotificationsSchema = z.object({
  notification_ids: z.array(IdSchema).min(1).max(100),
});

// ============================================================================
// Type Exports
// ============================================================================

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;
export type BulkCreateNotificationsInput = z.infer<typeof BulkCreateNotificationsSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
export type GetPreferencesInput = z.infer<typeof GetPreferencesSchema>;
export type TrackBillInput = z.infer<typeof TrackBillSchema>;
export type UntrackBillInput = z.infer<typeof UntrackBillSchema>;
export type GetTrackedBillsInput = z.infer<typeof GetTrackedBillsSchema>;
export type GetNotificationsInput = z.infer<typeof GetNotificationsSchema>;
export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>;
export type MarkAllAsReadInput = z.infer<typeof MarkAllAsReadSchema>;
export type DeleteNotificationsInput = z.infer<typeof DeleteNotificationsSchema>;
