import { performance } from 'perf_hooks';
import { performanceMonitor } from './performance-monitor.js';
import { logger } from '@shared/utils/logger';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
  error?: string;
  rowCount?: number;
}

class DatabaseTracer {
  private queryMetrics: QueryMetrics[] = [];
  private readonly MAX_METRICS = 1000;
  private slowQueryThreshold = 100; // ms

  constructor() {
    // Clean up old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000); // 5 minutes
  }

  /**
   * Trace a database query
   */
  async traceQuery<T>(
    query: string,
    params: any[] | undefined,
    executor: () => Promise<T>,
    traceId?: string
  ): Promise<T> {
    const startTime = performance.now();
    const timestamp = new Date();

    try {
      const result = await executor();
      const duration = performance.now() - startTime;

      // Record query metrics
      const metrics: QueryMetrics = {
        query: this.sanitizeQuery(query),
        duration,
        timestamp,
        params: this.sanitizeParams(params),
        rowCount: this.extractRowCount(result)
      };

      this.queryMetrics.push(metrics);

      // Add to performance monitor if trace ID provided
      if (traceId) {
        performanceMonitor.addQueryTrace(traceId, query, duration, params);
      }

      // Add custom metric for slow queries
      if (duration > this.slowQueryThreshold) {
        performanceMonitor.addCustomMetric(
          'slow_database_query',
          duration,
          {
            query: this.sanitizeQuery(query),
            threshold: this.slowQueryThreshold
          },
          traceId
        );
      }

      // Prevent memory leaks
      if (this.queryMetrics.length > this.MAX_METRICS) {
        this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS / 2);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Record failed query
      const metrics: QueryMetrics = {
        query: this.sanitizeQuery(query),
        duration,
        timestamp,
        params: this.sanitizeParams(params),
        error: errorMessage
      };

      this.queryMetrics.push(metrics);

      // Add to performance monitor
      if (traceId) {
        performanceMonitor.addQueryTrace(traceId, query, duration, params);
      }

      // Add error metric
      performanceMonitor.addCustomMetric(
        'database_query_error',
        duration,
        {
          query: this.sanitizeQuery(query),
          error: errorMessage
        },
        traceId
      );

      throw error;
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 50): QueryMetrics[] {
    return this.queryMetrics
      .filter(metric => metric.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get query statistics
   */
  getQueryStats(): {
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    errorRate: number;
    mostFrequentQueries: Array<{ query: string; count: number; avgDuration: number }>;
  } {
    const totalQueries = this.queryMetrics.length;
    const averageQueryTime = totalQueries > 0
      ? this.queryMetrics.reduce((sum, metric) => sum + metric.duration, 0) / totalQueries
      : 0;

    const slowQueries = this.queryMetrics.filter(metric => 
      metric.duration > this.slowQueryThreshold
    ).length;

    const errorQueries = this.queryMetrics.filter(metric => metric.error).length;
    const errorRate = totalQueries > 0 ? (errorQueries / totalQueries) * 100 : 0;

    // Group queries by normalized query string
    const queryGroups = new Map<string, { count: number; totalDuration: number }>();
    this.queryMetrics.forEach(metric => {
      const normalizedQuery = this.normalizeQuery(metric.query);
      if (!queryGroups.has(normalizedQuery)) {
        queryGroups.set(normalizedQuery, { count: 0, totalDuration: 0 });
      }
      const group = queryGroups.get(normalizedQuery)!;
      group.count++;
      group.totalDuration += metric.duration;
    });

    const mostFrequentQueries = Array.from(queryGroups.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalQueries,
      averageQueryTime,
      slowQueries,
      errorRate,
      mostFrequentQueries
    };
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
  }

  /**
   * Get recent query metrics
   */
  getRecentMetrics(minutes: number = 5): QueryMetrics[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.queryMetrics
      .filter(metric => metric.timestamp > cutoffTime)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data patterns
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/email\s*=\s*'[^']*'/gi, "email = '[REDACTED]'")
      .substring(0, 500); // Limit length
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: any[] | undefined): any[] | undefined {
    if (!params) return undefined;
    
    return params.slice(0, 10).map(param => {
      if (typeof param === 'string' && param.length > 100) {
        return param.substring(0, 100) + '...';
      }
      return param;
    });
  }

  /**
   * Extract row count from query result
   */
  private extractRowCount(result: any): number | undefined {
    if (Array.isArray(result)) {
      return result.length;
    }
    if (result && typeof result === 'object' && 'rowCount' in result) {
      return result.rowCount;
    }
    if (result && typeof result === 'object' && 'length' in result) {
      return result.length;
    }
    return undefined;
  }

  /**
   * Normalize query for grouping (remove specific values)
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .replace(/\d+/g, '?') // Replace numbers
      .replace(/'[^']*'/g, "'?'") // Replace string literals
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - 3600000); // 1 hour ago
    this.queryMetrics = this.queryMetrics.filter(metric => 
      metric.timestamp > cutoffTime
    );
  }
}

// Export singleton instance
export const dbTracer = new DatabaseTracer();

/**
 * Wrapper function for database queries with tracing
 */
export async function traceDbQuery<T>(
  query: string,
  params: any[] | undefined,
  executor: () => Promise<T>,
  traceId?: string
): Promise<T> {
  return dbTracer.traceQuery(query, params, executor, traceId);
}






