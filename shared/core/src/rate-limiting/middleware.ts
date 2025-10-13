import { Request, Response, NextFunction } from 'express';
import { RateLimitStore } from './types';
import { logger } from '../utils/logger';

/**
 * Enhanced rate limiting middleware matching reference implementation
 */
export function rateLimitMiddleware(options?: {
  max?: number;
  windowMs?: number;
  algorithm?: string;
  keyGenerator?: (req: any) => string;
  skipIf?: (req: any) => boolean;
  onLimitReached?: (req: any, res: any) => void;
  store?: RateLimitStore;
}) {
  const opts = {
    max: 100,
    windowMs: 60000,
    algorithm: 'sliding-window',
    ...options,
  };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if condition met
    if (opts.skipIf && opts.skipIf(req)) {
      return next();
    }

    // Generate rate limit key
    const key = opts.keyGenerator 
      ? opts.keyGenerator(req)
      : `rate_limit:${req.ip}:${req.route?.path || req.path}`;
    
    try {
      if (!opts.store) {
        return next();
      }

      // Calculate burst allowance (20% default)
      const burstMax = Math.floor(opts.max * 1.2);
      
      const result = await opts.store.hit(
        key, 
        burstMax, 
        opts.windowMs, 
        opts.algorithm
      );
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': opts.max.toString(),
        'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
        'X-RateLimit-Reset': result.resetTime.toISOString(),
        'X-RateLimit-RetryAfter': result.retryAfter.toString(),
      });
      
      if (!result.allowed) {
        // Log rate limit violation
        console.warn('Rate limit exceeded', {
          key,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          path: req.path,
          method: req.method,
        });

        // Call custom handler if provided
        if (opts.onLimitReached) {
          opts.onLimitReached(req, res);
        }

        const errorBody = { 
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter,
        };
          
        res.set('Retry-After', result.retryAfter.toString());
        return res.status(429).json(errorBody);
      }
      
      next();
    } catch (err) {
      // Fail open on rate limiter errors
      console.warn('Rate limiter error, failing open', err);
      next();
    }
  };
}







