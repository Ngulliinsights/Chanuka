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
 * Validates schema type compatibility across the application.
 * Acts as a compile-time safety mechanism.
 */
function validateSchemaType<T extends ActualSchemaType>(schemaToValidate: T): T {
  return schemaToValidate;
}

/**
 * Configuration constants with environment variable handling.
 * Centralizes configuration logic with sensible defaults.
 */
const CONFIG = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  READ_REPLICA_URL: process.env.READ_REPLICA_URL,
  WRITE_MASTER_URL: process.env.DATABASE_URL,
  APP_NAME: 'chanuka',
  MAX_CONNECTION_USES: 7500,
  SLOW_QUERY_THRESHOLD: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10),
  MAX_QUERY_TIMES_STORED: parseInt(process.env.MAX_QUERY_TIMES_STORED || '100', 10),
  MAX_QUERY_RETRIES: parseInt(process.env.MAX_QUERY_RETRIES || '3', 10),
  RETRY_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
  CIRCUIT_BREAKER_RESET_TIMEOUT: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
  QUERY_TIMEOUT_MS: parseInt(process.env.QUERY_TIMEOUT_MS || '5000', 10),
  DEFAULT_MAX_POOL_SIZE: parseInt(process.env.DB_POOL_MAX || '20', 10),
  POOL_SHUTDOWN_TIMEOUT: parseInt(process.env.POOL_SHUTDOWN_TIMEOUT || '10000', 10),
} as const;

/**
 * Thread-safe mutex for synchronizing access to shared resources.
 * Prevents race conditions in concurrent environments.
 */
class Mutex {
  private locked = false;
  private readonly waitQueue: Array<() => void> = [];

  async runExclusive<T>(callback: () => T | Promise<T>): Promise<T> {
    // Fast path for uncontended lock
    if (!this.locked) {
      this.locked = true;
      try {
        return await callback();
      } finally {
        this.unlock();
      }
    }

    // Slow path for contended lock
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
      next();
    } else {
      this.locked = false;
    }
  }
}

/**
 * Circuit breaker implementation preventing cascading failures.
 * Protects the system from overwhelming a struggling database with retries.
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number,
    private readonly resetTimeoutMs: number,
    private readonly timeoutMs: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker is OPEN - operation not allowed. Retry in ${this.resetTimeoutMs - timeSinceLastFailure}ms`);
      }
    }

    try {
      // Race the operation against a timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), this.timeoutMs);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      
      // Successful execution in HALF_OPEN state resets the circuit
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
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Comprehensive pool metrics for monitoring database performance.
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
 * Thread-safe metrics tracker with comprehensive performance monitoring.
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

      // Maintain sliding window of recent query times
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

  async decrementIdleConnections(): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.metrics.idleConnections = Math.max(0, this.metrics.idleConnections - 1);
    });
  }

  async incrementIdleConnections(): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.metrics.idleConnections++;
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
      this.metrics.queries = 0;
      this.metrics.connections = 0;
      this.metrics.idleConnections = 0;
      this.metrics.queryTimes = [];
    });
  }
}

/**
 * Enhanced Pool interface with metrics and circuit breaker capabilities.
 */
export interface EnhancedPool extends pg.Pool {
  getMetrics: () => Promise<PoolMetrics>;
  resetMetrics: () => Promise<void>;
  trackQuery: (queryDuration: number) => Promise<void>;
  circuitBreaker: CircuitBreaker;
}

/**
 * Creates optimized PostgreSQL connection pool configuration.
 * Intelligently adjusts settings based on read-only vs read-write operations.
 */
export const createPoolConfig = (isReadOnly = false): pg.PoolConfig => {
  const connectionString = isReadOnly && CONFIG.IS_PRODUCTION && CONFIG.READ_REPLICA_URL
    ? CONFIG.READ_REPLICA_URL
    : CONFIG.WRITE_MASTER_URL;

  const appName = `${CONFIG.APP_NAME}_${isReadOnly ? 'read' : 'write'}`;

  return {
    connectionString: connectionString || process.env.DATABASE_URL,
  };
};

/**
 * Sets up PostgreSQL connection pool with comprehensive error handling.
 * Creates fully configured pool with event listeners for monitoring.
 */
