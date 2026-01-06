/**
 * Community Types
 *
 * Type definitions for community features, discussions, and comments
 */

import type { PaginationParams } from './common';

// ============================================================================
// Community Models
// ============================================================================

export interface DiscussionThread {
  readonly id: number;
  readonly billId: number;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly participantCount: number;
  readonly messageCount: number;
  readonly lastActivity: string;
  readonly pinned: boolean;
  readonly locked: boolean;
  readonly tags?: ReadonlyArray<string>;
}

export interface CommunityUpdate {
  readonly type: string;
  readonly discussionId: string;
  readonly data: unknown;
  readonly timestamp: string;
}

// ============================================================================
// Query Parameters
// ============================================================================

export type CommentSortField =
  | 'newest'
  | 'oldest'
  | 'most_voted'
  | 'controversial'
  | 'expert_first';

export interface CommentsQueryParams extends PaginationParams {
  readonly sort?: CommentSortField;
  readonly expertOnly?: boolean;
  readonly parentId?: number;
  readonly includeReplies?: boolean;
}

// ============================================================================
// Form Data
// ============================================================================

export interface CommentFormData {
  readonly billId: number;
  readonly content: string;
  readonly parentId?: number;
}
