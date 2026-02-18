/**
 * Correlation ID Middleware (Server-Only)
 * 
 * Express middleware for managing correlation IDs in HTTP requests.
 * Extracts correlation ID from headers or generates a new one.
 */

import type { Request, Response, NextFunction } from 'express';
import { generateCorrelationId } from './generator';
import { setCurrentCorrelationId, clearCurrentCorrelationId } from './context';

/**
 * Header name for correlation ID
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Express middleware to handle correlation IDs
 * 
 * - Extracts correlation ID from request header
 * - Generates new ID if not present
 * - Sets ID in response header
 * - Sets ID in async context
 * - Cleans up after request
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { correlationIdMiddleware } from '@shared/utils/correlation-id';
 * 
 * const app = express();
 * app.use(correlationIdMiddleware);
 * ```
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract or generate correlation ID
  const correlationId = 
    (req.headers[CORRELATION_ID_HEADER] as string) || 
    generateCorrelationId();

  // Set in request headers for downstream use
  req.headers[CORRELATION_ID_HEADER] = correlationId;

  // Set in response headers for client tracking
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  // Set in async context
  setCurrentCorrelationId(correlationId);

  // Clean up after response
  res.on('finish', () => {
    clearCurrentCorrelationId();
  });

  next();
}

/**
 * Get correlation ID from Express request
 * 
 * @param req - Express request object
 * @returns The correlation ID from the request
 */
export function getCorrelationIdFromRequest(req: Request): string | undefined {
  return req.headers[CORRELATION_ID_HEADER] as string | undefined;
}

/**
 * Set correlation ID in Express response
 * 
 * @param res - Express response object
 * @param correlationId - The correlation ID to set
 */
export function setCorrelationIdInResponse(
  res: Response,
  correlationId: string
): void {
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
}
