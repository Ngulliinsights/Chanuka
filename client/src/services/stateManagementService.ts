/**
 * State Management Service
 * 
 * Centralized service for managing application state updates.
 * Provides a clean abstraction over Redux store operations.
 */

import { getStore } from '../store';
import { updateBill, setBills, Bill } from '../store/slices/billsSlice';
import { addBillUpdate, addNotification } from '../store/slices/realTimeSlice';
import { BillUpdate, WebSocketNotification } from '../types/api';
import { logger } from '../utils/logger';

export class StateManagementService {
  /**
   * Gets the store safely with error handling
   */
  private getStoreInstance() {
    try {
      return getStore();
    } catch (error) {
      logger.error('Failed to get store instance', {
        component: 'StateManagementService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Updates a single bill in the store
   */
  updateBill(billId: number, updates: Partial<Bill>): void {
    try {
      this.getStoreInstance().dispatch(updateBill({ id: billId, updates }));
      
      logger.debug('Bill updated in store', {
        component: 'StateManagementService',
        billId,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      logger.error('Failed to update bill in store', {
        component: 'StateManagementService',
        billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Sets multiple bills in the store (replaces existing)
   */
  setBills(bills: Bill[]): void {
    try {
      this.getStoreInstance().dispatch(setBills(bills));
      
      logger.debug('Bills set in store', {
        component: 'StateManagementService',
        count: bills.length
      });
    } catch (error) {
      logger.error('Failed to set bills in store', {
        component: 'StateManagementService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Adds a real-time bill update to the store
   */
  addBillUpdate(update: BillUpdate & { billId: number }): void {
    try {
      this.getStoreInstance().dispatch(addBillUpdate({
        bill_id: update.billId,
        type: update.type,
        data: update.data,
        timestamp: update.timestamp
      }));
      
      logger.debug('Bill update added to real-time store', {
        component: 'StateManagementService',
        billId: update.billId,
        type: update.type
      });
    } catch (error) {
      logger.error('Failed to add bill update to store', {
        component: 'StateManagementService',
        billId: update.billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Adds a notification to the store
   */
  addNotification(notification: WebSocketNotification): void {
    try {
      this.getStoreInstance().dispatch(addNotification({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        created_at: notification.timestamp,
        read: notification.read || false,
        priority: notification.priority || 'normal'
      }));
      
      logger.debug('Notification added to store', {
        component: 'StateManagementService',
        notificationId: notification.id,
        type: notification.type
      });
    } catch (error) {
      logger.error('Failed to add notification to store', {
        component: 'StateManagementService',
        notificationId: notification.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Gets current state from the store
   */
  getCurrentState() {
    return this.getStoreInstance().getState();
  }

  /**
   * Gets bills from current state
   */
  getBills(): Bill[] {
    const state = this.getCurrentState();
    return state.bills?.bills || [];
  }

  /**
   * Gets a specific bill from current state
   */
  getBill(billId: number): Bill | undefined {
    const bills = this.getBills();
    return bills.find(bill => bill.id === billId);
  }

  /**
   * Checks if a bill exists in the store
   */
  hasBill(billId: number): boolean {
    return this.getBill(billId) !== undefined;
  }
}

// Export singleton instance
export const stateManagementService = new StateManagementService();
