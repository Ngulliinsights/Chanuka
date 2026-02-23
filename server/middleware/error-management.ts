/**
 * Unified Error Middleware
 *
 * Integrates StandardError format with server-specific configuration.
 * Transforms all errors to StandardError format with correlation IDs.
 */

import { ERROR_STATUS_CODES } from '@shared/constants';
import { logger } from '@server/infrastructure/observability';
import {
  ErrorClassification,
  getHttpStatusFromClassification,
  type StandardError,
} from '@shared/types';
import type { Request, Response, NextFunction } from 'express';

// Extend Request interface to include correlationId
interface RequestWithCorrelation extends Request {
  correlationId?: string;
}
import {
  generateCorrelationId,
  getCurrentCorrelationId,
  setCurrentCorrelationId,
} from '@shared/utils/correlation-id';
import { toStandardError } from '@shared/utils/errors';


/**
 * Middleware to set correlation ID for each request
 * Should be added early in the middleware chain
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Get correlation ID from header or generate new one
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    generateCorrelationId();

  // Set correlation ID in context
  setCurrentCorrelationId(correlationId);

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Store on request for easy access
  (req as RequestWithCorrelation).correlationId = correlationId;

  next();
}

function createErrorContext(req: Request) {
  return {
    method: req.method,
    url: req.url,
    ip: req.ip,
    correlationId: getCurrentCorrelationId() || (req as RequestWithCorrelation).correlationId || '',
  };
}

/**
 * Create unified error middleware combining StandardError with server configuration
 */
export function createUnifiedErrorMiddleware() {
  /**
   * Error handling middleware
   */
  return async (error: unknown, req: Request, res: Response, next: NextFunction) => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(error);
    }

    try {
      const _context = createErrorContext(req);

      // Transform error to StandardError format
      const standardError: StandardError = toStandardError(error);

      // Get HTTP status code
      const statusCode = ERROR_STATUS_CODES[standardError.code] || 
                        getHttpStatusFromClassification(standardError.classification);

      // Log error with structured logging
      logger.error({
        correlationId: standardError.correlationId,
        code: standardError.code,
        classification: standardError.classification,
        statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        details: standardError.details,
        stack: standardError.stack,
      }, 'Request failed');

      // Build response
      const errorResponse: any = {
        success: false,
        error: {
          code: standardError.code,
          message: standardError.message,
          classification: standardError.classification,
          correlationId: standardError.correlationId,
          timestamp: standardError.timestamp.toISOString(),
        },
      };

      // Include details in development mode
      if (process.env.NODE_ENV === 'development') {
        errorResponse.error.details = standardError.details;
        errorResponse.error.stack = standardError.stack;
      }

      res.status(statusCode).json(errorResponse);
    } catch (handlerError) {
      // Fallback error response if middleware fails
      logger.error({ error: handlerError }, 'Error middleware failed');

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            classification: ErrorClassification.Server,
            correlationId: getCurrentCorrelationId() || 'unknown',
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
export function validationErrorHandler(error: unknown, _req: Request, _res: Response, next: NextFunction) {
  // Pass all errors through — downstream error middleware handles classification
  next(error);
}
