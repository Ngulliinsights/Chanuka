/**
 * Unified Cache Service
 *
 * Provides a comprehensive caching solution with:
 * - Multiple storage backends (Memory, IndexedDB, localStorage)
 * - Cache invalidation strategies
 * - Cache warming and preloading
 * - Cache metrics and monitoring
 * - Cache compression and optimization
 * - Cache persistence across sessions
 */

import { CacheError, CacheMissError, CacheCorruptionError, ServiceErrorFactory } from './errors';
import { logger } from '@client/utils/logger';

// ============================================================================
// CACHE CONFIGURATION INTERFACES
// ============================================================================

export interface CacheConfig {
  /** Cache name/identifier */
  name: string;
  /** Maximum cache size in bytes */
  maxSize?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Storage backend preference */
  storageBackend?: 'memory' | 'indexeddb' | 'localstorage' | 'hybrid';
  /** Compression enabled */
  compression?: boolean;
  /** Cache warming enabled */
  warming?: boolean;
  /** Cache metrics enabled */
  metrics?: boolean;
  /** Cache invalidation strategy */
  invalidationStrategy?: 'ttl' | 'lru' | 'lfu' | 'fifo';
  /** Cache persistence across sessions */
  persistent?: boolean;
}

export interface CacheEntry<T = unknown> {
  /** Cached data */
  data: T;
  /** Cache key */
  key: string;
  /** Timestamp when cached */
  timestamp: number;
  /** Time to live in milliseconds */
  ttl?: number;
  /** Access count for LFU strategy */
  accessCount?: number;
  /** Last access timestamp for LRU strategy */
  lastAccess?: number;
  /** Compressed flag */
  compressed?: boolean;
  /** Compression algorithm used */
  compressionAlgorithm?: string;
}

export interface CacheMetrics {
  /** Total cache operations */
  totalOperations: number;
  /** Cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Cache evictions */
  evictions: number;
  /** Cache size in bytes */
  size: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Average access time */
  avgAccessTime: number;
  /** Cache efficiency score */
  efficiency: number;
}

// ============================================================================
// STORAGE BACKEND INTERFACES
// ============================================================================

export interface StorageBackend {
  /** Initialize storage */
  init(): Promise<void>;
  /** Get item from storage */
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  /** Set item in storage */
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  /** Delete item from storage */
  delete(key: string): Promise<void>;
  /** Clear all items from storage */
  clear(): Promise<void>;
  /** Get all keys */
  keys(): Promise<string[]>;
  /** Get storage size */
  size(): Promise<number>;
  /** Check if storage is available */
  isAvailable(): boolean;
}

// ============================================================================
// MEMORY STORAGE BACKEND
// ============================================================================

class MemoryStorageBackend implements StorageBackend {
  private storage: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100 * 1024 * 1024; // 100MB default

  async init(): Promise<void> {
    // Memory storage is always ready
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.storage.get(key);
    if (!entry) return null;

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.storage.delete(key);
      return null;
    }

    // Update access statistics
    entry.lastAccess = Date.now();
    entry.accessCount = (entry.accessCount || 0) + 1;

    return entry as CacheEntry<T>;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Check size limits
    const entrySize = this.calculateEntrySize(entry);
    if (entrySize > this.maxSize) {
      throw new CacheError(`Entry size ${entrySize} exceeds maximum size ${this.maxSize}`, 'set', key, 'set');
    }

    // Evict old entries if needed
    await this.evictIfNeeded(entrySize);

    this.storage.set(key, entry as CacheEntry);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async size(): Promise<number> {
    let totalSize = 0;
    for (const entry of this.storage.values()) {
      totalSize += this.calculateEntrySize(entry);
    }
    return totalSize;
  }

  isAvailable(): boolean {
    return true;
  }

  private calculateEntrySize(entry: CacheEntry): number {
    // Simple size estimation
    return JSON.stringify(entry).length * 2; // UTF-16 characters
  }

  private async evictIfNeeded(newEntrySize: number): Promise<void> {
    const currentSize = await this.size();
    const targetSize = this.maxSize * 0.8; // Keep 20% buffer

    if (currentSize + newEntrySize > targetSize) {
      // Evict entries based on strategy
      const entries = Array.from(this.storage.entries());
      entries.sort((a, b) => (a[1].lastAccess || 0) - (b[1].lastAccess || 0));

      let evictedSize = 0;
      for (const [key, entry] of entries) {
        this.storage.delete(key);
        evictedSize += this.calculateEntrySize(entry);

        if (currentSize - evictedSize + newEntrySize <= targetSize) {
          break;
        }
      }
    }
  }
}

// ============================================================================
// INDEXEDDB STORAGE BACKEND
// ============================================================================

