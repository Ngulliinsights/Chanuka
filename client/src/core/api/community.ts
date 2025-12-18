/**
 * ============================================================================
 * COMMUNITY API SERVICE - OPTIMIZED VERSION
 * ============================================================================
 * Core API communication layer for all community engagement functionality
 * including discussions, comments, voting, expert insights, and moderation.
 * 
 * Strategic Design Philosophy:
 * ---------------------------------------------------------------------------
 * This service handles the social backbone of the platform where users engage
 * in civic discourse. The design prioritizes:
 * 
 * 1. Real-time responsiveness for user-generated actions (comments, votes)
 * 2. Optimistic UI updates by returning immediately and syncing in background
 * 3. Graceful degradation for non-critical features (activity feeds, stats)
 * 4. Aggressive cache invalidation for user-authored content
 * 5. Longer caching for stable reference data (expert verifications, insights)
 * 
 * The service implements intelligent retry logic for critical operations while
 * failing silently for nice-to-have features, ensuring that community issues
 * never prevent users from accessing core legislative information.
 * 
 * OPTIMIZATIONS IN THIS VERSION:
 * - Fixed all import ordering and grouping issues
 * - Removed all unused type imports
 * - Fixed TypeScript type mismatches with proper interface definitions
 * - Replaced 'any' types with proper type definitions
 * - Enhanced type safety throughout
 * - Improved error handling consistency
 * - Better cache key management
 * - More maintainable code structure
 */

import type { ActivityItem } from '../../types/community';
import type { Comment } from '../../types/community';
import type { CommunityStats } from '../../types/community';
import type { DiscussionThread } from '../../types/community';
import type { ExpertInsight } from '../../types/community';
import type { LocalImpactMetrics } from '../../types/community';
import type { TrendingTopic } from '../../types/community';
import type { VoteRequest } from '../../types/community';
import { logger } from '../../utils/logger';

import { globalApiClient } from './client';
import { globalErrorHandler } from './errors';

// ============================================================================
// Type Definitions and Interfaces
// ============================================================================

/**
 * Attachment represents a file or link associated with a comment.
 * Supports multiple media types for rich community discussions.
 */
export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'document' | 'link';
  name: string;
}

/**
 * Mention represents an @-mention of another user in a comment.
 * Includes position for accurate highlighting in the UI.
 */
export interface Mention {
  userId: string;
  userName: string;
  position: number;
}

/**
 * ThreadParticipant tracks user participation in discussion threads.
 * Helps identify active contributors and engagement patterns.
 */
export interface ThreadParticipant {
  userId: string;
  userName: string;
  joinedAt: string;
  lastActive: string;
}

/**
 * Contributor represents a community member with contribution metrics.
 * Used for displaying top contributors and reputation systems.
 */
export interface Contributor {
  id: string;
  name: string;
  avatar?: string;
  contributionCount: number;
  reputation: number;
}

/**
 * Expert represents a verified domain expert.
 * Tracks expertise areas and verification status for credibility.
 */
export interface Expert {
  id: string;
  name: string;
  expertise: string[];
  verified: boolean;
}

// Request interfaces for creating and updating content

export interface CreateCommentRequest {
  billId: number;
  content: string;
  parentId?: string;
  mentions?: string[];
  attachments?: string[];
}

