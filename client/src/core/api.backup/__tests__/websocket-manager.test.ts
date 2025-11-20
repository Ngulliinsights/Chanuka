/**
 * UnifiedWebSocketManager Unit Tests
 *
 * Comprehensive tests for the UnifiedWebSocketManager core functionality
 * including connection management, message handling, subscriptions, and error recovery.
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { UnifiedWebSocketManager, WebSocketConnectionPool, globalWebSocketPool } from '../websocket';
import { WebSocketConfig, ConnectionState, BillUpdate, WebSocketNotification } from '@client/types';

// Mock WebSocket
const mockWebSocket = {
  readyState: 0 as number, // WebSocket.CONNECTING
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

// Mock global error handler
vi.mock('../errors', () => ({
  globalErrorHandler: {
    handleError: vi.fn()
  },
  ErrorFactory: {
    create: vi.fn()
  },
  ErrorCode: {
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT'
  }
}));

describe('UnifiedWebSocketManager', () => {
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

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(manager).toBeDefined();
      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should accept custom protocols', () => {
      const configWithProtocols = { ...config, protocols: ['chat', 'graphql-ws'] };
      const managerWithProtocols = new UnifiedWebSocketManager(configWithProtocols);

      expect(managerWithProtocols).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should establish WebSocket connection', async () => {
      const connectPromise = manager.connect('test-token');

      // Simulate successful connection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await connectPromise;

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080?token=test-token', undefined);
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should handle connection without token', async () => {
      const connectPromise = manager.connect();

      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await connectPromise;

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080', undefined);
    });

    it('should return existing connection promise for duplicate calls', async () => {
      const promise1 = manager.connect('token');
      const promise2 = manager.connect('token');

      expect(promise1).toStrictEqual(promise2);
    });

    it('should handle connection timeout', async () => {
      const connectPromise = manager.connect('token');

      vi.useFakeTimers();
      vi.advanceTimersByTime(11000); // Past 10-second timeout

      await expect(connectPromise).rejects.toThrow('Connection timeout');
      vi.useRealTimers();
    });

    it('should handle WebSocket errors during connection', async () => {
      const connectPromise = manager.connect('token');

      mockWebSocket.onerror?.(new Event('error'));

      await expect(connectPromise).rejects.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection cleanly', async () => {
      await manager.connect('token');
      manager.disconnect();

      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Client disconnect');
      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should clear message queue on disconnect', async () => {
      await manager.connect('token');
      manager.disconnect();

      const status = manager.getConnectionStatus();
      expect(status.queuedMessages).toBe(0);
    });
  });

  describe('subscription management', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should subscribe to topics', () => {
      const subscriptionId = manager.subscribe('bills', vi.fn(), { priority: 'high' });

      expect(typeof subscriptionId).toBe('string');
      expect(manager.getSubscriptionCount()).toBe(1);
    });

    it('should handle bill-specific subscriptions', () => {
      const subscriptionId = manager.subscribeToBill(123, ['status_change']);

      expect(typeof subscriptionId).toBe('string');
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        data: { bill_id: 123, subscriptionTypes: ['status_change'] }
      }));
    });

    it('should unsubscribe from topics', () => {
      const subscriptionId = manager.subscribe('bills', vi.fn());
      manager.unsubscribe(subscriptionId);

      expect(manager.getSubscriptionCount()).toBe(0);
    });

    it('should unsubscribe from bill updates', () => {
      manager.unsubscribeFromBill(123);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'unsubscribe',
        data: { bill_id: 123 }
      }));
    });

    it('should queue subscriptions when offline', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      manager.subscribeToBill(123);

      const status = manager.getConnectionStatus();
      expect(status.queuedMessages).toBeGreaterThan(0);
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should route messages to subscribers', () => {
      const callback = vi.fn();
      manager.subscribe('bills', callback);

      const message = { topic: 'bills', data: { id: 123 } };
      mockWebSocket.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);

      expect(callback).toHaveBeenCalledWith(message);
    });

    it('should handle bill update messages', () => {
      const callback = vi.fn();
      manager.on('billUpdate', callback);

      const message = {
        type: 'bill_update',
        bill_id: 123,
        update: { type: 'status_change', data: { bill_id: 123 } },
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockWebSocket.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);

      expect(callback).toHaveBeenCalledWith({
        bill_id: 123,
        update: message.update,
        timestamp: message.timestamp
      });
    });

    it('should handle notification messages', () => {
      const callback = vi.fn();
      manager.on('notification', callback);

      const message = {
        type: 'notification',
        notification: { type: 'info', title: 'Test', message: 'Test notification' }
      };

      mockWebSocket.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);

      expect(callback).toHaveBeenCalledWith(message.notification);
    });

    it('should handle heartbeat messages', () => {
      const message = { type: 'heartbeat', timestamp: Date.now() };
      mockWebSocket.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);

      // Should update last pong time
      expect(manager.getConnectionMetrics().lastPong).toBeDefined();
    });

    it('should handle pong messages', () => {
      const message = { type: 'pong', timestamp: Date.now() };
      mockWebSocket.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);

      expect(manager.getConnectionMetrics().lastPong).toBeDefined();
    });

    it('should handle malformed JSON gracefully', () => {
      const errorCallback = vi.fn();
      manager.on('error', errorCallback);

      mockWebSocket.onmessage?.({ data: 'invalid json' } as MessageEvent);

      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('message sending', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should send messages when connected', () => {
      const message = { type: 'test', data: 'test data' };
      manager.send(message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should queue messages when offline', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      const message = { type: 'test', data: 'test data' };
      manager.send(message);

      const status = manager.getConnectionStatus();
      expect(status.queuedMessages).toBeGreaterThan(0);
    });

    it('should reject oversized messages', () => {
      const largeMessage = { type: 'test', data: 'x'.repeat(1024 * 1024 + 1) };

      expect(() => manager.send(largeMessage)).toThrow('Message too large');
    });
  });

  describe('reconnection logic', () => {
    it('should attempt reconnection on unexpected disconnect', async () => {
      await manager.connect('token');

      // Simulate unexpected disconnect
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);
    });

    it('should respect max reconnection attempts', async () => {
      await manager.connect('token');

      // Simulate multiple failures
      for (let i = 0; i < 6; i++) {
        mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);
      }

      expect(manager.getConnectionState()).toBe(ConnectionState.FAILED);
    });

    it('should use exponential backoff', async () => {
      vi.useFakeTimers();
      await manager.connect('token');

      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

      // First reconnect attempt should happen after base delay
      vi.advanceTimersByTime(1000);
      expect(global.WebSocket).toHaveBeenCalledTimes(2); // Original + 1 reconnect

      vi.useRealTimers();
    });

    it('should resubscribe to topics after reconnection', async () => {
      const callback = vi.fn();
      manager.subscribe('bills', callback);

      await manager.connect('token');

      // Simulate reconnection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      // Should have sent subscription message
      expect(mockWebSocket.send).toHaveBeenCalled();
    });
  });

  describe('heartbeat functionality', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await manager.connect('token');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send ping messages at regular intervals', () => {
      vi.advanceTimersByTime(30000); // Heartbeat interval

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    });

    it('should close connection on heartbeat timeout', () => {
      // Set last pong to old time
      (manager as any).lastPongTime = Date.now() - 50000;

      vi.advanceTimersByTime(30000);

      expect(mockWebSocket.close).toHaveBeenCalledWith(4000, 'Heartbeat timeout');
    });
  });

  describe('message batching', () => {
    it('should batch messages when enabled', async () => {
      const batchConfig = { ...config, message: { ...config.message, batching: true } };
      const batchManager = new UnifiedWebSocketManager(batchConfig);

      await batchManager.connect('token');

      vi.useFakeTimers();
      batchManager.send({ type: 'test1' });
      batchManager.send({ type: 'test2' });

      vi.advanceTimersByTime(1000); // Batch interval

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'batch',
        messages: [{ type: 'test1' }, { type: 'test2' }],
        timestamp: expect.any(Number)
      }));

      vi.useRealTimers();
      batchManager.disconnect();
    });
  });

  describe('connection metrics', () => {
    it('should provide comprehensive connection metrics', async () => {
      await manager.connect('token');

      const metrics = manager.getConnectionMetrics();

      expect(metrics).toHaveProperty('status');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('reconnectAttempts');
      expect(metrics).toHaveProperty('lastConnected');
      expect(metrics).toHaveProperty('lastPong');
      expect(metrics).toHaveProperty('queuedMessages');
    });

    it('should provide connection status', async () => {
      await manager.connect('token');

      const status = manager.getConnectionStatus();

      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('reconnectAttempts');
      expect(status).toHaveProperty('readyState');
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('queuedMessages');
    });
  });

  describe('configuration options', () => {
    it('should allow runtime configuration changes', () => {
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

  describe('event system', () => {
    it('should emit connection events', async () => {
      const connectedCallback = vi.fn();
      const disconnectedCallback = vi.fn();

      manager.on('connected', connectedCallback);
      manager.on('disconnected', disconnectedCallback);

      await manager.connect('token');
      manager.disconnect();

      expect(connectedCallback).toHaveBeenCalled();
      expect(disconnectedCallback).toHaveBeenCalled();
    });

    it('should handle multiple event listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.on('connected', callback1);
      manager.on('connected', callback2);

      // Use the event emitter directly since emit is private
      (manager as any).eventEmitter.emit('connected', { timestamp: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle WebSocket errors', async () => {
      const errorCallback = vi.fn();
      manager.on('error', errorCallback);

      // Connect first to set up error handling
      const connectPromise = manager.connect('token');
      mockWebSocket.onerror?.(new Event('error'));

      await expect(connectPromise).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle send errors', async () => {
      await manager.connect('token');

      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      expect(() => manager.send({ type: 'test' })).toThrow('Send failed');
    });
  });
});

describe('WebSocketConnectionPool', () => {
  let pool: WebSocketConnectionPool;
  let config: WebSocketConfig;

  beforeEach(() => {
    config = {
      url: 'ws://localhost:8080',
      reconnect: { enabled: true, maxAttempts: 5, baseDelay: 1000, maxDelay: 30000, backoffMultiplier: 2 },
      heartbeat: { enabled: true, interval: 30000, timeout: 45000 },
      message: { compression: false, batching: false, batchSize: 10, batchInterval: 1000 }
    };
    pool = new WebSocketConnectionPool(config);
  });

  afterEach(() => {
    pool.disconnectAll();
  });

  it('should create and reuse connections', () => {
    const conn1 = pool.getConnection('ws://test1.com');
    const conn2 = pool.getConnection('ws://test1.com');
    const conn3 = pool.getConnection('ws://test2.com');

    expect(conn1).toBe(conn2);
    expect(conn1).not.toBe(conn3);
  });

  it('should disconnect individual connections', () => {
    const conn = pool.getConnection('ws://test.com');
    const disconnectSpy = vi.spyOn(conn, 'disconnect');

    pool.removeConnection('ws://test.com');

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should disconnect all connections', () => {
    pool.getConnection('ws://test1.com');
    pool.getConnection('ws://test2.com');

    const connections = pool.getAllConnections();
    expect(connections.length).toBe(2);

    pool.disconnectAll();

    expect(pool.getAllConnections().length).toBe(0);
  });
});

describe('globalWebSocketPool', () => {
  it('should be properly configured', () => {
    expect(globalWebSocketPool).toBeDefined();
    expect(globalWebSocketPool).toBeInstanceOf(WebSocketConnectionPool);
  });

  it('should create connections with default config', () => {
    const conn = globalWebSocketPool.getConnection('ws://test.com');
    expect(conn).toBeDefined();
    expect(conn).toBeInstanceOf(UnifiedWebSocketManager);
  });
});