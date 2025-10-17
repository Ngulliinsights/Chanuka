import { drizzle } from 'drizzle-orm/node-postgres';
import { pool, readDb, writeDb, db } from './pool.ts';
import * as schema from '../schema.ts';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { logger } from '../core/src/logging';

// Create a more descriptive type alias for transactions to improve code readability
// Use the actual transaction type from Drizzle ORM
export type DatabaseTransaction = Parameters<Parameters<typeof writeDatabase.transaction>[0]>[0];

// Export the main database connection with full schema
export const database = db;

// Export specialized connections for read/write operations
export const readDatabase = readDb;
export const writeDatabase = writeDb;

// Export the raw pool for direct SQL queries when needed
export { pool };

// Export all schema tables and types for easy importing
export * from '../schema.ts';

// Enhanced operation type that's more explicit about its purpose
export type DatabaseOperation = 'read' | 'write' | 'general';

/**
 * Selects the appropriate database connection based on the operation type.
 * 
 * This function helps optimize database performance by routing read operations
 * to read replicas and write operations to the primary database. The 'general'
 * option provides a fallback for operations where the type isn't known in advance.
 * 
 * @param operation - The type of database operation being performed
 * @returns The appropriate database connection instance
 * 
 * @example
 * // For read-heavy operations like fetching user data
 * const users = await getDatabase('read').select().from(usersTable);
 * 
 * @example
 * // For write operations like creating records
 * await getDatabase('write').insert(usersTable).values(newUser);
 */
export function getDatabase(operation: DatabaseOperation = 'general') {
  switch (operation) {
    case 'read':
      return readDatabase;
    case 'write':
      return writeDatabase;
    case 'general':
      return database;
    default:
      // This ensures type safety while providing a sensible fallback
      return database;
  }
}

/**
 * Configuration options for transaction behavior
 */
export interface TransactionOptions {
  /** Maximum number of retry attempts for transient failures */
  maxRetries?: number;
  /** Custom error handler for transaction failures */
  onError?: (error: Error, attempt: number) => void;
  /** Timeout in milliseconds for the transaction */
  timeout?: number;
}

/**
 * Executes a callback within a database transaction with enhanced error handling.
 * 
 * This wrapper provides several benefits over raw transactions:
 * - Automatic error logging with contextual information
 * - Optional retry logic for transient failures
 * - Type-safe transaction context
 * - Consistent error handling across your application
 * 
 * The transaction automatically rolls back if any error occurs, ensuring
 * data consistency even when operations fail partway through.
 * 
 * @param callback - Function containing the database operations to execute
 * @param options - Configuration for transaction behavior
 * @returns The result of the callback function
 * @throws Re-throws any errors after logging and cleanup
 * 
 * @example
 * // Simple transaction usage
 * await withTransaction(async (tx) => {
 *   await tx.insert(usersTable).values(newUser);
 *   await tx.insert(profilesTable).values(newProfile);
 * });
 * 
 * @example
 * // Transaction with retry logic
 * await withTransaction(
 *   async (tx) => {
 *     return await tx.select().from(usersTable).where(eq(usersTable.id, userId));
 *   },
 *   { maxRetries: 3 }
 * );
 */
export async function withTransaction<T>(
  callback: (tx: DatabaseTransaction) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { maxRetries = 0, onError, timeout } = options;
  let lastError: Error | null = null;
  
  // Retry loop for handling transient database failures
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Set up timeout if specified
      const transactionPromise = writeDatabase.transaction(async (tx) => {
        return await callback(tx);
      });
      
      if (timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Transaction timeout after ${timeout}ms`)), timeout);
        });
        
        return await Promise.race([transactionPromise, timeoutPromise]);
      }
      
      return await transactionPromise;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Determine if this error is worth retrying
      const isRetryableError = isTransientError(lastError);
      const shouldRetry = attempt < maxRetries && isRetryableError;
      
      // Log comprehensive error information for debugging
      logger.error('Transaction error:', { component: 'Chanuka' }, {
        error: lastError.message,
        stack: lastError.stack,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        willRetry: shouldRetry,
        timestamp: new Date().toISOString(),
      });
      
      // Call custom error handler if provided
      if (onError) {
        onError(lastError, attempt + 1);
      }
      
      // If we shouldn't retry, throw immediately
      if (!shouldRetry) {
        throw lastError;
      }
      
      // Wait before retrying with exponential backoff
      await sleep(Math.min(1000 * Math.pow(2, attempt), 10000));
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Transaction failed after all retries');
}

/**
 * Determines if a database error is transient and worth retrying.
 * 
 * Transient errors are temporary conditions like connection timeouts,
 * deadlocks, or serialization failures that might succeed on retry.
 * 
 * @param error - The error to check
 * @returns true if the error is likely transient
 */
function isTransientError(error: Error): boolean {
  const transientErrorCodes = [
    '40001', // Serialization failure
    '40P01', // Deadlock detected
    '53300', // Too many connections
    '57P03', // Cannot connect now
    '08006', // Connection failure
    '08003', // Connection does not exist
  ];
  
  const errorMessage = error.message.toLowerCase();
  
  // Check for PostgreSQL error codes
  if ('code' in error) {
    const code = (error as any).code;
    if (transientErrorCodes.includes(code)) {
      return true;
    }
  }
  
  // Check for common transient error patterns in messages
  return (
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('deadlock') ||
    errorMessage.includes('serialization')
  );
}

/**
 * Simple sleep utility for implementing retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a read-only operation with automatic connection selection.
 * 
 * This is a convenience wrapper that automatically routes queries to
 * the read database, making your code more declarative and easier to understand.
 * 
 * @param callback - Function containing the read operations
 * @returns The result of the callback function
 */
export async function withReadConnection<T>(
  callback: (db: typeof readDatabase) => Promise<T>
): Promise<T> {
  return callback(readDatabase);
}






