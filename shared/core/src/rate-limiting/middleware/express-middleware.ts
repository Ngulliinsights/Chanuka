/**
 * Express Middleware for Unified Rate Limiting
 * Provides automatic rate limiting for Express applications
 */

import { Request, Response, NextFunction } from 'express';
import { Result, ok, err } from '../../primitives/types/result';
import { logger } from '../../observability/logging/logger';
import { getMetricsCollector } from '../metrics';
import { IRateLimitStore, RateLimitOptions, RateLimitResult, RateLimitHeaders } from '../types';

export interface ExpressRateLimitOptions extends RateLimitOptions {
  store: IRateLimitStore;
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

      // For now, implement a simple check using the store's get/set operations
      // This should be replaced with a proper check method when available
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get current data
      const getResult = await store.get(key);
      if (getResult.isErr()) {
        logger.error('Rate limiter store get failed', {
          error: getResult.error.message,
          key,
          ip: req.ip,
          path: req.path
        });
        metrics.recordError(getResult.error.message);
        // Fail open on errors
        return next();
      }

      let data = getResult.value;
      let tokens = 0;
      let resetAt = new Date(now + config.windowMs);

      if (!data) {
        // First request in window
        tokens = config.max - 1;
        data = {
          tokens,
          lastRefill: now,
          resetTime: resetAt.getTime()
        };
      } else {
        // Check if window has expired
        if (now >= data.resetTime) {
          // Reset window
          tokens = config.max - 1;
          data = {
            tokens,
            lastRefill: now,
            resetTime: resetAt.getTime()
          };
        } else {
          // Within current window
          if (data.tokens > 0) {
            tokens = data.tokens - 1;
            data.tokens = tokens;
          } else {
            // Rate limit exceeded
            tokens = 0;
          }
        }
      }

      // Save updated data
      const setResult = await store.set(key, data, config.windowMs);
      if (setResult.isErr()) {
        logger.error('Rate limiter store set failed', {
          error: setResult.error.message,
          key,
          ip: req.ip,
          path: req.path
        });
        metrics.recordError(setResult.error.message);
        // Fail open on errors
        return next();
      }

      const result: RateLimitResult = {
        allowed: tokens >= 0,
        remaining: Math.max(0, tokens),
        resetAt,
        retryAfter: tokens < 0 ? Math.ceil((resetAt.getTime() - now) / 1000) : undefined
      };

      // Record metrics
      const processingTime = Date.now() - startTime;
      metrics.recordEvent({
        allowed: result.allowed,
        key,
        algorithm: 'express-middleware', // Could be enhanced to track actual algorithm
        remaining: result.remaining,
        processingTime,
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      // Set rate limit headers
      setRateLimitHeaders(res, result, config, standardHeaders, legacyHeaders);

      if (!result.allowed) {
        // Log rate limit violation
        logger.warn('Rate limit exceeded', {
          key,
          ip: req.ip,
          path: req.path,
          method: req.method,
          remaining: result.remaining,
          resetAt: result.resetAt.toISOString()
        });

        // Call custom handler if provided
        if (onLimitReached) {
          onLimitReached(req, res);
        }

        // Return rate limit exceeded response
        res.status(429).json({
          error: config.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter,
          limit: config.max,
          remaining: result.remaining,
          resetAt: result.resetAt.toISOString()
        });
        return;
      }

      next();
    } catch (error) {
      // Record error metrics
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown rate limiting error';
      metrics.recordError(errorMessage);

      // Log error
      logger.error('Rate limiter middleware error - failing open', {
        error: errorMessage,
        ip: req.ip,
        path: req.path,
        method: req.method
      });

      // Fail open - allow the request to proceed
      next();
    }
  };
}

function defaultKeyGenerator(req: Request): string { // More sophisticated key generation
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const user_id = (req as any).user?.id;

  if (user_id) {
    return `user:${user_id }`;
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
  config: RateLimitOptions,
  standardHeaders: boolean,
  legacyHeaders: boolean
): void {
  if (standardHeaders) {
    // RFC 6585 standard headers
    res.set({
      'RateLimit-Limit': String(config.max),
      'RateLimit-Remaining': String(result.remaining),
      'RateLimit-Reset': String(Math.ceil(result.resetAt.getTime() / 1000))
    });
  }

  if (legacyHeaders) {
    // Legacy X-RateLimit headers
    res.set({
      'X-RateLimit-Limit': String(config.max),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
      'X-RateLimit-Window': String(config.windowMs)
    });
  }

  if (result.retryAfter) {
    res.set('Retry-After', String(result.retryAfter));
  }
}

/**
 * Pre-configured middleware factories for common use cases
 */
export function createApiRateLimitMiddleware(store: IRateLimitStore) {
  return createExpressRateLimitMiddleware({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many API requests from this IP'
  });
}

export function createAuthRateLimitMiddleware(store: IRateLimitStore) {
  return createExpressRateLimitMiddleware({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts'
  });
}

export function createSearchRateLimitMiddleware(store: IRateLimitStore) {
  return createExpressRateLimitMiddleware({
    store,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50,
    message: 'Too many search requests from this IP'
  });
}

