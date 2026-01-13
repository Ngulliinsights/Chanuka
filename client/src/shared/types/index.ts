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
} from '../../../shared/types/browser';

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

// Core types (re-exported from shared type system)
export type {
  Bill,
  User,
} from '../../../shared/types/domains/legislative';

export type {
  User as AuthUser,
  UserProfile,
} from '../../../shared/types/domains/authentication';

// BillAnalysis is still defined locally until migrated to shared types
export type {
  BillAnalysis,
} from './bill';

// Planned: After migration, specific type exports will be organized here
// - Analytics types (from features/analytics/model/types)
// - Common types (core domain types)
// - UI types (component prop types)
// - API types (network/REST types)
