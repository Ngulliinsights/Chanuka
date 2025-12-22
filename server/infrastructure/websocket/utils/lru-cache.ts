/**
 * LRU (Least Recently Used) Cache implementation with efficient O(1) operations.
 * 
 * This implementation uses a combination of a doubly-linked list and a hash map
 * to achieve O(1) time complexity for all major operations (get, set, delete).
 * 
 * Features:
 * - O(1) get, set, and delete operations
 * - Automatic eviction of least recently used items when at capacity
 * - Maintains insertion and access order
 * - Thread-safe for single-threaded environments
 * 
 * @template K The type of keys stored in the cache
 * @template V The type of values stored in the cache
 * 
 * @example
 * ```typescript
 * const cache = new LRUCache<string, number>(3);
 * cache.set('a', 1);
 * cache.set('b', 2);
 * cache.set('c', 3);
 * cache.set('d', 4); // 'a' is evicted
 * 
 * console.log(cache.get('a')); // undefined
 * console.log(cache.get('b')); // 2
 * ```
 */

/**
 * Internal node structure for the doubly-linked list.
 * Each node contains the key-value pair and pointers to adjacent nodes.
 * 
 * @template K The type of the key
 * @template V The type of the value
 * 
 * @private
 */
interface CacheNode<K, V> {
  /** The key for this cache entry */
  key: K;
  /** The value for this cache entry */
  value: V;
  /** Pointer to the previous node (more recently used) */
  prev: CacheNode<K, V> | null;
  /** Pointer to the next node (less recently used) */
  next: CacheNode<K, V> | null;
  /** Timestamp when this node was last accessed */
  timestamp: number;
}

/**
 * LRU Cache implementation optimized for WebSocket message deduplication.
 * 
 * The cache maintains items in order of usage, with the most recently used
 * items at the head and least recently used at the tail. When the cache
 * reaches capacity, the tail item is automatically evicted.
 * 
 * Internal Structure:
 * - Hash Map: Provides O(1) key lookup
 * - Doubly-Linked List: Maintains usage order and enables O(1) insertion/deletion
 * 
 * Time Complexity:
 * - get: O(1)
 * - set: O(1)
 * - delete: O(1)
 * - has: O(1)
 * 
 * Space Complexity: O(n) where n is the maximum cache size
 * 
 * @template K The type of keys (must be hashable)
 * @template V The type of values
 */
