// Optimized Cache Service Implementation
// Provides high-performance in-memory caching with TTL support, LRU eviction, and monitoring

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  lastAccessed: number; // Track for LRU eviction
  accessCount: number;  // Track popularity
}

export interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  memoryUsage: number;
  avgAccessTime: number;
}

export interface CacheOptions {
  maxEntries?: number;        // Maximum cache size (LRU eviction when exceeded)
  cleanupInterval?: number;    // Cleanup interval in ms
  enableStats?: boolean;       // Track detailed statistics
  onEviction?: (key: string, entry: CacheEntry) => void; // Eviction callback
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 15 * 60 * 1000,    // 15 minutes
  LONG: 60 * 60 * 1000,      // 1 hour
  USER_DATA: 30 * 60 * 1000, // 30 minutes
  ENGAGEMENT_STATS: 10 * 60 * 1000, // 10 minutes
  BILL_DATA: 20 * 60 * 1000, // 20 minutes
  COMMENTS: 5 * 60 * 1000,   // 5 minutes
  SEARCH_RESULTS: 5 * 60 * 1000, // 5 minutes
} as const;

// Cache key generators with type safety
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  BILL_DETAILS: (billId: number) => `bill:details:${billId}`,
  BILL_COMMENTS: () => 'bill:comments',
  COMMENT_VOTES: () => 'comment:votes',
  USER_ENGAGEMENT: (userId: string) => `user:engagement:${userId}`,
  SEARCH_RESULTS: (query: string) => `search:${query.toLowerCase().trim()}`, // Normalize queries
  ANALYTICS: () => 'analytics',
} as const;

export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccessTime: 0,
  };
  private options: Required<CacheOptions>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries ?? 1000,
      cleanupInterval: options.cleanupInterval ?? 5 * 60 * 1000,
      enableStats: options.enableStats ?? true,
      onEviction: options.onEviction ?? (() => {}),
    };

    // Start automatic cleanup if interval is set
    if (this.options.cleanupInterval > 0) {
      this.startCleanup();
    }
  }

  /**
   * Get value from cache with performance tracking
   */
  get<T = any>(key: string): T | null {
    const startTime = performance.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss(startTime);
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.recordMiss(startTime);
      return null;
    }

    // Update access metadata for LRU tracking
    entry.lastAccessed = now;
    entry.accessCount++;
    
    this.recordHit(startTime);
    return entry.data as T;
  }

  /**
   * Set value in cache with TTL and size management
   */
  set<T = any>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): void {
    // Enforce max entries limit using LRU eviction
    if (this.cache.size >= this.options.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      lastAccessed: now,
      accessCount: 0,
    });
  }

  /**
   * Get value from cache or set it using a factory function
   * Includes protection against cache stampede with in-flight request tracking
   */
  private pendingRequests = new Map<string, Promise<any>>();

  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already in-flight to prevent cache stampede
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Create new request
    const request = factory()
      .then(data => {
        this.set(key, data, ttl);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    const deleted = this.cache.delete(key);
    
    if (deleted && entry) {
      this.options.onEviction(key, entry);
    }
    
    return deleted;
  }

  /**
   * Delete cache entries matching a pattern (optimized with early exit)
   */
  deletePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];
    
    // Collect keys first to avoid modification during iteration
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    // Delete collected keys
    for (const key of keysToDelete) {
      if (this.delete(key)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    // Trigger eviction callbacks
    for (const [key, entry] of this.cache.entries()) {
      this.options.onEviction(key, entry);
    }
    
    this.cache.clear();
    this.pendingRequests.clear();
    this.resetStats();
  }

  /**
   * Get all cache keys (returns copy for safety)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics with detailed metrics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const avgAccessTime = totalRequests > 0 ? this.stats.totalAccessTime / totalRequests : 0;
    
    // More accurate memory calculation
    let memoryUsage = 0;
    for (const [key, entry] of this.cache.entries()) {
      // String keys: 2 bytes per character (UTF-16)
      memoryUsage += key.length * 2;
      
      // Estimate data size based on type
      try {
        const dataStr = JSON.stringify(entry.data);
        memoryUsage += dataStr.length * 2;
      } catch {
        // If data can't be stringified, use rough estimate
        memoryUsage += 1024; // 1KB estimate for unstringifiable objects
      }
      
      // Entry overhead: timestamp, ttl, lastAccessed (3 numbers = 24 bytes)
      // accessCount (1 number = 8 bytes), plus object overhead (~48 bytes)
      memoryUsage += 80;
    }

    return {
      entries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage,
      avgAccessTime: Math.round(avgAccessTime * 1000) / 1000, // Round to 3 decimals
    };
  }

  /**
   * Invalidate expired entries (cleanup) with enhanced performance
   */
  cleanup(): number {
    let removedCount = 0;
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // Collect expired keys first
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToRemove.push(key);
      }
    }
    
    // Remove expired entries
    for (const key of keysToRemove) {
      if (this.delete(key)) {
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * Warm cache with predefined entries efficiently
   */
  warm(entries: Array<{ key: string; data: any; ttl?: number }>): void {
    // Disable cleanup during warm to avoid interference
    const cleanupWasActive = this.cleanupTimer !== undefined;
    if (cleanupWasActive) {
      this.stopCleanup();
    }

    for (const entry of entries) {
      this.set(entry.key, entry.data, entry.ttl ?? CACHE_TTL.MEDIUM);
    }

    if (cleanupWasActive) {
      this.startCleanup();
    }
  }

  /**
   * Check if cache has a valid (non-expired) key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache entry with full metadata
   */
  getWithMetadata<T = any>(key: string): { 
    data: T; 
    timestamp: number; 
    ttl: number;
    lastAccessed: number;
    accessCount: number;
    age: number;
    remainingTTL: number;
  } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return {
      data: entry.data as T,
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      lastAccessed: entry.lastAccessed,
      accessCount: entry.accessCount,
      age,
      remainingTTL: entry.ttl - age,
    };
  }

  /**
   * Update TTL for existing entry
   */
  touch(key: string, newTTL?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    // Update timestamp and optionally TTL
    entry.timestamp = now;
    entry.lastAccessed = now;
    if (newTTL !== undefined) {
      entry.ttl = newTTL;
    }
    
    return true;
  }

  /**
   * Get most accessed cache entries (for monitoring)
   */
  getTopEntries(limit: number = 10): Array<{ key: string; accessCount: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }

  // Private helper methods

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    // Find least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private recordHit(startTime: number): void {
    if (this.options.enableStats) {
      this.stats.hits++;
      this.stats.totalAccessTime += performance.now() - startTime;
    }
  }

  private recordMiss(startTime: number): void {
    if (this.options.enableStats) {
      this.stats.misses++;
      this.stats.totalAccessTime += performance.now() - startTime;
    }
  }

  private resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    this.stats.totalAccessTime = 0;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const removed = this.cleanup();
      if (removed > 0) {
        console.log(`[Cache] Cleanup removed ${removed} expired entries`);
      }
    }, this.options.cleanupInterval);
  }

  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

// Export singleton instance with default options
export const cacheService = new CacheService({
  maxEntries: 1000,
  cleanupInterval: 5 * 60 * 1000,
  enableStats: true,
});