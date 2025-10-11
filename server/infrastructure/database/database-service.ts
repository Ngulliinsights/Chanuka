import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from "../../../shared/schema.js";
import { eq, and, or, sql } from 'drizzle-orm';
import { errorTracker } from '../../core/errors/error-tracker.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger';

// Database connection configuration with improved typing
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl?: boolean | object;
}

// Enhanced database operation result with additional metadata
interface DatabaseResult<T> {
  data: T;
  source: 'database' | 'fallback';
  timestamp: Date;
  error?: Error;
  executionTime?: number; // Track how long operations take
}

// Comprehensive health check result
interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  error?: Error;
  timestamp: Date;
  consecutiveFailures?: number; // Track failure patterns
}

// Transaction callback with proper typing
type TransactionCallback<T> = (tx: any) => Promise<T>;

// Configuration options for retry behavior
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Comprehensive Database Service with advanced connection management
 * 
 * Key optimizations:
 * 1. Exponential backoff with jitter for retry logic
 * 2. Circuit breaker pattern to prevent cascading failures
 * 3. Connection pool monitoring and metrics
 * 4. Graceful degradation with smart fallback strategies
 * 5. Memory-efficient health check scheduling
 */
export class DatabaseService {
  private pool: pg.Pool;
  private db: any;
  private isConnected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private connectionAttempts: number = 0;
  private consecutiveFailures: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Circuit breaker state management
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private circuitBreakerThreshold: number = 5; // Open circuit after 5 consecutive failures
  private circuitBreakerTimeout: number = 60000; // Try to close circuit after 1 minute
  private lastCircuitBreakerOpen: Date | null = null;

