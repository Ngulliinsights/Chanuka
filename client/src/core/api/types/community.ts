/**
 * Community Types
 *
 * Type definitions for community features, discussions, and comments
 *
 * MIGRATION NOTE: Community types have been consolidated into
 * @client/shared/types/community module. This file now re-exports
 * from that unified location for backward compatibility.
 */

export type {
  DiscussionThread,
  CommunityUpdate,
  CommentSortField,
  CommentsQueryParams,
  CommentFormData,
  CreateCommentRequest,
  UpdateCommentRequest,
  VoteRequest,
} from '@client/shared/types/community';
