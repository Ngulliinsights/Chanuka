import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type * as pg from 'pg';

import { logger } from '../../client/src/types/core';
import * as schema from '../schema';

// Pool is imported directly above

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================


// Common type imports for better type safety
type AsyncFunction<T = void> = (...args: unknown[]) => Promise<T>;
type SafeAny = unknown;
type DatabaseConnection = any; // TODO: Replace with actual DB connection type
type LoggerInstance = any; // TODO: Replace with actual logger type

/**
 * Complete type-safe schema definition providing compile-time validation
 * for all database operations throughout the application.
 */
export type FullDatabaseSchema = typeof schema;

type ActualSchemaType = typeof schema;

/**
 * Validates schema compatibility at compile time, ensuring type safety
 * across the entire application and catching mismatches before runtime.
 */
function validateSchemaType<T extends ActualSchemaType>(schemaToValidate: T): T {
  return schemaToValidate;
}

/**
 * Comprehensive pool metrics for monitoring performance and capacity.
 */
export interface PoolMetrics {
  queries: number;
  connections: number;
  idleConnections: number;
  totalConnections: number;
  waitingClients: number;
  avgQueryTime?: number | undefined;
  maxQueryTime?: number | undefined;
  minQueryTime?: number | undefined;
}

/**
 * Health status for individual database pools including utilization metrics.
 */
export interface PoolHealthStatus {
  isHealthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  circuitBreakerState: string;
  circuitBreakerFailures: number;
  utilizationPercentage: number;
  lastError?: string;
}

/**
 * Enhanced pool interface extending pg.Pool with monitoring capabilities.
 */
export interface EnhancedPool extends pg.Pool {
  getMetrics: () => Promise<PoolMetrics>;
  resetMetrics: () => Promise<void>;
  trackQuery: (queryDuration: number) => Promise<void>;
  circuitBreaker: CircuitBreaker;
}

/**
 * Organized collection of all database pools with raw and ORM interfaces.
 */
export interface PoolCollection {
  general: { raw: EnhancedPool; drizzle: typeof db };
  read: { raw: EnhancedPool; drizzle: typeof readDb };
  write: { raw: EnhancedPool; drizzle: typeof writeDb };
}

/**
 * Configuration for query execution with context and pool selection.
 */
interface QueryExecutionOptions {
  text: string;
  params?: unknown[] | Record<string, unknown>;
  pool?: EnhancedPool;
  context?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Centralized configuration with environment variable support.
 * All tunable parameters are defined here for easy adjustment across environments.
 */
const CONFIG = {
  // Environment
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  READ_REPLICA_URL: process.env.READ_REPLICA_URL,
  WRITE_MASTER_URL: process.env.DATABASE_URL,
  APP_NAME: 'chanuka',

  // Query Performance
  SLOW_QUERY_THRESHOLD: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10),
  MAX_QUERY_TIMES_STORED: parseInt(process.env.MAX_QUERY_TIMES_STORED || '100', 10),
  QUERY_TIMEOUT_MS: parseInt(process.env.QUERY_TIMEOUT_MS || '30000', 10),

  // Retry Logic
  MAX_QUERY_RETRIES: parseInt(process.env.MAX_QUERY_RETRIES || '3', 10),
  RETRY_BASE_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),

  // Circuit Breaker
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
  CIRCUIT_BREAKER_RESET_TIMEOUT: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),

  // Connection Pool
  DEFAULT_MAX_POOL_SIZE: parseInt(process.env.DB_POOL_MAX || '20', 10),
  POOL_SHUTDOWN_TIMEOUT: parseInt(process.env.POOL_SHUTDOWN_TIMEOUT || '10000', 10),
  HEALTH_CHECK_WARNING_THRESHOLD: 0.8,
} as const;

/**
 * PostgreSQL error codes representing permanent failures that should not
 * trigger retries. These indicate data integrity violations or structural
 * problems requiring immediate attention rather than transient network issues.
 */
