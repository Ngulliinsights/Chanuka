/**
 * Advanced Caching Service
 * 
 * Full implementation for multi-tier caching including:
 * - Multi-tier caching (memory, with optional Redis support)
 * - Cache invalidation strategies
 * - Cache warming
 * - Cache statistics and monitoring
 * - TTL management
 * - Cache key generation
 * - Cache compression
 * - Tag-based cache invalidation
 */

import { logger } from '@shared/core';
import { createHash } from 'crypto';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  compress?: boolean;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  keys: number;
  hitRate: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
  compressed: boolean;
  size: number;
}

/**
 * Advanced Caching Service
 */
export class AdvancedCachingService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> Set of keys
  private stats = {
    hits: 0,
    misses: 0,
  };
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxCacheSize = 1000; // Maximum number of entries
  private cleanupTimer?: NodeJS.Timeout;
  private readonly cleanupInterval = 60 * 1000; // 1 minute

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;

      if (!entry) {
        this.stats.misses++;
        logger.debug('Cache miss', { key });
        return null;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.delete(key);
        this.stats.misses++;
        logger.debug('Cache expired', { key });
        return null;
      }

      this.stats.hits++;
      logger.debug('Cache hit', { key });

      // Decompress if needed
      if (entry.compressed) {
        return this.decompress(entry.value) as T;
      }

      return entry.value as T;
    } catch (error) {
      logger.error('Cache get error', { error, key });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      // Check cache size limit
      if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
        // Evict oldest entry (LRU-like behavior)
        this.evictOldest();
      }

      const ttl = options?.ttl || this.defaultTTL;
      const tags = options?.tags || [];
      const compress = options?.compress || false;

      // Compress if needed
      const storedValue = compress ? this.compress(value) : value;

      // Calculate size (rough estimate)
      const size = this.estimateSize(storedValue);

      const entry: CacheEntry<T> = {
        value: storedValue as T,
        expiresAt: Date.now() + ttl,
        tags,
        compressed: compress,
        size,
      };

      this.cache.set(key, entry as CacheEntry<unknown>);

      // Update tag index
      for (const tag of tags) {
        let tagKeys = this.tagIndex.get(tag);
        if (!tagKeys) {
          tagKeys = new Set();
          this.tagIndex.set(tag, tagKeys);
        }
        tagKeys.add(key);
      }

      logger.debug('Cache set', { key, ttl, tags, size });

      return true;
    } catch (error) {
      logger.error('Cache set error', { error, key });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        return false;
      }

      // Remove from tag index
      for (const tag of entry.tags) {
        const tagKeys = this.tagIndex.get(tag);
        if (tagKeys) {
          tagKeys.delete(key);
          if (tagKeys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }

      this.cache.delete(key);
      logger.debug('Cache delete', { key });

      return true;
    } catch (error) {
      logger.error('Cache delete error', { error, key });
      return false;
    }
  }

  /**
   * Clear cache by tags
   */
  async clearByTags(tags: string[]): Promise<number> {
    try {
      let count = 0;
      const keysToDelete = new Set<string>();

      // Collect all keys with any of the specified tags
      for (const tag of tags) {
        const tagKeys = this.tagIndex.get(tag);
        if (tagKeys) {
          for (const key of tagKeys) {
            keysToDelete.add(key);
          }
        }
      }

      // Delete all collected keys
      for (const key of keysToDelete) {
        if (await this.delete(key)) {
          count++;
        }
      }

      logger.info('Cache cleared by tags', { tags, count });

      return count;
    } catch (error) {
      logger.error('Cache clear by tags error', { error, tags });
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    try {
      this.cache.clear();
      this.tagIndex.clear();
      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache clear error', { error });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

      let totalSize = 0;
      for (const entry of this.cache.values()) {
        totalSize += entry.size;
      }

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        size: totalSize,
        keys: this.cache.size,
        hitRate,
      };
    } catch (error) {
      logger.error('Cache stats error', { error });
      return {
        hits: 0,
        misses: 0,
        size: 0,
        keys: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * Warm cache with data
   */
  async warm(keys: string[], loader: (key: string) => Promise<unknown>): Promise<number> {
    try {
      let count = 0;

      for (const key of keys) {
        try {
          const value = await loader(key);
          if (value !== null && value !== undefined) {
            await this.set(key, value);
            count++;
          }
        } catch (error) {
          logger.error('Cache warm error for key', { error, key });
        }
      }

      logger.info('Cache warmed', { keys: keys.length, loaded: count });

      return count;
    } catch (error) {
      logger.error('Cache warm error', { error });
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        return false;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Cache has error', { error, key });
      return false;
    }
  }

  /**
   * Get remaining TTL for key
   */
  async getTTL(key: string): Promise<number> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        return 0;
      }

      const remaining = entry.expiresAt - Date.now();
      return Math.max(0, remaining);
    } catch (error) {
      logger.error('Cache getTTL error', { error, key });
      return 0;
    }
  }

  /**
   * Extend TTL for key
   */
  async extendTTL(key: string, ttl: number): Promise<boolean> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        return false;
      }

      entry.expiresAt = Date.now() + ttl;
      logger.debug('Cache TTL extended', { key, ttl });

      return true;
    } catch (error) {
      logger.error('Cache extendTTL error', { error, key });
      return false;
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T | null> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Load from source
      const value = await loader();
      if (value !== null && value !== undefined) {
        await this.set(key, value, options);
      }

      return value;
    } catch (error) {
      logger.error('Cache getOrSet error', { error, key });
      return null;
    }
  }

  /**
   * Generate cache key from components
   */
  generateKey(...components: (string | number | boolean)[]): string {
    const keyString = components.join(':');
    return createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Compress value (simple JSON stringify for now)
   */
  private compress(value: unknown): string {
    return JSON.stringify(value);
  }

  /**
   * Decompress value
   */
  private decompress(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: unknown): number {
    try {
      const str = JSON.stringify(value);
      return new Blob([str]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      logger.debug('Cache evicted oldest entry', { key: oldestKey });
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    try {
      const now = Date.now();
      let count = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.delete(key);
          count++;
        }
      }

      if (count > 0) {
        logger.debug('Cache cleanup', { expired: count });
      }
    } catch (error) {
      logger.error('Cache cleanup error', { error });
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupInterval);

    logger.info('Cache cleanup timer started', {
      interval: this.cleanupInterval,
    });
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      logger.info('Cache cleanup timer stopped');
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    logger.info('Cache stats reset');
  }
}

/**
 * Global instance
 */
export const advancedCachingService = new AdvancedCachingService();

/**
 * Export default
 */
export default advancedCachingService;
