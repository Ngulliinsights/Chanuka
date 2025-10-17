import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../schema.ts';
import { logger } from '../core/src/logging';

const { Pool } = pg;

/**
 * Type-safe database schema definition ensuring compile-time checking
 * of all database operations and preventing runtime errors.
 */
export type FullDatabaseSchema = {
  user: typeof schema.user;
  userProfile: typeof schema.userProfile;
  session: typeof schema.session;
  refreshToken: typeof schema.refreshToken;
  passwordReset: typeof schema.passwordReset;
  userSocialProfile: typeof schema.userSocialProfile;
  userInterest: typeof schema.userInterest;
  userProgress: typeof schema.userProgress;
  sponsor: typeof schema.sponsor;
  bill: typeof schema.bill;
  billTag: typeof schema.billTag;
  billSponsorship: typeof schema.billSponsorship;
  billComment: typeof schema.billComment;
  commentVote: typeof schema.commentVote;
  billEngagement: typeof schema.billEngagement;
  socialShare: typeof schema.socialShare;
  analysis: typeof schema.analysis;
  contentAnalysis: typeof schema.contentAnalysis;
  billSectionConflict: typeof schema.billSectionConflict;
  verification: typeof schema.verification;
  stakeholder: typeof schema.stakeholder;
  sponsorAffiliation: typeof schema.sponsorAffiliation;
  sponsorTransparency: typeof schema.sponsorTransparency;
  moderationFlag: typeof schema.moderationFlag;
  moderationAction: typeof schema.moderationAction;
  moderationQueue: typeof schema.moderationQueue;
  contentFlag: typeof schema.contentFlag;
  securityAuditLog: typeof schema.securityAuditLog;
  complianceCheck: typeof schema.complianceCheck;
  threatIntelligence: typeof schema.threatIntelligence;
  securityIncident: typeof schema.securityIncident;
  securityAlert: typeof schema.securityAlert;
  attackPattern: typeof schema.attackPattern;
  regulation: typeof schema.regulation;
  regulatoryChange: typeof schema.regulatoryChange;
  regulatoryImpact: typeof schema.regulatoryImpact;
  syncJob: typeof schema.syncJob;
  syncError: typeof schema.syncError;
  conflict: typeof schema.conflict;
  conflictSource: typeof schema.conflictSource;
  notification: typeof schema.notification;
  analyticsEvent: typeof schema.analyticsEvent;
  analyticsDailySummary: typeof schema.analyticsDailySummary;
  userActivitySummary: typeof schema.userActivitySummary;
  billAnalyticsSummary: typeof schema.billAnalyticsSummary;
  systemHealthMetric: typeof schema.systemHealthMetric;
  department: typeof schema.department;
  evaluation: typeof schema.evaluation;
} & typeof schema;

type ActualSchemaType = typeof schema;

/**
 * Validates schema type compatibility at compile time.
 * This ensures type safety throughout the application.
 */
function validateSchemaType<T extends ActualSchemaType>(schemaToValidate: T): T {
  return schemaToValidate;
}

/**
 * Configuration constants with environment variable handling.
 * Centralizes all tunable parameters for easy adjustment.
 */
const CONFIG = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  READ_REPLICA_URL: process.env.READ_REPLICA_URL,
  WRITE_MASTER_URL: process.env.DATABASE_URL,
  APP_NAME: 'chanuka',
  SLOW_QUERY_THRESHOLD: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10),
  MAX_QUERY_TIMES_STORED: parseInt(process.env.MAX_QUERY_TIMES_STORED || '100', 10),
  MAX_QUERY_RETRIES: parseInt(process.env.MAX_QUERY_RETRIES || '3', 10),
  RETRY_BASE_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
  CIRCUIT_BREAKER_RESET_TIMEOUT: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
  QUERY_TIMEOUT_MS: parseInt(process.env.QUERY_TIMEOUT_MS || '30000', 10),
  DEFAULT_MAX_POOL_SIZE: parseInt(process.env.DB_POOL_MAX || '20', 10),
  POOL_SHUTDOWN_TIMEOUT: parseInt(process.env.POOL_SHUTDOWN_TIMEOUT || '10000', 10),
  HEALTH_CHECK_WARNING_THRESHOLD: 0.8,
} as const;

