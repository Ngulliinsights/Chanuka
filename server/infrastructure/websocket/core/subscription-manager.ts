/**
 * SubscriptionManager - Handles subscription tracking and management
 * 
 * This class manages bill subscriptions for WebSocket connections, providing
 * efficient tracking of which connections are subscribed to which bills.
 * Supports both individual and batch subscription operations.
 */

import type { 
  AuthenticatedWebSocket, 
  ISubscriptionManager 
} from '../types';

export class SubscriptionManager implements ISubscriptionManager {
  // Map from bill_id to Set of subscribed WebSocket connections
  private subscriptions = new Map<number, Set<AuthenticatedWebSocket>>();
  
  // Map from WebSocket connection to Set of subscribed bill_ids
  private connectionSubscriptions = new Map<AuthenticatedWebSocket, Set<number>>();

  /**
   * Subscribe a WebSocket connection to a specific bill
   * @param ws The WebSocket connection
   * @param billId The bill ID to subscribe to
   */
  subscribe(ws: AuthenticatedWebSocket, billId: number): void {
    if (!this.isValidBillId(billId)) {
      throw new Error(`Invalid bill ID: ${billId}`);
    }

    if (!ws || ws.readyState !== ws.OPEN) {
      throw new Error('Invalid or closed WebSocket connection');
    }

    // Add to bill subscribers
    if (!this.subscriptions.has(billId)) {
      this.subscriptions.set(billId, new Set());
    }
    this.subscriptions.get(billId)!.add(ws);

    // Add to connection subscriptions
    if (!this.connectionSubscriptions.has(ws)) {
      this.connectionSubscriptions.set(ws, new Set());
    }
    this.connectionSubscriptions.get(ws)!.add(billId);

    // Update WebSocket subscriptions set for backward compatibility
    if (!ws.subscriptions) {
      ws.subscriptions = new Set();
    }
    ws.subscriptions.add(billId);
  }

  /**
   * Unsubscribe a WebSocket connection from a specific bill
   * @param ws The WebSocket connection
   * @param billId The bill ID to unsubscribe from
   */
  unsubscribe(ws: AuthenticatedWebSocket, billId: number): void {
    if (!this.isValidBillId(billId)) {
      throw new Error(`Invalid bill ID: ${billId}`);
    }

    // Remove from bill subscribers
    const billSubscribers = this.subscriptions.get(billId);
    if (billSubscribers) {
      billSubscribers.delete(ws);
      if (billSubscribers.size === 0) {
        this.subscriptions.delete(billId);
      }
    }

    // Remove from connection subscriptions
    const connectionSubs = this.connectionSubscriptions.get(ws);
    if (connectionSubs) {
      connectionSubs.delete(billId);
      if (connectionSubs.size === 0) {
        this.connectionSubscriptions.delete(ws);
      }
    }

    // Update WebSocket subscriptions set for backward compatibility
    if (ws.subscriptions) {
      ws.subscriptions.delete(billId);
    }
  }

  /**
   * Subscribe a WebSocket connection to multiple bills at once
   * @param ws The WebSocket connection
   * @param billIds Array of bill IDs to subscribe to
   */
  batchSubscribe(ws: AuthenticatedWebSocket, billIds: number[]): void {
    if (!Array.isArray(billIds) || billIds.length === 0) {
      throw new Error('Bill IDs must be a non-empty array');
    }

    if (!ws || ws.readyState !== ws.OPEN) {
      throw new Error('Invalid or closed WebSocket connection');
    }

    // Validate all bill IDs first
    for (const billId of billIds) {
      if (!this.isValidBillId(billId)) {
        throw new Error(`Invalid bill ID in batch: ${billId}`);
      }
    }

    // Subscribe to each bill
    for (const billId of billIds) {
      try {
        this.subscribe(ws, billId);
      } catch (error) {
        // Log error but continue with other subscriptions
        console.error(`Failed to subscribe to bill ${billId}:`, error);
      }
    }
  }

  /**
   * Unsubscribe a WebSocket connection from multiple bills at once
   * @param ws The WebSocket connection
   * @param billIds Array of bill IDs to unsubscribe from
   */
  batchUnsubscribe(ws: AuthenticatedWebSocket, billIds: number[]): void {
    if (!Array.isArray(billIds) || billIds.length === 0) {
      throw new Error('Bill IDs must be a non-empty array');
    }

    // Validate all bill IDs first
    for (const billId of billIds) {
      if (!this.isValidBillId(billId)) {
        throw new Error(`Invalid bill ID in batch: ${billId}`);
      }
    }

    // Unsubscribe from each bill
    for (const billId of billIds) {
      try {
        this.unsubscribe(ws, billId);
      } catch (error) {
        // Log error but continue with other unsubscriptions
        console.error(`Failed to unsubscribe from bill ${billId}:`, error);
      }
    }
  }

