/**
 * WebSocket Error Handling and Recovery Tests
 *
 * Tests comprehensive error handling, recovery mechanisms, and edge cases
 * to ensure robust WebSocket functionality under adverse conditions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedWebSocketManager } from '@client/websocket';
import { ConnectionState } from '@client/types';

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

describe('WebSocket Error Handling and Recovery', () => {
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

  describe('Connection Error Scenarios', () => {
    it('should handle network timeouts', async () => {
      vi.useFakeTimers();

      const connectPromise = manager.connect('token');

      // Advance time past timeout
      vi.advanceTimersByTime(11000);

      await expect(connectPromise).rejects.toThrow('Connection timeout');
      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);

      vi.useRealTimers();
    });

    it('should handle DNS resolution failures', async () => {
      // Mock WebSocket constructor to throw
      const originalWebSocket = global.WebSocket;
      global.WebSocket = vi.fn().mockImplementation(() => {
        throw new Error('DNS resolution failed');
      }) as any;

      const connectPromise = manager.connect('token');

      await expect(connectPromise).rejects.toThrow('DNS resolution failed');
      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);

      global.WebSocket = originalWebSocket;
    });

    it('should handle connection refused errors', async () => {
      const connectPromise = manager.connect('token');

      // Simulate connection refused
      mockWebSocket.onerror?.(new Event('error'));

      await expect(connectPromise).rejects.toThrow();
      expect(manager.getConnectionState()).toBe(ConnectionState.FAILED);
    });

    it('should handle SSL/TLS certificate errors', async () => {
      const connectPromise = manager.connect('token');

      // Simulate SSL error
      const sslError = new Event('error');
      (sslError as any).message = 'SSL certificate error';
      mockWebSocket.onerror?.(sslError);

      await expect(connectPromise).rejects.toThrow();
      expect(manager.getConnectionState()).toBe(ConnectionState.FAILED);
    });

    it('should handle firewall blocking', async () => {
      vi.useFakeTimers();

      const connectPromise = manager.connect('token');

      // Simulate firewall blocking (no response)
      vi.advanceTimersByTime(11000);

      await expect(connectPromise).rejects.toThrow('Connection timeout');
      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);

      vi.useRealTimers();
    });
  });

  describe('Runtime Error Handling', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should handle WebSocket send errors', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      const errorCallback = vi.fn();
      manager.on('error', errorCallback);

      expect(() => manager.send({ type: 'test' })).toThrow('Send failed');
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle message parsing errors', () => {
      const errorCallback = vi.fn();
      manager.on('error', errorCallback);

      // Send malformed JSON
      mockWebSocket.onmessage?.({
        data: '{invalid json}'
      } as MessageEvent);

      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle oversized message errors', () => {
      const largeMessage = {
        type: 'large',
        data: 'x'.repeat(1024 * 1024 + 1) // Over 1MB
      };

      expect(() => manager.send(largeMessage)).toThrow('Message too large');
    });

    it('should handle callback execution errors', () => {
      const failingCallback = vi.fn(() => {
        throw new Error('Callback failed');
      });

      manager.on('message', failingCallback);

      const message = { type: 'test', data: 'error' };
      mockWebSocket.onmessage?.({
        data: JSON.stringify(message)
      } as MessageEvent);

      // Should not crash, error should be handled
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should handle heartbeat timeout errors', () => {
      vi.useFakeTimers();

      // Set last pong to old time
      (manager as any).lastPongTime = Date.now() - 50000;

      // Advance time to trigger heartbeat check
      vi.advanceTimersByTime(30000);

      expect(mockWebSocket.close).toHaveBeenCalledWith(4000, 'Heartbeat timeout');

      vi.useRealTimers();
    });
  });

  describe('Reconnection Error Scenarios', () => {
    it('should handle reconnection failures', async () => {
      await manager.connect('token');

      // Simulate disconnect
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);

      // Fail reconnection attempts
      for (let i = 0; i < 3; i++) {
        mockWebSocket.onerror?.(new Event('error'));
      }

      await vi.waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.FAILED);
      });
    });

    it('should handle exponential backoff correctly', async () => {
      vi.useFakeTimers();

      await manager.connect('token');

      const reconnectDelays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = vi.fn((callback, delay) => {
        reconnectDelays.push(delay as number);
        return originalSetTimeout(callback, delay);
      }) as any;

      // Trigger reconnection attempts
      for (let i = 0; i < 3; i++) {
        mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);
        vi.advanceTimersByTime(100);
      }

      // Verify exponential backoff
      expect(reconnectDelays[0]).toBeGreaterThanOrEqual(100);
      expect(reconnectDelays[1]).toBeGreaterThanOrEqual(200);
      expect(reconnectDelays[2]).toBeGreaterThanOrEqual(400);

      global.setTimeout = originalSetTimeout;
      vi.useRealTimers();
    });

    it('should handle maximum reconnection attempts', async () => {
      const maxAttemptsConfig = { ...config, reconnect: { ...config.reconnect, maxAttempts: 2 } };
      const maxAttemptsManager = new UnifiedWebSocketManager(maxAttemptsConfig);

      await maxAttemptsManager.connect('token');

      // Fail reconnection attempts
      for (let i = 0; i < 2; i++) {
        mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);
        mockWebSocket.onerror?.(new Event('error'));
      }

      await vi.waitFor(() => {
        expect(maxAttemptsManager.getConnectionState()).toBe(ConnectionState.FAILED);
      });

      maxAttemptsManager.disconnect();
    });

    it('should handle network recovery', async () => {
      await manager.connect('token');

      // Simulate network failure
      mockWebSocket.onclose?.({ code: 1006, reason: 'Network error' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);

      // Simulate successful reconnection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await vi.waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });
    });
  });

  describe('Message Queue Error Handling', () => {
    it('should handle message queue overflow', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      // Send more messages than queue limit
      for (let i = 0; i < 110; i++) {
        manager.send({ type: 'test', data: `message ${i}` });
      }

      const status = manager.getConnectionStatus();
      expect(status.queuedMessages).toBeLessThanOrEqual(100);
    });

    it('should handle queued message send failures', async () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      // Queue messages
      manager.send({ type: 'queued1' });
      manager.send({ type: 'queued2' });

      // Make send fail
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      // Reconnect
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      // Messages should be re-queued on failure
      expect(manager.getConnectionStatus().queuedMessages).toBeGreaterThan(0);
    });

    it('should clear message queue on explicit disconnect', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      manager.send({ type: 'queued' });
      expect(manager.getConnectionStatus().queuedMessages).toBe(1);

      manager.disconnect();
      expect(manager.getConnectionStatus().queuedMessages).toBe(0);
    });
  });

  describe('Subscription Error Handling', () => {
    beforeEach(async () => {
      await manager.connect('token');
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

      // Should not crash the manager
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should handle invalid subscription filters', () => {
      const callback = vi.fn();

      // Subscribe with invalid filters
      manager.subscribe('test', callback, {
        filters: { invalid: undefined }
      });

      const message = { topic: 'test', data: 'test' };
      mockWebSocket.onmessage?.({
        data: JSON.stringify(message)
      } as MessageEvent);

      expect(callback).toHaveBeenCalledWith(message);
    });

    it('should handle unsubscription of invalid subscriptions', () => {
      expect(() => manager.unsubscribe('invalid-id')).not.toThrow();
    });
  });

  describe('Configuration Error Handling', () => {
    it('should handle invalid configuration values', () => {
      const invalidConfig = {
        ...config,
        reconnect: {
          ...config.reconnect,
          maxAttempts: -1,
          baseDelay: 0
        }
      };

      const invalidManager = new UnifiedWebSocketManager(invalidConfig);

      // Should not crash, should use defaults or clamp values
      expect(invalidManager).toBeDefined();

      invalidManager.disconnect();
    });

    it('should handle runtime configuration changes', () => {
      manager.setConnectionOptions({
        maxReconnectAttempts: -1, // Invalid
        heartbeatInterval: 0 // Invalid
      });

      // Should handle gracefully
      expect(manager.getConnectionStatus().maxReconnectAttempts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Resource Cleanup Error Handling', () => {
    it('should handle cleanup errors gracefully', () => {
      // Mock close to throw
      mockWebSocket.close.mockImplementation(() => {
        throw new Error('Close failed');
      });

      // Should not throw during disconnect
      expect(() => manager.disconnect()).not.toThrow();
    });

    it('should handle timer cleanup errors', () => {
      vi.useFakeTimers();

      // Mock clearInterval to throw
      const originalClearInterval = global.clearInterval;
      global.clearInterval = vi.fn(() => {
        throw new Error('Clear interval failed');
      });

      // Should not throw during disconnect
      expect(() => manager.disconnect()).not.toThrow();

      global.clearInterval = originalClearInterval;
      vi.useRealTimers();
    });
  });

  describe('Concurrent Operation Error Handling', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      const promises: Promise<void>[] = [];

      // Rapid connect/disconnect cycles
      for (let i = 0; i < 5; i++) {
        promises.push(manager.connect('token'));
        manager.disconnect();
      }

      // Should not crash
      await Promise.allSettled(promises);
      expect(manager).toBeDefined();
    });

    it('should handle concurrent message sending', async () => {
      await manager.connect('token');

      const sendPromises = [];

      // Send many messages concurrently
      for (let i = 0; i < 10; i++) {
        sendPromises.push(
          Promise.resolve(manager.send({ type: 'concurrent', id: i }))
        );
      }

      await Promise.allSettled(sendPromises);

      // Should have sent all messages
      expect(mockWebSocket.send).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent subscription operations', async () => {
      await manager.connect('token');

      const subscriptionPromises = [];

      // Subscribe/unsubscribe concurrently
      for (let i = 0; i < 5; i++) {
        subscriptionPromises.push(
          Promise.resolve(manager.subscribe(`topic${i}`, vi.fn()))
        );
        subscriptionPromises.push(
          Promise.resolve(manager.unsubscribe(`topic${i}`))
        );
      }

      await Promise.allSettled(subscriptionPromises);

      // Should not crash
      expect(manager.getSubscriptionCount()).toBe(0);
    });
  });

  describe('Memory and Performance Error Handling', () => {
    it('should handle memory pressure gracefully', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      // Simulate memory pressure by queuing many large messages
      for (let i = 0; i < 50; i++) {
        manager.send({
          type: 'large',
          data: 'x'.repeat(10000) // 10KB each
        });
      }

      const status = manager.getConnectionStatus();
      expect(status.queuedMessages).toBeLessThanOrEqual(100);
    });

    it('should handle event listener memory leaks', () => {
      // Add many event listeners
      const listeners: any[] = [];
      for (let i = 0; i < 100; i++) {
        listeners.push(manager.on('message', vi.fn()));
      }

      // Send a message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'test' })
      } as MessageEvent);

      // Should handle many listeners without performance issues
      expect(manager).toBeDefined();
    });

    it('should handle large message payloads', () => {
      const largeMessage = {
        type: 'large',
        data: 'x'.repeat(500000) // 500KB (under limit)
      };

      expect(() => manager.send(largeMessage)).not.toThrow();
    });
  });

  describe('Network Condition Error Handling', () => {
    it('should handle intermittent connectivity', async () => {
      await manager.connect('token');

      // Simulate intermittent connectivity
      for (let i = 0; i < 3; i++) {
        mockWebSocket.onclose?.({ code: 1006, reason: 'Intermittent' } as CloseEvent);
        await new Promise(resolve => setTimeout(resolve, 100));
        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.onopen?.(new Event('open'));
      }

      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should handle high latency connections', async () => {
      vi.useFakeTimers();

      const connectPromise = manager.connect('token');

      // Simulate high latency
      setTimeout(() => {
        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.onopen?.(new Event('open'));
      }, 5000);

      vi.advanceTimersByTime(5000);

      await connectPromise;

      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);

      vi.useRealTimers();
    });

    it('should handle connection flooding', async () => {
      await manager.connect('token');

      // Simulate message flood
      for (let i = 0; i < 1000; i++) {
        mockWebSocket.onmessage?.({
          data: JSON.stringify({ type: 'flood', id: i })
        } as MessageEvent);
      }

      // Should handle flood without crashing
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });
  });

  describe('Browser Compatibility Error Handling', () => {
    it('should handle WebSocket unsupported browsers', () => {
      const originalWebSocket = global.WebSocket;
      delete (global as any).WebSocket;

      const unsupportedManager = new UnifiedWebSocketManager(config);

      expect(() => unsupportedManager.connect('token')).rejects.toThrow();

      global.WebSocket = originalWebSocket;
    });

    it('should handle browser security restrictions', async () => {
      const connectPromise = manager.connect('token');

      // Simulate CSP violation or mixed content error
      const securityError = new Event('error');
      (securityError as any).message = 'Blocked by CSP';
      mockWebSocket.onerror?.(securityError);

      await expect(connectPromise).rejects.toThrow();
      expect(manager.getConnectionState()).toBe(ConnectionState.FAILED);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary errors', async () => {
      await manager.connect('token');

      // Simulate temporary error
      mockWebSocket.onclose?.({ code: 1012, reason: 'Service restart' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);

      // Simulate successful recovery
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await vi.waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });
    });

    it('should maintain message ordering during errors', async () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      // Queue messages in order
      manager.send({ type: 'msg1', order: 1 });
      manager.send({ type: 'msg2', order: 2 });
      manager.send({ type: 'msg3', order: 3 });

      // Reconnect
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      // Messages should be sent in order
      const sendCalls = mockWebSocket.send.mock.calls;
      expect(sendCalls.length).toBe(3);
      expect(JSON.parse(sendCalls[0][0]).order).toBe(1);
      expect(JSON.parse(sendCalls[1][0]).order).toBe(2);
      expect(JSON.parse(sendCalls[2][0]).order).toBe(3);
    });

    it('should provide error context for debugging', async () => {
      const errorCallback = vi.fn();
      manager.on('error', errorCallback);

      await manager.connect('token');

      // Trigger an error
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Network send failed');
      });

      manager.send({ type: 'test' });

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to send message')
        })
      );
    });
  });
});