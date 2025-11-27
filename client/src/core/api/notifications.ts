/**
 * Notification API Service
 * Core API communication layer for notification functionality
 * 
 * Provides comprehensive notification management including:
 * - Push notification subscription and delivery
 * - User preference management
 * - Notification CRUD operations
 * - Bulk operations and statistics
 * - Real-time notification delivery
 * 
 * @module api/notifications
 */

import { globalApiClient } from './client';
import { logger } from '@client/utils/logger';
import { globalErrorHandler } from './errors';

// ============================================================================
// Type Re-exports
// ============================================================================

// Re-export types from main notification service for convenience
export type {
  Notification,
  NotificationPreferences,
  NotificationType,
  NotificationCategory
} from '@client/services/notification-service';

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Bulk operation actions
 */
export type BulkAction = 'mark_read' | 'delete';

/**
 * VAPID public key response
 */
export interface VapidKeyResponse {
  /** Base64-encoded VAPID public key for push subscriptions */
  publicKey: string;
}

/**
 * Push subscription payload sent to backend
 */
export interface PushSubscriptionPayload {
  /** Serialized PushSubscription object */
  subscription: PushSubscriptionJSON;
  /** Browser user agent string */
  userAgent: string;
  /** ISO timestamp of subscription creation */
  timestamp: string;
}

/**
 * Options for fetching notifications
 */
export interface GetNotificationsOptions {
  /** Maximum number of notifications to return */
  limit?: number;
  /** Number of notifications to skip (for pagination) */
  offset?: number;
  /** Only return unread notifications */
  unreadOnly?: boolean;
  /** Only return notifications after this ISO timestamp */
  since?: string;
  /** Filter by notification category */
  category?: string;
}

/**
 * Notification to be sent (admin/system use)
 */
export interface SendNotificationPayload {
  /** Notification type identifier */
  type: string;
  /** Notification title */
  title: string;
  /** Notification body message */
  message: string;
  /** Target user ID (omit for broadcast) */
  userId?: string;
  /** Additional notification data */
  data?: Record<string, unknown>;
  /** Priority level for delivery and display */
  priority?: NotificationPriority;
}

/**
 * Notification statistics response
 */
export interface NotificationStats {
  /** Total notification count */
  total: number;
  /** Unread notification count */
  unread: number;
  /** Count breakdown by category */
  byCategory: Record<string, number>;
  /** Count breakdown by priority */
  byPriority: Record<string, number>;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResult {
  /** Whether the operation completed successfully */
  success: boolean;
  /** Number of notifications processed */
  processed: number;
  /** List of error messages for failed operations */
  errors: string[];
}

// ============================================================================
// Notification API Service Class
// ============================================================================

/**
 * Centralized service for all notification-related API operations.
 * 
 * This service provides a unified interface for:
 * - Managing push notification subscriptions
 * - Loading and updating user notification preferences
 * - Fetching, marking, and deleting notifications
 * - Sending notifications (admin/system use)
 * - Retrieving notification statistics
 * - Performing bulk operations on multiple notifications
 * 
 * All methods include comprehensive error handling, structured logging,
 * and type-safe response contracts.
 * 
 * @example
 * ```typescript
 * // Subscribe to push notifications
 * const subscription = await registration.pushManager.subscribe({...});
 * await notificationApiService.sendPushSubscription(subscription, navigator.userAgent);
 * 
 * // Fetch unread notifications
 * const unread = await notificationApiService.getNotifications({ unreadOnly: true });
 * 
 * // Mark notification as read
 * await notificationApiService.markAsRead(notificationId);
 * ```
 */
export class NotificationApiService {
  private readonly baseUrl: string;
  private readonly notificationsEndpoint: string;

  /**
   * Creates a new NotificationApiService instance
   * 
   * @param baseUrl - Base API URL, defaults to '/api'
   */
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.notificationsEndpoint = `${baseUrl}/notifications`;
    
    logger.debug('NotificationApiService initialized', {
      component: 'NotificationApiService',
      baseUrl,
      notificationsEndpoint: this.notificationsEndpoint
    });
  }

  // ==========================================================================
  // Push Notification Methods
  // ==========================================================================

