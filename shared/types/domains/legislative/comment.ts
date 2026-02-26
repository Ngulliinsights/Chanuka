/**
 * Comment Entity Types - CANONICAL SOURCE OF TRUTH
 * 
 * This is the single source of truth for Comment types across the entire application.
 * All other Comment types should import from here or derive from this definition.
 * 
 * Represents user comments on bills with voting, moderation, and threading capabilities.
 * 
 * @module shared/types/domains/legislative/comment
 * @canonical
 */

import { UserTrackableEntity } from '../../core/base';
import { CommentId, BillId, UserId } from '../../core/branded';
import { CommentStatus, ModerationStatus } from '../../core/enums';

// Re-export for convenience
export { CommentStatus, ModerationStatus };

/**
 * Moderation status types
 */
export type CommentModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

/**
 * Comment Entity - CANONICAL DEFINITION
 * Supports both branded types (CommentId) and string IDs for flexibility.
 */
export interface Comment extends UserTrackableEntity {
  readonly id: CommentId | string;
  readonly billId: BillId | string;
  readonly bill_id?: number | string; // Legacy compatibility
  readonly userId: UserId | string;
  readonly user_id?: number | string; // Legacy compatibility
  readonly parentCommentId?: CommentId | string | null;
  readonly parent_id?: number | string | null; // Legacy compatibility
  
  // Content
  readonly content: string;
  readonly contentHtml?: string | null;
  
  // Status & Moderation
  readonly status?: CommentStatus;
  readonly moderationStatus?: CommentModerationStatus;
  readonly moderationReason?: string | null;
  readonly moderatedBy?: string | null;
  readonly moderatedAt?: Date | string | null;
  readonly verification_status?: 'pending' | 'verified' | 'rejected'; // Legacy
  
  // Engagement metrics
  readonly upvotes: number;
  readonly downvotes: number;
  readonly replyCount?: number;
  readonly netVotes?: number;
  
  // Flags
  readonly isEdited: boolean;
  readonly isPinned?: boolean;
  readonly isExpert?: boolean;
  readonly isExpertComment?: boolean;
  
  // Audit timestamps
  readonly editedAt?: Date | string;
  readonly deletedAt?: Date | string | null;
  readonly created_at?: Date | string; // Legacy
  readonly updated_at?: Date | string; // Legacy
  
  // Metadata
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Comment Entity - Domain model (server-side)
 * Re-exported from canonical source with domain-specific extensions
 */
export interface CommentEntity extends Comment {
  readonly contentHtml: string | null;
  readonly replyCount: number;
  readonly moderationStatus: CommentModerationStatus;
  readonly isPinned: boolean;
  readonly isExpertComment: boolean;
}

/**
 * Comment Creation Payload
 */
export interface CreateCommentPayload {
  billId: BillId | string;
  userId: UserId | string;
  parentCommentId?: CommentId | string | null;
  content: string;
  metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Alternative name for compatibility
 */
export type CreateCommentInput = CreateCommentPayload;

/**
 * Comment Update Payload
 */
export interface UpdateCommentPayload {
  content?: string;
  status?: CommentStatus;
  moderationStatus?: CommentModerationStatus;
  moderationReason?: string;
  isPinned?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Alternative name for compatibility
 */
export type UpdateCommentInput = UpdateCommentPayload;

/**
 * Comment with nested replies (thread view)
 */
export interface CommentThread extends Comment {
  readonly replies: readonly CommentThread[];
  readonly replyCount: number;
  readonly depth?: number;
}

/**
 * Comment with user information (enriched view)
 */
export interface CommentWithUser extends Comment {
  readonly user: {
    readonly id: string;
    readonly username: string;
    readonly display_name?: string;
    readonly avatar_url?: string;
    readonly isExpert?: boolean;
  };
}

/**
 * Type guard for Comment entity
 */
export function isComment(value: unknown): value is Comment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    ('billId' in value || 'bill_id' in value) &&
    ('userId' in value || 'user_id' in value) &&
    'content' in value
  );
}
