/**
 * Error Recovery Patterns
 *
 * Implements resilience patterns for handling transient failures:
 * - Retry with exponential backoff
 * - Circuit breaker
 * - Fallback values
 */

import { TIME_LIMITS } from '@shared/constants';
import { logger } from '@server/infrastructure/observability';

/**
 * Retry Options
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: unknown) => boolean;
}

/**
 * Retry Pattern Implementation
 * Retries failed operations with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = TIME_LIMITS.MAX_RETRIES,
    initialDelayMs = TIME_LIMITS.RETRY_INITIAL_DELAY_MS,
    maxDelayMs = TIME_LIMITS.RETRY_MAX_DELAY_MS,
    backoffMultiplier = TIME_LIMITS.RETRY_BACKOFF_MULTIPLIER,
    retryableErrors = isRetryableError,
  } = options;

  let lastError: any;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${maxAttempts} for ${operationName}`);
      return await fn();
    } catch (error) {
      lastError = error;

      if (!retryableErrors(error)) {
        logger.error(`Non-retryable error in ${operationName}`, { error });
        throw error;
      }

      if (attempt < maxAttempts) {
        const waitMs = Math.min(delayMs, maxDelayMs);
        logger.warn(`Retry ${operationName} after ${waitMs}ms`, {
          attempt,
          maxAttempts,
          error: error instanceof Error ? error.message : String(error),
        });

        await sleep(waitMs);
        delayMs = Math.floor(delayMs * backoffMultiplier);
      }
    }
  }

  logger.error(`All ${maxAttempts} attempts failed for ${operationName}`, {
    lastError,
  });
  throw lastError;
}

/**
 * Timeout Pattern
 * Wraps a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Fallback Pattern
 * Provides default value if operation fails
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallbackValue: T,
  operationName: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.warn(`Using fallback for ${operationName}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackValue;
  }
}

/**
 * Bulkhead Pattern
 * Limits concurrent operations to prevent resource exhaustion
 */
export class BulkheadExecutor {
  private activeCount = 0;
  private queuedTasks: Array<{
    fn: () => Promise<any>;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor(
    private maxConcurrency: number = 10,
    private operationName: string = 'operation'
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.maxConcurrency) {
      return this.runTask(fn);
    }

    return new Promise((resolve, reject) => {
      this.queuedTasks.push({ fn: fn as unknown, resolve, reject });
    });
  }

  private async runTask<T>(fn: () => Promise<T>): Promise<T> {
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queuedTasks.length > 0 && this.activeCount < this.maxConcurrency) {
      const { fn, resolve, reject } = this.queuedTasks.shift()!;
      this.runTask(fn).then(resolve, reject);
    }
  }

  getStatus() {
    return {
      active: this.activeCount,
      queued: this.queuedTasks.length,
      maxConcurrency: this.maxConcurrency,
      operationName: this.operationName,
    };
  }
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // HTTP errors
  if (error.status === 408 || error.status === 429 || error.status >= 500) {
    return true;
  }

  // Timeout errors
  if (error instanceof TimeoutError) {
    return true;
  }

  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Custom TimeoutError
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Recovery Chain
 * Combines multiple recovery strategies
 */
export class RecoveryChain<T> {
  private strategies: Array<() => Promise<T>> = [];

  addRetry(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): this {
    this.strategies.push(() => withRetry(fn, 'retry-strategy', options));
    return this;
  }

  addTimeout(
    fn: () => Promise<T>,
    timeoutMs: number
  ): this {
    this.strategies.push(() => withTimeout(fn(), timeoutMs, 'timeout-strategy'));
    return this;
  }

  addFallback(
    fn: () => Promise<T>,
    fallbackValue: T
  ): this {
    this.strategies.push(() => withFallback(fn, fallbackValue, 'fallback-strategy'));
    return this;
  }

  async execute(): Promise<T> {
    let lastError: any;

    for (const strategy of this.strategies) {
      try {
        return await strategy();
      } catch (error) {
        lastError = error;
        // Continue to next strategy
      }
    }

    throw lastError || new Error('No recovery strategies succeeded');
  }
}
