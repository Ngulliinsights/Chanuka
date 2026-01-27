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

// Community types (unified module)
export * from './community';

// Bill types (unified module)
export * from './bill';

// Security types
export * from './security';

// Argument types
export * from './arguments';

// Core types (re-exported from shared type system)
export type {
  Bill,
  User,
  Sponsor,
  Committee,
  BillStatus,
  BillPriority,
  BillType,
  Chamber,
  LegislativeActionType,
  BillTimelineEvent,
  BillCommitteeAssignment,
} from '../../../shared/types/domains/legislative';

export type {
  User as AuthUser,
  UserProfile,
  VerificationStatus,
} from '../../../shared/types/domains/authentication';


// Planned: After migration, specific type exports will be organized here
// - Analytics types (from features/analytics/model/types)
// - Common types (core domain types)
// - UI types (component prop types)
// - API types (network/REST types)
