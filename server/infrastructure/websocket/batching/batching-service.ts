/**
 * Batching Service - Integrated into WebSocket Module
 * 
 * Moved from shared/infrastructure/realtime/batching-service.ts
 * Enhanced for integration with the WebSocket service architecture
 */

import { CircularBuffer } from '../utils/circular-buffer';
import { logger } from '@server/infrastructure/observability';

import { PriorityQueue } from '../utils/priority-queue';

// Temporary fallback logger until shared/core import is resolved
const logger = {
  info: (message: string, context?: unknown) => {
    logger.info(`[INFO] ${message}`, context || '');
  },
  warn: (message: string, context?: unknown) => {
    logger.warn(`[WARN] ${message}`, context || '');
  },
  error: (message: string, context?: unknown, error?: Error) => {
    logger.error(`[ERROR] ${message}`, context || '', error || '');
  },
  debug: (message: string, context?: unknown) => {
    logger.info(`[DEBUG] ${message}`, context || '');
  }
};

export interface BatchableMessage {
  type: string;
  data?: unknown;
  priority?: number;
  timestamp?: number;
  messageId?: string;
  user_id?: string;
}

export interface BatchingConfig {
  maxBatchSize: number;
  maxBatchDelay: number;
  priorityThreshold: number;
  memoryThreshold: number;
  compressionEnabled: boolean;
  maxQueueSize: number;
  staleMessageAge: number;
  adaptiveBatching: boolean;
}

export interface BatchMetrics {
  totalMessages: number;
  totalBatches: number;
  averageBatchSize: number;
  compressionRatio: number;
  memoryUsage: number;
  droppedMessages: number;
  failedBatches: number;
  averageLatency: number;
  queueDepth: number;
}

/**
 * Enhanced Batching Service integrated with WebSocket infrastructure
 */
export class BatchingService {
  private messageQueues: Map<string, PriorityQueue<BatchableMessage>> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: BatchingConfig;
  private metrics: BatchMetrics;
  private isShuttingDown = false;
  private memoryMonitorInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private latencyBuffer: CircularBuffer<number>;

  constructor(config: Partial<BatchingConfig> = {}) {
    this.config = {
      maxBatchSize: config.maxBatchSize ?? 10,
      maxBatchDelay: config.maxBatchDelay ?? 50,
      priorityThreshold: config.priorityThreshold ?? 5,
      memoryThreshold: config.memoryThreshold ?? 85,
      compressionEnabled: config.compressionEnabled ?? true,
      maxQueueSize: config.maxQueueSize ?? 10000,
      staleMessageAge: config.staleMessageAge ?? 300000, // 5 minutes
      adaptiveBatching: config.adaptiveBatching ?? true
    };

    this.metrics = {
      totalMessages: 0,
      totalBatches: 0,
      averageBatchSize: 0,
      compressionRatio: 0,
      memoryUsage: 0,
      droppedMessages: 0,
      failedBatches: 0,
      averageLatency: 0,
      queueDepth: 0
    };

    this.latencyBuffer = new CircularBuffer<number>(1000);

    this.startBackgroundTasks();

    logger.info('BatchingService initialized', {
      component: 'BatchingService',
      config: this.config
    });
  }

