/**
 * Server-Specific Observability Utilities
 * Minimal wrappers for Express middleware and server-specific features
 */

// Server-specific Express middleware
import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Export server-specific logger
export { logger } from './logger';

// Re-export other observability modules for convenience
export { databaseLogger } from './database-logger';
export { logAggregator } from './log-aggregator';
export { performanceMonitor } from './performance-monitor';

/**
 * Express request logging middleware
 */
export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('user-agent')
      });
    });
    
    next();
  };
}

/**
 * Express error logging middleware
 */
export function errorLoggingMiddleware() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('HTTP Error', {
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack
    });
    
    next(err);
  };
}

/**
 * Server-specific initialization
 */
export function initializeServerObservability(config: {
  serviceName: string;
  environment: string;
}) {
  logger.info('Server observability initialized', config);
}
