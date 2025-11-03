/**
 * AI Middleware - Request/Response middleware for AI services
 * 
 * Provides comprehensive middleware for AI operations including:
 * - Request/response logging and monitoring
 * - Performance tracking
 * - Error handling and recovery
 * - Security validation
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { getDefaultCache } from '../cache';
import { rateLimitMiddleware } from '../rate-limiting/middleware';
import { RateLimitStore } from '../rate-limiting/types';
import { logger } from '../observability/logging';

export interface AIRequest extends Request { aiContext?: {
    service: string;
    operation: string;
    startTime: number;
    requestId: string;
    user_id?: string;
    cached?: boolean;
   };
}

export interface AIMiddlewareOptions {
  service: string;
  enableCaching?: boolean;
  cacheTtl?: number;
  enableRateLimit?: boolean;
  rateLimitStore?: RateLimitStore;
  rateLimitConfig?: {
    limit: number;
    windowMs: number;
    algorithm?: 'sliding-window' | 'token-bucket' | 'fixed-window';
  };
  enableDeduplication?: boolean;
  enableMetrics?: boolean;
  enableSecurity?: boolean;
}

/**
 * AI Request Middleware - Handles incoming AI requests
 */
export function aiRequestMiddleware(options: AIMiddlewareOptions) { return async (req: AIRequest, res: Response, next: NextFunction) => {
    const startTime = performance.now();
    const requestId = generateRequestId();
    
    // Initialize AI context
    req.aiContext = {
      service: options.service,
      operation: req.path.split('/').pop() || 'unknown',
      startTime,
      requestId,
      user_id: (req as any).user?.id,
      cached: false
     };

    // Security validation
    if (options.enableSecurity !== false) {
      const securityResult = await validateAIRequest(req);
      if (!securityResult.valid) {
        return res.status(400).json({
          error: 'Invalid AI request',
          code: 'AI_REQUEST_INVALID',
          details: securityResult.errors
        });
      }
    }

    // Log request
    logger.info('AI Request Started', { component: 'Chanuka' }, { requestId,
      service: options.service,
      operation: req.aiContext.operation,
      method: req.method,
      path: req.path,
      user_id: req.aiContext.user_id,
      ip: req.ip,
      user_agent: req.get('User-Agent')
     });

    next();
  };
}

/**
 * AI Response Middleware - Handles AI responses and cleanup
 */
export function aiResponseMiddleware(options: AIMiddlewareOptions) {
  return (req: AIRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    // Override send method
    res.send = function(data: any) {
      logAIResponse(req, res, data, options);
      return originalSend.call(this, data);
    };

    // Override json method
    res.json = function(data: any) {
      logAIResponse(req, res, data, options);
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * AI Caching Middleware - Handles intelligent caching for AI responses
 */
export function aiCachingMiddleware(options: AIMiddlewareOptions) {
  if (!options.enableCaching) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return async (req: AIRequest, res: Response, next: NextFunction) => {
    const cache = getDefaultCache();
    const cacheKey = generateCacheKey(req, options.service);
    
    try {
      // Try to get cached response
      const cachedResponse = await cache.get(cacheKey);
      if (cachedResponse) {
        if (req.aiContext) {
          req.aiContext.cached = true;
        }
        
        logger.info('AI Cache Hit', { component: 'Chanuka' }, {
          requestId: req.aiContext?.requestId,
          service: options.service,
          cacheKey,
          operation: req.aiContext?.operation
        });

        return res.json({
          ...cachedResponse,
          _cached: true,
          _cacheKey: cacheKey
        });
      }

      // Cache miss - continue to AI service
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ttl = options.cacheTtl || 300; // 5 minutes default
          cache.set(cacheKey, data, ttl).catch(err => {
            console.warn('Failed to cache AI response:', err);
          });
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.warn('AI caching error, proceeding without cache:', error);
      next();
    }
  };
}

/**
 * AI Rate Limiting Middleware - Specialized rate limiting for AI services
 */
export function aiRateLimitMiddleware(options: AIMiddlewareOptions) {
  if (!options.enableRateLimit || !options.rateLimitStore) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  const config = options.rateLimitConfig || {
    limit: 100,
    windowMs: 60000, // 1 minute
    algorithm: 'sliding-window' as const
  };

  return rateLimitMiddleware({
    store: options.rateLimitStore,
    config: {
      ...config,
      keyPrefix: `ai:${options.service}:`
    },
    keyGenerator: (req: Request) => { const user_id = (req as any).user?.id;
      const operation = req.path.split('/').pop() || 'unknown';
      
      if (user_id) {
        return `user:${user_id }:${operation}`;
      }
      return `ip:${req.ip}:${operation}`;
    },
    onLimitReached: (req: Request, res: Response) => { console.warn('AI Rate Limit Exceeded', {
        service: options.service,
        ip: req.ip,
        user_id: (req as any).user?.id,
        path: req.path,
        user_agent: req.get('User-Agent')
       });
    }
  });
}

/**
 * Combined AI Middleware - Combines all AI middleware into one
 */
export function createAIMiddleware(options: AIMiddlewareOptions) {
  return [
    aiRequestMiddleware(options),
    aiRateLimitMiddleware(options),
    aiCachingMiddleware(options),
    aiResponseMiddleware(options)
  ];
}

// Helper functions

function generateRequestId(): string {
  return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateCacheKey(req: Request, service: string): string {
  const operation = req.path.split('/').pop() || 'unknown';
  const bodyHash = req.body ? hashObject(req.body) : 'no-body';
  const queryHash = Object.keys(req.query).length > 0 ? hashObject(req.query) : 'no-query';
  
  return `ai:${service}:${operation}:${bodyHash}:${queryHash}`;
}

function hashObject(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

async function validateAIRequest(req: Request): Promise<{
  valid: boolean;
  errors?: string[];
}> {
  const errors: string[] = [];

  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const content_type = req.get('Content-Type');
    if (!content_type || !content_type.includes('application/json')) {
      errors.push('Content-Type must be application/json');
    }
  }

  // Validate request size
  const contentLength = req.get('Content-Length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    errors.push('Request payload too large');
  }

  // Validate required headers
  if (!req.get('User-Agent')) {
    errors.push('User-Agent header is required');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

function logAIResponse(
  req: AIRequest,
  res: Response,
  data: any,
  options: AIMiddlewareOptions
): void {
  if (!req.aiContext) return;

  const duration = performance.now() - req.aiContext.startTime;
  const success = res.statusCode >= 200 && res.statusCode < 300;

  logger.info('AI Request Completed', { component: 'Chanuka' }, { requestId: req.aiContext.requestId,
    service: options.service,
    operation: req.aiContext.operation,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: Math.round(duration),
    success,
    cached: req.aiContext.cached,
    user_id: req.aiContext.user_id,
    ip: req.ip,
    responseSize: JSON.stringify(data).length
   });

  // Record metrics if enabled
  if (options.enableMetrics !== false) {
    recordAIMetrics({
      service: options.service,
      operation: req.aiContext.operation,
      duration,
      success,
      cached: req.aiContext.cached || false,
      statusCode: res.statusCode
    });
  }
}

interface AIMetrics {
  service: string;
  operation: string;
  duration: number;
  success: boolean;
  cached: boolean;
  statusCode: number;
}

function recordAIMetrics(metrics: AIMetrics): void {
  // This would integrate with your metrics collection system
  // For now, we'll just log the metrics
  logger.info('AI Metrics', { component: 'Chanuka' }, metrics);
}












































