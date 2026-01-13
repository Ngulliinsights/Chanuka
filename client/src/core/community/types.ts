/**
 * Core Community Module Types
 *
 * Internal type definitions for the unified community system
 * These are distinct from @client/shared/types/community which are shared across the app
 */

import type {
  Comment,
  DiscussionThread,
  ActivityItem,
} from '@client/shared/types/community';

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
 * Moderation request
 */
export interface ModerationRequest {
  readonly contentId: number;
  readonly violationType: ViolationType;
  readonly reason: string;
  readonly description?: string;
}

export type ViolationType =
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'offensive'
  | 'off_topic'
  | 'other';

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
 * WebSocket events
 */
export interface WebSocketEvents {
  'comment:new': UnifiedComment;
  'comment:updated': UnifiedComment;
  'comment:deleted': { id: number };
  'comment:voted': { id: number; upvotes: number; downvotes: number };
  'thread:updated': UnifiedThread;
  'typing:indicator': { userId: number; userName: string; threadId: number };
  'moderation:action': UnifiedModeration;
  'presence:update': {
    userId: number;
    threadId: number;
    status: 'online' | 'offline';
    lastSeen: string;
  };
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