const setupPool = (isReadOnly = false, name = isReadOnly ? 'read' : 'write'): EnhancedPool => {
  const newPool = new Pool(createPoolConfig(isReadOnly)) as EnhancedPool;
  const metricsTracker = new PoolMetricsTracker();
  
  const circuitBreaker = new CircuitBreaker(
    CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT,
    CONFIG.QUERY_TIMEOUT_MS
  );

  // Pool-level error handling with contextual information
  newPool.on('error', (err: Error) => {
    const pgError = err as any;
    logger.error(`Postgres ${name} pool error:`, {
      error: err.message,
      detail: pgError.detail,
      code: pgError.code,
      poolSize: newPool.totalCount,
      waiting: newPool.waitingCount,
      circuitBreakerState: circuitBreaker.getState(),
      timestamp: new Date().toISOString(),
    });
  });

  // Connection lifecycle monitoring
  newPool.on('connect', (client: pg.PoolClient) => {
    metricsTracker.incrementConnections().catch(err => {
      logger.error(`Error updating connection metrics in ${name} pool:`, err);
    });
    
    // Individual client error handling prevents pool corruption
    client.on('error', (clientErr: Error) => {
      logger.error(`Client connection error in ${name} pool:`, {
        error: clientErr.message,
        poolName: name,
        timestamp: new Date().toISOString(),
      });
    });

    logger.debug(`New client connected to ${name} pool`, {
      totalConnections: newPool.totalCount,
    });
  });

  newPool.on('acquire', () => {
    metricsTracker.decrementIdleConnections().catch(err => {
      logger.error(`Error updating idle connection metrics in ${name} pool:`, err);
    });
  });

  newPool.on('remove', () => {
    metricsTracker.decrementConnections().catch(err => {
      logger.error(`Error updating connection metrics in ${name} pool:`, err);
    });
    logger.debug(`Client removed from ${name} pool`, {
      totalConnections: newPool.totalCount,
    });
  });

  newPool.on('release', () => {
    metricsTracker.incrementIdleConnections().catch(err => {
      logger.error(`Error updating idle connection metrics in ${name} pool:`, err);
    });
  });

  // Attach enhanced methods to pool instance
  newPool.getMetrics = () => metricsTracker.getMetrics(newPool.totalCount || 0, newPool.waitingCount || 0);
  newPool.resetMetrics = () => metricsTracker.reset();
  newPool.trackQuery = (queryDuration: number) => metricsTracker.trackQuery(queryDuration);
  newPool.circuitBreaker = circuitBreaker;

  return newPool;
};

// Initialize specialized connection pools
const rawGeneralPool = setupPool(false, 'general');
export const rawReadPool = setupPool(true, 'read');
export const rawWritePool = setupPool(false, 'write');

// Maintain backward compatibility with original export
export const pool = rawGeneralPool;

// Create type-safe Drizzle ORM instances
export const db = drizzle(rawGeneralPool, { schema: validateSchemaType(schema) });
export const readDb = drizzle(rawReadPool, { schema: validateSchemaType(schema) });
export const writeDb = drizzle(rawWritePool, { schema: validateSchemaType(schema) });

/**
 * Query execution parameters interface for type safety.
 */
interface QueryExecutionOptions {
  text: string;
  params?: any[] | Record<string, any>;
  pool?: EnhancedPool;
  context?: string;
}

/**
 * PostgreSQL error codes that should not be retried.
 * These represent data integrity violations rather than transient failures.
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
 * Retry mechanism with exponential backoff for failed operations.
 * Automatically avoids retrying non-transient errors like constraint violations.
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_QUERY_RETRIES,
  baseDelay: number = CONFIG.RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry non-transient errors
      const pgError = error as any;
      if (pgError.code && NON_RETRYABLE_ERROR_CODES.has(pgError.code)) {
        throw error;
      }
      
      // Calculate exponential backoff with jitter to prevent thundering herd
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * delay;
      
      logger.warn(`Query attempt ${attempt + 1} failed, retrying in ${Math.round(delay + jitter)}ms`, {
        error: (error as Error).message,
        attempt: attempt + 1,
        maxRetries,
      });
      
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  throw lastError!;
}

/**
 * Enhanced query execution with comprehensive timing, error handling, and resilience.
 * Provides unified interface for executing SQL across different pools while tracking
 * performance metrics. Includes circuit breaker protection and retry logic.
 */
