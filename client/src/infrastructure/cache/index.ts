/**
 * Cache Infrastructure Module
 *
 * Provides shared caching utilities and intelligent cache invalidation system.
 * This module handles cache lifecycle management, invalidation strategies,
 * and cache entry operations across the application.
 *
 * @module infrastructure/cache
 * @example
 * ```typescript
 * import { cacheInvalidationManager, invalidateCache, setCacheEntry } from '@/infrastructure/cache';
 *
 * // Set a cache entry
 * await setCacheEntry('user:123', userData, { ttl: 3600 });
 *
 * // Invalidate specific cache
 * await invalidateCache('user:123');
 *
 * // Invalidate by pattern
 * await cacheInvalidationManager.invalidateByPattern('user:*');
 * ```
 */

export * from './cache-invalidation';

/**
 * Global cache invalidation manager instance.
 * Manages cache invalidation strategies and patterns across the application.
 *
 * @example
 * ```typescript
 * // Invalidate all user caches
 * await cacheInvalidationManager.invalidateByPattern('user:*');
 *
 * // Invalidate multiple keys
 * await cacheInvalidationManager.invalidateMultiple(['key1', 'key2']);
 * ```
 */
export {
  cacheInvalidationManager,
  /**
   * Invalidate a specific cache entry by key.
   *
   * @param key - The cache key to invalidate
   * @returns Promise that resolves when invalidation is complete
   * @example
   * ```typescript
   * await invalidateCache('user:123');
   * ```
   */
  invalidateCache,
  /**
   * Set a cache entry with optional TTL and metadata.
   *
   * @param key - The cache key
   * @param value - The value to cache
   * @param options - Cache options including TTL
   * @returns Promise that resolves when entry is set
   * @example
   * ```typescript
   * await setCacheEntry('user:123', userData, { ttl: 3600 });
   * ```
   */
  setCacheEntry,
  /**
   * Retrieve a cache entry by key.
   *
   * @param key - The cache key to retrieve
   * @returns Promise that resolves with the cached value or null
   * @example
   * ```typescript
   * const userData = await getCacheEntry('user:123');
   * ```
   */
  getCacheEntry,
} from './cache-invalidation';
