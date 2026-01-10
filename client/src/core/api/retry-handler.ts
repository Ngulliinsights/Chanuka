/**
 * Enhanced Retry Handler with Circuit Breaker Integration
 *
 * Provides exponential backoff retry logic that works with circuit breakers
 * and integrates with the error correlation system.
 */

import { logger } from '@client/shared/utils/logger';
import { BaseError, ErrorDomain, ErrorSeverity } from '../error';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryableStatusCodes: number[];
  retryableErrorCodes: string[];
}

export interface RetryContext {
  attempt: number;
  totalAttempts: number;
  lastError: Error;
  delay: number;
  correlationId?: string;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: BaseError;
  attempts: number;
  totalDelay: number;
}

/**
 * Default retry configuration optimized for web applications
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitterFactor: 0.1, // 10% jitter
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrorCodes: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR',
    'RATE_LIMITED',
    'SERVICE_UNAVAILABLE',
  ],
};

/**
 * Service-specific retry configurations
 */
export const SERVICE_RETRY_CONFIGS: Record<string, Partial<RetryConfig>> = {
  'government-data': {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 1.5,
  },
  'social-media': {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 2.5,
  },
  'external-api': {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 20000,
    backoffMultiplier: 2,
  },
  'internal-api': {
    maxAttempts: 4,
    baseDelay: 500,
    maxDelay: 15000,
    backoffMultiplier: 1.8,
  },
};

/**
 * Enhanced retry handler with exponential backoff and circuit breaker integration
 */
export class RetryHandler {
  private config: RetryConfig;
  private serviceName: string;

  constructor(serviceName: string = 'default', customConfig?: Partial<RetryConfig>) {
    this.serviceName = serviceName;

    // Merge default config with service-specific and custom configs
    const serviceConfig = SERVICE_RETRY_CONFIGS[serviceName] || {};
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...serviceConfig,
      ...customConfig,
    };
  }

  /**
   * Executes an operation with retry logic and exponential backoff
   */
  async execute<T>(operation: () => Promise<T>, correlationId?: string): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let totalDelay = 0;
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        logger.debug('Executing operation with retry', {
          component: 'RetryHandler',
          serviceName: this.serviceName,
          attempt,
          maxAttempts: this.config.maxAttempts,
          correlationId,
        });

        const result = await operation();

        const executionTime = Date.now() - startTime;
        logger.info('Operation succeeded', {
          component: 'RetryHandler',
          serviceName: this.serviceName,
          attempt,
          executionTime,
          totalDelay,
          correlationId,
        });

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalDelay,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        logger.warn('Operation failed, evaluating retry', {
          component: 'RetryHandler',
          serviceName: this.serviceName,
          attempt,
          maxAttempts: this.config.maxAttempts,
          error: lastError.message,
          correlationId,
        });

        // Don't retry on the last attempt
        if (attempt === this.config.maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          logger.info('Error is not retryable, stopping retry attempts', {
            component: 'RetryHandler',
            serviceName: this.serviceName,
            error: lastError.message,
            correlationId,
          });
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);
        totalDelay += delay;

        logger.info('Retrying operation after delay', {
          component: 'RetryHandler',
          serviceName: this.serviceName,
          attempt,
          delay,
          totalDelay,
          correlationId,
        });

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // All attempts failed
    const finalError = this.createFinalError(
      lastError!,
      this.config.maxAttempts,
      totalDelay,
      correlationId
    );

    logger.error('All retry attempts failed', {
      component: 'RetryHandler',
      serviceName: this.serviceName,
      maxAttempts: this.config.maxAttempts,
      totalDelay,
      finalError: finalError.message,
      correlationId,
    });

    return {
      success: false,
      error: finalError,
      attempts: this.config.maxAttempts,
      totalDelay,
    };
  }

  /**
   * Determines if an error is retryable based on configuration
   */
  private isRetryableError(error: Error): boolean {
    // Circuit breaker errors should not be retried
    if (error instanceof BaseError && error.code === 'CIRCUIT_BREAKER_OPEN') {
      return false;
    }

    // Check if it's a BaseError with retryable flag
    if (error instanceof BaseError) {
      // Check retryable flag first
      if (error.metadata.retryable === false) {
        return false;
      }

      // Check status code
      if (error.statusCode && this.config.retryableStatusCodes.includes(error.statusCode)) {
        return true;
      }

      // Check error code
      if (error.code && this.config.retryableErrorCodes.includes(error.code)) {
        return true;
      }

      // Default to retryable if it's a BaseError with retryable flag true
      return error.metadata.retryable;
    }

    // For non-BaseError instances, check common patterns
    const errorMessage = error.message.toLowerCase();
    const retryablePatterns = [
      'network error',
      'timeout',
      'connection',
      'fetch',
      'server error',
      'service unavailable',
      'rate limit',
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Calculates delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    const exponentialDelay =
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Apply maximum delay limit
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * this.config.jitterFactor * (Math.random() - 0.5);

    return Math.max(0, cappedDelay + jitter);
  }

  /**
   * Creates a comprehensive error for final failure
   */
  private createFinalError(
    lastError: Error,
    attempts: number,
    totalDelay: number,
    correlationId?: string
  ): BaseError {
    const isBaseError = lastError instanceof BaseError;

    return new BaseError(`Operation failed after ${attempts} attempts: ${lastError.message}`, {
      statusCode: isBaseError ? lastError.statusCode : 503,
      code: 'MAX_RETRIES_EXCEEDED',
      domain: isBaseError ? lastError.metadata.domain : ErrorDomain.NETWORK,
      severity: ErrorSeverity.HIGH,
      cause: lastError,
      correlationId: correlationId || (isBaseError ? lastError.metadata.correlationId : undefined),
      context: {
        serviceName: this.serviceName,
        maxAttempts: attempts,
        totalDelay,
        lastErrorCode: isBaseError ? lastError.code : 'UNKNOWN',
        retryConfig: this.config,
      },
      retryable: false, // Final error should not be retried
    });
  }

  /**
   * Sleep utility with promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Updates retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };

    logger.info('Retry configuration updated', {
      component: 'RetryHandler',
      serviceName: this.serviceName,
      newConfig: this.config,
    });
  }

  /**
   * Gets current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Gets service name
   */
  getServiceName(): string {
    return this.serviceName;
  }
}

/**
 * Factory function to create retry handlers for different services
 */
export function createRetryHandler(
  serviceName: string,
  customConfig?: Partial<RetryConfig>
): RetryHandler {
  return new RetryHandler(serviceName, customConfig);
}

/**
 * Convenience function for one-off retry operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  serviceName: string = 'default',
  config?: Partial<RetryConfig>,
  correlationId?: string
): Promise<T> {
  const retryHandler = createRetryHandler(serviceName, config);
  const result = await retryHandler.execute(operation, correlationId);

  if (result.success) {
    return result.data!;
  } else {
    throw result.error!;
  }
}

/**
 * Retry handler instances for common services
 */
export const retryHandlers = {
  governmentData: createRetryHandler('government-data'),
  socialMedia: createRetryHandler('social-media'),
  externalApi: createRetryHandler('external-api'),
  internalApi: createRetryHandler('internal-api'),
  default: createRetryHandler('default'),
};
