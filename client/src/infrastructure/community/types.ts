/**
 * Core Community Module Types
 *
 * Internal type definitions for the unified community system
 * These are distinct from @client/lib/types/community which are shared across the app
 */

import type {
  Comment,
  DiscussionThread,
  ActivityItem,
} from '@client/lib/types/community';

/**
 * Unified comment representation for internal use
 */
export interface UnifiedComment extends Comment {
  readonly isCurrentUserAuthor?: boolean;
  readonly userVote?: 'up' | 'down' | null;
}

/**
 * Unified discussion thread representation for internal use
 */
export interface UnifiedThread extends DiscussionThread {
  readonly comments?: UnifiedComment[];
  readonly isCurrentUserParticipant?: boolean;
  readonly userParticipationStatus?: 'commented' | 'voted' | 'viewed' | 'none';
}

/**
 * Moderation report request — submitted by regular users flagging content.
 * Posted to POST /api/moderation/report.
 */
export interface ModerationRequest {
  readonly contentId: string;
  readonly contentType: 'comment' | 'thread';
  readonly violationType: ViolationType;
  readonly reason: string;
  readonly description?: string;
}

/**
 * Moderation action request — submitted by moderators acting on content.
 * Posted to POST /api/moderation/action.
 */
export interface ModerationActionRequest {
  readonly contentId: string;
  readonly contentType: 'comment' | 'thread';
  readonly action: ModerationAction;
  readonly reason: string;
}

/**
 * Moderator actions available on a piece of content.
 */
export type ModerationAction =
  | 'approve'
  | 'reject'
  | 'hide'
  | 'flag'
  | 'remove'
  | 'restore';

export type ViolationType =
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'offensive'
  | 'off_topic'
  | 'other'
  | 'inappropriate_language'
  | 'personal_attack'
  | 'copyright_violation'
  | 'hate_speech'
  | 'duplicate_content';

/**
 * Unified moderation action
 */
export interface UnifiedModeration {
  readonly id: number;
  readonly contentType: 'comment' | 'thread';
  readonly contentId: number;
  readonly status: 'pending' | 'resolved' | 'dismissed';
  readonly violationType: ViolationType;
  readonly createdAt: string;
  readonly resolvedAt?: string;
  readonly resolution?: string;
}

/**
 * Community state for unified module
 */
export interface CommunityState {
  readonly discussions: UnifiedThread[];
  readonly selectedDiscussionId?: number;
  readonly isLoading: boolean;
  readonly error?: string;
  readonly stats?: {
    readonly totalComments: number;
    readonly totalThreads: number;
    readonly totalParticipants: number;
  };
}

/**
 * Discussion state for unified module
 */
export interface DiscussionState {
  readonly threadId: number;
  readonly comments: UnifiedComment[];
  readonly isLoading: boolean;
  readonly error?: string;
  readonly pagination?: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasMore: boolean;
  };
}

/**
 * UI State for discussion view
 */
export interface DiscussionViewState {
  currentBillId: string;
  sortBy: string;
  filterBy: string;
  showModerated: boolean;
  autoSubscribe: boolean;
  enableTypingIndicators: boolean;
  currentThreadId?: number;
}

/**
 * WebSocket events
 */
export interface WebSocketEvents {
  'comment:new': UnifiedComment;
  'comment:updated': UnifiedComment;
  'comment:deleted': { id: number };
  'comment:voted': { id: number; upvotes: number; downvotes: number };
  'thread:created': UnifiedThread;
  'thread:updated': UnifiedThread;
  'typing:indicator': { userId: number; userName: string; threadId: number };
  /** Explicit stop signal so peers clear the indicator immediately. */
  'typing:stop': { userId: number; threadId: number };
  'moderation:action': UnifiedModeration;
  'presence:update': {
    userId: number;
    threadId: number;
    status: 'online' | 'offline';
    lastSeen: string;
  };
}

/**
 * Request types
 */
export interface CreateCommentRequest {
  billId: number | string;
  content: string;
  parentId?: number | string;
}

export interface UpdateCommentRequest {
  commentId: number | string;
  content: string;
}

export interface CreateThreadRequest {
  billId: number | string;
  title: string;
  content: string;
}

/**
 * WebSocket message type
 */
export type WebSocketEventType = keyof WebSocketEvents;

/**
 * Use community return type
 */
export interface UseCommunityReturn {
  discussions: UnifiedThread[];
  selectedDiscussion?: UnifiedThread;
  isLoading: boolean;
  error?: string;
  selectDiscussion: (id: number) => Promise<void>;
  refreshDiscussions: () => Promise<void>;
}

export interface UseDiscussionReturn {
  // Data
  comments: UnifiedComment[];
  threads: UnifiedThread[];
  currentThread?: UnifiedThread;

  // Loading / error state
  isLoading: boolean;
  isLoadingComments: boolean;
  isLoadingThreads: boolean;
  error?: string | null;

  // Comment mutations
  createComment: (data: CreateCommentRequest) => Promise<UnifiedComment>;
  updateComment: (data: UpdateCommentRequest) => Promise<UnifiedComment>;
  deleteComment: (commentId: string) => Promise<void>;
  voteComment: (commentId: string, vote: 'up' | 'down') => Promise<void>;

  // Thread mutations
  createThread: (data: CreateThreadRequest) => Promise<UnifiedThread>;
  selectThread: (threadId: number) => void;

  // Moderation
  reportContent: (data: ModerationRequest) => Promise<void>;
  moderateContent: (data: ModerationActionRequest) => Promise<void>;

  // Cache control
  invalidateComments: () => void;

  // Real-time
  typingUsers: string[];
  activeUsers: string[];
  startTyping: () => void;
  stopTyping: () => void;
}

export interface UseUnifiedCommunityReturn {
  discussion: UseDiscussionReturn;
  stats: {
    totalComments: number;
    totalThreads: number;
    activeUsers: number;
    expertComments: number;
  };
  shareThread: (threadId: string, platform: string) => Promise<void>;
  bookmarkComment: (commentId: string) => Promise<void>;
  followThread: (threadId: string) => Promise<void>;
  expertInsights: UnifiedComment[];
  trendingTopics: string[];
}