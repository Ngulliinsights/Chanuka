/**
 * Unified Cache Interfaces
 * 
 * Core interfaces for the refined cache system using Result types for explicit error handling.
 * These interfaces replace the existing CacheService and CacheAdapter interfaces with a
 * more robust design that follows functional programming principles.
 */

import { Result } from '../primitives/types/result';

/**
 * Health status for cache adapters
 * 
 * Provides structured information about the health and performance of a cache adapter.
 * Used by the healthCheck() method to report current operational status.
 * 
 * Valid status values:
 * - 'healthy': All systems operational, no issues detected
 * - 'degraded': Operational but with performance issues or warnings
 * - 'unhealthy': Critical issues preventing normal operation
 * 
 * Valid latency range: 0-10000ms (values above 10s indicate severe issues)
 */
export interface HealthStatus {
  /** 
   * Overall health status of the cache adapter
   * - healthy: All operations working normally
   * - degraded: Working but with performance issues
   * - unhealthy: Critical failures preventing operation
   */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** 
   * Response latency in milliseconds for the last health check operation
   * Range: 0-10000ms (typical values: 1-100ms for healthy systems)
   */
  latency: number;
  
  /** 
   * Additional diagnostic details providing context about the health status
   * Contains adapter-specific information for troubleshooting
   */
  details: {
    /** Connection status for external caches (Redis, etc.) */
    connected?: boolean;
    
    /** Memory usage information for memory-based caches */
    memory?: {
      /** Currently used memory in bytes */
      used: number;
      /** Total available memory in bytes */
      available: number;
      /** Memory usage as percentage (0-100) */
      percentage: number;
    };
    
    /** Information about the most recent error encountered */
    lastError?: {
      /** Human-readable error message */
      message: string;
      /** When the error occurred */
      timestamp: Date;
      /** Error code for programmatic handling */
      code?: string;
    };
    
    /** Adapter-specific diagnostic information */
    [key: string]: unknown;
  };
  
  /** 
   * Timestamp when this health status was generated
   * Used to determine freshness of health information
   */
  timestamp: Date;
}

/**
 * Cache performance metrics
 * 
 * Comprehensive metrics for monitoring cache performance and effectiveness.
 * Used by the getMetrics() method to provide real-time performance data.
 * 
 * Key performance indicators:
 * - hitRate: Target >90% for optimal performance
 * - averageLatency: Target <10ms for memory cache, <50ms for Redis
 * - errors: Should remain at 0 under normal operation
 * 
 * Valid ranges:
 * - hits, misses, errors: 0 to Number.MAX_SAFE_INTEGER
 * - hitRate: 0.0 to 100.0 (percentage)
 * - averageLatency: 0.0 to 10000.0 (milliseconds)
 */
export interface CacheMetrics {
  /** 
   * Total number of successful cache retrievals
   * Range: 0 to Number.MAX_SAFE_INTEGER
   */
  hits: number;
  
  /** 
   * Total number of cache misses (key not found)
   * Range: 0 to Number.MAX_SAFE_INTEGER
   */
  misses: number;
  
  /** 
   * Cache hit rate as a percentage
   * Calculated as: (hits / (hits + misses)) * 100
   * Range: 0.0 to 100.0
   * Target: >90% for optimal performance
   */
  hitRate: number;
  
  /** 
   * Average response latency for cache operations in milliseconds
   * Range: 0.0 to 10000.0 (values >1000ms indicate performance issues)
   * Target: <10ms for memory cache, <50ms for Redis cache
   */
  averageLatency: number;
  
  /** 
   * Total number of errors encountered during cache operations
   * Range: 0 to Number.MAX_SAFE_INTEGER
   * Target: 0 (any errors indicate issues requiring investigation)
   */
  errors: number;
  
  /** 
   * Total number of cache operations performed (hits + misses + sets + deletes)
   * Range: 0 to Number.MAX_SAFE_INTEGER
   */
  totalOperations: number;
  
  /** 
   * Current number of entries stored in the cache
   * Range: 0 to configured maxEntries limit
   */
  entryCount: number;
  
  /** 
   * Estimated memory usage in bytes
   * Range: 0 to available system memory
   */
  memoryUsage: number;
  
  /** 
   * Timestamp when these metrics were last updated
   * Used to determine freshness of metric data
   */
  lastUpdated: Date;
  
  /** 
   * Additional adapter-specific metrics
   * May include connection pool stats, compression ratios, etc.
   */
  additional?: Record<string, number | string>;
}

