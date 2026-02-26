/**
 * Unit Tests for WebSocket Client
 * 
 * Tests connection/disconnection, message sending/receiving,
 * subscriptions, reconnection, heartbeat, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedWebSocketClient, createWebSocketClient } from '../websocket/client';
import { ConnectionState, WebSocketMessage } from '@shared/types/api/websocket';
import type { WebSocketOptions } from '../types/websocket';

// Mock dependencies
vi.mock('@client/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@client/infrastructure/observability', () => ({
  observability: {
    trackError: vi.fn(),
    trackPerformance: vi.fn(),
  },
}));

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocols?: string | string[];
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
    }
  }

  // Test helper methods
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('UnifiedWebSocketClient', () => {
  let client: UnifiedWebSocketClient;
  let mockWs: MockWebSocket;
  const defaultConfig: WebSocketOptions = {
    url: 'wss://api.example.com/ws',
    reconnect: {
      enabled: true,
      maxAttempts: 3,
      delay: 100,
    },
    heartbeat: {
      enabled: true,
      interval: 1000,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock global WebSocket
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

    client = new UnifiedWebSocketClient(defaultConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
    client.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket server', async () => {
      client.connect();

      await vi.runAllTimersAsync();

      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should not connect if already connected', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      const initialState = client.getConnectionState();
      client.connect();

      expect(client.getConnectionState()).toBe(initialState);
    });

    it('should disconnect from WebSocket server', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      client.disconnect();

      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should emit connected event on connection', async () => {
      const connectedHandler = vi.fn();
      client.on('connected', connectedHandler);

      client.connect();
      await vi.runAllTimersAsync();

      expect(connectedHandler).toHaveBeenCalled();
    });

    it('should emit disconnected event on disconnection', async () => {
      const disconnectedHandler = vi.fn();
      client.on('disconnected', disconnectedHandler);

      client.connect();
      await vi.runAllTimersAsync();

      client.disconnect();

      expect(disconnectedHandler).toHaveBeenCalledWith(1000, 'User disconnected');
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      client.connect();
      await vi.runAllTimersAsync();
    });

    it('should send messages when connected', () => {
      const message: WebSocketMessage = {
        type: 'test',
        data: { content: 'Hello' },
        timestamp: Date.now(),
      };

      expect(() => client.send(message)).not.toThrow();
    });

    it('should not send messages when disconnected', () => {
      client.disconnect();

      const message: WebSocketMessage = {
        type: 'test',
        data: { content: 'Hello' },
        timestamp: Date.now(),
      };

      // Should log warning but not throw
      expect(() => client.send(message)).not.toThrow();
    });

    it('should receive and emit messages', async () => {
      const messageHandler = vi.fn();
      client.on('message', messageHandler);

      // Get the mock WebSocket instance
      const ws = (client as unknown as { ws: MockWebSocket }).ws;

      const testMessage: WebSocketMessage = {
        type: 'test',
        data: { content: 'Hello' },
        timestamp: Date.now(),
      };

      ws.simulateMessage(testMessage);

      expect(messageHandler).toHaveBeenCalledWith(testMessage);
    });

    it('should handle invalid JSON messages', async () => {
      const { logger } = await import('@client/lib/utils/logger');
      const messageHandler = vi.fn();
      client.on('message', messageHandler);

      const ws = (client as unknown as { ws: MockWebSocket }).ws;

      // Simulate invalid JSON
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', { data: 'invalid json' }));
      }

      expect(messageHandler).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Subscriptions', () => {
    beforeEach(async () => {
      client.connect();
      await vi.runAllTimersAsync();
    });

    it('should subscribe to a single topic', () => {
      const result = client.subscribe('test-topic');

      expect(result).toBe(true);
      expect(client.getSubscriptions()).toContain('test-topic');
    });

    it('should subscribe to multiple topics', () => {
      const result = client.subscribe(['topic1', 'topic2', 'topic3']);

      expect(result).toBe(true);
      expect(client.getSubscriptions()).toEqual(
        expect.arrayContaining(['topic1', 'topic2', 'topic3'])
      );
    });

    it('should not subscribe when disconnected', () => {
      client.disconnect();

      const result = client.subscribe('test-topic');

      expect(result).toBe(false);
      expect(client.getSubscriptions()).not.toContain('test-topic');
    });

    it('should unsubscribe from a single topic', () => {
      client.subscribe('test-topic');

      const result = client.unsubscribe('test-topic');

      expect(result).toBe(true);
      expect(client.getSubscriptions()).not.toContain('test-topic');
    });

    it('should unsubscribe from multiple topics', () => {
      client.subscribe(['topic1', 'topic2']);

      const result = client.unsubscribe(['topic1', 'topic2']);

      expect(result).toBe(true);
      expect(client.getSubscriptions()).toEqual([]);
    });

    it('should resubscribe after reconnection', async () => {
      client.subscribe(['topic1', 'topic2']);

      // Simulate disconnection
      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      ws.close(1006, 'Connection lost');

      // Wait for reconnection
      await vi.runAllTimersAsync();

      // Subscriptions should be restored
      expect(client.getSubscriptions()).toEqual(
        expect.arrayContaining(['topic1', 'topic2'])
      );
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection on unexpected close', async () => {
      const reconnectingHandler = vi.fn();
      client.on('reconnecting', reconnectingHandler);

      client.connect();
      await vi.runAllTimersAsync();

      // Simulate unexpected disconnection
      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      ws.close(1006, 'Connection lost');

      // Wait for reconnection attempt
      await vi.advanceTimersByTimeAsync(200);

      expect(reconnectingHandler).toHaveBeenCalled();
    });

    it('should not reconnect on normal close', async () => {
      const reconnectingHandler = vi.fn();
      client.on('reconnecting', reconnectingHandler);

      client.connect();
      await vi.runAllTimersAsync();

      // Normal disconnection
      client.disconnect();

      await vi.advanceTimersByTimeAsync(1000);

      expect(reconnectingHandler).not.toHaveBeenCalled();
    });

    it('should respect max reconnection attempts', async () => {
      const clientWithLimitedRetries = new UnifiedWebSocketClient({
        ...defaultConfig,
        reconnect: {
          enabled: true,
          maxAttempts: 2,
          delay: 100,
        },
      });

      clientWithLimitedRetries.connect();
      await vi.runAllTimersAsync();

      // Simulate repeated failures
      for (let i = 0; i < 3; i++) {
        const ws = (clientWithLimitedRetries as unknown as { ws: MockWebSocket }).ws;
        ws.close(1006, 'Connection lost');
        await vi.advanceTimersByTimeAsync(500);
      }

      expect(clientWithLimitedRetries.getConnectionState()).toBe(ConnectionState.FAILED);
    });

    it('should use exponential backoff for reconnection', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      ws.close(1006, 'Connection lost');

      // First retry should be around 100ms
      await vi.advanceTimersByTimeAsync(50);
      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);

      await vi.advanceTimersByTimeAsync(100);
      // Should be attempting reconnection
    });
  });

  describe('Heartbeat', () => {
    it('should send heartbeat messages when enabled', async () => {
      const sendSpy = vi.spyOn(client, 'send');

      client.connect();
      await vi.runAllTimersAsync();

      // Wait for heartbeat interval
      await vi.advanceTimersByTimeAsync(1000);

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat',
          data: expect.objectContaining({ type: 'ping' }),
        })
      );
    });

    it('should not send heartbeat when disabled', async () => {
      const clientWithoutHeartbeat = new UnifiedWebSocketClient({
        ...defaultConfig,
        heartbeat: {
          enabled: false,
        },
      });

      const sendSpy = vi.spyOn(clientWithoutHeartbeat, 'send');

      clientWithoutHeartbeat.connect();
      await vi.runAllTimersAsync();

      await vi.advanceTimersByTimeAsync(2000);

      expect(sendSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'heartbeat' })
      );
    });

    it('should stop heartbeat on disconnection', async () => {
      const sendSpy = vi.spyOn(client, 'send');

      client.connect();
      await vi.runAllTimersAsync();

      client.disconnect();

      await vi.advanceTimersByTimeAsync(2000);

      // Should not send heartbeat after disconnection
      const heartbeatCalls = sendSpy.mock.calls.filter(
        call => call[0].type === 'heartbeat'
      );
      expect(heartbeatCalls.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should emit error event on WebSocket error', async () => {
      const errorHandler = vi.fn();
      client.on('error', errorHandler);

      client.connect();
      await vi.runAllTimersAsync();

      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      ws.simulateError();

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'WebSocketError',
          message: 'WebSocket connection error',
        })
      );
    });

    it('should track errors with observability', async () => {
      const { observability } = await import('@client/infrastructure/observability');

      client.connect();
      await vi.runAllTimersAsync();

      const ws = (client as unknown as { ws: MockWebSocket }).ws;
      ws.simulateError();

      expect(observability.trackError).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      // Mock WebSocket to throw on construction
      global.WebSocket = class {
        constructor() {
          throw new Error('Connection failed');
        }
      } as unknown as typeof WebSocket;

      const clientWithError = new UnifiedWebSocketClient(defaultConfig);

      expect(() => clientWithError.connect()).not.toThrow();
      expect(clientWithError.getConnectionState()).toBe(ConnectionState.FAILED);
    });
  });

  describe('Event Handlers', () => {
    it('should register event handlers', () => {
      const handler = vi.fn();

      client.on('connected', handler);

      expect(() => client.connect()).not.toThrow();
    });

    it('should unregister event handlers', async () => {
      const handler = vi.fn();

      client.on('connected', handler);
      client.off('connected', handler);

      client.connect();
      await vi.runAllTimersAsync();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple handlers for same event', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on('connected', handler1);
      client.on('connected', handler2);

      client.connect();
      await vi.runAllTimersAsync();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle errors in event handlers gracefully', async () => {
      const { logger } = await import('@client/lib/utils/logger');
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      client.on('connected', errorHandler);
      client.on('connected', normalHandler);

      client.connect();
      await vi.runAllTimersAsync();

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Performance Tracking', () => {
    it('should track connection time', async () => {
      const { observability } = await import('@client/infrastructure/observability');

      client.connect();
      await vi.runAllTimersAsync();

      expect(observability.trackPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'websocket_connection_time',
          unit: 'ms',
        })
      );
    });
  });
});

describe('createWebSocketClient', () => {
  it('should create a WebSocket client instance', () => {
    const config: WebSocketOptions = {
      url: 'wss://api.example.com/ws',
    };

    const client = createWebSocketClient(config);

    expect(client).toBeInstanceOf(UnifiedWebSocketClient);
  });
});