const NON_RETRYABLE_ERROR_CODES = new Set([
  '23505', // unique_violation: Duplicate key violation
  '23503', // foreign_key_violation: Referenced record doesn't exist
  '23514', // check_violation: Check constraint failed
  '22P02', // invalid_text_representation: Invalid input syntax
  '42P01', // undefined_table: Table doesn't exist
  '42703', // undefined_column: Column doesn't exist
]);

// ============================================================================
// CONCURRENCY PRIMITIVES
// ============================================================================

/**
 * Lightweight mutex for coordinating access to shared state across async operations.
 * 
 * This implementation uses a promise-based queue to serialize operations, ensuring
 * only one callback executes at a time. The fast path optimization avoids queueing
 * when the lock is immediately available, reducing latency in low-contention scenarios.
 */
class Mutex {
  private locked = false;
  private readonly waitQueue: Array<() => void> = [];

  async runExclusive<T>(callback: () => T | Promise<T>): Promise<T> {
    // Fast path: acquire lock immediately if available
    if (!this.locked) {
      this.locked = true;
      try {
        return await callback();
      } finally {
        this.unlock();
      }
    }

    // Contended path: queue operation for later execution
    return new Promise<T>((resolve, reject) => {
      const execute = async () => {
        try {
          const result = await callback();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.unlock();
        }
      };

      this.waitQueue.push(execute);
    });
  }

