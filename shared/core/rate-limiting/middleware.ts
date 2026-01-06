import { Request, Response, NextFunction } from 'express';

import { RateLimitStore, RateLimitOptions, RateLimitHeaders } from './types';

export class RateLimitMiddleware {
  private store: RateLimitStore;

  constructor(store: RateLimitStore) {
    this.store = store;
  }

  createMiddleware(options: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Skip rate limiting in test environment if specified
      if (process.env.NODE_ENV === 'test' && process.env.SKIP_RATE_LIMIT === 'true') {
        return next();
      }

      const key = this.getKey(req, options);
      const result = await this.store.check(key, options);

      // Set rate limit headers
      this.setHeaders(res, result, options);

      if (!result.allowed) {
        res.status(429).json({
          error: options.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter,
          limit: this.getMaxRequests(options),
          remaining: result.remaining,
          resetAt: result.resetAt.toISOString()
        });
        return;
      }

      next();
    };
  }

  private getKey(req: Request, _options: RateLimitOptions): string {
    // Default to IP-based limiting
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private getMaxRequests(options: RateLimitOptions): number {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isTestEnvironment && options.testMax) {
      return options.testMax;
    } else if (isDevelopment && options.devMax) {
      return options.devMax;
    }

    return options.max;
  }

  private setHeaders(res: Response, result: any, options: RateLimitOptions): void {
    const maxRequests = this.getMaxRequests(options);

    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
      'X-RateLimit-Window': options.windowMs.toString()
    } as RateLimitHeaders);
  }
}

// Factory functions for common rate limiters
export function createRateLimitMiddleware(store: RateLimitStore) {
  return new RateLimitMiddleware(store);
}

// Pre-configured middleware factories
export function createApiRateLimit(store: RateLimitStore) {
  const middleware = new RateLimitMiddleware(store);
  return middleware.createMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Production limit
    devMax: 1000, // Development limit
    testMax: 10000, // Very high limit for testing
    message: 'Too many API requests from this IP'
  });
}

export function createAuthRateLimit(store: RateLimitStore) {
  const middleware = new RateLimitMiddleware(store);
  return middleware.createMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Production limit
    devMax: 50, // Development limit
    testMax: 1000, // High limit for testing
    message: 'Too many authentication attempts'
  });
}

export function createSearchRateLimit(store: RateLimitStore) {
  const middleware = new RateLimitMiddleware(store);
  return middleware.createMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // Production limit for search
    devMax: 500, // Development limit
    testMax: 5000, // High limit for testing
    message: 'Too many search requests from this IP'
  });
}

export function createSponsorRateLimit(store: RateLimitStore) {
  const middleware = new RateLimitMiddleware(store);
  return middleware.createMiddleware({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 200, // Production limit for sponsor endpoints
    devMax: 2000, // Development limit
    testMax: 10000, // Very high limit for testing
    message: 'Too many sponsor API requests from this IP'
  });
}

export function createPasswordResetRateLimit(store: RateLimitStore) {
  const middleware = new RateLimitMiddleware(store);
  return middleware.createMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Production limit for password resets
    devMax: 30, // Development limit
    testMax: 300, // High limit for testing
    message: 'Too many password reset requests from this IP'
  });
}

export function createRegistrationRateLimit(store: RateLimitStore) {
  const middleware = new RateLimitMiddleware(store);
  return middleware.createMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Production limit for registrations
    devMax: 50, // Development limit
    testMax: 500, // High limit for testing
    message: 'Too many registration attempts from this IP'
  });
}









































