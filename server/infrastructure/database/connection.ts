import type { Pool } from 'pg';

import { logger } from '@server/infrastructure/observability/core/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Database operation types for intelligent connection routing.
 * - 'read': Query operations routed to read replicas
 * - 'write': Mutation operations routed to primary database
 * - 'general': Operations routed to default connection
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
 * Generic database connection type that works with any ORM.
 * This flexible type allows the connection to be used with Drizzle, Prisma, or raw SQL.
 */
export type DatabaseConnection = {
  execute: (sql: string, params?: unknown[]) => Promise<unknown>;
  transaction: <T>(callback: (tx: DatabaseTransaction) => Promise<T>) => Promise<T>;
  select: () => unknown;
  insert: (table: unknown) => unknown;
  update: (table: unknown) => unknown;
  delete: (table: unknown) => unknown;
};

/**
 * Database transaction interface for type-safe transaction operations.
 * The generic parameter T allows for flexible return types while maintaining type safety.
 * 
 * Note: When using with Drizzle ORM, the transaction object will be a PgDatabase instance
 * with full query builder capabilities.
 */
export interface DatabaseTransaction {
  /** Execute a query within the transaction, returning results of type T */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  /** Commit the transaction */
  commit(): Promise<void>;
  /** Rollback the transaction */
  rollback(): Promise<void>;
  /** Check if transaction is still active */
  isActive(): boolean;
}

/**
 * Extended transaction type that includes Drizzle ORM query builder methods.
 * This allows repositories to use both raw SQL and Drizzle's query builder.
 */
export type ExtendedTransaction = DatabaseTransaction & {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  delete: (...args: any[]) => any;
  [key: string]: any; // Allow any Drizzle methods
};

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
  error?: string;
}

// ============================================================================
// DATABASE CONNECTIONS
// ============================================================================

/**
 * Database connection instances - initialized during application startup.
 * These are exported as mutable to allow proper initialization from pool.ts
 */

/**
 * Primary database connection for general operations.
 * Use when read/write distinction isn't performance-critical.
 */
export let database: DatabaseConnection;

/**
 * Read-optimized connection routing to replicas in production.
 * Improves scalability by distributing query load across read replicas.
 */
export let readDatabase: DatabaseConnection;

/**
 * Write-optimized connection always routing to primary database.
 * Ensures data consistency for all mutation operations.
 */
export let writeDatabase: DatabaseConnection;

/**
 * Specialized connections for multi-tenant architecture.
 *
 * Phase One: All connections reference the same database instance.
 * Phase Two (Future): Each connection will target a dedicated database
 * optimized for its specific workload characteristics.
 */
export let operationalDb: DatabaseConnection;
export let analyticsDb: DatabaseConnection;
export let securityDb: DatabaseConnection;

/**
 * Raw PostgreSQL pool for direct SQL when ORM abstraction is limiting.
 * Use sparingly and prefer Drizzle ORM for type safety.
 */
export let pool: Pool;

/**
 * Initialize database connections from pool instances.
 * This must be called during application startup before any database operations.
 * 
 * @internal - Called automatically by pool.ts initialization
 */
export function initializeDatabaseConnections(
  generalDb: DatabaseConnection,
  readDb: DatabaseConnection,
  writeDb: DatabaseConnection,
  rawPool: Pool
): void {
  database = generalDb;
  readDatabase = readDb;
  writeDatabase = writeDb;
  
  // Phase One: All specialized connections use the same database
  operationalDb = generalDb;
  analyticsDb = generalDb;
  securityDb = generalDb;
  
  pool = rawPool;
  
  logger.info({
    component: 'DatabaseConnection',
    timestamp: new Date().toISOString(),
  }, 'Database connections initialized');
}

/**
 * Re-export schema definitions for convenient access.
 * 
 * NOTE: This creates a convenience for importing both database connections
 * and schema in the same file, but be aware of potential circular dependencies.
 * 
 * Recommended: Import schema directly from @server/infrastructure/schema
 * import { users, bills } from '@server/infrastructure/schema';
 */
