/**
 * Cache Invalidation Manager - Improved Version
 *
 * Provides comprehensive cache management with proper memory management,
 * type safety, and enhanced features for offline-first applications
 */

export interface CacheInvalidationConfig {
  strategy: 'immediate' | 'lazy' | 'time-based';
  ttl: number; // Time to live in milliseconds
  maxEntries: number;
  invalidationTriggers: string[];
  enableStats: boolean;
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  tags: string[];
  dependencies: string[];
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  lastCleanup: number;
  hits: number;
  misses: number;
  evictions: number;
}

export type CacheEventType = 'set' | 'get' | 'delete' | 'evict' | 'expire' | 'clear';

export interface CacheEvent {
  type: CacheEventType;
  key: string;
  timestamp: number;
}

class CacheInvalidationManager<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheInvalidationConfig;
  private stats: CacheStats = {
    totalEntries: 0,
    validEntries: 0,
    expiredEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    lastCleanup: Date.now(),
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private cleanupIntervalId: number | null = null;
  private eventListeners = new Map<CacheEventType, Array<(event: CacheEvent) => void>>();

  constructor(config: Partial<CacheInvalidationConfig> = {}) {
    this.config = {
      strategy: 'time-based',
      ttl: 300000, // 5 minutes default
      maxEntries: 1000,
      invalidationTriggers: ['user_action', 'data_update', 'route_change'],
      enableStats: true,
      cleanupInterval: 60000, // 1 minute
      ...config,
    };

    if (this.config.cleanupInterval > 0) {
      this.startCleanupInterval();
    }
  }

  /**
   * Set cache entry with invalidation metadata
   */
  set(
    key: string,
    data: T,
    options: Partial<{
      ttl: number;
      tags: string[];
      dependencies: string[];
      version: string;
    }> = {}
  ): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: now,
      ttl: options.ttl ?? this.config.ttl,
      version: options.version ?? '1.0.0',
      tags: options.tags ?? [],
      dependencies: options.dependencies ?? [],
      accessCount: 0,
      lastAccessed: now,
    };

    const isUpdate = this.cache.has(key);
    this.cache.set(key, entry);

    if (!isUpdate) {
      this.stats.totalEntries++;
    }

    this.updateValidEntries();
    this.emitEvent('set', key);
  }

  /**
   * Get cache entry if valid
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      this.emitEvent('get', key);
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.expiredEntries++;
      this.stats.misses++;
      this.updateHitRate();
      this.emitEvent('expire', key);
      return null;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    this.updateHitRate();
    this.emitEvent('get', key);

    return entry.data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Get cache entry metadata without affecting stats
   */
  peek(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      return null;
    }
    return { ...entry };
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.stats.totalEntries = Math.max(0, this.stats.totalEntries - 1);
      this.updateValidEntries();
      this.emitEvent('delete', key);
    }

    return deleted;
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.delete(key);
      invalidatedCount++;
    });

    return invalidatedCount;
  }

  /**
   * Invalidate cache entries by dependencies
   */
  invalidateByDependencies(dependencies: string[]): number {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.dependencies.some(dep => dependencies.includes(dep))) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.delete(key);
      invalidatedCount++;
    });

    return invalidatedCount;
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidateByPattern(pattern: RegExp): number {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.delete(key);
      invalidatedCount++;
    });

    return invalidatedCount;
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all valid keys (non-expired)
   */
  validKeys(): string[] {
    const keys: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      lastCleanup: Date.now(),
      hits: 0,
      misses: 0,
      evictions: 0,
    };
    this.emitEvent('clear', 'all');
  }

  async invalidateAll(): Promise<void> {
    this.clear();
    return Promise.resolve();
  }

  /**
   * Get cache statistics
   */
  getStats(): Readonly<CacheStats> {
    this.updateValidEntries();
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    this.stats.hitRate = 0;
    this.stats.missRate = 0;
  }

  /**
   * Add event listener
   */
  on(eventType: CacheEventType, callback: (event: CacheEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(eventType: CacheEventType, callback: (event: CacheEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Destroy the cache manager and cleanup resources
   */
  destroy(): void {
    this.stopCleanupInterval();
    this.clear();
    this.eventListeners.clear();
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    if (total > 0) {
      this.stats.hitRate = this.stats.hits / total;
      this.stats.missRate = this.stats.misses / total;
    } else {
      this.stats.hitRate = 0;
      this.stats.missRate = 0;
    }
  }

  private updateValidEntries(): void {
    let validCount = 0;
    for (const entry of this.cache.values()) {
      if (!this.isExpired(entry)) {
        validCount++;
      }
    }
    this.stats.validEntries = validCount;
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
      this.emitEvent('evict', lruKey);
    }
  }

  private startCleanupInterval(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval) as unknown as number;
  }

  private stopCleanupInterval(): void {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  private cleanup(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.delete(key);
      this.stats.expiredEntries++;
    });

    this.stats.lastCleanup = Date.now();
  }

  private emitEvent(type: CacheEventType, key: string): void {
    const listeners = this.eventListeners.get(type);
    if (listeners && listeners.length > 0) {
      const event: CacheEvent = {
        type,
        key,
        timestamp: Date.now(),
      };
      listeners.forEach(callback => callback(event));
    }
  }
}

// Export singleton instance with proper typing
export const cacheInvalidationManager = new CacheInvalidationManager();

// Convenience functions with better type safety
export function invalidateCache(tags: string[]): number {
  return cacheInvalidationManager.invalidateByTags(tags);
}

export function setCacheEntry<T = unknown>(
  key: string,
  data: T,
  options?: Partial<{
    ttl: number;
    tags: string[];
    dependencies: string[];
    version: string;
  }>
): void {
  cacheInvalidationManager.set(key, data, options);
}

export function getCacheEntry<T = unknown>(key: string): T | null {
  return cacheInvalidationManager.get(key) as T | null;
}

export function hasCacheEntry(key: string): boolean {
  return cacheInvalidationManager.has(key);
}

export function clearCache(): void {
  cacheInvalidationManager.clear();
}

export function getCacheStats(): Readonly<CacheStats> {
  return cacheInvalidationManager.getStats();
}
