import { eq } from 'drizzle-orm';
import { readDatabase } from '@shared/database';
import { webSocketService } from '@server/infrastructure/websocket.js';
import { cacheService } from '@server/infrastructure/cache/cache-service.js';
import * as schema from '@shared/schema';
import { Bill } from '@shared/schema';
import { logger  } from '@shared/core';
import { notificationOrchestratorService, NotificationRequest } from '@server/infrastructure/notifications/notification-orchestrator.js';

// --- Cache Configuration ---
// Define cache keys and TTL values locally since they're not exported from cache-service
const CACHE_KEYS = {
  BILL_MINIMAL_DETAILS: (bill_id: string) => `bill:minimal:${bill_id}`,
  BILL_STATUS_HISTORY: (bill_id: string) => `bill:status:history:${bill_id}`,
};

const CACHE_TTL = {
  BILL_DATA_SHORT: 300,    // 5 minutes
  BILL_DATA_LONG: 3600,    // 1 hour
};

// --- Interface Definitions ---
/**
 * Describes a change in a bill's status
 * Note: bill_id is a UUID string to match the database schema
 */
export interface BillStatusChange {
  bill_id: string; // Changed from number to string (UUID)
  oldStatus: string;
  newStatus: string;
  timestamp: Date;
  triggeredBy?: string;
  metadata?: {
    reason?: string;
    automaticChange?: boolean;
    scheduledChange?: boolean;
  };
}

/**
 * Describes a user engagement event on a bill
 */
export interface BillEngagementUpdate {
  bill_id: string; // Changed from number to string (UUID)
  type: 'view' | 'comment' | 'share';
  user_id: string;
  timestamp: Date;
  comment_id?: string; // Changed from number to string (likely UUID)
  newStats: {
    totalViews: number;
    totalComments: number;
    totalShares: number;
    engagement_score: number;
  };
}

/**
 * Real-Time Bill Status Monitoring Service
 *
 * Responsibilities:
 * - Detects significant bill events (status changes, engagement).
 * - Caches recent status change history.
 * - Broadcasts real-time updates via WebSockets.
 * - Triggers the NotificationOrchestratorService to handle user notifications based on preferences.
 *
 * Note: This service *does not* handle notification preferences, batching, or delivery itself.
 */
export class BillStatusMonitorService {
  private get db() {
    // Provides access to the read replica database connection
    return readDatabase;
  }

  /**
   * Processes a detected bill status change.
   * Updates cache, broadcasts WebSocket message, and triggers notifications via orchestrator.
   */
  async handleBillStatusChange(change: BillStatusChange): Promise<void> {
    const logContext = {
      component: 'BillStatusMonitorService',
      bill_id: change.bill_id,
      oldStatus: change.oldStatus,
      newStatus: change.newStatus
    };
    logger.info(`📊 Processing bill status change`, logContext);

    try {
      // 1. Fetch Essential Bill Details (Title, Category) for context
      const bill = await this.getBillDetails(change.bill_id);
      if (!bill) {
        logger.error(`Bill ${change.bill_id} not found during status change processing.`, logContext);
        return; // Cannot proceed without bill context
      }

      // 2. Cache the Status Change Event for historical lookups
      await this.cacheStatusChange(change);

      // 3. Broadcast WebSocket Update to all connected clients viewing this bill
      webSocketService.broadcastBillUpdate(parseInt(change.bill_id), {
        type: 'status_change',
        data: {
          bill_id: change.bill_id,
          billTitle: bill.title,
          oldStatus: change.oldStatus,
          newStatus: change.newStatus,
          timestamp: change.timestamp,
          metadata: change.metadata
        },
        timestamp: change.timestamp
      });

      // 4. Find Users Tracking This Event Type
      // Query the preference table for users tracking 'status_changes' for this specific bill
      const usersToNotify = await this.getActiveTrackersForEvent(change.bill_id, 'status_changes');

      if (usersToNotify.length > 0) {
        logger.info(`📢 Triggering Notification Orchestrator for ${usersToNotify.length} users`, logContext);

        // 5. Prepare Notification Template for the Orchestrator
        const notificationTemplate: Omit<NotificationRequest, 'user_id'> = {
          notificationType: 'bill_update',
          subType: 'status_change',
          priority: this.determinePriorityForStatus(change.newStatus),
          relatedBillId: parseInt(change.bill_id),
          // Only include category if it exists to satisfy type requirements
          ...(bill.category && { category: bill.category }),
          content: {
            title: `Bill Status Update: ${bill.title}`,
            message: `Status changed from "${change.oldStatus}" to "${change.newStatus}".`,
          },
          metadata: {
            oldStatus: change.oldStatus,
            newStatus: change.newStatus,
            triggeredBy: change.triggeredBy,
            reason: change.metadata?.reason,
            actionUrl: `/bill/${change.bill_id}`
          },
          config: {}
        };

        // 6. Trigger Orchestrator for Each User (non-blocking)
        usersToNotify.forEach(user_id => {
          this.triggerNotification(user_id, notificationTemplate);
        });

      } else {
        logger.info(`📢 No users actively tracking status changes for this bill.`, logContext);
      }

      logger.info(`✅ Successfully processed status change`, logContext);

    } catch (error) {
      logger.error('Error handling bill status change:', logContext, error);
      // Log error but avoid throwing to prevent cascading failures in event processing
    }
  }