  private unlock(): void {
    const next = this.waitQueue.shift();
    if (next) {
      // Use nextTick to prevent race conditions where multiple waiters
      // could acquire the lock simultaneously during event loop ticks
      process.nextTick(() => next());
    } else {
      this.locked = false;
    }
  }
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Implements the circuit breaker pattern to prevent cascading failures.
 * 
 * The circuit breaker monitors operation failures and temporarily blocks requests
 * when the failure rate exceeds a threshold. This prevents overwhelming a struggling
 * database and gives it time to recover. The breaker transitions through three states:
 * 
 * CLOSED: Normal operation, all requests pass through
 * OPEN: Failure threshold exceeded, all requests fail immediately
 * HALF_OPEN: Testing recovery, allowing a single request to probe health
 * 
 * This pattern is essential for building resilient distributed systems that can
 * gracefully degrade rather than cascading failures across components.
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number,
    private readonly resetTimeoutMs: number,
    private readonly operationTimeoutMs: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Transition from OPEN to HALF_OPEN after reset timeout expires
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN for health probe');
      } else {
        const retrySeconds = Math.ceil((this.resetTimeoutMs - timeSinceLastFailure) / 1000);
        throw new Error(`Circuit breaker is OPEN. Retry in ${retrySeconds}s`);
      }
    }

    try {
      // Execute with timeout protection to prevent hanging
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Operation exceeded ${this.operationTimeoutMs}ms timeout`)),
            this.operationTimeoutMs
          )
        ),
      ]);

      // Successful execution in HALF_OPEN indicates recovery
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn('Circuit breaker opened due to excessive failures', {
        failures: this.failures,
        threshold: this.failureThreshold,
        component: 'CircuitBreaker',
      });
    }
  }

  private reset(): void {
    const previousState = this.state;
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
    
    logger.info('Circuit breaker reset to CLOSED', {
      previousState,
      component: 'CircuitBreaker',
    });
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

// ============================================================================
// METRICS TRACKING
// ============================================================================

/**
 * Thread-safe metrics tracker maintaining query statistics in a sliding window.
 * 
 * This class uses a mutex to safely update shared state across concurrent operations.
 * The sliding window approach keeps only recent query times, providing accurate
 * performance metrics without unbounded memory growth. This is critical for
 * long-running applications where tracking all historical queries would eventually
 * exhaust memory.
 */
class PoolMetricsTracker {
  private metrics = {
    queries: 0,
    connections: 0,
    idleConnections: 0,
    queryTimes: [] as number[],
  };

  private readonly maxQueryTimes = CONFIG.MAX_QUERY_TIMES_STORED;
  private readonly mutex = new Mutex();

  async trackQuery(duration: number): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.metrics.queries++;
      this.metrics.queryTimes.push(duration);

      // Maintain bounded sliding window by discarding oldest entries
      if (this.metrics.queryTimes.length > this.maxQueryTimes) {
        this.metrics.queryTimes.shift();
      }
    });
  }

  async incrementConnections(): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.metrics.connections++;
    });
  }

  async decrementConnections(): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.metrics.connections = Math.max(0, this.metrics.connections - 1);
    });
  }

  async updateIdleConnections(delta: number): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.metrics.idleConnections = Math.max(0, this.metrics.idleConnections + delta);
    });
  }

  async getMetrics(totalConnections: number, waitingClients: number): Promise<PoolMetrics> {
    return await this.mutex.runExclusive(() => {
      const { queryTimes } = this.metrics;
      const hasQueryTimes = queryTimes.length > 0;

      const avgQueryTime = hasQueryTimes
        ? queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
        : undefined;
      const maxQueryTime = hasQueryTimes ? Math.max(...queryTimes) : undefined;
      const minQueryTime = hasQueryTimes ? Math.min(...queryTimes) : undefined;

      return {
        queries: this.metrics.queries,
        connections: this.metrics.connections,
        idleConnections: this.metrics.idleConnections,
        totalConnections,
        waitingClients,
        avgQueryTime,
        maxQueryTime,
        minQueryTime,
      };
    });
  }

  async reset(): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.metrics = {
        queries: 0,
        connections: 0,
        idleConnections: 0,
        queryTimes: [],
      };
    });
  }
}

// ============================================================================
// POOL CONFIGURATION
// ============================================================================

/**
 * Creates optimized PostgreSQL connection pool configuration.
 * 
 * This function generates pool configurations specifically tuned for Neon's
 * serverless PostgreSQL architecture. Neon uses connection pooling at the
 * infrastructure level, so client-side pools should be conservative with
 * connection counts. The configuration includes proper SSL handling for
 * production environments and enables TCP keep-alive to maintain stable
 * connections through load balancers and proxies.
 * 
 * @param is_readOnly - Whether this pool connects to a read replica
 * @returns Optimized pool configuration for Neon PostgreSQL
 */
export const createPoolConfig = (is_readOnly = false): pg.PoolConfig => {
  const connectionString =
    is_readOnly && CONFIG.IS_PRODUCTION && CONFIG.READ_REPLICA_URL
      ? CONFIG.READ_REPLICA_URL
      : CONFIG.WRITE_MASTER_URL;

  const appName = `${CONFIG.APP_NAME}_${is_readOnly ? 'read' : 'write'}`;

  return {
    connectionString: connectionString || process.env.DATABASE_URL,
    application_name: appName,
    max: CONFIG.DEFAULT_MAX_POOL_SIZE,

    // SSL configuration for secure production connections
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

    // Neon-optimized connection management
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    min: 0, // Serverless-friendly: don't maintain minimum connections

    // Keep-alive for connection stability through proxies
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
};

/**
 * Initializes a PostgreSQL connection pool with comprehensive monitoring and resilience.
 * 
 * This setup function creates an enhanced pool with automatic metric tracking, error
 * handling, and circuit breaker protection. Event listeners capture the complete
 * lifecycle of connections and queries, providing visibility into pool health and
 * performance. The circuit breaker prevents cascading failures by temporarily blocking
 * operations when the database becomes unresponsive.
 * 
 * @param is_readOnly - Whether this pool targets read replicas
 * @param name - Human-readable pool identifier for logging
 * @returns Enhanced pool with monitoring capabilities
 */
const setupPool = (is_readOnly = false, name = is_readOnly ? 'read' : 'write'): EnhancedPool => {
  const newPool = new Pool(createPoolConfig(is_readOnly)) as EnhancedPool;
  const metricsTracker = new PoolMetricsTracker();

  const circuitBreaker = new CircuitBreaker(
    CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT,
    CONFIG.QUERY_TIMEOUT_MS
  );

  // Handle pool-level errors with contextual logging
  newPool.on('error', (err: Error) => {
    const pgError = err as unknown;
    logger.error/* TODO: Add type guard */ (`Pool error in ${name}`, {
      error: err.message,
      detail: pgError.detail,
      code: pgError.code,
      poolSize: (newPool as unknown).totalCount || 0,
      waiting: /* TODO: Add type guard */ (newPool as unknown).waitingCount || 0,
      circuitBreakerState: circuitBreaker.getState(),
      component: 'DatabasePool',
    });
  });

  // Track connection lifecycle for accurate metrics
  newPool.on('connect', (client: pg.PoolClient) => {
    metricsTracker.incrementConnections().catch((err) => {
      logger.error(`Metrics update failed in ${name} pool`, { error: err });
    });

    // Attach per-client error handler to prevent unhandled rejections
    client.on('error', (clientErr: Error) => {
      logger.error(`Client error in ${name} pool`, {
        error: clientErr.message,
        poolName: name,
        component: 'DatabaseClient',
      });
    });
  });

  newPool.on('acquire', () => {
    metricsTracker.updateIdleConnections(-1).catch((err) => {
      logger.error(`Idle metrics update failed in ${name} pool`, { error: err });
    });
  });

  newPool.on('remove', () => {
    metricsTracker.decrementConnections().catch((err) => {
      logger.error(`Connection metrics update failed in ${name} pool`, { error: err });
    });
  });

  newPool.on('release', () => {
    metricsTracker.updateIdleConnections(1).catch((err) => {
      logger.error(`Idle metrics update failed in ${name} pool`, { error: err });
    });
  });

  // Attach enhanced methods to pool instance
  newPool.getMetrics = () =>
    metricsTracker.getMetrics/* TODO: Add type guard */ ((newPool as unknown).totalCount || 0, /* TODO: Add type guard */ (newPool as unknown).waitingCount || 0);
  newPool.resetMetrics = () => metricsTracker.reset();
  newPool.trackQuery = (queryDuration: number) => metricsTracker.trackQuery(queryDuration);
  newPool.circuitBreaker = circuitBreaker;

  return newPool;
};

// ============================================================================
// POOL INSTANCES
// ============================================================================

// Initialize specialized pools for different access patterns
const rawGeneralPool = setupPool(false, 'general');
export const rawReadPool = setupPool(true, 'read');
export const rawWritePool = setupPool(false, 'write');

// Maintain backward compatibility with existing code
export const pool = rawGeneralPool;

// Create type-safe Drizzle ORM instances for each pool
export const db = drizzle<FullDatabaseSchema>(rawGeneralPool as unknown, { 
  schema: validateSchemaType(schema) 
});
export const readDb = drizzle<FullDatabaseSchema>(rawReadPool as unknown, { 
  schema: validateSchemaType(schema) 
});
export const writeDb = drizzle<FullDatabaseSchema>(rawWritePool as unknown, { 
  schema: validateSchemaType(schema) 
});

// ============================================================================
// QUERY EXECUTION
// ============================================================================

/**
 * Executes operations with exponential backoff and intelligent retry logic.
 * 
 * This function automatically retries transient failures while avoiding retries
 * for permanent errors like constraint violations. The exponential backoff with
 * jitter prevents thundering herd problems where many clients retry simultaneously,
 * which would overwhelm a recovering database. Jitter randomizes retry timing to
 * spread load more evenly.
 * 
 * @param operation - Async operation to execute with retries
 * @param maxRetries - Maximum retry attempts
 * @param baseDelay - Base delay in milliseconds for backoff calculation
 * @returns Operation result
 * @throws Last encountered error after exhausting retries
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_QUERY_RETRIES,
  baseDelay: number = CONFIG.RETRY_BASE_DELAY_MS
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break;
      }

      // Skip retry for permanent errors like constraint violations
      const pgError = error as unknown;
      if (pgError.code && NON_RETRYABLE_ERROR_CODES.has(pgError.code)) {
        throw error;
      }

      // Calculate exponential backoff: baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      
      // Add random jitter (0-10% of delay) to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;

      logger.warn(`Query retry scheduled`, {
        attempt: attempt + 1,
        maxRetries,
        delayMs: Math.round(totalDelay),
        error: (error as Error).message,
        component: 'QueryRetry',
      });

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError!;
}

/**
 * Executes SQL queries with comprehensive resilience and monitoring.
 * 
 * This function provides enterprise-grade query execution with circuit breaker
 * protection, automatic retries for transient failures, detailed timing metrics,
 * and slow query detection. The circuit breaker prevents cascading failures by
 * blocking requests when the database becomes unresponsive. Metrics are tracked
 * asynchronously to avoid blocking the critical path.
 * 
 * @param options - Query configuration including SQL text, parameters, and context
 * @returns Query result set
 * @throws Database errors after retries exhausted or for non-retryable errors
 * 
 * @example
 * const users = await executeQuery({
 *   text: 'SELECT * FROM users WHERE status = $1',
 *   params: ['active'],
 *   pool: rawReadPool,
 *   context: 'fetch_active_users'
 * });
 */
export const executeQuery = async <T extends pg.QueryResultRow = any>(
  options: QueryExecutionOptions
): Promise<pg.QueryResult<T>> => {
  const { text, params, pool = rawGeneralPool, context } = options;
  const start = Date.now();

  if (context) {
    logger.debug(`Executing query: ${context}`, {
      query: text.substring(0, 100),
      poolType: pool === rawReadPool ? 'read' : pool === rawWritePool ? 'write' : 'general',
      component: 'QueryExecution',
    });
  }

  try {
    // Execute through circuit breaker with automatic retry
    const result = await pool.circuitBreaker.execute(async () => {
      return await retryWithBackoff(async () => {
        // Handle different parameter formats
        if (params === undefined) {
          return await pool.query<T>(text);
        } else if (Array.isArray(params)) {
          return await pool.query<T>(text, params);
        } else {
          // Convert object parameters to positional format
          return await pool.query<T>({ text, values: Object.values(params) });
        }
      });
    });

    const duration = Date.now() - start;

    // Track metrics asynchronously to avoid blocking response
    pool.trackQuery(duration).catch((err) => {
      logger.error('Query metrics tracking failed', { error: err });
    });

    // Alert on slow queries for optimization opportunities
    if (duration > CONFIG.SLOW_QUERY_THRESHOLD) {
      logger.warn(`Slow query detected`, {
        query: text.substring(0, 200),
        durationMs: duration,
        rowCount: result.rowCount,
        context,
        component: 'SlowQueryDetection',
      });
    }

    return result;
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const pgError = error as unknown;

    logger.error('Query execution failed', {
      error: errorMessage,
      code: pgError.code,
      detail: pgError.detail,
      query: text.substring(0, 100),
      durationMs: duration,
      context,
      circuitBreakerState: pool.circuitBreaker.getState(),
      component: 'QueryExecution',
    });

    throw error;
  }
};

// ============================================================================
// HEALTH MONITORING
// ============================================================================

/**
 * Performs comprehensive health assessment on a database pool.
 * 
 * This function evaluates multiple dimensions of pool health including connection
 * availability, utilization percentage, client wait queue depth, and circuit
 * breaker state. A pool is considered healthy when it has active connections,
 * isn't overwhelmed with waiting clients, and the circuit breaker remains closed.
 * The utilization percentage helps identify capacity planning needs before pools
 * become saturated.
 * 
 * @param pool - Pool to assess
 * @param poolName - Human-readable identifier for logging
 * @returns Detailed health status with capacity metrics
 */
export const checkPoolHealth = async (
  pool: EnhancedPool,
  poolName: string
): Promise<PoolHealthStatus> => {
  try {
    const maxConnections = /* TODO: Add type guard */ (pool as unknown).options?.max || CONFIG.DEFAULT_MAX_POOL_SIZE;
    const totalConnections = /* TODO: Add type guard */ (pool as unknown).totalCount || 0;
    const waitingClients = /* TODO: Add type guard */ (pool as unknown).waitingCount || 0;
    const utilizationPercentage = maxConnections > 0 
      ? (totalConnections / maxConnections) * 100 
      : 0;

    // Pool is healthy when it has connections, isn't saturated, and circuit is closed
    const isHealthy =
      totalConnections > 0 &&
      waitingClients < maxConnections * CONFIG.HEALTH_CHECK_WARNING_THRESHOLD &&
      pool.circuitBreaker.getState() !== 'OPEN';

    return {
      isHealthy,
      totalConnections,
      idleConnections: pool.idleCount || 0,
      waitingClients,
      circuitBreakerState: pool.circuitBreaker.getState(),
      circuitBreakerFailures: pool.circuitBreaker.getFailureCount(),
      utilizationPercentage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Health check failed for ${poolName}`, { 
      error: errorMessage,
      component: 'PoolHealthCheck',
    });

    return {
      isHealthy: false,
      totalConnections: pool.totalCount || 0,
      idleConnections: pool.idleCount || 0,
      waitingClients: pool.waitingCount || 0,
      circuitBreakerState: pool.circuitBreaker.getState(),
      circuitBreakerFailures: pool.circuitBreaker.getFailureCount(),
      utilizationPercentage: 0,
      lastError: errorMessage,
    };
  }
};

