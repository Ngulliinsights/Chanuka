/**
 * Retry Strategy
 *
 * Implements intelligent retry logic with exponential backoff for database operations.
 * Distinguishes between transient and permanent errors to avoid unnecessary retries.
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  jitterFactor?: number;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

/**
 * PostgreSQL error codes representing permanent failures that should not
 * trigger retries. These indicate data integrity violations or structural
 * problems requiring immediate attention.
 */
const NON_RETRYABLE_ERROR_CODES = new Set([
  '23505', // unique_violation
  '23503', // foreign_key_violation
  '23514', // check_violation
  '22P02', // invalid_text_representation
  '42P01', // undefined_table
  '42703', // undefined_column
  '42P07', // duplicate_table
  '42P06', // duplicate_schema
  '42883', // undefined_function
]);

/**
 * PostgreSQL error codes representing transient failures suitable for retry.
 */
const RETRYABLE_ERROR_CODES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '53300', // too_many_connections
  '57P03', // cannot_connect_now
  '08006', // connection_failure
  '08003', // connection_does_not_exist
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '57014', // query_canceled
  '08P01', // protocol_violation
]);

/**
 * RetryStrategy
 *
 * Provides intelligent retry logic for database operations with exponential
 * backoff and jitter. Automatically identifies transient vs permanent errors.
 *
 * @example
 * ```typescript
 * const strategy = new RetryStrategy({
 *   maxRetries: 3,
 *   baseDelayMs: 1000,
 *   onRetry: (error, attempt, delay) => {
 *     console.log(`Retry attempt ${attempt} after ${delay}ms: ${error.message}`);
 *   }
 * });
 *
 * const result = await strategy.execute(async () => {
 *   return await database.query('SELECT * FROM users');
 * });
 * ```
 */
export class RetryStrategy {
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig) {
    this.config = {
      maxRetries: config.maxRetries,
      baseDelayMs: config.baseDelayMs,
      maxDelayMs: config.maxDelayMs ?? 10000,
      jitterFactor: config.jitterFactor ?? 0.1,
      onRetry: config.onRetry ?? (() => {}),
    };
  }

  /**
   * Execute an operation with retry logic
   *
   * @param operation - The async operation to execute
   * @returns The result of the operation
   * @throws The last error if all retries are exhausted
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryable(lastError)) {
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);

        // Invoke retry callback if provided
        this.config.onRetry(lastError, attempt + 1, delay);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Operation failed after all retries');
  }

  /**
   * Determine if an error is retryable
   *
   * @param error - The error to check
   * @returns True if the error is transient and should be retried
   */
  private isRetryable(error: Error): boolean {
    // Check for explicit PostgreSQL error codes
    if (this.hasErrorCode(error)) {
      const code = this.getErrorCode(error);
      
      // Explicitly non-retryable errors
      if (NON_RETRYABLE_ERROR_CODES.has(code)) {
        return false;
      }
      
      // Explicitly retryable errors
      if (RETRYABLE_ERROR_CODES.has(code)) {
        return true;
      }
    }

    // Fallback to pattern matching in error messages
    const errorMessage = error.message.toLowerCase();
    const transientPatterns = [
      'connection',
      'timeout',
      'deadlock',
      'serialization',
      'lock',
      'conflict',
      'temporarily unavailable',
      'too many connections',
      'connection refused',
      'connection reset',
      'econnrefused',
      'econnreset',
      'etimedout',
      'epipe',
    ];

    return transientPatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Check if error has a PostgreSQL error code
   */
  private hasErrorCode(error: Error): boolean {
    return 'code' in error && typeof (error as any).code === 'string';
  }

  /**
   * Get PostgreSQL error code from error
   */
  private getErrorCode(error: Error): string {
    return (error as any).code as string;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   *
   * Formula: min((baseDelay × 2^attempt) + jitter, maxDelay)
   *
   * The jitter prevents thundering herd problems where many clients
   * retry simultaneously.
   *
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelayMs * Math.pow(2, attempt);
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    const totalDelay = exponentialDelay + jitter;

    return Math.min(totalDelay, this.config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry configuration
   */
  getConfig(): Required<RetryConfig> {
    return { ...this.config };
  }

  /**
   * Get retry statistics for an operation
   *
   * @param operation - The operation to execute
   * @returns Statistics about the retry attempts
   */
  async executeWithStats<T>(
    operation: () => Promise<T>
  ): Promise<{
    result: T;
    attempts: number;
    totalDelay: number;
    errors: Error[];
  }> {
    const errors: Error[] = [];
    let attempts = 0;
    let totalDelay = 0;

    const wrappedOperation = async () => {
      attempts++;
      try {
        return await operation();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    };

    const result = await this.execute(wrappedOperation);

    return {
      result,
      attempts,
      totalDelay,
      errors,
    };
  }
}

/**
 * Create a retry strategy with default configuration
 */
export function createDefaultRetryStrategy(): RetryStrategy {
  return new RetryStrategy({
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    jitterFactor: 0.1,
  });
}

/**
 * Create a retry strategy optimized for production
 */
export function createProductionRetryStrategy(
  onRetry?: (error: Error, attempt: number, delayMs: number) => void
): RetryStrategy {
  return new RetryStrategy({
    maxRetries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitterFactor: 0.2,
    onRetry,
  });
}

/**
 * Create a retry strategy for testing (no retries)
 */
export function createTestRetryStrategy(): RetryStrategy {
  return new RetryStrategy({
    maxRetries: 0,
    baseDelayMs: 0,
  });
}
