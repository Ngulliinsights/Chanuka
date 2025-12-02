/**
 * Production-Ready Database Connection Pool
 * 
 * Implements advanced connection pooling with:
 * - Connection health monitoring
 * - Automatic failover and recovery
 * - Performance metrics collection
 * - Connection lifecycle management
 * - Load balancing for read replicas
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '@shared/core';

export interface ConnectionPoolConfig extends PoolConfig {
  // Pool sizing
  min?: number;
  max?: number;
  
  // Timeouts
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  acquireTimeoutMillis?: number;
  
  // Health monitoring
  healthCheckInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  
  // Performance
  statementTimeout?: number;
  queryTimeout?: number;
  
  // Read replica support
  readReplicaUrls?: string[];
  readWriteRatio?: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  totalQueries: number;
  averageQueryTime: number;
  errorCount: number;
  lastHealthCheck: Date;
  uptime: number;
}

export class DatabaseConnectionPool {
  private primaryPool: Pool;
  private readPools: Pool[] = [];
  private config: ConnectionPoolConfig;
  private metrics: ConnectionMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private startTime: Date;
  private queryTimes: number[] = [];
  private errorCount = 0;

  constructor(config: ConnectionPoolConfig) {
    this.config = {
      // Default configuration optimized for production
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      acquireTimeoutMillis: 10000,
      healthCheckInterval: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      statementTimeout: 30000,
      queryTimeout: 30000,
      readWriteRatio: 0.7, // 70% reads, 30% writes
      ...config
    };

    this.startTime = new Date();
    this.initializeMetrics();
    this.createPools();
    this.startHealthMonitoring();
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      idleConnections: 0,
      activeConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      averageQueryTime: 0,
      errorCount: 0,
      lastHealthCheck: new Date(),
      uptime: 0
    };
  }

  private createPools(): void {
    // Create primary pool for writes and consistent reads
    this.primaryPool = new Pool({
      ...this.config,
      application_name: 'chanuka-primary',
      statement_timeout: this.config.statementTimeout,
      query_timeout: this.config.queryTimeout
    });

    // Set up pool event handlers
    this.setupPoolEventHandlers(this.primaryPool, 'primary');

    // Create read replica pools if configured
    if (this.config.readReplicaUrls && this.config.readReplicaUrls.length > 0) {
      this.config.readReplicaUrls.forEach((url, index) => {
        const readPool = new Pool({
          ...this.config,
          connectionString: url,
          application_name: `chanuka-read-${index}`,
          statement_timeout: this.config.statementTimeout,
          query_timeout: this.config.queryTimeout
        });

        this.setupPoolEventHandlers(readPool, `read-${index}`);
        this.readPools.push(readPool);
      });
    }

    logger.info('Database connection pools initialized', {
      component: 'DatabasePool',
      primaryPool: true,
      readReplicas: this.readPools.length,
      maxConnections: this.config.max
    });
  }

  private setupPoolEventHandlers(pool: Pool, poolName: string): void {
    pool.on('connect', (client: PoolClient) => {
      logger.debug(`New client connected to ${poolName} pool`, {
        component: 'DatabasePool',
        pool: poolName
      });
      this.updateConnectionMetrics();
    });

    pool.on('acquire', (client: PoolClient) => {
      logger.debug(`Client acquired from ${poolName} pool`, {
        component: 'DatabasePool',
        pool: poolName
      });
    });

    pool.on('remove', (client: PoolClient) => {
      logger.debug(`Client removed from ${poolName} pool`, {
        component: 'DatabasePool',
        pool: poolName
      });
      this.updateConnectionMetrics();
    });

    pool.on('error', (err: Error, client: PoolClient) => {
      logger.error(`Database pool error in ${poolName}`, {
        component: 'DatabasePool',
        pool: poolName,
        error: err.message
      });
      this.errorCount++;
      this.updateConnectionMetrics();
    });
  }

  private updateConnectionMetrics(): void {
    const primaryStats = {
      totalCount: this.primaryPool.totalCount,
      idleCount: this.primaryPool.idleCount,
      waitingCount: this.primaryPool.waitingCount
    };

    const readStats = this.readPools.reduce((acc, pool) => ({
      totalCount: acc.totalCount + pool.totalCount,
      idleCount: acc.idleCount + pool.idleCount,
      waitingCount: acc.waitingCount + pool.waitingCount
    }), { totalCount: 0, idleCount: 0, waitingCount: 0 });

    this.metrics = {
      ...this.metrics,
      totalConnections: primaryStats.totalCount + readStats.totalCount,
      idleConnections: primaryStats.idleCount + readStats.idleCount,
      activeConnections: (primaryStats.totalCount - primaryStats.idleCount) + 
                        (readStats.totalCount - readStats.idleCount),
      waitingClients: primaryStats.waitingCount + readStats.waitingCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime.getTime(),
      averageQueryTime: this.queryTimes.length > 0 
        ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length 
        : 0
    };
  }

  private startHealthMonitoring(): void {
    if (this.config.healthCheckInterval && this.config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(async () => {
        await this.performHealthCheck();
      }, this.config.healthCheckInterval);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check primary pool health
      const primaryHealthy = await this.checkPoolHealth(this.primaryPool, 'primary');
      
      // Check read replica health
      const readHealthChecks = await Promise.allSettled(
        this.readPools.map((pool, index) => 
          this.checkPoolHealth(pool, `read-${index}`)
        )
      );

      const healthyReadReplicas = readHealthChecks.filter(
        result => result.status === 'fulfilled' && result.value
      ).length;

      this.metrics.lastHealthCheck = new Date();
      this.updateConnectionMetrics();

      logger.debug('Database health check completed', {
        component: 'DatabasePool',
        primaryHealthy,
        healthyReadReplicas,
        totalReadReplicas: this.readPools.length
      });

    } catch (error) {
      logger.error('Health check failed', {
        component: 'DatabasePool',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async checkPoolHealth(pool: Pool, poolName: string): Promise<boolean> {
    try {
      const client = await pool.connect();
      const startTime = Date.now();
      
      await client.query('SELECT 1 as health_check');
      
      const queryTime = Date.now() - startTime;
      this.recordQueryTime(queryTime);
      
      client.release();
      return true;
    } catch (error) {
      logger.warn(`Health check failed for ${poolName} pool`, {
        component: 'DatabasePool',
        pool: poolName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private recordQueryTime(time: number): void {
    this.queryTimes.push(time);
    // Keep only last 100 query times for average calculation
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift();
    }
  }

  /**
   * Get a connection for read operations
   * Uses read replicas when available and healthy
   */
  public async getReadConnection(): Promise<PoolClient> {
    // Use read replica if available and random selection favors it
    if (this.readPools.length > 0 && Math.random() < (this.config.readWriteRatio || 0.7)) {
      const randomIndex = Math.floor(Math.random() * this.readPools.length);
      try {
        return await this.readPools[randomIndex].connect();
      } catch (error) {
        logger.warn('Read replica connection failed, falling back to primary', {
          component: 'DatabasePool',
          replicaIndex: randomIndex,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Fallback to primary pool
    return await this.primaryPool.connect();
  }

  /**
   * Get a connection for write operations
   * Always uses primary pool
   */
  public async getWriteConnection(): Promise<PoolClient> {
    return await this.primaryPool.connect();
  }

  /**
   * Execute a query with automatic connection management
   */
  public async query(text: string, params?: any[], useReadReplica = true): Promise<any> {
    const startTime = Date.now();
    let client: PoolClient;

    try {
      // Determine if this is a read or write operation
      const isReadOperation = this.isReadQuery(text);
      
      client = isReadOperation && useReadReplica 
        ? await this.getReadConnection()
        : await this.getWriteConnection();

      const result = await client.query(text, params);
      
      const queryTime = Date.now() - startTime;
      this.recordQueryTime(queryTime);
      this.metrics.totalQueries++;

      return result;
    } catch (error) {
      this.errorCount++;
      logger.error('Database query failed', {
        component: 'DatabasePool',
        query: text.substring(0, 100) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      if (client!) {
        client.release();
      }
    }
  }

  private isReadQuery(query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery.startsWith('select') || 
           normalizedQuery.startsWith('with') ||
           normalizedQuery.startsWith('show') ||
           normalizedQuery.startsWith('explain');
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getWriteConnection();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get current connection pool metrics
   */
  public getMetrics(): ConnectionMetrics {
    this.updateConnectionMetrics();
    return { ...this.metrics };
  }

  /**
   * Get detailed pool status
   */
  public getPoolStatus() {
    return {
      primary: {
        totalCount: this.primaryPool.totalCount,
        idleCount: this.primaryPool.idleCount,
        waitingCount: this.primaryPool.waitingCount
      },
      readReplicas: this.readPools.map((pool, index) => ({
        index,
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      })),
      metrics: this.getMetrics()
    };
  }

  /**
   * Gracefully close all connections
   */
  public async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const closePromises = [
      this.primaryPool.end(),
      ...this.readPools.map(pool => pool.end())
    ];

    await Promise.all(closePromises);

    logger.info('Database connection pools closed', {
      component: 'DatabasePool'
    });
  }

  /**
   * Force close all connections (emergency shutdown)
   */
  public async forceClose(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Force close all pools immediately
    await Promise.allSettled([
      this.primaryPool.end(),
      ...this.readPools.map(pool => pool.end())
    ]);

    logger.warn('Database connection pools force closed', {
      component: 'DatabasePool'
    });
  }
}

// Singleton instance for application-wide use
let connectionPool: DatabaseConnectionPool | null = null;

export function createConnectionPool(config: ConnectionPoolConfig): DatabaseConnectionPool {
  if (connectionPool) {
    throw new Error('Connection pool already exists. Use getConnectionPool() to access it.');
  }
  
  connectionPool = new DatabaseConnectionPool(config);
  return connectionPool;
}

export function getConnectionPool(): DatabaseConnectionPool {
  if (!connectionPool) {
    throw new Error('Connection pool not initialized. Call createConnectionPool() first.');
  }
  
  return connectionPool;
}

export async function closeConnectionPool(): Promise<void> {
  if (connectionPool) {
    await connectionPool.close();
    connectionPool = null;
  }
}
