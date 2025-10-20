/**
 * Unified Caching System
 * 
 * Consolidated cache service with multi-tier support, circuit breaker patterns,
 * and single-flight request deduplication. Replaces all legacy cache implementations.
 */

// Core cache interfaces and types from interfaces.ts
export type {
  CacheAdapter,
  HealthStatus,
  CacheMetrics,
  BaseCacheConfig,
  MemoryCacheConfig,
  RedisCacheConfig,
  MultiTierCacheConfig,
  CacheConfig,
  CacheOperationOptions,
  CacheEventType,
  CacheEvent,
  CacheValidationResult,
  CacheStatistics
} from './interfaces';

// Legacy types from types.ts for backward compatibility
export type {
  CacheService,
  CacheMetrics as LegacyCacheMetrics,
  CacheTierStats,
  CacheEntry,
  CacheOptions,
  CacheHealthStatus,
  CircuitBreakerState,
  SingleFlightOptions,
  MultiTierOptions,
  PromotionStrategy,
  EvictionPolicy,
  CompressionOptions,
  SerializationOptions,
} from './types';
  CacheWarmingStrategy,
  EvictionOptions,
  CacheStatsAggregation,
} from './core/interfaces.js';

// Base adapter
export { BaseCacheAdapter } from './core/base-adapter.js';

// Cache adapters
export { MemoryAdapter, type MemoryAdapterConfig } from './adapters/memory-adapter.js';

// Export CacheService as an alias for MemoryAdapter for backward compatibility
export { MemoryAdapter as CacheService } from './adapters/memory-adapter';

// Enhanced cache wrappers with circuit breaker and single-flight patterns
export { SingleFlightCache } from './single-flight-cache';

// Cache utilities
export { CacheKeyGenerator } from './key-generator';

// Cache factory function
export function createCacheService(config: CacheConfig): CacheService {
  let baseAdapter: CacheAdapter;

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

// Legacy adapters for backward compatibility
export { 
  LegacyCacheServiceAdapter, 
  createLegacyCacheAdapter, 
  isLegacyCacheService, 
  migrateLegacyCacheService 
} from './legacy-adapters/cache-service-adapter.js';

// Cache decorators for method-level caching
export function Cache(options: {
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
  skipCondition?: (...args: any[]) => boolean;
  tags?: string[];
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = getDefaultCache();
      
      // Skip caching if condition is met
      if (options.skipCondition && options.skipCondition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const key = options.keyGenerator 
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      try {
        // Try to get from cache first
        const cached = await cache.get(key);
        if (cached !== null) {
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);
        
        // Store result in cache
        await cache.set(key, result, options.ttl);
        
        // Add tags if specified
        if (options.tags && cache.invalidateByTags) {
          // Note: This would require extending the cache interface to support tagging during set
          // For now, we'll just store the result
        }
        
        return result;
      } catch (error) {
        // If caching fails, still execute the original method
        return originalMethod.apply(this, args);
      }
    };
  };
}

// Cache invalidation decorator
export function InvalidateCache(options: {
  keys?: string[];
  patterns?: string[];
  tags?: string[];
  keyGenerator?: (...args: any[]) => string[];
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      try {
        const cache = getDefaultCache();
        
        // Invalidate specific keys
        if (options.keys) {
          await Promise.all(options.keys.map(key => cache.del(key)));
        }
        
        // Invalidate by patterns
        if (options.patterns && cache.invalidateByPattern) {
          await Promise.all(options.patterns.map(pattern => cache.invalidateByPattern!(pattern)));
        }
        
        // Invalidate by tags
        if (options.tags && cache.invalidateByTags) {
          await cache.invalidateByTags(options.tags);
        }
        
        // Invalidate generated keys
        if (options.keyGenerator) {
          const keys = options.keyGenerator(...args);
          await Promise.all(keys.map(key => cache.del(key)));
        }
      } catch (error) {
        // Log error but don't fail the operation
        console.warn('Cache invalidation failed:', error);
      }
      
      return result;
    };
  };
}

// Utility functions for cache warming and management
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
  getStats(): CacheMetrics | undefined {
    return this.cache.getMetrics?.();
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<CacheHealthStatus | undefined> {
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
 * Create a cache manager instance
 */
export function createCacheManager(cache?: CacheService): CacheManager {
  return new CacheManager(cache || getDefaultCache());
}











































