/**
 * Unified Middleware System
 * 
 * Integrates all core utilities into a single, cohesive middleware system
 * Consolidates rate limiting, validation, caching, error handling, and logging
 */

import { performance } from 'perf_hooks';

import { unifiedErrorHandler } from '@shared/core/src/observability/error-management/middleware/express-error-middleware';
import { Request, Response, NextFunction, Application } from 'express';

// Import core utilities
 // Unused import

import { getDefaultCache } from '../cache';
// import { setupGlobalErrorHandlers } from '../observability/error-management'; // TODO: Module not found
// Removed - module deleted by design during development
import { logger } from '@shared/core/observability';
import { ValidationService } from '../validation';

export interface UnifiedMiddlewareConfig {
  // Rate limiting configuration
  rateLimit?: {
    enabled: boolean;
    algorithm: 'sliding-window' | 'token-bucket' | 'fixed-window';
    limit: number;
    windowMs: number;
    burstAllowance?: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  };

  // Validation configuration
  validation?: {
    enabled: boolean;
    enableCaching?: boolean;
    enablePreprocessing?: boolean;
    enableBatchValidation?: boolean;
  };

  // Caching configuration
  cache?: {
    enabled: boolean;
    defaultTtl?: number;
    keyGenerator?: (req: Request) => string;
    skipMethods?: string[];
  };

  // Logging configuration
  logging?: {
    enabled: boolean;
    logRequests?: boolean;
    logResponses?: boolean;
    logErrors?: boolean;
    includeHeaders?: boolean;
    includeBody?: boolean;
    redactSensitive?: boolean;
  };

  // Error handling configuration
  errorHandling?: {
    enabled: boolean;
    includeStackTrace?: boolean;
    enableSentryReporting?: boolean;
    enableGlobalHandlers?: boolean;
  };

  // Health monitoring configuration
  health?: {
    enabled: boolean;
    endpoint?: string;
    enableMetrics?: boolean;
    enableDetailedChecks?: boolean;
  };

  // Performance monitoring
  performance?: {
    enabled: boolean;
    enableMetrics?: boolean;
    slowRequestThreshold?: number;
  };
}

export interface MiddlewareMetrics {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  responseTime: number;
  rateLimitHits: number;
  validationErrors: number;
  cacheHits: number;
  cacheMisses: number;
}

export class UnifiedMiddleware {
  private config: UnifiedMiddlewareConfig;
  private logger: typeof logger;
  private _validationService: ValidationService;
  private cache: any;
  private metrics: MiddlewareMetrics;

