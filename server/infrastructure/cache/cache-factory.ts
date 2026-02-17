/**
 * Unified Cache Factory
 *
 * Comprehensive cache factory that combines the best features from all existing
 * cache implementations with adapter pattern, advanced features, and clustering support.
 */

import { EventEmitter } from 'events';

import type {
  CacheAdapter,
  CacheMetrics,
  CacheHealthStatus
} from '../cache';
import { Result, ok, err } from '../primitives/types/result';

import { BrowserAdapter } from './adapters/browser-adapter';
import { MemoryAdapter } from './adapters/memory-adapter';
import { MultiTierAdapter } from './adapters/multi-tier-adapter';
import { CacheClusterManager, ClusterNode } from './clustering/cluster-manager';
import { CacheCompressor } from './compression/cache-compressor';
import { CacheMetricsCollector } from './monitoring/metrics-collector';
import { CacheTagManager } from './tagging/tag-manager';
import type {
  EvictionOptions,
  CompressionOptions,
  SerializationOptions
} from './types';

// Import adapters

// Import utilities
import { CacheWarmer, WarmingStrategy } from './warming/cache-warmer';

export interface UnifiedCacheConfig {
  // Base config properties
  provider: 'redis' | 'memory' | 'multi-tier' | 'browser';
  defaultTtlSec: number;
  keyPrefix?: string;
  maxMemoryMB?: number;
  enableMetrics?: boolean;
  enableCompression?: boolean;
  compressionThreshold?: number;

  // Extended properties
  // Adapter configurations
  memoryConfig?: MemoryAdapterConfig;
  redisConfig?: RedisAdapterConfig;
  browserConfig?: BrowserAdapterConfig;
  multiTierConfig?: MultiTierAdapterConfig;

  // Advanced features
  compressionOptions?: CompressionOptions;
  serializationOptions?: SerializationOptions;
  warmingStrategy?: WarmingStrategy;
  evictionOptions?: EvictionOptions;

  // Clustering
  enableClustering?: boolean;
  clusterNodes?: ClusterNode[];
  clusterOptions?: ClusterOptions;

  // Monitoring and metrics
  enableAdvancedMetrics?: boolean;
  metricsCollectionInterval?: number;
  healthCheckInterval?: number;

  // Circuit breaker
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  circuitBreakerResetTimeout?: number;
}

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

export interface ClusterOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableReadReplicas?: boolean;
  replicaCount?: number;
}

/**
 * Unified Cache Factory
 *
 * Creates and manages cache instances with comprehensive features including:
 * - Multiple adapter types (memory, Redis, browser, multi-tier)
 * - Advanced features (compression, tagging, warming, clustering)
 * - Comprehensive metrics and monitoring
 * - Circuit breaker pattern
 * - Event-driven architecture
 */
export class UnifiedCacheFactory extends EventEmitter {
  private static instance: UnifiedCacheFactory;
  private cacheInstances = new Map<string, CacheAdapter>();
  private metricsCollector: CacheMetricsCollector;
  private tagManager: CacheTagManager;
  private warmer: CacheWarmer;
  private clusterManager?: CacheClusterManager;
  private compressor: CacheCompressor;

  constructor(private config: UnifiedCacheConfig) {
    super();
    this.setMaxListeners(50);

    // Initialize core components
    const metricsConfig: any = {};
    if (config.enableAdvancedMetrics !== undefined) {
      metricsConfig.enableAdvancedMetrics = config.enableAdvancedMetrics;
    }
    if (config.metricsCollectionInterval !== undefined) {
      metricsConfig.collectionInterval = config.metricsCollectionInterval;
    }
    this.metricsCollector = new CacheMetricsCollector(metricsConfig);

    this.tagManager = new CacheTagManager();
    this.warmer = new CacheWarmer(config.warmingStrategy);
    this.compressor = new CacheCompressor(config.compressionOptions);

    // Initialize clustering if enabled
    if (config.enableClustering && config.clusterNodes) {
      const clusterConfig: any = {
        nodes: config.clusterNodes,
      };
      if (config.clusterOptions !== undefined) {
        clusterConfig.options = config.clusterOptions;
      }
      this.clusterManager = new CacheClusterManager(clusterConfig);
    }

    this.setupEventHandlers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config: UnifiedCacheConfig): UnifiedCacheFactory {
    if (!UnifiedCacheFactory.instance) {
      UnifiedCacheFactory.instance = new UnifiedCacheFactory(config);
    }
    return UnifiedCacheFactory.instance;
  }

