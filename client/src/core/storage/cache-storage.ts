/**
 * Cache Storage Module
 *
 * Provides in-memory and persistent caching with TTL support, compression,
 * and intelligent eviction policies. Ideal for API responses and computed values.
 */

import { logger } from '../../utils/logger';

import { SecureStorage } from './secure-storage';
import {
  CacheEntry,
  CacheStats,
  CleanupOptions,
  StorageOptions,
  StorageError,
  StorageErrorCode,
} from './types';

/**
 * Creates a cache-specific storage error
 */
function createCacheError(
  code: StorageErrorCode,
  message: string,
  context?: Record<string, unknown>
): StorageError {
  const error = new Error(message) as StorageError;
  error.code = code;
  error.context = context;
  error.recoverable = true;
  return error;
}

/**
 * Cache eviction policies
 */
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl';

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxMemoryEntries: number;
  maxMemorySize: number;
  defaultTTL: number;
  evictionPolicy: EvictionPolicy;
  persistToDisk: boolean;
  compressionThreshold: number;
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxMemoryEntries: 1000,
  maxMemorySize: 50 * 1024 * 1024, // 50MB
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  evictionPolicy: 'lru',
  persistToDisk: true,
  compressionThreshold: 1024, // 1KB
};

/**
 * CacheManager provides in-memory and persistent caching with TTL support.
 * Ideal for API responses, computed values, and temporary data storage.
 */
export class CacheStorageManager {
  private static instance: CacheStorageManager;
  private storage: SecureStorage;
  private readonly cacheNamespace = 'cache';
  private memoryCache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: CacheStats = {
    memoryEntries: 0,
    persistedEntries: 0,
    totalSize: 0,
    hitRate: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.storage = SecureStorage.getInstance();
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  static getInstance(config?: Partial<CacheConfig>): CacheStorageManager {
    if (!CacheStorageManager.instance) {
      CacheStorageManager.instance = new CacheStorageManager(config);
    }
    return CacheStorageManager.instance;
  }

  /**
   * Stores data in cache with optional TTL
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      persist?: boolean;
      tags?: string[];
      compress?: boolean;
    } = {}
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.config.defaultTTL;
      const persist = options.persist !== false && this.config.persistToDisk;

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: this.calculateSize(data),
        tags: options.tags,
        metadata: {
          compressed: false,
          persisted: persist,
        },
      };

      // Check if we need to evict entries to make room
      await this.ensureCapacity(entry.size || 0);

      // Always store in memory for fast access
      this.memoryCache.set(key, entry);
      this.stats.memoryEntries = this.memoryCache.size;
      this.stats.totalSize += entry.size || 0;

      // Optionally persist to storage
      if (persist) {
        const storageOptions: StorageOptions = {
          namespace: this.cacheNamespace,
          ttl,
          compress: options.compress || (entry.size || 0) > this.config.compressionThreshold,
        };

        await this.storage.setItem(key, entry, storageOptions);
        this.stats.persistedEntries++;
      }

      logger.debug('Cache entry set', {
        component: 'CacheStorageManager',
        key,
        size: entry.size,
        ttl,
        persist,
        tags: options.tags,
      });
    } catch (error) {
      logger.error('Failed to set cache entry', { key, error });
      throw createCacheError('INVALID_DATA', `Failed to cache item: ${key}`, { key, error });
    }
  }

  /**
   * Retrieves data from cache, checking memory first then storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      let entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

      if (entry) {
        // Check if entry has expired
        if (this.isExpired(entry)) {
          await this.delete(key);
          this.stats.misses++;
          this.updateHitRate();
          return null;
        }

        // Update access metadata
        entry.accessCount = (entry.accessCount || 0) + 1;
        entry.lastAccessed = Date.now();

        this.stats.hits++;
        this.updateHitRate();

        logger.debug('Cache hit (memory)', {
          component: 'CacheStorageManager',
          key,
          accessCount: entry.accessCount,
        });

        return entry.data;
      }

      // If not in memory and persistence is enabled, check storage
      if (this.config.persistToDisk) {
        entry =
          (await this.storage.getItem<CacheEntry<T>>(key, {
            namespace: this.cacheNamespace,
          })) || undefined;

        if (entry) {
          // Check if entry has expired
          if (this.isExpired(entry)) {
            await this.delete(key);
            this.stats.misses++;
            this.updateHitRate();
            return null;
          }

          // Add back to memory cache
          this.memoryCache.set(key, entry);
          this.stats.memoryEntries = this.memoryCache.size;

          // Update access metadata
          entry.accessCount = (entry.accessCount || 0) + 1;
          entry.lastAccessed = Date.now();

          this.stats.hits++;
          this.updateHitRate();

          logger.debug('Cache hit (storage)', {
            component: 'CacheStorageManager',
            key,
            accessCount: entry.accessCount,
          });

          return entry.data;
        }
      }

      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      logger.error('Failed to get cache entry', { key, error });
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Removes a specific cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      const entry = this.memoryCache.get(key);

      if (entry) {
        this.memoryCache.delete(key);
        this.stats.memoryEntries = this.memoryCache.size;
        this.stats.totalSize -= entry.size || 0;
      }

      if (this.config.persistToDisk) {
        this.storage.removeItem(key, {
          namespace: this.cacheNamespace,
        });
      }

      logger.debug('Cache entry deleted', {
        component: 'CacheStorageManager',
        key,
      });
    } catch (error) {
      logger.error('Failed to delete cache entry', { key, error });
    }
  }

  /**
   * Clears all cache entries
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.stats.memoryEntries = 0;
      this.stats.totalSize = 0;

      if (this.config.persistToDisk) {
        this.storage.clear(this.cacheNamespace);
        this.stats.persistedEntries = 0;
      }

      logger.info('Cache cleared', {
        component: 'CacheStorageManager',
      });
    } catch (error) {
      logger.error('Failed to clear cache', { error });
    }
  }

  /**
   * Checks if a key exists in cache and hasn't expired
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * Gets or sets a cache entry using a factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: {
      ttl?: number;
      persist?: boolean;
      tags?: string[];
    } = {}
  ): Promise<T> {
    let data = await this.get<T>(key);

    if (data === null) {
      data = await factory();
      await this.set(key, data, options);
    }

    return data;
  }

  /**
   * Invalidates cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    // Check memory cache
    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (entry.tags && tags.some(tag => entry.tags!.includes(tag))) {
        keysToDelete.push(key);
      }
    }

    // Delete identified entries
    for (const key of keysToDelete) {
      await this.delete(key);
      invalidatedCount++;
    }

    logger.info('Cache invalidation by tags completed', {
      component: 'CacheStorageManager',
      tags,
      invalidatedCount,
    });

    return invalidatedCount;
  }

  /**
   * Cleans up expired entries and applies eviction policies
   */
  async cleanup(options: CleanupOptions = {}): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      let deletedCount = 0;

      // Clean memory cache
      for (const [key, entry] of Array.from(this.memoryCache.entries())) {
        let shouldDelete = false;

        // Remove expired entries
        if (options.removeExpired !== false && this.isExpired(entry)) {
          shouldDelete = true;
        }

        // Remove entries older than specified time
        if (options.removeOlderThan && Date.now() - entry.timestamp > options.removeOlderThan) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          keysToDelete.push(key);
        }
      }

