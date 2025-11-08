/**
 * Database Query Caching Helper
 * Wraps database queries with caching logic
 */

import { serverCache } from './cache-service';
import * as crypto from 'crypto';

export interface QueryCacheOptions {
  ttl?: number;
  keyPrefix?: string;
  skipCache?: boolean;
  tags?: string[];
}

/**
 * Cache wrapper for database queries
 */
export class QueryCache {
  /**
   * Execute a query with caching
   */
  static async execute<T>(
    queryFn: () => Promise<T>,
    cacheKey: string,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const {
      ttl = 600, // 10 minutes default
      keyPrefix = 'query',
      skipCache = false,
      tags = []
    } = options;

    const fullKey = `${keyPrefix}:${cacheKey}`;

    // Skip cache if requested
    if (skipCache) {
      return await queryFn();
    }

    try {
      // Try to get from cache first
      const cached = await serverCache.getCachedQuery<T>(fullKey);
      if (cached !== null) {
        return cached;
      }

      // Execute query
      const result = await queryFn();

      // Cache the result
      await serverCache.cacheQuery(fullKey, result, ttl);

      return result;
    } catch (error) {
      console.error('Query cache error:', error);
      // Fallback to direct query execution
      return await queryFn();
    }
  }

  /**
   * Generate cache key from query parameters
   */
  static generateKey(query: string, params: any[] = []): string {
    const combined = JSON.stringify({ query, params });
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  /**
   * Cache a paginated query
   */
  static async executePaginated<T>(
    queryFn: (offset: number, limit: number) => Promise<T[]>,
    countFn: () => Promise<number>,
    page: number,
    pageSize: number,
    baseKey: string,
    options: QueryCacheOptions = {}
  ): Promise<{ data: T[]; total: number; page: number; pageSize: number }> {
    const offset = (page - 1) * pageSize;
    
    // Cache keys for data and count
    const dataKey = `${baseKey}:page:${page}:size:${pageSize}`;
    const countKey = `${baseKey}:count`;

    // Execute both queries with caching
    const [data, total] = await Promise.all([
      QueryCache.execute(() => queryFn(offset, pageSize), dataKey, options),
      QueryCache.execute(() => countFn(), countKey, { ...options, ttl: options.ttl || 300 })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * Cache a search query
   */
  static async executeSearch<T>(
    searchFn: (query: string, filters: any) => Promise<T[]>,
    searchQuery: string,
    filters: any = {},
    options: QueryCacheOptions = {}
  ): Promise<T[]> {
    const cacheKey = QueryCache.generateKey('search', [searchQuery, filters]);
    
    return QueryCache.execute(
      () => searchFn(searchQuery, filters),
      cacheKey,
      { ...options, ttl: options.ttl || 180 } // 3 minutes for search results
    );
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidate(pattern: string): Promise<void> {
    await serverCache.invalidateQueryPattern(pattern);
  }
}

/**
 * Decorator for caching method results
 */
export function Cached(options: QueryCacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = QueryCache.generateKey(`${target.constructor.name}.${propertyName}`, args);
      
      return QueryCache.execute(
        () => method.apply(this, args),
        cacheKey,
        options
      );
    };

    return descriptor;
  };
}

/**
 * Helper functions for common caching patterns
 */
export const CacheHelpers = {
  /**
   * Cache user data
   */
  user: (user_id: string, ttl: number = 900) => ({
    keyPrefix: 'user',
    ttl,
    tags: [`user:${user_id}`]
  }),

  /**
   * Cache bill data
   */
  bill: (bill_id: string, ttl: number = 1800) => ({
    keyPrefix: 'bill',
    ttl,
    tags: [`bill:${bill_id}`]
  }),

  /**
   * Cache search results
   */
  search: (ttl: number = 180) => ({
    keyPrefix: 'search',
    ttl,
    tags: ['search']
  }),

  /**
   * Cache analytics data
   */
  analytics: (ttl: number = 3600) => ({
    keyPrefix: 'analytics',
    ttl,
    tags: ['analytics']
  })
};