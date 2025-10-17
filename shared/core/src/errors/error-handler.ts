import { Request, Response, NextFunction } from 'express';
import { BaseError, ErrorDomain, ErrorSeverity } from './base-error';
import { Logger } from '../logging';

// Conditionally import Sentry to avoid build errors if not installed
let Sentry: any;
try {
  Sentry = require('@sentry/node');
} catch (error) {
  // Sentry not available, create a no-op implementation
  Sentry = {
    withScope: (fn: Function) => fn({ setUser: () => {}, setTag: () => {}, setContext: () => {} }),
    captureException: () => {},
  };
}

// Define a more flexible error response type that allows additional properties
interface ErrorResponse {
  error: {
    id: string;
    code: string;
    message: string;
    statusCode: number;
    domain: ErrorDomain;
    severity: ErrorSeverity;
    correlationId: string | undefined;
    timestamp: string;
    retryable: boolean;
    recoveryStrategies: Array<{ name: string; description: string }>;
    // Optional properties that might be added conditionally
    details?: any;
    stack?: string;
  };
}

interface ErrorHandlerOptions {
  /**
   * Whether to include stack traces in error responses
   */
  includeStackTrace?: boolean;

  /**
   * Whether to enable Sentry error reporting
   */
  enableSentry?: boolean;

  /**
   * Whether to attempt automatic error recovery
   */
  enableAutoRecovery?: boolean;

  /**
   * Function to determine if an error should be reported to Sentry
   */
  shouldReportToSentry?: (error: Error) => boolean;

  /**
   * Additional error response formatting
   */
  formatError?: (error: BaseError) => Record<string, any>;
}

const defaultOptions: ErrorHandlerOptions = {
  includeStackTrace: process.env.NODE_ENV === 'development',
  enableSentry: process.env.NODE_ENV === 'production',
  enableAutoRecovery: true,
  shouldReportToSentry: (error: Error) => {
    if (error instanceof BaseError) {
      return !error.isOperational || error.metadata.severity === ErrorSeverity.CRITICAL;
    }
    return true;
  },
};

/**
 * Creates a unified error response object with proper TypeScript typing
 */
