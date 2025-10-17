import { BaseError, ErrorSeverity } from '../../primitives/errors';

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
          console.warn(`No handler found for error: ${currentError.code}`);
        }
        return currentError;
      }

      try {
        if (this.options.enableLogging) {
          console.info(`Processing error ${currentError.code} with handler ${handler.name}`);
        }

        const result = await this.executeWithTimeout(
          () => handler.handle(currentError),
          this.options.timeout
        );

        if (result === null) {
          // Error was handled successfully
          if (this.options.enableLogging) {
            console.info(`Error ${currentError.code} handled successfully by ${handler.name}`);
          }
          return currentError; // Return original error but mark as handled
        }

        // Handler returned a new error, continue processing
        currentError = result;
        retryCount++;

      } catch (handlerError) {
        if (this.options.enableLogging) {
          console.error(`Handler ${handler.name} failed:`, handlerError);
        }
        retryCount++;
        // Continue to next handler
      }
    }

    // Max retries exceeded
    if (this.options.enableLogging) {
      console.warn(`Max retries exceeded for error: ${currentError.code}`);
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
    const recovered = await error.attemptRecovery();
    return recovered ? null : error;
  }
}

export class LoggingHandler implements ErrorHandler {
  readonly priority = 10;
  readonly name = 'logging';

  canHandle(error: BaseError): boolean {
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
    };

    switch (error.metadata.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('HIGH ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('MEDIUM ERROR:', logData);
        break;
      default:
        console.info('LOW ERROR:', logData);
    }

    return error; // Continue processing
  }
}

export class CircuitBreakerHandler implements ErrorHandler {
  readonly priority = 5;
  readonly name = 'circuit-breaker';

  constructor(private circuitBreaker: any) {} // Would be typed properly

  canHandle(error: BaseError): boolean {
    return error.metadata.retryable;
  }

  async handle(error: BaseError): Promise<BaseError | null> {
    // Integration with circuit breaker pattern
    // This would check circuit breaker state and potentially open it
    return error;
  }
}