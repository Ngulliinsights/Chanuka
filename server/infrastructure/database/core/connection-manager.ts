/**
 * Unified Database Connection Manager
 * 
 * Consolidates connection management from:
 * - shared/database/connection.ts (simple API)
 * - server/infrastructure/database/connection-pool.ts (advanced pooling)
 * 
 * Provides production-ready connection pooling with intelligent routing,
 * health monitoring, and a clean developer-friendly API.
 */

import { Pool, PoolClient, PoolConfig } from 'pg';

import { logger } from '../../observability';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Database operation types for intelligent connection routing.
 */
export type DatabaseOperation = 'read' | 'write' | 'general';

/**
 * Configuration for transaction execution behavior.
 */
export interface TransactionOptions {
  /** Maximum retry attempts for transient failures (default: 0) */
  maxRetries?: number;
  /** Callback invoked after each failed attempt */
  onError?: (error: Error, attempt: number) => void;
  /** Transaction timeout in milliseconds (optional) */
  timeout?: number;
  /** Custom delay calculation between retries (defaults to exponential backoff) */
  retryDelay?: (attempt: number) => number;
}

/**
 * Database transaction interface for type-safe transaction operations.
 */
export interface DatabaseTransaction {
  /** Execute a query within the transaction */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  /** Commit the transaction */
  commit(): Promise<void>;
  /** Rollback the transaction */
  rollback(): Promise<void>;
  /** Check if transaction is still active */
  isActive(): boolean;
}

/**
 * Enhanced connection pool configuration combining both systems.
 */
export interface ConnectionManagerConfig extends PoolConfig {
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
  
  // Multi-database architecture
  operationalDbUrl?: string;
  analyticsDbUrl?: string;
  securityDbUrl?: string;
}

/**
 * Connection metrics for monitoring and observability.
 */
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

/**
 * Database health check results across all connections.
 */
export interface DatabaseHealthStatus {
  operational: boolean;
  analytics: boolean;
  security: boolean;
  overall: boolean;
  timestamp: string;
  latencyMs?: number;
}

// ============================================================================
// UNIFIED CONNECTION MANAGER
// ============================================================================

export class UnifiedConnectionManager {
  private primaryPool!: Pool;
  private readPools: Pool[] = [];
  private operationalPool?: Pool;
  private analyticsPool?: Pool;
  private securityPool?: Pool;

  private config: Required<ConnectionManagerConfig>;
  private metrics!: ConnectionMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private startTime: Date;
  private queryTimes: number[] = [];
  private errorCount = 0;
  private isInitialized = false;

  constructor(config: ConnectionManagerConfig) {
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
      readReplicaUrls: [],
      ...config
    } as Required<ConnectionManagerConfig>;

