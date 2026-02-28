/**
 * Metrics Collector
 *
 * Centralized metrics collection for database operations.
 * Extracted from pool.ts and pool-manager.ts to provide unified metrics tracking.
 */

import type { Pool } from 'pg';
import { logger } from '../../observability/core/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface DatabaseMetrics {
  queries: number;
  connections: number;
  idleConnections: number;
  totalConnections: number;
  waitingClients: number;
  avgQueryTime?: number;
  maxQueryTime?: number;
  minQueryTime?: number;
  errors: number;
  slowQueries: number;
}

export interface QueryMetrics {
  duration: number;
  timestamp: Date;
  isSlow: boolean;
}

export interface MetricsCollectorConfig {
  name: string;
  enableMetrics?: boolean;
  slowQueryThreshold?: number; // milliseconds
  maxQueryHistorySize?: number;
}

// ============================================================================
// Metrics Collector Class
// ============================================================================

/**
 * MetricsCollector
 *
 * Collects and tracks metrics for database operations including query times,
 * connection counts, and error rates.
 *
 * @example
 * ```typescript
 * const collector = new MetricsCollector({
 *   name: 'primary',
 *   enableMetrics: true,
 *   slowQueryThreshold: 1000
 * });
 *
 * collector.trackQuery(250);
 * const metrics = collector.getMetrics(pool);
 * ```
 */
export class MetricsCollector {
  private config: Required<MetricsCollectorConfig>;
  private metrics: {
    queries: number;
    connections: number;
    idleConnections: number;
    queryTimes: number[];
    errors: number;
    slowQueries: number;
  };

  constructor(config: MetricsCollectorConfig) {
    this.config = {
      enableMetrics: true,
      slowQueryThreshold: 1000, // 1 second
      maxQueryHistorySize: 100,
      ...config,
    };

    this.metrics = {
      queries: 0,
      connections: 0,
      idleConnections: 0,
      queryTimes: [],
      errors: 0,
      slowQueries: 0,
    };
  }

  /**
   * Track a query execution
   */
  trackQuery(duration: number): void {
    if (!this.config.enableMetrics) {
      return;
    }

    this.metrics.queries++;
    this.metrics.queryTimes.push(duration);

    // Track slow queries
    if (duration >= this.config.slowQueryThreshold) {
      this.metrics.slowQueries++;
      logger.warn({
        collector: this.config.name,
        duration,
        threshold: this.config.slowQueryThreshold,
      }, 'Slow query detected');
    }

    // Keep only last N query times
    if (this.metrics.queryTimes.length > this.config.maxQueryHistorySize) {
      this.metrics.queryTimes.shift();
    }
  }

  /**
   * Track a connection event
   */
  incrementConnections(): void {
    if (!this.config.enableMetrics) {
      return;
    }
    this.metrics.connections++;
  }

  /**
   * Track a connection close event
   */
  decrementConnections(): void {
    if (!this.config.enableMetrics) {
      return;
    }
    this.metrics.connections = Math.max(0, this.metrics.connections - 1);
  }

  /**
   * Update idle connection count
   */
  updateIdleConnections(delta: number): void {
    if (!this.config.enableMetrics) {
      return;
    }
    this.metrics.idleConnections = Math.max(0, this.metrics.idleConnections + delta);
  }

  /**
   * Track an error
   */
  trackError(): void {
    if (!this.config.enableMetrics) {
      return;
    }
    this.metrics.errors++;
  }

  /**
   * Get current metrics
   */
  getMetrics(pool?: Pool): DatabaseMetrics {
    const { queryTimes } = this.metrics;
    const hasData = queryTimes.length > 0;
    const sum = hasData ? queryTimes.reduce((acc, t) => acc + t, 0) : 0;

    return {
      queries: this.metrics.queries,
      connections: this.metrics.connections,
      idleConnections: this.metrics.idleConnections,
      totalConnections: pool?.totalCount ?? this.metrics.connections,
      waitingClients: pool?.waitingCount ?? 0,
      avgQueryTime: hasData ? sum / queryTimes.length : undefined,
      maxQueryTime: hasData ? Math.max(...queryTimes) : undefined,
      minQueryTime: hasData ? Math.min(...queryTimes) : undefined,
      errors: this.metrics.errors,
      slowQueries: this.metrics.slowQueries,
    };
  }

  /**
   * Get query statistics
   */
  getQueryStats(): {
    total: number;
    slow: number;
    avgTime?: number;
    maxTime?: number;
    minTime?: number;
  } {
    const { queryTimes } = this.metrics;
    const hasData = queryTimes.length > 0;
    const sum = hasData ? queryTimes.reduce((acc, t) => acc + t, 0) : 0;

    return {
      total: this.metrics.queries,
      slow: this.metrics.slowQueries,
      avgTime: hasData ? sum / queryTimes.length : undefined,
      maxTime: hasData ? Math.max(...queryTimes) : undefined,
      minTime: hasData ? Math.min(...queryTimes) : undefined,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      queries: 0,
      connections: 0,
      idleConnections: 0,
      queryTimes: [],
      errors: 0,
      slowQueries: 0,
    };

    logger.debug({
      collector: this.config.name,
    }, 'Metrics reset');
  }

  /**
   * Get collector name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Check if metrics are enabled
   */
  isEnabled(): boolean {
    return this.config.enableMetrics;
  }

  /**
   * Get slow query threshold
   */
  getSlowQueryThreshold(): number {
    return this.config.slowQueryThreshold;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a metrics collector with default configuration
 */
export function createMetricsCollector(config: MetricsCollectorConfig): MetricsCollector {
  return new MetricsCollector(config);
}

/**
 * Create a metrics collector for production
 */
export function createProductionMetricsCollector(name: string): MetricsCollector {
  return new MetricsCollector({
    name,
    enableMetrics: true,
    slowQueryThreshold: 1000, // 1 second
    maxQueryHistorySize: 100,
  });
}

/**
 * Create a metrics collector for testing
 */
export function createTestMetricsCollector(name: string): MetricsCollector {
  return new MetricsCollector({
    name,
    enableMetrics: false,
    slowQueryThreshold: 5000,
    maxQueryHistorySize: 10,
  });
}
