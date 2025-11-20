import { logger } from '@/core/index.js';

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
 * Database transaction interface for type-safe transaction operations.
 */
export interface DatabaseTransaction {
  /** Execute a query within the transaction */
  query<T = any>(sql: string, params?: any[]): Promise<T>;
  /** Commit the transaction */
  commit(): Promise<void>;
  /** Rollback the transaction */
  rollback(): Promise<void>;
  /** Check if transaction is still active */
  isActive(): boolean;
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
// DATABASE CONNECTIONS
// ============================================================================

/**
 * Primary database connection for general operations.
 * Use when read/write distinction isn't performance-critical.
 */
export const database = null as any; // Will be initialized later

/**
 * Read-optimized connection routing to replicas in production.
 * Improves scalability by distributing query load across read replicas.
 */
export const readDatabase = null as any;

/**
 * Write-optimized connection always routing to primary database.
 * Ensures data consistency for all mutation operations.
 */
export const writeDatabase = null as any;

/**
 * Specialized connections for multi-tenant architecture.
 *
 * Phase One: All connections reference the same database instance.
 * Phase Two (Future): Each connection will target a dedicated database
 * optimized for its specific workload characteristics.
 */
export const operationalDb = null as any;  // Primary transactional workload
export const analyticsDb = null as any;    // Read-heavy analytics queries
export const securityDb = null as any;     // Audit logs and security events

/**
 * Raw PostgreSQL pool for direct SQL when ORM abstraction is limiting.
 * Use sparingly and prefer Drizzle ORM for type safety.
 */
export const pool = null as any;

/**
 * Re-export all schema definitions for convenient access.
 */
export * from '../schema';

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
export function getDatabase(operation: DatabaseOperation = 'general') {
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
 * @param callback - Function containing atomic database operations
 * @param options - Transaction behavior configuration
 * @returns Result from the callback function
 * @throws Re-throws error after exhausting retries
 * 
 * @example
 * // Simple transaction ensuring atomicity
 * const user = await withTransaction(async (tx) => {
 *   const [newUser] = await tx.insert(usersTable)
 *     .values({ name: 'Bob', email: 'bob@example.com' })
 *     .returning();
 *   
 *   await tx.insert(profilesTable)
 *     .values({ user_id: newUser.id, bio: 'Software engineer' });
 *   
 *   return newUser;
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
  callback: (tx: DatabaseTransaction) => Promise<T>,
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

      // Log comprehensive error context for debugging
      logger.error('Transaction failed', {
        error: lastError,
        component: 'DatabaseTransaction',
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        willRetry: shouldRetry,
        isRetryable,
        errorCode: 'code' in lastError ? (lastError as any).code : undefined,
        timestamp: new Date().toISOString(),
      });

      // Invoke custom error handler if provided
      if (onError) {
        try {
          onError(lastError, attempt + 1);
        } catch (handlerError) {
          logger.error('Error handler threw exception', { error: handlerError });
        }
      }

      // Fail fast for non-retryable errors or exhausted retries
      if (!shouldRetry) {
        throw lastError;
      }

      // Wait before retry using configured delay strategy
      const delayMs = retryDelay(attempt);
      await sleep(delayMs);
    }
  }

  // Fallback error if loop completes without success (shouldn't happen)
  throw lastError || new Error('Transaction failed after all retries');
}

/**
 * Calculates exponential backoff delay with a maximum cap.
 * Formula: min(1000 × 2^attempt, 10000) milliseconds
 * 
 * Attempt 0: 1 second
 * Attempt 1: 2 seconds
 * Attempt 2: 4 seconds
 * Attempt 3+: 10 seconds (capped)
 */
function calculateExponentialBackoff(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 10000;
  return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
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
  ]);

  // Check for explicit PostgreSQL error codes
  if ('code' in error && transientCodes.has((error as any).code)) {
    return true;
  }

  // Fallback to pattern matching in error messages
  const errorMessage = error.message.toLowerCase();
  const transientPatterns = [
    'connection',
    'timeout',
    'deadlock',
    'serialization',
    'lock',
    'conflict',
    'temporarily unavailable',
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
 * @param callback - Function containing read operations
 * @returns Callback result
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
  callback: (db: typeof readDatabase) => Promise<T>
): Promise<T> {
  return callback(readDatabase);
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
    logger.error('Database health check failed', { 
      error,
      component: 'DatabaseHealth',
      timestamp: new Date().toISOString(),
    });

    return {
      operational: false,
      analytics: false,
      security: false,
      overall: false,
      timestamp: new Date().toISOString(),
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
export async function closeDatabaseConnections(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database connections closed successfully', {
      component: 'DatabaseShutdown',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to close database connections', { 
      error,
      component: 'DatabaseShutdown',
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}


