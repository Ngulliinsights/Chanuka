import pg from 'pg';
const { Pool } = pg;
import type { PoolClient, PoolConfig } from 'pg';
import { performanceMonitor } from '../monitoring/performance-monitor.js';

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
  private pool: Pool | null = null;
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
   */
  async initialize(config?: Partial<ConnectionPoolConfig>): Promise<void> {
    const defaultConfig: ConnectionPoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'chanuka_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      min: 2, // Minimum connections in pool
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: 5000, // 5 seconds
      acquireTimeoutMillis: 10000, // 10 seconds
      ssl: process.env.NODE_ENV === 'production'
    };

    const poolConfig: PoolConfig = {
      ...defaultConfig,
      ...config,
      // Additional optimizations
      statement_timeout: 30000, // 30 seconds
      query_timeout: 30000, // 30 seconds
      application_name: 'chanuka_platform',
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };

    this.pool = new Pool(poolConfig);

    // Set up event listeners for monitoring
    this.setupEventListeners();

    // Test the connection
    await this.testConnection();

    console.log('[Connection Pool] Initialized with optimized settings:', {
      min: poolConfig.min,
      max: poolConfig.max,
      host: poolConfig.host,
      database: poolConfig.database
    });
  }

  /**
   * Execute a query with connection pooling and metrics
   */
  async query<T = any>(
    text: string, 
    params?: any[], 
    traceId?: string
  ): Promise<{ rows: T[]; rowCount: number; duration: number }> {
    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }

    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    let client: PoolClient | null = null;

    try {
      // Acquire connection from pool
      const acquireStart = performance.now();
      client = await this.pool.connect();
      const acquireTime = performance.now() - acquireStart;

      // Track acquire time
      this.metrics.acquireTimes.push(acquireTime);
      if (this.metrics.acquireTimes.length > this.MAX_ACQUIRE_TIMES) {
        this.metrics.acquireTimes = this.metrics.acquireTimes.slice(-this.MAX_ACQUIRE_TIMES / 2);
      }

      this.metrics.totalAcquired++;

      // Execute query
      const result = await client.query(text, params);
      const duration = performance.now() - startTime;

      // Track query metrics
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
        rows: result.rows,
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

      console.error('[Connection Pool] Query error:', {
        queryId,
        error: error.message,
        duration,
        query: text.substring(0, 100)
      });

      throw error;
    } finally {
      // Always release the client back to the pool
      if (client) {
        client.release();
        this.metrics.totalReleased++;
      }
    }
  }

  /**
   * Execute a transaction with connection pooling
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    traceId?: string
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }

    const startTime = performance.now();
    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
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
          console.error('[Connection Pool] Rollback error:', rollbackError);
        }
      }

      const duration = performance.now() - startTime;
      this.metrics.totalErrors++;

      performanceMonitor.addCustomMetric(
        'database_transaction',
        duration,
        { success: false, error: error.message },
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
    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }

    const averageAcquireTime = this.metrics.acquireTimes.length > 0
      ? this.metrics.acquireTimes.reduce((sum, time) => sum + time, 0) / this.metrics.acquireTimes.length
      : 0;

    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      maxConnections: this.pool.options.max || 0,
      minConnections: this.pool.options.min || 0,
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
    if (!this.pool) {
      return {
        status: 'critical',
        details: {
          poolUtilization: 0,
          averageAcquireTime: 0,
          errorRate: 0,
          waitingClients: 0
        }
      };
    }

    const metrics = this.getPoolMetrics();
    const poolUtilization = (metrics.totalConnections - metrics.idleConnections) / metrics.maxConnections;
    const errorRate = metrics.totalAcquired > 0 
      ? (metrics.totalErrors / metrics.totalAcquired) * 100 
      : 0;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (poolUtilization > 0.9 || metrics.averageAcquireTime > 1000 || errorRate > 5) {
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
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('[Connection Pool] Closed connection pool');
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }

    try {
      const result = await this.query('SELECT NOW() as current_time, version() as pg_version');
      console.log('[Connection Pool] Connection test successful:', {
        currentTime: result.rows[0]?.current_time,
        version: result.rows[0]?.pg_version?.substring(0, 50) + '...'
      });
    } catch (error) {
      console.error('[Connection Pool] Connection test failed:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for monitoring
   */
  private setupEventListeners(): void {
    if (!this.pool) return;

    this.pool.on('connect', (client) => {
      console.log('[Connection Pool] New client connected');
    });

    this.pool.on('acquire', (client) => {
      // Client acquired from pool
    });

    this.pool.on('release', (client) => {
      // Client released back to pool
    });

    this.pool.on('remove', (client) => {
      console.log('[Connection Pool] Client removed from pool');
    });

    this.pool.on('error', (error, client) => {
      console.error('[Connection Pool] Pool error:', error);
      this.metrics.totalErrors++;
    });
  }

  /**
   * Optimize pool settings based on current metrics
   */
  async optimizePoolSettings(): Promise<void> {
    const metrics = this.getPoolMetrics();
    const health = this.getHealthStatus();

    console.log('[Connection Pool] Current metrics:', {
      utilization: health.details.poolUtilization.toFixed(2) + '%',
      averageAcquireTime: health.details.averageAcquireTime.toFixed(2) + 'ms',
      errorRate: health.details.errorRate.toFixed(2) + '%',
      status: health.status
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

    if (suggestions.length > 0) {
      console.log('[Connection Pool] Optimization suggestions:', suggestions);
    } else {
      console.log('[Connection Pool] Pool performance is optimal');
    }
  }
}

// Export singleton instance
export const connectionPoolService = new ConnectionPoolService();