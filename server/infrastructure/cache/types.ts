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
  del(key: string): Promise<boolean>;
  // Alias methods for backward compatibility
  delete(key: string): Promise<boolean>;
  deletePattern(pattern: string): Promise<number>;
  deleteByTag(tag: string): Promise<number>;
  has(key: string): Promise<boolean>;
  flush?(): Promise<void>;
  mget?<T>(keys: string[]): Promise<(T | null)[]>;
  mset?<T>(entries: { key: string; value: T; ttl?: number }[]): Promise<void>;
  getMetrics?(): CacheMetrics;
  getHealth?(): Promise<CacheHealthStatus>;
  exists?(key: string): Promise<boolean>;
  ttl?(key: string): Promise<number>;
  clear?(): Promise<void>;
  invalidateByPattern?(pattern: string): Promise<number>;
  invalidateByTags?(tags: string[]): Promise<number>;
  // Additional methods used in codebase
  getOrSetCache?<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
}

// Re-export unified interfaces from core
export type { CacheMetrics, CacheHealthStatus, CacheTierStats } from './core/interfaces';

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
export interface CacheKeyGenerator {
  property(id: number): string;
  properties(filters: string): string;
  propertyDetails(id: number): string;
  propertyImages(id: number): string;
  propertyVerification(id: number): string;
  user(id: number): string;
  userByUsername(username: string): string;
  user_profiles(id: number): string;
  userSession(session_id: string): string;
  userPermissions(id: number): string;
  // Legacy methods for backwards compatibility
  USER_PROFILE(id: number | string): string;
  BILL_DETAILS(id: number | string): string;
  reviews(propertyId: number): string;
  reviewsByUser(user_id: number): string;
  reviewStats(propertyId: number): string;
  searchResults(query: string): string;
  searchSuggestions(query: string): string;
  searchFilters(category: string): string;
  trustScore(user_id: string): string;
  fraudDetection(propertyId: number): string;
  riskAssessment(user_id: string): string;
  securityEvent(eventId: string): string;
  apiResponse(endpoint: string, params: string): string;
  apiRateLimit(identifier: string, endpoint: string): string;
  landVerification(propertyId: number): string;
  landDocuments(propertyId: number): string;
  landOwnership(propertyId: number): string;
  analytics(metric: string, period: string): string;
  dashboardData(user_id: number, dashboard: string): string;
  reportData(report_id: string): string;
  config(section: string): string;
  featureFlag(flagName: string): string;
  settings(user_id: number): string;
  notifications(user_id: number): string;
  notificationPreferences(user_id: number): string;
  messages(conversationId: string): string;
  messageThread(threadId: string): string;
  fileMetadata(fileId: string): string;
  imageProcessing(imageId: string, variant: string): string;
  geocoding(address: string): string;
  reverseGeocoding(lat: number, lng: number): string;
  externalApi(service: string, endpoint: string, params: string): string;
  validationResult(schema: string, dataHash: string): string;
  healthCheck(service: string): string;
  // Legacy alias properties (for backwards compatibility)
  USER_SESSION?: string;
  USER_PERMISSIONS?: string;
  // Utility methods
  withTags(baseKey: string, tags: string[]): { key: string; tags: string[] };
  withTimestamp(baseKey: string, intervalMinutes?: number): string;
  withUser(baseKey: string, user_id: number): string;
  withEnvironment(baseKey: string, environment: string): string;
  withVersion(baseKey: string, version: string): string;
  parseKey(key: string): { prefix?: string; type: string; identifier: string; metadata?: Record<string, string> };
  validateKey(key: string): boolean;
  pattern(type: string, wildcard?: string): string;
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
  warmUp?(entries: Array<{ key: string; value: unknown; options?: CacheOptions }>): Promise<void>;
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
export type PromotionStrategy = 'lru' | 'frequency' | 'size' | 'hybrid' | 'ttl';

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
   format?: 'json' | 'msgpack' | 'binary';
   preserveTypes?: boolean;
   dateHandling?: 'iso' | 'timestamp' | 'preserve';
   enableBinaryMode?: boolean;
   customSerializer?: {
     serialize: (data: unknown) => string | Buffer;
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















































