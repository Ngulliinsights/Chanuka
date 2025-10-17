/**
 * Multi-Tier Cache Adapter
 *
 * L1 (memory) + L2 (Redis) cache with automatic promotion and intelligent caching
 * Based on patterns from refined_cross_cutting.ts MultiTierCache
 */

import { BaseCacheAdapter } from '../core/base-adapter';
import { MemoryAdapter, type MemoryAdapterConfig } from './memory-adapter';
import { RedisAdapter, type RedisAdapterConfig } from './redis-adapter';
import type {
  CacheOptions,
  CacheHealthStatus,
  CacheMetrics,
  CacheTierStats,
  PromotionStrategy,
  MultiTierOptions
} from '../core/interfaces';

export interface MultiTierAdapterConfig {
  l1Config: MemoryAdapterConfig;
  l2Config: RedisAdapterConfig;
  promotionStrategy?: PromotionStrategy;
  promotionThreshold?: number;
  enableL1Warmup?: boolean;
  l1WarmupSize?: number;
  enableMetrics?: boolean;
  keyPrefix?: string;
}

export class MultiTierAdapter extends BaseCacheAdapter {
  private l1Cache: MemoryAdapter;
  private l2Cache: RedisAdapter;
  private promotionStrategy: PromotionStrategy;
  private promotionThreshold: number;
  private enableL1Warmup: boolean;
  private l1WarmupSize: number;
  private promotionCandidates = new Map<string, { hits: number; lastHit: number }>();

  constructor(private config: MultiTierAdapterConfig) {
    super({
      enableMetrics: config.enableMetrics,
      keyPrefix: config.keyPrefix,
    });

    this.promotionStrategy = config.promotionStrategy || 'hybrid';
    this.promotionThreshold = config.promotionThreshold || 3;
    this.enableL1Warmup = config.enableL1Warmup !== false;
    this.l1WarmupSize = config.l1WarmupSize || 100;

    // Initialize cache tiers
    this.l1Cache = new MemoryAdapter(config.l1Config);
    this.l2Cache = new RedisAdapter(config.l2Config);

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for cache tiers
   */
  private setupEventHandlers(): void {
    // Forward events from both tiers
    this.l1Cache.on('cache:event', (event) => {
      this.emit('cache:event', { ...event, tier: 'L1' });
    });

    this.l2Cache.on('cache:event', (event) => {
      this.emit('cache:event', { ...event, tier: 'L2' });
    });

    // Handle promotion events
    this.l2Cache.on('cache:hit', (event) => {
      this.considerPromotion(event.key);
    });
  }

  /**
   * Connect to both cache tiers
   */
  async connect(): Promise<void> {
    await this.l2Cache.connect();

    if (this.enableL1Warmup) {
      await this.warmupL1Cache();
    }
  }

  /**
   * Disconnect from both cache tiers
   */
  async disconnect(): Promise<void> {
    await Promise.all([
      this.l1Cache.destroy(),
      this.l2Cache.disconnect(),
    ]);
  }

  /**
   * Get value from multi-tier cache
   */
  async get<T>(key: string): Promise<T | null> {
    this.validateKey(key);

    return this.measureOperation(async () => {
      // Try L1 first
      const l1Result = await this.l1Cache.get<T>(key);
      if (l1Result !== null) {
        this.recordHit(key, 'L1');
        return l1Result;
      }

      // Try L2
      const l2Result = await this.l2Cache.get<T>(key);
      if (l2Result !== null) {
        this.recordHit(key, 'L2');

        // Consider promotion to L1
        await this.considerPromotion(key, l2Result);

        return l2Result;
      }

      this.recordMiss(key);
      return null;
    }, 'hit', key);
  }

  /**
   * Set value in multi-tier cache
   */
  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    this.validateKey(key);
    const validatedTtl = this.validateTtl(ttlSec);

    return this.measureOperation(async () => {
      const size = this.calculateSize(value);

      // Determine which tiers to use based on size and options
      const shouldUseL1 = this.shouldStoreInL1(size, { ttl: validatedTtl });

      const promises: Promise<void>[] = [];

      if (shouldUseL1) {
        // Store in L1 with shorter TTL (max 5 minutes)
        const l1Ttl = Math.min(validatedTtl || 300, 300);
        promises.push(this.l1Cache.set(key, value, l1Ttl));
      }

      // Always store in L2
      promises.push(this.l2Cache.set(key, value, validatedTtl));

      await Promise.all(promises);

      this.recordSet(key, size, shouldUseL1 ? 'L1' : 'L2');
    }, 'set', key);
  }

