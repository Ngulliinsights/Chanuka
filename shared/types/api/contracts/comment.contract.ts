/**
 * Comment API Contracts
 * Type-safe API contracts for comment-related endpoints
 */

import { Comment, CommentThread } from '../../domains/legislative';
import { CommentId, BillId, UserId } from '../../core/branded';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Create Comment Request
 */
export interface CreateCommentRequest {
  billId: BillId;
  content: string;
  parentCommentId?: CommentId;
}

/**
 * Update Comment Request
 */
export interface UpdateCommentRequest {
  content?: string;
  status?: string;
}

/**
 * Get Comment Request (path params)
 */
export interface GetCommentRequest {
  id: CommentId;
}

/**
 * List Comments Request (query params)
 */
export interface ListCommentsRequest {
  billId?: BillId;
  userId?: UserId;
  parentCommentId?: CommentId;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'votes';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Delete Comment Request (path params)
 */
export interface DeleteCommentRequest {
  id: CommentId;
}

/**
 * Vote on Comment Request
 */
export interface VoteCommentRequest {
  id: CommentId;
  vote: 'up' | 'down';
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Create Comment Response
 */
export interface CreateCommentResponse {
  comment: Comment;
}

/**
 * Get Comment Response
 */
export interface GetCommentResponse {
  comment: Comment;
}

/**
 * Update Comment Response
 */
export interface UpdateCommentResponse {
  comment: Comment;
}

/**
 * List Comments Response
 */
export interface ListCommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Get Comment Thread Response
 */
export interface GetCommentThreadResponse {
  thread: CommentThread;
}

/**
 * Delete Comment Response
 */
export interface DeleteCommentResponse {
  success: boolean;
  message: string;
}

/**
 * Vote Comment Response
 */
export interface VoteCommentResponse {
  comment: Comment;
  voteApplied: boolean;
}
