import { db } from '../db.js';
import { notifications, users, bills } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export interface NotificationData {
  userId: string;
  type: 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert';
  title: string;
  message: string;
  relatedBillId?: number;
  metadata?: Record<string, any>;
}

export class NotificationService {
  async createNotification(data: NotificationData) {
    try {
      const notification = await db
        .insert(notifications)
        .values({
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          relatedBillId: data.relatedBillId,
          isRead: false,
          createdAt: new Date()
        })
        .returning();

      // In a real app, you'd also send push notifications, emails, etc.
      await this.sendRealTimeNotification(data.userId, notification[0]);

      return notification[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    try {
      const userNotifications = await db
        .select({
          id: notifications.id,
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
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      return userNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: number, userId: string) {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const result = await db
        .select({ count: notifications.id })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      return result.length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  private async sendRealTimeNotification(userId: string, notification: any) {
    // This would integrate with WebSocket or Server-Sent Events
    // For now, we'll just log it
    console.log(`Real-time notification for user ${userId}:`, notification);
  }

  // Bulk notification methods
  async notifyBillUpdate(billId: number, updateType: string, message: string) {
    try {
      // Get all users who are tracking this bill
      // This would require a bill_tracking table
      const title = `Bill Update: ${updateType}`;
      
      // For now, we'll create a system notification
      // In a real app, you'd query the bill_tracking table
      console.log(`Bill ${billId} update notification: ${message}`);
    } catch (error) {
      console.error('Error sending bill update notifications:', error);
    }
  }

  async notifyNewComment(billId: number, commentAuthorId: string, parentCommentId?: number) {
    try {
      // Notify bill author and other commenters
      // This would require more complex logic to avoid spam
      console.log(`New comment notification for bill ${billId}`);
    } catch (error) {
      console.error('Error sending comment notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();