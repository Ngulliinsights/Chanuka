import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import { errorTracker } from '../../core/errors/error-tracker.js';
import { config } from '../../config/index.js';
import { logger } from '../../../shared/core/src/index.js';
import { users, bills, sponsors, User, Bill, Sponsor } from '@shared/schema/foundation';
import { comments, notifications, bill_engagement, bill_tracking_preferences } from '@shared/schema/citizen_participation';

import { repositoryFactory } from './repositories/repository-factory.js';
// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

interface DatabaseResult<T> {
  data: T;
  source: 'database' | 'fallback';
  timestamp: Date;
  error?: Error;
  executionTime?: number;
}

interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  error?: Error;
  timestamp: Date;
  consecutiveFailures?: number;
}

type TransactionCallback<T> = (tx: any) => Promise<T>;

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

type CircuitBreakerState = 'closed' | 'open' | 'half-open';

interface ConnectionStatus {
  isConnected: boolean;
  lastHealthCheck: Date;
  connectionAttempts: number;
  consecutiveFailures: number;
  circuitBreakerState: CircuitBreakerState;
  poolStats?: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000;
const HEALTHY_CHECK_INTERVAL = 30000;
const UNHEALTHY_CHECK_INTERVAL = 10000;
const CONNECTION_TEST_TIMEOUT = 5000;
const SLOW_QUERY_THRESHOLD = 3000;
const SLOW_HEALTH_CHECK_THRESHOLD = 1000;
const SERIALIZATION_RETRY_DELAY = 100;
const DRAIN_TIMEOUT = 10000;

// ============================================================================
// MAIN DATABASE SERVICE CLASS
// ============================================================================

/**
 * Comprehensive Database Service with advanced connection management
 * 
 * This service provides robust database connectivity with several key features:
 * - Exponential backoff with jitter prevents thundering herd problems
 * - Circuit breaker pattern stops cascading failures
 * - Health monitoring adapts based on connection state
 * - Graceful degradation with fallback strategies
 * - Transaction support with automatic serialization retry
 */
export class DatabaseService {
  // Core database connections
  private pool: pg.Pool | undefined;
  private db: any;

  // Connection state tracking
  private isConnected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private connectionAttempts: number = 0;
  private consecutiveFailures: number = 0;

  // Timer references for proper cleanup
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectionTimeout: NodeJS.Timeout | null = null;

  // Circuit breaker implementation
  private circuitBreakerState: CircuitBreakerState = 'closed';
  private lastCircuitBreakerOpen: Date | null = null;

  // Configurable retry behavior
  private retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG };

  // Schema for Drizzle ORM
  private readonly schema = {
    users,
    bills,
    sponsors,
    comments,
    notifications,
    bill_engagement,
    bill_tracking_preferences
  };

  constructor(serviceConfig?: Partial<DatabaseConfig>) {
    this.initializePool(serviceConfig);
    this.setupConnectionHandlers();
    this.initialize();
  }

  // ==========================================================================
  // INITIALIZATION METHODS
  // ==========================================================================

  /**
   * Creates the connection pool with optimized configuration
   * Separates concerns for better testability and maintainability
   */
  private initializePool(serviceConfig?: Partial<DatabaseConfig>): void {
    const poolConfig = this.buildPoolConfig(serviceConfig);
    this.pool = new Pool(poolConfig);
    this.db = drizzle(this.pool, { schema: this.schema });
    this.initializeRepositories();
  }