// Removed to prevent circular dependencies - import schema directly instead
// export * from '../schema';

// ============================================================================
// CONNECTION ROUTING
// ============================================================================

/**
 * Routes database operations to the optimal connection based on operation type.
 * 
 * This intelligent routing improves performance by directing read operations to
 * read replicas and write operations to the primary database. In production
 * environments with replica sets, this dramatically reduces load on the primary
 * database and improves overall application scalability.
 * 
 * @param operation - Type of database operation ('read', 'write', or 'general')
 * @returns The appropriate database connection
 * 
 * @example
 * // Read operations benefit from replica routing
 * const activeUsers = await getDatabase('read')
 *   .select()
 *   .from(usersTable)
 *   .where(eq(usersTable.active, true));
 * 
 * @example
 * // Write operations always hit primary for consistency
 * await getDatabase('write')
 *   .insert(usersTable)
 *   .values({ name: 'Alice', email: 'alice@example.com' });
 */
export function getDatabase(operation: DatabaseOperation = 'general'): DatabaseConnection {
  switch (operation) {
    case 'read':
      return readDatabase;
    case 'write':
      return writeDatabase;
    case 'general':
    default:
      return database;
  }
}

// ============================================================================
// TRANSACTION MANAGEMENT
// ============================================================================

/**
 * Executes operations within an ACID-compliant database transaction.
 * 
 * This wrapper provides production-ready transaction management with automatic
 * rollback on errors, configurable retry logic for transient failures, timeout
 * protection, and comprehensive logging. All operations in the callback execute
 * atomically—either all succeed or all are rolled back, ensuring data integrity.
 * 
 * The retry mechanism uses exponential backoff by default, progressively increasing
 * delay between attempts to avoid overwhelming a struggling database. Only transient
 * errors (deadlocks, timeouts, connection issues) trigger retries; logical errors
 * fail immediately.
 * 
 * The generic type parameter T ensures that whatever type your transaction returns
 * is properly preserved through the function, giving you full type safety.
 * 
 * @param callback - Function containing atomic database operations
 * @param options - Transaction behavior configuration
 * @returns Result from the callback function, strongly typed
 * @throws Re-throws error after exhausting retries
 * 
 * @example
 * // Simple transaction ensuring atomicity, with type inference
 * const user = await withTransaction(async (tx) => {
 *   const [newUser] = await tx.insert(usersTable)
 *     .values({ name: 'Bob', email: 'bob@example.com' })
 *     .returning();
 *   
 *   await tx.insert(profilesTable)
 *     .values({ user_id: newUser.id, bio: 'Software engineer' });
 *   
 *   return newUser; // Type is preserved and returned
 * });
 * 
 * @example
 * // Transaction with retry logic for production resilience
 * await withTransaction(
 *   async (tx) => {
 *     await tx.update(accountsTable)
 *       .set({ balance: sql`${accountsTable.balance} - 100` })
 *       .where(eq(accountsTable.id, accountId));
 *   },
 *   { 
 *     maxRetries: 3,
 *     timeout: 5000,
 *     onError: (error, attempt) => {
 *       logger.warn(`Transaction attempt ${attempt} failed`, { error: error.message });
 *     }
 *   }
 * );
 */
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { 
    maxRetries = 0, 
    onError, 
    timeout,
    retryDelay = calculateExponentialBackoff
  } = options;
  
  let lastError: Error | null = null;

  // Attempt transaction with configurable retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const transactionPromise = writeDatabase.transaction(callback);

      // Apply timeout protection if configured
      if (timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Transaction exceeded ${timeout}ms timeout`)), 
            timeout
          );
        });

        return await Promise.race([transactionPromise, timeoutPromise]);
      }

      return await transactionPromise;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetryable = isTransientError(lastError);
      const shouldRetry = attempt < maxRetries && isRetryable;

      // Extract error code safely for PostgreSQL errors
      const errorCode = isPostgreSQLError(lastError) ? lastError.code : undefined;

      // Log comprehensive error context for debugging
      logger.error({
        error: lastError,
        component: 'DatabaseTransaction',
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        willRetry: shouldRetry,
        isRetryable,
        errorCode,
        timestamp: new Date().toISOString(),
      }, 'Transaction failed');

      // Invoke custom error handler if provided
      if (onError) {
        try {
          onError(lastError, attempt + 1);
        } catch (handlerError) {
          logger.error({ error: handlerError }, 'Error handler threw exception');
        }
      }

      // Fail fast for non-retryable errors or exhausted retries
      if (!shouldRetry) {
        throw lastError;
      }

      // Wait before retry using configured delay strategy
      const delayMs = retryDelay(attempt);
      logger.info({
        component: 'DatabaseTransaction',
        delayMs,
        nextAttempt: attempt + 2,
      }, 'Retrying transaction after delay');
      await sleep(delayMs);
    }
  }

  // Fallback error if loop completes without success (shouldn't happen)
  throw lastError || new Error('Transaction failed after all retries');
}

/**
 * Type guard to check if an error is a PostgreSQL error with a code property.
 * This allows us to safely access the error code without type assertions.
 */
interface PostgreSQLError extends Error {
  code: string;
}

function isPostgreSQLError(error: Error): error is PostgreSQLError {
  return 'code' in error && typeof (error as PostgreSQLError).code === 'string';
}

/**
 * Calculates exponential backoff delay with jitter and a maximum cap.
 * Formula: min((1000 × 2^attempt) + random jitter, 10000) milliseconds
 * 
 * The jitter (random variation) prevents thundering herd problems where many
 * clients retry simultaneously, potentially overwhelming the database again.
 * 
 * Attempt 0: ~1 second (± 200ms jitter)
 * Attempt 1: ~2 seconds (± 400ms jitter)
 * Attempt 2: ~4 seconds (± 800ms jitter)
 * Attempt 3+: ~10 seconds (± 1000ms jitter, capped)
 */
function calculateExponentialBackoff(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 10000;
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Add jitter to prevent synchronized retries (up to 20% of delay)
  const jitter = exponentialDelay * 0.2 * Math.random();
  
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Identifies transient database errors suitable for retry.
 * 
 * Transient errors represent temporary conditions that may resolve on retry,
 * such as connection timeouts, deadlocks, or serialization conflicts. This
 * function distinguishes these from permanent errors like constraint violations
 * or syntax errors that will never succeed regardless of retries.
 * 
 * @param error - Error to classify
 * @returns true if error is transient and retry-eligible
 */
function isTransientError(error: Error): boolean {
  // PostgreSQL error codes indicating transient conditions
  const transientCodes = new Set([
    '40001', // Serialization failure (concurrent transaction conflict)
    '40P01', // Deadlock detected
    '53300', // Too many connections
    '57P03', // Cannot connect now (server starting/stopping)
    '08006', // Connection failure
    '08003', // Connection does not exist
    '08001', // Unable to establish connection
    '57014', // Query canceled (statement timeout)
    '08P01', // Protocol violation
    '23505', // Unique violation (may be transient in some concurrent scenarios)
  ]);

  // Check for explicit PostgreSQL error codes using type guard
  if (isPostgreSQLError(error) && transientCodes.has(error.code)) {
    return true;
  }

  // Fallback to pattern matching in error messages for database-agnostic handling
  const errorMessage = error.message.toLowerCase();
  const transientPatterns = [
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
  ];

  return transientPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Promisified setTimeout for implementing async delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Executes read-only operations with automatic replica routing.
 * 
 * This wrapper makes code more declarative by explicitly signaling read-only
 * intent. It automatically selects read replicas, improving performance while
 * serving as self-documenting code that clarifies data access patterns.
 * 
 * The generic type parameter ensures your callback's return type is preserved.
 * 
 * @param callback - Function containing read operations
 * @returns Callback result with preserved type
 * 
 * @example
 * const recentUsers = await withReadConnection(async (db) => {
 *   return await db.select()
 *     .from(usersTable)
 *     .where(eq(usersTable.status, 'active'))
 *     .orderBy(desc(usersTable.created_at))
 *     .limit(50);
 * });
 */
export async function withReadConnection<T>(
  callback: (db: DatabaseConnection) => Promise<T>
): Promise<T> {
  return callback(readDatabase);
}

/**
 * Executes write operations with explicit routing to primary database.
 * 
 * While write operations automatically route to the primary through getDatabase('write'),
 * this wrapper provides semantic clarity and ensures consistency in your codebase.
 * It pairs naturally with withReadConnection for symmetrical API design.
 * 
 * @param callback - Function containing write operations
 * @returns Callback result with preserved type
 * 
 * @example
 * await withWriteConnection(async (db) => {
 *   await db.insert(usersTable)
 *     .values({ name: 'Charlie', email: 'charlie@example.com' });
 * });
 */
export async function withWriteConnection<T>(
  callback: (db: DatabaseConnection) => Promise<T>
): Promise<T> {
  return callback(writeDatabase);
}

// ============================================================================
// HEALTH MONITORING
// ============================================================================

/**
 * Performs comprehensive health check across all database connections.
 * 
 * Verifies database responsiveness by executing a lightweight query and measuring
 * latency. In Phase One, this checks the unified database instance. In Phase Two,
 * when databases are separated, this will independently verify each specialized
 * database, providing granular health visibility for monitoring and alerting.
 * 
 * @returns Detailed health status with latency metrics
 * 
 * @example
 * const health = await checkDatabaseHealth();
 * if (!health.overall) {
 *   logger.error('Database unhealthy', { health });
 *   await alertOpsTeam(health);
 * }
 * 
 * @example
 * // Monitor latency for performance degradation
 * const health = await checkDatabaseHealth();
 * if (health.latencyMs && health.latencyMs > 1000) {
 *   logger.warn('Database latency elevated', { latency: health.latencyMs });
 * }
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const startTime = Date.now();
  
  try {
    // Execute simple query to verify connectivity and responsiveness
    await database.execute('SELECT 1');
    const latencyMs = Date.now() - startTime;

    return {
      operational: true,
      analytics: true,
      security: true,
      overall: true,
      timestamp: new Date().toISOString(),
      latencyMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error({ 
      error,
      component: 'DatabaseHealth',
      timestamp: new Date().toISOString(),
    }, 'Database health check failed');

    return {
      operational: false,
      analytics: false,
      security: false,
      overall: false,
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };
  }
}

/**
 * Gracefully closes all database connections during shutdown.
 * 
 * Essential for clean application termination, ensuring all connections are
 * properly released and pending operations complete. Prevents connection leaks
 * and resource exhaustion, particularly important in containerized deployments
 * where graceful shutdown is critical for zero-downtime deployments.
 * 
 * This function includes a timeout mechanism to prevent indefinite hanging during
 * shutdown, which could block container orchestration or deployment processes.
 * 
 * @param timeoutMs - Maximum time to wait for graceful shutdown (default: 10000ms)
 * @throws Re-throws errors after logging for shutdown handler awareness
 * 
 * @example
 * // Register shutdown handler for graceful termination
 * process.on('SIGTERM', async () => {
 *   logger.info('Received SIGTERM, shutting down gracefully');
 *   try {
 *     await closeDatabaseConnections();
 *     process.exit(0);
 *   } catch (error) {
 *     logger.error('Shutdown error', { error });
 *     process.exit(1);
 *   }
 * });
 */
export async function closeDatabaseConnections(timeoutMs: number = 10000): Promise<void> {
  try {
    // Create timeout promise to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Database connection closure exceeded ${timeoutMs}ms timeout`));
      }, timeoutMs);
    });

    // Race between graceful shutdown and timeout
    await Promise.race([
      pool.end(),
      timeoutPromise,
    ]);

    logger.info({
      component: 'DatabaseShutdown',
      timestamp: new Date().toISOString(),
    }, 'Database connections closed successfully');
  } catch (error) {
    logger.error({ 
      error,
      component: 'DatabaseShutdown',
      timestamp: new Date().toISOString(),
    }, 'Failed to close database connections');
    throw error;
  }
}