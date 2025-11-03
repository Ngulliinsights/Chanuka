import { eq, and, sql } from 'drizzle-orm';
import { databaseService } from '../../infrastructure/database/database-service.js';
import { readDatabase } from '@shared/database/connection';
import { webSocketService } from '../../infrastructure/websocket.js';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../../infrastructure/cache/cache-service.js';
import * as schema from '@shared/schema';
import { Bill } from '../../../shared/schema';
import { logger } from '../../../shared/core/index.js';
// Import the orchestrator to trigger notifications
import { notificationOrchestratorService, NotificationRequest } from '../../infrastructure/notifications/notification-orchestrator.js';

// --- Interface Definitions ---
// Describes a change in a bill's status
export interface BillStatusChange { bill_id: number;
  oldStatus: string; // Previous status (e.g., 'introduced')
  newStatus: string; // New status (e.g., 'committee')
  timestamp: Date; // When the change occurred
  triggeredBy?: string; // Identifier for the cause ('system', user ID, etc.)
  metadata?: {
    reason?: string; // Optional reason for the change
    automaticChange?: boolean; // Flag if system-driven
    scheduledChange?: boolean; // Flag if part of a scheduled process
   };
}

// Describes a user engagement event on a bill
export interface BillEngagementUpdate { bill_id: number;
  type: 'view' | 'comment' | 'share'; // Type of engagement
  user_id: string; // User who performed the action
  timestamp: Date; // When the engagement occurred
  comment_id?: number; // ID if the engagement was a comment
  newStats: { // Overall bill stats *after* this engagement
    totalViews: number;
    totalComments: number;
    totalShares: number;
    engagement_score: number; // Assuming numeric representation here
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
  async handleBillStatusChange(change: BillStatusChange): Promise<void> { const logContext = { component: 'BillStatusMonitorService', bill_id: change.bill_id, oldStatus: change.oldStatus, newStatus: change.newStatus  };
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
      webSocketService.broadcastBillUpdate(change.bill_id, { type: 'status_change',
        data: {
          bill_id: change.bill_id,
          billTitle: bills.title, // Include title for UI updates
          oldStatus: change.oldStatus,
          newStatus: change.newStatus,
          timestamp: change.timestamp,
          metadata: change.metadata // Pass along any extra context
         },
        timestamp: change.timestamp
      });

      // 4. Find Users Tracking This Event Type
      // Query the new preference table for users tracking 'status_changes' for this specific bill
      const usersToNotify = await this.getActiveTrackersForEvent(change.bill_id, 'status_changes');

      if (usersToNotify.length > 0) {
        logger.info(`📢 Triggering Notification Orchestrator for ${usersToNotify.length} users`, logContext);

        // 5. Prepare Notification Template for the Orchestrator
        const notificationTemplate: Omit<NotificationRequest, 'user_id'> = {
          notificationType: 'bill_update',
          subType: 'status_change',
          priority: this.determinePriorityForStatus(change.newStatus), // Assign priority based on significance
          relatedBillId: change.bill_id,
          category: bills.category || undefined, // Include category for potential filtering
          content: {
            title: `Bill Status Update: ${bills.title}`,
            message: `Status changed from "${change.oldStatus}" to "${change.newStatus}".`,
            // htmlMessage: `Status changed from <strong>${change.oldStatus}</strong> to <strong>${change.newStatus}</strong>.` // Optional richer format
          },
          metadata: { // Include relevant details for the notification content/action
            oldStatus: change.oldStatus,
            newStatus: change.newStatus,
            triggeredBy: change.triggeredBy,
            reason: change.metadata?.reason,
            actionUrl: `/bills/${change.bill_id}` // Deep link to the bill page
          },
          config: {
            // No specific config needed here; orchestrator handles batching/timing based on user prefs
          }
        };

        // 6. Trigger Orchestrator for Each User (non-blocking)
        // The orchestrator will handle individual preferences, batching, etc.
        usersToNotify.forEach(user_id => { this.triggerNotification(user_id, notificationTemplate);
         });

      } else {
        logger.info(`📢 No users actively tracking status changes for this bills.`, logContext);
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
  async handleBillEngagementUpdate(update: BillEngagementUpdate): Promise<void> { const logContext = { component: 'BillStatusMonitorService', bill_id: update.bill_id, type: update.type, user_id: update.user_id   };
    logger.info(`📈 Processing engagement update`, logContext);

    try {
      // 1. Fetch Bill Details
      const bill = await this.getBillDetails(update.bill_id);
      if (!bill) {
        logger.error(`Bill ${update.bill_id} not found during engagement update processing.`, logContext);
        return;
      }

      // 2. Broadcast WebSocket Update (primarily for comments)
      if (update.type === 'comment') { webSocketService.broadcastBillUpdate(update.bill_id, {
          type: 'new_comment',
          data: {
            bill_id: update.bill_id,
            billTitle: bills.title,
            user_id: update.user_id, // User who commented
            comment_id: update.comment_id,
            newStats: update.newStats, // Pass updated engagement counts
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
        const filteredUsers = usersToNotify.filter(id => id !== update.user_id); // Exclude self-notification

        if (filteredUsers.length > 0) {
          logger.info(`📢 Triggering Notification Orchestrator for ${filteredUsers.length} users (new comment)`, logContext);

          // Prepare Notification Template
          // TODO: Enhance message by fetching commenter's name/role if desired
          // Try to fetch commenter details to make notifications more informative
          let commenterName = 'A user';
          try {
            const userRes = await this.db.select({ id: schema.users.id, name: schema.users.name })
              .from(schema.users)
              .where(eq(schema.users.id, update.user_id))
              .limit(1);
            if (userRes && userRes[0] && userRes[0].name) commenterName = userRes[0].name;
          } catch (uErr) {
            logger.debug(`Failed to fetch commenter name for user ${update.user_id}: ${String(uErr)}`);
          }

          const notificationTemplate: Omit<NotificationRequest, 'user_id'> = {
            notificationType: 'bill_update', // Or 'comment_notification' if more specific type exists
            subType: 'new_comment',
            priority: 'medium', // Comments are generally medium priority
            relatedBillId: update.bill_id,
            category: bills.category || undefined,
            content: {
              title: `New Comment on: ${bills.title}`,
              message: `${commenterName} posted a new comment on this bills.`,
            },
            metadata: {
              comment_id: update.comment_id,
              commenterUserId: update.user_id,
              actionUrl: `/bills/${update.bill_id}#comment-${update.comment_id || ''}` // Link to comment anchor
            },
          };

          // Trigger Orchestrator (non-blocking)
          filteredUsers.forEach(user_id => { this.triggerNotification(user_id, notificationTemplate);
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
  private triggerNotification(user_id: string, template: Omit<NotificationRequest, 'user_id'>): void { notificationOrchestratorService.sendNotification({ ...template, user_id  })
      .then(result => { // Log outcome for observability
        if (!result.success) {
          logger.warn(`Notification Orchestrator failed`, { component: 'BillStatusMonitorService', user_id, type: template.notificationType, error: result.error  });
        } else if (result.filtered) { logger.debug(`Notification filtered by orchestrator`, { component: 'BillStatusMonitorService', user_id, type: template.notificationType, reason: result.filterReason  });
        } else if (result.batched) { logger.debug(`Notification batched by orchestrator`, { component: 'BillStatusMonitorService', user_id, type: template.notificationType, batchId: result.batchId  });
        } else { logger.debug(`Notification sent immediately by orchestrator`, { component: 'BillStatusMonitorService', user_id, type: template.notificationType  });
        }
      })
      .catch(err => { // Catch unexpected errors from the orchestrator promise itself
        logger.error(`Unhandled error triggering Notification Orchestrator`, { component: 'BillStatusMonitorService', user_id  }, err);
      });
  }

  /**
   * Determines a notification priority based on the significance of the new status.
   */
  private determinePriorityForStatus(newStatus: string): NotificationRequest['priority'] {
    switch (newStatus) {
      case schema.billStatusEnum.enumValues.SIGNED: // Use enum value
      case schema.billStatusEnum.enumValues.FAILED:
        return 'high'; // Final, significant outcomes
      case schema.billStatusEnum.enumValues.PASSED:
        return 'high'; // Major milestone
      case schema.billStatusEnum.enumValues.COMMITTEE: // Use enum value
        return 'medium'; // Standard progress
      case schema.billStatusEnum.enumValues.INTRODUCED: // Use enum value
        return 'low'; // Initial state
      default:
        return 'medium'; // Default for unknown statuses
    }
  }

  /**
   * Queries the database to find user IDs actively tracking a specific event type for a given bills.
   * Uses the `userBillTrackingPreference` table.
   */
  private async getActiveTrackersForEvent(bill_id: number, event_type: schema.UserBillTrackingPreference['tracking_types'][number]): Promise<string[]> { try {
      const results = await this.db
        .select({ user_id: schema.userBillTrackingPreference.user_id  })
        .from(schema.userBillTrackingPreference)
        .where(and(
          eq(schema.userBillTrackingPreference.bill_id, bill_id),
          eq(schema.userBillTrackingPreference.is_active, true), // Only users with active preference for this bill
          // Check if the specific event_type exists within the user's tracking_types array for this bill
          sql`${event_type} = ANY(${schema.userBillTrackingPreference.tracking_types})`
        ));
      return results.map(r => r.user_id);
    } catch (error) {
      logger.error(`Error fetching active trackers for event '${event_type}', bill ${ bill_id }:`, { component: 'BillStatusMonitorService' }, error);
      return []; // Return empty array on error
    }
  }

  /** Fetches minimal required bill details (ID, Title, Category) using caching. */
  private async getBillDetails(bill_id: number): Promise<Pick<Bill, 'id' | 'title' | 'category'> | null> { const cacheKey = CACHE_KEYS.BILL_MINIMAL_DETAILS(bill_id); // Use a specific key for minimal data
    try {
      const cachedBill = await cacheService.get(cacheKey);
      if (cachedBill) return cachedBill;

      const [bill] = await this.db
        .select({ id: schema.bills.id, title: schema.bills.title, category: schema.bills.category  })
        .from(schema.bills)
        .where(eq(schema.bills.id, bill_id))
        .limit(1);

      if (bill) {
        await cacheService.set(cacheKey, bill, CACHE_TTL.BILL_DATA_SHORT); // Cache minimal data for short duration
      }
      return bill || null;
    } catch (error) { logger.error(`Failed to get bill details for bill ${bill_id }:`, { component: 'BillStatusMonitorService' }, error);
      return null;
    }
  }

  /** Caches the latest status change events for a bills. */
  private async cacheStatusChange(change: BillStatusChange): Promise<void> {
    const cacheKey = CACHE_KEYS.BILL_STATUS_HISTORY(change.bill_id);
    try {
      const existingChanges: BillStatusChange[] = await cacheService.get(cacheKey) || [];
      // Add the new change, keep only the last N (e.g., 10), and ensure chronological order
      const updatedChanges = [
          ...existingChanges.filter(c => c.timestamp.getTime() !== change.timestamp.getTime()), // Avoid duplicates if re-processing
          change
      ]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) // Sort by time ascending
      .slice(-10); // Keep last 10

      await cacheService.set(cacheKey, updatedChanges, CACHE_TTL.BILL_DATA_LONG); // Cache history for longer
    } catch (error) { logger.error('Error caching status change:', { component: 'BillStatusMonitorService', bill_id: change.bill_id  }, error);
    }
  }

  /** Retrieves the cached status change history for a bills. */
  async getBillStatusHistory(bill_id: number): Promise<BillStatusChange[]> { const cacheKey = CACHE_KEYS.BILL_STATUS_HISTORY(bill_id);
    try {
      const changes = await cacheService.get(cacheKey);
      // Ensure returned value is always an array
      return Array.isArray(changes) ? changes.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()) : []; // Return sorted descending
     } catch (error) { logger.error(`Error getting status history for bill ${bill_id }:`, { component: 'BillStatusMonitorService' }, error);
      return [];
    }
  }

  /** Gracefully shuts down the service (if needed). */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Bill Status Monitor Service...', { component: 'BillStatusMonitorService' });
    // Add cleanup logic here if the service uses intervals, timers, or persistent connections
    logger.info('Bill Status Monitor Service shutdown complete.', { component: 'BillStatusMonitorService' });
  }
}

// Export singleton instance
export const billStatusMonitorService = new BillStatusMonitorService();