  constructor(config: UnifiedMiddlewareConfig) {
    this.config = config;
    this.logger = logger;
    this.validationService = new ValidationService();
    this.cache = getDefaultCache();
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      responseTime: 0,
      rateLimitHits: 0,
      validationErrors: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Create the unified middleware stack
   */
  createMiddlewareStack(): Array<(req: Request, res: Response, next: NextFunction) => void> {
    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    // Performance monitoring middleware (first)
    if (this.config.performance?.enabled) {
      middlewares.push(this.performanceMiddleware.bind(this));
    }

    // Logging middleware (early in the stack)
    if (this.config.logging?.enabled) {
      middlewares.push(this.loggingMiddleware.bind(this));
    }

    // Rate limiting middleware
    if (this.config.rateLimit?.enabled) {
      middlewares.push(this.createRateLimitMiddleware());
    }

    // Caching middleware
    if (this.config.cache?.enabled) {
      middlewares.push(this.cachingMiddleware.bind(this));
    }

    // Validation middleware
    if (this.config.validation?.enabled) {
      middlewares.push(this.validationMiddleware.bind(this));
    }

    return middlewares;
  }

  /**
   * Performance monitoring middleware
   */
  private performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = performance.now();
    
    res.on('finish', () => {
      const duration = performance.now() - startTime;
      this.updateMetrics('responseTime', duration);
      
      if (this.config.performance?.slowRequestThreshold && duration > this.config.performance.slowRequestThreshold) {
        this.logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          duration,
          user_agent: req.get('User-Agent')
        });
      }
    });

    next();
  }

  /**
   * Logging middleware
   */
  private loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    
    if (this.config.logging?.logRequests) {
      this.logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        headers: this.config.logging.includeHeaders ? req.headers : undefined,
        body: this.config.logging.includeBody ? req.body : undefined
      });
    }

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (this.config.logging?.logResponses) {
        this.logger.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('Content-Length')
        });
      }
    });

    next();
  }

  /**
   * Create rate limiting middleware
   */
  private createRateLimitMiddleware() {
    // TODO: Implement proper rate limiting
    return (_req: Request, res: Response, next: NextFunction) => {
      // Placeholder rate limiting logic
      this.updateMetrics('rateLimitHits', 0);
      next();
    };
  }

  /**
   * Caching middleware
   */
  private cachingMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (this.config.cache?.skipMethods?.includes(req.method)) {
      return next();
    }

    const cacheKey = this.config.cache?.keyGenerator 
      ? this.config.cache.keyGenerator(req)
      : `${req.method}:${req.url}`;

    // Try to get from cache
    this.cache.get(cacheKey).then((cachedResponse: unknown) => {
      if (cachedResponse) {
        this.updateMetrics('cacheHits', 1);
        res.json(cachedResponse);
        return;
      }

      this.updateMetrics('cacheMisses', 1);

      // Intercept response to cache it
      const originalSend = res.send;
      res.send = function(body: unknown) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.cache.set(cacheKey, body, this.config.cache?.defaultTtl || 300);
        }
        return originalSend.call(this, body);
      }.bind(this);

      next();
    }).catch(() => {
      // Cache error, continue without caching
      next();
    });
  }

  /**
   * Validation middleware
   */
  private validationMiddleware(_req: Request, res: Response, next: NextFunction): void {
    // This is a placeholder - actual validation would be route-specific
    // In practice, this would be configured per route with specific schemas
    next();
  }

  /**
   * Setup error handling
   */
  setupErrorHandling(app: Application): void {
    if (this.config.errorHandling?.enabled) {
      // Setup global error handlers
      if (this.config.errorHandling.enableGlobalHandlers) {
        // setupGlobalErrorHandlers(); // TODO: Function not found
      }

      // Add unified error handler middleware (should be last)
      app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
        this.updateMetrics('totalErrors', 1);
        
        if (this.config.logging?.logErrors) {
          this.logger.error('Request error', {
            error: err.message,
            stack: this.config.errorHandling?.includeStackTrace ? err.stack : undefined,
            method: req.method,
            url: req.url,
            ip: req.ip
          });
        }

        unifiedErrorHandler(err, req, res, next);
      });
    }
  }

  /**
   * Setup health monitoring
   */
  setupHealthMonitoring(app: Application): void {
    if (this.config.health?.enabled) {
      const endpoint = this.config.health.endpoint || '/health';
      // TODO: Implement createHealthEndpoints
      app.get(endpoint, (_req: Request, res: Response) => {
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          metrics: this.config.health?.enableMetrics ? this.metrics : undefined
        });
      });
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(metric: keyof MiddlewareMetrics, value: number): void {
    if (metric === 'responseTime') {
      // Calculate rolling average
      const currentAvg = this.metrics.averageResponseTime;
      const totalRequests = this.metrics.totalRequests;
      this.metrics.averageResponseTime = (currentAvg * totalRequests + value) / (totalRequests + 1);
    } else {
      (this.metrics[metric] as number) += value;
    }

    if (metric !== 'responseTime') {
      this.metrics.totalRequests++;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): MiddlewareMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      responseTime: 0,
      rateLimitHits: 0,
      validationErrors: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}

/**
 * Create unified middleware with default configuration
 */
export function createUnifiedMiddleware(config: Partial<UnifiedMiddlewareConfig> = {}): UnifiedMiddleware {
  const defaultConfig: UnifiedMiddlewareConfig = {
    rateLimit: {
      enabled: true,
      algorithm: 'sliding-window',
      limit: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
      burstAllowance: 0.2
    },
    validation: {
      enabled: true,
      enableCaching: true,
      enablePreprocessing: true,
      enableBatchValidation: false
    },
    cache: {
      enabled: true,
      defaultTtl: 300 // 5 minutes
    },
    logging: {
      enabled: true,
      logRequests: true,
      logResponses: true,
      logErrors: true,
      includeHeaders: false,
      includeBody: false,
      redactSensitive: true
    },
    errorHandling: {
      enabled: true,
      includeStackTrace: process.env.NODE_ENV !== 'production',
      enableSentryReporting: false,
      enableGlobalHandlers: true
    },
    health: {
      enabled: true,
      endpoint: '/health',
      enableMetrics: true,
      enableDetailedChecks: true
    },
    performance: {
      enabled: true,
      enableMetrics: true,
      slowRequestThreshold: 1000 // 1 second
    }
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return new UnifiedMiddleware(mergedConfig);
}

/**
 * Setup complete middleware stack on Express app
 */
export function setupUnifiedMiddleware(
  app: Application, 
  config: Partial<UnifiedMiddlewareConfig> = {}
): UnifiedMiddleware {
  const middleware = createUnifiedMiddleware(config);
  
  // Apply middleware stack
  const middlewares = middleware.createMiddlewareStack();
  middlewares.forEach(mw => app.use(mw));
  
  // Setup error handling (must be after routes)
  middleware.setupErrorHandling(app);
  
  // Setup health monitoring
  middleware.setupHealthMonitoring(app);
  
  return middleware;
}

export default UnifiedMiddleware;















































