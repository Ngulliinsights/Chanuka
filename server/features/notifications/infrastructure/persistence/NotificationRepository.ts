/**
 * Notification Repository - Domain-Specific Repository
 * 
 * Provides data access operations for notifications with domain-specific methods.
 * Extends BaseRepository for infrastructure (caching, logging, error handling).
 */

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { notifications } from '@server/infrastructure/schema';
import { eq, and, inArray, desc, asc, gte, lte, between } from 'drizzle-orm';
import type {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '../../application/notifications-validation.schemas';

/**
 * Notification entity type (inferred from schema)
 */
export type Notification = typeof notifications.$inferSelect;

/**
 * New notification data type (for inserts)
 */
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Query options for notification searches
 */
export interface NotificationQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'priority' | 'read_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Notification filter options
 */
export interface NotificationFilters {
  type?: NotificationType | NotificationType[];
  status?: NotificationStatus;
  priority?: NotificationPriority;
  unread_only?: boolean;
  start_date?: Date;
  end_date?: Date;
}

/**
 * Notification repository providing domain-specific data access methods.
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new NotificationRepository();
 * 
 * // Find user notifications
 * const result = await repository.findByUserId('user-uuid');
 * if (result.isOk) {
 *   console.log('Found', result.value.length, 'notifications');
 * }
 * ```
 */
export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super({
      entityName: 'Notification',
      enableCache: true,
      cacheTTL: 300, // 5 minutes (medium volatility)
      enableLogging: true,
    });
  }

  /**
   * Find notification by ID
   * 
   * @param id - Notification ID
   * @returns Result containing Maybe<Notification>
   */
  async findById(id: string): Promise<Result<Maybe<Notification>, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(notifications)
          .where(eq(notifications.id, id))
          .limit(1);
        return results[0] ?? null;
      },
      `notification:id:${id}`
    );
  }

  /**
   * Find notifications by user ID with filters
   * 
   * @param userId - User ID
   * @param filters - Optional filters
   * @param options - Query options (pagination, sorting)
   * @returns Result containing array of notifications
   */
  async findByUserId(
    userId: string,
    filters?: NotificationFilters,
    options?: NotificationQueryOptions
  ): Promise<Result<Notification[], Error>> {
    return this.executeRead(
      async (db) => {
        const conditions = [eq(notifications.user_id, userId)];

        // Apply filters
        if (filters?.type) {
          if (Array.isArray(filters.type)) {
            conditions.push(inArray(notifications.type, filters.type));
          } else {
            conditions.push(eq(notifications.type, filters.type));
          }
        }

        if (filters?.status) {
          conditions.push(eq(notifications.status, filters.status));
        }

        if (filters?.priority) {
          conditions.push(eq(notifications.priority, filters.priority));
        }

        if (filters?.unread_only) {
          conditions.push(eq(notifications.read_at, null));
        }

        if (filters?.start_date) {
          conditions.push(gte(notifications.created_at, filters.start_date));
        }

        if (filters?.end_date) {
          conditions.push(lte(notifications.created_at, filters.end_date));
        }

        if (filters?.start_date && filters?.end_date) {
          conditions.push(
            between(notifications.created_at, filters.start_date, filters.end_date)
          );
        }

        // Build query
        let query = db
          .select()
          .from(notifications)
          .where(and(...conditions));

        // Apply sorting
        const sortBy = options?.sortBy ?? 'created_at';
        const sortOrder = options?.sortOrder ?? 'desc';
        query = query.orderBy(
          sortOrder === 'asc' ? asc(notifications[sortBy]) : desc(notifications[sortBy])
        );

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `notification:user:${userId}`
    );
  }

  /**
   * Create a new notification
   * 
   * @param data - Notification data
   * @returns Result containing created notification
   */
  async create(data: InsertNotification): Promise<Result<Notification, Error>> {
    return this.executeWrite(
      async (db) => {
        const [notification] = await db
          .insert(notifications)
          .values(data)
          .returning();
        return notification;
      },
      [`notification:user:${data.user_id}`]
    );
  }

  /**
   * Mark notification as read
   * 
   * @param id - Notification ID
   * @returns Result containing updated notification
   */
  async markAsRead(id: string): Promise<Result<Notification, Error>> {
    return this.executeWrite(
      async (db) => {
        const [notification] = await db
          .update(notifications)
          .set({ read_at: new Date(), status: 'read' })
          .where(eq(notifications.id, id))
          .returning();
        return notification;
      },
      [`notification:id:${id}`]
    );
  }

  /**
   * Mark multiple notifications as read
   * 
   * @param ids - Array of notification IDs
   * @returns Result containing count of updated notifications
   */
  async markManyAsRead(ids: string[]): Promise<Result<number, Error>> {
    return this.executeWrite(
      async (db) => {
        const result = await db
          .update(notifications)
          .set({ read_at: new Date(), status: 'read' })
          .where(inArray(notifications.id, ids));
        return result.rowCount ?? 0;
      },
      ids.map(id => `notification:id:${id}`)
    );
  }

  /**
   * Delete notification
   * 
   * @param id - Notification ID
   * @returns Result containing success status
   */
  async delete(id: string): Promise<Result<boolean, Error>> {
    return this.executeWrite(
      async (db) => {
        const result = await db
          .delete(notifications)
          .where(eq(notifications.id, id));
        return (result.rowCount ?? 0) > 0;
      },
      [`notification:id:${id}`]
    );
  }

  /**
   * Count unread notifications for user
   * 
   * @param userId - User ID
   * @returns Result containing count
   */
  async countUnread(userId: string): Promise<Result<number, Error>> {
    return this.executeRead(
      async (db) => {
        const results = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.user_id, userId),
              eq(notifications.read_at, null)
            )
          );
        return results.length;
      },
      `notification:unread:${userId}`
    );
  }
}
