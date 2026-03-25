// ============================================================================
// ARGUMENT INTELLIGENCE - Evidence Cache Manager
// ============================================================================
// Wrapper leveraging unified cache infrastructure for evidence validation.
// Replaces the redundant EvidenceCache implementations with the standard factory.

import { createCacheService } from '@server/infrastructure/cache/factory';
import type { CacheService } from '@server/infrastructure/cache/types';

/**
 * Evidence Cache Manager
 *
 * Provides separate cache instances for source credibility and fact-check results.
 * Leverages the unified caching infrastructure for consistency, flexibility, and
 * support for multiple adapters (memory, Redis, multi-tier).
 */
export class EvidenceCacheManager {
  private sourceCredibilityCache: CacheService;
  private factCheckCache: CacheService;

  constructor() {
    // Source credibility cache — stores credibility scores for evidence sources
    this.sourceCredibilityCache = createCacheService({
      provider: 'memory',
      defaultTtlSec: 86400, // 24 hours
      maxMemoryMB: 100,
    });

    // Fact-check cache — stores fact-check status and results
    this.factCheckCache = createCacheService({
      provider: 'memory',
      defaultTtlSec: 86400, // 24 hours
      maxMemoryMB: 100,
    });
  }

  /**
   * Get the source credibility cache instance.
   */
  getSourceCredibilityCache(): CacheService {
    return this.sourceCredibilityCache;
  }

  /**
   * Get the fact-check cache instance.
   */
  getFactCheckCache(): CacheService {
    return this.factCheckCache;
  }

  /**
   * Get aggregated statistics from all caches.
   */
  getAllStats() {
    const credibility = this.sourceCredibilityCache.getMetrics?.() ?? { hits: 0, misses: 0, keyCount: 0, hitRate: 0, operations: 0, errors: 0, avgLatency: 0, maxLatency: 0, minLatency: 0, memoryUsage: 0 };
    const factCheck = this.factCheckCache.getMetrics?.() ?? { hits: 0, misses: 0, keyCount: 0, hitRate: 0, operations: 0, errors: 0, avgLatency: 0, maxLatency: 0, minLatency: 0, memoryUsage: 0 };

    const totalHits = credibility.hits + factCheck.hits;
    const totalMisses = credibility.misses + factCheck.misses;

    return {
      sourceCredibility: credibility,
      factCheck: factCheck,
      total: {
        hits: totalHits,
        misses: totalMisses,
        hitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,
        totalItems: (credibility.keyCount || 0) + (factCheck.keyCount || 0),
      },
    };
  }

  /**
   * Shutdown both caches and clean up resources.
   */
  async destroy(): Promise<void> {
    // Use type assertion to access potential destroy method on adapters
    const sourceCache = this.sourceCredibilityCache as any;
    const factCheckCache = this.factCheckCache as any;
    
    if (typeof sourceCache.destroy === 'function') {
      await sourceCache.destroy();
    }
    if (typeof factCheckCache.destroy === 'function') {
      await factCheckCache.destroy();
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const evidenceCacheManager = new EvidenceCacheManager();
