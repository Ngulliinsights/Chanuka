// === 1. Enhanced Configuration with Runtime Validation ===
// core/src/middleware/config/MiddlewareConfig.ts

import { z } from 'zod';

const middlewareFeatureSchema = z.object({
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  // Allow feature-specific configuration to be extended
  config: z.record(z.any()).optional()
});

export const middlewareConfigSchema = z.object({
  // Core middleware with configurable priorities
  logging: middlewareFeatureSchema.extend({
    priority: z.number().default(10) // Highest priority - runs first
  }),
  auth: middlewareFeatureSchema.extend({
    priority: z.number().default(20)
  }),
  cache: middlewareFeatureSchema.extend({
    priority: z.number().default(30)
  }),
  validation: middlewareFeatureSchema.extend({
    priority: z.number().default(40)
  }),
  rateLimit: middlewareFeatureSchema.extend({
    priority: z.number().default(50)
  }),
  health: middlewareFeatureSchema.extend({
    priority: z.number().default(60),
    config: z.object({
      endpoint: z.string().default('/health'),
      includeSystemMetrics: z.boolean().default(true)
    }).optional()
  }),
  errorHandler: middlewareFeatureSchema.extend({
    priority: z.number().default(90) // Lowest priority - runs last
  }),
  
  // Global settings
  global: z.object({
    enableLegacyMode: z.boolean().default(false),
    enableDeprecationWarnings: z.boolean().default(true),
    performanceMonitoring: z.boolean().default(false)
  }).default({})
});

export type MiddlewareConfig = z.infer<typeof middlewareConfigSchema>;

// === 2. Smart Factory with Dependency Injection ===
// core/src/middleware/factory/MiddlewareFactory.ts

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Logger } from '../../logging';
import { ValidationService } from '../../validation';
import { Container, injectable, inject } from 'inversify'; // For DI

export interface IMiddlewareProvider {
  readonly name: string;
  readonly priority: number;
  createHandler(config?: any): RequestHandler;
  isHealthy(): Promise<boolean>;
}

@injectable()
export class LoggingMiddlewareProvider implements IMiddlewareProvider {
  readonly name = 'logging';
  readonly priority = 10;
  
  constructor(@inject('Logger') private logger: Logger) {}
  
