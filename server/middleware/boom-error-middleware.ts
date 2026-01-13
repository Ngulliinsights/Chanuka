/**
 * Boom-Compatible Error Middleware
 *
 * Handles Boom errors and converts them to standardized API responses
 * while maintaining backward compatibility with existing error formats.
 */

import * as Boom from '@hapi/boom';
import { logger  } from '@shared/core';
import { errorAdapter } from '@shared/infrastructure/errors/error-adapter';
import { ErrorResponse } from '@shared/infrastructure/errors/error-standardization';
import { NextFunction,Request, Response } from 'express';
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
    let errorResponse: ErrorResponse;

    // Handle different error types
    if (Boom.isBoom(error)) {
      // Already a Boom error - use directly
      boomError = error;
      errorResponse = errorAdapter.toErrorResponse(boomError);
    } else if (error instanceof ZodError) {
      // Validation error from Zod
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.input
      }));

      const validationResult = errorAdapter.createValidationError(
        validationErrors,
        {
          service: 'api-middleware',
          operation: req.method + ' ' + req.path,
          requestId: req.headers['x-request-id'] as string,
          user_id: (req as any).user?.id
        }
      );

      if (validationResult.isErr()) {
        boomError = Boom.badRequest(validationResult.error.message);
        boomError.data = validationResult.error;
        errorResponse = {
          success: false,
          error: {
            id: validationResult.error.id,
            code: validationResult.error.code,
            message: validationResult.error.userMessage,
            category: validationResult.error.category,
            retryable: validationResult.error.retryable,
            timestamp: validationResult.error.context.timestamp.toISOString()
          },
          metadata: {
            service: validationResult.error.context.service,
            requestId: validationResult.error.context.requestId
          }
        };
      } else {
        // Fallback - should not happen
        boomError = Boom.badRequest('Validation failed');
        errorResponse = createFallbackErrorResponse(boomError, req);
      }
    } else if (error.name === 'ValidationError') {
      // Handle other validation errors
      const validationResult = errorAdapter.createValidationError(
        [{ field: 'input', message: error.message }],
        {
          service: 'api-middleware',
          operation: req.method + ' ' + req.path,
          requestId: req.headers['x-request-id'] as string,
          user_id: (req as any).user?.id
        }
      );

      if (validationResult.isErr()) {
        boomError = Boom.badRequest(validationResult.error.message);
        boomError.data = validationResult.error;
        errorResponse = errorAdapter.toErrorResponse(boomError);
      } else {
        boomError = Boom.badRequest(error.message);
        errorResponse = createFallbackErrorResponse(boomError, req);
      }
    } else if (error.code === 'UNAUTHORIZED' || error.status === 401) {
      // Authentication errors
      const authResult = errorAdapter.createAuthenticationError(
        'invalid_token',
        {
          service: 'api-middleware',
          operation: req.method + ' ' + req.path,
          requestId: req.headers['x-request-id'] as string,
          user_id: (req as any).user?.id
        }
      );

      if (authResult.isErr()) {
        boomError = Boom.unauthorized(authResult.error.message);
        boomError.data = authResult.error;
        errorResponse = errorAdapter.toErrorResponse(boomError);
      } else {
        boomError = Boom.unauthorized(error.message || 'Authentication required');
        errorResponse = createFallbackErrorResponse(boomError, req);
      }
    } else if (error.code === 'FORBIDDEN' || error.status === 403) {
      // Authorization errors
      const authzResult = errorAdapter.createAuthorizationError(
        req.path,
        req.method,
        {
          service: 'api-middleware',
          operation: req.method + ' ' + req.path,
          requestId: req.headers['x-request-id'] as string,
          user_id: (req as any).user?.id
        }
      );

      if (authzResult.isErr()) {
        boomError = errorAdapter.toBoom(authzResult.error);
        errorResponse = errorAdapter.toErrorResponse(boomError);
      } else {
        boomError = Boom.forbidden(error.message || 'Access denied');
        errorResponse = createFallbackErrorResponse(boomError, req);
      }
    } else if (error.code === 'NOT_FOUND' || error.status === 404) {
      // Not found errors
      const notFoundResult = errorAdapter.createNotFoundError(
        'Resource',
        req.path,
        {
          service: 'api-middleware',
          operation: req.method + ' ' + req.path,
          requestId: req.headers['x-request-id'] as string,
          user_id: (req as any).user?.id
        }
      );

      if (notFoundResult.isErr()) {
        boomError = errorAdapter.toBoom(notFoundResult.error);
        errorResponse = errorAdapter.toErrorResponse(boomError);
      } else {
        boomError = Boom.notFound(error.message || 'Resource not found');
        errorResponse = createFallbackErrorResponse(boomError, req);
      }
    } else if (error.type === 'entity.parse.failed') {
      // JSON parsing errors
      const validationResult = errorAdapter.createValidationError(
        [{ field: 'body', message: 'Invalid JSON in request body' }],
        {
          service: 'api-middleware',
          operation: req.method + ' ' + req.path,
          requestId: req.headers['x-request-id'] as string,
          user_id: (req as any).user?.id
        }
      );

      if (validationResult.isErr()) {
        boomError = errorAdapter.toBoom(validationResult.error);
        errorResponse = errorAdapter.toErrorResponse(boomError);
      } else {
        boomError = Boom.badRequest('Invalid JSON in request body');
        errorResponse = createFallbackErrorResponse(boomError, req);
      }
    } else if (error.type === 'entity.too.large') {
      // Request size errors
      boomError = Boom.entityTooLarge('Request entity too large');
      errorResponse = createFallbackErrorResponse(boomError, req);
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      // Timeout errors
      boomError = Boom.clientTimeout('Request timeout');
      errorResponse = createFallbackErrorResponse(boomError, req);
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

      errorResponse = createFallbackErrorResponse(boomError, req);
    }

    // Log the error with appropriate level
    logError(boomError, req, error);

    // Check if we should alert on this error
    if (errorAdapter.shouldAlert(boomError)) {
      logger.error('High-frequency or critical error detected', {
        errorId: errorResponse.error.id,
        code: errorResponse.error.code,
        path: req.path,
        method: req.method,
        user_id: (req as any).user?.id,
        requestId: req.headers['x-request-id']
      });
    }

    // Send the error response
    res.status(boomError.output.statusCode).json(errorResponse);

  } catch (middlewareError) {
    // Fallback error handling if middleware itself fails
    logger.error('Error in Boom error middleware', {
      originalError: error?.message,
      middlewareError: middlewareError instanceof Error ? middlewareError.message : String(middlewareError),
      path: req.path,
      method: req.method
    });

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
 * Create fallback error response when adapter methods fail
 */
function createFallbackErrorResponse(boomError: Boom.Boom, req: Request): ErrorResponse {
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
      requestId: (req as any).requestId || req.headers['x-request-id'] as string
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
function logError(boomError: Boom.Boom, req: Request, originalError: any): void {
  const statusCode = boomError.output.statusCode;
  const logData = {
    statusCode,
    path: req.path,
    method: req.method,
    user_id: (req as any).user?.id,
    requestId: req.headers['x-request-id'],
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    originalErrorType: originalError?.constructor?.name,
    originalErrorMessage: originalError?.message
  };

  if (statusCode >= 500) {
    logger.error(boomError.message, logData, originalError);
  } else if (statusCode >= 400) {
    logger.warn(boomError.message, logData);
  } else {
    logger.info(boomError.message, logData);
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
  res: Response,
  next: NextFunction
): void {
  // Add request ID if not present
  if (!req.headers['x-request-id']) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-request-id'] = requestId;
    // Also set it as a property for easier access
    (req as any).requestId = requestId;
  } else {
    (req as any).requestId = req.headers['x-request-id'];
  }

  // Add timestamp
  (req as any).startTime = Date.now();

  next();
}
