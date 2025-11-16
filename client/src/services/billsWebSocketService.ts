/**
 * Bills WebSocket Service - DEPRECATED
 *
 * @deprecated This service has been consolidated into the UnifiedWebSocketManager
 * in core/api/websocket.ts. Use the useWebSocket hook from hooks/use-websocket.ts
 * instead for all WebSocket functionality including bill updates.
 *
 * Migration guide:
 * - Replace billsWebSocketService.subscribeToBill() with useWebSocket().subscribe()
 * - Replace billsWebSocketService.unsubscribeFromBill() with useWebSocket().unsubscribe()
 * - Redux integration is now handled in the hook layer
 * - Batch processing is now handled in the core WebSocket manager
 *
 * This file will be removed in a future version.
 */

import { globalWebSocketPool } from '../core/api/websocket';
import { getStore } from '../store';
import { subscribe, unsubscribe } from '../store/slices/realTimeSlice';
import { updateBill } from '../store/slices/billsSlice';
import { logger } from '../utils/logger';

// ============================================================================
// Type Definitions
// ============================================================================

export interface BillsWebSocketConfig {
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  batchUpdateInterval: number;
  maxBatchSize: number;
}

export interface BillStatusUpdate {
  bill_id: number;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface BillEngagementUpdate {
  bill_id: number;
  viewCount?: number;
  saveCount?: number;
  commentCount?: number;
  shareCount?: number;
  timestamp: string;
}

export interface BillAmendmentUpdate {
  bill_id: number;
  amendment_id: string;
  type: 'added' | 'modified' | 'removed';
  title: string;
  summary: string;
  timestamp: string;
}

export interface BillVotingUpdate {
  bill_id: number;
  voting_date: string;
  voting_type: 'committee' | 'floor' | 'final';
  chamber: 'house' | 'senate' | 'both';
  timestamp: string;
}

export type BillRealTimeUpdate = 
  | BillStatusUpdate
  | BillEngagementUpdate
  | BillAmendmentUpdate
  | BillVotingUpdate;

// ============================================================================
// Bills WebSocket Service Class
// ============================================================================

class BillsWebSocketService {
  private config: BillsWebSocketConfig;
  private isInitialized = false;
  private subscribedBills = new Set<number>();
  private updateQueue: BillRealTimeUpdate[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private connectionRetryCount = 0;

  constructor(config: Partial<BillsWebSocketConfig> = {}) {
    this.config = {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      heartbeatInterval: 30000,
      batchUpdateInterval: 1000, // Process batched updates every second
      maxBatchSize: 50,
      ...config
    };
  }

  /**
   * Initialize the bills WebSocket service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Bills WebSocket Service already initialized', {
        component: 'BillsWebSocketService'
      });
      return;
    }

    try {
      // Set up event listeners for WebSocket events
      this.setupEventListeners();

      // Start batch processing timer
      this.startBatchProcessing();

      this.isInitialized = true;

      logger.info('Bills WebSocket Service initialized', {
        component: 'BillsWebSocketService',
        config: this.config
      });
    } catch (error) {
      logger.error('Failed to initialize Bills WebSocket Service', {
        component: 'BillsWebSocketService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupEventListeners(): void {
    const wsManager = globalWebSocketPool.getConnection('ws://localhost:8080');

    // Listen for bill updates
    wsManager.on('billUpdate', this.handleBillUpdate.bind(this));

    // Listen for batched updates
    wsManager.on('batchedUpdates', this.handleBatchedUpdates.bind(this));

    // Listen for connection events
    wsManager.on('connected', this.handleConnectionEstablished.bind(this));
    wsManager.on('disconnected', this.handleConnectionLost.bind(this));
    wsManager.on('error', this.handleConnectionError.bind(this));

    logger.debug('WebSocket event listeners set up', {
      component: 'BillsWebSocketService'
    });
  }

  /**
   * Subscribe to real-time updates for a specific bill
   */
  async subscribeToBill(billId: number, updateTypes?: string[]): Promise<void> {
    if (this.subscribedBills.has(billId)) {
      logger.debug('Already subscribed to bill updates', {
        component: 'BillsWebSocketService',
        billId
      });
      return;
    }

    try {
      const wsManager = globalWebSocketPool.getConnection('ws://localhost:8080');

      // Check if WebSocket is connected
      const connectionStatus = wsManager.getConnectionStatus();
      if (!connectionStatus.connected) {
        logger.warn('WebSocket not connected, queueing subscription', {
          component: 'BillsWebSocketService',
          billId
        });
        // The WebSocket client will handle queuing
      }

      // Subscribe via WebSocket client
      wsManager.subscribeToBill(billId, updateTypes as any);
      
      // Track subscription locally
      this.subscribedBills.add(billId);

      // Update real-time store
      getStore().dispatch(subscribe({
        type: 'bill',
        id: billId.toString()
      }));

      logger.info('Subscribed to bill updates', {
        component: 'BillsWebSocketService',
        billId,
        updateTypes,
        totalSubscriptions: this.subscribedBills.size
      });
    } catch (error) {
      logger.error('Failed to subscribe to bill updates', {
        component: 'BillsWebSocketService',
        billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from real-time updates for a specific bill
   */
  async unsubscribeFromBill(billId: number): Promise<void> {
    if (!this.subscribedBills.has(billId)) {
      logger.debug('Not subscribed to bill updates', {
        component: 'BillsWebSocketService',
        billId
      });
      return;
    }

    try {
      // Unsubscribe via WebSocket client
      const wsManager = globalWebSocketPool.getConnection('ws://localhost:8080');
      wsManager.unsubscribeFromBill(billId);
      
      // Remove from local tracking
      this.subscribedBills.delete(billId);

      // Update real-time store
      getStore().dispatch(unsubscribe({
        type: 'bill',
        id: billId.toString()
      }));

      logger.info('Unsubscribed from bill updates', {
        component: 'BillsWebSocketService',
        billId,
        remainingSubscriptions: this.subscribedBills.size
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from bill updates', {
        component: 'BillsWebSocketService',
        billId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Subscribe to multiple bills at once
   */
  async subscribeToMultipleBills(billIds: number[], updateTypes?: string[]): Promise<void> {
    const subscriptionPromises = billIds.map(billId => 
      this.subscribeToBill(billId, updateTypes)
    );

    try {
      await Promise.allSettled(subscriptionPromises);
      
      logger.info('Bulk subscription completed', {
        component: 'BillsWebSocketService',
        billCount: billIds.length,
        totalSubscriptions: this.subscribedBills.size
      });
    } catch (error) {
      logger.error('Bulk subscription failed', {
        component: 'BillsWebSocketService',
        billIds,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Handle individual bill updates
   */
  private handleBillUpdate(data: any): void {
    try {
      const { bill_id, update, timestamp } = data;
      
      // Add to update queue for batch processing
      this.queueUpdate({
        ...update.data,
        bill_id,
        timestamp: timestamp || new Date().toISOString()
      } as BillRealTimeUpdate);

      logger.debug('Bill update queued for processing', {
        component: 'BillsWebSocketService',
        billId: bill_id,
        updateType: update.type,
        queueSize: this.updateQueue.length
      });
    } catch (error) {
      logger.error('Failed to handle bill update', {
        component: 'BillsWebSocketService',
        error: error instanceof Error ? error.message : 'Unknown error',
        data
      });
    }
  }

  /**
   * Handle batched updates from server
   */
  private handleBatchedUpdates(data: any): void {
    try {
      const updates = Array.isArray(data.updates) ? data.updates : [data];
      
      updates.forEach((update: any) => {
        this.queueUpdate({
          ...update,
          timestamp: update.timestamp || new Date().toISOString()
        } as BillRealTimeUpdate);
      });

      logger.debug('Batched updates queued for processing', {
        component: 'BillsWebSocketService',
        updateCount: updates.length,
        queueSize: this.updateQueue.length
      });

      // Process immediately if queue is getting large
      if (this.updateQueue.length >= this.config.maxBatchSize) {
        this.processBatchedUpdates();
      }
    } catch (error) {
      logger.error('Failed to handle batched updates', {
        component: 'BillsWebSocketService',
        error: error instanceof Error ? error.message : 'Unknown error',
        data
      });
    }
  }

  /**
   * Queue an update for batch processing
   */
  private queueUpdate(update: BillRealTimeUpdate): void {
    this.updateQueue.push(update);

    // Prevent queue from growing too large
    if (this.updateQueue.length > this.config.maxBatchSize * 2) {
      // Remove oldest updates
      this.updateQueue = this.updateQueue.slice(-this.config.maxBatchSize);
      
      logger.warn('Update queue overflow, removed oldest updates', {
        component: 'BillsWebSocketService',
        queueSize: this.updateQueue.length
      });
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.updateQueue.length > 0) {
        this.processBatchedUpdates();
      }
    }, this.config.batchUpdateInterval);

    logger.debug('Batch processing timer started', {
      component: 'BillsWebSocketService',
      interval: this.config.batchUpdateInterval
    });
  }

  /**
   * Process queued updates in batches
   */
  private processBatchedUpdates(): void {
    if (this.updateQueue.length === 0) return;

    const updates = this.updateQueue.splice(0, this.config.maxBatchSize);

    // Group updates by bill ID for efficient processing
    const updatesByBill = new Map<number, BillRealTimeUpdate[]>();
    
    updates.forEach(update => {
      const billId = update.bill_id;
      if (!updatesByBill.has(billId)) {
        updatesByBill.set(billId, []);
      }
      updatesByBill.get(billId)!.push(update);
    });

    // Process updates for each bill
    updatesByBill.forEach((billUpdates, billId) => {
      try {
        this.processBillUpdates(billId, billUpdates);
      } catch (error) {
        logger.error('Failed to process updates for bill', {
          component: 'BillsWebSocketService',
          billId,
          updateCount: billUpdates.length,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    logger.debug('Processed batched updates', {
      component: 'BillsWebSocketService',
      processedCount: updates.length,
      billsAffected: updatesByBill.size,
      remainingInQueue: this.updateQueue.length
    });
  }

  /**
   * Process updates for a specific bill
   */
  private processBillUpdates(
    billId: number,
    updates: BillRealTimeUpdate[]
  ): void {
    const billUpdates: Partial<any> = {};
    let hasStatusChange = false;
    let hasEngagementUpdate = false;

    updates.forEach(update => {
      switch (this.getUpdateType(update)) {
        case 'status':
          const statusUpdate = update as BillStatusUpdate;
          billUpdates.status = statusUpdate.newStatus;
          billUpdates.lastUpdated = statusUpdate.timestamp;
          hasStatusChange = true;
          break;

        case 'engagement':
          const engagementUpdate = update as BillEngagementUpdate;
          if (engagementUpdate.viewCount !== undefined) {
            billUpdates.viewCount = engagementUpdate.viewCount;
          }
          if (engagementUpdate.saveCount !== undefined) {
            billUpdates.saveCount = engagementUpdate.saveCount;
          }
          if (engagementUpdate.commentCount !== undefined) {
            billUpdates.commentCount = engagementUpdate.commentCount;
          }
          if (engagementUpdate.shareCount !== undefined) {
            billUpdates.shareCount = engagementUpdate.shareCount;
          }
          hasEngagementUpdate = true;
          break;

        case 'amendment':
          // Amendment updates don't directly modify bill data
          // but we track them for notifications
          break;

        case 'voting':
          // Voting updates might affect status or add metadata
          billUpdates.lastUpdated = update.timestamp;
          break;
      }

      // Add to real-time store for UI notifications
      // TODO: Fix the type mismatch between local and imported BillRealTimeUpdate types
      // store.dispatch(addBillUpdate(update));
    });

    // Update bills store if there are changes
    if (Object.keys(billUpdates).length > 0) {
      getStore().dispatch(updateBill({ id: billId, updates: billUpdates }));

      logger.debug('Bill updated in store', {
        component: 'BillsWebSocketService',
        billId,
        updates: Object.keys(billUpdates),
        hasStatusChange,
        hasEngagementUpdate
      });
    }
  }

  /**
   * Determine update type from update object
   */
  private getUpdateType(update: BillRealTimeUpdate): string {
    if ('oldStatus' in update && 'newStatus' in update) return 'status';
    if ('viewCount' in update || 'saveCount' in update || 'commentCount' in update || 'shareCount' in update) return 'engagement';
    if ('amendment_id' in update) return 'amendment';
    if ('voting_date' in update) return 'voting';
    return 'unknown';
  }

  /**
   * Get update priority for UI notifications
   */
  private getUpdatePriority(update: BillRealTimeUpdate): 'high' | 'medium' | 'low' {
    const updateType = this.getUpdateType(update);
    
    switch (updateType) {
      case 'status':
      case 'voting':
        return 'high';
      case 'amendment':
        return 'medium';
      case 'engagement':
      default:
        return 'low';
    }
  }

  /**
   * Handle WebSocket connection established
   */
  private handleConnectionEstablished(): void {
    this.connectionRetryCount = 0;
    
    logger.info('WebSocket connection established, re-subscribing to bills', {
      component: 'BillsWebSocketService',
      subscriptionCount: this.subscribedBills.size
    });

    // Re-subscribe to all previously subscribed bills
    const wsManager = globalWebSocketPool.getConnection('ws://localhost:8080');
    this.subscribedBills.forEach(billId => {
      wsManager.subscribeToBill(billId, [
        'status_change',
        'new_comment',
        'amendment',
        'voting_scheduled'
      ]);
    });
  }

  /**
   * Handle WebSocket connection lost
   */
  private handleConnectionLost(data: any): void {
    logger.warn('WebSocket connection lost', {
      component: 'BillsWebSocketService',
      code: data.code,
      reason: data.reason,
      subscriptionCount: this.subscribedBills.size
    });

    // Auto-reconnect logic is handled by the base WebSocket client
    // We just need to track retry attempts
    if (this.config.autoReconnect && this.connectionRetryCount < this.config.maxReconnectAttempts) {
      this.connectionRetryCount++;
    }
  }

  /**
   * Handle WebSocket connection errors
   */
  private handleConnectionError(error: any): void {
    logger.error('WebSocket connection error', {
      component: 'BillsWebSocketService',
      error: error.message || 'Unknown error',
      retryCount: this.connectionRetryCount
    });
  }

  /**
   * Get current subscription status
   */
  getSubscriptionStatus(): {
    subscribedBills: number[];
    subscriptionCount: number;
    queueSize: number;
    isConnected: boolean;
    connectionRetryCount: number;
  } {
    return {
      subscribedBills: Array.from(this.subscribedBills),
      subscriptionCount: this.subscribedBills.size,
      queueSize: this.updateQueue.length,
      isConnected: globalWebSocketPool.getConnection('ws://localhost:8080').getConnectionStatus().connected,
      connectionRetryCount: this.connectionRetryCount
    };
  }

  /**
   * Clear all subscriptions
   */
  clearAllSubscriptions(): void {
    const billIds = Array.from(this.subscribedBills);
    
    billIds.forEach(billId => {
      this.unsubscribeFromBill(billId);
    });

    logger.info('All bill subscriptions cleared', {
      component: 'BillsWebSocketService',
      clearedCount: billIds.length
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Stop batch processing
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Process any remaining updates
    if (this.updateQueue.length > 0) {
      this.processBatchedUpdates();
    }

    // Clear all subscriptions
    this.clearAllSubscriptions();

    // Clear update queue
    this.updateQueue = [];

    this.isInitialized = false;

    logger.info('Bills WebSocket Service cleaned up', {
      component: 'BillsWebSocketService'
    });
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const billsWebSocketService = new BillsWebSocketService();
