/**
 * Caching Module
 *
 * Unified caching abstraction with adapter pattern implementation
 */

// Core interfaces and utilities
export * from './core';

// Cache adapters
export * from './adapters';

// Cache patterns
export * from './patterns';

// Factory function for creating cache services
export { createCacheService } from './factory';

// Default cache management
export {
  getDefaultCache,
  initializeDefaultCache,
  resetDefaultCache,
  createCacheManager,
  type CacheManager
} from './factory';

// Decorators for method-level caching
export { Cache, InvalidateCache } from './decorators';