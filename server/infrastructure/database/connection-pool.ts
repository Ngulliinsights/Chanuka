import type { PoolClient } from 'pg';
import { performanceMonitor } from '../monitoring/performance-monitor.js';
import { logger } from '../../utils/logger';
import { pool, executeQuery, checkPoolHealth, closePools, getPools } from '../../../shared/database/pool.js';

export interface ConnectionPoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
  ssl?: boolean | object;
}

export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
  minConnections: number;
  averageAcquireTime: number;
  totalAcquired: number;
  totalReleased: number;
  totalErrors: number;
}

export interface QueryMetrics {
  queryId: string;
  query: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  connectionId?: string;
}

class ConnectionPoolService {
  private metrics: {
    totalAcquired: number;
    totalReleased: number;
    totalErrors: number;
    acquireTimes: number[];
    queryMetrics: QueryMetrics[];
  } = {
    totalAcquired: 0,
    totalReleased: 0,
    totalErrors: 0,
    acquireTimes: [],
    queryMetrics: []
  };

  private readonly MAX_QUERY_METRICS = 1000;
  private readonly MAX_ACQUIRE_TIMES = 100;

  /**
   * Initialize connection pool with optimized settings
   * Note: Now uses the shared database pool with circuit breaker and comprehensive monitoring
   */
  async initialize(config?: Partial<ConnectionPoolConfig>): Promise<void> {
    // The shared pool is already initialized, so we just log the configuration
    logger.info('[Connection Pool] Using shared database pool with circuit breaker and monitoring', { component: 'Chanuka' });

    // Test the connection using the shared pool
    await this.testConnection();
  }

  /**
   * Execute a query with connection pooling and metrics
   */
  async query<T = any>(
    text: string,
    params?: any[],
    traceId?: string
  ): Promise<{ rows: T[]; rowCount: number; duration: number }> {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    try {
      // Use the shared pool's executeQuery with circuit breaker and retry logic
      const result = await executeQuery({
        text,
        params,
        context: traceId || 'connection-pool-service'
      });

      const duration = performance.now() - startTime;

      // Track query metrics for backward compatibility
      const queryMetric: QueryMetrics = {
        queryId,
        query: text.substring(0, 200), // Truncate long queries
        duration,
        success: true,
        timestamp: new Date()
      };

      this.metrics.queryMetrics.push(queryMetric);
      if (this.metrics.queryMetrics.length > this.MAX_QUERY_METRICS) {
        this.metrics.queryMetrics = this.metrics.queryMetrics.slice(-this.MAX_QUERY_METRICS / 2);
      }

      // Track with performance monitor
      performanceMonitor.addQueryTrace(traceId || 'unknown', text, duration, params);

      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
        duration
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      this.metrics.totalErrors++;

      // Track failed query
      const queryMetric: QueryMetrics = {
        queryId,
        query: text.substring(0, 200),
        duration,
        success: false,
        timestamp: new Date()
      };

      this.metrics.queryMetrics.push(queryMetric);

      // Track with performance monitor
      performanceMonitor.addQueryTrace(traceId || 'unknown', text, duration, params);

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[Connection Pool] Query error:', { component: 'Chanuka' }, {
        queryId,
        error: errorMessage,
        duration,
        query: text.substring(0, 100)
      });

