/**
 * AI Request Deduplication - Prevents duplicate AI operations
 * 
 * Implements request deduplication for identical AI operations to:
 * - Reduce API costs by avoiding duplicate calls
 * - Improve response times for identical requests
 * - Prevent resource waste on concurrent identical operations
 * - Implement single-flight pattern for AI requests
 */

import { Request, Response, NextFunction } from 'express';
import { getDefaultCache } from '../cache';
import { performance } from 'perf_hooks';

export interface DeduplicationOptions {
  enabled?: boolean;
  ttl?: number; // Time to live for deduplication cache
  keyGenerator?: (req: Request) => string;
  skipCondition?: (req: Request) => boolean;
  onDuplicate?: (req: Request, res: Response, originalResult: any) => void;
  enableMetrics?: boolean;
}

interface PendingRequest {
  promise: Promise<any>;
  startTime: number;
  requestCount: number;
  requestIds: string[];
}

/**
 * AI Request Deduplication Middleware
 * 
 * Uses single-flight pattern to ensure identical requests are only processed once
 */
export class AIDeduplicationMiddleware {
  private pendingRequests = new Map<string, PendingRequest>();
  private cache = getDefaultCache();
  private options: Required<DeduplicationOptions>;

  constructor(options: DeduplicationOptions = {}) {
    this.options = {
      enabled: true,
      ttl: 300, // 5 minutes default
      keyGenerator: this.defaultKeyGenerator,
      skipCondition: () => false,
      onDuplicate: this.defaultOnDuplicate,
      enableMetrics: true,
      ...options
    };
  }

