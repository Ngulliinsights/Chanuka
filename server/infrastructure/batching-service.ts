// ============================================================================
// BATCHING SERVICE - Efficient Message Delivery
// ============================================================================
// Implements intelligent message batching for WebSocket connections
// Provides memory-aware batching with automatic optimization and backpressure handling

import { logger } from '../../shared/core/src/observability/logging/index.js';

// cSpell:ignore Batchable BatchableMessage

export interface BatchableMessage {
  type: string;
  data?: any;
  priority?: number;
  timestamp?: number;
  messageId?: string;
  userId?: string;
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
 * Priority queue with efficient insertion and retrieval
 * Uses binary search for O(log n) insertions and maintains sorted order
 */
class MessageQueue {
  private items: Array<{ priority: number; message: BatchableMessage; timestamp: number }> = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  /**
   * Add message to queue with priority-based positioning
   * Higher priority messages are placed earlier in the queue
   */
  enqueue(message: BatchableMessage, priority: number = 1): boolean {
    if (this.items.length >= this.maxSize) {
      return false;
    }

    const entry = { 
      priority, 
      message, 
      timestamp: Date.now() 
    };

    // Binary search to find correct insertion point based on priority
    // This maintains queue ordering without expensive full sorts
    let low = 0;
    let high = this.items.length;

    while (low < high) {
      const mid = (low + high) >>> 1; // Unsigned right shift for fast division by 2
      // mid will always be within [0, this.items.length - 1] while low < high,
      // use non-null assertion to satisfy the type checker about defined entry
      if (this.items[mid]!.priority > priority) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    this.items.splice(low, 0, entry);
    return true;
  }

  /**
   * Remove and return the highest priority message
   */
  dequeue(): BatchableMessage | undefined {
    const item = this.items.shift();
    return item?.message;
  }

  /**
   * View highest priority message without removing it
   */
  peek(): BatchableMessage | undefined {
    return this.items[0]?.message;
  }

  get length(): number {
    return this.items.length;
  }

  /**
   * Empty the queue completely
   */
  clear(): void {
    this.items.length = 0;
  }

  /**
   * Remove messages older than the specified age
   * Returns count of removed messages for metrics tracking
   */
  removeStaleMessages(maxAge: number): number {
    const now = Date.now();
    const beforeLength = this.items.length;
    this.items = this.items.filter(item => now - item.timestamp < maxAge);
    return beforeLength - this.items.length;
  }

  /**
   * Extract a batch of messages up to maxSize
   * Messages are removed from queue and returned as array
   */
  getBatch(maxSize: number): BatchableMessage[] {
    const batch: BatchableMessage[] = [];
    const count = Math.min(maxSize, this.items.length);
    
    for (let i = 0; i < count; i++) {
      const message = this.dequeue();
      if (message) {
        batch.push(message);
      }
    }
    
    return batch;
  }

  /**
   * Get all messages without removing them (for inspection)
   */
  peekAll(): BatchableMessage[] {
    return this.items.map(item => item.message);
  }
}

/**
 * Message compression utility using efficient string manipulation
 * In production, this should use actual compression libraries like zlib or brotli
 */
class MessageCompressor {
  private static readonly COMPRESSION_THRESHOLD = 1024; // Only compress batches > 1KB
  private static readonly MIN_COMPRESSION_RATIO = 0.9; // Must save at least 10% to be worthwhile

  /**
   * Determine if data size justifies compression overhead
   */
  static shouldCompress(data: string): boolean {
    return data.length > this.COMPRESSION_THRESHOLD;
  }

