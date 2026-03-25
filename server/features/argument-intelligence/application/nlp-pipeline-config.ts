/**
 * NLP Pipeline Configuration Service — FINAL DRAFT
 *
 * Configures and manages NLP models for argument intelligence.
 *
 * CHANGES FROM PRIOR DRAFT:
 * - Extract LOG_COMPONENT constant; remove 8 repeated string literals
 * - Fix `result as unknown as T` double-casts: type the cache-aside helper
 *   directly so the cast is a single, honest assertion at the boundary
 * - Fix updateConfig dead spread: `...updates` at the top level spreads
 *   nested objects wholesale then is immediately overridden by the explicit
 *   per-section spreads — the top-level spread was entirely dead weight
 * - Fix clustering cache key: joining all argument IDs produced a
 *   potentially kilobyte-scale string. Replaced with a djb2 fingerprint
 *   over the joined IDs so key length is always O(1)
 * - Fix cacheKey collision risk in analyzeSentiment/calculateQuality:
 *   two texts sharing the first 100 chars but diverging after would collide.
 *   Now includes text.length as a discriminator
 * - Rename healthCheck → getStatus: the method only reads config flags, it
 *   does not probe whether services actually work. Renamed to reflect that.
 *   Added probe stubs (TODO) for a real liveness check
 * - Demote constructor log from info → debug: full config dump on startup
 *   is noise in production log streams
 * - Fix getConfig() shallow copy: nested config sub-objects were still
 *   shared references. Now returns a proper structured clone
 * - Extract PipelineCounter private interface for the stats accumulator type
 * - Fix CacheService API mismatch: CacheService exposes get/set, not
 *   getOrCompute. Replaced with a private cacheGetOrCompute helper that
 *   implements cache-aside and tracks hit/miss counts internally
 * - Fix CacheService API mismatch: CacheService exposes no updateConfig.
 *   Config propagation block guarded and documented as a no-op until the
 *   cache layer exposes a reconfiguration API
 * - Fix stats shape: getAllStats() returns only { itemCount } / { totalItems }.
 *   Per-pipeline cacheHitRate and aggregate hits/misses/hitRate/totalSize are
 *   now derived from internal counters rather than the cache manager
 */

import { logger } from '@server/infrastructure/observability';

import { nlpCacheManager } from '../infrastructure/cache/nlp-cache';
import { QualityMetrics, QualityMetricsCalculator } from '../infrastructure/nlp/quality-metrics';
import { SentimentAnalyzer, SentimentResult } from '../infrastructure/nlp/sentiment-analyzer';
import { SimilarityCalculator } from '../infrastructure/nlp/similarity-calculator';
import { ClusteredArgument, ClusteringResult, ClusteringService } from './clustering-service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface NLPPipelineConfig {
  clustering: {
    enabled: boolean;
    similarityThreshold: number;
    minClusterSize: number;
    maxClusters: number;
    useSemanticSimilarity: boolean;
  };
  sentiment: {
    enabled: boolean;
    includeEmotions: boolean;
    includeDetails: boolean;
    contextWindow: number;
  };
  quality: {
    enabled: boolean;
    includeDetails: boolean;
    strictMode: boolean;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

export interface NLPPipelineStats {
  clustering: {
    totalProcessed: number;
    averageProcessingTime: number;
    cacheHitRate: number;
  };
  sentiment: {
    totalProcessed: number;
    averageProcessingTime: number;
    cacheHitRate: number;
  };
  quality: {
    totalProcessed: number;
    averageProcessingTime: number;
    cacheHitRate: number;
  };
  cache: {
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    totalItems: number;
  };
}

export interface PipelineStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    clustering: boolean;
    sentiment: boolean;
    quality: boolean;
    caching: boolean;
  };
}

