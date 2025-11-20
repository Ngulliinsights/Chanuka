/**
 * Core Cache Interfaces
 * 
 * Unified interfaces for all cache implementations
 */

export interface CacheService {
  // Basic cache operations
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  
  // Batch operations
  mget<T = any>(keys: string[]): Promise<Array<T | null>>;
  mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void>;
  mdel(keys: string[]): Promise<number>;
  
  // Advanced operations
  increment(key: string, delta?: number): Promise<number>;
  decrement(key: string, delta?: number): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
  
  // Pattern operations (optional)
  keys?(pattern: string): Promise<string[]>;
  invalidateByPattern?(pattern: string): Promise<number>;
  invalidateByTags?(tags: string[]): Promise<number>;
  
  // Cache management
  clear?(): Promise<void>;
  flush?(): Promise<void>;
  size?(): Promise<number>;
  
  // Health and metrics
  getHealth?(): Promise<CacheHealthStatus>;
  getMetrics?(): CacheMetrics;
  
  // Lifecycle
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  destroy?(): Promise<void>;
}

export interface CacheAdapter extends CacheService {
  readonly name: string;
  readonly version: string;
  readonly config: CacheAdapterConfig;
}

export interface CacheAdapterConfig {
  keyPrefix?: string;
  defaultTtlSec?: number;
  maxMemoryMB?: number;
  enableMetrics?: boolean;
  enableCompression?: boolean;
  compressionThreshold?: number;
}

export interface CacheHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  memoryUsage?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  lastError?: string;
  uptime?: number;
  // Additional properties for multi-tier support
  connected?: boolean;
  errors?: string[];
  memory?: any; // Can be number or object
  timestamp?: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  operations: number;
  errors: number;
  memoryUsage: number;
  keyCount: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  // Additional properties for compatibility
  avgResponseTime: number;
  totalSize?: number;
  totalEntries?: number;
  l1Stats?: CacheTierStats;
  l2Stats?: CacheTierStats;
}

export interface CacheTierStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  avgResponseTime: number;
  totalSize: number;
  totalEntries: number;
  // Additional properties
  tier?: string;
  memoryUsage?: number;
  keyCount?: number;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl?: number;
  created_at: number;
  accessedAt: number;
  tags?: string[];
}

export interface CacheConfig {
  provider: 'memory' | 'redis' | 'multi-tier';
  keyPrefix?: string;
  defaultTtlSec?: number;
  maxMemoryMB?: number;
  enableMetrics?: boolean;
  enableCompression?: boolean;
  compressionThreshold?: number;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  
  // Redis-specific config
  redisUrl?: string;
  
  // Multi-tier specific config
  l1MaxSizeMB?: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  skipCache?: boolean;
}

// Event system for cache operations
export interface CacheEvent {
  type: CacheEventType;
  key: string;
  timestamp: number;
  metadata?: Record<string, any>;
  error?: Error;
  tier?: 'L1' | 'L2';
  size?: number;
}

export type CacheEventType =
  | 'hit'
  | 'miss'
  | 'set'
  | 'delete'
  | 'expire'
  | 'evict'
  | 'error'
  | 'circuit_open'
  | 'circuit_close'
  | 'cache:event'
  | 'promotion';

export interface CacheEventEmitter {
  on(event: CacheEventType, listener: (event: CacheEvent) => void): void;
  off(event: CacheEventType, listener: (event: CacheEvent) => void): void;
  emit(event: CacheEventType, data: Omit<CacheEvent, 'type' | 'timestamp'>): void;
}

// Circuit breaker interfaces
export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  resetTimeout: number;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  nextAttempt?: Date;
}

// Single-flight interfaces
export interface SingleFlightOptions {
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  maxConcurrentRequests?: number;
}

// Multi-tier cache interfaces
export interface MultiTierOptions {
  l1Config: CacheAdapterConfig;
  l2Config: CacheAdapterConfig & { redisUrl: string };
  promotionStrategy?: PromotionStrategy;
  enableMetrics?: boolean;
  keyPrefix?: string;
}

export type PromotionStrategy = 'lru' | 'frequency' | 'size' | 'ttl';

// Compression and serialization
export interface CompressionOptions {
  algorithm: 'gzip' | 'deflate' | 'brotli';
  threshold: number; // Minimum size in bytes to compress
  level?: number; // Compression level
}

export interface SerializationOptions {
  format: 'json' | 'msgpack' | 'binary';
  enableCompression?: boolean;
  compressionOptions?: CompressionOptions;
}

// Cache warming and eviction
export interface CacheWarmingStrategy {
  enabled: boolean;
  batchSize?: number;
  concurrency?: number;
  retryAttempts?: number;
}

export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl' | 'random';

export interface EvictionOptions {
  policy: EvictionPolicy;
  maxSize?: number;
  maxMemory?: number;
  checkInterval?: number;
}

// Statistics and monitoring (removed duplicate - using the one above)

export interface CacheStatsAggregation {
  total: CacheMetrics;
  tiers?: CacheTierStats[];
  timeWindow: {
    start: Date;
    end: Date;
    duration: number;
  };
}



