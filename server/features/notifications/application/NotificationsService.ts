/**
 * Notifications Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService } from '@server/features/security';
import { cacheService } from '@server/infrastructure/cache';
import { cacheKeys, CACHE_TTL } from '@server/infrastructure/cache/cache-keys';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';;
import { notifications } from '@server/infrastructure/schema';
import { eq, desc } from 'drizzle-orm';

export class NotificationsService {
  private inputSanitizer = new InputSanitizationService();

  async sendNotification(userId: string, content: string, type: string): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);
      const sanitizedContent = this.inputSanitizer.sanitizeHtml(content); // XSS prevention

      await withTransaction(async (tx) => {
        await tx.insert(notifications).values({
          user_id: sanitizedUserId,
          notification_type: type as any,
          title: 'Notification',
          message: sanitizedContent,
          priority: 'normal' as any,
          is_read: false,
        });
      });

      // Invalidate user notifications cache
      const cacheKey = cacheKeys.user(sanitizedUserId, 'notifications');
      await cacheService.del(cacheKey);

      await securityAuditService.logSecurityEvent({
        event_type: 'notification_sent',
        severity: 'low',
        user_id: sanitizedUserId,
        action: 'create',
        success: true,
      });

      return true;
    }, { service: 'NotificationsService', operation: 'sendNotification' });
  }

  async getUserNotifications(userId: string): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);

      const cacheKey = cacheKeys.user(sanitizedUserId, 'notifications');
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) return cached;

      // @ts-ignore - Drizzle ORM type inference issue with notifications schema
      const result = await db
        .select()
        .from(notifications)
        .where(eq(notifications.user_id, sanitizedUserId))
        .orderBy(desc(notifications.created_at))
        .limit(50);

      const userNotifications = result as any[];

      await cacheService.set(cacheKey, userNotifications, CACHE_TTL.HALF_HOUR);
      return userNotifications;
    }, { service: 'NotificationsService', operation: 'getUserNotifications' });
  }
}

export const notificationsService = new NotificationsService();