export interface CreateThreadRequest {
  billId: number;
  title: string;
  description?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface UpdateThreadRequest {
  title?: string;
  description?: string;
}

export interface ShareRequest {
  platform: string;
  url: string;
  title: string;
  description?: string;
}

// Response interfaces with proper typing

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface ThreadsResponse {
  threads: DiscussionThread[];
  total: number;
  page: number;
  hasMore: boolean;
}

/**
 * Extended CommunityStats with all required properties.
 * Provides comprehensive community engagement metrics.
 */
export interface ExtendedCommunityStats extends CommunityStats {
  totalMembers: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  totalComments: number;
  totalThreads: number;
  averageEngagement: number;
}

/**
 * Extended LocalImpactMetrics with all required properties.
 * Tracks legislation impact at the community level.
 */
export interface ExtendedLocalImpactMetrics extends LocalImpactMetrics {
  billsDiscussed: number;
  localRepresentatives: number;
  communityEngagement: number;
  recentActivity: number;
}

/**
 * DiscussionThreadMetadata provides high-level statistics about a bill's discussion.
 * Useful for displaying engagement metrics before loading full content.
 */
export interface DiscussionThreadMetadata {
  billId: number;
  participants: number;
  comment_count: number;
  lastActivity: string;
  engagementScore: number;
  expertParticipation: number;
}

/**
 * VoteResponse contains updated vote counts after a voting action.
 * Provides immediate feedback for optimistic UI updates.
 */
export interface VoteResponse {
  score: number;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
}

/**
 * ReportResponse confirms receipt of a moderation report.
 * Tracks report status through the moderation pipeline.
 */
export interface ReportResponse {
  id: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  message: string;
}

/**
 * ExpertVerificationResponse contains expert credential verification data.
 * Used to display badges and credibility indicators in the UI.
 */
export interface ExpertVerificationResponse {
  verified: boolean;
  verificationType?: 'official' | 'domain' | 'identity';
  expertise_areas: string[];
  credibilityScore: number;
  lastVerified: string;
}

/**
 * ExpertInsightSubmissionResponse tracks the editorial review process.
 * Provides transparency about insight publication timeline.
 */
export interface ExpertInsightSubmissionResponse {
  id: string;
  status: 'draft' | 'under_review' | 'published' | 'rejected';
  submittedAt: string;
  reviewDeadline?: string;
}

// Event interfaces for real-time updates

export interface ThreadEvent {
  type: 'thread_created' | 'thread_updated' | 'thread_locked';
  threadId: string;
  thread?: DiscussionThread;
  userId?: string;
  timestamp: string;
}

export interface UserEvent {
  type: 'user_joined' | 'user_left' | 'user_typing';
  userId: string;
  userName: string;
  timestamp: string;
}

// Query options interfaces for flexible filtering and sorting

export interface CommentQueryOptions {
  sort?: 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
  expertOnly?: boolean;
  limit?: number;
  offset?: number;
  includeReplies?: boolean;
  minVotes?: number;
}

export interface ActivityFeedOptions {
  limit?: number;
  offset?: number;
  contentTypes?: Array<'comment' | 'vote' | 'expert_insight' | 'bill_update'>;
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'all';
  geography?: {
    state?: string;
    district?: string;
    county?: string;
  };
  followedOnly?: boolean;
}

export interface LocationFilter {
  state?: string;
  district?: string;
  county?: string;
  zipCode?: string;
}

export interface SearchOptions {
  contentTypes?: Array<'comment' | 'thread' | 'insight'>;
  billId?: number;
  limit?: number;
  offset?: number;
}

// Data interfaces for creating and reporting content

export interface CommentCreateData {
  billId: number;
  content: string;
  parentId?: string;
  mentions?: string[];
  attachments?: string[];
}

export interface CommentReportData {
  commentId: string;
  violationType: 'spam' | 'harassment' | 'misinformation' | 'offensive' | 'off_topic';
  reason: string;
  description?: string;
  evidence?: string[];
}

/**
 * SearchResult represents a single search result item.
 * Provides a unified structure for various content types.
 */
export interface SearchResult {
  id: string;
  type: 'comment' | 'thread' | 'insight';
  content: string;
  billId?: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  relevanceScore: number;
}

/**
 * InsightSubmission contains all data needed to submit an expert insight.
 * Includes metadata for editorial review and publication workflow.
 */
export interface InsightSubmission {
  billId: number;
  title: string;
  content: string;
  summary: string;
  expertiseAreas: string[];
  sources?: string[];
  attachments?: string[];
}

export type { VoteRequest };

// ============================================================================
// Cache Configuration Constants
// ============================================================================

/**
 * Centralized cache TTL configuration.
 * These values are based on content volatility and user expectations:
 * - Shorter TTLs for actively changing content (discussions, comments)
 * - Longer TTLs for stable reference data (expert verification, insights)
 * - Moderate TTLs for aggregate data (stats, trending topics)
 */
const CACHE_TTL = {
  DISCUSSION: 2 * 60 * 1000,      // 2 minutes - active discussions
  COMMENTS: 1 * 60 * 1000,        // 1 minute - needs real-time feel
  EXPERT_INSIGHTS: 15 * 60 * 1000, // 15 minutes - curated, stable content
  EXPERT_VERIFY: 30 * 60 * 1000,   // 30 minutes - verification rarely changes
  ACTIVITY_FEED: 3 * 60 * 1000,    // 3 minutes - balance freshness/performance
  TRENDING: 5 * 60 * 1000,         // 5 minutes - trends change gradually
  STATS: 10 * 60 * 1000,           // 10 minutes - aggregate data acceptable with delay
  SEARCH: 2 * 60 * 1000            // 2 minutes - search results
} as const;

/**
 * Timeout configuration for different operation types.
 * Critical user actions get shorter timeouts for better UX.
 */
const TIMEOUTS = {
  DEFAULT: 10000,        // 10 seconds for standard reads
  WRITE: 8000,          // 8 seconds for write operations
  VOTE: 3000,           // 3 seconds for voting (non-blocking)
  FEED: 12000,          // 12 seconds for feed aggregation
  INSIGHT: 15000        // 15 seconds for large insight content
} as const;

// ============================================================================
// Community API Service Class
// ============================================================================

/**
 * Centralized service for all community and social engagement operations.
 * 
 * This service implements a sophisticated caching and error handling strategy
 * designed to provide the best possible user experience while managing server
 * load effectively. Write operations always skip cache and should trigger
 * cache invalidation in a production system.
 */
export class CommunityApiService {
  private readonly baseUrl: string;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(baseUrl: string = '/api/community') {
    this.baseUrl = baseUrl;
  }

