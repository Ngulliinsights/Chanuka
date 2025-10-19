/**
 * Caching Core Module
 *
 * Core interfaces and utilities for the caching abstraction
 */

// Core interfaces
export type {
  CacheService,
  CacheAdapter,
  CacheMetrics,
  CacheTierStats,
  CacheEntry,
  CacheConfig,
  CacheOptions,
  CacheHealthStatus,
  CacheEvent,
  CacheEventType,
  CircuitBreakerState,
  SingleFlightOptions,
  MultiTierOptions,
  PromotionStrategy,
  EvictionPolicy,
  CompressionOptions,
  SerializationOptions,
  CacheWarmingStrategy,
  EvictionOptions,
  CacheStatsAggregation,
  CacheResult,
  CacheError,
  CacheFactoryOptions,
} from './interfaces';

// Base adapter
export { BaseCacheAdapter } from './base-adapter';

// Key generator
export { CacheKeyGenerator, cacheKeyGenerator } from './key-generator';




































