import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type * as pg from 'pg';

import { logger } from '../observability/core/logger';
import { databaseLogger } from '../observability/database/database-logger';
import * as schema from '../schema';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Subset of PostgreSQL error fields surfaced by the `pg` driver.
 * Typed narrowly to avoid `unknown` property access errors.
 */
interface PgError {
  code?: string;
  detail?: string;
  message?: string;
}

/**
 * Internal pool instance fields exposed by `node-postgres` at runtime
 * but absent from the public `pg.Pool` typings.
 */
interface PgPoolInternals {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  options?: { max?: number };
}

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
// HELPERS
// ============================================================================

/** Casts a pool to its internal runtime shape for totalCount / waitingCount access. */
function poolInternals(p: pg.Pool): PgPoolInternals {
  return p as unknown as PgPoolInternals;
}

/** Narrows an unknown caught value to a PgError for safe field access. */
function asPgError(error: unknown): PgError {
  return (error ?? {}) as PgError;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Centralized configuration with environment variable support.
 * All tunable parameters are defined here for easy adjustment across environments.
 */
const CONFIG = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  READ_REPLICA_URL: process.env.READ_REPLICA_URL,
  WRITE_MASTER_URL: process.env.DATABASE_URL,
  APP_NAME: 'chanuka',

  SLOW_QUERY_THRESHOLD: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10),
  MAX_QUERY_TIMES_STORED: parseInt(process.env.MAX_QUERY_TIMES_STORED || '100', 10),
  QUERY_TIMEOUT_MS: parseInt(process.env.QUERY_TIMEOUT_MS || '30000', 10),

  MAX_QUERY_RETRIES: parseInt(process.env.MAX_QUERY_RETRIES || '3', 10),
  RETRY_BASE_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),

  CIRCUIT_BREAKER_FAILURE_THRESHOLD: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
  CIRCUIT_BREAKER_RESET_TIMEOUT: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),

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
  '23505', // unique_violation
  '23503', // foreign_key_violation
  '23514', // check_violation
  '22P02', // invalid_text_representation
  '42P01', // undefined_table
  '42703', // undefined_column
]);

// ============================================================================
// CONCURRENCY PRIMITIVES
// ============================================================================

/**
 * Lightweight mutex for coordinating access to shared state across async operations.
 *
 * Uses a promise-based queue to serialize operations, ensuring only one callback
 * executes at a time. The fast-path optimization avoids queueing when the lock
 * is immediately available, reducing latency in low-contention scenarios.
 */
class Mutex {
  private locked = false;
  private readonly waitQueue: Array<() => void> = [];

