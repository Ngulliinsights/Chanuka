/**
 * Runtime Validation Caching
 * Efficient caching strategies for runtime validation to improve performance
 */

import { z } from 'zod';
import { createValidatedType } from '../core/validation';
import { Result, ValidationError } from '../core/errors';

// ============================================================================
// Validation Cache Types
// ============================================================================

export type ValidationCacheKey = string | symbol | number;

export type ValidationCacheEntry<T> = {
  /** The validated result */
  readonly result: T;

  /** Timestamp when cached */
  readonly timestamp: number;

  /** Cache expiration time */
  readonly expiresAt: number;

  /** Cache hit count */
  readonly hitCount: number;

  /** Validation metadata */
  readonly metadata?: ValidationCacheMetadata;
};

export type ValidationCacheMetadata = {
  /** Schema used for validation */
  readonly schemaId?: string;

  /** Input hash */
  readonly inputHash?: string;

  /** Validation duration in ms */
  readonly validationDurationMs?: number;

  /** Cache strategy used */
  readonly cacheStrategy?: ValidationCacheStrategy;
};

export type ValidationCacheStrategy =
  | 'time-based'
  | 'size-based'
  | 'frequency-based'
  | 'hybrid'
  | 'adaptive'
  | 'lru' // Least Recently Used
  | 'lfu' // Least Frequently Used
  | 'fifo' // First In First Out;

// ============================================================================
// Cache Configuration
// ============================================================================

export type ValidationCacheConfig = {
  /** Maximum cache size */
  readonly maxSize: number;

  /** Default TTL (Time To Live) in milliseconds */
  readonly defaultTtlMs: number;

  /** Cache strategy */
  readonly strategy: ValidationCacheStrategy;

  /** Enable adaptive caching */
  readonly adaptive: boolean;

  /** Maximum memory usage in MB */
  readonly maxMemoryMb?: number;

  /** Cache eviction policy */
  readonly evictionPolicy?: CacheEvictionPolicy;

  /** Performance monitoring */
  readonly monitorPerformance?: boolean;
};

export type CacheEvictionPolicy = {
  /** Eviction check interval in ms */
  readonly checkIntervalMs: number;

  /** Minimum cache size before eviction */
  readonly minSizeBeforeEviction: number;

  /** Eviction batch size */
  readonly batchSize: number;

  /** Enable background eviction */
  readonly backgroundEviction: boolean;
};

export type CachedValidationResult<T> = {
  /** Whether result came from cache */
  readonly fromCache: boolean;

  /** The validation result */
  readonly result: Result<T, ValidationError>;

  /** Cache metadata */
  cacheMetadata?: ValidationCacheMetadata;

  /** Performance metrics */
  performance?: ValidationCachePerformance;
};

export type ValidationCachePerformance = {
  /** Total validation time in ms */
  readonly totalTimeMs: number;

  /** Cache lookup time in ms */
  readonly cacheLookupTimeMs: number;

  /** Actual validation time in ms (if not cached) */
  readonly validationTimeMs?: number;

  /** Cache hit/miss indicator */
  readonly cacheHit: boolean;

  /** Memory usage delta in bytes */
  readonly memoryDeltaBytes?: number;
};

export type ValidationCacheStatistics = {
  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Current cache size */
  currentSize: number;

  /** Total evictions */
  evictions: number;

  /** Cache hit rate (0-1) */
  hitRate: number;

  /** Average validation time saved in ms */
  avgTimeSavedMs: number;

  /** Total memory saved in bytes */
  memorySavedBytes: number;

  /** Cache efficiency score (0-100) */
  efficiencyScore: number;
};

export type ValidationCacheMonitor = {
  /** Cache configuration */
  config: ValidationCacheConfig;

  /** Current statistics */
  stats: ValidationCacheStatistics;

  /** Performance history */
  history: ValidationCachePerformance[];

  /** Get current cache state */
  getCacheState(): ValidationCacheState;

  /** Generate performance report */
  generateReport(): ValidationCacheReport;

  /** Adjust cache configuration */
  adjustConfig(newConfig: Partial<ValidationCacheConfig>): void;
};

export type ValidationCacheState = {
  /** Current cache entries */
  readonly entryCount: number;

  /** Current memory usage in bytes */
  readonly memoryUsageBytes: number;

  /** Cache utilization percentage */
  readonly utilization: number;

  /** Most frequently accessed entries */
  readonly hotEntries: ValidationCacheEntryInfo[];

  /** Least frequently accessed entries */
  readonly coldEntries: ValidationCacheEntryInfo[];
};

