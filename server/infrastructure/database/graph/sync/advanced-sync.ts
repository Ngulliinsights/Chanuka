/**
 * Advanced Sync (REFACTORED)
 * IMPROVEMENTS: Parallel processing, error handling, progress tracking
 */
import { Driver } from 'neo4j-driver';
// Removed unused executeBatch
import { parallelLimit } from '../utils/retry-utils';
import { logger } from '@server/infrastructure/observability';

// Removed unused error imports and handler

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
        logger.error({
          error: error instanceof Error ? error.message : String(error),
        }, 'Parallel sync failed');
      }
    },
    concurrency
  );

  logger.info({ synced, failed, total: items.length }, 'Parallel sync completed');
  return { synced, failed };
}

export async function syncWithProgress<T>(
  driver: Driver,
  items: T[],
  syncOperation: (driver: Driver, item: T) => Promise<void>,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item === undefined) continue;
    await syncOperation(driver, item);
    
    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }
}

export default {
  syncInParallel,
  syncWithProgress,
};
