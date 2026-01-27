/**
 * Community Hooks Types
 *
 * Type definitions for community-related React hooks
 *
 * @module shared/types/community/community-hooks
 */

import type {
  Comment,
  DiscussionThread,
  Expert,
  ActivityItem,
  TrendingTopic,
  Vote,
  CommentQueryOptions,
  ActivityFeedOptions,
  SearchOptions,
  SearchResult,
} from './community-base';

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useCommunity hook
 */
export interface UseCommunityResult {
  threads: DiscussionThread[];
  comments: Comment[];
  experts: Expert[];
  loading: boolean;
  error: Error | null;
  actions: CommunityActions;
}

/**
 * Community action methods
 */
export interface CommunityActions {
  fetchThreads: (billId: number) => Promise<void>;
  fetchComments: (threadId: number, options?: CommentQueryOptions) => Promise<void>;
  createComment: (threadId: number, content: string) => Promise<Comment>;
  updateComment: (commentId: number, content: string) => Promise<Comment>;
  deleteComment: (commentId: number) => Promise<void>;
  voteOnComment: (commentId: number, voteType: 'up' | 'down') => Promise<void>;
  createThread: (billId: number, title: string, content: string) => Promise<DiscussionThread>;
  reportContent: (contentId: number, reason: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

/**
 * Return type for useDiscussion hook
 */
export interface UseDiscussionResult {
  thread: DiscussionThread | null;
  comments: Comment[];
  participants: number;
  loading: boolean;
  error: Error | null;
  actions: DiscussionActions;
}

/**
 * Discussion-specific action methods
 */
export interface DiscussionActions {
  postComment: (content: string, parentId?: number) => Promise<Comment>;
  deleteComment: (commentId: number) => Promise<void>;
  voteOnComment: (commentId: number, direction: 'up' | 'down') => Promise<void>;
  pinComment: (commentId: number) => Promise<void>;
  lockThread: () => Promise<void>;
  unlockThread: () => Promise<void>;
}

/**
 * Return type for useActivityFeed hook
 */
export interface UseActivityFeedResult {
  activities: ActivityItem[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  actions: ActivityFeedActions;
}

/**
 * Activity feed action methods
 */
export interface ActivityFeedActions {
  loadMore: () => Promise<void>;
  filterBy: (options: ActivityFeedOptions) => Promise<void>;
  refresh: () => Promise<void>;
  markAsRead: (activityId: string) => Promise<void>;
}

/**
 * Return type for useTrendingTopics hook
 */
export interface UseTrendingTopicsResult {
  topics: TrendingTopic[];
  loading: boolean;
  error: Error | null;
  actions: TrendingTopicsActions;
}

/**
 * Trending topics action methods
 */
export interface TrendingTopicsActions {
  refresh: () => Promise<void>;
  follow: (topicId: string) => Promise<void>;
  unfollow: (topicId: string) => Promise<void>;
  filterByCategory: (category: string) => Promise<void>;
}

/**
 * Return type for useCommunitySearch hook
 */
export interface UseCommunitySearchResult {
  results: SearchResult[];
  totalResults: number;
  loading: boolean;
  error: Error | null;
  actions: SearchActions;
}

/**
 * Search action methods
 */
export interface SearchActions {
  search: (query: string, options?: Partial<SearchOptions>) => Promise<void>;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  resetSearch: () => void;
}

/**
 * Return type for useCommunityStats hook
 */
export interface UseCommunityStatsResult {
  totalComments: number;
  totalThreads: number;
  activeUsers: number;
  engagementRate: number;
  loading: boolean;
  error: Error | null;
}

/**
 * Return type for useExpert hook
 */
export interface UseExpertResult {
  expert: Expert | null;
  insights: Comment[];
  loading: boolean;
  error: Error | null;
  actions: ExpertActions;
}

/**
 * Expert action methods
 */
export interface ExpertActions {
  fetchExpertProfile: (expertId: number) => Promise<void>;
  submitInsight: (billId: number, content: string) => Promise<void>;
  endorse: (commentId: number) => Promise<void>;
}

/**
 * Return type for useCommunityNotifications hook
 */
export interface UseCommunityNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  actions: NotificationActions;
}

/**
 * Notification item
 */
export interface Notification {
  readonly id: string;
  readonly type: 'reply' | 'mention' | 'expert_insight' | 'discussion_update';
  readonly title: string;
  readonly content?: string;
  readonly relatedContentId?: number;
  readonly createdAt: string;
  readonly read: boolean;
}

/**
 * Notification action methods
 */
export interface NotificationActions {
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  subscribe: (type: string) => Promise<void>;
  unsubscribe: (type: string) => Promise<void>;
}

// ============================================================================
// Hook Configuration Types
// ============================================================================

/**
 * Options for useCommunity hook
 */
export interface UseCommunityOptions {
  billId?: number;
  autoFetch?: boolean;
  cacheEnabled?: boolean;
  cacheDuration?: number;
}

/**
 * Options for useDiscussion hook
 */
export interface UseDiscussionOptions {
  threadId: number;
  autoFetch?: boolean;
  commentLimit?: number;
  expandReplies?: boolean;
}

/**
 * Options for useActivityFeed hook
 */
export interface UseActivityFeedOptions {
  pageSize?: number;
  autoLoad?: boolean;
  filters?: ActivityFeedOptions;
}

/**
 * Options for useCommunitySearch hook
 */
export interface UseCommunitySearchOptions {
  debounceMs?: number;
  cacheResults?: boolean;
  pageSize?: number;
}
