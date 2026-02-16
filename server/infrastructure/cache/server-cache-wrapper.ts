/**
 * Server Cache Wrapper
 * Provides server-specific caching methods built on top of the unified cache service
 */

import { createSimpleCacheService } from './factory';
import type { CacheService } from './types';

/**
 * Server-specific cache wrapper with convenience methods for common patterns
 */
export class ServerCacheWrapper {
  private cache: CacheService;

  constructor(cache?: CacheService) {
    this.cache = cache || createSimpleCacheService();
  }

  /**
   * Get a cached API response
   */
  async getApiResponse<T = any>(key: string): Promise<T | null> {
    return this.cache.get<T>(`api:${key}`);
  }

  /**
   * Cache an API response
   */
  async cacheApiResponse<T = any>(key: string, data: T, ttlSec?: number): Promise<void> {
    await this.cache.set(`api:${key}`, data, ttlSec);
  }

  /**
   * Get a cached query result
   */
  async getCachedQuery<T = any>(key: string): Promise<T | null> {
    return this.cache.get<T>(`query:${key}`);
  }

  /**
   * Cache a query result
   */
  async cacheQuery<T = any>(key: string, data: T, ttlSec?: number): Promise<void> {
    await this.cache.set(`query:${key}`, data, ttlSec);
  }

  /**
   * Invalidate cache entries matching a pattern
   * Note: This is a simplified implementation that only supports exact key deletion
   * For pattern matching, you would need to implement a key tracking mechanism
   */
  async invalidateQueryPattern(pattern: string): Promise<void> {
    // For now, just delete the exact key
    // In a production system, you'd want to track keys and match patterns
    await this.cache.del(`query:${pattern}`);
  }

  /**
   * Get the underlying cache service
   */
  getCache(): CacheService {
    return this.cache;
  }

  /**
   * Direct access to cache methods
   */
  async get<T = any>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  async set<T = any>(key: string, value: T, ttlSec?: number): Promise<void> {
    await this.cache.set(key, value, ttlSec);
  }

  async del(key: string): Promise<boolean> {
    return this.cache.del(key);
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }
}

// Create and export a singleton instance
export const serverCache = new ServerCacheWrapper();
