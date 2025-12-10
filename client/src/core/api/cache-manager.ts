/**
 * API Cache Manager Module
 * 
 * Provides intelligent caching for API responses with TTL, invalidation,
 * and storage management capabilities.
 */

import { logger } from '../../utils/logger';

/**
 * Cache entry with metadata - imported from storage types
 */
import type { CacheEntry, CacheStats } from '../storage/types';

/**
 * Eviction policy type
 */
export type EvictionPolicy = 'LRU' | 'LFU' | 'FIFO' | 'TTL';

/**
 * Cache configuration options
 */
export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  maxEntries: number;
  storage: 'memory' | 'localStorage' | 'sessionStorage';
  keyPrefix: string;
  enableCompression: boolean;
  enableEncryption: boolean;
}

export interface CacheStats {
  entryCount: number;
  hitRate: number;
}

/**
 * Cache invalidation options
 */
export interface InvalidationOptions {
  tags?: string[];
  pattern?: RegExp;
  olderThan?: number;
  force?: boolean;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  storage: 'memory',
  keyPrefix: 'api_cache_',
  enableCompression: false,
  enableEncryption: false
};

/**
 * API Cache Manager class
 */
export class ApiCacheManager {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.initializeStorage();
    this.startCleanupTimer();
  }

  /**
   * Gets a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    let entry = this.cache.get(fullKey);

    // Try persistent storage if not in memory
    if (!entry && this.config.storage !== 'memory') {
      entry = await this.getFromStorage<T>(fullKey);
      if (entry) {
        this.cache.set(fullKey, entry);
      }
    }

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      await this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hits++;
    this.updateHitRate();

    logger.debug('Cache hit', {
      component: 'ApiCacheManager',
      key,
      accessCount: entry.accessCount
    });

    return entry.data as T;
  }

  /**
   * Sets a value in the cache
   */
  async set<T>(key: string, data: T, options: { ttl?: number; tags?: string[] } = {}): Promise<void> {
    const fullKey = this.getFullKey(key);
    const ttl = options.ttl || this.config.defaultTTL;
    const size = this.calculateSize(data);

    // Check if we need to evict entries
    await this.ensureCapacity(size);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
      tags: options.tags
    };

    this.cache.set(fullKey, entry);
    this.stats.sets++;
    this.stats.totalSize += size;
    this.stats.entryCount++;

    // Persist to storage if configured
    if (this.config.storage !== 'memory') {
      await this.setToStorage(fullKey, entry);
    }

    logger.debug('Cache set', {
      component: 'ApiCacheManager',
      key,
      size,
      ttl,
      tags: options.tags
    });
  }

  /**
   * Deletes a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (entry) {
      this.cache.delete(fullKey);
      this.stats.deletes++;
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;

      // Remove from persistent storage
      if (this.config.storage !== 'memory') {
        await this.deleteFromStorage(fullKey);
      }

      logger.debug('Cache delete', {
        component: 'ApiCacheManager',
        key
      });

      return true;
    }

    return false;
  }

  /**
   * Checks if a key exists in the cache
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    let entry = this.cache.get(fullKey);

    // Check persistent storage if not in memory
    if (!entry && this.config.storage !== 'memory') {
      entry = await this.getFromStorage(fullKey);
    }

    if (!entry) {
      return false;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clears the entire cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;

    // Clear persistent storage
    if (this.config.storage !== 'memory') {
      await this.clearStorage();
    }

    logger.info('Cache cleared', {
      component: 'ApiCacheManager'
    });
  }

  /**
   * Invalidates cache entries based on criteria
   */
  async invalidate(options: InvalidationOptions): Promise<number> {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      let shouldInvalidate = false;

      // Check tags
      if (options.tags && entry.tags) {
        shouldInvalidate = options.tags.some(tag => entry.tags!.includes(tag));
      }

      // Check pattern
      if (options.pattern) {
        shouldInvalidate = shouldInvalidate || options.pattern.test(key);
      }

      // Check age
      if (options.olderThan) {
        const age = Date.now() - entry.timestamp;
        shouldInvalidate = shouldInvalidate || age > options.olderThan;
      }

      // Force invalidation
      if (options.force) {
        shouldInvalidate = true;
      }

      if (shouldInvalidate) {
        keysToDelete.push(key);
      }
    }

    // Delete identified entries
    for (const key of keysToDelete) {
      const shortKey = key.replace(this.config.keyPrefix, '');
      await this.delete(shortKey);
      invalidatedCount++;
    }

    logger.info('Cache invalidation completed', {
      component: 'ApiCacheManager',
      invalidatedCount,
      options
    });

    return invalidatedCount;
  }

  /**
   * Gets cache statistics
   */
  getStats(): Readonly<CacheStats> {
    return { ...this.stats };
  }

  /**
   * Gets cache configuration
   */
  getConfig(): Readonly<CacheConfig> {
    return { ...this.config };
  }

  /**
   * Updates cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Cache configuration updated', {
      component: 'ApiCacheManager',
      config: this.config
    });
  }

  /**
   * Ensures cache capacity by evicting entries if necessary
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    // Check size limit
    if (this.stats.totalSize + newEntrySize > this.config.maxSize) {
      await this.evictBySize(newEntrySize);
    }

    // Check entry count limit
    if (this.stats.entryCount >= this.config.maxEntries) {
      await this.evictByCount();
    }
  }

  /**
   * Evicts entries to make room for new entry size
   */
  private async evictBySize(requiredSize: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        // LRU eviction: least recently used first
        return a.entry.lastAccessed - b.entry.lastAccessed;
      });

    let freedSize = 0;
    const keysToEvict: string[] = [];

    for (const { key, entry } of entries) {
      keysToEvict.push(key);
      freedSize += entry.size;
      
      if (freedSize >= requiredSize) {
        break;
      }
    }

    // Evict selected entries
    for (const key of keysToEvict) {
      const shortKey = key.replace(this.config.keyPrefix, '');
      await this.delete(shortKey);
      this.stats.evictions++;
    }

    logger.debug('Cache eviction by size completed', {
      component: 'ApiCacheManager',
      evictedCount: keysToEvict.length,
      freedSize
    });
  }

  /**
   * Evicts entries to stay within count limit
   */
  private async evictByCount(): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

    // Evict 10% of entries or at least 1
    const evictCount = Math.max(1, Math.floor(this.config.maxEntries * 0.1));
    
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      const shortKey = entries[i].key.replace(this.config.keyPrefix, '');
      await this.delete(shortKey);
      this.stats.evictions++;
    }

    logger.debug('Cache eviction by count completed', {
      component: 'ApiCacheManager',
      evictedCount: evictCount
    });
  }

  /**
   * Checks if a cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
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
   * Gets the full cache key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Updates the hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Initializes storage based on configuration
   */
  private initializeStorage(): void {
    if (this.config.storage !== 'memory') {
      // Load existing cache from storage
      this.loadFromStorage();
    }
  }

  /**
   * Loads cache from persistent storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (!storage) return;

      const keys = Object.keys(storage).filter(key => 
        key.startsWith(this.config.keyPrefix)
      );

      for (const key of keys) {
        const entryData = storage.getItem(key);
        if (entryData) {
          try {
            const entry = JSON.parse(entryData) as CacheEntry;
            if (!this.isExpired(entry)) {
              this.cache.set(key, entry);
              this.stats.totalSize += entry.size;
              this.stats.entryCount++;
            } else {
              storage.removeItem(key);
            }
          } catch (error) {
            logger.warn('Failed to parse cache entry from storage', {
              component: 'ApiCacheManager',
              key,
              error
            });
            storage.removeItem(key);
          }
        }
      }

      logger.info('Cache loaded from storage', {
        component: 'ApiCacheManager',
        entryCount: this.stats.entryCount,
        totalSize: this.stats.totalSize
      });
    } catch (error) {
      logger.error('Failed to load cache from storage', {
        component: 'ApiCacheManager',
        error
      });
    }
  }

  /**
   * Gets entry from persistent storage
   */
  private async getFromStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const storage = this.getStorage();
      if (!storage) return null;

      const entryData = storage.getItem(key);
      if (entryData) {
        const entry = JSON.parse(entryData) as CacheEntry<T>;
        return this.isExpired(entry) ? null : entry;
      }
    } catch (error) {
      logger.warn('Failed to get cache entry from storage', {
        component: 'ApiCacheManager',
        key,
        error
      });
    }
    return null;
  }

  /**
   * Sets entry to persistent storage
   */
  private async setToStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(key, JSON.stringify(entry));
      }
    } catch (error) {
      logger.warn('Failed to set cache entry to storage', {
        component: 'ApiCacheManager',
        key,
        error
      });
    }
  }

  /**
   * Deletes entry from persistent storage
   */
  private async deleteFromStorage(key: string): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(key);
      }
    } catch (error) {
      logger.warn('Failed to delete cache entry from storage', {
        component: 'ApiCacheManager',
        key,
        error
      });
    }
  }

  /**
   * Clears all entries from persistent storage
   */
  private async clearStorage(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (!storage) return;

      const keys = Object.keys(storage).filter(key => 
        key.startsWith(this.config.keyPrefix)
      );

      for (const key of keys) {
        storage.removeItem(key);
      }
    } catch (error) {
      logger.error('Failed to clear cache storage', {
        component: 'ApiCacheManager',
        error
      });
    }
  }

  /**
   * Gets the appropriate storage object
   */
  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;

    switch (this.config.storage) {
      case 'localStorage':
        return window.localStorage;
      case 'sessionStorage':
        return window.sessionStorage;
      default:
        return null;
    }
  }

  /**
   * Starts the cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Run every minute
  }

  /**
   * Removes expired entries from cache
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const shortKey = key.replace(this.config.keyPrefix, '');
      await this.delete(shortKey);
    }

    if (expiredKeys.length > 0) {
      logger.debug('Cleaned up expired cache entries', {
        component: 'ApiCacheManager',
        cleanedCount: expiredKeys.length
      });
    }
  }
}

/**
 * Cache key generator utility
 */
export class CacheKeyGenerator {
  /**
   * Generates a cache key from URL and parameters
   */
  static generate(
    url: string, 
    params?: Record<string, any>, 
    method: string = 'GET'
  ): string {
    const normalizedUrl = url.toLowerCase();
    const sortedParams = params ? this.sortParams(params) : '';
    const normalizedMethod = method.toUpperCase();
    
    return `${normalizedMethod}:${normalizedUrl}${sortedParams}`;
  }

  /**
   * Sorts and stringifies parameters for consistent key generation
   */
  private static sortParams(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    return `:${JSON.stringify(sorted)}`;
  }
}

/**
 * Global cache instance
 */
export const globalCache = new ApiCacheManager();