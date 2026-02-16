/**
 * Simple Cache Factory
 * A minimal, working cache factory for basic use cases
 * 
 * @deprecated This file has been merged into './factory.ts'
 * Use `createSimpleCacheService` from './factory' instead.
 * This file will be removed in v2.0.0
 * 
 * Migration example:
 * ```typescript
 * // Old:
 * import { cacheFactory } from './simple-factory';
 * const cache = cacheFactory.createCache('myCache', { provider: 'memory' });
 * 
 * // New:
 * import { createSimpleCacheService } from './factory';
 * const cache = createSimpleCacheService({ defaultTtlSec: 3600 });
 * ```
 */

// Emit deprecation warning when this module is imported
if (typeof console !== 'undefined' && console.warn) {
  console.warn(
    '[DEPRECATION WARNING] simple-factory.ts is deprecated and will be removed in v2.0.0. ' +
    'Please use createSimpleCacheService from ./factory instead. ' +
    'See migration guide: https://docs.example.com/cache-migration'
  );
}

import { MemoryAdapter } from './adapters/memory-adapter';
import type { CacheAdapter } from './core/interfaces';

/**
 * @deprecated Use createSimpleCacheService from './factory' instead
 */
export interface SimpleCacheConfig {
  provider: 'memory';
  defaultTtlSec?: number;
  maxMemoryMB?: number;
  keyPrefix?: string;
}

/**
 * @deprecated Use createSimpleCacheService from './factory' instead
 */
export class SimpleCacheFactory {
  private static instance: SimpleCacheFactory;
  private caches = new Map<string, CacheAdapter>();

  private constructor() {}

  static getInstance(): SimpleCacheFactory {
    if (!SimpleCacheFactory.instance) {
      SimpleCacheFactory.instance = new SimpleCacheFactory();
    }
    return SimpleCacheFactory.instance;
  }

  /**
   * Create a cache instance
   * @deprecated Use createSimpleCacheService from './factory' instead
   */
  createCache(name: string, config: SimpleCacheConfig): CacheAdapter {
    if (this.caches.has(name)) {
      return this.caches.get(name)!;
    }

    let adapter: CacheAdapter;

    switch (config.provider) {
      case 'memory':
        const memoryConfig: any = {};
        if (config.maxMemoryMB !== undefined) {
          memoryConfig.maxSize = config.maxMemoryMB * 1024 * 1024;
        }
        if (config.defaultTtlSec !== undefined) {
          memoryConfig.defaultTtlSec = config.defaultTtlSec;
        }
        if (config.keyPrefix !== undefined) {
          memoryConfig.keyPrefix = config.keyPrefix;
        }
        adapter = new MemoryAdapter(memoryConfig);
        break;
      default:
        throw new Error(`Unsupported cache provider: ${config.provider}`);
    }

    this.caches.set(name, adapter);
    return adapter;
  }

  /**
   * Get an existing cache instance
   * @deprecated Use createSimpleCacheService from './factory' instead
   */
  getCache(name: string): CacheAdapter | undefined {
    return this.caches.get(name);
  }

  /**
   * Remove a cache instance
   * @deprecated Use createSimpleCacheService from './factory' instead
   */
  removeCache(name: string): boolean {
    return this.caches.delete(name);
  }

  /**
   * Get all cache names
   * @deprecated Use createSimpleCacheService from './factory' instead
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * Clear all caches
   * @deprecated Use createSimpleCacheService from './factory' instead
   */
  async clearAll(): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache => cache.clear?.() ?? Promise.resolve());
    await Promise.all(promises);
  }

  /**
   * Shutdown all caches
   * @deprecated Use createSimpleCacheService from './factory' instead
   */
  async shutdown(): Promise<void> {
    const caches = Array.from(this.caches.values());
    for (const cache of caches) {
      if ('shutdown' in cache && typeof cache.shutdown === 'function') {
        await cache.shutdown();
      }
    }
    this.caches.clear();
  }
}

// Export a default instance
/**
 * @deprecated Use createSimpleCacheService from './factory' instead
 */
export const cacheFactory = SimpleCacheFactory.getInstance();