/**
 * Core cache adapter interface
 * 
 * Defines the contract that all cache implementations must follow. Uses Result types
 * for explicit error handling and provides comprehensive lifecycle management.
 */
export interface CacheAdapter {
  /**
   * Retrieve a value from the cache
   * 
   * @param key - The cache key to retrieve
   * @returns Result containing the cached value or null if not found, or an error
   * 
   * @example
   * ```typescript
   * const result = await cache.get<string>('user:123');
   * if (result.isOk()) {
   *   const value = result.value; // string | null
   *   if (value !== null) {
   *     console.log('Found cached value:', value);
   *   } else {
   *     console.log('Key not found in cache');
   *   }
   * } else {
   *   console.error('Cache error:', result.error);
   * }
   * ```
   */
  get<T>(key: string): Promise<Result<T | null>>;

  /**
   * Store a value in the cache
   * 
   * @param key - The cache key to store under
   * @param value - The value to cache
   * @param ttl - Optional time-to-live in seconds
   * @returns Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const result = await cache.set('user:123', userData, 3600);
   * if (result.isOk()) {
   *   console.log('Value cached successfully');
   * } else {
   *   console.error('Failed to cache value:', result.error);
   * }
   * ```
   */
  set<T>(key: string, value: T, ttl?: number): Promise<Result<void>>;

  /**
   * Remove a value from the cache
   * 
   * @param key - The cache key to remove
   * @returns Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const result = await cache.delete('user:123');
   * if (result.isOk()) {
   *   console.log('Key deleted successfully');
   * } else {
   *   console.error('Failed to delete key:', result.error);
   * }
   * ```
   */
  delete(key: string): Promise<Result<void>>;

  /**
   * Remove all entries from the cache
   * 
   * @returns Result indicating success or failure
   * 
   * @example
   * ```typescript
   * const result = await cache.clear();
   * if (result.isOk()) {
   *   console.log('Cache cleared successfully');
   * } else {
   *   console.error('Failed to clear cache:', result.error);
   * }
   * ```
   */
  clear(): Promise<Result<void>>;

  /**
   * Check if a key exists in the cache
   * 
   * @param key - The cache key to check
   * @returns Result containing boolean indicating existence, or an error
   * 
   * @example
   * ```typescript
   * const result = await cache.exists('user:123');
   * if (result.isOk()) {
   *   if (result.value) {
   *     console.log('Key exists in cache');
   *   } else {
   *     console.log('Key does not exist in cache');
   *   }
   * } else {
   *   console.error('Failed to check key existence:', result.error);
   * }
   * ```
   */
  exists(key: string): Promise<Result<boolean>>;

  /**
   * Initialize the cache adapter
   * 
   * Performs any necessary setup operations such as establishing connections,
   * validating configuration, or preparing internal state.
   * 
   * @returns Result indicating successful initialization or an error
   * 
   * @example
   * ```typescript
   * const result = await cache.initialize();
   * if (result.isOk()) {
   *   console.log('Cache initialized successfully');
   * } else {
   *   console.error('Failed to initialize cache:', result.error);
   * }
   * ```
   */
  initialize(): Promise<Result<void>>;

  /**
   * Perform a health check on the cache adapter
   * 
   * Verifies that the cache is operational and returns detailed health information.
   * This method should be lightweight and suitable for frequent monitoring.
   * 
   * @returns Promise resolving to health status information
   * 
   * @example
   * ```typescript
   * const health = await cache.healthCheck();
   * console.log('Cache health:', health.status);
   * console.log('Response time:', health.latency, 'ms');
   * ```
   */
  healthCheck(): Promise<HealthStatus>;

  /**
   * Gracefully shutdown the cache adapter
   * 
   * Performs cleanup operations such as closing connections, flushing pending
   * operations, and releasing resources.
   * 
   * @returns Result indicating successful shutdown or an error
   * 
   * @example
   * ```typescript
   * const result = await cache.shutdown();
   * if (result.isOk()) {
   *   console.log('Cache shutdown successfully');
   * } else {
   *   console.error('Error during cache shutdown:', result.error);
   * }
   * ```
   */
  shutdown(): Promise<Result<void>>;

