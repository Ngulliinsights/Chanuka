import type { Pool } from 'pg';

import { logger } from '@server/infrastructure/observability/core/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Routes database operations to the correct connection:
 * - 'read'    → read replica (query operations)
 * - 'write'   → primary database (mutation operations)
 * - 'general' → default connection
 */
export type DatabaseOperation = 'read' | 'write' | 'general';

export interface TransactionOptions {
  /** Total additional retry attempts after first failure (default: 0) */
  maxRetries?: number;
  /** Invoked after each failed attempt with the error and 1-based attempt number */
  onError?: (error: Error, attempt: number) => void;
  /** Abort transaction if it exceeds this duration in milliseconds */
  timeout?: number;
  /** Override the delay strategy between retries (defaults to exponential backoff) */
  retryDelay?: (attempt: number) => number;
}

/**
 * Generic database connection compatible with Drizzle ORM or raw SQL adapters.
 */
export type DatabaseConnection = {
  execute: (sql: string, params?: unknown[]) => Promise<unknown>;
  transaction: <T>(callback: (tx: DatabaseTransaction) => Promise<T>) => Promise<T>;
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  delete: (...args: any[]) => any;
};

/**
 * Type-safe interface for operations scoped to an active transaction.
 */
export interface DatabaseTransaction {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

export interface DatabaseHealthStatus {
  operational: boolean;
  analytics: boolean;
  security: boolean;
  overall: boolean;
  timestamp: string;
  latencyMs?: number;
  error?: string;
}

// ============================================================================
// CONNECTION INSTANCES
// ============================================================================

/** General-purpose connection. Use when read/write routing is not required. */
export let database: DatabaseConnection;

/** Read-optimized connection. Routes to replicas in production. */
export let readDatabase: DatabaseConnection;

/** Write-optimized connection. Always routes to the primary database. */
export let writeDatabase: DatabaseConnection;

/**
 * Workload-specific connections for multi-tenant architecture.
 * Phase One: All three share the same database instance.
 * Phase Two: Each will target a dedicated, optimized database.
 */
export let operationalDb: DatabaseConnection;
export let analyticsDb: DatabaseConnection;
export let securityDb: DatabaseConnection;

/** Raw PostgreSQL pool for cases where ORM abstraction is insufficient. */
export let pool: Pool;

// Cache for dynamically loaded modules used inside withTransaction.
// Hoisting these prevents re-importing on every retry attempt.
let _drizzle: typeof import('drizzle-orm/node-postgres')['drizzle'] | null = null;
let _schema: typeof import('../schema') | null = null;

/**
 * Initialises all database connections. Must be called during application
 * startup before any database operations are performed.
 *
 * @internal Called automatically by pool.ts.
 */
export function initializeDatabaseConnections(
  generalDb: DatabaseConnection,
  readDb: DatabaseConnection,
  writeDb: DatabaseConnection,
  rawPool: Pool,
): void {
  database = generalDb;
  readDatabase = readDb;
  writeDatabase = writeDb;

  operationalDb = generalDb;
  analyticsDb = generalDb;
  securityDb = generalDb;

  pool = rawPool;

  logger.info(
    { component: 'DatabaseConnection', timestamp: new Date().toISOString() },
    'Database connections initialised',
  );
}

// ============================================================================
// CONNECTION ROUTING
// ============================================================================

/**
 * Returns the appropriate connection for the given operation type.
 *
 * @example
 * // Route reads to replicas
 * const rows = await getDatabase('read').select().from(usersTable);
 *
 * @example
 * // Route writes to primary
 * await getDatabase('write').insert(usersTable).values({ name: 'Alice' });
 */
export function getDatabase(operation: DatabaseOperation = 'general'): DatabaseConnection {
  switch (operation) {
    case 'read':    return readDatabase;
    case 'write':   return writeDatabase;
    default:        return database;
  }
}

// ============================================================================
// TRANSACTION MANAGEMENT
// ============================================================================

/**
 * Executes a callback inside an ACID-compliant transaction with automatic
 * rollback, optional timeout, and configurable retry logic.
 *
 * Retries use exponential backoff with jitter by default. Only transient errors
 * (deadlocks, timeouts, connection failures) trigger retries; permanent errors
 * like constraint violations fail immediately.
 *
 * @param callback - Receives a Drizzle transaction instance; must return a Promise.
 * @param options  - Controls retries, timeout, and error handling.
 * @returns The resolved value returned by `callback`.
 * @throws The last error encountered after all retry attempts are exhausted.
 *
 * @example
 * // Atomic multi-step write
 * const user = await withTransaction(async (tx) => {
 *   const [newUser] = await tx.insert(usersTable).values({ name: 'Bob' }).returning();
 *   await tx.insert(profilesTable).values({ userId: newUser.id, bio: '' });
 *   return newUser;
 * });
 *
 * @example
 * // With retry and timeout
 * await withTransaction(
 *   async (tx) => {
 *     await tx.update(accountsTable)
 *       .set({ balance: sql`${accountsTable.balance} - 100` })
 *       .where(eq(accountsTable.id, accountId));
 *   },
 *   { maxRetries: 3, timeout: 5000, onError: (err, n) => logger.warn({ err }, `Attempt ${n} failed`) },
 * );
 */
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const {
    maxRetries = 0,
    onError,
    timeout,
    retryDelay = exponentialBackoff,
  } = options;

