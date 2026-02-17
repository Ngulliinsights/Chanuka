/**
 * Example usage of the enhanced database system with race condition
 * and infinite loop protection.
 * 
 * This file demonstrates how to properly use the database connections
 * with all safety mechanisms in place.
 */

import { logger } from '@shared/core';

import { users } from '../schema/foundation';

import { executeQuery } from './pool';

/**
 * Example: Safe database initialization
 */
export const initializeApp = async (): Promise<void> => {
  try {
    // Initialize all safety mechanisms
    await initializeDatabaseSafety();

    logger.info('Application database layer initialized safely');
  } catch (error) {
    logger.error('Error initializing app', { error });
    throw error;
  }
};

/**
 * Example: Safe read operation
 */
export const safeReadExample = async (user_id: string): Promise<void> => {
  try {
    // Use read database for read operations
    const result = await readDatabase.query.users.findFirst({
      where: (user: typeof users, { eq }: { eq: (left: unknown, right: unknown) => any }) => eq(user.id, user_id),
    });

    return result;
  } catch (error) {
    logger.error('Error in safeReadExample', { error });
    throw error;
  }
};

/**
 * Example: Safe write operation with transaction
 */
export const safeWriteExample = async (userData: unknown): Promise<void> => {
  try {
    return await withTransaction(async (tx: unknown) => {
      // All operations within this transaction are protected
      // Note: tx should be a proper Drizzle transaction object
      const insertedUserRows = await tx.insert(userTable).values(userData).returning();

      // Additional operations can be added here
      // If any fail, the entire transaction will be rolled back

      return insertedUserRows[0];
    });
  } catch (error) {
    logger.error('Error in safeWriteExample', { error });
    throw error;
  }
};

/**
 * Example: Safe raw query execution
 */
export const safeRawQueryExample = async (bill_id: number): Promise<void> => {
  try {
    const result = await executeQuery({
      text: 'SELECT * FROM bills WHERE id = $1',
      params: [bill_id],
      context: 'fetch-bill-details',
    });

    return result.rows;
  } catch (error) {
    logger.error('Error in safeRawQueryExample', { error });
    throw error;
  }
};

/**
 * Example: Concurrent operations (demonstrating thread safety)
 */
export const safeConcurrentExample = async (): Promise<void> => {
  try {
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
  } catch (error) {
    logger.error('Error in safeConcurrentExample', { error });
    throw error;
  }
};

/**
 * Example: Graceful shutdown
 */
export const shutdownApp = async (): Promise<void> => {
  try {
    await shutdownDatabaseSafety();
    logger.info('Application database layer shut down safely');
  } catch (error) {
    logger.error('Error in shutdownApp', { error });
    throw error;
  }
};

/**
 * Example: Error handling in action
 */
export const errorHandlingExample = async (): Promise<void> => {
  try {
    // This will automatically be protected by circuit breakers and retry logic
    await executeQuery({
      text: 'SELECT * FROM non_existent_table',
      params: [],
      context: 'error-example',
    });
  } catch (error) {
    // Error is automatically classified and logged
    logger.info('Error was handled gracefully', {
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















