  /**
   * Get current performance metrics
   * 
   * Returns comprehensive metrics about cache performance, hit rates, and usage.
   * This method should be efficient and suitable for frequent monitoring.
   * 
   * @returns Current cache metrics
   * 
   * @example
   * ```typescript
   * const metrics = cache.getMetrics();
   * console.log('Hit rate:', metrics.hitRate.toFixed(2) + '%');
   * console.log('Average latency:', metrics.averageLatency.toFixed(2) + 'ms');
   * ```
   */
  getMetrics(): CacheMetrics;
}
/**
 * Base configuration for all cache adapters
 * 
 * Common configuration options that apply to all cache implementations.
 * Provides foundational settings that are extended by specific adapter types.
 * 
 * Valid ranges and constraints:
 * - name: 1-64 characters, alphanumeric and hyphens only
 * - defaultTtl: 0 to 2147483647 seconds (0 = no expiration)
 * - maxEntries: 0 to Number.MAX_SAFE_INTEGER (0 = unlimited)
 * - keyPrefix: 0-32 characters, no special characters except hyphens/underscores
 */
export interface BaseCacheConfig {
  /** 
   * Unique name for this cache instance
   * Used for logging, metrics, and identification
   * Range: 1-64 characters, alphanumeric and hyphens only
   * Example: "user-session-cache", "api-response-cache"
   */
  name: string;
  
  /** 
   * Default time-to-live in seconds for cached entries
   * Range: 0 to 2147483647 seconds
   * - 0 = no expiration (entries persist until manually removed)
   * - 3600 = 1 hour (typical for session data)
   * - 86400 = 24 hours (typical for daily aggregates)
   */
  defaultTtl: number;
  
  /** 
   * Maximum number of entries allowed in the cache
   * Range: 0 to Number.MAX_SAFE_INTEGER
   * - 0 = unlimited (constrained only by available memory)
   * - 10000 = typical for small caches
   * - 1000000 = typical for large application caches
   */
  maxEntries?: number;
  
  /** 
   * Key prefix to avoid collisions in shared cache systems
   * Range: 0-32 characters, alphanumeric, hyphens, and underscores only
   * Example: "app1:", "prod_", "user_sessions_"
   */
  keyPrefix?: string;
  
  /** 
   * Whether to enable metrics collection for this cache instance
   * Default: true (recommended for production monitoring)
   */
  enableMetrics?: boolean;
  
  /** 
   * Whether to enable detailed logging for cache operations
   * Default: false (enable only for debugging due to performance impact)
   */
  enableLogging?: boolean;
}

/**
 * Memory cache specific configuration
 * 
 * Configuration options specific to in-memory cache implementations.
 * Optimized for high-speed access with configurable memory limits and eviction policies.
 * 
 * Valid ranges and recommendations:
 * - maxMemoryMB: 0 to available system memory (typical: 100-1000MB)
 * - cleanupInterval: 30 to 3600 seconds (typical: 300 seconds)
 * - evictionPolicy: 'lru' recommended for most use cases
 */
export interface MemoryCacheConfig extends BaseCacheConfig {
  /** 
   * Cache adapter type identifier
   * Must be 'memory' for memory cache implementations
   */
  type: 'memory';
  
  /** 
   * Maximum memory usage in megabytes
   * Range: 0 to available system memory
   * - 0 = unlimited (use with caution, may cause OOM)
   * - 100 = suitable for small applications
   * - 500 = suitable for medium applications
   * - 1000+ = suitable for large applications with ample memory
   */
  maxMemoryMB?: number;
  
  /** 
   * Eviction policy when memory or entry limits are reached
   * - 'lru': Least Recently Used (recommended for most cases)
   * - 'lfu': Least Frequently Used (good for stable access patterns)
   * - 'fifo': First In, First Out (simple but less efficient)
   * - 'random': Random eviction (fastest but least predictable)
   */
  evictionPolicy?: 'lru' | 'lfu' | 'fifo' | 'random';
  
  /** 
   * Interval for cleanup operations in seconds
   * Range: 30 to 3600 seconds
   * - 60 = frequent cleanup (higher CPU, lower memory)
   * - 300 = balanced approach (recommended)
   * - 900 = less frequent cleanup (lower CPU, higher memory)
   */
  cleanupInterval?: number;
}

/**
 * Redis cache specific configuration
 * 
 * Configuration options for Redis-based cache implementations.
 * Provides persistent, distributed caching with high availability options.
 * 
 * Valid ranges and recommendations:
 * - port: 1 to 65535 (default: 6379)
 * - database: 0 to 15 (Redis supports 16 databases by default)
 * - connectTimeout: 1000 to 30000ms (typical: 5000ms)
 * - commandTimeout: 100 to 10000ms (typical: 1000ms)
 * - maxRetries: 0 to 10 (typical: 3)
 * - retryDelay: 100 to 5000ms (typical: 1000ms)
 */
