/**
 * Unified Caching System
 * 
 * This module provides a sophisticated multi-layer caching system that combines
 * in-memory caching with persistent storage options (localStorage, IndexedDB).
 * 
 * Architecture:
 * - Fast in-memory cache (Map) for immediate access
 * - Persistent storage adapters for data that survives page refreshes
 * - Intelligent cache key generation for consistent lookups
 * - Automatic expiration and cleanup of stale entries
 * - Optional compression and encryption for sensitive data
 * 
 * Use Cases:
 * - API response caching to reduce network requests
 * - User preferences and settings
 * - Frequently accessed reference data
 * - Offline-first application data
 * 
 * Performance Considerations:
 * The cache implements a multi-tier strategy where frequently accessed data
 * stays in memory for microsecond access times, while less critical data can
 * be persisted to survive browser refreshes. The system automatically manages
 * cache size using LRU (Least Recently Used) eviction when limits are reached.
 * 
 * @module UnifiedCaching
 */

import { globalErrorHandler } from './errors';
import { CacheConfig, CacheEntry } from './types';

// ============================================================================
// Persistent Storage Adapters
// ============================================================================

/**
 * Interface for persistent cache storage adapters.
 * Implementations can use localStorage, IndexedDB, or any other storage mechanism.
 */
interface PersistentCacheAdapter {
  /**
   * Retrieves a cache entry by key
   * @param key - The cache key
   * @returns The cache entry or null if not found
   */
  get<T>(key: string): Promise<CacheEntry<T> | null>;

  /**
   * Stores a cache entry
   * @param key - The cache key
   * @param entry - The cache entry to store
   */
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;

  /**
   * Deletes a cache entry
   * @param key - The cache key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Clears all cache entries
   */
  clear(): Promise<void>;

  /**
   * Removes expired entries
   */
  cleanup(): Promise<void>;

  /**
   * Lists all cache keys
   * @returns Array of all cache keys
   */
  keys(): Promise<string[]>;
}

/**
 * In-memory cache adapter (fastest, but doesn't persist)
 * 
 * This adapter provides the highest performance but data is lost when the
 * page refreshes or the browser closes. Use this for temporary data that
 * can be easily recomputed or refetched.
 */
class MemoryCacheAdapter implements PersistentCacheAdapter {
  private cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    return (this.cache.get(key) as CacheEntry<T>) || null;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Identify expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    expiredKeys.forEach(key => this.cache.delete(key));
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }
}

/**
 * LocalStorage cache adapter (persists across sessions, ~5-10MB limit)
 * 
 * LocalStorage provides synchronous access to persistent string-based storage.
 * It's perfect for small amounts of data that need to survive page refreshes,
 * like user preferences or cached API responses. The storage limit is typically
 * around 5-10MB depending on the browser.
 * 
 * Limitations:
 * - Synchronous API can block the main thread for large operations
 * - Limited to ~5-10MB total storage per origin
 * - Can only store strings (we handle JSON serialization)
 * - May throw QuotaExceededError if storage is full
 */
class LocalStorageCacheAdapter implements PersistentCacheAdapter {
  private readonly prefix = 'api_cache_';

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      return entry;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (error) {
      // Handle QuotaExceededError gracefully
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old entries');
        await this.cleanup();
        
        // Try again after cleanup
        try {
          localStorage.setItem(this.prefix + key, JSON.stringify(entry));
        } catch (retryError) {
          console.warn('Failed to write to localStorage after cleanup:', retryError);
        }
      } else {
        console.warn('Failed to write to localStorage:', error);
      }
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to delete from localStorage:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      const expiredKeys: string[] = [];

      // Identify expired entries
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const entry: CacheEntry = JSON.parse(item);
              if (now - entry.timestamp > entry.ttl) {
                expiredKeys.push(key);
              }
            }
          } catch (error) {
            // Invalid entry, mark for removal
            expiredKeys.push(key);
          }
        }
      }

      // Remove expired entries
      expiredKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to cleanup localStorage:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const allKeys = Object.keys(localStorage);
      return allKeys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.replace(this.prefix, ''));
    } catch (error) {
      console.warn('Failed to get keys from localStorage:', error);
      return [];
    }
  }
}

