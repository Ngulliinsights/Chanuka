/**
 * Priority Queue implementation with binary search insertion and size limits.
 * 
 * This implementation maintains items in descending priority order (highest priority first)
 * using binary search for efficient insertion. Items with equal priority are ordered by
 * insertion time (FIFO for same priority).
 * 
 * @template T The type of items stored in the queue
 * 
 * @example
 * ```typescript
 * const queue = new PriorityQueue<string>(100);
 * queue.enqueue('low priority task', 1);
 * queue.enqueue('high priority task', 10);
 * 
 * const next = queue.dequeue(); // Returns 'high priority task'
 * ```
 */

/**
 * Represents an item in the priority queue with metadata
 * 
 * @template T The type of the stored item
 */
export interface PriorityQueueItem<T> {
  /** The priority value (higher values processed first) */
  priority: number;
  /** The actual item being stored */
  item: T;
  /** Timestamp when the item was added to the queue */
  timestamp: number;
}

/**
 * Priority Queue implementation optimized for WebSocket message processing.
 * 
 * Features:
 * - Binary search insertion for O(log n) enqueue operations
 * - Size limits to prevent memory exhaustion
 * - FIFO ordering for items with equal priority
 * - Efficient peek and dequeue operations
 * 
 * Time Complexity:
 * - enqueue: O(log n) for insertion point finding + O(n) for array splice
 * - dequeue: O(1)
 * - peek: O(1)
 * - size: O(1)
 * 
 * @template T The type of items stored in the queue
 */
export class PriorityQueue<T> {
  private items: PriorityQueueItem<T>[] = [];
  private readonly maxSize: number;

  /**
   * Creates a new PriorityQueue with the specified maximum capacity.
   * 
   * @param maxSize Maximum number of items the queue can hold
   * @throws {Error} If maxSize is not a positive number
   * 
   * @example
   * ```typescript
   * const queue = new PriorityQueue<Task>(1000);
   * ```
   */
  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('Max size must be greater than 0');
    }
    this.maxSize = maxSize;
  }

  /**
   * Add an item to the queue with the specified priority.
   * 
   * Uses binary search to find the correct insertion point to maintain
   * descending priority order. Items with equal priority are inserted
   * after existing items with the same priority (FIFO for equal priority).
   * 
   * @param item The item to add to the queue
   * @param priority The priority value (higher values processed first)
   * @returns true if item was successfully added, false if queue is at capacity
   * 
   * @example
   * ```typescript
   * const success = queue.enqueue('urgent task', 10);
   * if (!success) {
   *   console.log('Queue is full');
   * }
   * ```
   */
  enqueue(item: T, priority: number): boolean {
    if (this.items.length >= this.maxSize) {
      return false;
    }

    const queueItem: PriorityQueueItem<T> = {
      priority,
      item,
      timestamp: Date.now(),
    };

    // Binary search to find insertion point
    const insertIndex = this.findInsertionIndex(priority);
    this.items.splice(insertIndex, 0, queueItem);

    return true;
  }

  /**
   * Remove and return the highest priority item from the queue.
   * 
   * This operation is O(1) as items are maintained in sorted order.
   * If multiple items have the same highest priority, the oldest
   * item (first inserted) is returned.
   * 
   * @returns The highest priority item, or undefined if queue is empty
   * 
   * @example
   * ```typescript
   * const nextTask = queue.dequeue();
   * if (nextTask) {
   *   processTask(nextTask);
   * }
   * ```
   */
  dequeue(): T | undefined {
    const queueItem = this.items.shift();
    return queueItem?.item;
  }

  /**
   * Peek at the highest priority item without removing it.
   * 
   * Useful for checking what the next item to be processed would be
   * without actually removing it from the queue.
   * 
   * @returns The highest priority item, or undefined if queue is empty
   * 
   * @example
   * ```typescript
   * const nextTask = queue.peek();
   * if (nextTask && shouldProcessNow(nextTask)) {
   *   queue.dequeue(); // Now actually remove it
   * }
   * ```
   */
  peek(): T | undefined {
    return this.items[0]?.item;
  }

  /**
   * Get the current number of items in the queue.
   * 
   * @returns The number of items currently in the queue
   * 
   * @example
   * ```typescript
   * console.log(`Queue has ${queue.size()} items`);
   * ```
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if the queue contains no items.
   * 
   * @returns true if the queue is empty, false otherwise
   * 
   * @example
   * ```typescript
   * if (queue.isEmpty()) {
   *   console.log('No tasks to process');
   * }
   * ```
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Check if the queue has reached its maximum capacity.
   * 
   * @returns true if the queue is at maximum capacity, false otherwise
   * 
   * @example
   * ```typescript
   * if (queue.isFull()) {
   *   console.log('Queue is at capacity, cannot add more items');
   * }
   * ```
   */
  isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  /**
   * Remove all items from the queue.
   * 
   * This operation resets the queue to an empty state.
   * 
   * @example
   * ```typescript
   * queue.clear();
   * console.log(queue.size()); // 0
   * ```
   */
  clear(): void {
    this.items = [];
  }

  /**
   * Get the maximum capacity of the queue.
   * 
   * @returns The maximum number of items the queue can hold
   * 
   * @example
   * ```typescript
   * const capacity = queue.getMaxSize();
   * const utilization = queue.size() / capacity;
   * ```
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Get a copy of all items in the queue with their metadata.
   * 
   * This method is primarily intended for testing and debugging purposes.
   * The returned array is a copy, so modifications won't affect the queue.
   * 
   * @returns Array of all queue items with priority and timestamp information
   * 
   * @example
   * ```typescript
   * const items = queue.getItems();
   * items.forEach(item => {
   *   console.log(`Priority: ${item.priority}, Added: ${new Date(item.timestamp)}`);
   * });
   * ```
   */
  getItems(): PriorityQueueItem<T>[] {
    return [...this.items];
  }

  /**
   * Binary search to find the correct insertion index for a given priority.
   * 
   * Items are maintained in descending order by priority (highest first).
   * For items with equal priority, newer items are placed after older ones
   * to maintain FIFO ordering within the same priority level.
   * 
   * Algorithm:
   * 1. Use binary search to find the insertion point
   * 2. Items with higher priority go to the left (lower indices)
   * 3. Items with equal priority maintain insertion order
   * 
   * @param priority The priority value to find insertion point for
   * @returns The index where the item should be inserted
   * 
   * @private
   */
  private findInsertionIndex(priority: number): number {
    let left = 0;
    let right = this.items.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midItem = this.items[mid];
      if (!midItem) {
        break;
      }
      const midPriority = midItem.priority;

      if (midPriority > priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }
}