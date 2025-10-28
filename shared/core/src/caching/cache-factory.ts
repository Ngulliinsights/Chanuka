/**
 * Unified Cache Factory
 *
 * Comprehensive cache factory that combines the best features from all existing
 * cache implementations with adapter pattern, advanced features, and clustering support.
 */

import { EventEmitter } from 'events';
import { Result, ok, err } from '../primitives/types/result';
import { logger } from '../observability/logging';
import type {
  CacheAdapter,
  CacheMetrics,
  CacheHealthStatus,
  CacheEvent,
  CacheEventType,
  CacheConfig,
  CacheOptions,
  CacheEntry,
  CacheWarmingStrategy,
  EvictionOptions,
  CompressionOptions,
  SerializationOptions
} from './interfaces';

// Import adapters
import { MemoryAdapter } from './adapters/memory-adapter';
import { RedisAdapter } from './adapters/redis-adapter';
import { MultiTierAdapter } from './adapters/multi-tier-adapter';
import { BrowserAdapter } from './adapters/browser-adapter';

// Import utilities
import { CacheCompressor } from './utils/compression';
import { CacheSerializer } from './utils/serialization';
import { CacheMetricsCollector } from './utils/metrics';
import { CacheTagManager } from './utils/tag-manager';
import { CacheWarmer } from './utils/warmer';
import { CacheClusterManager } from './utils/cluster-manager';

export interface UnifiedCacheConfig extends CacheConfig {
  // Adapter configurations
  memoryConfig?: MemoryAdapterConfig;
  redisConfig?: RedisAdapterConfig;
  browserConfig?: BrowserAdapterConfig;
  multiTierConfig?: MultiTierAdapterConfig;

  // Advanced features
  enableCompression?: boolean;
  compressionOptions?: CompressionOptions;
  serializationOptions?: SerializationOptions;
  warmingStrategy?: CacheWarmingStrategy;
  evictionOptions?: EvictionOptions;

  // Clustering
  enableClustering?: boolean;
  clusterNodes?: string[];
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
  private serializer: CacheSerializer;