  /**
   * Get all WebSocket connections subscribed to a specific bill
   * @param billId The bill ID to get subscribers for
   * @returns Array of subscribed WebSocket connections
   */
  getSubscribers(billId: number): AuthenticatedWebSocket[] {
    if (!this.isValidBillId(billId)) {
      return [];
    }

    const subscribers = this.subscriptions.get(billId);
    if (!subscribers) {
      return [];
    }

    // Filter out closed connections
    const activeSubscribers = Array.from(subscribers).filter(
      ws => ws.readyState === ws.OPEN
    );

    // Clean up closed connections
    if (activeSubscribers.length !== subscribers.size) {
      this.subscriptions.set(billId, new Set(activeSubscribers));
    }

    return activeSubscribers;
  }

  /**
   * Get all bill IDs that a WebSocket connection is subscribed to
   * @param ws The WebSocket connection
   * @returns Array of subscribed bill IDs
   */
  getSubscriptionsForConnection(ws: AuthenticatedWebSocket): number[] {
    const subscriptions = this.connectionSubscriptions.get(ws);
    return subscriptions ? Array.from(subscriptions) : [];
  }

  /**
   * Clean up all subscriptions for a WebSocket connection
   * Called when a connection is closed or removed
   * @param ws The WebSocket connection to clean up
   */
  cleanup(ws: AuthenticatedWebSocket): void {
    const subscriptions = this.connectionSubscriptions.get(ws);
    if (!subscriptions) {
      return;
    }

    // Remove connection from all bill subscriptions
    for (const billId of Array.from(subscriptions)) {
      const billSubscribers = this.subscriptions.get(billId);
      if (billSubscribers) {
        billSubscribers.delete(ws);
        if (billSubscribers.size === 0) {
          this.subscriptions.delete(billId);
        }
      }
    }

    // Remove connection from tracking
    this.connectionSubscriptions.delete(ws);

    // Clean up WebSocket subscriptions set for backward compatibility
    if (ws.subscriptions) {
      ws.subscriptions.clear();
    }
  }

  /**
   * Get the total number of active subscriptions
   * @returns Total number of bill-connection subscription pairs
   */
  getTotalSubscriptions(): number {
    let total = 0;
    for (const subscribers of Array.from(this.subscriptions.values())) {
      total += subscribers.size;
    }
    return total;
  }

  /**
   * Get the number of unique bills being subscribed to
   * @returns Number of bills with at least one subscriber
   */
  getSubscribedBillsCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get the number of connections with at least one subscription
   * @returns Number of connections with subscriptions
   */
  getActiveConnectionsCount(): number {
    return this.connectionSubscriptions.size;
  }

  /**
   * Check if a connection is subscribed to a specific bill
   * @param ws The WebSocket connection
   * @param billId The bill ID to check
   * @returns true if the connection is subscribed to the bill
   */
  isSubscribed(ws: AuthenticatedWebSocket, billId: number): boolean {
    const subscriptions = this.connectionSubscriptions.get(ws);
    return subscriptions ? subscriptions.has(billId) : false;
  }

  /**
   * Get subscription statistics for monitoring
   * @returns Object with subscription statistics
   */
  getStats(): {
    totalSubscriptions: number;
    subscribedBills: number;
    activeConnections: number;
    averageSubscriptionsPerConnection: number;
    averageSubscribersPerBill: number;
  } {
    const totalSubscriptions = this.getTotalSubscriptions();
    const subscribedBills = this.getSubscribedBillsCount();
    const activeConnections = this.getActiveConnectionsCount();

    return {
      totalSubscriptions,
      subscribedBills,
      activeConnections,
      averageSubscriptionsPerConnection: activeConnections > 0 
        ? totalSubscriptions / activeConnections 
        : 0,
      averageSubscribersPerBill: subscribedBills > 0 
        ? totalSubscriptions / subscribedBills 
        : 0,
    };
  }

  /**
   * Perform cleanup of stale subscriptions
   * Removes subscriptions for closed connections
   */
  performCleanup(): void {
    const closedConnections: AuthenticatedWebSocket[] = [];

    // Find closed connections
    for (const ws of Array.from(this.connectionSubscriptions.keys())) {
      if (ws.readyState !== ws.OPEN) {
        closedConnections.push(ws);
      }
    }

    // Clean up closed connections
    for (const ws of closedConnections) {
      this.cleanup(ws);
    }
  }

  /**
   * Validate that a bill ID is a positive integer
   * @param billId The bill ID to validate
   * @returns true if the bill ID is valid
   */
  private isValidBillId(billId: number): boolean {
    return typeof billId === 'number' && 
           Number.isInteger(billId) && 
           billId > 0;
  }
}