export const executeQuery = async <T extends pg.QueryResultRow = any>(
  options: QueryExecutionOptions
): Promise<pg.QueryResult<T>> => {
  const { text, params, pool = rawGeneralPool, context } = options;
  const start = Date.now();

  if (context) {
    logger.debug(`Executing query in context: ${context}`, {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      poolType: pool === rawReadPool ? 'read' : pool === rawWritePool ? 'write' : 'general',
      circuitBreakerState: pool.circuitBreaker.getState(),
    });
  }

  try {
    // Execute through circuit breaker with retry logic
    const result = await pool.circuitBreaker.execute(async () => {
      return await retryWithBackoff(async () => {
        // Handle different parameter formats for flexibility
        if (params === undefined) {
          return await pool.query<T>(text);
        } else if (Array.isArray(params)) {
          return await pool.query<T>(text, params);
        } else {
          // Convert object parameters to positional format
          const values = Object.values(params);
          return await pool.query<T>({ text, values });
        }
      });
    });

    const duration = Date.now() - start;
    
    // Track metrics asynchronously to avoid blocking
    pool.trackQuery(duration).catch(err => {
      logger.error('Error tracking query metrics:', err);
    });

    // Detect and log slow queries for optimization
    if (duration > CONFIG.SLOW_QUERY_THRESHOLD) {
      logger.warn(`Slow query detected (${duration}ms):`, {
        query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        durationMs: duration,
        poolType: pool === rawReadPool ? 'read' : pool === rawWritePool ? 'write' : 'general',
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
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: Array.isArray(params) ? params : params ? Object.keys(params) : undefined,
      duration,
      context,
      poolType: pool === rawReadPool ? 'read' : pool === rawWritePool ? 'write' : 'general',
      circuitBreakerState: pool.circuitBreaker.getState(),
    });

    throw error;
  }
};

/**
 * Pool health status for monitoring.
 */
export interface PoolHealthStatus {
  isHealthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  circuitBreakerState: string;
  circuitBreakerFailures: number;
  lastError?: string;
}

/**
 * Performs health check on a database pool.
 * Evaluates connection availability and circuit breaker state.
 */
export const checkPoolHealth = async (pool: EnhancedPool, poolName: string): Promise<PoolHealthStatus> => {
  try {
    const metrics = await pool.getMetrics();
    const maxConnections = pool.options.max || CONFIG.DEFAULT_MAX_POOL_SIZE;
    
    // Pool is healthy if it has connections, isn't overwhelmed, and circuit is closed
    const isHealthy = (pool.totalCount || 0) > 0 &&
                      (pool.waitingCount || 0) < maxConnections * 0.8 &&
                      pool.circuitBreaker.getState() !== 'OPEN';

    return {
      isHealthy,
      totalConnections: pool.totalCount || 0,
      idleConnections: pool.idleCount || 0,
      waitingClients: pool.waitingCount || 0,
      circuitBreakerState: pool.circuitBreaker.getState(),
      circuitBreakerFailures: pool.circuitBreaker.getFailureCount(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Health check failed for ${poolName} pool:`, { error: errorMessage });
    
    return {
      isHealthy: false,
      totalConnections: pool.totalCount || 0,
      idleConnections: pool.idleCount || 0,
      waitingClients: pool.waitingCount || 0,
      circuitBreakerState: pool.circuitBreaker.getState(),
      circuitBreakerFailures: pool.circuitBreaker.getFailureCount(),
      lastError: errorMessage,
    };
  }
};

/**
 * Monitors all pools and logs health status.
 * Provides comprehensive overview of database connection health.
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
    logger.warn('Unhealthy database pools detected:', {
      unhealthyPools,
      healthStatuses,
    });
  }

  return healthStatuses;
};

/**
 * Pool management interface providing access to all database pools.
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
 * Gracefully closes all database connection pools during application shutdown.
 * Ensures proper resource cleanup and prevents connection leaks.
 */
export const closePools = async (): Promise<void> => {
  logger.info('Initiating graceful shutdown of all database connection pools');
  
  const pools = [
    { pool: rawGeneralPool, name: 'general' },
    { pool: rawReadPool, name: 'read' },
    { pool: rawWritePool, name: 'write' },
  ];
  
  try {
    // Check pool health before shutdown
    await monitorPoolHealth();
    
    // Close all pools concurrently with timeout protection
    await Promise.all(
      pools.map(async ({ pool, name }) => {
        logger.debug(`Closing ${name} pool...`);

        // Type guard to ensure pool.end() method exists
        if (pool && typeof pool.end === 'function') {
          const closePromise = pool.end();
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(
              () => reject(new Error(`Pool ${name} closure timeout`)),
              CONFIG.POOL_SHUTDOWN_TIMEOUT
            );
          });

          await Promise.race([closePromise, timeoutPromise]);
          logger.debug(`${name} pool closed successfully`);
        } else {
          logger.warn(`Unable to close pool ${name}: end method not available`);
        }
      })
    );
    
    logger.info('All database connection pools closed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error during pool shutdown:', { error: errorMessage });
    throw error;
  }
};






