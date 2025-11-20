/**
 * AI Cache - Intelligent caching specifically designed for AI responses
 * 
 * Features:
 * - Content-aware caching with semantic similarity detection
 * - Cost-aware cache policies (expensive operations cached longer)
 * - Adaptive TTL based on request patterns and accuracy
 * - Cache warming for frequently requested AI operations
 * - Intelligent cache invalidation based on data freshness
 */

import { CacheService, CacheHealthStatus } from '@client/types';
import { getDefaultCache } from './index';
import { performance } from 'perf_hooks';
import { logger } from '../observability/logging';

export interface AICacheOptions {
  baseCache?: CacheService;
  enableSemanticSimilarity?: boolean;
  enableCostAwareCaching?: boolean;
  enableAdaptiveTTL?: boolean;
  enableCacheWarming?: boolean;
  defaultTTL?: number;
  maxTTL?: number;
  minTTL?: number;
  similarityThreshold?: number;
  costMultiplier?: number;
}

export interface AICacheEntry {
  data: any;
  timestamp: number;
  cost: number;
  accuracy?: number;
  hitCount: number;
  lastAccessed: number;
  ttl: number;
  service: string;
  operation: string;
  inputHash: string;
  metadata?: {
    model?: string;
    version?: string;
    confidence?: number;
    processingTime?: number;
  };
}

export interface AICacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgResponseTime: number;
  costSavings: number;
  totalCostSaved: number;
  serviceBreakdown: {
    [service: string]: {
      requests: number;
      hits: number;
      hitRate: number;
      costSaved: number;
    };
  };
}

export class AICache {
  private baseCache: CacheService;
  private options: Required<AICacheOptions>;
  private metrics: AICacheMetrics;
  private warmingQueue = new Set<string>();