export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly cache = new Map<K, CacheNode<K, V>>();
  private head: CacheNode<K, V> | null = null;
  private tail: CacheNode<K, V> | null = null;

  /**
   * Creates a new LRU Cache with the specified maximum capacity.
   * 
   * @param maxSize Maximum number of items the cache can hold
   * @throws {Error} If maxSize is not a positive number
   * 
   * @example
   * ```typescript
   * const cache = new LRUCache<string, User>(1000);
   * ```
   */
  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('Max size must be greater than 0');
    }
    this.maxSize = maxSize;
  }

  /**
   * Retrieve a value from the cache by key.
   * 
   * Accessing an item moves it to the front of the cache (most recently used position),
   * which affects the eviction order. The item's timestamp is also updated.
   * 
   * @param key The key to look up
   * @returns The value if found, undefined if the key doesn't exist
   * 
   * @example
   * ```typescript
   * const user = cache.get('user123');
   * if (user) {
   *   console.log(`Found user: ${user.name}`);
   * }
   * ```
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (!node) {
      return undefined;
    }

    // Move to front (most recently used)
    this.moveToFront(node);
    node.timestamp = Date.now();
    
    return node.value;
  }

  /**
   * Store a key-value pair in the cache.
   * 
   * If the key already exists, the value is updated and the item is moved
   * to the front. If the cache is at capacity and a new key is added,
   * the least recently used item is automatically evicted.
   * 
   * @param key The key to store
   * @param value The value to associate with the key
   * @returns Always returns true (for consistency with Map interface)
   * 
   * @example
   * ```typescript
   * cache.set('user123', { name: 'John', email: 'john@example.com' });
   * 
   * // Update existing key
   * cache.set('user123', { name: 'John Doe', email: 'john@example.com' });
   * ```
   */
  set(key: K, value: V): boolean {
    const existingNode = this.cache.get(key);
    
    if (existingNode) {
      // Update existing node
      existingNode.value = value;
      existingNode.timestamp = Date.now();
      this.moveToFront(existingNode);
      return true;
    }

    // Create new node
    const newNode: CacheNode<K, V> = {
      key,
      value,
      prev: null,
      next: null,
      timestamp: Date.now(),
    };

    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    // Add new node to front
    this.addToFront(newNode);
    this.cache.set(key, newNode);
    
    return true;
  }

  /**
   * Check if a key exists in the cache without affecting usage order.
   * 
   * This method does not move the item to the front or update its timestamp,
   * making it useful for existence checks that shouldn't affect eviction order.
   * 
   * @param key The key to check for existence
   * @returns true if the key exists in the cache, false otherwise
   * 
   * @example
   * ```typescript
   * if (cache.has('user123')) {
   *   console.log('User exists in cache');
   * }
   * ```
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove a key-value pair from the cache.
   * 
   * The item is completely removed from both the hash map and the linked list.
   * This operation does not affect the order of remaining items.
   * 
   * @param key The key to remove from the cache
   * @returns true if the key was found and removed, false if it didn't exist
   * 
   * @example
   * ```typescript
   * const wasDeleted = cache.delete('user123');
   * if (wasDeleted) {
   *   console.log('User removed from cache');
   * }
   * ```
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  /**
   * Remove all items from the cache.
   * 
   * This operation resets the cache to an empty state, clearing both
   * the hash map and the linked list structure.
   * 
   * @example
   * ```typescript
   * cache.clear();
   * console.log(cache.size()); // 0
   * ```
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get the current number of items in the cache.
   * 
   * @returns The number of key-value pairs currently stored
   * 
   * @example
   * ```typescript
   * console.log(`Cache contains ${cache.size()} items`);
   * ```
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if the cache contains no items.
   * 
   * @returns true if the cache is empty, false otherwise
   * 
   * @example
   * ```typescript
   * if (cache.isEmpty()) {
   *   console.log('Cache is empty');
   * }
   * ```
   */
  isEmpty(): boolean {
    return this.cache.size === 0;
  }

  /**
   * Check if the cache has reached its maximum capacity.
   * 
   * @returns true if the cache is at maximum capacity, false otherwise
   * 
   * @example
   * ```typescript
   * if (cache.isFull()) {
   *   console.log('Next insertion will cause eviction');
   * }
   * ```
   */
  isFull(): boolean {
    return this.cache.size >= this.maxSize;
  }

  /**
   * Get the maximum capacity of the cache.
   * 
   * @returns The maximum number of items the cache can hold
   * 
   * @example
   * ```typescript
   * const utilization = cache.size() / cache.getMaxSize();
   * console.log(`Cache is ${(utilization * 100).toFixed(1)}% full`);
   * ```
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Get all keys in the cache ordered from most to least recently used.
   * 
   * The returned array starts with the most recently accessed/inserted key
   * and ends with the key that would be evicted next.
   * 
   * @returns Array of keys in MRU to LRU order
   * 
   * @example
   * ```typescript
   * const keys = cache.keys();
   * console.log(`Most recent: ${keys[0]}, Least recent: ${keys[keys.length - 1]}`);
   * ```
   */
  keys(): K[] {
    const keys: K[] = [];
    let current = this.head;
    
    while (current) {
      keys.push(current.key);
      current = current.next;
    }
    
    return keys;
  }

  /**
   * Get all values in the cache ordered from most to least recently used.
   * 
   * The returned array corresponds to the same order as keys(), with values
   * ordered from most recently accessed to least recently accessed.
   * 
   * @returns Array of values in MRU to LRU order
   * 
   * @example
   * ```typescript
   * const values = cache.values();
   * console.log(`Processing ${values.length} cached items`);
   * ```
   */
  values(): V[] {
    const values: V[] = [];
    let current = this.head;
    
    while (current) {
      values.push(current.value);
      current = current.next;
    }
    
    return values;
  }

  /**
   * Get all key-value pairs in the cache ordered from most to least recently used.
   * 
   * Returns an array of [key, value] tuples, useful for iterating over
   * the entire cache while preserving usage order.
   * 
   * @returns Array of [key, value] pairs in MRU to LRU order
   * 
   * @example
   * ```typescript
   * for (const [key, value] of cache.entries()) {
   *   console.log(`${key}: ${JSON.stringify(value)}`);
   * }
   * ```
   */
  entries(): Array<[K, V]> {
    const entries: Array<[K, V]> = [];
    let current = this.head;
    
    while (current) {
      entries.push([current.key, current.value]);
      current = current.next;
    }
    
    return entries;
  }

  /**
   * Peek at the most recently used item without affecting its position.
   * 
   * This method allows you to see what the most recently accessed item is
   * without moving it or updating its timestamp.
   * 
   * @returns The most recently used [key, value] pair, or undefined if cache is empty
   * 
   * @example
   * ```typescript
   * const mostRecent = cache.peekMRU();
   * if (mostRecent) {
   *   console.log(`Most recent item: ${mostRecent[0]}`);
   * }
   * ```
   */
  peekMRU(): [K, V] | undefined {
    if (!this.head) {
      return undefined;
    }
    return [this.head.key, this.head.value];
  }

  /**
   * Peek at the least recently used item without affecting its position.
   * 
   * This method shows which item would be evicted next if the cache
   * reaches capacity, without actually affecting the eviction order.
   * 
   * @returns The least recently used [key, value] pair, or undefined if cache is empty
   * 
   * @example
   * ```typescript
   * const leastRecent = cache.peekLRU();
   * if (leastRecent) {
   *   console.log(`Next to be evicted: ${leastRecent[0]}`);
   * }
   * ```
   */
  peekLRU(): [K, V] | undefined {
    if (!this.tail) {
      return undefined;
    }
    return [this.tail.key, this.tail.value];
  }

  /**
   * Get comprehensive statistics about the cache state.
   * 
   * Provides detailed information about cache utilization, capacity,
   * and timing information for monitoring and debugging purposes.
   * 
   * @returns Object containing cache statistics
   * 
   * @example
   * ```typescript
   * const stats = cache.getStats();
   * console.log(`Cache utilization: ${stats.utilizationPercent.toFixed(1)}%`);
   * console.log(`Oldest item: ${new Date(stats.oldestTimestamp || 0)}`);
   * ```
   */
  getStats(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
      oldestTimestamp: this.tail?.timestamp || null,
      newestTimestamp: this.head?.timestamp || null,
    };
  }

  /**
   * Move a node to the front of the linked list (most recently used position).
   * 
   * This is a core operation that maintains the LRU ordering. When an item
   * is accessed, it's moved to the head of the list to indicate recent usage.
   * 
   * @param node The node to move to the front
   * 
   * @private
   */
  private moveToFront(node: CacheNode<K, V>): void {
    if (node === this.head) {
      return; // Already at front
    }

    // Remove from current position
    this.removeNode(node);
    
    // Add to front
    this.addToFront(node);
  }

  /**
   * Add a new node to the front of the linked list.
   * 
   * This method handles the pointer manipulation required to insert
   * a node at the head of the doubly-linked list while maintaining
   * proper head and tail references.
   * 
   * @param node The node to add to the front
   * 
   * @private
   */
  private addToFront(node: CacheNode<K, V>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove a node from the linked list.
   * 
   * This method handles the pointer manipulation required to remove
   * a node from anywhere in the doubly-linked list while maintaining
   * proper connections between remaining nodes.
   * 
   * @param node The node to remove from the list
   * 
   * @private
   */
  private removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Evict the least recently used item from the cache.
   * 
   * This method is called automatically when the cache reaches capacity
   * and a new item needs to be added. It removes the tail node (LRU item)
   * from both the linked list and the hash map.
   * 
   * @private
   */
  private evictLeastRecentlyUsed(): void {
    if (!this.tail) {
      return;
    }

    const lruNode = this.tail;
    this.removeNode(lruNode);
    this.cache.delete(lruNode.key);
  }
}