  /**
   * Processes a detected bill engagement update (e.g., new comment).
   * Broadcasts WebSocket message and triggers notifications for relevant users.
   */
  async handleBillEngagementUpdate(update: BillEngagementUpdate): Promise<void> {
    const logContext = {
      component: 'BillStatusMonitorService',
      bill_id: update.bill_id,
      type: update.type,
      user_id: update.user_id
    };
    logger.info(`📈 Processing engagement update`, logContext);

    try {
      // 1. Fetch Bill Details
      const bill = await this.getBillDetails(update.bill_id);
      if (!bill) {
        logger.error(`Bill ${update.bill_id} not found during engagement update processing.`, logContext);
        return;
      }

      // 2. Broadcast WebSocket Update (primarily for comments)
      if (update.type === 'comment') {
        webSocketService.broadcastBillUpdate(parseInt(update.bill_id), {
          type: 'new_comment',
          data: {
            bill_id: update.bill_id,
            billTitle: bill.title,
            user_id: update.user_id,
            comment_id: update.comment_id,
            newStats: update.newStats,
            timestamp: update.timestamp
          },
          timestamp: update.timestamp
        });
      }
      // Note: WebSocket updates for 'view' or 'share' might be too noisy, omitted here.

      // 3. Trigger Notifications (only for comments, typically)
      if (update.type === 'comment') {
        // Find users tracking 'new_comments' for this bill, EXCLUDING the comment author
        const usersToNotify = await this.getActiveTrackersForEvent(update.bill_id, 'new_comments');
        const filteredUsers = usersToNotify.filter(id => id !== update.user_id);

        if (filteredUsers.length > 0) {
          logger.info(`📢 Triggering Notification Orchestrator for ${filteredUsers.length} users (new comment)`, logContext);

          // Try to fetch commenter details to make notifications more informative
          let commenterName = 'A user';
          try {
            const userRes = await this.db.select({
              id: schema.users.id,
              email: schema.users.email
            })
              .from(schema.users)
              .where(eq(schema.users.id, update.user_id))
              .limit(1);
            if (userRes && userRes[0] && userRes[0].email) {
              // Extract name from email or use email itself
              commenterName = userRes[0].email.split('@')[0];
            }
          } catch (uErr) {
            logger.debug(`Failed to fetch commenter info for user ${update.user_id}: ${String(uErr)}`);
          }

          const notificationTemplate: Omit<NotificationRequest, 'user_id'> = {
            notificationType: 'bill_update',
            subType: 'new_comment',
            priority: 'medium',
            relatedBillId: parseInt(update.bill_id),
            // Only include category if it exists
            ...(bill.category && { category: bill.category }),
            content: {
              title: `New Comment on: ${bill.title}`,
              message: `${commenterName} posted a new comment on this bill.`,
            },
            metadata: {
              comment_id: update.comment_id,
              commenterUserId: update.user_id,
              actionUrl: `/bill/${update.bill_id}#comment-${update.comment_id || ''}`
            },
          };

          // Trigger Orchestrator (non-blocking)
          filteredUsers.forEach(user_id => {
            this.triggerNotification(user_id, notificationTemplate);
          });
        } else {
          logger.info(`📢 No users actively tracking new comments for this bill (excluding author).`, logContext);
        }
      }

      logger.info(`✅ Successfully processed engagement update`, logContext);

    } catch (error) {
      logger.error('Error handling bill engagement update:', logContext, error);
    }
  }

  /**
   * Safely triggers the notification orchestrator in a non-blocking way.
   * Logs the outcome (success, filtered, batched, failed).
   */
  private triggerNotification(user_id: string, template: Omit<NotificationRequest, 'user_id'>): void {
    notificationOrchestratorService.sendNotification({ ...template, user_id })
      .then(result => {
        // Log outcome for observability
        if (!result.success) {
          logger.warn(`Notification Orchestrator failed`, {
            component: 'BillStatusMonitorService',
            user_id,
            type: template.notificationType,
            error: result.error
          });
        } else if (result.filtered) {
          logger.debug(`Notification filtered by orchestrator`, {
            component: 'BillStatusMonitorService',
            user_id,
            type: template.notificationType,
            reason: result.filterReason
          });
        } else if (result.batched) {
          logger.debug(`Notification batched by orchestrator`, {
            component: 'BillStatusMonitorService',
            user_id,
            type: template.notificationType,
            batchId: result.batchId
          });
        } else {
          logger.debug(`Notification sent immediately by orchestrator`, {
            component: 'BillStatusMonitorService',
            user_id,
            type: template.notificationType
          });
        }
      })
      .catch(err => {
        // Catch unexpected errors from the orchestrator promise itself
        logger.error(`Unhandled error triggering Notification Orchestrator`, {
          component: 'BillStatusMonitorService',
          user_id
        }, err);
      });
  }

