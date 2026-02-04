/**
 * Shared Types - Centralized Type System
 * Main entry point for all shared type definitions
 * 
 * IMPORTANT: The './enums' module is the single source of truth for all
 * shared enums (BillStatus, Chamber, UserRole, etc.). Domain modules may
 * define their own local types but should not conflict with these enums.
 */

// Core types (base entities, common IDs)
export * from './core';

// Canonical shared enums - SINGLE SOURCE OF TRUTH
export * from './enums';

// Domain-specific types (excluding conflicting enum re-exports)
export * from './domains/loading';
export * from './domains/safeguards';

// Authentication domain - export specific types, not UserRole conflict
export {
  type VerificationStatus,
  type AnonymityLevel,
  type GeographicLocation,
  type UserPreferences,
  type UserProfile,
  type User,
  type CreateUserPayload,
  type UpdateUserPayload,
  isUser,
  AUTHENTICATION_DOMAIN_VERSION,
  AUTHENTICATION_DOMAIN_DESCRIPTION,
} from './domains/authentication';

// Legislative domain - export specific types, not BillStatus/Chamber conflicts  
export {
  type BillType,
  type SponsorType,
  type CommitteeType,
  type LegislativeActionType,
  type BillTimelineEvent,
  type BillEngagementMetrics,
  type Sponsor,
  type Committee,
  type BillCommitteeAssignment,
  type Bill,
  LEGISLATIVE_DOMAIN_VERSION,
  LEGISLATIVE_DOMAIN_DESCRIPTION,
} from './domains/legislative';

// Note: Testing exports are NOT included at top level to avoid validation function conflicts
// Use: import { ... } from '@shared/types/testing' for test utilities

/**
 * Version information for the type system
 */
export const TYPE_SYSTEM_VERSION = '1.0.0' as const;
export const TYPE_SYSTEM_DESCRIPTION = 'Unified type system foundation' as const;