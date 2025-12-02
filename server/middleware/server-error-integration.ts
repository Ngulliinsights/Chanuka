/**
 * Server Error Integration
 * 
 * Updates the main server to use the new Boom error middleware
 * while maintaining backward compatibility.
 */

import { Express } from 'express';
import { boomErrorMiddleware, errorContextMiddleware } from './boom-error-middleware.js';
import { logger  } from '@shared/core';

/**
 * Configure error handling for the Express app
 * This replaces the existing error handling with Boom-compatible middleware
 */
export function configureErrorHandling(app: Express): void {
  // Add error context middleware early in the pipeline
  app.use(errorContextMiddleware);

  // API-specific error handling middleware (updated to use Boom)
  app.use('/api', (error: any, req: any, res: any, next: any) => {
    logger.error('API Error:', error, { component: 'Chanuka' });

    // Let the Boom middleware handle the error
    boomErrorMiddleware(error, req, res, next);
  });

  // General error handling (updated to use Boom)
  app.use(boomErrorMiddleware);

  // Fallback error handler for cases where Boom middleware fails
  app.use((error: any, req: any, res: any, next: any) => {
    logger.error('Fallback error handler triggered:', error, { component: 'Chanuka' });

    // If response already sent, delegate to default Express error handler
    if (res.headersSent) {
      return next(error);
    }

    // Send basic error response
    res.status(500).json({
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
        requestId: req.headers['x-request-id']
      }
    });
  });
}

/**
 * Legacy error handler for backward compatibility
 * This can be removed once all routes are migrated
 */
export const legacyErrorHandler = (err: any, req: any, res: any, next: any) => {
  logger.error('Legacy error handler:', { error: err.message, path: req.path });

  const statusCode = err.statusCode || err.status || 500;
  const response = {
    success: false,
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  };

  res.status(statusCode).json(response);
};
