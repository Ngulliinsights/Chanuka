// ============================================================================
// ARGUMENT INTELLIGENCE - NLP Cache Service
// ============================================================================
// Caching layer for NLP operations to improve performance

import { logger } from '@server/infrastructure/observability';
import { createHash } from 'crypto';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum number of cached items
  enabled: boolean;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  hits: number;
  size: number; // Approximate size in bytes
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  itemCount: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * In-memory cache for NLP operations
 * Uses LRU (Least Recently Used) eviction policy
 */
export class NLPCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private accessOrder: string[]; // For LRU tracking
  private stats: { hits: number; misses: number };
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: config.ttl || 3600, // 1 hour default
      maxSize: config.maxSize || 1000,
      enabled: config.enabled !== undefined ? config.enabled : true
    };

    this.cache = new Map();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0 };

    logger.info('NLP Cache initialized', {
      component: 'NLPCache',
      config: this.config
    });
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // Convert to seconds

    if (age > this.config.ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    entry.hits++;
    this.updateAccessOrder(key);
    this.stats.hits++;

    logger.debug('Cache hit', {
      component: 'NLPCache',
      key: this.truncateKey(key),
      hits: entry.hits,
      age: Math.floor(age)
    });

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    if (!this.config.enabled) return;

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      hits: 0,
      size: this.estimateSize(value)
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    logger.debug('Cache set', {
      component: 'NLPCache',
      key: this.truncateKey(key),
      size: entry.size,
      cacheSize: this.cache.size
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }

      logger.debug('Cache delete', {
        component: 'NLPCache',
        key: this.truncateKey(key)
      });
    }

    return deleted;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    if (!this.config.enabled) return false;

    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    const age = (Date.now() - entry.timestamp) / 1000;
    if (age > this.config.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0 };

    logger.info('Cache cleared', {
      component: 'NLPCache',
      entriesCleared: size
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const timestamps = entries.map(e => e.timestamp);

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: totalSize,
      itemCount: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }

  /**
   * Get or compute value (cache-aside pattern)
   */
  async getOrCompute(
    key: string,
    computeFn: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Compute value
    const value = await computeFn();

    // Store in cache
    this.set(key, value);

    return value;
  }

  /**
   * Generate cache key from text
   */
  static generateKey(prefix: string, text: string, ...params: unknown[]): string {
    const hash = createHash('sha256');
    hash.update(text);
    
    // Include additional parameters in hash
    if (params.length > 0) {
      hash.update(JSON.stringify(params));
    }

    return `${prefix}:${hash.digest('hex').substring(0, 16)}`;
  }

  /**
   * Prune expired entries
   */
  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = (now - entry.timestamp) / 1000;
      if (age > this.config.ttl) {
        this.delete(key);
        pruned++;
      }
    }

    if (pruned > 0) {
      logger.info('Pruned expired cache entries', {
        component: 'NLPCache',
        pruned,
        remaining: this.cache.size
      });
    }

    return pruned;
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };

    logger.info('Cache configuration updated', {
      component: 'NLPCache',
      config: this.config
    });

    // If cache was disabled, clear it
    if (!this.config.enabled) {
      this.clear();
    }
  }

  // Private helper methods

  private updateAccessOrder(key: string): void {
    // Remove key from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    // Remove least recently used (first in array)
    const lruKey = this.accessOrder[0];
    this.delete(lruKey);

    logger.debug('Evicted LRU entry', {
      component: 'NLPCache',
      key: this.truncateKey(lruKey),
      cacheSize: this.cache.size
    });
  }

  private estimateSize(value: T): number {
    // Rough estimation of object size in bytes
    try {
      const json = JSON.stringify(value);
      return json.length * 2; // Approximate UTF-16 encoding
    } catch {
      return 1000; // Default estimate if serialization fails
    }
  }

  private truncateKey(key: string): string {
    return key.length > 50 ? `${key.substring(0, 47)}...` : key;
  }
}