export type ValidationCacheEntryInfo = {
  /** Cache key */
  readonly key: ValidationCacheKey;

  /** Hit count */
  readonly hits: number;

  /** Last access time */
  readonly lastAccessed: number;

  /** Entry size in bytes */
  readonly sizeBytes: number;
};

// ============================================================================
// Cache Report
// ============================================================================

export type ValidationCacheReport = {
  /** Report timestamp */
  readonly timestamp: number;

  /** Cache configuration */
  readonly config: ValidationCacheConfig;

  /** Performance statistics */
  readonly stats: ValidationCacheStatistics;

  /** Performance trends */
  readonly trends: ValidationCacheTrend[];

  /** Optimization recommendations */
  readonly recommendations: ValidationCacheRecommendation[];

  /** Summary */
  readonly summary: string;
};

export type ValidationCacheTrend = {
  /** Trend type */
  readonly type: 'hit-rate' | 'memory-usage' | 'validation-time' | 'efficiency';

  /** Trend direction */
  readonly direction: 'improving' | 'declining' | 'stable';

  /** Percentage change */
  readonly percentageChange: number;

  /** Time period */
  readonly period: 'hourly' | 'daily' | 'weekly';
};

export type ValidationCacheRecommendation = {
  /** Recommendation identifier */
  readonly id: string;

  /** Recommendation type */
  readonly type: CacheOptimizationType;

  /** Severity level */
  readonly severity: 'low' | 'medium' | 'high';

  /** Description */
  readonly description: string;

  /** Estimated impact */
  readonly estimatedImpact: number; // percentage

  /** Implementation guidance */
  readonly guidance?: string;
};

export type CacheOptimizationType =
  | 'increase-cache-size'
  | 'adjust-ttl'
  | 'change-strategy'
  | 'enable-adaptive'
  | 'optimize-eviction'
  | 'memory-limit-adjustment'
  | 'cache-warming';

// ============================================================================
// Cached Validator
// ============================================================================

export type CachedValidator<T> = {
  /** Validate with caching */
  validate(input: unknown): CachedValidationResult<T>;

  /** Validate async with caching */
  validateAsync(input: unknown): Promise<CachedValidationResult<T>>;

  /** Clear cache */
  clearCache(): void;

  /** Get cache statistics */
  getStats(): ValidationCacheStatistics;

  /** Get cache monitor */
  getMonitor(): ValidationCacheMonitor;
};

// ============================================================================
// Validation Cache Implementation
// ============================================================================

export function createValidationCache<T>(
  config: ValidationCacheConfig
): ValidationCache<T> {
  const cache = new Map<ValidationCacheKey, ValidationCacheEntry<T>>();
  const stats: ValidationCacheStatistics = {
    hits: 0,
    misses: 0,
    currentSize: 0,
    evictions: 0,
    hitRate: 0,
    avgTimeSavedMs: 0,
    memorySavedBytes: 0,
    efficiencyScore: 0,
  };

  return {
    config,
    stats,

    get(key: ValidationCacheKey): ValidationCacheEntry<T> | undefined {
      return cache.get(key);
    },

    set(key: ValidationCacheKey, entry: ValidationCacheEntry<T>): void {
      // Check size limits
      if (cache.size >= this.config.maxSize) {
        this.evict();
      }

      cache.set(key, entry);
      this.stats.currentSize = cache.size;
    },

    delete(key: ValidationCacheKey): boolean {
      return cache.delete(key);
    },

    clear(): void {
      cache.clear();
      this.stats.currentSize = 0;
    },

    evict(): void {
      // Simple FIFO eviction for now
      if (cache.size > 0) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
        this.stats.evictions++;
        this.stats.currentSize = cache.size;
      }
    },

    getStats(): ValidationCacheStatistics {
      return { ...this.stats };
    },

    updateStatsOnHit(): void {
      this.stats.hits++;
      this.updateHitRate();
    },

    updateStatsOnMiss(validationTimeMs: number): void {
      this.stats.misses++;
      this.updateHitRate();
      // Simple efficiency calculation
      this.stats.avgTimeSavedMs = this.stats.hits > 0
        ? (this.stats.avgTimeSavedMs * (this.stats.hits - 1) + validationTimeMs) / this.stats.hits
        : 0;
    },

    updateHitRate(): void {
      const total = this.stats.hits + this.stats.misses;
      this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
      this.stats.efficiencyScore = Math.round(this.stats.hitRate * 100);
    }
  };
}