  constructor(private config: UnifiedCacheConfig) {
    super();
    this.setMaxListeners(50);

    // Initialize core components
    this.metricsCollector = new CacheMetricsCollector({
      enableAdvancedMetrics: config.enableAdvancedMetrics,
      collectionInterval: config.metricsCollectionInterval,
    });

    this.tagManager = new CacheTagManager();
    this.warmer = new CacheWarmer(config.warmingStrategy);
    this.compressor = new CacheCompressor(config.compressionOptions);
    this.serializer = new CacheSerializer(config.serializationOptions);

    // Initialize clustering if enabled
    if (config.enableClustering && config.clusterNodes) {
      this.clusterManager = new CacheClusterManager({
        nodes: config.clusterNodes,
        options: config.clusterOptions,
      });
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
      totalOperations: aggregatedMetrics.totalOperations,
      totalErrors: aggregatedMetrics.totalErrors,
      uptime: aggregatedMetrics.uptime,
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

      for (const [name, cache] of this.cacheInstances) {
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
      const adapter = new MemoryAdapter({
        maxSize: config.maxSize || 10000,
        cleanupInterval: config.cleanupInterval || 60000,
        enableLRU: config.enableLRU !== false,
        keyPrefix: config.keyPrefix || this.config.keyPrefix,
        defaultTtlSec: config.defaultTtlSec || this.config.defaultTtlSec,
      });

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

      const adapter = new RedisAdapter({
        redisUrl: config.redisUrl,
        maxRetries: config.maxRetries || 3,
        retryDelayOnFailover: config.retryDelayOnFailover || 100,
        enableOfflineQueue: config.enableOfflineQueue ?? false,
        lazyConnect: config.lazyConnect ?? true,
        keepAlive: config.keepAlive || 30000,
        family: config.family || 4,
        db: config.db || 0,
        keyPrefix: config.keyPrefix || this.config.keyPrefix,
        defaultTtlSec: config.defaultTtlSec || this.config.defaultTtlSec,
      });

      return ok(adapter);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async createBrowserAdapter(): Promise<Result<BrowserAdapter, Error>> {
    try {
      const config = this.config.browserConfig || {};
      const adapter = new BrowserAdapter({
        storageType: config.storageType || 'localStorage',
        maxSize: config.maxSize || 1000,
        keyPrefix: config.keyPrefix || this.config.keyPrefix,
        defaultTtlSec: config.defaultTtlSec || this.config.defaultTtlSec,
      });

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

      const adapter = new MultiTierAdapter({
        l1Config: config.l1Config,
        l2Config: config.l2Config,
        promotionStrategy: config.promotionStrategy || 'hybrid',
        enableMetrics: config.enableMetrics ?? true,
        keyPrefix: config.keyPrefix || this.config.keyPrefix,
      });

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
  constructor(
    private adapter: CacheAdapter,
    private compressor: CacheCompressor
  ) {}

  async get<T>(key: string): Promise<Result<T | null, Error>> {
    const result = await this.adapter.get<T>(key);
    if (result.isErr()) return result;

    if (result.value === null) return ok(null);

    // Decompress if needed
    const decompressed = await this.compressor.decompress(result.value);
    return decompressed;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<Result<void, Error>> {
    // Compress if needed
    const compressed = await this.compressor.compress(value);
    if (compressed.isErr()) return compressed;

    return this.adapter.set(key, compressed.value, ttl);
  }

  // Delegate other methods
  async delete(key: string): Promise<Result<void, Error>> {
    return this.adapter.delete(key);
  }

  async exists(key: string): Promise<Result<boolean, Error>> {
    return this.adapter.exists(key);
  }

  async clear(): Promise<Result<void, Error>> {
    return this.adapter.clear();
  }

  async initialize(): Promise<Result<void, Error>> {
    return this.adapter.initialize();
  }

  async shutdown(): Promise<Result<void, Error>> {
    return this.adapter.shutdown();
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.adapter.healthCheck();
  }

  getMetrics(): CacheMetrics {
    return this.adapter.getMetrics();
  }
}

class TaggedCacheAdapter implements CacheAdapter {
  constructor(
    private adapter: CacheAdapter,
    private tagManager: CacheTagManager,
    private cacheName: string
  ) {}

  async set<T>(key: string, value: T, ttl?: number, options?: CacheOptions): Promise<Result<void, Error>> {
    const result = await this.adapter.set(key, value, ttl);
    if (result.isOk() && options?.tags) {
      await this.tagManager.addTags(this.cacheName, key, options.tags);
    }
    return result;
  }

  async delete(key: string): Promise<Result<void, Error>> {
    const result = await this.adapter.delete(key);
    if (result.isOk()) {
      await this.tagManager.removeKey(this.cacheName, key);
    }
    return result;
  }

  async invalidateByTags(tags: string[]): Promise<Result<number, Error>> {
    const keys = await this.tagManager.getKeysByTags(this.cacheName, tags);
    let deleted = 0;

    for (const key of keys) {
      const result = await this.adapter.delete(key);
      if (result.isOk()) deleted++;
    }

    return ok(deleted);
  }

  // Delegate other methods
  async get<T>(key: string): Promise<Result<T | null, Error>> {
    return this.adapter.get<T>(key);
  }

  async exists(key: string): Promise<Result<boolean, Error>> {
    return this.adapter.exists(key);
  }

  async clear(): Promise<Result<void, Error>> {
    await this.tagManager.clearCache(this.cacheName);
    return this.adapter.clear();
  }

  async initialize(): Promise<Result<void, Error>> {
    return this.adapter.initialize();
  }

  async shutdown(): Promise<Result<void, Error>> {
    return this.adapter.shutdown();
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.adapter.healthCheck();
  }

  getMetrics(): CacheMetrics {
    return this.adapter.getMetrics();
  }
}

class MetricsCacheAdapter implements CacheAdapter {
  constructor(
    private adapter: CacheAdapter,
    private metricsCollector: CacheMetricsCollector,
    private cacheName: string
  ) {}

  async get<T>(key: string): Promise<Result<T | null, Error>> {
    const start = Date.now();
    const result = await this.adapter.get<T>(key);
    const duration = Date.now() - start;

    this.metricsCollector.recordOperation(this.cacheName, 'get', result.isOk(), duration);

    return result;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<Result<void, Error>> {
    const start = Date.now();
    const result = await this.adapter.set(key, value, ttl);
    const duration = Date.now() - start;

    this.metricsCollector.recordOperation(this.cacheName, 'set', result.isOk(), duration);

    return result;
  }

  async delete(key: string): Promise<Result<void, Error>> {
    const start = Date.now();
    const result = await this.adapter.delete(key);
    const duration = Date.now() - start;

    this.metricsCollector.recordOperation(this.cacheName, 'delete', result.isOk(), duration);

    return result;
  }

  // Delegate other methods
  async exists(key: string): Promise<Result<boolean, Error>> {
    return this.adapter.exists(key);
  }

  async clear(): Promise<Result<void, Error>> {
    return this.adapter.clear();
  }

  async initialize(): Promise<Result<void, Error>> {
    return this.adapter.initialize();
  }

  async shutdown(): Promise<Result<void, Error>> {
    return this.adapter.shutdown();
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.adapter.healthCheck();
  }

  getMetrics(): CacheMetrics {
    return this.adapter.getMetrics();
  }
}

class CircuitBreakerCacheAdapter implements CacheAdapter {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private adapter: CacheAdapter,
    private config: {
      threshold: number;
      timeout: number;
      resetTimeout: number;
    }
  ) {}

  async get<T>(key: string): Promise<Result<T | null, Error>> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.config.resetTimeout) {
        this.state = 'half-open';
      } else {
        return err(new Error('Circuit breaker is open'));
      }
    }

    const result = await this.adapter.get<T>(key);

    if (result.isErr()) {
      this.recordFailure();
    } else if (this.state === 'half-open') {
      this.state = 'closed';
      this.failures = 0;
    }

    return result;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<Result<void, Error>> {
    if (this.state === 'open') {
      return err(new Error('Circuit breaker is open'));
    }

    const result = await this.adapter.set(key, value, ttl);

    if (result.isErr()) {
      this.recordFailure();
    } else if (this.state === 'half-open') {
      this.state = 'closed';
      this.failures = 0;
    }

    return result;
  }

  async delete(key: string): Promise<Result<void, Error>> {
    if (this.state === 'open') {
      return err(new Error('Circuit breaker is open'));
    }

    const result = await this.adapter.delete(key);

    if (result.isErr()) {
      this.recordFailure();
    }

    return result;
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.config.threshold) {
      this.state = 'open';
    }
  }

  // Delegate other methods
  async exists(key: string): Promise<Result<boolean, Error>> {
    return this.adapter.exists(key);
  }

  async clear(): Promise<Result<void, Error>> {
    return this.adapter.clear();
  }

  async initialize(): Promise<Result<void, Error>> {
    return this.adapter.initialize();
  }

  async shutdown(): Promise<Result<void, Error>> {
    return this.adapter.shutdown();
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.adapter.healthCheck();
  }

  getMetrics(): CacheMetrics {
    return this.adapter.getMetrics();
  }
}

// Export convenience functions

export function createUnifiedCache(config: UnifiedCacheConfig): Promise<Result<CacheAdapter, Error>> {
  const factory = UnifiedCacheFactory.getInstance(config);
  return factory.createCache();
}

export function getUnifiedCache(name: string = 'default'): Result<CacheAdapter, Error> {
  const factory = UnifiedCacheFactory.instance;
  if (!factory) {
    return err(new Error('Cache factory not initialized'));
  }
  return factory.getCache(name);
}

export async function shutdownUnifiedCache(): Promise<Result<void, Error>> {
  const factory = UnifiedCacheFactory.instance;
  if (!factory) {
    return ok(undefined);
  }
  return factory.shutdown();
}
