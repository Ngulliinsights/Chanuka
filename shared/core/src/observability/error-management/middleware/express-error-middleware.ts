/**
 * Express Error Middleware
 * 
 * Consolidated Express.js error handling middleware that integrates
 * with the unified error management system.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseError, ErrorDomain, ErrorSeverity } from '../errors/base-error.js';
import { ErrorHandlerChain } from '../handlers/error-handler-chain.js';
import { logger } from '../../logging/index.js';

export interface ErrorMiddlewareOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
  handleChain?: ErrorHandlerChain;
  correlationIdHeader?: string;
}

/**
 * Express error handling middleware
 */
export function createErrorMiddleware(options: ErrorMiddlewareOptions = {}) {
  const {
    includeStackTrace = process.env.NODE_ENV === 'development',
    logErrors = true,
    handleChain = new ErrorHandlerChain(),
    correlationIdHeader = 'x-correlation-id'
  } = options;

  return async (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(error);
    }

    // Convert to BaseError if not already
    let baseError: BaseError;
    if (error instanceof BaseError) {
      baseError = error;
    } else {
      baseError = convertToBaseError(error, req);
    }

    // Add correlation ID from request
    const correlationId = req.headers[correlationIdHeader] as string;
    if (correlationId && !baseError.metadata.correlationId) {
      // Create new error with correlation ID
      baseError = new BaseError(baseError.message, {
        ...baseError,
        correlationId,
        context: {
          ...baseError.metadata.context,
          requestPath: req.path,
          requestMethod: req.method,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });
    }

    // Process through error handler chain
    try {
      baseError = await handleChain.process(baseError);
    } catch (chainError) {
      logger.error('Error handler chain failed', {
        component: 'ErrorMiddleware',
        originalError: baseError.errorId,
        chainError
      });
    }

    // Log the error if enabled
    if (logErrors) {
      logger.error('Request error', {
        component: 'ErrorMiddleware',
        errorId: baseError.errorId,
        path: req.path,
        method: req.method,
        statusCode: baseError.statusCode,
        correlationId: baseError.metadata.correlationId
      });
    }

    // Prepare response
    const response: any = {
      error: {
        message: baseError.getUserMessage(),
        code: baseError.code,
        ...(baseError.details && { details: baseError.details }),
        ...(correlationId && { correlationId }),
        timestamp: new Date().toISOString()
      }
    };

    // Include stack trace in development
    if (includeStackTrace && baseError.stack) {
      response.error.stack = baseError.stack;
    }

    // Include error ID for tracking
    response.error.id = baseError.errorId;

    // Set appropriate headers
    res.status(baseError.statusCode);
    res.set('Content-Type', 'application/json');

    // Add retry-after header for retryable errors
    if (baseError.metadata.retryable && baseError.details?.retryAfter) {
      res.set('Retry-After', baseError.details.retryAfter.toString());
    }

    res.json(response);
  };
}

/**
 * Convert generic Error to BaseError
 */
function convertToBaseError(error: Error, req: Request): BaseError {
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return new BaseError(error.message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      cause: error
    });
  }

  if (error.name === 'CastError' || error.name === 'MongoError') {
    return new BaseError('Database operation failed', {
      statusCode: 500,
      code: 'DATABASE_ERROR',
      domain: ErrorDomain.DATABASE,
      severity: ErrorSeverity.HIGH,
      cause: error
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return new BaseError('Invalid authentication token', {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      cause: error
    });
  }

  if (error.name === 'TokenExpiredError') {
    return new BaseError('Authentication token expired', {
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      cause: error
    });
  }

  // Default conversion
  return new BaseError(error.message || 'Internal server error', {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.HIGH,
    cause: error,
    context: {
      requestPath: req.path,
      requestMethod: req.method
    }
  });
}

/**
 * Async error wrapper for Express routes
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new BaseError(`Route ${req.path} not found`, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    domain: ErrorDomain.SYSTEM,
    severity: ErrorSeverity.LOW,
    context: {
      path: req.path,
      method: req.method
    }
  });

  next(error);
}