  /**
   * Retrieves the VAPID public key for push notification subscriptions.
   * 
   * The VAPID public key is required when subscribing to push notifications
   * through the browser's Push API. This key identifies the application
   * to push services and enables secure message delivery.
   * 
   * @returns Promise resolving to the base64-encoded VAPID public key
   * @throws Error if the key cannot be retrieved
   * 
   * @example
   * ```typescript
   * const publicKey = await notificationApiService.getVapidPublicKey();
   * const subscription = await registration.pushManager.subscribe({
   *   userVisibleOnly: true,
   *   applicationServerKey: urlBase64ToUint8Array(publicKey)
   * });
   * ```
   */
  async getVapidPublicKey(): Promise<string> {
    const operation = 'getVapidPublicKey';
    
    try {
      logger.debug('Fetching VAPID public key', {
        component: 'NotificationApiService',
        operation
      });

      const response = await globalApiClient.get<VapidKeyResponse>(
        `${this.notificationsEndpoint}/vapid-key`
      );

      logger.info('VAPID public key retrieved successfully', {
        component: 'NotificationApiService',
        operation
      });

      return response.data.publicKey;
    } catch (error) {
      logger.error('Failed to get VAPID public key', {
        component: 'NotificationApiService',
        operation,
        error
      });
      throw await this.handleNotificationError(error, 'Failed to retrieve VAPID public key');
    }
  }

  /**
   * Sends a push notification subscription to the backend.
   * 
   * After successfully subscribing through the browser's Push API,
   * the subscription must be registered with the backend server
   * so it can send push notifications to this device.
   * 
   * @param subscription - PushSubscription object from browser
   * @param userAgent - Browser user agent string for debugging
   * @throws Error if subscription cannot be registered
   * 
   * @example
   * ```typescript
   * const registration = await navigator.serviceWorker.ready;
   * const subscription = await registration.pushManager.subscribe({
   *   userVisibleOnly: true,
   *   applicationServerKey: vapidKey
   * });
   * 
   * await notificationApiService.sendPushSubscription(
   *   subscription,
   *   navigator.userAgent
   * );
   * ```
   */
  async sendPushSubscription(
    subscription: PushSubscription,
    userAgent: string
  ): Promise<void> {
    const operation = 'sendPushSubscription';
    
    try {
      logger.debug('Sending push subscription', {
        component: 'NotificationApiService',
        operation
      });

      const payload: PushSubscriptionPayload = {
        subscription: subscription.toJSON(),
        userAgent,
        timestamp: new Date().toISOString()
      };

      await globalApiClient.post(
        `${this.notificationsEndpoint}/push-subscription`,
        payload,
        { skipCache: true }
      );

      logger.info('Push subscription registered successfully', {
        component: 'NotificationApiService',
        operation
      });
    } catch (error) {
      logger.error('Failed to send push subscription', {
        component: 'NotificationApiService',
        operation,
        error
      });
      throw await this.handleNotificationError(error, 'Failed to register push subscription');
    }
  }

  // ==========================================================================
  // Preference Management Methods
  // ==========================================================================

  /**
   * Retrieves user notification preferences.
   * 
   * Preferences control which types of notifications the user receives,
   * through which channels (push, email, in-app), and with what frequency.
   * 
   * @returns Promise resolving to user's notification preferences
   * @throws Error if preferences cannot be retrieved
   * 
   * @example
   * ```typescript
   * const prefs = await notificationApiService.getPreferences();
   * if (prefs.emailNotifications) {
   *   console.log('User has email notifications enabled');
   * }
   * ```
   */
  async getPreferences(): Promise<any> {
    const operation = 'getPreferences';
    
    try {
      logger.debug('Fetching notification preferences', {
        component: 'NotificationApiService',
        operation
      });

      const response = await globalApiClient.get(
        `${this.notificationsEndpoint}/preferences`
      );

      logger.info('Notification preferences retrieved successfully', {
        component: 'NotificationApiService',
        operation
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get notification preferences', {
        component: 'NotificationApiService',
        operation,
        error
      });
      throw await this.handleNotificationError(error, 'Failed to retrieve notification preferences');
    }
  }

