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
  ValidationOptions
} from './common';

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
  RequestInterceptor,
  ResponseInterceptor,
} from './config';

// Error response types (prefer error-response module for ErrorContext)
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
export {
  BillStatus,
  UrgencyLevel,
  ComplexityLevel,
  type Bill,
  type Sponsor,
  type BillsQueryParams,
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
export {
  EngagementType,
  type EngagementMetrics,
  type EngagementAction,
} from './engagement';

// ============================================================================
// Service Interface Types
// ============================================================================

export type {
  ApiService,
  BillsService,
  CommunityService,
  AuthService,
} from './service';

// ============================================================================
// Real-time & WebSocket Types
// ============================================================================

// WebSocket types are now available from @shared/schema/websocket
// Import them directly from there for real-time functionality