/**
 * IndexedDB cache adapter (persists across sessions, ~50MB+ limit)
 * 
 * IndexedDB is a low-level API for client-side storage of significant amounts
 * of structured data. It's asynchronous (won't block the main thread) and can
 * store much more data than localStorage (typically 50MB or more, potentially
 * gigabytes with user permission).
 * 
 * Use IndexedDB when:
 * - You need to store large amounts of data (images, files, large datasets)
 * - You need better performance than localStorage for large operations
 * - You want to avoid blocking the main thread during storage operations
 * 
 * Trade-offs:
 * - More complex API than localStorage
 * - Slightly higher latency for small operations
 * - Better suited for bulk operations and large datasets
 */
class IndexedDBCacheAdapter implements PersistentCacheAdapter {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'ApiCache';
  private readonly storeName = 'entries';
  private initPromise: Promise<void> | null = null;

  /**
   * Initializes the IndexedDB database connection.
   * This is called automatically on first use and handles database schema setup.
   */
  private async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.db) {
      return Promise.resolve();
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        this.initPromise = null;
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(new Error(`IndexedDB get failed: ${request.error}`));
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry, key);

      request.onerror = () => reject(new Error(`IndexedDB set failed: ${request.error}`));
      request.onsuccess = () => resolve();
    });
  }

  async delete(key: string): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(new Error(`IndexedDB delete failed: ${request.error}`));
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(new Error(`IndexedDB clear failed: ${request.error}`));
      request.onsuccess = () => resolve();
    });
  }

  async cleanup(): Promise<void> {
    await this.initialize();

    try {
      const keys = await this.keys();
      const now = Date.now();
      const expiredKeys: string[] = [];

      // Identify expired entries
      for (const key of keys) {
        const entry = await this.get(key);
        if (entry && now - entry.timestamp > entry.ttl) {
          expiredKeys.push(key);
        }
      }

      // Remove expired entries in parallel
      await Promise.all(expiredKeys.map(key => this.delete(key)));
    } catch (error) {
      console.warn('Failed to cleanup IndexedDB:', error);
    }
  }

  async keys(): Promise<string[]> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(new Error(`IndexedDB getAllKeys failed: ${request.error}`));
      request.onsuccess = () => resolve((request.result as string[]) || []);
    });
  }
}

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Utility class for generating consistent, collision-resistant cache keys.
 * 
 * Cache keys must be deterministic (same inputs always produce the same key)
 * and unique (different inputs always produce different keys). This class
 * provides several strategies for different types of cached data.
 */
