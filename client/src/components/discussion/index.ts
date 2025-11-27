/**
 * Discussion Components - Export index
 * 
 * Centralized exports for all discussion-related components,
 * hooks, and utilities.
 */

// Main components
export { DiscussionThread } from './DiscussionThread';
export { CommentItem } from './CommentItem';
export { CommentForm } from './CommentForm';
export { CommunityReporting } from './CommunityReporting';

// Types
export type {
  Comment,
  DiscussionThread as DiscussionThreadType,
  CommentFormData,
  CommentValidation,
  ModerationFlag,
  ModerationAction,
  CommentReport,
  ModerationViolationType,
  CommentUpdateEvent,
  ModerationEvent,
  TypingIndicator,
  CommentSortOption,
  CommentFilterOption,
} from '@client/types/community';

// Store and hooks - Redux version
export * from '@client/store/slices/discussionSlice';
// export { useDiscussion } from '../../hooks/useDiscussion'; // Not implemented yet

// Services
// export { discussionService } from '@client/services/discussion-service'; // Not implemented yet