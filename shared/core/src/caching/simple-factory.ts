/**
 * Simple Cache Factory
 * A minimal, working cache factory for basic use cases
 */

import { MemoryAdapter } from './adapters/memory-adapter';
import type { CacheAdapter } from '/core/interfaces';

export interface SimpleCacheConfig {
  provider: 'memory';
  defaultTtlSec?: number;
  maxMemoryMB?: number;
  keyPrefix?: string;
}

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
   */
  getCache(name: string): CacheAdapter | undefined {
    return this.caches.get(name);
  }

  /**
   * Remove a cache instance
   */
  removeCache(name: string): boolean {
    return this.caches.delete(name);
  }

  /**
   * Get all cache names
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache => cache.clear?.() ?? Promise.resolve());
    await Promise.all(promises);
  }

  /**
   * Shutdown all caches
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
export const cacheFactory = SimpleCacheFactory.getInstance();