/**
 * Monitors all database pools and reports their collective health status.
 * 
 * This function checks each pool concurrently and identifies any unhealthy pools
 * for immediate attention. Regular monitoring enables proactive capacity planning
 * and early detection of database issues before they impact users. The aggregated
 * health status provides a comprehensive view of database infrastructure health.
 * 
 * @returns Health status map for all pools
 */
export const monitorPoolHealth = async (): Promise<Record<string, PoolHealthStatus>> => {
  const pools = { general: rawGeneralPool, read: rawReadPool, write: rawWritePool };
  const healthStatuses: Record<string, PoolHealthStatus> = {};

  for (const [name, pool] of Object.entries(pools)) {
    healthStatuses[name] = await checkPoolHealth(pool, name);
  }

  const unhealthyPools = Object.entries(healthStatuses)
    .filter(([_, status]) => !status.isHealthy)
    .map(([name]) => name);

  if (unhealthyPools.length > 0) {
    logger.warn('Unhealthy pools detected', {
      unhealthyPools,
      healthStatuses,
      component: 'PoolHealthMonitor',
    });
  }

  return healthStatuses;
};

/**
 * Returns all configured pools for management and monitoring access.
 * 
 * This function provides access to both raw pg.Pool instances and Drizzle ORM
 * interfaces, enabling advanced operations like custom query execution and
 * programmatic pool management. Use this when you need direct pool access for
 * administration, testing, or specialized operations.
 * 
 * @returns Collection of all pools with their interfaces
 */
