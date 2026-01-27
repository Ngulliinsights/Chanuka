/**
 * Bill Tracking Service - Core Real-time Module
 *
 * Consolidated bill tracking service that handles real-time bill updates,
 * subscriptions, and engagement metrics through WebSocket connections.
 */

import { logger } from '@client/lib/utils/logger';

import { UnifiedWebSocketManager } from '../manager';
import { BillUpdate, BillRealTimeUpdate, BillEngagementUpdate, WebSocketMessage } from '../types';

// ============================================================================
// Internal Type Definitions
// ============================================================================

/**
 * Represents the raw bill update message structure from WebSocket
 */
interface BillUpdateMessageData {
  bill_id?: number;
  billId?: number;
  update?: {
    type?: string;
    data?: Record<string, unknown>;
  };
  data?: Record<string, unknown>;
  type?: string;
  timestamp?: string;
}

/**
 * Represents the raw engagement metrics message structure from WebSocket
 */
interface EngagementMetricsMessageData {
  bill_id?: number;
  billId?: number;
  metrics?: {
    view_count?: number;
    save_count?: number;
    comment_count?: number;
    share_count?: number;
  };
  viewCount?: number;
  saveCount?: number;
  commentCount?: number;
  shareCount?: number;
  timestamp?: string;
}

/**
 * Represents a batched update item
 */
interface BatchedUpdateItem {
  bill_id?: number;
  billId?: number;
  type?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Represents the batched updates message structure
 */
interface BatchedUpdatesMessageData {
  updates?: BatchedUpdateItem[];
}

/**
 * Statistics about the service state
 */
interface ServiceStats {
  subscribedBills: number;
  totalUpdates: number;
  queuedUpdates: number;
  engagementMetrics: number;
}

/**
 * Type guard to check if a message is a BillUpdateMessageData
 */
function isBillUpdateMessage(data: unknown): data is BillUpdateMessageData {
  return typeof data === 'object' && data !== null && ('bill_id' in data || 'billId' in data);
}

/**
 * Type guard to check if a message is an EngagementMetricsMessageData
 */
function isEngagementMetricsMessage(data: unknown): data is EngagementMetricsMessageData {
  return typeof data === 'object' && data !== null && ('bill_id' in data || 'billId' in data);
}

/**
 * Type guard to check if a message is a BatchedUpdatesMessageData
 */
function isBatchedUpdatesMessage(data: unknown): data is BatchedUpdatesMessageData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'updates' in data &&
    Array.isArray((data as BatchedUpdatesMessageData).updates)
  );
}

// ============================================================================
// Main Service Class
// ============================================================================

export class BillTrackingService {
  private wsManager: UnifiedWebSocketManager;
  private subscribedBills = new Set<number>();
  private subscriptionIds = new Map<number, string>();
  private billUpdates = new Map<number, BillUpdate[]>();
  private engagementMetrics = new Map<number, BillEngagementUpdate>();
  private updateQueue: BillRealTimeUpdate[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private maxBatchSize = 50;
  private batchInterval = 1000; // 1 second
  private maxUpdatesPerBill = 50; // Maximum updates to keep per bill
  private isInitialized = false;

  constructor(wsManager: UnifiedWebSocketManager) {
    this.wsManager = wsManager;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the bill tracking service
   * Sets up event handlers and starts batch processing
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('BillTrackingService already initialized', {
        component: 'BillTrackingService',
      });
      return;
    }

    try {
      // Set up WebSocket event handlers
      this.setupEventHandlers();

      // Start batch processing
      this.startBatchProcessing();

      this.isInitialized = true;

      logger.info('BillTrackingService initialized', {
        component: 'BillTrackingService',
      });
    } catch (error) {
      logger.error(
        'Failed to initialize BillTrackingService',
        {
          component: 'BillTrackingService',
        },
        error
      );
      throw error;
    }
  }

