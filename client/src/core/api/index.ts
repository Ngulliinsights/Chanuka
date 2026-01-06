/**
 * Core API Module - Modular API System
 *
 * This module provides comprehensive API functionality including:
 * - Base HTTP client with retry logic and caching
 * - Authentication with automatic token refresh
 * - Safe API wrapper for error handling
 * - Request deduplication and batching
 * - Circuit breaker and monitoring
 */

// Core API clients
export {
  BaseApiClient,
  DEFAULT_API_CONFIG,
  type ApiRequest,
  type ApiResponse,
  type ApiClientConfig,
  type RequestInterceptor,
  type ResponseInterceptor,
  type ErrorInterceptor,
  type ApiError,
  type HttpMethod,
  type RequestBody,
} from './base-client';

export { AuthenticatedApiClient, type AuthenticatedApiClientConfig } from './authenticated-client';

export { SafeApiClient, type SafeApiResult } from './safe-client';

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

// Legacy circuit breaker exports (for backward compatibility)
export {
  CircuitBreakerClient,
  createCircuitBreakerClient,
  apiClients,
  type CircuitBreakerClientConfig,
  type RequestConfig,
} from './circuit-breaker-client';

export {
  RetryHandler as LegacyRetryHandler,
  createRetryHandler,
  retryHandlers,
} from './retry-handler';

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

// Service APIs - Auth now comes from consolidated system
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

export { AnalyticsApiService, createAnalyticsApiService, analyticsApiService } from './analytics';

// Global clients
export { globalApiClient } from './client';

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