  // Lazily load and cache drizzle + schema to avoid re-importing on every retry.
  if (!_drizzle) {
    const mod = await import('drizzle-orm/node-postgres');
    _drizzle = mod.drizzle;
  }
  if (!_schema) {
    _schema = await import('../schema');
  }

  const { pool: pgPool } = await import('./pool');
  const totalAttempts = maxRetries + 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      const txDb = _drizzle(client, { schema: _schema });
      const result = await (timeout
        ? Promise.race([callback(txDb), rejectAfter(timeout)])
        : callback(txDb));

      await client.query('COMMIT');
      client.release();
      return result as T;

    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error({ error: rollbackError }, 'Transaction rollback failed');
      } finally {
        client.release();
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetryable = isTransientError(lastError);
      const willRetry = attempt < maxRetries && isRetryable;

      logger.error({
        error: lastError,
        component: 'DatabaseTransaction',
        attempt: attempt + 1,
        totalAttempts,
        willRetry,
        isRetryable,
        errorCode: getPostgresCode(lastError),
        timestamp: new Date().toISOString(),
      }, 'Transaction failed');

      if (onError) {
        try {
          onError(lastError, attempt + 1);
        } catch (handlerError) {
          logger.error({ error: handlerError }, 'onError handler threw an exception');
        }
      }

      if (!willRetry) throw lastError;

      const delay = retryDelay(attempt);
      logger.info(
        { component: 'DatabaseTransaction', delay, nextAttempt: attempt + 2 },
        'Retrying transaction after backoff',
      );
      await sleep(delay);
    }
  }

  // Unreachable in practice, but satisfies the TypeScript control-flow analyser.
  throw lastError ?? new Error('Transaction failed after all attempts');
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Runs a callback against the read replica connection.
 *
 * @example
 * const users = await withReadConnection((db) =>
 *   db.select().from(usersTable).where(eq(usersTable.active, true))
 * );
 */
export async function withReadConnection<T>(
  callback: (db: DatabaseConnection) => Promise<T>,
): Promise<T> {
  return callback(readDatabase);
}

/**
 * Runs a callback against the primary write connection.
 *
 * @example
 * await withWriteConnection((db) =>
 *   db.insert(usersTable).values({ name: 'Charlie' })
 * );
 */
export async function withWriteConnection<T>(
  callback: (db: DatabaseConnection) => Promise<T>,
): Promise<T> {
  return callback(writeDatabase);
}