/**
 * PostgreSQL error codes that should not be retried because they represent
 * data integrity violations or permanent failures rather than transient issues.
 */
const NON_RETRYABLE_ERROR_CODES = new Set([
  '23505', // unique_violation
  '23503', // foreign_key_violation
  '23514', // check_violation
  '22P02', // invalid_text_representation
  '42P01', // undefined_table
  '42703', // undefined_column
]);

/**
 * Lightweight mutex implementation for synchronizing access to shared state.
 * Uses a promise-based queue to ensure only one operation executes at a time.
 */
class Mutex {
  private locked = false;
  private readonly waitQueue: Array<() => void> = [];

  async runExclusive<T>(callback: () => T | Promise<T>): Promise<T> {
    // Fast path when lock is available immediately
    if (!this.locked) {
      this.locked = true;
      try {
        return await callback();
      } finally {
        this.unlock();
      }
    }

    // Queue the operation when lock is contended
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
      // could acquire the lock simultaneously
      process.nextTick(() => next());
    } else {
      this.locked = false;
    }
  }
}

/**
 * Circuit breaker pattern implementation that prevents cascading failures
 * by temporarily blocking operations when the error rate exceeds a threshold.
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
    // Transition from OPEN to HALF_OPEN after the reset timeout expires
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Retry in ${Math.ceil((this.resetTimeoutMs - timeSinceLastFailure) / 1000)}s`
        );
      }
    }

    try {
      // Apply timeout to prevent indefinite hanging
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), this.operationTimeoutMs)
        ),
      ]);

      // Success in HALF_OPEN state indicates recovery
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
      logger.warn('Circuit breaker opened', {
        failures: this.failures,
        threshold: this.failureThreshold,
      });
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
    logger.info('Circuit breaker reset to CLOSED state');
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Comprehensive metrics for monitoring pool performance and health.
 */
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

/**
 * Thread-safe metrics tracker that maintains query statistics
 * in a sliding window for accurate performance monitoring.
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

      // Maintain a bounded sliding window of recent query times
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

      return {
        queries: this.metrics.queries,
        connections: this.metrics.connections,
        idleConnections: this.metrics.idleConnections,
        totalConnections,
        waitingClients,
        avgQueryTime: hasQueryTimes
          ? queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
          : undefined,
        maxQueryTime: hasQueryTimes ? Math.max(...queryTimes) : undefined,
        minQueryTime: hasQueryTimes ? Math.min(...queryTimes) : undefined,
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

/**
 * Enhanced pool interface with additional monitoring and resilience capabilities.
 */
export interface EnhancedPool extends pg.Pool {
  getMetrics: () => Promise<PoolMetrics>;
  resetMetrics: () => Promise<void>;
  trackQuery: (queryDuration: number) => Promise<void>;
  circuitBreaker: CircuitBreaker;
}

/**
 * Creates optimized PostgreSQL connection pool configuration.
 * Intelligently routes to read replicas in production when appropriate.
 */
export const createPoolConfig = (isReadOnly = false): pg.PoolConfig => {
  const connectionString =
    isReadOnly && CONFIG.IS_PRODUCTION && CONFIG.READ_REPLICA_URL
      ? CONFIG.READ_REPLICA_URL
      : CONFIG.WRITE_MASTER_URL;

  const appName = `${CONFIG.APP_NAME}_${isReadOnly ? 'read' : 'write'}`;

  return {
    connectionString: connectionString || process.env.DATABASE_URL,
    application_name: appName,
    max: CONFIG.DEFAULT_MAX_POOL_SIZE,
  };
};

/**
 * Sets up a PostgreSQL connection pool with comprehensive monitoring,
 * error handling, and automatic metric tracking.
 */