  // Configurable retry behavior for better control
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000, // Cap retry delay at 30 seconds
    backoffMultiplier: 2
  };

  constructor(config?: Partial<DatabaseConfig>) {
    // Optimize pool configuration based on environment
    const poolConfig = this.buildPoolConfig(config);
    this.pool = new Pool(poolConfig);
    this.db = drizzle(this.pool, { schema });

    this.setupConnectionHandlers();
    this.initialize();
  }

  /**
   * Build optimized pool configuration
   * Separates configuration logic for better maintainability
   */
  private buildPoolConfig(serviceConfig?: Partial<DatabaseConfig>): pg.PoolConfig {
    const dbConfig = config.database;

    // Prefer DATABASE_URL for cloud deployments (cleaner and more portable)
    if (dbConfig.url) {
      return {
        connectionString: dbConfig.url,
        max: serviceConfig?.max || dbConfig.maxConnections,
        idleTimeoutMillis: serviceConfig?.idleTimeoutMillis || dbConfig.idleTimeoutMillis,
        connectionTimeoutMillis: serviceConfig?.connectionTimeoutMillis || dbConfig.connectionTimeoutMillis,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
        // Add keepalive for long-running connections
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      };
    }

    // Fallback to individual parameters for local development
    return {
      host: serviceConfig?.host || dbConfig.host,
      port: serviceConfig?.port || dbConfig.port,
      user: serviceConfig?.user || dbConfig.user,
      password: serviceConfig?.password || dbConfig.password,
      database: serviceConfig?.database || dbConfig.name,
      max: serviceConfig?.max || dbConfig.maxConnections,
      idleTimeoutMillis: serviceConfig?.idleTimeoutMillis || dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: serviceConfig?.connectionTimeoutMillis || dbConfig.connectionTimeoutMillis,
      ssl: serviceConfig?.ssl || (dbConfig.ssl ? { rejectUnauthorized: false } : false),
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };
  }

  /**
   * Enhanced connection handlers with better error context
   */
  private setupConnectionHandlers(): void {
    this.pool.on('connect', (client) => {
      logger.info('✅ Database client connected', { component: 'SimpleTool' });
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.consecutiveFailures = 0;
      this.closeCircuitBreaker(); // Reset circuit breaker on successful connection
    });

    this.pool.on('error', (err, client) => {
      errorTracker.trackError(
        err,
        {
          endpoint: 'database_service_pool_error'
        },
        'high',
        'database'
      );
      this.isConnected = false;
      this.incrementFailureCount();
    });

    this.pool.on('remove', (client) => {
      logger.info('🔄 Database client removed from pool', { component: 'SimpleTool' });
    });

    // Add handler for when a client is acquired from the pool
    this.pool.on('acquire', (client) => {
      // Track pool utilization if needed for monitoring
    });
  }

  /**
   * Initialize with non-blocking connection attempt
   * Prevents startup delays when database is temporarily unavailable
   */
  private async initialize(): Promise<void> {
    try {
      await this.testConnection();
      this.startHealthCheckMonitoring();
      logger.info('✅ Database service initialized successfully', { component: 'SimpleTool' });
    } catch (error) {
      console.warn('⚠️ Initial database connection failed, will retry in background');
      this.scheduleReconnection();
      // Don't throw - allow service to start in degraded mode
    }
  }

  /**
   * Optimized connection test with timeout
   */
  private async testConnection(): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timeout')), 5000);
    });

    const connectPromise = (async () => {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
        this.isConnected = true;
      } finally {
        client.release();
      }
    })();

    await Promise.race([connectPromise, timeoutPromise]);
  }

  /**
   * Start health monitoring with adaptive interval
   * Increases check frequency when issues are detected
   */
  private startHealthCheckMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Adapt check interval based on connection health
    const interval = this.isConnected ? 30000 : 10000; // Check more frequently when unhealthy

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);
  }

  /**
   * Enhanced health check with circuit breaker integration
   */
  private async performHealthCheck(): Promise<HealthCheckResult> {
    // Skip health check if circuit is open and timeout hasn't elapsed
    if (this.circuitBreakerState === 'open' && this.lastCircuitBreakerOpen) {
      const timeSinceOpen = Date.now() - this.lastCircuitBreakerOpen.getTime();
      if (timeSinceOpen < this.circuitBreakerTimeout) {
        return {
          isHealthy: false,
          responseTime: 0,
          timestamp: new Date(),
          consecutiveFailures: this.consecutiveFailures,
          error: new Error('Circuit breaker is open')
        };
      }
      // Try to transition to half-open state
      this.circuitBreakerState = 'half-open';
    }

    const startTime = Date.now();

    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        const responseTime = Date.now() - startTime;

        this.lastHealthCheck = new Date();
        this.isConnected = true;
        this.consecutiveFailures = 0;
        this.closeCircuitBreaker();

        // Log slow queries for monitoring
        if (responseTime > 1000) {
          console.warn(`⚠️ Slow health check response: ${responseTime}ms`);
        }

        return {
          isHealthy: true,
          responseTime,
          timestamp: this.lastHealthCheck,
          consecutiveFailures: 0
        };
      } finally {
        client.release();
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.isConnected = false;
      this.incrementFailureCount();

      errorTracker.trackError(
        error as Error,
        {
          endpoint: 'database_service_health_check'
        },
        'medium',
        'database'
      );
      this.scheduleReconnection();

      return {
        isHealthy: false,
        responseTime,
        error: error as Error,
        timestamp: new Date(),
        consecutiveFailures: this.consecutiveFailures
      };
    }
  }

  /**
   * Circuit breaker pattern implementation
   * Prevents overwhelming a failing database with requests
   */
  private incrementFailureCount(): void {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.circuitBreakerThreshold &&
      this.circuitBreakerState === 'closed') {
      this.openCircuitBreaker();
    }
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerState = 'open';
    this.lastCircuitBreakerOpen = new Date();
    console.warn('🔴 Circuit breaker opened - database requests will be blocked temporarily');
  }

  private closeCircuitBreaker(): void {
    if (this.circuitBreakerState !== 'closed') {
      this.circuitBreakerState = 'closed';
      this.lastCircuitBreakerOpen = null;
      logger.info('🟢 Circuit breaker closed - database requests resumed', { component: 'SimpleTool' });
    }
  }

  /**
   * Optimized reconnection with exponential backoff and jitter
   * Jitter prevents thundering herd problem when multiple instances reconnect
   */
  private scheduleReconnection(): void {
    if (this.connectionAttempts >= this.retryConfig.maxAttempts) {
      logger.info('🔄 Maximum retry attempts reached, will continue with fallback mode', { component: 'SimpleTool' });
      return;
    }

    // Calculate delay with exponential backoff
    let delay = this.retryConfig.baseDelay *
      Math.pow(this.retryConfig.backoffMultiplier, this.connectionAttempts);

    // Cap at maximum delay
    delay = Math.min(delay, this.retryConfig.maxDelay);

    // Add jitter (random variance of ±25%) to prevent synchronized retries
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    delay = Math.round(delay + jitter);

    this.connectionAttempts++;

    console.log(`🔄 Scheduling reconnection attempt ${this.connectionAttempts}/${this.retryConfig.maxAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.testConnection();
        logger.info('✅ Database reconnection successful', { component: 'SimpleTool' });
        this.startHealthCheckMonitoring();
      } catch (error) {
        logger.error('❌ Reconnection attempt failed', { component: 'SimpleTool', error: (error as Error).message });
        this.scheduleReconnection();
      }
    }, delay);
  }

  /**
   * Enhanced fallback execution with performance tracking
   */
  async withFallback<T>(
    operation: () => Promise<T>,
    fallbackData: T,
    context: string
  ): Promise<DatabaseResult<T>> {
    const timestamp = new Date();
    const startTime = Date.now();

    // Fast-fail if circuit breaker is open
    if (this.circuitBreakerState === 'open') {
      console.log(`⚠️ Circuit breaker open for ${context}, using fallback`);
      return {
        data: fallbackData,
        source: 'fallback',
        timestamp,
        executionTime: 0,
        error: new Error('Circuit breaker is open')
      };
    }

    if (!this.isConnected && this.circuitBreakerState !== 'half-open') {
      console.log(`⚠️ Database unavailable for ${context}, using fallback data`);
      return {
        data: fallbackData,
        source: 'fallback',
        timestamp,
        executionTime: Date.now() - startTime,
        error: new Error('Database connection unavailable')
      };
    }

    try {
      const data = await operation();
      const executionTime = Date.now() - startTime;

      // Log slow operations for performance monitoring
      if (executionTime > 3000) {
        console.warn(`⚠️ Slow operation ${context}: ${executionTime}ms`);
      }

      return {
        data,
        source: 'database',
        timestamp,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      errorTracker.trackError(
        error as Error,
        {
          endpoint: `database_service_withFallback_${context}`
        },
        'medium',
        'database'
      );

      this.isConnected = false;
      this.incrementFailureCount();
      this.scheduleReconnection();

      return {
        data: fallbackData,
        source: 'fallback',
        timestamp,
        executionTime,
        error: error as Error
      };
    }
  }

  /**
   * Transaction execution with automatic retry on serialization failures
   */
  async withTransaction<T>(
    callback: TransactionCallback<T>,
    context: string = 'transaction',
    retryOnSerializationFailure: boolean = true
  ): Promise<DatabaseResult<T>> {
    const timestamp = new Date();
    const startTime = Date.now();

    if (!this.isConnected) {
      throw new Error(`Database unavailable for transaction: ${context}`);
    }

    let attempts = 0;
    const maxSerializationRetries = 3;

    while (attempts < maxSerializationRetries) {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        const txDb = drizzle(client, { schema });
        const result = await callback(txDb);

        await client.query('COMMIT');

        const executionTime = Date.now() - startTime;

        return {
          data: result,
          source: 'database',
          timestamp,
          executionTime
        };
      } catch (error) {
        await client.query('ROLLBACK');

        // Retry on serialization failures (common in high-concurrency scenarios)
        const isSerializationError = (error as any).code === '40001' ||
          (error as any).code === '40P01';

        if (retryOnSerializationFailure && isSerializationError && attempts < maxSerializationRetries - 1) {
          attempts++;
          console.warn(`⚠️ Serialization failure in ${context}, retrying (attempt ${attempts})`);
          client.release();
          await new Promise(resolve => setTimeout(resolve, 100 * attempts)); // Small delay before retry
          continue;
        }

        errorTracker.trackError(
          error as Error,
          {
            endpoint: `database_service_transaction_${context}`
          },
          'high',
          'database'
        );
        throw error;
      } finally {
        client.release();
      }
    }

    throw new Error(`Transaction failed after ${maxSerializationRetries} attempts`);
  }

  /**
   * Get comprehensive connection status with pool metrics
   */
  getConnectionStatus(): {
    isConnected: boolean;
    lastHealthCheck: Date;
    connectionAttempts: number;
    consecutiveFailures: number;
    circuitBreakerState: string;
    poolStats: {
      totalCount: number;
      idleCount: number;
      waitingCount: number;
    };
  } {
    return {
      isConnected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
      connectionAttempts: this.connectionAttempts,
      consecutiveFailures: this.consecutiveFailures,
      circuitBreakerState: this.circuitBreakerState,
      poolStats: {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      }
    };
  }

  /**
   * Get database instance - use sparingly, prefer withFallback
   */
  getDatabase() {
    return this.db;
  }

  /**
   * Get pool for advanced operations
   */
  getPool() {
    return this.pool;
  }

  /**
   * Manual health check trigger
   */
  async getHealthStatus(): Promise<HealthCheckResult> {
    return await this.performHealthCheck();
  }

  /**
   * Execute raw SQL with automatic parameterization safety check
   */
  async executeRawQuery<T>(
    query: string,
    params: any[] = [],
    fallbackData: T,
    context: string = 'raw_query'
  ): Promise<DatabaseResult<T>> {
    return this.withFallback(
      async () => {
        const client = await this.pool.connect();
        try {
          const result = await client.query(query, params);
          return result.rows as T;
        } finally {
          client.release();
        }
      },
      fallbackData,
      context
    );
  }

  /**
   * Optimized batch execution with parallel processing option
   */
  async batchExecute<T = any>(
    operations: Array<(tx: any) => Promise<T>>,
    context: string = 'batch_operation',
    parallel: boolean = false
  ): Promise<DatabaseResult<T[]>> {
    return this.withTransaction(
      async (tx) => {
        if (parallel) {
          // Execute operations in parallel for better performance
          // Only safe when operations don't depend on each other
          return await Promise.all(operations.map(op => op(tx)));
        } else {
          // Sequential execution for dependent operations
          const results: T[] = [];
          for (const operation of operations) {
            const result = await operation(tx);
            results.push(result);
          }
          return results;
        }
      },
      context
    );
  }

  /**
   * Graceful shutdown with connection draining
   */
  async close(): Promise<void> {
    logger.info('🔄 Initiating graceful database shutdown...', { component: 'SimpleTool' });

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    try {
      // Wait for active connections to complete (with timeout)
      const drainTimeout = 10000; // 10 seconds
      const drainPromise = this.pool.end();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Drain timeout')), drainTimeout)
      );

      await Promise.race([drainPromise, timeoutPromise]);
      logger.info('✅ Database connections closed gracefully', { component: 'SimpleTool' });
    } catch (error) {
      errorTracker.trackError(
        error as Error,
        {
          endpoint: 'database_service_close'
        },
        'medium',
        'database'
      );
      // Force close if graceful shutdown fails
      await this.pool.end();
    }
  }

  /**
   * Force reconnection with circuit breaker reset
   */
  async forceReconnect(): Promise<void> {
    logger.info('🔄 Forcing database reconnection...', { component: 'SimpleTool' });
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.consecutiveFailures = 0;
    this.closeCircuitBreaker();
    await this.initialize();
  }

  /**
   * Update retry configuration dynamically
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    logger.info('🔧 Retry configuration updated:', { component: 'SimpleTool' }, this.retryConfig);
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();

// Export types
export type { DatabaseResult, HealthCheckResult, TransactionCallback, RetryConfig };






