/**
 * Generated Domain Types
 * Transformed from database types for application use
 * 
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * Run 'npm run db:generate-types' to regenerate
 * 
 * Generated: 2026-02-11T17:04:43.793Z
 * 
 * Domain types use camelCase naming convention and are optimized
 * for use in application logic, while database types use snake_case
 * to match PostgreSQL conventions.
 */

// @ts-nocheck - Auto-generated file may have unused imports
import type {
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
} from '../core/branded';

// ============================================================================
// Domain Types (Application Layer)
// ============================================================================



// ============================================================================
// Transformation Utilities
// ============================================================================

/**
 * NOTE: Transformation functions between database and domain types
 * should be implemented in shared/utils/transformers/
 * 
 * Example:
 * - UserDbToDomain: Transformer<UserTable, User>
 * - BillDbToDomain: Transformer<BillTable, Bill>
 */