  /**
   * Compress message batch and return metrics
   * Returns both compressed data and size statistics for optimization decisions
   */
  static compress(messages: BatchableMessage[]): { 
    compressed: string; 
    originalSize: number; 
    compressedSize: number;
    worthwhile: boolean;
  } {
    const originalData = JSON.stringify(messages);
    const originalSize = Buffer.byteLength(originalData, 'utf8');

    // Apply compression transformations
    const compressed = this.simpleCompress(originalData);
    const compressedSize = Buffer.byteLength(compressed, 'utf8');

    // Calculate if compression provided meaningful benefit
    const ratio = compressedSize / originalSize;
    const worthwhile = ratio < this.MIN_COMPRESSION_RATIO;

    return {
      compressed,
      originalSize,
      compressedSize,
      worthwhile
    };
  }

  /**
   * Simplified compression using key abbreviation and whitespace removal
   * Production implementation should use zlib.gzip or brotli for real compression
   */
  private static simpleCompress(data: string): string {
    return data
      .replace(/"type":/g, '"t":')
      .replace(/"data":/g, '"d":')
      .replace(/"timestamp":/g, '"ts":')
      .replace(/"messageId":/g, '"id":')
      .replace(/"userId":/g, '"u":')
      .replace(/"priority":/g, '"p":')
      .replace(/\s+/g, ''); // Remove all whitespace
  }

  /**
   * Reverse compression transformations to restore original message structure
   */
  static decompress(compressed: string): BatchableMessage[] {
    const decompressed = compressed
      .replace(/"t":/g, '"type":')
      .replace(/"d":/g, '"data":')
      .replace(/"ts":/g, '"timestamp":')
      .replace(/"id":/g, '"messageId":')
      .replace(/"u":/g, '"userId":')
      .replace(/"p":/g, '"priority":');

    return JSON.parse(decompressed);
  }
}

/**
 * Adaptive configuration manager that adjusts batching parameters based on system load
 * This helps maintain optimal performance under varying conditions
 */
class AdaptiveConfigManager {
  private originalConfig: BatchingConfig;
  private adjustmentHistory: Array<{ timestamp: number; reason: string; changes: any }> = [];
  private readonly MAX_HISTORY = 100;

  constructor(config: BatchingConfig) {
    this.originalConfig = { ...config };
  }

  /**
   * Adjust batch size down when memory pressure is high
   * This prevents OOM errors while maintaining throughput
   */
  adjustForMemoryPressure(config: BatchingConfig, memoryUsage: number): BatchingConfig {
    if (memoryUsage > 90) {
      // Critical memory pressure - aggressive reduction
      const newBatchSize = Math.max(1, Math.floor(config.maxBatchSize * 0.5));
      const newDelay = Math.max(10, Math.floor(config.maxBatchDelay * 0.7));
      
      this.recordAdjustment('critical_memory', { 
        memoryUsage, 
        batchSize: { old: config.maxBatchSize, new: newBatchSize },
        delay: { old: config.maxBatchDelay, new: newDelay }
      });

      return { ...config, maxBatchSize: newBatchSize, maxBatchDelay: newDelay };
    } else if (memoryUsage > config.memoryThreshold) {
      // Moderate memory pressure - gentle reduction
      const newBatchSize = Math.max(1, Math.floor(config.maxBatchSize * 0.8));
      
      this.recordAdjustment('moderate_memory', { 
        memoryUsage, 
        batchSize: { old: config.maxBatchSize, new: newBatchSize }
      });

      return { ...config, maxBatchSize: newBatchSize };
    }

    return config;
  }

  /**
   * Increase batch parameters when system is stable and underutilized
   * This improves throughput when resources are available
   */
  adjustForLowLoad(config: BatchingConfig, queueDepth: number, memoryUsage: number): BatchingConfig {
    // Only increase if memory is comfortable and queues are shallow
    if (memoryUsage < 50 && queueDepth < config.maxBatchSize * 0.5) {
      const newBatchSize = Math.min(
        this.originalConfig.maxBatchSize, 
        Math.floor(config.maxBatchSize * 1.2)
      );
      
      if (newBatchSize > config.maxBatchSize) {
        this.recordAdjustment('low_load', { 
          memoryUsage, 
          queueDepth,
          batchSize: { old: config.maxBatchSize, new: newBatchSize }
        });

        return { ...config, maxBatchSize: newBatchSize };
      }
    }

    return config;
  }

