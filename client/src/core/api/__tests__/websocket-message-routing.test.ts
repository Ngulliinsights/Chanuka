/**
 * WebSocket Message Handling and Routing Tests
 *
 * Tests message parsing, routing, subscription filtering, and error handling
 * to ensure reliable message delivery and processing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedWebSocketManager } from '../websocket';
import { ConnectionState } from '../types';

// Mock WebSocket
const mockWebSocket = {
  readyState: 0 as number,
  send: vi.fn(),
  close: vi.fn(),
  onopen: null as any,
  onmessage: null as any,
  onclose: null as any,
  onerror: null as any,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket) as any;

// Mock error handler
vi.mock('../errors', () => ({
  globalErrorHandler: {
    handleError: vi.fn()
  }
}));

describe('WebSocket Message Handling and Routing', () => {
  let manager: UnifiedWebSocketManager;
  let config: any;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      url: 'ws://localhost:8080',
      reconnect: {
        enabled: true,
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 45000
      },
      message: {
        compression: false,
        batching: false,
        batchSize: 10,
        batchInterval: 1000
      }
    };
    manager = new UnifiedWebSocketManager(config);
    mockWebSocket.readyState = WebSocket.CONNECTING;
  });

  afterEach(() => {
    manager.disconnect();
  });

  describe('Message Parsing', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should parse valid JSON messages', () => {
      const callback = vi.fn();
      manager.on('message', callback);

      const testMessage = { type: 'test', data: 'hello' };
      mockWebSocket.onmessage?.({
        data: JSON.stringify(testMessage)
      } as MessageEvent);

      expect(callback).toHaveBeenCalledWith(testMessage);
    });

    it('should handle malformed JSON gracefully', () => {
      const errorCallback = vi.fn();
      manager.on('error', errorCallback);

      mockWebSocket.onmessage?.({
        data: 'invalid json {{{'
      } as MessageEvent);

      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle empty messages', () => {
      const callback = vi.fn();
      manager.on('message', callback);

      mockWebSocket.onmessage?.({
        data: ''
      } as MessageEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle null messages', () => {
      const callback = vi.fn();
      manager.on('message', callback);

      mockWebSocket.onmessage?.({
        data: 'null'
      } as MessageEvent);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('Message Routing', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should route messages to all subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.on('message', callback1);
      manager.on('message', callback2);

      const testMessage = { type: 'broadcast', data: 'all' };
      mockWebSocket.onmessage?.({
        data: JSON.stringify(testMessage)
      } as MessageEvent);

      expect(callback1).toHaveBeenCalledWith(testMessage);
      expect(callback2).toHaveBeenCalledWith(testMessage);
    });

    it('should route bill update messages correctly', () => {
      const billCallback = vi.fn();

      manager.on('billUpdate', billCallback);

      const billUpdate = {
        type: 'bill_update',
        bill_id: 123,
        update: {
          type: 'status_change',
          data: { bill_id: 123, oldStatus: 'introduced', newStatus: 'passed' }
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(billUpdate)
      } as MessageEvent);

      expect(billCallback).toHaveBeenCalledWith({
        bill_id: 123,
        update: billUpdate.update,
        timestamp: billUpdate.timestamp
      });
    });

    it('should route notification messages correctly', () => {
      const notificationCallback = vi.fn();

      manager.on('notification', notificationCallback);

      const notification = {
        type: 'notification',
        notification: {
          type: 'info',
          title: 'Bill Updated',
          message: 'Bill 123 has been updated',
          data: { bill_id: 123 }
        }
      };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(notification)
      } as MessageEvent);

      expect(notificationCallback).toHaveBeenCalledWith(notification.notification);
    });

    it('should handle batched updates', () => {
      const batchedCallback = vi.fn();

      manager.on('batchedUpdates', batchedCallback);

      const batchedUpdate = {
        type: 'batched_bill_updates',
        notification: {
          type: 'batch',
          title: 'Multiple Updates',
          message: 'Several bills have been updated',
          data: { bill_ids: [123, 124, 125] }
        }
      };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(batchedUpdate)
      } as MessageEvent);

      expect(batchedCallback).toHaveBeenCalledWith(batchedUpdate.notification);
    });
  });

  describe('Subscription Filtering', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should filter messages by topic subscription', () => {
      const billsCallback = vi.fn();
      const usersCallback = vi.fn();

      manager.subscribe('bills', billsCallback);
      manager.subscribe('users', usersCallback);

      // Send bills message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ topic: 'bills', data: { id: 123 } })
      } as MessageEvent);

      // Send users message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ topic: 'users', data: { id: 456 } })
      } as MessageEvent);

      expect(billsCallback).toHaveBeenCalledWith({ topic: 'bills', data: { id: 123 } });
      expect(usersCallback).toHaveBeenCalledWith({ topic: 'users', data: { id: 456 } });
    });

    it('should support wildcard topic subscriptions', () => {
      const wildcardCallback = vi.fn();
      const specificCallback = vi.fn();

      manager.subscribe('*', wildcardCallback);
      manager.subscribe('bills', specificCallback);

      const message = { topic: 'bills', data: { id: 123 } };
      mockWebSocket.onmessage?.({
        data: JSON.stringify(message)
      } as MessageEvent);

      expect(wildcardCallback).toHaveBeenCalledWith(message);
      expect(specificCallback).toHaveBeenCalledWith(message);
    });

    it('should filter messages by subscription criteria', () => {
      const callback = vi.fn();

      manager.subscribe('bills', callback, {
        filters: { status: 'passed', urgency: 'high' }
      });

      // Matching message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          topic: 'bills',
          status: 'passed',
          urgency: 'high',
          id: 123
        })
      } as MessageEvent);

      // Non-matching message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          topic: 'bills',
          status: 'introduced',
          urgency: 'low',
          id: 124
        })
      } as MessageEvent);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        topic: 'bills',
        status: 'passed',
        urgency: 'high',
        id: 123
      });
    });

    it('should support array filters', () => {
      const callback = vi.fn();

      manager.subscribe('bills', callback, {
        filters: { status: ['passed', 'failed'] }
      });

      // Matching messages
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ topic: 'bills', status: 'passed', id: 123 })
      } as MessageEvent);

      mockWebSocket.onmessage?.({
        data: JSON.stringify({ topic: 'bills', status: 'failed', id: 124 })
      } as MessageEvent);

      // Non-matching message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ topic: 'bills', status: 'introduced', id: 125 })
      } as MessageEvent);

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Bill-Specific Subscriptions', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should handle bill subscriptions with types', () => {
      const subscriptionId = manager.subscribeToBill(123, ['status_change', 'new_comment']);

      expect(subscriptionId).toBe('bill_123');
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        data: { bill_id: 123, subscriptionTypes: ['status_change', 'new_comment'] }
      }));
    });

    it('should handle bill subscriptions without types', () => {
      const subscriptionId = manager.subscribeToBill(456);

      expect(subscriptionId).toBe('bill_456');
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        data: { bill_id: 456, subscriptionTypes: undefined }
      }));
    });

    it('should handle bill unsubscriptions', () => {
      manager.subscribeToBill(123);
      manager.unsubscribeFromBill(123);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'unsubscribe',
        data: { bill_id: 123 }
      }));
    });

    it('should queue bill subscriptions when offline', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      manager.subscribeToBill(123);

      expect(manager.getConnectionStatus().queuedMessages).toBe(1);

      // Reconnect and verify message is sent
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        data: { bill_id: 123, subscriptionTypes: undefined }
      }));
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should send messages when connected', () => {
      const message = { type: 'test', data: 'hello' };

      manager.send(message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should queue messages when offline', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      const message = { type: 'queued', data: 'message' };
      manager.send(message);

      expect(manager.getConnectionStatus().queuedMessages).toBe(1);
      expect(mockWebSocket.send).not.toHaveBeenCalled();

      // Reconnect and verify message is sent
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should reject oversized messages', () => {
      const largeMessage = {
        type: 'large',
        data: 'x'.repeat(1024 * 1024 + 1) // Over 1MB
      };

      expect(() => manager.send(largeMessage)).toThrow('Message too large');
    });

    it('should handle send errors gracefully', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      const errorCallback = vi.fn();
      manager.on('error', errorCallback);

      const message = { type: 'test', data: 'fail' };

      expect(() => manager.send(message)).toThrow('Send failed');
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('Heartbeat Message Handling', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should handle ping messages', () => {
      const pingMessage = { type: 'ping', timestamp: Date.now() };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(pingMessage)
      } as MessageEvent);

      // Should respond with pong (handled internally)
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }));
    });

    it('should handle pong messages', () => {
      const pongMessage = { type: 'pong', timestamp: Date.now() };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(pongMessage)
      } as MessageEvent);

      const metrics = manager.getConnectionMetrics();
      expect(metrics.lastPong).toBeDefined();
    });

    it('should ignore unknown heartbeat message types', () => {
      const unknownMessage = { type: 'unknown', data: 'test' };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(unknownMessage)
      } as MessageEvent);

      // Should not crash, just route to general message handler
      expect(manager.getConnectionMetrics()).toBeDefined();
    });
  });

  describe('Message Compression', () => {
    it('should handle compressed messages when enabled', async () => {
      const compressedConfig = { ...config, message: { ...config.message, compression: true } };
      const compressedManager = new UnifiedWebSocketManager(compressedConfig);

      await compressedManager.connect('token');

      const callback = vi.fn();
      compressedManager.on('message', callback);

      // Mock decompression (would normally be handled by a compression library)
      const originalDecompress = (compressedManager as any).decompressMessage;
      (compressedManager as any).decompressMessage = vi.fn(() => ({ type: 'compressed', data: 'decompressed' }));

      mockWebSocket.onmessage?.({
        data: 'compressed_data'
      } as MessageEvent);

      expect(callback).toHaveBeenCalledWith({ type: 'compressed', data: 'decompressed' });

      compressedManager.disconnect();
    });
  });

  describe('Message Batching', () => {
    it('should batch messages when enabled', async () => {
      vi.useFakeTimers();

      const batchConfig = { ...config, message: { ...config.message, batching: true } };
      const batchManager = new UnifiedWebSocketManager(batchConfig);

      await batchManager.connect('token');

      // Send multiple messages
      batchManager.send({ type: 'msg1', data: 'test1' });
      batchManager.send({ type: 'msg2', data: 'test2' });
      batchManager.send({ type: 'msg3', data: 'test3' });

      // Advance time to trigger batch processing
      vi.advanceTimersByTime(1000);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'batch',
        messages: [
          { type: 'msg1', data: 'test1' },
          { type: 'msg2', data: 'test2' },
          { type: 'msg3', data: 'test3' }
        ],
        timestamp: expect.any(Number)
      }));

      vi.useRealTimers();
      batchManager.disconnect();
    });

    it('should respect batch size limits', async () => {
      vi.useFakeTimers();

      const batchConfig = {
        ...config,
        message: { ...config.message, batching: true, batchSize: 2 }
      };
      const batchManager = new UnifiedWebSocketManager(batchConfig);

      await batchManager.connect('token');

      // Send more messages than batch size
      batchManager.send({ type: 'msg1', data: 'test1' });
      batchManager.send({ type: 'msg2', data: 'test2' });
      batchManager.send({ type: 'msg3', data: 'test3' });

      vi.advanceTimersByTime(1000);

      // Should send two batches
      expect(mockWebSocket.send).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
      batchManager.disconnect();
    });
  });

  describe('Error Handling in Message Processing', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn();
      const failingCallback = vi.fn(() => {
        throw new Error('Callback failed');
      });

      manager.on('message', failingCallback);
      manager.on('error', errorCallback);

      const message = { type: 'test', data: 'error' };
      mockWebSocket.onmessage?.({
        data: JSON.stringify(message)
      } as MessageEvent);

      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle subscription callback errors', () => {
      const failingCallback = vi.fn(() => {
        throw new Error('Subscription callback failed');
      });

      manager.subscribe('test', failingCallback);

      const message = { topic: 'test', data: 'error' };
      mockWebSocket.onmessage?.({
        data: JSON.stringify(message)
      } as MessageEvent);

      // Should not crash the message processing
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should handle message routing errors', () => {
      // Create a message that causes routing errors
      const message = { topic: 'nonexistent', data: 'test' };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(message)
      } as MessageEvent);

      // Should handle gracefully without throwing
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should generate unique subscription IDs', () => {
      const id1 = manager.subscribe('topic1', vi.fn());
      const id2 = manager.subscribe('topic2', vi.fn());

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should allow unsubscribing from specific subscriptions', () => {
      const callback = vi.fn();
      const subscriptionId = manager.subscribe('test', callback);

      manager.unsubscribe(subscriptionId);

      // Send message - callback should not be called
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ topic: 'test', data: 'message' })
      } as MessageEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle unsubscription of non-existent subscriptions', () => {
      expect(() => manager.unsubscribe('nonexistent')).not.toThrow();
    });

    it('should provide subscription count', () => {
      expect(manager.getSubscriptionCount()).toBe(0);

      manager.subscribe('topic1', vi.fn());
      manager.subscribe('topic2', vi.fn());

      expect(manager.getSubscriptionCount()).toBe(2);
    });
  });

  describe('Event System Integration', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should emit events for different message types', () => {
      const messageCallback = vi.fn();
      const billCallback = vi.fn();
      const notificationCallback = vi.fn();

      manager.on('message', messageCallback);
      manager.on('billUpdate', billCallback);
      manager.on('notification', notificationCallback);

      // Send different message types
      const messages = [
        { type: 'generic', data: 'test' },
        {
          type: 'bill_update',
          bill_id: 123,
          update: { type: 'status_change' },
          timestamp: '2024-01-01T00:00:00Z'
        },
        {
          type: 'notification',
          notification: { type: 'info', title: 'Test', message: 'Test message' }
        }
      ];

      messages.forEach(message => {
        mockWebSocket.onmessage?.({
          data: JSON.stringify(message)
        } as MessageEvent);
      });

      expect(messageCallback).toHaveBeenCalledTimes(3);
      expect(billCallback).toHaveBeenCalledTimes(1);
      expect(notificationCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle event listener cleanup', () => {
      const callback = vi.fn();

      manager.on('message', callback);

      // Send message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'test' })
      } as MessageEvent);

      expect(callback).toHaveBeenCalledTimes(1);

      // Remove listener
      manager.off('message', callback);

      // Send another message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'test2' })
      } as MessageEvent);

      expect(callback).toHaveBeenCalledTimes(1); // Still only called once
    });
  });
});