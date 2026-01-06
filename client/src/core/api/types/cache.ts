/**
 * Cache Types
 *
 * Type definitions for caching strategies and configurations
 */

// ============================================================================
// Cache Configuration
// ============================================================================

export type CacheStorage = 'memory' | 'localStorage' | 'indexedDB';
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl';

export interface CacheConfig {
  readonly defaultTTL: number;
  readonly maxSize: number;
  readonly storage: CacheStorage;
  readonly compression: boolean;
  readonly encryption: boolean;
  readonly evictionPolicy: EvictionPolicy;
}

// ============================================================================
// Cache Entry
// ============================================================================

export interface CacheEntry<T = unknown> {
  data: T;
  readonly timestamp: number;
  readonly ttl: number;
  accessCount: number;
  lastAccessed: number;
  metadata: CacheEntryMetadata;
}

export interface CacheEntryMetadata {
  readonly size: number;
  compressed: boolean;
  encrypted: boolean;
  readonly tags?: ReadonlyArray<string>;
  readonly dependencies?: ReadonlyArray<string>;
}
