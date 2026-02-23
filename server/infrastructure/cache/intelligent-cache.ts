/**
 * Intelligent Caching Strategy
 *
 * Builds caching recommendations from actual usage patterns.
 * Only caches what metrics show is worth caching.
 *
 * @deprecated This module uses Node.js-specific APIs (`fs`, `path`) and
 * should NOT reside in `shared/`. Move to `server/infrastructure/cache/`
 * so client bundles are not polluted with Node.js imports.
 *
 * Strategy:
 * - Measure cache hit rates
 * - Calculate actual time savings
 * - Only recommend cache for high-frequency, high-time-cost operations
 * - Use TTL based on data change frequency
 */

import * as fs from 'fs';
import * as path from 'path';

// Types defined locally since @shared/types/performance does not exist
// and this module is deprecated (should move to server/).
interface CacheMetrics {
  cacheKey: string;
  hitCount: number;
  missCount: number;
  hitRate: number;
  avgHitTimeMs: number;
  avgMissTimeMs: number;
  totalSizeBytes: number;
  estimatedSavingsMs: number;
  recommendedTTL: number;
}

interface CacheAggregate {
  totalHits: number;
  totalMisses: number;
  overallHitRate: number;
  totalSizeBytes: number;
  estimatedSavingsMs: number;
  hotSpots: CacheMetrics[];
}

interface PerformanceRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  estimatedSavingsMs: number;
  effort: string;
  evidenceMetrics: string[];
  implementationSteps: string[];
}

/**
 * Tracks cache performance for analysis
 */
interface CacheEntry {
  key: string;
  accessCount: number;
  hitCount: number;
  missCount: number;
  lastAccessTime: number;
  lastSetTime: number;
  size: number;
  operationTimeMs: number; // time to generate if miss
}

/**
 * Intelligent cache that analyzes its own performance
 * Only returns metrics, doesn't make decisions
 */
export class IntelligentCache {
  private cache: Map<string, { value: unknown; timestamp: number }> = new Map();
  private metrics: Map<string, CacheEntry> = new Map();
  private ttlMap: Map<string, number> = new Map();
  private outputPath: string;

  constructor(outputPath: string = './cache-analysis') {
    this.outputPath = outputPath;
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
  }

  /**
   * Retrieve from cache with metrics
   * Records whether it was a hit or miss
   */
  get<T>(key: string): { value: T | null; isHit: boolean } {
    const now = Date.now();
    const entry = this.cache.get(key);

    let metrics = this.metrics.get(key);
    if (!metrics) {
      metrics = {
        key,
        accessCount: 0,
        hitCount: 0,
        missCount: 0,
        lastAccessTime: now,
        lastSetTime: 0,
        size: 0,
        operationTimeMs: 0,
      };
      this.metrics.set(key, metrics);
    }

    metrics.accessCount += 1;
    metrics.lastAccessTime = now;

    if (!entry) {
      metrics.missCount += 1;
      return { value: null, isHit: false };
    }

    const ttl = this.ttlMap.get(key) || Infinity;
    if (now - entry.timestamp > ttl) {
      // Expired
      this.cache.delete(key);
      metrics.missCount += 1;
      return { value: null, isHit: false };
    }

    metrics.hitCount += 1;
    return { value: entry.value as T, isHit: true };
  }

  /**
   * Set cache value with TTL
   * Records the time it took to generate this value
   */
  set<T>(key: string, value: T, ttlMs: number = 300000, generationTimeMs: number = 0): void {
    const now = Date.now();
    this.cache.set(key, { value, timestamp: now });
    this.ttlMap.set(key, ttlMs);

    let metrics = this.metrics.get(key);
    if (!metrics) {
      metrics = {
        key,
        accessCount: 0,
        hitCount: 0,
        missCount: 0,
        lastAccessTime: now,
        lastSetTime: now,
        size: this.estimateSize(value),
        operationTimeMs: generationTimeMs,
      };
      this.metrics.set(key, metrics);
    } else {
      metrics.lastSetTime = now;
      metrics.size = this.estimateSize(value);
      metrics.operationTimeMs = generationTimeMs;
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache) {
      const ttl = this.ttlMap.get(key) || Infinity;
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
        cleared += 1;
      }
    }

