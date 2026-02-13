/**
 * Notification API Contracts
 * Type-safe API contracts for notification-related endpoints
 */

import { UserId } from '../../core/branded';

// ============================================================================
// Domain Types
// ============================================================================

export interface Notification {
  id: string;
  userId: UserId;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  userId: UserId;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  filters?: Record<string, boolean>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Create Notification Request
 */
export interface CreateNotificationRequest {
  userId: UserId;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get Notifications Request (query params)
 */
export interface GetNotificationsRequest {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Mark Notification as Read Request (path params)
 */
export interface MarkNotificationReadRequest {
  id: string;
}

/**
 * Delete Notification Request (path params)
 */
export interface DeleteNotificationRequest {
  id: string;
}

/**
 * Update Notification Preferences Request
 */
export interface UpdateNotificationPreferencesRequest {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  channels?: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
  };
  filters?: Record<string, boolean>;
}

/**
 * Test Notification Filter Request
 */
export interface TestNotificationFilterRequest {
  filters: Record<string, boolean>;
  sampleNotification: {
    type: string;
    title: string;
    message: string;
  };
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Create Notification Response
 */
export interface CreateNotificationResponse {
  notification: Notification;
}

/**
 * Get Notifications Response
 */
export interface GetNotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Mark Notification as Read Response
 */
export interface MarkNotificationReadResponse {
  success: boolean;
  notification: Notification;
}

/**
 * Mark All Notifications as Read Response
 */
export interface MarkAllNotificationsReadResponse {
  success: boolean;
  count: number;
}

/**
 * Delete Notification Response
 */
export interface DeleteNotificationResponse {
  success: boolean;
  message: string;
}

/**
 * Get Notification Stats Response
 */
export interface GetNotificationStatsResponse {
  stats: NotificationStats;
}

/**
 * Get Notification Preferences Response
 */
export interface GetNotificationPreferencesResponse {
  preferences: NotificationPreferences;
}

/**
 * Update Notification Preferences Response
 */
export interface UpdateNotificationPreferencesResponse {
  preferences: NotificationPreferences;
}

/**
 * Test Notification Filter Response
 */
export interface TestNotificationFilterResponse {
  wouldReceive: boolean;
  reason: string;
}

/**
 * Get Notification Service Status Response
 */
export interface GetNotificationServiceStatusResponse {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  lastCheck: Date;
  metrics: {
    totalSent: number;
    totalFailed: number;
    averageDeliveryTime: number;
  };
}
