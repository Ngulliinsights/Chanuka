/**
 * Database Types - Bridge between Drizzle schema and domain types
 * 
 * This module provides type definitions that align with database schemas
 * and serve as the foundation for domain type transformations.
 * 
 * @module shared/types/database
 */

// Export database table types
export * from './tables';

// Re-export branded IDs for database use
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
} from '../core/branded';

// Auto-generated database types (from Drizzle schema)
export * from './generated-tables';

// Auto-generated domain types (transformed from database types)
export * from './generated-domains';
