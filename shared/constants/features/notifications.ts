/**
 * Notifications Feature - Constants
 * 
 * Shared constants for notifications feature
 * Used by both client and server
 */

// ============================================================================
// Notification Types
// ============================================================================

export const NOTIFICATION_TYPES = {
  BILL_UPDATE: 'bill_update',
  COMMENT_REPLY: 'comment_reply',
  VERIFICATION_STATUS: 'verification_status',
  SYSTEM_ALERT: 'system_alert',
  BILL_STATUS_CHANGE: 'bill_status_change',
  NEW_COMMENT: 'new_comment',
  AMENDMENT: 'amendment',
  VOTING_SCHEDULED: 'voting_scheduled',
  SPONSOR_UPDATE: 'sponsor_update',
  ENGAGEMENT_MILESTONE: 'engagement_milestone',
  MODERATION_ACTION: 'moderation_action',
  ACHIEVEMENT: 'achievement',
} as const;

export const NOTIFICATION_TYPE_LABELS = {
  [NOTIFICATION_TYPES.BILL_UPDATE]: 'Bill Update',
  [NOTIFICATION_TYPES.COMMENT_REPLY]: 'Comment Reply',
  [NOTIFICATION_TYPES.VERIFICATION_STATUS]: 'Verification Status',
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: 'System Alert',
  [NOTIFICATION_TYPES.BILL_STATUS_CHANGE]: 'Bill Status Change',
  [NOTIFICATION_TYPES.NEW_COMMENT]: 'New Comment',
  [NOTIFICATION_TYPES.AMENDMENT]: 'Amendment',
  [NOTIFICATION_TYPES.VOTING_SCHEDULED]: 'Voting Scheduled',
  [NOTIFICATION_TYPES.SPONSOR_UPDATE]: 'Sponsor Update',
  [NOTIFICATION_TYPES.ENGAGEMENT_MILESTONE]: 'Engagement Milestone',
  [NOTIFICATION_TYPES.MODERATION_ACTION]: 'Moderation Action',
  [NOTIFICATION_TYPES.ACHIEVEMENT]: 'Achievement',
} as const;

// ============================================================================
// Notification Priority
// ============================================================================

export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const NOTIFICATION_PRIORITY_LABELS = {
  [NOTIFICATION_PRIORITY.LOW]: 'Low',
  [NOTIFICATION_PRIORITY.NORMAL]: 'Normal',
  [NOTIFICATION_PRIORITY.HIGH]: 'High',
  [NOTIFICATION_PRIORITY.URGENT]: 'Urgent',
} as const;

export const NOTIFICATION_PRIORITY_COLORS = {
  [NOTIFICATION_PRIORITY.LOW]: 'gray',
  [NOTIFICATION_PRIORITY.NORMAL]: 'blue',
  [NOTIFICATION_PRIORITY.HIGH]: 'orange',
  [NOTIFICATION_PRIORITY.URGENT]: 'red',
} as const;

// ============================================================================
// Notification Channels
// ============================================================================

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  WEBHOOK: 'webhook',
} as const;

export const NOTIFICATION_CHANNEL_LABELS = {
  [NOTIFICATION_CHANNELS.IN_APP]: 'In-App',
  [NOTIFICATION_CHANNELS.EMAIL]: 'Email',
  [NOTIFICATION_CHANNELS.SMS]: 'SMS',
  [NOTIFICATION_CHANNELS.PUSH]: 'Push Notification',
  [NOTIFICATION_CHANNELS.WEBHOOK]: 'Webhook',
} as const;

// ============================================================================
// Notification Status
// ============================================================================

export const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const NOTIFICATION_STATUS_LABELS = {
  [NOTIFICATION_STATUS.PENDING]: 'Pending',
  [NOTIFICATION_STATUS.SENT]: 'Sent',
  [NOTIFICATION_STATUS.DELIVERED]: 'Delivered',
  [NOTIFICATION_STATUS.READ]: 'Read',
  [NOTIFICATION_STATUS.FAILED]: 'Failed',
  [NOTIFICATION_STATUS.CANCELLED]: 'Cancelled',
} as const;

// ============================================================================
// Notification Frequency
// ============================================================================

export const NOTIFICATION_FREQUENCY = {
  IMMEDIATE: 'immediate',
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

export const NOTIFICATION_FREQUENCY_LABELS = {
  [NOTIFICATION_FREQUENCY.IMMEDIATE]: 'Immediate',
  [NOTIFICATION_FREQUENCY.HOURLY]: 'Hourly Digest',
  [NOTIFICATION_FREQUENCY.DAILY]: 'Daily Digest',
  [NOTIFICATION_FREQUENCY.WEEKLY]: 'Weekly Digest',
} as const;

// ============================================================================
// Notification Limits
// ============================================================================

export const NOTIFICATION_LIMITS = {
  MIN_TITLE_LENGTH: 1,
  MAX_TITLE_LENGTH: 200,
  MIN_MESSAGE_LENGTH: 1,
  MAX_MESSAGE_LENGTH: 1000,
  MIN_CHANNELS: 1,
  MAX_CHANNELS: 5,
  MIN_BULK_USERS: 1,
  MAX_BULK_USERS: 1000,
  MIN_NOTIFICATION_TYPES: 1,
  MAX_NOTIFICATION_TYPES: 10,
  MIN_MARK_AS_READ: 1,
  MAX_MARK_AS_READ: 100,
  MIN_DELETE: 1,
  MAX_DELETE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_TIMEZONE_LENGTH: 50,
} as const;

// ============================================================================
// Notification Defaults
// ============================================================================

export const NOTIFICATION_DEFAULTS = {
  PRIORITY: NOTIFICATION_PRIORITY.NORMAL,
  CHANNELS: [NOTIFICATION_CHANNELS.IN_APP],
  FREQUENCY: NOTIFICATION_FREQUENCY.IMMEDIATE,
  UNREAD_ONLY: false,
  PAGE: 1,
  LIMIT: 20,
  DIGEST_ENABLED: false,
  QUIET_HOURS_ENABLED: false,
} as const;
