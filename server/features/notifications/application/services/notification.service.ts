
/**
 * Notification Service — Core CRUD + Orchestration Layer
 *
 * Two classes that build on each other:
 *
 * ┌────────────────────────────────────────────────────────────┐
 * │  NotificationService  (orchestration)                       │
 * │   ├─ resolves merged user preferences                       │
 * │   ├─ runs SmartNotificationFilterService                    │
 * │   ├─ delegates delivery to NotificationChannelService       │
 * │   └─ extends CoreNotificationService                        │
 * │                                                             │
 * │  CoreNotificationService  (DB CRUD)                         │
 * │   ├─ getUserNotifications / createNotification              │
 * │   ├─ markAsRead / markAllAsRead / deleteNotification        │
 * │   ├─ getUnreadCount / getNotificationStats                  │
 * │   └─ getStatus                                              │
 * └────────────────────────────────────────────────────────────┘
 *
 * Dependency graph (acyclic):
 *   notification-service.ts
 *     → notification-channels.ts       (delivery)
 *     → smart-notification-filter.ts   (filtering)
 *     → @server/features/users/...     (preferences)
 *     → @server/infrastructure/database
 */

import { and, count, desc, eq } from 'drizzle-orm';

import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database';
import { notifications } from '@server/infrastructure/schema';
import { userPreferencesService } from '@server/features/users/domain/user-preferences';

import { notificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';
import { smartNotificationFilterService } from '@server/features/notifications/domain/services/smart-notification-filter';
import type { FilterCriteria }                from '@server/features/notifications/domain/services/smart-notification-filter';
import type { CombinedBillTrackingPreferences } from '@server/features/notifications/domain/types';

// ---------------------------------------------------------------------------
// Logger helper — single-string API (matches @server/infrastructure/observability)
// ---------------------------------------------------------------------------
function log(
  level: 'info' | 'warn' | 'error' | 'debug',
  msg: string,
  ctx?: Record<string, unknown>,
): void {
  const suffix = ctx ? ` | ${JSON.stringify(ctx)}` : '';
  logger[level](`${msg}${suffix}`);
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface NotificationData {
  id:             number;
  user_id:        string;
  type:           string;
  title:          string;
  message:        string;
  is_read:        boolean;
  relatedBillId?: number;
  metadata?:      Record<string, unknown>;
  created_at:     Date;
}

export interface NotificationHistory {
  notifications: NotificationData[];
  total:         number;
  unread:        number;
}

export interface NotificationStats {
  total:    number;
  unread:   number;
  byType:   Record<string, number>;
  readRate: number;
}

/** Input for the orchestration path (multi-channel smart send). */
export interface NotificationRequest {
  user_id:         string;
  type:            'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert' | 'digest';
  subType?:        'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 'sponsor_update';
  title:           string;
  message:         string;
  htmlMessage?:    string;
  priority:        'low' | 'medium' | 'high' | 'urgent';
  relatedBillId?:  number;
  category?:       string;
  tags?:           string[];
  sponsorName?:    string;
  actionUrl?:      string;
  metadata?:       Record<string, unknown>;
}

export interface NotificationResult {
  sent:            boolean;
  channels:        string[];
  filteredOut:     boolean;
  filterReasons:   string[];
  notificationId?: string;
  error?:          string;
}

export interface BulkNotificationResult {
  total:     number;
  succeeded: number;
  failed:    number;
  results:   NotificationResult[];
}

// ---------------------------------------------------------------------------
// Core CRUD Service
// ---------------------------------------------------------------------------

/**
 * CoreNotificationService
 *
 * Thin read/write layer for the notifications table.
 * Used directly by REST routes; makes no delivery decisions.
 */
export class CoreNotificationService {

  async getUserNotifications(
    user_id: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean; type?: string } = {},
  ): Promise<NotificationData[]> {
    try {
      const { limit = 20, offset = 0, unreadOnly = false, type } = options;

      const conditions = [eq(notifications.user_id, user_id)];
      if (unreadOnly) conditions.push(eq(notifications.is_read, false));
      if (type)       conditions.push(eq(notifications.notification_type, type));

      const rows = await db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.created_at))
        .limit(limit)
        .offset(offset);

      return rows.map(rowToNotificationData);
    } catch (error) {
      log('error', `Failed to get user notifications | ${toMessage(error)}`, { user_id });
      return [];
    }
  }

  async createNotification(data: {
    user_id:        string;
    type:           string;
    title:          string;
    message:        string;
    relatedBillId?: number;
    metadata?:      Record<string, unknown>;
  }): Promise<NotificationData> {
    const rows = await db
      .insert(notifications)
      .values({
        user_id:           data.user_id,
        notification_type: data.type,
        title:             data.title,
        message:           data.message,
        related_bill_id:   data.relatedBillId?.toString(),
        is_read:           false,
        is_dismissed:      false,
        delivery_method:   'in_app',
        delivery_status:   'pending',
        created_at:        new Date(),
      })
      .returning();

    const row = (rows as any[])[0];
    if (!row) throw new Error('Notification insert returned no row');
    return rowToNotificationData(row);
  }

  async markAsRead(user_id: string, notification_id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ is_read: true, read_at: new Date() })
      .where(
        and(
          eq(notifications.user_id, user_id),
          eq(notifications.id, String(notification_id)),
        ),
      );
  }

  async markAllAsRead(user_id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ is_read: true, read_at: new Date() })
      .where(and(eq(notifications.user_id, user_id), eq(notifications.is_read, false)));
  }

  async deleteNotification(user_id: string, notification_id: number): Promise<void> {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.user_id, user_id),
          eq(notifications.id, String(notification_id)),
        ),
      );
  }

  async getUnreadCount(user_id: string): Promise<number> {
    try {
      const [result] = await db
        .select({ n: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.user_id, user_id),
            eq(notifications.is_read, false),
            eq(notifications.is_dismissed, false),
          ),
        );
      return result?.n ?? 0;
    } catch (error) {
      log('error', `Failed to get unread count | ${toMessage(error)}`, { user_id });
      return 0;
    }
  }

  async getNotificationStats(user_id: string): Promise<NotificationStats> {
    try {
      const [totalRow] = await db
        .select({ n: count() })
        .from(notifications)
        .where(eq(notifications.user_id, user_id));

      const unread = await this.getUnreadCount(user_id);

      const byTypeRows = await db
        .select({ type: notifications.notification_type, n: count() })
        .from(notifications)
        .where(eq(notifications.user_id, user_id))
        .groupBy(notifications.notification_type);

      const total    = totalRow?.n ?? 0;
      const byType   = Object.fromEntries(byTypeRows.map((r: any) => [r.type, r.n]));
      const readRate = total > 0 ? parseFloat((((total - unread) / total) * 100).toFixed(1)) : 0;

      return { total, unread, byType, readRate };
    } catch (error) {
      log('error', `Failed to get notification stats | ${toMessage(error)}`, { user_id });
      return { total: 0, unread: 0, byType: {}, readRate: 0 };
    }
  }

  getStatus(): { healthy: boolean; description: string } {
    return { healthy: true, description: 'CoreNotificationService operational' };
  }
}

