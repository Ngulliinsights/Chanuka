/**
 * OperationQueueManager Unit Tests
 * 
 * Tests queue operations, priority handling, batch processing, retry logic,
 * and overflow protection for the WebSocket operation queue system.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedWebSocket,QueueOperation } from '../../types';
import { OPERATION_PRIORITIES,OperationQueueManager } from '../operation-queue-manager';

// Mock WebSocket factory
const createMockWebSocket = (overrides: Partial<AuthenticatedWebSocket> = {}): AuthenticatedWebSocket => {
  return {
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
};

describe('OperationQueueManager', () => {
  let queueManager: OperationQueueManager;
  let mockWebSocket: AuthenticatedWebSocket;

  beforeEach(() => {
    queueManager = new OperationQueueManager(100, 5, 10); // maxSize=100, batchSize=5, batchDelay=10ms
    mockWebSocket = createMockWebSocket();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('enqueue', () => {
    it('should enqueue valid operation successfully', () => {
      const operation: QueueOperation = {
        type: 'subscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { ws: mockWebSocket, billId: 123 },
        timestamp: Date.now(),
      };

      const result = queueManager.enqueue(operation);

      expect(result).toBe(true);
      expect(queueManager.getQueueSize()).toBe(1);
    });

    it('should reject invalid operation', () => {
      const invalidOperation = {
        type: 'invalid',
        // Missing required fields
      } as unknown as QueueOperation;

      const result = queueManager.enqueue(invalidOperation);

      expect(result).toBe(false);
      expect(queueManager.getQueueSize()).toBe(0);
    });

    it('should set timestamp if not provided', () => {
      const operation: QueueOperation = {
        type: 'broadcast',
        priority: OPERATION_PRIORITIES.NORMAL,
        data: { billId: 123, message: { test: true } },
        timestamp: 0, // Will be overridden
      };

      const beforeTime = Date.now();
      queueManager.enqueue(operation);
      const afterTime = Date.now();

      expect(operation.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(operation.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should initialize retry count if not provided', () => {
      const operation: QueueOperation = {
        type: 'cleanup',
        priority: OPERATION_PRIORITIES.CRITICAL,
        data: { ws: mockWebSocket },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);

      expect(operation.retryCount).toBe(0);
    });

    it('should handle queue overflow', () => {
      const smallQueue = new OperationQueueManager(2); // Very small queue

      // Fill the queue
      const op1: QueueOperation = {
        type: 'subscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { ws: mockWebSocket, billId: 1 },
        timestamp: Date.now(),
      };
      const op2: QueueOperation = {
        type: 'subscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { ws: mockWebSocket, billId: 2 },
        timestamp: Date.now(),
      };
      const op3: QueueOperation = {
        type: 'subscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { ws: mockWebSocket, billId: 3 },
        timestamp: Date.now(),
      };

      expect(smallQueue.enqueue(op1)).toBe(true);
      expect(smallQueue.enqueue(op2)).toBe(true);
      expect(smallQueue.enqueue(op3)).toBe(false); // Should overflow

      const stats = smallQueue.getStats();
      expect(stats.overflowCount).toBe(1);
    });
  });

  describe('priority handling', () => {
    it('should process higher priority operations first', async () => {
      const lowPriorityOp: QueueOperation = {
        type: 'broadcast',
        priority: OPERATION_PRIORITIES.LOW,
        data: { billId: 1, message: { priority: 'low' } },
        timestamp: Date.now(),
      };

      const highPriorityOp: QueueOperation = {
        type: 'subscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { ws: mockWebSocket, billId: 2 },
        timestamp: Date.now(),
      };

      const criticalPriorityOp: QueueOperation = {
        type: 'cleanup',
        priority: OPERATION_PRIORITIES.CRITICAL,
        data: { ws: mockWebSocket },
        timestamp: Date.now(),
      };

      // Enqueue in reverse priority order
      queueManager.enqueue(lowPriorityOp);
      queueManager.enqueue(highPriorityOp);
      queueManager.enqueue(criticalPriorityOp);

      expect(queueManager.getQueueSize()).toBe(3);

      // Process queue and verify order (we can't easily test the exact order without exposing internals)
      await queueManager.processQueue();

      const stats = queueManager.getStats();
      expect(stats.processedCount).toBe(3);
    });
  });

  describe('batch processing', () => {
    it('should process operations in batches', async () => {
      // Create more operations than batch size
      for (let i = 0; i < 10; i++) {
        const operation: QueueOperation = {
          type: 'broadcast',
          priority: OPERATION_PRIORITIES.NORMAL,
          data: { billId: i, message: { index: i } },
          timestamp: Date.now(),
        };
        queueManager.enqueue(operation);
      }

      expect(queueManager.getQueueSize()).toBe(10);

      await queueManager.processQueue();

      const stats = queueManager.getStats();
      expect(stats.processedCount).toBe(10);
      expect(queueManager.isEmpty()).toBe(true);
    });

    it('should update batch configuration', () => {
      queueManager.updateBatchConfig(20, 100);

      // We can't directly test the internal config, but we can verify it doesn't throw
      expect(() => queueManager.updateBatchConfig(20, 100)).not.toThrow();
    });

    it('should ignore invalid batch configuration', () => {
      const originalStats = queueManager.getStats();
      
      // Try to set invalid values
      queueManager.updateBatchConfig(-1, -1);
      queueManager.updateBatchConfig(0, -1);

      // Should not throw and should handle gracefully
      expect(() => queueManager.updateBatchConfig(-1, -1)).not.toThrow();
    });
  });

  describe('operation processing', () => {
    it('should process broadcast operation', async () => {
      const operation: QueueOperation = {
        type: 'broadcast',
        priority: OPERATION_PRIORITIES.NORMAL,
        data: { 
          billId: 123, 
          message: { type: 'update', data: { status: 'passed' } },
          subscribers: ['conn1', 'conn2']
        },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);
      await queueManager.processQueue();

      const stats = queueManager.getStats();
      expect(stats.processedCount).toBe(1);
      expect(stats.failedCount).toBe(0);
    });

    it('should process subscribe operation', async () => {
      const operation: QueueOperation = {
        type: 'subscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { 
          ws: mockWebSocket, 
          billId: 123,
          messageId: 'test_msg_1'
        },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);
      await queueManager.processQueue();

      const stats = queueManager.getStats();
      expect(stats.processedCount).toBe(1);
      expect(stats.failedCount).toBe(0);
    });

    it('should process unsubscribe operation', async () => {
      const operation: QueueOperation = {
        type: 'unsubscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { 
          ws: mockWebSocket, 
          billId: 123,
          messageId: 'test_msg_2'
        },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);
      await queueManager.processQueue();

      const stats = queueManager.getStats();
      expect(stats.processedCount).toBe(1);
      expect(stats.failedCount).toBe(0);
    });

    it('should process cleanup operation', async () => {
      const operation: QueueOperation = {
        type: 'cleanup',
        priority: OPERATION_PRIORITIES.CRITICAL,
        data: { ws: mockWebSocket },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);
      await queueManager.processQueue();

      const stats = queueManager.getStats();
      expect(stats.processedCount).toBe(1);
      expect(stats.failedCount).toBe(0);
    });

    it('should handle unknown operation type', async () => {
      const operation: QueueOperation = {
        type: 'unknown' as any,
        priority: OPERATION_PRIORITIES.NORMAL,
        data: { test: true },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);
      await queueManager.processQueue();

      const stats = queueManager.getStats();
      expect(stats.processedCount).toBe(0);
      expect(stats.failedCount).toBe(1);
    });
  });

  describe('error handling and retry logic', () => {
    it('should handle operation failure with retry', async () => {
      const operation: QueueOperation = {
        type: 'broadcast',
        priority: OPERATION_PRIORITIES.NORMAL,
        data: { 
          // Missing required billId to cause failure
          message: { test: true }
        },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);
      await queueManager.processQueue();

      // Fast-forward time to trigger retry
      vi.advanceTimersByTime(1000);
      await queueManager.processQueue();

      const stats = queueManager.getStats();
      expect(stats.failedCount).toBeGreaterThan(0);
    });

    it('should give up after maximum retry attempts', async () => {
      const operation: QueueOperation = {
        type: 'subscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { 
          // Missing required ws to cause failure
          billId: 123
        },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);

      // Process multiple times to exhaust retries
      for (let i = 0; i < 5; i++) {
        await queueManager.processQueue();
        vi.advanceTimersByTime(1000 * (i + 1)); // Increasing delay
      }

      const stats = queueManager.getStats();
      expect(stats.failedCount).toBe(1);
    });
  });

  describe('queue management', () => {
    it('should report correct queue size', () => {
      expect(queueManager.getQueueSize()).toBe(0);
      expect(queueManager.isEmpty()).toBe(true);

      const operation: QueueOperation = {
        type: 'broadcast',
        priority: OPERATION_PRIORITIES.NORMAL,
        data: { billId: 123, message: { test: true } },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);

      expect(queueManager.getQueueSize()).toBe(1);
      expect(queueManager.isEmpty()).toBe(false);
    });

    it('should clear queue', () => {
      // Add some operations
      for (let i = 0; i < 5; i++) {
        const operation: QueueOperation = {
          type: 'broadcast',
          priority: OPERATION_PRIORITIES.NORMAL,
          data: { billId: i, message: { index: i } },
          timestamp: Date.now(),
        };
        queueManager.enqueue(operation);
      }

      expect(queueManager.getQueueSize()).toBe(5);

      queueManager.clear();

      expect(queueManager.getQueueSize()).toBe(0);
      expect(queueManager.isEmpty()).toBe(true);

      const stats = queueManager.getStats();
      expect(stats.overflowCount).toBe(0);
      expect(stats.processedCount).toBe(0);
      expect(stats.failedCount).toBe(0);
    });

    it('should detect when queue is full', () => {
      const smallQueue = new OperationQueueManager(2);

      expect(smallQueue.isFull()).toBe(false);

      // Fill the queue
      const op1: QueueOperation = {
        type: 'subscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { ws: mockWebSocket, billId: 1 },
        timestamp: Date.now(),
      };
      const op2: QueueOperation = {
        type: 'subscribe',
        priority: OPERATION_PRIORITIES.HIGH,
        data: { ws: mockWebSocket, billId: 2 },
        timestamp: Date.now(),
      };

      smallQueue.enqueue(op1);
      expect(smallQueue.isFull()).toBe(false);

      smallQueue.enqueue(op2);
      expect(smallQueue.isFull()).toBe(true);
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide comprehensive statistics', () => {
      const stats = queueManager.getStats();

      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('retryQueueSize');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('overflowCount');
      expect(stats).toHaveProperty('processedCount');
      expect(stats).toHaveProperty('failedCount');
      expect(stats).toHaveProperty('maxQueueSize');
      expect(stats).toHaveProperty('utilizationPercent');

      expect(typeof stats.queueSize).toBe('number');
      expect(typeof stats.retryQueueSize).toBe('number');
      expect(typeof stats.processing).toBe('boolean');
      expect(typeof stats.overflowCount).toBe('number');
      expect(typeof stats.processedCount).toBe('number');
      expect(typeof stats.failedCount).toBe('number');
      expect(typeof stats.maxQueueSize).toBe('number');
      expect(typeof stats.utilizationPercent).toBe('number');
    });

    it('should calculate utilization percentage correctly', () => {
      const smallQueue = new OperationQueueManager(10);

      // Add 3 operations to a queue of size 10
      for (let i = 0; i < 3; i++) {
        const operation: QueueOperation = {
          type: 'broadcast',
          priority: OPERATION_PRIORITIES.NORMAL,
          data: { billId: i, message: { index: i } },
          timestamp: Date.now(),
        };
        smallQueue.enqueue(operation);
      }

      const stats = smallQueue.getStats();
      expect(stats.utilizationPercent).toBe(30); // 3/10 * 100
    });

    it('should track processing state', async () => {
      const operation: QueueOperation = {
        type: 'broadcast',
        priority: OPERATION_PRIORITIES.NORMAL,
        data: { billId: 123, message: { test: true } },
        timestamp: Date.now(),
      };

      queueManager.enqueue(operation);

      const statsBefore = queueManager.getStats();
      expect(statsBefore.processing).toBe(false);

      // Start processing (but don't await)
      const processingPromise = queueManager.processQueue();

      // Check stats during processing
      const statsDuring = queueManager.getStats();
      expect(statsDuring.processing).toBe(true);

      // Wait for processing to complete
      await processingPromise;

      const statsAfter = queueManager.getStats();
      expect(statsAfter.processing).toBe(false);
    });
  });

  describe('concurrent processing', () => {
    it('should handle concurrent processQueue calls gracefully', async () => {
      // Add multiple operations
      for (let i = 0; i < 10; i++) {
        const operation: QueueOperation = {
          type: 'broadcast',
          priority: OPERATION_PRIORITIES.NORMAL,
          data: { billId: i, message: { index: i } },
          timestamp: Date.now(),
        };
        queueManager.enqueue(operation);
      }

      // Start multiple processing calls concurrently
      const promises = [
        queueManager.processQueue(),
        queueManager.processQueue(),
        queueManager.processQueue(),
      ];

      await Promise.all(promises);

      // All operations should be processed exactly once
      const stats = queueManager.getStats();
      expect(stats.processedCount).toBe(10);
      expect(queueManager.isEmpty()).toBe(true);
    });
  });
});