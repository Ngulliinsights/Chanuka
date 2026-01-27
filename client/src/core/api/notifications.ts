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

import { logger } from '@client/lib/utils/logger';

import { globalApiClient } from './client';
import { globalErrorHandler } from './errors';

// ============================================================================
// Type Re-exports
// ============================================================================

/**
 * Re-export types from main notification service for convenience.
 * These types provide consistent interfaces across the application.
 */
export type {
  Notification,
  NotificationType,
} from '@client/lib/services/notification-service';

export type {
  NotificationPreferences,
} from '@client/features/notifications/model/notification-service';

// ============================================================================
// API-Specific Types
// ============================================================================

/**
 * Notification priority levels for delivery and display ordering.
 * Higher priority notifications should be shown more prominently.
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Supported bulk operation actions for batch processing.
 */
export type BulkAction = 'mark_read' | 'delete';

/**
 * VAPID public key response from server.
 * VAPID (Voluntary Application Server Identification) enables secure
 * push notifications by identifying the application server.
 */
export interface VapidKeyResponse {
  /** Base64-encoded VAPID public key for push subscriptions */
  publicKey: string;
}

/**
 * Push subscription payload structure sent to backend.
 * Contains the subscription details and metadata needed for
 * the server to send push notifications to this device.
 */
export interface PushSubscriptionPayload {
  /** Serialized PushSubscription object from browser Push API */
  subscription: PushSubscriptionJSON;
  /** Browser user agent string for debugging and analytics */
  userAgent: string;
  /** ISO timestamp of when subscription was created */
  timestamp: string;
}

/**
 * Options for querying notifications with filtering and pagination.
 * All fields are optional to support flexible querying patterns.
 */
export interface GetNotificationsOptions {
  /** Maximum number of notifications to return (pagination) */
  limit?: number;
  /** Number of notifications to skip (pagination offset) */
  offset?: number;
  /** When true, only return unread notifications */
  unreadOnly?: boolean;
  /** Only return notifications created after this ISO timestamp */
  since?: string;
  /** Filter by notification type/category */
  category?: string;
}

/**
 * Payload for sending a new notification (typically admin/system use).
 * Contains all the information needed to create and deliver a notification.
 */
export interface SendNotificationPayload {
  /** Notification type identifier (must match defined types) */
  type: string;
  /** Notification title - shown prominently in UI */
  title: string;
  /** Notification body message with detailed information */
  message: string;
  /** Target user ID (omit for broadcast to all users) */
  userId?: string;
  /** Additional structured data attached to notification */
  data?: Record<string, unknown>;
  /** Priority level affecting delivery and display */
  priority?: NotificationPriority;
}

/**
 * Aggregated notification statistics for dashboard and badge displays.
 * Provides quick overview of notification state without fetching all data.
 */
export interface NotificationStats {
  /** Total number of notifications for this user */
  total: number;
  /** Number of unread notifications (for badge counts) */
  unread: number;
  /** Count of notifications grouped by category/type */
  byCategory: Record<string, number>;
  /** Count of notifications grouped by priority level */
  byPriority: Record<string, number>;
}

/**
 * Result of a bulk operation with detailed success/failure information.
 * Allows UI to show partial success and handle specific failures.
 */
export interface BulkOperationResult {
  /** Whether the overall operation completed successfully */
  success: boolean;
  /** Number of notifications successfully processed */
  processed: number;
  /** Array of error messages for notifications that failed */
  errors: string[];
}

/**
 * Generic notification response from the API.
 * Represents a single notification with all its metadata.
 */
export interface NotificationResponse {
  /** Unique notification identifier */
  id: string;
  /** Notification type/category */
  type: string;
  /** Notification title */
  title: string;
  /** Notification message body */
  message: string;
  /** Whether notification has been read */
  read: boolean;
  /** ISO timestamp of when notification was created */
  createdAt: string;
  /** Optional priority level */
  priority?: NotificationPriority;
  /** Optional additional data */
  data?: Record<string, unknown>;
}