// ---------------------------------------------------------------------------
// Orchestration Service
// ---------------------------------------------------------------------------

/**
 * NotificationService
 *
 * Extends CoreNotificationService with a smart multi-channel send flow:
 *
 *  1. Fetch merged user preferences
 *  2. Ask SmartNotificationFilterService whether to send + which channels
 *  3. Delegate physical delivery to NotificationChannelService
 *  4. Return a structured result with audit trail
 *
 * Uses COMPOSITION (not inheritance) for channel delivery to keep the
 * dependency graph acyclic.
 */
export class NotificationService extends CoreNotificationService {
  private readonly channelService = notificationChannelService;
  private readonly filterService  = smartNotificationFilterService;

  /**
   * Primary entry point for all outbound notifications.
   *
   * Caller provides intent; this method decides whether and how to deliver.
   */
  async send(request: NotificationRequest): Promise<NotificationResult> {
    const ctx = { user_id: request.user_id, type: request.type };

    try {
      // 1. Resolve merged user preferences
      const preferences = await this.resolvePreferences(request.user_id);

      // 2. Smart-filter decision
      const filterCriteria: FilterCriteria = {
        user_id:          request.user_id,
        bill_id:          request.relatedBillId,
        category:         request.category,
        tags:             request.tags,
        sponsorName:      request.sponsorName,
        priority:         request.priority,
        notificationType: request.type,
        subType:          request.subType,
        content:          { title: request.title, message: request.message },
        userPreferences:  preferences,
      };

      const filterResult = await this.filterService.shouldSendNotification(filterCriteria);

      if (!filterResult.shouldNotify) {
        log('debug', `Notification filtered out`, { ...ctx, reasons: filterResult.reasons });
        return {
          sent:          false,
          channels:      [],
          filteredOut:   true,
          filterReasons: filterResult.reasons,
        };
      }

      // 3. Use filter-recommended channels (already validated against user's enabled channels)
      const channels: Array<'email' | 'inApp' | 'sms' | 'push'> =
        filterResult.recommendedChannels.length > 0
          ? [...filterResult.recommendedChannels]
          : ['inApp'];

      // 4. Deliver in parallel across recommended channels
      const deliveryResults = await this.channelService.sendToMultipleChannels(
        request.user_id,
        channels,
        {
          title:       request.title,
          message:     request.message,
          htmlMessage: request.htmlMessage,
        },
        {
          priority:      filterResult.suggestedPriority,
          relatedBillId: request.relatedBillId,
          category:      request.category,
          actionUrl:     request.actionUrl,
          ...request.metadata,
        },
      );

      const succeeded = deliveryResults.filter((r) => r.success);
      const inAppMsg  = deliveryResults.find((r) => r.channel === 'inApp');
      const allFailed = succeeded.length === 0;

      if (allFailed) {
        log('error', `All channel deliveries failed`, { ...ctx, channels });
      } else {
        log('info', `Notification delivered`, {
          ...ctx,
          channels:   succeeded.map((r) => r.channel),
          confidence: filterResult.confidence,
          priority:   filterResult.suggestedPriority,
        });
      }

      return {
        sent:           !allFailed,
        channels:       succeeded.map((r) => r.channel),
        filteredOut:    false,
        filterReasons:  filterResult.reasons,
        notificationId: inAppMsg?.messageId,
        error:          allFailed ? 'All channels failed' : undefined,
      };

    } catch (error) {
      log('error', `Notification send failed | ${toMessage(error)}`, ctx);
      return {
        sent:          false,
        channels:      [],
        filteredOut:   false,
        filterReasons: [],
        error:         toMessage(error),
      };
    }
  }

