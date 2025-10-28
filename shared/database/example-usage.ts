/**
 * Example usage of the enhanced database system with race condition
 * and infinite loop protection.
 * 
 * This file demonstrates how to properly use the database connections
 * with all safety mechanisms in place.
 */

import { database, readDatabase, writeDatabase, withTransaction, user as userTable } from './connection.js';
import { executeQuery } from './pool.js';
import { initializeDatabaseSafety, shutdownDatabaseSafety } from './init.js';
import { asyncErrorHandler } from '../core/src/observability/error-management';
import { logger } from '../core/src/observability/logging';

/**
 * Example: Safe database initialization
 */
export const initializeApp = asyncErrorHandler(async () => {
  // Initialize all safety mechanisms
  await initializeDatabaseSafety();

  logger.info('Application database layer initialized safely');
});

/**
 * Example: Safe read operation
 */
export const safeReadExample = asyncErrorHandler(async (userId: string) => {
  // Use read database for read operations
  const result = await readDatabase.query.user.findFirst({
    where: (user, { eq }) => eq(user.id, userId),
  });

  return result;
});

/**
 * Example: Safe write operation with transaction
 */
export const safeWriteExample = asyncErrorHandler(async (userData: any) => {
  return await withTransaction(async (tx) => {
    // All operations within this transaction are protected
    const insertedUserRows = await tx.insert(userTable).values(userData).returning();

    // Additional operations can be added here
    // If any fail, the entire transaction will be rolled back

    return insertedUserRows[0];
  });
});

/**
 * Example: Safe raw query execution
 */
export const safeRawQueryExample = asyncErrorHandler(async (billId: number) => {
  const result = await executeQuery({
    text: 'SELECT * FROM bills WHERE id = $1',
    params: [billId],
    context: 'fetch-bill-details',
  });

  return result.rows;
});

/**
 * Example: Concurrent operations (demonstrating thread safety)
 */
export const safeConcurrentExample = asyncErrorHandler(async () => {
  // These operations can run concurrently without race conditions
  const promises = Array.from({ length: 10 }, (_, i) =>
    executeQuery({
      text: 'SELECT COUNT(*) as count FROM bills WHERE status = $1',
      params: ['active'],
      context: `concurrent-query-${i}`,
    })
  );

  const results = await Promise.all(promises);
  return results.map(r => r.rows[0]);
});

/**
 * Example: Graceful shutdown
 */
export const shutdownApp = asyncErrorHandler(async () => {
  await shutdownDatabaseSafety();
  logger.info('Application database layer shut down safely');
});

/**
 * Example: Error handling in action
 */
export const errorHandlingExample = async () => {
  try {
    // This will automatically be protected by circuit breakers and retry logic
    await executeQuery({
      text: 'SELECT * FROM non_existent_table',
      params: [],
      context: 'error-example',
    });
  } catch (error) {
    // Error is automatically classified and logged
    logger.info('Error was handled gracefully:', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

// Export all examples
export const examples = {
  initializeApp,
  safeReadExample,
  safeWriteExample,
  safeRawQueryExample,
  safeConcurrentExample,
  shutdownApp,
  errorHandlingExample,
};












































