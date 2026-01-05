/**
 * Bill Tracking Service - Bills Feature
 *
 * Migrated from client/src/services/billTrackingService.ts
 * Business logic service for handling bill tracking operations,
 * real-time updates, and user preferences.
 */

import { Bill } from '../../../../shared/schema/foundation';

import type { BillUpdate, BillTrackingPreferences, EngagementMetrics } from '@/core/api/types';
import { logger } from '@client/utils/logger';

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
    trackedBills: [],
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

      logger.info('Bill update processed (React Query will handle cache invalidation)', {
        component: 'BillTrackingService',
        billId,
        type: update.type,
        processedUpdates: Object.keys(processedUpdates)
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

    switch (update.type) {
      case 'status_change':
        if (data.oldStatus && data.newStatus) {
          updates.status = data.newStatus as 'drafted' | 'introduced' | 'first_reading' | 'second_reading' | 'committee_stage' | 'report_stage' | 'third_reading' | 'presidential_assent' | 'act_of_parliament' | 'withdrawn' | 'lapsed';
        }
        break;

      case 'new_comment':
        if (data.commentCount !== undefined) {
          updates.comment_count = data.commentCount;
        }
        break;

      case 'amendment':
        // Amendment updates don't directly modify bill data
        break;

      case 'voting_scheduled':
        // Voting updates might affect urgency
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
        return true;
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
   * Gets tracking statistics
   */
  getTrackingStats(): {
    trackedBills: number;
    totalUpdates: number;
    preferences: BillTrackingPreferences;
  } {
    logger.warn('getTrackingStats is deprecated - use React Query hooks for tracking data', {
      component: 'BillTrackingService'
    });

    return {
      trackedBills: 0,
      totalUpdates: 0,
      preferences: this.preferences
    };
  }
}

// Export singleton instance
export const billTrackingService = new BillTrackingService();

export default billTrackingService;