// ============================================================================
// Validation Cache Interface
// ============================================================================

export interface ValidationCache<T> {
  readonly config: ValidationCacheConfig;
  readonly stats: ValidationCacheStatistics;

  get(key: ValidationCacheKey): ValidationCacheEntry<T> | undefined;
  set(key: ValidationCacheKey, entry: ValidationCacheEntry<T>): void;
  delete(key: ValidationCacheKey): boolean;
  clear(): void;
  evict(): void;
  getStats(): ValidationCacheStatistics;
  updateStatsOnHit(): void;
  updateStatsOnMiss(validationTimeMs: number): void;
  updateHitRate(): void;
}

// ============================================================================
// Cached Validator Implementation
// ============================================================================

export function createCachedValidator<T>(
  validator: (input: unknown) => Result<T, ValidationError>,
  cacheConfig: ValidationCacheConfig,
  cacheKeyFn: (input: unknown) => ValidationCacheKey
): CachedValidator<T> {
  const cache = createValidationCache<T>(cacheConfig);
  const performanceHistory: ValidationCachePerformance[] = [];

  return {
    validate(input: unknown): CachedValidationResult<T> {
        const startTime = Date.now();
        const cacheKey = cacheKeyFn(input);
        const cacheLookupStart = Date.now();

        const cachedEntry = cache.get(cacheKey);
        const cacheLookupTime = Date.now() - cacheLookupStart;

        if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
          // Cache hit
          cache.updateStatsOnHit();

          const totalTime = Date.now() - startTime;

          // Update cache entry hit count
          const updatedEntry: ValidationCacheEntry<T> = {
            ...cachedEntry,
            hitCount: cachedEntry.hitCount + 1,
            timestamp: Date.now(),
          };

          cache.set(cacheKey, updatedEntry);

          const perf: ValidationCachePerformance = {
            totalTimeMs: totalTime,
            cacheLookupTimeMs: cacheLookupTime,
            cacheHit: true,
          };

          performanceHistory.push(perf);
          if (performanceHistory.length > 100) {
            performanceHistory.shift();
          }

          return {
            fromCache: true,
            result: { success: true, data: cachedEntry.result },
            cacheMetadata: cachedEntry.metadata ?? {},
            performance: perf,
          };
        }

        // Cache miss - perform actual validation
        cache.updateStatsOnMiss(0); // Will update with actual time

        const validationStart = Date.now();
        const validationResult = validator(input);
        const validationTime = Date.now() - validationStart;
        const totalTime = Date.now() - startTime;

        // Cache the result if validation was successful
        if (validationResult.success) {
          const cacheEntry: ValidationCacheEntry<T> = {
            result: validationResult.data,
            timestamp: Date.now(),
            expiresAt: Date.now() + cacheConfig.defaultTtlMs,
            hitCount: 1,
            metadata: {
              inputHash: JSON.stringify(input),
              validationDurationMs: validationTime,
              cacheStrategy: cacheConfig.strategy,
            },
          };

          cache.set(cacheKey, cacheEntry);
        }

        const perf: ValidationCachePerformance = {
          totalTimeMs: totalTime,
          cacheLookupTimeMs: cacheLookupTime,
          validationTimeMs: validationTime,
          cacheHit: false,
        };

        performanceHistory.push(perf);
        if (performanceHistory.length > 100) {
          performanceHistory.shift();
        }

        return {
          fromCache: false,
          result: validationResult,
          performance: perf,
        };
      },

    async validateAsync(input: unknown): Promise<CachedValidationResult<T>> {
      // Async version would be similar but with async validation
      // For simplicity, we'll use the sync version and wrap in promise
      return Promise.resolve(this.validate(input));
    },

    clearCache(): void {
      cache.clear();
    },

    getStats(): ValidationCacheStatistics {
      return cache.getStats();
    },

    getMonitor(): ValidationCacheMonitor {
      const monitor: ValidationCacheMonitor = {
        config: cacheConfig,
        stats: cache.getStats(),
        history: performanceHistory,

        getCacheState(): ValidationCacheState {
          return {
            entryCount: cache.stats.currentSize,
            memoryUsageBytes: 0, // Would need actual memory measurement
            utilization: cache.stats.currentSize / cacheConfig.maxSize,
            hotEntries: [],
            coldEntries: [],
          };
        },

        generateReport(): ValidationCacheReport {
          const trends = analyzeTrends(this.history);
          const recommendations = generateRecommendations(this.stats);

          return {
            timestamp: Date.now(),
            config: cacheConfig,
            stats: this.stats,
            trends,
            recommendations,
            summary: generateSummary(this.stats, cacheConfig),
          };
        },

        adjustConfig(_newConfig: Partial<ValidationCacheConfig>): void {
          // Would update config in a real implementation
        }
      };

      return monitor;
    }
  };
}

