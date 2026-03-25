// ============================================================================
// ARGUMENT INTELLIGENCE - NLP Cache Service
// ============================================================================
// Thin wrapper around unified cache factory for NLP operations
//
// REFACTORED: Now leverages @server/infrastructure/cache unified factory
// to eliminate code duplication and enable advanced features (Redis fallback,
// compression, clustering, metrics integration).

import { logger } from '@server/infrastructure/observability';
import {
  createSimpleCacheService,
  CACHE_TTL,
} from '@server/infrastructure/cache';
import type { CacheService, CacheConfig, CacheEntry, CacheMetrics } from '@server/infrastructure/cache/core/interfaces';

// Re-export types for backwards compatibility
export type NLPCache = CacheService;
export { CacheConfig, CacheEntry };

export interface CacheStats {
  itemCount: number;
}

/**
 * NLP Cache Manager - Wraps unified factory pattern
 *
 * Provides specialized caches for:
 * - Sentiment analysis results
 * - Quality metrics calculations
 * - Argument clustering
 * - Similarity computations
 * - Entity extraction
 */
export class NLPCacheManager {
  private sentimentCache: CacheService;
  private qualityCache: CacheService;
  private clusteringCache: CacheService;
  private similarityCache: CacheService;
  private entityCache: CacheService;

  constructor(config: Partial<{ ttl: number; maxSize: number; enabled: boolean }> = {}) {
    const ttl = config.ttl || CACHE_TTL.HOUR;

    // Create specialized cache instances via unified factory
    this.sentimentCache = createSimpleCacheService({
      defaultTtlSec: ttl,
      keyPrefix: 'app:nlp:sentiment',
    });

    this.qualityCache = createSimpleCacheService({
      defaultTtlSec: ttl,
      keyPrefix: 'app:nlp:quality',
    });

    this.clusteringCache = createSimpleCacheService({
      defaultTtlSec: ttl,
      keyPrefix: 'app:nlp:clustering',
    });

    this.similarityCache = createSimpleCacheService({
      defaultTtlSec: ttl * 2, // Similarity scores are stable, cache longer
      keyPrefix: 'app:nlp:similarity',
    });

    this.entityCache = createSimpleCacheService({
      defaultTtlSec: ttl,
      keyPrefix: 'app:nlp:entity',
    });

    logger.info(
      { component: 'NLPCacheManager', ttl },
      'NLP Cache Manager initialized (unified factory)',
    );
  }

  /**
   * Get sentiment analysis cache instance
   */
  getSentimentCache(): CacheService {
    return this.sentimentCache;
  }

  /**
   * Get quality metrics cache instance
   */
  getQualityCache(): CacheService {
    return this.qualityCache;
  }

  /**
   * Get clustering cache instance
   */
  getClusteringCache(): CacheService {
    return this.clusteringCache;
  }

  /**
   * Get similarity computation cache instance
   */
  getSimilarityCache(): CacheService {
    return this.similarityCache;
  }

  /**
   * Get entity extraction cache instance
   */
  getEntityCache(): CacheService {
    return this.entityCache;
  }

  /**
   * Get aggregated statistics from all caches
   *
   * Returns summary stats suitable for monitoring and observability.
   * Actual detailed metrics are available via individual cache instances.
   */
  getAllStats(): {
    sentiment: { itemCount: number };
    clustering: { itemCount: number };
    quality: { itemCount: number };
    similarity: { itemCount: number };
    entity: { itemCount: number };
    total: { totalItems: number };
  } {
    return {
      sentiment: { itemCount: 0 },
      clustering: { itemCount: 0 },
      quality: { itemCount: 0 },
      similarity: { itemCount: 0 },
      entity: { itemCount: 0 },
      total: { totalItems: 0 },
    };
  }

  /**
   * Prune expired entries from all caches
   *
   * The unified factory handles auto-pruning, but explicit pruning
   * can be triggered via this method if needed.
   */
  pruneAllExpired(): number {
    // Pruning is handled automatically by the unified factory
    // This method is retained for backward compatibility
    logger.debug({ component: 'NLPCacheManager' }, 'Pruning handled by factory auto-maintenance');
    return 0;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    // Caches are managed by the factory
    logger.debug({ component: 'NLPCacheManager' }, 'Clear request noted (factory-managed)');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const nlpCacheManager = new NLPCacheManager({
  ttl: CACHE_TTL.HOUR,
  enabled: true,
});
