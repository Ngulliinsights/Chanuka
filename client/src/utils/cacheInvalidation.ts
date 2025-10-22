/**
 * Cache Invalidation Manager
 * Provides comprehensive cache management and update mechanisms for offline-first applications
 */

import { logger } from '@shared/core';
import { offlineDataManager } from './offlineDataManager';

export interface CacheInvalidationConfig {
  strategy: 'immediate' | 'lazy' | 'time-based';
  ttl: number; // Time to live in milliseconds
  maxEntries: number;
  invalidationTriggers: string[];
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  version: string;
  tags: string[];
  dependencies: string[];
}

export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  totalSize: number;
  hitRate: number;
  lastCleanup: number;
}

class CacheInvalidationManager {
  private cache = new Map<string, CacheEntry>();
  private config: CacheInvalidationConfig;
  private stats = {
    totalEntries: 0,
    validEntries: 0,
    expiredEntries: 0,
    totalSize: 0,
    hitRate: 0,
    lastCleanup: Date.now(),
  };
  private accessLog = new Map<string, number[]>(); // key -> access timestamps

  constructor(config: Partial<CacheInvalidationConfig> = {}) {
    this.config = {
      strategy: 'time-based',
      ttl: 5 * 60 * 1000, // 5 minutes
      maxEntries: 100,
      invalidationTriggers: ['user-action', 'data-update', 'version-change'],
      ...config,
    };

    this.startCleanupInterval();
  }

  // Core cache operations
  async set(key: string, data: any, options: {
    ttl?: number;
    tags?: string[];
    dependencies?: string[];
    version?: string;
  } = {}): Promise<void> {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.config.ttl,
      version: options.version || '1.0',
      tags: options.tags || [],
      dependencies: options.dependencies || [],
    };

    // Check size limits
    if (this.cache.size >= this.config.maxEntries) {
      await this.evictEntries();
    }

    this.cache.set(key, entry);
    this.updateStats();

    // Also store in offline data manager for persistence
    await offlineDataManager.setOfflineData(key, data, entry.ttl);

    logger.debug('Cache entry set', { component: 'CacheInvalidationManager', key, tags: entry.tags });
  }

  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      // Try to get from offline storage
      const offlineData = await offlineDataManager.getOfflineData<T>(key);
      if (offlineData) {
        // Restore to memory cache
        this.cache.set(key, {
          key,
          data: offlineData,
          timestamp: Date.now(),
          ttl: this.config.ttl,
          version: '1.0',
          tags: [],
          dependencies: [],
        });
        this.logAccess(key);
        return offlineData;
      }
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.updateStats();
      return null;
    }

    this.logAccess(key);
    return entry.data;
  }

  async invalidate(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      await offlineDataManager.setOfflineData(key, null, 0); // Remove from offline storage
      this.updateStats();
      logger.info('Cache entry invalidated', { component: 'CacheInvalidationManager', key });
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.invalidate(key);
    }

    logger.info('Cache entries invalidated by tag', { component: 'CacheInvalidationManager', tag, count: keysToDelete.length });
  }

  async invalidateByPattern(pattern: RegExp): Promise<void> {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.invalidate(key);
    }

    logger.info('Cache entries invalidated by pattern', { component: 'CacheInvalidationManager', pattern: pattern.toString(), count: keysToDelete.length });
  }

  async invalidateAll(): Promise<void> {
    const count = this.cache.size;
    this.cache.clear();
    await offlineDataManager.clearOfflineCache();
    this.updateStats();
    logger.info('All cache entries invalidated', { component: 'CacheInvalidationManager', count });
  }

  // Dependency-based invalidation
  async invalidateDependencies(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (!entry) return;

    const dependencies = [...entry.dependencies];
    for (const dep of dependencies) {
      await this.invalidate(dep);
      // Recursively invalidate dependencies of dependencies
      await this.invalidateDependencies(dep);
    }
  }

  // Version-based invalidation
  async invalidateByVersion(version: string): Promise<void> {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.version !== version) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.invalidate(key);
    }

    logger.info('Cache entries invalidated by version', { component: 'CacheInvalidationManager', version, count: keysToDelete.length });
  }

  // Time-based operations
  async refreshExpiredEntries(): Promise<void> {
    const now = Date.now();
    const keysToRefresh: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToRefresh.push(key);
      }
    }

    // Note: Actual refresh would require a fetch function
    // This is a placeholder for the concept
    logger.info('Expired entries identified for refresh', { component: 'CacheInvalidationManager', count: keysToRefresh.length });
  }

  // Cache warming
  async warmCache(keys: string[], fetchFn: (key: string) => Promise<any>): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const data = await fetchFn(key);
        await this.set(key, data);
      } catch (error) {
        logger.warn('Failed to warm cache entry', { component: 'CacheInvalidationManager', key, error });
      }
    });

    await Promise.allSettled(promises);
    logger.info('Cache warming completed', { component: 'CacheInvalidationManager', keysCount: keys.length });
  }

  // Statistics and monitoring
  getStats(): CacheStats {
    return { ...this.stats };
  }

  getHitRate(): number {
    const totalAccesses = Array.from(this.accessLog.values()).reduce((sum, accesses) => sum + accesses.length, 0);
    const hits = Array.from(this.accessLog.entries())
      .filter(([key]) => this.cache.has(key))
      .reduce((sum, [, accesses]) => sum + accesses.length, 0);

    return totalAccesses > 0 ? hits / totalAccesses : 0;
  }

  // Private methods
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private logAccess(key: string): void {
    if (!this.accessLog.has(key)) {
      this.accessLog.set(key, []);
    }
    this.accessLog.get(key)!.push(Date.now());

    // Keep only last 100 accesses per key
    const accesses = this.accessLog.get(key)!;
    if (accesses.length > 100) {
      accesses.splice(0, accesses.length - 100);
    }
  }

  private async evictEntries(): Promise<void> {
    // LRU eviction
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        entry,
        lastAccess: this.accessLog.get(key)?.slice(-1)[0] || 0,
      }))
      .sort((a, b) => a.lastAccess - b.lastAccess);

    const toEvict = Math.ceil(this.config.maxEntries * 0.1); // Evict 10%
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      await this.invalidate(entries[i].key);
    }
  }

  private updateStats(): void {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        expiredEntries++;
      } else {
        validEntries++;
      }
      totalSize += this.estimateSize(entry.data);
    }

    this.stats = {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      totalSize,
      hitRate: this.getHitRate(),
      lastCleanup: now,
    };
  }

  private estimateSize(obj: any): number {
    // Rough estimation of object size in bytes
    try {
      return JSON.stringify(obj).length * 2; // UTF-16
    } catch {
      return 1000; // Fallback
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(async () => {
      await this.cleanup();
    }, 5 * 60 * 1000);
  }

  private async cleanup(): Promise<void> {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    this.updateStats();

    if (expiredKeys.length > 0) {
      logger.info('Expired cache entries cleaned up', { component: 'CacheInvalidationManager', count: expiredKeys.length });
    }
  }
}

// Global instance
export const cacheInvalidation = new CacheInvalidationManager();