    return cleared;
  }

  /**
   * Estimate value size in bytes (rough estimate)
   */
  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1024; // Default estimate for circular refs
    }
  }

  /**
   * Calculate hit rate for a key
   */
  getHitRate(key: string): number {
    const metrics = this.metrics.get(key);
    if (!metrics || metrics.accessCount === 0) {
      return 0;
    }
    return metrics.hitCount / metrics.accessCount;
  }

  /**
   * Get cache metrics for a key
   */
  getMetrics(key: string): CacheMetrics | null {
    const metrics = this.metrics.get(key);
    if (!metrics) return null;

    const hitRate = metrics.hitCount / (metrics.accessCount || 1);
    const timePerHit = metrics.operationTimeMs / (metrics.hitCount || 1);
    const missTime = metrics.operationTimeMs;

    return {
      cacheKey: key,
      hitCount: metrics.hitCount,
      missCount: metrics.missCount,
      hitRate,
      avgHitTimeMs: timePerHit * 0.1, // Rough estimate of cache lookup time
      avgMissTimeMs: missTime,
      totalSizeBytes: metrics.size,
      estimatedSavingsMs: hitRate * metrics.hitCount * (missTime * 0.9),
      recommendedTTL: this.calculateOptimalTTL(metrics),
    };
  }

  /**
   * Calculate optimal TTL based on access patterns
   */
  private calculateOptimalTTL(metrics: CacheEntry): number {
    if (metrics.accessCount < 3) {
      return 60000; // 1 minute if rarely accessed
    }

    // If high frequency, longer TTL
    const avgAccessInterval = (Date.now() - metrics.lastAccessTime) / (metrics.accessCount - 1);
    return Math.min(avgAccessInterval * 10, 3600000); // Max 1 hour
  }

  /**
   * Aggregate metrics across all keys
   */
  getAggregate(): CacheAggregate {
    const allMetrics = Array.from(this.metrics.values());

    const totalHits = allMetrics.reduce((sum, m) => sum + m.hitCount, 0);
    const totalMisses = allMetrics.reduce((sum, m) => sum + m.missCount, 0);
    const overallHitRate = totalHits / (totalHits + totalMisses || 1);
    const totalSizeBytes = allMetrics.reduce((sum, m) => sum + m.size, 0);

    // Find hot spots - high hit rate and high savings
    const hotSpots = allMetrics
      .map((m) => this.getMetrics(m.key))
      .filter((m) => m !== null && m.hitRate > 0.5 && m.estimatedSavingsMs > 100)
      .sort((a, b) => (b?.estimatedSavingsMs ?? 0) - (a?.estimatedSavingsMs ?? 0))
      .slice(0, 10) as CacheMetrics[];

    const estimatedSavingsMs = hotSpots.reduce((sum, m) => sum + m.estimatedSavingsMs, 0);

    return {
      totalHits,
      totalMisses,
      overallHitRate,
      totalSizeBytes,
      estimatedSavingsMs,
      hotSpots,
    };
  }

  /**
   * Generate recommendations
   * Based on actual cache performance
   */
  generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const aggregate = this.getAggregate();

    // High-value caching opportunities
    for (const hotSpot of aggregate.hotSpots) {
      if (hotSpot.estimatedSavingsMs > 500) {
        recommendations.push({
          priority: hotSpot.estimatedSavingsMs > 2000 ? 'high' : 'medium',
          category: 'cache',
          title: `Optimize Cache Usage for "${hotSpot.cacheKey.substring(0, 40)}"`,
          description: `High-value cache opportunity: ${hotSpot.hitRate.toFixed(1)}% hit rate, ~${hotSpot.estimatedSavingsMs.toFixed(0)}ms potential savings.`,
          estimatedSavingsMs: hotSpot.estimatedSavingsMs,
          effort: 'low',
          evidenceMetrics: ['hit-rate', 'estimated-savings', 'access-frequency'],
          implementationSteps: [
            `Increase TTL from current to ${hotSpot.recommendedTTL}ms`,
            'Monitor hit rate after change',
            'Adjust TTL if hit rate decreases',
          ],
        });
      }
    }

    // Poor cache candidates
    const poorCandidates = Array.from(this.metrics.values())
      .filter((m) => m.accessCount > 5 && this.getHitRate(m.key) < 0.2);

    for (const poor of poorCandidates.slice(0, 3)) {
      recommendations.push({
        priority: 'low',
        category: 'cache',
        title: `Consider Removing Cache for "${poor.key.substring(0, 40)}"`,
        description: `Low hit rate (${(this.getHitRate(poor.key) * 100).toFixed(1)}%) suggests caching isn't effective here.`,
        estimatedSavingsMs: 0,
        effort: 'low',
        evidenceMetrics: ['low-hit-rate'],
        implementationSteps: [
          'Monitor if removing cache affects performance',
          'Redirect to always-fresh data',
          'Validate cache miss impact',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Save analysis report
   */
  saveReport(sessionName: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = path.join(this.outputPath, `cache-analysis-${sessionName}-${timestamp}.json`);

    const allMetrics = Array.from(this.metrics.entries()).map(([_key, metrics]) => ({
      ...metrics,
      hitRate: this.getHitRate(metrics.key),
    }));

    const report = {
      timestamp: new Date().toISOString(),
      sessionName,
      aggregate: this.getAggregate(),
      cacheMetrics: allMetrics,
      recommendations: this.generateRecommendations(),
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    return filename;
  }

  /**
   * Format report for display
   */
  formatReport(): string {
    const agg = this.getAggregate();

    let output = '\n💾 Cache Performance Analysis\n';
    output += `${'='.repeat(60)}\n\n`;

    output += `📊 Overall Metrics\n`;
    output += `   Total Hits: ${agg.totalHits}\n`;
    output += `   Total Misses: ${agg.totalMisses}\n`;
    output += `   Hit Rate: ${(agg.overallHitRate * 100).toFixed(1)}%\n`;
    output += `   Total Size: ${(agg.totalSizeBytes / 1024).toFixed(2)}KB\n`;
    output += `   Estimated Savings: ${agg.estimatedSavingsMs.toFixed(0)}ms\n\n`;

    if (agg.hotSpots.length > 0) {
      output += `🔥 Hot Spots (High-Value Cache Keys)\n`;
      for (const spot of agg.hotSpots) {
        output += `   • "${spot.cacheKey.substring(0, 40)}"\n`;
        output += `     Hit Rate: ${(spot.hitRate * 100).toFixed(1)}% | Savings: ${spot.estimatedSavingsMs.toFixed(0)}ms\n`;
      }
    }

    return output;
  }
}

/**
 * Export for use in other modules
 */
export const cache = new IntelligentCache();

export default IntelligentCache;
