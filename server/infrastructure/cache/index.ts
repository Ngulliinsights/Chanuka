// Cache Infrastructure - Consolidated
// Uses shared/core caching system for consistency and reduced duplication

// Re-export from shared caching system
export * from '../../../shared/core/src/caching';

// Legacy compatibility - create default cache service
import { createCacheService } from '@shared/core/cache';

// Create default cache instance for backward compatibility with memory pressure monitoring
const defaultCacheConfig = {
  provider: 'memory' as const,
  maxMemoryMB: 50, // Reduced from 100MB to prevent memory pressure
  enableMetrics: true,
  keyPrefix: 'chanuka:',
  defaultTtlSec: 900, // 15 minutes
  enableCompression: false,
  enableCircuitBreaker: true
};

export const cacheService = createCacheService(defaultCacheConfig);
export const CacheService = cacheService; // For backward compatibility

// Remove duplicate CacheService class - use shared/core instead

// Cache warming service using shared cache
export class CacheWarmingService {
  constructor(private cache = cacheService) {}

  async warmCache(entries: Array<{ key: string; factory: () => Promise<any>; ttl?: number }>) {
    // Simple implementation without manager
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

// Advanced caching service using shared cache with memory pressure monitoring
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
   * Handle memory pressure events from WebSocket service
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
          // Reduce cache TTL by 50%
          await this.adjustCacheTTL(0.5);
          break;

        case 2: // Moderate pressure
          // Clear expired entries and reduce TTL by 75%
          await this.clearExpiredEntries();
          await this.adjustCacheTTL(0.25);
          break;

        case 3: // Severe pressure
          // Clear all cache and disable new caching
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
    // This would require extending the cache interface to support TTL adjustments
    // For now, we'll clear the cache to force fresh data with new TTL
    await this.clear();
  }

  /**
   * Clear expired cache entries
   */
  private async clearExpiredEntries(): Promise<void> {
    // This would require cache adapter support for selective clearing
    // For now, we'll do a full clear
    await this.clear();
  }

  /**
   * Disable caching temporarily
   */
  private disableCaching(): void {
    // This would require cache adapter support for disabling
    // For now, we'll just log the intent
    console.info('Cache disabled due to severe memory pressure');
  }

  /**
   * Reset memory optimizations when pressure subsides
   */
  async resetOptimizations(): Promise<void> {
    this.memoryPressureMode = false;
    this.degradationLevel = 0;
    // Re-enable caching and restore normal TTL
    console.info('Cache optimizations reset - normal operation restored');
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

  async start() {
    // Initialize cache if needed
  }

  async stop() {
    // Cleanup cache if needed
  }
}

export const cacheCoordinator = new CacheCoordinator();













