/**
 * User notification preferences structure.
 * Controls which notifications the user receives and through which channels.
 */
export interface UserPreferences {
  /** Enable/disable email notifications globally */
  emailNotifications: boolean;
  /** Enable/disable push notifications globally */
  pushNotifications: boolean;
  /** Enable/disable in-app notifications globally */
  inAppNotifications: boolean;
  /** Specific notification type preferences */
  notificationTypes?: Record<string, boolean>;
  /** Email digest frequency if email notifications are enabled */
  emailFrequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
  /** Quiet hours when no notifications should be sent */
  quietHours?: {
    enabled: boolean;
    start: string; // Format: "HH:mm"
    end: string; // Format: "HH:mm"
  };
}

// ============================================================================
// Notification API Service Class
// ============================================================================

/**
 * Centralized service for all notification-related API operations.
 *
 * This service provides a clean, type-safe interface for interacting with
 * the notification backend. It handles:
 *
 * - Push notification subscription management
 * - User preference loading and updates
 * - Notification fetching with flexible filtering
 * - Status updates (mark as read/unread)
 * - Notification deletion
 * - Sending notifications (admin/system use)
 * - Statistics and analytics
 * - Bulk operations for efficiency
 *
 * All methods include comprehensive error handling with structured logging,
 * automatic error reporting, and user-friendly error messages. The service
 * integrates with the global API client for consistent request handling,
 * caching, and retry logic.
 *
 * @example
 * ```typescript
 * // Subscribe to push notifications
 * const registration = await navigator.serviceWorker.ready;
 * const subscription = await registration.pushManager.subscribe({
 *   userVisibleOnly: true,
 *   applicationServerKey: vapidKey
 * });
 * await notificationApiService.sendPushSubscription(subscription, navigator.userAgent);
 *
 * // Fetch recent unread notifications
 * const unread = await notificationApiService.getNotifications({
 *   unreadOnly: true,
 *   limit: 20
 * });
 *
 * // Mark notification as read
 * await notificationApiService.markAsRead(notificationId);
 * ```
 */
export class NotificationApiService {
  private readonly notificationsEndpoint: string;

  /**
   * Creates a new NotificationApiService instance.
   *
   * The service configures its endpoint based on the provided base URL,
   * defaulting to '/api' for standard API configurations. All subsequent
   * API calls will use this configured endpoint.
   *
   * @param baseUrl - Base API URL, defaults to '/api'
   */
  constructor(baseUrl: string = '/api') {
    this.notificationsEndpoint = `${baseUrl}/notifications`;

    logger.debug('NotificationApiService initialized', {
      component: 'NotificationApiService',
      baseUrl,
      endpoint: this.notificationsEndpoint,
    });
  }

  // ==========================================================================
  // Push Notification Methods
  // ==========================================================================

  /**
   * Retrieves the VAPID public key required for push subscriptions.
   *
   * VAPID (Voluntary Application Server Identification) is a protocol that
   * allows push services to verify the application server's identity. Before
   * subscribing to push notifications through the browser's Push API, you
   * need this public key to authenticate the subscription request.
   *
   * The key is returned as a base64-encoded string that should be converted
   * to a Uint8Array before passing to the Push API.
   *
   * @returns Promise resolving to the base64-encoded VAPID public key
   * @throws Error if the key cannot be retrieved from the server
   *
   * @example
   * ```typescript
   * const publicKey = await notificationApiService.getVapidPublicKey();
   * const uint8Array = urlBase64ToUint8Array(publicKey);
   * const subscription = await registration.pushManager.subscribe({
   *   userVisibleOnly: true,
   *   applicationServerKey: uint8Array
   * });
   * ```
   */
  async getVapidPublicKey(): Promise<string> {
    const operation = 'getVapidPublicKey';

    try {
      logger.debug('Fetching VAPID public key', {
        component: 'NotificationApiService',
        operation,
      });

      const response = await globalApiClient.get<VapidKeyResponse>(
        `${this.notificationsEndpoint}/vapid-key`
      );

      logger.info('VAPID public key retrieved successfully', {
        component: 'NotificationApiService',
        operation,
      });

      return response.data.publicKey;
    } catch (error) {
      logger.error('Failed to get VAPID public key', {
        component: 'NotificationApiService',
        operation,
        error,
      });
      throw await this.handleNotificationError(error, 'Failed to retrieve VAPID public key');
    }
  }