  /**
   * Builds pool configuration with intelligent defaults
   * Prefers DATABASE_URL for cloud deployments, falls back to individual params
   */
  private buildPoolConfig(serviceConfig?: Partial<DatabaseConfig>): pg.PoolConfig {
    const dbConfig = config.database;

    // Cloud deployment path using connection string
    if (dbConfig.url) {
      return {
        connectionString: dbConfig.url,
        max: serviceConfig?.max ?? dbConfig.maxConnections,
        idleTimeoutMillis: serviceConfig?.idleTimeoutMillis ?? dbConfig.idleTimeoutMillis,
        connectionTimeoutMillis: serviceConfig?.connectionTimeoutMillis ?? dbConfig.connectionTimeoutMillis,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      };
    }

    // Local development path with individual parameters
    return {
      host: serviceConfig?.host ?? dbConfig.host,
      port: serviceConfig?.port ?? dbConfig.port,
      user: serviceConfig?.user ?? dbConfig.user,
      password: serviceConfig?.password ?? dbConfig.password,
      database: serviceConfig?.database ?? dbConfig.name,
      max: serviceConfig?.max ?? dbConfig.maxConnections,
      idleTimeoutMillis: serviceConfig?.idleTimeoutMillis ?? dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: serviceConfig?.connectionTimeoutMillis ?? dbConfig.connectionTimeoutMillis,
      ssl: serviceConfig?.ssl ?? (dbConfig.ssl ? { rejectUnauthorized: false } : false),
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };
  }

  /**
   * Initializes repositories using the repository factory
   * Creates repositories for all core entities in the schema
   */
  private initializeRepositories(): void {
    // Create repositories for core entities
    repositoryFactory.createRepository<User>(
      'users',
      users,
      (row: any) => row as User,
      (entity: User) => entity
    );

    repositoryFactory.createRepository<Bill>(
      'bills',
      bills,
      (row: any) => row as Bill,
      (entity: Bill) => entity
    );

    repositoryFactory.createRepository<Sponsor>(
      'sponsors',
      sponsors,
      (row: any) => row as Sponsor,
      (entity: Sponsor) => entity
    );

    repositoryFactory.createRepository<any>(
      'comments',
      comments,
      (row: any) => row,
      (entity: any) => entity
    );

    repositoryFactory.createRepository<any>(
      'notifications',
      notifications,
      (row: any) => row,
      (entity: any) => entity
    );

    repositoryFactory.createRepository<any>(
      'bill_engagement',
      bill_engagement,
      (row: any) => row,
      (entity: any) => entity
    );

    repositoryFactory.createRepository<any>(
      'bill_tracking_preferences',
      bill_tracking_preferences,
      (row: any) => row,
      (entity: any) => entity
    );

    logger.info('✅ Repositories initialized successfully', { component: 'Chanuka' });
  }

  /**
   * Sets up event listeners for pool lifecycle events
   * Provides visibility into connection health and issues
   */
  private setupConnectionHandlers(): void {
    if (!this.pool) return;

    this.pool.on('connect', () => {
      logger.info('✅ Database client connected', { component: 'Chanuka' });
      this.handleSuccessfulConnection();
    });

    this.pool.on('error', (err) => {
      errorTracker.trackError(err, { endpoint: 'database_service_pool_error' }, 'high', 'database');
      this.handleConnectionError();
    });

    this.pool.on('remove', () => {
      logger.info('🔄 Database client removed from pool', { component: 'Chanuka' });
    });
  }

  /**
   * Handles successful connection events
   * Resets failure counters and circuit breaker state
   */
  private handleSuccessfulConnection(): void {
    this.isConnected = true;
    this.connectionAttempts = 0;
    this.consecutiveFailures = 0;
    this.closeCircuitBreaker();
  }

  /**
   * Handles connection errors
   * Tracks failures and opens circuit breaker if threshold exceeded
   */
  private handleConnectionError(): void {
    this.isConnected = false;
    this.incrementFailureCount();
  }

  /**
   * Performs non-blocking initialization
   * Allows service to start in degraded mode if database unavailable
   */
  private async initialize(): Promise<void> {
    try {
      await this.testConnection();
      this.startHealthCheckMonitoring();
      logger.info('✅ Database service initialized successfully', { component: 'Chanuka' });
    } catch (error) {
      logger.warn('⚠️ Initial database connection failed, will retry in background', { component: 'Chanuka' });
      this.scheduleReconnection();
    }
  }

