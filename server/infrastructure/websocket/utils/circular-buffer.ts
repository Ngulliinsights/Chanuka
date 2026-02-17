/**
 * Circular Buffer implementation optimized for performance metrics storage.
 * 
 * A circular buffer (also known as a ring buffer) is a fixed-size data structure
 * that efficiently stores a continuous stream of data. When the buffer reaches
 * capacity, new items overwrite the oldest items, maintaining a sliding window
 * of the most recent data.
 * 
 * Features:
 * - Fixed memory footprint (no dynamic allocation after initialization)
 * - O(1) insertion and removal operations
 * - Automatic overflow handling with oldest item replacement
 * - Rich API with functional programming methods (map, filter, reduce)
 * - Efficient iteration and access patterns
 * 
 * Use Cases:
 * - Performance metrics collection (latency samples, throughput measurements)
 * - Event logging with size limits
 * - Sliding window calculations
 * - Real-time data processing
 * 
 * @template T The type of items stored in the buffer
 * 
 * @example
 * ```typescript
 * // Create a buffer for storing the last 100 latency measurements
 * const latencyBuffer = new CircularBuffer<number>(100);
 * 
 * // Add measurements
 * latencyBuffer.push(45.2);
 * latencyBuffer.push(52.1);
 * 
 * // Calculate average latency
 * const avgLatency = latencyBuffer.reduce((sum, latency) => sum + latency, 0) / latencyBuffer.size();
 * 
 * // Get the most recent measurement
 * const latest = latencyBuffer.peekNewest();
 * ```
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readonly capacity: number;

  /**
   * Creates a new CircularBuffer with the specified capacity.
   * 
   * The buffer is initialized with the given capacity and starts empty.
   * Once the capacity is set, it cannot be changed without creating a new buffer.
   * 
   * @param capacity Maximum number of items the buffer can hold
   * @throws {Error} If capacity is not a positive number
   * 
   * @example
   * ```typescript
   * const buffer = new CircularBuffer<string>(50);
   * ```
   */
  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Capacity must be greater than 0');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add an item to the buffer.
   * 
   * Items are added at the head position. If the buffer is at capacity,
   * the oldest item (at tail position) is automatically overwritten.
   * This maintains a sliding window of the most recent items.
   * 
   * @param item The item to add to the buffer
   * @returns true if item was added to available space, false if an old item was overwritten
   * 
   * @example
   * ```typescript
   * const wasOverwritten = !buffer.push('new item');
   * if (wasOverwritten) {
   *   console.log('Buffer was full, oldest item was replaced');
   * }
   * ```
   */
  push(item: T): boolean {
    const wasOverwritten = this.isFull();
    
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;

    if (this.isFull()) {
      // Buffer is full, move tail to maintain circular behavior
      this.tail = (this.tail + 1) % this.capacity;
    } else {
      this.count++;
    }

    return !wasOverwritten;
  }

  /**
   * Remove and return the oldest item from the buffer.
   * 
   * This operation removes the item at the tail position and advances
   * the tail pointer. The removed item's reference is cleared to prevent
   * memory leaks.
   * 
   * @returns The oldest item in the buffer, or undefined if buffer is empty
   * 
   * @example
   * ```typescript
   * const oldestItem = buffer.pop();
   * if (oldestItem !== undefined) {
   *   console.log('Removed oldest item:', oldestItem);
   * }
   * ```
   */
  pop(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    const item = this.buffer[this.tail];
    delete this.buffer[this.tail]; // Clear reference
    this.tail = (this.tail + 1) % this.capacity;
    this.count--;

    return item;
  }

  /**
   * Peek at the oldest item without removing it.
   * 
   * This allows you to examine the item that would be returned by pop()
   * without actually removing it from the buffer.
   * 
   * @returns The oldest item in the buffer, or undefined if buffer is empty
   * 
   * @example
   * ```typescript
   * const oldest = buffer.peekOldest();
   * if (oldest && shouldRemove(oldest)) {
   *   buffer.pop(); // Now actually remove it
   * }
   * ```
   */
  peekOldest(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.buffer[this.tail];
  }

  /**
   * Peek at the newest item without removing it.
   * 
   * This allows you to examine the most recently added item without
   * affecting the buffer state.
   * 
   * @returns The newest item in the buffer, or undefined if buffer is empty
   * 
   * @example
   * ```typescript
   * const latest = buffer.peekNewest();
   * if (latest) {
   *   console.log('Most recent measurement:', latest);
   * }
   * ```
   */
  peekNewest(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    const newestIndex = this.head === 0 ? this.capacity - 1 : this.head - 1;
    return this.buffer[newestIndex];
  }

  /**
   * Get an item at a specific logical index.
   * 
   * The index is relative to the logical order of items, where 0 represents
   * the oldest item and size()-1 represents the newest item. This abstracts
   * away the internal circular buffer mechanics.
   * 
   * @param index The logical index (0 = oldest, size()-1 = newest)
   * @returns The item at the specified index, or undefined if index is out of bounds
   * 
   * @example
   * ```typescript
   * // Get the 3rd oldest item
   * const item = buffer.get(2);
   * 
   * // Get the newest item
   * const newest = buffer.get(buffer.size() - 1);
   * ```
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }
    const actualIndex = (this.tail + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  /**
   * Set an item at a specific logical index.
   * 
   * Updates the item at the specified logical position. The index follows
   * the same convention as get(), where 0 is the oldest item.
   * 
   * @param index The logical index (0 = oldest, size()-1 = newest)
   * @param item The item to set at the specified position
   * @returns true if the item was set successfully, false if index is out of bounds
   * 
   * @example
   * ```typescript
   * // Update the oldest item
   * const success = buffer.set(0, 'updated item');
   * 
   * // Update the newest item
   * buffer.set(buffer.size() - 1, 'new newest item');
   * ```
   */
  set(index: number, item: T): boolean {
    if (index < 0 || index >= this.count) {
      return false;
    }
    const actualIndex = (this.tail + index) % this.capacity;
    this.buffer[actualIndex] = item;
    return true;
  }

  /**
   * Get all items in the buffer ordered from oldest to newest.
   * 
   * Returns a new array containing all items in chronological order.
   * This is useful for processing the entire buffer contents while
   * maintaining temporal ordering.
   * 
   * @returns Array of all items in chronological order (oldest first)
   * 
   * @example
   * ```typescript
   * const allItems = buffer.toArray();
   * console.log(`Buffer contains ${allItems.length} items`);
   * allItems.forEach((item, index) => {
   *   console.log(`Item ${index}: ${item}`);
   * });
   * ```
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.tail + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Get all items in the buffer ordered from newest to oldest.
   * 
   * Returns a new array containing all items in reverse chronological order.
   * This is useful when you need to process items starting with the most recent.
   * 
   * @returns Array of all items in reverse chronological order (newest first)
   * 
   * @example
   * ```typescript
   * const recentFirst = buffer.toArrayReverse();
   * console.log('Most recent item:', recentFirst[0]);
   * console.log('Oldest item:', recentFirst[recentFirst.length - 1]);
   * ```
   */
  toArrayReverse(): T[] {
    const result: T[] = [];
    for (let i = this.count - 1; i >= 0; i--) {
      const index = (this.tail + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Remove all items from the buffer and reset to empty state.
   * 
   * This operation clears all references to stored items and resets
   * the internal pointers to their initial state. The buffer capacity
   * remains unchanged.
   * 
   * @example
   * ```typescript
   * buffer.clear();
   * console.log(buffer.isEmpty()); // true
   * console.log(buffer.size()); // 0
   * ```
   */
  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * Get the current number of items stored in the buffer.
   * 
   * @returns The number of items currently in the buffer (0 to capacity)
   * 
   * @example
   * ```typescript
   * console.log(`Buffer contains ${buffer.size()} of ${buffer.getCapacity()} items`);
   * ```
   */
  size(): number {
    return this.count;
  }

  /**
   * Get the maximum capacity of the buffer.
   * 
   * This value is set during construction and never changes.
   * 
   * @returns The maximum number of items the buffer can hold
   * 
   * @example
   * ```typescript
   * const utilization = buffer.size() / buffer.getCapacity();
   * console.log(`Buffer is ${(utilization * 100).toFixed(1)}% full`);
   * ```
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Check if the buffer contains no items.
   * 
   * @returns true if the buffer is empty, false otherwise
   * 
   * @example
   * ```typescript
   * if (buffer.isEmpty()) {
   *   console.log('No data available');
   * }
   * ```
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Check if the buffer has reached its maximum capacity.
   * 
   * When the buffer is full, the next push() operation will overwrite
   * the oldest item.
   * 
   * @returns true if the buffer is at maximum capacity, false otherwise
   * 
   * @example
   * ```typescript
   * if (buffer.isFull()) {
   *   console.log('Next push will overwrite oldest item');
   * }
   * ```
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Get the number of additional items that can be stored.
   * 
   * This is the difference between capacity and current size.
   * When this reaches 0, the buffer is full.
   * 
   * @returns The number of additional items that can be stored without overwriting
   * 
   * @example
   * ```typescript
   * const remaining = buffer.remainingCapacity();
   * console.log(`Can add ${remaining} more items before overwriting`);
   * ```
   */
  remainingCapacity(): number {
    return this.capacity - this.count;
  }

  /**
   * Fill the entire buffer with a specific value.
   * 
   * This operation sets all positions in the buffer to the given value
   * and marks the buffer as full. This is useful for initialization
   * or resetting to a default state.
   * 
   * @param value The value to fill the buffer with
   * 
   * @example
   * ```typescript
   * // Initialize buffer with zeros
   * buffer.fill(0);
   * console.log(buffer.isFull()); // true
   * console.log(buffer.size()); // equals capacity
   * ```
   */
  fill(value: T): void {
    this.buffer.fill(value);
    this.head = 0;
    this.tail = 0;
    this.count = this.capacity;
  }

  /**
   * Apply a function to each item in the buffer in chronological order.
   * 
   * Iterates through all items from oldest to newest, calling the provided
   * function for each item. The callback receives the item and its logical index.
   * 
   * @param callback Function to apply to each item (item, logicalIndex) => void
   * 
   * @example
   * ```typescript
   * buffer.forEach((latency, index) => {
   *   console.log(`Measurement ${index}: ${latency}ms`);
   * });
   * ```
   */
  forEach(callback: (item: T, index: number) => void): void {
    for (let i = 0; i < this.count; i++) {
      const actualIndex = (this.tail + i) % this.capacity;
      const item = this.buffer[actualIndex];
      if (item !== undefined) {
        callback(item, i);
      }
    }
  }

  /**
   * Create a new array with items that pass the test function.
   * 
   * Returns a new array containing only the items for which the predicate
   * function returns true. The original buffer is not modified.
   * 
   * @param predicate Function to test each item (item, logicalIndex) => boolean
   * @returns Array of items that pass the test
   * 
   * @example
   * ```typescript
   * // Get all latency measurements above 100ms
   * const highLatency = buffer.filter(latency => latency > 100);
   * console.log(`${highLatency.length} high latency measurements found`);
   * ```
   */
  filter(predicate: (item: T, index: number) => boolean): T[] {
    const result: T[] = [];
    this.forEach((item, index) => {
      if (predicate(item, index)) {
        result.push(item);
      }
    });
    return result;
  }

  /**
   * Create a new array with the results of calling a function on every item.
   * 
   * Transforms each item in the buffer using the provided function and returns
   * a new array with the transformed values. The original buffer is not modified.
   * 
   * @template U The type of the transformed items
   * @param callback Function to transform each item (item, logicalIndex) => U
   * @returns Array of transformed items
   * 
   * @example
   * ```typescript
   * // Convert latency measurements to strings with units
   * const formatted = buffer.map(latency => `${latency}ms`);
   * 
   * // Extract specific properties from objects
   * const timestamps = buffer.map(measurement => measurement.timestamp);
   * ```
   */
  map<U>(callback: (item: T, index: number) => U): U[] {
    const result: U[] = [];
    this.forEach((item, index) => {
      result.push(callback(item, index));
    });
    return result;
  }

  /**
   * Reduce the buffer to a single value using an accumulator function.
   * 
   * Processes all items in chronological order, accumulating a result value
   * by repeatedly calling the reducer function. This is useful for calculations
   * like sums, averages, or finding min/max values.
   * 
   * @template U The type of the accumulated result
   * @param callback Function to execute on each item (accumulator, item, logicalIndex) => U
   * @param initialValue Initial value for the accumulator
   * @returns The final accumulated value
   * 
   * @example
   * ```typescript
   * // Calculate average latency
   * const sum = buffer.reduce((total, latency) => total + latency, 0);
   * const average = sum / buffer.size();
   * 
   * // Find maximum value
   * const max = buffer.reduce((max, current) => Math.max(max, current), -Infinity);
   * ```
   */
  reduce<U>(callback: (accumulator: U, item: T, index: number) => U, initialValue: U): U {
    let accumulator = initialValue;
    this.forEach((item, index) => {
      accumulator = callback(accumulator, item, index);
    });
    return accumulator;
  }

  /**
   * Find the first item that satisfies the test function.
   * 
   * Searches through items in chronological order (oldest to newest) and
   * returns the first item for which the predicate returns true.
   * 
   * @param predicate Function to test each item (item, logicalIndex) => boolean
   * @returns The first item that passes the test, or undefined if none found
   * 
   * @example
   * ```typescript
   * // Find first latency measurement above threshold
   * const highLatency = buffer.find(latency => latency > 200);
   * if (highLatency) {
   *   console.log(`Found high latency: ${highLatency}ms`);
   * }
   * ```
   */
  find(predicate: (item: T, index: number) => boolean): T | undefined {
    for (let i = 0; i < this.count; i++) {
      const actualIndex = (this.tail + i) % this.capacity;
      const item = this.buffer[actualIndex];
      if (item !== undefined && predicate(item, i)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Find the logical index of the first item that satisfies the test function.
   * 
   * Searches through items in chronological order and returns the logical index
   * (0-based from oldest) of the first item that passes the test.
   * 
   * @param predicate Function to test each item (item, logicalIndex) => boolean
   * @returns The logical index of the first matching item, or -1 if none found
   * 
   * @example
   * ```typescript
   * // Find index of first measurement above threshold
   * const index = buffer.findIndex(latency => latency > 100);
   * if (index !== -1) {
   *   console.log(`High latency found at position ${index}`);
   * }
   * ```
   */
  findIndex(predicate: (item: T, index: number) => boolean): number {
    for (let i = 0; i < this.count; i++) {
      const actualIndex = (this.tail + i) % this.capacity;
      const item = this.buffer[actualIndex];
      if (item !== undefined && predicate(item, i)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if at least one item satisfies the test function.
   * 
   * Returns true as soon as unknown item passes the test, without checking
   * the remaining items. This is more efficient than filter() when you
   * only need to know if any items match.
   * 
   * @param predicate Function to test each item (item, logicalIndex) => boolean
   * @returns true if at least one item passes the test, false otherwise
   * 
   * @example
   * ```typescript
   * // Check if any measurements exceed threshold
   * const hasHighLatency = buffer.some(latency => latency > 500);
   * if (hasHighLatency) {
   *   console.log('Performance issue detected');
   * }
   * ```
   */
  some(predicate: (item: T, index: number) => boolean): boolean {
    return this.findIndex(predicate) !== -1;
  }

  /**
   * Check if all items satisfy the test function.
   * 
   * Returns false as soon as unknown item fails the test, without checking
   * the remaining items. Returns true only if all items pass the test.
   * 
   * @param predicate Function to test each item (item, logicalIndex) => boolean
   * @returns true if all items pass the test, false otherwise
   * 
   * @example
   * ```typescript
   * // Check if all measurements are within acceptable range
   * const allGood = buffer.every(latency => latency < 100);
   * if (allGood) {
   *   console.log('All measurements within acceptable range');
   * }
   * ```
   */
  every(predicate: (item: T, index: number) => boolean): boolean {
    for (let i = 0; i < this.count; i++) {
      const actualIndex = (this.tail + i) % this.capacity;
      const item = this.buffer[actualIndex];
      if (item !== undefined && !predicate(item, i)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get comprehensive statistics and metadata about the buffer state.
   * 
   * Provides detailed information about buffer utilization, capacity,
   * and internal state for monitoring and debugging purposes.
   * 
   * @returns Object containing buffer statistics and metadata
   * 
   * @example
   * ```typescript
   * const stats = buffer.getStats();
   * console.log(`Buffer utilization: ${stats.utilizationPercent.toFixed(1)}%`);
   * console.log(`Remaining capacity: ${stats.remainingCapacity}`);
   * console.log(`Internal state: head=${stats.headIndex}, tail=${stats.tailIndex}`);
   * ```
   */
  getStats(): {
    size: number;
    capacity: number;
    utilizationPercent: number;
    remainingCapacity: number;
    isEmpty: boolean;
    isFull: boolean;
    headIndex: number;
    tailIndex: number;
  } {
    return {
      size: this.count,
      capacity: this.capacity,
      utilizationPercent: (this.count / this.capacity) * 100,
      remainingCapacity: this.remainingCapacity(),
      isEmpty: this.isEmpty(),
      isFull: this.isFull(),
      headIndex: this.head,
      tailIndex: this.tail,
    };
  }
}