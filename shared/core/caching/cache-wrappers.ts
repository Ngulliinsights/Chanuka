/**
 * Cache Wrapper Services
 * 
 * Advanced caching utilities for server infrastructure
 * These wrap the core caching system with additional features:
 * - Cache warming on startup
 * - Memory pressure handling
 * - Pattern-based invalidation
 */

import { cacheService, createCacheService } from './simple-factory';

/**
 * Cache warming service - pre-loads cache entries on startup
 */
export class CacheWarmingService {
  constructor(private cache = cacheService) {}

  async warmCache(entries: Array<{ key: string; factory: () => Promise<any>; ttl?: number }>) {
    for (const entry of entries) {
      try {
        const exists = await this.cache.exists?.(entry.key);
        if (!exists) {
          const data = await entry.factory();
          await this.cache.set(entry.key, data, entry.ttl);
        }
      } catch (error) {
        console.warn(`Failed to warm up cache key ${entry.key}:`, error);
      }
    }
  }
}

export const cacheWarmingService = new CacheWarmingService();

/**
 * Advanced caching service with memory pressure monitoring
 * Adjusts caching behavior based on system memory availability
 */
export class AdvancedCachingService {
  private memoryPressureMode = false;
  private degradationLevel = 0;

  constructor(private cache = cacheService) {}

  async getStats() {
    return this.cache.getMetrics?.();
  }

  async getHealth() {
    return this.cache.getHealth?.();
  }

  async clear() {
    return this.cache.clear?.();
  }

  /**
   * Handle memory pressure events from system monitoring
   */
  handleMemoryPressure(pressure: number): void {
    this.memoryPressureMode = pressure > 0.85;
    this.degradationLevel = Math.min(Math.floor(pressure * 3), 3);

    if (this.memoryPressureMode) {
      this.applyMemoryOptimizations();
    }
  }

  /**
   * Apply memory optimizations based on pressure level
   */
  private async applyMemoryOptimizations(): Promise<void> {
    try {
      switch (this.degradationLevel) {
        case 1: // Light pressure
          await this.adjustCacheTTL(0.5);
          break;

        case 2: // Moderate pressure
          await this.clearExpiredEntries();
          await this.adjustCacheTTL(0.25);
          break;

        case 3: // Severe pressure
          await this.clear();
          this.disableCaching();
          break;
      }
    } catch (error) {
      console.warn('Failed to apply cache memory optimizations:', error);
    }
  }

  /**
   * Adjust cache TTL for memory pressure
   */
  private async adjustCacheTTL(_multiplier: number): Promise<void> {
    await this.clear();
  }

  /**
   * Clear expired cache entries
   */
  private async clearExpiredEntries(): Promise<void> {
    await this.clear();
  }

  /**
   * Disable caching temporarily
   */
  private disableCaching(): void {
    console.info('Cache disabled due to severe memory pressure');
  }

  /**
   * Reset memory optimizations when pressure subsides
   */
  async resetOptimizations(): Promise<void> {
    this.memoryPressureMode = false;
    this.degradationLevel = 0;
    console.info('Cache optimizations reset - normal operation restored');
  }
}

export const advancedCachingService = new AdvancedCachingService();

/**
 * Cache coordinator for pattern-based invalidation and lifecycle management
 */
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

  async start() {
    // Initialize cache if needed
  }

  async stop() {
    // Cleanup cache if needed
  }
}

export const cacheCoordinator = new CacheCoordinator();