  /**
   * Create cache instance based on configuration
   */
  async createCache(name: string = 'default'): Promise<Result<CacheAdapter, Error>> {
    try {
      if (this.cacheInstances.has(name)) {
        return ok(this.cacheInstances.get(name)!);
      }

      const adapter = await this.createAdapter();
      if (adapter.isErr()) {
        return adapter;
      }

      // Wrap with advanced features
      const enhancedAdapter = await this.enhanceAdapter(adapter.value, name);

      this.cacheInstances.set(name, enhancedAdapter);
      this.emit('cache:created', { name, adapter: enhancedAdapter });

      return ok(enhancedAdapter);
    } catch (error) {
      const cacheError = error instanceof Error ? error : new Error(String(error));
      this.emit('cache:error', { name, error: cacheError });
      return err(cacheError);
    }
  }

  /**
   * Get existing cache instance
   */
  getCache(name: string = 'default'): Result<CacheAdapter, Error> {
    const cache = this.cacheInstances.get(name);
    if (!cache) {
      return err(new Error(`Cache instance '${name}' not found`));
    }
    return ok(cache);
  }

  /**
   * Destroy cache instance
   */
  async destroyCache(name: string = 'default'): Promise<Result<void, Error>> {
    const cache = this.cacheInstances.get(name);
    if (!cache) {
      return err(new Error(`Cache instance '${name}' not found`));
    }

    try {
      if (typeof (cache as any).destroy === 'function') {
        await (cache as any).destroy();
      }

      this.cacheInstances.delete(name);
      this.emit('cache:destroyed', { name });

      return ok(undefined);
    } catch (error) {
      const cacheError = error instanceof Error ? error : new Error(String(error));
      return err(cacheError);
    }
  }

  /**
   * Get all cache instances
   */
  getAllCaches(): Map<string, CacheAdapter> {
    return new Map(this.cacheInstances);
  }

  /**
   * Get factory metrics
   */
  getMetrics(): {
    instances: number;
    totalOperations: number;
    totalErrors: number;
    uptime: number;
    clusterHealth?: any;
  } {
    const aggregatedMetrics = this.metricsCollector.getAggregatedMetrics();

    return {
      instances: this.cacheInstances.size,
      totalOperations: aggregatedMetrics.totalOperations || 0,
      totalErrors: aggregatedMetrics.totalErrors || 0,
      uptime: aggregatedMetrics.uptime || 0,
      clusterHealth: this.clusterManager?.getHealth(),
    };
  }

  /**
   * Warm up all caches
   */
  async warmUpAll(entries: Array<{
    cache: string;
    key: string;
    factory: () => Promise<any>;
    ttl?: number;
    tags?: string[];
  }>): Promise<Result<void, Error>> {
    try {
      const promises = entries.map(async ({ cache: cacheName, key, factory, ttl, tags }) => {
        const cacheResult = this.getCache(cacheName);
        if (cacheResult.isErr()) {
          throw cacheResult.error;
        }

        const value = await factory();
        await cacheResult.value.set(key, value, ttl);

        if (tags && tags.length > 0) {
          await this.tagManager.addTags(cacheName, key, tags);
        }
      });

      await Promise.allSettled(promises);
      return ok(undefined);
    } catch (error) {
      const cacheError = error instanceof Error ? error : new Error(String(error));
      return err(cacheError);
    }
  }

  /**
   * Invalidate by tags across all caches
   */
  async invalidateByTags(tags: string[]): Promise<Result<number, Error>> {
    try {
      let totalInvalidated = 0;

      for (const [, cache] of this.cacheInstances) {
        if (typeof (cache as any).invalidateByTags === 'function') {
          const count = await (cache as any).invalidateByTags(tags);
          totalInvalidated += count;
        }
      }

      return ok(totalInvalidated);
    } catch (error) {
      const cacheError = error instanceof Error ? error : new Error(String(error));
      return err(cacheError);
    }
  }

