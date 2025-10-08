/**
 * Cache Strategy Manager
 * Provides centralized cache management for different data types with performance monitoring
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

interface CacheStats {
  hitRate: number;
  entryCount: number;
  totalSize: number;
}

interface CacheInstance<T = any> {
  get(key: string): T | null;
  set(key: string, data: T, ttl?: number, tags?: string[]): void;
  delete(key: string): boolean;
  clear(): void;
  getStats(): CacheStats;
  invalidateByTag(tag: string): number;
}

class SimpleCache<T = any> implements CacheInstance<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  set(key: string, data: T, ttl: number = 5 * 60 * 1000, tags: string[] = []): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      tags
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    // Estimate size
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // key size
      try {
        totalSize += JSON.stringify(entry.data).length * 2; // data size
      } catch {
        totalSize += 1024; // fallback
      }
    }

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      entryCount: this.cache.size,
      totalSize
    };
  }

  invalidateByTag(tag: string): number {
    let invalidated = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }

  // Cleanup expired entries
  cleanup(): number {
    let removed = 0;
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }
}

class CacheManager {
  private caches = new Map<string, CacheInstance>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  getCache<T = any>(type: string): CacheInstance<T> {
    if (!this.caches.has(type)) {
      this.caches.set(type, new SimpleCache<T>());
    }
    return this.caches.get(type)! as CacheInstance<T>;
  }

  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [type, cache] of this.caches.entries()) {
      stats[type] = cache.getStats();
    }
    return stats;
  }

  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  invalidateAllByTag(tag: string): number {
    let totalInvalidated = 0;
    for (const cache of this.caches.values()) {
      totalInvalidated += cache.invalidateByTag(tag);
    }
    return totalInvalidated;
  }

  cleanup(): number {
    let totalRemoved = 0;
    for (const cache of this.caches.values()) {
      if (typeof (cache as any).cleanup === 'function') {
        totalRemoved += (cache as any).cleanup();
      }
    }
    return totalRemoved;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAll();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();