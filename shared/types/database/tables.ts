/**
 * Database Table Types
 * Type definitions that mirror database schema
 * 
 * NOTE: These types should be generated from Drizzle schema definitions
 * This file serves as a placeholder for the type generation system
 */

import type {
  UserId,
  BillId,
  CommitteeId,
  CommentId,
  SponsorId,
  // ArgumentId, // Unused
  // ArgumentEvidenceId, // Unused
  BillTimelineEventId,
  BillCommitteeAssignmentId,
  LegislatorId,
} from '../core/branded';

// ============================================================================
// User Table Types
// ============================================================================

/**
 * User table row type (database representation)
 * Maps to the 'users' table in PostgreSQL
 */
export interface UserTable {
  id: UserId;
  email: string;
  username: string;
  password_hash: string;
  role: string;
  status: string;
  verification_status: string;
  last_login: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: UserId | null;
  updated_by: UserId | null;
  metadata: Record<string, unknown> | null;
}

/**
 * User profile table row type
 * Maps to the 'user_profiles' table in PostgreSQL
 */
export interface UserProfileTable {
  user_id: UserId;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  anonymity_level: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * User preferences table row type
 * Maps to the 'user_preferences' table in PostgreSQL
 */
export interface UserPreferencesTable {
  user_id: UserId;
  theme: string | null;
  language: string | null;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Bill Table Types
// ============================================================================

/**
 * Bill table row type (database representation)
 * Maps to the 'bills' table in PostgreSQL
 */
export interface BillTable {
  id: BillId;
  bill_number: string;
  title: string;
  official_title: string | null;
  summary: string;
  detailed_summary: string | null;
  status: string;
  chamber: string;
  bill_type: string;
  priority: string;
  introduction_date: Date;
  congress: number;
  session: number;
  sponsor_id: SponsorId;
  full_text_url: string | null;
  pdf_url: string | null;
  is_active: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by: UserId | null;
  updated_by: UserId | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Bill engagement metrics table row type
 * Maps to the 'bill_engagement_metrics' table in PostgreSQL
 */
export interface BillEngagementMetricsTable {
  bill_id: BillId;
  views: number;
  comments: number;
  shares: number;
  endorsements: number;
  oppositions: number;
  last_engaged_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Bill timeline event table row type
 * Maps to the 'bill_timeline_events' table in PostgreSQL
 */
export interface BillTimelineEventTable {
  id: BillTimelineEventId;
  bill_id: BillId;
  action_type: string;
  timestamp: Date;
  description: string;
  chamber: string | null;
  result: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

// ============================================================================
// Comment Table Types
// ============================================================================

/**
 * Comment table row type (database representation)
 * Maps to the 'comments' table in PostgreSQL
 */
export interface CommentTable {
  id: CommentId;
  bill_id: BillId;
  user_id: UserId;
  parent_comment_id: CommentId | null;
  content: string;
  status: string;
  upvotes: number;
  downvotes: number;
  is_edited: boolean;
  edited_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: UserId | null;
  updated_by: UserId | null;
  metadata: Record<string, unknown> | null;
}

// ============================================================================
// Committee Table Types
// ============================================================================

/**
 * Committee table row type
 * Maps to the 'committees' table in PostgreSQL
 */
export interface CommitteeTable {
  id: CommitteeId;
  name: string;
  committee_type: string;
  chamber: string;
  jurisdiction: string;
  chairperson: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Bill committee assignment table row type
 * Maps to the 'bill_committee_assignments' table in PostgreSQL
 */
export interface BillCommitteeAssignmentTable {
  id: BillCommitteeAssignmentId;
  bill_id: BillId;
  committee_id: CommitteeId;
  assignment_date: Date;
  status: string;
  action_taken: string | null;
  report_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Sponsor Table Types
// ============================================================================

/**
 * Sponsor table row type
 * Maps to the 'sponsors' table in PostgreSQL
 */
export interface SponsorTable {
  id: SponsorId;
  bill_id: BillId;
  legislator_id: LegislatorId;
  legislator_name: string;
  party: string;
  state: string;
  district: string | null;
  sponsor_type: string;
  sponsorship_date: Date;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extract insert type (omits auto-generated fields)
 */
export type InsertType<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Extract update type (all fields optional except id)
 */
export type UpdateType<T extends { id: unknown; created_at?: unknown }> = Partial<Omit<T, 'id' | 'created_at'>> & Pick<T, 'id'>;
