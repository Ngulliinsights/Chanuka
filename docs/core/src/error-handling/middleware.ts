/**
 * Error Handling Middleware with Context Preservation
 * 
 * Comprehensive error categorization, response formatting, async context preservation,
 * Sentry integration, and global error handlers with graceful shutdown
 * Based on requirements from refined_cross_cutting.ts
 */

import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import * as Sentry from '@sentry/node';
import { BaseError, ErrorDomain, ErrorSeverity } from '../errors/base-error';
import { Logger } from '../logging';
import { logger } from '../utils/logger';

// Request context interface for async storage
export interface RequestContext {
  requestId: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  operationName?: string;
  startTime: number;
  metadata: Record<string, any>;
}

// Error handler configuration
export interface ErrorHandlerConfig {
  includeStackTrace?: boolean;
  enableSentry?: boolean;
  enableAutoRecovery?: boolean;
  enableContextPreservation?: boolean;
  sentryConfig?: {
    dsn?: string;
    environment?: string;
    sampleRate?: number;
    beforeSend?: (event: any) => any;
  };
  shouldReportToSentry?: (error: Error, context?: RequestContext) => boolean;
  formatError?: (error: BaseError, context?: RequestContext) => Record<string, any>;
  onError?: (error: BaseError, context?: RequestContext) => void;
}

// Global async local storage for request context
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get current request context from async local storage
 */
export function getCurrentContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Run function with request context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

/**
 * Run async function with request context
 */
