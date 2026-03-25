/**
 * Unified Cache Factory
 *
 * Comprehensive cache factory combining adapter pattern, advanced features,
 * and clustering support with event-driven architecture.
 */

// cspell:ignore mdel

import { err, ok, Result } from '@shared/core/primitives/types/result';
import { EventEmitter } from 'events';

import { BrowserAdapter } from './adapters/browser-adapter';
import { MemoryAdapter } from './adapters/memory-adapter';
import { MultiTierAdapter } from './adapters/multi-tier-adapter';
import { CacheClusterManager, ClusterConfig, ClusterNode, type ClusterOptions } from './clustering/cluster-manager';
import { CacheCompressor } from './compression/cache-compressor';
import type { CacheAdapter, CacheHealthStatus, CacheMetrics } from './core/interfaces';
import { isCustomHealthCheckable, isDestroyable, isTagInvalidatable } from './interfaces';
import type { MetricsCollectorConfig } from './monitoring/metrics-collector';
import { CacheMetricsCollector } from './monitoring/metrics-collector';
import { CircuitBreakerStrategy } from './strategies/circuit-breaker-strategy';
import { CompressionStrategy } from './strategies/compression-strategy';
import { TaggingStrategy } from './strategies/tagging-strategy';
import { CacheTagManager } from './tagging/tag-manager';
import type { CompressionOptions, EvictionOptions, SerializationOptions } from './types';
import { CacheWarmer, WarmingStrategy } from './warming/cache-warmer';

// ---------------------------------------------------------------------------
// Config interfaces
// ---------------------------------------------------------------------------

export interface MemoryAdapterConfig {
  maxSize?: number;
  cleanupInterval?: number;
  enableLRU?: boolean;
  keyPrefix?: string;
  defaultTtlSec?: number;
}

export interface RedisAdapterConfig {
  redisUrl: string;
  maxRetries?: number;
  retryDelayOnFailover?: number;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
  keepAlive?: number;
  family?: 4 | 6;
  db?: number;
  keyPrefix?: string;
  defaultTtlSec?: number;
}

export interface BrowserAdapterConfig {
  storageType?: 'localStorage' | 'sessionStorage' | 'indexedDB';
  maxSize?: number;
  keyPrefix?: string;
  defaultTtlSec?: number;
}

export interface MultiTierAdapterConfig {
  l1Config: MemoryAdapterConfig;
  l2Config: RedisAdapterConfig;
  promotionStrategy?: 'lru' | 'frequency' | 'size' | 'ttl';
  enableMetrics?: boolean;
  keyPrefix?: string;
}

export interface UnifiedCacheConfig {
  provider: 'redis' | 'memory' | 'multi-tier' | 'browser';
  defaultTtlSec: number;
  keyPrefix?: string;
  maxMemoryMB?: number;

  memoryConfig?: MemoryAdapterConfig;
  redisConfig?: RedisAdapterConfig;
  browserConfig?: BrowserAdapterConfig;
  multiTierConfig?: MultiTierAdapterConfig;

  compressionOptions?: CompressionOptions;
  serializationOptions?: SerializationOptions;
  warmingStrategy?: WarmingStrategy;
  evictionOptions?: EvictionOptions;

  enableMetrics?: boolean;
  enableCompression?: boolean;
  compressionThreshold?: number;
  enableAdvancedMetrics?: boolean;
  metricsCollectionInterval?: number;
  healthCheckInterval?: number;

  enableClustering?: boolean;
  clusterNodes?: ClusterNode[];
  clusterOptions?: ClusterOptions;

  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  circuitBreakerResetTimeout?: number;
}

// ---------------------------------------------------------------------------
// Shared empty-metrics sentinel
// ---------------------------------------------------------------------------

const EMPTY_METRICS: CacheMetrics = {
  hits: 0,
  misses: 0,
  hitRate: 0,
  operations: 0,
  errors: 0,
  memoryUsage: 0,
  keyCount: 0,
  avgLatency: 0,
  maxLatency: 0,
  minLatency: 0,
  avgResponseTime: 0,
};