  /**
   * Get health status of all caches
   */
  async getHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    caches: Record<string, CacheHealthStatus>;
    cluster?: any;
  }> {
    const cacheHealth: Record<string, CacheHealthStatus> = {};

    for (const [name, cache] of this.cacheInstances) {
      if (typeof (cache as any).getHealth === 'function') {
        cacheHealth[name] = await (cache as any).getHealth();
      }
    }

    // Determine overall health
    const unhealthyCaches = Object.values(cacheHealth).filter(h => h.status === 'unhealthy').length;
    const degradedCaches = Object.values(cacheHealth).filter(h => h.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCaches > 0) {
      overall = 'unhealthy';
    } else if (degradedCaches > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      caches: cacheHealth,
      cluster: this.clusterManager?.getHealth(),
    };
  }

  /**
   * Shutdown factory and all caches
   */
  async shutdown(): Promise<Result<void, Error>> {
    try {
      const promises = Array.from(this.cacheInstances.keys()).map(name =>
        this.destroyCache(name)
      );

      await Promise.all(promises);

      if (this.clusterManager) {
        await this.clusterManager.shutdown();
      }

      this.metricsCollector.stop();
      this.removeAllListeners();

      return ok(undefined);
    } catch (error) {
      const cacheError = error instanceof Error ? error : new Error(String(error));
      return err(cacheError);
    }
  }

  // Private methods

  private async createAdapter(): Promise<Result<CacheAdapter, Error>> {
    const { provider } = this.config;

    switch (provider) {
      case 'memory':
        return this.createMemoryAdapter();

      case 'redis':
        return this.createRedisAdapter();

      case 'browser':
        return this.createBrowserAdapter();

      case 'multi-tier':
        return this.createMultiTierAdapter();

      default:
        return err(new Error(`Unsupported cache provider: ${provider}`));
    }
  }

  private async createMemoryAdapter(): Promise<Result<MemoryAdapter, Error>> {
    try {
      const config = this.config.memoryConfig || {};
      const adapterConfig: any = {
        maxSize: config.maxSize || 10000,
        cleanupInterval: config.cleanupInterval || 60000,
        enableLRU: config.enableLRU !== false,
        defaultTtlSec: config.defaultTtlSec || this.config.defaultTtlSec,
      };
      const keyPrefix = config.keyPrefix || this.config.keyPrefix;
      if (keyPrefix !== undefined) {
        adapterConfig.keyPrefix = keyPrefix;
      }
      const adapter = new MemoryAdapter(adapterConfig);

      return ok(adapter);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async createRedisAdapter(): Promise<Result<RedisAdapter, Error>> {
    try {
      const config = this.config.redisConfig;
      if (!config?.redisUrl) {
        return err(new Error('Redis URL is required for Redis adapter'));
      }

      const adapterConfig: any = {
        redisUrl: config.redisUrl,
        maxRetries: config.maxRetries || 3,
        retryDelayOnFailover: config.retryDelayOnFailover || 100,
        enableOfflineQueue: config.enableOfflineQueue ?? false,
        lazyConnect: config.lazyConnect ?? true,
        keepAlive: config.keepAlive || 30000,
        family: config.family || 4,
        db: config.db || 0,
        defaultTtlSec: config.defaultTtlSec || this.config.defaultTtlSec,
      };
      const keyPrefix = config.keyPrefix || this.config.keyPrefix;
      if (keyPrefix !== undefined) {
        adapterConfig.keyPrefix = keyPrefix;
      }
      const adapter = new RedisAdapter(adapterConfig);

      return ok(adapter);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async createBrowserAdapter(): Promise<Result<BrowserAdapter, Error>> {
    try {
      const config = this.config.browserConfig || {};
      const adapterConfig: any = {
        storageType: config.storageType || 'localStorage',
        maxSize: config.maxSize || 1000,
        defaultTtlSec: config.defaultTtlSec || this.config.defaultTtlSec,
      };
      const keyPrefix = config.keyPrefix || this.config.keyPrefix;
      if (keyPrefix !== undefined) {
        adapterConfig.keyPrefix = keyPrefix;
      }
      const adapter = new BrowserAdapter(adapterConfig);

      return ok(adapter);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async createMultiTierAdapter(): Promise<Result<MultiTierAdapter, Error>> {
    try {
      const config = this.config.multiTierConfig;
      if (!config) {
        return err(new Error('Multi-tier configuration is required'));
      }

      const adapterConfig: any = {
        l1Config: config.l1Config,
        l2Config: config.l2Config,
        promotionStrategy: config.promotionStrategy || 'lru',
        enableMetrics: config.enableMetrics ?? true,
      };
      const keyPrefix = config.keyPrefix || this.config.keyPrefix;
      if (keyPrefix !== undefined) {
        adapterConfig.keyPrefix = keyPrefix;
      }
      const adapter = new MultiTierAdapter(adapterConfig);

      return ok(adapter);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async enhanceAdapter(adapter: CacheAdapter, name: string): Promise<CacheAdapter> {
    // Wrap with compression if enabled
    if (this.config.enableCompression) {
      adapter = new CompressedCacheAdapter(adapter, this.compressor);
    }

    // Wrap with tagging support
    adapter = new TaggedCacheAdapter(adapter, this.tagManager, name);

    // Wrap with metrics collection
    adapter = new MetricsCacheAdapter(adapter, this.metricsCollector, name);

    // Wrap with circuit breaker if enabled
    if (this.config.enableCircuitBreaker) {
      adapter = new CircuitBreakerCacheAdapter(adapter, {
        threshold: this.config.circuitBreakerThreshold || 5,
        timeout: this.config.circuitBreakerTimeout || 60000,
        resetTimeout: this.config.circuitBreakerResetTimeout || 300000,
      });
    }

    // Wrap with clustering if enabled
    if (this.clusterManager) {
      adapter = await this.clusterManager.wrapAdapter(adapter, name);
    }

    return adapter;
  }

  private setupEventHandlers(): void {
    // Forward events from metrics collector
    this.metricsCollector.on('metrics:collected', (data) => {
      this.emit('factory:metrics', data);
    });

    // Forward events from warmer
    this.warmer.on('warming:complete', (data) => {
      this.emit('factory:warming:complete', data);
    });

    // Forward events from cluster manager
    if (this.clusterManager) {
      this.clusterManager.on('cluster:event', (data) => {
        this.emit('factory:cluster:event', data);
      });
    }
  }
}

// Enhanced adapter wrappers

class CompressedCacheAdapter implements CacheAdapter {
  readonly name: string;
  readonly version: string;
  readonly config: any;

  constructor(
    private adapter: CacheAdapter,
    private compressor: CacheCompressor
  ) {
    this.name = adapter.name || 'compressed-wrapper';
    this.version = adapter.version || '1.0.0';
    this.config = adapter.config || {};
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await this.adapter.get<T>(key);
    if (result === null) return null;

    // Decompress if needed
    const decompressed = await this.compressor.decompress(result);
    return decompressed;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Compress if needed
    const compressed = await this.compressor.compress(value);
    await this.adapter.set(key, compressed, ttl);
  }

  // Delegate other methods
  async del(key: string): Promise<boolean> {
    return this.adapter.del ? await this.adapter.del(key) : false;
  }

  async exists(key: string): Promise<boolean> {
    return this.adapter.exists ? await this.adapter.exists(key) : false;
  }

  async clear(): Promise<void> {
    if (this.adapter.clear) {
      await this.adapter.clear();
    }
  }

  getMetrics(): CacheMetrics {
    return this.adapter.getMetrics ? this.adapter.getMetrics() : {
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
      avgResponseTime: 0
    };
  }

  // Additional required methods
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    return this.adapter.mget ? await this.adapter.mget<T>(keys) : [];
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    if (this.adapter.mset) {
      await this.adapter.mset(entries);
    }
  }

  async mdel(keys: string[]): Promise<number> {
    return this.adapter.mdel ? await this.adapter.mdel(keys) : 0;
  }

  async increment(key: string, delta = 1): Promise<number> {
    return this.adapter.increment ? await this.adapter.increment(key, delta) : 0;
  }

  async decrement(key: string, delta = 1): Promise<number> {
    return this.adapter.decrement ? await this.adapter.decrement(key, delta) : 0;
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return this.adapter.expire ? await this.adapter.expire(key, ttlSeconds) : false;
  }

  async ttl(key: string): Promise<number> {
    return this.adapter.ttl ? await this.adapter.ttl(key) : -1;
  }
}

class TaggedCacheAdapter implements CacheAdapter {
  readonly name: string;
  readonly version: string;
  readonly config: any;

  constructor(
    private adapter: CacheAdapter,
    private tagManager: CacheTagManager,
    private cacheName: string
  ) {
    this.name = adapter.name || 'tagged-wrapper';
    this.version = adapter.version || '1.0.0';
    this.config = adapter.config || {};
  }

  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.adapter.set(key, value, ttl);
  }

  async del(key: string): Promise<boolean> {
    const result = await this.adapter.del ? await this.adapter.del(key) : false;
    if (result) {
      await this.tagManager.removeKey(this.cacheName, key);
    }
    return result;
  }

  async exists(key: string): Promise<boolean> {
    return this.adapter.exists ? await this.adapter.exists(key) : false;
  }

  async clear(): Promise<void> {
    if (this.adapter.clear) {
      await this.adapter.clear();
    }
  }

  getMetrics(): CacheMetrics {
    return this.adapter.getMetrics ? this.adapter.getMetrics() : {
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
      avgResponseTime: 0
    };
  }

  // Additional required methods
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    return this.adapter.mget ? await this.adapter.mget<T>(keys) : [];
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    if (this.adapter.mset) {
      await this.adapter.mset(entries);
    }
  }

  async mdel(keys: string[]): Promise<number> {
    return this.adapter.mdel ? await this.adapter.mdel(keys) : 0;
  }

  async increment(key: string, delta = 1): Promise<number> {
    return this.adapter.increment ? await this.adapter.increment(key, delta) : 0;
  }

  async decrement(key: string, delta = 1): Promise<number> {
    return this.adapter.decrement ? await this.adapter.decrement(key, delta) : 0;
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return this.adapter.expire ? await this.adapter.expire(key, ttlSeconds) : false;
  }

  async ttl(key: string): Promise<number> {
    return this.adapter.ttl ? await this.adapter.ttl(key) : -1;
  }
}

class MetricsCacheAdapter implements CacheAdapter {
  readonly name: string;
  readonly version: string;
  readonly config: any;

  constructor(
    private adapter: CacheAdapter,
    private metricsCollector: any,
    private cacheName: string
  ) {
    this.name = adapter.name || 'metrics-wrapper';
    this.version = adapter.version || '1.0.0';
    this.config = adapter.config || {};
  }

  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    try {
      const result = await this.adapter.get<T>(key);
      const duration = Date.now() - start;

      if (this.metricsCollector?.recordOperation) {
        this.metricsCollector.recordOperation(this.cacheName, 'get', true, duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      if (this.metricsCollector?.recordOperation) {
        this.metricsCollector.recordOperation(this.cacheName, 'get', false, duration);
      }
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const start = Date.now();
    try {
      await this.adapter.set(key, value, ttlSeconds);
      const duration = Date.now() - start;

      if (this.metricsCollector?.recordOperation) {
        this.metricsCollector.recordOperation(this.cacheName, 'set', true, duration);
      }
    } catch (error) {
      const duration = Date.now() - start;
      if (this.metricsCollector?.recordOperation) {
        this.metricsCollector.recordOperation(this.cacheName, 'set', false, duration);
      }
      throw error;
    }
  }

  async del(key: string): Promise<boolean> {
    const start = Date.now();
    try {
      const result = await this.adapter.del(key);
      const duration = Date.now() - start;

      if (this.metricsCollector?.recordOperation) {
        this.metricsCollector.recordOperation(this.cacheName, 'delete', true, duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      if (this.metricsCollector?.recordOperation) {
        this.metricsCollector.recordOperation(this.cacheName, 'delete', false, duration);
      }
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.adapter.exists ? await this.adapter.exists(key) : false;
  }

  async clear(): Promise<void> {
    return this.adapter.clear ? await this.adapter.clear() : undefined;
  }

  // Additional required methods from CacheService interface
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    return this.adapter.mget ? await this.adapter.mget<T>(keys) : [];
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    if (this.adapter.mset) {
      await this.adapter.mset(entries);
    }
  }

  async mdel(keys: string[]): Promise<number> {
    if (this.adapter.mdel) {
      return await this.adapter.mdel(keys);
    }
    return 0;
  }

  async increment(key: string, delta = 1): Promise<number> {
    return this.adapter.increment ? await this.adapter.increment(key, delta) : 0;
  }

  async decrement(key: string, delta = 1): Promise<number> {
    return this.adapter.decrement ? await this.adapter.decrement(key, delta) : 0;
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return this.adapter.expire ? await this.adapter.expire(key, ttlSeconds) : false;
  }

  async ttl(key: string): Promise<number> {
    return this.adapter.ttl ? await this.adapter.ttl(key) : -1;
  }

  async getHealth(): Promise<any> {
    return this.adapter.getHealth ? await this.adapter.getHealth() : { status: 'unknown' };
  }

  getMetrics(): any {
    const baseMetrics = this.adapter.getMetrics ? this.adapter.getMetrics() : {
      hits: 0,
      misses: 0,
      hitRate: 0,
      operations: 0,
      errors: 0,
      memoryUsage: 0,
      keyCount: 0,
      avgLatency: 0,
      maxLatency: 0,
      minLatency: 0
    };

    // Add avgResponseTime if missing
    return {
      ...baseMetrics,
      avgResponseTime: baseMetrics.avgLatency || 0
    };
  }
}

class CircuitBreakerCacheAdapter implements CacheAdapter {
  readonly name: string;
  readonly version: string;
  readonly config: any;

  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private adapter: CacheAdapter,
    private circuitConfig: {
      threshold: number;
      timeout: number;
      resetTimeout: number;
    }
  ) {
    this.name = adapter.name || 'circuit-breaker-wrapper';
    this.version = adapter.version || '1.0.0';
    this.config = adapter.config || {};
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.circuitConfig.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await this.adapter.get<T>(key);

      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      await this.adapter.set(key, value, ttlSeconds);

      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async del(key: string): Promise<boolean> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await this.adapter.del(key);
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.circuitConfig.threshold) {
      this.state = 'open';
    }
  }

  // Delegate other methods
  async exists(key: string): Promise<boolean> {
    return this.adapter.exists ? await this.adapter.exists(key) : false;
  }

  async clear(): Promise<void> {
    return this.adapter.clear ? await this.adapter.clear() : undefined;
  }

  // Additional required methods from CacheService interface
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    return this.adapter.mget ? await this.adapter.mget<T>(keys) : [];
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    if (this.adapter.mset) {
      await this.adapter.mset(entries);
    }
  }

  async mdel(keys: string[]): Promise<number> {
    return this.adapter.mdel ? await this.adapter.mdel(keys) : 0;
  }

  async increment(key: string, delta = 1): Promise<number> {
    return this.adapter.increment ? await this.adapter.increment(key, delta) : 0;
  }

  async decrement(key: string, delta = 1): Promise<number> {
    return this.adapter.decrement ? await this.adapter.decrement(key, delta) : 0;
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return this.adapter.expire ? await this.adapter.expire(key, ttlSeconds) : false;
  }

  async ttl(key: string): Promise<number> {
    return this.adapter.ttl ? await this.adapter.ttl(key) : -1;
  }

  async getHealth(): Promise<any> {
    return this.adapter.getHealth ? await this.adapter.getHealth() : { status: 'unknown' };
  }

  getMetrics(): any {
    const baseMetrics = this.adapter.getMetrics ? this.adapter.getMetrics() : {
      hits: 0,
      misses: 0,
      hitRate: 0,
      operations: 0,
      errors: 0,
      memoryUsage: 0,
      keyCount: 0,
      avgLatency: 0,
      maxLatency: 0,
      minLatency: 0
    };

    return {
      ...baseMetrics,
      avgResponseTime: baseMetrics.avgLatency || 0
    };
  }
}

// Export convenience functions

export function createUnifiedCache(config: unknown): Promise<any> {
  // Create a simple factory instance for now
  const factory = new UnifiedCacheFactory(config);
  return factory.createCache('default');
}

export function getUnifiedCache(_name: string = 'default'): any {
  // Return a simple error for now
  throw new Error('Cache factory not initialized');
}

export async function shutdownUnifiedCache(): Promise<Result<void, Error>> {
  // Note: shutdownUnifiedCache needs a config to get the instance
  // For now, return ok since we can't shutdown without config
  return ok(undefined);
}



