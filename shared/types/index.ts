/**
 * Shared Types - Centralized Type System
 * Main entry point for all shared type definitions
 * 
 * IMPORTANT: This is the single source of truth for all shared types.
 * All layers (client, server, database) should import from this module.
 * 
 * Structure:
 * - core: Base types, branded types, enums, errors, validation
 * - domains: Domain entity types (authentication, legislative, etc.)
 * - api: API contract types (requests, responses, errors)
 * - database: Database table types and utilities
 * - validation: Validation schema types
 * 
 * Import Patterns:
 * 
 * 1. CLIENT LAYER IMPORTS:
 *    - Import from '@shared/types' for all type needs
 *    - Use domain types for state management
 *    - Use API types for API calls
 *    - Example: import { User, CreateUserRequest, UserRole } from '@shared/types';
 * 
 * 2. SERVER LAYER IMPORTS:
 *    - Import from '@shared/types' for all type needs
 *    - Use domain types for business logic
 *    - Use API types for request/response handling
 *    - Use database types for data access layer
 *    - Example: import { User, UserTable, CreateUserRequest } from '@shared/types';
 * 
 * 3. SHARED LAYER IMPORTS:
 *    - Import from relative paths within shared/types
 *    - Follow dependency order: core → domains → api → database
 *    - Example: import { UserId } from './core/branded';
 * 
 * 4. DATABASE LAYER IMPORTS:
 *    - Import branded types and enums from '@shared/types'
 *    - Use for schema definitions and constraints
 *    - Example: import { UserRole, UserId } from '@shared/types';
 * 
 * Dependency Order (prevents circular dependencies):
 * 
 *   Core Types (branded, enums, base)
 *        ↓
 *   Domain Types (user, bill, comment)
 *        ↓
 *   API Types (requests, responses, contracts)
 *        ↓
 *   Database Types (tables, relations)
 *        ↓
 *   Validation Types (schemas)
 * 
 * Rules to Prevent Circular Dependencies:
 * 
 * 1. Core types MUST NOT import from domains, api, database, or validation
 * 2. Domain types MAY import from core, MUST NOT import from api, database, or validation
 * 3. API types MAY import from core and domains, MUST NOT import from database or validation
 * 4. Database types MAY import from core and domains, MUST NOT import from api or validation
 * 5. Validation types MAY import from core, domains, and api, MUST NOT import from database
 * 6. All imports within a layer MUST use relative paths
 * 7. All imports from other layers MUST go through index.ts exports
 */

// ============================================================================
// Core Types - Foundation Layer
// ============================================================================
// Base types, branded types, enums, errors, and validation utilities
// These are the building blocks for all other types

export * from './core';

// ============================================================================
// Domain Types - Business Entity Layer
// ============================================================================
// Domain entity types representing business concepts
// These types use core types but are independent of API or database concerns

// Authentication domain - User entities and auth state
export * from './domains/authentication';

// Legislative domain - Bills, comments, and legislative actions
export * from './domains/legislative';

// Arguments domain - Argument intelligence types
export * from './domains/arguments';

// Loading states - UI loading state management
export * from './domains/loading';

// Monitoring domain - Metrics, performance, and error tracking
export * from './domains/monitoring';

// Redux domain - Redux-specific types
export * from './domains/redux';

// Safeguards domain - Moderation and safety types
export * from './domains/safeguards';

// ============================================================================
// API Types - Contract Layer
// ============================================================================
// API contract types for client-server communication
// These types define the interface between client and server

export * from './api';

// ============================================================================
// Database Types - Persistence Layer
// ============================================================================
// Database table types that mirror database schema
// These types bridge between database and domain models

export * from './database';

// ============================================================================
// Validation Types - Runtime Validation Layer
// ============================================================================
// Validation schema types for runtime type checking
// These types support Zod schemas and validation logic

export * from './validation';

// ============================================================================
// Convenience Exports
// ============================================================================
// Re-export commonly used types for easier access

// Enums - Re-exported at top level for convenience
export { 
  // User & Authentication
  UserRole, 
  UserStatus,
  VerificationStatus,
  AnonymityLevel,
  
  // Legislative
  BillStatus, 
  Chamber,
  BillType,
  CommitteeStatus,
  
  // Engagement & Interaction
  VoteType,
  ArgumentPosition,
  BillVoteType,
  CommentStatus,
  ModerationStatus,
  NotificationType,
  NotificationChannel,
  
  // Priority & Classification
  UrgencyLevel,
  ComplexityLevel,
  
  // UI & System
  LoadingState,
  Size,
  Variant,
  Theme,
  
  // Error Handling
  ErrorClassification,
  ErrorCode,
  
  // Type Aliases
  type BillStatusValue,
  type ChamberValue,
  type UserRoleValue,
  type ArgumentPositionValue,
  type BillVoteTypeValue,
  type ModerationStatusValue,
  type UrgencyLevelValue,
  type ComplexityLevelValue,
  
  // Validation Arrays
  BILL_STATUS_VALUES,
  CHAMBER_VALUES,
  USER_ROLE_VALUES,
  ARGUMENT_POSITION_VALUES,
  BILL_VOTE_TYPE_VALUES,
  MODERATION_STATUS_VALUES,
  URGENCY_LEVEL_VALUES,
  COMPLEXITY_LEVEL_VALUES,
  
  // Validation Functions
  isValidBillStatus,
  isValidChamber,
  isValidUserRole,
} from './core/enums';

// Branded Types - Re-exported at top level for convenience
export type {
  UserId,
  BillId,
  CommitteeId,
  CommentId,
  VoteId,
  SessionId,
  NotificationId,
  AmendmentId,
  ActionId,
  SponsorId,
  ArgumentId,
  ArgumentEvidenceId,
  BillTimelineEventId,
  BillCommitteeAssignmentId,
  LegislatorId,
} from './core/branded';

// ============================================================================
// Type System Metadata
// ============================================================================

/**
 * Version information for the type system
 */
export const TYPE_SYSTEM_VERSION = '2.0.0' as const;

/**
 * Description of the type system
 */
export const TYPE_SYSTEM_DESCRIPTION = 'Consolidated type system with single source of truth' as const;

/**
 * Layer dependency order (for reference and tooling)
 */
export const LAYER_DEPENDENCY_ORDER = [
  'core',
  'domains',
  'api',
  'database',
  'validation',
] as const;

/**
 * Type system features
 */
export const TYPE_SYSTEM_FEATURES = {
  brandedTypes: true,
  singleSourceOfTruth: true,
  layerSeparation: true,
  circularDependencyPrevention: true,
  typeAlignment: true,
  validationIntegration: true,
} as const;