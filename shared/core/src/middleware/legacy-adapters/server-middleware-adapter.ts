/**
 * Legacy Server Middleware Adapter
 * 
 * Provides backward compatibility for server/middleware/* imports
 * while migrating to the unified middleware system.
 */

import { Request, Response, NextFunction } from 'express';
// Temporary fallback logger until module resolution is fixed
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || '')
};
import { MiddlewareFactory } from '../factory';
import { createRateLimiter } from '../../rate-limiting';
// Temporary error handler until module resolution is fixed
const unifiedErrorHandler = (err: any, req: any, res: any, next: any) => {
  console.error('[ERROR] Unified error handler:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
};

// Re-export auth middleware (this should be migrated to shared/core)
export { authenticateToken, requireRole, AuthenticatedRequest } from './auth-adapter';

/**
 * Legacy error handler adapter
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.warn('[DEPRECATED] Using legacy errorHandler. Please migrate to @shared/core/middleware');
  return unifiedErrorHandler(err, req, res, next);
}

/**
 * Legacy request logger adapter
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  console.warn('[DEPRECATED] Using legacy requestLogger. Please migrate to @shared/core/middleware');
  
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(body) {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Legacy rate limiter adapter
 */
export function apiRateLimit(req: Request, res: Response, next: NextFunction) {
  console.warn('[DEPRECATED] Using legacy apiRateLimit. Please migrate to @shared/core/middleware');
  const rateLimiter = createRateLimiter();
  return rateLimiter(req, res, next);
}

/**
 * Legacy security middleware adapter
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  console.warn('[DEPRECATED] Using legacy securityMiddleware. Please migrate to @shared/core/middleware');
  
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
}

/**
 * Legacy security monitoring middleware adapter
 */
export const securityMonitoringMiddleware = {
  initializeAll() {
    return (req: Request, res: Response, next: NextFunction) => {
      console.warn('[DEPRECATED] Using legacy securityMonitoringMiddleware. Please migrate to @shared/core/middleware');
      
      // Log security-relevant events
      logger.info('Security monitoring', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
      });
      
      next();
    };
  }
};

/**
 * Legacy privacy middleware adapter
 */
export function privacyMiddleware(req: Request, res: Response, next: NextFunction) {
  console.warn('[DEPRECATED] Using legacy privacyMiddleware. Please migrate to @shared/core/middleware');
  
  // Add privacy-related headers
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}