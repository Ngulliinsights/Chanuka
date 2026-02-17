// Migration wrapper for server middleware
// Provides gradual migration from legacy middleware to modern middleware

import { logger } from '@server/infrastructure/observability';

import { authenticateToken, requireRole } from './auth';
import { apiRateLimit, authRateLimit, createRateLimit, legacyPasswordResetRateLimit, legacyRegistrationRateLimit,legacySponsorRateLimit, searchRateLimit } from './rate-limiter';

// Legacy middleware factory interface
interface LegacyMiddlewareFactory {
  createAuth?(options?: unknown): unknown;
  createRateLimit?(options?: unknown): unknown;
  createValidation?(options?: unknown): unknown;
  createCache?(options?: unknown): unknown;
  createErrorHandler?(options?: unknown): unknown;
}

// Create legacy factory wrapper
const legacyFactory: LegacyMiddlewareFactory = {
  createAuth: (options?: unknown) => authenticateToken,
  createRateLimit: (options?: unknown) => createRateLimit(options),
  createValidation: () => (req: unknown, res: unknown, next: unknown) => next(), // Placeholder
  createCache: () => (req: unknown, res: unknown, next: unknown) => next(), // Placeholder
  createErrorHandler: () => (error: unknown, req: unknown, res: unknown, next: unknown) => next(error), // Placeholder
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
    info: (message: string, context?: unknown, metadata?: unknown) => logger.info(message, context, metadata),
    warn: (message: string, context?: unknown, metadata?: unknown) => logger.warn(message, context, metadata),
    error: (message: string, context?: unknown, metadata?: unknown) => logger.error(message, context, metadata),
    debug: (message: string, context?: unknown, metadata?: unknown) => logger.debug(message, context, metadata),
  }
};

// Create migration adapter (placeholder - migration not yet active)
const middlewareMigrationAdapter = {
  createAuth: () => authenticateToken,
  createRateLimit: (options?: unknown) => createRateLimit(options || { max: 100, windowMs: 15 * 60 * 1000 }),
};

// Export migrated middleware functions (using legacy implementations for now)
export const migratedAuthenticateToken = authenticateToken;
export const migratedRequireRole = requireRole; // Keep legacy for now
export const migratedCreateRateLimit = createRateLimit;
export const migratedApiRateLimit = apiRateLimit;
export const migratedAuthRateLimit = authRateLimit;
export const migratedSponsorRateLimit = legacySponsorRateLimit;
export const migratedSearchRateLimit = searchRateLimit;
export const migratedPasswordResetRateLimit = legacyPasswordResetRateLimit;
export const migratedRegistrationRateLimit = legacyRegistrationRateLimit;

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
  legacySponsorRateLimit as sponsorRateLimit,
  searchRateLimit,
  legacyPasswordResetRateLimit as passwordResetRateLimit,
  legacyRegistrationRateLimit as registrationRateLimit
};

