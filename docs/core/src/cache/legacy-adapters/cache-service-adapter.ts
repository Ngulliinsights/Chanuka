/**
 * Legacy Cache Service Adapter
 * 
 * Provides backward compatibility for the old CacheService interface
 * while using the new core cache system underneath
 */

import { CacheService as CoreCacheService, CacheConfig, CacheMetrics } from '../types';
import { createCacheService } from '../index';

export interface LegacyCacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size: number;
}

export interface LegacyCacheConfig {
  maxSize: number;
  defaultTTL: number;
  maxEntries: number;
  enableCompression: boolean;
  enablePersistence: boolean;
  storagePrefix: string;
}

export interface LegacyCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Legacy CacheService implementation that wraps the new core cache system
 */
export class LegacyCacheService {
  private static instance: LegacyCacheService;
  private coreCache: CoreCacheService;
  private config: LegacyCacheConfig;

  static getInstance(): LegacyCacheService {
    if (!LegacyCacheService.instance) {
      LegacyCacheService.instance = new LegacyCacheService();
    }
    return LegacyCacheService.instance;
  }

  constructor() {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxEntries: 1000,
      enableCompression: true,
      enablePersistence: true,
      storagePrefix: 'cache_'
    };

    // Create core cache service with legacy config
    this.coreCache = createCacheService({
      provider: 'memory',
      maxMemoryMB: this.config.maxSize / (1024 * 1024),
      defaultTtlSec: this.config.defaultTTL / 1000,
      enableMetrics: true,
      keyPrefix: this.config.storagePrefix,
      enableCompression: this.config.enableCompression,
      compressionThreshold: 1024,
    });
  }

  /**
   * Set cache entry
   */
  set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      tags?: string[];
      persist?: boolean;
    } = {}
  ): void {
    const ttlSec = options.ttl ? options.ttl / 1000 : undefined;
    this.coreCache.set(key, data, ttlSec);
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    return this.coreCache.get(key) || null;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.coreCache.exists ? this.coreCache.exists(key) : this.get(key) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    this.coreCache.del(key);
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    if (this.coreCache.clear) {
      this.coreCache.clear();
    } else if (this.coreCache.flush) {
      this.coreCache.flush();
    }
  }

  /**
   * Invalidate entries by tags
   */
  invalidateByTags(tags: string[]): number {
    if (this.coreCache.invalidateByTags) {
      this.coreCache.invalidateByTags(tags);
      return 1; // Return approximate count
    }
    return 0;
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      persist?: boolean;
    } = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, options);
    return data;
  }

  /**
   * Get cache statistics
   */
  getStats(): LegacyCacheStats {
    const metrics = this.coreCache.getMetrics?.();
    
    if (metrics) {
      return {
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: metrics.hitRate,
        totalEntries: metrics.size || 0,
        totalSize: metrics.memoryUsage || 0,
        oldestEntry: 0,
        newestEntry: Date.now()
      };
    }

    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      totalSize: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
  }

  /**
   * Get cache configuration
   */
  getConfig(): LegacyCacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<LegacyCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    // This would require extending the core cache interface
    return [];
  }

  /**
   * Get entries by tag
   */
  getByTag(tag: string): Array<{ key: string; data: any }> {
    // This would require extending the core cache interface
    return [];
  }

  /**
   * Preload data into cache
   */
  async preload<T>(
    entries: Array<{
      key: string;
      factory: () => Promise<T>;
      options?: { ttl?: number; tags?: string[]; persist?: boolean };
    }>
  ): Promise<void> {
    const promises = entries.map(async ({ key, factory, options }) => {
      if (!this.has(key)) {
        try {
          const data = await factory();
          this.set(key, data, options);
        } catch (error) {
          console.warn(`Failed to preload cache entry ${key}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Export cache data
   */
  export(): Record<string, any> {
    // This would require extending the core cache interface
    return {};
  }

  /**
   * Import cache data
   */
  import(data: Record<string, any>): void {
    for (const [key, entryData] of Object.entries(data)) {
      if (entryData && typeof entryData === 'object') {
        this.set(key, entryData.data, {
          ttl: entryData.ttl,
          tags: entryData.tags
        });
      }
    }
  }
}

// Export singleton instance for backward compatibility
export const cacheService = LegacyCacheService.getInstance();
export default cacheService;