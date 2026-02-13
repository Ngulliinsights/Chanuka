/**
 * Unified Middleware Integration
 * 
 * Consolidates all core utilities into a comprehensive middleware system
 * Based on requirements from tasks.md
 */

// Core middleware types and interfaces
export type {
  RegularMiddleware,
  ErrorMiddleware,
  AnyMiddleware,
  PerformanceMetrics,
  MiddlewareProvider
} from './types';

// Enhanced middleware factory
export { MiddlewareFactory } from '../../../server/middleware/middleware-factory';
import { MiddlewareFactory } from '../../../server/middleware/middleware-factory';
export { MiddlewareRegistry } from '../../../server/middleware/middleware-registry';

// Individual middleware providers
export { AuthMiddlewareProvider } from './auth/provider';
export { CacheMiddlewareProvider } from './cache/provider';
export { ValidationMiddlewareProvider } from './validation/provider';
export { RateLimitMiddlewareProvider } from './rate-limit/provider';
export { ErrorHandlerMiddlewareProvider } from './error-handler/provider';

// Enhanced middleware integrations
export { createUnifiedMiddleware } from '../../../server/middleware/unified-middleware';
// Middleware chain functionality removed by design during development

// Utility functions
export { applyMiddleware } from '../../../server/middleware/middleware-registry';

// Re-export specific middleware from core utilities
export { rateLimitMiddleware } from '../rate-limiting';
export { unifiedErrorHandler } from '../observability/error-management/middleware/express-error-middleware.js';
// export { createHealthEndpoints } from '../observability/health/health-checker'; // TODO: Fix missing export

// Convenience functions for common middleware setups
export function createBasicMiddlewareStack(services: {
  cache?: any;
  validator?: any;
  rateLimitStore?: any;
  logger?: any;
}) {
  const config = {
    global: {
      enabled: true,
      priority: 0,
      performanceMonitoring: true,
      metricsRetentionSize: 1000,
      logMetricsInterval: 100
    },
    auth: {
      enabled: false,
      priority: 10
    },
    rateLimit: {
      enabled: !!services.rateLimitStore,
      priority: 20,
      options: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100
      }
    },
    validation: {
      enabled: !!services.validator,
      priority: 30
    },
    cache: {
      enabled: !!services.cache,
      priority: 40,
      options: {
        ttl: 300, // 5 minutes
        key: 'api'
      }
    },
    errorHandler: {
      enabled: true,
      priority: 1000, // Last middleware
      options: {
        includeStackTrace: process.env.NODE_ENV === 'development',
        enableSentry: process.env.NODE_ENV === 'production'
      }
    }
  };

  return new MiddlewareFactory(config, services);
}

export function createProductionMiddlewareStack(services: {
  cache: any;
  validator: any;
  rateLimitStore: any;
  logger: any;
  authService?: any;
}) {
  const config = {
    global: {
      enabled: true,
      priority: 0,
      performanceMonitoring: true,
      metricsRetentionSize: 5000,
      logMetricsInterval: 1000
    },
    auth: {
      enabled: !!services.authService,
      priority: 10,
      options: {
        requireAuth: true,
        skipPaths: ['/health', '/metrics']
      }
    },
    rateLimit: {
      enabled: true,
      priority: 20,
      options: {
        windowMs: 15 * 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false
      }
    },
    validation: {
      enabled: true,
      priority: 30,
      options: {
        enableCaching: true,
        strictMode: true
      }
    },
    cache: {
      enabled: true,
      priority: 40,
      options: {
        ttl: 600, // 10 minutes
        key: 'prod-api',
        enableCompression: true
      }
    },
    errorHandler: {
      enabled: true,
      priority: 1000,
      options: {
        includeStackTrace: false,
        enableSentry: true,
        enableAutoRecovery: true
      }
    }
  };

  return new MiddlewareFactory(config, services);
}















































