/**
 * Cache Middleware
 * Automatic caching for API responses
 */

import { Request, Response, NextFunction } from 'express';
import { serverCache } from '../infrastructure/cache/cache-service';

export interface CacheOptions {
  ttl?: number; // TTL in seconds
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  skipCache?: (req: Request) => boolean;
}

/**
 * Create cache middleware for API endpoints
 */
export function createCacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    condition = (req, res) => res.statusCode === 200,
    skipCache = (req) => req.method !== 'GET'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests or when condition not met
    if (skipCache(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Try to get from cache
      const cachedResponse = await serverCache.getApiResponse(cacheKey);
      
      if (cachedResponse) {
        // Cache hit - return cached response
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedResponse);
      }

      // Cache miss - continue to handler
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      // Intercept the response to cache it
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache the response if condition is met
        if (condition(req, res)) {
          serverCache.cacheApiResponse(cacheKey, data, ttl).catch(err => {
            console.error('Failed to cache response:', err);
          });
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Cache middleware for specific routes
 */
export const cacheMiddleware = {
  // Short-term caching (1 minute) for frequently changing data
  short: createCacheMiddleware({ ttl: 60 }),
  
  // Medium-term caching (5 minutes) for moderately changing data
  medium: createCacheMiddleware({ ttl: 300 }),
  
  // Long-term caching (1 hour) for rarely changing data
  long: createCacheMiddleware({ ttl: 3600 }),
  
  // Custom caching with user-specific keys
  userSpecific: (ttl: number = 300) => createCacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const user_id = req.user?.id || 'anonymous';
      return `user:${ user_id }:${req.method}:${req.originalUrl}`;
    }
  }),

  // Conditional caching based on query parameters
  conditional: (condition: (req: Request) => boolean, ttl: number = 300) => 
    createCacheMiddleware({
      ttl,
      skipCache: (req) => req.method !== 'GET' || !condition(req)
    })
};

/**
 * Cache invalidation middleware
 */
export function createCacheInvalidationMiddleware(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original end function
    const originalEnd = res.end;
    
    res.end = function(chunk?: any, encoding?: any) {
      // Invalidate cache patterns after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        Promise.all(
          patterns.map(pattern => serverCache.invalidateQueryPattern(pattern))
        ).catch(err => {
          console.error('Failed to invalidate cache:', err);
        });
      }
      
      // Call original end
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}
