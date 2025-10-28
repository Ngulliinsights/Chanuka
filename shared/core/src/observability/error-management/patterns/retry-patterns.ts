/**
 * Retry Patterns for Error Recovery
 * 
 * Provides various retry strategies for handling transient failures
 * with exponential backoff, jitter, and circuit breaker integration.
 */

import { BaseError, ErrorSeverity } from '../errors/base-error.js';
import { logger } from '../../logging/index.js';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface RetryResult<T> {
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  success: boolean;
}

/**
 * Exponential backoff retry with jitter
 */
export class ExponentialBackoffRetry {
  private readonly options: Required<RetryOptions>;

  constructor(options: RetryOptions = {}) {
    const defaults: Required<RetryOptions> = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error: Error) => this.isRetryableError(error),
      onRetry: () => {},
    };

    this.options = { ...defaults, ...options };
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    let lastError: Error = new Error('No attempts made');
    
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        const result = await action();
        
        if (attempt > 1) {
          logger.info('Retry succeeded', {
            component: 'RetryPattern',
            attempt,
            totalTime: Date.now() - startTime
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on last attempt or if error is not retryable
        if (attempt === this.options.maxAttempts || !this.options.retryCondition(lastError)) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        
        logger.warn('Retry attempt failed, retrying', {
          component: 'RetryPattern',
          attempt,
          nextDelay: delay,
          error: lastError.message
        });

        this.options.onRetry(lastError, attempt);
        await this.sleep(delay);
      }
    }

    // All attempts failed
    throw new BaseError(`Operation failed after ${this.options.maxAttempts} attempts`, {
      code: 'RETRY_EXHAUSTED',
      cause: lastError,
      details: {
        attempts: this.options.maxAttempts,
        totalTime: Date.now() - startTime,
        lastError: lastError.message
      }
    });
  }

  private calculateDelay(attempt: number): number {
    let delay = this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, this.options.maxDelay);
    
    // Apply jitter to prevent thundering herd
    if (this.options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private isRetryableError(error: Error): boolean {
    // BaseError with retryable flag
    if (error instanceof BaseError) {
      return error.metadata.retryable;
    }

    // Network errors are generally retryable
    if (error.message.includes('ECONNRESET') || 
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')) {
      return true;
    }

    // HTTP status codes that are retryable
    if ('statusCode' in error) {
      const statusCode = (error as any).statusCode;
      return statusCode >= 500 || statusCode === 429 || statusCode === 408;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Linear backoff retry (constant delay between attempts)
 */
export class LinearBackoffRetry {
  private readonly options: Required<Omit<RetryOptions, 'backoffMultiplier'>>;

  constructor(options: Omit<RetryOptions, 'backoffMultiplier'> = {}) {
    const defaults: Required<Omit<RetryOptions, 'backoffMultiplier'>> = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      jitter: false,
      retryCondition: (error: Error) => this.isRetryableError(error),
      onRetry: () => {},
    };

    this.options = { ...defaults, ...options };
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    let lastError: Error = new Error('No attempts made');
    
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.options.maxAttempts || !this.options.retryCondition(lastError)) {
          break;
        }

        let delay = this.options.baseDelay;
        if (this.options.jitter) {
          delay = delay * (0.5 + Math.random() * 0.5);
        }

        this.options.onRetry(lastError, attempt);
        await this.sleep(delay);
      }
    }

    throw new BaseError(`Linear retry failed after ${this.options.maxAttempts} attempts`, {
      code: 'LINEAR_RETRY_EXHAUSTED',
      cause: lastError,
      details: {
        attempts: this.options.maxAttempts,
        totalTime: Date.now() - startTime
      }
    });
  }

  private isRetryableError(error: Error): boolean {
    if (error instanceof BaseError) {
      return error.metadata.retryable;
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Immediate retry (no delay between attempts)
 */
export class ImmediateRetry {
  constructor(private readonly maxAttempts: number = 3) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('No attempts made');
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxAttempts) {
          break;
        }
      }
    }

    throw new BaseError(`Immediate retry failed after ${this.maxAttempts} attempts`, {
      code: 'IMMEDIATE_RETRY_EXHAUSTED',
      cause: lastError,
      details: { attempts: this.maxAttempts }
    });
  }
}

/**
 * Utility function to create retry strategies
 */
export function createRetryStrategy(type: 'exponential' | 'linear' | 'immediate', options?: RetryOptions) {
  switch (type) {
    case 'exponential':
      return new ExponentialBackoffRetry(options);
    case 'linear':
      return new LinearBackoffRetry(options);
    case 'immediate':
      return new ImmediateRetry(options?.maxAttempts);
    default:
      throw new Error(`Unknown retry strategy: ${type}`);
  }
}

/**
 * Decorator for automatic retry on method calls
 */
export function retry(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const retryStrategy = new ExponentialBackoffRetry(options);

    descriptor.value = async function (...args: any[]) {
      return retryStrategy.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}





































