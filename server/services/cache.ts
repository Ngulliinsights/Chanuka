import { performance } from 'perf_hooks';

// Cache entry interface with TTL support
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
}

// Cache statistics for monitoring
interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  hitRate: number;
  memoryUsage: number;
}

// Cache configuration interface
interface CacheConfig {
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

/**
 * In-memory cache service with TTL support and automatic cleanup
 * Optimized for static data like categories, statuses, and reference data
 */
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = { hits: 0, misses: 0 };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 15 * 60 * 1000, // 15 minutes default
      maxEntries: 1000,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes cleanup
      ...config
    };

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hits++;
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const actualTTL = ttl || this.config.defaultTTL;
    
    // Check if we need to make room
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: actualTTL,
      hits: 0
    };

    this.cache.set(key, entry);
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const startTime = performance.now();
    const data = await fetchFn();
    const endTime = performance.now();
    
    // Log slow queries for monitoring
    if (endTime - startTime > 100) {
      console.warn(`Slow cache fetch for key "${key}": ${(endTime - startTime).toFixed(2)}ms`);
    }

    // Cache the result
    this.set(key, data, ttl);
    
    return data;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memoryUsage = this.calculateMemoryUsage();
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      memoryUsage
    };
  }

  /**
   * Get all cache keys (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Warm cache with predefined data
   */
  warm(entries: Array<{ key: string; data: any; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Calculate approximate memory usage
   */
  private calculateMemoryUsage(): number {
    let size = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation of memory usage
      size += key.length * 2; // String characters are 2 bytes each
      size += JSON.stringify(entry.data).length * 2;
      size += 64; // Overhead for entry metadata
    }
    
    return size;
  }

  /**
   * Destroy cache service and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Cache TTL constants for different data types
export const CACHE_TTL = {
  STATIC_DATA: 60 * 60 * 1000, // 1 hour for categories, statuses
  USER_DATA: 5 * 60 * 1000, // 5 minutes for user data
  BILL_DATA: 15 * 60 * 1000, // 15 minutes for bill data
  ENGAGEMENT_STATS: 2 * 60 * 1000, // 2 minutes for engagement stats
  SEARCH_RESULTS: 10 * 60 * 1000, // 10 minutes for search results
} as const;

// Cache key generators for consistency
export const CACHE_KEYS = {
  BILL_CATEGORIES: 'bills:categories',
  BILL_STATUSES: 'bills:statuses',
  BILL_DETAIL: (id: number) => `bill:${id}`,
  BILL_ENGAGEMENT: (id: number) => `bill:${id}:engagement`,
  BILL_COMMENTS: (id: number) => `bill:${id}:comments`,
  BILL_SEARCH: (query: string, filters: string) => `bills:search:${query}:${filters}`,
  USER_PROFILE: (id: string) => `user:${id}:profile`,
  USER_TRACKED_BILLS: (id: string) => `user:${id}:tracked`,
} as const;

// Export singleton instance
export const cacheService = new CacheService({
  defaultTTL: CACHE_TTL.STATIC_DATA,
  maxEntries: 2000,
  cleanupInterval: 5 * 60 * 1000
});

// Graceful shutdown
process.on('SIGTERM', () => {
  cacheService.destroy();
});

process.on('SIGINT', () => {
  cacheService.destroy();
});