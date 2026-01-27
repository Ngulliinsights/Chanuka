/**
 * Unified Error Middleware
 *
 * Integrates @shared/core error management with server-specific configuration.
 * This replaces the boom-error-middleware with a more comprehensive system.
 */

// eslint-disable-next-line import/order
import { ERROR_CODES } from '@shared/constants';
import { logger } from '@shared/core';
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

class BaseError extends Error {
  constructor(
    message: string,
    public details: any = {}
  ) {
    super(message);
    this.name = 'BaseError';
  }
  statusCode = 500;
  code = ERROR_CODES.INTERNAL_SERVER_ERROR;
  override stack?: string;
}

function createErrorContext(req: Request) {
  return {
    method: req.method,
    url: req.url,
    ip: req.ip,
    correlationId: req.headers['x-correlation-id'] || '',
  };
}

/**
 * Create unified error middleware combining @shared/core with server configuration
 */
export function createUnifiedErrorMiddleware() {
  /**
   * Error handling middleware
   */
  return async (error: any, req: Request, res: Response, next: NextFunction) => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(error);
    }

    try {
      const context = createErrorContext(req);

      // Convert common error types to BaseError
      let baseError: BaseError;

      if (error instanceof BaseError) {
        baseError = error;
      } else if (error instanceof ZodError) {
        // Handle Zod validation errors
        const fields = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join('.');
            if (!acc[path]) acc[path] = [];
            acc[path].push(err.message);
            return acc;
          },
          {} as Record<string, string[]>
        );

        baseError = new BaseError('Validation failed', {
          statusCode: 400,
          code: ERROR_CODES.VALIDATION_ERROR,
          domain: 'VALIDATION' as any,
          severity: 'LOW' as any,
          details: fields,
          context,
          correlationId: context.correlationId,
        });
      } else if (error.name === 'ValidationError') {
        baseError = new BaseError(error.message || 'Validation failed', {
          statusCode: 400,
          code: ERROR_CODES.VALIDATION_ERROR,
          domain: 'VALIDATION' as any,
          severity: 'LOW' as any,
          cause: error,
          context,
          correlationId: context.correlationId,
        });
      } else if (error.status === 401 || error.code === 'UNAUTHORIZED') {
        baseError = new BaseError('Authentication required', {
          statusCode: 401,
          code: ERROR_CODES.NOT_AUTHENTICATED,
          domain: 'AUTHENTICATION' as any,
          severity: 'MEDIUM' as any,
          cause: error,
          context,
          correlationId: context.correlationId,
        });
      } else if (error.status === 403 || error.code === 'FORBIDDEN') {
        baseError = new BaseError('Access denied', {
          statusCode: 403,
          code: ERROR_CODES.ACCESS_DENIED,
          domain: 'AUTHORIZATION' as any,
          severity: 'MEDIUM' as any,
          cause: error,
          context,
          correlationId: context.correlationId,
        });
      } else if (error.status === 404) {
        baseError = new BaseError('Resource not found', {
          statusCode: 404,
          code: ERROR_CODES.BILL_NOT_FOUND,
          domain: 'BUSINESS' as any,
          severity: 'LOW' as any,
          cause: error,
          context,
          correlationId: context.correlationId,
        });
      } else {
        // Generic server error
        const statusCode = error.status || error.statusCode || 500;
        baseError = new BaseError(error.message || 'Internal server error', {
          statusCode,
          code: statusCode >= 500 ? ERROR_CODES.INTERNAL_SERVER_ERROR : ERROR_CODES.VALIDATION_ERROR,
          domain: statusCode >= 500 ? 'INTERNAL' : 'VALIDATION',
          severity: statusCode >= 500 ? 'HIGH' : 'LOW',
          cause: error,
          context,
          correlationId: context.correlationId,
        });
      }

      // Build response
      const statusCode = baseError.statusCode || 500;
      const message = baseError.message;

      res.status(statusCode).json({
        success: false,
        error: {
          code: baseError.code,
          message,
          statusCode,
          correlationId: context.correlationId,
          timestamp: new Date().toISOString(),
        },
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            details: baseError.details,
            stack: baseError.stack,
          },
        }),
      });
    } catch (handlerError) {
      // Fallback error response if middleware fails
      logger.error('Error middleware failed', { error: handlerError });

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            statusCode: 500,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  };
}

/**
 * Helper to wrap route handlers with error handling
 * Catches async errors and passes to error middleware
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error middleware
 * Can be used before route handlers to validate request body/params/query
 */
export function validationErrorHandler(error: any, _req: Request, _res: Response, next: NextFunction) {
  if (error.status === 400 || error.errors) {
    // JOI or other validation error
    next(error);
  } else {
    next(error);
  }
}
