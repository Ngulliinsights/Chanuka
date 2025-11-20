/**
 * Notification Entity Mapping for DrizzleAdapter
 * 
 * Provides bidirectional mapping between Notification entities and database rows.
 * Handles notification-specific data validation and transformations.
 */

import { notifications } from '@shared/schema';
import { Notification } from '@/features/notifications/domain/entities/notification';
import { EntityMapping } from '../drizzle-adapter';

type NotificationRow = typeof notifications.$inferSelect;
type NotificationInsert = typeof notifications.$inferInsert;

export class NotificationEntityMapping implements EntityMapping<Notification, NotificationRow> {
  /**
   * Convert database row to Notification domain entity
   */
  toEntity(row: NotificationRow): Notification {
    try {
      return Notification.create({
        id: row.id ?? 'unknown',
        user_id: row.user_id ?? 'unknown',
        notification_type: row.notification_type ?? 'system',
        title: row.title ?? 'Notification',
        message: row.message ?? '',
        related_bill_id: row.related_bill_id ?? undefined,
        related_comment_id: row.related_comment_id ?? undefined,
        related_user_id: row.related_user_id ?? undefined,
        is_read: row.is_read ?? false,
        read_at: row.read_at ?? undefined,
        is_dismissed: row.is_dismissed ?? false,
        delivery_method: row.delivery_method ?? 'in_app',
        delivery_status: row.delivery_status ?? 'pending',
        action_taken: row.action_taken ?? false,
        action_type: row.action_type ?? undefined,
        created_at: row.created_at ?? new Date(),
        updated_at: row.updated_at ?? new Date()
      });
    } catch (error) {
      // Fallback for corrupted data
      return Notification.create({
        id: 'unknown',
        user_id: 'unknown',
        notification_type: 'system',
        title: 'Notification',
        message: '',
        is_read: false,
        is_dismissed: false,
        delivery_method: 'in_app',
        delivery_status: 'pending',
        action_taken: false,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  /**
   * Convert Notification entity to database row format
   */
  fromEntity(entity: Notification): Partial<NotificationInsert> {
    const notificationData = entity.toJSON();
    
    return {
      id: notificationData.id,
      user_id: notificationData.user_id,
      notification_type: notificationData.notification_type,
      title: notificationData.title?.trim(),
      message: notificationData.message?.trim(),
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
    };
  }
}

export const notificationEntityMapping = new NotificationEntityMapping();