  createHandler(config?: any): RequestHandler {
    // Enhanced logging with request correlation IDs
    return (req: Request, res: Response, next: NextFunction) => {
      const correlationId = req.headers['x-correlation-id'] || 
        `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      req.correlationId = correlationId;
      res.setHeader('x-correlation-id', correlationId);
      
      return this.logger.requestLoggingMiddleware()(req, res, next);
    };
  }
  
  async isHealthy(): Promise<boolean> {
    return this.logger.isHealthy();
  }
}

@injectable()
export class AuthMiddlewareProvider implements IMiddlewareProvider {
  readonly name = 'auth';
  readonly priority = 20;
  
  constructor(@inject('AuthService') private authService: any) {}
  
  createHandler(config?: any): RequestHandler {
    // Smart auth with caching and fallback strategies
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if route requires auth (could be configured per-route)
        const requiresAuth = this.shouldAuthenticate(req);
        if (!requiresAuth) return next();
        
        await this.authService.authenticate(req, res, next);
      } catch (error) {
        // Graceful degradation in legacy mode
        if (config?.legacyFallback) {
          console.warn('Auth failed, continuing in legacy mode');
          return next();
        }
        next(error);
      }
    };
  }
  
  private shouldAuthenticate(req: Request): boolean {
    // Skip auth for health checks, static assets, etc.
    const skipPaths = ['/health', '/metrics', '/static'];
    return !skipPaths.some(path => req.path.startsWith(path));
  }
  
  async isHealthy(): Promise<boolean> {
    return this.authService?.isHealthy?.() ?? true;
  }
}

// === 3. Enhanced Unified Middleware with Error Recovery ===
// core/src/middleware/UnifiedMiddleware.ts

import { Router, RequestHandler } from 'express';
import { MiddlewareConfig, middlewareConfigSchema } from './config/MiddlewareConfig';
import { Container } from 'inversify';
import { IMiddlewareProvider } from './factory/MiddlewareFactory';
import { Logger } from '../logging';

export class UnifiedMiddlewareManager {
  private container: Container;
  private logger: Logger;
  private providers: Map<string, IMiddlewareProvider> = new Map();
  
  constructor(container: Container) {
    this.container = container;
    this.logger = container.get<Logger>('Logger');
  }
  
  registerProvider(provider: IMiddlewareProvider): void {
    this.providers.set(provider.name, provider);
  }
  
  async createMiddleware(userConfig?: Partial<MiddlewareConfig>): Promise<Router> {
    const config = middlewareConfigSchema.parse(userConfig ?? {});
    const router = Router({ mergeParams: true });
    
    // Sort middleware by priority (lower numbers run first)
    const enabledMiddleware = this.getSortedMiddleware(config);
    
    // Apply deprecation warnings if enabled
    if (config.global.enableDeprecationWarnings) {
      this.addDeprecationWarnings(router);
    }
    
    // Register middleware in priority order with error recovery
    for (const [name, middlewareConfig] of enabledMiddleware) {
      try {
        const provider = this.providers.get(name);
        if (!provider) {
          this.logger.warn(`Middleware provider '${name}' not found, skipping`);
          continue;
        }
        
        // Health check before registration
        const isHealthy = await provider.isHealthy();
        if (!isHealthy) {
          this.logger.error(`Middleware provider '${name}' failed health check`);
          if (!config.global.enableLegacyMode) throw new Error(`${name} middleware unhealthy`);
          continue;
        }
        
        const handler = provider.createHandler(middlewareConfig.config);
        const wrappedHandler = this.wrapWithErrorRecovery(handler, name);
        
        // Special handling for health endpoints
        if (name === 'health') {
          const endpoint = middlewareConfig.config?.endpoint ?? '/health';
          router.use(endpoint, wrappedHandler);
        } else {
          router.use(wrappedHandler);
        }
        
        this.logger.info(`Registered middleware: ${name} (priority: ${provider.priority})`);
        
      } catch (error) {
        this.logger.error(`Failed to register middleware '${name}':`, error);
        
        // In legacy mode, continue without the failed middleware
        if (config.global.enableLegacyMode) {
          this.logger.warn(`Continuing without ${name} middleware (legacy mode)`);
          continue;
        }
        
        throw error;
      }
    }
    
    return router;
  }
  
  private getSortedMiddleware(config: MiddlewareConfig): Array<[string, any]> {
    const entries = Object.entries(config)
      .filter(([key]) => key !== 'global')
      .filter(([_, value]) => value.enabled)
      .sort(([, a], [, b]) => a.priority - b.priority);
    
    return entries;
  }
  
  private wrapWithErrorRecovery(handler: RequestHandler, name: string): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Add performance monitoring if enabled
        const startTime = Date.now();
        
        const wrappedNext = (error?: any) => {
          if (error) {
            this.logger.error(`Middleware '${name}' error:`, error);
          }
          
          // Log performance metrics
          const duration = Date.now() - startTime;
          if (duration > 100) { // Log slow middleware
            this.logger.warn(`Slow middleware '${name}': ${duration}ms`);
          }
          
          next(error);
        };
        
        const result = handler(req, res, wrappedNext);
        
        // Handle async middleware
        if (result instanceof Promise) {
          result.catch(error => {
            this.logger.error(`Async middleware '${name}' error:`, error);
            wrappedNext(error);
          });
        }
        
      } catch (error) {
        this.logger.error(`Middleware '${name}' synchronous error:`, error);
        next(error);
      }
    };
  }
  
  private addDeprecationWarnings(router: Router): void {
    router.use((req: Request, res: Response, next: NextFunction) => {
      // Add deprecation headers for legacy endpoints
      const legacyPaths = ['/api/v1'];
      if (legacyPaths.some(path => req.path.startsWith(path))) {
        res.setHeader('Sunset', new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString());
        res.setHeader('Deprecation', 'true');
        res.setHeader('Link', '</api/v2>; rel="successor-version"');
      }
      next();
    });
  }
}

// === 4. Legacy Bridge Pattern ===
// core/src/middleware/legacy/LegacyBridge.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/core/src/utils/logger';

export class LegacyBridge {
  private legacyMiddleware: Map<string, RequestHandler> = new Map();
  
  registerLegacy(name: string, handler: RequestHandler): void {
    this.legacyMiddleware.set(name, handler);
  }
  
  createBridgeHandler(name: string): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const legacyHandler = this.legacyMiddleware.get(name);
      if (!legacyHandler) {
        console.warn(`Legacy middleware '${name}' not found`);
        return next();
      }
      
      // Add compatibility layer for old middleware expectations
      this.addCompatibilityLayer(req, res);
      
      try {
        return legacyHandler(req, res, next);
      } catch (error) {
        console.error(`Legacy middleware '${name}' error:`, error);
        next(error);
      }
    };
  }
  
  private addCompatibilityLayer(req: Request, res: Response): void {
    // Ensure backward compatibility for common patterns
    if (!req.user) req.user = undefined;
    if (!req.session) req.session = {} as any;
    if (!res.locals) res.locals = {};
  }
}

// === 5. Migration Helper ===
// core/src/middleware/migration/MigrationHelper.ts

export class MigrationHelper {
  static createGradualMigration() {
    return {
      // Feature flag based migration
      byFeatureFlag: (featureFlagName: string = 'USE_UNIFIED_MIDDLEWARE') => {
        return process.env[featureFlagName] === 'true';
      },
      
      // Percentage based rollout
      byPercentage: (percentage: number = 0) => {
        const hash = this.hashRequest();
        return (hash % 100) < percentage;
      },
      
      // Route-based migration
      byRoute: (req: Request) => {
        const newRoutes = ['/api/v2', '/graphql'];
        return newRoutes.some(route => req.path.startsWith(route));
      },
      
      // User-based migration (for gradual user rollout)
      byUser: (req: Request) => {
        const userId = req.user?.id || req.headers['x-user-id'];
        if (!userId) return false;
        
        // Use consistent hashing for stable rollout
        const hash = this.hashString(String(userId));
        return (hash % 100) < 10; // 10% of users
      }
    };
  }
  
  private static hashRequest(): number {
    return Math.floor(Math.random() * 100);
  }
  
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}