function createErrorResponse(error: BaseError, includeStack: boolean): ErrorResponse {
  // Initialize the response with all required properties
  const response: ErrorResponse = {
    error: {
      id: error.errorId,
      code: error.code,
      message: error.getUserMessage(),
      statusCode: error.statusCode,
      domain: error.metadata.domain,
      severity: error.metadata.severity,
      correlationId: error.metadata.correlationId,
      timestamp: error.metadata.timestamp.toISOString(),
      retryable: error.metadata.retryable,
      recoveryStrategies: error.metadata.recoveryStrategies
        .filter(s => !s.automatic)
        .map(({ name, description }) => ({ name, description })),
    },
  };

  // Now we can safely add optional properties because they're defined in the interface
  if (error.details) {
    response.error.details = error.details;
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Normalizes different error types into BaseError instances
 * This function acts as a translation layer between various error formats
 */
function normalizeError(error: Error): BaseError {
  // If it's already our custom error type, use it as-is
  if (error instanceof BaseError) {
    return error;
  }

  // Handle ValidationError from express-validator
  // These are client-side errors that should be returned with helpful messages
  if (error.name === 'ValidationError') {
    return new BaseError(error.message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      details: (error as any).errors, // Cast needed because ValidationError isn't typed
      isOperational: true,
    });
  }

  // Handle JWT authentication errors
  // These indicate the user's token is invalid or expired
  if (error.name === 'JsonWebTokenError') {
    return new BaseError('Invalid token', {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      isOperational: true,
    });
  }

  // Handle all other unknown errors as internal server errors
  // These are likely programming errors or unexpected system failures
  return new BaseError(error.message || 'Internal Server Error', {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.HIGH,
    cause: error,
    isOperational: false, // Unknown errors are not operational by default
  });
}

export function unifiedErrorHandler(options: ErrorHandlerOptions = {}) {
  // Merge provided options with sensible defaults
  const mergedOptions = { ...defaultOptions, ...options };

  // Create a dedicated logger for error handling
  const logger = new Logger({
    name: 'ErrorHandler',
    level: 'info'
  });

  // Return the actual middleware function
  return async (error: Error, req: Request, res: Response, next: NextFunction) => {
    // If headers are already sent, we can't modify the response
    // Pass the error to Express's default handler
    if (res.headersSent) {
      return next(error);
    }

    // Convert any error type into our standardized BaseError format
    const normalizedError = normalizeError(error);
    
    // Extract request context for logging and debugging
    const requestId = req.headers['x-request-id'] || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';

    // Attempt automatic recovery if the error is recoverable
    // This is powerful - it can retry failed operations, reset connections, etc.
    if (
      mergedOptions.enableAutoRecovery &&
      normalizedError.metadata.retryable &&
      normalizedError.metadata.recoveryStrategies.length > 0
    ) {
      try {
        const recovered = await normalizedError.attemptRecovery();
        if (recovered) {
          logger.info({
            msg: 'Error automatically recovered',
            errorId: normalizedError.errorId,
            attemptCount: normalizedError.metadata.attemptCount,
          });
          return next(); // Continue processing the request normally
        }
      } catch (recoveryError) {
        logger.error({
          msg: 'Recovery attempt failed',
          errorId: normalizedError.errorId,
          recoveryError,
        });
        // Continue with normal error handling if recovery fails
      }
    }

    // Create comprehensive context for debugging
    // This gives developers everything they need to understand what went wrong
    const errorContext = {
      error: {
        id: normalizedError.errorId,
        message: normalizedError.message,
        code: normalizedError.code,
        domain: normalizedError.metadata.domain,
        severity: normalizedError.metadata.severity,
        stack: normalizedError.stack,
        cause: normalizedError.cause instanceof Error ? normalizedError.cause.message : undefined,
      },
      request: {
        id: requestId,
        method: req.method,
        url: req.url,
        path: req.path,
        params: req.params,
        query: req.query,
        userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || req.headers.referrer,
      },
      metadata: normalizedError.metadata,
    };

    // Log with appropriate severity level
    // Critical and high errors get full attention, while low-severity issues are just noted
    const logData = {
      msg: 'Error encountered',
      ...errorContext
    };

    switch (normalizedError.metadata.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error(logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(logData);
        break;
      default:
        logger.info(logData);
    }

    // Send error data to monitoring service (Sentry) for production tracking
    if (
      mergedOptions.enableSentry &&
      mergedOptions.shouldReportToSentry?.(normalizedError)
    ) {
      try {
        Sentry.withScope((scope: any) => {
          // Add contextual information to help with debugging
          scope.setUser({ id: userId });
          scope.setTag('requestId', requestId as string);
          scope.setTag('errorId', normalizedError.errorId);
          scope.setTag('domain', normalizedError.metadata.domain);
          scope.setTag('severity', normalizedError.metadata.severity);
          scope.setContext('error', errorContext);
          Sentry.captureException(normalizedError);
        });
      } catch (sentryError) {
        // Log Sentry errors but don't let them break the error response
        logger.error({
          msg: 'Failed to report error to Sentry',
          sentryError: sentryError instanceof Error ? sentryError.message : sentryError,
          originalErrorId: normalizedError.errorId,
        });
      }
    }

    // Create the response object that will be sent to the client
    let errorResponse = createErrorResponse(
      normalizedError,
      mergedOptions.includeStackTrace || false
    );

    // Allow custom formatting to modify the response structure
    // This is useful for API versioning or client-specific requirements
    if (mergedOptions.formatError) {
      const customFormatting = mergedOptions.formatError(normalizedError);
      errorResponse = {
        ...errorResponse,
        ...customFormatting,
      };
    }

    // Send the final error response to the client
    res.status(normalizedError.statusCode).json(errorResponse);
  };
}

/**
 * Sets up global error handlers for uncaught exceptions and unhandled rejections
 * These are safety nets for errors that slip through normal error handling
 */
export function setupGlobalErrorHandlers(logger: Logger) {
  // Handle synchronous errors that aren't caught by try-catch blocks
  process.on('uncaughtException', (error: Error) => {
    const normalizedError = normalizeError(error);
    logger.error({
      msg: 'Uncaught Exception - This indicates a serious programming error',
      error: normalizedError.toJSON(),
      timestamp: new Date().toISOString(),
    });

    // Report to monitoring in production
    if (process.env.NODE_ENV === 'production') {
      try {
        Sentry.captureException(normalizedError);
      } catch (sentryError) {
        // Log Sentry errors but don't let them break the process
        console.error('Failed to report uncaught exception to Sentry:', sentryError);
      }
    }

    // Give time for logs and monitoring data to be sent before shutting down
    // Uncaught exceptions usually indicate the application is in an unstable state
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Handle asynchronous errors that aren't caught by .catch() blocks
  process.on('unhandledRejection', (reason: any) => {
    const normalizedError = normalizeError(
      reason instanceof Error ? reason : new Error(String(reason))
    );

    logger.error({
      msg: 'Unhandled Promise Rejection - A promise was rejected but not handled',
      error: normalizedError.toJSON(),
      timestamp: new Date().toISOString(),
    });

    // Report to monitoring but don't crash the process
    // Unhandled rejections are often recoverable
    if (process.env.NODE_ENV === 'production') {
      try {
        Sentry.captureException(normalizedError);
      } catch (sentryError) {
        // Log Sentry errors but don't let them break the process
        console.error('Failed to report unhandled rejection to Sentry:', sentryError);
      }
    }
  });
}






