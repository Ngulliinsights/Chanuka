/**
 * DEPRECATED - This directory has been migrated
 * 
 * All types are being consolidated into: client/src/shared/types/
 * 
 * Update your imports:
 * OLD: import type { User } from '@client/types';
 * NEW: import type { User } from '@client/shared/types';
 * 
 * Timeline:
 * - Phase 1 (NOW): Both old and new locations work
 * - Phase 2 (1 week): Emit warnings on old imports
 * - Phase 3 (2 weeks): Remove deprecated exports
 * 
 * @deprecated Use @client/shared/types instead
 */

'use strict';

if (process.env.NODE_ENV === 'development') {
  console.warn(
    'Deprecated import: Use @client/shared/types instead of @client/types. ' +
    'See DIRECTORY_ALIGNMENT_ANALYSIS.md for migration details.'
  );
}

// For backward compatibility during migration - re-export everything
// Security types
export type {
  ThreatLevel,
  SecurityEvent,
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

// Loading types
export type {
  LoadingState,
  LoadingOperation,
  ConnectionInfo,
  LoadingConfig,
  LoadingQueue,
  LoadingMetrics,
  LoadingContext,
  LoadingStrategy,
  LoadingCondition,
  LoadingAction,
  LoadingBatch,
  LoadingResult,
  LoadingComponentProps,
  AdaptiveSettings,
  AssetLoadingProgress,
  LoadingType,
  LoadingPriority,
  ConnectionType,
  LoadingScenario,
  ProgressiveStage,
  LoadingError
} from './loading';

// Navigation types
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
} from './navigation';

// Dashboard types
export type {
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
} from './dashboard';

// Error types
export type {
  ErrorDomain,
  RecoveryStrategy,
  ErrorBoundaryState,
  ErrorReport,
  ErrorHandler,
  ErrorRecoveryConfig,
  RecoveryCondition,
  ErrorAnalytics,
  ErrorFrequency,
  ErrorTrend,
  ErrorBoundaryProps,
  ErrorContextValue,
  ErrorNotification
} from './error';

export { AppError } from './error';

// Performance types
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
} from './performance';

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

// Core unified types
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
} from './core';

// Auth types (re-exported from core/auth for backward compatibility)
export type {
  User as AuthUser,
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
  DataExportRequest,
  DataDeletionRequest,
  SocialLoginProvider,
  AuthContextType,
  ConsentModalProps,
  PrivacyDashboardProps
} from '../core/auth';

// Core API types
export type {
  BillsQueryParams,
  CommentPayload,
  EngagementPayload,
  BillsResponse,
  BillCategoriesResponse,
  BillStatusesResponse
} from './core/api/types';

// Type guards and utilities
export {
  isBill,
  isComment,
  isUser
} from './guards';

export type {
  ApiResponse,
  PaginationMeta,
  ApiListResponse,
  ApiErrorResponse,
  Optional,
  RequiredFields,
  WithTimestamps,
  Identifiable
} from './guards';