/**
 * Error Context Utility
 * 
 * Consolidated error context creation for consistent error tracking.
 * Replaces scattered createErrorContext() implementations.
 */

import type { Request } from 'express';
import type { ErrorContext } from '@server/infrastructure/error-handling';

/**
 * Creates standardized error context from Express request
 * 
 * @param req - Express request object
 * @param endpoint - API endpoint identifier (e.g., 'GET /api/users/:id')
 * @param additionalContext - Optional additional context metadata
 * @returns ErrorContext object for error tracking
 */
export function createErrorContext(
  req: Request,
  endpoint: string,
  additionalContext?: Record<string, unknown>
): Partial<ErrorContext> {
  return {
    service: extractServiceFromEndpoint(endpoint),
    operation: endpoint,
    requestId: req.headers['x-request-id'] as string | undefined,
    correlationId: req.headers['x-correlation-id'] as string | undefined,
    userId: (req as any).user?.id,
    metadata: {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      ...additionalContext,
    },
  };
}

/**
 * Extracts service name from endpoint string
 * Example: 'GET /api/users/:id' -> 'users'
 */
function extractServiceFromEndpoint(endpoint: string): string {
  const match = endpoint.match(/\/api\/([^\/\s]+)/);
  return match ? match[1] : 'unknown';
}
