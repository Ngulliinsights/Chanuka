/**
 * Community Types - Unified Type System
 *
 * Centralized export point for all community-related types including
 * discussions, comments, experts, and real-time updates.
 *
 * @module shared/types/community
 *
 * @example
 * // Import base community types
 * import type { Comment, DiscussionThread, Expert } from '@client/lib/types/community';
 *
 * // Import hook types
 * import type { UseCommunityResult, UseDiscussionResult } from '@client/lib/types/community';
 *
 * // Import service types
 * import type { CommentsResponse, ThreadsResponse } from '@client/lib/types/community';
 */

// ============================================================================
// Base Community Types
// ============================================================================

export type {
  DiscussionThread,
  DiscussionThreadMetadata,
  ThreadParticipant,
  Comment,
  CommentVotes,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateThreadRequest,
  UpdateThreadRequest,
  ShareRequest,
  CommentReportData,
  Vote,
  VoteType,
  VoteResponse,
  VoteRequest,
  Expert,
  ExpertDomain,
  ExpertCredential,
  ExpertVerificationResponse,
  ExpertInsight,
  ExpertInsightSubmission,
  ExpertInsightSubmissionResponse,
  ActivityItem,
  ActivityType,
  TrendingTopic,
  TopicCategory as CommunityTopicCategory,
  CommunityStats,
  LocalImpactMetrics,
  Attachment,
  Mention,
  Contributor,
  CommentSortField,
  CommentQueryOptions,
  CommentsQueryParams,
  CommentFormData,
  CommentCreateData,
  ActivityFeedOptions,
  LocationFilter,
  SearchOptions,
  ExtendedCommunityStats,
  ExtendedLocalImpactMetrics,
  InsightSubmission,
  CommunityUpdate,
  CommunityUpdateType,
  ThreadEvent,
  UserEvent,
  ReportResponse,
  SearchResult,
} from './community-base';

export {
  isDiscussionThread,
  isComment,
  isExpert,
} from './community-base';

// ============================================================================
// Community Hooks Types
// ============================================================================

export type {
  UseCommunityResult,
  CommunityActions,
  UseDiscussionResult,
  DiscussionActions,
  UseActivityFeedResult,
  ActivityFeedActions,
  UseTrendingTopicsResult,
  TrendingTopicsActions,
  UseCommunitySearchResult,
  SearchActions,
  UseCommunityStatsResult,
  UseExpertResult,
  ExpertActions,
  UseCommunityNotificationsResult,
  Notification,
  NotificationActions,
  UseCommunityOptions,
  UseDiscussionOptions,
  UseActivityFeedOptions,
  UseCommunitySearchOptions,
} from './community-hooks';

// ============================================================================
// Community Services Types
// ============================================================================

export type {
  CommentsResponse,
  ThreadsResponse,
  CreateResponse as CommunityCreateResponse,
  UpdateResponse as CommunityUpdateResponse,
  DeleteResponse as CommunityDeleteResponse,
  ListResponse as CommunityListResponse,
  ErrorResponse as CommunityErrorResponse,
  WebSocketMessage,
  DiscussionMessage,
  CommentUpdateMessage,
  TypingIndicatorMessage,
  NotificationMessage,
  ModerationMessage,
  ExpertActivityMessage,
  TypingIndicator,
  CommentUpdateEvent,
  VoteUpdateEvent,
  PresenceUpdate,
  BatchOperation,
  BatchOperationResponse as CommunityBatchOperationResponse,
  PaginationParams,
  SortParams,
  FilterParams,
  QueryParams,
  CachedItem as CommunityCachedItem,
  CacheKey,
  SyncRequest as CommunitySyncRequest,
  SyncResponse as CommunitySyncResponse,
  Subscription,
  SubscriptionManager,
  HealthStatus,
  ConnectionStatus,
} from './community-services';

// ============================================================================
// Re-exports from legacy dashboard types (for compatibility)
// ============================================================================

/**
 * Legacy community types from original dashboard.ts
 * These are maintained for backward compatibility during migration
 */
export type {
  ActivityItem as LegacyActivityItem,
  TrendingTopic as LegacyTrendingTopic,
} from './community-base';

// Internal imports for utility functions
import type { Comment, DiscussionThread, Expert, ExpertDomain, ActivityType } from './community-base';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new comment with default values
 */
export function createCommentDefaults(overrides?: Partial<Comment>): Comment {
  return {
    id: 0,
    threadId: 0,
    billId: 0,
    content: '',
    authorId: 0,
    authorName: 'Anonymous',
    parentId: undefined,
    createdAt: new Date().toISOString(),
    edited: false,
    votes: { up: 0, down: 0, userVote: null },
    ...overrides,
  } as Comment;
}

/**
 * Create a new discussion thread with default values
 */
export function createDiscussionThreadDefaults(
  overrides?: Partial<DiscussionThread>
): DiscussionThread {
  return {
    id: 0,
    billId: 0,
    title: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    participantCount: 0,
    messageCount: 0,
    pinned: false,
    locked: false,
    ...overrides,
  } as DiscussionThread;
}

/**
 * Create a new expert with default values
 */
export function createExpertDefaults(overrides?: Partial<Expert>): Expert {
  return {
    id: 0,
    userId: 0,
    name: '',
    domain: 'other',
    credentials: [],
    verifiedAt: new Date().toISOString(),
    verificationLevel: 'pending',
    ...overrides,
  } as Expert;
}

/**
 * Format a comment for display
 */
export function formatCommentForDisplay(comment: Comment): string {
  return `${comment.authorName}: ${comment.content}`;
}

/**
 * Calculate engagement score for a comment
 */
export function calculateCommentEngagementScore(comment: Comment): number {
  const voteScore = comment.votes.up - comment.votes.down;
  const replyScore = (comment.replyCount || 0) * 5;
  return voteScore + replyScore;
}

/**
 * Determine expert domain color for UI
 */
export function getExpertDomainColor(domain: ExpertDomain): string {
  const colorMap: Record<ExpertDomain, string> = {
    healthcare: '#ef4444',
    education: '#3b82f6',
    environment: '#10b981',
    economy: '#f59e0b',
    infrastructure: '#8b5cf6',
    security: '#dc2626',
    technology: '#6366f1',
    legal: '#6b7280',
    science: '#14b8a6',
    other: '#9ca3af',
  };
  return colorMap[domain] || colorMap.other;
}

/**
 * Get activity type display label
 */
export function getActivityTypeLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    comment_posted: 'Posted a comment',
    comment_liked: 'Liked a comment',
    comment_replied: 'Replied to a comment',
    thread_created: 'Created a discussion',
    thread_pinned: 'Pinned a discussion',
    expert_insight_posted: 'Shared expert insight',
    vote_cast: 'Cast a vote',
    topic_trending: 'Trending topic',
    user_followed: 'Started following',
    achievement_unlocked: 'Unlocked achievement',
  };
  return labels[type] || 'Activity';
}

/**
 * Check if comment is from an expert
 */
export function isCommentFromExpert(comment: Comment): boolean {
  return comment.isAuthorExpert === true;
}

/**
 * Check if expert is verified
 */
export function isExpertVerified(expert: Expert): boolean {
  return expert.verificationLevel === 'verified';
}

/**
 * Get engagement level label from score
 */
export function getEngagementLevelLabel(score: number): string {
  if (score <= 0.2) return 'Very Low';
  if (score <= 0.4) return 'Low';
  if (score <= 0.6) return 'Medium';
  if (score <= 0.8) return 'High';
  return 'Very High';
}

/**
 * Format timestamp for display
 */
export function formatCommunityTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}
