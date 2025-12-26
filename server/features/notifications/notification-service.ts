import { logger } from '@shared/core';
import { database as db } from '@shared/database';
import { notifications } from '@shared/schema';
import { alert_preferences, user_contact_methods } from '@shared/schema';
import { and, count, desc, eq, inArray,sql } from 'drizzle-orm';

// Types for notification operations
export interface CreateNotificationData {
  user_id: string;
  notification_type: 'bill_update' | 'comment_reply' | 'milestone' | 'campaign_update' | 'moderation_action';
  title: string;
  message: string;
  related_bill_id?: string | undefined;
  related_comment_id?: string | undefined;
  related_user_id?: string | undefined;
  delivery_method?: 'in_app' | 'email' | 'sms' | 'push' | undefined;
}

export interface NotificationFilters {
  is_read?: boolean | undefined;
  notification_type?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface NotificationStats {
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  byType: Record<string, number>;
}

/**
 * Notification Service
 * Handles notification creation, delivery, and management using direct Drizzle ORM queries
 */
export class NotificationService {
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<any> {
    try {
      // Validate input data
      this.validateNotificationData(data);

      const [notification] = await db
        .insert(notifications)
        .values({
          user_id: data.user_id,
          notification_type: data.notification_type,
          title: data.title,
          message: data.message,
          related_bill_id: data.related_bill_id || null,
          related_comment_id: data.related_comment_id || null,
          related_user_id: data.related_user_id || null,
          delivery_method: data.delivery_method || 'in_app',
          delivery_status: 'pending'
        })
        .returning();

      logger.info('Notification created', {
        component: 'NotificationService',
        notification_id: notification.id,
        user_id: data.user_id,
        type: data.notification_type
      });

      // TODO: Trigger delivery based on user preferences
      // This would involve checking alert_preferences and user_contact_methods
      // and queuing delivery jobs

      return notification;
    } catch (error) {
      logger.error('Failed to create notification', {
        component: 'NotificationService',
        user_id: data.user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get notifications for a user with filtering and pagination
   */
  async getUserNotifications(
    user_id: string,
    filters: NotificationFilters = {}
  ): Promise<{
    notifications: any[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const {
        is_read,
        notification_type,
        limit = this.DEFAULT_LIMIT,
        offset = 0
      } = filters;

      const safeLimit = Math.min(limit, this.MAX_LIMIT);

      // Build where conditions
      const conditions = [eq(notifications.user_id, user_id)];

      if (is_read !== undefined) {
        conditions.push(eq(notifications.is_read, is_read));
      }

      if (notification_type) {
        conditions.push(eq(notifications.notification_type, notification_type));
      }

      // Get notifications with pagination
      const notificationsList = await db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.created_at))
        .limit(safeLimit + 1)
        .offset(offset);

      const hasMore = notificationsList.length > safeLimit;
      const results = notificationsList.slice(0, safeLimit);

      // Get total count
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(...conditions));

      return {
        notifications: results,
        totalCount: Number(totalCount),
        hasMore
      };
    } catch (error) {
      logger.error('Failed to get user notifications', {
        component: 'NotificationService',
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notification_id: string, user_id: string): Promise<boolean> {
    try {
      const result = await db
        .update(notifications)
        .set({
          is_read: true,
          read_at: new Date(),
          updated_at: new Date()
        })
        .where(and(
          eq(notifications.id, notification_id),
          eq(notifications.user_id, user_id)
        ));

      const success = result.rowCount > 0;

      if (success) {
        logger.info('Notification marked as read', {
          component: 'NotificationService',
          notification_id,
          user_id
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        component: 'NotificationService',
        notification_id,
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notification_ids: string[], user_id: string): Promise<number> {
    try {
      const result = await db
        .update(notifications)
        .set({
          is_read: true,
          read_at: new Date(),
          updated_at: new Date()
        })
        .where(and(
          inArray(notifications.id, notification_ids),
          eq(notifications.user_id, user_id)
        ));

      const updatedCount = result.rowCount;

      logger.info('Multiple notifications marked as read', {
        component: 'NotificationService',
        count: updatedCount,
        user_id
      });

      return updatedCount;
    } catch (error) {
      logger.error('Failed to mark multiple notifications as read', {
        component: 'NotificationService',
        count: notification_ids.length,
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(notification_id: string, user_id: string): Promise<boolean> {
    try {
      const result = await db
        .update(notifications)
        .set({
          is_dismissed: true,
          updated_at: new Date()
        })
        .where(and(
          eq(notifications.id, notification_id),
          eq(notifications.user_id, user_id)
        ));

      const success = result.rowCount > 0;

      if (success) {
        logger.info('Notification dismissed', {
          component: 'NotificationService',
          notification_id,
          user_id
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to dismiss notification', {
        component: 'NotificationService',
        notification_id,
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notification_id: string, user_id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(notifications)
        .where(and(
          eq(notifications.id, notification_id),
          eq(notifications.user_id, user_id)
        ));

      const success = result.rowCount > 0;

      if (success) {
        logger.info('Notification deleted', {
          component: 'NotificationService',
          notification_id,
          user_id
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to delete notification', {
        component: 'NotificationService',
        notification_id,
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(user_id: string): Promise<NotificationStats> {
    try {
      // Get total counts
      const [totalResult] = await db
        .select({ count: count() })
        .from(notifications)
        .where(eq(notifications.user_id, user_id));

      const [unreadResult] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.user_id, user_id),
          eq(notifications.is_read, false)
        ));

      const [readResult] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.user_id, user_id),
          eq(notifications.is_read, true)
        ));

      // Get counts by type
      const typeResults = await db
        .select({
          notification_type: notifications.notification_type,
          count: count()
        })
        .from(notifications)
        .where(eq(notifications.user_id, user_id))
        .groupBy(notifications.notification_type);

      const byType: Record<string, number> = {};
      typeResults.forEach((row: { notification_type: string; count: number }) => {
        byType[row.notification_type] = Number(row.count);
      });

      return {
        totalNotifications: Number(totalResult.count),
        unreadCount: Number(unreadResult.count),
        readCount: Number(readResult.count),
        byType
      };
    } catch (error) {
      logger.error('Failed to get notification stats', {
        component: 'NotificationService',
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get user alert preferences
   */
  async getUserAlertPreferences(user_id: string): Promise<any | null> {
    try {
      const [preferences] = await db
        .select()
        .from(alert_preferences)
        .where(eq(alert_preferences.user_id, user_id))
        .limit(1);

      return preferences || null;
    } catch (error) {
      logger.error('Failed to get user alert preferences', {
        component: 'NotificationService',
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update user alert preferences
   */
  async updateUserAlertPreferences(user_id: string, preferences: Partial<any>): Promise<any> {
    try {
      const [updated] = await db
        .update(alert_preferences)
        .set({
          ...preferences,
          updated_at: new Date()
        })
        .where(eq(alert_preferences.user_id, user_id))
        .returning();

      if (!updated) {
        // Create new preferences if they don't exist
        const [created] = await db
          .insert(alert_preferences)
          .values({
            user_id,
            ...preferences
          })
          .returning();

        return created;
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update user alert preferences', {
        component: 'NotificationService',
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get user contact methods for delivery
   */
  async getUserContactMethods(user_id: string): Promise<any[]> {
    try {
      const contactMethods = await db
        .select()
        .from(user_contact_methods)
        .where(and(
          eq(user_contact_methods.user_id, user_id),
          eq(user_contact_methods.is_active, true)
        ))
        .orderBy(desc(user_contact_methods.is_primary));

      return contactMethods;
    } catch (error) {
      logger.error('Failed to get user contact methods', {
        component: 'NotificationService',
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Clean up old notifications based on retention policy
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db
        .delete(notifications)
        .where(and(
          eq(notifications.is_read, true),
          sql`${notifications.created_at} < ${cutoffDate}`
        ));

      const deletedCount = result.rowCount;

      logger.info('Cleaned up old notifications', {
        component: 'NotificationService',
        deletedCount,
        daysOld
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old notifications', {
        component: 'NotificationService',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate notification data
   */
  private validateNotificationData(data: CreateNotificationData): void {
    if (!data.user_id) {
      throw new Error('User ID is required');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Notification title is required');
    }

    if (!data.message || data.message.trim().length === 0) {
      throw new Error('Notification message is required');
    }

    if (!data.notification_type) {
      throw new Error('Notification type is required');
    }

    const validTypes = ['bill_update', 'comment_reply', 'milestone', 'campaign_update', 'moderation_action'];
    if (!validTypes.includes(data.notification_type)) {
      throw new Error(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
    }
  }
}

export const notificationService = new NotificationService();