  /**
   * Delete value from multi-tier cache
   */
  async del(key: string): Promise<void> {
    this.validateKey(key);

    return this.measureOperation(async () => {
      // Delete from both tiers
      await Promise.all([
        this.l1Cache.del(key),
        this.l2Cache.del(key),
      ]);

      // Remove from promotion candidates
      this.promotionCandidates.delete(key);

      this.recordDelete(key);
    }, 'delete', key);
  }

  /**
   * Check if key exists in either tier
   */
  async exists(key: string): Promise<boolean> {
    this.validateKey(key);

    const l1Exists = await this.l1Cache.exists(key);
    if (l1Exists) return true;

    return await this.l2Cache.exists(key);
  }

  /**
   * Get TTL from the appropriate tier
   */
  async ttl(key: string): Promise<number> {
    this.validateKey(key);

    // Check L1 first
    const l1Ttl = await this.l1Cache.ttl(key);
    if (l1Ttl > -2) return l1Ttl; // Key exists in L1

    // Check L2
    return await this.l2Cache.ttl(key);
  }

  /**
   * Get multiple values from multi-tier cache
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    keys.forEach(key => this.validateKey(key));

    return this.measureOperation(async () => {
      const results: (T | null)[] = new Array(keys.length).fill(null);
      const l2Keys: string[] = [];
      const l2Indices: number[] = [];

      // Try L1 first for all keys
      const l1Results = await this.l1Cache.mget<T>(keys);

      for (let i = 0; i < keys.length; i++) {
        if (l1Results[i] !== null) {
          results[i] = l1Results[i];
          this.recordHit(keys[i], 'L1');
        } else {
          l2Keys.push(keys[i]);
          l2Indices.push(i);
        }
      }

      // Get remaining keys from L2
      if (l2Keys.length > 0) {
        const l2Results = await this.l2Cache.mget<T>(l2Keys);

        for (let i = 0; i < l2Keys.length; i++) {
          const result = l2Results[i];
          const originalIndex = l2Indices[i];

          if (result !== null) {
            results[originalIndex] = result;
            this.recordHit(l2Keys[i], 'L2');

            // Consider promotion
            await this.considerPromotion(l2Keys[i], result);
          } else {
            this.recordMiss(l2Keys[i]);
          }
        }
      }

      return results;
    }, 'hit', `mget:${keys.length}`);
  }

  /**
   * Set multiple values in multi-tier cache
   */
  async mset<T>(entries: [string, T, number?][]): Promise<void> {
    if (entries.length === 0) return;

    entries.forEach(([key]) => this.validateKey(key));

    return this.measureOperation(async () => {
      const l1Entries: [string, T, number?][] = [];
      const l2Entries: [string, T, number?][] = [];

      for (const [key, value, ttl] of entries) {
        const size = this.calculateSize(value);
        const validatedTtl = this.validateTtl(ttl);

        if (this.shouldStoreInL1(size, { ttl: validatedTtl })) {
          const l1Ttl = Math.min(validatedTtl || 300, 300);
          l1Entries.push([key, value, l1Ttl]);
        }

        l2Entries.push([key, value, validatedTtl]);
      }

      const promises: Promise<void>[] = [];

      if (l1Entries.length > 0) {
        promises.push(this.l1Cache.mset(l1Entries));
      }

      if (l2Entries.length > 0) {
        promises.push(this.l2Cache.mset(l2Entries));
      }

      await Promise.all(promises);
    }, 'set', `mset:${entries.length}`);
  }

