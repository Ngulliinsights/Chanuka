/**
 * Pool Manager
 *
 * Manages PostgreSQL connection pools with metrics tracking and health monitoring.
 * Extracted from pool.ts to provide focused pool management functionality.
 */

import { Pool, PoolConfig } from 'pg';
import type { PoolClient } from 'pg';

import { logger } from '../../observability/core/logger';
import { CircuitBreakerStrategy } from '../strategies';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PoolManagerConfig extends PoolConfig {
  name: string;
  enableMetrics?: boolean;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  circuitBreakerResetTimeout?: number;
}

export interface PoolMetrics {
  queries: number;
  connections: number;
  idleConnections: number;
  totalConnections: number;
  waitingClients: number;
  avgQueryTime?: number;
  maxQueryTime?: number;
  minQueryTime?: number;
}

export interface PoolHealthStatus {
  isHealthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  circuitBreakerState?: string;
  circuitBreakerFailures?: number;
  utilizationPercentage: number;
  lastError?: string;
}

/**
 * Enhanced pool with metrics and circuit breaker
 */
export interface EnhancedPool extends Pool {
  readonly name: string;
  getMetrics(): Promise<PoolMetrics>;
  resetMetrics(): Promise<void>;
  trackQuery(queryDuration: number): Promise<void>;
  getHealth(): Promise<PoolHealthStatus>;
  circuitBreaker?: CircuitBreakerStrategy;
}

// ============================================================================
// Pool Manager Class
// ============================================================================

/**
 * PoolManager
 *
 * Manages a PostgreSQL connection pool with metrics tracking, health monitoring,
 * and optional circuit breaker protection.
 *
 * @example
 * ```typescript
 * const manager = new PoolManager({
 *   name: 'primary',
 *   connectionString: process.env.DATABASE_URL,
 *   max: 20,
 *   enableMetrics: true,
 *   enableCircuitBreaker: true
 * });
 *
 * await manager.initialize();
 * const pool = manager.getPool();
 * const result = await pool.query('SELECT * FROM users');
 * ```
 */
export class PoolManager {
  private pool!: EnhancedPool;
  private config: PoolManagerConfig;
  private metrics: {
    queries: number;
    connections: number;
    idleConnections: number;
    queryTimes: number[];
  };
  private circuitBreaker?: CircuitBreakerStrategy;
  private initialized = false;

  constructor(config: PoolManagerConfig) {
    this.config = {
      enableMetrics: true,
      enableCircuitBreaker: false,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      circuitBreakerResetTimeout: 300000,
      ...config,
    };

    this.metrics = {
      queries: 0,
      connections: 0,
      idleConnections: 0,
      queryTimes: [],
    };
  }

  /**
   * Initialize the pool manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn({ poolName: this.config.name }, 'Pool manager already initialized');
      return;
    }

    try {
      // Create the pool
      this.pool = this.createPool();

      // Setup event handlers
      this.setupEventHandlers();

      // Initialize circuit breaker if enabled
      if (this.config.enableCircuitBreaker) {
        this.circuitBreaker = new CircuitBreakerStrategy({
          threshold: this.config.circuitBreakerThreshold!,
          timeout: this.config.circuitBreakerTimeout!,
          resetTimeout: this.config.circuitBreakerResetTimeout!,
        });
        this.pool.circuitBreaker = this.circuitBreaker;
      }

      // Test connection
      await this.testConnection();

      this.initialized = true;

      logger.info({
        poolName: this.config.name,
        maxConnections: this.config.max,
        enableMetrics: this.config.enableMetrics,
        enableCircuitBreaker: this.config.enableCircuitBreaker,
      }, 'Pool manager initialized successfully');
    } catch (error) {
      logger.error({
        poolName: this.config.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to initialize pool manager');
      throw error;
    }
  }

  /**
   * Create the PostgreSQL pool
   */
  private createPool(): EnhancedPool {
    const pool = new Pool({
      ...this.config,
      application_name: this.config.application_name || `chanuka_${this.config.name}`,
    }) as EnhancedPool;

    // Add enhanced methods
    (pool as any).name = this.config.name;
    (pool as any).getMetrics = () => this.getMetrics();
    (pool as any).resetMetrics = () => this.resetMetrics();
    (pool as any).trackQuery = (duration: number) => this.trackQuery(duration);
    (pool as any).getHealth = () => this.getHealth();

    return pool;
  }

