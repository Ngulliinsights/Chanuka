/**
 * Message Processing Integration Tests
 * 
 * Tests the integration between MessageHandler, SubscriptionManager, and OperationQueueManager
 * to ensure the complete message processing pipeline works correctly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageHandler } from '../message-handler';
import { SubscriptionManager } from '../subscription-manager';
import { OperationQueueManager, OPERATION_PRIORITIES } from '../operation-queue-manager';
import type { AuthenticatedWebSocket, WebSocketMessage, QueueOperation } from '../../types';

// Mock WebSocket factory
const createMockWebSocket = (overrides: Partial<AuthenticatedWebSocket> = {}): AuthenticatedWebSocket => {
  return {
    readyState: 1, // OPEN
    OPEN: 1,
    CLOSED: 3,
    send: vi.fn(),
    close: vi.fn(),
    user_id: `user_${Math.random().toString(36).substr(2, 9)}`,
    isAlive: true,
    lastPing: Date.now(),
    subscriptions: new Set<number>(),
    connectionId: `conn_${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  } as unknown as AuthenticatedWebSocket;
};

describe('Message Processing Integration', () => {
  let messageHandler: MessageHandler;
  let subscriptionManager: SubscriptionManager;
  let operationQueueManager: OperationQueueManager;
  let mockWebSocket1: AuthenticatedWebSocket;
  let mockWebSocket2: AuthenticatedWebSocket;
  let mockWebSocket3: AuthenticatedWebSocket;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
    operationQueueManager = new OperationQueueManager(1000, 5, 10);
    messageHandler = new MessageHandler(
      subscriptionManager,
      operationQueueManager,
      {
        dedupeCacheSize: 100,
        dedupeWindow: 1000,
        batchSize: 5,
        batchDelay: 10,
      }
    );

    mockWebSocket1 = createMockWebSocket({ connectionId: 'ws1', user_id: 'user1' });
    mockWebSocket2 = createMockWebSocket({ connectionId: 'ws2', user_id: 'user2' });
    mockWebSocket3 = createMockWebSocket({ connectionId: 'ws3', user_id: 'user3' });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('end-to-end message flow', () => {
    it('should handle complete subscribe-broadcast-unsubscribe flow', async () => {
      // Step 1: Subscribe multiple connections to a bill
      const subscribeMessage1: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'sub1',
        timestamp: Date.now(),
      };

      const subscribeMessage2: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'sub2',
        timestamp: Date.now(),
      };

      await messageHandler.handleMessage(mockWebSocket1, subscribeMessage1);
      await messageHandler.handleMessage(mockWebSocket2, subscribeMessage2);

      // Verify subscriptions were created
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);
      expect(subscriptionManager.isSubscribed(mockWebSocket2, 123)).toBe(true);
      expect(subscriptionManager.getSubscribers(123)).toHaveLength(2);

      // Verify subscribe operations were queued
      expect(operationQueueManager.getQueueSize()).toBeGreaterThan(0);

      // Step 2: Process the queue
      await operationQueueManager.processQueue();

      // Step 3: Broadcast a message to subscribers
      const broadcastMessage = {
        type: 'bill_update',
        data: { status: 'passed', timestamp: Date.now() },
      };

      messageHandler.broadcastToSubscribers(123, broadcastMessage);

      // Verify broadcast operation was queued
      const statsAfterBroadcast = operationQueueManager.getStats();
      expect(statsAfterBroadcast.queueSize).toBeGreaterThan(0);

      // Step 4: Unsubscribe one connection
      const unsubscribeMessage: WebSocketMessage = {
        type: 'unsubscribe',
        data: { bill_id: 123 },
        messageId: 'unsub1',
        timestamp: Date.now(),
      };

      await messageHandler.handleMessage(mockWebSocket1, unsubscribeMessage);

      // Verify unsubscription
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(false);
      expect(subscriptionManager.isSubscribed(mockWebSocket2, 123)).toBe(true);
      expect(subscriptionManager.getSubscribers(123)).toHaveLength(1);

      // Verify responses were sent
      expect(mockWebSocket1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"subscribe_confirmation"')
      );
      expect(mockWebSocket1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"unsubscribe_confirmation"')
      );
      expect(mockWebSocket2.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"subscribe_confirmation"')
      );
    });

    it('should handle batch operations correctly', async () => {
      // Batch subscribe to multiple bills
      const batchSubscribeMessage: WebSocketMessage = {
        type: 'batch_subscribe',
        data: { bill_ids: [123, 456, 789] },
        messageId: 'batch_sub',
        timestamp: Date.now(),
      };

      await messageHandler.handleMessage(mockWebSocket1, batchSubscribeMessage);

      // Verify all subscriptions were created
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(true);
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 789)).toBe(true);

      const subscriptions = subscriptionManager.getSubscriptionsForConnection(mockWebSocket1);
      expect(subscriptions).toHaveLength(3);

      // Batch unsubscribe from some bills
      const batchUnsubscribeMessage: WebSocketMessage = {
        type: 'batch_unsubscribe',
        data: { bill_ids: [123, 456] },
        messageId: 'batch_unsub',
        timestamp: Date.now(),
      };

      await messageHandler.handleMessage(mockWebSocket1, batchUnsubscribeMessage);

      // Verify partial unsubscription
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(false);
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(false);
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 789)).toBe(true);

      const remainingSubscriptions = subscriptionManager.getSubscriptionsForConnection(mockWebSocket1);
      expect(remainingSubscriptions).toHaveLength(1);
      expect(remainingSubscriptions).toContain(789);
    });

    it('should handle connection cleanup properly', async () => {
      // Set up subscriptions for multiple connections
      await messageHandler.handleMessage(mockWebSocket1, {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'setup1',
      });

      await messageHandler.handleMessage(mockWebSocket2, {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'setup2',
      });

      await messageHandler.handleMessage(mockWebSocket1, {
        type: 'subscribe',
        data: { bill_id: 456 },
        messageId: 'setup3',
      });

      // Verify initial state
      expect(subscriptionManager.getSubscribers(123)).toHaveLength(2);
      expect(subscriptionManager.getSubscribers(456)).toHaveLength(1);
      expect(subscriptionManager.getTotalSubscriptions()).toBe(3);

      // Clean up one connection
      messageHandler.cleanup(mockWebSocket1);

      // Verify cleanup
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(false);
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(false);
      expect(subscriptionManager.isSubscribed(mockWebSocket2, 123)).toBe(true);

      expect(subscriptionManager.getSubscribers(123)).toHaveLength(1);
      expect(subscriptionManager.getSubscribers(456)).toHaveLength(0);
      expect(subscriptionManager.getTotalSubscriptions()).toBe(1);
    });
  });

  describe('error handling integration', () => {
    it('should handle validation errors without affecting other operations', async () => {
      // Valid message
      const validMessage: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'valid',
      };

      // Invalid message
      const invalidMessage: WebSocketMessage = {
        type: 'subscribe',
        data: {}, // Missing bill_id
        messageId: 'invalid',
      };

      // Process both messages
      await messageHandler.handleMessage(mockWebSocket1, validMessage);
      await messageHandler.handleMessage(mockWebSocket1, invalidMessage);

      // Valid subscription should exist
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);

      // Both responses should be sent (one success, one error)
      expect(mockWebSocket1.send).toHaveBeenCalledTimes(2);
      expect(mockWebSocket1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"subscribe_confirmation"')
      );
      expect(mockWebSocket1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });

    it('should handle queue overflow gracefully', async () => {
      // Create a small queue that will overflow
      const smallQueueManager = new OperationQueueManager(2, 1, 10);
      const handlerWithSmallQueue = new MessageHandler(
        subscriptionManager,
        smallQueueManager
      );

      // Subscribe connections to create subscribers
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket2, 123);

      // Fill the queue first
      smallQueueManager.enqueue({
        type: 'cleanup',
        priority: OPERATION_PRIORITIES.CRITICAL,
        data: { ws: mockWebSocket3 },
        timestamp: Date.now(),
      });

      smallQueueManager.enqueue({
        type: 'cleanup',
        priority: OPERATION_PRIORITIES.CRITICAL,
        data: { ws: mockWebSocket3 },
        timestamp: Date.now(),
      });

      // Now try to broadcast (should overflow and fallback to direct broadcast)
      const broadcastMessage = {
        type: 'bill_update',
        data: { status: 'passed' },
      };

      expect(() => {
        handlerWithSmallQueue.broadcastToSubscribers(123, broadcastMessage);
      }).not.toThrow();

      // Verify direct broadcast was used (connections should receive message)
      expect(mockWebSocket1.send).toHaveBeenCalled();
      expect(mockWebSocket2.send).toHaveBeenCalled();
    });

    it('should handle closed connections during broadcast', async () => {
      // Subscribe connections
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket2, 123);
      subscriptionManager.subscribe(mockWebSocket3, 123);

      // Close one connection
      Object.defineProperty(mockWebSocket2, 'readyState', { value: 3, writable: true }); // CLOSED

      // Broadcast message
      const broadcastMessage = {
        type: 'bill_update',
        data: { status: 'passed' },
      };

      messageHandler.broadcastToSubscribers(123, broadcastMessage);

      // Process the queue to trigger actual broadcast
      await operationQueueManager.processQueue();

      // Verify that only open connections are included in subscriber list
      const activeSubscribers = subscriptionManager.getSubscribers(123);
      expect(activeSubscribers).toContain(mockWebSocket1);
      expect(activeSubscribers).not.toContain(mockWebSocket2); // Closed connection filtered out
      expect(activeSubscribers).toContain(mockWebSocket3);
      expect(activeSubscribers).toHaveLength(2);
    });
  });

  describe('performance and load handling', () => {
    it('should handle high message volume efficiently', async () => {
      const messageCount = 100;
      const billIds = [123, 456, 789];

      // Subscribe to multiple bills
      for (const billId of billIds) {
        await messageHandler.handleMessage(mockWebSocket1, {
          type: 'subscribe',
          data: { bill_id: billId },
          messageId: `sub_${billId}`,
        });
      }

      // Send many messages
      const startTime = Date.now();
      
      for (let i = 0; i < messageCount; i++) {
        await messageHandler.handleMessage(mockWebSocket1, {
          type: 'ping',
          messageId: `ping_${i}`,
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process messages reasonably quickly (less than 1 second for 100 messages)
      expect(processingTime).toBeLessThan(1000);

      // All subscriptions should still be intact
      for (const billId of billIds) {
        expect(subscriptionManager.isSubscribed(mockWebSocket1, billId)).toBe(true);
      }

      // Should have sent responses for all pings
      expect(mockWebSocket1.send).toHaveBeenCalledTimes(messageCount + billIds.length);
    });

    it('should handle many concurrent subscriptions', async () => {
      const connectionCount = 50;
      const billCount = 10;
      const connections: AuthenticatedWebSocket[] = [];

      // Create many connections
      for (let i = 0; i < connectionCount; i++) {
        connections.push(createMockWebSocket({ 
          connectionId: `conn_${i}`,
          user_id: `user_${i}`,
        }));
      }

      // Subscribe each connection to multiple bills
      for (const connection of connections) {
        for (let billId = 1; billId <= billCount; billId++) {
          await messageHandler.handleMessage(connection, {
            type: 'subscribe',
            data: { bill_id: billId },
            messageId: `sub_${connection.connectionId}_${billId}`,
          });
        }
      }

      // Verify all subscriptions were created
      const stats = subscriptionManager.getStats();
      expect(stats.totalSubscriptions).toBe(connectionCount * billCount);
      expect(stats.activeConnections).toBe(connectionCount);
      expect(stats.subscribedBills).toBe(billCount);

      // Test broadcast to one bill
      messageHandler.broadcastToSubscribers(1, {
        type: 'bill_update',
        data: { status: 'updated' },
      });

      // Should queue broadcast operation
      expect(operationQueueManager.getQueueSize()).toBeGreaterThan(0);

      // Process queue
      await operationQueueManager.processQueue();

      const finalStats = operationQueueManager.getStats();
      expect(finalStats.processedCount).toBeGreaterThan(0);
    });
  });

  describe('message deduplication integration', () => {
    it('should deduplicate messages across the entire processing pipeline', async () => {
      const duplicateMessage: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'duplicate_test',
        timestamp: Date.now(),
      };

      // Send the same message multiple times rapidly
      await messageHandler.handleMessage(mockWebSocket1, duplicateMessage);
      await messageHandler.handleMessage(mockWebSocket1, duplicateMessage);
      await messageHandler.handleMessage(mockWebSocket1, duplicateMessage);

      // Should only create one subscription
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);
      const subscribers = subscriptionManager.getSubscribers(123);
      expect(subscribers).toHaveLength(1);

      // Should only send one response
      expect(mockWebSocket1.send).toHaveBeenCalledTimes(1);
      expect(mockWebSocket1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"subscribe_confirmation"')
      );

      // Queue should only contain operations from the first (non-duplicate) message
      const queueStats = operationQueueManager.getStats();
      expect(queueStats.queueSize).toBeLessThanOrEqual(1);
    });

    it('should allow processing after deduplication window expires', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const message: WebSocketMessage = {
        type: 'ping',
        messageId: 'time_window_test',
      };

      // Send first message
      await messageHandler.handleMessage(mockWebSocket1, message);
      expect(mockWebSocket1.send).toHaveBeenCalledTimes(1);

      // Wait for deduplication window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Send same message again - should be processed
      await messageHandler.handleMessage(mockWebSocket1, message);
      expect(mockWebSocket1.send).toHaveBeenCalledTimes(2);

      vi.useFakeTimers(); // Restore fake timers
    });
  });

  describe('statistics integration', () => {
    it('should provide comprehensive system statistics', async () => {
      // Set up some subscriptions and operations
      await messageHandler.handleMessage(mockWebSocket1, {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'stats_test_1',
      });

      await messageHandler.handleMessage(mockWebSocket2, {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'stats_test_2',
      });

      await messageHandler.handleMessage(mockWebSocket1, {
        type: 'subscribe',
        data: { bill_id: 456 },
        messageId: 'stats_test_3',
      });

      // Get statistics from all components
      const messageHandlerStats = messageHandler.getStats();
      const subscriptionStats = subscriptionManager.getStats();
      const queueStats = operationQueueManager.getStats();

      // Verify message handler stats
      expect(messageHandlerStats.dedupeCacheSize).toBeGreaterThan(0);
      expect(typeof messageHandlerStats.messageBufferSize).toBe('number');
      expect(typeof messageHandlerStats.activeFlushTimers).toBe('number');

      // Verify subscription stats
      expect(subscriptionStats.totalSubscriptions).toBe(3);
      expect(subscriptionStats.subscribedBills).toBe(2);
      expect(subscriptionStats.activeConnections).toBe(2);

      // Verify queue stats
      expect(queueStats.queueSize).toBeGreaterThan(0);
      expect(queueStats.processing).toBe(false);
      expect(typeof queueStats.overflowCount).toBe('number');
      expect(typeof queueStats.processedCount).toBe('number');
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent subscribe and broadcast operations', async () => {
      // Start multiple concurrent operations
      const operations = [
        messageHandler.handleMessage(mockWebSocket1, {
          type: 'subscribe',
          data: { bill_id: 123 },
          messageId: 'concurrent_1',
        }),
        messageHandler.handleMessage(mockWebSocket2, {
          type: 'subscribe',
          data: { bill_id: 123 },
          messageId: 'concurrent_2',
        }),
        messageHandler.handleMessage(mockWebSocket3, {
          type: 'subscribe',
          data: { bill_id: 456 },
          messageId: 'concurrent_3',
        }),
      ];

      // Wait for all operations to complete
      await Promise.all(operations);

      // Verify all subscriptions were created correctly
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);
      expect(subscriptionManager.isSubscribed(mockWebSocket2, 123)).toBe(true);
      expect(subscriptionManager.isSubscribed(mockWebSocket3, 456)).toBe(true);

      // Now broadcast to both bills concurrently
      messageHandler.broadcastToSubscribers(123, { type: 'update', data: { bill: 123 } });
      messageHandler.broadcastToSubscribers(456, { type: 'update', data: { bill: 456 } });

      // Process all queued operations
      await operationQueueManager.processQueue();

      // Verify system is in consistent state
      const stats = subscriptionManager.getStats();
      expect(stats.totalSubscriptions).toBe(3);
      expect(stats.subscribedBills).toBe(2);
      expect(stats.activeConnections).toBe(3);
    });
  });
});