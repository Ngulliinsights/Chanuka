/**
 * NLP Pipeline Configuration Service
 * 
 * Configures and manages NLP models for argument intelligence
 */

import { logger } from '@server/infrastructure/observability';
import { ClusteringService } from './clustering-service';
import { SentimentAnalyzer } from '../infrastructure/nlp/sentiment-analyzer';
import { QualityMetricsCalculator } from '../infrastructure/nlp/quality-metrics';
import { nlpCacheManager } from '../infrastructure/cache/nlp-cache';
import { SimilarityCalculator } from '@shared/infrastructure/nlp/similarity-calculator';

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
    totalSize: number;
    totalItems: number;
  };
}

/**
 * NLP Pipeline Configuration and Management Service
 */
export class NLPPipelineConfigService {
  private config: NLPPipelineConfig;
  private clusteringService: ClusteringService;
  private sentimentAnalyzer: SentimentAnalyzer;
  private qualityCalculator: QualityMetricsCalculator;
  private stats: {
    clustering: { count: number; totalTime: number };
    sentiment: { count: number; totalTime: number };
    quality: { count: number; totalTime: number };
  };

  constructor() {
    // Initialize with default configuration
    this.config = {
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

    // Initialize services
    const similarityCalculator = new SimilarityCalculator();
    this.clusteringService = new ClusteringService(similarityCalculator);
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.qualityCalculator = new QualityMetricsCalculator();

    // Initialize stats
    this.stats = {
      clustering: { count: 0, totalTime: 0 },
      sentiment: { count: 0, totalTime: 0 },
      quality: { count: 0, totalTime: 0 },
    };

    logger.info('NLP Pipeline Configuration Service initialized', {
      component: 'NLPPipelineConfigService',
      config: this.config,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): NLPPipelineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<NLPPipelineConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      clustering: { ...this.config.clustering, ...updates.clustering },
      sentiment: { ...this.config.sentiment, ...updates.sentiment },
      quality: { ...this.config.quality, ...updates.quality },
      caching: { ...this.config.caching, ...updates.caching },
    };

    // Update cache configuration
    if (updates.caching) {
      nlpCacheManager.getSentimentCache().updateConfig({
        enabled: this.config.caching.enabled,
        ttl: this.config.caching.ttl,
        maxSize: this.config.caching.maxSize,
      });
      nlpCacheManager.getClusteringCache().updateConfig({
        enabled: this.config.caching.enabled,
        ttl: this.config.caching.ttl,
        maxSize: this.config.caching.maxSize,
      });
      nlpCacheManager.getQualityCache().updateConfig({
        enabled: this.config.caching.enabled,
        ttl: this.config.caching.ttl,
        maxSize: this.config.caching.maxSize,
      });
    }

    logger.info('NLP Pipeline configuration updated', {
      component: 'NLPPipelineConfigService',
      config: this.config,
    });
  }

  /**
   * Get clustering service
   */
  getClusteringService(): ClusteringService {
    return this.clusteringService;
  }

  /**
   * Get sentiment analyzer
   */
  getSentimentAnalyzer(): SentimentAnalyzer {
    return this.sentimentAnalyzer;
  }

  /**
   * Get quality calculator
   */
  getQualityCalculator(): QualityMetricsCalculator {
    return this.qualityCalculator;
  }

  /**
   * Process text through sentiment analysis with caching
   */
  async analyzeSentiment(text: string): Promise<any> {
    if (!this.config.sentiment.enabled) {
      throw new Error('Sentiment analysis is disabled');
    }

    const startTime = Date.now();
    const cache = nlpCacheManager.getSentimentCache();
    const cacheKey = `sentiment:${text.substring(0, 100)}`;

    try {
      // Try cache first
      const result = await cache.getOrCompute(cacheKey, async () => {
        return await this.sentimentAnalyzer.analyzeSentiment(text, {
          includeEmotions: this.config.sentiment.includeEmotions,
          includeDetails: this.config.sentiment.includeDetails,
          contextWindow: this.config.sentiment.contextWindow,
        });
      });

      // Update stats
      const processingTime = Date.now() - startTime;
      this.stats.sentiment.count++;
      this.stats.sentiment.totalTime += processingTime;

      return result;
    } catch (error) {
      logger.error('Sentiment analysis failed', {
        component: 'NLPPipelineConfigService',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate quality metrics with caching
   */
  async calculateQuality(text: string): Promise<any> {
    if (!this.config.quality.enabled) {
      throw new Error('Quality metrics calculation is disabled');
    }

    const startTime = Date.now();
    const cache = nlpCacheManager.getQualityCache();
    const cacheKey = `quality:${text.substring(0, 100)}`;

    try {
      // Try cache first
      const result = await cache.getOrCompute(cacheKey, async () => {
        return await this.qualityCalculator.calculateArgumentQuality(text, {
          includeDetails: this.config.quality.includeDetails,
          strictMode: this.config.quality.strictMode,
        });
      });

      // Update stats
      const processingTime = Date.now() - startTime;
      this.stats.quality.count++;
      this.stats.quality.totalTime += processingTime;

      return result;
    } catch (error) {
      logger.error('Quality calculation failed', {
        component: 'NLPPipelineConfigService',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Cluster arguments with caching
   */
  async clusterArguments(arguments: any[]): Promise<any> {
    if (!this.config.clustering.enabled) {
      throw new Error('Clustering is disabled');
    }

    const startTime = Date.now();
    const cache = nlpCacheManager.getClusteringCache();
    const cacheKey = `cluster:${arguments.length}:${arguments.map(a => a.id).join(',')}`;

    try {
      // Try cache first
      const result = await cache.getOrCompute(cacheKey, async () => {
        return await this.clusteringService.clusterArguments(arguments, {
          similarityThreshold: this.config.clustering.similarityThreshold,
          minClusterSize: this.config.clustering.minClusterSize,
          maxClusters: this.config.clustering.maxClusters,
          useSemanticSimilarity: this.config.clustering.useSemanticSimilarity,
        });
      });

      // Update stats
      const processingTime = Date.now() - startTime;
      this.stats.clustering.count++;
      this.stats.clustering.totalTime += processingTime;

      return result;
    } catch (error) {
      logger.error('Clustering failed', {
        component: 'NLPPipelineConfigService',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get pipeline statistics
   */
  getStats(): NLPPipelineStats {
    const cacheStats = nlpCacheManager.getAllStats();

    return {
      clustering: {
        totalProcessed: this.stats.clustering.count,
        averageProcessingTime:
          this.stats.clustering.count > 0
            ? this.stats.clustering.totalTime / this.stats.clustering.count
            : 0,
        cacheHitRate: cacheStats.clustering.hitRate,
      },
      sentiment: {
        totalProcessed: this.stats.sentiment.count,
        averageProcessingTime:
          this.stats.sentiment.count > 0
            ? this.stats.sentiment.totalTime / this.stats.sentiment.count
            : 0,
        cacheHitRate: cacheStats.sentiment.hitRate,
      },
      quality: {
        totalProcessed: this.stats.quality.count,
        averageProcessingTime:
          this.stats.quality.count > 0
            ? this.stats.quality.totalTime / this.stats.quality.count
            : 0,
        cacheHitRate: cacheStats.quality.hitRate,
      },
      cache: {
        totalHits: cacheStats.total.hits,
        totalMisses: cacheStats.total.misses,
        hitRate: cacheStats.total.hitRate,
        totalSize: cacheStats.total.totalSize,
        totalItems: cacheStats.total.totalItems,
      },
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    nlpCacheManager.clearAll();
    logger.info('All NLP caches cleared', {
      component: 'NLPPipelineConfigService',
    });
  }

  /**
   * Prune expired cache entries
   */
  pruneExpiredCaches(): number {
    const pruned = nlpCacheManager.pruneAllExpired();
    logger.info('Pruned expired cache entries', {
      component: 'NLPPipelineConfigService',
      pruned,
    });
    return pruned;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      clustering: boolean;
      sentiment: boolean;
      quality: boolean;
      caching: boolean;
    };
  }> {
    const details = {
      clustering: this.config.clustering.enabled,
      sentiment: this.config.sentiment.enabled,
      quality: this.config.quality.enabled,
      caching: this.config.caching.enabled,
    };

    const enabledCount = Object.values(details).filter(Boolean).length;
    const status =
      enabledCount === 4 ? 'healthy' : enabledCount >= 2 ? 'degraded' : 'unhealthy';

    return { status, details };
  }
}

// Singleton instance
export const nlpPipelineConfig = new NLPPipelineConfigService();
