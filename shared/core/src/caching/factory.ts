/**
 * Cache Factory
 *
 * Factory functions for creating and managing cache services
 */

import type { CacheService, CacheConfig } from './core/interfaces';
import { MemoryAdapter, type MemoryAdapterConfig } from './adapters/memory-adapter';
import { RedisAdapter, type RedisAdapterConfig } from './adapters/redis-adapter';
import { MultiTierAdapter, type MultiTierAdapterConfig } from './adapters/multi-tier-adapter';
import { SingleFlightCache } from './patterns/single-flight-cache';

// Cache manager for cache operations
export class CacheManager {
  constructor(private cache: CacheService) {}

  /**
   * Warm up cache with predefined data
   */
  async warmUp(entries: Array<{
    key: string;
    factory: () => Promise<any>;
    ttl?: number;
    tags?: string[];
  }>): Promise<void> {
    const promises = entries.map(async ({ key, factory, ttl, tags }) => {
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
   */
  getStats() {
    return this.cache.getMetrics?.();
  }

  /**
   * Get cache health status
   */
  async getHealth() {
    if (this.cache.getHealth) {
      return await this.cache.getHealth();
    }
    return undefined;
  }

  /**
   * Clear all cache data
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
 */
export function createCacheService(config: CacheConfig): CacheService {
  let baseAdapter: CacheService;

  switch (config.provider) {
    case 'memory':
      baseAdapter = new MemoryAdapter({
        maxMemoryMB: config.maxMemoryMB,
        enableMetrics: config.enableMetrics,
        keyPrefix: config.keyPrefix,
        defaultTtlSec: config.defaultTtlSec,
        enableCompression: config.enableCompression,
        compressionThreshold: config.compressionThreshold,
      });
      break;

    case 'redis':
      baseAdapter = new RedisAdapter({
        redisUrl: config.redisUrl!,
        maxMemoryMB: config.maxMemoryMB,
        enableMetrics: config.enableMetrics,
        keyPrefix: config.keyPrefix,
        defaultTtlSec: config.defaultTtlSec,
        enableCompression: config.enableCompression,
        compressionThreshold: config.compressionThreshold,
      });
      break;

    case 'multi-tier':
      baseAdapter = new MultiTierAdapter({
        l1Config: {
          maxMemoryMB: config.l1MaxSizeMB || Math.floor(config.maxMemoryMB * 0.2),
          enableMetrics: config.enableMetrics,
          keyPrefix: config.keyPrefix,
          defaultTtlSec: config.defaultTtlSec,
          enableCompression: false, // Disable compression for L1
          compressionThreshold: config.compressionThreshold,
        },
        l2Config: {
          redisUrl: config.redisUrl!,
          maxMemoryMB: config.maxMemoryMB,
          enableMetrics: config.enableMetrics,
          keyPrefix: config.keyPrefix,
          defaultTtlSec: config.defaultTtlSec,
          enableCompression: config.enableCompression,
          compressionThreshold: config.compressionThreshold,
        },
        enableMetrics: config.enableMetrics,
        keyPrefix: config.keyPrefix,
      });
      break;

    default:
      throw new Error(`Unsupported cache provider: ${config.provider}`);
  }

  // Wrap with SingleFlightCache for circuit breaker and request deduplication
  if (config.enableCircuitBreaker !== false) {
    return new SingleFlightCache(baseAdapter, {
      enableCircuitBreaker: config.enableCircuitBreaker,
      circuitBreakerThreshold: config.circuitBreakerThreshold,
      circuitBreakerTimeout: config.circuitBreakerTimeout,
    });
  }

  return baseAdapter;
}

// Default cache instance (will be configured by ConfigManager)
let defaultCacheInstance: CacheService | null = null;

/**
 * Get the default cache instance
 */
export function getDefaultCache(): CacheService {
  if (!defaultCacheInstance) {
    throw new Error('Default cache not initialized. Call initializeDefaultCache() first.');
  }
  return defaultCacheInstance;
}

/**
 * Initialize the default cache instance
 */
export function initializeDefaultCache(config: CacheConfig): CacheService {
  defaultCacheInstance = createCacheService(config);
  return defaultCacheInstance;
}

/**
 * Reset the default cache instance (useful for testing)
 */
export function resetDefaultCache(): void {
  if (defaultCacheInstance && typeof (defaultCacheInstance as any).destroy === 'function') {
    (defaultCacheInstance as any).destroy();
  }
  defaultCacheInstance = null;
}

/**
 * Create a cache manager instance
 */
export function createCacheManager(cache?: CacheService): CacheManager {
  return new CacheManager(cache || getDefaultCache());
}




































