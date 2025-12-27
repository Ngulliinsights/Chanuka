/**
 * Shared Types Module
 * 
 * Central repository for type definitions used across features
 * Consolidated from client/src/types during FSD migration
 */

// Re-export all types from original location for backward compatibility during migration
export * from '../../types';

// Dashboard types
export * from './dashboard';

// User dashboard types
export * from './user-dashboard';

// Navigation types
export * from './navigation';

// Mobile types
export * from './mobile';

// Community types (re-exported from legacy location)
export type {
  ActivityItem,
  TrendingTopic,
  ExpertInsight,
  CommunityStats,
  LocalImpactMetrics,
  VoteRequest,
  Comment,
  DiscussionThread
} from '../../types/community';

// Core types (re-exported from legacy location)
export type {
  Bill,
  User,
  CommentStatus,
  Sponsor,
  BillAnalysis,
  UserPreferences,
  PrivacySettings,
  NotificationPreferences,
  ConsentRecord
} from '../../types/core';

// Planned: After migration, specific type exports will be organized here
// - Analytics types (from features/analytics/model/types)
// - Common types (core domain types)
// - UI types (component prop types)
// - API types (network/REST types)