  async runExclusive<T>(callback: () => T | Promise<T>): Promise<T> {
    if (!this.locked) {
      this.locked = true;
      try {
        return await callback();
      } finally {
        this.unlock();
      }
    }

    return new Promise<T>((resolve, reject) => {
      const execute = async () => {
        try {
          resolve(await callback());
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
      // nextTick prevents simultaneous lock acquisition during the same event-loop tick
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
 * States:
 *   CLOSED   – Normal operation; all requests pass through.
 *   OPEN     – Failure threshold exceeded; requests fail immediately.
 *   HALF_OPEN – Recovery probe; a single request tests database health.
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number,
    private readonly resetTimeoutMs: number,
    private readonly operationTimeoutMs: number,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN for health probe');
      } else {
        const retrySeconds = Math.ceil((this.resetTimeoutMs - elapsed) / 1000);
        throw new Error(`Circuit breaker is OPEN. Retry in ${retrySeconds}s`);
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Operation exceeded ${this.operationTimeoutMs}ms timeout`)),
            this.operationTimeoutMs,
          ),
        ),
      ]);

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
      logger.warn(
        { failures: this.failures, threshold: this.failureThreshold, component: 'CircuitBreaker' },
        'Circuit breaker opened due to excessive failures',
      );
    }
  }

  private reset(): void {
    const previousState = this.state;
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
    logger.info(
      { previousState, component: 'CircuitBreaker' },
      'Circuit breaker reset to CLOSED',
    );
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
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
 * Thread-safe metrics tracker maintaining query statistics in a bounded sliding window.
 *
 * Uses a mutex to prevent data races across concurrent async operations and caps
 * the query-time history to avoid unbounded memory growth in long-running processes.
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
    return this.mutex.runExclusive(() => {
      const { queryTimes } = this.metrics;
      const hasData = queryTimes.length > 0;
      const sum = hasData ? queryTimes.reduce((acc, t) => acc + t, 0) : 0;

      return {
        queries: this.metrics.queries,
        connections: this.metrics.connections,
        idleConnections: this.metrics.idleConnections,
        totalConnections,
        waitingClients,
        avgQueryTime: hasData ? sum / queryTimes.length : undefined,
        maxQueryTime: hasData ? Math.max(...queryTimes) : undefined,
        minQueryTime: hasData ? Math.min(...queryTimes) : undefined,
      };
    });
  }

  async reset(): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.metrics = { queries: 0, connections: 0, idleConnections: 0, queryTimes: [] };
    });
  }
}

// ============================================================================
// POOL CONFIGURATION
// ============================================================================

/**
 * Creates optimized PostgreSQL connection pool configuration.
 *
 * Tuned for Neon's serverless architecture: conservative client-side pool sizes,
 * proper SSL handling for production, and TCP keep-alive for stable connections
 * through load balancers and proxies.
 *
 * @param is_readOnly - Whether this pool connects to a read replica
 */
export const createPoolConfig = (is_readOnly = false): pg.PoolConfig => {
  const connectionString =
    is_readOnly && CONFIG.IS_PRODUCTION && CONFIG.READ_REPLICA_URL
      ? CONFIG.READ_REPLICA_URL
      : (CONFIG.WRITE_MASTER_URL ?? process.env.DATABASE_URL);

  return {
    connectionString,
    application_name: `${CONFIG.APP_NAME}_${is_readOnly ? 'read' : 'write'}`,
    max: CONFIG.DEFAULT_MAX_POOL_SIZE,
    ssl: CONFIG.IS_PRODUCTION ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    min: 0,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };
};

/**
 * Initializes a PostgreSQL connection pool with metrics tracking and circuit-breaker
 * protection. Event listeners capture the full connection lifecycle for observability.
 *
 * @param is_readOnly - Whether this pool targets read replicas
 * @param name        - Human-readable pool identifier for logging
 */
const setupPool = (is_readOnly = false, name = is_readOnly ? 'read' : 'write'): EnhancedPool => {
  const newPool = new Pool(createPoolConfig(is_readOnly)) as EnhancedPool;
  const metricsTracker = new PoolMetricsTracker();

  const circuitBreaker = new CircuitBreaker(
    CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT,
    CONFIG.QUERY_TIMEOUT_MS,
  );

  // ── Pool-level error: connection dropped from the pool entirely ──────────
  newPool.on('error', (err: Error) => {
    const pgErr = asPgError(err);
    const internals = poolInternals(newPool);
    logger.error(
      {
        error: err.message,
        detail: pgErr.detail,
        code: pgErr.code,
        poolSize: internals.totalCount,
        waiting: internals.waitingCount,
        circuitBreakerState: circuitBreaker.getState(),
        component: 'DatabasePool',
      },
      `Pool error in ${name}`,
    );
  });

  // ── New physical connection acquired from pg ─────────────────────────────
  newPool.on('connect', (client: pg.PoolClient) => {
    metricsTracker.incrementConnections().catch((err: unknown) => {
      logger.error({ error: err }, `Metrics update failed in ${name} pool`);
    });

    client.on('error', (clientErr: Error) => {
      logger.error(
        { error: clientErr.message, poolName: name, component: 'DatabaseClient' },
        `Client error in ${name} pool`,
      );
    });
  });

  // ── Connection checked out from idle pool ────────────────────────────────
  newPool.on('acquire', () => {
    metricsTracker.updateIdleConnections(-1).catch((err: unknown) => {
      logger.error({ error: err }, `Idle metrics update failed in ${name} pool`);
    });
  });

  // ── Connection returned to pool / destroyed ──────────────────────────────
  newPool.on('remove', () => {
    metricsTracker.decrementConnections().catch((err: unknown) => {
      logger.error({ error: err }, `Connection metrics update failed in ${name} pool`);
    });
  });

  newPool.on('release', () => {
    metricsTracker.updateIdleConnections(1).catch((err: unknown) => {
      logger.error({ error: err }, `Idle metrics update failed after release in ${name} pool`);
    });
  });

  // ── Attach monitoring surface to pool instance ───────────────────────────
  newPool.getMetrics = () => {
    const { totalCount, waitingCount } = poolInternals(newPool);
    return metricsTracker.getMetrics(totalCount, waitingCount);
  };
  newPool.resetMetrics = () => metricsTracker.reset();
  newPool.trackQuery = (duration: number) => metricsTracker.trackQuery(duration);
  newPool.circuitBreaker = circuitBreaker;

  return newPool;
};

// ============================================================================
// POOL INSTANCES
// ============================================================================

const rawGeneralPool = setupPool(false, 'general');
export const rawReadPool  = setupPool(true,  'read');
export const rawWritePool = setupPool(false, 'write');

/** Backward-compatible alias for code still referencing `pool` directly. */
export const pool = rawGeneralPool;

const drizzleSchema = validateSchemaType(schema);

export const db      = drizzle<FullDatabaseSchema>(rawGeneralPool, { schema: drizzleSchema });
export const readDb  = drizzle<FullDatabaseSchema>(rawReadPool,    { schema: drizzleSchema });
export const writeDb = drizzle<FullDatabaseSchema>(rawWritePool,   { schema: drizzleSchema });

// ============================================================================
// QUERY EXECUTION
// ============================================================================

/**
 * Executes an operation with exponential backoff and intelligent retry logic.
 *
 * Retries transient failures while skipping retries for permanent errors
 * (constraint violations, missing tables, etc.). Jitter randomises backoff
 * timing to prevent thundering-herd scenarios during recovery.
 *
 * @param operation  - Async operation to execute
 * @param maxRetries - Maximum retry attempts (default: CONFIG.MAX_QUERY_RETRIES)
 * @param baseDelay  - Base delay in ms for backoff calculation
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_QUERY_RETRIES,
  baseDelay: number = CONFIG.RETRY_BASE_DELAY_MS,
): Promise<T> {
  let lastError!: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) break;

      const pgErr = asPgError(error);
      if (pgErr.code && NON_RETRYABLE_ERROR_CODES.has(pgErr.code)) {
        throw error;
      }

      const delay    = baseDelay * Math.pow(2, attempt);
      const jitter   = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;

      logger.warn(
        {
          attempt: attempt + 1,
          maxRetries,
          delayMs: Math.round(totalDelay),
          error: (error as Error).message,
          component: 'QueryRetry',
        },
        'Query retry scheduled',
      );

      await new Promise<void>((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}

/**
 * Executes SQL queries with circuit-breaker protection, automatic retries,
 * timing metrics, and slow-query detection.
 *
 * @example
 * const result = await executeQuery({
 *   text:    'SELECT * FROM users WHERE status = $1',
 *   params:  ['active'],
 *   pool:    rawReadPool,
 *   context: 'fetch_active_users',
 * });
 */
export const executeQuery = async <T extends pg.QueryResultRow = pg.QueryResultRow>(
  options: QueryExecutionOptions,
): Promise<pg.QueryResult<T>> => {
  const { text, params, pool: targetPool = rawGeneralPool, context } = options;
  const start = Date.now();

  if (context) {
    logger.debug(
      {
        query:    text.substring(0, 100),
        poolType: targetPool === rawReadPool  ? 'read'
                : targetPool === rawWritePool ? 'write'
                : 'general',
        component: 'QueryExecution',
      },
      `Executing query: ${context}`,
    );
  }

  try {
    const result = await targetPool.circuitBreaker.execute(() =>
      retryWithBackoff(() => {
        if (params === undefined) {
          return targetPool.query<T>(text);
        }
        if (Array.isArray(params)) {
          return targetPool.query<T>(text, params);
        }
        return targetPool.query<T>({ text, values: Object.values(params) });
      }),
    );

    const duration = Date.now() - start;

    targetPool.trackQuery(duration).catch((err: unknown) => {
      logger.error({ error: err }, 'Query metrics tracking failed');
    });

    if (duration > CONFIG.SLOW_QUERY_THRESHOLD) {
      databaseLogger.logQueryPerformance(
        context || 'unknown',
        text.substring(0, 100),
        duration,
        {
          sql: text,
          params: Array.isArray(params) ? params : params ? Object.values(params) : undefined,
          recordCount: result.rowCount ?? undefined,
        },
      );
    }

    return result;
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const pgErr    = asPgError(error);

    logger.error(
      {
        error:               pgErr.message ?? String(error),
        code:                pgErr.code,
        detail:              pgErr.detail,
        query:               text.substring(0, 100),
        durationMs:          duration,
        context,
        circuitBreakerState: targetPool.circuitBreaker.getState(),
        component:           'QueryExecution',
      },
      'Query execution failed',
    );

    throw error;
  }
};

// ============================================================================
// HEALTH MONITORING
// ============================================================================

/**
 * Assesses the health of a single pool across multiple dimensions:
 * connection availability, utilisation, wait-queue depth, and circuit-breaker state.
 *
 * @param targetPool - Pool to assess
 * @param poolName   - Human-readable identifier for logging
 */
export const checkPoolHealth = async (
  targetPool: EnhancedPool,
  poolName: string,
): Promise<PoolHealthStatus> => {
  try {
    const internals        = poolInternals(targetPool);
    const maxConnections   = internals.options?.max ?? CONFIG.DEFAULT_MAX_POOL_SIZE;
    const { totalCount, idleCount, waitingCount } = internals;
    const utilizationPercentage = maxConnections > 0 ? (totalCount / maxConnections) * 100 : 0;

    const isHealthy =
      totalCount > 0 &&
      waitingCount < maxConnections * CONFIG.HEALTH_CHECK_WARNING_THRESHOLD &&
      targetPool.circuitBreaker.getState() !== 'OPEN';

    return {
      isHealthy,
      totalConnections:       totalCount,
      idleConnections:        idleCount,
      waitingClients:         waitingCount,
      circuitBreakerState:    targetPool.circuitBreaker.getState(),
      circuitBreakerFailures: targetPool.circuitBreaker.getFailureCount(),
      utilizationPercentage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      { error: errorMessage, component: 'PoolHealthCheck' },
      `Health check failed for ${poolName}`,
    );

    const internals = poolInternals(targetPool);
    return {
      isHealthy:              false,
      totalConnections:       internals.totalCount,
      idleConnections:        internals.idleCount,
      waitingClients:         internals.waitingCount,
      circuitBreakerState:    targetPool.circuitBreaker.getState(),
      circuitBreakerFailures: targetPool.circuitBreaker.getFailureCount(),
      utilizationPercentage:  0,
      lastError:              errorMessage,
    };
  }
};

/**
 * Checks all pools concurrently and logs any that are unhealthy.
 * Useful for periodic health-check routes or startup verification.
 */
export const monitorPoolHealth = async (): Promise<Record<string, PoolHealthStatus>> => {
  const pools: Record<string, EnhancedPool> = {
    general: rawGeneralPool,
    read:    rawReadPool,
    write:   rawWritePool,
  };

  const entries = await Promise.all(
    Object.entries(pools).map(
      async ([name, p]) => [name, await checkPoolHealth(p, name)] as const,
    ),
  );

  const healthStatuses = Object.fromEntries(entries);

  const unhealthyPools = Object.entries(healthStatuses)
    .filter(([, status]) => !status.isHealthy)
    .map(([name]) => name);

  if (unhealthyPools.length > 0) {
    logger.warn(
      { unhealthyPools, healthStatuses, component: 'PoolHealthMonitor' },
      'Unhealthy pools detected',
    );
  }

  return healthStatuses;
};

/**
 * Returns all configured pools for management and monitoring access.
 *
 * Provides both raw `pg.Pool` instances and Drizzle ORM interfaces, enabling
 * custom query execution, testing, or specialised administration operations.
 */
export const getPools = (): PoolCollection => ({
  general: { raw: rawGeneralPool, drizzle: db },
  read:    { raw: rawReadPool,    drizzle: readDb },
  write:   { raw: rawWritePool,   drizzle: writeDb },
});

/**
 * Gracefully terminates all database connections during application shutdown.
 *
 * Closes pools concurrently with timeout protection and captures a final
 * health snapshot for diagnostics. Essential for zero-downtime deployments
 * and preventing connection leaks in containerised environments.
 *
 * @example
 * process.on('SIGTERM', async () => {
 *   await closePools();
 *   process.exit(0);
 * });
 */
export const closePools = async (): Promise<void> => {
  logger.info({ component: 'PoolShutdown' }, 'Initiating graceful pool shutdown');

  const pools = [
    { pool: rawGeneralPool, name: 'general' },
    { pool: rawReadPool,    name: 'read' },
    { pool: rawWritePool,   name: 'write' },
  ] as const;

  try {
    await monitorPoolHealth();

    await Promise.all(
      pools.map(async ({ pool: p, name }) => {
        if (p && typeof p.end === 'function') {
          await Promise.race([
            p.end(),
            new Promise<void>((_, reject) =>
              setTimeout(
                () => reject(new Error(`Pool ${name} failed to close within timeout`)),
                CONFIG.POOL_SHUTDOWN_TIMEOUT,
              ),
            ),
          ]);
          logger.info({ component: 'PoolShutdown' }, `Pool closed: ${name}`);
        }
      }),
    );

    logger.info({ component: 'PoolShutdown' }, 'All pools closed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage, component: 'PoolShutdown' }, 'Pool shutdown failed');
    throw error;
  }
};