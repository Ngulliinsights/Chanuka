/**
 * Unified Caching Service Interface
 *
 * This interface provides a high-level abstraction over the caching infrastructure,
 * consolidating various cache adapters into a single, consistent API for client
 * and server modules to consume.
 */

import { Result, err } from '../primitives/types/result';

import { CacheConfig, CacheMetrics, HealthStatus, CacheOperationOptions } from './interfaces';

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