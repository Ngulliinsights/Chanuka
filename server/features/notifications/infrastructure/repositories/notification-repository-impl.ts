import { database as db } from '@shared/database/connection';
import { notifications } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { NotificationRepository } from '../../domain/repositories/notification-repository';
import { Notification } from '../../domain/entities/notification';

export class NotificationRepositoryImpl implements NotificationRepository {
  /**
   * Maps database row to Notification domain entity with proper type safety
   */
  private mapToNotification(row: typeof notifications.$inferSelect): Notification {
    return Notification.create({
      id: row.id,
      user_id: row.user_id,
      notification_type: row.notification_type,
      title: row.title,
      message: row.message,
      related_bill_id: row.related_bill_id ?? undefined,
      related_comment_id: row.related_comment_id ?? undefined,
      related_user_id: row.related_user_id ?? undefined,
      is_read: row.is_read,
      read_at: row.read_at ?? undefined,
      is_dismissed: row.is_dismissed,
      delivery_method: row.delivery_method,
      delivery_status: row.delivery_status,
      action_taken: row.action_taken,
      action_type: row.action_type ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  async findById(id: string): Promise<Notification | null> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    return result[0] ? this.mapToNotification(result[0]) : null;
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.user_id, userId))
      .orderBy(sql`${notifications.created_at} DESC`)
      .limit(limit)
      .offset(offset);

    return results.map((result: any) => this.mapToNotification(result));
  }

  async save(notification: Notification): Promise<void> {
    const notificationData = notification.toJSON();

    await db.insert(notifications).values({
      id: notificationData.id,
      user_id: notificationData.user_id,
      notification_type: notificationData.notification_type,
      title: notificationData.title,
      message: notificationData.message,
      related_bill_id: notificationData.related_bill_id,
      related_comment_id: notificationData.related_comment_id,
      related_user_id: notificationData.related_user_id,
      is_read: notificationData.is_read,
      read_at: notificationData.read_at,
      is_dismissed: notificationData.is_dismissed,
      delivery_method: notificationData.delivery_method,
      delivery_status: notificationData.delivery_status,
      action_taken: notificationData.action_taken,
      action_type: notificationData.action_type,
      created_at: notificationData.created_at,
      updated_at: notificationData.updated_at
    });
  }

  async update(notification: Notification): Promise<void> {
    const notificationData = notification.toJSON();

    await db
      .update(notifications)
      .set({
        notification_type: notificationData.notification_type,
        title: notificationData.title,
        message: notificationData.message,
        related_bill_id: notificationData.related_bill_id,
        related_comment_id: notificationData.related_comment_id,
        related_user_id: notificationData.related_user_id,
        is_read: notificationData.is_read,
        read_at: notificationData.read_at,
        is_dismissed: notificationData.is_dismissed,
        delivery_method: notificationData.delivery_method,
        delivery_status: notificationData.delivery_status,
        action_taken: notificationData.action_taken,
        action_type: notificationData.action_type,
        updated_at: notificationData.updated_at
      })
      .where(eq(notifications.id, notificationData.id));
  }

  async delete(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    const results = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, userId),
          eq(notifications.is_read, false)
        )
      )
      .orderBy(sql`${notifications.created_at} DESC`);

    return results.map((result: any) => this.mapToNotification(result));
  }

  async findByType(userId: string, type: string): Promise<Notification[]> {
    const results = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, userId),
          eq(notifications.notification_type, type as any)
        )
      )
      .orderBy(sql`${notifications.created_at} DESC`);

    return results.map((result: any) => this.mapToNotification(result));
  }

  async findByRelatedBill(billId: string): Promise<Notification[]> {
    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.related_bill_id, billId))
      .orderBy(sql`${notifications.created_at} DESC`);

    return results.map((result: any) => this.mapToNotification(result));
  }

  async findPendingDeliveries(): Promise<Notification[]> {
    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.delivery_status, 'pending'))
      .orderBy(sql`${notifications.created_at} ASC`);

    return results.map((result: any) => this.mapToNotification(result));
  }

  async markAsRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await db
      .update(notifications)
      .set({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date()
      })
      .where(sql`${notifications.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
  }

  async markAsDelivered(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await db
      .update(notifications)
      .set({
        delivery_status: 'delivered',
        updated_at: new Date()
      })
      .where(sql`${notifications.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
  }

  async markAsFailed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await db
      .update(notifications)
      .set({
        delivery_status: 'failed',
        updated_at: new Date()
      })
      .where(sql`${notifications.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.user_id, userId));
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const result = await db
      .select({ value: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, userId),
          eq(notifications.is_read, false)
        )
      );

    return Number(result[0]?.value ?? 0);
  }

  async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select({ value: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.user_id, userId));

    return Number(result[0]?.value ?? 0);
  }

  async countPendingDeliveries(): Promise<number> {
    const result = await db
      .select({ value: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.delivery_status, 'pending'));

    return Number(result[0]?.value ?? 0);
  }
}