const DEGRADED_HEALTH: CacheHealthStatus = { status: 'degraded', latency: 0 };

// ---------------------------------------------------------------------------
// Base adapter wrapper — eliminates boilerplate across all decorator classes
// ---------------------------------------------------------------------------

/**
 * Transparent pass-through wrapper. Subclasses override only the methods they
 * need to intercept, keeping each decorator focused and concise.
 */
abstract class BaseAdapterWrapper implements CacheAdapter {
  readonly name: string;
  readonly version: string;
  readonly config: Record<string, unknown>;

  constructor(protected readonly adapter: CacheAdapter, namePrefix: string) {
    this.name    = `${namePrefix}(${adapter.name ?? 'unknown'})`;
    this.version = adapter.version ?? '1.0.0';
    this.config  = (adapter.config as Record<string, unknown>) ?? {};
  }

  get<T>(key: string): Promise<T | null>   { return this.adapter.get<T>(key); }
  set<T>(key: string, value: T, ttl?: number): Promise<void> { return this.adapter.set(key, value, ttl); }

  del(key: string): Promise<boolean>       { return this.adapter.del?.(key)    ?? Promise.resolve(false); }
  delete(key: string): Promise<boolean>    { return this.del(key); }
  has(key: string): Promise<boolean>       { return this.adapter.exists?.(key) ?? Promise.resolve(false); }
  exists(key: string): Promise<boolean>    { return this.has(key); }
  clear(): Promise<void>                   { return this.adapter.clear?.()     ?? Promise.resolve(); }
  getMetrics(): CacheMetrics               { return this.adapter.getMetrics?.() ?? EMPTY_METRICS; }
  getHealth(): Promise<CacheHealthStatus>  { return this.adapter.getHealth?.() ?? Promise.resolve(DEGRADED_HEALTH); }

  mget<T>(keys: string[]): Promise<Array<T | null>>                                { return this.adapter.mget?.<T>(keys)  ?? Promise.resolve([]); }
  mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void>  { return this.adapter.mset?.(entries)  ?? Promise.resolve(); }
  mdel(keys: string[]): Promise<number>                                            { return this.adapter.mdel?.(keys)     ?? Promise.resolve(0); }
  increment(key: string, delta = 1): Promise<number>                               { return this.adapter.increment?.(key, delta) ?? Promise.resolve(0); }
  decrement(key: string, delta = 1): Promise<number>                               { return this.adapter.decrement?.(key, delta) ?? Promise.resolve(0); }
  expire(key: string, ttlSeconds: number): Promise<boolean>                        { return this.adapter.expire?.(key, ttlSeconds) ?? Promise.resolve(false); }
  ttl(key: string): Promise<number>                                                { return this.adapter.ttl?.(key) ?? Promise.resolve(-1); }
}

// ---------------------------------------------------------------------------
// Decorator: Compression
// ---------------------------------------------------------------------------

class CompressedCacheAdapter extends BaseAdapterWrapper {
  constructor(adapter: CacheAdapter, private readonly compression: CompressionStrategy) {
    super(adapter, 'compressed');
  }

  override async get<T>(key: string): Promise<T | null> {
    const raw = await this.adapter.get<T>(key);
    return raw === null ? null : this.compression.decompress(raw);
  }

  override async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.adapter.set(key, await this.compression.compress(value), ttl);
  }
}

// ---------------------------------------------------------------------------
// Decorator: Tagging
// ---------------------------------------------------------------------------

class TaggedCacheAdapter extends BaseAdapterWrapper {
  constructor(adapter: CacheAdapter, private readonly tagging: TaggingStrategy) {
    super(adapter, 'tagged');
  }