export const getPools = (): PoolCollection => ({
  general: { raw: rawGeneralPool, drizzle: db },
  read: { raw: rawReadPool, drizzle: readDb },
  write: { raw: rawWritePool, drizzle: writeDb },
});

/**
 * Gracefully terminates all database connections during application shutdown.
 * 
 * This function ensures clean resource cleanup by closing all pools concurrently
 * with timeout protection. The final health check before shutdown provides valuable
 * diagnostic information about the state of pools at termination time. Proper
 * shutdown is essential in containerized environments to prevent connection leaks
 * and enable zero-downtime deployments through graceful termination.
 * 
 * @throws Error if pool closure fails or times out
 * 
 * @example
 * process.on('SIGTERM', async () => {
 *   logger.info('Shutting down gracefully');
 *   await closePools();
 *   process.exit(0);
 * });
 */
export const closePools = async (): Promise<void> => {
  logger.info('Initiating graceful pool shutdown', {
    component: 'PoolShutdown',
  });

  const pools = [
    { pool: rawGeneralPool, name: 'general' },
    { pool: rawReadPool, name: 'read' },
    { pool: rawWritePool, name: 'write' },
  ];

  try {
    // Capture final pool state for diagnostics
    await monitorPoolHealth();

    // Close all pools concurrently with timeout protection
    await Promise.all(
      pools.map(async ({ pool, name }) => {
        if (pool && typeof pool.end === 'function') {
          const closePromise = pool.end();
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Pool ${name} failed to close within timeout`)),
              CONFIG.POOL_SHUTDOWN_TIMEOUT
            );
          });

          await Promise.race([closePromise, timeoutPromise]);
          logger.info(`Pool closed: ${name}`, { component: 'PoolShutdown' });
        }
      })
    );

    logger.info('All pools closed successfully', {
      component: 'PoolShutdown',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Pool shutdown failed', { 
      error: errorMessage,
      component: 'PoolShutdown',
    });
    throw error;
  }
};