  /**
   * Clear both cache tiers
   */
  async clear(): Promise<void> {
    await Promise.all([
      this.l1Cache.clear(),
      this.l2Cache.clear(),
    ]);

    this.promotionCandidates.clear();
  }

  /**
   * Flush both cache tiers
   */
  async flush(): Promise<void> {
    return this.clear();
  }

  /**
   * Invalidate by pattern in both tiers
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const [l1Count, l2Count] = await Promise.all([
      this.l1Cache.invalidateByPattern(pattern),
      this.l2Cache.invalidateByPattern(pattern),
    ]);

    return l1Count + l2Count;
  }

  /**
   * Invalidate by tags in both tiers
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    const [l1Count, l2Count] = await Promise.all([
      this.l1Cache.invalidateByTags(tags),
      this.l2Cache.invalidateByTags(tags),
    ]);

    return l1Count + l2Count;
  }

  /**
   * Warm up cache with critical data
   */
  async warmUp(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    // Warm up both tiers
    await Promise.all([
      this.l1Cache.preload(entries.map(({ key, options }) => ({
        key,
        factory: async () => entries.find(e => e.key === key)?.value,
        options,
      }))),
      this.l2Cache.warmUp(entries),
    ]);
  }

  /**
   * Get multi-tier cache health status
   */
  async getHealth(): Promise<CacheHealthStatus> {
    const start = performance.now();
    const errors: string[] = [];

    try {
      const [l1Health, l2Health] = await Promise.all([
        this.l1Cache.getHealth(),
        this.l2Cache.getHealth(),
      ]);

      // Test multi-tier operations
      const testKey = `health_check_${Date.now()}`;
      await this.set(testKey, 'test', 1);
      const result = await this.get(testKey);
      await this.del(testKey);

      if (result !== 'test') {
        errors.push('Multi-tier cache operations failed');
      }

      if (l1Health.errors) {
        errors.push(...l1Health.errors.map(e => `L1: ${e}`));
      }

      if (l2Health.errors) {
        errors.push(...l2Health.errors.map(e => `L2: ${e}`));
      }

      const latency = performance.now() - start;
      const connected = l1Health.connected && l2Health.connected;

      return {
        connected,
        latency,
        memory: {
          l1: l1Health.memory,
          l2: l2Health.memory,
        },
        stats: this.getMetrics(),
        errors: errors.length > 0 ? errors : [],
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
   * Get combined metrics from both tiers
   */
  getMetrics(): CacheMetrics {
    const l1Stats = this.l1Cache.getMetrics();
    const l2Stats = this.l2Cache.getMetrics();

    return {
      hits: l1Stats.hits + l2Stats.hits,
      misses: l1Stats.misses + l2Stats.misses,
      hitRate: this.calculateCombinedHitRate(l1Stats, l2Stats),
      operations: l1Stats.operations + l2Stats.operations,
      avgResponseTime: this.calculateCombinedResponseTime(l1Stats, l2Stats),
      errors: l1Stats.errors + l2Stats.errors,
      totalSize: (l1Stats.totalSize || 0) + (l2Stats.totalSize || 0),
      totalEntries: (l1Stats.totalEntries || 0) + (l2Stats.totalEntries || 0),
      l1Stats: this.convertToTierStats(l1Stats, 'L1'),
      l2Stats: this.convertToTierStats(l2Stats, 'L2'),
    };
  }

  // Private helper methods

  /**
   * Determine if data should be stored in L1 cache
   */
  private shouldStoreInL1(size: number, options: { ttl?: number }): boolean {
    // Don't store large items in L1
    const maxL1Size = 1024 * 1024; // 1MB
    if (size > maxL1Size) return false;

    // Don't store long-lived items in L1
    const maxL1Ttl = 3600; // 1 hour
    if (options.ttl && options.ttl > maxL1Ttl) return false;

    return true;
  }

  /**
   * Consider promoting an item from L2 to L1
   */
  private async considerPromotion<T>(key: string, value?: T): Promise<void> {
    const candidate = this.promotionCandidates.get(key) || { hits: 0, lastHit: 0 };
    candidate.hits++;
    candidate.lastHit = Date.now();
    this.promotionCandidates.set(key, candidate);

    const shouldPromote = this.shouldPromoteToL1(key, candidate);

    if (shouldPromote && value !== undefined) {
      try {
        // Promote to L1 with shorter TTL
        await this.l1Cache.set(key, value, 300); // 5 minutes

        this.emitCacheEvent('promotion', key, {
          tier: 'L1',
          size: this.calculateSize(value),
        });

        // Remove from promotion candidates
        this.promotionCandidates.delete(key);
      } catch (error) {
        // Promotion failed, continue normally
        this.emitCacheEvent('error', key, {
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }
  }

  /**
   * Determine if an item should be promoted to L1
   */
  private shouldPromoteToL1(key: string, candidate: { hits: number; lastHit: number }): boolean {
    switch (this.promotionStrategy) {
      case 'lru':
        return candidate.hits >= this.promotionThreshold;

      case 'frequency':
        const timeWindow = 5 * 60 * 1000; // 5 minutes
        const isRecent = Date.now() - candidate.lastHit < timeWindow;
        return candidate.hits >= this.promotionThreshold && isRecent;

      case 'size':
        // Promote smaller items more aggressively
        return candidate.hits >= Math.max(1, this.promotionThreshold - 1);

      case 'hybrid':
      default:
        const recentHits = candidate.hits;
        const timeFactor = Math.max(0, 1 - (Date.now() - candidate.lastHit) / (60 * 60 * 1000)); // Decay over 1 hour
        const score = recentHits * (1 + timeFactor);
        return score >= this.promotionThreshold;
    }
  }

  /**
   * Warm up L1 cache with frequently accessed items
   */
  private async warmupL1Cache(): Promise<void> {
    try {
      // This is a simplified warmup - in production, you might want to
      // track popular keys and warm them up based on usage patterns

      // For now, we'll just ensure L1 is ready
      await this.l1Cache.clear();
    } catch (error) {
      // Warmup failure shouldn't block startup
      this.emitCacheEvent('error', 'l1_warmup', {
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Calculate combined hit rate from both tiers
   */
  private calculateCombinedHitRate(l1Stats: CacheMetrics, l2Stats: CacheMetrics): number {
    const totalHits = l1Stats.hits + l2Stats.hits;
    const totalMisses = l1Stats.misses + l2Stats.misses;
    const total = totalHits + totalMisses;

    return total > 0 ? (totalHits / total) * 100 : 0;
  }

  /**
   * Calculate combined response time from both tiers
   */
  private calculateCombinedResponseTime(l1Stats: CacheMetrics, l2Stats: CacheMetrics): number {
    const l1Weight = l1Stats.operations || 0;
    const l2Weight = l2Stats.operations || 0;
    const totalWeight = l1Weight + l2Weight;

    if (totalWeight === 0) return 0;

    return ((l1Stats.avgResponseTime * l1Weight) + (l2Stats.avgResponseTime * l2Weight)) / totalWeight;
  }

  /**
   * Convert cache metrics to tier stats
   */
  private convertToTierStats(metrics: CacheMetrics, tier: 'L1' | 'L2'): CacheTierStats {
    return {
      hits: metrics.hits,
      misses: metrics.misses,
      sets: 0, // Would need to track separately
      deletes: 0, // Would need to track separately
      errors: metrics.errors,
      hitRate: metrics.hitRate,
      avgResponseTime: metrics.avgResponseTime,
      totalSize: metrics.totalSize || 0,
      totalEntries: metrics.totalEntries || 0,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    super.destroy();
    this.promotionCandidates.clear();
    this.l1Cache.destroy();
    this.l2Cache.destroy();
  }
}