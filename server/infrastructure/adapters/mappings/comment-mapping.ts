/**
 * Comment Entity Mapping for DrizzleAdapter
 * 
 * Provides bidirectional mapping between Comment entities and database rows.
 * Handles complex relationships and data validation.
 */

import { EntityMapping } from '@shared/drizzle-adapter';
import { comments } from '@server/infrastructure/schema';
// CommentWithUser type moved to direct service layer
type CommentWithUser = any; // TODO: Define proper type in service layer

type CommentRow = typeof comments.$inferSelect;
type CommentInsert = typeof comments.$inferInsert;

export class CommentEntityMapping implements EntityMapping<CommentWithUser, CommentRow> {
  /**
   * Convert database row to Comment domain entity
   * Note: This is a simplified mapping for the base comment data
   * Full CommentWithUser requires joins handled in the adapter
   */
  toEntity(row: CommentRow): CommentWithUser {
    // Handle null/undefined values directly
    const safeRow = {
      id: row.id ?? 0,
      bill_id: row.bill_id ?? 0,
      user_id: row.user_id ?? 'unknown',
      content: row.content ?? '',
      commentType: row.commentType ?? 'general',
      is_verified: row.is_verified ?? false,
      parent_id: row.parent_id,
      upvotes: row.upvotes ?? 0,
      downvotes: row.downvotes ?? 0,
      created_at: row.created_at ?? new Date(),
      updated_at: row.updated_at ?? new Date()
    };

    return {
      id: safeRow.id,
      bill_id: safeRow.bill_id,
      user_id: safeRow.user_id,
      content: safeRow.content,
      commentType: safeRow.commentType,
      is_verified: safeRow.is_verified,
      parent_id: safeRow.parent_id,
      upvotes: safeRow.upvotes,
      downvotes: safeRow.downvotes,
      created_at: safeRow.created_at,
      updated_at: safeRow.updated_at,
      // Default user info - should be populated by joins in actual usage
      user: {
        id: safeRow.user_id,
        name: 'Unknown User',
        role: 'citizen',
        verification_status: 'pending'
      },
      replies: [],
      replyCount: 0,
      netVotes: safeRow.upvotes - safeRow.downvotes
    };
  }

  /**
   * Convert Comment entity to database row format
   */
  fromEntity(entity: CommentWithUser): Partial<CommentInsert> {
    return {
      id: entity.id,
      bill_id: entity.bill_id,
      user_id: entity.user_id,
      content: entity.content?.trim() || '',
      commentType: entity.commentType || 'general',
      is_verified: entity.is_verified || false,
      parent_id: entity.parent_id,
      upvotes: entity.upvotes || 0,
      downvotes: entity.downvotes || 0,
      created_at: entity.created_at,
      updated_at: entity.updated_at
    };
  }
}

export const commentEntityMapping = new CommentEntityMapping();