// ============================================================================
// HEALTH MONITORING
// ============================================================================

/**
 * Verifies connectivity across all database connections by executing a
 * lightweight query and measuring round-trip latency.
 *
 * @example
 * const health = await checkDatabaseHealth();
 * if (!health.overall) alertOpsTeam(health);
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const start = Date.now();

  try {
    await database.execute('SELECT 1');
    return {
      operational: true,
      analytics: true,
      security: true,
      overall: true,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      { error, component: 'DatabaseHealth', timestamp: new Date().toISOString() },
      'Database health check failed',
    );
    return {
      operational: false,
      analytics: false,
      security: false,
      overall: false,
      timestamp: new Date().toISOString(),
      error: message,
    };
  }
}

/**
 * Gracefully closes all database connections.
 *
 * Includes a timeout guard to prevent indefinite hanging during container
 * shutdown or zero-downtime deployments.
 *
 * @param timeoutMs - Maximum wait time before forcing closure (default: 10 000ms).
 *
 * @example
 * process.on('SIGTERM', async () => {
 *   await closeDatabaseConnections();
 *   process.exit(0);
 * });
 */
export async function closeDatabaseConnections(timeoutMs = 10_000): Promise<void> {
  try {
    await Promise.race([pool.end(), rejectAfter(timeoutMs, 'Database shutdown')]);
    logger.info(
      { component: 'DatabaseShutdown', timestamp: new Date().toISOString() },
      'Database connections closed successfully',
    );
  } catch (error) {
    logger.error(
      { error, component: 'DatabaseShutdown', timestamp: new Date().toISOString() },
      'Failed to close database connections',
    );
    throw error;
  }
}

// ============================================================================
// INTERNAL UTILITIES
// ============================================================================

/**
 * PostgreSQL error codes representing transient conditions worth retrying.
 * Permanent errors (e.g. constraint violations, syntax errors) are intentionally
 * excluded — retrying them will never succeed.
 */
const TRANSIENT_PG_CODES = new Set([
  '40001', // Serialisation failure
  '40P01', // Deadlock detected
  '53300', // Too many connections
  '57P03', // Server starting or stopping
  '08006', // Connection failure
  '08003', // Connection does not exist
  '08001', // Unable to establish connection
  '57014', // Statement timeout (query_canceled)
  '08P01', // Protocol violation
]);

const TRANSIENT_MESSAGE_PATTERNS = [
  'connection',
  'timeout',
  'deadlock',
  'serialization',
  'lock',
  'conflict',
  'temporarily unavailable',
  'too many connections',
  'connection refused',
  'connection reset',
] as const;

interface PostgreSQLError extends Error {
  code: string;
}

function isPostgresError(error: Error): error is PostgreSQLError {
  return 'code' in error && typeof (error as PostgreSQLError).code === 'string';
}

function getPostgresCode(error: Error): string | undefined {
  return isPostgresError(error) ? error.code : undefined;
}

function isTransientError(error: Error): boolean {
  if (isPostgresError(error) && TRANSIENT_PG_CODES.has(error.code)) return true;

  const msg = error.message.toLowerCase();
  return TRANSIENT_MESSAGE_PATTERNS.some(pattern => msg.includes(pattern));
}

/**
 * Exponential backoff with jitter, capped at 10 seconds.
 *
 * Approximate delays:
 *  attempt 0 → ~1 s  (± 200 ms)
 *  attempt 1 → ~2 s  (± 400 ms)
 *  attempt 2 → ~4 s  (± 800 ms)
 *  attempt 3+ → 10 s (± 1 000 ms, capped)
 */
function exponentialBackoff(attempt: number): number {
  const base = 1_000 * Math.pow(2, attempt);
  const jitter = base * 0.2 * Math.random();
  return Math.min(base + jitter, 10_000);
}

/** Returns a Promise that rejects after `ms` milliseconds. */
function rejectAfter(ms: number, label = 'Operation'): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms timeout`)), ms),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}