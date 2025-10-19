/**
 * Express Middleware for Unified Rate Limiting
 * Provides automatic rate limiting for Express applications
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitStore, RateLimitConfig, RateLimitResult, RateLimitHeaders } from '../core/interfaces';
import { getMetricsCollector } from '../metrics';

export interface ExpressRateLimitOptions extends RateLimitConfig {
  store: RateLimitStore;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
  standardHeaders?: boolean; // RFC 6585 headers
  legacyHeaders?: boolean;   // X-RateLimit-* headers
  skip?: (req: Request) => boolean;
}

export function createExpressRateLimitMiddleware(options: ExpressRateLimitOptions) {
  const {
    store,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onLimitReached,
    standardHeaders = true,
    legacyHeaders = true,
    skip,
    ...config
  } = options;

  const metrics = getMetricsCollector();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();

    try {
      // Skip rate limiting if specified
      if (skip?.(req)) {
        return next();
      }

      // Skip based on previous response status
      if (shouldSkipRequest(req, res, skipSuccessfulRequests, skipFailedRequests)) {
        return next();
      }

      const key = keyGenerator(req);
      const result = await store.check(key, config);

      // Record metrics
      const processingTime = Date.now() - startTime;
      metrics.recordEvent({
        allowed: result.allowed,
        key,
        algorithm: result.algorithm,
        remaining: result.remaining,
        processingTime,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      // Set rate limit headers
      setRateLimitHeaders(res, result, config, standardHeaders, legacyHeaders);

      if (!result.allowed) {
        // Call custom handler if provided
        if (onLimitReached) {
          onLimitReached(req, res);
        }

        // Return rate limit exceeded response
        res.status(429).json({
          error: config.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter,
          limit: config.limit,
          remaining: result.remaining,
          resetAt: result.resetAt.toISOString()
        });
        return;
      }

      next();
    } catch (error) {
      // Record error metrics
      const processingTime = Date.now() - startTime;
      metrics.recordError(error instanceof Error ? error.message : 'Unknown rate limiting error');

      // Log error
      console.warn('Rate limiter error - failing open', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
        path: req.path
      });

      // Fail open - allow the request to proceed
      next();
    }
  };
}

function defaultKeyGenerator(req: Request): string {
  // More sophisticated key generation
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userId = (req as any).user?.id;

  if (userId) {
    return `user:${userId}`;
  }

  return `ip:${ip}`;
}

function shouldSkipRequest(
  req: Request,
  res: Response,
  skipSuccessfulRequests: boolean,
  skipFailedRequests: boolean
): boolean {
  if (skipSuccessfulRequests && res.statusCode < 400) {
    return true;
  }

  if (skipFailedRequests && res.statusCode >= 400) {
    return true;
  }

  return false;
}

function setRateLimitHeaders(
  res: Response,
  result: RateLimitResult,
  config: RateLimitConfig,
  standardHeaders: boolean,
  legacyHeaders: boolean
): void {
  if (standardHeaders) {
    // RFC 6585 standard headers
    res.set({
      'RateLimit-Limit': String(config.limit),
      'RateLimit-Remaining': String(result.remaining),
      'RateLimit-Reset': String(Math.ceil(result.resetAt.getTime() / 1000))
    } as RateLimitHeaders);
  }

  if (legacyHeaders) {
    // Legacy X-RateLimit headers
    res.set({
      'X-RateLimit-Limit': String(config.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
      'X-RateLimit-Window': String(config.windowMs)
    } as RateLimitHeaders);
  }

  if (result.retryAfter) {
    res.set('Retry-After', String(result.retryAfter));
  }
}

/**
 * Pre-configured middleware factories for common use cases
 */
export function createApiRateLimitMiddleware(store: RateLimitStore) {
  return createExpressRateLimitMiddleware({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    message: 'Too many API requests from this IP'
  });
}

export function createAuthRateLimitMiddleware(store: RateLimitStore) {
  return createExpressRateLimitMiddleware({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    message: 'Too many authentication attempts'
  });
}

export function createSearchRateLimitMiddleware(store: RateLimitStore) {
  return createExpressRateLimitMiddleware({
    store,
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 50,
    message: 'Too many search requests from this IP'
  });
}




































