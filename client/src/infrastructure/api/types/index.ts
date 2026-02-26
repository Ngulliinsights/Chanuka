/**
 * Unified Type Definitions Index
 *
 * This module provides comprehensive type definitions for the entire API client system.
 * All types are organized by domain and exported for convenient access.
 *
 * Note: Using explicit exports to avoid naming conflicts between modules.
 */

// ============================================================================
// Infrastructure & Core Types
// ============================================================================

// Common types (base exports)
export type { HttpMethod, LogLevel, SortOrder, ErrorCode } from './common';
export type { PaginationParams, PaginationInfo, PaginatedResponse, VoteType } from './common';
export { ErrorDomain, ErrorSeverity } from './common';
export type { UnifiedError } from './common';
export type { ApiClient, UnifiedApiClient } from './common';

// Request/Response types (prefer common module for these core types)
export type {
  ApiRequest,
  ApiResponse,
  RequestOptions,
  RequestPriority,
  RetryConfig,
  CacheOptions,
  CacheInvalidationTrigger,
  ValidationOptions,
} from './common';

// Interceptor types (core interceptor definitions)
export type {
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  BaseClientRequest,
  BaseClientResponse,
  ApiError,
  RequestBody,
} from './interceptors';

// Configuration types
export type {
  ServiceConfig,
  ApiConfig,
  RateLimitConfig,
  FeatureFlags,
  ServiceLimits,
  MonitoringConfig,
  ConfigValidator,
  ConfigObserver,
  ClientConfig,
  ClientInterceptors,
} from './config';

// Error response types (prefer error-response module for ErrorContext)
import { ApiErrorResponse } from '@client/lib/types/utils/common';

export type { ApiErrorResponse };

export interface AxiosErrorResponse {
  response?: {
    data?: ApiErrorResponse;
    status: number;
    statusText?: string;
  };
  message: string;
  code?: string;
  config?: {
    url?: string;
    method?: string;
    headers?: any;
    data?: any;
  };
}

export interface FetchErrorResponse {
  status: number;
  statusText: string;
  data?: unknown;
}

export type UnknownError = Error | unknown;
export type ErrorContext = Record<string, unknown>;

export type {
  PrivacySettings,
  DataExportResponse,
  DataDeletionResponse,
} from '../auth';

// Preferences types
export type {
  UpdateFrequency,
  BillTrackingPreferences,
  NotificationChannels,
  QuietHours,
  NotificationPreferences,
  DisplayPreferences,
  UserPreferences,
} from './preferences';

// Cache types
export type {
  CacheStorage,
  EvictionPolicy,
  CacheConfig,
  CacheEntry,
  CacheEntryMetadata,
} from './cache';

// Performance types
export type {
  WebVitals,
  PerformanceBudget,
  BudgetCheckResult,
  ResourceTiming,
  PerformanceReport,
  PerformanceRecommendation,
} from './performance';
export * from './performance';

// ============================================================================
// Domain Entity Types
// ============================================================================

// Authentication types
export {
  ExpertStatus,
  type Badge,
  type LoginCredentials,
  type UpdateUserProfile,
  type AuthResult,
} from './auth';

// Bill types (prefer bill module for Sponsor to avoid conflict)
export type {
  BillStatus,
  UrgencyLevel,
  ComplexityLevel,
} from './bill';

export type {
  Bill,
  Sponsor,
  BillsQueryParams,
} from './bill';

// Community types
export type {
  DiscussionThread,
  CommunityUpdate,
  CommentSortField,
  CommentsQueryParams,
  CommentFormData,
} from './community';

// Engagement types
export { EngagementType, type EngagementMetrics, type EngagementAction } from './engagement';

// ============================================================================
// Service Interface Types
// ============================================================================

export type { ApiService, BillsService, CommunityService, AuthService } from './service';

// ============================================================================
// Real-time & WebSocket Types
// ============================================================================

// WebSocket client types
export type {
  IWebSocketClient,
  WebSocketOptions,
  WebSocketClientEvents,
  WebSocketError,
  ConnectionState,
  ConnectionQuality,
  WebSocketMessage,
} from './websocket';

// Realtime client types
export type {
  IRealtimeClient,
  Subscription,
  EventHandler,
  RealtimeEvent,
  RealtimeOptions,
  RealtimeHubState,
} from './realtime';
