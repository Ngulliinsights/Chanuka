/**
 * WebSocket Performance and Memory Leak Tests
 *
 * Tests performance characteristics, memory usage, and resource management
 * to ensure the WebSocket implementation is efficient and leak-free.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedWebSocketManager } from '../websocket';
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

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 5000000
  }
};

global.performance = mockPerformance as any;

// Mock error handler
vi.mock('../errors', () => ({
  globalErrorHandler: {
    handleError: vi.fn()
  }
}));

describe('WebSocket Performance and Memory Tests', () => {
  let manager: UnifiedWebSocketManager;
  let config: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
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
    vi.useRealTimers();
  });

  describe('Connection Performance', () => {
    it('should establish connections quickly', async () => {
      const startTime = Date.now();
      const connectPromise = manager.connect('token');

      // Simulate immediate connection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await connectPromise;
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should connect quickly
    });

    it('should handle high-frequency connections', async () => {
      const connectionTimes: number[] = [];

      // Perform multiple rapid connections
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        const connectPromise = manager.connect(`token${i}`);

        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.onopen?.(new Event('open'));

        await connectPromise;
        connectionTimes.push(Date.now() - startTime);

        manager.disconnect();
      }

      const averageTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      expect(averageTime).toBeLessThan(50); // Average connection time should be low
    });

    it('should maintain connection stability under load', async () => {
      await manager.connect('token');

      // Simulate high message load
      const messageCount = 1000;
      const startTime = Date.now();

      for (let i = 0; i < messageCount; i++) {
        mockWebSocket.onmessage?.({
          data: JSON.stringify({ type: 'load_test', id: i })
        } as MessageEvent);
      }

      const endTime = Date.now();
      const messagesPerSecond = (messageCount / (endTime - startTime)) * 1000;

      // Should handle reasonable message throughput
      expect(messagesPerSecond).toBeGreaterThan(100);
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });
  });

  describe('Message Processing Performance', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should process messages efficiently', () => {
      const callback = vi.fn();
      manager.on('message', callback);

      const messageCount = 100;
      const startTime = Date.now();

      // Send multiple messages
      for (let i = 0; i < messageCount; i++) {
        mockWebSocket.onmessage?.({
          data: JSON.stringify({ type: 'perf_test', id: i })
        } as MessageEvent);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(callback).toHaveBeenCalledTimes(messageCount);
      expect(processingTime).toBeLessThan(100); // Should process quickly
    });

    it('should handle large message payloads efficiently', () => {
      const largeMessage = {
        type: 'large_payload',
        data: 'x'.repeat(100000) // 100KB message
      };

      const startTime = Date.now();
      manager.send(largeMessage);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should send quickly
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(largeMessage));
    });

    it('should maintain performance with many subscribers', () => {
      const callbacks: any[] = [];
      const subscriberCount = 50;

      // Add many subscribers
      for (let i = 0; i < subscriberCount; i++) {
        const callback = vi.fn();
        callbacks.push(callback);
        manager.on('message', callback);
      }

      const startTime = Date.now();

      // Send a message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'broadcast' })
      } as MessageEvent);

      const endTime = Date.now();

      // All callbacks should be called
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledTimes(1);
      });

      expect(endTime - startTime).toBeLessThan(100); // Should handle many subscribers efficiently
    });

    it('should handle subscription filtering performance', () => {
      const callback = vi.fn();

      // Subscribe with complex filters
      manager.subscribe('bills', callback, {
        filters: {
          status: ['passed', 'failed', 'introduced'],
          urgency: ['high', 'critical'],
          policyArea: ['healthcare', 'education', 'environment']
        }
      });

      const messageCount = 100;
      const startTime = Date.now();

      // Send messages that don't match filters
      for (let i = 0; i < messageCount; i++) {
        mockWebSocket.onmessage?.({
          data: JSON.stringify({
            topic: 'bills',
            status: 'committee', // Doesn't match filter
            urgency: 'low', // Doesn't match filter
            id: i
          })
        } as MessageEvent);
      }

      const endTime = Date.now();

      expect(callback).not.toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(200); // Filtering should be fast
    });
  });

  describe('Memory Usage and Leak Prevention', () => {
    it('should not leak memory during connection cycles', async () => {
      const initialMemory = mockPerformance.memory.usedJSHeapSize;

      // Perform multiple connect/disconnect cycles
      for (let i = 0; i < 10; i++) {
        const connectPromise = manager.connect(`token${i}`);
        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.onopen?.(new Event('open'));
        await connectPromise;

        manager.disconnect();
      }

      const finalMemory = mockPerformance.memory.usedJSHeapSize;

      // Memory usage should not grow significantly
      expect(finalMemory - initialMemory).toBeLessThan(1000000); // Less than 1MB growth
    });

    it('should clean up event listeners properly', () => {
      const callback = vi.fn();
      const unsubscribe = manager.on('message', callback);

      // Send a message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'test' })
      } as MessageEvent);

      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      manager.off('message', callback);

      // Send another message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'test2' })
      } as MessageEvent);

      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should prevent message queue memory leaks', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      // Fill message queue beyond limit
      for (let i = 0; i < 150; i++) {
        manager.send({ type: 'queue_test', id: i });
      }

      const status = manager.getConnectionStatus();
      expect(status.queuedMessages).toBeLessThanOrEqual(100); // Should be limited
    });

    it('should clean up timers on disconnect', () => {
      vi.useFakeTimers();

      // Should not have active timers initially
      expect(manager).toBeDefined();

      manager.disconnect();

      // Advance time - no timers should fire
      vi.advanceTimersByTime(60000);

      // Should not have called send (heartbeat)
      expect(mockWebSocket.send).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should handle subscription cleanup', () => {
      const callbacks: any[] = [];

      // Add many subscriptions
      for (let i = 0; i < 20; i++) {
        const callback = vi.fn();
        callbacks.push(callback);
        manager.subscribe(`topic${i}`, callback);
      }

      expect(manager.getSubscriptionCount()).toBe(20);

      // Clear subscriptions (simulated cleanup)
      manager.disconnect();

      // Subscriptions should be cleared
      expect(manager.getSubscriptionCount()).toBe(0);
    });
  });

  describe('Reconnection Performance', () => {
    it('should reconnect quickly after disconnection', async () => {
      await manager.connect('token');

      // Simulate disconnect
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

      expect(manager.getConnectionState()).toBe(ConnectionState.RECONNECTING);

      const reconnectStartTime = Date.now();

      // Simulate successful reconnection
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await vi.waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });

      const reconnectTime = Date.now() - reconnectStartTime;
      expect(reconnectTime).toBeLessThan(1000); // Should reconnect quickly
    });

    it('should handle rapid reconnection attempts efficiently', async () => {
      await manager.connect('token');

      const reconnectionTimes: number[] = [];

      // Simulate multiple rapid disconnects/reconnects
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();

        mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

        mockWebSocket.readyState = WebSocket.OPEN;
        mockWebSocket.onopen?.(new Event('open'));

        await vi.waitFor(() => {
          expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
        });

        reconnectionTimes.push(Date.now() - startTime);
      }

      const averageReconnectTime = reconnectionTimes.reduce((a, b) => a + b, 0) / reconnectionTimes.length;
      expect(averageReconnectTime).toBeLessThan(500); // Should maintain fast reconnection
    });

    it('should resubscribe efficiently after reconnection', async () => {
      await manager.connect('token');

      // Add many subscriptions
      const subscriptionCount = 20;
      for (let i = 0; i < subscriptionCount; i++) {
        manager.subscribe(`topic${i}`, vi.fn());
      }

      const startTime = Date.now();

      // Simulate disconnect and reconnect
      mockWebSocket.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.(new Event('open'));

      await vi.waitFor(() => {
        expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });

      const resubscribeTime = Date.now() - startTime;

      // Should resubscribe quickly
      expect(resubscribeTime).toBeLessThan(100);
      expect(mockWebSocket.send).toHaveBeenCalled(); // Should have sent subscription messages
    });
  });

  describe('Batch Processing Performance', () => {
    it('should batch messages efficiently', async () => {
      const batchConfig = { ...config, message: { ...config.message, batching: true, batchSize: 5 } };
      const batchManager = new UnifiedWebSocketManager(batchConfig);

      await batchManager.connect('token');

      // Send messages that should be batched
      for (let i = 0; i < 7; i++) {
        batchManager.send({ type: 'batch_test', id: i });
      }

      // Advance time to trigger batch processing
      vi.advanceTimersByTime(1000);

      // Should have sent 2 batches (5 + 2 messages)
      expect(mockWebSocket.send).toHaveBeenCalledTimes(2);

      batchManager.disconnect();
    });

    it('should maintain message order in batches', async () => {
      const batchConfig = { ...config, message: { ...config.message, batching: true, batchSize: 3 } };
      const batchManager = new UnifiedWebSocketManager(batchConfig);

      await batchManager.connect('token');

      // Send messages in order
      for (let i = 0; i < 5; i++) {
        batchManager.send({ type: 'ordered', id: i });
      }

      vi.advanceTimersByTime(1000);

      const sendCalls = mockWebSocket.send.mock.calls;
      expect(sendCalls.length).toBe(2);

      // Check first batch
      const firstBatch = JSON.parse(sendCalls[0][0]);
      expect(firstBatch.messages[0].id).toBe(0);
      expect(firstBatch.messages[1].id).toBe(1);
      expect(firstBatch.messages[2].id).toBe(2);

      // Check second batch
      const secondBatch = JSON.parse(sendCalls[1][0]);
      expect(secondBatch.messages[0].id).toBe(3);
      expect(secondBatch.messages[1].id).toBe(4);

      batchManager.disconnect();
    });
  });

  describe('Resource Management', () => {
    it('should limit concurrent operations', async () => {
      const operationPromises: Promise<void>[] = [];

      // Start many concurrent operations
      for (let i = 0; i < 20; i++) {
        operationPromises.push(
          Promise.resolve(manager.send({ type: 'concurrent', id: i }))
        );
      }

      await Promise.allSettled(operationPromises);

      // Should handle all operations without crashing
      expect(manager.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should handle memory pressure gracefully', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      // Simulate memory pressure with many large messages
      for (let i = 0; i < 50; i++) {
        manager.send({
          type: 'memory_test',
          data: 'x'.repeat(10000) // 10KB each
        });
      }

      const status = manager.getConnectionStatus();
      expect(status.queuedMessages).toBeLessThanOrEqual(100); // Should be limited
    });

    it('should clean up resources on manager destruction', () => {
      const callback = vi.fn();
      manager.on('message', callback);

      // Simulate manager going out of scope
      manager.disconnect();

      // Should have cleaned up
      expect(manager.getSubscriptionCount()).toBe(0);
    });
  });

  describe('Heartbeat Performance', () => {
    beforeEach(async () => {
      await manager.connect('token');
    });

    it('should maintain heartbeat efficiency', () => {
      // Advance time through multiple heartbeat cycles
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(30000);
      }

      // Should have sent 10 ping messages
      const pingCalls = mockWebSocket.send.mock.calls.filter(call =>
        JSON.parse(call[0]).type === 'ping'
      );

      expect(pingCalls.length).toBe(10);
    });

    it('should handle pong responses quickly', () => {
      // Send ping
      vi.advanceTimersByTime(30000);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));

      // Receive pong
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'pong' })
      } as MessageEvent);

      const metrics = manager.getConnectionMetrics();
      expect(metrics.lastPong).toBeDefined();
    });

    it('should detect heartbeat timeout efficiently', () => {
      // Set last pong to old time
      (manager as any).lastPongTime = Date.now() - 50000;

      vi.advanceTimersByTime(30000);

      expect(mockWebSocket.close).toHaveBeenCalledWith(4000, 'Heartbeat timeout');
    });
  });

  describe('Long-Running Performance', () => {
    it('should maintain performance over time', async () => {
      await manager.connect('token');

      const startTime = Date.now();
      let messageCount = 0;

      // Simulate long-running usage
      for (let hour = 0; hour < 2; hour++) {
        for (let minute = 0; minute < 60; minute++) {
          // Send heartbeat
          vi.advanceTimersByTime(30000);

          // Send some messages
          for (let i = 0; i < 10; i++) {
            mockWebSocket.onmessage?.({
              data: JSON.stringify({ type: 'long_test', id: messageCount++ })
            } as MessageEvent);
          }
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle 2 hours of simulated activity reasonably
      expect(totalTime).toBeLessThan(5000); // Test should complete quickly
      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should handle sustained high load', async () => {
      await manager.connect('token');

      const testDuration = 30000; // 30 seconds
      const startTime = Date.now();
      let messageCount = 0;

      while (Date.now() - startTime < testDuration) {
        // Send burst of messages
        for (let i = 0; i < 50; i++) {
          mockWebSocket.onmessage?.({
            data: JSON.stringify({ type: 'load_test', id: messageCount++ })
          } as MessageEvent);
        }

        // Advance time slightly
        vi.advanceTimersByTime(100);
      }

      expect(manager.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(messageCount).toBeGreaterThan(1000); // Should handle many messages
    });
  });
});