  override async del(key: string): Promise<boolean> {
    const deleted = await (this.adapter.del?.(key) ?? Promise.resolve(false));
    if (deleted) this.tagging.removeKey(key);
    return deleted;
  }

  /** Delete alias inherits the tag-cleanup side-effect via del(). */
  override delete(key: string): Promise<boolean> { return this.del(key); }
}

// ---------------------------------------------------------------------------
// Decorator: Metrics
// ---------------------------------------------------------------------------

class MetricsCacheAdapter extends BaseAdapterWrapper {
  constructor(
    adapter: CacheAdapter,
    private readonly collector: CacheMetricsCollector,
    private readonly cacheName: string,
  ) {
    super(adapter, 'metrics');
  }

  private track<T>(op: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    return fn().then(
      result => {
        this.collector.emit('operation', { cache: this.cacheName, op, success: true,  duration: Date.now() - start });
        return result;
      },
      error => {
        this.collector.emit('operation', { cache: this.cacheName, op, success: false, duration: Date.now() - start });
        throw error;
      },
    );
  }

  override get<T>(key: string): Promise<T | null>             { return this.track('get', () => this.adapter.get<T>(key)); }
  override set<T>(key: string, value: T, ttl?: number): Promise<void> { return this.track('set', () => this.adapter.set(key, value, ttl)); }
  override del(key: string): Promise<boolean>                 { return this.track('del', () => this.adapter.del?.(key) ?? Promise.resolve(false)); }
  override delete(key: string): Promise<boolean>              { return this.del(key); }

  override getMetrics(): CacheMetrics {
    const base = this.adapter.getMetrics?.() ?? EMPTY_METRICS;
    return { ...base, avgResponseTime: base.avgLatency ?? 0 };
  }
}

// ---------------------------------------------------------------------------
// Decorator: Circuit-Breaker
// ---------------------------------------------------------------------------

class CircuitBreakerCacheAdapter extends BaseAdapterWrapper {
  constructor(adapter: CacheAdapter, private readonly breaker: CircuitBreakerStrategy) {
    super(adapter, 'circuit-breaker');
  }

  override get<T>(key: string): Promise<T | null>             { return this.breaker.execute(() => this.adapter.get<T>(key)); }
  override set<T>(key: string, value: T, ttl?: number): Promise<void> { return this.breaker.execute(() => this.adapter.set(key, value, ttl)); }
  override del(key: string): Promise<boolean>                 { return this.breaker.execute(() => this.adapter.del?.(key) ?? Promise.resolve(false)); }
  override delete(key: string): Promise<boolean>              { return this.del(key); }

