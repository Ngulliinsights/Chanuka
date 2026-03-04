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
  WebSocketManagerImpl as WebSocketManager,
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
export { contractApiClient } from './contract-client';
export const analyticsApiService = {
  trackEvent: async (event: unknown) => ({ data: {} }),
  getEvents: async () => ({ data: [] }),
  getDashboard: async (filters?: Record<string, unknown>) => ({
    data: {
      summary: {
        total_bills: 0,
        total_views: 0,
        total_engagement: 0,
        average_time_spent: 0,
        top_categories: [],
        engagement_trends: [],
        user_demographics: { total_users: 0, active_users: 0, new_users: 0, returning_users: 0 }
      },
      top_bills: [],
      recent_activity: [],
      alerts: [],
      performance_metrics: { page_load_time: 0, api_response_time: 0, error_rate: 0, uptime: 100 }
    }
  }),
  getSummary: async (filters?: any) => ({
    data: {
      total_bills: 0,
      total_views: 0,
      total_engagement: 0,
      average_time_spent: 0,
      top_categories: [],
      engagement_trends: [],
      user_demographics: { total_users: 0, active_users: 0, new_users: 0, returning_users: 0 }
    }
  }),
  getBillAnalytics: async (bill_id: string, filters?: any) => ({
    data: {
      bill_id,
      title: '',
      views: 0,
      comments_count: 0,
      engagement_score: 0,
      trending_score: 0,
      sentiment_score: 0,
      support_level: 0,
      opposition_level: 0,
      neutral_level: 0,
      categories: [],
      tags: [],
      last_updated: new Date().toISOString()
    }
  }),
  getConflictReport: async (bill_id: string) => ({
    data: {
      bill_id,
      conflict_score: 0,
      conflicts: [],
      stakeholder_analysis: [],
      network_analysis: { nodes: [], edges: [] }
    }
  }),
  getEngagementReport: async (bill_id: string, filters?: any) => ({
    data: {
      bill_id,
      total_engagement: 0,
      engagement_breakdown: { views: 0, comments: 0, votes: 0, shares: 0, bookmarks: 0 },
      engagement_timeline: [],
      user_segments: [],
      peak_engagement_times: []
    }
  }),
  getUserActivity: async (userId?: string, filters?: any) => ({
    data: [],
    meta: { total: 0, page: 1, limit: 10, has_more: false },
    execution_time: 0,
    cached: false
  }),
  getTopBills: async (limit?: number, filters?: any) => ({ data: [] }),
  getAlerts: async (acknowledged?: boolean) => ({ data: [] }),
  getTrendingTopics: async (limit?: number) => ({ data: [] }),
  getStakeholderAnalysis: async (billId?: string) => ({ data: [] }),
  exportAnalytics: async (filters?: any, format?: string) => ({
    data: {
      format: 'json',
      data: {},
      filename: 'export.json',
      size: 0,
      generated_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      download_url: ''
    }
  }),
  getRealtimeMetrics: async () => ({
    data: {
      active_users: 0,
      current_engagement: 0,
      recent_alerts: 0,
      system_health: 'healthy',
      last_updated: new Date().toISOString(),
      metrics: { page_views_per_minute: 0, api_calls_per_minute: 0, error_rate_per_minute: 0, average_response_time: 0 }
    }
  }),
  acknowledgeAlert: async (alertId: string) => ({ data: {} }),
};

// Types
export * from './types';

// WebSocket types
export type {
  IWebSocketClient,
  WebSocketOptions,
  WebSocketClientEvents,
  WebSocketError,
} from './websocket';

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