  /**
   * Registers a push notification subscription with the backend server.
   *
   * After successfully subscribing through the browser's Push API, the
   * subscription must be sent to your backend so it knows where to send
   * push notifications for this device. The subscription contains endpoints
   * and encryption keys needed for secure message delivery.
   *
   * The userAgent string is included for debugging purposes and to help
   * identify which device/browser a subscription belongs to.
   *
   * @param subscription - PushSubscription object from browser Push API
   * @param userAgent - Browser user agent string for identification
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
  async sendPushSubscription(subscription: PushSubscription, userAgent: string): Promise<void> {
    const operation = 'sendPushSubscription';

    try {
      logger.debug('Sending push subscription', {
        component: 'NotificationApiService',
        operation,
      });

      const payload: PushSubscriptionPayload = {
        subscription: subscription.toJSON(),
        userAgent,
        timestamp: new Date().toISOString(),
      };

      await globalApiClient.post(`${this.notificationsEndpoint}/push-subscription`, payload, {
        skipCache: true,
      });

      logger.info('Push subscription registered successfully', {
        component: 'NotificationApiService',
        operation,
      });
    } catch (error) {
      logger.error('Failed to send push subscription', {
        component: 'NotificationApiService',
        operation,
        error,
      });
      throw await this.handleNotificationError(error, 'Failed to register push subscription');
    }
  }

  // ==========================================================================
  // Preference Management Methods
  // ==========================================================================

  /**
   * Retrieves the current user's notification preferences.
   *
   * Preferences control the notification experience, including which types
   * of notifications are enabled, which delivery channels to use (email,
   * push, in-app), and timing preferences like quiet hours or digest frequency.
   *
   * The preferences are cached by the API client to avoid repeated requests,
   * but can be refreshed by using the skipCache option if needed.
   *
   * @returns Promise resolving to user's notification preferences
   * @throws Error if preferences cannot be retrieved
   *
   * @example
   * ```typescript
   * const preferences = await notificationApiService.getPreferences();
   * if (preferences.emailNotifications) {
   *   console.log('User wants email notifications');
   *   console.log(`Frequency: ${preferences.emailFrequency}`);
   * }
   * ```
   */
  async getPreferences(): Promise<UserPreferences> {
    const operation = 'getPreferences';

    try {
      logger.debug('Fetching notification preferences', {
        component: 'NotificationApiService',
        operation,
      });

      const response = await globalApiClient.get<UserPreferences>(
        `${this.notificationsEndpoint}/preferences`
      );

      logger.info('Notification preferences retrieved successfully', {
        component: 'NotificationApiService',
        operation,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get notification preferences', {
        component: 'NotificationApiService',
        operation,
        error,
      });
      throw await this.handleNotificationError(
        error,
        'Failed to retrieve notification preferences'
      );
    }
  }

