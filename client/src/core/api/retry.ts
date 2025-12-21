/**
 * API Retry Module
 * 
 * Handles retry logic with exponential backoff, configurable retry conditions,
 * and comprehensive error handling for API requests.
 */

import { logger } from '../../utils/logger';
import { ErrorFactory, ErrorDomain, ErrorSeverity } from '../error';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

/**
 * Context information for retry operations
 */
export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  lastError: Error;
  totalDelay: number;
}

/**
 * Result of a retry operation
 */
export type RetryResult<T> = {
  success: true;
  data: T;
  attempts: number;
} | {
  success: false;
  error: Error;
  attempts: number;
};

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

/**
 * Retry handler class that manages retry logic for operations
 */
export class RetryHandler {
  private config: Required<RetryConfig>;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      retryCondition: config.retryCondition || this.defaultRetryCondition.bind(this),
      onRetry: config.onRetry || this.defaultOnRetry.bind(this),
      ...config
    } as Required<RetryConfig>;
  }

  /**
   * Executes an operation with retry logic
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          logger.info('Operation succeeded after retry', {
            component: 'RetryHandler',
            attempts: attempt + 1
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on the last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if we should retry this error
        if (!this.config.retryCondition(lastError, attempt)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(attempt);
        
        // Call retry callback
        this.config.onRetry(lastError, attempt, delay);
        
        // Wait before retrying
        await this.delay(delay);
      }
    }

    // All retries exhausted or retry condition failed
    throw ErrorFactory.createNetworkError(
      lastError?.message || 'Operation failed after retries',
      {
        domain: 'API' as ErrorDomain,
        severity: 'ERROR' as ErrorSeverity,
        context: {
          attempts: this.config.maxRetries + 1,
          originalError: lastError
        }
      }
    );
  }

  /**
   * Executes an operation with retry logic and returns a result object
   */
  async safeExecute<T>(operation: () => Promise<T>): Promise<RetryResult<T>> {
    const attempts = 0;
    
    try {
      const result = await this.execute(operation);
      return {
        success: true,
        data: result,
        attempts: attempts + 1
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        attempts: this.config.maxRetries + 1
      };
    }
  }

  /**
   * Calculates retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelay
    );

    // Add jitter (50-100% of calculated delay) to prevent thundering herd
    return exponentialDelay * (0.5 + Math.random() * 0.5);
  }

  /**
   * Default retry condition - retries on network errors and 5xx status codes
   */
  private defaultRetryCondition(error: Error, attempt: number): boolean {
    const errorMessage = error.message.toLowerCase();

    // Never retry 4xx errors except timeouts (408) and rate limits (429)
    if (errorMessage.includes('40') &&
        !errorMessage.includes('408') &&
        !errorMessage.includes('429')) {
      return false;
    }

    // Retry network errors and specific 5xx errors
    const isNetworkError = error.name === 'TypeError' || error.name === 'TimeoutError';
    const isServerError = errorMessage.includes('5');

    if (isNetworkError || isServerError) {
      // On final attempt, only retry specific recoverable errors
      if (attempt === this.config.maxRetries - 1) {
        return errorMessage.includes('503') ||
               errorMessage.includes('504') ||
               error.name === 'TypeError';
      }
      return true;
    }

    return false;
  }

  /**
   * Default retry callback with logging
   */
  private defaultOnRetry(error: Error, attempt: number, delayMs: number): void {
    logger.warn('Retrying operation after failure', {
      component: 'RetryHandler',
      attempt: attempt + 1,
      maxAttempts: this.config.maxRetries + 1,
      error: error.message,
      delayMs: Math.round(delayMs)
    });
  }

  /**
   * Promise-based delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Updates the retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      retryCondition: config.retryCondition || this.config.retryCondition,
      onRetry: config.onRetry || this.config.onRetry
    } as Required<RetryConfig>;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): Readonly<RetryConfig> {
    return { ...this.config };
  }
}

/**
 * Convenience function to retry an operation with default configuration
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const handler = new RetryHandler(config);
  return handler.execute(operation);
}

/**
 * Convenience function to safely retry an operation
 */
export async function safeRetryOperation<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<RetryResult<T>> {
  const handler = new RetryHandler(config);
  return handler.safeExecute(operation);
}

/**
 * Creates a retry handler with HTTP-specific retry conditions
 */
export function createHttpRetryHandler(config?: Partial<RetryConfig>): RetryHandler {
  return new RetryHandler({
    ...config,
    retryCondition: (error: Error, _attempt: number) => {
      const message = error.message.toLowerCase();
      
      // Retry on network errors
      if (error.name === 'TypeError' || error.name === 'TimeoutError') {
        return true;
      }
      
      // Retry on specific HTTP status codes
      if (message.includes('500') || 
          message.includes('502') || 
          message.includes('503') || 
          message.includes('504') ||
          message.includes('408') ||
          message.includes('429')) {
        return true;
      }
      
      return false;
    }
  });
}

/**
 * Service-specific retry configurations
 */
export const SERVICE_RETRY_CONFIGS = {
  auth: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2
  },
  bills: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 1.5
  },
  community: {
    maxRetries: 2,
    baseDelay: 800,
    maxDelay: 8000,
    backoffMultiplier: 2
  },
  search: {
    maxRetries: 4,
    baseDelay: 600,
    maxDelay: 15000,
    backoffMultiplier: 1.8
  }
} as const;

/**
 * Creates a retry handler for a specific service
 */
export function createServiceRetryHandler(
  service: keyof typeof SERVICE_RETRY_CONFIGS,
  overrides?: Partial<RetryConfig>
): RetryHandler {
  const serviceConfig = SERVICE_RETRY_CONFIGS[service];
  return new RetryHandler({
    ...serviceConfig,
    ...overrides
  });
}