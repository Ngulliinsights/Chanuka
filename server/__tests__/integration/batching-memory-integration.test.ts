// ============================================================================
// BATCHING & MEMORY INTEGRATION TESTS
// ============================================================================
// Tests integration between BatchingService and MemoryAwareSocketService
// Verifies memory optimization triggers and message batching efficiency

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BatchingService, BatchableMessage } from '@server/infrastructure/batching-service.js';
import { MemoryAwareSocketService } from '@server/infrastructure/memory-aware-socket-service.js';
import { logger } from '@shared/core/src/observability/logging/index.js';

describe('Batching & Memory Integration Tests', () => {
  let batchingService: BatchingService;
  let memoryService: MemoryAwareSocketService;

  beforeEach(() => {
    batchingService = new BatchingService({
      maxBatchSize: 5,
      maxBatchDelay: 100,
      compressionEnabled: true
    });

    memoryService = new MemoryAwareSocketService({
      warning: 70,
      critical: 85,
      emergency: 95
    }, batchingService);
  });

  afterEach(async () => {
    await batchingService.shutdown();
    await memoryService.shutdown();
  });

  test('should integrate batching with memory management', async () => {
    const connectionId = 'test-connection-1';
    const user_id = 'test-user-1';

    // Register connection
    memoryService.registerConnection(connectionId, user_id);

    // Track delivered batches
    const deliveredBatches: BatchableMessage[][] = [];
    const deliveryCallback = async (batch: BatchableMessage[]) => {
      deliveredBatches.push(batch);
    };

    // Queue multiple messages
    const messages: BatchableMessage[] = [
      { type: 'message1', data: { content: 'test1' } },
      { type: 'message2', data: { content: 'test2' } },
      { type: 'message3', data: { content: 'test3' } },
      { type: 'message4', data: { content: 'test4' } },
      { type: 'message5', data: { content: 'test5' } }
    ];

    // Queue messages
    for (const message of messages) {
      const queued = batchingService.queueMessage(user_id, message, deliveryCallback);
      expect(queued).toBe(true);
      
      // Update memory service
      memoryService.updateConnectionActivity(connectionId);
      memoryService.bufferMessage(connectionId, message);
    }

    // Wait for batch processing
    await new Promise(resolve => setTimeout(resolve, 150));

    // Verify batch was delivered
    expect(deliveredBatches.length).toBeGreaterThan(0);
    expect(deliveredBatches[0].length).toBe(5);

    // Verify metrics
    const batchMetrics = batchingService.getMetrics();
    expect(batchMetrics.totalMessages).toBe(5);
    expect(batchMetrics.totalBatches).toBeGreaterThan(0);

    const memoryMetrics = memoryService.getMemoryMetrics();
    expect(memoryMetrics.connectionCount).toBe(1);
  });

  test('should handle high-priority messages immediately', async () => {
    const connectionId = 'test-connection-2';
    const user_id = 'test-user-2';

    memoryService.registerConnection(connectionId, user_id);

    const deliveredBatches: BatchableMessage[][] = [];
    const deliveryCallback = async (batch: BatchableMessage[]) => {
      deliveredBatches.push(batch);
    };

    // Queue high-priority message
    const highPriorityMessage: BatchableMessage = {
      type: 'urgent_notification',
      data: { alert: 'System maintenance in 5 minutes' },
      priority: 10 // Above threshold
    };

    const queued = batchingService.queueMessage(user_id, highPriorityMessage, deliveryCallback);
    expect(queued).toBe(true);

    // Should be delivered immediately
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(deliveredBatches.length).toBe(1);
    expect(deliveredBatches[0].length).toBe(1);
    expect(deliveredBatches[0][0].type).toBe('urgent_notification');
  });

  test('should trigger memory optimization under pressure', async () => {
    // Create many connections to simulate memory pressure
    const connectionCount = 100;
    const connections: string[] = [];

    for (let i = 0; i < connectionCount; i++) {
      const connectionId = `connection-${i}`;
      const user_id = `user-${i}`;
      
      memoryService.registerConnection(connectionId, user_id);
      connections.push(connectionId);

      // Buffer many messages to increase memory usage
      for (let j = 0; j < 50; j++) {
        const message: BatchableMessage = {
          type: 'test_message',
          data: { content: 'x'.repeat(1000) } // 1KB message
        };
        memoryService.bufferMessage(connectionId, message);
      }
    }

    // Monitor memory events
    const memoryEvents: any[] = [];
    memoryService.on('memoryPressureChange', (event) => {
      memoryEvents.push(event);
    });

    // Force memory optimization
    await memoryService.forceOptimization('high');

    // Verify optimization occurred
    const performanceMetrics = memoryService.getPerformanceMetrics();
    expect(performanceMetrics.optimizationsTriggered).toBeGreaterThan(0);

    // Cleanup connections
    for (const connectionId of connections) {
      memoryService.unregisterConnection(connectionId);
    }
  });

  test('should adapt batching configuration under memory pressure', async () => {
    const user_id = 'test-user-3';
    const connectionId = 'test-connection-3';

    memoryService.registerConnection(connectionId, user_id);

    // Get initial batching configuration
    const initialMetrics = batchingService.getMetrics();

    // Simulate memory pressure by forcing optimization
    await memoryService.forceOptimization('critical');

    // Queue messages after optimization
    const deliveredBatches: BatchableMessage[][] = [];
    const deliveryCallback = async (batch: BatchableMessage[]) => {
      deliveredBatches.push(batch);
    };

    const messages: BatchableMessage[] = [];
    for (let i = 0; i < 10; i++) {
      messages.push({
        type: 'test_message',
        data: { content: `message ${i}` }
      });
    }

    // Queue messages
    for (const message of messages) {
      batchingService.queueMessage(user_id, message, deliveryCallback);
    }

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify batching still works but may be optimized
    expect(deliveredBatches.length).toBeGreaterThan(0);
    
    const finalMetrics = batchingService.getMetrics();
    expect(finalMetrics.totalMessages).toBeGreaterThan(initialMetrics.totalMessages);
  });

  test('should handle connection drops during memory optimization', async () => {
    const connectionIds: string[] = [];
    const droppedConnections: string[] = [];

    // Create connections
    for (let i = 0; i < 20; i++) {
      const connectionId = `connection-${i}`;
      const user_id = `user-${i}`;
      
      memoryService.registerConnection(connectionId, user_id);
      connectionIds.push(connectionId);
    }

    // Listen for connection drops
    memoryService.on('dropConnection', (connectionId: string) => {
      droppedConnections.push(connectionId);
    });

    // Force critical optimization that should drop connections
    await memoryService.forceOptimization('critical');

    // Verify some connections were dropped
    expect(droppedConnections.length).toBeGreaterThan(0);

    // Verify remaining connections are still tracked
    const memoryMetrics = memoryService.getMemoryMetrics();
    expect(memoryMetrics.connectionCount).toBeLessThan(connectionIds.length);

    // Cleanup remaining connections
    for (const connectionId of connectionIds) {
      if (!droppedConnections.includes(connectionId)) {
        memoryService.unregisterConnection(connectionId);
      }
    }
  });

  test('should maintain message delivery during optimization', async () => {
    const user_id = 'test-user-4';
    const connectionId = 'test-connection-4';

    memoryService.registerConnection(connectionId, user_id);

    const deliveredBatches: BatchableMessage[][] = [];
    const deliveryCallback = async (batch: BatchableMessage[]) => {
      deliveredBatches.push(batch);
    };

    // Start queuing messages
    const messageInterval = setInterval(() => {
      const message: BatchableMessage = {
        type: 'continuous_message',
        data: { timestamp: Date.now() }
      };
      batchingService.queueMessage(user_id, message, deliveryCallback);
    }, 50);

    // Let messages queue for a bit
    await new Promise(resolve => setTimeout(resolve, 200));

    // Trigger optimization while messages are being queued
    await memoryService.forceOptimization('medium');

    // Continue queuing messages
    await new Promise(resolve => setTimeout(resolve, 200));

    // Stop queuing
    clearInterval(messageInterval);

    // Flush remaining messages
    await batchingService.flushAll(async (user_id, batch) => {
      deliveredBatches.push(batch);
    });

    // Verify messages were delivered despite optimization
    expect(deliveredBatches.length).toBeGreaterThan(0);
    
    const totalMessages = deliveredBatches.reduce((sum, batch) => sum + batch.length, 0);
    expect(totalMessages).toBeGreaterThan(0);

    logger.info('Message delivery test completed', {
      batchesDelivered: deliveredBatches.length,
      totalMessages
    });
  });

  test('should recover from memory pressure', async () => {
    const user_id = 'test-user-5';
    const connectionId = 'test-connection-5';

    memoryService.registerConnection(connectionId, user_id);

    // Monitor memory pressure changes
    const pressureChanges: any[] = [];
    memoryService.on('memoryPressureChange', (event) => {
      pressureChanges.push(event);
    });

    // Simulate memory pressure
    await memoryService.forceOptimization('critical');

    // Wait for potential recovery
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Force garbage collection to simulate memory recovery
    if (global.gc) {
      global.gc();
    }

    // Check if system can still handle normal operations
    const deliveredBatches: BatchableMessage[][] = [];
    const deliveryCallback = async (batch: BatchableMessage[]) => {
      deliveredBatches.push(batch);
    };

    const message: BatchableMessage = {
      type: 'recovery_test',
      data: { content: 'Testing recovery' }
    };

    const queued = batchingService.queueMessage(user_id, message, deliveryCallback);
    expect(queued).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(deliveredBatches.length).toBeGreaterThan(0);

    logger.info('Memory recovery test completed', {
      pressureChanges: pressureChanges.length,
      finalMetrics: memoryService.getPerformanceMetrics()
    });
  });

  test('should handle batch compression under memory pressure', async () => {
    const user_id = 'test-user-6';
    const connectionId = 'test-connection-6';

    memoryService.registerConnection(connectionId, user_id);

    const deliveredBatches: BatchableMessage[][] = [];
    const deliveryCallback = async (batch: BatchableMessage[]) => {
      deliveredBatches.push(batch);
    };

    // Create large messages that would benefit from compression
    const largeMessages: BatchableMessage[] = [];
    for (let i = 0; i < 10; i++) {
      largeMessages.push({
        type: 'large_message',
        data: {
          content: 'x'.repeat(2000), // 2KB content
          metadata: {
            timestamp: Date.now(),
            sequence: i,
            payload: 'y'.repeat(1000)
          }
        }
      });
    }

    // Queue messages
    for (const message of largeMessages) {
      batchingService.queueMessage(user_id, message, deliveryCallback);
    }

    // Trigger memory optimization to enable compression
    await memoryService.forceOptimization('medium');

    // Wait for batch processing
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify batches were delivered
    expect(deliveredBatches.length).toBeGreaterThan(0);

    // Check compression metrics
    const batchMetrics = batchingService.getMetrics();
    expect(batchMetrics.totalMessages).toBe(10);

    logger.info('Compression test completed', {
      batchMetrics,
      deliveredBatches: deliveredBatches.length
    });
  });
});
