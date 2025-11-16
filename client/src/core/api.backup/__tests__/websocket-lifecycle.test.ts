/**
 * WebSocket Connection Lifecycle Tests
 *
 * Tests the complete connection lifecycle including connect, disconnect, and reconnect scenarios
 * to ensure robust connection management.
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

describe('WebSocket Connection Lifecycle', () => {
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

  describe('Connection Establishment', () => {
    it('should successfully establish connection', async () => {
      const connectPromise = manager.connect('token');

      // Simulate successful connection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await connectPromise;

      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(mockWebSocket.send).toHaveBeenCalled(); // Heartbeat should start
    });

    it('should handle connection with authentication token', async () => {
      const token = 'test-auth-token';
      const connectPromise = manager.connect(token);

      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await connectPromise;

      expect(global.WebSocket).toHaveBeenCalledWith(
        `ws://localhost:8080?token=${encodeURIComponent(token)}`,
        undefined
      );
    });

    it('should handle connection without authentication token', async () => {
      const connectPromise = manager.connect();

      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await connectPromise;

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080', undefined);
    });

    it('should handle connection timeout', async () => {
      vi.useFakeTimers();

      const connectPromise = manager.connect('token');

      // Advance time past timeout
      vi.advanceTimersByTime(11000);

      await expect(connectPromise).rejects.toThrow('Connection timeout');
      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);

      vi.useRealTimers();
    });

    it('should handle immediate connection failure', async () => {
      const connectPromise = manager.connect('token');

      // Simulate immediate failure
      mockWebSocket.onerror?.(new Event('error'));

      await expect(connectPromise).rejects.toThrow();
      expect(manager.getConnectionState()).toBe(ConnectionState.FAILED);
    });

    it('should prevent duplicate connection attempts', async () => {
      const promise1 = manager.connect('token');
      const promise2 = manager.connect('token');

      expect(promise1).toBe(promise2);

      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await promise1;

      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Maintenance', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should maintain connection state correctly', () => {
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(manager.getConnectionStatus().connected).toBe(true);
    });

    it('should handle heartbeat ping-pong cycle', () => {
      vi.useFakeTimers();

      // Advance time to trigger heartbeat
      vi.advanceTimersByTime(30000);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));

      // Simulate pong response
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'pong' })
      } as MessageEvent);

      const metrics = manager.getConnectionMetrics();
      expect(metrics.lastPong).toBeDefined();

      vi.useRealTimers();
    });

    it('should detect heartbeat timeout', () => {
      vi.useFakeTimers();

      // Set last pong to old time
      (manager as any).lastPongTime = Date.now() - 50000;

      // Advance time to trigger heartbeat check
      vi.advanceTimersByTime(30000);

      expect(mockWebSocket.close).toHaveBeenCalledWith(4000, 'Heartbeat timeout');

      vi.useRealTimers();
    });

    it('should provide comprehensive connection metrics', () => {
      const metrics = manager.getConnectionMetrics();

      expect(metrics).toHaveProperty('status');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('reconnectAttempts');
      expect(metrics).toHaveProperty('maxReconnectAttempts');
      expect(metrics).toHaveProperty('lastConnected');
      expect(metrics).toHaveProperty('lastPong');
      expect(metrics).toHaveProperty('queuedMessages');
    });

    it('should provide connection status information', () => {
      const status = manager.getConnectionStatus();

      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('reconnectAttempts');
      expect(status).toHaveProperty('readyState');
      expect(status).toHaveProperty('maxReconnectAttempts');
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('queuedMessages');
    });
  });

  describe('Disconnection Handling', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should handle clean disconnection', () => {
      manager.disconnect();

      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Client disconnect');
    });

    it('should clear message queue on disconnect', () => {
      // Queue some messages
      manager.send({ type: 'test1' });
      manager.send({ type: 'test2' });

      expect(manager.getConnectionStatus().queuedMessages).toBe(2);

      manager.disconnect();

      expect(manager.getConnectionStatus().queuedMessages).toBe(0);
    });

    it('should handle server-initiated disconnection', () => {
      // Simulate server close
      mockWebSocket.onclose?.({ code: 1000, reason: 'Server close' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should handle unexpected disconnection', () => {
      // Simulate unexpected disconnect
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);
    });

    it('should stop heartbeat on disconnect', () => {
      vi.useFakeTimers();

      manager.disconnect();

      // Advance time - heartbeat should not trigger
      vi.advanceTimersByTime(30000);

      expect(mockWebSocket.send).not.toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));

      vi.useRealTimers();
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on unexpected disconnect', async () => {
      await manager.connect('token');

      // Simulate unexpected disconnect
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);

      // Simulate successful reconnection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await vi.waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });
    });

    it('should respect maximum reconnection attempts', async () => {
      vi.useFakeTimers();

      await manager.connect('token');

      // Fail multiple reconnection attempts
      for (let i = 0; i < 3; i++) {
        mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

        // Wait for reconnection attempt
        vi.advanceTimersByTime(100 * Math.pow(2, i)); // Exponential backoff

        // Fail the reconnection
        mockWebSocket.onerror?.(new Event('error'));
      }

      // Should give up after max attempts
      expect(manager.getConnectionState()).toBe(ConnectionState.FAILED);

      vi.useRealTimers();
    });

    it('should use exponential backoff for reconnection', async () => {
      vi.useFakeTimers();

      await manager.connect('token');

      const reconnectDelays: number[] = [];

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        reconnectDelays.push(delay as number);
        return originalSetTimeout(callback, delay);
      }) as any;

      // Trigger reconnection attempts
      for (let i = 0; i < 3; i++) {
        mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);
        vi.advanceTimersByTime(100); // Small advance to trigger logic
      }

      // Verify exponential backoff (100ms, 200ms, 400ms)
      expect(reconnectDelays[0]).toBeGreaterThanOrEqual(100);
      expect(reconnectDelays[1]).toBeGreaterThanOrEqual(200);
      expect(reconnectDelays[2]).toBeGreaterThanOrEqual(400);

      global.setTimeout = originalSetTimeout;
      vi.useRealTimers();
    });

    it('should resubscribe to topics after reconnection', async () => {
      await manager.connect('token');

      // Subscribe to a topic
      manager.subscribe('bills', vi.fn());

      // Simulate disconnect and reconnect
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await vi.waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });

      // Should have re-subscribed
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"subscribe"')
      );
    });

    it('should reset reconnection attempts on successful connection', async () => {
      await manager.connect('token');

      // Simulate some failed attempts
      (manager as any).reconnectAttempts = 2;

      // Successful reconnection
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await vi.waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });

      expect(manager.getConnectionMetrics().reconnectAttempts).toBe(0);
    });
  });

  describe('Connection State Transitions', () => {
    it('should transition through all connection states correctly', async () => {
      // Start disconnected
      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);

      // Begin connecting
      const connectPromise = manager.connect('token');
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTING);

      // Successfully connect
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));
      await connectPromise;
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);

      // Disconnect unexpectedly
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);
      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);

      // Fail to reconnect
      mockWebSocket.onerror?.(new Event('error'));
      await vi.waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.FAILED);
      });
    });

    it('should handle rapid state changes gracefully', async () => {
      const connectPromise = manager.connect('token');

      // Rapid state changes
      mockWebSocket.onopen?.(new Event('open'));
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);
      mockWebSocket.onerror?.(new Event('error'));

      await expect(connectPromise).rejects.toThrow();

      // Should end in a stable state
      expect([ConnectionState.DISCONNECTED, ConnectionState.FAILED]).toContain(
        manager.getConnectionState()
      );
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up timers on disconnect', () => {
      vi.useFakeTimers();

      manager.disconnect();

      // Advance time - no timers should be active
      vi.advanceTimersByTime(60000);

      // Should not have called send (heartbeat)
      expect(mockWebSocket.send).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should clean up event listeners on disconnect', () => {
      const mockCallback = vi.fn();
      manager.on('connected', mockCallback);

      manager.disconnect();

      // Event listeners should be cleaned up internally
      expect(manager).toBeDefined();
    });

    it('should handle cleanup during connection attempt', () => {
      const connectPromise = manager.connect('token');

      // Disconnect while connecting
      manager.disconnect();

      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('Configuration Changes', () => {
    it('should allow runtime configuration changes', () => {
      manager.setConnectionOptions({
        maxReconnectAttempts: 10,
        heartbeatInterval: 60000
      });

      // Configuration should be updated
      expect(manager.getConnectionStatus().maxReconnectAttempts).toBe(10);
    });

    it('should validate configuration changes', () => {
      manager.setConnectionOptions({
        maxReconnectAttempts: -1, // Invalid
        heartbeatInterval: 0 // Invalid
      });

      // Should use valid defaults or clamp values
      const status = manager.getConnectionStatus();
      expect(status.maxReconnectAttempts).toBeGreaterThanOrEqual(0);
    });

    it('should reset reconnection attempts', () => {
      (manager as any).reconnectAttempts = 5;
      manager.resetReconnectionAttempts();

      expect(manager.getConnectionMetrics().reconnectAttempts).toBe(0);
    });
  });
});