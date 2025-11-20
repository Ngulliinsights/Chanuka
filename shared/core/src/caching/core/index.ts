/**
 * Core Cache System Exports
 * 
 * Unified exports for the refined cache system interfaces and base implementations.
 */

// Core interfaces
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
} from '../interfaces';

// Base implementation
export { BaseCacheAdapter } from '../base-cache-adapter';

// Re-export Result types for convenience
export type { Result } from '../../primitives/types/result';
export { ok, err, isOk, isErr } from '../../primitives/types/result';