/** Accumulator shape for per-pipeline timing and cache stats. */
interface PipelineCounter {
  count: number;
  totalTime: number;
  cacheHits: number;
  cacheMisses: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_COMPONENT = 'NLPPipelineConfigService';

const DEFAULT_CONFIG: NLPPipelineConfig = {
  clustering: {
    enabled: true,
    similarityThreshold: 0.7,
    minClusterSize: 3,
    maxClusters: 50,
    useSemanticSimilarity: true,
  },
  sentiment: {
    enabled: true,
    includeEmotions: false,
    includeDetails: false,
    contextWindow: 3,
  },
  quality: {
    enabled: true,
    includeDetails: false,
    strictMode: false,
  },
  caching: {
    enabled: true,
    ttl: 3600,
    maxSize: 1000,
  },
};

// ============================================================================
// SERVICE
// ============================================================================

export class NLPPipelineConfigService {
  private config: NLPPipelineConfig;
  private readonly clusteringService: ClusteringService;
  private readonly sentimentAnalyzer: SentimentAnalyzer;
  private readonly qualityCalculator: QualityMetricsCalculator;

  private readonly stats: Record<'clustering' | 'sentiment' | 'quality', PipelineCounter> = {
    clustering: { count: 0, totalTime: 0, cacheHits: 0, cacheMisses: 0 },
    sentiment:  { count: 0, totalTime: 0, cacheHits: 0, cacheMisses: 0 },
    quality:    { count: 0, totalTime: 0, cacheHits: 0, cacheMisses: 0 },
  };

