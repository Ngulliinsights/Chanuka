/**
 * Comment Repository Interface
 * Defines contract for comment data access
 * Allows swapping between mock and production implementations
 */

import type { AsyncServiceResult } from '@server/infrastructure/error-handling';

export interface Comment {
  id: string;
  bill_id: string;
  user_id: string;
  content: string;
  parent_id?: string | null;
  upvotes: number;
  downvotes: number;
  is_verified: boolean;
  is_flagged: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface CreateCommentData {
  bill_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
}

export interface UpdateCommentData {
  content?: string;
  is_verified?: boolean;
  is_flagged?: boolean;
}

export interface CommentFilters {
  bill_id?: string;
  user_id?: string;
  parent_id?: string | null;
  is_deleted?: boolean;
  min_upvotes?: number;
}

export interface CommentSort {
  field: 'created_at' | 'upvotes' | 'quality_score';
  direction: 'asc' | 'desc';
}

export interface ICommentRepository {
  /**
   * Create a new comment
   */
  create(data: CreateCommentData): Promise<AsyncServiceResult<Comment>>;
  
  /**
   * Find comment by ID
   */
  findById(id: string): Promise<AsyncServiceResult<Comment | null>>;
  
  /**
   * Find comments with filters and sorting
   */
  find(
    filters: CommentFilters,
    sort?: CommentSort,
    limit?: number,
    offset?: number
  ): Promise<AsyncServiceResult<Comment[]>>;
  
  /**
   * Update comment
   */
  update(id: string, data: UpdateCommentData): Promise<AsyncServiceResult<Comment | null>>;
  
  /**
   * Soft delete comment
   */
  delete(id: string): Promise<AsyncServiceResult<boolean>>;
  
  /**
   * Vote on comment
   */
  vote(id: string, vote: 'up' | 'down' | 'remove'): Promise<AsyncServiceResult<{ upvotes: number; downvotes: number }>>;
  
  /**
   * Get comment count for a bill
   */
  countByBillId(billId: string): Promise<AsyncServiceResult<number>>;
}
