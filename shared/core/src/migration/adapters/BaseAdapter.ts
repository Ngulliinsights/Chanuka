import { Logger } from '@/logging';
import { MigrationMetrics } from '../monitoring/MigrationMetrics';
import { logger } from '../../observability/logging';

export type DualOperationOptions = {
  preferenceLegacy?: boolean;
  compareResults?: boolean;
  timeoutMs?: number;
};

export abstract class BaseAdapter {
  protected readonly logger: Logger;
  protected readonly metrics: MigrationMetrics;
  protected readonly adapterName: string;

  constructor(adapterName: string) {
    this.adapterName = adapterName;
    this.logger = new Logger().child({ module: `Migration:${adapterName}` });
    this.metrics = new MigrationMetrics(adapterName);
  }

  protected async dualOperation<T>(
    operation: string,
    legacyFn: () => Promise<T>,
    newFn: () => Promise<T>,
    options: DualOperationOptions = {}
  ): Promise<T> {
    const {
      preferenceLegacy = true,
      compareResults = true,
      timeoutMs = 5000
    } = options;

    const startTime = Date.now();
    let primaryResult: T;
    let secondaryResult: T | undefined;
    let error: Error | undefined;

    try {
      if (preferenceLegacy) {
        // Legacy system is primary
        primaryResult = await this.executeWithTimeout(legacyFn, timeoutMs);
        
        // Attempt new system call in background
        if (compareResults) {
          try {
            secondaryResult = await this.executeWithTimeout(newFn, timeoutMs);
            await this.compareResults(operation, primaryResult, secondaryResult);
          } catch (e) {
            this.logger.warn({
              error: e,
              operation,
              system: 'new'
            }, `New system call failed for ${operation}`);
            this.metrics.recordNewSystemFailure(operation);
          }
        }
      } else {
        // New system is primary
        primaryResult = await this.executeWithTimeout(newFn, timeoutMs);
        
        // Attempt legacy system call in background
        if (compareResults) {
          try {
            secondaryResult = await this.executeWithTimeout(legacyFn, timeoutMs);
            await this.compareResults(operation, primaryResult, secondaryResult);
          } catch (e) {
            this.logger.warn({
              error: e,
              operation,
              system: 'legacy'
            }, `Legacy system call failed for ${operation}`);
            this.metrics.recordLegacySystemFailure(operation);
          }
        }
      }

      const duration = Date.now() - startTime;
      this.metrics.recordOperationSuccess(operation, duration);
      return primaryResult;

    } catch (e) {
      error = e as Error;
      this.logger.error({
        error,
        operation,
        duration: Date.now() - startTime
      }, `Dual operation failed for ${operation}`);
      this.metrics.recordOperationFailure(operation);
      throw error;
    }
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      ),
    ]);
  }

  private async compareResults<T>(
    operation: string,
    primary: T,
    secondary: T
  ): Promise<void> {
    try {
      const isEqual = JSON.stringify(primary) === JSON.stringify(secondary);
      if (!isEqual) {
        this.logger.warn({
          operation,
          comparison: {
            primary,
            secondary
          }
        }, `Results mismatch for ${operation}`);
        this.metrics.recordResultMismatch(operation);
      }
    } catch (e) {
      this.logger.warn({
        error: e,
        operation,
        phase: 'comparison'
      }, `Failed to compare results for ${operation}`);
    }
  }
}












