  /**
   * Updates user notification preferences.
   * 
   * Allows users to customize their notification experience by
   * enabling/disabling specific notification types, channels,
   * and delivery options.
   * 
   * @param preferences - Updated preference object
   * @returns Promise resolving to updated preferences
   * @throws Error if preferences cannot be updated
   * 
   * @example
   * ```typescript
   * const updated = await notificationApiService.updatePreferences({
   *   emailNotifications: false,
   *   pushNotifications: true,
   *   billUpdates: true,
   *   commentReplies: true
   * });
   * ```
   */
  async updatePreferences(preferences: any): Promise<any> {
    const operation = 'updatePreferences';
    
    try {
      logger.debug('Updating notification preferences', {
        component: 'NotificationApiService',
        operation
      });

      const response = await globalApiClient.put(
        `${this.notificationsEndpoint}/preferences`,
        preferences,
        { skipCache: true }
      );

      logger.info('Notification preferences updated successfully', {
        component: 'NotificationApiService',
        operation
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update notification preferences', {
        component: 'NotificationApiService',
        operation,
        error
      });
      throw await this.handleNotificationError(error, 'Failed to update notification preferences');
    }
  }

  // ==========================================================================
  // Notification Retrieval Methods
  // ==========================================================================

  /**
   * Retrieves notifications with optional filtering and pagination.
   * 
   * Supports various query options including:
   * - Pagination via limit and offset
   * - Filtering by read status
   * - Time-based filtering
   * - Category filtering
   * 
   * @param options - Query options for filtering and pagination
   * @returns Promise resolving to array of notifications
   * @throws Error if notifications cannot be retrieved
   * 
   * @example
   * ```typescript
   * // Get first 20 unread notifications
   * const unread = await notificationApiService.getNotifications({
   *   limit: 20,
   *   unreadOnly: true
   * });
   * 
   * // Get bill-related notifications from last 24 hours
   * const yesterday = new Date(Date.now() - 86400000).toISOString();
   * const recent = await notificationApiService.getNotifications({
   *   category: 'bills',
   *   since: yesterday
   * });
   * ```
   */
  async getNotifications(options: GetNotificationsOptions = {}): Promise<any[]> {
    const operation = 'getNotifications';
    
    try {
      logger.debug('Fetching notifications', {
        component: 'NotificationApiService',
        operation,
        options
      });

      // Build query parameters from options
      const params = new URLSearchParams();
      if (options.limit !== undefined) {
        params.append('limit', options.limit.toString());
      }
      if (options.offset !== undefined) {
        params.append('offset', options.offset.toString());
      }
      if (options.unreadOnly) {
        params.append('unreadOnly', 'true');
      }
      if (options.since) {
        params.append('since', options.since);
      }
      if (options.category) {
        params.append('category', options.category);
      }

      const queryString = params.toString();
      const url = queryString 
        ? `${this.notificationsEndpoint}?${queryString}`
        : this.notificationsEndpoint;

      const response = await globalApiClient.get(url);

      logger.info('Notifications retrieved successfully', {
        component: 'NotificationApiService',
        operation,
        count: (response.data as any[])?.length || 0
      });

      return (response.data as any[]) || [];
    } catch (error) {
      logger.error('Failed to get notifications', {
        component: 'NotificationApiService',
        operation,
        options,
        error
      });
      throw await this.handleNotificationError(error, 'Failed to retrieve notifications');
    }
  }

  // ==========================================================================
  // Notification Status Methods
  // ==========================================================================

  /**
   * Marks a specific notification as read.
   * 
   * Updates the notification's read status and timestamp.
   * This affects unread counts and notification display.
   * 
   * @param notificationId - Unique notification identifier
   * @throws Error if notification cannot be marked as read
   * 
   * @example
   * ```typescript
   * await notificationApiService.markAsRead(notification.id);
   * ```
   */
  async markAsRead(notificationId: string): Promise<void> {
    const operation = 'markAsRead';
    
    try {
      logger.debug('Marking notification as read', {
        component: 'NotificationApiService',
        operation,
        notificationId
      });

      await globalApiClient.post(
        `${this.notificationsEndpoint}/${notificationId}/read`,
        {},
        { skipCache: true }
      );

      logger.info('Notification marked as read', {
        component: 'NotificationApiService',
        operation,
        notificationId
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        component: 'NotificationApiService',
        operation,
        notificationId,
        error
      });
      throw await this.handleNotificationError(
        error,
        'Failed to mark notification as read'
      );
    }
  }