  /**
   * Create middleware function
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.options.enabled || this.options.skipCondition(req)) {
        return next();
      }

      const deduplicationKey = this.options.keyGenerator(req);
      const requestId = this.generateRequestId();

      try {
        // Check if there's a cached result
        const cachedResult = await this.cache.get(deduplicationKey);
        if (cachedResult) {
          this.recordMetrics('cache_hit', deduplicationKey);
          this.options.onDuplicate(req, res, cachedResult);
          return res.json({
            ...cachedResult,
            _deduplicated: true,
            _source: 'cache'
          });
        }

        // Check if there's a pending request for the same operation
        const pendingRequest = this.pendingRequests.get(deduplicationKey);
        if (pendingRequest) {
          this.recordMetrics('deduplication_hit', deduplicationKey);
          
          // Add this request to the pending request
          pendingRequest.requestCount++;
          pendingRequest.requestIds.push(requestId);

          console.log('AI Request Deduplicated', {
            requestId,
            deduplicationKey,
            pendingRequestCount: pendingRequest.requestCount,
            waitTime: performance.now() - pendingRequest.startTime
          });

          try {
            // Wait for the original request to complete
            const result = await pendingRequest.promise;
            this.options.onDuplicate(req, res, result);
            return res.json({
              ...result,
              _deduplicated: true,
              _source: 'pending',
              _requestId: requestId
            });
          } catch (error) {
            // If the original request failed, let this request proceed
            console.warn('Original request failed, proceeding with new request:', error);
          }
        }

        // No cached result and no pending request - create new pending request
        const pendingPromise = this.createPendingRequest(req, res, next, deduplicationKey, requestId);
        
        this.pendingRequests.set(deduplicationKey, {
          promise: pendingPromise,
          startTime: performance.now(),
          requestCount: 1,
          requestIds: [requestId]
        });

        this.recordMetrics('new_request', deduplicationKey);

        // The request will be handled by the pending promise
        await pendingPromise;

      } catch (error) {
        console.error('Deduplication error:', error);
        // On error, proceed without deduplication
        next();
      }
    };
  }

  /**
   * Create a pending request that will be shared among duplicate requests
   */
  private createPendingRequest(
    req: Request,
    res: Response,
    next: NextFunction,
    deduplicationKey: string,
    requestId: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Override response methods to capture the result
      const originalJson = res.json;
      const originalSend = res.send;
      let responseData: any = null;
      let responseSent = false;

      res.json = function(data: any) {
        if (!responseSent) {
          responseData = data;
          responseSent = true;
          
          // Cache the result for future requests
          if (res.statusCode >= 200 && res.statusCode < 300) {
            AIDeduplicationMiddleware.prototype.cache.set(
              deduplicationKey,
              data,
              AIDeduplicationMiddleware.prototype.options.ttl
            ).catch(err => {
              console.warn('Failed to cache deduplicated result:', err);
            });
          }

          resolve(data);
        }
        return originalJson.call(this, data);
      };

      res.send = function(data: any) {
        if (!responseSent) {
          responseData = data;
          responseSent = true;
          resolve(data);
        }
        return originalSend.call(this, data);
      };

      // Handle response end to clean up
      res.on('finish', () => {
        setTimeout(() => {
          this.pendingRequests.delete(deduplicationKey);
        }, 1000); // Clean up after 1 second
      });

      // Handle errors
      res.on('error', (error) => {
        this.pendingRequests.delete(deduplicationKey);
        reject(error);
      });

      // Continue with the original request
      next();
    });
  }

  /**
   * Default key generator - creates a unique key based on request content
   */
  private defaultKeyGenerator = (req: Request): string => {
    const method = req.method;
    const path = req.path;
    const query = JSON.stringify(req.query, Object.keys(req.query).sort());
    const body = req.body ? JSON.stringify(req.body, Object.keys(req.body).sort()) : '';
    const userId = (req as any).user?.id || 'anonymous';

    // Create a hash of the request content
    const content = `${method}:${path}:${query}:${body}:${userId}`;
    return `ai_dedup:${this.hashString(content)}`;
  }

  /**
   * Default duplicate handler
   */
  private defaultOnDuplicate = (req: Request, res: Response, originalResult: any): void => {
    console.log('AI Request Served from Deduplication', {
      path: req.path,
      method: req.method,
      userId: (req as any).user?.id,
      ip: req.ip
    });
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple string hashing function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Record metrics for monitoring
   */
  private recordMetrics(type: 'cache_hit' | 'deduplication_hit' | 'new_request', key: string): void {
    if (!this.options.enableMetrics) return;

    console.log('AI Deduplication Metrics', {
      type,
      key,
      timestamp: new Date().toISOString(),
      pendingRequestsCount: this.pendingRequests.size
    });
  }

  /**
   * Get current deduplication statistics
   */
  getStats(): {
    pendingRequests: number;
    pendingKeys: string[];
    cacheSize?: number;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      pendingKeys: Array.from(this.pendingRequests.keys()),
      cacheSize: undefined // Would need cache adapter support
    };
  }

  /**
   * Clear all pending requests (useful for testing or emergency situations)
   */
  clearPendingRequests(): void {
    this.pendingRequests.clear();
  }

  /**
   * Health check for deduplication system
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    pendingRequests: number;
    cacheHealthy: boolean;
  }> {
    try {
      // Test cache connectivity
      const testKey = 'health_check_' + Date.now();
      await this.cache.set(testKey, 'test', 1);
      await this.cache.get(testKey);
      await this.cache.del(testKey);

      return {
        healthy: true,
        pendingRequests: this.pendingRequests.size,
        cacheHealthy: true
      };
    } catch (error) {
      return {
        healthy: false,
        pendingRequests: this.pendingRequests.size,
        cacheHealthy: false
      };
    }
  }
}

/**
 * Create AI deduplication middleware with custom options
 */
export function createAIDeduplicationMiddleware(options: DeduplicationOptions = {}) {
  const deduplication = new AIDeduplicationMiddleware(options);
  return deduplication.middleware();
}

/**
 * Service-specific deduplication middleware factory
 */
export function createServiceDeduplicationMiddleware(
  service: string,
  options: Omit<DeduplicationOptions, 'keyGenerator'> = {}
) {
  return createAIDeduplicationMiddleware({
    ...options,
    keyGenerator: (req: Request) => {
      const operation = req.path.split('/').pop() || 'unknown';
      const query = JSON.stringify(req.query, Object.keys(req.query).sort());
      const body = req.body ? JSON.stringify(req.body, Object.keys(req.body).sort()) : '';
      const userId = (req as any).user?.id || 'anonymous';

      const content = `${service}:${operation}:${query}:${body}:${userId}`;
      const hash = hashString(content);
      return `ai_dedup:${service}:${hash}`;
    }
  });
}

// Helper function for hashing
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Default deduplication middleware instance
 */
let defaultDeduplicationMiddleware: AIDeduplicationMiddleware | null = null;

export function getDefaultDeduplicationMiddleware(): AIDeduplicationMiddleware {
  if (!defaultDeduplicationMiddleware) {
    defaultDeduplicationMiddleware = new AIDeduplicationMiddleware();
  }
  return defaultDeduplicationMiddleware;
}

export function setDefaultDeduplicationMiddleware(middleware: AIDeduplicationMiddleware): void {
  defaultDeduplicationMiddleware = middleware;
}