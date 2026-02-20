/**
 * Transaction Executor (REFACTORED)
 * IMPROVEMENTS: Automatic rollback, retry logic, error handling
 */
import { Driver, Transaction } from 'neo4j-driver';

import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/retry-utils';
import { withTransaction } from '../utils/session-manager';

import { logger } from '@/core/observability';

const errorHandler = new GraphErrorHandler();

export async function executeInTransaction<T>(
  driver: Driver,
  operations: (tx: Transaction) => Promise<T>,
  options: { retry?: boolean; maxRetries?: number } = {}
): Promise<T> {
  const { retry = true, maxRetries = 3 } = options;

  const execute = () => withTransaction(driver, operations);

  try {
    if (retry) {
      return await retryWithBackoff(execute, {
        ...RETRY_PRESETS.DATABASE_OPERATION,
        maxRetries,
      });
    } else {
      return await execute();
    }
  } catch (error) {
    errorHandler.handle(error as Error, {
      operation: 'executeInTransaction',
    });

    throw new GraphError({
      code: GraphErrorCode.TRANSACTION_FAILED,
      message: 'Transaction execution failed',
      cause: error as Error,
    });
  }
}

export async function executeBatchInTransaction<T>(
  driver: Driver,
  items: T[],
  operation: (tx: Transaction, item: T) => Promise<void>,
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    await executeInTransaction(driver, async (tx) => {
      for (const item of batch) {
        await operation(tx, item);
      }
    });

    logger.debug('Batch processed', {
      processed: Math.min(i + batchSize, items.length),
      total: items.length
    });
  }
}

export default {
  executeInTransaction,
  executeBatchInTransaction,
};
