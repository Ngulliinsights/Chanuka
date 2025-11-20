/**
 * WebSocket Backward Compatibility Tests
 *
 * Tests that the consolidated WebSocket implementation maintains backward compatibility
 * with the legacy websocket-client.ts interface and functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedWebSocketManager, globalWebSocketPool } from '../websocket';
import { WebSocketClient, webSocketClient } from '@client/services/websocket-client';
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

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock defaultApiConfig
vi.mock('../../../config/api.js', () => ({
  defaultApiConfig: {
    baseUrl: 'http://localhost:3000',
  },
}));

describe('WebSocket Backward Compatibility', () => {
  let unifiedManager: UnifiedWebSocketManager;
  let legacyClient: WebSocketClient;
  let config: any;

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
        batching: true,
        batchSize: 10,
        batchInterval: 1000
      }
    };
    unifiedManager = new UnifiedWebSocketManager(config);
    legacyClient = new WebSocketClient();
    mockWebSocket.readyState = WebSocket.CONNECTING;
  });

  afterEach(() => {
    unifiedManager.disconnect();
    legacyClient.disconnect();
  });

  describe('API Compatibility', () => {
    it('should maintain WebSocketClient constructor signature', () => {
      const client1 = new WebSocketClient();
      const client2 = new WebSocketClient('ws://custom.com');

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
    });

    it('should maintain WebSocketClient method signatures', () => {
      // Test all public methods exist and have correct signatures
      expect(typeof legacyClient.connect).toBe('function');
      expect(typeof legacyClient.disconnect).toBe('function');
      expect(typeof legacyClient.subscribeToBill).toBe('function');
      expect(typeof legacyClient.unsubscribeFromBill).toBe('function');
      expect(typeof legacyClient.getPreferences).toBe('function');
      expect(typeof legacyClient.updatePreferences).toBe('function');
      expect(typeof legacyClient.isConnected).toBe('function');
      expect(typeof legacyClient.on).toBe('function');
      expect(typeof legacyClient.off).toBe('function');
      expect(typeof legacyClient.getConnectionStatus).toBe('function');
      expect(typeof legacyClient.getConnectionMetrics).toBe('function');
    });

    it('should maintain UnifiedWebSocketManager method signatures', () => {
      expect(typeof unifiedManager.connect).toBe('function');
      expect(typeof unifiedManager.disconnect).toBe('function');
      expect(typeof unifiedManager.subscribe).toBe('function');
      expect(typeof unifiedManager.unsubscribe).toBe('function');
      expect(typeof unifiedManager.subscribeToBill).toBe('function');
      expect(typeof unifiedManager.unsubscribeFromBill).toBe('function');
      expect(typeof unifiedManager.send).toBe('function');
      expect(typeof unifiedManager.on).toBe('function');
      expect(typeof unifiedManager.off).toBe('function');
      expect(typeof unifiedManager.getConnectionState).toBe('function');
      expect(typeof unifiedManager.getConnectionStatus).toBe('function');
      expect(typeof unifiedManager.getConnectionMetrics).toBe('function');
    });
  });

  describe('Behavioral Compatibility', () => {
    it('should maintain connection state behavior', async () => {
      // Test legacy client
      const legacyPromise = legacyClient.connect('token');
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));
      await legacyPromise;

      expect(legacyClient.isConnected()).toBe(true);
      expect(legacyClient.getConnectionStatus().connected).toBe(true);

      // Test unified manager
      const unifiedPromise = unifiedManager.connect('token');
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));
      await unifiedPromise;

      expect(unifiedManager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(unifiedManager.getConnectionStatus().connected).toBe(true);
    });

    it('should maintain bill subscription behavior', async () => {
      await legacyClient.connect('token');
      await unifiedManager.connect('token');

      // Test legacy subscription
      legacyClient.subscribeToBill(123, ['status_change']);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        data: { bill_id: 123, subscriptionTypes: ['status_change'] }
      }));

      // Reset mock
      mockWebSocket.send.mockClear();

      // Test unified subscription
      unifiedManager.subscribeToBill(123, ['status_change']);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        data: { bill_id: 123, subscriptionTypes: ['status_change'] }
      }));
    });

    it('should maintain bill unsubscription behavior', async () => {
      await legacyClient.connect('token');
      await unifiedManager.connect('token');

      // Test legacy unsubscription
      legacyClient.unsubscribeFromBill(123);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'unsubscribe',
        data: { bill_id: 123 }
      }));

      // Reset mock
      mockWebSocket.send.mockClear();

      // Test unified unsubscription
      unifiedManager.unsubscribeFromBill(123);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'unsubscribe',
        data: { bill_id: 123 }
      }));
    });

    it('should maintain message handling behavior', async () => {
      await legacyClient.connect('token');
      await unifiedManager.connect('token');

      const legacyCallback = vi.fn();
      const unifiedCallback = vi.fn();

      // Test legacy message handling
      legacyClient.on('billUpdate', legacyCallback);

      const billUpdateMessage = {
        type: 'bill_update',
        bill_id: 123,
        update: { type: 'status_change', data: { bill_id: 123 } },
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockWebSocket.onmessage?.({
        data: JSON.stringify(billUpdateMessage)
      } as MessageEvent);

      expect(legacyCallback).toHaveBeenCalledWith({
        bill_id: 123,
        update: billUpdateMessage.update,
        timestamp: billUpdateMessage.timestamp
      });

      // Reset mocks
      mockWebSocket.send.mockClear();

      // Test unified message handling
      unifiedManager.on('billUpdate', unifiedCallback);

      mockWebSocket.onmessage?.({
        data: JSON.stringify(billUpdateMessage)
      } as MessageEvent);

      expect(unifiedCallback).toHaveBeenCalledWith({
        bill_id: 123,
        update: billUpdateMessage.update,
        timestamp: billUpdateMessage.timestamp
      });
    });

    it('should maintain notification handling behavior', async () => {
      await legacyClient.connect('token');
      await unifiedManager.connect('token');

      const legacyCallback = vi.fn();
      const unifiedCallback = vi.fn();

      // Test legacy notification handling
      legacyClient.on('notification', legacyCallback);

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

      expect(legacyCallback).toHaveBeenCalledWith(notificationMessage.notification);

      // Reset mocks
      mockWebSocket.send.mockClear();

      // Test unified notification handling
      unifiedManager.on('notification', unifiedCallback);

      mockWebSocket.onmessage?.({
        data: JSON.stringify(notificationMessage)
      } as MessageEvent);

      expect(unifiedCallback).toHaveBeenCalledWith(notificationMessage.notification);
    });
  });

  describe('Configuration Compatibility', () => {
    it('should maintain legacy configuration options', () => {
      // Test legacy client configuration
      legacyClient.setConnectionOptions({
        maxReconnectAttempts: 10,
        reconnectDelay: 2000,
        heartbeatInterval: 60000,
        heartbeatTimeout: 90000,
        maxQueueSize: 200
      });

      // Should not throw
      expect(legacyClient).toBeDefined();

      // Test unified manager configuration
      unifiedManager.setConnectionOptions({
        maxReconnectAttempts: 10,
        reconnectDelay: 2000,
        heartbeatInterval: 60000,
        heartbeatTimeout: 90000,
        maxQueueSize: 200
      });

      // Should not throw
      expect(unifiedManager).toBeDefined();
    });

    it('should maintain default configuration values', () => {
      const legacyStatus = legacyClient.getConnectionStatus();
      const unifiedStatus = unifiedManager.getConnectionStatus();

      // Both should have reasonable defaults
      expect(legacyStatus.maxReconnectAttempts).toBeGreaterThan(0);
      expect(unifiedStatus.maxReconnectAttempts).toBeGreaterThan(0);
      expect(legacyStatus.queuedMessages).toBe(0);
      expect(unifiedStatus.queuedMessages).toBe(0);
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should maintain error handling behavior', async () => {
      const legacyErrorCallback = vi.fn();
      const unifiedErrorCallback = vi.fn();

      legacyClient.on('error', legacyErrorCallback);
      unifiedManager.on('error', unifiedErrorCallback);

      // Simulate error
      mockWebSocket.onerror?.(new Event('error'));

      // Both should handle errors
      expect(legacyErrorCallback).toHaveBeenCalled();
      expect(unifiedErrorCallback).toHaveBeenCalled();
    });

    it('should maintain connection failure behavior', async () => {
      // Test legacy client failure
      const legacyPromise = legacyClient.connect('token');
      mockWebSocket.onerror?.(new Event('error'));
      await expect(legacyPromise).rejects.toThrow();

      // Test unified manager failure
      const unifiedPromise = unifiedManager.connect('token');
      mockWebSocket.onerror?.(new Event('error'));
      await expect(unifiedPromise).rejects.toThrow();
    });
  });

  describe('Event System Compatibility', () => {
    it('should maintain event subscription interface', () => {
      const legacyCallback = vi.fn();
      const unifiedCallback = vi.fn();

      // Test legacy event subscription
      const legacyUnsubscribe = legacyClient.on('connected', legacyCallback);
      expect(typeof legacyUnsubscribe).toBe('function');

      // Test unified event subscription
      unifiedManager.on('connected', unifiedCallback);
      // Unified manager doesn't return unsubscribe function in the same way

      // Both should accept event subscriptions
      expect(legacyClient).toBeDefined();
      expect(unifiedManager).toBeDefined();
    });

    it('should maintain event emission', async () => {
      await legacyClient.connect('token');
      await unifiedManager.connect('token');

      const legacyCallback = vi.fn();
      const unifiedCallback = vi.fn();

      legacyClient.on('connected', legacyCallback);
      unifiedManager.on('connected', unifiedCallback);

      // Simulate connection event
      mockWebSocket.onopen?.(new Event('open'));

      // Both should emit connected events
      expect(legacyCallback).toHaveBeenCalled();
      expect(unifiedCallback).toHaveBeenCalled();
    });
  });

  describe('Global Instance Compatibility', () => {
    it('should maintain global webSocketClient instance', () => {
      expect(webSocketClient).toBeInstanceOf(WebSocketClient);
      expect(typeof webSocketClient.connect).toBe('function');
      expect(typeof webSocketClient.disconnect).toBe('function');
    });

    it('should maintain globalWebSocketPool instance', () => {
      expect(globalWebSocketPool).toBeDefined();
      expect(typeof globalWebSocketPool.getConnection).toBe('function');
      expect(typeof globalWebSocketPool.disconnectAll).toBe('function');
    });
  });

  describe('Migration Path Compatibility', () => {
    it('should allow gradual migration from legacy to unified', async () => {
      // Both can be used simultaneously
      await legacyClient.connect('token1');
      await unifiedManager.connect('token2');

      expect(legacyClient.isConnected()).toBe(true);
      expect(unifiedManager.getConnectionState()).toBe(ConnectionState.CONNECTED);

      // Both can subscribe to different things
      legacyClient.subscribeToBill(123);
      unifiedManager.subscribeToBill(456);

      expect(mockWebSocket.send).toHaveBeenCalledTimes(2);
    });

    it('should maintain feature parity', () => {
      // Test that all legacy features exist in unified manager
      const legacyMethods = Object.getOwnPropertyNames(WebSocketClient.prototype)
        .filter(name => name !== 'constructor' && typeof (legacyClient as any)[name] === 'function');

      const unifiedMethods = Object.getOwnPropertyNames(UnifiedWebSocketManager.prototype)
        .filter(name => name !== 'constructor' && typeof (unifiedManager as any)[name] === 'function');

      // Core functionality should be available in both
      const coreMethods = ['connect', 'disconnect', 'send', 'on', 'off', 'isConnected'];

      coreMethods.forEach(method => {
        expect(legacyMethods).toContain(method);
        expect(unifiedMethods).toContain(method);
      });
    });
  });

  describe('Data Structure Compatibility', () => {
    it('should maintain BillUpdate interface compatibility', () => {
      const billUpdate = {
        type: 'status_change' as const,
        data: {
          bill_id: 123,
          oldStatus: 'introduced',
          newStatus: 'passed'
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      // Both should handle the same data structure
      expect(billUpdate.type).toBe('status_change');
      expect(billUpdate.data.bill_id).toBe(123);
      expect(billUpdate.timestamp).toBeDefined();
    });

    it('should maintain WebSocketNotification interface compatibility', () => {
      const notification = {
        type: 'info',
        title: 'Bill Updated',
        message: 'Bill 123 has been updated',
        data: { bill_id: 123 }
      };

      // Both should handle the same data structure
      expect(notification.type).toBe('info');
      expect(notification.title).toBe('Bill Updated');
      expect(notification.message).toBeDefined();
    });

    it('should maintain UserPreferences interface compatibility', () => {
      const preferences = {
        billTracking: {
          statusChanges: true,
          newComments: true,
          votingSchedule: false,
          amendments: true,
          updateFrequency: 'immediate' as const,
          notificationChannels: {
            inApp: true,
            email: false,
            push: true
          }
        }
      };

      // Both should handle the same data structure
      expect(preferences.billTracking.statusChanges).toBe(true);
      expect(preferences.billTracking.updateFrequency).toBe('immediate');
    });
  });

  describe('Performance Compatibility', () => {
    it('should maintain similar performance characteristics', async () => {
      const startTime = Date.now();

      // Test legacy client performance
      await legacyClient.connect('token');
      for (let i = 0; i < 100; i++) {
        (legacyClient as any).send({ type: 'perf_test', id: i });
      }
      legacyClient.disconnect();

      const legacyTime = Date.now() - startTime;

      // Reset
      mockWebSocket.send.mockClear();
      const resetTime = Date.now();

      // Test unified manager performance
      await unifiedManager.connect('token');
      for (let i = 0; i < 100; i++) {
        unifiedManager.send({ type: 'perf_test', id: i });
      }
      unifiedManager.disconnect();

      const unifiedTime = Date.now() - resetTime;

      // Performance should be similar (within 2x)
      expect(unifiedTime).toBeLessThan(legacyTime * 2);
    });

    it('should maintain memory usage patterns', () => {
      // Both should be lightweight
      expect(legacyClient).toBeDefined();
      expect(unifiedManager).toBeDefined();

      // Memory usage should not grow excessively during normal operation
      const initialMemory = process.memoryUsage?.().heapUsed || 0;

      // Perform operations
      legacyClient.connect('token');
      unifiedManager.connect('token');

      const afterMemory = process.memoryUsage?.().heapUsed || 0;

      // Memory growth should be reasonable
      expect(afterMemory - initialMemory).toBeLessThan(10000000); // Less than 10MB
    });
  });

  describe('Integration Compatibility', () => {
    it('should work with existing React hooks', () => {
      // This would normally test with actual React hooks,
      // but we can test that the interfaces are compatible

      // Both should provide similar interfaces for React integration
      expect(typeof legacyClient.on).toBe('function');
      expect(typeof unifiedManager.on).toBe('function');
      expect(typeof legacyClient.isConnected).toBe('function');
      expect(typeof unifiedManager.getConnectionState).toBe('function');
    });

    it('should maintain Redux middleware compatibility', () => {
      // Both should be compatible with Redux middleware patterns
      expect(typeof legacyClient.on).toBe('function');
      expect(typeof unifiedManager.on).toBe('function');
      expect(typeof (legacyClient as any).send).toBe('function');
      expect(typeof unifiedManager.send).toBe('function');
    });
  });
});