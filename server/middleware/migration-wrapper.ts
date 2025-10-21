// Migration wrapper for server middleware
// Provides gradual migration from legacy middleware to modern middleware

import { authenticateToken, requireRole } from './auth';
import { createRateLimit, apiRateLimit, authRateLimit, sponsorRateLimit, searchRateLimit, passwordResetRateLimit, registrationRateLimit } from './rate-limiter';
import { createMiddlewareMigrationAdapter } from '../../shared/core/src/middleware/migration-adapter';
import { logger } from '../../shared/core/src/observability/logging';

// Legacy middleware factory interface
interface LegacyMiddlewareFactory {
  createAuth?(options?: any): any;
  createRateLimit?(options?: any): any;
  createValidation?(options?: any): any;
  createCache?(options?: any): any;
  createErrorHandler?(options?: any): any;
}

// Create legacy factory wrapper
const legacyFactory: LegacyMiddlewareFactory = {
  createAuth: (options?: any) => authenticateToken,
  createRateLimit: (options?: any) => createRateLimit(options),
  createValidation: () => (req: any, res: any, next: any) => next(), // Placeholder
  createCache: () => (req: any, res: any, next: any) => next(), // Placeholder
  createErrorHandler: () => (error: any, req: any, res: any, next: any) => next(error), // Placeholder
};

// Create service container for modern middleware
const serviceContainer = {
  cache: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    clear: async () => {},
  },
  validator: {
    validate: () => ({ valid: true })
  },
  rateLimitStore: {
    increment: async () => 1,
    decrement: async () => {},
    resetKey: async () => {},
    reset: async () => {},
  },
  healthChecker: {
    check: async () => ({ status: 'healthy' as const })
  },
  logger: {
    info: (message: string, context?: any, metadata?: any) => logger.info(message, context, metadata),
    warn: (message: string, context?: any, metadata?: any) => logger.warn(message, context, metadata),
    error: (message: string, context?: any, metadata?: any) => logger.error(message, context, metadata),
    debug: (message: string, context?: any, metadata?: any) => logger.debug(message, context, metadata),
  }
};

// Create migration adapter
const middlewareMigrationAdapter = createMiddlewareMigrationAdapter(
  legacyFactory,
  serviceContainer
);

// Export migrated middleware functions
export const migratedAuthenticateToken = middlewareMigrationAdapter.createAuth();
export const migratedRequireRole = requireRole; // Keep legacy for now
export const migratedCreateRateLimit = middlewareMigrationAdapter.createRateLimit.bind(middlewareMigrationAdapter);
export const migratedApiRateLimit = middlewareMigrationAdapter.createRateLimit({ max: 100, windowMs: 15 * 60 * 1000 });
export const migratedAuthRateLimit = middlewareMigrationAdapter.createRateLimit({ max: 5, windowMs: 15 * 60 * 1000 });
export const migratedSponsorRateLimit = middlewareMigrationAdapter.createRateLimit({ max: 200, windowMs: 10 * 60 * 1000 });
export const migratedSearchRateLimit = middlewareMigrationAdapter.createRateLimit({ max: 50, windowMs: 5 * 60 * 1000 });
export const migratedPasswordResetRateLimit = middlewareMigrationAdapter.createRateLimit({ max: 3, windowMs: 60 * 60 * 1000 });
export const migratedRegistrationRateLimit = middlewareMigrationAdapter.createRateLimit({ max: 5, windowMs: 60 * 60 * 1000 });

// Validation function for testing migration
export async function validateMiddlewareMigration(): Promise<boolean> {
  try {
    logger.info('Middleware migration validation placeholder - migration not yet active', {
      component: 'middleware-migration'
    });
    return true; // Placeholder - return true until migration is active
  } catch (error) {
    logger.error('Middleware migration validation error', {
      component: 'middleware-migration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

// Legacy exports for backward compatibility
export {
  authenticateToken,
  requireRole,
  createRateLimit,
  apiRateLimit,
  authRateLimit,
  sponsorRateLimit,
  searchRateLimit,
  passwordResetRateLimit,
  registrationRateLimit
};