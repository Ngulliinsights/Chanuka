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

// Only export types that don't cause circular dependencies
export { AppError } from './error';

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

// Core types
export type {
  Bill,
  User,
  UserRole,
  Comment,
  CommentStatus,
  Sponsor,
  BillAnalysis,
  UserPreferences,
  PrivacySettings,
  NotificationPreferences,
  ConsentRecord
} from './core';

// Navigation types
export type {
  NavigationItem,
  NavigationSection,
  RelatedPage,
  BreadcrumbItem,
  NavigationPreferences,
  NavigationState,
  NavigationContextValue,
  ResponsiveNavigationState,
  ResponsiveNavigationContextValue,
  PageRelationship,
  RecentPage
} from '../shared/types/navigation';

// Type guards and utilities
export {
  isBill,
  isComment,
  isUser
} from './guards';