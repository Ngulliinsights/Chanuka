/**
 * HTTP Client Sub-Module
 * 
 * Consolidated HTTP client functionality including:
 * - HTTP client with request methods (GET, POST, PUT, DELETE, PATCH)
 * - Request/response interceptors
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Response caching
 * - Request deduplication
 */

// Main HTTP client (already in parent api directory)
export { 
  UnifiedApiClientImpl,
  globalApiClient,
  createAuthRequestInterceptor,
  createLoggingResponseInterceptor,
} from '../client';

// Authentication interceptors
export {
  AuthenticationInterceptor,
  TokenRefreshInterceptor,
  createAuthInterceptors,
  shouldRefreshToken,
  proactiveTokenRefresh,
  DEFAULT_AUTH_CONFIG,
  type AuthConfig,
} from '../authentication';

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
} from '../retry';

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
} from '../cache-manager';

// Circuit breaker
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
} from '../circuit-breaker-monitor';

// Request deduplication
export {
  RequestDeduplicator,
  requestDeduplicator,
} from './request-deduplicator';

// Interceptor types
export type {
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  BaseClientRequest,
  BaseClientResponse,
} from '../types/interceptors';

// HTTP types
export type {
  ApiRequest,
  ApiResponse,
  RequestOptions,
  HttpMethod,
} from '../types';