export interface RedisCacheConfig extends BaseCacheConfig {
  /** 
   * Cache adapter type identifier
   * Must be 'redis' for Redis cache implementations
   */
  type: 'redis';
  
  /** 
   * Redis server hostname or IP address
   * Examples: 'localhost', '127.0.0.1', 'redis.example.com'
   */
  host: string;
  
  /** 
   * Redis server port number
   * Range: 1 to 65535
   * Default: 6379 (standard Redis port)
   */
  port: number;
  
  /** 
   * Redis authentication password
   * Required if Redis AUTH is enabled
   * Should be stored securely (environment variables recommended)
   */
  password?: string;
  
  /** 
   * Redis database number to use
   * Range: 0 to 15 (Redis supports 16 databases by default)
   * - 0 = default database
   * - Use different numbers to isolate data by environment/application
   */
  database?: number;
  
  /** 
   * Connection timeout in milliseconds
   * Range: 1000 to 30000ms
   * - 5000 = recommended for local Redis
   * - 10000 = recommended for remote Redis
   */
  connectTimeout?: number;
  
  /** 
   * Command timeout in milliseconds
   * Range: 100 to 10000ms
   * - 1000 = recommended for most operations
   * - 5000 = for operations on large datasets
   */
  commandTimeout?: number;
  
  /** 
   * Maximum number of connection retry attempts
   * Range: 0 to 10
   * - 3 = recommended for production
   * - 0 = disable retries (fail fast)
   */
  maxRetries?: number;
  
  /** 
   * Delay between retry attempts in milliseconds
   * Range: 100 to 5000ms
   * - 1000 = recommended starting delay
   * - Actual delay may use exponential backoff
   */
  retryDelay?: number;
  
  /** 
   * Connection pool configuration for high-throughput applications
   * Manages multiple Redis connections for better performance
   */
  pool?: {
    /** 
     * Minimum number of connections to maintain
     * Range: 1 to 50
     * - 2 = minimum for basic redundancy
     * - 5 = recommended for moderate load
     */
    min: number;
    
    /** 
     * Maximum number of connections allowed
     * Range: 1 to 100
     * - 10 = suitable for most applications
     * - 50+ = high-throughput applications only
     */
    max: number;
    
    /** 
     * Connection idle timeout in milliseconds
     * Range: 10000 to 300000ms (10 seconds to 5 minutes)
     * - 30000 = recommended (30 seconds)
     */
    idleTimeout: number;
  };
}

/**
 * Multi-tier cache configuration
 * 
 * Configuration for caches that combine multiple storage tiers (e.g., memory + Redis).
 * Provides optimal performance by combining fast L1 (memory) with persistent L2 (Redis).
 * 
 * Valid ranges and recommendations:
 * - promotionThreshold: 1 to 1000 (typical: 3-10 accesses)
 * - writeStrategy: 'write-through' recommended for consistency, 'write-behind' for performance
 * - L1 should be smaller and faster than L2
 */
export interface MultiTierCacheConfig extends BaseCacheConfig {
  /** 
   * Cache adapter type identifier
   * Must be 'multi-tier' for multi-tier cache implementations
   */
  type: 'multi-tier';
  
  /** 
   * Configuration for the L1 (fastest) cache tier
   * Typically an in-memory cache for frequently accessed data
   * Should have smaller capacity than L2 for optimal performance
   */
  l1Config: MemoryCacheConfig;
  
  /** 
   * Configuration for the L2 (persistent) cache tier
   * Typically Redis or another persistent cache for larger datasets
   * Should have larger capacity than L1 for comprehensive coverage
   */
  l2Config: RedisCacheConfig;
  
  /** 
   * Write strategy for multi-tier operations
   * - 'write-through': Write to both tiers synchronously (consistent but slower)
   * - 'write-behind': Write to L1 immediately, L2 asynchronously (faster but eventual consistency)
   */
  writeStrategy: 'write-through' | 'write-behind';
  
  /** 
   * Whether to promote frequently accessed items from L2 to L1
   * Default: true (recommended for optimal performance)
   * Promotes hot data to faster tier automatically
   */
  enablePromotion?: boolean;
  
