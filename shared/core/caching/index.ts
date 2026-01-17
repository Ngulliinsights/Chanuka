/**
 * Caching System - Main Export
 * 
 * A comprehensive caching system with multiple adapters and advanced features
 */

// Unified caching service interface and implementation
export type { ICachingService } from './icaching-service';
export { CachingService } from './caching-service';
export { CachingServiceRegistry } from './icaching-service';
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
  PromotionStrategy
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

// Simple factory (working)
export { SimpleCacheFactory, cacheFactory } from './simple-factory';
export type { SimpleCacheConfig } from './simple-factory';

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
export { cacheService, createCacheService } from './simple-factory';

// Note: Advanced features like MultiTierAdapter, BrowserAdapter, and UnifiedCacheFactory
// are available but may require additional configuration and dependencies


