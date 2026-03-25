/**
 * Caching System - Main Export
 * 
 * A comprehensive caching system with multiple adapters and advanced features
 */

// Unified caching service interface and implementation
export type { ICachingService, CachingServiceFactory } from './caching-service';
export { CachingService, CachingServiceRegistry } from './caching-service';
export { createCachingService } from './caching-service';

// Core interfaces and types
export type {
  CacheAdapter,
  CacheMetrics,
  CacheHealthStatus,
  CacheOptions,
  CacheEvent,
  CacheEventType
} from './core/interfaces';

export type {
  CacheEntry,
  CacheConfig,
  EvictionPolicy,
  PromotionStrategy,
  CacheService,
  CacheKeyGenerator
} from './types';

// Unified cache config types
export type {
  CacheConfig as UnifiedCacheConfig,
  CacheMetrics as UnifiedCacheMetrics,
  HealthStatus,
  CacheOperationOptions
} from './interfaces';

// Base adapter
export { BaseCacheAdapter } from './core/base-adapter';

// Adapters
export { MemoryAdapter } from './adapters/memory-adapter';

// Test utilities
export { testCachingSystem } from './test-comprehensive';
export { testBasicCaching } from './test-basic';

// Support classes (for advanced usage)
export { CacheMetricsCollector } from './monitoring/metrics-collector';
export { CacheWarmer } from './warming/cache-warmer';
export { CacheCompressor } from './compression/cache-compressor';
export { CacheSerializer } from './serialization/cache-serializer';
export { CacheTagManager } from './tagging/tag-manager';
export { CacheClusterManager } from './clustering/cluster-manager';

// Wrapper services for infrastructure
export {
  CacheWarmingService,
  cacheWarmingService,
  AdvancedCachingService,
  advancedCachingService,
  CacheCoordinator,
  cacheCoordinator
} from './cache-wrappers';

// Convenience export for default cache service
export { createCacheService, createSimpleCacheService, getDefaultCache, initializeDefaultCache, SimpleCacheFactory, cacheFactory } from './factory';

// Create a default cache service instance for convenience (also exported as 'cache')
import { createSimpleCacheService } from './factory';
export const cacheService = createSimpleCacheService();
export const cache = createSimpleCacheService();

// Server-specific cache wrapper with convenience methods
export { ServerCacheWrapper, serverCache } from './server-cache-wrapper';

// Cache key generation and invalidation - use key-generator.ts for CacheKeys class
export { cacheKeys, createCacheInvalidation } from './cache-keys';
export { cacheKeys as keyGenerator } from './key-generator';
export { CacheKeys } from './key-generator';

// Cache TTL constants for common use cases
export const CACHE_TTL = {
  SHORT: 60,              // 1 minute
  MEDIUM: 300,            // 5 minutes
  LONG: 900,              // 15 minutes
  HOUR: 3600,             // 1 hour
  DAY: 86400,             // 24 hours
  RECOMMENDATIONS: 1800,  // 30 minutes
  QUERIES: 300,           // 5 minutes
  ANALYTICS: 900          // 15 minutes
} as const;


