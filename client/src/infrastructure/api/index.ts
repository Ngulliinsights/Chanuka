/**
 * Core API Module - Modular API System
 *
 * This module provides comprehensive API functionality including:
 * - Base HTTP client with retry logic and caching
 * - Authentication with automatic token refresh
 * - Safe API wrapper for error handling
 * - Request deduplication and batching
 * - Circuit breaker and monitoring
 * 
 * MIGRATION NOTE:
 * Domain-specific API services have been moved to their respective feature modules:
 * - Bills API → @client/features/bills/services/api
 * - Community API → @client/features/community/services/api
 * - Analytics API → @client/features/analytics/services/api
 * - User API → @client/features/users/services/api
 * - Search API → @client/features/search/services/api
 */

// Core API clients



// Authentication
export {
  AuthenticationInterceptor,
  TokenRefreshInterceptor,
  createAuthInterceptors,
  shouldRefreshToken,
  proactiveTokenRefresh,
  DEFAULT_AUTH_CONFIG,
  type AuthConfig,
} from './authentication';

// Retry logic
export {
  RetryHandler,
  retryOperation,
  safeRetryOperation,
  createHttpRetryHandler,
  createServiceRetryHandler,
  DEFAULT_RETRY_CONFIG,
  SERVICE_RETRY_CONFIGS,
  type RetryConfig,
  type RetryContext,
  type RetryResult,
} from './retry';

// Cache management
export {
  ApiCacheManager,
  CacheKeyGenerator,
  globalCache,
  DEFAULT_CACHE_CONFIG,
  type CacheEntry,
  type CacheConfig,
  type CacheStats,
  type InvalidationOptions,
} from './cache-manager';



export {
  CircuitBreakerMonitor,
  circuitBreakerMonitor,
  recordCircuitBreakerEvent,
  recordError,
  getServiceHealth,
  getErrorCorrelations,
  getMonitoringStatus,
  type CircuitBreakerEvent,
  type ServiceHealthStatus,
  type ErrorCorrelation,
} from './circuit-breaker-monitor';

// Service APIs - Auth is cross-cutting and stays in infrastructure
export {
  AuthApiService,
  createAuthApiService,
  authApiService,
  type LoginCredentials,
  type RegisterData,
  type AuthUser,
  type UserPreferences,
  type AuthTokens,
} from '../auth'; // Use consolidated auth system

// NOTE: Domain-specific API services have been moved to features:
// - analyticsApiService → @client/features/analytics/services/api
// - billsApiService → @client/features/bills/services/api
// - communityApiService → @client/features/community/services/api
// - userApiService → @client/features/users/services/api
// - searchApiService → @client/features/search/services/api

// Global clients
export { globalApiClient } from './client';
export { contractApiClient } from './contract-client';

// Types
export * from './types';

// Error handling
export {
  type APIErrorCode,
  type APIErrorDetails,
  type APIError,
  NetworkError,
  TimeoutError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  createAPIError,
} from './errors';

// Re-export error types for convenience
export { ErrorDomain, ErrorSeverity } from '../error';