  /**
   * Queue a message for batched delivery
   */
  queueMessage(
    user_id: string, 
    message: BatchableMessage, 
    deliveryCallback: (batch: BatchableMessage[]) => Promise<void>
  ): boolean {
    if (this.isShuttingDown) {
      logger.warn('Rejected message during shutdown', {
        component: 'BatchingService',
        user_id
      });
      return false;
    }

    const queueEntryTime = Date.now();
    if (!message.timestamp) {
      message.timestamp = queueEntryTime;
    }

    // Get or create priority queue for this user
    let queue = this.messageQueues.get(user_id);
    if (!queue) {
      queue = new PriorityQueue<BatchableMessage>(this.config.maxQueueSize);
      this.messageQueues.set(user_id, queue);
    }

    const priority = message.priority ?? 1;

    // High-priority messages bypass batching
    if (priority >= this.config.priorityThreshold) {
      this.sendImmediately(user_id, message, deliveryCallback, queueEntryTime);
      return true;
    }

    // Check queue capacity
    if (queue.size() >= this.config.maxQueueSize) {
      this.metrics.droppedMessages++;
      logger.warn('Message dropped - queue full', {
        component: 'BatchingService',
        user_id,
        queueSize: queue.size(),
        maxQueueSize: this.config.maxQueueSize
      });
      return false;
    }

    // Enqueue message
    queue.enqueue(message, priority);
    this.metrics.totalMessages++;
    this.updateQueueDepth();

    // Set up batch timer if not already running
    if (!this.batchTimers.has(user_id)) {
      const timer = setTimeout(() => {
        this.processBatch(user_id, deliveryCallback);
      }, this.config.maxBatchDelay);

      this.batchTimers.set(user_id, timer);
    }

    // Trigger immediate batch if size threshold reached
    if (queue.size() >= this.config.maxBatchSize) {
      this.processBatch(user_id, deliveryCallback);
    }

    return true;
  }

