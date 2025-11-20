/**
 * Bill Tracking Service
 * 
 * Business logic service for handling bill tracking operations,
 * real-time updates, and user preferences.
 */

import { BillUpdate, BillUpdateData, BillTrackingPreferences, EngagementMetrics } from '@client/types/api';
import { billsApiService } from '@client/core/api/bills';
import { logger } from '@client/utils/logger';
import { Bill } from '@shared/schema/foundation';

export class BillTrackingService {
  private preferences: BillTrackingPreferences = {
    statusChanges: true,
    newComments: false,
    votingSchedule: true,
    amendments: true,
    updateFrequency: 'immediate',
    notificationChannels: {
      inApp: true,
      email: false,
      push: false,
    },
  };

  /**
   * Processes a bill update and applies business logic
   */
  async processBillUpdate(update: BillUpdate): Promise<void> {
    try {
      const billId = update.data.billId;
      
      // Validate update data
      if (!billId || !update.type) {
        logger.warn('Invalid bill update received', {
          component: 'BillTrackingService',
          update
        });
        return;
      }

      // Apply business rules based on update type
      const processedUpdates = this.applyBusinessRules(update);

      // Note: Direct state updates are now handled by React Query hooks
      // WebSocket updates will invalidate the cache automatically
      // This service now focuses on business logic processing only

      logger.info('Bill update processed (React Query will handle cache invalidation)', {
        component: 'BillTrackingService',
        billId,
        type: update.type,
        processedUpdates: Object.keys(processedUpdates)
      });

      logger.info('Bill update processed successfully', {
        component: 'BillTrackingService',
        billId,
        type: update.type,
        updatedFields: Object.keys(processedUpdates)
      });
    } catch (error) {
      logger.error('Failed to process bill update', {
        component: 'BillTrackingService',
        update,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Applies business rules to determine what should be updated
   */
  private applyBusinessRules(update: BillUpdate): Partial<Bill> {
    const updates: Partial<Bill> = {};
    const data = update.data;

    // Note: We don't update timestamps directly as they're handled by the database

    switch (update.type) {
      case 'status_change':
        if (data.oldStatus && data.newStatus) {
          updates.status = data.newStatus as any;

          // Business rule: Reset urgency on certain status changes
          // Note: urgencyLevel might not exist in the schema, skipping for now
        }
        break;

      case 'new_comment':
        // Increment comment count if provided, otherwise just update timestamp
        if (data.commentCount !== undefined) {
          updates.comment_count = data.commentCount;
        }
        break;

      case 'amendment':
        // Amendment updates don't directly modify bill data
        // but we track them for notifications
        break;

      case 'voting_scheduled':
        // Voting updates might affect urgency
        // Note: urgencyLevel might not exist in the schema, skipping for now
        break;

      case 'sponsor_change':
        // Sponsor changes would need sponsor data to update
        break;
    }

    // Handle engagement metrics
    if (data.viewCount !== undefined) {
      updates.view_count = data.viewCount;
    }
    if (data.commentCount !== undefined) {
      updates.comment_count = data.commentCount;
    }
    if (data.shareCount !== undefined) {
      updates.share_count = data.shareCount;
    }

    return updates;
  }

  /**
   * Processes engagement metrics updates
   */
  async processEngagementUpdate(metrics: EngagementMetrics): Promise<void> {
    try {
      // Note: Engagement updates are now handled by React Query hooks
      // Direct API calls for engagement tracking happen in the hooks layer
      logger.debug('Engagement metrics processed (React Query handles updates)', {
        component: 'BillTrackingService',
        billId: metrics.billId,
        metrics
      });
    } catch (error) {
      logger.error('Failed to process engagement update', {
        component: 'BillTrackingService',
        metrics,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Updates user preferences for bill tracking
   */
  updatePreferences(newPreferences: Partial<BillTrackingPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...newPreferences
    };

    logger.info('Bill tracking preferences updated', {
      component: 'BillTrackingService',
      preferences: this.preferences
    });
  }

  /**
   * Gets current preferences
   */
  getPreferences(): BillTrackingPreferences {
    return { ...this.preferences };
  }

  /**
   * Determines if a user should be notified based on preferences
   */
  shouldNotify(updateType: string): boolean {
    switch (updateType) {
      case 'status_change':
        return this.preferences.statusChanges;
      case 'new_comment':
        return this.preferences.newComments;
      case 'voting_scheduled':
        return this.preferences.votingSchedule;
      case 'amendment':
        return this.preferences.amendments;
      default:
        return true; // Default to notify for unknown types
    }
  }

  /**
   * Gets notification channels for a user
   */
  getNotificationChannels(): string[] {
    const channels: string[] = [];
    
    if (this.preferences.notificationChannels.inApp) {
      channels.push('in_app');
    }
    if (this.preferences.notificationChannels.email) {
      channels.push('email');
    }
    if (this.preferences.notificationChannels.push) {
      channels.push('push');
    }

    return channels;
  }

  /**
   * Validates bill update data
   */
  private validateBillUpdate(update: BillUpdate): boolean {
    if (!update.data.billId) {
      logger.warn('Bill update missing billId', {
        component: 'BillTrackingService',
        update
      });
      return false;
    }

    if (!update.type) {
      logger.warn('Bill update missing type', {
        component: 'BillTrackingService',
        update
      });
      return false;
    }

    return true;
  }

  /**
   * Gets tracking statistics
   */
  getTrackingStats(): {
    trackedBills: number;
    totalUpdates: number;
    preferences: BillTrackingPreferences;
  } {
    // Note: Tracking stats are now handled by React Query hooks
    // This method returns static preferences data
    logger.warn('getTrackingStats is deprecated - use React Query hooks for tracking data', {
      component: 'BillTrackingService'
    });

    return {
      trackedBills: 0, // No longer tracked in service
      totalUpdates: 0, // No longer tracked in service
      preferences: this.preferences
    };
  }
}

// Export singleton instance
export const billTrackingService = new BillTrackingService();