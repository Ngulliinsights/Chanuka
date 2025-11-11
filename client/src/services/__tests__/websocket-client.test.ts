import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebSocketClient, webSocketClient, useWebSocket, useBillUpdates } from '../websocket-client';
import { renderHook, act } from '@testing-library/react';

// Mock WebSocket
const mockWebSocket = {
  readyState: WebSocket.OPEN,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
};

global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);

// Mock React hooks
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

// Mock defaultApiConfig
vi.mock('../config/api.js', () => ({
  defaultApiConfig: {
    baseUrl: 'http://localhost:3000',
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new WebSocketClient();
    mockWebSocket.readyState = WebSocket.OPEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default base URL', () => {
      const newClient = new WebSocketClient();
      expect(newClient).toBeDefined();
    });

    it('should accept custom base URL', () => {
      const customClient = new WebSocketClient('ws://custom.com');
      expect(customClient).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should create WebSocket connection', async () => {
      const connectPromise = client.connect('test-token');

      // Simulate successful connection
      mockWebSocket.onopen?.(new Event('open'));

      await connectPromise;

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000/ws?token=test-token');
    });

    it('should handle connection timeout', async () => {
      const connectPromise = client.connect('test-token');

      // Simulate timeout by not calling onopen
      vi.useFakeTimers();
      vi.advanceTimersByTime(11000);

      await expect(connectPromise).rejects.toThrow('Connection timeout');
      vi.useRealTimers();
    });

    it('should handle WebSocket errors', async () => {
      const connectPromise = client.connect('test-token');

      mockWebSocket.onerror?.(new Event('error'));

      await expect(connectPromise).rejects.toThrow();
    });

    it('should return existing promise for same token', async () => {
      const promise1 = client.connect('token');
      const promise2 = client.connect('token');

      expect(promise1).toBe(promise2);
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await client.connect('token');
    });

    it('should handle bill_update messages', () => {
      const mockCallback = vi.fn();
      client.on('billUpdate', mockCallback);

      const message = {
        type: 'bill_update',
        bill_id: 123,
        update: { type: 'status_change', data: { bill_id: 123 } },
        timestamp: '2023-01-01T00:00:00Z',
      };

      mockWebSocket.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);

      expect(mockCallback).toHaveBeenCalledWith({
        bill_id: 123,
        update: message.update,
        timestamp: message.timestamp,
      });
    });

    it('should handle notification messages', () => {
      const mockCallback = vi.fn();
      client.on('notification', mockCallback);

      const message = {
        type: 'notification',
        notification: { type: 'info', title: 'Test', message: 'Test message' },
      };

      mockWebSocket.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);

      expect(mockCallback).toHaveBeenCalledWith(message.notification);
    });

    it('should handle unknown message types', () => {
      const message = {
        type: 'unknown_type',
        data: 'test',
      };

      // Should not throw
      mockWebSocket.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);
    });

    it('should handle malformed JSON', () => {
      const mockErrorCallback = vi.fn();
      client.on('error', mockErrorCallback);

      mockWebSocket.onmessage?.({ data: 'invalid json' } as MessageEvent);

      expect(mockErrorCallback).toHaveBeenCalled();
    });
  });

  describe('subscription methods', () => {
    beforeEach(async () => {
      await client.connect('token');
    });

    it('should subscribe to bill updates', () => {
      client.subscribeToBill(123, ['status_change']);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        data: { bill_id: 123, subscriptionTypes: ['status_change'] },
      }));
    });

    it('should unsubscribe from bill updates', () => {
      client.unsubscribeFromBill(123);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'unsubscribe',
        data: { bill_id: 123 },
      }));
    });

    it('should queue subscriptions when not connected', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      client.subscribeToBill(123);

      expect(mockWebSocket.send).not.toHaveBeenCalled();

      // Should be queued
      expect(client.getConnectionStatus().queuedMessages).toBeGreaterThan(0);
    });
  });

  describe('preferences', () => {
    beforeEach(async () => {
      await client.connect('token');
    });

    it('should get preferences', () => {
      client.getPreferences();

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'get_preferences',
      }));
    });

    it('should update preferences', () => {
      const preferences = { statusChanges: true };
      client.updatePreferences(preferences);

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'update_preferences',
        data: { preferences },
      }));
    });

    it('should throw when updating preferences while not connected', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      expect(() => client.updatePreferences({})).toThrow('WebSocket not connected');
    });
  });

  describe('connection management', () => {
    it('should disconnect properly', () => {
      client.disconnect();

      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Client disconnect');
    });

    it('should check connection status', async () => {
      await client.connect('token');

      const status = client.isConnected();
      expect(status).toBe(true);
    });

    it('should get connection status', async () => {
      await client.connect('token');

      const status = client.getConnectionStatus();
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('reconnectAttempts');
      expect(status).toHaveProperty('readyState');
    });

    it('should get connection metrics', async () => {
      await client.connect('token');

      const metrics = client.getConnectionMetrics();
      expect(metrics).toHaveProperty('status');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('reconnectAttempts');
    });
  });

  describe('message queue', () => {
    it('should queue messages when offline', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      client.subscribeToBill(123);

      expect(client.getConnectionStatus().queuedMessages).toBe(1);
    });

    it('should flush queued messages on reconnect', async () => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      client.subscribeToBill(123);

      // Reconnect
      mockWebSocket.readyState = WebSocket.OPEN;
      await client.connect('token');

      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should clear message queue on disconnect', () => {
      client.subscribeToBill(123);
      client.disconnect();

      expect(client.getConnectionStatus().queuedMessages).toBe(0);
    });
  });

  describe('heartbeat', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await client.connect('token');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send ping messages', () => {
      vi.advanceTimersByTime(31000); // Past heartbeat interval

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    });

    it('should close connection on heartbeat timeout', () => {
      // Set last pong to old time
      (client as any).lastPongTime = Date.now() - 50000;

      vi.advanceTimersByTime(31000);

      expect(mockWebSocket.close).toHaveBeenCalledWith(4000, 'Heartbeat timeout');
    });
  });

  describe('event system', () => {
    it('should register and call event listeners', () => {
      const mockCallback = vi.fn();
      const unsubscribe = client.on('connected', mockCallback);

      client.emit('connected', { timestamp: 'test' });

      expect(mockCallback).toHaveBeenCalledWith({ timestamp: 'test' });

      // Unsubscribe
      unsubscribe();
      client.emit('connected', { timestamp: 'test2' });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      client.on('connected', callback1);
      client.on('connected', callback2);

      client.emit('connected', { data: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });
});

describe('webSocketClient singleton', () => {
  it('should be an instance of WebSocketClient', () => {
    expect(webSocketClient).toBeInstanceOf(WebSocketClient);
  });
});

describe('useWebSocket hook', () => {
  it('should return connection state and methods', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current).toHaveProperty('isConnected');
    expect(result.current).toHaveProperty('connectionStatus');
    expect(result.current).toHaveProperty('connect');
    expect(result.current).toHaveProperty('disconnect');
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });
});

describe('useBillUpdates hook', () => {
  it('should return updates and notifications', () => {
    const { result } = renderHook(() => useBillUpdates());

    expect(result.current).toHaveProperty('updates');
    expect(result.current).toHaveProperty('notifications');
    expect(result.current).toHaveProperty('clearUpdates');
    expect(result.current).toHaveProperty('clearNotifications');
    expect(Array.isArray(result.current.updates)).toBe(true);
    expect(Array.isArray(result.current.notifications)).toBe(true);
  });

  it('should filter updates by bill_id when provided', () => {
    const { result } = renderHook(() => useBillUpdates(123));

    expect(result.current.updates).toEqual([]);
  });
});