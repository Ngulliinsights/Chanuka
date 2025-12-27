/**
 * DEPRECATED - This directory has been migrated
 * 
 * All types are being consolidated into appropriate locations:
 * - Core domain types: @client/shared/types
 * - API types: @client/core/api/types  
 * - Auth types: @client/core/auth/types
 * - Realtime types: @client/core/realtime/types
 * 
 * Update your imports:
 * OLD: import type { User } from '@client/types';
 * NEW: import type { User } from '@client/shared/types';
 * 
 * @deprecated Use consolidated type locations instead
 */

'use strict';

if (process.env.NODE_ENV === 'development') {
  console.warn(
    'Deprecated import: Use consolidated type locations instead of @client/types. ' +
    'See type-consolidation-plan.md for migration details.'
  );
}

// ============================================================================
// BACKWARD COMPATIBILITY RE-EXPORTS
// ============================================================================

// Core domain types - now in shared/types
export type {
  Bill,
  Comment,
  User,
  CommentStatus,
  Sponsor,
  BillAnalysis,
  UserPreferences,
  PrivacySettings,
  NotificationPreferences,
  ConsentRecord
} from '../shared/types';

// Dashboard and user dashboard types - now in shared/types
export type {
  TrackedBill,
  EngagementHistoryItem,
  CivicImpactMetrics,
  BillRecommendation,
  UserDashboardData,
  PrivacyControls,
  DataExportRequest,
  TemporalFilter,
  DashboardPreferences,
  WidgetConfig,
  WidgetPosition,
  WidgetSize,
  DashboardState,
  DashboardLayout,
  ResponsiveLayout,
  BreakpointConfig,
  AnalyticsMetrics,
  PageMetric,
  DemographicData,
  EngagementMetrics,
  PerformanceMetrics,
  DateRange,
  DashboardTemplate,
  WidgetData,
  DashboardFilter,
  FilterOption,
  DashboardAction,
  DashboardSettings,
  WidgetType,
  ChartData
} from '../shared/types';

// Navigation types - now in shared/types
export type {
  NavigationItem,
  BreadcrumbItem,
  RelatedPage,
  NavigationSection,
  UserRole,
  NavigationPreferences,
  RecentPage,
  NavigationState,
  NavigationContextValue,
  ResponsiveNavigationState,
  ResponsiveNavigationContextValue,
  PageRelationship
} from '../shared/types';

// Mobile types - now in shared/types
export type {
  SwipeDirection,
  GestureType,
  GestureEvent,
  SwipeGestureData,
  SwipeEvent,
  GestureConfig,
  MobileLayoutContextValue,
  SafeAreaInsets,
  DeviceInfo,
  MobileTab,
  PullToRefreshConfig,
  BottomSheetConfig,
  InfiniteScrollConfig,
  ViewportConfig,
  ResponsiveBreakpoints,
  MobileErrorContext,
  MobileAnimationOptions,
  HapticFeedbackPattern,
  HapticFeedbackConfig,
  ResponsiveBreakpoint,
  MobileComponentSize,
  DataPoint,
  ScrollPosition,
  ScrollState,
  MobileKeyboardEvent
} from '../shared/types';

// Realtime types - now in core/realtime/types
export type {
  BillRealTimeUpdate,
  CommunityRealTimeUpdate,
  EngagementMetricsUpdate,
  ExpertActivityUpdate,
  RealTimeNotification,
  WebSocketSubscription,
  CivicWebSocketState,
  RealTimeHandlers,
  RealTimeUpdateHandler
} from '../core/realtime/types';

// API types - now in core/api/types
export type {
  ApiResponse,
  PaginationMeta,
  ApiListResponse,
  ApiErrorResponse,
  Optional,
  RequiredFields,
  WithTimestamps,
  Identifiable
} from '../core/api/types';

// Auth types - now in core/auth/types
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthTokens,
  TokenInfo,
  SessionInfo,
  SessionValidation,
  TokenValidation,
  TwoFactorSetup,
  SecurityEvent,
  SuspiciousActivityAlert,
  PasswordRequirements,
  PasswordValidationResult,
  DataExportRequest as AuthDataExportRequest,
  DataDeletionRequest,
  SocialLoginProvider,
  AuthContextType,
  ConsentModalProps,
  PrivacyDashboardProps
} from '../core/auth/types';

// Loading types - now in shared/ui/loading
export type {
  LoadingSize,
  LoadingType,
  LoadingState,
  LoadingPhase,
  ConnectionType,
  LoadingPriority,
  LoadingStateProps,
  LoadingProgress,
  LoadingStage,
  LoadingOperation,
  LoadingStats,
  LoadingConfig,
  UseLoadingResult,
  LoadingIndicator,
} from '../shared/ui/loading';

// Error types - now in shared/ui/types
export type {
  ErrorInfo,
  ErrorBoundaryProps,
  ErrorHandler,
  ErrorContextValue,
  ErrorNotification,
  ErrorTrend,
} from '../shared/ui/types';

export { AppError } from './error';

// Performance types - now in core/api/types
export type {
  WebVitalsMetric,
  PerformanceBudget,
  BudgetCheckResult,
  PerformanceReport,
  ResourceTiming,
  NavigationTiming,
  PaintTiming,
  MemoryInfo,
  ServerTiming,
  PerformanceRecommendation,
  PerformanceThreshold,
  PerformanceAlert,
  PerformanceTrend,
  TrendDataPoint,
  PerformanceConfig,
  PerformanceObserverEntry,
  PerformanceMark,
  PerformanceMeasure
} from '../core/api/types';

// Browser types
export type {
  BrowserInfo,
  FeatureSet,
  CompatibilityStatus,
  BrowserCapabilities,
  ScreenInfo,
  ConnectionInfo as BrowserConnectionInfo,
  PermissionStatus,
  MediaDeviceInfo,
  BatteryInfo,
  BrowserCompatibility,
  BrowserRecommendation,
  BrowserFingerprint,
  BrowserStorage,
  BrowserSecurity,
  BrowserNetwork,
  BrowserAPIs
} from './browser';

// Security types
export type {
  ThreatLevel,
  VulnerabilityReport,
  CSRFToken,
  SecurityAudit,
  SecurityFinding,
  SecurityPolicy,
  SecurityRule,
  SecurityIncident,
  IncidentTimelineEntry,
  SecurityMetrics
} from './security';

// Community types - now in shared/types
export type {
  ActivityItem,
  TrendingTopic,
  ExpertInsight,
  CommunityStats,
  LocalImpactMetrics,
  VoteRequest
} from '../shared/types';

// Engagement Analytics types
export type {
  LiveEngagementMetrics,
  PersonalEngagementScore,
  CommunitysentimentAnalysis,
  AnalyticsFilters
} from './engagement-analytics';

// Form types
export type {
  FormState,
  ValidationResult,
  FormFieldProps,
  FormSubmission,
  FormConfig,
  FormFieldConfig,
  FieldValidation,
  FieldOption,
  FieldCondition,
  FieldLayout,
  ValidationConfig,
  SubmissionConfig,
  FormContextValue,
  FormArrayHelpers,
  FormStep,
  MultiStepFormState,
  FormWizardConfig,
  FormFieldError,
  FormValidationError,
  FormSubmissionError
} from './form';

// Type guards and utilities
export {
  isBill,
  isComment,
  isUser
} from './guards';