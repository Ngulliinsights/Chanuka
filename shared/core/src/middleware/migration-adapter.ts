// Migration adapter for middleware
// Provides backward compatibility during middleware migration

import { Request, Response, NextFunction } from 'express';
import { MiddlewareFactory, ServiceContainer } from './factory';
import { getMiddlewareFeatureFlags, shouldRouteToModernMiddleware, shouldEnableMiddlewareFallback } from './feature-flags';
import { logger } from '../observability/logging';

export interface LegacyMiddlewareFactory {
  createAuth?(options?: any): (req: Request, res: Response, next: NextFunction) => void;
  createRateLimit?(options?: any): (req: Request, res: Response, next: NextFunction) => void;
  createValidation?(options?: any): (req: Request, res: Response, next: NextFunction) => void;
  createCache?(options?: any): (req: Request, res: Response, next: NextFunction) => void;
  createErrorHandler?(options?: any): (error: Error, req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Migration adapter that routes between legacy and modern middleware implementations
 * based on feature flags and migration percentage.
 */
export class MiddlewareMigrationAdapter {
  private modernFactory: MiddlewareFactory;
  private legacyFactory: LegacyMiddlewareFactory;
  private flags = getMiddlewareFeatureFlags();

  constructor(
    legacyFactory: LegacyMiddlewareFactory,
    services: ServiceContainer,
    config: any = {}
  ) {
    this.legacyFactory = legacyFactory;
    this.modernFactory = new MiddlewareFactory({
      global: { enabled: true, priority: 0 },
      auth: { enabled: true, priority: 10 },
      rateLimit: { enabled: true, priority: 20 },
      validation: { enabled: true, priority: 30 },
      cache: { enabled: true, priority: 40 },
      errorHandler: { enabled: true, priority: 90 },
      ...config
    }, services);

    // Refresh flags periodically
    setInterval(() => {
      this.flags = getMiddlewareFeatureFlags();
    }, 30000); // Refresh every 30 seconds
  }

  /**
   * Create authentication middleware with migration support
   */
  createAuth(options: any = {}): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const useModern = shouldRouteToModernMiddleware(this.flags, req.headers['x-request-id'] as string);

      if (useModern) {
        try {
          const modernMiddleware = this.modernFactory.createAuth(options);
          if (modernMiddleware.isOk()) {
            return modernMiddleware.unwrap()(req, res, next);
          } else {
            logger.warn('Modern auth middleware creation failed, falling back to legacy', {
              component: 'middleware-migration',
              error: modernMiddleware.error?.message
            });
          }
        } catch (error) {
          logger.error('Modern auth middleware error, falling back to legacy', {
            component: 'middleware-migration',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Use legacy middleware
      if (this.legacyFactory.createAuth) {
        const legacyMiddleware = this.legacyFactory.createAuth(options);
        return legacyMiddleware(req, res, next);
      }

      // No middleware available
      logger.error('No auth middleware available', { component: 'middleware-migration' });
      next();
    };
  }

  /**
   * Create rate limiting middleware with migration support
   */
  createRateLimit(options: any = {}): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const useModern = shouldRouteToModernMiddleware(this.flags, req.headers['x-request-id'] as string);

      if (useModern) {
        try {
          const modernMiddleware = this.modernFactory.createRateLimit(options);
          if (modernMiddleware.isOk()) {
            return modernMiddleware.unwrap()(req, res, next);
          } else {
            logger.warn('Modern rate limit middleware creation failed, falling back to legacy', {
              component: 'middleware-migration',
              error: modernMiddleware.error?.message
            });
          }
        } catch (error) {
          logger.error('Modern rate limit middleware error, falling back to legacy', {
            component: 'middleware-migration',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Use legacy middleware
      if (this.legacyFactory.createRateLimit) {
        const legacyMiddleware = this.legacyFactory.createRateLimit(options);
        return legacyMiddleware(req, res, next);
      }

      // No middleware available
      logger.error('No rate limit middleware available', { component: 'middleware-migration' });
      next();
    };
  }

  /**
   * Create validation middleware with migration support
   */
  createValidation(options: any = {}): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const useModern = shouldRouteToModernMiddleware(this.flags, req.headers['x-request-id'] as string);

      if (useModern) {
        try {
          const modernMiddleware = this.modernFactory.createValidation(options);
          if (modernMiddleware.isOk()) {
            return modernMiddleware.unwrap()(req, res, next);
          } else {
            logger.warn('Modern validation middleware creation failed, falling back to legacy', {
              component: 'middleware-migration',
              error: modernMiddleware.error?.message
            });
          }
        } catch (error) {
          logger.error('Modern validation middleware error, falling back to legacy', {
            component: 'middleware-migration',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Use legacy middleware
      if (this.legacyFactory.createValidation) {
        const legacyMiddleware = this.legacyFactory.createValidation(options);
        return legacyMiddleware(req, res, next);
      }

      // No middleware available
      logger.error('No validation middleware available', { component: 'middleware-migration' });
      next();
    };
  }

  /**
   * Create cache middleware with migration support
   */
  createCache(options: any = {}): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const useModern = shouldRouteToModernMiddleware(this.flags, req.headers['x-request-id'] as string);

      if (useModern) {
        try {
          const modernMiddleware = this.modernFactory.createCache(options);
          if (modernMiddleware.isOk()) {
            return modernMiddleware.unwrap()(req, res, next);
          } else {
            logger.warn('Modern cache middleware creation failed, falling back to legacy', {
              component: 'middleware-migration',
              error: modernMiddleware.error?.message
            });
          }
        } catch (error) {
          logger.error('Modern cache middleware error, falling back to legacy', {
            component: 'middleware-migration',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Use legacy middleware
      if (this.legacyFactory.createCache) {
        const legacyMiddleware = this.legacyFactory.createCache(options);
        return legacyMiddleware(req, res, next);
      }

      // No middleware available
      logger.error('No cache middleware available', { component: 'middleware-migration' });
      next();
    };
  }

  /**
   * Create error handler middleware with migration support
   */
  createErrorHandler(options: any = {}): (error: Error, req: Request, res: Response, next: NextFunction) => void {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const useModern = shouldRouteToModernMiddleware(this.flags, req.headers['x-request-id'] as string);

      if (useModern) {
        try {
          const modernMiddleware = this.modernFactory.createErrorHandler(options);
          if (modernMiddleware.isOk()) {
            return modernMiddleware.unwrap()(error, req, res, next);
          } else {
            logger.warn('Modern error handler middleware creation failed, falling back to legacy', {
              component: 'middleware-migration',
              error: modernMiddleware.error?.message
            });
          }
        } catch (middlewareError) {
          logger.error('Modern error handler middleware error, falling back to legacy', {
            component: 'middleware-migration',
            error: middlewareError instanceof Error ? middlewareError.message : 'Unknown error'
          });
        }
      }

      // Use legacy middleware
      if (this.legacyFactory.createErrorHandler) {
        const legacyMiddleware = this.legacyFactory.createErrorHandler(options);
        return legacyMiddleware(error, req, res, next);
      }

      // No middleware available
      logger.error('No error handler middleware available', { component: 'middleware-migration' });
      next(error);
    };
  }

  /**
   * Get migration statistics
   */
  getMigrationStats() {
    return {
      flags: this.flags,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create a middleware migration adapter
 */
export function createMiddlewareMigrationAdapter(
  legacyFactory: LegacyMiddlewareFactory,
  services: ServiceContainer,
  config: any = {}
): MiddlewareMigrationAdapter {
  return new MiddlewareMigrationAdapter(legacyFactory, services, config);
}