  constructor(options: AICacheOptions = {}) {
    this.baseCache = options.baseCache || getDefaultCache();
    this.options = {
      baseCache: this.baseCache,
      enableSemanticSimilarity: false, // Disabled by default due to complexity
      enableCostAwareCaching: true,
      enableAdaptiveTTL: true,
      enableCacheWarming: true,
      defaultTTL: 300, // 5 minutes
      maxTTL: 3600, // 1 hour
      minTTL: 60, // 1 minute
      similarityThreshold: 0.8,
      costMultiplier: 10, // Cache expensive operations 10x longer
      ...options
    };

    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      costSavings: 0,
      totalCostSaved: 0,
      serviceBreakdown: {}
    };
  }

  /**
   * Get cached AI response
   */
  async get(
    key: string,
    service: string,
    operation: string,
    inputData?: any
  ): Promise<any | null> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // Try exact key match first
      const cacheKey = this.generateCacheKey(key, service, operation);
      const cached = await this.baseCache.get(cacheKey);

      if (cached) {
        const entry = cached as AICacheEntry;
        
        // Update access statistics
        entry.hitCount++;
        entry.lastAccessed = Date.now();
        await this.baseCache.set(cacheKey, entry, entry.ttl);

        this.recordCacheHit(service, entry.cost, performance.now() - startTime);
        
        logger.info('AI Cache Hit', { component: 'Chanuka' }, {
          service,
          operation,
          key: cacheKey,
          hitCount: entry.hitCount,
          age: Date.now() - entry.timestamp,
          cost: entry.cost
        });

        return entry.data;
      }

      // If semantic similarity is enabled, try to find similar requests
      if (this.options.enableSemanticSimilarity && inputData) {
        const similarResult = await this.findSimilarCachedResult(
          service,
          operation,
          inputData
        );
        
        if (similarResult) {
          this.recordCacheHit(service, similarResult.cost, performance.now() - startTime);
          return similarResult.data;
        }
      }

      this.recordCacheMiss(service, performance.now() - startTime);
      return null;

    } catch (error) {
      logger.error('AI cache get error:', { component: 'Chanuka' }, error);
      this.recordCacheMiss(service, performance.now() - startTime);
      return null;
    }
  }

  /**
   * Set AI response in cache with intelligent TTL
   */
  async set(
    key: string,
    data: any,
    service: string,
    operation: string,
    options: {
      cost?: number;
      accuracy?: number;
      inputData?: any;
      metadata?: AICacheEntry['metadata'];
      forceTTL?: number;
    } = {}
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(key, service, operation);
      const ttl = options.forceTTL || this.calculateTTL(service, operation, options.cost, options.accuracy);

      const entry: AICacheEntry = {
        data,
        timestamp: Date.now(),
        cost: options.cost || 1,
        accuracy: options.accuracy,
        hitCount: 0,
        lastAccessed: Date.now(),
        ttl,
        service,
        operation,
        inputHash: this.hashInput(options.inputData),
        metadata: options.metadata
      };

      await this.baseCache.set(cacheKey, entry, ttl);

      logger.info('AI Cache Set', { component: 'Chanuka' }, {
        service,
        operation,
        key: cacheKey,
        ttl,
        cost: entry.cost,
        accuracy: entry.accuracy
      });

      // Trigger cache warming for related operations if enabled
      if (this.options.enableCacheWarming) {
        this.scheduleRelatedCacheWarming(service, operation, options.inputData);
      }

    } catch (error) {
      logger.error('AI cache set error:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Invalidate cache entries based on various criteria
   */
  async invalidate(criteria: {
    service?: string;
    operation?: string;
    pattern?: string;
    olderThan?: number;
    accuracy?: { below: number };
    cost?: { above: number };
  }): Promise<number> {
    try {
      let invalidatedCount = 0;

      if (criteria.pattern) {
        // Use pattern-based invalidation if available
        if (this.baseCache.invalidateByPattern) {
          await this.baseCache.invalidateByPattern(criteria.pattern);
          invalidatedCount = 1; // We don't know the exact count
        }
      } else {
        // For more complex criteria, we'd need to scan all keys
        // This is a simplified implementation
        logger.info('AI cache invalidation requested', { component: 'Chanuka' }, criteria);
      }

      return invalidatedCount;
    } catch (error) {
      logger.error('AI cache invalidation error:', { component: 'Chanuka' }, error);
      return 0;
    }
  }

  /**
   * Warm cache with predicted requests
   */
  async warmCache(entries: Array<{
    key: string;
    service: string;
    operation: string;
    factory: () => Promise<any>;
    cost?: number;
    priority?: number;
  }>): Promise<void> {
    // Sort by priority (higher first)
    const sortedEntries = entries.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const warmingPromises = sortedEntries.map(async (entry) => {
      const cacheKey = this.generateCacheKey(entry.key, entry.service, entry.operation);
      
      if (this.warmingQueue.has(cacheKey)) {
        return; // Already warming this entry
      }

      this.warmingQueue.add(cacheKey);

      try {
        // Check if already cached
        const existing = await this.baseCache.get(cacheKey);
        if (existing) {
          return;
        }

        logger.info('Warming AI cache', { component: 'Chanuka' }, {
          service: entry.service,
          operation: entry.operation,
          key: entry.key
        });

        // Generate the data
        const data = await entry.factory();
        
        // Cache the result
        await this.set(entry.key, data, entry.service, entry.operation, {
          cost: entry.cost || 1
        });

      } catch (error) {
        console.warn('Cache warming failed for', entry.key, error);
      } finally {
        this.warmingQueue.delete(cacheKey);
      }
    });

    await Promise.allSettled(warmingPromises);
  }

  /**
   * Get cache metrics
   */
  getMetrics(): AICacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all AI cache entries
   */
  async clear(service?: string): Promise<void> {
    if (service) {
      const pattern = `ai_cache:${service}:*`;
      if (this.baseCache.invalidateByPattern) {
        await this.baseCache.invalidateByPattern(pattern);
      }
    } else {
      const pattern = 'ai_cache:*';
      if (this.baseCache.invalidateByPattern) {
        await this.baseCache.invalidateByPattern(pattern);
      }
    }
  }

  /**
   * Health check for AI cache
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    baseCache: boolean;
    metrics: AICacheMetrics;
    warmingQueueSize: number;
  }> {
    try {
      const baseCacheHealth = this.baseCache.getHealth 
        ? await this.baseCache.getHealth()
        : { connected: true, latency: 0, stats: { hits: 0, misses: 0, hitRate: 0, operations: 0, errors: 0, memoryUsage: 0, keyCount: 0, avgLatency: 0, maxLatency: 0, minLatency: 0, avgResponseTime: 0 } };
      const baseCacheHealthy = baseCacheHealth.connected;

      return {
        healthy: baseCacheHealthy,
        baseCache: baseCacheHealthy,
        metrics: this.getMetrics(),
        warmingQueueSize: this.warmingQueue.size
      };
    } catch (error) {
      return {
        healthy: false,
        baseCache: false,
        metrics: this.getMetrics(),
        warmingQueueSize: this.warmingQueue.size
      };
    }
  }

  // Private helper methods

  private generateCacheKey(key: string, service: string, operation: string): string {
    return `ai_cache:${service}:${operation}:${key}`;
  }

  private calculateTTL(
    service: string,
    operation: string,
    cost?: number,
    accuracy?: number
  ): number {
    let ttl = this.options.defaultTTL;

    // Cost-aware caching: expensive operations cached longer
    if (this.options.enableCostAwareCaching && cost) {
      ttl = Math.min(
        this.options.maxTTL,
        ttl * Math.log(cost * this.options.costMultiplier + 1)
      );
    }

    // Accuracy-aware caching: more accurate results cached longer
    if (this.options.enableAdaptiveTTL && accuracy) {
      const accuracyMultiplier = Math.max(0.5, accuracy);
      ttl = ttl * accuracyMultiplier;
    }

    // Service-specific adjustments
    const serviceMultipliers: { [key: string]: number } = {
      'property-analysis': 2, // Property analysis results are stable
      'document-processing': 3, // Document processing results don't change
      'fraud-detection': 0.5, // Fraud patterns change quickly
      'recommendation': 1.5 // Recommendations can be cached moderately
    };

    if (serviceMultipliers[service]) {
      ttl = ttl * serviceMultipliers[service];
    }

    return Math.max(this.options.minTTL, Math.min(this.options.maxTTL, Math.floor(ttl)));
  }

  private hashInput(inputData: any): string {
    if (!inputData) return 'no-input';
    
    const str = JSON.stringify(inputData, Object.keys(inputData).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async findSimilarCachedResult(
    service: string,
    operation: string,
    inputData: any
  ): Promise<AICacheEntry | null> {
    // This would implement semantic similarity search
    // For now, return null as it requires complex NLP processing
    return null;
  }

  private scheduleRelatedCacheWarming(
    service: string,
    operation: string,
    inputData: any
  ): void {
    // This would implement intelligent cache warming based on patterns
    // For now, just log the warming opportunity
    logger.info('Cache warming opportunity detected', { component: 'Chanuka' }, {
      service,
      operation,
      inputHash: this.hashInput(inputData)
    });
  }

  private recordCacheHit(service: string, cost: number, responseTime: number): void {
    this.metrics.cacheHits++;
    this.metrics.hitRate = this.metrics.cacheHits / this.metrics.totalRequests;
    this.metrics.costSavings += cost;
    this.metrics.totalCostSaved += cost;
    this.updateResponseTime(responseTime);
    this.updateServiceMetrics(service, true, cost);
  }

  private recordCacheMiss(service: string, responseTime: number): void {
    this.metrics.cacheMisses++;
    this.metrics.hitRate = this.metrics.cacheHits / this.metrics.totalRequests;
    this.updateResponseTime(responseTime);
    this.updateServiceMetrics(service, false, 0);
  }

  private updateResponseTime(responseTime: number): void {
    const totalTime = this.metrics.avgResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.avgResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
  }

  private updateServiceMetrics(service: string, hit: boolean, costSaved: number): void {
    if (!this.metrics.serviceBreakdown[service]) {
      this.metrics.serviceBreakdown[service] = {
        requests: 0,
        hits: 0,
        hitRate: 0,
        costSaved: 0
      };
    }

    const serviceMetrics = this.metrics.serviceBreakdown[service];
    serviceMetrics.requests++;
    
    if (hit) {
      serviceMetrics.hits++;
      serviceMetrics.costSaved += costSaved;
    }
    
    serviceMetrics.hitRate = serviceMetrics.hits / serviceMetrics.requests;
  }
}

/**
 * Create AI cache instance
 */
export function createAICache(options: AICacheOptions = {}): AICache {
  return new AICache(options);
}

/**
 * Default AI cache instance
 */
let defaultAICache: AICache | null = null;

export function getDefaultAICache(): AICache {
  if (!defaultAICache) {
    defaultAICache = createAICache();
  }
  return defaultAICache;
}

export function setDefaultAICache(cache: AICache): void {
  defaultAICache = cache;
}












































