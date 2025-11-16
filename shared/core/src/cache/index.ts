/**
 * Unified Cache Module
 * 
 * This module provides a unified interface for all cache operations,
 * resolving conflicts between different cache implementations.
 */

import { CacheService as CoreCacheService, CacheMetrics } from '../caching/core/interfaces';

// Unified cache service interface that combines both definitions
export interface CacheService extends CoreCacheService {
  // Additional methods from types.ts that aren't in core/interfaces.ts
  flush?(): Promise<void>;
  invalidateByPattern?(pattern: string): Promise<number>;
  invalidateByTags?(tags: string[]): Promise<number>;
}

// Re-export unified CacheMetrics from core interfaces
export type { CacheMetrics, CacheTierStats } from '../caching/core/interfaces';

// Re-export other types from the appropriate modules
export type { 
  CacheHealthStatus,
  CacheConfig,
  CacheOptions,
  CacheEntry,
  CacheAdapter,
  CacheEvent,
  CacheEventType
} from '../caching/core/interfaces';

export type {
  PromotionStrategy,
  MultiTierOptions,
  CompressionOptions,
  SerializationOptions,
  CacheWarmingStrategy,
  EvictionOptions
} from '../caching/types';


// Simple in-memory cache implementation for fallback
class MemoryCache implements CacheService {
  private cache = new Map<string, { value: any; expires: number }>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    operations: 0,
    errors: 0,
    memoryUsage: 0,
    keyCount: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: 0,
    avgResponseTime: 0
  };

  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    this.metrics.operations++;
    
    const item = this.cache.get(key);
    if (!item || item.expires < Date.now()) {
      this.metrics.misses++;
      this.updateMetrics(Date.now() - start);
      return null;
    }
    
    this.metrics.hits++;
    this.updateMetrics(Date.now() - start);
    return item.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const start = Date.now();
    this.metrics.operations++;
    
    const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : Date.now() + (3600 * 1000);
    this.cache.set(key, { value, expires });
    this.metrics.keyCount = this.cache.size;
    
    this.updateMetrics(Date.now() - start);
  }

  async del(key: string): Promise<boolean> {
    const start = Date.now();
    this.metrics.operations++;
    
    const result = this.cache.delete(key);
    this.metrics.keyCount = this.cache.size;
    
    this.updateMetrics(Date.now() - start);
    return result;
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    return item !== undefined && item.expires >= Date.now();
  }

  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }
  }

  async mdel(keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (await this.del(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  async increment(key: string, delta = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + delta;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, delta = 1): Promise<number> {
    return this.increment(key, -delta);
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    
    item.expires = Date.now() + (ttlSeconds * 1000);
    return true;
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    if (!item) return -2;
    
    const remaining = Math.max(0, item.expires - Date.now());
    return Math.floor(remaining / 1000);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.metrics.keyCount = 0;
  }

  async flush(): Promise<void> {
    return this.clear();
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  getMetrics(): CacheMetrics {
    this.metrics.hitRate = this.metrics.operations > 0 
      ? this.metrics.hits / this.metrics.operations 
      : 0;
    return { ...this.metrics };
  }

  private updateMetrics(latency: number) {
    this.metrics.avgLatency = (this.metrics.avgLatency + latency) / 2;
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
    this.metrics.minLatency = this.metrics.minLatency === 0 
      ? latency 
      : Math.min(this.metrics.minLatency, latency);
    this.metrics.avgResponseTime = this.metrics.avgLatency;
  }
}

// Default cache instance
let defaultCache: CacheService | null = null;

/**
 * Get the default cache instance
 */
export function getDefaultCache(): CacheService {
  if (!defaultCache) {
    defaultCache = new MemoryCache();
  }
  return defaultCache;
}

/**
 * Set the default cache instance
 */
export function setDefaultCache(cache: CacheService): void {
  defaultCache = cache;
}

/**
 * Create a cache service instance
 */
export function createCacheService(_config?: any): CacheService {
  // For now, return the memory cache
  // This can be extended to support different providers based on config
  return new MemoryCache();
}

// Re-export the memory cache class for direct use
export { MemoryCache };