/**
 * Specialized cache manager for different NLP operations
 */
export class NLPCacheManager {
  private sentimentCache: NLPCache;
  private clusteringCache: NLPCache;
  private qualityCache: NLPCache;
  private similarityCache: NLPCache;
  private entityCache: NLPCache;

  constructor(config: Partial<CacheConfig> = {}) {
    // Create separate caches for different operations with different TTLs
    this.sentimentCache = new NLPCache({
      ...config,
      ttl: config.ttl || 3600 // 1 hour
    });

    this.clusteringCache = new NLPCache({
      ...config,
      ttl: config.ttl || 1800 // 30 minutes
    });

    this.qualityCache = new NLPCache({
      ...config,
      ttl: config.ttl || 3600 // 1 hour
    });

    this.similarityCache = new NLPCache({
      ...config,
      ttl: config.ttl || 7200 // 2 hours
    });

    this.entityCache = new NLPCache({
      ...config,
      ttl: config.ttl || 3600 // 1 hour
    });

    logger.info('NLP Cache Manager initialized', {
      component: 'NLPCacheManager'
    });
  }

  /**
   * Get sentiment cache
   */
  getSentimentCache(): NLPCache {
    return this.sentimentCache;
  }

  /**
   * Get clustering cache
   */
  getClusteringCache(): NLPCache {
    return this.clusteringCache;
  }

  /**
   * Get quality cache
   */
  getQualityCache(): NLPCache {
    return this.qualityCache;
  }

  /**
   * Get similarity cache
   */
  getSimilarityCache(): NLPCache {
    return this.similarityCache;
  }

  /**
   * Get entity cache
   */
  getEntityCache(): NLPCache {
    return this.entityCache;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.sentimentCache.clear();
    this.clusteringCache.clear();
    this.qualityCache.clear();
    this.similarityCache.clear();
    this.entityCache.clear();

    logger.info('All NLP caches cleared', {
      component: 'NLPCacheManager'
    });
  }

  /**
   * Get combined statistics
   */
  getAllStats(): {
    sentiment: CacheStats;
    clustering: CacheStats;
    quality: CacheStats;
    similarity: CacheStats;
    entity: CacheStats;
    total: {
      hits: number;
      misses: number;
      hitRate: number;
      totalSize: number;
      totalItems: number;
    };
  } {
    const sentiment = this.sentimentCache.getStats();
    const clustering = this.clusteringCache.getStats();
    const quality = this.qualityCache.getStats();
    const similarity = this.similarityCache.getStats();
    const entity = this.entityCache.getStats();

    const totalHits = sentiment.hits + clustering.hits + quality.hits + similarity.hits + entity.hits;
    const totalMisses = sentiment.misses + clustering.misses + quality.misses + similarity.misses + entity.misses;

    return {
      sentiment,
      clustering,
      quality,
      similarity,
      entity,
      total: {
        hits: totalHits,
        misses: totalMisses,
        hitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,
        totalSize: sentiment.size + clustering.size + quality.size + similarity.size + entity.size,
        totalItems: sentiment.itemCount + clustering.itemCount + quality.itemCount + similarity.itemCount + entity.itemCount
      }
    };
  }

  /**
   * Prune expired entries from all caches
   */
  pruneAllExpired(): number {
    const pruned = 
      this.sentimentCache.pruneExpired() +
      this.clusteringCache.pruneExpired() +
      this.qualityCache.pruneExpired() +
      this.similarityCache.pruneExpired() +
      this.entityCache.pruneExpired();

    if (pruned > 0) {
      logger.info('Pruned expired entries from all caches', {
        component: 'NLPCacheManager',
        totalPruned: pruned
      });
    }

    return pruned;
  }
}

// Singleton instance
export const nlpCacheManager = new NLPCacheManager({
  ttl: 3600,
  maxSize: 1000,
  enabled: true
});
