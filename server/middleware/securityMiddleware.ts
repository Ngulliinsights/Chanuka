/**
 * Security Middleware
 * 
 * Full implementation for comprehensive security middleware including:
 * - Rate limiting
 * - IP filtering
 * - Request validation
 * - Security headers
 * - CORS configuration
 * - Authentication checks
 * - Authorization checks
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '@server/infrastructure/observability';
import type { AuthenticatedRequest } from './auth-types';

export interface SecurityConfig {
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  requireAuth?: boolean;
  requireRole?: string[];
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Security Middleware Factory
 */
export function createSecurityMiddleware(config?: SecurityConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // IP filtering
      if (config?.ipWhitelist || config?.ipBlacklist) {
        const clientIp = getClientIp(req);
        
        if (config.ipWhitelist && !config.ipWhitelist.includes(clientIp)) {
          logger.warn('IP not in whitelist', { ip: clientIp, path: req.path });
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        if (config.ipBlacklist && config.ipBlacklist.includes(clientIp)) {
          logger.warn('IP in blacklist', { ip: clientIp, path: req.path });
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      // Authentication check
      if (config?.requireAuth) {
        // Check if user is authenticated (assumes auth middleware has run)
        const authReq = req as AuthenticatedRequest;
        if (!authReq.user) {
          logger.warn('Authentication required', { path: req.path });
          res.status(401).json({ error: 'Authentication required' });
          return;
        }
      }

      // Authorization check
      if (config?.requireRole && config.requireRole.length > 0) {
        const authReq = req as AuthenticatedRequest;
        const user = authReq.user;
        if (!user || !user.role || !config.requireRole.includes(user.role)) {
          logger.warn('Authorization failed', {
            path: req.path,
            userRole: user?.role,
            requiredRoles: config.requireRole,
          });
          res.status(403).json({ error: 'Insufficient permissions' });
          return;
        }
      }

      logger.debug('Security middleware passed', {
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Security middleware error', { error, path: req.path });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(
  windowMs: number = 60000,
  max: number = 100
) {
  const rateLimitMap = new Map<string, RateLimitEntry>();

  // Cleanup expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const clientIp = getClientIp(req);
      const now = Date.now();

      let entry = rateLimitMap.get(clientIp);

      if (!entry || now > entry.resetTime) {
        // Create new entry
        entry = {
          count: 1,
          resetTime: now + windowMs,
        };
        rateLimitMap.set(clientIp, entry);
      } else {
        // Increment count
        entry.count++;
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      // Check if rate limit exceeded
      if (entry.count > max) {
        logger.warn('Rate limit exceeded', {
          ip: clientIp,
          path: req.path,
          count: entry.count,
          max,
        });

        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', { error });
      next();
    }
  };
}

/**
 * IP filtering middleware
 */
export function ipFilterMiddleware(
  whitelist?: string[],
  blacklist?: string[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const clientIp = getClientIp(req);

      if (whitelist && whitelist.length > 0) {
        if (!whitelist.includes(clientIp)) {
          logger.warn('IP not in whitelist', { ip: clientIp, path: req.path });
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      if (blacklist && blacklist.length > 0) {
        if (blacklist.includes(clientIp)) {
          logger.warn('IP in blacklist', { ip: clientIp, path: req.path });
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      next();
    } catch (error) {
      logger.error('IP filter middleware error', { error });
      next();
    }
  };
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');

      // Enable XSS protection
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // Enforce HTTPS
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

      // Content Security Policy
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
      );

      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // Permissions Policy
      res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()'
      );

      next();
    } catch (error) {
      logger.error('Security headers middleware error', { error });
      next();
    }
  };
}

/**
 * CORS middleware
 */
export function corsMiddleware(allowedOrigins?: string[]) {
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173'];
  const origins = allowedOrigins || defaultOrigins;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const origin = req.headers.origin;

      if (origin && origins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, PATCH, OPTIONS'
        );
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
        );
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }

      next();
    } catch (error) {
      logger.error('CORS middleware error', { error });
      next();
    }
  };
}

/**
 * Request size limit middleware
 */
export function requestSizeLimitMiddleware(maxSize: number = 10 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);

      if (contentLength > maxSize) {
        logger.warn('Request size limit exceeded', {
          contentLength,
          maxSize,
          path: req.path,
        });
        res.status(413).json({ error: 'Request entity too large' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Request size limit middleware error', { error });
      next();
    }
  };
}

/**
 * Request timeout middleware
 */
export function requestTimeoutMiddleware(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      logger.warn('Request timeout', { path: req.path, timeout });
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  };
}

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  // Check X-Forwarded-For header (proxy/load balancer)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to socket address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Export default security middleware
 */
export default createSecurityMiddleware;