const setupPool = (isReadOnly = false, name = isReadOnly ? 'read' : 'write'): EnhancedPool => {
  const newPool = new Pool(createPoolConfig(isReadOnly)) as EnhancedPool;
  const metricsTracker = new PoolMetricsTracker();

  const circuitBreaker = new CircuitBreaker(
    CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT,
    CONFIG.QUERY_TIMEOUT_MS
  );

  // Handle pool-level errors with detailed context
  newPool.on('error', (err: Error) => {
    const pgError = err as any;
    logger.error(`Postgres ${name} pool error`, {
      error: err.message,
      detail: pgError.detail,
      code: pgError.code,
      poolSize: newPool.totalCount,
      waiting: newPool.waitingCount,
      circuitBreakerState: circuitBreaker.getState(),
    });
  });

  // Track connection lifecycle events
  newPool.on('connect', (client: pg.PoolClient) => {
    metricsTracker.incrementConnections().catch((err) => {
      logger.error(`Error updating connection metrics in ${name} pool`, err);
    });

    // Attach error handler to prevent unhandled rejections
    client.on('error', (clientErr: Error) => {
      logger.error(`Client connection error in ${name} pool`, {
        error: clientErr.message,
        poolName: name,
      });
    });
  });

  newPool.on('acquire', () => {
    metricsTracker.updateIdleConnections(-1).catch((err) => {
      logger.error(`Error updating idle metrics in ${name} pool`, err);
    });
  });

  newPool.on('remove', () => {
    metricsTracker.decrementConnections().catch((err) => {
      logger.error(`Error updating connection metrics in ${name} pool`, err);
    });
  });

  newPool.on('release', () => {
    metricsTracker.updateIdleConnections(1).catch((err) => {
      logger.error(`Error updating idle metrics in ${name} pool`, err);
    });
  });

  // Attach enhanced methods to pool instance
  newPool.getMetrics = () =>
    metricsTracker.getMetrics(newPool.totalCount || 0, newPool.waitingCount || 0);
  newPool.resetMetrics = () => metricsTracker.reset();
  newPool.trackQuery = (queryDuration: number) => metricsTracker.trackQuery(queryDuration);
  newPool.circuitBreaker = circuitBreaker;

  return newPool;
};

// Initialize specialized connection pools for different access patterns
const rawGeneralPool = setupPool(false, 'general');
export const rawReadPool = setupPool(true, 'read');
export const rawWritePool = setupPool(false, 'write');

// Maintain backward compatibility
export const pool = rawGeneralPool;

// Create type-safe Drizzle ORM instances
export const db = drizzle(rawGeneralPool, { schema: validateSchemaType(schema) });
export const readDb = drizzle(rawReadPool, { schema: validateSchemaType(schema) });
export const writeDb = drizzle(rawWritePool, { schema: validateSchemaType(schema) });

/**
 * Parameters for executing queries with optional context and pool selection.
 */
interface QueryExecutionOptions {
  text: string;
  params?: any[] | Record<string, any>;
  pool?: EnhancedPool;
  context?: string;
}