export async function runWithContextAsync<T>(context: RequestContext, fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestContextStorage.run(context, async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Request context middleware - sets up async context for the request
 */
export function requestContextMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || 
      `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const traceId = (req.headers['x-trace-id'] as string) || 
      `trace_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const spanId = (req.headers['x-span-id'] as string) || 
      `span_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const context: RequestContext = {
      requestId,
      userId: (req as any).user?.id,
      traceId,
      spanId,
      operationName: `${req.method} ${req.path}`,
      startTime: Date.now(),
      metadata: {
        method: req.method,
        url: req.url,
        path: req.path,
        params: req.params,
        query: req.query,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || req.headers.referrer,
      },
    };

    // Set response headers for tracing
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-trace-id', traceId);
    res.setHeader('x-span-id', spanId);

    // Store context in request for backward compatibility
    (req as any).context = context;

    // Run the rest of the request in the async context
    runWithContext(context, () => {
      next();
    });
  };
}

/**
 * Normalize different error types into BaseError
 */
function normalizeError(error: Error, context?: RequestContext): BaseError {
  if (error instanceof BaseError) {
    // Enhance with context if not already present
    if (context && !error.metadata.correlationId) {
      return new BaseError(error.message, {
        statusCode: error.statusCode,
        code: error.code,
        details: error.details,
        isOperational: error.isOperational,
        domain: error.metadata.domain,
        severity: error.metadata.severity,
        correlationId: context.requestId,
        context: {
          ...error.metadata.context,
          ...context.metadata,
        },
        retryable: error.metadata.retryable,
        recoveryStrategies: error.metadata.recoveryStrategies,
      });
    }
    return error;
  }

  // Handle specific error types
  const errorMappings = [
    {
      condition: (err: Error) => err.name === 'ValidationError',
      factory: (err: Error) => new BaseError(err.message, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        domain: ErrorDomain.VALIDATION,
        severity: ErrorSeverity.LOW,
        details: (err as any).errors || (err as any).details,
        isOperational: true,
        correlationId: context?.requestId,
        context: context?.metadata,
      }),
    },
    {
      condition: (err: Error) => err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError',
      factory: (err: Error) => new BaseError('Authentication failed', {
        statusCode: 401,
        code: 'AUTHENTICATION_ERROR',
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        isOperational: true,
        correlationId: context?.requestId,
        context: context?.metadata,
      }),
    },
    {
      condition: (err: Error) => err.name === 'CastError' || err.message.includes('Cast to'),
      factory: (err: Error) => new BaseError('Invalid data format', {
        statusCode: 400,
        code: 'INVALID_DATA_FORMAT',
        domain: ErrorDomain.VALIDATION,
        severity: ErrorSeverity.LOW,
        isOperational: true,
        correlationId: context?.requestId,
        context: context?.metadata,
      }),
    },
    {
      condition: (err: Error) => err.name === 'MongoError' || err.name === 'MongooseError',
      factory: (err: Error) => new BaseError('Database operation failed', {
        statusCode: 500,
        code: 'DATABASE_ERROR',
        domain: ErrorDomain.DATABASE,
        severity: ErrorSeverity.HIGH,
        isOperational: true,
        correlationId: context?.requestId,
        context: context?.metadata,
        cause: error,
      }),
    },
    {
      condition: (err: Error) => err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT'),
      factory: (err: Error) => new BaseError('External service unavailable', {
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        domain: ErrorDomain.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        isOperational: true,
        retryable: true,
        correlationId: context?.requestId,
        context: context?.metadata,
        cause: error,
      }),
    },
  ];

  // Try to match specific error types
  for (const mapping of errorMappings) {
    if (mapping.condition(error)) {
      return mapping.factory(error);
    }
  }

  // Default to internal server error
  return new BaseError(error.message || 'Internal Server Error', {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.HIGH,
    isOperational: false,
    correlationId: context?.requestId,
    context: context?.metadata,
    cause: error,
  });
}

/**
 * Create structured error response
 */
function createErrorResponse(
  error: BaseError, 
  config: ErrorHandlerConfig, 
  context?: RequestContext
): Record<string, any> {
  const baseResponse = {
    error: {
      id: error.errorId,
      code: error.code,
      message: error.getUserMessage(),
      statusCode: error.statusCode,
      domain: error.metadata.domain,
      severity: error.metadata.severity,
      timestamp: error.metadata.timestamp.toISOString(),
      correlationId: error.metadata.correlationId,
      traceId: context?.traceId,
      spanId: context?.spanId,
      retryable: error.metadata.retryable,
    },
  };

  // Add details if present
  if (error.details) {
    (baseResponse.error as any).details = error.details;
  }

  // Add recovery strategies (non-automatic only)
  const manualStrategies = error.metadata.recoveryStrategies
    .filter(s => !s.automatic)
    .map(({ name, description }) => ({ name, description }));
  
  if (manualStrategies.length > 0) {
    (baseResponse.error as any).recoveryStrategies = manualStrategies;
  }

  // Add stack trace in development
  if (config.includeStackTrace && error.stack) {
    (baseResponse.error as any).stack = error.stack;
  }

  // Add request context in development
  if (config.includeStackTrace && context) {
    (baseResponse.error as any).request = {
      id: context.requestId,
      operation: context.operationName,
      duration: Date.now() - context.startTime,
    };
  }

  // Apply custom formatting
  if (config.formatError) {
    const customFormatting = config.formatError(error, context);
    return { ...baseResponse, ...customFormatting };
  }

  return baseResponse;
}

/**
 * Enhanced error handler middleware with context preservation
 */
export function errorHandlerMiddleware(config: ErrorHandlerConfig = {}) {
  const defaultConfig: ErrorHandlerConfig = {
    includeStackTrace: process.env.NODE_ENV === 'development',
    enableSentry: process.env.NODE_ENV === 'production',
    enableAutoRecovery: true,
    enableContextPreservation: true,
    shouldReportToSentry: (error: Error, context?: RequestContext) => {
      if (error instanceof BaseError) {
        return !error.isOperational || 
               error.metadata.severity === ErrorSeverity.CRITICAL ||
               error.metadata.severity === ErrorSeverity.HIGH;
      }
      return true;
    },
  };

  const mergedConfig = { ...defaultConfig, ...config };
  const logger = new Logger({ name: 'ErrorHandler', level: 'info' });

  // Initialize Sentry if enabled
  if (mergedConfig.enableSentry && mergedConfig.sentryConfig?.dsn) {
    Sentry.init({
      dsn: mergedConfig.sentryConfig.dsn,
      environment: mergedConfig.sentryConfig.environment || process.env.NODE_ENV,
      sampleRate: mergedConfig.sentryConfig.sampleRate || 1.0,
      beforeSend: mergedConfig.sentryConfig.beforeSend,
    });
  }

  return async (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(error);
    }

    // Get context from async storage or request
    const context = mergedConfig.enableContextPreservation 
      ? (getCurrentContext() || (req as any).context)
      : (req as any).context;

    // Normalize error with context
    const normalizedError = normalizeError(error, context);

    // Attempt automatic recovery if enabled
    if (
      mergedConfig.enableAutoRecovery &&
      normalizedError.metadata.retryable &&
      normalizedError.metadata.recoveryStrategies.some(s => s.automatic)
    ) {
      try {
        const recovered = await normalizedError.attemptRecovery();
        if (recovered) {
          logger.info({
            msg: 'Error automatically recovered',
            errorId: normalizedError.errorId,
            correlationId: context?.requestId,
            attemptCount: normalizedError.metadata.attemptCount,
          });
          return next(); // Continue with the request
        }
      } catch (recoveryError) {
        logger.error({
          msg: 'Recovery attempt failed',
          errorId: normalizedError.errorId,
          correlationId: context?.requestId,
          recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError,
        });
      }
    }

    // Enhanced logging with full context
    const logData = {
      msg: 'Request error',
      error: {
        id: normalizedError.errorId,
        message: normalizedError.message,
        code: normalizedError.code,
        domain: normalizedError.metadata.domain,
        severity: normalizedError.metadata.severity,
        stack: normalizedError.stack,
        cause: normalizedError.cause instanceof Error ? normalizedError.cause.message : undefined,
      },
      request: context ? {
        id: context.requestId,
        traceId: context.traceId,
        spanId: context.spanId,
        operation: context.operationName,
        duration: Date.now() - context.startTime,
        userId: context.userId,
        ...context.metadata,
      } : {
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
      metadata: normalizedError.metadata,
    };

    // Log based on severity
    switch (normalizedError.metadata.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error(logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(logData);
        break;
      default:
        logger.info(logData);
    }

    // Report to Sentry if enabled and meets criteria
    if (
      mergedConfig.enableSentry &&
      mergedConfig.shouldReportToSentry?.(normalizedError, context)
    ) {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setUser({ id: context.userId || 'anonymous' });
          scope.setTag('requestId', context.requestId);
          scope.setTag('traceId', context.traceId);
          scope.setTag('spanId', context.spanId);
          scope.setTag('operation', context.operationName);
        }
        
        scope.setTag('errorId', normalizedError.errorId);
        scope.setTag('domain', normalizedError.metadata.domain);
        scope.setTag('severity', normalizedError.metadata.severity);
        scope.setLevel(
          normalizedError.metadata.severity === ErrorSeverity.CRITICAL ? 'fatal' :
          normalizedError.metadata.severity === ErrorSeverity.HIGH ? 'error' :
          normalizedError.metadata.severity === ErrorSeverity.MEDIUM ? 'warning' : 'info'
        );
        
        scope.setContext('error', logData);
        Sentry.captureException(normalizedError);
      });
    }

    // Call custom error handler if provided
    if (mergedConfig.onError) {
      try {
        mergedConfig.onError(normalizedError, context);
      } catch (handlerError) {
        logger.error({
          msg: 'Custom error handler failed',
          handlerError: handlerError instanceof Error ? handlerError.message : handlerError,
        });
      }
    }

    // Create and send error response
    const errorResponse = createErrorResponse(normalizedError, mergedConfig, context);
    res.status(normalizedError.statusCode).json(errorResponse);
  };
}

/**
 * Setup global error handlers for uncaught exceptions and unhandled rejections
 */
export function setupGlobalErrorHandlers(logger: Logger, config: ErrorHandlerConfig = {}) {
  let isShuttingDown = false;

  const gracefulShutdown = (signal: string, error?: Error) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.error({
      msg: `Received ${signal}, initiating graceful shutdown`,
      error: error ? {
        message: error.message,
        stack: error.stack,
      } : undefined,
      timestamp: new Date().toISOString(),
    });

    // Give time for logs and Sentry to flush
    const shutdownTimeout = setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 5000);

    // Attempt graceful shutdown
    Promise.all([
      // Close HTTP servers
      new Promise<void>((resolve) => {
        // This would close your HTTP server
        // server.close(() => resolve());
        resolve();
      }),
      // Close database connections
      new Promise<void>((resolve) => {
        // This would close database connections
        resolve();
      }),
      // Flush Sentry
      config.enableSentry ? Sentry.close(2000) : Promise.resolve(),
    ]).then(() => {
      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed');
      process.exit(error ? 1 : 0);
    }).catch((shutdownError) => {
      clearTimeout(shutdownTimeout);
      logger.error({
        msg: 'Error during graceful shutdown',
        shutdownError: shutdownError instanceof Error ? shutdownError.message : shutdownError,
      });
      process.exit(1);
    });
  };

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    const normalizedError = normalizeError(error);
    
    logger.error({
      msg: 'Uncaught Exception',
      error: normalizedError.toJSON(),
      timestamp: new Date().toISOString(),
    });

    if (config.enableSentry) {
      Sentry.captureException(normalizedError);
    }

    gracefulShutdown('uncaughtException', error);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const normalizedError = normalizeError(error);

    logger.error({
      msg: 'Unhandled Rejection',
      error: normalizedError.toJSON(),
      promise: promise.toString(),
      timestamp: new Date().toISOString(),
    });

    if (config.enableSentry) {
      Sentry.captureException(normalizedError);
    }

    gracefulShutdown('unhandledRejection', error);
  });

  // Handle process termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle warnings
  process.on('warning', (warning) => {
    logger.warn({
      msg: 'Process Warning',
      warning: {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
      },
    });
  });
}

/**
 * Middleware to add error context to requests
 */
export function errorContextMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add error helper to request
    (req as any).createError = (message: string, options: any = {}) => {
      const context = getCurrentContext() || (req as any).context;
      return new BaseError(message, {
        ...options,
        correlationId: context?.requestId,
        context: context?.metadata,
      });
    };

    next();
  };
}

/**
 * Express error boundary for async route handlers
 */
export function asyncErrorBoundary(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = getCurrentContext() || (req as any).context;
    
    if (context) {
      runWithContext(context, async () => {
        try {
          await fn(req, res, next);
        } catch (error) {
          next(error);
        }
      });
    } else {
      fn(req, res, next).catch(next);
    }
  };
}

// Export context storage for advanced usage
export { requestContextStorage };






