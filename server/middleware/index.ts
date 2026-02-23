/**
 * Middleware Barrel
 *
 * Re-exports all live middleware for convenient imports.
 */

// Auth
export { authenticateToken, requireRole } from './auth';
export type { AuthenticatedRequest } from './auth';
export {
  isAuthenticatedRequest,
  hasRole,
  getUserId,
  type AuthenticatedUser,
  type PrivacyRequest,
} from './auth-types';

// Rate limiting
export { standardRateLimits } from './rate-limiter';

// Validation (Zod-based request validation)
export {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
  validateMultiple,
  type ValidationTarget,
  type ValidationOptions,
  type ValidationErrorDetail,
  type ValidationErrorResponse,
} from './validation-middleware';

// API contract validation
export {
  validateApiContract,
  validateApiContractWithParams,
  validateApiContractWithQuery,
  validateApiContractWithParamsAndQuery,
  validateApiResponse,
  createValidationMiddleware,
  createValidationMiddlewareWithParams,
  createValidationMiddlewareWithQuery,
  createValidationMiddlewareWithParamsAndQuery,
} from './api-contract-validation';

// Error handling
export {
  boomErrorMiddleware,
  asyncErrorHandler,
  errorContextMiddleware,
} from './boom-error-middleware';

export {
  correlationIdMiddleware,
  createUnifiedErrorMiddleware,
  asyncHandler,
  validationErrorHandler,
} from './error-management';

// Privacy
export {
  checkDataProcessingConsent,
  checkDataSharingConsent,
  logDataAccess,
  enforceCookieConsent,
  addPrivacyHeaders,
  validateDataRetention,
  anonymizeIP,
} from './privacy-middleware';

// Caching
export {
  createCacheMiddleware,
  cacheMiddleware,
  createCacheInvalidationMiddleware,
  type CacheOptions,
} from './cache-middleware';

// Circuit breaker
export {
  circuitBreakerFetch,
  circuitBreakerRequest,
  retryWithCircuitBreaker,
  getCircuitBreakerMetrics,
  resetCircuitBreaker,
  forceCircuitBreakerState,
  getCircuitBreakerHealth,
} from './circuit-breaker-middleware';

// Service availability (health gate)
export {
  serviceAvailabilityMiddleware,
  serviceManager,
} from './service-availability';

// Safeguards (moderation + behavioral analytics)
export { safeguardsMiddleware } from './safeguards';

// App-level middleware composition
export { configureAppMiddleware } from './app-middleware';