  /**
   * Send high-priority message immediately
   */
  private async sendImmediately(
    user_id: string, 
    message: BatchableMessage, 
    deliveryCallback: (batch: BatchableMessage[]) => Promise<void>,
    queueEntryTime: number
  ): Promise<void> {
    try {
      await deliveryCallback([message]);
      
      this.metrics.totalMessages++;
      this.metrics.totalBatches++;
      this.trackLatency(Date.now() - queueEntryTime);

      logger.debug('High-priority message sent immediately', {
        component: 'BatchingService',
        user_id,
        messageType: message.type,
        latency: Date.now() - queueEntryTime
      });
    } catch (error) {
      this.metrics.failedBatches++;
      logger.error('Failed to send immediate message', {
        component: 'BatchingService',
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process and send a batch of queued messages
   */
  private async processBatch(
    user_id: string, 
    deliveryCallback: (batch: BatchableMessage[]) => Promise<void>
  ): Promise<void> {
    // Clear the pending timer
    const timer = this.batchTimers.get(user_id);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(user_id);
    }

    const queue = this.messageQueues.get(user_id);
    if (!queue || queue.isEmpty()) {
      return;
    }

    const batchStartTime = Date.now();
    const batch: BatchableMessage[] = [];
    
    // Extract batch from priority queue
    for (let i = 0; i < this.config.maxBatchSize && !queue.isEmpty(); i++) {
      const message = queue.dequeue();
      if (message) {
        batch.push(message);
      }
    }

    if (batch.length === 0) {
      return;
    }

    try {
      await deliveryCallback(batch);

      this.metrics.totalBatches++;
      this.updateAverageBatchSize(batch.length);
      this.updateQueueDepth();
      
      // Track latency from oldest message in batch
      const oldestTimestamp = Math.min(...batch.map(m => m.timestamp || Date.now()));
      this.trackLatency(Date.now() - oldestTimestamp);

      logger.debug('Batch processed successfully', {
        component: 'BatchingService',
        user_id,
        batchSize: batch.length,
        queueRemaining: queue.size(),
        processingTime: Date.now() - batchStartTime
      });

    } catch (error) {
      this.metrics.failedBatches++;
      
      // Re-queue failed messages with higher priority
      for (const message of batch) {
        const retryPriority = (message.priority ?? 1) + 1;
        queue.enqueue(message, retryPriority);
      }

      logger.error('Failed to process batch - messages re-queued', {
        component: 'BatchingService',
        user_id,
        batchSize: batch.length,
        queueSize: queue.size(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Flush all pending batches
   */
  async flushAll(
    deliveryCallback: (user_id: string, batch: BatchableMessage[]) => Promise<void>
  ): Promise<void> {
    const flushPromises: Promise<void>[] = [];
    const userIds = Array.from(this.messageQueues.keys());

    for (const user_id of userIds) {
      const queue = this.messageQueues.get(user_id);
      if (queue && !queue.isEmpty()) {
        const batch: BatchableMessage[] = [];
        while (!queue.isEmpty()) {
          const message = queue.dequeue();
          if (message) {
            batch.push(message);
          }
        }

        if (batch.length > 0) {
          flushPromises.push(
            deliveryCallback(user_id, batch).catch(error => {
              logger.error('Failed to flush batch', {
                component: 'BatchingService',
                user_id,
                batchSize: batch.length,
                error: error instanceof Error ? error.message : String(error)
              });
            })
          );
        }
      }

      // Clear timer
      const timer = this.batchTimers.get(user_id);
      if (timer) {
        clearTimeout(timer);
        this.batchTimers.delete(user_id);
      }
    }

    await Promise.allSettled(flushPromises);

    logger.info('All batches flushed', {
      component: 'BatchingService',
      batchesFlushed: flushPromises.length,
      users: userIds.length
    });
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig: Partial<BatchingConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    logger.info('BatchingService configuration updated', {
      component: 'BatchingService',
      oldConfig,
      newConfig: this.config
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): BatchMetrics {
    this.updateMemoryUsage();
    this.updateQueueDepth();
    return { ...this.metrics };
  }

  /**
   * Clean up stale messages
   */
  cleanup(): void {
    const totalRemoved = 0;
    const emptyQueues: string[] = [];

    for (const [user_id, queue] of Array.from(this.messageQueues.entries())) {
      // Note: PriorityQueue doesn't have removeStaleMessages method
      // This would need to be implemented if needed
      
      if (queue.isEmpty()) {
        emptyQueues.push(user_id);
      }
    }

    // Remove empty queues and their timers
    for (const user_id of emptyQueues) {
      this.messageQueues.delete(user_id);
      
      const timer = this.batchTimers.get(user_id);
      if (timer) {
        clearTimeout(timer);
        this.batchTimers.delete(user_id);
      }
    }

    if (totalRemoved > 0 || emptyQueues.length > 0) {
      logger.info('Cleanup completed', {
        component: 'BatchingService',
        staleMessagesRemoved: totalRemoved,
        emptyQueuesRemoved: emptyQueues.length,
        activeQueues: this.messageQueues.size
      });
    }

    this.updateQueueDepth();
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    logger.info('BatchingService shutting down', {
      component: 'BatchingService',
      pendingMessages: this.calculateTotalQueuedMessages()
    });

    // Stop background tasks
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all pending timers
    for (const timer of Array.from(this.batchTimers.values())) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    logger.info('BatchingService shutdown complete', {
      component: 'BatchingService',
      finalMetrics: this.getMetrics()
    });
  }

  /**
   * Start background monitoring tasks
   */
  private startBackgroundTasks(): void {
    // Memory monitoring
    this.memoryMonitorInterval = setInterval(() => {
      this.updateMemoryUsage();
    }, 60000); // Every minute

    // Cleanup task
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 120000); // Every 2 minutes
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  /**
   * Update average batch size
   */
  private updateAverageBatchSize(batchSize: number): void {
    if (this.metrics.totalBatches === 1) {
      this.metrics.averageBatchSize = batchSize;
    } else {
      this.metrics.averageBatchSize = (
        (this.metrics.averageBatchSize * (this.metrics.totalBatches - 1)) + batchSize
      ) / this.metrics.totalBatches;
    }
  }

  /**
   * Track message latency
   */
  private trackLatency(latency: number): void {
    this.latencyBuffer.push(latency);
    
    // Calculate average from buffer
    const samples = this.latencyBuffer.toArray();
    const sum = samples.reduce((a, b) => a + b, 0);
    this.metrics.averageLatency = sum / samples.length;
  }

  /**
   * Calculate total queued messages
   */
  private calculateTotalQueuedMessages(): number {
    let total = 0;
    for (const queue of Array.from(this.messageQueues.values())) {
      total += queue.size();
    }
    return total;
  }

  /**
   * Update queue depth metric
   */
  private updateQueueDepth(): void {
    this.metrics.queueDepth = this.calculateTotalQueuedMessages();
  }
}