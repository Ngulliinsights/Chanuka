/**
 * Session Management Utility
 * 
 * Provides safe session handling for Neo4j operations with automatic cleanup.
 * This utility ensures sessions are always properly closed, preventing memory leaks.
 * 
 * @module utils/session-manager
 */

import { Driver, Session, Transaction, Result } from 'neo4j-driver';
import { GraphErrorHandler, GraphErrorCode } from '../error-adapter-v2';
import { retryWithBackoff, RetryConfig, RETRY_PRESETS } from '../retry-utils';

const errorHandler = GraphErrorHandler ? new GraphErrorHandler() : null;

// ============================================================================
// SESSION WRAPPER - Automatic Resource Management
// ============================================================================

/**
 * Execute an operation with automatic session management.
 * Ensures the session is always closed, even if the operation throws an error.
 * 
 * @param driver - Neo4j driver instance
 * @param operation - Async operation to execute with the session
 * @returns Result of the operation
 * 
 * @example
 * ```typescript
 * const result = await withSession(driver, async (session) => {
 *   return await session.run('MATCH (n:User) RETURN n LIMIT 10');
 * });
 * ```
 */
export async function withSession<T>(
  driver: Driver,
  operation: (session: Session) => Promise<T>
): Promise<T> {
  const session = driver.session();
  try {
    return await operation(session);
  } finally {
    await session.close();
  }
}

/**
 * Execute a write operation with automatic session and transaction management.
 * Includes retry logic for transient failures.
 * 
 * @param driver - Neo4j driver instance
 * @param operation - Write operation to execute
 * @param retryConfig - Optional retry configuration
 * @returns Result of the operation
 * 
 * @example
 * ```typescript
 * await withWriteSession(driver, async (session) => {
 *   return await session.run('CREATE (n:User {id: $id})', { id: '123' });
 * });
 * ```
 */
export async function withWriteSession<T>(
  driver: Driver,
  operation: (session: Session) => Promise<T>,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return withSession(driver, async (session) => {
    return retryWithBackoff(
      () => operation(session),
      {
        ...RETRY_PRESETS.DATABASE_OPERATION,
        ...retryConfig,
      }
    );
  });
}

/**
 * Execute a read operation with automatic session management.
 * Optimized for read-only operations.
 * 
 * @param driver - Neo4j driver instance
 * @param operation - Read operation to execute
 * @returns Result of the operation
 */
export async function withReadSession<T>(
  driver: Driver,
  operation: (session: Session) => Promise<T>
): Promise<T> {
  const session = driver.session({ defaultAccessMode: 'READ' });
  try {
    return await operation(session);
  } finally {
    await session.close();
  }
}

// ============================================================================
// TRANSACTION WRAPPER - Automatic Commit/Rollback
// ============================================================================

/**
 * Execute multiple operations in a single transaction.
 * Automatically commits on success, rolls back on failure.
 * 
 * @param driver - Neo4j driver instance
 * @param operation - Transaction operations to execute
 * @returns Result of the transaction
 * 
 * @example
 * ```typescript
 * await withTransaction(driver, async (tx) => {
 *   await tx.run('CREATE (u:User {id: $id})', { id: '1' });
 *   await tx.run('CREATE (u:User {id: $id})', { id: '2' });
 *   // Both users created atomically
 * });
 * ```
 */
