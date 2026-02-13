/**
 * Comment Entity Types
 * Standardized comment types for legislative discussions
 */

import { BaseEntity, UserTrackableEntity } from '../../core/base';
import { CommentId, BillId, UserId } from '../../core/branded';
import { CommentStatus } from '../../core/enums';

// Re-export for convenience
export { CommentStatus };

/**
 * Comment Entity
 * Represents a user comment on a bill
 */
export interface Comment extends UserTrackableEntity {
  readonly id: CommentId;
  readonly billId: BillId;
  readonly userId: UserId;
  readonly parentCommentId?: CommentId;
  readonly content: string;
  readonly status: CommentStatus;
  readonly upvotes: number;
  readonly downvotes: number;
  readonly isEdited: boolean;
  readonly editedAt?: Date;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Comment Creation Payload
 */
export interface CreateCommentPayload {
  billId: BillId;
  userId: UserId;
  parentCommentId?: CommentId;
  content: string;
  metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Comment Update Payload
 */
export interface UpdateCommentPayload {
  content?: string;
  status?: CommentStatus;
  metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Comment with nested replies
 */
export interface CommentThread extends Comment {
  readonly replies: readonly CommentThread[];
  readonly replyCount: number;
}

/**
 * Type guard for Comment entity
 */
export function isComment(value: unknown): value is Comment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'billId' in value &&
    'userId' in value &&
    'content' in value &&
    'status' in value
  );
}