class IndexedDBStorageBackend implements StorageBackend {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private version: number = 1;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(new CacheError('Failed to open IndexedDB', 'init'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('ttl', 'ttl', { unique: false });
        }
      };
    });
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) throw new CacheError('IndexedDB not initialized', 'get', key, 'get');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check TTL
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
          this.delete(key);
          resolve(null);
          return;
        }

        // Update access statistics
        entry.lastAccess = Date.now();
        entry.accessCount = (entry.accessCount || 0) + 1;

        // Update access time in database
        const updateTransaction = this.db!.transaction(['cache'], 'readwrite');
        const updateStore = updateTransaction.objectStore('cache');
        updateStore.put(entry);

        resolve(entry as CacheEntry<T>);
      };

      request.onerror = () => reject(new CacheError('Failed to get from IndexedDB', 'get', key, 'get'));
    });
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.db) throw new CacheError('IndexedDB not initialized', 'set', key, 'set');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new CacheError('Failed to set in IndexedDB', 'set', key, 'set'));
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) throw new CacheError('IndexedDB not initialized', 'delete', key, 'delete');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new CacheError('Failed to delete from IndexedDB', 'delete', key, 'delete'));
    });
  }

  async clear(): Promise<void> {
    if (!this.db) throw new CacheError('IndexedDB not initialized', 'clear');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new CacheError('Failed to clear IndexedDB', 'clear'));
    });
  }

  async keys(): Promise<string[]> {
    if (!this.db) throw new CacheError('IndexedDB not initialized', 'keys');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(new CacheError('Failed to get keys from IndexedDB', 'keys'));
    });
  }

  async size(): Promise<number> {
    if (!this.db) throw new CacheError('IndexedDB not initialized', 'size');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;
        let totalSize = 0;
        for (const entry of entries) {
          totalSize += JSON.stringify(entry).length * 2;
        }
        resolve(totalSize);
      };

      request.onerror = () => reject(new CacheError('Failed to get size from IndexedDB', 'size'));
    });
  }

  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}

// ============================================================================
// LOCALSTORAGE STORAGE BACKEND
// ============================================================================

class LocalStorageBackend implements StorageBackend {
  private prefix: string;

  constructor(prefix: string = 'cache_') {
    this.prefix = prefix;
  }

  async init(): Promise<void> {
    // Check if localStorage is available
    if (!this.isAvailable()) {
      throw new CacheError('localStorage not available', 'init');
    }
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;

      const entry = JSON.parse(stored) as CacheEntry<T>;

      // Check TTL
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.delete(key);
        return null;
      }

      // Update access statistics
      entry.lastAccess = Date.now();
      entry.accessCount = (entry.accessCount || 0) + 1;

      // Update access time in localStorage
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));

      return entry;
    } catch (error) {
      throw new CacheCorruptionError(this.prefix + key, 'get');
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (error) {
      throw new CacheError('localStorage quota exceeded', 'set', key, 'set');
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      localStorage.removeItem(this.prefix + key);
    }
  }

  async keys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  async size(): Promise<number> {
    let totalSize = 0;
    const keys = await this.keys();
    for (const key of keys) {
      const value = localStorage.getItem(this.prefix + key);
      if (value) {
        totalSize += value.length * 2;
      }
    }
    return totalSize;
  }

  isAvailable(): boolean {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
}

// ============================================================================
// HYBRID STORAGE BACKEND
// ============================================================================

class HybridStorageBackend implements StorageBackend {
  private backends: StorageBackend[];
  private fallbackOrder: StorageBackend[];

  constructor(backends: StorageBackend[]) {
    this.backends = backends;
    this.fallbackOrder = backends.filter(backend => backend.isAvailable());
  }

  async init(): Promise<void> {
    for (const backend of this.backends) {
      try {
        await backend.init();
      } catch (error) {
        logger.warn('Storage backend initialization failed', { backend: backend.constructor.name, error });
      }
    }
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    for (const backend of this.fallbackOrder) {
      try {
        const result = await backend.get<T>(key);
        if (result) return result;
      } catch (error) {
        logger.warn('Storage backend get failed', { backend: backend.constructor.name, key, error });
      }
    }
    return null;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    for (const backend of this.fallbackOrder) {
      try {
        await backend.set(key, entry);
        return;
      } catch (error) {
        logger.warn('Storage backend set failed', { backend: backend.constructor.name, key, error });
      }
    }
    throw new CacheError('All storage backends failed', 'set', key, 'set');
  }

  async delete(key: string): Promise<void> {
    for (const backend of this.fallbackOrder) {
      try {
        await backend.delete(key);
      } catch (error) {
        logger.warn('Storage backend delete failed', { backend: backend.constructor.name, key, error });
      }
    }
  }

