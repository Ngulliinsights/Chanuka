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
} from '@client/features/community/types';

// Core types (re-exported from legacy location)
export type {
  Bill,
  User,
  BillAnalysis,
} from '../../../shared/types/core';

// Planned: After migration, specific type exports will be organized here
// - Analytics types (from features/analytics/model/types)
// - Common types (core domain types)
// - UI types (component prop types)
// - API types (network/REST types)
