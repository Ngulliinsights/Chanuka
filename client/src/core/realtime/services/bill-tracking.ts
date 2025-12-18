/**
 * Bill Tracking Service - Core Real-time Module
 * 
 * Consolidated bill tracking service that handles real-time bill updates,
 * subscriptions, and engagement metrics through WebSocket connections.
 */

import { UnifiedWebSocketManager } from '../websocket/manager';
import { 
  BillUpdate, 
  BillRealTimeUpdate, 
  BillEngagementUpdate,
  WebSocketMessage 
} from '../types';
import { logger } from '@client/utils/logger';

export class BillTrackingService {
  private wsManager: UnifiedWebSocketManager;
  private subscribedBills = new Set<number>();
  private billUpdates = new Map<number, BillUpdate[]>();
  private engagementMetrics = new Map<number, BillEngagementUpdate>();
  private updateQueue: BillRealTimeUpdate[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private maxBatchSize = 50;
  private batchInterval = 1000; // 1 second
  private isInitialized = false;

  constructor(wsManager: UnifiedWebSocketManager) {
    this.wsManager = wsManager;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up WebSocket event handlers
      this.setupEventHandlers();

      // Start batch processing
      this.startBatchProcessing();

      this.isInitialized = true;

      logger.info('BillTrackingService initialized', {
        component: 'BillTrackingService'
      });
    } catch (error) {
      logger.error('Failed to initialize BillTrackingService', {
        component: 'BillTrackingService'
      }, error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Unsubscribe from all bills
      for (const billId of this.subscribedBills) {
        this.unsubscribeFromBill(billId);
      }

      // Stop batch processing
      this.stopBatchProcessing();

      // Clear data
      this.subscribedBills.clear();
      this.billUpdates.clear();
      this.engagementMetrics.clear();
      this.updateQueue = [];

      this.isInitialized = false;

      logger.info('BillTrackingService shut down', {
        component: 'BillTrackingService'
      });
    } catch (error) {
      logger.error('Error during BillTrackingService shutdown', {
        component: 'BillTrackingService'
      }, error);
    }
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  subscribeToBill(billId: number): string {
    if (this.subscribedBills.has(billId)) {
      logger.debug('Already subscribed to bill', {
        component: 'BillTrackingService',
        billId
      });
      return `bill_${billId}`;
    }

    const subscriptionId = this.wsManager.subscribe(
      `bill:${billId}`,
      (message) => this.handleBillMessage(billId, message)
    );

    this.subscribedBills.add(billId);

    logger.info('Subscribed to bill updates', {
      component: 'BillTrackingService',
      billId,
      subscriptionId
    });

    return subscriptionId;
  }

  unsubscribeFromBill(billId: number): void {
    if (!this.subscribedBills.has(billId)) {
      return;
    }

    // Find and remove subscription
    // Note: In a real implementation, you'd need to track subscription IDs
    this.subscribedBills.delete(billId);

    // Clear cached data for this bill
    this.billUpdates.delete(billId);
    this.engagementMetrics.delete(billId);

    logger.info('Unsubscribed from bill updates', {
      component: 'BillTrackingService',
      billId
    });
  }

  getSubscriptionCount(): number {
    return this.subscribedBills.size;
  }

  getSubscribedBills(): number[] {
    return Array.from(this.subscribedBills);
  }

  // ============================================================================
  // Data Access
  // ============================================================================

  getBillUpdates(billId: number): BillUpdate[] {
    return this.billUpdates.get(billId) || [];
  }

  getEngagementMetrics(billId: number): BillEngagementUpdate | null {
    return this.engagementMetrics.get(billId) || null;
  }

  getAllEngagementMetrics(): Map<number, BillEngagementUpdate> {
    return new Map(this.engagementMetrics);
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  handleMessage(message: WebSocketMessage): void {
    try {
      if (message.type === 'bill_update' || message.type === 'billUpdate') {
        this.handleBillUpdateMessage(message);
      } else if (message.type === 'engagement_metrics' || message.type === 'engagementMetrics') {
        this.handleEngagementMetricsMessage(message);
      } else if (message.type === 'batched_updates' || message.type === 'batchedUpdates') {
        this.handleBatchedUpdatesMessage(message);
      }
    } catch (error) {
      logger.error('Error handling bill tracking message', {
        component: 'BillTrackingService',
        messageType: message.type
      }, error);
    }
  }

  private handleBillMessage(billId: number, message: WebSocketMessage): void {
    try {
      // Process bill-specific messages
      if (message.type === 'bill_update') {
        const update: BillUpdate = {
          type: (message as any).update?.type || 'update',
          data: {
            billId,
            ...(message as any).update?.data
          },
          timestamp: (message as any).timestamp || new Date().toISOString()
        };

        this.addBillUpdate(billId, update);
      }
    } catch (error) {
      logger.error('Error handling bill-specific message', {
        component: 'BillTrackingService',
        billId,
        messageType: message.type
      }, error);
    }
  }

  private handleBillUpdateMessage(message: WebSocketMessage): void {
    try {
      const data = message as any;
      const billId = data.bill_id || data.billId;
      
      if (!billId) {
        logger.warn('Bill update message missing bill ID', {
          component: 'BillTrackingService',
          message
        });
        return;
      }

      const update: BillUpdate = {
        type: data.update?.type || data.type || 'update',
        data: {
          billId,
          ...data.update?.data || data.data
        },
        timestamp: data.timestamp || new Date().toISOString()
      };

      this.addBillUpdate(billId, update);
    } catch (error) {
      logger.error('Error handling bill update message', {
        component: 'BillTrackingService'
      }, error);
    }
  }

  private handleEngagementMetricsMessage(message: WebSocketMessage): void {
    try {
      const data = message as any;
      const billId = data.bill_id || data.billId;
      
      if (!billId) {
        logger.warn('Engagement metrics message missing bill ID', {
          component: 'BillTrackingService',
          message
        });
        return;
      }

      const metrics: BillEngagementUpdate = {
        bill_id: billId,
        viewCount: data.metrics?.view_count || data.viewCount,
        saveCount: data.metrics?.save_count || data.saveCount,
        commentCount: data.metrics?.comment_count || data.commentCount,
        shareCount: data.metrics?.share_count || data.shareCount,
        timestamp: data.timestamp || new Date().toISOString()
      };

      this.engagementMetrics.set(billId, metrics);

      logger.debug('Updated engagement metrics', {
        component: 'BillTrackingService',
        billId,
        metrics
      });
    } catch (error) {
      logger.error('Error handling engagement metrics message', {
        component: 'BillTrackingService'
      }, error);
    }
  }

  private handleBatchedUpdatesMessage(message: WebSocketMessage): void {
    try {
      const data = message as any;
      const updates = data.updates || [];

      updates.forEach((update: any) => {
        const billId = update.bill_id || update.billId;
        if (billId) {
          const billUpdate: BillUpdate = {
            type: update.type || 'update',
            data: {
              billId,
              ...update.data
            },
            timestamp: update.timestamp || new Date().toISOString()
          };

          this.addBillUpdate(billId, billUpdate);
        }
      });

      logger.debug('Processed batched updates', {
        component: 'BillTrackingService',
        updateCount: updates.length
      });
    } catch (error) {
      logger.error('Error handling batched updates message', {
        component: 'BillTrackingService'
      }, error);
    }
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  private addBillUpdate(billId: number, update: BillUpdate): void {
    const existing = this.billUpdates.get(billId) || [];
    const updates = [...existing, update].slice(-50); // Keep last 50 updates
    this.billUpdates.set(billId, updates);

    logger.debug('Added bill update', {
      component: 'BillTrackingService',
      billId,
      updateType: update.type,
      totalUpdates: updates.length
    });
  }

  // ============================================================================
  // Batch Processing
  // ============================================================================

  private startBatchProcessing(): void {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => {
      if (this.updateQueue.length > 0) {
        this.processBatchedUpdates();
      }
    }, this.batchInterval);

    logger.debug('Started batch processing', {
      component: 'BillTrackingService',
      interval: this.batchInterval
    });
  }

  private stopBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private processBatchedUpdates(): void {
    if (this.updateQueue.length === 0) return;

    const updates = this.updateQueue.splice(0, this.maxBatchSize);
    
    // Group updates by bill ID
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
      billUpdates.forEach(update => {
        const billUpdate: BillUpdate = {
          type: this.getBillUpdateType(update),
          data: {
            billId: update.bill_id,
            ...update
          },
          timestamp: update.timestamp || new Date().toISOString()
        };

        this.addBillUpdate(billId, billUpdate);
      });
    });

    logger.debug('Processed batched updates', {
      component: 'BillTrackingService',
      processedCount: updates.length,
      billsAffected: updatesByBill.size,
      remainingInQueue: this.updateQueue.length
    });
  }

  private getBillUpdateType(update: BillRealTimeUpdate): string {
    if ('oldStatus' in update && 'newStatus' in update) return 'status_change';
    if ('viewCount' in update || 'commentCount' in update) return 'engagement';
    if ('amendment_id' in update) return 'amendment';
    if ('voting_date' in update) return 'voting_scheduled';
    return 'update';
  }

  // ============================================================================
  // Event Handlers Setup
  // ============================================================================

  private setupEventHandlers(): void {
    // Set up WebSocket connection event handlers
    this.wsManager.on('connected', () => {
      // Re-subscribe to all bills on reconnection
      const billIds = Array.from(this.subscribedBills);
      this.subscribedBills.clear();
      
      billIds.forEach(billId => {
        this.subscribeToBill(billId);
      });

      logger.info('Re-subscribed to bills after reconnection', {
        component: 'BillTrackingService',
        billCount: billIds.length
      });
    });

    this.wsManager.on('disconnected', () => {
      logger.warn('WebSocket disconnected, bill tracking paused', {
        component: 'BillTrackingService'
      });
    });
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  getStats(): {
    subscribedBills: number;
    totalUpdates: number;
    queuedUpdates: number;
    engagementMetrics: number;
  } {
    const totalUpdates = Array.from(this.billUpdates.values())
      .reduce((sum, updates) => sum + updates.length, 0);

    return {
      subscribedBills: this.subscribedBills.size,
      totalUpdates,
      queuedUpdates: this.updateQueue.length,
      engagementMetrics: this.engagementMetrics.size
    };
  }
}