/**
 * Core API Module - Unified API System
 *
 * This module provides comprehensive API functionality including:
 * - HTTP client with retry logic, caching, and circuit breaker
 * - WebSocket client with reconnection and subscriptions
 * - Realtime event hub with pub/sub messaging
 * - Authentication with automatic token refresh
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

// ============================================================================
// HTTP Client Sub-Module
// ============================================================================

// Core HTTP client
export { 
  UnifiedApiClientImpl,
  globalApiClient,
  createAuthRequestInterceptor,
  createLoggingResponseInterceptor,
} from './client';

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
} from './circuit-breaker-monitor';

// Request deduplication
export {
  RequestDeduplicator,
  requestDeduplicator,
} from './http/request-deduplicator';

// ============================================================================
// WebSocket Client Sub-Module
// ============================================================================

// Unified WebSocket client
export {
  UnifiedWebSocketClient,
  createWebSocketClient,
} from './websocket/client';

// Legacy WebSocket manager (for backward compatibility)
export {
  WebSocketManager,
  WebSocketManagerImpl,
  createWebSocketManager,
  type ReconnectionConfig,
} from './websocket/manager';

// ============================================================================
// Realtime Client Sub-Module
// ============================================================================

// Unified realtime client
export {
  UnifiedRealtimeClient,
  createRealtimeClient,
} from './realtime/client';

// Legacy realtime hub (for backward compatibility)
// Note: The full realtime module remains in infrastructure/realtime
// Import from there for legacy features like RealTimeHub, services, and hooks

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

// WebSocket types
export type {
  IWebSocketClient,
  WebSocketOptions,
  WebSocketClientEvents,
  WebSocketError,
} from './types/websocket';

// Realtime types
export type {
  IRealtimeClient,
  Subscription,
  EventHandler,
  RealtimeEvent,
  RealtimeOptions,
  RealtimeHubState,
} from './types/realtime';

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
