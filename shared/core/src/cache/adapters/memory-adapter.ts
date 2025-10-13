/**
 * Memory Cache Adapter
 * 
 * Enhanced in-memory cache implementation consolidating:
 * - src/shared/services/CacheService.ts
 * - server/infrastructure/cache/CacheService.ts
 * With patterns from refined_cross_cutting.ts
 */

import { BaseCacheAdapter } from '../base-adapter';
import type { 
import { logger } from '../utils/logger';
  CacheEntry, 
  CacheOptions, 
  CacheHealthStatus, 
  EvictionPolicy,
  CacheConfig 
} from '../types';

export interface MemoryAdapterConfig extends CacheConfig {
  maxMemoryMB: number;
  maxEntries?: number;
  evictionPolicy?: EvictionPolicy;
  enablePersistence?: boolean;
  storagePrefix?: string;
  cleanupIntervalMs?: number;
}

export class MemoryAdapter extends BaseCacheAdapter {
  private cache = new Map<string, CacheEntry>();
  private tagSets = new Map<string, Set<string>>(); // For tag-based invalidation
  private currentSizeBytes = 0;
  private maxSizeBytes: number;
  private maxEntries: number;
  private evictionPolicy: EvictionPolicy;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private enablePersistence: boolean;
  private storagePrefix: string;

  constructor(private config: MemoryAdapterConfig) {
    super({
      enableMetrics: config.enableMetrics,
      keyPrefix: config.keyPrefix,
    });

    this.maxSizeBytes = config.maxMemoryMB * 1024 * 1024;
    this.maxEntries = config.maxEntries || 10000;
    this.evictionPolicy = config.evictionPolicy || 'lru';
    this.enablePersistence = config.enablePersistence || false;
    this.storagePrefix = config.storagePrefix || 'cache_';

    this.startCleanupInterval(config.cleanupIntervalMs || 60000);
    
    if (this.enablePersistence) {
      this.loadFromPersistentStorage();
      this.setupStorageEventListener();
    }
  }

  /**
   * Get value from memory cache
   */
  async get<T>(key: string): Promise<T | null> {
    this.validateKey(key);
    
    return this.measureOperation(async () => {
      const formattedKey = this.formatKey(key);
      const entry = this.cache.get(formattedKey) as CacheEntry<T> | undefined;

      if (!entry) {
        this.recordMiss(key, 'L1');
        return null;
      }

      // Check if entry is expired
      if (this.isExpired(entry)) {
        await this.deleteEntry(formattedKey);
        this.recordMiss(key, 'L1');
        return null;
      }

      // Update access statistics for LRU
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.recordHit(key, 'L1');

      return entry.data;
    }, 'hit', key, 'L1');
  }

  /**
   * Set value in memory cache
   */
  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    this.validateKey(key);
    const validatedTtl = this.validateTtl(ttlSec || this.config.defaultTtlSec);

