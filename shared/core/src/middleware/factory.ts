/**
 * Middleware Factory
 * 
 * Factory class for creating middleware instances with proper configuration
 */

import { Request, Response, NextFunction } from 'express';

export interface MiddlewareConfig {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableRateLimit?: boolean;
  enableCaching?: boolean;
  // Allow any additional properties for flexibility
  [key: string]: any;
}

export interface MiddlewareServices {
  logger?: any;
  cache?: any;
  rateLimiter?: any;
  metrics?: any;
}

export class MiddlewareFactory {
  constructor(
    private config: MiddlewareConfig,
    private services: MiddlewareServices = {}
  ) {}

  createLoggingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.config.enableLogging && this.services.logger) {
        this.services.logger.info(`${req.method} ${req.path}`);
      }
      next();
    };
  }

  createMetricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.config.enableMetrics && this.services.metrics) {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          this.services.metrics.record('request_duration', duration);
        });
      }
      next();
    };
  }

  createCachingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Basic caching middleware implementation
      next();
    };
  }

  createRateLimitMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Basic rate limiting middleware implementation
      next();
    };
  }

  createCompositeMiddleware() {
    const middlewares = [];
    
    if (this.config.enableLogging) {
      middlewares.push(this.createLoggingMiddleware());
    }
    
    if (this.config.enableMetrics) {
      middlewares.push(this.createMetricsMiddleware());
    }
    
    if (this.config.enableRateLimit) {
      middlewares.push(this.createRateLimitMiddleware());
    }
    
    if (this.config.enableCaching) {
      middlewares.push(this.createCachingMiddleware());
    }

    return (req: Request, res: Response, next: NextFunction) => {
      let index = 0;
      
      function runNext() {
        if (index >= middlewares.length) {
          return next();
        }
        
        const middleware = middlewares[index++];
        middleware(req, res, runNext);
      }
      
      runNext();
    };
  }

  createMiddleware() {
    return [
      (app: any) => app.use(this.createLoggingMiddleware()),
      (app: any) => app.use(this.createMetricsMiddleware()),
      (app: any) => app.use(this.createRateLimitMiddleware()),
      (app: any) => app.use(this.createCachingMiddleware())
    ];
  }
}