  /**
   * Setup event handlers for the pool
   */
  private setupEventHandlers(): void {
    // Connection acquired from pool
    this.pool.on('connect', (client: PoolClient) => {
      this.metrics.connections++;

      // Setup client error handler
      client.on('error', (err: Error) => {
        logger.error({
          poolName: this.config.name,
          error: err.message,
        }, 'Client error in pool');
      });
    });

    // Connection checked out from idle pool
    this.pool.on('acquire', () => {
      this.metrics.idleConnections = Math.max(0, this.metrics.idleConnections - 1);
    });

    // Connection returned to pool
    this.pool.on('release', () => {
      this.metrics.idleConnections++;
    });

    // Connection removed from pool
    this.pool.on('remove', () => {
      this.metrics.connections = Math.max(0, this.metrics.connections - 1);
    });

    // Pool-level error
    this.pool.on('error', (err: Error) => {
      logger.error({
        poolName: this.config.name,
        error: err.message,
        totalConnections: this.pool.totalCount,
        waitingClients: this.pool.waitingCount,
      }, 'Pool error');
    });
  }

  /**
   * Test the pool connection
   */
  private async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  /**
   * Get the pool instance
   */
  getPool(): EnhancedPool {
    if (!this.initialized) {
      throw new Error(`Pool manager '${this.config.name}' not initialized. Call initialize() first.`);
    }
    return this.pool;
  }

  /**
   * Track a query execution time
   */
  private async trackQuery(duration: number): Promise<void> {
    if (!this.config.enableMetrics) {
      return;
    }

    this.metrics.queries++;
    this.metrics.queryTimes.push(duration);

    // Keep only last 100 query times
    if (this.metrics.queryTimes.length > 100) {
      this.metrics.queryTimes.shift();
    }
  }

  /**
   * Get pool metrics
   */
  private async getMetrics(): Promise<PoolMetrics> {
    const { queryTimes } = this.metrics;
    const hasData = queryTimes.length > 0;
    const sum = hasData ? queryTimes.reduce((acc, t) => acc + t, 0) : 0;

    return {
      queries: this.metrics.queries,
      connections: this.metrics.connections,
      idleConnections: this.metrics.idleConnections,
      totalConnections: this.pool.totalCount,
      waitingClients: this.pool.waitingCount,
      avgQueryTime: hasData ? sum / queryTimes.length : undefined,
      maxQueryTime: hasData ? Math.max(...queryTimes) : undefined,
      minQueryTime: hasData ? Math.min(...queryTimes) : undefined,
    };
  }

  /**
   * Reset metrics
   */
  private async resetMetrics(): Promise<void> {
    this.metrics = {
      queries: 0,
      connections: 0,
      idleConnections: 0,
      queryTimes: [],
    };
  }

  /**
   * Get pool health status
   */
  private async getHealth(): Promise<PoolHealthStatus> {
    try {
      const maxConnections = this.config.max || 20;
      const utilizationPercentage = (this.pool.totalCount / maxConnections) * 100;

      const isHealthy =
        this.pool.totalCount > 0 &&
        this.pool.waitingCount < maxConnections * 0.8 &&
        (!this.circuitBreaker || this.circuitBreaker.getState().state !== 'open');

      return {
        isHealthy,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount,
        circuitBreakerState: this.circuitBreaker?.getState().state,
        circuitBreakerFailures: this.circuitBreaker?.getState().failures,
        utilizationPercentage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        isHealthy: false,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount,
        circuitBreakerState: this.circuitBreaker?.getState().state,
        circuitBreakerFailures: this.circuitBreaker?.getState().failures,
        utilizationPercentage: 0,
        lastError: errorMessage,
      };
    }
  }

  /**
   * Check if pool is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get pool name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get pool configuration
   */
  getConfig(): PoolManagerConfig {
    return { ...this.config };
  }

  /**
   * Close the pool
   */
  async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.pool.end();
      this.initialized = false;

      logger.info({
        poolName: this.config.name,
      }, 'Pool closed successfully');
    } catch (error) {
      logger.error({
        poolName: this.config.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Error closing pool');
      throw error;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a pool manager with default configuration
 */
export function createPoolManager(config: PoolManagerConfig): PoolManager {
  return new PoolManager(config);
}

/**
 * Create a pool manager optimized for production
 */
export function createProductionPoolManager(
  name: string,
  connectionString: string
): PoolManager {
  return new PoolManager({
    name,
    connectionString,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    enableMetrics: true,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
    circuitBreakerResetTimeout: 300000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
}

/**
 * Create a pool manager for testing
 */
export function createTestPoolManager(
  name: string,
  connectionString: string
): PoolManager {
  return new PoolManager({
    name,
    connectionString,
    max: 5,
    min: 0,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 2000,
    enableMetrics: false,
    enableCircuitBreaker: false,
  });
}
