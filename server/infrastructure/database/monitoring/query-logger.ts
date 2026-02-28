/**
 * Query Logger
 *
 * Centralized query logging and slow query detection.
 * Provides detailed logging for database operations with performance tracking.
 */

import { logger } from '../../observability/core/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface QueryLogEntry {
  query: string;
  params?: unknown[];
  duration: number;
  timestamp: Date;
  isSlow: boolean;
  error?: string;
}

export interface QueryLoggerConfig {
  name: string;
  enableLogging?: boolean;
  enableSlowQueryLogging?: boolean;
  slowQueryThreshold?: number; // milliseconds
  logParams?: boolean;
  maxParamLength?: number;
}

export interface QueryStats {
  totalQueries: number;
  slowQueries: number;
  errorQueries: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
}

// ============================================================================
// Query Logger Class
// ============================================================================

/**
 * QueryLogger
 *
 * Logs database queries with performance tracking and slow query detection.
 *
 * @example
 * ```typescript
 * const queryLogger = new QueryLogger({
 *   name: 'primary',
 *   enableLogging: true,
 *   slowQueryThreshold: 1000
 * });
 *
 * const startTime = Date.now();
 * // ... execute query ...
 * const duration = Date.now() - startTime;
 * queryLogger.logQuery('SELECT * FROM users', [], duration);
 * ```
 */
export class QueryLogger {
  private config: Required<QueryLoggerConfig>;
  private queryHistory: QueryLogEntry[] = [];
  private stats: {
    total: number;
    slow: number;
    errors: number;
    durations: number[];
  };

  constructor(config: QueryLoggerConfig) {
    this.config = {
      enableLogging: true,
      enableSlowQueryLogging: true,
      slowQueryThreshold: 1000, // 1 second
      logParams: false, // Don't log params by default for security
      maxParamLength: 100,
      ...config,
    };

    this.stats = {
      total: 0,
      slow: 0,
      errors: 0,
      durations: [],
    };
  }

  /**
   * Log a query execution
   */
  logQuery(
    query: string,
    params?: unknown[],
    duration?: number,
    error?: Error
  ): void {
    if (!this.config.enableLogging) {
      return;
    }

    const actualDuration = duration ?? 0;
    const isSlow = actualDuration >= this.config.slowQueryThreshold;
    const hasError = !!error;

    // Update stats
    this.stats.total++;
    if (isSlow) {
      this.stats.slow++;
    }
    if (hasError) {
      this.stats.errors++;
    }
    if (actualDuration > 0) {
      this.stats.durations.push(actualDuration);
      // Keep only last 100 durations
      if (this.stats.durations.length > 100) {
        this.stats.durations.shift();
      }
    }

    // Create log entry
    const entry: QueryLogEntry = {
      query: this.sanitizeQuery(query),
      params: this.config.logParams ? this.sanitizeParams(params) : undefined,
      duration: actualDuration,
      timestamp: new Date(),
      isSlow,
      error: error?.message,
    };

    // Add to history (keep last 50)
    this.queryHistory.push(entry);
    if (this.queryHistory.length > 50) {
      this.queryHistory.shift();
    }

    // Log based on severity
    if (hasError) {
      this.logError(entry);
    } else if (isSlow && this.config.enableSlowQueryLogging) {
      this.logSlowQuery(entry);
    } else {
      this.logNormalQuery(entry);
    }
  }

  /**
   * Log a normal query
   */
  private logNormalQuery(entry: QueryLogEntry): void {
    logger.debug({
      pool: this.config.name,
      query: entry.query,
      duration: entry.duration,
      params: entry.params,
    }, 'Query executed');
  }

  /**
   * Log a slow query
   */
  private logSlowQuery(entry: QueryLogEntry): void {
    logger.warn({
      pool: this.config.name,
      query: entry.query,
      duration: entry.duration,
      threshold: this.config.slowQueryThreshold,
      params: entry.params,
    }, 'Slow query detected');
  }