  override getMetrics(): CacheMetrics {
    const base = this.adapter.getMetrics?.() ?? EMPTY_METRICS;
    return { ...base, avgResponseTime: base.avgLatency ?? 0 };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Unified Cache Factory
 *
 * Creates and manages named cache instances with:
 * - Multiple adapter types (memory, Redis, browser, multi-tier)
 * - Layered decorators (compression, tagging, metrics, circuit-breaker)
 * - Optional cluster management
 * - Aggregated health and metrics reporting
 * - Event-driven lifecycle notifications
 */
export class UnifiedCacheFactory extends EventEmitter {
  private static instance: UnifiedCacheFactory | undefined;

  private readonly instances   = new Map<string, CacheAdapter>();
  private readonly metrics:    CacheMetricsCollector;
  private readonly tags:       CacheTagManager;
  private readonly warmer:     CacheWarmer;
  private readonly compressor: CacheCompressor;
  private readonly cluster:    CacheClusterManager | undefined;

  constructor(private readonly config: UnifiedCacheConfig) {
    super();
    this.setMaxListeners(50);

    const metricsConfig: MetricsCollectorConfig = {};
    if (config.enableAdvancedMetrics    !== undefined) metricsConfig.enableAdvancedMetrics = config.enableAdvancedMetrics;
    if (config.metricsCollectionInterval !== undefined) metricsConfig.collectionInterval   = config.metricsCollectionInterval;

    this.metrics    = new CacheMetricsCollector(metricsConfig);
    this.tags       = new CacheTagManager();
    this.warmer     = new CacheWarmer(config.warmingStrategy);
    this.compressor = new CacheCompressor(config.compressionOptions);

    if (config.enableClustering && config.clusterNodes?.length) {
      const clusterConfig: ClusterConfig = { nodes: config.clusterNodes };
      if (config.clusterOptions !== undefined) clusterConfig.options = config.clusterOptions;
      this.cluster = new CacheClusterManager(clusterConfig);
    }

    this.bindInternalEvents();
  }

  // ---------------------------------------------------------------------------
  // Singleton management
  // ---------------------------------------------------------------------------

  /** Returns (or lazily creates) the process-wide singleton instance. */
  static getInstance(config: UnifiedCacheConfig): UnifiedCacheFactory {
    UnifiedCacheFactory.instance ??= new UnifiedCacheFactory(config);
    return UnifiedCacheFactory.instance;
  }

  /** Clears the singleton reference so a fresh instance can be created. */
  private static resetInstance(): void {
    UnifiedCacheFactory.instance = undefined;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Create (or retrieve) a named cache instance. */
  async createCache(name = 'default'): Promise<Result<CacheAdapter, Error>> {
    const existing = this.instances.get(name);
    if (existing) return ok(existing);

    const adapterResult = await this.createAdapter();
    if (adapterResult.isErr()) return adapterResult;

    try {
      const enhanced = await this.decorateAdapter(adapterResult.value, name);
      this.instances.set(name, enhanced);
      this.emit('cache:created', { name, adapter: enhanced });
      return ok(enhanced);
    } catch (error) {
      const cacheError = error instanceof Error ? error : new Error(String(error));
      this.emit('cache:error', { name, error: cacheError });
      return err(cacheError);
    }
  }

  /** Retrieve an existing named cache instance. */
  getCache(name = 'default'): Result<CacheAdapter, Error> {
    const cache = this.instances.get(name);
    return cache
      ? ok(cache)
      : err(new Error(`Cache instance '${name}' not found. Call createCache() first.`));
  }

  /** Destroy a named cache instance and release its resources. */
  async destroyCache(name = 'default'): Promise<Result<void, Error>> {
    const cache = this.instances.get(name);
    if (!cache) return err(new Error(`Cache instance '${name}' not found`));

    try {
      if (isDestroyable(cache)) await cache.destroy();
      this.instances.delete(name);
      this.emit('cache:destroyed', { name });
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /** Snapshot of all live cache instances (read-only copy). */
  getAllCaches(): ReadonlyMap<string, CacheAdapter> {
    return new Map(this.instances);
  }

  /** Factory-level metrics summary across all managed instances. */
  getMetrics(): {
    instances: number;
    totalOperations: number;
    totalErrors: number;
    uptime: number;
    clusterHealth?: unknown;
  } {
    const m = this.metrics.getAggregatedMetrics();
    return {
      instances:       this.instances.size,
      totalOperations: m.totalOperations ?? 0,
      totalErrors:     m.totalErrors     ?? 0,
      uptime:          m.uptime          ?? 0,
      clusterHealth:   this.cluster?.getHealth(),
    };
  }

  /**
   * Pre-warm cache entries by running their factory functions.
   * Returns a partial-failure summary — individual errors do not abort the batch.
   */
  async warmUpAll(entries: Array<{
    cache: string;
    key: string;
    factory: () => Promise<unknown>;
    ttl?: number;
    tags?: string[];
  }>): Promise<Result<{ succeeded: number; failed: number }, Error>> {
    try {
      const results = await Promise.allSettled(
        entries.map(async ({ cache: cacheName, key, factory, ttl, tags }) => {
          const cacheResult = this.getCache(cacheName);
          if (cacheResult.isErr()) throw cacheResult.error;

          await cacheResult.value.set(key, await factory(), ttl);

          if (tags?.length) await this.tags.addTags(cacheName, key, tags);
        }),
      );

      const failed    = results.filter(r => r.status === 'rejected').length;
      const succeeded = results.length - failed;

      if (failed > 0) {
        const reasons = results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map(r => String(r.reason))
          .join('; ');
        this.emit('cache:warmup:partial', { succeeded, failed, reasons });
      }

      return ok({ succeeded, failed });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /** Invalidate cache entries by tag across all managed instances. */
  async invalidateByTags(tags: string[]): Promise<Result<number, Error>> {
    try {
      let total = 0;
      for (const [, cache] of this.instances) {
        if (isTagInvalidatable(cache)) total += await cache.invalidateByTags(tags);
      }
      return ok(total);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /** Aggregated health status across all managed instances. */
  async getHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    caches: Record<string, CacheHealthStatus>;
    cluster?: unknown;
  }> {
    const caches: Record<string, CacheHealthStatus> = {};

    await Promise.all(
      Array.from(this.instances.entries()).map(async ([name, cache]) => {
        if (isCustomHealthCheckable(cache)) {
          caches[name] = (await cache.getHealth()) as CacheHealthStatus;
        }
      }),
    );

    const statuses  = Object.values(caches);
    const unhealthy = statuses.filter(h => h.status === 'unhealthy').length;
    const degraded  = statuses.filter(h => h.status === 'degraded').length;

    const overall: 'healthy' | 'degraded' | 'unhealthy' =
      unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy';

    return { overall, caches, cluster: this.cluster?.getHealth() };
  }

  /** Gracefully shut down all caches, the cluster, and background collectors. */
  async shutdown(): Promise<Result<void, Error>> {
    try {
      await Promise.all(Array.from(this.instances.keys()).map(n => this.destroyCache(n)));
      await this.cluster?.shutdown();
      this.metrics.stop();
      this.removeAllListeners();
      UnifiedCacheFactory.resetInstance();
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // ---------------------------------------------------------------------------
  // Private — adapter construction
  // ---------------------------------------------------------------------------

  private async createAdapter(): Promise<Result<CacheAdapter, Error>> {
    switch (this.config.provider) {
      case 'memory':     return this.buildMemoryAdapter();
      case 'redis':      return this.buildRedisAdapter();
      case 'browser':    return this.buildBrowserAdapter();
      case 'multi-tier': return this.buildMultiTierAdapter();
      default:
        return err(new Error(`Unsupported cache provider: ${(this.config as UnifiedCacheConfig).provider}`));
    }
  }

  private buildMemoryAdapter(): Result<CacheAdapter, Error> {
    try {
      const cfg = this.config.memoryConfig ?? {};
      return ok(new MemoryAdapter({
        maxSize:         cfg.maxSize         ?? 10_000,
        cleanupInterval: cfg.cleanupInterval ?? 60_000,
        enableLRU:       cfg.enableLRU       !== false,
        defaultTtlSec:   cfg.defaultTtlSec   ?? this.config.defaultTtlSec,
        ...(cfg.keyPrefix ?? this.config.keyPrefix ? { keyPrefix: cfg.keyPrefix ?? this.config.keyPrefix } : {}),
      }) as unknown as CacheAdapter);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private buildRedisAdapter(): Result<CacheAdapter, Error> {
    return err(new Error('Redis adapter is not yet implemented. Use memory or multi-tier provider.'));
  }

  private buildBrowserAdapter(): Result<CacheAdapter, Error> {
    try {
      const cfg = this.config.browserConfig ?? {};
      return ok(new BrowserAdapter({
        storageType:   cfg.storageType   ?? 'localStorage',
        maxSize:       cfg.maxSize       ?? 1_000,
        defaultTtlSec: cfg.defaultTtlSec ?? this.config.defaultTtlSec,
        ...(cfg.keyPrefix ?? this.config.keyPrefix ? { keyPrefix: cfg.keyPrefix ?? this.config.keyPrefix } : {}),
      }) as unknown as CacheAdapter);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private buildMultiTierAdapter(): Result<CacheAdapter, Error> {
    const cfg = this.config.multiTierConfig;
    if (!cfg) return err(new Error('multiTierConfig is required when provider is "multi-tier"'));

    try {
      return ok(new MultiTierAdapter({
        l1Config:           cfg.l1Config,
        l2Config:           cfg.l2Config,
        promotionStrategy:  cfg.promotionStrategy ?? 'lru',
        enableMetrics:      cfg.enableMetrics      ?? true,
        ...(cfg.keyPrefix ?? this.config.keyPrefix ? { keyPrefix: cfg.keyPrefix ?? this.config.keyPrefix } : {}),
      }) as unknown as CacheAdapter);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // ---------------------------------------------------------------------------
  // Private — adapter decoration pipeline
  // ---------------------------------------------------------------------------

  private async decorateAdapter(base: CacheAdapter, name: string): Promise<CacheAdapter> {
    let adapter = base;

    if (this.config.enableCompression) {
      adapter = new CompressedCacheAdapter(adapter, new CompressionStrategy(this.compressor));
    }

    adapter = new TaggedCacheAdapter(adapter, new TaggingStrategy(this.tags, name));
    adapter = new MetricsCacheAdapter(adapter, this.metrics, name);

    if (this.config.enableCircuitBreaker) {
      adapter = new CircuitBreakerCacheAdapter(
        adapter,
        new CircuitBreakerStrategy({
          threshold:    this.config.circuitBreakerThreshold    ?? 5,
          timeout:      this.config.circuitBreakerTimeout      ?? 60_000,
          resetTimeout: this.config.circuitBreakerResetTimeout ?? 300_000,
        }),
      );
    }

    if (this.cluster) {
      adapter = await this.cluster.wrapAdapter(adapter, name);
    }

    return adapter;
  }

  // ---------------------------------------------------------------------------
  // Private — event wiring
  // ---------------------------------------------------------------------------

  private bindInternalEvents(): void {
    this.metrics.on('metrics:collected', data => this.emit('factory:metrics', data));
    this.warmer.on('warming:complete',   data => this.emit('factory:warming:complete', data));
    this.cluster?.on('cluster:event',   data => this.emit('factory:cluster:event', data));
  }
}

// ---------------------------------------------------------------------------
// Module-level convenience helpers
// ---------------------------------------------------------------------------

/**
 * Create a one-off default cache from config without holding a factory reference.
 *
 * For long-lived applications prefer `UnifiedCacheFactory.getInstance()` so that
 * metrics, health checks, and cluster state are retained across calls.
 */
export function createUnifiedCache(config: UnifiedCacheConfig): Promise<Result<CacheAdapter, Error>> {
  return new UnifiedCacheFactory(config).createCache('default');
}

/**
 * Retrieve a named cache from the process-wide singleton.
 *
 * @throws If the singleton has not been initialised via `UnifiedCacheFactory.getInstance()`.
 */
export function getUnifiedCache(name = 'default'): Result<CacheAdapter, Error> {
  if (!UnifiedCacheFactory['instance']) {
    return err(new Error('Cache factory has not been initialised. Call UnifiedCacheFactory.getInstance(config) first.'));
  }
  return (UnifiedCacheFactory['instance'] as UnifiedCacheFactory).getCache(name);
}

/** Shut down the process-wide singleton if one exists. No-ops otherwise. */
export async function shutdownUnifiedCache(): Promise<Result<void, Error>> {
  const inst = UnifiedCacheFactory['instance'] as UnifiedCacheFactory | undefined;
  return inst ? inst.shutdown() : ok(undefined);
}

// Re-export for backward compatibility
export { cacheFactory, SimpleCacheFactory } from './factory';