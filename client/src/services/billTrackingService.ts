/**
 * Bill Tracking Service
 * 
 * Business logic service for handling bill tracking operations,
 * real-time updates, and user preferences.
 */

import { BillUpdate, BillUpdateData, BillTrackingPreferences, EngagementMetrics } from '../types/api';
import { stateManagementService } from './stateManagementService';
import { logger } from '../utils/logger';
import { Bill } from '../store/slices/billsSlice';

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
      
      // Update the bill in the store
      if (Object.keys(processedUpdates).length > 0) {
        stateManagementService.updateBill(billId, processedUpdates);
      }

      // Add to real-time updates
      stateManagementService.addBillUpdate({
        ...update,
        billId
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

    // Always update the last modified timestamp
    updates.lastUpdated = update.timestamp;

    switch (update.type) {
      case 'status_change':
        if (data.oldStatus && data.newStatus) {
          updates.status = data.newStatus as any;
          
          // Business rule: Reset urgency on certain status changes
          if (data.newStatus === 'passed' || data.newStatus === 'failed') {
            updates.urgencyLevel = 'low' as any;
          }
        }
        break;

      case 'new_comment':
        // Increment comment count if provided, otherwise just update timestamp
        if (data.commentCount !== undefined) {
          updates.commentCount = data.commentCount;
        }
        break;

      case 'amendment':
        // Amendment updates don't directly modify bill data
        // but we track them for notifications
        break;

      case 'voting_scheduled':
        // Voting updates might affect urgency
        updates.urgencyLevel = 'high' as any;
        break;

      case 'sponsor_change':
        // Sponsor changes would need sponsor data to update
        break;
    }

    // Handle engagement metrics
    if (data.viewCount !== undefined) {
      updates.viewCount = data.viewCount;
    }
    if (data.saveCount !== undefined) {
      updates.saveCount = data.saveCount;
    }
    if (data.commentCount !== undefined) {
      updates.commentCount = data.commentCount;
    }
    if (data.shareCount !== undefined) {
      updates.shareCount = data.shareCount;
    }

    return updates;
  }

  /**
   * Processes engagement metrics updates
   */
  async processEngagementUpdate(metrics: EngagementMetrics): Promise<void> {
    try {
      const updates: Partial<Bill> = {
        viewCount: metrics.views,
        commentCount: metrics.comments,
        shareCount: metrics.shares,
        saveCount: metrics.saves,
        lastUpdated: metrics.timestamp
      };

      stateManagementService.updateBill(metrics.billId, updates);

      logger.debug('Engagement metrics updated', {
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
    const state = stateManagementService.getCurrentState();
    const bills = stateManagementService.getBills();
    
    return {
      trackedBills: bills.length,
      totalUpdates: state.realTime?.billUpdates?.length || 0,
      preferences: this.preferences
    };
  }
}

// Export singleton instance
export const billTrackingService = new BillTrackingService();