/**
 * Unified Caching Service
 *
 * This module provides both the interface and implementation for the unified
 * caching service, consolidating the cache infrastructure into a single,
 * consistent API for client and server modules.
 */

import { Result, ok, err } from '@shared/core/primitives/types/result';

import { createCacheService } from './factory';
import type { CacheService } from './core/interfaces';
import {
  CacheConfig,
  CacheMetrics,
  HealthStatus,
  CacheOperationOptions
} from './interfaces';

/**
 * Cache operation error
 */
export class CacheOperationError extends Error {
  constructor(message: string, public override cause?: Error) {
    super(message);
    this.name = 'CacheOperationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheOperationError);
    }
  }
}

/**
 * Unified Caching Service Interface
 *
 * Provides a consistent, high-level API for caching operations across the application.
 * This interface abstracts away the complexity of different cache implementations
 * (memory, Redis, multi-tier) and provides a unified interface for all caching needs.
 */
export interface ICachingService {
  /**
   * Retrieve a value from the cache
   *
   * @param key - The cache key to retrieve
   * @param options - Optional operation parameters
   * @returns Result containing the cached value or null if not found
   */
  get<T>(key: string, options?: CacheOperationOptions): Promise<Result<T | null>>;

  /**
   * Store a value in the cache
   *
   * @param key - The cache key to store under
   * @param value - The value to cache
   * @param options - Optional operation parameters including TTL
   * @returns Result indicating success or failure
   */
  set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<Result<void>>;

  /**
   * Remove a value from the cache
   *
   * @param key - The cache key to remove
   * @returns Result indicating success or failure
   */
  delete(key: string): Promise<Result<void>>;

  /**
   * Remove all entries from the cache
   *
   * @returns Result indicating success or failure
   */
  clear(): Promise<Result<void>>;

  /**
   * Check if a key exists in the cache
   *
   * @param key - The cache key to check
   * @returns Result containing boolean indicating existence
   */
  exists(key: string): Promise<Result<boolean>>;

  /**
   * Get multiple values from the cache in a single operation
   *
   * @param keys - Array of cache keys to retrieve
   * @param options - Optional operation parameters
   * @returns Result containing a map of keys to values (null if not found)
   */
  getMany<T>(keys: string[], options?: CacheOperationOptions): Promise<Result<Map<string, T | null>>>;

  /**
   * Store multiple values in the cache in a single operation
   *
   * @param entries - Map of keys to values to cache
   * @param options - Optional operation parameters including TTL
   * @returns Result indicating success or failure
   */
  setMany<T>(entries: Map<string, T>, options?: CacheOperationOptions): Promise<Result<void>>;

  /**
   * Delete multiple keys from the cache in a single operation
   *
   * @param keys - Array of cache keys to delete
   * @returns Result indicating success or failure
   */
  deleteMany(keys: string[]): Promise<Result<void>>;

  /**
   * Get or set a value with a factory function (cache-aside pattern)
   *
   * @param key - The cache key
   * @param factory - Function to generate the value if not cached
   * @param options - Optional operation parameters including TTL
   * @returns Result containing the cached or newly generated value
   */
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOperationOptions
  ): Promise<Result<T>>;

  /**
   * Perform a health check on the cache service
   *
   * @returns Promise resolving to health status information
   */
  healthCheck(): Promise<HealthStatus>;

  /**
   * Get current performance metrics
   *
   * @returns Current cache metrics
   */
  getMetrics(): CacheMetrics;

  /**
   * Get the cache configuration
   *
   * @returns The current cache configuration
   */
  getConfig(): CacheConfig;

  /**
   * Check if the cache service is ready for operations
   *
   * @returns True if the service is initialized and operational
   */
  isReady(): boolean;

  /**
   * Gracefully shutdown the cache service
   *
   * @returns Result indicating successful shutdown
   */
  shutdown(): Promise<Result<void>>;
}

/**
 * Factory function type for creating caching services
 */
export type CachingServiceFactory = (config: CacheConfig) => Promise<Result<ICachingService>>;

/**
 * Registry for caching service factories
 */
export class CachingServiceRegistry {
  private static factories = new Map<string, CachingServiceFactory>();

  /**
   * Register a caching service factory
   */
  static register(type: string, factory: CachingServiceFactory): void {
    this.factories.set(type, factory);
  }

  /**
   * Create a caching service instance
   */
  static async create(type: string, config: CacheConfig): Promise<Result<ICachingService>> {
    const factory = this.factories.get(type);
    if (!factory) {
      return err(new Error(`No caching service factory registered for type: ${type}`));
    }
    return factory(config);
  }

  /**
   * Get registered factory types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Unified Caching Service Implementation
 *
 * Wraps the existing cache infrastructure to provide a consistent,
 * high-level API for caching operations.
 */
export class CachingService implements ICachingService {
  private adapter!: CacheService;
  private config: CacheConfig;
  private initialized = false;

