/**
 * Cache Service Types and Interfaces
 * 
 * Unified interfaces for cache operations with comprehensive metrics
 * Based on consolidation of existing implementations and refined_cross_cutting.ts patterns
 */

import type { CacheMetrics, CacheHealthStatus } from './core/interfaces';

// Core cache service interface
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush?(): Promise<void>;
  mget?<T>(keys: string[]): Promise<(T | null)[]>;
  mset?<T>(entries: [string, T, number?][]): Promise<void>;
  getMetrics?(): CacheMetrics;
  getHealth?(): Promise<CacheHealthStatus>;
  exists?(key: string): Promise<boolean>;
  ttl?(key: string): Promise<number>;
  clear?(): Promise<void>;
  invalidateByPattern?(pattern: string): Promise<number>;
  invalidateByTags?(tags: string[]): Promise<number>;
}

// Re-export unified interfaces from core
export type { CacheMetrics, CacheTierStats } from './core/interfaces';

// Cache entry with metadata
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size: number;
  compressed?: boolean;
  tier?: 'L1' | 'L2';
}

// Cache configuration options
export interface CacheConfig {
  provider: 'redis' | 'memory' | 'multi-tier';
  defaultTtlSec: number;
  redisUrl?: string;
  maxMemoryMB: number;
  compressionThreshold: number;
  enableCompression: boolean;
  enableMetrics: boolean;
  keyPrefix?: string;
  l1MaxSizeMB?: number; // For multi-tier cache
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
}

// Cache operation options
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean;
  tags?: string[]; // For cache invalidation by tags
  tier?: 'L1' | 'L2' | 'both'; // For multi-tier cache
  skipL1?: boolean; // Skip L1 cache for large items
}

// Cache key generator interface
export interface CacheKeyGenerator { property(id: number): string;
  properties(filters: string): string;
  user(id: number): string;
  userByUsername(username: string): string;
  reviews(propertyId: number): string;
  searchResults(query: string): string;
  trustScore(user_id: string): string;
  fraudDetection(propertyId: number): string;
  apiResponse(endpoint: string, params: string): string;
 }

// Circuit breaker state for cache operations
export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttempt: number;
}

// Cache adapter interface for different implementations
export interface CacheAdapter extends CacheService {
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  isConnected?(): boolean;
  getHealth?(): Promise<CacheHealthStatus>;
  warmUp?(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void>;
}

// Cache health status (using the one from core/interfaces)

// Cache event types for monitoring
export type CacheEventType = 
  | 'hit' 
  | 'miss' 
  | 'set' 
  | 'delete' 
  | 'error' 
  | 'promotion' 
  | 'eviction' 
  | 'circuit_breaker_open' 
  | 'circuit_breaker_close';

// Cache event data
export interface CacheEvent {
  type: CacheEventType;
  key: string;
  tier?: 'L1' | 'L2';
  duration?: number;
  size?: number;
  error?: Error;
  timestamp: Date;
}

// Cache factory options
export interface CacheFactoryOptions {
  config: CacheConfig;
  logger?: any;
  enableSingleFlight?: boolean;
  enableCircuitBreaker?: boolean;
}

// Single flight cache options
export interface SingleFlightOptions {
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

// Multi-tier cache promotion strategy
export type PromotionStrategy = 'lru' | 'frequency' | 'size' | 'hybrid';

// Multi-tier cache options
export interface MultiTierOptions {
  l1MaxSizeMB: number;
  l2Adapter: CacheAdapter;
  promotionStrategy: PromotionStrategy;
  promotionThreshold: number;
  enableL1Warmup: boolean;
  l1WarmupSize: number;
}

// Cache compression options
export interface CompressionOptions {
  enabled: boolean;
  threshold: number; // Compress if size > threshold bytes
  algorithm: 'gzip' | 'deflate' | 'brotli';
  level: number; // Compression level (1-9)
}

// Cache serialization options
export interface SerializationOptions {
  enableBinaryMode: boolean;
  customSerializer?: {
    serialize: (data: any) => string | Buffer;
    deserialize: (data: string | Buffer) => any;
  };
}

// Cache warming strategy
export interface CacheWarmingStrategy {
  enabled: boolean;
  batchSize: number;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

// Cache eviction policy
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl' | 'random';

// Cache eviction options
export interface EvictionOptions {
  policy: EvictionPolicy;
  maxEntries: number;
  maxMemoryMB: number;
  evictionBatchSize: number;
  enableBackgroundEviction: boolean;
}

// Cache statistics aggregation
export interface CacheStatsAggregation {
  period: 'minute' | 'hour' | 'day';
  metrics: CacheMetrics[];
  aggregatedAt: Date;
  summary: {
    avgHitRate: number;
    avgResponseTime: number;
    totalOperations: number;
    errorRate: number;
  };
}












































