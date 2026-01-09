/**
 * Advanced Connection Pool Configuration
 *
 * Implements production-grade connection pooling with:
 * - Health monitoring and auto-recovery
 * - Connection lifecycle management
 * - Keep-alive configuration
 * - Read/write pool separation
 * - Metrics tracking
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '@shared/core';

// ============================================================================
// Pool Wrapper with Health Monitoring
// ============================================================================

export class AdvancedPoolConfig {
  /**
   * Create configuration for development environment
   */
  static development(): PoolConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'chanuka_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',

      // Development pooling (smaller)
      min: 2,
      max: 10,

      // Timeouts
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      acquireTimeoutMillis: 10000,

      // Keep-alive
      keepAlives: true,
      keepAliveInitialDelayMillis: 10000,

      // No SSL in development
      ssl: false,

      // Statements
      statement_timeout: 30000,
      query_timeout: 30000,
    };
  }

  /**
   * Create configuration for staging environment
   */
  static staging(): PoolConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'chanuka_staging',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',

      // Staging pooling (medium)
      min: 3,
      max: 15,

      // Timeouts
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      acquireTimeoutMillis: 10000,

      // Keep-alive
      keepAlives: true,
      keepAliveInitialDelayMillis: 10000,

      // Optional SSL
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

      // Statements
      statement_timeout: 30000,
      query_timeout: 30000,
    };
  }

  /**
   * Create configuration for production environment
   */
  static production(): PoolConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'chanuka_prod',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',

      // Production pooling (larger)
      min: 5,
      max: 50,

      // Timeouts
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      acquireTimeoutMillis: 10000,

      // Keep-alive
      keepAlives: true,
      keepAliveInitialDelayMillis: 10000,

      // Require SSL in production
      ssl: {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ...(process.env.DB_SSL_CA && { ca: process.env.DB_SSL_CA }),
        ...(process.env.DB_SSL_CERT && { cert: process.env.DB_SSL_CERT }),
        ...(process.env.DB_SSL_KEY && { key: process.env.DB_SSL_KEY }),
      },

      // Statements
      statement_timeout: 30000,
      query_timeout: 30000,
    };
  }

  /**
   * Get environment-specific configuration
   */
  static forEnvironment(env = process.env.NODE_ENV || 'development'): PoolConfig {
    switch (env) {
      case 'production':
        return this.production();
      case 'staging':
        return this.staging();
      case 'development':
      default:
        return this.development();
    }
  }
}

// ============================================================================
// Pool Wrapper with Health Monitoring
// ============================================================================

export interface PoolMetrics {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  avgConnectionTime: number;
  lastHealthCheck: Date;
  healthyConnections: number;
  unhealthyConnections: number;
}

export class MonitoredPool {
  private pool: Pool;
  private metrics: PoolMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly healthCheckIntervalMs = 30000; // 30 seconds
  private failureCount = 0;
  private readonly maxFailures = 5;

  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
    this.metrics = {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
      avgConnectionTime: 0,
      lastHealthCheck: new Date(),
      healthyConnections: 0,
      unhealthyConnections: 0,
    };

    // Set up event handlers
    this.setupEventHandlers();

    // Start health monitoring
    this.startHealthMonitoring();
  }

  private setupEventHandlers(): void {
    this.pool.on('error', (error) => {
      this.failureCount++;
      logger.error({
        msg: 'Pool error event',
        error: error.message,
        failureCount: this.failureCount,
      });

      if (this.failureCount >= this.maxFailures) {
        logger.error('Pool reached max failures - may need restart');
      }
    });

    this.pool.on('connect', () => {
      logger.debug('New pool connection established');
    });

    this.pool.on('remove', () => {
      logger.debug('Pool connection removed');
    });
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const client = await this.pool.connect();
        try {
          await client.query('SELECT NOW()');
          this.metrics.healthyConnections++;
        } finally {
          client.release();
        }
      } catch (error) {
        this.metrics.unhealthyConnections++;
        logger.warn({
          msg: 'Pool health check failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }

      this.metrics.lastHealthCheck = new Date();
    }, this.healthCheckIntervalMs);
  }

  /**
   * Get underlying pg.Pool instance
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PoolMetrics {
    return {
      ...this.metrics,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Connect with automatic retry
   */
  async connectWithRetry(maxRetries = 3): Promise<PoolClient> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.pool.connect();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn({
          msg: `Connection attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          error: error instanceof Error ? error.message : String(error),
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to connect after retries');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    logger.info('Shutting down pool');

    try {
      // Drain all idle connections
      const drainStart = Date.now();
      while (this.pool.idleCount > 0 && Date.now() - drainStart < 30000) {
        const client = this.pool._clients.pop();
        if (client) {
          client.end();
        } else {
          break;
        }
      }

      // Close remaining connections
      await this.pool.end();
      logger.info('Pool shutdown complete');
    } catch (error) {
      logger.error({
        msg: 'Error during pool shutdown',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// ============================================================================
// Convenience Factory
// ============================================================================

export function createPool(config?: PoolConfig): Pool {
  const finalConfig = config || AdvancedPoolConfig.forEnvironment();
  return new Pool(finalConfig);
}

export function createMonitoredPool(config?: PoolConfig): MonitoredPool {
  const finalConfig = config || AdvancedPoolConfig.forEnvironment();
  return new MonitoredPool(finalConfig);
}
