/**
 * Server-Specific Observability Utilities
 * Minimal wrappers for Express middleware and server-specific features
 * 
 * This module provides only server-specific observability utilities:
 * - Express middleware for request/error logging
 * - Server initialization
 * - Server logger instance
 * 
 * For database logging, log aggregation, and performance monitoring,
 * import directly from their respective modules:
 * - './database-logger' for database operation logging
 * - './log-aggregator' for log aggregation and analysis
 * - './performance-monitor' for performance monitoring
 */

// Server-specific Express middleware
import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Export server-specific logger (widely used across the server)
export { logger } from './logger';

/**
 * Express request logging middleware
 * Logs HTTP requests with method, path, status code, duration, and user agent
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
 * Logs HTTP errors with method, path, error message, and stack trace
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
 * Server-specific observability initialization
 * Logs initialization with service name and environment
 */
export function initializeServerObservability(config: {
  serviceName: string;
  environment: string;
}) {
  logger.info('Server observability initialized', config);
}