  async clear(): Promise<void> {
    for (const backend of this.fallbackOrder) {
      try {
        await backend.clear();
      } catch (error) {
        logger.warn('Storage backend clear failed', { backend: backend.constructor.name, error });
      }
    }
  }

  async keys(): Promise<string[]> {
    const allKeys = new Set<string>();
    for (const backend of this.fallbackOrder) {
      try {
        const keys = await backend.keys();
        keys.forEach(key => allKeys.add(key));
      } catch (error) {
        logger.warn('Storage backend keys failed', { backend: backend.constructor.name, error });
      }
    }
    return Array.from(allKeys);
  }

  async size(): Promise<number> {
    let totalSize = 0;
    for (const backend of this.fallbackOrder) {
      try {
        totalSize += await backend.size();
      } catch (error) {
        logger.warn('Storage backend size failed', { backend: backend.constructor.name, error });
      }
    }
    return totalSize;
  }

  isAvailable(): boolean {
    return this.fallbackOrder.length > 0;
  }
}

// ============================================================================
// CACHE COMPRESSION
// ============================================================================

class CacheCompression {
  /**
   * Compress data using TextEncoder and TextDecoder
   */
  static async compress(data: unknown): Promise<{ compressed: Uint8Array; algorithm: string }> {
    const text = JSON.stringify(data);
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(text);

    // Simple compression simulation (in real implementation, use pako or similar)
    return {
      compressed: uint8Array,
      algorithm: 'text-encoder'
    };
  }

  /**
   * Decompress data
   */
  static async decompress(compressed: Uint8Array, algorithm: string): Promise<unknown> {
    const decoder = new TextDecoder();
    const text = decoder.decode(compressed);
    return JSON.parse(text);
  }
}

// ============================================================================
// MAIN CACHE SERVICE
// ============================================================================

export class CacheService {
  private config: CacheConfig;
  private storage: StorageBackend;
  private metrics: CacheMetrics;
  private warmingTasks: Map<string, () => Promise<unknown>> = new Map();
  private compressionEnabled: boolean;

  constructor(config: CacheConfig) {
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB default
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      storageBackend: 'hybrid',
      compression: false,
      warming: false,
      metrics: true,
      invalidationStrategy: 'ttl',
      persistent: true,
      ...config
    };

    this.compressionEnabled = this.config.compression ?? false;
    this.initializeStorage();
    this.initializeMetrics();
  }

  /**
   * Initialize storage backend
   */
  private initializeStorage(): void {
    switch (this.config.storageBackend) {
      case 'memory':
        this.storage = new MemoryStorageBackend();
        break;
      case 'indexeddb':
        this.storage = new IndexedDBStorageBackend(this.config.name);
        break;
      case 'localstorage':
        this.storage = new LocalStorageBackend(this.config.name + '_');
        break;
      case 'hybrid':
      default:
        this.storage = new HybridStorageBackend([
          new MemoryStorageBackend(),
          new IndexedDBStorageBackend(this.config.name),
          new LocalStorageBackend(this.config.name + '_')
        ]);
        break;
    }
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
      avgAccessTime: 0,
      efficiency: 0
    };
  }

  /**
   * Get item from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.metrics.totalOperations++;

    try {
      const entry = await this.storage.get<CacheEntry<T>>(key);

      if (!entry) {
        this.metrics.misses++;
        this.updateMetrics(startTime);
        throw new CacheMissError(key, 'get');
      }

      this.metrics.hits++;
      this.updateMetrics(startTime);

      // Decompress if needed
      let data = entry.data;
      if (entry.compressed && this.compressionEnabled) {
        data = await CacheCompression.decompress(entry.data as Uint8Array, entry.compressionAlgorithm!);
      }

      return data as T;
    } catch (error) {
      if (error instanceof CacheMissError) {
        throw error;
      }
      throw ServiceErrorFactory.createCacheError(
        'Failed to get from cache',
        key,
        'get',
        'get',
        { originalError: error }
      );
    }
  }

  /**
   * Set item in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const startTime = performance.now();

    try {
      // Compress data if enabled
      let cacheData = data;
      let compressed = false;
      let compressionAlgorithm: string | undefined;

      if (this.compressionEnabled) {
        const compressedData = await CacheCompression.compress(data);
        cacheData = compressedData.compressed;
        compressed = true;
        compressionAlgorithm = compressedData.algorithm;
      }

      const entry: CacheEntry<T> = {
        key,
        data: cacheData as T,
        timestamp: Date.now(),
        ttl: ttl ?? this.config.defaultTTL,
        compressed,
        compressionAlgorithm,
        accessCount: 0,
        lastAccess: Date.now()
      };

      await this.storage.set(key, entry);
      this.updateMetrics(startTime);
    } catch (error) {
      throw ServiceErrorFactory.createCacheError(
        'Failed to set in cache',
        key,
        'set',
        'set',
        { originalError: error }
      );
    }
  }

  /**
   * Delete item from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      throw ServiceErrorFactory.createCacheError(
        'Failed to delete from cache',
        key,
        'delete',
        'delete',
        { originalError: error }
      );
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.storage.clear();
      this.initializeMetrics();
    } catch (error) {
      throw ServiceErrorFactory.createCacheError(
        'Failed to clear cache',
        undefined,
        'clear',
        'clear',
        { originalError: error }
      );
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Warm cache with predefined data
   */
  async warmCache(): Promise<void> {
    if (!this.config.warming) return;

    for (const [key, task] of this.warmingTasks) {
      try {
        const data = await task();
        await this.set(key, data);
      } catch (error) {
        logger.warn('Cache warming failed for key', { key, error });
      }
    }
  }

  /**
   * Register cache warming task
   */
  registerWarmingTask(key: string, task: () => Promise<unknown>): void {
    this.warmingTasks.set(key, task);
  }

  /**
   * Update metrics after operation
   */
  private updateMetrics(startTime: number): void {
    if (!this.config.metrics) return;

    const accessTime = performance.now() - startTime;
    this.metrics.size = this.storage.size();
    this.metrics.hitRate = this.metrics.totalOperations > 0
      ? (this.metrics.hits / this.metrics.totalOperations) * 100
      : 0;
    this.metrics.avgAccessTime = (this.metrics.avgAccessTime + accessTime) / 2;
    this.metrics.efficiency = this.calculateEfficiency();
  }

  /**
   * Calculate cache efficiency score
   */
  private calculateEfficiency(): number {
    const hitRate = this.metrics.hitRate;
    const sizeRatio = this.metrics.size / (this.config.maxSize || 1);
    const accessTime = this.metrics.avgAccessTime;

    // Efficiency formula: hit rate * (1 - size ratio) * (1 / access time)
    return Math.max(0, Math.min(100, hitRate * (1 - sizeRatio) * (1000 / Math.max(1, accessTime))));
  }

  /**
   * Get cache statistics
   */
  async getStatistics(): Promise<{
    metrics: CacheMetrics;
    storageInfo: {
      backend: string;
      available: boolean;
      size: number;
      keys: number;
    };
    warmingTasks: number;
  }> {
    return {
      metrics: this.getMetrics(),
      storageInfo: {
        backend: this.config.storageBackend || 'hybrid',
        available: this.storage.isAvailable(),
        size: await this.storage.size(),
        keys: (await this.storage.keys()).length
      },
      warmingTasks: this.warmingTasks.size
    };
  }
}

