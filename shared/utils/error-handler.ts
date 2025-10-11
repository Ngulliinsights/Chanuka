import { logger } from './logger';

/**
 * Error classification for better handling
 */
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  DATABASE = 'database',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  CIRCUIT_BREAKER = 'circuit_breaker',
  UNKNOWN = 'unknown'
}

/**
 * Enhanced error class with additional context
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();

    // Capture stack trace
    Error.captureStackTrace(this, AppError);
  }
}

/**
 * Error handler with circuit breaker pattern to prevent cascading failures
 */
class ErrorHandler {
  private errorCounts = new Map<string, number>();
  private lastErrorTime = new Map<string, number>();
  private readonly maxErrorsPerMinute = 10;
  private readonly circuitBreakerThreshold = 5;

  /**
   * Handles errors with circuit breaker logic
   */
  handleError(error: Error | AppError, context?: Record<string, any>): AppError {
    const errorKey = this.getErrorKey(error);
    const now = Date.now();
    
    // Reset counter if more than a minute has passed
    const lastTime = this.lastErrorTime.get(errorKey) || 0;
    if (now - lastTime > 60000) {
      this.errorCounts.set(errorKey, 0);
    }
    
    // Increment error count
    const currentCount = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, currentCount);
    this.lastErrorTime.set(errorKey, now);
    
    // Check if we should trigger circuit breaker
    if (currentCount >= this.circuitBreakerThreshold) {
      logger.error('Circuit breaker triggered for error type:', {
        errorType: errorKey,
        count: currentCount,
        threshold: this.circuitBreakerThreshold,
      });
    }
    
    // Convert to AppError if needed
    const appError = error instanceof AppError ? error : this.convertToAppError(error);
    
    // Log the error
    this.logError(appError, context);
    
    return appError;
  }

  /**
   * Converts generic errors to AppError instances
   */
  private convertToAppError(error: Error): AppError {
    // Database errors
    if (error.message.includes('connection') || error.message.includes('pool')) {
      return new AppError(
        'Database connection error',
        ErrorType.DATABASE,
        503,
        true,
        { originalError: error.message }
      );
    }
    
    // Network errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new AppError(
        'Request timeout',
        ErrorType.TIMEOUT,
        408,
        true,
        { originalError: error.message }
      );
    }
    
    // Circuit breaker errors
    if (error.message.includes('Circuit breaker')) {
      return new AppError(
        'Service temporarily unavailable',
        ErrorType.CIRCUIT_BREAKER,
        503,
        true,
        { originalError: error.message }
      );
    }
    
    // Default to unknown error
    return new AppError(
      error.message || 'An unknown error occurred',
      ErrorType.UNKNOWN,
      500,
      false,
      { originalError: error.message, stack: error.stack }
    );
  }

  /**
   * Generates a key for error tracking
   */
  private getErrorKey(error: Error): string {
    if (error instanceof AppError) {
      return error.type;
    }
    
    // Classify by error message patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('connection') || message.includes('pool')) {
      return ErrorType.DATABASE;
    }
    
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    
    if (message.includes('circuit breaker')) {
      return ErrorType.CIRCUIT_BREAKER;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * Logs errors with appropriate level based on severity
   */
  private logError(error: AppError, context?: Record<string, any>): void {
    const logData = {
      message: error.message,
      type: error.type,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      timestamp: error.timestamp,
      context: { ...error.context, ...context },
      stack: error.stack,
    };

    if (error.statusCode >= 500) {
      logger.error('Server error occurred:', logData);
    } else if (error.statusCode >= 400) {
      logger.warn('Client error occurred:', logData);
    } else {
      logger.info('Error handled:', logData);
    }
  }

  /**
   * Checks if error rate is too high for a specific error type
   */
  isErrorRateHigh(errorType: string): boolean {
    const count = this.errorCounts.get(errorType) || 0;
    return count >= this.maxErrorsPerMinute;
  }

  /**
   * Gets error statistics
   */
  getErrorStats(): Record<string, { count: number; lastOccurrence: Date }> {
    const stats: Record<string, { count: number; lastOccurrence: Date }> = {};
    
    for (const [errorType, count] of this.errorCounts.entries()) {
      const lastTime = this.lastErrorTime.get(errorType) || 0;
      stats[errorType] = {
        count,
        lastOccurrence: new Date(lastTime),
      };
    }
    
    return stats;
  }

  /**
   * Resets error counters (useful for testing or manual recovery)
   */
  reset(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
    logger.info('Error handler counters reset');
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export utility functions
export function createValidationError(message: string, field?: string): AppError {
  return new AppError(
    message,
    ErrorType.VALIDATION,
    400,
    true,
    { field }
  );
}

export function createAuthenticationError(message: string = 'Authentication required'): AppError {
  return new AppError(
    message,
    ErrorType.AUTHENTICATION,
    401,
    true
  );
}

export function createAuthorizationError(message: string = 'Insufficient permissions'): AppError {
  return new AppError(
    message,
    ErrorType.AUTHORIZATION,
    403,
    true
  );
}

export function createNotFoundError(message: string = 'Resource not found'): AppError {
  return new AppError(
    message,
    ErrorType.NOT_FOUND,
    404,
    true
  );
}

export function createConflictError(message: string = 'Resource conflict'): AppError {
  return new AppError(
    message,
    ErrorType.CONFLICT,
    409,
    true
  );
}

export function createDatabaseError(message: string = 'Database operation failed'): AppError {
  return new AppError(
    message,
    ErrorType.DATABASE,
    503,
    true
  );
}

/**
 * Async error wrapper that handles errors gracefully
 */
export function asyncErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const handledError = errorHandler.handleError(error as Error);
      throw handledError;
    }
  };
}

/**
 * Process-level error handlers to prevent crashes
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection:', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString(),
      timestamp: new Date().toISOString(),
    });
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}