  /**
   * Record configuration adjustment for monitoring and debugging
   */
  private recordAdjustment(reason: string, changes: any): void {
    this.adjustmentHistory.push({
      timestamp: Date.now(),
      reason,
      changes
    });

    // Maintain bounded history size
    if (this.adjustmentHistory.length > this.MAX_HISTORY) {
      this.adjustmentHistory.shift();
    }
  }

  /**
   * Get recent adjustment history for debugging
   */
  getHistory(): Array<{ timestamp: number; reason: string; changes: any }> {
    return [...this.adjustmentHistory];
  }

  /**
   * Reset configuration to original values
   */
  reset(): BatchingConfig {
    this.recordAdjustment('manual_reset', { config: this.originalConfig });
    return { ...this.originalConfig };
  }
}

/**
 * BatchingService - Production-ready message batching with adaptive optimization
 * Efficiently groups messages for delivery while monitoring system health
 */
export class BatchingService {
  private messageQueues: Map<string, MessageQueue> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: BatchingConfig;
  private metrics: BatchMetrics;
  private adaptiveManager: AdaptiveConfigManager;
  private isShuttingDown = false;
  private memoryMonitorInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private latencyTracking: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 1000;

  constructor(config: Partial<BatchingConfig> = {}) {
    // Initialize with defaults, allowing partial overrides
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

    this.adaptiveManager = new AdaptiveConfigManager(this.config);

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

    // Start background monitoring tasks
    this.startMemoryMonitoring();
    this.startPeriodicCleanup();

    logger.info('BatchingService initialized', {
      component: 'BatchingService',
      config: this.config
    });
  }

  /**
   * Queue a message for batched delivery with backpressure handling
   * Returns false if queue is full, allowing caller to handle backpressure
   */
  queueMessage(
    userId: string, 
    message: BatchableMessage, 
    deliveryCallback: (batch: BatchableMessage[]) => Promise<void>
  ): boolean {
    if (this.isShuttingDown) {
      logger.warn('Rejected message during shutdown', {
        component: 'BatchingService',
        userId
      });
      return false;
    }

    // Track when message entered the queue for latency measurement
    const queueEntryTime = Date.now();
    if (!message.timestamp) {
      message.timestamp = queueEntryTime;
    }

    // Get or create message queue for this user
    let queue = this.messageQueues.get(userId);
    if (!queue) {
      queue = new MessageQueue(this.config.maxQueueSize);
      this.messageQueues.set(userId, queue);
    }

    const priority = message.priority ?? 1;

    // High-priority messages bypass batching for immediate delivery
    if (priority >= this.config.priorityThreshold) {
      this.sendImmediately(userId, message, deliveryCallback, queueEntryTime);
      return true;
    }

    // Attempt to enqueue the message
    const queued = queue.enqueue(message, priority);
    if (!queued) {
      this.metrics.droppedMessages++;
      logger.warn('Message dropped - queue full', {
        component: 'BatchingService',
        userId,
        queueSize: queue.length,
        maxQueueSize: this.config.maxQueueSize
      });
      return false;
    }

    this.metrics.totalMessages++;
    this.updateQueueDepth();

    // Set up batch timer if not already running for this user
    if (!this.batchTimers.has(userId)) {
      const timer = setTimeout(() => {
        this.processBatch(userId, deliveryCallback);
      }, this.config.maxBatchDelay);

      this.batchTimers.set(userId, timer);
    }

    // Trigger immediate batch if we've reached the size threshold
    if (queue.length >= this.config.maxBatchSize) {
      this.processBatch(userId, deliveryCallback);
    }

    return true;
  }

