// Cache Infrastructure - Consolidated
// Uses shared/core caching system for consistency and reduced duplication

// Re-export from shared caching system
export {
  createCacheService,
  getDefaultCache,
  initializeDefaultCache,
  resetDefaultCache,
  CacheManager,
  createCacheManager,
  SingleFlightCache,
  CacheKeyGenerator,
  Cache,
  InvalidateCache
} from '../../../shared/core/src/caching';

// Re-export types for backward compatibility
export type {
  CacheAdapter,
  CacheConfig,
  CacheMetrics,
  CacheService,
  CacheOptions,
  CacheEntry,
  CacheHealthStatus
} from '../../../shared/core/src/caching';

// Legacy compatibility - create default cache service
import { createCacheService } from '../../../shared/core/src/caching';

// Create default cache instance for backward compatibility
const defaultCacheConfig = {
  provider: 'memory' as const,
  maxMemoryMB: 100,
  enableMetrics: true,
  keyPrefix: 'chanuka:',
  defaultTtlSec: 900, // 15 minutes
  enableCompression: false,
  enableCircuitBreaker: true
};

export const cacheService = createCacheService(defaultCacheConfig);
export const CacheService = cacheService; // For backward compatibility

// Cache warming service using shared cache
export class CacheWarmingService {
  constructor(private cache = cacheService) {}

  async warmCache(entries: Array<{ key: string; factory: () => Promise<any>; ttl?: number }>) {
    const manager = createCacheManager(this.cache);
    await manager.warmUp(entries);
  }
}

export const cacheWarmingService = new CacheWarmingService();

// Advanced caching service using shared cache
export class AdvancedCachingService {
  constructor(private cache = cacheService) {}

  async getStats() {
    const manager = createCacheManager(this.cache);
    return manager.getStats();
  }

  async getHealth() {
    const manager = createCacheManager(this.cache);
    return manager.getHealth();
  }

  async clear() {
    const manager = createCacheManager(this.cache);
    await manager.clear();
  }
}

export const advancedCachingService = new AdvancedCachingService();

// Cache coordinator using shared cache
export class CacheCoordinator {
  constructor(private cache = cacheService) {}

  async invalidatePattern(pattern: string) {
    if (this.cache.invalidateByPattern) {
      await this.cache.invalidateByPattern(pattern);
    }
  }

  async invalidateTags(tags: string[]) {
    if (this.cache.invalidateByTags) {
      await this.cache.invalidateByTags(tags);
    }
  }
}

export const cacheCoordinator = new CacheCoordinator();











