  /** 
   * Threshold for promoting items from L2 to L1 (access count)
   * Range: 1 to 1000
   * - 2 = aggressive promotion (more L1 usage)
   * - 5 = balanced approach (recommended)
   * - 10 = conservative promotion (less L1 churn)
   */
  promotionThreshold?: number;
}

/**
 * Union type for all cache configurations
 * 
 * Discriminated union that allows type-safe configuration handling across all cache adapter types.
 * The 'type' field serves as the discriminator for TypeScript type narrowing.
 * 
 * Usage examples:
 * ```typescript
 * // Type-safe configuration handling
 * function createCache(config: CacheConfig): CacheAdapter {
 *   switch (config.type) {
 *     case 'memory':
 *       // config is narrowed to MemoryCacheConfig
 *       return new MemoryCacheAdapter(config);
 *     case 'redis':
 *       // config is narrowed to RedisCacheConfig
 *       return new RedisCacheAdapter(config);
 *     case 'multi-tier':
 *       // config is narrowed to MultiTierCacheConfig
 *       return new MultiTierCacheAdapter(config);
 *     default:
 *       throw new Error(`Unsupported cache type: ${(config as any).type}`);
 *   }
 * }
 * ```
 * 
 * Supported cache types:
 * - 'memory': In-memory cache for fastest access (MemoryCacheConfig)
 * - 'redis': Redis-based cache for persistence and distribution (RedisCacheConfig)
 * - 'multi-tier': Combined memory + Redis for optimal performance (MultiTierCacheConfig)
 */
export type CacheConfig = MemoryCacheConfig | RedisCacheConfig | MultiTierCacheConfig;

/**
 * Cache operation options
 * 
 * Optional parameters that can be passed to cache operations to modify behavior.
 */
export interface CacheOperationOptions {
  /** Override default TTL for this operation */
  ttl?: number;
  
  /** Tags for cache invalidation grouping */
  tags?: string[];
  
  /** Whether to bypass L1 cache in multi-tier setups */
  skipL1?: boolean;
  
  /** Whether to compress large values */
  compress?: boolean;
  
  /** Custom serialization options */
  serialization?: {
    /** Custom serializer function */
    serialize?: (value: any) => string;
    
    /** Custom deserializer function */
    deserialize?: (data: string) => any;
  };
}

/**
 * Cache event types for monitoring and observability
 * 
 * Events that can be emitted by cache adapters for monitoring purposes.
 */
export type CacheEventType = 
  | 'hit'           // Cache hit occurred
  | 'miss'          // Cache miss occurred  
  | 'set'           // Value was stored
  | 'delete'        // Value was deleted
  | 'clear'         // Cache was cleared
  | 'eviction'      // Entry was evicted
  | 'promotion'     // Entry was promoted to higher tier
  | 'error'         // Error occurred
  | 'health_check'  // Health check performed
  | 'initialization' // Adapter initialized
  | 'shutdown';     // Adapter shutdown

/**
 * Cache event data structure
 * 
 * Information about cache events for monitoring and debugging.
 */
export interface CacheEvent {
  /** Type of cache event */
  type: CacheEventType;
  
  /** Cache key involved in the event */
  key: string;
  
  /** Cache tier where event occurred (for multi-tier caches) */
  tier?: 'L1' | 'L2';
  
  /** Operation duration in milliseconds */
  duration?: number;
  
  /** Size of data involved in bytes */
  size?: number;
  
  /** Error information if applicable */
  error?: Error;
  
  /** Timestamp when event occurred */
  timestamp: Date;
  
  /** Additional event-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Cache validation result
 * 
 * Result of validating cache configuration or state.
 */
export interface CacheValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  
  /** Validation error messages */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
  
  /** Suggested configuration improvements */
  suggestions?: string[];
}

/**
 * Cache statistics for reporting and analysis
 * 
 * Aggregated statistics over a time period for reporting purposes.
 */
export interface CacheStatistics {
  /** Time period these statistics cover */
  period: {
    start: Date;
    end: Date;
    durationMs: number;
  };
  
  /** Operation counts */
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    clears: number;
    exists: number;
  };
  
  /** Performance metrics */
  performance: {
    averageLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
  };
  
  /** Error statistics */
  errors: {
    total: number;
    rate: number; // errors per operation
    byType: Record<string, number>;
  };
  
  /** Memory and storage statistics */
  storage: {
    peakMemoryUsage: number;
    averageMemoryUsage: number;
    peakEntryCount: number;
    averageEntryCount: number;
  };
}


