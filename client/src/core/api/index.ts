/**
 * Circuit Breaker API Module
 * 
 * Exports all circuit breaker functionality for easy importing
 * throughout the application.
 */

// Core circuit breaker client
export {
  CircuitBreakerClient,
  createCircuitBreakerClient,
  apiClients,
  type CircuitBreakerClientConfig,
  type RequestConfig,
  type ApiResponse
} from './circuit-breaker-client';

// Retry handler
export {
  RetryHandler,
  createRetryHandler,
  retryOperation,
  retryHandlers,
  DEFAULT_RETRY_CONFIG,
  SERVICE_RETRY_CONFIGS,
  type RetryConfig,
  type RetryContext,
  type RetryResult
} from './retry-handler';

// Circuit breaker monitoring
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
  type ErrorCorrelation
} from './circuit-breaker-monitor';

// Interceptors (for advanced usage)
export {
  processRequestInterceptors,
  processResponseInterceptors,
  circuitBreakerInterceptor,
  circuitBreakerResponseInterceptor,
  getCircuitBreakerStats,
  addRequestInterceptor,
  addResponseInterceptor,
  removeRequestInterceptor,
  removeResponseInterceptor
} from './interceptors';

// Usage examples
export { examples } from './examples/circuit-breaker-usage';

// Authentication API service
export {
  AuthApiService,
  createAuthApiService,
  authApiService,
  type LoginCredentials,
  type RegisterData,
  type AuthUser,
  type UserPreferences,
  type AuthTokens
} from './auth';

// Analytics API service
export {
  AnalyticsApiService,
  createAnalyticsApiService,
  analyticsApiService
} from './analytics';

// Global API client
export { globalApiClient } from './client';

// Re-export BaseError for convenience
export { BaseError, ErrorDomain, ErrorSeverity } from '@client/utils/logger';