    return this.measureOperation(async () => {
      const formattedKey = this.formatKey(key);
      const size = this.calculateSize(value);
      const ttl = validatedTtl * 1000; // Convert to milliseconds
      
      // Check if adding this entry would exceed limits
      if (this.currentSizeBytes + size > this.maxSizeBytes) {
        await this.evictEntries(size);
      }

      if (this.cache.size >= this.maxEntries) {
        await this.evictEntries();
      }

      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        tags: [],
        size,
        tier: 'L1',
      };

      // Remove existing entry if it exists
      if (this.cache.has(formattedKey)) {
        const existingEntry = this.cache.get(formattedKey)!;
        this.currentSizeBytes -= existingEntry.size;
      }

      this.cache.set(formattedKey, entry);
      this.currentSizeBytes += size;
      this.updateMetricsCounters();

      // Persist to storage if enabled
      if (this.enablePersistence) {
        this.persistEntry(formattedKey, entry);
      }

      this.recordSet(key, size, 'L1');
    }, 'set', key, 'L1');
  }

  /**
   * Delete value from memory cache
   */
  async del(key: string): Promise<void> {
    this.validateKey(key);

    return this.measureOperation(async () => {
      const formattedKey = this.formatKey(key);
      await this.deleteEntry(formattedKey);
      this.recordDelete(key, 'L1');
    }, 'delete', key, 'L1');
  }

  /**
   * Check if key exists and is not expired
   */
  async exists(key: string): Promise<boolean> {
    this.validateKey(key);
    
    const formattedKey = this.formatKey(key);
    const entry = this.cache.get(formattedKey);
    
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      await this.deleteEntry(formattedKey);
      return false;
    }
    
    return true;
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    this.validateKey(key);
    
    const formattedKey = this.formatKey(key);
    const entry = this.cache.get(formattedKey);
    
    if (!entry) return -2; // Key doesn't exist
    if (entry.ttl === 0) return -1; // No expiration
    
    const remaining = Math.floor((entry.timestamp + entry.ttl - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2; // Expired
  }

  /**
   * Get multiple values from memory cache
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    
    keys.forEach(key => this.validateKey(key));

    return this.measureOperation(async () => {
      const results: (T | null)[] = [];
      
      for (const key of keys) {
        const result = await this.get<T>(key);
        results.push(result);
      }
      
      return results;
    }, 'hit', `mget:${keys.length}`, 'L1');
  }

  /**
   * Set multiple values in memory cache
   */
  async mset<T>(entries: [string, T, number?][]): Promise<void> {
    if (entries.length === 0) return;
    
    entries.forEach(([key]) => this.validateKey(key));

    return this.measureOperation(async () => {
      for (const [key, value, ttl] of entries) {
        await this.set(key, value, ttl);
      }
    }, 'set', `mset:${entries.length}`, 'L1');
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.tagSets.clear();
    this.currentSizeBytes = 0;
    this.updateMetricsCounters();

    // Clear persistent storage
    if (this.enablePersistence) {
      this.clearPersistentStorage();
    }
  }

  /**
   * Flush all cache entries (alias for clear)
   */
  async flush(): Promise<void> {
    return this.clear();
  }

  /**
   * Invalidate entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;
    const keysToDelete: string[] = [];

    for (const tag of tags) {
      const tagSet = this.tagSets.get(tag);
      if (tagSet) {
        keysToDelete.push(...tagSet);
        this.tagSets.delete(tag);
      }
    }

    // Remove duplicates
    const uniqueKeys = [...new Set(keysToDelete)];
    
    for (const key of uniqueKeys) {
      if (this.cache.has(key)) {
        await this.deleteEntry(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let deletedCount = 0;
    
    // Convert glob pattern to regex
    const escapedPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${escapedPattern}$`);

    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.deleteEntry(key);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Add key to tag sets for invalidation
   */
  async addToTags(key: string, tags: string[]): Promise<void> {
    const formattedKey = this.formatKey(key);
    const entry = this.cache.get(formattedKey);
    
    if (entry) {
      entry.tags = [...new Set([...entry.tags, ...tags])];
      
      // Update tag sets
      for (const tag of tags) {
        if (!this.tagSets.has(tag)) {
          this.tagSets.set(tag, new Set());
        }
        this.tagSets.get(tag)!.add(formattedKey);
      }
    }
  }

  /**
   * Get entries by tag
   */
  async getByTag<T>(tag: string): Promise<Array<{ key: string; data: T }>> {
    const results: Array<{ key: string; data: T }> = [];
    const tagSet = this.tagSets.get(tag);
    
    if (tagSet) {
      for (const key of tagSet) {
        const entry = this.cache.get(key);
        if (entry && !this.isExpired(entry)) {
          results.push({ 
            key: key.replace(this.keyPrefix + ':', ''), 
            data: entry.data as T 
          });
        }
      }
    }
    
    return results;
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
      const exists = await this.exists(key);
      if (!exists) {
        try {
          const data = await factory();
          await this.set(key, data, options?.ttl);
          
          if (options?.tags && options.tags.length > 0) {
            await this.addToTags(key, options.tags);
          }
        } catch (error) {
          // Log error but don't fail the entire preload
          this.emitCacheEvent('error', key, { 
            error: error instanceof Error ? error : new Error(String(error)) 
          });
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Export cache data
   */
  export(): Record<string, any> {
    const exported: Record<string, any> = {};
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        exported[key] = {
          data: entry.data,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          tags: entry.tags,
        };
      }
    }
    
    return exported;
  }

  /**
   * Import cache data
   */
  async import(data: Record<string, any>): Promise<void> {
    for (const [key, entryData] of Object.entries(data)) {
      if (entryData && typeof entryData === 'object') {
        const ttlSec = entryData.ttl ? Math.floor(entryData.ttl / 1000) : undefined;
        await this.set(key.replace(this.keyPrefix + ':', ''), entryData.data, ttlSec);
        
        if (entryData.tags && entryData.tags.length > 0) {
          await this.addToTags(key, entryData.tags);
        }
      }
    }
  }

  /**
   * Get memory cache health status
   */
  async getHealth(): Promise<CacheHealthStatus> {
    const start = performance.now();
    const errors: string[] = [];

    try {
      // Test basic operations
      const testKey = `health_check_${Date.now()}`;
      await this.set(testKey, 'test', 1);
      const result = await this.get(testKey);
      await this.del(testKey);
      
      if (result !== 'test') {
        errors.push('Basic memory cache operations failed');
      }

      const latency = performance.now() - start;
      const memoryUsage = {
        totalSize: this.currentSizeBytes,
        maxSize: this.maxSizeBytes,
        utilization: (this.currentSizeBytes / this.maxSizeBytes) * 100,
        entryCount: this.cache.size,
        maxEntries: this.maxEntries,
      };

      return {
        connected: true,
        latency,
        memory: memoryUsage,
        stats: this.getMetrics(),
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      
      return {
        connected: false,
        latency: performance.now() - start,
        stats: this.getMetrics(),
        errors,
      };
    }
  }

  /**
   * Get cache configuration
   */
  getConfig(): MemoryAdapterConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<MemoryAdapterConfig>): void {
    Object.assign(this.config, newConfig);
    
    // Apply new limits
    if (newConfig.maxMemoryMB) {
      this.maxSizeBytes = newConfig.maxMemoryMB * 1024 * 1024;
      if (this.currentSizeBytes > this.maxSizeBytes) {
        this.evictEntries(this.currentSizeBytes - this.maxSizeBytes);
      }
    }
    
    if (newConfig.maxEntries) {
      this.maxEntries = newConfig.maxEntries;
      if (this.cache.size > this.maxEntries) {
        const entriesToRemove = this.cache.size - this.maxEntries;
        for (let i = 0; i < entriesToRemove; i++) {
          this.evictEntries();
        }
      }
    }
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys()).map(key => 
      key.replace(this.keyPrefix + ':', '')
    );
  }

  // Private helper methods

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (entry.ttl === 0) return false; // No expiration
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Delete entry and update metrics
   */
  private async deleteEntry(formattedKey: string): Promise<void> {
    const entry = this.cache.get(formattedKey);
    if (!entry) return;

    this.cache.delete(formattedKey);
    this.currentSizeBytes -= entry.size;
    this.updateMetricsCounters();

    // Remove from tag sets
    for (const tag of entry.tags) {
      const tagSet = this.tagSets.get(tag);
      if (tagSet) {
        tagSet.delete(formattedKey);
        if (tagSet.size === 0) {
          this.tagSets.delete(tag);
        }
      }
    }

    // Remove from persistent storage
    if (this.enablePersistence) {
      this.removePersistentEntry(formattedKey);
    }
  }

  /**
   * Evict entries based on policy
   */
  private async evictEntries(targetSize?: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    if (entries.length === 0) return;

    let freedSize = 0;
    const targetToFree = targetSize || 0;
    
    // Sort entries based on eviction policy
    switch (this.evictionPolicy) {
      case 'lru':
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case 'lfu':
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case 'fifo':
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
      case 'ttl':
        entries.sort(([, a], [, b]) => {
          const aExpiry = a.timestamp + a.ttl;
          const bExpiry = b.timestamp + b.ttl;
          return aExpiry - bExpiry;
        });
        break;
      case 'random':
        // Shuffle array
        for (let i = entries.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [entries[i], entries[j]] = [entries[j], entries[i]];
        }
        break;
    }
    
    for (const [key, entry] of entries) {
      await this.deleteEntry(key);
      freedSize += entry.size;
      
      this.emitCacheEvent('eviction', key.replace(this.keyPrefix + ':', ''), {
        tier: 'L1',
        size: entry.size,
      });
      
      if (targetSize && freedSize >= targetToFree) {
        break;
      }
      
      if (!targetSize) {
        break; // Remove just one entry if no target size
      }
    }
  }

  /**
   * Update metrics counters
   */
  private updateMetricsCounters(): void {
    this.metrics.totalSize = this.currentSizeBytes;
    this.metrics.totalEntries = this.cache.size;
  }

  /**
   * Start cleanup interval for expired entries
   */
  private startCleanupInterval(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.deleteEntry(key));
  }

  /**
   * Load cache from persistent storage
   */
  private loadFromPersistentStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return; // Not in browser environment
    }

    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.storagePrefix)
      );

      for (const storageKey of keys) {
        const cacheKey = storageKey.replace(this.storagePrefix, '');
        const entryData = localStorage.getItem(storageKey);
        
        if (entryData) {
          const entry = JSON.parse(entryData);
          if (!this.isExpired(entry)) {
            this.cache.set(cacheKey, entry);
            this.currentSizeBytes += entry.size;
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }

      this.updateMetricsCounters();
    } catch (error) {
      // Ignore persistence errors
    }
  }

  /**
   * Persist cache entry to storage
   */
  private persistEntry(key: string, entry: CacheEntry): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const storageKey = this.storagePrefix + key;
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      // Ignore persistence errors (e.g., quota exceeded)
    }
  }

  /**
   * Remove persistent cache entry
   */
  private removePersistentEntry(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const storageKey = this.storagePrefix + key;
      localStorage.removeItem(storageKey);
    } catch (error) {
      // Ignore persistence errors
    }
  }

  /**
   * Clear persistent storage
   */
  private clearPersistentStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.storagePrefix)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Ignore persistence errors
    }
  }

  /**
   * Setup storage event listener for cross-tab synchronization
   */
  private setupStorageEventListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith(this.storagePrefix)) {
        const cacheKey = event.key.replace(this.storagePrefix, '');
        
        if (event.newValue) {
          // Entry was added/updated
          try {
            const entry = JSON.parse(event.newValue);
            this.cache.set(cacheKey, entry);
          } catch (error) {
            // Ignore parsing errors
          }
        } else {
          // Entry was removed
          this.cache.delete(cacheKey);
        }
        
        this.updateMetricsCounters();
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    super.destroy();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.cache.clear();
    this.tagSets.clear();
    this.currentSizeBytes = 0;
  }
}