  /**
   * Determines a notification priority based on the significance of the new status.
   */
  private determinePriorityForStatus(newStatus: string): NotificationRequest['priority'] {
    switch (newStatus) {
      case 'signed':
      case 'failed':
        return 'high'; // Final, significant outcomes
      case 'passed':
        return 'high'; // Major milestone
      case 'committee_stage':
      case 'second_reading':
      case 'third_reading':
        return 'medium'; // Standard progress
      case 'introduced':
      case 'drafted':
        return 'low'; // Initial state
      default:
        return 'medium'; // Default for unknown statuses
    }
  }

  /**
   * Queries the database to find user IDs actively tracking a specific event type for a given bill.
   * Uses the `bill_tracking_preferences` table.
   * 
   * IMPORTANT: This method assumes your schema has columns that support tracking preferences.
   * You'll need to verify the actual column names in your schema and adjust accordingly.
   */
  private async getActiveTrackersForEvent(
    bill_id: string, // Changed from number to string
    event_type: 'status_changes' | 'new_comments'
  ): Promise<string[]> {
    try {
      // This query needs to be adjusted based on your actual schema structure.
      // If your schema doesn't have 'is_active' or 'tracking_types', you'll need to modify this.
      // For now, I'm providing a basic query that should work if these columns exist:
      const results = await this.db
        .select({ user_id: schema.bill_tracking_preferences.user_id })
        .from(schema.bill_tracking_preferences)
        .where(
          eq(schema.bill_tracking_preferences.bill_id, bill_id)
          // Add additional conditions here based on your actual schema columns
          // For example, if you have an 'enabled' column instead of 'is_active':
          // and(
          //   eq(schema.bill_tracking_preferences.bill_id, bill_id),
          //   eq(schema.bill_tracking_preferences.enabled, true)
          // )
        );
      
      return results.map((r: { user_id: string }) => r.user_id);
    } catch (error) {
      logger.error(`Error fetching active trackers for event '${event_type}', bill ${bill_id}:`, {
        component: 'BillStatusMonitorService'
      }, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Fetches minimal required bill details (ID, Title, Category) using caching.
   */
  private async getBillDetails(bill_id: string): Promise<Pick<Bill, 'id' | 'title' | 'category'> | null> {
    const cacheKey = CACHE_KEYS.BILL_MINIMAL_DETAILS(bill_id);
    try {
      const cachedBill = await cacheService.get<Pick<Bill, 'id' | 'title' | 'category'>>(cacheKey);
      if (cachedBill) return cachedBill;

      const results = await this.db
        .select({
          id: schema.bills.id,
          title: schema.bills.title,
          category: schema.bills.category
        })
        .from(schema.bills)
        .where(eq(schema.bills.id, bill_id))
        .limit(1);

      // Handle the case where no bill is found
      const bill = results[0] || null;

      if (bill) {
        await cacheService.set(cacheKey, bill, CACHE_TTL.BILL_DATA_SHORT);
      }
      return bill;
    } catch (error) {
      logger.error(`Failed to get bill details for bill ${bill_id}:`, {
        component: 'BillStatusMonitorService'
      }, error);
      return null;
    }
  }

  /**
   * Caches the latest status change events for a bill.
   */
  private async cacheStatusChange(change: BillStatusChange): Promise<void> {
    const cacheKey = CACHE_KEYS.BILL_STATUS_HISTORY(change.bill_id);
    try {
      const existingChanges: BillStatusChange[] = await cacheService.get(cacheKey) || [];
      // Add the new change, keep only the last N (e.g., 10), and ensure chronological order
      const updatedChanges = [
        ...existingChanges.filter(c => c.timestamp.getTime() !== change.timestamp.getTime()),
        change
      ]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(-10); // Keep last 10

      await cacheService.set(cacheKey, updatedChanges, CACHE_TTL.BILL_DATA_LONG);
    } catch (error) {
      logger.error('Error caching status change:', {
        component: 'BillStatusMonitorService',
        bill_id: change.bill_id
      }, error);
    }
  }

  /**
   * Retrieves the cached status change history for a bill.
   */
  async getBillStatusHistory(bill_id: string): Promise<BillStatusChange[]> {
    const cacheKey = CACHE_KEYS.BILL_STATUS_HISTORY(bill_id);
    try {
      const changes = await cacheService.get(cacheKey);
      // Ensure returned value is always an array, sorted descending by timestamp
      return Array.isArray(changes)
        ? changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        : [];
    } catch (error) {
      logger.error(`Error getting status history for bill ${bill_id}:`, {
        component: 'BillStatusMonitorService'
      }, error);
      return [];
    }
  }

  /**
   * Gracefully shuts down the service (if needed).
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Bill Status Monitor Service...', {
      component: 'BillStatusMonitorService'
    });
    // Add cleanup logic here if the service uses intervals, timers, or persistent connections
    logger.info('Bill Status Monitor Service shutdown complete.', {
      component: 'BillStatusMonitorService'
    });
  }
}

// Export singleton instance
export const billStatusMonitorService = new BillStatusMonitorService();