    this.startTime = new Date();
    this.initializeMetrics();
  }

  /**
   * Initialize the connection manager and all pools.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Connection manager already initialized');
      return;
    }

    try {
      await this.createPools();
      this.startHealthMonitoring();
      this.isInitialized = true;

      logger.info({
        component: 'ConnectionManager',
        primaryPool: true,
        readReplicas: this.readPools.length,
        specializedDbs: {
          operational: !!this.operationalPool,
          analytics: !!this.analyticsPool,
          security: !!this.securityPool
        },
        maxConnections: this.config.max
      }, 'Unified connection manager initialized successfully');
    } catch (error) {
      logger.error({
        component: 'ConnectionManager',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to initialize connection manager');
      throw error;
    }
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

  private async createPools(): Promise<void> {
    // Create primary pool for writes and consistent reads
    this.primaryPool = new Pool({
      ...this.config,
      application_name: 'chanuka-primary',
      statement_timeout: this.config.statementTimeout,
      query_timeout: this.config.queryTimeout
    });

    this.setupPoolEventHandlers(this.primaryPool, 'primary');

    // Create read replica pools if configured
    if (this.config.readReplicaUrls && this.config.readReplicaUrls.length > 0) {
      for (let i = 0; i < this.config.readReplicaUrls.length; i++) {
        const url = this.config.readReplicaUrls[i];
        const readPool = new Pool({
          ...this.config,
          connectionString: url,
          application_name: `chanuka-read-${i}`,
          statement_timeout: this.config.statementTimeout,
          query_timeout: this.config.queryTimeout
        });

        this.setupPoolEventHandlers(readPool, `read-${i}`);
        this.readPools.push(readPool);
      }
    }

    // Create specialized database pools for multi-tenant architecture
    if (this.config.operationalDbUrl) {
      this.operationalPool = new Pool({
        ...this.config,
        connectionString: this.config.operationalDbUrl,
        application_name: 'chanuka-operational'
      });
      this.setupPoolEventHandlers(this.operationalPool, 'operational');
    }

    if (this.config.analyticsDbUrl) {
      this.analyticsPool = new Pool({
        ...this.config,
        connectionString: this.config.analyticsDbUrl,
        application_name: 'chanuka-analytics'
      });
      this.setupPoolEventHandlers(this.analyticsPool, 'analytics');
    }

    if (this.config.securityDbUrl) {
      this.securityPool = new Pool({
        ...this.config,
        connectionString: this.config.securityDbUrl,
        application_name: 'chanuka-security'
      });
      this.setupPoolEventHandlers(this.securityPool, 'security');
    }

    // Test all connections
    await this.performInitialHealthCheck();
  }

  private setupPoolEventHandlers(pool: Pool, poolName: string): void {
    pool.on('connect', (_client: PoolClient) => {
      logger.debug({
        component: 'ConnectionManager',
        pool: poolName
      }, `New client connected to ${poolName} pool`);
      this.updateConnectionMetrics();
    });

    pool.on('acquire', (_client: PoolClient) => {
      logger.debug({
        component: 'ConnectionManager',
        pool: poolName
      }, `Client acquired from ${poolName} pool`);
    });

    pool.on('remove', (_client: PoolClient) => {
      logger.debug({
        component: 'ConnectionManager',
        pool: poolName
      }, `Client removed from ${poolName} pool`);
      this.updateConnectionMetrics();
    });

    pool.on('error', (err: Error, _client: PoolClient) => {
      logger.error({
        component: 'ConnectionManager',
        pool: poolName,
        error: err.message
      }, `Database pool error in ${poolName}`);
      this.errorCount++;
      this.updateConnectionMetrics();
    });
  }

  private async performInitialHealthCheck(): Promise<void> {
    const pools = [
      { pool: this.primaryPool, name: 'primary' },
      ...this.readPools.map((pool, i) => ({ pool, name: `read-${i}` })),
      ...(this.operationalPool ? [{ pool: this.operationalPool, name: 'operational' }] : []),
      ...(this.analyticsPool ? [{ pool: this.analyticsPool, name: 'analytics' }] : []),
      ...(this.securityPool ? [{ pool: this.securityPool, name: 'security' }] : [])
    ];

    const healthChecks = await Promise.allSettled(
      pools.map(({ pool, name }) => this.checkPoolHealth(pool, name))
    );

    const failedChecks = healthChecks
      .map((result, index) => ({ result, name: pools[index]!.name }))
      .filter(({ result }) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value));

    if (failedChecks.length > 0) {
      const failedNames = failedChecks.map(({ name }) => name);
      throw new Error(`Initial health check failed for pools: ${failedNames.join(', ')}`);
    }
  }

  // ============================================================================
  // CONNECTION ROUTING (Simple API from shared/database/connection.ts)
  // ============================================================================

  /**
   * Routes database operations to the optimal connection based on operation type.
   * Maintains the simple API while leveraging advanced pooling underneath.
   */
  public getDatabase(operation: DatabaseOperation = 'general') {
    if (!this.isInitialized) {
      throw new Error('Connection manager not initialized. Call initialize() first.');
    }

    switch (operation) {
      case 'read':
        return this.getReadConnection();
      case 'write':
        return this.getWriteConnection();
      case 'general':
      default:
        return this.primaryPool;
    }
  }

  /**
   * Get specialized database connections for multi-tenant architecture.
   */
  public getOperationalDb() {
    return this.operationalPool || this.primaryPool;
  }

  public getAnalyticsDb() {
    return this.analyticsPool || this.primaryPool;
  }

  public getSecurityDb() {
    return this.securityPool || this.primaryPool;
  }

  // ============================================================================
  // ADVANCED CONNECTION MANAGEMENT (from server/infrastructure)
  // ============================================================================

  /**
   * Get a connection for read operations with intelligent replica routing.
   */
  public async getReadConnection(): Promise<PoolClient> {
    if (!this.isInitialized) {
      throw new Error('Connection manager not initialized');
    }

    // Use read replica if available and random selection favors it
    if (this.readPools.length > 0 && Math.random() < this.config.readWriteRatio) {
      const randomIndex = Math.floor(Math.random() * this.readPools.length);
      try {
        return await this.readPools[randomIndex]!.connect();
      } catch (error) {
        logger.warn({
          component: 'ConnectionManager',
          replicaIndex: randomIndex,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Read replica connection failed, falling back to primary');
      }
    }

    // Fallback to primary pool
    return await this.primaryPool.connect();
  }

  /**
   * Get a connection for write operations (always uses primary).
   */
  public async getWriteConnection(): Promise<PoolClient> {
    if (!this.isInitialized) {
      throw new Error('Connection manager not initialized');
    }

    return await this.primaryPool.connect();
  }

  /**
   * Execute a query with automatic connection management and routing.
   */
  public async query(text: string, params?: unknown[], useReadReplica = true): Promise<unknown> {
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
      logger.error({
        component: 'ConnectionManager',
        query: text.substring(0, 100) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Database query failed');
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

  // ============================================================================
  // TRANSACTION MANAGEMENT (Enhanced from shared/database/connection.ts)
  // ============================================================================

  /**
   * Executes operations within an ACID-compliant database transaction.
   * Enhanced with advanced retry logic and monitoring from both systems.
   */
  public async withTransaction<T>(
    callback: (tx: DatabaseTransaction) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const { 
      maxRetries = 0, 
      onError, 
      timeout,
      retryDelay = this.calculateExponentialBackoff
    } = options;
    
    let lastError: Error | null = null;

    // Attempt transaction with configurable retries
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const client = await this.getWriteConnection();
      
      try {
        const transaction = await this.createTransaction(client, timeout);
        const result = await callback(transaction);
        await transaction.commit();
        
        client.release();
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error({ error: rollbackError }, 'Rollback failed');
        }
        
        client.release();

        const isRetryable = this.isTransientError(lastError);
        const shouldRetry = attempt < maxRetries && isRetryable;

        logger.error({
          error: lastError,
          component: 'ConnectionManager',
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          willRetry: shouldRetry,
          isRetryable,
          timestamp: new Date().toISOString(),
        }, 'Transaction failed');

        if (onError) {
          try {
            onError(lastError, attempt + 1);
          } catch (handlerError) {
            logger.error({ error: handlerError }, 'Error handler threw exception');
          }
        }

        if (!shouldRetry) {
          throw lastError;
        }

        const delayMs = retryDelay(attempt);
        await this.sleep(delayMs);
      }
    }

    throw lastError || new Error('Transaction failed after all retries');
  }

  private async createTransaction(client: PoolClient, timeout?: number): Promise<DatabaseTransaction> {
    await client.query('BEGIN');
    
    let isActive = true;
    let timeoutHandle: NodeJS.Timeout | undefined;

    if (timeout) {
      timeoutHandle = setTimeout(() => {
        if (isActive) {
          client.query('ROLLBACK').catch(() => {});
          isActive = false;
        }
      }, timeout);
    }

    return {
      async query<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
        if (!isActive) {
          throw new Error('Transaction is no longer active');
        }
        return await client.query(sql, params) as T;
      },

      async commit(): Promise<void> {
        if (!isActive) {
          throw new Error('Transaction is no longer active');
        }
        await client.query('COMMIT');
        isActive = false;
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      },

      async rollback(): Promise<void> {
        if (!isActive) {
          return; // Already rolled back
        }
        await client.query('ROLLBACK');
        isActive = false;
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      },

      isActive(): boolean {
        return isActive;
      }
    };
  }

  private calculateExponentialBackoff(attempt: number): number {
    const baseDelay = 1000;
    const maxDelay = 10000;
    return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  }

  private isTransientError(error: Error): boolean {
    const transientCodes = new Set([
      '40001', // Serialization failure
      '40P01', // Deadlock detected
      '53300', // Too many connections
      '57P03', // Cannot connect now
      '08006', // Connection failure
      '08003', // Connection does not exist
      '08001', // Unable to establish connection
      '57014', // Query canceled
    ]);

    if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && transientCodes.has(error.code)) {
      return true;
    }

    const errorMessage = error.message.toLowerCase();
    const transientPatterns = [
      'connection', 'timeout', 'deadlock', 'serialization',
      'lock', 'conflict', 'temporarily unavailable'
    ];

    return transientPatterns.some(pattern => errorMessage.includes(pattern));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // HEALTH MONITORING (Enhanced from both systems)
  // ============================================================================

  private updateConnectionMetrics(): void {
    const allPools = [
      this.primaryPool,
      ...this.readPools,
      ...(this.operationalPool ? [this.operationalPool] : []),
      ...(this.analyticsPool ? [this.analyticsPool] : []),
      ...(this.securityPool ? [this.securityPool] : [])
    ];

    const totals = allPools.reduce((acc, pool) => ({
      totalCount: acc.totalCount + pool.totalCount,
      idleCount: acc.idleCount + pool.idleCount,
      waitingCount: acc.waitingCount + pool.waitingCount
    }), { totalCount: 0, idleCount: 0, waitingCount: 0 });

    this.metrics = {
      ...this.metrics,
      totalConnections: totals.totalCount,
      idleConnections: totals.idleCount,
      activeConnections: totals.totalCount - totals.idleCount,
      waitingClients: totals.waitingCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime.getTime(),
      averageQueryTime: this.queryTimes.length > 0 
        ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length 
        : 0
    };
  }

  private recordQueryTime(time: number): void {
    this.queryTimes.push(time);
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift();
    }
  }

  private startHealthMonitoring(): void {
    if (this.config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(async () => {
        await this.performHealthCheck();
      }, this.config.healthCheckInterval);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const pools = [
        { pool: this.primaryPool, name: 'primary' },
        ...this.readPools.map((pool, i) => ({ pool, name: `read-${i}` })),
        ...(this.operationalPool ? [{ pool: this.operationalPool, name: 'operational' }] : []),
        ...(this.analyticsPool ? [{ pool: this.analyticsPool, name: 'analytics' }] : []),
        ...(this.securityPool ? [{ pool: this.securityPool, name: 'security' }] : [])
      ];

      const healthChecks = await Promise.allSettled(
        pools.map(({ pool, name }) => this.checkPoolHealth(pool, name))
      );

      const healthyPools = healthChecks.filter(
        result => result.status === 'fulfilled' && result.value
      ).length;

      this.metrics.lastHealthCheck = new Date();
      this.updateConnectionMetrics();

      logger.debug({
        component: 'ConnectionManager',
        healthyPools,
        totalPools: pools.length
      }, 'Database health check completed');

    } catch (error) {
      logger.error({
        component: 'ConnectionManager',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Health check failed');
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
      logger.warn({
        component: 'ConnectionManager',
        pool: poolName,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, `Health check failed for ${poolName} pool`);
      return false;
    }
  }

  /**
   * Comprehensive health check across all database connections.
   */
  public async checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test primary connection
      await this.primaryPool.query('SELECT 1');
      const latencyMs = Date.now() - startTime;

      // Test specialized connections
      const operationalHealthy = this.operationalPool 
        ? await this.checkPoolHealth(this.operationalPool, 'operational')
        : true;
      
      const analyticsHealthy = this.analyticsPool
        ? await this.checkPoolHealth(this.analyticsPool, 'analytics')
        : true;
      
      const securityHealthy = this.securityPool
        ? await this.checkPoolHealth(this.securityPool, 'security')
        : true;

      const overall = operationalHealthy && analyticsHealthy && securityHealthy;

      return {
        operational: operationalHealthy,
        analytics: analyticsHealthy,
        security: securityHealthy,
        overall,
        timestamp: new Date().toISOString(),
        latencyMs,
      };
    } catch (error) {
      logger.error({ 
        error,
        component: 'ConnectionManager',
        timestamp: new Date().toISOString(),
      }, 'Database health check failed');

      return {
        operational: false,
        analytics: false,
        security: false,
        overall: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ============================================================================
  // METRICS AND MONITORING
  // ============================================================================

  /**
   * Get current connection pool metrics.
   */
  public getMetrics(): ConnectionMetrics {
    this.updateConnectionMetrics();
    return { ...this.metrics };
  }

  /**
   * Get detailed pool status for all connections.
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
      specialized: {
        operational: this.operationalPool ? {
          totalCount: this.operationalPool.totalCount,
          idleCount: this.operationalPool.idleCount,
          waitingCount: this.operationalPool.waitingCount
        } : null,
        analytics: this.analyticsPool ? {
          totalCount: this.analyticsPool.totalCount,
          idleCount: this.analyticsPool.idleCount,
          waitingCount: this.analyticsPool.waitingCount
        } : null,
        security: this.securityPool ? {
          totalCount: this.securityPool.totalCount,
          idleCount: this.securityPool.idleCount,
          waitingCount: this.securityPool.waitingCount
        } : null
      },
      metrics: this.getMetrics()
    };
  }

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Gracefully close all database connections.
   */
  public async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const closePromises = [
      this.primaryPool.end(),
      ...this.readPools.map(pool => pool.end()),
      ...(this.operationalPool ? [this.operationalPool.end()] : []),
      ...(this.analyticsPool ? [this.analyticsPool.end()] : []),
      ...(this.securityPool ? [this.securityPool.end()] : [])
    ];

    await Promise.all(closePromises);

    this.isInitialized = false;

    logger.info({
      component: 'ConnectionManager',
      timestamp: new Date().toISOString(),
    }, 'All database connections closed successfully');
  }

  /**
   * Force close all connections (emergency shutdown).
   */
  public async forceClose(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const closePromises = [
      this.primaryPool.end(),
      ...this.readPools.map(pool => pool.end()),
      ...(this.operationalPool ? [this.operationalPool.end()] : []),
      ...(this.analyticsPool ? [this.analyticsPool.end()] : []),
      ...(this.securityPool ? [this.securityPool.end()] : [])
    ];

    await Promise.allSettled(closePromises);

    this.isInitialized = false;

    logger.warn({
      component: 'ConnectionManager',
      timestamp: new Date().toISOString(),
    }, 'Database connections force closed');
  }
}

// ============================================================================
// SINGLETON MANAGEMENT
// ============================================================================

let connectionManager: UnifiedConnectionManager | null = null;

/**
 * Create and initialize the unified connection manager.
 */
export async function createConnectionManager(config: ConnectionManagerConfig): Promise<UnifiedConnectionManager> {
  if (connectionManager) {
    throw new Error('Connection manager already exists. Use getConnectionManager() to access it.');
  }
  
  connectionManager = new UnifiedConnectionManager(config);
  await connectionManager.initialize();
  return connectionManager;
}

/**
 * Get the existing connection manager instance.
 */
export function getConnectionManager(): UnifiedConnectionManager {
  if (!connectionManager) {
    throw new Error('Connection manager not initialized. Call createConnectionManager() first.');
  }
  
  return connectionManager;
}

/**
 * Close the connection manager and all its connections.
 */
export async function closeConnectionManager(): Promise<void> {
  if (connectionManager) {
    await connectionManager.close();
    connectionManager = null;
  }
}

// ============================================================================
// CONVENIENCE EXPORTS (Maintaining backward compatibility)
// ============================================================================

/**
 * Get database connection with operation-specific routing.
 * Maintains the simple API from shared/database/connection.ts
 */
export function getDatabase(operation: DatabaseOperation = 'general') {
  return getConnectionManager().getDatabase(operation);
}

/**
 * Execute operations within a transaction.
 * Enhanced version of withTransaction from shared/database/connection.ts
 */
export async function withTransaction<T>(
  callback: (tx: DatabaseTransaction) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  return getConnectionManager().withTransaction(callback, options);
}

/**
 * Execute read-only operations with automatic replica routing.
 */
export async function withReadConnection<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getConnectionManager().getReadConnection();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

/**
 * Check database health across all connections.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  return getConnectionManager().checkDatabaseHealth();
}

/**
 * Close all database connections gracefully.
 */
export async function closeDatabaseConnections(): Promise<void> {
  return closeConnectionManager();
}


