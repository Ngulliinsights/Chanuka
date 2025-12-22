/**
 * OperationQueueManager - Manages message processing queue with priority handling
 * 
 * This class uses a PriorityQueue to manage WebSocket operations with proper
 * ordering, batching, and overflow protection. Higher priority operations
 * are processed first, with support for retry logic and queue monitoring.
 */

import type { 
  IOperationQueueManager, 
  QueueOperation 
} from '../types';
import { PriorityQueue } from '../utils';

/**
 * Priority levels for different operation types
 */
export const OPERATION_PRIORITIES = {
  CRITICAL: 100,    // System critical operations (auth, cleanup)
  HIGH: 75,         // User-facing operations (subscribe, unsubscribe)
  NORMAL: 50,       // Regular broadcasts
  LOW: 25,          // Background operations
  BATCH: 10,        // Batch operations
} as const;

/**
 * Maximum retry attempts for failed operations
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Delay between retry attempts (in milliseconds)
 */
const RETRY_DELAY = 1000;

export class OperationQueueManager implements IOperationQueueManager {
  private queue: PriorityQueue<QueueOperation>;
  private processing = false;
  private batchSize: number;
  private batchDelay: number;
  private overflowCount = 0;
  private processedCount = 0;
  private failedCount = 0;
  private retryQueue: QueueOperation[] = [];
  private processingTimer: NodeJS.Timeout | null = null;

  constructor(
    maxQueueSize: number,
    batchSize = 10,
    batchDelay = 50
  ) {
    this.queue = new PriorityQueue<QueueOperation>(maxQueueSize);
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
  }

  /**
   * Add an operation to the queue
   * @param operation The operation to enqueue
   * @returns true if operation was added, false if queue is full
   */
  enqueue(operation: QueueOperation): boolean {
    // Validate operation
    if (!this.isValidOperation(operation)) {
      console.error('Invalid operation provided to queue:', operation);
      return false;
    }

    // Set timestamp if not provided
    if (!operation.timestamp) {
      operation.timestamp = Date.now();
    }

    // Initialize retry count if not provided
    if (operation.retryCount === undefined) {
      operation.retryCount = 0;
    }

    // Try to enqueue the operation
    const success = this.queue.enqueue(operation, operation.priority);
    
    if (!success) {
      this.overflowCount++;
      console.warn('Queue overflow: operation dropped', {
        type: operation.type,
        priority: operation.priority,
        queueSize: this.queue.size(),
        overflowCount: this.overflowCount,
      });
      return false;
    }

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }

    return true;
  }

  /**
   * Start processing the queue
   * Processes operations in batches with proper priority ordering
   */
  async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (!this.queue.isEmpty() || this.retryQueue.length > 0) {
        // Process retry queue first
        await this.processRetryQueue();

        // Process regular queue in batches
        const batch = this.getBatch();
        if (batch.length > 0) {
          await this.processBatch(batch);
        }

        // Small delay between batches to prevent overwhelming the system
        if (!this.queue.isEmpty() || this.retryQueue.length > 0) {
          await this.delay(this.batchDelay);
        }
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get the current queue size
   * @returns Number of operations in the queue
   */
  getQueueSize(): number {
    return this.queue.size() + this.retryQueue.length;
  }

  /**
   * Clear all operations from the queue
   */
  clear(): void {
    this.queue.clear();
    this.retryQueue = [];
    this.overflowCount = 0;
    this.processedCount = 0;
    this.failedCount = 0;
    
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Get queue statistics for monitoring
   * @returns Object with queue statistics
   */
  getStats(): {
    queueSize: number;
    retryQueueSize: number;
    processing: boolean;
    overflowCount: number;
    processedCount: number;
    failedCount: number;
    maxQueueSize: number;
    utilizationPercent: number;
  } {
    const maxSize = this.queue.getMaxSize();
    const currentSize = this.queue.size();

    return {
      queueSize: currentSize,
      retryQueueSize: this.retryQueue.length,
      processing: this.processing,
      overflowCount: this.overflowCount,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
      maxQueueSize: maxSize,
      utilizationPercent: (currentSize / maxSize) * 100,
    };
  }

  /**
   * Check if the queue is full
   * @returns true if the queue is at maximum capacity
   */
  isFull(): boolean {
    return this.queue.isFull();
  }

  /**
   * Check if the queue is empty
   * @returns true if the queue is empty
   */
  isEmpty(): boolean {
    return this.queue.isEmpty() && this.retryQueue.length === 0;
  }

  /**
   * Update batch processing configuration
   * @param batchSize Number of operations to process in each batch
   * @param batchDelay Delay between batches in milliseconds
   */
  updateBatchConfig(batchSize: number, batchDelay: number): void {
    if (batchSize > 0) {
      this.batchSize = batchSize;
    }
    if (batchDelay >= 0) {
      this.batchDelay = batchDelay;
    }
  }

  /**
   * Start processing the queue asynchronously
   */
  private startProcessing(): void {
    if (this.processingTimer) {
      return;
    }

    this.processingTimer = setTimeout(() => {
      this.processingTimer = null;
      this.processQueue().catch(error => {
        console.error('Queue processing error:', error);
      });
    }, 0);
  }

  /**
   * Get a batch of operations to process
   * @returns Array of operations to process
   */
  private getBatch(): QueueOperation[] {
    const batch: QueueOperation[] = [];
    
    for (let i = 0; i < this.batchSize && !this.queue.isEmpty(); i++) {
      const operation = this.queue.dequeue();
      if (operation) {
        batch.push(operation);
      }
    }

    return batch;
  }

  /**
   * Process a batch of operations
   * @param batch Array of operations to process
   */
  private async processBatch(batch: QueueOperation[]): Promise<void> {
    const promises = batch.map(operation => this.processOperation(operation));
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }

  /**
   * Process a single operation
   * @param operation The operation to process
   */
  private async processOperation(operation: QueueOperation): Promise<void> {
    try {
      // Simulate operation processing based on type
      switch (operation.type) {
        case 'broadcast':
          await this.processBroadcast(operation);
          break;
        case 'subscribe':
          await this.processSubscribe(operation);
          break;
        case 'unsubscribe':
          await this.processUnsubscribe(operation);
          break;
        case 'cleanup':
          await this.processCleanup(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      this.processedCount++;
    } catch (error) {
      console.error(`Failed to process operation ${operation.type}:`, error);
      await this.handleOperationFailure(operation, error);
    }
  }

  /**
   * Handle operation failure with retry logic
   * @param operation The failed operation
   * @param error The error that occurred
   */
  private async handleOperationFailure(
    operation: QueueOperation, 
    error: unknown
  ): Promise<void> {
    operation.retryCount = (operation.retryCount || 0) + 1;

    if (operation.retryCount <= MAX_RETRY_ATTEMPTS) {
      // Add to retry queue with delay
      setTimeout(() => {
        this.retryQueue.push(operation);
      }, RETRY_DELAY * operation.retryCount);
      
      console.warn(`Operation ${operation.type} failed, retrying (${operation.retryCount}/${MAX_RETRY_ATTEMPTS}):`, error);
    } else {
      this.failedCount++;
      console.error(`Operation ${operation.type} failed permanently after ${MAX_RETRY_ATTEMPTS} retries:`, error);
    }
  }

  /**
   * Process the retry queue
   */
  private async processRetryQueue(): Promise<void> {
    const retryOperations = this.retryQueue.splice(0, this.batchSize);
    
    for (const operation of retryOperations) {
      await this.processOperation(operation);
    }
  }

  /**
   * Process a broadcast operation
   * @param operation The broadcast operation
   */
  private async processBroadcast(operation: QueueOperation): Promise<void> {
    // This would integrate with the actual broadcast logic
    // For now, we simulate the operation
    await this.delay(1);
    
    // Validate broadcast data
    if (!operation.data.billId || !operation.data.message) {
      throw new Error('Invalid broadcast operation data');
    }
  }

  /**
   * Process a subscribe operation
   * @param operation The subscribe operation
   */
  private async processSubscribe(operation: QueueOperation): Promise<void> {
    // This would integrate with the SubscriptionManager
    // For now, we simulate the operation
    await this.delay(1);
    
    // Validate subscribe data
    if (!operation.data.ws || !operation.data.billId) {
      throw new Error('Invalid subscribe operation data');
    }
  }

  /**
   * Process an unsubscribe operation
   * @param operation The unsubscribe operation
   */
  private async processUnsubscribe(operation: QueueOperation): Promise<void> {
    // This would integrate with the SubscriptionManager
    // For now, we simulate the operation
    await this.delay(1);
    
    // Validate unsubscribe data
    if (!operation.data.ws || !operation.data.billId) {
      throw new Error('Invalid unsubscribe operation data');
    }
  }

  /**
   * Process a cleanup operation
   * @param operation The cleanup operation
   */
  private async processCleanup(operation: QueueOperation): Promise<void> {
    // This would integrate with cleanup logic
    // For now, we simulate the operation
    await this.delay(1);
    
    // Validate cleanup data
    if (!operation.data.ws) {
      throw new Error('Invalid cleanup operation data');
    }
  }

  /**
   * Validate that an operation has the required structure
   * @param operation The operation to validate
   * @returns true if the operation is valid
   */
  private isValidOperation(operation: QueueOperation): boolean {
    return (
      operation &&
      typeof operation === 'object' &&
      typeof operation.type === 'string' &&
      typeof operation.priority === 'number' &&
      operation.data &&
      typeof operation.data === 'object'
    );
  }

  /**
   * Utility function to create a delay
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}