  /**
   * Log a query error
   */
  private logError(entry: QueryLogEntry): void {
    logger.error({
      pool: this.config.name,
      query: entry.query,
      duration: entry.duration,
      error: entry.error,
      params: entry.params,
    }, 'Query execution failed');
  }

  /**
   * Sanitize query for logging (remove extra whitespace)
   */
  private sanitizeQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim();
  }

  /**
   * Sanitize params for logging (truncate long values)
   */
  private sanitizeParams(params?: unknown[]): unknown[] | undefined {
    if (!params) {
      return undefined;
    }

    return params.map(param => {
      if (typeof param === 'string' && param.length > this.config.maxParamLength) {
        return `${param.substring(0, this.config.maxParamLength)}...`;
      }
      return param;
    });
  }

  /**
   * Get query statistics
   */
  getStats(): QueryStats {
    const { durations } = this.stats;
    const hasData = durations.length > 0;
    const sum = hasData ? durations.reduce((acc, d) => acc + d, 0) : 0;

    return {
      totalQueries: this.stats.total,
      slowQueries: this.stats.slow,
      errorQueries: this.stats.errors,
      avgDuration: hasData ? sum / durations.length : 0,
      maxDuration: hasData ? Math.max(...durations) : 0,
      minDuration: hasData ? Math.min(...durations) : 0,
    };
  }

  /**
   * Get recent query history
   */
  getHistory(limit?: number): QueryLogEntry[] {
    if (limit) {
      return this.queryHistory.slice(-limit);
    }
    return [...this.queryHistory];
  }

  /**
   * Get slow queries from history
   */
  getSlowQueries(limit?: number): QueryLogEntry[] {
    const slowQueries = this.queryHistory.filter(entry => entry.isSlow);
    if (limit) {
      return slowQueries.slice(-limit);
    }
    return slowQueries;
  }

  /**
   * Get error queries from history
   */
  getErrorQueries(limit?: number): QueryLogEntry[] {
    const errorQueries = this.queryHistory.filter(entry => !!entry.error);
    if (limit) {
      return errorQueries.slice(-limit);
    }
    return errorQueries;
  }

  /**
   * Clear query history
   */
  clearHistory(): void {
    this.queryHistory = [];
    logger.debug({
      pool: this.config.name,
    }, 'Query history cleared');
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      slow: 0,
      errors: 0,
      durations: [],
    };
    logger.debug({
      pool: this.config.name,
    }, 'Query statistics reset');
  }

  /**
   * Get logger name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.config.enableLogging;
  }

  /**
   * Get slow query threshold
   */
  getSlowQueryThreshold(): number {
    return this.config.slowQueryThreshold;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QueryLoggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    logger.info({
      pool: this.config.name,
      config: this.config,
    }, 'Query logger configuration updated');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a query logger with default configuration
 */
export function createQueryLogger(config: QueryLoggerConfig): QueryLogger {
  return new QueryLogger(config);
}

/**
 * Create a query logger for production
 */
export function createProductionQueryLogger(name: string): QueryLogger {
  return new QueryLogger({
    name,
    enableLogging: true,
    enableSlowQueryLogging: true,
    slowQueryThreshold: 1000, // 1 second
    logParams: false, // Don't log params in production for security
    maxParamLength: 100,
  });
}

/**
 * Create a query logger for development
 */
export function createDevelopmentQueryLogger(name: string): QueryLogger {
  return new QueryLogger({
    name,
    enableLogging: true,
    enableSlowQueryLogging: true,
    slowQueryThreshold: 500, // 500ms
    logParams: true, // Log params in development
    maxParamLength: 200,
  });
}

/**
 * Create a query logger for testing
 */
export function createTestQueryLogger(name: string): QueryLogger {
  return new QueryLogger({
    name,
    enableLogging: false,
    enableSlowQueryLogging: false,
    slowQueryThreshold: 5000,
    logParams: false,
    maxParamLength: 50,
  });
}