  /**
   * Tests database connection with timeout protection
   * Prevents hanging on unresponsive databases
   */
  private async testConnection(): Promise<void> {
    if (!this.pool) throw new Error('Pool not initialized');

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timeout')), CONNECTION_TEST_TIMEOUT);
    });

    const connectPromise = this.attemptConnection();

    await Promise.race([connectPromise, timeoutPromise]);
  }

  /**
   * Attempts to establish and verify database connection
   */
  private async attemptConnection(): Promise<void> {
    const client = await this.pool!.connect();
    try {
      await client.query('SELECT NOW()');
      this.isConnected = true;
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // HEALTH MONITORING
  // ==========================================================================

  /**
   * Starts adaptive health check monitoring
   * Increases frequency when connection issues detected
   */
  private startHealthCheckMonitoring(): void {
    this.clearHealthCheckInterval();

    const interval = this.isConnected ? HEALTHY_CHECK_INTERVAL : UNHEALTHY_CHECK_INTERVAL;
    this.healthCheckInterval = setInterval(() => this.performHealthCheck(), interval);
  }

  /**
   * Safely clears health check interval
   */
  private clearHealthCheckInterval(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Performs health check with circuit breaker integration
   * Returns detailed health status for monitoring
   */
  private async performHealthCheck(): Promise<HealthCheckResult> {
    // Fast-fail if circuit breaker is open and hasn't timed out
    if (this.shouldSkipHealthCheck()) {
      return this.createCircuitOpenResult();
    }

    // Transition to half-open state if timeout elapsed
    if (this.circuitBreakerState === 'open') {
      this.circuitBreakerState = 'half-open';
    }

    return this.executeHealthCheck();
  }

  /**
   * Determines if health check should be skipped due to circuit breaker
   */
  private shouldSkipHealthCheck(): boolean {
    if (this.circuitBreakerState !== 'open' || !this.lastCircuitBreakerOpen) {
      return false;
    }

    const timeSinceOpen = Date.now() - this.lastCircuitBreakerOpen.getTime();
    return timeSinceOpen < CIRCUIT_BREAKER_TIMEOUT;
  }

  /**
   * Creates result object for when circuit breaker is open
   */
  private createCircuitOpenResult(): HealthCheckResult {
    return {
      isHealthy: false,
      responseTime: 0,
      timestamp: new Date(),
      consecutiveFailures: this.consecutiveFailures,
      error: new Error('Circuit breaker is open')
    };
  }

  /**
   * Executes the actual health check query
   */
  private async executeHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const result = await this.performHealthCheckQuery();
      this.logSlowHealthCheck(result.responseTime);
      return result;
    } catch (error) {
      return this.handleHealthCheckFailure(error as Error, startTime);
    }
  }

  /**
   * Performs the health check database query
   */
  private async performHealthCheckQuery(): Promise<HealthCheckResult> {
    if (!this.pool) throw new Error('Pool not initialized');

    const startTime = Date.now();
    const client = await this.pool.connect();

    try {
      await client.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      this.handleHealthCheckSuccess();

      return {
        isHealthy: true,
        responseTime,
        timestamp: this.lastHealthCheck,
        consecutiveFailures: 0
      };
    } finally {
      client.release();
    }
  }

  /**
   * Handles successful health check
   */
  private handleHealthCheckSuccess(): void {
    this.lastHealthCheck = new Date();
    this.isConnected = true;
    this.consecutiveFailures = 0;
    this.closeCircuitBreaker();
  }

  /**
   * Logs warning for slow health checks
   */
  private logSlowHealthCheck(responseTime: number): void {
    if (responseTime > SLOW_HEALTH_CHECK_THRESHOLD) {
      logger.warn(`⚠️ Slow health check response: ${responseTime}ms`, { component: 'Chanuka' });
    }
  }

  /**
   * Handles health check failures
   */
  private handleHealthCheckFailure(error: Error, startTime: number): HealthCheckResult {
    const responseTime = Date.now() - startTime;
    this.isConnected = false;
    this.incrementFailureCount();

    errorTracker.trackError(error, { endpoint: 'database_service_health_check' }, 'medium', 'database');

    if (!this.reconnectionTimeout) {
      this.scheduleReconnection();
    }

    return {
      isHealthy: false,
      responseTime,
      error,
      timestamp: new Date(),
      consecutiveFailures: this.consecutiveFailures
    };
  }

  // ==========================================================================
  // CIRCUIT BREAKER PATTERN
  // ==========================================================================

  /**
   * Increments failure count and opens circuit breaker if threshold reached
   */
  private incrementFailureCount(): void {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD && this.circuitBreakerState === 'closed') {
      this.openCircuitBreaker();
    }
  }

  /**
   * Opens circuit breaker to prevent overwhelming failed database
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerState = 'open';
    this.lastCircuitBreakerOpen = new Date();
    logger.warn('🔴 Circuit breaker opened - database requests will be blocked temporarily', { component: 'Chanuka' });
  }

  /**
   * Closes circuit breaker when connection restored
   */
  private closeCircuitBreaker(): void {
    if (this.circuitBreakerState !== 'closed') {
      this.circuitBreakerState = 'closed';
      this.lastCircuitBreakerOpen = null;
      logger.info('🟢 Circuit breaker closed - database requests resumed', { component: 'Chanuka' });
    }
  }

  // ==========================================================================
  // RECONNECTION LOGIC
  // ==========================================================================

  /**
   * Schedules reconnection with exponential backoff and jitter
   * Jitter prevents synchronized retry storms across multiple instances
   */
  private scheduleReconnection(): void {
    this.clearReconnectionTimeout();

    if (this.hasExceededMaxRetries()) {
      logger.info('🔄 Maximum retry attempts reached, continuing in fallback mode', { component: 'Chanuka' });
      return;
    }

    const delay = this.calculateReconnectionDelay();
    this.connectionAttempts++;

    logger.info(`🔄 Scheduling reconnection attempt ${this.connectionAttempts}/${this.retryConfig.maxAttempts} in ${delay}ms`, { component: 'Chanuka' });

    this.reconnectionTimeout = setTimeout(() => this.attemptReconnection(), delay);
  }

  /**
   * Clears pending reconnection timeout
   */
  private clearReconnectionTimeout(): void {
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }
  }

  /**
   * Checks if maximum retry attempts exceeded
   */
  private hasExceededMaxRetries(): boolean {
    return this.connectionAttempts >= this.retryConfig.maxAttempts;
  }

  /**
   * Calculates delay with exponential backoff and jitter
   */
  private calculateReconnectionDelay(): number {
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, this.connectionAttempts);
    delay = Math.min(delay, this.retryConfig.maxDelay);

    // Add jitter (±25%) to prevent thundering herd
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  /**
   * Attempts to reconnect to database
   */
  private async attemptReconnection(): Promise<void> {
    this.reconnectionTimeout = null;

    try {
      await this.testConnection();
      logger.info('✅ Database reconnection successful', { component: 'Chanuka' });
      this.startHealthCheckMonitoring();
    } catch (error) {
      logger.error('❌ Reconnection attempt failed', { component: 'Chanuka', error: (error as Error).message });
      this.scheduleReconnection();
    }
  }

  // ==========================================================================
  // CORE DATABASE OPERATIONS
  // ==========================================================================

  /**
   * Executes operation with automatic fallback on failure
   * Tracks execution time and provides detailed error context
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
      return this.createFallbackResult(fallbackData, timestamp, 0, new Error('Circuit breaker is open'));
    }

    // Use fallback if disconnected (unless in half-open state for testing)
    if (!this.isConnected && this.circuitBreakerState !== 'half-open') {
      logger.warn(`⚠️ Database unavailable for ${context}, using fallback data`, { component: 'Chanuka' });
      return this.createFallbackResult(fallbackData, timestamp, Date.now() - startTime, new Error('Database connection unavailable'));
    }

    try {
      const data = await operation();
      const executionTime = Date.now() - startTime;

      this.logSlowOperation(context, executionTime);

      return {
        data,
        source: 'database',
        timestamp,
        executionTime
      };
    } catch (error) {
      return this.handleOperationFailure(error as Error, fallbackData, timestamp, startTime, context);
    }
  }

  /**
   * Creates fallback result object
   */
  private createFallbackResult<T>(
    fallbackData: T,
    timestamp: Date,
    executionTime: number,
    error: Error
  ): DatabaseResult<T> {
    return {
      data: fallbackData,
      source: 'fallback',
      timestamp,
      executionTime,
      error
    };
  }

  /**
   * Logs warning for slow operations
   */
  private logSlowOperation(context: string, executionTime: number): void {
    if (executionTime > SLOW_QUERY_THRESHOLD) {
      logger.warn(`⚠️ Slow operation ${context}: ${executionTime}ms`, { component: 'Chanuka' });
    }
  }

  /**
   * Handles operation failures with appropriate error tracking
   */
  private handleOperationFailure<T>(
    error: Error,
    fallbackData: T,
    timestamp: Date,
    startTime: number,
    context: string
  ): DatabaseResult<T> {
    const executionTime = Date.now() - startTime;

    errorTracker.trackError(error, { endpoint: `database_service_withFallback_${context}` }, 'medium', 'database');

    this.isConnected = false;
    this.incrementFailureCount();

    if (!this.reconnectionTimeout) {
      this.scheduleReconnection();
    }

    return this.createFallbackResult(fallbackData, timestamp, executionTime, error);
  }

  /**
   * Executes database transaction with automatic retry on serialization failures
   * Common in high-concurrency scenarios
   */
  async withTransaction<T>(
    callback: TransactionCallback<T>,
    context: string = 'transaction',
    retryOnSerializationFailure: boolean = true
  ): Promise<DatabaseResult<T>> {
    if (!this.isConnected) {
      throw new Error(`Database unavailable for transaction: ${context}`);
    }

    if (!this.pool) throw new Error('Pool not initialized');

    const timestamp = new Date();
    const startTime = Date.now();
    const maxSerializationRetries = 3;

    for (let attempts = 0; attempts < maxSerializationRetries; attempts++) {
      try {
        const result = await this.executeTransaction(callback);
        const executionTime = Date.now() - startTime;

        return {
          data: result,
          source: 'database',
          timestamp,
          executionTime
        };
      } catch (error) {
        if (this.shouldRetryTransaction(error as any, retryOnSerializationFailure, attempts, maxSerializationRetries)) {
          await this.delayBeforeRetry(attempts);
          continue;
        }

        this.handleTransactionError(error as Error, context);
        throw error;
      }
    }

    throw new Error(`Transaction failed after ${maxSerializationRetries} attempts`);
  }

  /**
   * Executes single transaction attempt
   */
  private async executeTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await this.pool!.connect();

    try {
      await client.query('BEGIN');
      const txDb = drizzle(client, { schema: this.schema });
      const result = await callback(txDb);
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
   * Determines if transaction should be retried
   */
  private shouldRetryTransaction(
    error: any,
    retryOnSerializationFailure: boolean,
    attempts: number,
    maxRetries: number
  ): boolean {
    const isSerializationError = error.code === '40001' || error.code === '40P01';
    return retryOnSerializationFailure && isSerializationError && attempts < maxRetries - 1;
  }

  /**
   * Delays before retrying transaction
   */
  private async delayBeforeRetry(attempts: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, SERIALIZATION_RETRY_DELAY * (attempts + 1)));
  }

  /**
   * Handles transaction errors
   */
  private handleTransactionError(error: Error, context: string): void {
    errorTracker.trackError(error, { endpoint: `database_service_transaction_${context}` }, 'high', 'database');

    const errorCode = (error as any).code;
    const isConnectionError = errorCode && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(errorCode);

    if (!this.reconnectionTimeout && isConnectionError) {
      this.isConnected = false;
      this.incrementFailureCount();
      this.scheduleReconnection();
    }
  }

  /**
   * Executes raw SQL query with parameterization
   */
  async executeRawQuery<T>(
    query: string,
    params: any[] = [],
    fallbackData: T,
    context: string = 'raw_query'
  ): Promise<DatabaseResult<T>> {
    if (!this.pool) throw new Error('Pool not initialized');

    return this.withFallback(
      async () => {
        const client = await this.pool!.connect();
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
   * Executes batch operations with optional parallel processing
   */
  async batchExecute<T = any>(
    operations: Array<(tx: any) => Promise<T>>,
    context: string = 'batch_operation',
    parallel: boolean = false
  ): Promise<DatabaseResult<T[]>> {
    return this.withTransaction(
      async (tx) => {
        if (parallel) {
          return Promise.all(operations.map(op => op(tx)));
        }

        const results: T[] = [];
        for (const operation of operations) {
          results.push(await operation(tx));
        }
        return results;
      },
      context
    );
  }

  // ==========================================================================
  // PUBLIC API METHODS
  // ==========================================================================

  /**
   * Returns current connection status with pool metrics
   */
  getConnectionStatus(): ConnectionStatus {
    const status: ConnectionStatus = {
      isConnected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
      connectionAttempts: this.connectionAttempts,
      consecutiveFailures: this.consecutiveFailures,
      circuitBreakerState: this.circuitBreakerState
    };

    if (this.pool) {
      status.poolStats = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };
    }

    return status;
  }

  /**
   * Triggers manual health check
   */
  async getHealthStatus(): Promise<HealthCheckResult> {
    return this.performHealthCheck();
  }

  /**
   * Returns Drizzle database instance
   */
  getDatabase() {
    return this.db;
  }

  /**
   * Returns connection pool for advanced operations
   */
  getPool() {
    return this.pool;
  }

  /**
   * Checks if service has active timers (useful for debugging)
   */
  hasActiveTimers(): boolean {
    return this.healthCheckInterval !== null || this.reconnectionTimeout !== null;
  }

  /**
   * Returns timer status for debugging
   */
  getTimerStatus(): { healthCheckInterval: boolean; reconnectionTimeout: boolean } {
    return {
      healthCheckInterval: this.healthCheckInterval !== null,
      reconnectionTimeout: this.reconnectionTimeout !== null
    };
  }

  /**
   * Updates retry configuration at runtime
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    logger.info('🔧 Retry configuration updated', { component: 'Chanuka', config: this.retryConfig });
  }

  /**
   * Forces immediate reconnection attempt
   */
  async forceReconnect(): Promise<void> {
    logger.info('🔄 Forcing database reconnection...', { component: 'Chanuka' });

    this.clearReconnectionTimeout();
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.consecutiveFailures = 0;
    this.closeCircuitBreaker();

    await this.initialize();
  }

  /**
   * Performs graceful shutdown with connection draining
   */
  async close(): Promise<void> {
    logger.info('🔄 Initiating graceful database shutdown...', { component: 'Chanuka' });

    this.clearAllTimers();

    if (!this.pool?.end) return;

    try {
      await this.drainConnectionPool();
      logger.info('✅ Database connections closed gracefully', { component: 'Chanuka' });
    } catch (error) {
      this.handleShutdownError(error as Error);
    }
  }

  /**
   * Clears all active timers
   */
  private clearAllTimers(): void {
    this.clearHealthCheckInterval();
    this.clearReconnectionTimeout();
  }

  /**
   * Drains connection pool with timeout
   */
  private async drainConnectionPool(): Promise<void> {
    const drainPromise = this.pool!.end() as Promise<void>;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Drain timeout')), DRAIN_TIMEOUT)
    );

    await Promise.race([drainPromise, timeoutPromise]);
  }

  /**
   * Handles errors during shutdown
   */
  private handleShutdownError(error: Error): void {
    errorTracker.trackError(error, { endpoint: 'database_service_close' }, 'medium', 'database');

    if (this.pool?.end) {
      this.pool.end();
    }
  }

  /**
   * Forces immediate cleanup of all timers (for testing)
   */
  forceCleanupTimers(): void {
    this.clearAllTimers();
    logger.info('🧹 Forced cleanup of all timers', { component: 'Chanuka' });
  }

  /**
   * Shuts down without closing pool (timer cleanup only)
   */
  shutdown(): void {
    logger.info('🛑 Shutting down database service...', { component: 'Chanuka' });
    this.clearAllTimers();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const databaseService = new DatabaseService();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  DatabaseResult,
  HealthCheckResult,
  TransactionCallback,
  RetryConfig,
  ConnectionStatus,
  CircuitBreakerState
};