/**
 * Cache Metrics Collector
 * Collects and aggregates metrics from cache adapters
 */

import { EventEmitter } from 'events';
import type { CacheMetrics } from '/types';

export interface MetricsCollectorConfig {
  enableAdvancedMetrics?: boolean;
  collectionInterval?: number;
}

export class CacheMetricsCollector extends EventEmitter {
  private config: MetricsCollectorConfig;
  private intervalId?: NodeJS.Timeout;
  private metrics = new Map<string, CacheMetrics>();

  constructor(config: MetricsCollectorConfig = {}) {
    super();
    this.config = {
      enableAdvancedMetrics: config.enableAdvancedMetrics ?? true,
      collectionInterval: config.collectionInterval ?? 60000, // 1 minute
    };
  }

  /**
   * Start collecting metrics
   */
  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);
  }

  /**
   * Stop collecting metrics
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Collect metrics from all registered caches
   */
  private collectMetrics(): void {
    const aggregated = this.getAggregatedMetrics();
    this.emit('metrics:collected', aggregated);
  }

  /**
   * Register a cache for metrics collection
   */
  registerCache(name: string, metrics: CacheMetrics): void {
    this.metrics.set(name, metrics);
  }

  /**
   * Get aggregated metrics from all caches
   */
  getAggregatedMetrics(): CacheMetrics {
    const allMetrics = Array.from(this.metrics.values());
    
    if (allMetrics.length === 0) {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        operations: 0,
        errors: 0,
        avgResponseTime: 0,
        memoryUsage: 0,
        keyCount: 0,
        avgLatency: 0,
        maxLatency: 0,
        minLatency: 0,
      };
    }

    const aggregated = allMetrics.reduce((acc, metrics) => ({
      hits: acc.hits + metrics.hits,
      misses: acc.misses + metrics.misses,
      operations: acc.operations + metrics.operations,
      errors: acc.errors + metrics.errors,
      memoryUsage: acc.memoryUsage + (metrics.memoryUsage || 0),
      keyCount: acc.keyCount + (metrics.keyCount || 0),
      avgLatency: acc.avgLatency + metrics.avgLatency,
      maxLatency: Math.max(acc.maxLatency, metrics.maxLatency),
      minLatency: Math.min(acc.minLatency, metrics.minLatency),
      avgResponseTime: acc.avgResponseTime + (metrics.avgResponseTime || metrics.avgLatency),
      hitRate: 0, // Will be calculated below
    }), {
      hits: 0,
      misses: 0,
      operations: 0,
      errors: 0,
      memoryUsage: 0,
      keyCount: 0,
      avgLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      avgResponseTime: 0,
      hitRate: 0,
    });

    // Calculate averages
    const count = allMetrics.length;
    aggregated.avgLatency = aggregated.avgLatency / count;
    aggregated.avgResponseTime = aggregated.avgResponseTime / count;
    aggregated.minLatency = aggregated.minLatency === Infinity ? 0 : aggregated.minLatency;
    
    // Calculate hit rate
    const totalRequests = aggregated.hits + aggregated.misses;
    aggregated.hitRate = totalRequests > 0 ? (aggregated.hits / totalRequests) * 100 : 0;

    return aggregated;
  }

  /**
   * Get metrics for a specific cache
   */
  getCacheMetrics(name: string): CacheMetrics | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}


