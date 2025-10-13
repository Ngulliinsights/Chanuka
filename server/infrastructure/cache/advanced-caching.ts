import { performanceMonitor } from '../monitoring/performance-monitor.js';
import { logger } from '@shared/utils/logger';

export interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  memory: {
    maxSize: number; // in MB
    ttl: number; // default TTL in seconds
  };
  strategies: {
    writeThrough: boolean;
    writeBack: boolean;
    readThrough: boolean;
  };
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
  size: number; // approximate size in bytes
}

export interface CacheStats {
  memory: {
    entries: number;
    hitRate: number;
    missRate: number;
    totalHits: number;
    totalMisses: number;
    memoryUsage: number; // in bytes
    maxMemory: number;
  };
  redis?: {
    connected: boolean;
    hitRate: number;
    missRate: number;
    totalHits: number;
    totalMisses: number;
    memoryUsage: string;
  };
  performance: {
    averageGetTime: number;
    averageSetTime: number;
    slowOperations: Array<{
      operation: string;
      key: string;
      duration: number;
      timestamp: Date;
    }>;
  };
}

export interface CacheInvalidationRule {
  pattern: string;
  triggers: string[];
  strategy: 'immediate' | 'lazy' | 'scheduled';
  dependencies?: string[];
}

class AdvancedCachingService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private redisClient: any = null; // Would be Redis client in production
  private stats = {
    memory: {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    },
    redis: {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    },
    performance: {
      getTimes: [] as number[],
      setTimes: [] as number[],
      slowOps: [] as Array<{
        operation: string;
        key: string;
        duration: number;
        timestamp: Date;
      }>
    }
  };

  private config: CacheConfig = {
    memory: {
      maxSize: 100, // 100MB
      ttl: 300 // 5 minutes
    },
    strategies: {
      writeThrough: true,
      writeBack: false,
      readThrough: true
    }
  };

  private invalidationRules: Map<string, CacheInvalidationRule> = new Map();
  private readonly SLOW_OPERATION_THRESHOLD = 100; // 100ms
  private readonly MAX_SLOW_OPS = 100;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeInvalidationRules();
    this.startPeriodicCleanup();
    this.startPerformanceMonitoring();

    logger.info('[Advanced Caching] Initialized with config:', { component: 'SimpleTool' }, this.config);
  }

  /**
   * Get value from cache with multi-layer strategy
   */
  async get<T = any>(key: string, traceId?: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      // Try memory cache first (L1)
      const memoryResult = this.getFromMemory<T>(key);
      if (memoryResult !== null) {
        this.stats.memory.hits++;
        const duration = performance.now() - startTime;
        this.trackPerformance('get', key, duration);
        return memoryResult;
      }

      this.stats.memory.misses++;

      // Try Redis cache (L2) if available
      if (this.redisClient) {
        const redisResult = await this.getFromRedis<T>(key);
        if (redisResult !== null) {
          this.stats.redis.hits++;
          
          // Populate memory cache for faster future access
          await this.setInMemory(key, redisResult, this.config.memory.ttl);
          
          const duration = performance.now() - startTime;
          this.trackPerformance('get', key, duration);
          return redisResult;
        }
        this.stats.redis.misses++;
      }

      const duration = performance.now() - startTime;
      this.trackPerformance('get', key, duration);
      return null;

    } catch (error) {
      logger.error('[Advanced Caching] Error getting from cache:', { component: 'SimpleTool' }, error);
      const duration = performance.now() - startTime;
      this.trackPerformance('get', key, duration, error.message);
      return null;
    }
  }

  /**
   * Set value in cache with multi-layer strategy
   */
  async set<T = any>(
    key: string, 
    value: T, 
    ttl?: number, 
    traceId?: string
  ): Promise<boolean> {
    const startTime = performance.now();
    const effectiveTtl = ttl || this.config.memory.ttl;

    try {
      // Always set in memory cache (L1)
      await this.setInMemory(key, value, effectiveTtl);
      this.stats.memory.sets++;

      // Set in Redis (L2) if write-through is enabled
      if (this.redisClient && this.config.strategies.writeThrough) {
        await this.setInRedis(key, value, effectiveTtl);
        this.stats.redis.sets++;
      }

      const duration = performance.now() - startTime;
      this.trackPerformance('set', key, duration);

      // Track cache warming for critical data
      this.trackCacheWarming(key, value);

      return true;

    } catch (error) {
      logger.error('[Advanced Caching] Error setting cache:', { component: 'SimpleTool' }, error);
      const duration = performance.now() - startTime;
      this.trackPerformance('set', key, duration, error.message);
      return false;
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string, traceId?: string): Promise<boolean> {
    const startTime = performance.now();

    try {
      // Delete from memory cache
      const memoryDeleted = this.memoryCache.delete(key);
      if (memoryDeleted) {
        this.stats.memory.deletes++;
      }

      // Delete from Redis if available
      if (this.redisClient) {
        await this.deleteFromRedis(key);
        this.stats.redis.deletes++;
      }

      const duration = performance.now() - startTime;
      this.trackPerformance('delete', key, duration);

      return memoryDeleted;

    } catch (error) {
      logger.error('[Advanced Caching] Error deleting from cache:', { component: 'SimpleTool' }, error);
      return false;
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T = any>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
    traceId?: string
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, traceId);
    if (cached !== null) {
      return cached;
    }

    // Execute fetch function and cache result
    const startTime = performance.now();
    try {
      const result = await fetchFn();
      await this.set(key, result, ttl, traceId);
      
      const duration = performance.now() - startTime;
      performanceMonitor.addCustomMetric(
        'cache_miss_fetch',
        duration,
        { key, traceId }
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      performanceMonitor.addCustomMetric(
        'cache_miss_fetch',
        duration,
        { key, traceId, error: error.message }
      );
      throw error;
    }
  }

  /**
   * Invalidate cache entries based on patterns
   */
  async invalidate(pattern: string, traceId?: string): Promise<number> {
    let invalidatedCount = 0;

    // Invalidate from memory cache
    for (const key of this.memoryCache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    // Invalidate from Redis if available
    if (this.redisClient) {
      try {
        const redisKeys = await this.getRedisKeys(pattern);
        for (const key of redisKeys) {
          await this.deleteFromRedis(key);
          invalidatedCount++;
        }
      } catch (error) {
        logger.error('[Advanced Caching] Error invalidating Redis keys:', { component: 'SimpleTool' }, error);
      }
    }

    console.log(`[Advanced Caching] Invalidated ${invalidatedCount} entries for pattern: ${pattern}`);
    return invalidatedCount;
  }

  /**
   * Warm cache with critical data
   */
  async warmCache(warmingRules: Array<{
    key: string;
    fetchFn: () => Promise<any>;
    ttl?: number;
    priority: 'high' | 'medium' | 'low';
  }>): Promise<void> {
    logger.info('[Advanced Caching] Starting cache warming...', { component: 'SimpleTool' });

    // Sort by priority
    const sortedRules = warmingRules.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const warmingPromises = sortedRules.map(async (rule) => {
      try {
        const startTime = performance.now();
        const data = await rule.fetchFn();
        await this.set(rule.key, data, rule.ttl);
        
        const duration = performance.now() - startTime;
        performanceMonitor.addCustomMetric(
          'cache_warming',
          duration,
          { key: rule.key, priority: rule.priority }
        );

        console.log(`[Advanced Caching] Warmed cache for key: ${rule.key}`);
      } catch (error) {
        console.error(`[Advanced Caching] Failed to warm cache for key ${rule.key}:`, error);
      }
    });

    await Promise.allSettled(warmingPromises);
    logger.info('[Advanced Caching] Cache warming completed', { component: 'SimpleTool' });
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): CacheStats {
    const memoryUsage = this.calculateMemoryUsage();
    const maxMemory = this.config.memory.maxSize * 1024 * 1024; // Convert MB to bytes

    const memoryHitRate = this.stats.memory.hits + this.stats.memory.misses > 0
      ? (this.stats.memory.hits / (this.stats.memory.hits + this.stats.memory.misses)) * 100
      : 0;

    const redisHitRate = this.stats.redis.hits + this.stats.redis.misses > 0
      ? (this.stats.redis.hits / (this.stats.redis.hits + this.stats.redis.misses)) * 100
      : 0;

    const averageGetTime = this.stats.performance.getTimes.length > 0
      ? this.stats.performance.getTimes.reduce((sum, time) => sum + time, 0) / this.stats.performance.getTimes.length
      : 0;

    const averageSetTime = this.stats.performance.setTimes.length > 0
      ? this.stats.performance.setTimes.reduce((sum, time) => sum + time, 0) / this.stats.performance.setTimes.length
      : 0;

    return {
      memory: {
        entries: this.memoryCache.size,
        hitRate: memoryHitRate,
        missRate: 100 - memoryHitRate,
        totalHits: this.stats.memory.hits,
        totalMisses: this.stats.memory.misses,
        memoryUsage,
        maxMemory
      },
      redis: this.redisClient ? {
        connected: true,
        hitRate: redisHitRate,
        missRate: 100 - redisHitRate,
        totalHits: this.stats.redis.hits,
        totalMisses: this.stats.redis.misses,
        memoryUsage: 'N/A' // Would get from Redis INFO command
      } : undefined,
      performance: {
        averageGetTime,
        averageSetTime,
        slowOperations: this.stats.performance.slowOps.slice(-20) // Last 20 slow operations
      }
    };
  }

  /**
   * Add cache invalidation rule
   */
  addInvalidationRule(rule: CacheInvalidationRule): void {
    this.invalidationRules.set(rule.pattern, rule);
    console.log(`[Advanced Caching] Added invalidation rule for pattern: ${rule.pattern}`);
  }

  /**
   * Trigger cache invalidation based on event
   */
  async triggerInvalidation(event: string, data?: any): Promise<void> {
    for (const [pattern, rule] of this.invalidationRules.entries()) {
      if (rule.triggers.includes(event)) {
        switch (rule.strategy) {
          case 'immediate':
            await this.invalidate(pattern);
            break;
          case 'lazy':
            // Mark for lazy invalidation
            this.markForLazyInvalidation(pattern);
            break;
          case 'scheduled':
            // Schedule for later invalidation
            this.scheduleInvalidation(pattern, 60000); // 1 minute delay
            break;
        }
      }
    }
  }

  /**
   * Get from memory cache
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = Date.now();

    return entry.data as T;
  }

  /**
   * Set in memory cache
   */
  private async setInMemory<T>(key: string, value: T, ttl: number): Promise<void> {
    const size = this.estimateSize(value);
    
    // Check memory limits and evict if necessary
    await this.ensureMemoryLimit(size);

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      lastAccessed: Date.now(),
      size
    };

    this.memoryCache.set(key, entry);
  }

  /**
   * Get from Redis (simulated - would use actual Redis client)
   */
  private async getFromRedis<T>(key: string): Promise<T | null> {
    // Simulated Redis get - in production would use actual Redis client
    return null;
  }

  /**
   * Set in Redis (simulated - would use actual Redis client)
   */
  private async setInRedis<T>(key: string, value: T, ttl: number): Promise<void> {
    // Simulated Redis set - in production would use actual Redis client
  }

  /**
   * Delete from Redis (simulated)
   */
  private async deleteFromRedis(key: string): Promise<void> {
    // Simulated Redis delete
  }

  /**
   * Get Redis keys matching pattern (simulated)
   */
  private async getRedisKeys(pattern: string): Promise<string[]> {
    // Simulated Redis KEYS command
    return [];
  }

  /**
   * Check if key matches pattern
   */
  private matchesPattern(key: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regexPattern}$`).test(key);
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default size if can't serialize
    }
  }

  /**
   * Calculate total memory usage
   */
  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * Ensure memory limit is not exceeded
   */
  private async ensureMemoryLimit(newEntrySize: number): Promise<void> {
    const maxMemory = this.config.memory.maxSize * 1024 * 1024; // Convert MB to bytes
    const currentUsage = this.calculateMemoryUsage();

    if (currentUsage + newEntrySize > maxMemory) {
      // Evict entries using LRU strategy
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      let freedMemory = 0;
      for (const [key, entry] of entries) {
        this.memoryCache.delete(key);
        freedMemory += entry.size;
        
        if (freedMemory >= newEntrySize) {
          break;
        }
      }

      console.log(`[Advanced Caching] Evicted entries to free ${freedMemory} bytes`);
    }
  }

  /**
   * Track performance metrics
   */
  private trackPerformance(operation: string, key: string, duration: number, error?: string): void {
    if (operation === 'get') {
      this.stats.performance.getTimes.push(duration);
      if (this.stats.performance.getTimes.length > 1000) {
        this.stats.performance.getTimes = this.stats.performance.getTimes.slice(-500);
      }
    } else if (operation === 'set') {
      this.stats.performance.setTimes.push(duration);
      if (this.stats.performance.setTimes.length > 1000) {
        this.stats.performance.setTimes = this.stats.performance.setTimes.slice(-500);
      }
    }

    // Track slow operations
    if (duration > this.SLOW_OPERATION_THRESHOLD) {
      this.stats.performance.slowOps.push({
        operation,
        key: key.substring(0, 50), // Truncate long keys
        duration,
        timestamp: new Date()
      });

      if (this.stats.performance.slowOps.length > this.MAX_SLOW_OPS) {
        this.stats.performance.slowOps = this.stats.performance.slowOps.slice(-this.MAX_SLOW_OPS / 2);
      }
    }
  }

  /**
   * Track cache warming patterns
   */
  private trackCacheWarming(key: string, value: any): void {
    // Track which keys are frequently accessed for cache warming optimization
    performanceMonitor.addCustomMetric(
      'cache_set',
      0,
      { key, size: this.estimateSize(value) }
    );
  }

  /**
   * Initialize default invalidation rules
   */
  private initializeInvalidationRules(): void {
    // Bill-related invalidation rules
    this.addInvalidationRule({
      pattern: 'bills:*',
      triggers: ['bill_updated', 'bill_created', 'bill_deleted'],
      strategy: 'immediate'
    });

    // User-related invalidation rules
    this.addInvalidationRule({
      pattern: 'users:*',
      triggers: ['user_updated', 'user_profile_updated'],
      strategy: 'immediate'
    });

    // Comment-related invalidation rules
    this.addInvalidationRule({
      pattern: 'comments:*',
      triggers: ['comment_created', 'comment_updated', 'comment_deleted'],
      strategy: 'immediate'
    });

    // Engagement-related invalidation rules
    this.addInvalidationRule({
      pattern: 'engagement:*',
      triggers: ['bill_viewed', 'comment_voted', 'bill_tracked'],
      strategy: 'lazy'
    });
  }

  /**
   * Mark for lazy invalidation
   */
  private markForLazyInvalidation(pattern: string): void {
    // Implementation would mark entries for lazy invalidation
    console.log(`[Advanced Caching] Marked for lazy invalidation: ${pattern}`);
  }

  /**
   * Schedule invalidation
   */
  private scheduleInvalidation(pattern: string, delay: number): void {
    setTimeout(async () => {
      await this.invalidate(pattern);
    }, delay);
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    // Clean expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, entry] of this.memoryCache.entries()) {
        if (now - entry.timestamp > entry.ttl * 1000) {
          this.memoryCache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`[Advanced Caching] Cleaned ${cleanedCount} expired entries`);
      }
    }, 300000); // 5 minutes
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Log cache statistics every 10 minutes
    setInterval(() => {
      const stats = this.getCacheStats();
      logger.info('[Advanced Caching] Performance stats:', { component: 'SimpleTool' }, {
        memoryHitRate: stats.memory.hitRate.toFixed(2) + '%',
        memoryUsage: (stats.memory.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
        entries: stats.memory.entries,
        avgGetTime: stats.performance.averageGetTime.toFixed(2) + 'ms'
      });
    }, 600000); // 10 minutes
  }
}

// Export singleton instance
export const advancedCachingService = new AdvancedCachingService();