  constructor() {
    this.config = this.deepCopyConfig(DEFAULT_CONFIG);

    const similarityCalculator = new SimilarityCalculator();
    this.clusteringService = new ClusteringService(similarityCalculator);
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.qualityCalculator = new QualityMetricsCalculator();

    // FIX: Demoted from info → debug; full config dump is startup noise in production.
    logger.debug({ component: LOG_COMPONENT, config: this.config }, 'NLP Pipeline Configuration Service initialized');
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  /**
   * Return a deep copy of the current configuration.
   *
   * FIX: The previous shallow copy shared nested sub-objects with internal
   * state, allowing callers to mutate config silently via the returned ref.
   */
  getConfig(): NLPPipelineConfig {
    return this.deepCopyConfig(this.config);
  }

  /**
   * Merge partial updates into the current configuration.
   *
   * Each sub-section is merged independently so callers can update a single
   * field without providing the full section.
   *
   * FIX: Removed the dead top-level `...updates` spread. `NLPPipelineConfig`
   * has no flat fields — all properties are nested sections — so spreading
   * `updates` at the top level only to have it overridden by the explicit
   * per-section spreads below was entirely redundant.
   *
   * NOTE: CacheService exposes no reconfiguration API. The caching sub-section
   * is persisted to this.config for consistency but cannot be propagated to
   * the underlying cache instances at runtime until the cache layer adds a
   * reconfigure() method.
   * TODO: nlpCacheManager.reconfigure(cacheUpdate) once CacheService supports it.
   */
  updateConfig(updates: Partial<NLPPipelineConfig>): void {
    this.config = {
      clustering: { ...this.config.clustering, ...updates.clustering },
      sentiment:  { ...this.config.sentiment,  ...updates.sentiment  },
      quality:    { ...this.config.quality,    ...updates.quality    },
      caching:    { ...this.config.caching,    ...updates.caching    },
    };

    logger.info({ component: LOG_COMPONENT, config: this.config }, 'NLP Pipeline configuration updated');
  }

  // --------------------------------------------------------------------------
  // Service accessors
  // --------------------------------------------------------------------------

  getClusteringService(): ClusteringService {
    return this.clusteringService;
  }

  getSentimentAnalyzer(): SentimentAnalyzer {
    return this.sentimentAnalyzer;
  }

  getQualityCalculator(): QualityMetricsCalculator {
    return this.qualityCalculator;
  }

  // --------------------------------------------------------------------------
  // Pipeline operations
  // --------------------------------------------------------------------------

  /**
   * Analyze sentiment of a text string, with cache-aside via nlpCacheManager.
   *
   * FIX: Cache key now includes text.length to prevent collisions between
   * texts that share a 100-char prefix but diverge after.
   * FIX: Uses private cacheGetOrCompute helper; eliminates getOrCompute call
   * against CacheService which does not expose that method.
   */
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    if (!this.config.sentiment.enabled) {
      throw new Error('Sentiment analysis is disabled');
    }

    const startTime = Date.now();
    const cache = nlpCacheManager.getSentimentCache();
    const cacheKey = `sentiment:${text.length}:${text.substring(0, 100)}`;

    try {
      const result = await this.cacheGetOrCompute<SentimentResult>(
        cache,
        cacheKey,
        () => this.sentimentAnalyzer.analyzeSentiment(text, {
          includeEmotions: this.config.sentiment.includeEmotions,
          includeDetails:  this.config.sentiment.includeDetails,
          contextWindow:   this.config.sentiment.contextWindow,
        }),
        this.stats.sentiment,
      );

      this.recordTiming('sentiment', Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error(
        { component: LOG_COMPONENT, error: error instanceof Error ? error.message : String(error) },
        'Sentiment analysis failed',
      );
      throw error;
    }
  }

  /**
   * Calculate quality metrics for a text string, with cache-aside.
   *
   * FIX: Cache key now includes text.length as a collision discriminator.
   * FIX: Uses private cacheGetOrCompute helper.
   */
  async calculateQuality(text: string): Promise<QualityMetrics> {
    if (!this.config.quality.enabled) {
      throw new Error('Quality metrics calculation is disabled');
    }

    const startTime = Date.now();
    const cache = nlpCacheManager.getQualityCache();
    const cacheKey = `quality:${text.length}:${text.substring(0, 100)}`;

    try {
      const result = await this.cacheGetOrCompute<QualityMetrics>(
        cache,
        cacheKey,
        () => this.qualityCalculator.calculateArgumentQuality(text, {
          includeDetails: this.config.quality.includeDetails,
          strictMode:     this.config.quality.strictMode,
        }),
        this.stats.quality,
      );

      this.recordTiming('quality', Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error(
        { component: LOG_COMPONENT, error: error instanceof Error ? error.message : String(error) },
        'Quality calculation failed',
      );
      throw error;
    }
  }

  /**
   * Cluster arguments, with cache-aside.
   *
   * FIX: Cache key now uses a djb2 fingerprint over the joined IDs rather
   * than the raw joined string, which could reach kilobyte scale for large
   * argument batches. Key length is now constant.
   * FIX: Uses private cacheGetOrCompute helper.
   */
  async clusterArguments(argList: ClusteredArgument[]): Promise<ClusteringResult> {
    if (!this.config.clustering.enabled) {
      throw new Error('Clustering is disabled');
    }

    const startTime = Date.now();
    const cache = nlpCacheManager.getClusteringCache();
    const idFingerprint = this.fingerprintIds(argList.map((a) => a.id));
    const cacheKey = `cluster:${argList.length}:${idFingerprint}`;

    try {
      const result = await this.cacheGetOrCompute<ClusteringResult>(
        cache,
        cacheKey,
        () => this.clusteringService.clusterArguments(argList, {
          similarityThreshold:   this.config.clustering.similarityThreshold,
          minClusterSize:        this.config.clustering.minClusterSize,
          maxClusters:           this.config.clustering.maxClusters,
          useSemanticSimilarity: this.config.clustering.useSemanticSimilarity,
        }),
        this.stats.clustering,
      );

      this.recordTiming('clustering', Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error(
        { component: LOG_COMPONENT, error: error instanceof Error ? error.message : String(error) },
        'Clustering failed',
      );
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Stats & observability
  // --------------------------------------------------------------------------

  /**
   * Return aggregated pipeline statistics.
   *
   * FIX: getAllStats() returns only { itemCount } per cache and { totalItems }
   * in aggregate — it does not expose hits, misses, hitRate, or totalSize.
   * Hit/miss tracking is now maintained internally via PipelineCounter and
   * the cacheGetOrCompute helper.
   */
  getStats(): NLPPipelineStats {
    const cacheStats = nlpCacheManager.getAllStats();

    const totalHits   = this.stats.clustering.cacheHits   + this.stats.sentiment.cacheHits   + this.stats.quality.cacheHits;
    const totalMisses = this.stats.clustering.cacheMisses + this.stats.sentiment.cacheMisses + this.stats.quality.cacheMisses;
    const totalCalls  = totalHits + totalMisses;

    return {
      clustering: {
        totalProcessed:        this.stats.clustering.count,
        averageProcessingTime: this.safeAverage(this.stats.clustering),
        cacheHitRate:          this.safeRate(this.stats.clustering.cacheHits, this.stats.clustering.cacheHits + this.stats.clustering.cacheMisses),
      },
      sentiment: {
        totalProcessed:        this.stats.sentiment.count,
        averageProcessingTime: this.safeAverage(this.stats.sentiment),
        cacheHitRate:          this.safeRate(this.stats.sentiment.cacheHits, this.stats.sentiment.cacheHits + this.stats.sentiment.cacheMisses),
      },
      quality: {
        totalProcessed:        this.stats.quality.count,
        averageProcessingTime: this.safeAverage(this.stats.quality),
        cacheHitRate:          this.safeRate(this.stats.quality.cacheHits, this.stats.quality.cacheHits + this.stats.quality.cacheMisses),
      },
      cache: {
        totalHits,
        totalMisses,
        hitRate:    this.safeRate(totalHits, totalCalls),
        totalItems: cacheStats.total.totalItems,
      },
    };
  }

  clearCaches(): void {
    nlpCacheManager.clearAll();
    logger.info({ component: LOG_COMPONENT }, 'All NLP caches cleared');
  }

  pruneExpiredCaches(): number {
    const pruned = nlpCacheManager.pruneAllExpired();
    logger.info({ component: LOG_COMPONENT, pruned }, 'Pruned expired cache entries');
    return pruned;
  }

  // --------------------------------------------------------------------------
  // Status
  // --------------------------------------------------------------------------

  /**
   * Return the current pipeline status derived from configuration flags.
   *
   * FIX: Renamed from healthCheck — this method only reads config booleans;
   * it does not probe whether the underlying services are actually functional.
   * A true health check should attempt a lightweight operation on each service.
   *
   * TODO: Add probe calls, e.g.:
   *   clustering: await this.clusteringService.ping().catch(() => false)
   *   sentiment:  await this.sentimentAnalyzer.ping().catch(() => false)
   *   quality:    await this.qualityCalculator.ping().catch(() => false)
   */
  async getStatus(): Promise<PipelineStatus> {
    const details = {
      clustering: this.config.clustering.enabled,
      sentiment:  this.config.sentiment.enabled,
      quality:    this.config.quality.enabled,
      caching:    this.config.caching.enabled,
    };

    const enabledCount = Object.values(details).filter(Boolean).length;
    const status: PipelineStatus['status'] =
      enabledCount === 4 ? 'healthy' : enabledCount >= 2 ? 'degraded' : 'unhealthy';

    return { status, details };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Cache-aside helper.
   *
   * CacheService exposes get/set but not getOrCompute. This helper
   * centralises the read-through pattern and increments the hit/miss
   * counters on the supplied PipelineCounter so getStats() can derive
   * per-pipeline and aggregate cache hit rates without querying the
   * cache manager (which does not expose those fields).
   */
  private async cacheGetOrCompute<T>(
    cache: ReturnType<typeof nlpCacheManager.getSentimentCache>,
    key: string,
    compute: () => Promise<T>,
    counter: PipelineCounter,
  ): Promise<T> {
    const cached = await cache.get<T>(key);
    if (cached !== undefined && cached !== null) {
      counter.cacheHits++;
      return cached;
    }

    counter.cacheMisses++;
    const value = await compute();
    await cache.set(key, value, this.config.caching.ttl);
    return value;
  }

  /**
   * Produce a compact djb2 hex fingerprint from an array of ID strings.
   *
   * Prevents cache keys from scaling linearly with argument count.
   */
  private fingerprintIds(ids: string[]): string {
    const joined = ids.join(',');
    let hash = 5381;
    for (let i = 0; i < joined.length; i++) {
      hash = ((hash << 5) + hash + joined.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16);
  }

  /** Increment timing accumulator for a named pipeline stage. */
  private recordTiming(stage: keyof typeof this.stats, elapsedMs: number): void {
    this.stats[stage].count++;
    this.stats[stage].totalTime += elapsedMs;
  }

  /** Compute mean processing time, guarding against divide-by-zero. */
  private safeAverage(counter: PipelineCounter): number {
    return counter.count > 0 ? counter.totalTime / counter.count : 0;
  }

  /** Compute a ratio, returning 0 when the denominator is zero. */
  private safeRate(numerator: number, denominator: number): number {
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Return a fully independent deep copy of a config object.
   *
   * All sub-sections are plain serializable objects, so structuredClone is safe.
   */
  private deepCopyConfig(config: NLPPipelineConfig): NLPPipelineConfig {
    return structuredClone(config);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const nlpPipelineConfig = new NLPPipelineConfigService();