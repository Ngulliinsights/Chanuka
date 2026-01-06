/**
 * Shared Types Module
 *
 * Central repository for type definitions used across features
 * Consolidated from client/src/types during FSD migration
 */

// Re-export all types from original location for backward compatibility during migration
// Note: Excluding UserRole to avoid conflicts with navigation types
export type {
  AppError,
  BrowserInfo,
  // FeatureSet, // Not available in @types
  // CompatibilityStatus, // Not available in @types
  BrowserCapabilities,
  // ScreenInfo, // Not available in @types
  // BrowserConnectionInfo, // Not available in @types
  // PermissionStatus, // Not available in @types
  // MediaDeviceInfo, // Not available in @types
  // BatteryInfo, // Not available in @types
  BrowserCompatibility,
  // BrowserRecommendation, // Not available in @types
  // BrowserFingerprint, // Not available in @types
  // BrowserStorage, // Not available in @types
  // BrowserSecurity, // Not available in @types
  // BrowserNetwork, // Not available in @types
  // BrowserAPIs, // Not available in @types
  // ThreatLevel, // Not available in @types
  // VulnerabilityReport, // Not available in @types
  // CSRFToken, // Not available in @types
  // SecurityAudit, // Not available in @types
  // SecurityFinding, // Not available in @types
  // SecurityPolicy, // Not available in @types
  // SecurityRule, // Not available in @types
  // SecurityIncident, // Not available in @types
  // IncidentTimelineEntry, // Not available in @types
  // SecurityMetrics, // Not available in @types
  // LiveEngagementMetrics, // Not available in @types
  // PersonalEngagementScore, // Not available in @types
  // CommunitysentimentAnalysis, // Not available in @types
  // AnalyticsFilters, // Not available in @types
  // FormState, // Not available in @types
  // ValidationResult, // Not available in @types
  // FormFieldProps, // Not available in @types
  // FormSubmission, // Not available in @types
  // FormConfig, // Not available in @types
  // FormFieldConfig, // Not available in @types
  // FieldValidation, // Not available in @types
  // FieldOption, // Not available in @types
  // FieldCondition, // Not available in @types
  // FieldLayout, // Not available in @types
  // ValidationConfig, // Not available in @types
  // SubmissionConfig, // Not available in @types
  // FormContextValue, // Not available in @types
  // FormArrayHelpers, // Not available in @types
  // FormStep, // Not available in @types
  // MultiStepFormState, // Not available in @types
  // FormWizardConfig, // Not available in @types
  // FormFieldError, // Not available in @types
  // FormValidationError, // Not available in @types
  // FormSubmissionError // Not available in @types
} from '../../../../@types';

// export { isBill, isComment, isUser } from '../../../../@types'; // Functions not available

// Dashboard types
export * from './dashboard';

// User dashboard types
export * from './user-dashboard';

// Navigation types
export * from './navigation';

// Mobile types
export * from './mobile';

// Loading types
export * from './loading';

// Community types (re-exported from legacy location)
export type {
  ActivityItem,
  TrendingTopic,
  ExpertInsight,
  CommunityStats,
  LocalImpactMetrics,
  VoteRequest,
  Comment,
  DiscussionThread,
} from '@/features/community/types';

// Core types (re-exported from legacy location)
export type {
  Bill,
  User,
  // CommentStatus, // Not available in @types
  // Sponsor, // Not available in @types
  BillAnalysis,
  // UserPreferences, // Not available in @types
  // PrivacySettings, // Not available in @types
  // NotificationPreferences, // Not available in @types
  // ConsentRecord // Not available in @types
} from '../../../../@types';

// Planned: After migration, specific type exports will be organized here
// - Analytics types (from features/analytics/model/types)
// - Common types (core domain types)
// - UI types (component prop types)
// - API types (network/REST types)
