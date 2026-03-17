/**
 * Community Domain - Notification Types
 * 
 * Types for user notifications and notification preferences.
 * Migrated from server/features/notifications/domain/types.ts
 * 
 * @module shared/types/domains/community/notification-types
 */

import { BillTrackingPreferences } from '../authentication/user-management-types';

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Global bill tracking preferences extended for notifications
 * Combines general bill tracking with notification-specific settings
 */
export interface CombinedBillTrackingPreferences extends BillTrackingPreferences {
  // Additional notification-specific preferences can be added here
  // This extends the core bill tracking preferences defined in authentication domain
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  bodyTemplate: string;
  variables: string[];
}

/**
 * Notification delivery status
 */
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'bounced' | 'unsubscribed';

/**
 * Notification delivery channel
 */
export type NotificationChannel = 'email' | 'push' | 'sms' | 'inApp';

/**
 * User notification record
 */
export interface UserNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  status: NotificationStatus[];
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
}