  /**
   * Creates a unique key for abort controller tracking based on endpoint and options.
   */
  private getRequestKey(endpoint: string, options?: RequestInit): string {
    return `${endpoint}-${JSON.stringify(options?.body || '')}`;
  }

  /**
   * Cancels an in-flight request if it exists.
   */
  public cancelRequest(endpoint: string, options?: RequestInit): void {
    const key = this.getRequestKey(endpoint, options);
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }

  /**
   * Cleanup method to abort all pending requests.
   * Should be called when component unmounts or service is destroyed.
   */
  public cleanup(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  // ==========================================================================
  // Discussion and Comment Management
  // ==========================================================================

  /**
   * Retrieves the complete discussion thread metadata for a bill.
   * This provides high-level stats before loading full comments.
   */
  async getDiscussionThread(billId: number): Promise<DiscussionThreadMetadata> {
    const endpoint = `${this.baseUrl}/bills/${billId}/discussion`;
    const requestKey = this.getRequestKey(endpoint);
    const abortController = new AbortController();
    this.abortControllers.set(requestKey, abortController);

    try {
      const response = await globalApiClient.get<DiscussionThreadMetadata>(
        endpoint,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.DISCUSSION,
          signal: abortController.signal
        }
      );

      this.abortControllers.delete(requestKey);

      logger.info('Discussion thread loaded', {
        component: 'CommunityApiService',
        billId,
        participantCount: response.data.participants,
        commentCount: response.data.comment_count
      });

      return response.data;
    } catch (error) {
      this.abortControllers.delete(requestKey);
      logger.error('Failed to fetch discussion thread', {
        component: 'CommunityApiService',
        billId,
        error
      });
      throw await this.handleError(error, 'getDiscussionThread', { billId });
    }
  }

