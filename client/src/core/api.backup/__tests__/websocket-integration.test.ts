/**
 * WebSocket Integration Tests
 *
 * Tests the integration between UnifiedWebSocketManager, middleware, and React hooks
 * to ensure end-to-end functionality works correctly.
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { UnifiedWebSocketManager, globalWebSocketPool } from '@client/websocket';
import { WebSocketConfig, ConnectionState } from '@client/types';

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

// Mock React
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useEffect: vi.fn(),
    useState: vi.fn(),
    useCallback: vi.fn(),
    useRef: vi.fn(),
    useMemo: vi.fn(),
  };
});

// Mock error handler
vi.mock('../errors', () => ({
  globalErrorHandler: {
    handleError: vi.fn()
  }
}));

describe('WebSocket Integration Tests', () => {
  let manager: UnifiedWebSocketManager;
  let config: WebSocketConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      url: 'ws://localhost:8080',
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
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

  describe('Connection Lifecycle Integration', () => {
    it('should handle complete connection lifecycle', async () => {
      const connectedCallback = vi.fn();
      const disconnectedCallback = vi.fn();

      manager.on('connected', connectedCallback);
      manager.on('disconnected', disconnectedCallback);

      // Connect
      const connectPromise = manager.connect('test-token');
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await connectPromise;

      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(connectedCallback).toHaveBeenCalled();

      // Disconnect
      manager.disconnect();

      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(disconnectedCallback).toHaveBeenCalled();
    });

    it('should handle reconnection after unexpected disconnect', async () => {
      await manager.connect('token');

      // Simulate unexpected disconnect
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);

      // Simulate successful reconnection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });
    });

    it('should handle connection failure and retry', async () => {
      const connectPromise = manager.connect('token');

      // Simulate connection failure
      mockWebSocket.onerror?.(new Event('error'));

      await expect(connectPromise).rejects.toThrow();

      expect(manager.getConnectionState()).toBe(ConnectionState.FAILED);
    });
  });

  describe('Message Flow Integration', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should handle bill update message flow', async () => {
      const billUpdateCallback = vi.fn();

      manager.on('billUpdate', billUpdateCallback);

      const billUpdateMessage = {
        type: 'bill_update',
        bill_id: 123,
        update: {
          type: 'status_change',
          data: {
            bill_id: 123,
            oldStatus: 'introduced',
            newStatus: 'committee'
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(billUpdateMessage)
      } as MessageEvent);

      expect(billUpdateCallback).toHaveBeenCalledWith({
        bill_id: 123,
        update: billUpdateMessage.update,
        timestamp: billUpdateMessage.timestamp
      });
    });

    it('should handle notification message flow', async () => {
      const notificationCallback = vi.fn();

      manager.on('notification', notificationCallback);

      const notificationMessage = {
        type: 'notification',
        notification: {
          type: 'info',
          title: 'Bill Updated',
          message: 'Bill 123 has been updated',
          data: { bill_id: 123 }
        }
      };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(notificationMessage)
      } as MessageEvent);

      expect(notificationCallback).toHaveBeenCalledWith(notificationMessage.notification);
    });

    it('should handle subscription and message routing', async () => {
      const callback = vi.fn();

      // Subscribe to bills topic
      manager.subscribe('bills', callback);

      const message = {
        topic: 'bills',
        data: { id: 123, status: 'updated' },
        timestamp: Date.now()
      };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(message)
      } as MessageEvent);

      expect(callback).toHaveBeenCalledWith(message);
    });

    it('should handle bill-specific subscriptions', async () => {
      const subscriptionId = manager.subscribeToBill(123, ['status_change']);

      expect(subscriptionId).toBe('bill_123');
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        data: { bill_id: 123, subscriptionTypes: ['status_change'] }
      }));
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle connection errors gracefully', async () => {
      const errorCallback = vi.fn();

      manager.on('error', errorCallback);

      const connectPromise = manager.connect('token');

      // Simulate connection error
      mockWebSocket.onerror?.(new Event('error'));

      await expect(connectPromise).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle message parsing errors', async () => {
      await manager.connect('token');

      const errorCallback = vi.fn();
      manager.on('error', errorCallback);

      // Send malformed JSON
      mockWebSocket.onmessage?.({
        data: 'invalid json'
      } as MessageEvent);

      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle oversized message errors', async () => {
      await manager.connect('token');

      const largeMessage = { type: 'test', data: 'x'.repeat(1024 * 1024 + 1) };

      expect(() => manager.send(largeMessage)).toThrow('Message too large');
    });
  });

  describe('Heartbeat Integration', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await manager.connect('token');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send heartbeat pings', () => {
      vi.advanceTimersByTime(30000); // Heartbeat interval

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    });

    it('should handle pong responses', () => {
      const pongMessage = { type: 'pong', timestamp: Date.now() };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(pongMessage)
      } as MessageEvent);

      const metrics = manager.getConnectionMetrics();
      expect(metrics.lastPong).toBeDefined();
    });

    it('should detect heartbeat timeout', () => {
      // Set last pong to old time
      (manager as any).lastPongTime = Date.now() - 50000;

      vi.advanceTimersByTime(30000);

      expect(mockWebSocket.close).toHaveBeenCalledWith(4000, 'Heartbeat timeout');
    });
  });

  describe('Message Queue Integration', () => {
    it('should queue messages when offline and send on reconnect', async () => {
      // Set offline state
      mockWebSocket.readyState = WebSocket.CLOSED;

      // Try to send message while offline
      manager.send({ type: 'test', data: 'queued message' });

      const status = manager.getConnectionStatus();
      expect(status.queuedMessages).toBeGreaterThan(0);

      // Reconnect
      mockWebSocket.readyState = WebSocket.OPEN;
      await manager.connect('token');

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'test',
        data: 'queued message'
      }));
    });

    it('should limit message queue size', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      // Send more messages than queue limit
      for (let i = 0; i < 110; i++) {
        manager.send({ type: 'test', data: `message ${i}` });
      }

      const status = manager.getConnectionStatus();
      expect(status.queuedMessages).toBeLessThanOrEqual(100); // Max queue size
    });
  });

  describe('Connection Pool Integration', () => {
    it('should manage multiple connections through pool', () => {
      const pool = globalWebSocketPool;

      const conn1 = pool.getConnection('ws://test1.com');
      const conn2 = pool.getConnection('ws://test1.com');
      const conn3 = pool.getConnection('ws://test2.com');

      expect(conn1).toBe(conn2); // Same URL should return same connection
      expect(conn1).not.toBe(conn3); // Different URL should return different connection
    });

    it('should disconnect all connections in pool', () => {
      const pool = globalWebSocketPool;

      pool.getConnection('ws://test1.com');
      pool.getConnection('ws://test2.com');

      expect(pool.getAllConnections().length).toBe(2);

      pool.disconnectAll();

      expect(pool.getAllConnections().length).toBe(0);
    });
  });

  describe('Performance and Metrics Integration', () => {
    it('should track connection metrics', async () => {
      const startTime = Date.now();
      await manager.connect('token');

      const metrics = manager.getConnectionMetrics();

      expect(metrics.status).toBe(ConnectionState.CONNECTED);
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics.reconnectAttempts).toBe(0);
      expect(metrics.lastConnected).toBeDefined();
      expect(metrics.queuedMessages).toBe(0);
    });

    it('should provide connection status information', async () => {
      await manager.connect('token');

      const status = manager.getConnectionStatus();

      expect(status.connected).toBe(true);
      expect(status.reconnectAttempts).toBe(0);
      expect(status.readyState).toBe(WebSocket.OPEN);
      expect(status.state).toBe(ConnectionState.CONNECTED);
    });
  });

  describe('Configuration Integration', () => {
    it('should apply runtime configuration changes', () => {
      manager.setConnectionOptions({
        maxReconnectAttempts: 10,
        heartbeatInterval: 60000
      });

      // Configuration should be updated internally
      expect(manager.getConnectionStatus().maxReconnectAttempts).toBe(10);
    });

    it('should reset reconnection attempts', () => {
      (manager as any).reconnectAttempts = 3;
      manager.resetReconnectionAttempts();

      expect(manager.getConnectionMetrics().reconnectAttempts).toBe(0);
    });
  });

  describe('End-to-End Message Flow', () => {
    it('should handle complete message flow from subscription to delivery', async () => {
      const messageCallback = vi.fn();

      // Subscribe to topic
      manager.subscribe('bills', messageCallback, { priority: 'high' });

      // Connect
      await manager.connect('token');

      // Send message through WebSocket
      const testMessage = {
        topic: 'bills',
        data: { billId: 123, action: 'updated' },
        timestamp: Date.now()
      };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(testMessage)
      } as MessageEvent);

      expect(messageCallback).toHaveBeenCalledWith(testMessage);
    });

    it('should handle batched message processing', async () => {
      const batchConfig = { ...config, message: { ...config.message, batching: true } };
      const batchManager = new UnifiedWebSocketManager(batchConfig);

      await batchManager.connect('token');

      vi.useFakeTimers();

      // Send multiple messages
      batchManager.send({ type: 'msg1', data: 'test1' });
      batchManager.send({ type: 'msg2', data: 'test2' });

      // Advance time to trigger batch processing
      vi.advanceTimersByTime(1000);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'batch',
        messages: [
          { type: 'msg1', data: 'test1' },
          { type: 'msg2', data: 'test2' }
        ],
        timestamp: expect.any(Number)
      }));

      vi.useRealTimers();
      batchManager.disconnect();
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from connection failures', async () => {
      // First connection attempt fails
      const firstConnectPromise = manager.connect('token');
      mockWebSocket.onerror?.(new Event('error'));
      await expect(firstConnectPromise).rejects.toThrow();

      // Second connection attempt succeeds
      const secondConnectPromise = manager.connect('token');
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));
      await secondConnectPromise;

      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should handle network interruptions gracefully', async () => {
      await manager.connect('token');

      // Simulate network interruption
      mockWebSocket.onclose?.({ code: 1006, reason: 'Network error' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);

      // Simulate successful reconnection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });
    });
  });
});