  constructor(config: CacheConfig) {
    this.config = config;
    // We'll initialize the adapter in the initialize method
  }

  /**
   * Initialize the caching service
   */
  async initialize(): Promise<Result<void>> {
    try {
      if (this.initialized) {
        return ok(undefined);
      }

      // Create the cache adapter using the existing factory
      const adapterResult = await this.createAdapter();
      if (adapterResult.isErr()) {
        return err(new CacheOperationError('Failed to create cache adapter', adapterResult.error));
      }

      this.adapter = adapterResult.value;

      // If the adapter has a connect method, call it
      if ('connect' in this.adapter && typeof this.adapter.connect === 'function') {
        await this.adapter.connect();
      }

      this.initialized = true;
      return ok(undefined);
    } catch (error) {
      return err(new CacheOperationError('Failed to initialize caching service', error as Error));
    }
  }

  /**
   * Get a value from the cache
   */
  async get<T>(key: string, _options?: CacheOperationOptions): Promise<Result<T | null>> {
    this.ensureInitialized();
    try {
      const value = await this.adapter.get<T>(key);
      return ok(value);
    } catch (error) {
      return err(new CacheOperationError(`Failed to get cache key: ${key}`, error as Error));
    }
  }

  /**
   * Set a value in the cache
   */
  async set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<Result<void>> {
    this.ensureInitialized();
    try {
      const ttl = options?.ttl;
      await this.adapter.set(key, value, ttl);
      return ok(undefined);
    } catch (error) {
      return err(new CacheOperationError(`Failed to set cache key: ${key}`, error as Error));
    }
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<Result<void>> {
    this.ensureInitialized();
    try {
      await this.adapter.del(key);
      return ok(undefined);
    } catch (error) {
      return err(new CacheOperationError(`Failed to delete cache key: ${key}`, error as Error));
    }
  }

  /**
   * Clear all entries from the cache
   */
  async clear(): Promise<Result<void>> {
    this.ensureInitialized();
    try {
      if (this.adapter.clear) {
        await this.adapter.clear();
      }
      return ok(undefined);
    } catch (error) {
      return err(new CacheOperationError('Failed to clear cache', error as Error));
    }
  }

  /**
   * Check if a key exists in the cache
   */
  async exists(key: string): Promise<Result<boolean>> {
    this.ensureInitialized();
    try {
      const exists = await this.adapter.exists(key);
      return ok(exists);
    } catch (error) {
      return err(new CacheOperationError(`Failed to check existence of key: ${key}`, error as Error));
    }
  }

  /**
   * Get multiple values from the cache
   */
  async getMany<T>(keys: string[], _options?: CacheOperationOptions): Promise<Result<Map<string, T | null>>> {
    this.ensureInitialized();
    try {
      const result = new Map<string, T | null>();

      // Use mget if available, otherwise fall back to individual gets
      if (this.adapter.mget) {
        const values = await this.adapter.mget<T>(keys);
        keys.forEach((key, index) => {
          result.set(key, values[index] ?? null);
        });
      } else {
        for (const key of keys) {
          try {
            const value = await this.adapter.get<T>(key);
            result.set(key, value);
          } catch {
            result.set(key, null);
          }
        }
      }

      return ok(result);
    } catch (error) {
      return err(new CacheOperationError('Failed to get multiple cache keys', error as Error));
    }
  }

  /**
   * Set multiple values in the cache
   */
  async setMany<T>(entries: Map<string, T>, options?: CacheOperationOptions): Promise<Result<void>> {
    this.ensureInitialized();
    try {
      const ttl = options?.ttl;

      // Use mset if available, otherwise fall back to individual sets
      if (this.adapter.mset) {
        const entriesArray = Array.from(entries.entries()).map(([key, value]) => {
          const entry: { key: string; value: T; ttl?: number } = { key, value };
          if (ttl !== undefined) {
            entry.ttl = ttl;
          }
          return entry;
        });
        await this.adapter.mset(entriesArray);
      } else {
        for (const [key, value] of entries) {
          await this.adapter.set(key, value, ttl);
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(new CacheOperationError('Failed to set multiple cache keys', error as Error));
    }
  }

  /**
   * Delete multiple keys from the cache
   */
  async deleteMany(keys: string[]): Promise<Result<void>> {
    this.ensureInitialized();
    try {
      // Use mdel if available, otherwise fall back to individual deletes
      if (this.adapter.mdel) {
        await this.adapter.mdel(keys);
      } else {
        for (const key of keys) {
          await this.adapter.del(key);
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(new CacheOperationError('Failed to delete multiple cache keys', error as Error));
    }
  }

  /**
   * Get or set a value with a factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOperationOptions
  ): Promise<Result<T>> {
    this.ensureInitialized();
    try {
      // Try to get the value first
      const value = await this.adapter.get<T>(key);
      if (value !== null) {
        return ok(value);
      }

      // Value not found, generate it
      const newValue = await factory();

      // Cache the generated value
      try {
        await this.adapter.set(key, newValue, options?.ttl);
      } catch (error) {
        // Log the error but still return the value
        console.warn(`Failed to cache generated value for key: ${key}`, error);
      }

      return ok(newValue);
    } catch (error) {
      return err(new CacheOperationError(`Failed to get or set cache key: ${key}`, error as Error));
    }
  }

  /**
   * Perform a health check
   */
  async healthCheck(): Promise<HealthStatus> {
    this.ensureInitialized();
    try {
      if (this.adapter.getHealth) {
        const health = await this.adapter.getHealth();
        const details: HealthStatus['details'] = {};
        
        if (health.connected !== undefined) {
          details.connected = health.connected;
        }
        if (health.memory !== undefined) {
          details.memory = health.memory;
        }
        if (health.lastError) {
          details.lastError = {
            message: health.lastError,
            timestamp: new Date()
          };
        }
        
        return {
          status: health.status,
          latency: health.latency,
          details,
          timestamp: new Date()
        };
      }
      
      // Fallback health check
      return {
        status: 'healthy',
        latency: 0,
        details: {},
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: 0,
        details: {
          error: {
            message: `Health check failed: ${error}`,
            timestamp: new Date()
          }
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CacheMetrics {
    this.ensureInitialized();
    if (this.adapter.getMetrics) {
      const metrics = this.adapter.getMetrics();
      return {
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: metrics.hitRate,
        averageLatency: metrics.avgLatency || metrics.avgResponseTime || 0,
        errors: metrics.errors,
        totalOperations: metrics.operations || metrics.totalOperations || 0,
        entryCount: metrics.keyCount || metrics.totalEntries || 0,
        memoryUsage: metrics.memoryUsage || 0,
        lastUpdated: new Date()
      };
    }
    
    // Return default metrics if not available
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      averageLatency: 0,
      errors: 0,
      totalOperations: 0,
      entryCount: 0,
      memoryUsage: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Get the cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown the caching service
   */
  async shutdown(): Promise<Result<void>> {
    if (!this.initialized) {
      return ok(undefined);
    }

    try {
      if (this.adapter.disconnect) {
        await this.adapter.disconnect();
      } else if (this.adapter.destroy) {
        await this.adapter.destroy();
      }

      this.initialized = false;
      return ok(undefined);
    } catch (error) {
      return err(new CacheOperationError('Failed to shutdown caching service', error as Error));
    }
  }

  /**
   * Ensure the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new CacheOperationError('Caching service not initialized. Call initialize() first.');
    }
  }

  /**
   * Create the cache adapter
   */
  private async createAdapter(): Promise<Result<CacheService>> {
    try {
      // Convert the config to the core format expected by the factory
      const coreConfig = this.convertToCoreConfig(this.config);

      // Use the existing factory to create the service
      const service = createCacheService(coreConfig);

      return ok(service);
    } catch (error) {
      return err(new CacheOperationError('Failed to create cache adapter', error as Error));
    }
  }

  /**
   * Convert the unified config to the core config format
   */
  private convertToCoreConfig(config: CacheConfig): import('./core/interfaces').CacheConfig {
    // Map the unified config to the core config
    const coreConfig: any = {
      provider: config.type || 'memory',
      keyPrefix: config.keyPrefix,
      defaultTtlSec: config.defaultTtl,
      enableMetrics: config.enableMetrics,
    };

    // Handle type-specific properties
    if (config.type === 'memory') {
      coreConfig.maxMemoryMB = config.maxMemoryMB;
    } else if (config.type === 'redis') {
      coreConfig.redisUrl = config.host ? `redis://${config.host}:${config.port || 6379}` : undefined;
    } else if (config.type === 'multi-tier') {
      coreConfig.l1MaxSizeMB = config.l1Config?.maxMemoryMB;
      coreConfig.redisUrl = config.l2Config?.host ? `redis://${config.l2Config.host}:${config.l2Config.port || 6379}` : undefined;
    }

    return coreConfig;
  }
}

/**
 * Factory function for creating caching services
 */
export async function createCachingService(config: CacheConfig): Promise<Result<ICachingService>> {
  try {
    const service = new CachingService(config);
    const initResult = await service.initialize();
    if (initResult.isErr()) {
      return err(initResult.error);
    }
    return ok(service);
  } catch (error) {
    return err(new CacheOperationError('Failed to create caching service', error as Error));
  }
}

// Register the default caching service factory
CachingServiceRegistry.register('default', createCachingService);