  /**
   * Marks all notifications as read for the current user.
   * 
   * Batch operation that marks every unread notification as read.
   * Useful for "mark all as read" functionality in notification centers.
   * 
   * @throws Error if operation fails
   * 
   * @example
   * ```typescript
   * // Mark all as read when user clicks "Clear all"
   * await notificationApiService.markAllAsRead();
   * ```
   */
  async markAllAsRead(): Promise<void> {
    const operation = 'markAllAsRead';
    
    try {
      logger.debug('Marking all notifications as read', {
        component: 'NotificationApiService',
        operation
      });

      await globalApiClient.post(
        `${this.notificationsEndpoint}/read-all`,
        {},
        { skipCache: true }
      );

      logger.info('All notifications marked as read', {
        component: 'NotificationApiService',
        operation
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        component: 'NotificationApiService',
        operation,
        error
      });
      throw await this.handleNotificationError(
        error,
        'Failed to mark all notifications as read'
      );
    }
  }

  // ==========================================================================
  // Notification Deletion Methods
  // ==========================================================================

  /**
   * Deletes a specific notification.
   * 
   * Permanently removes the notification from the user's notification list.
   * This action cannot be undone.
   * 
   * @param notificationId - Unique notification identifier
   * @throws Error if notification cannot be deleted
   * 
   * @example
   * ```typescript
   * await notificationApiService.deleteNotification(notification.id);
   * ```
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const operation = 'deleteNotification';
    
    try {
      logger.debug('Deleting notification', {
        component: 'NotificationApiService',
        operation,
        notificationId
      });

      await globalApiClient.delete(
        `${this.notificationsEndpoint}/${notificationId}`,
        { skipCache: true }
      );

      logger.info('Notification deleted', {
        component: 'NotificationApiService',
        operation,
        notificationId
      });
    } catch (error) {
      logger.error('Failed to delete notification', {
        component: 'NotificationApiService',
        operation,
        notificationId,
        error
      });
      throw await this.handleNotificationError(error, 'Failed to delete notification');
    }
  }

  // ==========================================================================
  // Notification Sending Methods (Admin/System)
  // ==========================================================================

  /**
   * Sends a notification to user(s).
   * 
   * This method is typically used by administrators or system services
   * to send notifications. Can target a specific user or broadcast
   * to all users if userId is omitted.
   * 
   * @param notification - Notification content and metadata
   * @returns Promise resolving to created notification data
   * @throws Error if notification cannot be sent
   * 
   * @example
   * ```typescript
   * // Send to specific user
   * await notificationApiService.sendNotification({
   *   type: 'bill_update',
   *   title: 'Bill Status Changed',
   *   message: 'HB-123 has been moved to committee review',
   *   userId: 'user-123',
   *   priority: 'high'
   * });
   * 
   * // Broadcast to all users
   * await notificationApiService.sendNotification({
   *   type: 'system_maintenance',
   *   title: 'Scheduled Maintenance',
   *   message: 'System will be down for maintenance on Sunday',
   *   priority: 'urgent'
   * });
   * ```
   */
  async sendNotification(notification: SendNotificationPayload): Promise<any> {
    const operation = 'sendNotification';
    
    try {
      logger.debug('Sending notification', {
        component: 'NotificationApiService',
        operation,
        type: notification.type,
        userId: notification.userId || 'broadcast'
      });

      const response = await globalApiClient.post(
        `${this.notificationsEndpoint}/send`,
        notification,
        { skipCache: true }
      );

      logger.info('Notification sent successfully', {
        component: 'NotificationApiService',
        operation,
        type: notification.type,
        userId: notification.userId || 'broadcast'
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send notification', {
        component: 'NotificationApiService',
        operation,
        type: notification.type,
        error
      });
      throw await this.handleNotificationError(error, 'Failed to send notification');
    }
  }

  // ==========================================================================
  // Statistics Methods
  // ==========================================================================