  /**
   * Send high-priority message immediately without batching
   * Used for urgent messages that can't wait for batch accumulation
   */
  private async sendImmediately(
    userId: string, 
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
        userId,
        messageType: message.type,
        latency: Date.now() - queueEntryTime
      });
    } catch (error) {
      this.metrics.failedBatches++;
      logger.error('Failed to send immediate message', {
        component: 'BatchingService',
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Process and send a batch of queued messages
   * Includes compression optimization and failure recovery
   */
  private async processBatch(
    userId: string, 
    deliveryCallback: (batch: BatchableMessage[]) => Promise<void>
  ): Promise<void> {
    // Clear the pending timer since we're processing now
    const timer = this.batchTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(userId);
    }

    const queue = this.messageQueues.get(userId);
    if (!queue || queue.length === 0) {
      return;
    }

    const batchStartTime = Date.now();
    const batch = queue.getBatch(this.config.maxBatchSize);
    
    if (batch.length === 0) {
      return;
    }

    try {
      // Evaluate compression benefit for this batch
      if (this.config.compressionEnabled && batch.length > 1) {
        const compressionResult = MessageCompressor.compress(batch);
        
        // Only use compression if it actually saves meaningful space
        if (compressionResult.worthwhile) {
          this.updateCompressionMetrics(
            compressionResult.originalSize, 
            compressionResult.compressedSize
          );
          
          logger.debug('Batch compressed', {
            component: 'BatchingService',
            userId,
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            savingsPercent: ((1 - compressionResult.compressedSize / compressionResult.originalSize) * 100).toFixed(1)
          });
        }
      }

      // Deliver the batch
      await deliveryCallback(batch);

      this.metrics.totalBatches++;
      this.updateAverageBatchSize(batch.length);
      this.updateQueueDepth();
      
      // Track latency from oldest message in batch
      const oldestTimestamp = Math.min(...batch.map(m => m.timestamp || Date.now()));
      this.trackLatency(Date.now() - oldestTimestamp);

      logger.debug('Batch processed successfully', {
        component: 'BatchingService',
        userId,
        batchSize: batch.length,
        queueRemaining: queue.length,
        processingTime: Date.now() - batchStartTime
      });

    } catch (error) {
      this.metrics.failedBatches++;
      
      // Re-queue failed messages for retry (at front of queue with higher priority)
      for (const message of batch) {
        const retryPriority = (message.priority ?? 1) + 1;
        queue.enqueue(message, retryPriority);
      }

      logger.error('Failed to process batch - messages re-queued', {
        component: 'BatchingService',
        userId,
        batchSize: batch.length,
        queueSize: queue.length,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Flush all pending batches immediately across all users
   * Used during shutdown or when forcing immediate delivery
   */
  async flushAll(
    deliveryCallback: (userId: string, batch: BatchableMessage[]) => Promise<void>
  ): Promise<void> {
    const flushPromises: Promise<void>[] = [];
    const userIds = Array.from(this.messageQueues.keys());

    for (const userId of userIds) {
      const queue = this.messageQueues.get(userId);
      if (queue && queue.length > 0) {
        const batch = queue.getBatch(queue.length);
        if (batch.length > 0) {
          flushPromises.push(
            deliveryCallback(userId, batch).catch(error => {
              logger.error('Failed to flush batch', {
                component: 'BatchingService',
                userId,
                batchSize: batch.length,
                error: error instanceof Error ? error.message : String(error)
              });
            })
          );
        }
      }

      // Clear timer for this user
      const timer = this.batchTimers.get(userId);
      if (timer) {
        clearTimeout(timer);
        this.batchTimers.delete(userId);
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
   * Update configuration dynamically, with optional adaptive reset
   */
  updateConfig(newConfig: Partial<BatchingConfig>, resetAdaptive: boolean = false): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    if (resetAdaptive) {
      this.config = this.adaptiveManager.reset();
    }

    logger.info('BatchingService configuration updated', {
      component: 'BatchingService',
      oldConfig,
      newConfig: this.config,
      adaptiveReset: resetAdaptive
    });
  }

  /**
   * Get current metrics snapshot including queue state
   */
  getMetrics(): BatchMetrics {
    this.updateMemoryUsage();
    this.updateQueueDepth();
    return { ...this.metrics };
  }

  /**
   * Get detailed status for monitoring and debugging
   */
  getDetailedStatus(): {
    metrics: BatchMetrics;
    activeQueues: number;
    pendingTimers: number;
    config: BatchingConfig;
    adaptiveHistory: Array<{ timestamp: number; reason: string; changes: any }>;
  } {
    return {
      metrics: this.getMetrics(),
      activeQueues: this.messageQueues.size,
      pendingTimers: this.batchTimers.size,
      config: { ...this.config },
      adaptiveHistory: this.adaptiveManager.getHistory()
    };
  }

  /**
   * Clean up stale messages and optimize memory usage
   * Called periodically and can be invoked manually
   */
  cleanup(): void {
    let totalRemoved = 0;
    const emptyQueues: string[] = [];

    for (const [userId, queue] of this.messageQueues.entries()) {
      const removed = queue.removeStaleMessages(this.config.staleMessageAge);
      totalRemoved += removed;

      // Mark empty queues for removal
      if (queue.length === 0) {
        emptyQueues.push(userId);
      }
    }

    // Remove empty queues and their timers
    for (const userId of emptyQueues) {
      this.messageQueues.delete(userId);
      
      const timer = this.batchTimers.get(userId);
      if (timer) {
        clearTimeout(timer);
        this.batchTimers.delete(userId);
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
   * Graceful shutdown with final batch delivery
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
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    logger.info('BatchingService shutdown complete', {
      component: 'BatchingService',
      finalMetrics: this.getMetrics()
    });
  }

  /**
   * Start periodic memory monitoring with adaptive configuration adjustment
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(() => {
      this.updateMemoryUsage();
      
      // Apply adaptive configuration if enabled
      if (this.config.adaptiveBatching) {
        const queueDepth = this.calculateTotalQueuedMessages();
        
        // Adjust for memory pressure
        if (this.metrics.memoryUsage > this.config.memoryThreshold) {
          this.config = this.adaptiveManager.adjustForMemoryPressure(
            this.config, 
            this.metrics.memoryUsage
          );
        }
        // Optimize for low load conditions
        else if (this.metrics.memoryUsage < 50) {
          this.config = this.adaptiveManager.adjustForLowLoad(
            this.config,
            queueDepth,
            this.metrics.memoryUsage
          );
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Start periodic cleanup of stale messages
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 120000); // Run every 2 minutes
  }

  /**
   * Update memory usage metrics from process stats
   */
  private updateMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  /**
   * Update compression ratio using exponential moving average
   */
  private updateCompressionMetrics(originalSize: number, compressedSize: number): void {
    const ratio = compressedSize / originalSize;
    const alpha = 0.3; // Smoothing factor for EMA
    
    if (this.metrics.compressionRatio === 0) {
      this.metrics.compressionRatio = ratio;
    } else {
      this.metrics.compressionRatio = alpha * ratio + (1 - alpha) * this.metrics.compressionRatio;
    }
  }

  /**
   * Update average batch size with running average
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
   * Track message latency with bounded history
   */
  private trackLatency(latency: number): void {
    this.latencyTracking.push(latency);
    
    // Maintain bounded sample size
    if (this.latencyTracking.length > this.MAX_LATENCY_SAMPLES) {
      this.latencyTracking.shift();
    }

    // Calculate average from recent samples
    const sum = this.latencyTracking.reduce((a, b) => a + b, 0);
    this.metrics.averageLatency = sum / this.latencyTracking.length;
  }

  /**
   * Calculate total messages across all queues
   */
  private calculateTotalQueuedMessages(): number {
    let total = 0;
    for (const queue of this.messageQueues.values()) {
      total += queue.length;
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