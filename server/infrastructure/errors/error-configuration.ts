/**
 * Error Management Configuration
 *
 * Configures the @shared/core error management system for server use.
 * Sets up error reporters, handlers, and recovery patterns.
 */

import {
  ErrorReporter,
  ErrorHandler,
  CircuitBreaker,
  ErrorContext,
} from '@shared/core/observability/error-management';
import { logger } from '@shared/core';
import { ERROR_CODES, ERROR_STATUS_CODES, ERROR_MESSAGES } from '@shared/constants';

/**
 * Error Reporter Implementation
 * Reports errors to multiple backends (console, Sentry, API)
 */
export class ServerErrorReporter implements ErrorReporter {
  async report(error: Error, context?: ErrorContext): Promise<void> {
    const metadata = {
      errorId: (error as any).errorId,
      domain: (error as any).domain,
      severity: (error as any).severity,
      correlationId: context?.correlationId,
      userId: context?.userId,
      operation: context?.operation,
      ...context?.metadata,
    };

    // Log to console/file
    logger.error('Error reported', {
      message: error.message,
      stack: error.stack,
      ...metadata,
    });

    // Report to external service (e.g., Sentry)
    if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
      try {
        // This would be Sentry integration
        // Sentry.captureException(error, { tags: metadata });
      } catch (err) {
        logger.error('Failed to report to external service', { error: err });
      }
    }
  }
}

/**
 * Recovery Handler
 * Implements recovery strategies for different error types
 */
export class ServerErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    // Handle all server errors
    return true;
  }

  async handle(error: Error): Promise<{ recovered: boolean; newError?: Error }> {
    const errorCode = (error as any).code || 'INTERNAL_SERVER_ERROR';

    // Don't recover from client errors (4xx)
    if (ERROR_STATUS_CODES[errorCode as any] >= 400 && ERROR_STATUS_CODES[errorCode as any] < 500) {
      return { recovered: false, newError: error };
    }

    // Attempt to recover from server errors (5xx)
    logger.warn('Attempting error recovery', {
      errorCode,
      message: error.message,
    });

    // Recovery logic would go here
    // For now, just return that recovery was not attempted
    return { recovered: false, newError: error };
  }
}

/**
 * Circuit Breaker Configuration
 * Protects external service calls from cascading failures
 */
export class ServiceCircuitBreaker extends CircuitBreaker {
  constructor(
    name: string,
    private failureThreshold: number = 5,
    private resetTimeout: number = 60000
  ) {
    super(name, { failureThreshold, resetTimeout });
  }

  async executeWithFallback<T>(
    fn: () => Promise<T>,
    fallback: () => T
  ): Promise<T> {
    if (this.getState() === 'OPEN') {
      logger.warn(`Circuit breaker ${this.name} is OPEN, using fallback`);
      return fallback();
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      if (this.getState() === 'OPEN') {
        logger.error(`Circuit breaker ${this.name} opened after failure`);
        return fallback();
      }
      throw error;
    }
  }
}

/**
 * Error Context Builder
 * Creates error context from Express request
 */
export function createErrorContext(req: any, operation?: string): ErrorContext {
  return {
    correlationId: req.headers['x-correlation-id'] || req.id,
    userId: req.user?.id,
    operation: operation || `${req.method} ${req.path}`,
    metadata: {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      query: req.query,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Error Type Detection
 * Determines the error code based on error properties
 */
export function detectErrorCode(error: any): string {
  // Check for specific error properties
  if (error.code) return error.code;
  if (error.name === 'ValidationError') return ERROR_CODES.VALIDATION_ERROR;
  if (error.name === 'UnauthorizedError') return ERROR_CODES.NOT_AUTHENTICATED;
  if (error.name === 'ForbiddenError') return ERROR_CODES.ACCESS_DENIED;
  if (error.status === 404) return ERROR_CODES.BILL_NOT_FOUND; // or similar
  if (error.status === 503) return ERROR_CODES.SERVICE_UNAVAILABLE;
  if (error.status === 429) return ERROR_CODES.RATE_LIMITED;
  if (error.message?.includes('timeout')) return ERROR_CODES.TIMEOUT;

  // Default to internal server error
  return ERROR_CODES.INTERNAL_SERVER_ERROR;
}

/**
 * Error Response Builder
 * Creates standardized API error response
 */
export function buildErrorResponse(error: Error, context: ErrorContext) {
  const code = detectErrorCode(error);
  const statusCode = ERROR_STATUS_CODES[code as any] || 500;
  const message = ERROR_MESSAGES[code as any] || error.message;

  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      correlationId: context.correlationId,
      timestamp: context.metadata?.timestamp,
    },
    metadata: {
      operation: context.operation,
      userId: context.userId,
    },
  };
}

/**
 * Configure Error Handling System
 * Call this during server startup
 */
export function configureErrorHandling() {
  const reporter = new ServerErrorReporter();
  const handler = new ServerErrorHandler();

  return {
    reporter,
    handler,
    createCircuitBreaker: (name: string) => new ServiceCircuitBreaker(name),
    createContext: createErrorContext,
    detectCode: detectErrorCode,
    buildResponse: buildErrorResponse,
  };
}