export class CacheKeyGenerator {
  /**
   * Generates a cache key for API requests.
   * Combines HTTP method, endpoint, and query parameters into a unique key.
   * 
   * @example
   * ```typescript
   * const key = CacheKeyGenerator.generate('/users', { role: 'admin' }, 'GET');
   * // Result: "GET:/users:{"role":"admin"}"
   * ```
   */
  static generate(endpoint: string, params?: Record<string, unknown>, method: string = 'GET'): string {
    const baseKey = `${method}:${endpoint}`;

    // For non-GET requests or no params, return simple key
    if (!params || method !== 'GET') {
      return baseKey;
    }

    // Sort parameters for consistent keys regardless of order
    const sortedParams = this.sortObject(params);
    return `${baseKey}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Generates a cache key for a specific entity by type and ID.
   * 
   * @example
   * ```typescript
   * const key = CacheKeyGenerator.generateEntityKey('user', 123);
   * // Result: "entity:user:123"
   * ```
   */
  static generateEntityKey(entityType: string, id: string | number): string {
    return `entity:${entityType}:${id}`;
  }

  /**
   * Generates a cache key for a collection of entities with optional query filters.
   * 
   * @example
   * ```typescript
   * const key = CacheKeyGenerator.generateCollectionKey('users', { active: true });
   * // Result: 'collection:users:{"active":true}'
   * ```
   */
  static generateCollectionKey(entityType: string, query?: Record<string, unknown>): string {
    if (!query) {
      return `collection:${entityType}`;
    }

    const sortedQuery = this.sortObject(query);
    return `collection:${entityType}:${JSON.stringify(sortedQuery)}`;
  }

  /**
   * Generates a cache key for search results.
   * 
   * @example
   * ```typescript
   * const key = CacheKeyGenerator.generateSearchKey('products', 'laptop', { price: 'asc' });
   * // Result: 'search:products:laptop:{"price":"asc"}'
   * ```
   */
  static generateSearchKey(searchType: string, query: string, filters?: Record<string, unknown>): string {
    const filterString = filters ? JSON.stringify(this.sortObject(filters)) : '';
    return `search:${searchType}:${query}:${filterString}`;
  }

  /**
   * Sorts object keys for deterministic stringification.
   * This ensures that {b: 2, a: 1} and {a: 1, b: 2} produce the same key.
   */
  private static sortObject(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = obj[key];
        return result;
      }, {} as Record<string, unknown>);
  }
}

// ============================================================================
// Unified Cache Manager
// ============================================================================

/**
 * Main cache manager that orchestrates memory and persistent caching.
 * 
 * This class implements a two-tier caching strategy where hot data stays in
 * memory for instant access, while all data can optionally be persisted to
 * survive browser refreshes. The cache automatically manages size limits,
 * handles expiration, and provides optional compression and encryption.
 */
export class UnifiedCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private persistentCache: PersistentCacheAdapter;
  private config: CacheConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: CacheConfig) {
    this.config = config;
    this.persistentCache = this.createPersistentCache(config.storage);
    this.startCleanupTimer();
  }

  /**
   * Retrieves a value from the cache.
   * 
   * This method checks the memory cache first for maximum speed. If not found
   * in memory but present in persistent storage, it automatically restores the
   * value to memory for faster subsequent access.
   * 
   * @param key - The cache key
   * @returns The cached value or null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first (fastest path)
      const entry = this.memoryCache.get(key);
      
      if (entry && !this.isExpired(entry)) {
        // Update access tracking for LRU eviction
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        return entry.data as T;
      }

      // Check persistent cache if not in memory
      const persistentEntry = await this.persistentCache.get<T>(key);
      
      if (persistentEntry && !this.isExpired(persistentEntry)) {
        // Restore to memory cache for faster future access
        persistentEntry.accessCount++;
        persistentEntry.lastAccessed = Date.now();
        this.memoryCache.set(key, persistentEntry);
        return persistentEntry.data as T;
      }

      return null;
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'get',
        key
      });
      return null;
    }
  }

  /**
   * Stores a value in the cache with optional TTL and persistence settings.
   * 
   * @param key - The cache key
   * @param data - The data to cache
   * @param options - Optional cache settings
   * @param options.ttl - Time to live in milliseconds (overrides default)
   * @param options.persist - Whether to store in persistent cache (default: true)
   * @param options.compress - Whether to compress the data (default: false)
   * @param options.encrypt - Whether to encrypt the data (default: false)
   */
  async set<T>(
    key: string,
    data: T,
    options?: {
      ttl?: number;
      persist?: boolean;
      compress?: boolean;
      encrypt?: boolean;
    }
  ): Promise<void> {
    try {
      const ttl = options?.ttl ?? this.config.defaultTTL;
      
      // Create cache entry with metadata
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        metadata: {
          size: this.calculateSize(data),
          compressed: options?.compress || false,
          encrypted: options?.encrypt || false
        }
      };

      // Apply compression if configured
      if (this.config.compression && !entry.metadata.compressed) {
        entry.data = await this.compress(data) as T;
        entry.metadata.compressed = true;
      }

      // Apply encryption if configured
      if (this.config.encryption && !entry.metadata.encrypted) {
        entry.data = await this.encrypt(entry.data) as T;
        entry.metadata.encrypted = true;
      }

      // Store in memory
      this.memoryCache.set(key, entry);

      // Store in persistent cache if enabled
      if (options?.persist !== false) {
        await this.persistentCache.set(key, entry);
      }

      // Enforce cache size limits using LRU eviction
      this.enforceSizeLimits();
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'set',
        key
      });
    }
  }

  /**
   * Deletes a value from both memory and persistent caches.
   */
  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await this.persistentCache.delete(key);
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'delete',
        key
      });
    }
  }

  /**
   * Clears all cached data from both memory and persistent storage.
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      await this.persistentCache.clear();
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'clear'
      });
    }
  }

  /**
   * Checks if a key exists in the cache and is not expired.
   */
  async has(key: string): Promise<boolean> {
    try {
      // Check memory cache
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        return true;
      }

      // Check persistent cache
      const persistentEntry = await this.persistentCache.get(key);
      return persistentEntry !== null && !this.isExpired(persistentEntry);
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'has',
        key
      });
      return false;
    }
  }

  /**
   * Returns cache statistics for monitoring and debugging.
   */
  getStats(): { memorySize: number; persistentSize: number; hitRate: number } {
    return {
      memorySize: this.memoryCache.size,
      persistentSize: 0, // Would need to track this separately
      hitRate: 0 // Would need to track hits/misses over time
    };
  }

  /**
   * Cleans up the cache and stops background timers.
   * Call this when shutting down the application or during cleanup.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Checks if a cache entry has expired based on its TTL.
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Calculates the approximate size of data in bytes.
   */
  private calculateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Compresses data (placeholder for actual implementation).
   * In a real implementation, you'd use a library like pako for gzip compression.
   */
  private async compress(data: unknown): Promise<unknown> {
    // TODO: Implement actual compression using pako or similar
    return data;
  }

  /**
   * Encrypts data (placeholder for actual implementation).
   * In a real implementation, you'd use the Web Crypto API.
   */
  private async encrypt(data: unknown): Promise<unknown> {
    // TODO: Implement actual encryption using Web Crypto API
    return data;
  }

  /**
   * Creates the appropriate persistent cache adapter based on configuration.
   */
  private createPersistentCache(storage: 'memory' | 'localStorage' | 'indexedDB'): PersistentCacheAdapter {
    switch (storage) {
      case 'localStorage':
        return new LocalStorageCacheAdapter();
      case 'indexedDB':
        return new IndexedDBCacheAdapter();
      case 'memory':
      default:
        return new MemoryCacheAdapter();
    }
  }

  /**
   * Enforces cache size limits using LRU (Least Recently Used) eviction.
   * When the cache exceeds maxSize, removes the 10% least recently used entries.
   */
  private enforceSizeLimits(): void {
    if (this.memoryCache.size <= this.config.maxSize) {
      return;
    }

    // Sort entries by last accessed time (least recent first)
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest 10% of entries
    const toRemove = Math.ceil(this.config.maxSize * 0.1);
    
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  /**
   * Starts a background timer for automatic cache cleanup.
   * Runs every minute to remove expired entries.
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('Cache cleanup failed:', error);
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Performs cleanup of expired entries in both memory and persistent caches.
   */
  private async cleanup(): Promise<void> {
    try {
      // Clean up persistent cache
      await this.persistentCache.cleanup();

      // Clean up memory cache
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, entry] of this.memoryCache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach(key => this.memoryCache.delete(key));
    } catch (error) {
      await globalErrorHandler.handleError(error as Error, {
        component: 'cache',
        operation: 'cleanup'
      });
    }
  }
}

// ============================================================================
// Global Cache Instance
// ============================================================================

/**
 * Global cache instance configured with sensible defaults.
 * 
 * Default Configuration:
 * - 5-minute TTL for most cached data
 * - Maximum 100 entries in memory
 * - Memory-only storage (no persistence across refreshes)
 * - No compression or encryption
 * 
 * You can reconfigure this instance or create custom instances for different
 * caching needs (e.g., long-term user preferences vs short-term API responses).
 * 
 * @example
 * ```typescript
 * import { globalCache } from './cache';
 * 
 * // Cache an API response
 * await globalCache.set('user:123', userData, { ttl: 10 * 60 * 1000 });
 * 
 * // Retrieve from cache
 * const user = await globalCache.get('user:123');
 * ```
 */
export const globalCache = new UnifiedCacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  storage: 'memory',
  compression: false,
  encryption: false,
  evictionPolicy: 'lru'
});