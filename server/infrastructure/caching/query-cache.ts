/**
 * Query Result Caching Layer
 *
 * Provides caching for frequently accessed database query results
 * with TTL support and cache invalidation strategies.
 */

import type { Result } from '@shared/core';
import { Ok } from '@shared/core';

import { performanceMonitor } from '../performance/performance-monitor';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Cache key prefix for namespacing */
  keyPrefix?: string;
  /** Maximum cache size */
  maxSize?: number;
  /** Cache invalidation strategy */
  invalidationStrategy?: 'lru' | 'ttl' | 'manual';
}

export class QueryCache {
  private static instance: QueryCache;
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtl = 5 * 60 * 1000; // 5 minutes
  private maxSize = 1000;
  private invalidationStrategy: 'lru' | 'ttl' | 'manual' = 'ttl';

  private constructor() {
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }

  static getInstance(): QueryCache {
    if (!QueryCache.instance) {
      QueryCache.instance = new QueryCache();
    }
    return QueryCache.instance;
  }

  /**
   * Configure cache settings
   */
  configure(options: Partial<CacheOptions>): void {
    if (options.ttl !== undefined) this.defaultTtl = options.ttl;
    if (options.maxSize !== undefined) this.maxSize = options.maxSize;
    if (options.invalidationStrategy) this.invalidationStrategy = options.invalidationStrategy;
  }

  /**
   * Generate a cache key from query parameters
   */
  private generateKey(operation: string, params: any, prefix?: string): string {
    const keyData = { operation, params };
    const baseKey = `${prefix || 'query'}_${JSON.stringify(keyData)}`;
    return baseKey;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(operation: string, params: any, options?: CacheOptions): T | null {
    const key = this.generateKey(operation, params, options?.keyPrefix);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  /**
   * Store data in cache
   */
  set<T>(operation: string, params: any, data: T, options?: CacheOptions): void {
    const key = this.generateKey(operation, params, options?.keyPrefix);
    const ttl = options?.ttl || this.defaultTtl;

    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictEntries();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
  }

  /**
   * Execute operation with caching
   */
  async withCache<T>(
    operation: string,
    params: any,
    fn: () => Promise<Result<T, Error>>,
    options?: CacheOptions
  ): Promise<Result<T, Error>> {
    return performanceMonitor.monitorOperation(
      `cached_${operation}`,
      async () => {
        // Try to get from cache first
        const cachedData = this.get<T>(operation, params, options);
        if (cachedData !== null) {
          return Ok(cachedData);
        }

        // Execute operation
        const result = await fn();
        if (result.isOk()) {
          // Cache successful results
          this.set(operation, params, result.unwrap(), options);
        }

        return result;
      },
      { operation, params, cached: this.get(operation, params, options) !== null }
    );
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string | RegExp, options?: { keyPrefix?: string }): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      const shouldInvalidate = typeof pattern === 'string'
        ? key.includes(pattern)
        : pattern.test(key);

      if (shouldInvalidate) {
        if (options?.keyPrefix) {
          if (key.startsWith(`${options.keyPrefix}_`)) {
            this.cache.delete(key);
            invalidated++;
          }
        } else {
          this.cache.delete(key);
          invalidated++;
        }
      }
    }

    return invalidated;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidateKey(operation: string, params: any, options?: CacheOptions): boolean {
    const key = this.generateKey(operation, params, options?.keyPrefix);
    return this.cache.delete(key);
  }

  /**
   * Evict entries based on invalidation strategy
   */
  private evictEntries(): void {
    switch (this.invalidationStrategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'ttl':
        this.cleanup();
        break;
      case 'manual':
        // Don't auto-evict for manual strategy
        break;
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalAccesses: number;
    totalHits: number;
    entries: Array<{
      key: string;
      age: number;
      accessCount: number;
      size: number;
    }>;
  } {
    let totalAccesses = 0;
    let totalHits = 0;

    const entries = Array.from(this.cache.entries()).map(([key, entry]) => {
      totalAccesses += entry.accessCount;
      totalHits += entry.accessCount; // Each access is a hit since we only store accessed entries

      return {
        key,
        age: Date.now() - entry.timestamp,
        accessCount: entry.accessCount,
        size: JSON.stringify(entry.data).length
      };
    });

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalAccesses > 0 ? totalHits / totalAccesses : 0,
      totalAccesses,
      totalHits,
      entries
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
}

// Default cache instance
export const queryCache = QueryCache.getInstance();