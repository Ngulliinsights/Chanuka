/**
 * Consolidated Error Handler Chain
 * 
 * Provides a priority-based error processing system with built-in handlers
 * for recovery, logging, and circuit breaker integration.
 */

import { logger } from '@shared/core/src/observability/logging/logging-service.ts';
import { BaseError, ErrorSeverity } from '@shared/core/src/observability/error-management/errors/base-error.ts';
import { CircuitBreaker } from '@shared/core/src/observability/error-management/patterns/circuit-breaker.ts';

export interface ErrorHandler {
  readonly priority: number;
  readonly name: string;
  canHandle(error: BaseError): boolean;
  handle(error: BaseError): Promise<BaseError | null>;
}

export interface ErrorHandlerChainOptions {
  readonly maxRetries?: number;
  readonly timeout?: number;
  readonly enableLogging?: boolean;
}

/**
 * Error handler chain with priority-based processing
 * Processes errors through a series of handlers in priority order
 */
export class ErrorHandlerChain {
  private handlers: ErrorHandler[] = [];
  private readonly options: Required<ErrorHandlerChainOptions>;

  constructor(options: ErrorHandlerChainOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      timeout: options.timeout ?? 30000,
      enableLogging: options.enableLogging ?? true,
    };

    // Add default handlers
    this.addHandler(new RecoveryHandler());
    this.addHandler(new LoggingHandler());
  }

  /**
   * Add a handler to the chain
   */
  addHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
    // Sort handlers by priority (lower number = higher priority)
    this.handlers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a handler by name
   */
  removeHandler(name: string): void {
    this.handlers = this.handlers.filter(h => h.name !== name);
  }

  /**
   * Process an error through the handler chain
   */
  async process(error: BaseError): Promise<BaseError> {
    let currentError = error;
    let retryCount = 0;

    while (retryCount < this.options.maxRetries) {
      const handler = this.findHandler(currentError);

      if (!handler) {
        // No handler found, return original error
        if (this.options.enableLogging) {
          logger.warn('No handler found for error', {
            component: 'ErrorHandlerChain',
            errorCode: currentError.code,
            errorId: currentError.errorId
          });
        }
        return currentError;
      }

      try {
        if (this.options.enableLogging) {
          logger.info('Processing error with handler', {
            component: 'ErrorHandlerChain',
            errorCode: currentError.code,
            handlerName: handler.name,
            attempt: retryCount + 1
          });
        }

        const result = await this.executeWithTimeout(
          () => handler.handle(currentError),
          this.options.timeout
        );

        if (result === null) {
          // Error was handled successfully
          if (this.options.enableLogging) {
            logger.info('Error handled successfully', {
              component: 'ErrorHandlerChain',
              errorCode: currentError.code,
              handlerName: handler.name
            });
          }
          return currentError; // Return original error but mark as handled
        }

        // Handler returned a new error, continue processing
        currentError = result;
        retryCount++;

      } catch (handlerError) {
        if (this.options.enableLogging) {
          logger.error('Handler execution failed', {
            component: 'ErrorHandlerChain',
            handlerName: handler.name,
            error: handlerError
          });
        }
        retryCount++;
        // Continue to next handler
      }
    }

    // Max retries exceeded
    if (this.options.enableLogging) {
      logger.warn('Max retries exceeded for error', {
        component: 'ErrorHandlerChain',
        errorCode: currentError.code,
        maxRetries: this.options.maxRetries
      });
    }
    return currentError;
  }

  /**
   * Find the highest priority handler that can handle the error
   */
  private findHandler(error: BaseError): ErrorHandler | null {
    return this.handlers.find(handler => handler.canHandle(error)) || null;
  }

  /**
   * Execute a handler with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Handler execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): readonly ErrorHandler[] {
    return [...this.handlers];
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.handlers = [];
  }
}

/**
 * Built-in error handlers
 */

export class RecoveryHandler implements ErrorHandler {
  readonly priority = 1;
  readonly name = 'recovery';

  canHandle(error: BaseError): boolean {
    return error.metadata.retryable && error.metadata.recoveryStrategies.length > 0;
  }

  async handle(error: BaseError): Promise<BaseError | null> {
    try {
      const recovered = await error.attemptRecovery();
      return recovered ? null : error;
    } catch (recoveryError) {
      logger.error('Recovery attempt failed', {
        component: 'RecoveryHandler',
        errorId: error.errorId,
        error: recoveryError
      });
      return error;
    }
  }
}

export class LoggingHandler implements ErrorHandler {
  readonly priority = 10;
  readonly name = 'logging';

  canHandle(_error: BaseError): boolean {
    return true; // Can handle all errors
  }

  async handle(error: BaseError): Promise<BaseError | null> {
    const logData = {
      errorId: error.errorId,
      code: error.code,
      message: error.message,
      severity: error.metadata.severity,
      domain: error.metadata.domain,
      attemptCount: error.metadata.attemptCount,
      timestamp: error.metadata.timestamp.toISOString(),
      correlationId: error.metadata.correlationId,
      source: error.metadata.source
    };

    switch (error.metadata.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Critical error occurred', { component: 'ErrorHandler', ...logData });
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error occurred', { component: 'ErrorHandler', ...logData });
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error occurred', { component: 'ErrorHandler', ...logData });
        break;
      default:
        logger.info('Low severity error occurred', { component: 'ErrorHandler', ...logData });
    }

    return error; // Continue processing
  }
}

export class CircuitBreakerHandler implements ErrorHandler {
  readonly priority = 5;
  readonly name = 'circuit-breaker';

  constructor(private circuitBreaker: CircuitBreaker) {}

  canHandle(error: BaseError): boolean {
    return error.metadata.retryable;
  }

  async handle(error: BaseError): Promise<BaseError | null> {
    // Check if circuit breaker should be opened based on error patterns
    const metrics = this.circuitBreaker.getMetrics();
    
    if (metrics.failureRate > 50 && metrics.totalCalls > 10) {
      logger.warn('High failure rate detected, circuit breaker may open', {
        component: 'CircuitBreakerHandler',
        failureRate: metrics.failureRate,
        totalCalls: metrics.totalCalls
      });
    }

    return error; // Continue processing
  }
}

export class NotificationHandler implements ErrorHandler {
  readonly priority = 8;
  readonly name = 'notification';

  canHandle(error: BaseError): boolean {
    return error.metadata.severity === ErrorSeverity.CRITICAL;
  }

  async handle(error: BaseError): Promise<BaseError | null> {
    // Send notifications for critical errors
    logger.error('Critical error notification', {
      component: 'NotificationHandler',
      errorId: error.errorId,
      message: error.message,
      domain: error.metadata.domain
    });

    // Here you would integrate with notification services
    // (email, Slack, PagerDuty, etc.)

    return error; // Continue processing
  }
}








































