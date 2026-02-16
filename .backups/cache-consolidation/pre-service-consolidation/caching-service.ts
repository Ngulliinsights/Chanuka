/**
 * Unified Caching Service Implementation
 *
 * Implementation of the ICachingService interface that wraps the existing
 * cache infrastructure and provides a unified API for client and server modules.
 */

import { BaseError } from '../observability/error-management/errors/base-error';
import { Result, ok, err } from '../primitives/types/result';

import { createCacheService } from './factory';
import {
  ICachingService,
  CachingServiceRegistry
} from './icaching-service';
import {
  CacheAdapter,
  CacheConfig,
  CacheMetrics,
  HealthStatus,
  CacheOperationOptions
} from './interfaces';
/*
import { // Unused import
  CacheService,
  CacheAdapterConfig
} from './core/interfaces';
*/

/**
 * Cache operation error
 */
export class CacheOperationError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, { code: 'CACHE_OPERATION_ERROR', ...(cause && { cause }) });
  }
}

/**
 * Unified Caching Service Implementation
 *
 * Wraps the existing cache infrastructure to provide a consistent,
 * high-level API for caching operations.
 */
export class CachingService implements ICachingService {
  private adapter!: CacheAdapter;
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

      // Initialize the adapter
      const initResult = await this.adapter.initialize();
      if (initResult.isErr()) {
        return err(new CacheOperationError('Failed to initialize cache adapter', initResult.error));
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
      return await this.adapter.get<T>(key);
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
      return await this.adapter.set(key, value, ttl);
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
      return await this.adapter.delete(key);
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
      return await this.adapter.clear();
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
      return await this.adapter.exists(key);
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

      // For now, implement with individual gets
      // TODO: Optimize with batch operations when available
      for (const key of keys) {
        const valueResult = await this.adapter.get<T>(key);
        if (valueResult.isOk()) {
          result.set(key, valueResult.value);
        } else {
          result.set(key, null);
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

      // For now, implement with individual sets
      // TODO: Optimize with batch operations when available
      for (const [key, value] of entries) {
        const result = await this.adapter.set(key, value, ttl);
        if (result.isErr()) {
          return err(new CacheOperationError(`Failed to set cache key: ${key}`, result.error));
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
      // For now, implement with individual deletes
      // TODO: Optimize with batch operations when available
      for (const key of keys) {
        const result = await this.adapter.delete(key);
        if (result.isErr()) {
          return err(new CacheOperationError(`Failed to delete cache key: ${key}`, result.error));
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
      const getResult = await this.adapter.get<T>(key);
      if (getResult.isOk() && getResult.value !== null) {
        return ok(getResult.value);
      }

      // Value not found, generate it
      const value = await factory();

      // Cache the generated value
      const setResult = await this.adapter.set(key, value, options?.ttl);
      if (setResult.isErr()) {
        // Log the error but still return the value
        console.warn(`Failed to cache generated value for key: ${key}`, setResult.error);
      }

      return ok(value);
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
      return await this.adapter.healthCheck();
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
    return this.adapter.getMetrics();
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
      const result = await this.adapter.shutdown();
      if (result.isErr()) {
        return err(new CacheOperationError('Failed to shutdown cache adapter', result.error));
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
  private async createAdapter(): Promise<Result<CacheAdapter>> {
    try {
      // Convert the config to the core format expected by the factory
      const coreConfig = this.convertToCoreConfig(this.config);

      // Use the existing factory to create the adapter
      // Note: This assumes the factory returns a CacheAdapter, but it actually returns CacheService
      // We'll need to adapt this
      const service = createCacheService(coreConfig);

      // For now, we'll cast it - this needs to be fixed in the factory
      return ok(service as any as CacheAdapter);
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