// ============================================================================
// Cache Key Generation Utilities
// ============================================================================

export function createSimpleCacheKey(input: unknown): ValidationCacheKey {
  if (typeof input === 'string') return input;
  if (typeof input === 'number') return input;
  if (input === null || input === undefined) return 'null';

  try {
    return JSON.stringify(input);
  } catch {
    return Symbol('cache-key');
  }
}

export function createHashCacheKey(input: unknown): ValidationCacheKey {
  const str = JSON.stringify(input);
  // Simple hash function for demonstration
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash-${hash}`;
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const ValidationCacheConfigSchema = z.object({
  maxSize: z.number().int().positive(),
  defaultTtlMs: z.number().positive(),
  strategy: z.enum([
    'time-based', 'size-based', 'frequency-based', 'hybrid',
    'adaptive', 'lru', 'lfu', 'fifo'
  ]),
  adaptive: z.boolean(),
  maxMemoryMb: z.number().positive().optional(),
  evictionPolicy: z.any().optional(),
  monitorPerformance: z.boolean().optional(),
});

export const ValidatedValidationCacheConfig = createValidatedType(
  ValidationCacheConfigSchema,
  'ValidationCacheConfig'
);

// ============================================================================
// Helper Functions
// ============================================================================

function analyzeTrends(history: ValidationCachePerformance[]): ValidationCacheTrend[] {
  if (history.length < 2) {
    return [];
  }

  // Simple trend analysis
  const hitRates = history.map(h => h.cacheHit ? 1 : 0);
  const avgHitRate = hitRates.reduce((sum: number, rate) => sum + rate, 0) / hitRates.length;

  return [
    {
      type: 'hit-rate',
      direction: avgHitRate > 0.5 ? 'improving' : 'declining',
      percentageChange: (avgHitRate - 0.5) * 100,
      period: 'daily',
    }
  ];
}

function generateRecommendations(stats: ValidationCacheStatistics): ValidationCacheRecommendation[] {
  const recommendations: ValidationCacheRecommendation[] = [];

  // Low hit rate recommendation
  if (stats.hitRate < 0.3) {
    recommendations.push({
      id: 'rec-low-hit-rate',
      type: 'cache-warming',
      severity: 'medium',
      description: 'Low cache hit rate detected. Consider implementing cache warming strategies.',
      estimatedImpact: 30,
      guidance: 'Pre-load frequently used validation results during application initialization.'
    });
  }

  // High eviction rate recommendation
  if (stats.evictions > stats.hits * 0.5) {
    recommendations.push({
      id: 'rec-high-eviction',
      type: 'increase-cache-size',
      severity: 'high',
      description: 'High eviction rate detected. Consider increasing cache size.',
      estimatedImpact: 25,
      guidance: 'Increase maxSize in cache configuration or optimize cache strategy.'
    });
  }

  return recommendations;
}

function generateSummary(stats: ValidationCacheStatistics, config: ValidationCacheConfig): string {
  return `Cache Performance: ${Math.round(stats.hitRate * 100)}% hit rate, ` +
         `${stats.currentSize}/${config.maxSize} entries, ` +
         `${stats.efficiencyScore}/100 efficiency`;
}

// ============================================================================
// Performance Optimization Utilities
// ============================================================================

export function optimizeCacheConfig(
  currentConfig: ValidationCacheConfig,
  stats: ValidationCacheStatistics
): ValidationCacheConfig {
  const newConfig = { ...currentConfig };

  // Adjust cache size based on hit rate
  if (stats.hitRate > 0.8 && stats.currentSize > currentConfig.maxSize * 0.8) {
    newConfig.maxSize = Math.min(10000, currentConfig.maxSize * 2);
  }

  // Adjust TTL based on eviction rate
  if (stats.evictions > stats.hits * 0.3) {
    newConfig.defaultTtlMs = currentConfig.defaultTtlMs * 1.5;
  }

  // Switch to adaptive strategy if not already
  if (!currentConfig.adaptive && stats.hitRate < 0.5) {
    newConfig.strategy = 'adaptive';
    newConfig.adaptive = true;
  }

  return newConfig;
}
