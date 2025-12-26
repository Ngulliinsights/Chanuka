/**
 * MessageHandler Unit Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedWebSocket, WebSocketMessage } from '../../types';
import { MessageHandler, MessageProcessingError,MessageValidationError } from '../message-handler';
import { OperationQueueManager } from '../operation-queue-manager';
import { SubscriptionManager } from '../subscription-manager';

// Mock WebSocket
const createMockWebSocket = (overrides: Partial<AuthenticatedWebSocket> = {}): AuthenticatedWebSocket => {
  const ws = {
    readyState: 1, // OPEN
    OPEN: 1,
    CLOSED: 3,
    send: vi.fn(),
    close: vi.fn(),
    user_id: 'test_user',
    isAlive: true,
    lastPing: Date.now(),
    subscriptions: new Set<number>(),
    connectionId: 'test_connection_id',
    ...overrides,
  } as unknown as AuthenticatedWebSocket;
  
  return ws;
};

describe('MessageHandler', () => {
  let messageHandler: MessageHandler;
  let mockSubscriptionManager: SubscriptionManager;
  let mockOperationQueueManager: OperationQueueManager;
  let mockWebSocket: AuthenticatedWebSocket;

  beforeEach(() => {
    mockSubscriptionManager = new SubscriptionManager();
    mockOperationQueueManager = new OperationQueueManager(1000);
    mockWebSocket = createMockWebSocket();
    
    messageHandler = new MessageHandler(
      mockSubscriptionManager,
      mockOperationQueueManager,
      {
        dedupeCacheSize: 100,
        dedupeWindow: 1000,
        batchSize: 5,
        batchDelay: 10,
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateMessage', () => {
    it('should validate a correct subscribe message', () => {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'test_message_1',
        timestamp: Date.now(),
      };

      expect(messageHandler.validateMessage(message)).toBe(true);
    });

    it('should reject message without type', () => {
      const message = {
        data: { bill_id: 123 },
      } as WebSocketMessage;

      expect(messageHandler.validateMessage(message)).toBe(false);
    });

    it('should reject message with invalid type', () => {
      const message: WebSocketMessage = {
        type: 'invalid_type' as any,
        data: { bill_id: 123 },
      };

      expect(messageHandler.validateMessage(message)).toBe(false);
    });

    it('should reject subscribe message without bill_id', () => {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: {},
      };

      expect(messageHandler.validateMessage(message)).toBe(false);
    });

    it('should validate batch_subscribe message with bill_ids array', () => {
      const message: WebSocketMessage = {
        type: 'batch_subscribe',
        data: { bill_ids: [123, 456, 789] },
      };

      expect(messageHandler.validateMessage(message)).toBe(true);
    });

    it('should reject batch_subscribe message without bill_ids', () => {
      const message: WebSocketMessage = {
        type: 'batch_subscribe',
        data: {},
      };

      expect(messageHandler.validateMessage(message)).toBe(false);
    });

    it('should validate auth message with token', () => {
      const message: WebSocketMessage = {
        type: 'auth',
        data: { token: 'valid_token' },
      };

      expect(messageHandler.validateMessage(message)).toBe(true);
    });

    it('should validate ping message without data', () => {
      const message: WebSocketMessage = {
        type: 'ping',
      };

      expect(messageHandler.validateMessage(message)).toBe(true);
    });
  });

  describe('handleMessage', () => {
    it('should handle subscribe message successfully', async () => {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'test_message_1',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify subscription was created
      expect(mockSubscriptionManager.isSubscribed(mockWebSocket, 123)).toBe(true);
      
      // Verify response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"subscribe_confirmation"')
      );
    });

    it('should handle unsubscribe message successfully', async () => {
      // First subscribe
      mockSubscriptionManager.subscribe(mockWebSocket, 123);
      
      const message: WebSocketMessage = {
        type: 'unsubscribe',
        data: { bill_id: 123 },
        messageId: 'test_message_2',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify subscription was removed
      expect(mockSubscriptionManager.isSubscribed(mockWebSocket, 123)).toBe(false);
      
      // Verify response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"unsubscribe_confirmation"')
      );
    });

    it('should handle batch_subscribe message successfully', async () => {
      const message: WebSocketMessage = {
        type: 'batch_subscribe',
        data: { bill_ids: [123, 456, 789] },
        messageId: 'test_message_3',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify all subscriptions were created
      expect(mockSubscriptionManager.isSubscribed(mockWebSocket, 123)).toBe(true);
      expect(mockSubscriptionManager.isSubscribed(mockWebSocket, 456)).toBe(true);
      expect(mockSubscriptionManager.isSubscribed(mockWebSocket, 789)).toBe(true);
      
      // Verify response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"batch_subscribe_confirmation"')
      );
    });

    it('should handle ping message and update connection status', async () => {
      const message: WebSocketMessage = {
        type: 'ping',
        messageId: 'test_ping',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify connection status was updated
      expect(mockWebSocket.isAlive).toBe(true);
      expect(mockWebSocket.lastPing).toBeGreaterThan(0);
      
      // Verify pong response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"pong"')
      );
    });

    it('should handle invalid message and send error response', async () => {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: {}, // Missing bill_id
        messageId: 'test_invalid',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify error response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });

    it('should ignore duplicate messages', async () => {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'duplicate_message',
      };

      // Send the same message twice
      await messageHandler.handleMessage(mockWebSocket, message);
      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify only one subscription was created
      const subscribers = mockSubscriptionManager.getSubscribers(123);
      expect(subscribers).toHaveLength(1);
    });

    it('should not send response to closed WebSocket', async () => {
      const closedWebSocket = createMockWebSocket({ readyState: 3 }); // CLOSED
      
      const message: WebSocketMessage = {
        type: 'ping',
        messageId: 'test_closed',
      };

      await messageHandler.handleMessage(closedWebSocket, message);

      // Verify no response was sent
      expect(closedWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('broadcastToSubscribers', () => {
    it('should broadcast message to all subscribers', () => {
      const ws1 = createMockWebSocket({ connectionId: 'conn1' });
      const ws2 = createMockWebSocket({ connectionId: 'conn2' });
      
      // Subscribe both connections to bill 123
      mockSubscriptionManager.subscribe(ws1, 123);
      mockSubscriptionManager.subscribe(ws2, 123);

      const broadcastMessage = {
        type: 'bill_update',
        data: { status: 'passed' },
      };

      messageHandler.broadcastToSubscribers(123, broadcastMessage);

      // Verify operation was queued (we can't easily test the actual broadcast without more setup)
      expect(mockOperationQueueManager.getQueueSize()).toBeGreaterThan(0);
    });

    it('should handle broadcast to bill with no subscribers', () => {
      const broadcastMessage = {
        type: 'bill_update',
        data: { status: 'passed' },
      };

      // Should not throw error
      expect(() => {
        messageHandler.broadcastToSubscribers(999, broadcastMessage);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should clean up WebSocket resources', () => {
      // Subscribe to some bills
      mockSubscriptionManager.subscribe(mockWebSocket, 123);
      mockSubscriptionManager.subscribe(mockWebSocket, 456);

      messageHandler.cleanup(mockWebSocket);

      // Verify subscriptions were cleaned up
      expect(mockSubscriptionManager.isSubscribed(mockWebSocket, 123)).toBe(false);
      expect(mockSubscriptionManager.isSubscribed(mockWebSocket, 456)).toBe(false);
    });
  });

  describe('message routing', () => {
    it('should route auth message correctly', async () => {
      const message: WebSocketMessage = {
        type: 'auth',
        data: { token: 'valid_jwt_token' },
        messageId: 'auth_test',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify auth confirmation was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"auth_confirmation"')
      );
    });

    it('should route get_preferences message correctly', async () => {
      const message: WebSocketMessage = {
        type: 'get_preferences',
        messageId: 'prefs_test',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify preferences response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"preferences_response"')
      );
    });

    it('should route update_preferences message correctly', async () => {
      const message: WebSocketMessage = {
        type: 'update_preferences',
        data: {
          preferences: {
            updateFrequency: 'hourly',
            notificationTypes: ['status_change', 'new_comment'],
          },
        },
        messageId: 'update_prefs_test',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify preferences updated confirmation was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"preferences_updated"')
      );
    });

    it('should handle unknown message type', async () => {
      const message: WebSocketMessage = {
        type: 'unknown_type' as any,
        messageId: 'unknown_test',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify error response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });
  });

  describe('message validation edge cases', () => {
    it('should reject null message', () => {
      expect(messageHandler.validateMessage(null as any)).toBe(false);
    });

    it('should reject undefined message', () => {
      expect(messageHandler.validateMessage(undefined as any)).toBe(false);
    });

    it('should reject non-object message', () => {
      expect(messageHandler.validateMessage('string' as any)).toBe(false);
      expect(messageHandler.validateMessage(123 as any)).toBe(false);
      expect(messageHandler.validateMessage(true as any)).toBe(false);
    });

    it('should reject message with non-string type', () => {
      const message = {
        type: 123,
        data: { bill_id: 123 },
      } as any;

      expect(messageHandler.validateMessage(message)).toBe(false);
    });

    it('should validate subscribe message with non-number bill_id', () => {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 'not_a_number' as any },
      };

      expect(messageHandler.validateMessage(message)).toBe(false);
    });

    it('should validate batch_subscribe with empty array', () => {
      const message: WebSocketMessage = {
        type: 'batch_subscribe',
        data: { bill_ids: [] },
      };

      expect(messageHandler.validateMessage(message)).toBe(false);
    });

    it('should validate batch_subscribe with non-array bill_ids', () => {
      const message: WebSocketMessage = {
        type: 'batch_subscribe',
        data: { bill_ids: 'not_an_array' as any },
      };

      expect(messageHandler.validateMessage(message)).toBe(false);
    });

    it('should validate auth message with non-string token', () => {
      const message: WebSocketMessage = {
        type: 'auth',
        data: { token: 123 as any },
      };

      expect(messageHandler.validateMessage(message)).toBe(false);
    });

    it('should validate update_preferences with non-object preferences', () => {
      const message: WebSocketMessage = {
        type: 'update_preferences',
        data: { preferences: 'not_an_object' as any },
      };

      expect(messageHandler.validateMessage(message)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle MessageValidationError', async () => {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 'invalid' as any },
        messageId: 'validation_error_test',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify error response contains validation error
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringMatching(/"type":"error".*"error":"Invalid bill_id for subscribe message"/)
      );
    });

    it('should handle batch subscribe with invalid bill_id', async () => {
      const message: WebSocketMessage = {
        type: 'batch_subscribe',
        data: { bill_ids: [123, 'invalid' as any, 789] },
        messageId: 'batch_validation_error',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify error response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });

    it('should handle batch unsubscribe with invalid bill_id', async () => {
      const message: WebSocketMessage = {
        type: 'batch_unsubscribe',
        data: { bill_ids: [123, null, 789] },
        messageId: 'batch_unsub_validation_error',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify error response was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });

    it('should handle send error gracefully', async () => {
      const errorWebSocket = createMockWebSocket({
        send: vi.fn().mockImplementation(() => {
          throw new Error('Send failed');
        }),
      });

      const message: WebSocketMessage = {
        type: 'ping',
        messageId: 'send_error_test',
      };

      // Should not throw error
      await expect(messageHandler.handleMessage(errorWebSocket, message)).resolves.not.toThrow();
    });

    it('should include original message info in error response', async () => {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: {}, // Missing bill_id
        messageId: 'error_context_test',
      };

      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify error response includes original message context
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringMatching(/"originalType":"subscribe".*"messageId":"error_context_test"/)
      );
    });
  });

  describe('deduplication', () => {
    it('should deduplicate messages with same messageId', async () => {
      const message: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'duplicate_test',
      };

      // Send same message multiple times
      await messageHandler.handleMessage(mockWebSocket, message);
      await messageHandler.handleMessage(mockWebSocket, message);
      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify only one subscription was created
      expect(mockSubscriptionManager.isSubscribed(mockWebSocket, 123)).toBe(true);
      const subscribers = mockSubscriptionManager.getSubscribers(123);
      expect(subscribers).toHaveLength(1);

      // Verify only one response was sent (first message)
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    });

    it('should not deduplicate messages without messageId', async () => {
      const message: WebSocketMessage = {
        type: 'ping',
        // No messageId
      };

      // Send same message multiple times
      await messageHandler.handleMessage(mockWebSocket, message);
      await messageHandler.handleMessage(mockWebSocket, message);

      // Both should be processed (2 pong responses)
      expect(mockWebSocket.send).toHaveBeenCalledTimes(2);
    });

    it('should allow same messageId after deduplication window', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const message: WebSocketMessage = {
        type: 'ping',
        messageId: 'time_window_test',
      };

      // Send first message
      await messageHandler.handleMessage(mockWebSocket, message);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);

      // Wait for deduplication window to expire (1000ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Send same message again - should be processed
      await messageHandler.handleMessage(mockWebSocket, message);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(2);

      vi.useFakeTimers(); // Restore fake timers
    });
  });

  describe('broadcasting edge cases', () => {
    it('should handle broadcast when queue is full', () => {
      // Create a small queue that will overflow
      const smallQueueManager = new OperationQueueManager(1);
      const handlerWithSmallQueue = new MessageHandler(
        mockSubscriptionManager,
        smallQueueManager
      );

      const ws1 = createMockWebSocket({ connectionId: 'conn1' });
      const ws2 = createMockWebSocket({ connectionId: 'conn2' });
      
      // Subscribe connections
      mockSubscriptionManager.subscribe(ws1, 123);
      mockSubscriptionManager.subscribe(ws2, 123);

      // Fill the queue first
      smallQueueManager.enqueue({
        type: 'cleanup',
        priority: 100,
        data: { ws: ws1 },
        timestamp: Date.now(),
      });

      const broadcastMessage = {
        type: 'bill_update',
        data: { status: 'passed' },
      };

      // Should fallback to direct broadcast when queue is full
      expect(() => {
        handlerWithSmallQueue.broadcastToSubscribers(123, broadcastMessage);
      }).not.toThrow();

      // Verify direct broadcast was used (both connections should receive message)
      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).toHaveBeenCalled();
    });

    it('should handle broadcast error gracefully', () => {
      const errorWebSocket = createMockWebSocket({
        connectionId: 'error_conn',
        send: vi.fn().mockImplementation(() => {
          throw new Error('Broadcast send failed');
        }),
      });

      mockSubscriptionManager.subscribe(errorWebSocket, 123);

      const broadcastMessage = {
        type: 'bill_update',
        data: { status: 'passed' },
      };

      // Should not throw error even if individual send fails
      expect(() => {
        messageHandler.broadcastToSubscribers(123, broadcastMessage);
      }).not.toThrow();
    });

    it('should skip closed connections in direct broadcast', () => {
      const closedWebSocket = createMockWebSocket({ 
        connectionId: 'closed_conn',
        readyState: 3, // CLOSED
      });
      const openWebSocket = createMockWebSocket({ 
        connectionId: 'open_conn',
        readyState: 1, // OPEN
      });

      mockSubscriptionManager.subscribe(closedWebSocket, 123);
      mockSubscriptionManager.subscribe(openWebSocket, 123);

      // Force direct broadcast by using small queue
      const smallQueueManager = new OperationQueueManager(0); // No capacity
      const handlerWithSmallQueue = new MessageHandler(
        mockSubscriptionManager,
        smallQueueManager
      );

      const broadcastMessage = {
        type: 'bill_update',
        data: { status: 'passed' },
      };

      handlerWithSmallQueue.broadcastToSubscribers(123, broadcastMessage);

      // Only open connection should receive message
      expect(closedWebSocket.send).not.toHaveBeenCalled();
      expect(openWebSocket.send).toHaveBeenCalled();
    });
  });

  describe('pong message handling', () => {
    it('should handle pong message and update connection status', async () => {
      const message: WebSocketMessage = {
        type: 'pong',
        messageId: 'pong_test',
      };

      const initialPing = mockWebSocket.lastPing;
      await messageHandler.handleMessage(mockWebSocket, message);

      // Verify connection status was updated
      expect(mockWebSocket.isAlive).toBe(true);
      expect(mockWebSocket.lastPing).toBeGreaterThanOrEqual(initialPing);

      // Pong should not send a response
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return statistics object', () => {
      const stats = messageHandler.getStats();

      expect(stats).toHaveProperty('dedupeCacheSize');
      expect(stats).toHaveProperty('messageBufferSize');
      expect(stats).toHaveProperty('activeFlushTimers');
      expect(typeof stats.dedupeCacheSize).toBe('number');
      expect(typeof stats.messageBufferSize).toBe('number');
      expect(typeof stats.activeFlushTimers).toBe('number');
    });

    it('should reflect actual cache and buffer sizes', () => {
      // Send a message to populate deduplication cache
      const message: WebSocketMessage = {
        type: 'ping',
        messageId: 'stats_test',
      };

      messageHandler.handleMessage(mockWebSocket, message);

      const stats = messageHandler.getStats();
      expect(stats.dedupeCacheSize).toBeGreaterThan(0);
    });
  });
});