  /**
   * Send the same notification template to multiple users.
   * Each user gets independent preference evaluation and smart filtering.
   */
  async sendBulk(
    userIds:  string[],
    template: Omit<NotificationRequest, 'user_id'>,
  ): Promise<BulkNotificationResult> {
    log('info', `Starting bulk notification send`, {
      userCount: userIds.length,
      type:      template.type,
    });

    const settled = await Promise.allSettled(
      userIds.map((user_id) => this.send({ ...template, user_id })),
    );

    const results: NotificationResult[] = settled.map(
      (s): NotificationResult =>
        s.status === 'fulfilled'
          ? s.value
          : {
              sent:          false,
              channels:      [],
              filteredOut:   false,
              filterReasons: [],
              error:         toMessage(s.reason),
            },
    );

    const succeeded = results.filter((r) => r.sent).length;

    return {
      total:     userIds.length,
      succeeded,
      failed:    userIds.length - succeeded,
      results,
    };
  }

  /**
   * Convenience: send a system alert, bypassing relevance smart-filter checks.
   * Used by alerting-service.ts when wiring email / webhook alert actions.
   */
  async sendSystemAlert(
    user_id:  string,
    title:    string,
    message:  string,
    priority: 'medium' | 'high' | 'urgent' = 'high',
  ): Promise<NotificationResult> {
    return this.send({ user_id, type: 'system_alert', title, message, priority });
  }

  override getStatus() {
    return {
      healthy:     true,
      description: 'NotificationService operational',
      channels:    this.channelService.getStatus(),
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /**
   * Fetches merged user preferences.
   *
   * Falls back to permissive defaults on failure so a preferences outage
   * does not silently swallow all notifications.
   */
  private async resolvePreferences(user_id: string): Promise<CombinedBillTrackingPreferences> {
    try {
      const prefs = await userPreferencesService.getUserPreferences(user_id);
      return prefs as unknown as CombinedBillTrackingPreferences;
    } catch (error) {
      log('warn', `Could not resolve preferences — using defaults | ${toMessage(error)}`, { user_id });
      return permissiveDefaults();
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToNotificationData(row: Record<string, unknown>): NotificationData {
  const rawId = row['related_bill_id'] != null ? Number(row['related_bill_id']) : undefined;

  return {
    id:            Number(row['id']),
    user_id:       String(row['user_id']),
    type:          String(row['notification_type'] ?? ''),
    title:         String(row['title'] ?? ''),
    message:       String(row['message'] ?? ''),
    is_read:       Boolean(row['is_read']),
    relatedBillId: rawId !== undefined && !Number.isNaN(rawId) ? rawId : undefined,
    metadata:      (row['metadata'] as Record<string, unknown>) ?? undefined,
    created_at:    row['created_at'] instanceof Date
      ? row['created_at']
      : new Date(String(row['created_at'])),
  };
}

/** Permissive preference fallback — all core channels enabled, no smart filtering. */
function permissiveDefaults(): CombinedBillTrackingPreferences {
  return {
    updateFrequency:      'immediate',
    notificationChannels: { inApp: true, email: true, sms: false, push: false },
    statusChanges:        true,
    newComments:          true,
    amendments:           true,
    votingSchedule:       true,
    quietHours:           { enabled: false, startTime: '22:00', endTime: '08:00' },
    smartFiltering:       { enabled: false, priorityThreshold: 'low', interestBasedFiltering: false },
    tracking_types:       ['statusChanges', 'newComments', 'amendments', 'votingSchedule'],
  } as unknown as CombinedBillTrackingPreferences;
}

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------

export const coreNotificationService = new CoreNotificationService();
export const notificationService      = new NotificationService();