      // Delete expired entries
      for (const key of keysToDelete) {
        if (!options.dryRun) {
          await this.delete(key);
        }
        deletedCount++;
      }

      // Apply eviction policy if we're over limits
      if (!options.dryRun && this.memoryCache.size > this.config.maxMemoryEntries) {
        const evictCount = this.memoryCache.size - this.config.maxMemoryEntries;
        await this.evictEntries(evictCount);
      }

      logger.info('Cache cleanup completed', {
        component: 'CacheStorageManager',
        deletedCount,
        dryRun: options.dryRun,
        memoryEntries: this.memoryCache.size,
      });
    } catch (error) {
      logger.error('Failed to cleanup cache', { error });
    }
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Updates cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Cache configuration updated', {
      component: 'CacheStorageManager',
      config: this.config,
    });
  }

  /**
   * Gets cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Lists all cache keys
   */
  listKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Gets cache entries by tag
   */
  getEntriesByTag(tag: string): Array<{ key: string; entry: CacheEntry }> {
    const entries: Array<{ key: string; entry: CacheEntry }> = [];

    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (entry.tags?.includes(tag)) {
        entries.push({ key, entry });
      }
    }

    return entries;
  }

  /**
   * Ensures cache capacity by evicting entries if necessary
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    // Check size limit
    if (this.stats.totalSize + newEntrySize > this.config.maxMemorySize) {
      await this.evictBySize(newEntrySize);
    }

    // Check entry count limit
    if (this.memoryCache.size >= this.config.maxMemoryEntries) {
      await this.evictEntries(1);
    }
  }

  /**
   * Evicts entries based on the configured policy
   */
  private async evictEntries(count: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries()).map(([key, entry]) => ({ key, entry }));

    // Sort based on eviction policy
    switch (this.config.evictionPolicy) {
      case 'lru':
        entries.sort((a, b) => (a.entry.lastAccessed || 0) - (b.entry.lastAccessed || 0));
        break;
      case 'lfu':
        entries.sort((a, b) => (a.entry.accessCount || 0) - (b.entry.accessCount || 0));
        break;
      case 'fifo':
        entries.sort((a, b) => a.entry.timestamp - b.entry.timestamp);
        break;
      case 'ttl':
        entries.sort((a, b) => {
          const aExpiry = a.entry.timestamp + (a.entry.ttl || 0);
          const bExpiry = b.entry.timestamp + (b.entry.ttl || 0);
          return aExpiry - bExpiry;
        });
        break;
    }

    // Evict the selected entries
    for (let i = 0; i < count && i < entries.length; i++) {
      await this.delete(entries[i].key);
      this.stats.evictions++;
    }

    logger.debug('Cache eviction completed', {
      component: 'CacheStorageManager',
      evictedCount: Math.min(count, entries.length),
      policy: this.config.evictionPolicy,
    });
  }

  /**
   * Evicts entries to make room for new entry size
   */
  private async evictBySize(requiredSize: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => (a.entry.lastAccessed || 0) - (b.entry.lastAccessed || 0));

    let freedSize = 0;
    const keysToEvict: string[] = [];

    for (const { key, entry } of entries) {
      keysToEvict.push(key);
      freedSize += entry.size || 0;

      if (freedSize >= requiredSize) {
        break;
      }
    }

    // Evict selected entries
    for (const key of keysToEvict) {
      await this.delete(key);
      this.stats.evictions++;
    }

    logger.debug('Cache eviction by size completed', {
      component: 'CacheStorageManager',
      evictedCount: keysToEvict.length,
      freedSize,
    });
  }

  /**
   * Checks if a cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Calculates the approximate size of data
   */
  private calculateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // Rough UTF-16 estimation
    }
  }

  /**
   * Updates the hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Starts the cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup({ removeExpired: true });
    }, 60000); // Run every minute
  }

  /**
   * Stops the cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Shutdown method for proper cleanup
   */
  async shutdown(): Promise<void> {
    this.stopCleanupTimer();
    // Don't clear cache on shutdown, just stop the timer
  }
}
