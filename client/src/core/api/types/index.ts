/**
 * Unified Type Definitions Index
 * 
 * This module provides comprehensive type definitions for the entire API client system.
 * All types are organized by domain and exported for convenient access.
 */

// ============================================================================
// Common Types
// ============================================================================

export type { HttpMethod, LogLevel, SortOrder, ErrorCode } from './common';
export type { PaginationParams, PaginationInfo, PaginatedResponse, VoteType } from './common';
export { ErrorDomain, ErrorSeverity } from './common';
export type { UnifiedError, ErrorContext } from './common';
export type { ApiClient, UnifiedApiClient } from './common';

// ============================================================================
// Bill Types
// ============================================================================

export {
  BillStatus,
  UrgencyLevel,
  ComplexityLevel,
  type Amendment,
  type AmendmentStatus,
  type ConstitutionalFlag,
  type Severity,
  type BillSubscriptionType,
  type BillUpdate,
  type BillUpdateData,
  type DateRange,
  type BillSortField,
  type BillsQueryParams,
  type BillsSearchParams,
} from './bill';

// ============================================================================
// Sponsor Types
// ============================================================================

export type { Sponsor } from './sponsor';

// ============================================================================
// Community Types
// ============================================================================

export {
  type DiscussionThread,
  type CommunityUpdate,
  type CommentSortField,
  type CommentsQueryParams,
  type CommentFormData,
} from './community';

// ============================================================================
// Engagement Types
// ============================================================================

export {
  EngagementType,
  type EngagementMetrics,
  type EngagementAction,
} from './engagement';

// ============================================================================
// Authentication Types
// ============================================================================

export {
  ExpertStatus,
  type Badge,
  type LoginCredentials,
  type UpdateUserProfile,
  type AuthResult,
} from './auth';

// ============================================================================
// Request/Response Types
// ============================================================================

export type {
  RequestPriority,
  RetryConfig,
  CacheOptions,
  CacheInvalidationTrigger,
  ValidationOptions,
} from './request';
export type { ApiRequest, ApiResponse, RequestOptions } from './common';

// ============================================================================
// Cache Types
// ============================================================================

export {
  type CacheStorage,
  type EvictionPolicy,
  type CacheConfig,
  type CacheEntry,
  type CacheEntryMetadata,
} from './cache';

// ============================================================================
// Configuration Types
// ============================================================================

export {
  type ServiceConfig,
  type ApiConfig,
  type RateLimitConfig,
  type FeatureFlags,
  type ServiceLimits,
  type MonitoringConfig,
  type ConfigValidator,
  type ConfigObserver,
  type ClientConfig,
  type ClientInterceptors,
  type RequestInterceptor,
  type ResponseInterceptor,
} from './config';

// ============================================================================
// Service Types
// ============================================================================

export {
  type ApiService,
  type BillsService,
  type CommunityService,
  type AuthService,
} from './service';

// ============================================================================
// Preferences Types
// ============================================================================

export {
  type UpdateFrequency,
  type BillTrackingPreferences,
  type NotificationChannels,
  type QuietHours,
  type NotificationPreferences,
  type DisplayPreferences,
  type UserPreferences,
} from './preferences';

// ============================================================================
// Error Response Types
// ============================================================================

export type {
  ApiErrorResponse,
  AxiosErrorResponse,
  FetchErrorResponse,
  UnknownError,
  ErrorContext,
  PrivacySettings,
  DataExportRequest,
  DataExportResponse,
  DataDeletionRequest,
  DataDeletionResponse,
} from './error-response';

// ============================================================================
// WebSocket Types
// ============================================================================

export {
  ConnectionState,
  WebSocketErrorCode,
  type WebSocketMessage,
  type WebSocketError,
  type AuthMessage,
  type SubscribeMessage,
  type UnsubscribeMessage,
  type HeartbeatMessage,
  type SystemMessage,
  type ConnectionMessage,
  type ErrorMessage,
  type BillUpdateMessage,
  type CommunityUpdateMessage,
  type NotificationMessage,
  type ClientInfo,
  type WebSocketServerConfig,
  type WebSocketStats,
  type ConnectionMetrics,
  type WebSocketRequest,
  type WebSocketResponse,
  type MessageHandler,
  type ConnectionHandler,
  type ErrorHandler,
  type FilterFunction,
  type AnyWebSocketMessage,
  type ClientToServerMessage,
  type ServerToClientMessage,
  type ReconnectConfig,
  type HeartbeatConfig,
  type MessageConfig,
  type WebSocketAuthConfig,
  type WebSocketConfig,
  type Subscription,
  type SubscriptionPriority,
  type WebSocketEvents,
  type WebSocketNotification,
  type WebSocketSubscription,
  type RealTimeHandlers,
  type NotificationPriority,
} from './websocket';
