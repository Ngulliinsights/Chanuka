/**
 * Notification API Service
 * Core API communication layer for notification functionality
 * Extracted from services/notification-service.ts during infrastructure consolidation
 */

import { globalApiClient } from './client';
import { logger } from '../../utils/logger';

// Re-export types from the main notification service for convenience
export type {
  Notification,
  NotificationPreferences,
  NotificationType,
  NotificationCategory
} from '../../services/notification-service';

/**
 * Notification API Service Class
 * Handles all notification-related API communication
 */
export class NotificationApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api';
  }

  /**
   * Get VAPID public key for push notifications
   */
  async getVapidPublicKey(): Promise<string> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/notifications/vapid-key`);
      return (response.data as any).publicKey;
    } catch (error) {
      logger.error('Failed to get VAPID public key', {
        component: 'NotificationApi',
        error
      });
      throw error;
    }
  }

  /**
   * Send push subscription to backend
   */
  async sendPushSubscription(subscription: PushSubscription, userAgent: string): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.baseUrl}/notifications/push-subscription`,
        {
          subscription: subscription.toJSON(),
          userAgent,
          timestamp: new Date().toISOString()
        },
        { skipCache: true }
      );

      logger.info('Push subscription sent successfully', {
        component: 'NotificationApi'
      });
    } catch (error) {
      logger.error('Failed to send push subscription', {
        component: 'NotificationApi',
        error
      });
      throw error;
    }
  }

  /**
   * Load user notification preferences
   */
  async getPreferences(): Promise<any> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/notifications/preferences`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get notification preferences', {
        component: 'NotificationApi',
        error
      });
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(preferences: any): Promise<any> {
    try {
      const response = await globalApiClient.put(
        `${this.baseUrl}/notifications/preferences`,
        preferences,
        { skipCache: true }
      );

      logger.info('Notification preferences updated successfully', {
        component: 'NotificationApi'
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update notification preferences', {
        component: 'NotificationApi',
        error
      });
      throw error;
    }
  }

  /**
   * Load notifications from backend
   */
  async getNotifications(options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    since?: string;
    category?: string;
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.unreadOnly) params.append('unreadOnly', 'true');
      if (options.since) params.append('since', options.since);
      if (options.category) params.append('category', options.category);

      const response = await globalApiClient.get(`${this.baseUrl}/notifications?${params.toString()}`);
      return (response.data as any[]) || [];
    } catch (error) {
      logger.error('Failed to get notifications', {
        component: 'NotificationApi',
        error
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.baseUrl}/notifications/${notificationId}/read`,
        {},
        { skipCache: true }
      );

      logger.info('Notification marked as read', {
        component: 'NotificationApi',
        notificationId
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        component: 'NotificationApi',
        notificationId,
        error
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.baseUrl}/notifications/read-all`,
        {},
        { skipCache: true }
      );

      logger.info('All notifications marked as read', {
        component: 'NotificationApi'
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        component: 'NotificationApi',
        error
      });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await globalApiClient.delete(
        `${this.baseUrl}/notifications/${notificationId}`,
        { skipCache: true }
      );

      logger.info('Notification deleted', {
        component: 'NotificationApi',
        notificationId
      });
    } catch (error) {
      logger.error('Failed to delete notification', {
        component: 'NotificationApi',
        notificationId,
        error
      });
      throw error;
    }
  }

  /**
   * Send notification (for admin/system use)
   */
  async sendNotification(notification: {
    type: string;
    title: string;
    message: string;
    userId?: string;
    data?: any;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<any> {
    try {
      const response = await globalApiClient.post(
        `${this.baseUrl}/notifications/send`,
        notification,
        { skipCache: true }
      );

      logger.info('Notification sent successfully', {
        component: 'NotificationApi',
        type: notification.type
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send notification', {
        component: 'NotificationApi',
        type: notification.type,
        error
      });
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getStats(): Promise<{
    total: number;
    unread: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/notifications/stats`);
      return response.data as {
        total: number;
        unread: number;
        byCategory: Record<string, number>;
        byPriority: Record<string, number>;
      };
    } catch (error) {
      logger.error('Failed to get notification stats', {
        component: 'NotificationApi',
        error
      });
      throw error;
    }
  }

  /**
   * Bulk operations on notifications
   */
  async bulkOperation(operation: {
    action: 'mark_read' | 'delete';
    notificationIds: string[];
  }): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
  }> {
    try {
      const response = await globalApiClient.post(
        `${this.baseUrl}/notifications/bulk`,
        operation,
        { skipCache: true }
      );

      logger.info('Bulk notification operation completed', {
        component: 'NotificationApi',
        action: operation.action,
        count: operation.notificationIds.length
      });

      return response.data as {
        success: boolean;
        processed: number;
        errors: string[];
      };
    } catch (error) {
      logger.error('Failed to perform bulk notification operation', {
        component: 'NotificationApi',
        action: operation.action,
        error
      });
      throw error;
    }
  }
}

// Global notification API service instance
export const notificationApiService = new NotificationApiService();