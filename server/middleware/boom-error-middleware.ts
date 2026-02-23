/**
 * Boom-Compatible Error Middleware
 *
 * Handles Boom errors and converts them to standardized API responses
 * while maintaining backward compatibility with existing error formats.
 */

import * as Boom from '@hapi/boom';
import { logger } from '@server/infrastructure/observability';
import type { ErrorResponse } from '@server/infrastructure/error-handling';
import { AuthenticatedRequest, getUserId } from '@server/middleware/auth-types';
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * Main Boom error handling middleware
 * Processes all errors and converts them to consistent API responses
 */
export function boomErrorMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  try {
    let boomError: Boom.Boom;

    // Handle different error types
    if (Boom.isBoom(error)) {
      // Already a Boom error - use directly
      boomError = error;
    } else if (error instanceof ZodError) {
      // Validation error from Zod
      const validationDetails = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      boomError = Boom.badRequest('Validation failed');
      boomError.output.payload.message = 'Validation failed';
      boomError.data = { validationErrors: validationDetails };
    } else if (error.name === 'ValidationError') {
      // Handle other validation errors
      boomError = Boom.badRequest(error.message || 'Validation failed');
    } else if (error.code === 'UNAUTHORIZED' || error.status === 401) {
      // Authentication errors
      boomError = Boom.unauthorized(error.message || 'Authentication required');
    } else if (error.code === 'FORBIDDEN' || error.status === 403) {
      // Authorization errors
      boomError = Boom.forbidden(error.message || 'Access denied');
    } else if (error.code === 'NOT_FOUND' || error.status === 404) {
      // Not found errors
      boomError = Boom.notFound(error.message || 'Resource not found');
    } else if (error.type === 'entity.parse.failed') {
      // JSON parsing errors
      boomError = Boom.badRequest('Invalid JSON in request body');
    } else if (error.type === 'entity.too.large') {
      // Request size errors
      boomError = Boom.entityTooLarge('Request entity too large');
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      // Timeout errors
      boomError = Boom.clientTimeout('Request timeout');
    } else {
      // Generic server errors
      const statusCode = error.status || error.statusCode || 500;
      const message = error.message || 'Internal server error';

      if (statusCode >= 500) {
        boomError = Boom.internal(message);
      } else if (statusCode >= 400) {
        boomError = Boom.badRequest(message);
      } else {
        boomError = Boom.internal(message);
      }
    }

    // Build unified error response
    const errorResponse = createErrorResponse(boomError, req);

    // Log the error with appropriate level
    logError(boomError, req, error);

    // Send the error response
    res.status(boomError.output.statusCode).json(errorResponse);

  } catch (middlewareError) {
    // Fallback error handling if middleware itself fails
    logger.error(
      {
        originalError: error?.message,
        middlewareError: middlewareError instanceof Error ? middlewareError.message : String(middlewareError),
        path: req.path,
        method: req.method
      },
      'Error in Boom error middleware'
    );

    // Send basic error response
    const fallbackResponse = {
      success: false,
      error: {
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred. Please try again.',
        category: 'system',
        retryable: false,
        timestamp: new Date().toISOString()
      },
      metadata: {
        service: 'legislative-platform',
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.status(500).json(fallbackResponse);
  }
}

/**
 * Create standardized error response from Boom error
 */
function createErrorResponse(boomError: Boom.Boom, req: Request): ErrorResponse {
  const authReq = req as AuthenticatedRequest;
  return {
    success: false,
    error: {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: boomError.output.payload.error || 'UNKNOWN_ERROR',
      message: boomError.message,
      category: mapStatusToCategory(boomError.output.statusCode),
      retryable: isRetryableStatus(boomError.output.statusCode),
      timestamp: new Date().toISOString()
    },
    metadata: {
      service: 'legislative-platform',
      requestId: authReq.requestId || req.headers['x-request-id'] as string
    }
  };
}

/**
 * Map HTTP status codes to error categories
 */
function mapStatusToCategory(statusCode: number): string {
  if (statusCode === 400) return 'validation';
  if (statusCode === 401) return 'authentication';
  if (statusCode === 403) return 'authorization';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 409) return 'conflict';
  if (statusCode === 429) return 'rate_limit';
  if (statusCode >= 500) return 'system';
  return 'system';
}

/**
 * Determine if status code represents a retryable error
 */
function isRetryableStatus(statusCode: number): boolean {
  return [429, 500, 502, 503, 504].includes(statusCode);
}

/**
 * Log error with appropriate level based on severity
 */
function logError(boomError: Boom.Boom, req: Request, originalError: unknown): void {
  const statusCode = boomError.output.statusCode;
  const logData = {
    statusCode,
    path: req.path,
    method: req.method,
    user_id: getUserId(req) || undefined,
    requestId: req.headers['x-request-id'],
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    originalErrorType: (originalError as Error)?.constructor?.name,
    originalErrorMessage: (originalError as Error)?.message,
  };

  if (statusCode >= 500) {
    logger.error(logData, boomError.message);
  } else if (statusCode >= 400) {
    logger.warn(logData, boomError.message);
  } else {
    logger.info(logData, boomError.message);
  }
}

/**
 * Middleware to catch async errors and pass them to error handler
 */
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware to add request context for error tracking
 */
export function errorContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  
  // Add request ID if not present
  if (!req.headers['x-request-id']) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-request-id'] = requestId;
    // Also set it as a property for easier access
    authReq.requestId = requestId;
  } else {
    authReq.requestId = req.headers['x-request-id'] as string;
  }

  // Add timestamp
  authReq.startTime = Date.now();

  next();
}
