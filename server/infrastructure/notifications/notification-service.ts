import { eq, desc, and, sql, count } from 'drizzle-orm';
import { database as db } from '../../../shared/database/connection';
import { notifications, users, bills } from '../../../shared/schema';
import { webSocketService } from '../websocket.js';
import { z } from 'zod';
import { logger } from '@shared/core';

// Core notification interfaces (consolidated from basic services)
export interface NotificationData {
  userId: string;
  type: 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert';
  title: string;
  message: string;
  relatedBillId?: number;
  metadata?: Record<string, any>;
}

export interface NotificationHistory {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedBillId?: number;
  isRead: boolean;
  createdAt: Date;
  billTitle?: string;
}

// Validation schemas
const notificationDataSchema = z.object({
  userId: z.string(),
  type: z.enum(['bill_update', 'comment_reply', 'verification_status', 'system_alert']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  relatedBillId: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Notification Service
 * 
 * Handles fundamental notification operations including:
 * - Basic CRUD operations for notifications
 * - Real-time delivery via WebSocket
 * - User notification management
 * - Bulk operations and cleanup
 * 
 * For advanced features like smart filtering, batching, and multi-channel
 * delivery, use the AdvancedNotificationService.
 */
export class NotificationService {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the notification service
   */
  private initialize(): void {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    logger.info('✅ Notification Service initialized');
  }

  /**
   * Create a basic notification
   */
  async createNotification(data: NotificationData): Promise<any> {
    try {
      // Validate input
      const validatedData = notificationDataSchema.parse(data);

      const notification = await db
        .insert(notifications)
        .values({
          userId: validatedData.userId,
          type: validatedData.type,
          title: validatedData.title,
          message: validatedData.message,
          relatedBillId: validatedData.relatedBillId,
          isRead: false,
          createdAt: new Date()
        })
        .returning();

      // Send real-time notification via WebSocket
      await this.sendRealTimeNotification(validatedData.userId, notification[0]);

      logger.info(`📱 Created notification for user ${validatedData.userId}: ${validatedData.title}`);
      return notification[0];

    } catch (error) {
      logger.error({ error }, 'Error creating notification');
      throw error;
    }
  }

  /**
   * Get user notifications with pagination and filtering
   */
  async getUserNotifications(
    userId: string, 
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {}
  ): Promise<NotificationHistory[]> {
    try {
      const { limit = 20, offset = 0, unreadOnly = false, type } = options;

      // Build query conditions
      const conditions = [eq(notifications.userId, userId)];
      
      if (unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }
      
      if (type) {
        conditions.push(eq(notifications.type, type));
      }

      const userNotifications = await db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          relatedBillId: notifications.relatedBillId,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          billTitle: bills.title
        })
        .from(notifications)
        .leftJoin(bills, eq(notifications.relatedBillId, bills.id))
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(Math.min(limit, 100)) // Cap at 100
        .offset(offset);

      // Transform null values to match interface expectations
      return userNotifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedBillId: notification.relatedBillId ?? undefined,
        isRead: notification.isRead ?? false,
        createdAt: notification.createdAt ?? new Date(),
        billTitle: notification.billTitle ?? undefined
      }));

    } catch (error) {
      logger.error({ error }, 'Error getting user notifications');
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );

      logger.info(`📖 Marked notification ${notificationId} as read for user ${userId}`);

    } catch (error) {
      logger.error({ error }, 'Error marking notification as read');
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

      logger.info(`📖 Marked all notifications as read for user ${userId}`);

    } catch (error) {
      logger.error({ error }, 'Error marking all notifications as read');
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return Number(result.count);

    } catch (error) {
      logger.error({ error }, 'Error getting unread count');
      return 0;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: number): Promise<void> {
    try {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );

      logger.info(`🗑️ Deleted notification ${notificationId} for user ${userId}`);

    } catch (error) {
      logger.error({ error }, 'Error deleting notification');
      throw error;
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  private async sendRealTimeNotification(userId: string, notification: any): Promise<void> {
    try {
      webSocketService.sendUserNotification(userId, {
        type: 'notification',
        title: notification.title,
        message: notification.message,
        data: {
          id: notification.id,
          type: notification.type,
          relatedBillId: notification.relatedBillId,
          createdAt: notification.createdAt
        }
      });
    } catch (error) {
      logger.warn({ error }, 'Failed to send real-time notification');
      // Don't throw - notification was still created in database
    }
  }

  /**
   * Bulk create notifications for multiple users
   */
  async createBulkNotifications(
    userIds: string[],
    notificationData: Omit<NotificationData, 'userId'>
  ): Promise<{ success: number; failed: number; errors: Array<{ userId: string; error: string }> }> {
    const results = { success: 0, failed: 0, errors: [] as Array<{ userId: string; error: string }> };

    for (const userId of userIds) {
      try {
        await this.createNotification({
          ...notificationData,
          userId
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info(`📬 Bulk notification complete: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  /**
   * Clean up old notifications (older than specified days)
   */
  async cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.isRead, true),
            sql`${notifications.createdAt} < ${cutoffDate}`
          )
        );

      logger.info(`🧹 Cleaned up old notifications: ${result.rowCount || 0} removed`);
      return result.rowCount || 0;

    } catch (error) {
      logger.error({ error }, 'Error cleaning up old notifications');
      return 0;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId?: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    recentActivity: number;
  }> {
    try {
      const conditions = userId ? [eq(notifications.userId, userId)] : [];

      // Get total and unread counts
      const [totalResult] = await db
        .select({ count: count() })
        .from(notifications)
        .where(userId ? eq(notifications.userId, userId) : undefined);

      const [unreadResult] = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            userId ? eq(notifications.userId, userId) : undefined,
            eq(notifications.isRead, false)
          )
        );

      // Get counts by type
      const typeResults = await db
        .select({
          type: notifications.type,
          count: count()
        })
        .from(notifications)
        .where(userId ? eq(notifications.userId, userId) : undefined)
        .groupBy(notifications.type);

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const [recentResult] = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            userId ? eq(notifications.userId, userId) : undefined,
            sql`${notifications.createdAt} >= ${yesterday}`
          )
        );

      const byType: Record<string, number> = {};
      typeResults.forEach(result => {
        byType[result.type] = Number(result.count);
      });

      return {
        total: Number(totalResult.count),
        unread: Number(unreadResult.count),
        byType,
        recentActivity: Number(recentResult.count)
      };

    } catch (error) {
      logger.error({ error }, 'Error getting notification stats');
      return {
        total: 0,
        unread: 0,
        byType: {},
        recentActivity: 0
      };
    }
  }

  /**
   * Cleanup old notifications (wrapper for shutdown)
   */
  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up notification service...');
    try {
      // Clean up old notifications
      await this.cleanupOldNotifications();
      logger.info('✅ Notification service cleanup completed');
    } catch (error) {
      logger.error({ error }, '❌ Error during notification service cleanup');
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    name: string;
    description: string;
  } {
    return {
      initialized: this.isInitialized,
      name: 'Notification Service',
      description: 'Handles basic notification CRUD operations and real-time delivery'
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export class for advanced usage
export { NotificationService as CoreNotificationService };

// Export for backward compatibility
export { notificationService as coreNotificationService };











