// ============================================================================
// CACHE SERVICE FACTORY
// ============================================================================

export class CacheServiceFactory {
  private static instances: Map<string, CacheService> = new Map();

  /**
   * Get or create cache service instance
   */
  static getInstance(config: CacheConfig): CacheService {
    const key = config.name;

    if (!this.instances.has(key)) {
      this.instances.set(key, new CacheService(config));
    }

    return this.instances.get(key)!;
  }

  /**
   * Clear all cache service instances
   */
  static clearInstances(): void {
    for (const instance of this.instances.values()) {
      instance.clear();
    }
    this.instances.clear();
  }

  /**
   * Get all cache service instances
   */
  static getAllInstances(): Map<string, CacheService> {
    return this.instances;
  }
}

// ============================================================================
// CACHE DECORATORS
// ============================================================================

/**
 * Cache decorator for methods
 */
export function Cacheable(config: {
  key?: string;
  ttl?: number;
  cacheName?: string;
  condition?: (args: unknown[]) => boolean;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheName = config.cacheName || target.constructor.name;

    descriptor.value = async function (...args: unknown[]) {
      // Check condition
      if (config.condition && !config.condition(args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const key = config.key || `${propertyKey}_${JSON.stringify(args)}`;

      // Get cache service
      const cache = CacheServiceFactory.getInstance({
        name: cacheName,
        defaultTTL: config.ttl
      });

      try {
        // Try to get from cache
        const cached = await cache.get(key);
        if (cached !== null) {
          return cached;
        }

        // Execute method and cache result
        const result = await originalMethod.apply(this, args);
        await cache.set(key, result, config.ttl);
        return result;
      } catch (error) {
        // Fallback to original method on cache error
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 */
export function InvalidateCache(config: {
  key?: string;
  cacheName?: string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const result = await originalMethod.apply(this, args);

      // Invalidate cache
      if (config.cacheName) {
        const cache = CacheServiceFactory.getInstance({
          name: config.cacheName
        });

        const key = config.key || `${propertyKey}_${JSON.stringify(args)}`;
        try {
          await cache.delete(key);
        } catch (error) {
          logger.warn('Cache invalidation failed', { key, error });
        }
      }

      return result;
    };

    return descriptor;
  };
}
