/**
 * State Management Service
 * 
 * Centralized service for managing application state updates.
 * Provides a clean abstraction over Redux store operations.
 */

import { useQueryClient } from '@tanstack/react-query';
import { Bill } from '@shared/schema/foundation';
import { BillUpdate, WebSocketNotification } from '@client/types/api';
import { logger } from '@client/utils/logger';

// Define BillsStats locally since it's not exported from bills.ts
interface BillsStats {
  totalBills: number;
  urgentCount: number;
  constitutionalFlags: number;
  trendingCount: number;
  lastUpdated: string;
}

export class StateManagementService {
  private queryClient: any = null;

  constructor(queryClient?: any) {
    this.queryClient = queryClient;
  }

  /**
    * Invalidates React Query cache for a bill update
    */
  updateBill(billId: number, updates: Partial<Bill>): void {
    try {
      if (this.queryClient) {
        this.queryClient.invalidateQueries({
          queryKey: ['bills', billId]
        });
      }

      logger.debug('Bill cache invalidated', {
        component: 'StateManagementService',
        billId,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      logger.error('Failed to invalidate bill cache', {
        component: 'StateManagementService',
        billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
    * Invalidates bills queries to trigger refetch
    */
  setBills(bills: Bill[]): void {
    try {
      if (this.queryClient) {
        this.queryClient.invalidateQueries({
          queryKey: ['bills']
        });
      }

      logger.debug('Bills queries invalidated', {
        component: 'StateManagementService',
        count: bills.length
      });
    } catch (error) {
      logger.error('Failed to invalidate bills queries', {
        component: 'StateManagementService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
    * Invalidates bill cache for real-time updates
    */
  addBillUpdate(update: BillUpdate & { billId: number }): void {
    try {
      if (this.queryClient) {
        this.queryClient.invalidateQueries({
          queryKey: ['bills', update.billId]
        });
      }

      logger.debug('Bill cache invalidated for real-time update', {
        component: 'StateManagementService',
        billId: update.billId,
        type: update.type
      });
    } catch (error) {
      logger.error('Failed to invalidate bill cache for update', {
        component: 'StateManagementService',
        billId: update.billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
    * Handles notification (notifications are now managed by React Query hooks)
    */
  addNotification(notification: WebSocketNotification): void {
    try {
      // Notifications are now handled by React Query hooks in components
      // This method is kept for backward compatibility but doesn't dispatch to Redux
      logger.debug('Notification received (handled by React Query)', {
        component: 'StateManagementService',
        notificationId: notification.id,
        type: notification.type
      });
    } catch (error) {
      logger.error('Failed to handle notification', {
        component: 'StateManagementService',
        notificationId: notification.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
    * Gets current state (deprecated - use React Query hooks instead)
    */
  getCurrentState() {
    logger.warn('getCurrentState is deprecated - use React Query hooks instead', {
      component: 'StateManagementService'
    });
    return null;
  }

  /**
    * Gets bills from current state (deprecated - use useBills hook instead)
    */
  getBills(): Bill[] {
    logger.warn('getBills is deprecated - use useBills hook instead', {
      component: 'StateManagementService'
    });
    return [];
  }

  /**
    * Gets a specific bill from current state (deprecated - use useBill hook instead)
    */
  getBill(billId: number): Bill | undefined {
    logger.warn('getBill is deprecated - use useBill hook instead', {
      component: 'StateManagementService',
      billId
    });
    return undefined;
  }

  /**
    * Checks if a bill exists (deprecated - use useBill hook instead)
    */
  hasBill(billId: number): boolean {
    logger.warn('hasBill is deprecated - use useBill hook instead', {
      component: 'StateManagementService',
      billId
    });
    return false;
  }
}

// Export singleton instance
export const stateManagementService = new StateManagementService();