  /**
   * Gracefully shut down the service
   * Unsubscribes from all bills and cleans up resources
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Unsubscribe from all bills
      for (const billId of this.subscribedBills) {
        this.unsubscribeFromBill(billId);
      }

      // Stop batch processing
      this.stopBatchProcessing();

      // Clear all data structures
      this.subscribedBills.clear();
      this.subscriptionIds.clear();
      this.billUpdates.clear();
      this.engagementMetrics.clear();
      this.updateQueue = [];

      this.isInitialized = false;

      logger.info('BillTrackingService shut down', {
        component: 'BillTrackingService',
      });
    } catch (error) {
      logger.error(
        'Error during BillTrackingService shutdown',
        {
          component: 'BillTrackingService',
        },
        error
      );
    }
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe to real-time updates for a specific bill
   * @param billId - The ID of the bill to track
   * @returns The subscription ID
   */
  subscribeToBill(billId: number): string {
    if (this.subscribedBills.has(billId)) {
      const existingId = this.subscriptionIds.get(billId);
      logger.debug('Already subscribed to bill', {
        component: 'BillTrackingService',
        billId,
        subscriptionId: existingId,
      });
      return existingId || `bill_${billId}`;
    }

    const subscriptionId = this.wsManager.subscribe(`bill:${billId}`, message =>
      this.handleBillMessage(billId, message)
    );

    this.subscribedBills.add(billId);
    this.subscriptionIds.set(billId, subscriptionId);

    logger.info('Subscribed to bill updates', {
      component: 'BillTrackingService',
      billId,
      subscriptionId,
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from a bill's real-time updates
   * @param billId - The ID of the bill to stop tracking
   */
  unsubscribeFromBill(billId: number): void {
    if (!this.subscribedBills.has(billId)) {
      return;
    }

    const subscriptionId = this.subscriptionIds.get(billId);
    if (subscriptionId) {
      this.wsManager.unsubscribe(subscriptionId);
    }

    this.subscribedBills.delete(billId);
    this.subscriptionIds.delete(billId);

    // Clear cached data for this bill
    this.billUpdates.delete(billId);
    this.engagementMetrics.delete(billId);

    logger.info('Unsubscribed from bill updates', {
      component: 'BillTrackingService',
      billId,
    });
  }

  /**
   * Get the number of currently subscribed bills
   */
  getSubscriptionCount(): number {
    return this.subscribedBills.size;
  }

  /**
   * Get an array of all subscribed bill IDs
   */
  getSubscribedBills(): number[] {
    return Array.from(this.subscribedBills);
  }

  // ============================================================================
  // Data Access
  // ============================================================================

  /**
   * Get all updates for a specific bill
   * @param billId - The ID of the bill
   * @returns Array of bill updates
   */
  getBillUpdates(billId: number): BillUpdate[] {
    return this.billUpdates.get(billId) || [];
  }

  /**
   * Get the latest engagement metrics for a bill
   * @param billId - The ID of the bill
   * @returns Engagement metrics or null if not available
   */
  getEngagementMetrics(billId: number): BillEngagementUpdate | null {
    return this.engagementMetrics.get(billId) || null;
  }

  /**
   * Get all engagement metrics for all tracked bills
   */
  getAllEngagementMetrics(): Map<number, BillEngagementUpdate> {
    return new Map(this.engagementMetrics);
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Main message handler for incoming WebSocket messages
   * Routes messages to appropriate handlers based on type
   */
  handleMessage(message: WebSocketMessage): void {
    try {
      const messageType = message.type;

      if (messageType === 'bill_update' || messageType === 'billUpdate') {
        this.handleBillUpdateMessage(message);
      } else if (messageType === 'engagement_metrics' || messageType === 'engagementMetrics') {
        this.handleEngagementMetricsMessage(message);
      } else if (messageType === 'batched_updates' || messageType === 'batchedUpdates') {
        this.handleBatchedUpdatesMessage(message);
      }
    } catch (error) {
      logger.error(
        'Error handling bill tracking message',
        {
          component: 'BillTrackingService',
          messageType: message.type,
        },
        error
      );
    }
  }

  /**
   * Handle messages specific to a subscribed bill
   */
  private handleBillMessage(billId: number, message: WebSocketMessage): void {
    try {
      if (message.type === 'bill_update' && isBillUpdateMessage(message)) {
        const update: BillUpdate = {
          type: message.update?.type || 'update',
          data: {
            billId,
            ...message.update?.data,
          },
          timestamp: message.timestamp || new Date().toISOString(),
        };

        this.addBillUpdate(billId, update);
      }
    } catch (error) {
      logger.error(
        'Error handling bill-specific message',
        {
          component: 'BillTrackingService',
          billId,
          messageType: message.type,
        },
        error
      );
    }
  }

  /**
   * Handle bill update messages
   */
  private handleBillUpdateMessage(message: WebSocketMessage): void {
    try {
      if (!isBillUpdateMessage(message)) {
        logger.warn('Invalid bill update message structure', {
          component: 'BillTrackingService',
        });
        return;
      }

      const billId = message.bill_id || message.billId;

      if (!billId) {
        logger.warn('Bill update message missing bill ID', {
          component: 'BillTrackingService',
        });
        return;
      }

      const update: BillUpdate = {
        type: message.update?.type || message.type || 'update',
        data: {
          billId,
          ...(message.update?.data || message.data || {}),
        },
        timestamp: message.timestamp || new Date().toISOString(),
      };

      this.addBillUpdate(billId, update);
    } catch (error) {
      logger.error(
        'Error handling bill update message',
        {
          component: 'BillTrackingService',
        },
        error
      );
    }
  }

  /**
   * Handle engagement metrics messages
   */
  private handleEngagementMetricsMessage(message: WebSocketMessage): void {
    try {
      if (!isEngagementMetricsMessage(message)) {
        logger.warn('Invalid engagement metrics message structure', {
          component: 'BillTrackingService',
        });
        return;
      }

      const billId = message.bill_id || message.billId;

      if (!billId) {
        logger.warn('Engagement metrics message missing bill ID', {
          component: 'BillTrackingService',
        });
        return;
      }

      const metrics: BillEngagementUpdate = {
        bill_id: billId,
        viewCount: message.metrics?.view_count || message.viewCount || 0,
        saveCount: message.metrics?.save_count || message.saveCount || 0,
        commentCount: message.metrics?.comment_count || message.commentCount || 0,
        shareCount: message.metrics?.share_count || message.shareCount || 0,
        timestamp: message.timestamp || new Date().toISOString(),
      };

      this.engagementMetrics.set(billId, metrics);

      logger.debug('Updated engagement metrics', {
        component: 'BillTrackingService',
        billId,
        metrics,
      });
    } catch (error) {
      logger.error(
        'Error handling engagement metrics message',
        {
          component: 'BillTrackingService',
        },
        error
      );
    }
  }

  /**
   * Handle batched updates message containing multiple bill updates
   */
  private handleBatchedUpdatesMessage(message: WebSocketMessage): void {
    try {
      if (!isBatchedUpdatesMessage(message)) {
        logger.warn('Invalid batched updates message structure', {
          component: 'BillTrackingService',
        });
        return;
      }

      const updates = message.updates || [];

      for (const update of updates) {
        const billId = update.bill_id || update.billId;
        if (billId) {
          const billUpdate: BillUpdate = {
            type: update.type || 'update',
            data: {
              billId,
              ...(update.data || {}),
            },
            timestamp: update.timestamp || new Date().toISOString(),
          };

          this.addBillUpdate(billId, billUpdate);
        }
      }

      logger.debug('Processed batched updates', {
        component: 'BillTrackingService',
        updateCount: updates.length,
      });
    } catch (error) {
      logger.error(
        'Error handling batched updates message',
        {
          component: 'BillTrackingService',
        },
        error
      );
    }
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  /**
   * Add a bill update to the cache
   * Maintains a fixed-size history per bill
   */
  private addBillUpdate(billId: number, update: BillUpdate): void {
    const existing = this.billUpdates.get(billId) || [];
    const updates = [...existing, update].slice(-this.maxUpdatesPerBill);
    this.billUpdates.set(billId, updates);

    logger.debug('Added bill update', {
      component: 'BillTrackingService',
      billId,
      updateType: update.type,
      totalUpdates: updates.length,
    });
  }

  // ============================================================================
  // Batch Processing
  // ============================================================================

  /**
   * Start the batch processing timer
   * Processes queued updates at regular intervals
   */
  private startBatchProcessing(): void {
    if (this.batchTimer) {
      return;
    }

    this.batchTimer = setInterval(() => {
      if (this.updateQueue.length > 0) {
        this.processBatchedUpdates();
      }
    }, this.batchInterval);

    logger.debug('Started batch processing', {
      component: 'BillTrackingService',
      interval: this.batchInterval,
    });
  }

  /**
   * Stop the batch processing timer
   */
  private stopBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;

      logger.debug('Stopped batch processing', {
        component: 'BillTrackingService',
      });
    }
  }

  /**
   * Process queued updates in batches
   * Groups updates by bill ID for efficient processing
   */
  private processBatchedUpdates(): void {
    if (this.updateQueue.length === 0) {
      return;
    }

    const updates = this.updateQueue.splice(0, this.maxBatchSize);

    // Group updates by bill ID for efficient processing
    const updatesByBill = new Map<number, BillRealTimeUpdate[]>();

    for (const update of updates) {
      const billId = update.bill_id;
      if (!updatesByBill.has(billId)) {
        updatesByBill.set(billId, []);
      }
      updatesByBill.get(billId)!.push(update);
    }

    // Process updates for each bill
    for (const [billId, billUpdates] of updatesByBill) {
      for (const update of billUpdates) {
        const billUpdate: BillUpdate = {
          type: this.getBillUpdateType(update),
          data: {
            billId: update.bill_id,
            ...update,
          },
          timestamp: update.timestamp || new Date().toISOString(),
        };

        this.addBillUpdate(billId, billUpdate);
      }
    }

    logger.debug('Processed batched updates', {
      component: 'BillTrackingService',
      processedCount: updates.length,
      billsAffected: updatesByBill.size,
      remainingInQueue: this.updateQueue.length,
    });
  }

  /**
   * Determine the type of update based on its properties
   */
  private getBillUpdateType(update: BillRealTimeUpdate): string {
    if ('oldStatus' in update && 'newStatus' in update) {
      return 'status_change';
    }
    if ('viewCount' in update || 'commentCount' in update) {
      return 'engagement';
    }
    if ('amendment_id' in update) {
      return 'amendment';
    }
    if ('voting_date' in update) {
      return 'voting_scheduled';
    }
    return 'update';
  }

  // ============================================================================
  // Event Handlers Setup
  // ============================================================================

  /**
   * Set up WebSocket connection event handlers
   * Handles reconnection and maintains subscriptions
   */
  private setupEventHandlers(): void {
    this.wsManager.on('connected', () => {
      // Re-subscribe to all bills on reconnection
      const billIds = Array.from(this.subscribedBills);
      this.subscribedBills.clear();
      this.subscriptionIds.clear();

      for (const billId of billIds) {
        this.subscribeToBill(billId);
      }

      logger.info('Re-subscribed to bills after reconnection', {
        component: 'BillTrackingService',
        billCount: billIds.length,
      });
    });

    this.wsManager.on('disconnected', () => {
      logger.warn('WebSocket disconnected, bill tracking paused', {
        component: 'BillTrackingService',
      });
    });
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get current service statistics
   * Provides insight into the state of the tracking service
   */
  getStats(): ServiceStats {
    const totalUpdates = Array.from(this.billUpdates.values()).reduce(
      (sum, updates) => sum + updates.length,
      0
    );

    return {
      subscribedBills: this.subscribedBills.size,
      totalUpdates,
      queuedUpdates: this.updateQueue.length,
      engagementMetrics: this.engagementMetrics.size,
    };
  }
}