  /**
   * Updates the current user's notification preferences.
   *
   * Allows partial updates - you only need to include the fields you want
   * to change. The backend will merge your updates with existing preferences.
   * This is useful for settings UIs where users toggle individual options.
   *
   * After updating, the cache is invalidated to ensure fresh data on next fetch.
   *
   * @param preferences - Partial preferences object with fields to update
   * @returns Promise resolving to complete updated preferences
   * @throws Error if preferences cannot be updated
   *
   * @example
   * ```typescript
   * // Enable email notifications and set to daily digest
   * const updated = await notificationApiService.updatePreferences({
   *   emailNotifications: true,
   *   emailFrequency: 'daily'
   * });
   *
   * // Disable specific notification type
   * await notificationApiService.updatePreferences({
   *   notificationTypes: {
   *     bill_updates: false
   *   }
   * });
   * ```
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const operation = 'updatePreferences';

    try {
      logger.debug('Updating notification preferences', {
        component: 'NotificationApiService',
        operation,
      });

      const response = await globalApiClient.put<UserPreferences>(
        `${this.notificationsEndpoint}/preferences`,
        preferences,
        { skipCache: true }
      );

      logger.info('Notification preferences updated successfully', {
        component: 'NotificationApiService',
        operation,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update notification preferences', {
        component: 'NotificationApiService',
        operation,
        error,
      });
      throw await this.handleNotificationError(error, 'Failed to update notification preferences');
    }
  }

  // ==========================================================================
  // Notification Retrieval Methods
  // ==========================================================================

  /**
   * Retrieves notifications with flexible filtering and pagination support.
   *
   * This is the primary method for fetching notifications in the UI. It supports
   * multiple query patterns:
   *
   * - Pagination via limit/offset for infinite scroll or page-based UIs
   * - Filtering by read status to show only unread items
   * - Time-based filtering to show recent notifications
   * - Category filtering to show specific types
   *
   * Results are returned in reverse chronological order (newest first).
   * The API client automatically caches results for improved performance.
   *
   * @param options - Query options for filtering and pagination
   * @returns Promise resolving to array of notifications
   * @throws Error if notifications cannot be retrieved
   *
   * @example
   * ```typescript
   * // Get first page of unread notifications
   * const unread = await notificationApiService.getNotifications({
   *   limit: 20,
   *   offset: 0,
   *   unreadOnly: true
   * });
   *
   * // Get bill-related notifications from last 24 hours
   * const yesterday = new Date(Date.now() - 86400000).toISOString();
   * const recent = await notificationApiService.getNotifications({
   *   category: 'bills',
   *   since: yesterday,
   *   limit: 50
   * });
   *
   * // Load next page for infinite scroll
   * const nextPage = await notificationApiService.getNotifications({
   *   limit: 20,
   *   offset: currentNotifications.length
   * });
   * ```
   */
  async getNotifications(options: GetNotificationsOptions = {}): Promise<NotificationResponse[]> {
    const operation = 'getNotifications';

    try {
      logger.debug('Fetching notifications', {
        component: 'NotificationApiService',
        operation,
        options,
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

      const response = await globalApiClient.get<NotificationResponse[]>(url);

      logger.info('Notifications retrieved successfully', {
        component: 'NotificationApiService',
        operation,
        count: response.data.length,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get notifications', {
        component: 'NotificationApiService',
        operation,
        options,
        error,
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
   * Updates the notification's read status and records the timestamp
   * when it was read. This affects:
   * - Unread count badges in the UI
   * - Whether the notification appears in "unread" filtered views
   * - Visual styling in notification lists
   *
   * The operation invalidates relevant caches to ensure UIs update properly.
   *
   * @param notificationId - Unique identifier of the notification
   * @throws Error if notification cannot be marked as read
   *
   * @example
   * ```typescript
   * // Mark as read when user clicks on notification
   * await notificationApiService.markAsRead(notification.id);
   *
   * // Mark as read when notification is displayed
   * useEffect(() => {
   *   if (notification && !notification.read) {
   *     notificationApiService.markAsRead(notification.id);
   *   }
   * }, [notification]);
   * ```
   */
  async markAsRead(notificationId: string): Promise<void> {
    const operation = 'markAsRead';

    try {
      logger.debug('Marking notification as read', {
        component: 'NotificationApiService',
        operation,
        notificationId,
      });

      await globalApiClient.post(
        `${this.notificationsEndpoint}/${notificationId}/read`,
        {},
        { skipCache: true }
      );

      logger.info('Notification marked as read', {
        component: 'NotificationApiService',
        operation,
        notificationId,
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        component: 'NotificationApiService',
        operation,
        notificationId,
        error,
      });
      throw await this.handleNotificationError(error, 'Failed to mark notification as read');
    }
  }

  /**
   * Marks all notifications as read for the current user.
   *
   * This is a batch operation that efficiently marks every unread notification
   * as read in a single request. It's commonly used for "mark all as read" or
   * "clear all" buttons in notification centers.
   *
   * The operation is atomic on the backend, so either all notifications are
   * marked as read or none are (in case of errors).
   *
   * @throws Error if operation fails
   *
   * @example
   * ```typescript
   * // Add to "Clear All" button click handler
   * const handleClearAll = async () => {
   *   await notificationApiService.markAllAsRead();
   *   refreshNotifications();
   * };
   * ```
   */
  async markAllAsRead(): Promise<void> {
    const operation = 'markAllAsRead';

    try {
      logger.debug('Marking all notifications as read', {
        component: 'NotificationApiService',
        operation,
      });

      await globalApiClient.post(`${this.notificationsEndpoint}/read-all`, {}, { skipCache: true });

      logger.info('All notifications marked as read', {
        component: 'NotificationApiService',
        operation,
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        component: 'NotificationApiService',
        operation,
        error,
      });
      throw await this.handleNotificationError(error, 'Failed to mark all notifications as read');
    }
  }

  // ==========================================================================
  // Notification Deletion Methods
  // ==========================================================================

  /**
   * Permanently deletes a specific notification.
   *
   * Removes the notification from the user's notification list. This action
   * is permanent and cannot be undone. The notification will no longer appear
   * in any views or counts.
   *
   * Consider implementing a soft delete (archive) feature if you need to
   * support notification recovery or maintain history.
   *
   * @param notificationId - Unique identifier of the notification
   * @throws Error if notification cannot be deleted
   *
   * @example
   * ```typescript
   * // Add to notification dismiss/delete button
   * const handleDelete = async (id: string) => {
   *   if (confirm('Delete this notification?')) {
   *     await notificationApiService.deleteNotification(id);
   *     refreshNotifications();
   *   }
   * };
   * ```
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const operation = 'deleteNotification';

    try {
      logger.debug('Deleting notification', {
        component: 'NotificationApiService',
        operation,
        notificationId,
      });

      await globalApiClient.delete(`${this.notificationsEndpoint}/${notificationId}`, {
        skipCache: true,
      });

      logger.info('Notification deleted', {
        component: 'NotificationApiService',
        operation,
        notificationId,
      });
    } catch (error) {
      logger.error('Failed to delete notification', {
        component: 'NotificationApiService',
        operation,
        notificationId,
        error,
      });
      throw await this.handleNotificationError(error, 'Failed to delete notification');
    }
  }

  // ==========================================================================
  // Notification Sending Methods (Admin/System)
  // ==========================================================================

  /**
   * Sends a notification to one or more users.
   *
   * This method is typically restricted to administrators and system services.
   * It creates and delivers a new notification, which will be:
   * - Added to recipient notification lists
   * - Sent via enabled channels (push, email, etc.)
   * - Subject to recipient preference filters
   *
   * You can target a specific user by including userId, or broadcast to all
   * users by omitting it. Priority affects delivery urgency and UI prominence.
   *
   * @param notification - Notification content and targeting information
   * @returns Promise resolving to created notification data
   * @throws Error if notification cannot be sent
   *
   * @example
   * ```typescript
   * // Send targeted notification
   * await notificationApiService.sendNotification({
   *   type: 'bill_update',
   *   title: 'Bill Status Changed',
   *   message: 'HB-123 has moved to committee review',
   *   userId: 'user-123',
   *   priority: 'high',
   *   data: { billId: 'HB-123', newStatus: 'in_committee' }
   * });
   *
   * // Broadcast system announcement
   * await notificationApiService.sendNotification({
   *   type: 'system_maintenance',
   *   title: 'Scheduled Maintenance',
   *   message: 'System will be unavailable Sunday 2-4 AM',
   *   priority: 'urgent'
   * });
   * ```
   */
  async sendNotification(notification: SendNotificationPayload): Promise<NotificationResponse> {
    const operation = 'sendNotification';

    try {
      logger.debug('Sending notification', {
        component: 'NotificationApiService',
        operation,
        type: notification.type,
        userId: notification.userId || 'broadcast',
      });

      const response = await globalApiClient.post<NotificationResponse>(
        `${this.notificationsEndpoint}/send`,
        notification,
        { skipCache: true }
      );

      logger.info('Notification sent successfully', {
        component: 'NotificationApiService',
        operation,
        type: notification.type,
        userId: notification.userId || 'broadcast',
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send notification', {
        component: 'NotificationApiService',
        operation,
        type: notification.type,
        error,
      });
      throw await this.handleNotificationError(error, 'Failed to send notification');
    }
  }

  // ==========================================================================
  // Statistics Methods
  // ==========================================================================

  /**
   * Retrieves aggregated notification statistics for the current user.
   *
   * Provides a high-level overview of notification state without fetching
   * all notification data. This is much more efficient than loading all
   * notifications just to count them, especially for users with many notifications.
   *
   * Statistics include:
   * - Total and unread counts for badge displays
   * - Category breakdown for filtering UI
   * - Priority distribution for analytics
   *
   * Stats are typically cached aggressively since they don't need real-time
   * accuracy and are accessed frequently for UI badges.
   *
   * @returns Promise resolving to notification statistics
   * @throws Error if statistics cannot be retrieved
   *
   * @example
   * ```typescript
   * const stats = await notificationApiService.getStats();
   *
   * // Update notification badge
   * setBadgeCount(stats.unread);
   *
   * // Show category breakdown
   * console.log(`Bill updates: ${stats.byCategory.bills || 0}`);
   * console.log(`Comments: ${stats.byCategory.comments || 0}`);
   *
   * // Check for urgent notifications
   * if (stats.byPriority.urgent > 0) {
   *   showUrgentNotificationAlert();
   * }
   * ```
   */
  async getStats(): Promise<NotificationStats> {
    const operation = 'getStats';

    try {
      logger.debug('Fetching notification statistics', {
        component: 'NotificationApiService',
        operation,
      });

      const response = await globalApiClient.get<NotificationStats>(
        `${this.notificationsEndpoint}/stats`
      );

      logger.info('Notification statistics retrieved successfully', {
        component: 'NotificationApiService',
        operation,
        total: response.data.total,
        unread: response.data.unread,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get notification statistics', {
        component: 'NotificationApiService',
        operation,
        error,
      });
      throw await this.handleNotificationError(error, 'Failed to retrieve notification statistics');
    }
  }

  // ==========================================================================
  // Bulk Operations Methods
  // ==========================================================================

  /**
   * Performs bulk operations on multiple notifications efficiently.
   *
   * Instead of making individual API calls for each notification, this method
   * processes multiple notifications in a single request. This is significantly
   * more efficient and faster, especially when dealing with dozens or hundreds
   * of notifications.
   *
   * Supported operations:
   * - mark_read: Mark multiple notifications as read
   * - delete: Delete multiple notifications permanently
   *
   * The operation is partially atomic: individual notification operations can
   * fail while others succeed. The response includes detailed information about
   * what succeeded and what failed.
   *
   * @param bulkOperation - Operation configuration with action and target IDs
   * @returns Promise resolving to operation results with success/failure details
   * @throws Error if the entire bulk operation fails
   *
   * @example
   * ```typescript
   * // Mark selected notifications as read
   * const selectedIds = ['notif-1', 'notif-2', 'notif-3'];
   * const result = await notificationApiService.bulkOperation({
   *   action: 'mark_read',
   *   notificationIds: selectedIds
   * });
   *
   * if (result.success) {
   *   console.log(`Marked ${result.processed} notifications as read`);
   * }
   * if (result.errors.length > 0) {
   *   console.error('Some operations failed:', result.errors);
   * }
   *
   * // Delete old notifications in bulk
   * const oldNotificationIds = notifications
   *   .filter(n => isOlderThan(n.createdAt, 30, 'days'))
   *   .map(n => n.id);
   *
   * await notificationApiService.bulkOperation({
   *   action: 'delete',
   *   notificationIds: oldNotificationIds
   * });
   * ```
   */
  async bulkOperation(bulkOperation: {
    action: BulkAction;
    notificationIds: string[];
  }): Promise<BulkOperationResult> {
    const operationName = 'bulkOperation';

    try {
      logger.debug('Performing bulk notification operation', {
        component: 'NotificationApiService',
        operation: operationName,
        action: bulkOperation.action,
        count: bulkOperation.notificationIds.length,
      });

      const response = await globalApiClient.post<BulkOperationResult>(
        `${this.notificationsEndpoint}/bulk`,
        bulkOperation,
        { skipCache: true }
      );

      logger.info('Bulk notification operation completed', {
        component: 'NotificationApiService',
        operation: operationName,
        action: bulkOperation.action,
        processed: response.data.processed,
        errors: response.data.errors.length,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to perform bulk notification operation', {
        component: 'NotificationApiService',
        operation: operationName,
        action: bulkOperation.action,
        error,
      });
      throw await this.handleNotificationError(error, 'Failed to perform bulk operation');
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Centralized error handling for all notification operations.
   *
   * This method provides consistent error processing across the entire service:
   *
   * 1. Extracts meaningful error messages from various error structures
   *    (axios errors, fetch errors, custom API errors)
   * 2. Creates a standardized Error object with user-friendly message
   * 3. Reports the error to the global error handler for logging and tracking
   * 4. Returns the processed error for throwing to the caller
   *
   * The error handler prioritizes messages in this order:
   * - Server error message from response.data.message
   * - Server error from response.data.error
   * - Client-side error message
   * - Default fallback message
   *
   * @param error - Raw error object from API call or other source
   * @param defaultMessage - Fallback message if no specific error details available
   * @returns Processed Error object ready to be thrown
   */
  private async handleNotificationError(error: unknown, defaultMessage: string): Promise<Error> {
    // Type guard to safely access error properties
    const isErrorWithResponse = (
      err: unknown
    ): err is {
      response?: {
        data?: { message?: string; error?: string };
        status?: number;
      };
      message?: string;
      config?: { url?: string };
    } => {
      return typeof err === 'object' && err !== null;
    };

    // Extract the most specific error message available
    let errorMessage = defaultMessage;
    let status: number | undefined;
    let endpoint: string | undefined;

    if (isErrorWithResponse(error)) {
      errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        defaultMessage;

      status = error.response?.status;
      endpoint = error.config?.url;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    const notificationError = new Error(errorMessage);

    // Report to global error handler for centralized tracking and logging
    // Note: Calling as a function since it's imported as a function, not an object
    await globalErrorHandler(notificationError, {
      component: 'NotificationApiService',
      operation: 'notification_operation',
      status,
      endpoint,
    });

    return notificationError;
  }
}

// ============================================================================
// Global Instance Export
// ============================================================================

/**
 * Pre-configured global singleton instance of the notification API service.
 *
 * Use this instance throughout your application instead of creating new
 * instances. This ensures:
 * - Consistent configuration across all notification operations
 * - Shared state and caching behavior
 * - Centralized logging context
 * - Efficient resource usage
 *
 * @example
 * ```typescript
 * import { notificationApiService } from '@client/api/notifications';
 *
 * // In a component
 * const notifications = await notificationApiService.getNotifications({
 *   limit: 10,
 *   unreadOnly: true
 * });
 *
 * // In a service
 * await notificationApiService.markAsRead(notificationId);
 *
 * // In a background task
 * const stats = await notificationApiService.getStats();
 * updateNotificationBadge(stats.unread);
 * ```
 */
export const notificationApiService = new NotificationApiService();