export async function withTransaction<T>(
  driver: Driver,
  operation: (tx: Transaction) => Promise<T>
): Promise<T> {
  return withSession(driver, async (session) => {
    const tx = session.beginTransaction();
    try {
      const result = await operation(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  });
}

// ============================================================================
// SAFE QUERY EXECUTION - With Validation and Error Handling
// ============================================================================

/**
 * Execute a Cypher query safely with parameter validation.
 * Prevents Cypher injection by ensuring parameters are used correctly.
 * 
 * @param driver - Neo4j driver instance
 * @param cypher - Parameterized Cypher query
 * @param params - Query parameters
 * @param options - Execution options
 * @returns Query result
 * 
 * @throws {Error} If query contains template literal interpolation
 */
export async function executeCypherSafely(
  driver: Driver,
  cypher: string,
  params: Record<string, any> = {},
  options: {
    mode?: 'READ' | 'WRITE';
    retry?: boolean;
  } = {}
): Promise<Result> {
  // Validate query doesn't use template literals
  validateCypherQuery(cypher);

  const { mode = 'WRITE', retry = true } = options;

  const executeQuery = async (session: Session) => {
    try {
      return await session.run(cypher, params);
    } catch (error) {
      if (errorHandler) {
        errorHandler.handle(error as Error, {
          operation: 'executeCypherSafely',
          cypher: cypher.substring(0, 100), // First 100 chars for context
          params: Object.keys(params),
        });
      }
      throw error;
    }
  };

  if (mode === 'READ') {
    return withReadSession(driver, executeQuery);
  } else {
    if (retry) {
      return withWriteSession(driver, executeQuery);
    } else {
      return withSession(driver, executeQuery);
    }
  }
}

/**
 * Validate that a Cypher query uses parameterized queries, not template literals.
 * 
 * @param cypher - Cypher query to validate
 * @throws {Error} If query contains template literal interpolation
 */
function validateCypherQuery(cypher: string): void {
  // Check for template literal interpolation patterns
  const dangerousPatterns = [
    /\$\{[^}]+\}/,  // Template literals: ${variable}
    /`[^`]*\$\{/,   // Template string start
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cypher)) {
      throw new Error(
        'Cypher injection risk detected: Query uses template literal interpolation. ' +
        'Use parameterized queries instead: $paramName'
      );
    }
  }
}

// ============================================================================
// BATCH OPERATIONS - Efficient Bulk Processing
// ============================================================================

/**
 * Execute a batch of operations efficiently.
 * Uses UNWIND for bulk inserts/updates.
 * 
 * @param driver - Neo4j driver instance
 * @param items - Items to process
 * @param batchOperation - Operation to perform on each batch
 * @param batchSize - Size of each batch (default: 1000)
 * 
 * @example
 * ```typescript
 * await executeBatch(driver, users, async (session, batch) => {
 *   await session.run(`
 *     UNWIND $batch as user
 *     MERGE (u:User {id: user.id})
 *     SET u += user.properties
 *   `, { batch });
 * }, 500);
 * ```
 */
export async function executeBatch<T>(
  driver: Driver,
  items: T[],
  batchOperation: (session: Session, batch: T[]) => Promise<void>,
  batchSize: number = 1000
): Promise<void> {
  await withSession(driver, async (session) => {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await batchOperation(session, batch);
    }
  });
}

// ============================================================================
// QUERY RESULT HELPERS
// ============================================================================

/**
 * Extract a single value from a query result.
 * 
 * @param result - Neo4j query result
 * @param key - Key to extract
 * @returns Extracted value or null
 */
export function extractSingleValue<T = any>(
  result: Result,
  key: string
): T | null {
  if (result.records.length === 0) {
    return null;
  }
  return result.records[0].get(key) as T;
}

/**
 * Extract all values from a query result.
 * 
 * @param result - Neo4j query result
 * @param key - Key to extract
 * @returns Array of extracted values
 */
export function extractAllValues<T = any>(
  result: Result,
  key: string
): T[] {
  return result.records.map(record => record.get(key) as T);
}

/**
 * Check if a query returned any results.
 * 
 * @param result - Neo4j query result
 * @returns True if results exist
 */
export function hasResults(result: Result): boolean {
  return result.records.length > 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  withSession,
  withWriteSession,
  withReadSession,
  withTransaction,
  executeCypherSafely,
  executeBatch,
  extractSingleValue,
  extractAllValues,
  hasResults,
};