      throw error;
    }
  }

  /**
   * Execute a transaction with connection pooling
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    traceId?: string
  ): Promise<T> {
    const startTime = performance.now();
    let client: PoolClient | null = null;

    try {
      // Get client from shared pool
      client = await pool.connect();
      this.metrics.totalAcquired++;

      await client.query('BEGIN');

      const result = await callback(client);

      await client.query('COMMIT');

      const duration = performance.now() - startTime;
      performanceMonitor.addCustomMetric(
        'database_transaction',
        duration,
        { success: true },
        traceId
      );

      return result;

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error('[Connection Pool] Rollback error:', { component: 'Chanuka' }, { error: rollbackError });
        }
      }

      const duration = performance.now() - startTime;
      this.metrics.totalErrors++;

      const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.addCustomMetric(
        'database_transaction',
        duration,
        { success: false, error: errorMessage },
        traceId
      );

      throw error;
    } finally {
      if (client) {
        client.release();
        this.metrics.totalReleased++;
      }
    }
  }

  /**
   * Get connection pool metrics
   */
  getPoolMetrics(): PoolMetrics {
    const averageAcquireTime = this.metrics.acquireTimes.length > 0
      ? this.metrics.acquireTimes.reduce((sum, time) => sum + time, 0) / this.metrics.acquireTimes.length
      : 0;

    return {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
      maxConnections: 20, // Default from shared pool config
      minConnections: 2,  // Default from shared pool config
      averageAcquireTime,
      totalAcquired: this.metrics.totalAcquired,
      totalReleased: this.metrics.totalReleased,
      totalErrors: this.metrics.totalErrors
    };
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(limit: number = 100): QueryMetrics[] {
    return this.metrics.queryMetrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(thresholdMs: number = 1000, limit: number = 20): QueryMetrics[] {
    return this.metrics.queryMetrics
      .filter(metric => metric.duration > thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get connection pool health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    details: {
      poolUtilization: number;
      averageAcquireTime: number;
      errorRate: number;
      waitingClients: number;
    };
  } {
    const metrics = this.getPoolMetrics();
    const poolUtilization = (metrics.totalConnections - metrics.idleConnections) / metrics.maxConnections;
    const errorRate = metrics.totalAcquired > 0
      ? (metrics.totalErrors / metrics.totalAcquired) * 100
      : 0;

    // Check circuit breaker state from shared pool
    const circuitBreakerState = pool.circuitBreaker.getState();

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Circuit breaker open is critical
    if (circuitBreakerState === 'OPEN' || poolUtilization > 0.9 || metrics.averageAcquireTime > 1000 || errorRate > 5) {
      status = 'critical';
    } else if (poolUtilization > 0.7 || metrics.averageAcquireTime > 500 || errorRate > 2) {
      status = 'warning';
    }

    return {
      status,
      details: {
        poolUtilization: poolUtilization * 100,
        averageAcquireTime: metrics.averageAcquireTime,
        errorRate,
        waitingClients: metrics.waitingClients
      }
    };
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    // Use shared pool's close function
    await closePools();
    logger.info('[Connection Pool] Closed shared database pools', { component: 'Chanuka' });
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    try {
      const result = await this.query('SELECT NOW() as current_time, version() as pg_version');
      logger.info('[Connection Pool] Connection test successful:', { component: 'Chanuka' }, {
        currentTime: result.rows[0]?.current_time,
        version: result.rows[0]?.pg_version?.substring(0, 50) + '...'
      });
    } catch (error) {
      logger.error('[Connection Pool] Connection test failed:', { component: 'Chanuka' }, { error });
      throw error;
    }
  }

  /**
   * Set up event listeners for monitoring
   * Note: Event listeners are already set up in the shared pool
   */
  private setupEventListeners(): void {
    // Event listeners are handled by the shared pool implementation
    logger.debug('[Connection Pool] Using shared pool event listeners', { component: 'Chanuka' });
  }

  /**
   * Optimize pool settings based on current metrics
   */
  async optimizePoolSettings(): Promise<void> {
    const metrics = this.getPoolMetrics();
    const health = this.getHealthStatus();

    // Get detailed health status from shared pool
    const poolHealth = await checkPoolHealth(pool, 'general');

    logger.info('[Connection Pool] Current metrics:', { component: 'Chanuka' }, {
      utilization: health.details.poolUtilization.toFixed(2) + '%',
      averageAcquireTime: health.details.averageAcquireTime.toFixed(2) + 'ms',
      errorRate: health.details.errorRate.toFixed(2) + '%',
      status: health.status,
      circuitBreakerState: poolHealth.circuitBreakerState,
      circuitBreakerFailures: poolHealth.circuitBreakerFailures
    });

    // Suggest optimizations based on metrics
    const suggestions: string[] = [];

    if (health.details.poolUtilization > 80) {
      suggestions.push('Consider increasing max pool size');
    }

    if (health.details.averageAcquireTime > 500) {
      suggestions.push('High connection acquire time - check database performance');
    }

    if (health.details.errorRate > 2) {
      suggestions.push('High error rate detected - investigate connection issues');
    }

    if (metrics.waitingClients > 0) {
      suggestions.push('Clients waiting for connections - consider pool tuning');
    }

    if (poolHealth.circuitBreakerState === 'OPEN') {
      suggestions.push('Circuit breaker is OPEN - database may be experiencing issues');
    }

    if (poolHealth.circuitBreakerFailures > 0) {
      suggestions.push(`Circuit breaker has ${poolHealth.circuitBreakerFailures} failures - monitor database health`);
    }

    if (suggestions.length > 0) {
      logger.info('[Connection Pool] Optimization suggestions:', { component: 'Chanuka' }, suggestions);
    } else {
      logger.info('[Connection Pool] Pool performance is optimal', { component: 'Chanuka' });
    }
  }
}

// Export singleton instance
export const connectionPoolService = new ConnectionPoolService();






