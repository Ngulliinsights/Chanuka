/**
 * Performance Monitoring Utility
 *
 * Provides hooks for monitoring query execution times and performance metrics
 * across database operations.
 */

import { logger } from '@server/infrastructure/observability';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface QueryPerformanceHook {
  beforeQuery(operation: string, metadata?: Record<string, unknown>): void;
  afterQuery(metrics: PerformanceMetrics): void;
  onSlowQuery(metrics: PerformanceMetrics, threshold: number): void;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private hooks: QueryPerformanceHook[] = [];
  private slowQueryThreshold: number = 1000; // 1 second default
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory: number = 1000;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Register a performance monitoring hook
   */
  registerHook(hook: QueryPerformanceHook): void {
    this.hooks.push(hook);
  }

  /**
   * Set the slow query threshold in milliseconds
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
  }

  /**
   * Monitor a database operation with performance tracking
   */
  async monitorOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    const timestamp = new Date();

    // Notify hooks before query execution
    this.hooks.forEach(hook => {
      try {
        hook.beforeQuery(operation, metadata);
      } catch (error) {
        logger.warn({ error, operation }, 'Performance hook beforeQuery failed');
      }
    });

    let success = false;
    let result: T;

    try {
      result = await fn();
      success = true;
      return result;
    } finally {
      const duration = Date.now() - startTime;
      const metrics: PerformanceMetrics = {
        operation,
        duration,
        timestamp,
        success,
        metadata
      };

      // Store metrics (with circular buffer)
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics.shift();
      }

      // Notify hooks after query execution
      this.hooks.forEach(hook => {
        try {
          hook.afterQuery(metrics);
        } catch (error) {
          logger.warn({ error, operation }, 'Performance hook afterQuery failed');
        }
      });

      // Check for slow queries
      if (duration > this.slowQueryThreshold) {
        this.hooks.forEach(hook => {
          try {
            hook.onSlowQuery(metrics, this.slowQueryThreshold);
          } catch (error) {
            logger.warn({ error, operation }, 'Performance hook onSlowQuery failed');
          }
        });

        logger.warn({
          operation,
          duration,
          threshold: this.slowQueryThreshold,
          metadata
        }, `Slow query detected: ${operation}`);
      }
    }
  }

  /**
   * Get recent performance metrics
   */
  getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    successRate: number;
    operations: Record<string, {
      count: number;
      averageDuration: number;
      slowCount: number;
    }>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        successRate: 0,
        operations: {}
      };
    }

    const totalQueries = this.metrics.length;
    const successfulQueries = this.metrics.filter(m => m.success).length;
    const slowQueries = this.metrics.filter(m => m.duration > this.slowQueryThreshold).length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);

    const operations: Record<string, { count: number; durations: number[]; slowCount: number }> = {};

    this.metrics.forEach(metric => {
      if (!operations[metric.operation]) {
        operations[metric.operation] = { count: 0, durations: [], slowCount: 0 };
      }
      const op = operations[metric.operation]!;
      op.count++;
      op.durations.push(metric.duration);
      if (metric.duration > this.slowQueryThreshold) {
        op.slowCount++;
      }
    });

    const operationStats = Object.entries(operations).reduce((acc, [op, data]) => {
      acc[op] = {
        count: data.count,
        averageDuration: data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length,
        slowCount: data.slowCount
      };
      return acc;
    }, {} as Record<string, { count: number; averageDuration: number; slowCount: number }>);

    return {
      totalQueries,
      averageDuration: totalDuration / totalQueries,
      slowQueries,
      successRate: successfulQueries / totalQueries,
      operations: operationStats
    };
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Default performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Default logging hook
class LoggingPerformanceHook implements QueryPerformanceHook {
  beforeQuery(operation: string, metadata?: Record<string, unknown>): void {
    logger.debug({ operation, metadata }, `Starting database operation: ${operation}`);
  }

  afterQuery(metrics: PerformanceMetrics): void {
    logger.debug({
      operation: metrics.operation,
      duration: metrics.duration,
      success: metrics.success
    }, `Completed database operation: ${metrics.operation}`);
  }

  onSlowQuery(metrics: PerformanceMetrics, threshold: number): void {
    logger.warn({
      operation: metrics.operation,
      duration: metrics.duration,
      threshold,
      metadata: metrics.metadata
    }, `Slow database operation detected: ${metrics.operation}`);
  }
}

// Register default logging hook
performanceMonitor.registerHook(new LoggingPerformanceHook());