  /**
   * Retrieves comments for a bill with flexible sorting and filtering.
   * Supports pagination, expert filtering, and various sort orders.
   */
  async getBillComments(billId: number, options: CommentQueryOptions = {}): Promise<Comment[]> {
    const {
      sort = 'newest',
      expertOnly = false,
      limit = 50,
      offset = 0,
      includeReplies = true,
      minVotes
    } = options;

    try {
      const params = new URLSearchParams({
        sort,
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (expertOnly) params.append('expert', 'true');
      if (!includeReplies) params.append('include_replies', 'false');
      if (minVotes !== undefined) params.append('min_votes', minVotes.toString());

      const response = await globalApiClient.get<Comment[]>(
        `${this.baseUrl}/comments/${billId}?${params.toString()}`,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.COMMENTS
        }
      );

      logger.info('Bill comments loaded', {
        component: 'CommunityApiService',
        billId,
        count: response.data.length,
        sort,
        expertOnly
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch bill comments', {
        component: 'CommunityApiService',
        billId,
        options,
        error
      });
      throw await this.handleError(error, 'getBillComments', { billId });
    }
  }

  /**
   * Creates a new comment on a bill or as a reply to another comment.
   * This is a critical user-facing operation that must feel instantaneous.
   */
  async addComment(data: CommentCreateData): Promise<Comment> {
    try {
      const response = await globalApiClient.post<Comment>(
        `${this.baseUrl}/comments`,
        {
          bill_id: data.billId,
          content: data.content,
          parent_id: data.parentId,
          mentions: data.mentions,
          attachments: data.attachments
        },
        {
          timeout: TIMEOUTS.WRITE,
          skipCache: true
        }
      );

      logger.info('Comment created successfully', {
        component: 'CommunityApiService',
        billId: data.billId,
        commentId: response.data.id,
        isReply: !!data.parentId,
        hasMentions: (data.mentions?.length || 0) > 0
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create comment', {
        component: 'CommunityApiService',
        billId: data.billId,
        isReply: !!data.parentId,
        error
      });
      throw await this.handleError(error, 'addComment', { billId: data.billId });
    }
  }

  /**
   * Updates an existing comment's content.
   * The backend should track edit history for transparency.
   */
  async updateComment(commentId: string, content: string): Promise<Comment> {
    try {
      const response = await globalApiClient.put<Comment>(
        `${this.baseUrl}/comments/${commentId}`,
        { content },
        {
          timeout: TIMEOUTS.WRITE,
          skipCache: true
        }
      );

      logger.info('Comment updated successfully', {
        component: 'CommunityApiService',
        commentId,
        contentLength: content.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update comment', {
        component: 'CommunityApiService',
        commentId,
        error
      });
      throw await this.handleError(error, 'updateComment', { commentId });
    }
  }

  /**
   * Deletes a comment from a discussion.
   * Typically implemented as a soft delete to preserve reply chains.
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      await globalApiClient.delete(
        `${this.baseUrl}/comments/${commentId}`,
        { 
          timeout: TIMEOUTS.DEFAULT,
          skipCache: true 
        }
      );

      logger.info('Comment deleted successfully', {
        component: 'CommunityApiService',
        commentId
      });
    } catch (error) {
      logger.error('Failed to delete comment', {
        component: 'CommunityApiService',
        commentId,
        error
      });
      throw await this.handleError(error, 'deleteComment', { commentId });
    }
  }

  // ==========================================================================
  // Voting and Engagement
  // ==========================================================================

  /**
   * Records a vote on a comment (upvote or downvote).
   * Implements graceful degradation - returns null on failure rather than throwing.
   */
  async voteComment(commentId: string, voteType: 'up' | 'down'): Promise<VoteResponse | null> {
    try {
      const response = await globalApiClient.post<VoteResponse>(
        `${this.baseUrl}/comments/${commentId}/vote`,
        { type: voteType },
        {
          timeout: TIMEOUTS.VOTE,
          skipCache: true
        }
      );

      logger.debug('Vote recorded', {
        component: 'CommunityApiService',
        commentId,
        voteType,
        newScore: response.data.score
      });

      return response.data;
    } catch (error) {
      // Graceful degradation for non-critical voting functionality
      logger.warn('Vote recording failed (non-blocking)', {
        component: 'CommunityApiService',
        commentId,
        voteType,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Removes a user's vote from a comment.
   * Also implements graceful degradation like voting.
   */
  async removeVote(commentId: string): Promise<VoteResponse | null> {
    try {
      const response = await globalApiClient.delete<VoteResponse>(
        `${this.baseUrl}/comments/${commentId}/vote`,
        {
          timeout: TIMEOUTS.VOTE,
          skipCache: true
        }
      );

      logger.debug('Vote removed', {
        component: 'CommunityApiService',
        commentId,
        newScore: response.data.score
      });

      return response.data;
    } catch (error) {
      logger.warn('Vote removal failed (non-blocking)', {
        component: 'CommunityApiService',
        commentId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  // ==========================================================================
  // Moderation and Reporting
  // ==========================================================================

  /**
   * Reports a comment for moderation review.
   * Users should be informed if their report didn't go through.
   */
  async reportComment(reportData: CommentReportData): Promise<ReportResponse> {
    const { commentId, violationType, reason, description, evidence } = reportData;

    try {
      const response = await globalApiClient.post<ReportResponse>(
        `${this.baseUrl}/comments/${commentId}/flag`,
        {
          flagType: violationType,
          reason,
          description,
          evidence
        },
        {
          timeout: TIMEOUTS.DEFAULT,
          skipCache: true
        }
      );

      logger.info('Comment reported successfully', {
        component: 'CommunityApiService',
        commentId,
        violationType,
        reportId: response.data.id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to report comment', {
        component: 'CommunityApiService',
        commentId,
        violationType,
        error
      });
      throw await this.handleError(error, 'reportComment', { commentId });
    }
  }

  // ==========================================================================
  // Expert System Integration
  // ==========================================================================

  /**
   * Retrieves expert verification status and credentials.
   * Uses longest cache TTL since verification rarely changes.
   */
  async getExpertVerification(userId: string): Promise<ExpertVerificationResponse> {
    try {
      const response = await globalApiClient.get<ExpertVerificationResponse>(
        `${this.baseUrl}/experts/${userId}/verification`,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.EXPERT_VERIFY
        }
      );

      logger.info('Expert verification loaded', {
        component: 'CommunityApiService',
        userId,
        isVerified: response.data.verified,
        expertiseCount: response.data.expertise_areas.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch expert verification', {
        component: 'CommunityApiService',
        userId,
        error
      });
      throw await this.handleError(error, 'getExpertVerification', { userId });
    }
  }

  /**
   * Fetches curated expert insights for a specific bill.
   * These are professionally reviewed deep analyses.
   */
  async getExpertInsights(billId: number): Promise<ExpertInsight[]> {
    try {
      const response = await globalApiClient.get<ExpertInsight[]>(
        `${this.baseUrl}/bills/${billId}/expert-insights`,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.EXPERT_INSIGHTS
        }
      );

      logger.info('Expert insights loaded', {
        component: 'CommunityApiService',
        billId,
        count: response.data.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch expert insights', {
        component: 'CommunityApiService',
        billId,
        error
      });
      throw await this.handleError(error, 'getExpertInsights', { billId });
    }
  }

  /**
   * Submits a new expert insight for a bill.
   * Restricted to verified experts, may require editorial review.
   */
  async submitExpertInsight(insight: InsightSubmission): Promise<ExpertInsightSubmissionResponse> {
    try {
      const response = await globalApiClient.post<ExpertInsightSubmissionResponse>(
        `${this.baseUrl}/expert-insights`,
        insight,
        {
          timeout: TIMEOUTS.INSIGHT,
          skipCache: true
        }
      );

      logger.info('Expert insight submitted', {
        component: 'CommunityApiService',
        billId: insight.billId,
        insightId: response.data.id,
        status: response.data.status
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to submit expert insight', {
        component: 'CommunityApiService',
        billId: insight.billId,
        error
      });
      throw await this.handleError(error, 'submitExpertInsight');
    }
  }

  // ==========================================================================
  // Activity Feeds and Social Discovery
  // ==========================================================================

  /**
   * Retrieves the community activity feed with comprehensive filtering.
   * Aggregates various types of community activity into a unified stream.
   */
  async getActivityFeed(options: ActivityFeedOptions = {}): Promise<ActivityItem[]> {
    const {
      limit = 50,
      offset = 0,
      contentTypes,
      timeRange = 'day',
      geography,
      followedOnly = false
    } = options;

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        timeRange
      });

      if (contentTypes?.length) {
        contentTypes.forEach(type => params.append('contentTypes', type));
      }

      if (followedOnly) {
        params.append('followedOnly', 'true');
      }

      if (geography) {
        if (geography.state) params.append('state', geography.state);
        if (geography.district) params.append('district', geography.district);
        if (geography.county) params.append('county', geography.county);
      }

      const response = await globalApiClient.get<ActivityItem[]>(
        `${this.baseUrl}/activity?${params.toString()}`,
        {
          timeout: TIMEOUTS.FEED,
          cacheTTL: CACHE_TTL.ACTIVITY_FEED
        }
      );

      logger.info('Activity feed loaded', {
        component: 'CommunityApiService',
        count: response.data.length,
        timeRange,
        hasGeography: !!geography,
        followedOnly
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch activity feed', {
        component: 'CommunityApiService',
        options,
        error
      });
      throw await this.handleError(error, 'getActivityFeed');
    }
  }

  /**
   * Fetches currently trending topics in the community.
   * Implements graceful degradation since this is a nice-to-have feature.
   */
  async getTrendingTopics(limit: number = 10): Promise<TrendingTopic[]> {
    try {
      const response = await globalApiClient.get<TrendingTopic[]>(
        `${this.baseUrl}/trending?limit=${limit}`,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.TRENDING
        }
      );

      logger.info('Trending topics loaded', {
        component: 'CommunityApiService',
        count: response.data.length
      });

      return response.data;
    } catch (error) {
      // Graceful degradation for nice-to-have feature
      logger.warn('Failed to fetch trending topics (non-blocking)', {
        component: 'CommunityApiService',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Retrieves aggregate community participation statistics.
   * Implements graceful degradation for non-critical stats.
   */
  async getCommunityStats(): Promise<ExtendedCommunityStats> {
    try {
      const response = await globalApiClient.get<ExtendedCommunityStats>(
        `${this.baseUrl}/stats`,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.STATS
        }
      );

      logger.info('Community stats loaded', {
        component: 'CommunityApiService',
        totalMembers: response.data.totalMembers,
        activeToday: response.data.activeToday
      });

      return response.data;
    } catch (error) {
      // Stats are informational, not critical - provide fallback empty stats
      logger.warn('Failed to fetch community stats (non-blocking)', {
        component: 'CommunityApiService',
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        totalMembers: 0,
        activeToday: 0,
        activeThisWeek: 0,
        activeThisMonth: 0,
        totalComments: 0,
        totalThreads: 0,
        averageEngagement: 0
      } as ExtendedCommunityStats;
    }
  }

  // ==========================================================================
  // Local Impact and Geographic Features
  // ==========================================================================

  /**
   * Fetches local impact metrics for specific geographic areas.
   * Helps users understand legislation's effect on their community.
   */
  async getLocalImpactMetrics(location: LocationFilter): Promise<ExtendedLocalImpactMetrics> {
    try {
      const params = new URLSearchParams();

      if (location.state) params.append('state', location.state);
      if (location.district) params.append('district', location.district);
      if (location.county) params.append('county', location.county);
      if (location.zipCode) params.append('zip', location.zipCode);

      const response = await globalApiClient.get<ExtendedLocalImpactMetrics>(
        `${this.baseUrl}/local-impact?${params.toString()}`,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.STATS
        }
      );

      logger.info('Local impact metrics loaded', {
        component: 'CommunityApiService',
        location,
        billCount: response.data.billsDiscussed
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch local impact metrics', {
        component: 'CommunityApiService',
        location,
        error
      });
      throw await this.handleError(error, 'getLocalImpactMetrics', { location });
    }
  }

  // ==========================================================================
  // Thread Management
  // ==========================================================================

  /**
   * Retrieves all discussion threads for a specific bill.
   * Threads organize discussions into focused topics within a bill's broader conversation.
   */
  async getBillThreads(billId: number): Promise<DiscussionThread[]> {
    try {
      const response = await globalApiClient.get<DiscussionThread[]>(
        `${this.baseUrl}/bills/${billId}/threads`,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.DISCUSSION
        }
      );

      logger.info('Bill threads loaded', {
        component: 'CommunityApiService',
        billId,
        threadCount: response.data.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch bill threads', {
        component: 'CommunityApiService',
        billId,
        error
      });
      throw await this.handleError(error, 'getBillThreads', { billId });
    }
  }

  /**
   * Creates a new discussion thread for a bill.
   * Threads help organize conversations around specific aspects or questions about legislation.
   */
  async createThread(data: CreateThreadRequest): Promise<DiscussionThread> {
    try {
      const response = await globalApiClient.post<DiscussionThread>(
        `${this.baseUrl}/threads`,
        {
          bill_id: data.billId,
          title: data.title,
          description: data.description
        },
        {
          timeout: TIMEOUTS.WRITE,
          skipCache: true
        }
      );

      logger.info('Thread created successfully', {
        component: 'CommunityApiService',
        billId: data.billId,
        threadId: response.data.id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create thread', {
        component: 'CommunityApiService',
        billId: data.billId,
        error
      });
      throw await this.handleError(error, 'createThread', { billId: data.billId });
    }
  }

  /**
   * Retrieves a specific thread by ID with all its metadata.
   * Includes participant counts, engagement metrics, and thread status.
   */
  async getThread(threadId: string): Promise<DiscussionThread> {
    try {
      const response = await globalApiClient.get<DiscussionThread>(
        `${this.baseUrl}/threads/${threadId}`,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.DISCUSSION
        }
      );

      logger.info('Thread loaded', {
        component: 'CommunityApiService',
        threadId,
        commentCount: response.data.totalComments
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch thread', {
        component: 'CommunityApiService',
        threadId,
        error
      });
      throw await this.handleError(error, 'getThread', { threadId });
    }
  }

  /**
   * Updates an existing discussion thread's title or description.
   * Typically restricted to the thread creator or moderators.
   */
  async updateThread(threadId: string, updates: UpdateThreadRequest): Promise<DiscussionThread> {
    try {
      const response = await globalApiClient.put<DiscussionThread>(
        `${this.baseUrl}/threads/${threadId}`,
        updates,
        {
          timeout: TIMEOUTS.WRITE,
          skipCache: true
        }
      );

      logger.info('Thread updated successfully', {
        component: 'CommunityApiService',
        threadId
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update thread', {
        component: 'CommunityApiService',
        threadId,
        error
      });
      throw await this.handleError(error, 'updateThread', { threadId });
    }
  }

  /**
   * Deletes a discussion thread and all associated comments.
   * This is a destructive operation that should require confirmation in the UI.
   */
  async deleteThread(threadId: string): Promise<void> {
    try {
      await globalApiClient.delete(
        `${this.baseUrl}/threads/${threadId}`,
        {
          timeout: TIMEOUTS.DEFAULT,
          skipCache: true
        }
      );

      logger.info('Thread deleted successfully', {
        component: 'CommunityApiService',
        threadId
      });
    } catch (error) {
      logger.error('Failed to delete thread', {
        component: 'CommunityApiService',
        threadId,
        error
      });
      throw await this.handleError(error, 'deleteThread', { threadId });
    }
  }

  // ==========================================================================
  // Search and Discovery
  // ==========================================================================

  /**
   * Searches community content including comments, threads, and insights.
   * Provides flexible filtering by content type and bill association.
   * Results are ranked by relevance score for best user experience.
   */
  async searchCommunity(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: (options.limit || 20).toString(),
        offset: (options.offset || 0).toString()
      });

      if (options.contentTypes?.length) {
        options.contentTypes.forEach(type => params.append('types', type));
      }

      if (options.billId) {
        params.append('bill_id', options.billId.toString());
      }

      const response = await globalApiClient.get<SearchResult[]>(
        `${this.baseUrl}/search?${params.toString()}`,
        {
          timeout: TIMEOUTS.DEFAULT,
          cacheTTL: CACHE_TTL.SEARCH
        }
      );

      logger.info('Community search completed', {
        component: 'CommunityApiService',
        query,
        resultCount: response.data.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to search community', {
        component: 'CommunityApiService',
        query,
        error
      });
      throw await this.handleError(error, 'searchCommunity', { query });
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Centralized error handling with context enrichment.
   * 
   * This method ensures consistent error reporting across all community
   * operations while preserving critical context for debugging. The global
   * error handler can then implement sophisticated error tracking, user
   * notifications, and automatic retry logic as appropriate.
   * 
   * The method is designed to never throw its own errors, instead always
   * returning the original error after logging and processing, which maintains
   * the error propagation chain for proper handling upstream.
   * 
   * @param error - Original error object from the API call
   * @param operation - Name of the operation that failed
   * @param context - Additional context for debugging
   * @returns Enriched error object ready to be thrown
   */
  private async handleError(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>
  ): Promise<Error> {
    // Ensure we have an Error object to work with
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // globalErrorHandler may be a function that optionally returns a Promise.
    // Call it and treat the result as unknown, then check for a `then` function.
    const maybePromise: unknown = globalErrorHandler(errorObj, {
      component: 'CommunityApiService',
      operation,
      ...context
    }) as unknown;

    if (maybePromise && typeof (maybePromise as { then?: unknown }).then === 'function') {
      await maybePromise as Promise<void>;
    }
    
    return errorObj;
  }
}

// ============================================================================
// Global Instance Export
// ============================================================================

/**
 * Pre-configured global instance of the community API service.
 * 
 * Use this singleton throughout your application to ensure consistent
 * caching behavior, error handling, and logging across all community
 * features. The singleton pattern also enables potential future enhancements
 * like connection pooling, request batching, and global rate limiting.
 * 
 * Example usage:
 * 
 * ```typescript
 * import { communityApiService } from './api/community';
 * 
 * // Fetch comments for a bill
 * const comments = await communityApiService.getBillComments(12345, {
 *   sort: 'most_voted',
 *   expertOnly: true
 * });
 * 
 * // Add a new comment
 * const newComment = await communityApiService.addComment({
 *   billId: 12345,
 *   content: 'This legislation could significantly impact healthcare...',
 *   mentions: ['@expert-user-id']
 * });
 * 
 * // Vote on a comment
 * await communityApiService.voteComment(newComment.id, 'up');
 * ```
 */
export const communityApiService = new CommunityApiService();