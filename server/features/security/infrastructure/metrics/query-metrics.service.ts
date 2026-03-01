import { logger } from '@server/infrastructure/observability';

/**
 * Query Performance Metrics
 * Tracks query execution performance for monitoring and optimization
 */
export interface QueryPerformanceMetric {
  queryId: string;
  duration: number;
  paramCount: number;
  timestamp: Date;
  template?: string;
}

/**
 * Query Metrics Service
 * Handles collection and aggregation of query performance metrics
 * Can be extended to integrate with external monitoring systems
 */
export class QueryMetricsService {
  private metrics: QueryPerformanceMetric[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory: number = 1000) {
    this.maxHistory = maxHistory;
  }

  /**
   * Record a query performance metric
   */
  public recordMetric(metric: QueryPerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxHistory) {
      this.metrics.shift();
    }

    // Log slow queries
    if (metric.duration > 1000) {
      logger.warn({
        queryId: metric.queryId,
        duration: metric.duration,
        paramCount: metric.paramCount
      }, 'Slow query detected');
    }
  }

  /**
   * Get aggregated performance metrics
   */
  public getMetrics(): {
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    totalQueries: number;
    recentMetrics: QueryPerformanceMetric[];
  } {
    if (this.metrics.length === 0) {
      return {
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        totalQueries: 0,
        recentMetrics: []
      };
    }

    const durations = this.metrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      averageDuration: sum / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      totalQueries: this.metrics.length,
      recentMetrics: this.metrics.slice(-10)
    };
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for external monitoring systems
   * This can be extended to push to Prometheus, DataDog, etc.
   */
  public exportMetrics(): QueryPerformanceMetric[] {
    return [...this.metrics];
  }
}
