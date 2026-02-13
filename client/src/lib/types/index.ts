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
  BrowserCapabilities,
  BrowserCompatibility,
} from '../types/browser';

// Dashboard types - explicit exports to avoid conflicts
export type {
  WidgetPosition,
  WidgetSize,
  WidgetConfig,
  DashboardLayout,
  ResponsiveLayout,
  BreakpointConfig,
  DashboardPreferences,
  DashboardConfig,
  DashboardState,
  WidgetData,
  WidgetTypeDef,
  ActionItem,
  ActionPriority,
  TrackedTopic,
  TopicCategory,
  DashboardData,
  DashboardAppConfig,
  DashboardSection,
  UseDashboardResult,
  DateRange,
  Metric,
  TimeSeriesPoint,
  TimeSeries,
  CategoryMetric,
  DemographicData,
  EngagementMetrics,
  PerformanceMetrics,
  AnalyticsMetrics,
  MetricsComparison,
  MetricsSummary,
  KPIDefinition,
} from './dashboard';

// User dashboard types
export * from './user-dashboard';

// Navigation types
export * from './navigation';

// Mobile types
export * from './mobile';

// Loading types
export * from './loading';

// Community types (unified module)
export * from './community';

// Bill types - re-exported from shared type system
export type {
  BillType,
  BillPriority,
  Committee,
  BillCommitteeAssignment,
  BillTimelineEvent,
  BillEngagementMetrics,
  LegislativeActionType,
  Chamber,
  SponsorType,
  CommitteeType,
} from '@shared/types/domains/legislative';

// Export enums as values (not types)
export { BillStatus, UrgencyLevel } from '@shared/types';
export type { BillStatusValue, UrgencyLevelValue } from '@shared/types';

// Bill extended types from local bill module (client-specific extensions)
export type {
  Bill,
  Sponsor,
  BillAnalysis,
  ExtendedBill,
  BillsQueryParams,
  User,
} from './bill';

// Authentication types
export type {
  User as AuthUser,
  VerificationStatus,
} from '@shared/types/domains/authentication';

// Security types
export * from './security';

// Argument types
export * from './arguments';

// Core types - explicit exports to avoid conflicts with community/bill/search modules
export type {
  CommentStatus,
  BaseComment,
  ExpertVerification,
  ModerationFlag,
  UnifiedComment,
  ThreadCategory,
  UnifiedThread,
  ViolationType,
  ModerationViolationType,
  ModerationStatus,
  ModerationAction,
} from './core';

// Search types (domain + response)
export * from './search';

// Analytics types
export * from './analytics';

// Planned: After migration, specific type exports will be organized here
// - Common types (core domain types)
// - UI types (component prop types)
// - API types (network/REST types)

// Re-export persona detector from core
export { personaDetector, PersonaDetector, createPersonaDetector } from '../../core/personalization';

// Re-export UserRole from navigation for consistency
export type { UserRole } from './navigation';
export type UserStatus = 'active' | 'inactive' | 'suspended';