  /**
   * Retrieves notification statistics for the current user.
   * 
   * Provides aggregated metrics including:
   * - Total notification count
   * - Unread notification count
   * - Breakdown by category
   * - Breakdown by priority level
   * 
   * Useful for dashboard displays and notification badges.
   * 
   * @returns Promise resolving to notification statistics
   * @throws Error if statistics cannot be retrieved
   * 
   * @example
   * ```typescript
   * const stats = await notificationApiService.getStats();
   * console.log(`You have ${stats.unread} unread notifications`);
   * console.log(`Bill updates: ${stats.byCategory.bills || 0}`);
   * ```
   */
  async getStats(): Promise<NotificationStats> {
    const operation = 'getStats';
    
    try {
      logger.debug('Fetching notification statistics', {
        component: 'NotificationApiService',
        operation
      });

      const response = await globalApiClient.get<NotificationStats>(
        `${this.notificationsEndpoint}/stats`
      );

      logger.info('Notification statistics retrieved successfully', {
        component: 'NotificationApiService',
        operation,
        total: response.data.total,
        unread: response.data.unread
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get notification statistics', {
        component: 'NotificationApiService',
        operation,
        error
      });
      throw await this.handleNotificationError(error, 'Failed to retrieve notification statistics');
    }
  }

  // ==========================================================================
  // Bulk Operations Methods
  // ==========================================================================

  /**
   * Performs bulk operations on multiple notifications.
   * 
   * Supports batch processing of notifications for efficiency:
   * - Mark multiple notifications as read
   * - Delete multiple notifications
   * 
   * Returns detailed results including success count and any errors.
   * 
   * @param operation - Bulk operation configuration
   * @returns Promise resolving to operation results
   * @throws Error if bulk operation fails entirely
   * 
   * @example
   * ```typescript
   * // Mark multiple notifications as read
   * const result = await notificationApiService.bulkOperation({
   *   action: 'mark_read',
   *   notificationIds: ['notif-1', 'notif-2', 'notif-3']
   * });
   * console.log(`Marked ${result.processed} notifications as read`);
   * 
   * // Delete old notifications
   * const deleteResult = await notificationApiService.bulkOperation({
   *   action: 'delete',
   *   notificationIds: oldNotificationIds
   * });
   * ```
   */
  async bulkOperation(operation: {
    action: BulkAction;
    notificationIds: string[];
  }): Promise<BulkOperationResult> {
    const operationName = 'bulkOperation';
    
    try {
      logger.debug('Performing bulk notification operation', {
        component: 'NotificationApiService',
        operation: operationName,
        action: operation.action,
        count: operation.notificationIds.length
      });

      const response = await globalApiClient.post<BulkOperationResult>(
        `${this.notificationsEndpoint}/bulk`,
        operation,
        { skipCache: true }
      );

      logger.info('Bulk notification operation completed', {
        component: 'NotificationApiService',
        operation: operationName,
        action: operation.action,
        processed: response.data.processed,
        errors: response.data.errors.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to perform bulk notification operation', {
        component: 'NotificationApiService',
        operation: operationName,
        action: operation.action,
        error
      });
      throw await this.handleNotificationError(error, 'Failed to perform bulk operation');
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Centralized error handling for notification operations.
   * 
   * This method:
   * 1. Extracts meaningful error messages from various error structures
   * 2. Creates a standardized Error object
   * 3. Reports the error to the global error handler
   * 4. Returns the processed error for throwing
   * 
   * @param error - Raw error object from API call
   * @param defaultMessage - Fallback message if error details unavailable
   * @returns Processed Error object with user-friendly message
   */
  private async handleNotificationError(
    error: any,
    defaultMessage: string
  ): Promise<Error> {
    // Extract error message from various possible structures
    // Priority: response.data.message > response.data.error > error.message > default
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      defaultMessage;

    const notificationError = new Error(errorMessage);

    // Report to unified error handler for tracking and logging
    await globalErrorHandler.handleError(notificationError, {
      component: 'NotificationApiService',
      operation: 'notification_operation',
      status: error?.response?.status,
      endpoint: error?.config?.url
    });

    return notificationError;
  }
}

// ============================================================================
// Global Instance Export
// ============================================================================

/**
 * Pre-configured global instance of the notification API service.
 * 
 * Use this singleton instance throughout the application for consistency
 * and to avoid creating multiple service instances.
 * 
 * @example
 * ```typescript
 * import { notificationApiService } from './api/notifications';
 * 
 * const notifications = await notificationApiService.getNotifications({
 *   limit: 10,
 *   unreadOnly: true
 * });
 * ```
 */
export const notificationApiService = new NotificationApiService();