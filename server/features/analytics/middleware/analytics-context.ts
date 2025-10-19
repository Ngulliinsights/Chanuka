import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../../../middleware/auth.js';
import { logger } from '../../../utils/logger.js';
import { errorTracker } from '../../../core/errors/error-tracker.js';

/**
 * Request context interface for analytics operations
 */
export interface RequestContext {
  /** Unique trace ID for request tracking */
  traceId: string;
  /** Timestamp when request was received */
  timestamp: Date;
  /** User ID if authenticated */
  userId?: string;
  /** Additional metadata for the request */
  metadata?: Record<string, any>;
}

/**
 * Analytics context middleware
 *
 * Generates or extracts trace IDs for request tracking and attaches
 * request context to the request object for use throughout the request lifecycle.
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Next function to continue request processing
 */
export function analyticsContextMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check for existing trace ID in request headers
    const existingTraceId = req.headers['x-trace-id'] as string ||
                           req.headers['x-request-id'] as string ||
                           req.headers['trace-id'] as string;

    // Generate new trace ID if none exists
    const traceId = existingTraceId || randomUUID();

    // Create request context
    const context: RequestContext = {
      traceId,
      timestamp: new Date(),
      userId: req.user?.id,
      metadata: {
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      }
    };

    // Attach context to request
    req.analyticsContext = context;

    // Add trace ID to response headers for client visibility
    res.setHeader('x-trace-id', traceId);

    // Continue to next middleware
    next();
  } catch (error) {
    // Log error but don't fail the request. Use centralized logger and error tracker when available.
    logger.error('Failed to create analytics context', { error });

    try {
      if ((errorTracker as any)?.trackRequestError) {
        // Track with low severity; no request object context available yet, pass req as any
        (errorTracker as any).trackRequestError(
          error instanceof Error ? error : new Error(String(error)),
          req as any,
          'low',
          'analytics_context'
        );
      } else if ((errorTracker as any)?.capture) {
        (errorTracker as any).capture(error instanceof Error ? error : new Error(String(error)), {
          component: 'analytics-context',
        });
      }
    } catch (reportErr) {
      logger.warn('Error reporting analytics context creation failure to errorTracker', { reportErr });
    }

    // Create minimal context to prevent downstream errors
    req.analyticsContext = {
      traceId: randomUUID(),
      timestamp: new Date()
    };

    next();
  }
}

/**
 * Helper function to get trace ID from request context
 */
export function getTraceId(req: AuthenticatedRequest): string {
  return req.analyticsContext?.traceId || 'unknown';
}

/**
 * Helper function to get request context
 */
export function getRequestContext(req: AuthenticatedRequest): RequestContext | undefined {
  return req.analyticsContext;
}

/**
 * Helper function to add metadata to request context
 */
export function addContextMetadata(
  req: AuthenticatedRequest,
  key: string,
  value: any
): void {
  if (req.analyticsContext) {
    if (!req.analyticsContext.metadata) {
      req.analyticsContext.metadata = {};
    }
    req.analyticsContext.metadata[key] = value;
  }
}





































