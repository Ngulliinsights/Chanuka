/**
 * Retry Utilities (REFACTORED)
 * 
 * Exponential backoff and retry logic for resilient operations.
 * 
 * IMPROVEMENTS:
 * - ✅ Configurable retry strategies
 * - ✅ Exponential backoff
 * - ✅ Jitter support
 * - ✅ Typed errors
 * - ✅ Comprehensive logging
 */

import { logger } from '@/core/observability';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  factor: number;
  jitter: boolean;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number) => void;
}

export const RETRY_PRESETS = {
  DATABASE_OPERATION: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    factor: 2,
    jitter: true,
  } as RetryConfig,
  
  CONNECTION: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    factor: 2,
    jitter: true,
  } as RetryConfig,
  
  API_CALL: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    factor: 2,
    jitter: true,
  } as RetryConfig,
  
  QUICK: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
    factor: 2,
    jitter: false,
  } as RetryConfig,
};

/**
 * Execute operation with exponential backoff retry logic.
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    factor: 2,
    jitter: true,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (finalConfig.retryableErrors && !isRetryableError(error as Error, finalConfig.retryableErrors)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, finalConfig);

      logger.debug('Retrying operation', {
        attempt: attempt + 1,
        maxRetries: finalConfig.maxRetries,
        delay,
        error: (error as Error).message,
      });

      // Call onRetry callback if provided
      if (finalConfig.onRetry) {
        finalConfig.onRetry(error as Error, attempt + 1);
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  // All retries exhausted
  logger.error('All retry attempts exhausted', {
    maxRetries: finalConfig.maxRetries,
    lastError: lastError?.message,
  });

  throw lastError;
}

/**
 * Calculate delay with exponential backoff.
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(config.factor, attempt),
    config.maxDelay
  );

  if (config.jitter) {
    // Add random jitter (±25%)
    const jitterRange = exponentialDelay * 0.25;
    return exponentialDelay + (Math.random() * jitterRange * 2 - jitterRange);
  }

  return exponentialDelay;
}

/**
 * Check if error is retryable.
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  return retryableErrors.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry operation with simple exponential backoff.
 */
export async function simpleRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return retryWithBackoff(operation, { maxRetries });
}

/**
 * Execute operation with timeout.
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Execute operations in parallel with concurrency limit.
 */
export async function parallelLimit<T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  concurrency: number = 5
): Promise<void> {
  const results: Promise<void>[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = operation(item);
    results.push(promise);

    if (concurrency <= items.length) {
      const executingPromise = promise.then(() => {
        executing.splice(executing.indexOf(executingPromise), 1);
      });
      executing.push(executingPromise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }

  await Promise.all(results);
}

export default {
  retryWithBackoff,
  simpleRetry,
  withTimeout,
  parallelLimit,
  RETRY_PRESETS,
};