/**
 * Executes operations with exponential backoff retry logic.
 * Automatically skips retry for non-transient errors like constraint violations.
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

      // Don't retry permanent errors
      const pgError = error as any;
      if (pgError.code && NON_RETRYABLE_ERROR_CODES.has(pgError.code)) {
        throw error;
      }

      // Calculate exponential backoff with jitter to avoid thundering herd
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;

      logger.warn(`Query attempt ${attempt + 1} failed, retrying in ${Math.round(totalDelay)}ms`, {
        error: (error as Error).message,
        attempt: attempt + 1,
        maxRetries,
      });

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError!;
}

/**
 * Executes SQL queries with comprehensive error handling, timing, and resilience features.
 * Provides circuit breaker protection and automatic retries for transient failures.
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
    });
  }

  try {
    // Execute through circuit breaker with retry logic
    const result = await pool.circuitBreaker.execute(async () => {
      return await retryWithBackoff(async () => {
        if (params === undefined) {
          return await pool.query<T>(text);
        } else if (Array.isArray(params)) {
          return await pool.query<T>(text, params);
        } else {
          // Convert object params to positional format
          return await pool.query<T>({ text, values: Object.values(params) });
        }
      });
    });

    const duration = Date.now() - start;

    // Track metrics asynchronously to avoid blocking
    pool.trackQuery(duration).catch((err) => {
      logger.error('Error tracking query metrics', err);
    });

    // Log slow queries for optimization
    if (duration > CONFIG.SLOW_QUERY_THRESHOLD) {
      logger.warn(`Slow query detected (${duration}ms)`, {
        query: text.substring(0, 200),
        durationMs: duration,
        rowCount: result.rowCount,
        context,
      });
    }

    return result;
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const pgError = error as any;

    logger.error('Query execution error', {
      error: errorMessage,
      code: pgError.code,
      detail: pgError.detail,
      query: text.substring(0, 100),
      duration,
      context,
      circuitBreakerState: pool.circuitBreaker.getState(),
    });

    throw error;
  }
};

/**
 * Health status information for a database pool.
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
 * Performs comprehensive health check on a database pool.
 * Evaluates connection availability, utilization, and circuit breaker state.
 */
export const checkPoolHealth = async (
  pool: EnhancedPool,
  poolName: string
): Promise<PoolHealthStatus> => {
  try {
    const maxConnections = pool.options.max || CONFIG.DEFAULT_MAX_POOL_SIZE;
    const totalConnections = pool.totalCount || 0;
    const waitingClients = pool.waitingCount || 0;
    const utilizationPercentage = maxConnections > 0 ? (totalConnections / maxConnections) * 100 : 0;

    // Pool is healthy if connections exist, not overwhelmed, and circuit is closed
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
    logger.error(`Health check failed for ${poolName} pool`, { error: errorMessage });

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
 * Monitors all database pools and returns their health status.
 * Logs warnings for any unhealthy pools detected.
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
    logger.warn('Unhealthy database pools detected', {
      unhealthyPools,
      healthStatuses,
    });
  }

  return healthStatuses;
};

/**
 * Collection of all database pools with both raw and Drizzle interfaces.
 */
export interface PoolCollection {
  general: { raw: EnhancedPool; drizzle: typeof db };
  read: { raw: EnhancedPool; drizzle: typeof readDb };
  write: { raw: EnhancedPool; drizzle: typeof writeDb };
}

/**
 * Returns all configured database pools for management and monitoring.
 */
export const getPools = (): PoolCollection => ({
  general: { raw: rawGeneralPool, drizzle: db },
  read: { raw: rawReadPool, drizzle: readDb },
  write: { raw: rawWritePool, drizzle: writeDb },
});

/**
 * Gracefully closes all database connection pools with timeout protection.
 * Should be called during application shutdown to ensure clean resource cleanup.
 */
export const closePools = async (): Promise<void> => {
  logger.info('Initiating graceful shutdown of all database connection pools');

  const pools = [
    { pool: rawGeneralPool, name: 'general' },
    { pool: rawReadPool, name: 'read' },
    { pool: rawWritePool, name: 'write' },
  ];

  try {
    // Perform final health check before shutdown
    await monitorPoolHealth();

    // Close all pools concurrently with timeout protection
    await Promise.all(
      pools.map(async ({ pool, name }) => {
        if (pool && typeof pool.end === 'function') {
          const closePromise = pool.end();
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Pool ${name} closure timeout`)),
              CONFIG.POOL_SHUTDOWN_TIMEOUT
            );
          });

          await Promise.race([closePromise, timeoutPromise]);
          logger.info(`${name} pool closed successfully`);
        }
      })
    );

    logger.info('All database connection pools closed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error during pool shutdown', { error: errorMessage });
    throw error;
  }
};