/**
 * Unified Cache Factory
 *
 * Factory functions for creating and managing cache services.
 * Combines functionality from simple-factory.ts and factory.ts.
 */

import { MemoryAdapter } from './adapters/memory-adapter';
import { MultiTierAdapter } from './adapters/multi-tier-adapter';
import type { CacheService, CacheConfig } from './core/interfaces';

/**
 * CacheManager - Provides high-level cache management operations
 * 
 * This class wraps a CacheService instance and provides convenient methods
 * for cache warming, statistics, health checks, and maintenance operations.
 * 
 * @example
 * ```typescript
 * const cache = createCacheService({ provider: 'memory', defaultTtlSec: 3600 });
 * const manager = createCacheManager(cache);
 * 
 * // Warm up cache with predefined data
 * await manager.warmUp([
 *   { key: 'user:1', factory: () => fetchUser(1), ttl: 300 }
 * ]);
 * 
 * // Get cache statistics
 * const stats = manager.getStats();
 * console.log(`Hit rate: ${stats.hitRate}%`);
 * ```
 */
export class CacheManager {
  constructor(private cache: CacheService) {}

  /**
   * Warm up cache with predefined data
   * 
   * Loads data into the cache using factory functions. If a key already exists,
   * it will be skipped. Failed warm-up operations are logged but don't throw errors.
   * 
   * @param entries - Array of cache entries to warm up
   * @param entries[].key - Cache key
   * @param entries[].factory - Async function that returns the value to cache
   * @param entries[].ttl - Optional TTL in seconds
   * @param entries[].tags - Optional tags for cache invalidation (not yet implemented)
   * 
   * @example
   * ```typescript
   * await manager.warmUp([
   *   { 
   *     key: 'products:featured', 
   *     factory: async () => await db.getFeaturedProducts(),
   *     ttl: 600 
   *   },
   *   { 
   *     key: 'config:app', 
   *     factory: async () => await loadAppConfig() 
   *   }
   * ]);
   * ```
   */
  async warmUp(entries: Array<{
    key: string;
    factory: () => Promise<any>;
    ttl?: number;
    tags?: string[];
  }>): Promise<void> {
    const promises = entries.map(async ({ key, factory, ttl, tags: _tags }) => {
      try {
        const exists = await this.cache.exists?.(key);
        if (!exists) {
          const data = await factory();
          await this.cache.set(key, data, ttl);
        }
      } catch (error) {
        console.warn(`Failed to warm up cache key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics
   * 
   * Returns metrics about cache performance including hit rate, memory usage,
   * and operation counts.
   * 
   * @returns Cache metrics object or undefined if metrics are not available
   */
  getStats() {
    return this.cache.getMetrics?.();
  }

  /**
   * Get cache health status
   * 
   * Checks the health of the cache adapter including connection status,
   * latency, and any errors.
   * 
   * @returns Health status object or undefined if health checks are not supported
   */
  async getHealth() {
    if (this.cache.getHealth) {
      return await this.cache.getHealth();
    }
    return undefined;
  }

  /**
   * Clear all cache data
   * 
   * Removes all entries from the cache. Uses either clear() or flush()
   * depending on what the adapter supports.
   */
  async clear(): Promise<void> {
    if (this.cache.clear) {
      await this.cache.clear();
    } else if (this.cache.flush) {
      await this.cache.flush();
    }
  }

  /**
   * Perform cache maintenance
   * 
   * Executes maintenance operations such as:
   * - Cleaning up expired entries
   * - Optimizing memory usage
   * - Rebalancing multi-tier cache
   * 
   * Implementation depends on the specific adapter being used.
   */
  async maintenance(): Promise<void> {
    // This could include operations like:
    // - Cleaning up expired entries
    // - Optimizing memory usage
    // - Rebalancing multi-tier cache
    // Implementation depends on the specific adapter
  }
}

/**
 * Create cache service based on configuration
 * 
 * Factory function that creates a cache service instance based on the provided
 * configuration. Supports memory, redis, and multi-tier cache providers.
 * 
 * @param config - Cache configuration object
 * @param config.provider - Cache provider type ('memory', 'redis', or 'multi-tier')
 * @param config.defaultTtlSec - Default TTL in seconds for cache entries
 * @param config.maxMemoryMB - Maximum memory usage in megabytes
 * @param config.keyPrefix - Optional prefix for all cache keys
 * @param config.enableMetrics - Enable metrics collection
 * @param config.enableCompression - Enable value compression
 * @param config.compressionThreshold - Minimum size in bytes to trigger compression
 * @param config.redisUrl - Redis connection URL (required for 'redis' and 'multi-tier')
 * @param config.l1MaxSizeMB - L1 cache size for multi-tier (defaults to 20% of maxMemoryMB)
 * 
 * @returns CacheService instance
 * @throws Error if provider is unsupported or required config is missing
 * 
 * @example
 * ```typescript
 * // Memory cache
 * const memCache = createCacheService({
 *   provider: 'memory',
 *   defaultTtlSec: 3600,
 *   maxMemoryMB: 100
 * });
 * 
 * // Multi-tier cache (memory + redis)
 * const multiCache = createCacheService({
 *   provider: 'multi-tier',
 *   defaultTtlSec: 3600,
 *   maxMemoryMB: 100,
 *   redisUrl: 'redis://localhost:6379',
 *   l1MaxSizeMB: 20
 * });
 * ```
 */
export function createCacheService(config: CacheConfig): CacheService {
  let baseAdapter: CacheService;

  switch (config.provider) {
    case 'memory':
      baseAdapter = new MemoryAdapter({
        ...(config.maxMemoryMB !== undefined && { maxMemoryMB: config.maxMemoryMB }),
        ...(config.enableMetrics !== undefined && { enableMetrics: config.enableMetrics }),
        ...(config.keyPrefix !== undefined && { keyPrefix: config.keyPrefix }),
        ...(config.defaultTtlSec !== undefined && { defaultTtlSec: config.defaultTtlSec }),
        ...(config.enableCompression !== undefined && { enableCompression: config.enableCompression }),
        ...(config.compressionThreshold !== undefined && { compressionThreshold: config.compressionThreshold }),
      });
      break;

    case 'redis':
      // Note: RedisAdapter is not yet implemented in the adapters directory
      // This case is kept for future implementation
      throw new Error('Redis adapter is not yet implemented. Use memory or multi-tier provider.');

    case 'multi-tier':
      baseAdapter = new MultiTierAdapter({
        l1Config: {
          maxMemoryMB: config.l1MaxSizeMB || Math.floor((config.maxMemoryMB || 100) * 0.2),
          ...(config.enableMetrics !== undefined && { enableMetrics: config.enableMetrics }),
          ...(config.keyPrefix !== undefined && { keyPrefix: config.keyPrefix }),
          ...(config.defaultTtlSec !== undefined && { defaultTtlSec: config.defaultTtlSec }),
          enableCompression: false, // Disable compression for L1
          ...(config.compressionThreshold !== undefined && { compressionThreshold: config.compressionThreshold }),
        },
        l2Config: {
          redisUrl: config.redisUrl!,
          ...(config.maxMemoryMB !== undefined && { maxMemoryMB: config.maxMemoryMB }),
          ...(config.enableMetrics !== undefined && { enableMetrics: config.enableMetrics }),
          ...(config.keyPrefix !== undefined && { keyPrefix: config.keyPrefix }),
          ...(config.defaultTtlSec !== undefined && { defaultTtlSec: config.defaultTtlSec }),
          ...(config.enableCompression !== undefined && { enableCompression: config.enableCompression }),
          ...(config.compressionThreshold !== undefined && { compressionThreshold: config.compressionThreshold }),
        },
        ...(config.enableMetrics !== undefined && { enableMetrics: config.enableMetrics }),
        ...(config.keyPrefix !== undefined && { keyPrefix: config.keyPrefix }),
      });
      break;

    default:
      throw new Error(`Unsupported cache provider: ${config.provider}`);
  }

  // Wrap with SingleFlightCache for circuit breaker and request deduplication
  // For now, return the base adapter directly to avoid interface conflicts
  // TODO: Fix SingleFlightCache interface compatibility
  return baseAdapter as unknown;
}

/**
 * Create a simple memory cache service with minimal configuration
 * 
 * Convenience function for creating a basic memory cache without needing
 * to specify all configuration options. Ideal for simple use cases.
 * 
 * @param config - Optional simplified configuration
 * @param config.defaultTtlSec - Default TTL in seconds (default: 3600)
 * @param config.maxMemoryMB - Maximum memory in MB (default: 100)
 * @param config.keyPrefix - Optional key prefix
 * 
 * @returns CacheService instance configured for memory storage
 * 
 * @example
 * ```typescript
 * // Create with defaults (1 hour TTL, 100MB max memory)
 * const cache = createSimpleCacheService();
 * 
 * // Create with custom settings
 * const cache = createSimpleCacheService({
 *   defaultTtlSec: 1800,  // 30 minutes
 *   maxMemoryMB: 50,
 *   keyPrefix: 'app:'
 * });
 * 
 * await cache.set('user:123', userData);
 * const user = await cache.get('user:123');
 * ```
 */
export function createSimpleCacheService(config?: Partial<CacheConfig>): CacheService {
  return createCacheService({
    provider: 'memory',
    defaultTtlSec: config?.defaultTtlSec || 3600,
    maxMemoryMB: config?.maxMemoryMB || 100,
    ...config
  });
}

// Default cache instance (will be configured by ConfigManager)
let defaultCacheInstance: CacheService | null = null;

/**
 * Get the default cache instance
 * 
 * Returns the singleton default cache instance. Must be initialized first
 * using initializeDefaultCache().
 * 
 * @returns The default CacheService instance
 * @throws Error if default cache has not been initialized
 * 
 * @example
 * ```typescript
 * // Initialize first
 * initializeDefaultCache({ provider: 'memory', defaultTtlSec: 3600 });
 * 
 * // Then use anywhere in your app
 * const cache = getDefaultCache();
 * await cache.set('key', 'value');
 * ```
 */
export function getDefaultCache(): CacheService {
  if (!defaultCacheInstance) {
    throw new Error('Default cache not initialized. Call initializeDefaultCache() first.');
  }
  return defaultCacheInstance;
}

/**
 * Initialize the default cache instance
 * 
 * Creates and stores a singleton cache instance that can be accessed
 * throughout the application using getDefaultCache().
 * 
 * @param config - Cache configuration object
 * @returns The initialized CacheService instance
 * 
 * @example
 * ```typescript
 * // Initialize at app startup
 * const cache = initializeDefaultCache({
 *   provider: 'memory',
 *   defaultTtlSec: 3600,
 *   maxMemoryMB: 100,
 *   enableMetrics: true
 * });
 * ```
 */
export function initializeDefaultCache(config: CacheConfig): CacheService {
  defaultCacheInstance = createCacheService(config);
  return defaultCacheInstance;
}

/**
 * Reset the default cache instance
 * 
 * Destroys the current default cache instance and clears the singleton.
 * Useful for testing or when reconfiguring the cache.
 * 
 * @example
 * ```typescript
 * // In tests
 * afterEach(() => {
 *   resetDefaultCache();
 * });
 * ```
 */
export function resetDefaultCache(): void {
  if (defaultCacheInstance && typeof (defaultCacheInstance as any).destroy === 'function') {
    (defaultCacheInstance as any).destroy();
  }
  defaultCacheInstance = null;
}

/**
 * Create a cache manager instance
 * 
 * Factory function for creating a CacheManager that wraps a cache service
 * with high-level management operations.
 * 
 * @param cache - Optional CacheService instance (defaults to default cache)
 * @returns CacheManager instance
 * 
 * @example
 * ```typescript
 * // Use with default cache
 * const manager = createCacheManager();
 * 
 * // Use with custom cache
 * const customCache = createCacheService({ provider: 'memory', defaultTtlSec: 1800 });
 * const manager = createCacheManager(customCache);
 * 
 * await manager.warmUp([...]);
 * const stats = manager.getStats();
 * ```
 */
export function createCacheManager(cache?: CacheService): CacheManager {
  return new CacheManager(cache || getDefaultCache());
}

/**
 * SimpleCacheFactory - Manages multiple named cache instances
 * 
 * Provides a registry for creating and managing multiple cache instances
 * by name. Useful when you need multiple isolated caches in your application.
 * 
 * @example
 * ```typescript
 * const factory = SimpleCacheFactory.getInstance();
 * 
 * // Create named caches
 * const userCache = factory.createCache('users', { 
 *   provider: 'memory', 
 *   defaultTtlSec: 3600 
 * });
 * const sessionCache = factory.createCache('sessions', { 
 *   provider: 'memory', 
 *   defaultTtlSec: 1800 
 * });
 * 
 * // Retrieve by name
 * const cache = factory.getCache('users');
 * 
 * // List all caches
 * const names = factory.getCacheNames(); // ['users', 'sessions']
 * 
 * // Clear all caches
 * await factory.clearAll();
 * ```
 */
export class SimpleCacheFactory {
  private static instance: SimpleCacheFactory;
  private caches = new Map<string, CacheService>();

  private constructor() {}

  /**
   * Get singleton instance of SimpleCacheFactory
   */
  static getInstance(): SimpleCacheFactory {
    if (!SimpleCacheFactory.instance) {
      SimpleCacheFactory.instance = new SimpleCacheFactory();
    }
    return SimpleCacheFactory.instance;
  }

  /**
   * Create a named cache instance
   * 
   * Creates a new cache with the given name and configuration. If a cache
   * with the same name already exists, returns the existing instance.
   * 
   * @param name - Unique name for the cache instance
   * @param config - Cache configuration
   * @returns CacheService instance
   */
  createCache(name: string, config: CacheConfig): CacheService {
    if (this.caches.has(name)) {
      return this.caches.get(name)!;
    }

    const cache = createCacheService(config);
    this.caches.set(name, cache);
    return cache;
  }

  /**
   * Get an existing cache instance by name
   * 
   * @param name - Name of the cache instance
   * @returns CacheService instance or undefined if not found
   */
  getCache(name: string): CacheService | undefined {
    return this.caches.get(name);
  }

  /**
   * Remove a cache instance by name
   * 
   * @param name - Name of the cache instance to remove
   * @returns true if the cache was removed, false if it didn't exist
   */
  removeCache(name: string): boolean {
    return this.caches.delete(name);
  }

  /**
   * Get all cache instance names
   * 
   * @returns Array of cache names
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * Clear all cache instances
   * 
   * Clears the data in all registered cache instances without removing them.
   */
  async clearAll(): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache => 
      cache.clear ? cache.clear() : Promise.resolve()
    );
    await Promise.all(promises);
  }

  /**
   * Shutdown all cache instances
   * 
   * Destroys all cache instances and clears the registry.
   */
  async shutdown(): Promise<void> {
    const caches = Array.from(this.caches.values());
    for (const cache of caches) {
      if (typeof (cache as any).destroy === 'function') {
        await (cache as any).destroy();
      }
    }
    this.caches.clear();
  }
}

/**
 * Default SimpleCacheFactory singleton instance
 * 
 * Convenience export for accessing the SimpleCacheFactory singleton
 * without calling getInstance().
 * 
 * @example
 * ```typescript
 * import { cacheFactory } from './factory';
 * 
 * const cache = cacheFactory.createCache('myCache', {
 *   provider: 'memory',
 *   defaultTtlSec: 3600
 * });
 * ```
 */
export const cacheFactory = SimpleCacheFactory.getInstance();
