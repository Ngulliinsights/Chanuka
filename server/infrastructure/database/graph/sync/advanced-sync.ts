/**
 * Advanced Sync (REFACTORED)
 * IMPROVEMENTS: Parallel processing, error handling, progress tracking
 */
import { Driver } from 'neo4j-driver';
import { executeBatch } from '../utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from '../utils/error-adapter-v2';
import { parallelLimit } from '../utils/retry-utils';
import { logger } from '@/core/observability';

const errorHandler = new GraphErrorHandler();

export async function syncInParallel<T>(
  driver: Driver,
  items: T[],
  syncOperation: (driver: Driver, item: T) => Promise<void>,
  concurrency: number = 5
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  await parallelLimit(
    items,
    async (item) => {
      try {
        await syncOperation(driver, item);
        synced++;
      } catch (error) {
        failed++;
        logger.error('Parallel sync failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    concurrency
  );

  logger.info('Parallel sync completed', { synced, failed, total: items.length });
  return { synced, failed };
}

export async function syncWithProgress<T>(
  driver: Driver,
  items: T[],
  syncOperation: (driver: Driver, item: T) => Promise<void>,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    await syncOperation(driver, items[i]);
    
    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }
}

export default {
  syncInParallel,
  syncWithProgress,
};
