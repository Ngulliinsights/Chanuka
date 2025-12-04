/**
 * ============================================================================
 * COMMUNITY API SERVICE
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
 */

import type { VoteRequest } from '../../types/community';
import { logger } from '../../utils/logger';

import { globalApiClient } from './client';
import { globalErrorHandler } from './errors';

// ============================================================================
// Type Re-exports and Definitions
// ============================================================================

// Import available types from community

// Define all community types locally since they're not available in the types directory
export interface ActivityItem {
  id: string;
  type: 'comment' | 'vote' | 'expert_insight' | 'bill_update';
  userId: string;
  billId?: number;
  timestamp: string;
  metadata?: any;
}

export interface TrendingTopic {
  id: string;
  title: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CommunityStats {
  totalComments: number;
  totalUsers: number;
  activeUsers: number;
  engagementRate: number;
}

export interface LocalImpactMetrics {
  state?: string;
  district?: string;
  county?: string;
  impactScore: number;
  affectedPopulation: number;
}

export interface Comment {
  id: string;
  billId: number;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  replies: Comment[];
  replyCount: number;
  depth: number;
  status: 'active' | 'hidden' | 'removed' | 'under_review';
  qualityScore: number;
  isHighQuality: boolean;
  isExpertComment: boolean;
}

export interface DiscussionThread {
  id: number;
  billId: number;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  totalComments: number;
  participantCount: number;
  isLocked: boolean;
  engagementScore: number;
  qualityScore: number;
  lastActivity: string;
}

export interface CommentFormData {
  content: string;
  parentId?: string;
  billId: number;
}

export interface CommentReport {
  id: number;
  commentId: string;
  reporterId: string;
  violationType: ModerationViolationType;
  reason: string;
  description?: string;
  createdAt: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
}

export interface ModerationAction {
  id: number;
  commentId: string;
  moderatorId: string;
  action: 'hide' | 'remove' | 'restore' | 'warn' | 'ban_user';
  reason: string;
  createdAt: string;
}

export type ModerationViolationType = 
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'off_topic'
  | 'inappropriate_language'
  | 'personal_attack'
  | 'duplicate_content'
  | 'copyright_violation'
  | 'other';

export interface ExpertInsight {
  id: string;
  billId: number;
  expertId: string;
  title: string;
  content: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'archived';
}

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'document' | 'link';
  name: string;
}

export interface Mention {
  userId: string;
  userName: string;
  position: number;
}

export interface ThreadParticipant {
  userId: string;
  userName: string;
  joinedAt: string;
  lastActive: string;
}

export interface SocialShare {
  id: string;
  platform: string;
  url: string;
  createdAt: string;
}

export interface Contributor {
  id: string;
  name: string;
  avatar?: string;
  contributionCount: number;
  reputation: number;
}

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

export interface ShareRequest {
  platform: string;
  url: string;
  title: string;
  description?: string;
}

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
}

export interface CommentEvent {
  type: 'comment_added' | 'comment_updated' | 'comment_removed' | 'comment_voted';
  commentId: string;
  comment?: Comment;
  userId?: string;
  timestamp: string;
}

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

export interface CommentValidation {
  isValid: boolean;
  errors: {
    content?: string;
    length?: string;
    quality?: string;
  };
  warnings: {
    similarContent?: string;
    tone?: string;
  };
}

export interface ModerationFlag {
  id: number;
  commentId: string;
  reporterId: string;
  type: ModerationViolationType;
  reason: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'upheld';
}

export interface ModerationStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  averageResolutionTime: number;
}

export interface CommunityGuidelines {
  id: number;
  title: string;
  description: string;
  rules: Array<{
    id: number;
    title: string;
    description: string;
    examples: string[];
    consequences: string[];
  }>;
  lastUpdated: string;
}

export interface UserModerationHistory {
  userId: string;
  warnings: number;
  violations: number;
  bans: number;
  reputation: number;
  lastViolation?: string;
  status: 'good_standing' | 'warned' | 'restricted' | 'banned';
}

export interface CommentUpdateEvent {
  type: 'comment_added' | 'comment_updated' | 'comment_removed' | 'comment_voted';
  billId: number;
  commentId: string;
  comment?: Comment;
  userId?: string;
  timestamp: string;
}

export interface ModerationEvent {
  type: 'comment_reported' | 'comment_moderated' | 'user_warned' | 'user_banned';
  commentId?: string;
  userId?: string;
  moderatorId?: string;
  action?: string;
  reason?: string;
  timestamp: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  billId: number;
  parentId?: string;
  timestamp: string;
}

export interface CommentQualityMetrics {
  length: number;
  readabilityScore: number;
  sentimentScore: number;
  hasLinks: boolean;
  hasCitations: boolean;
  engagementRatio: number;
  responseRate: number;
}

export interface QualityThresholds {
  minLength: number;
  maxLength: number;
  minReadabilityScore: number;
  minSentimentScore: number;
  spamKeywords: string[];
  requiredElements?: string[];
}

export interface ModerationAppeal {
  id: number;
  commentId: string;
  userId: string;
  moderationActionId: string;
  reason: string;
  description: string;
  evidence?: string[];
  createdAt: string;
  status: 'pending' | 'under_review' | 'approved' | 'denied';
}

export type CommentSortOption = 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
export type CommentFilterOption = 'all' | 'expert_only' | 'high_quality' | 'recent';

export interface Expert {
  id: string;
  name: string;
  expertise: string[];
  verified: boolean;
}

// Re-export VoteRequest from the types directory
export type { VoteRequest };

/**
 * Comprehensive options for retrieving and filtering comments.
 * These parameters give users control over how they experience discussions,
 * from focusing on expert opinions to finding controversial debates.
 */
export interface CommentQueryOptions {
  sort?: 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
  expertOnly?: boolean;
  limit?: number;
  offset?: number;
  includeReplies?: boolean;
  minVotes?: number;
}

/**
 * Data structure for creating new comments with optional threading.
 * The parentId enables nested reply chains for richer discussions.
 */
export interface CommentCreateData {
  billId: number;
  content: string;
  parentId?: string;
  mentions?: string[]; // User IDs mentioned in the comment
  attachments?: string[]; // URLs to supporting documents or images
}

/**
 * Structured reporting data for content moderation.
 * Detailed violation information helps moderators make informed decisions.
 */
export interface CommentReportData {
  commentId: string;
  violationType: 'spam' | 'harassment' | 'misinformation' | 'offensive' | 'off_topic';
  reason: string;
  description?: string;
  evidence?: string[]; // URLs or quotes supporting the report
}

/**
 * Options for filtering the community activity feed.
 * Allows users to customize their view of community engagement.
 */
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
  followedOnly?: boolean; // Show only activity from followed users
}

/**
 * Location-specific parameters for local impact data.
 * Enables users to see how legislation affects their specific area.
 */
export interface LocationFilter {
  state?: string;
  district?: string;
  county?: string;
  zipCode?: string;
}

// ============================================================================
// API Response Interfaces
// ============================================================================

/**
 * Metadata for discussion threads without full comment data.
 * Used for efficient loading of discussion stats before comments.
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
 * Response structure for voting operations.
 * Contains updated vote counts after user action.
 */
export interface VoteResponse {
  score: number;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
}

/**
 * Response structure for comment reporting operations.
 * Contains report ID for tracking and confirmation.
 */
export interface ReportResponse {
  id: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  message: string;
}

/**
 * Response structure for expert verification queries.
 * Contains verification status and related expert information.
 */
export interface ExpertVerificationResponse {
  verified: boolean;
  verificationType?: 'official' | 'domain' | 'identity';
  expertise_areas: string[];
  credibilityScore: number;
  lastVerified: string;
}

/**
 * Response structure for expert insight submissions.
 * Contains submission status and metadata.
 */
export interface ExpertInsightSubmissionResponse {
  id: string;
  status: 'draft' | 'under_review' | 'published' | 'rejected';
  submittedAt: string;
  reviewDeadline?: string;
}

// ============================================================================
// Community API Service Class
// ============================================================================

/**
 * Centralized service for all community and social engagement operations.
 * 
 * Cache Strategy Rationale:
 * -------------------------
 * - Discussion threads: 2 min cache (actively changing with new comments)
 * - Comments list: 1 min cache (needs to feel fresh for real-time discussions)
 * - Expert insights: 15 min cache (curated content that doesn't change often)
 * - Expert verification: 30 min cache (verification status is stable)
 * - Activity feed: 3 min cache (balance between freshness and performance)
 * - Trending topics: 5 min cache (trends change gradually, not instantly)
 * - Community stats: 10 min cache (aggregate data acceptable with delay)
 * 
 * Write operations (comments, votes, reports) always skip cache and should
 * trigger cache invalidation for related read operations in a production system.
 */
export class CommunityApiService {
   private readonly baseUrl: string;
   private readonly defaultTimeout = 10000;

   // Abort controller management for request cancellation
   private abortControllers: Map<string, AbortController> = new Map();

   // Differentiated cache TTLs based on content volatility and user expectations
   private readonly discussionCacheTTL = 2 * 60 * 1000;      // 2 minutes
   private readonly commentsCacheTTL = 1 * 60 * 1000;        // 1 minute - needs freshness
   private readonly expertInsightsCacheTTL = 15 * 60 * 1000; // 15 minutes - stable content
   private readonly expertVerifyCacheTTL = 30 * 60 * 1000;   // 30 minutes - rarely changes
   private readonly activityCacheTTL = 3 * 60 * 1000;        // 3 minutes
   private readonly trendingCacheTTL = 5 * 60 * 1000;        // 5 minutes
   private readonly statsCacheTTL = 10 * 60 * 1000;          // 10 minutes

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Creates a unique key for abort controller tracking
   */
  private getRequestKey(endpoint: string, options?: RequestInit): string {
    return `${endpoint}-${JSON.stringify(options?.body || '')}`;
  }

  /**
   * Cancels an in-flight request if it exists
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
   * Cleanup method to abort all pending requests and clear the abort controllers map
   */
  cleanup(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  // ==========================================================================
  // Discussion and Comment Management
  // ==========================================================================

  /**
   * Retrieves the complete discussion thread for a bill.
   *
   * This method fetches the discussion metadata including participant count,
   * overall sentiment, and thread statistics. It's separate from fetching
   * individual comments to allow efficient loading patterns where you show
   * discussion stats before loading the full comment tree.
   *
   * @param billId - ID of the bill to get discussion for
   * @returns Discussion thread metadata and statistics
   */
   async getDiscussionThread(billId: number): Promise<DiscussionThreadMetadata> {
    const requestKey = this.getRequestKey(`${this.baseUrl}/bills/${billId}/discussion`);
    const abortController = new AbortController();
    this.abortControllers.set(requestKey, abortController);

    try {
      const response = await globalApiClient.get<DiscussionThreadMetadata>(
        `${this.baseUrl}/bills/${billId}/discussion`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.discussionCacheTTL,
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
   *
   * The sorting options are carefully designed to support different discussion
   * patterns. The 'newest' sort shows breaking conversations, 'most_voted' surfaces
   * community consensus, 'controversial' highlights active debates, and 'expert_first'
   * prioritizes verified expert opinions. This flexibility lets users navigate
   * discussions in the way that best serves their needs.
   *
   * @param billId - ID of the bill
   * @param options - Query options for sorting, filtering, and pagination
   * @returns Array of comments matching the criteria
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
      const params = new URLSearchParams();
      params.append('sort', sort);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      if (expertOnly) params.append('expert', 'true');
      if (!includeReplies) params.append('include_replies', 'false');
      if (minVotes !== undefined) params.append('min_votes', minVotes.toString());

      const response = await globalApiClient.get<Comment[]>(
        `${this.baseUrl}/community/comments/${billId}?${params.toString()}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.commentsCacheTTL
        }
      );

      const comments = response.data;

      logger.info('Bill comments loaded', {
        component: 'CommunityApiService',
        billId,
        count: comments.length,
        sort,
        expertOnly
      });

      return comments;
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
   *
   * This is a critical user-facing operation that must feel instantaneous.
   * We use a shorter timeout than normal reads and skip all caching to ensure
   * the comment appears immediately when the user refreshes or re-queries.
   *
   * In a production system, this would trigger real-time updates via WebSocket
   * to other users viewing the same discussion, and would invalidate the
   * comments cache for this bill.
   *
   * @param data - Comment content and metadata
   * @returns Created comment object with ID and timestamp
   */
  async addComment(data: CommentCreateData): Promise<Comment> {
    try {
      const response = await globalApiClient.post<Comment>(
        `${this.baseUrl}/community/comments`,
        {
          bill_id: data.billId,
          content: data.content,
          parent_id: data.parentId,
          mentions: data.mentions,
          attachments: data.attachments
        },
        {
          timeout: 8000, // Slightly shorter timeout for better UX
          skipCache: true
        }
      );

      const comment = response.data;

      logger.info('Comment created successfully', {
        component: 'CommunityApiService',
        billId: data.billId,
        commentId: (comment as any).id,
        isReply: !!data.parentId,
        hasMentions: (data.mentions?.length || 0) > 0
      });

      return comment;
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
   *
   * Users can edit their comments to fix typos or clarify their position.
   * The backend should track edit history and display an "edited" indicator
   * to maintain transparency in discussions. Like comment creation, this
   * operation must feel instant to provide good UX.
   *
   * @param commentId - ID of the comment to update
   * @param content - New comment content
   * @returns Updated comment object
   */
  async updateComment(commentId: string, content: string): Promise<Comment> {
    try {
      const response = await globalApiClient.put<Comment>(
        `${this.baseUrl}/community/comments/${commentId}`,
        { content },
        {
          timeout: 8000,
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
   * 
   * Note: In most community platforms, deletion is actually a soft delete that
   * hides the content but preserves the comment structure to maintain reply
   * chains. The backend should handle this appropriately.
   * 
   * @param commentId - ID of the comment to delete
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      await globalApiClient.delete(
        `${this.baseUrl}/community/comments/${commentId}`,
        { 
          timeout: this.defaultTimeout,
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
   *
   * CRITICAL: Voting must implement graceful degradation. If the voting
   * service is temporarily unavailable, it should not prevent users from
   * reading and writing comments. We use a very short timeout here and
   * catch errors without throwing them, logging them as warnings instead.
   *
   * This method returns null on failure instead of throwing, allowing the
   * calling code to handle voting failures gracefully (perhaps showing a
   * temporary error message while still allowing other interactions).
   *
   * @param commentId - ID of the comment to vote on
   * @param voteType - Direction of the vote
   * @returns Updated vote counts or null on failure
   */
  async voteComment(commentId: string, voteType: 'up' | 'down'): Promise<VoteResponse | null> {
    try {
      const response = await globalApiClient.post<VoteResponse>(
        `${this.baseUrl}/community/comments/${commentId}/vote`,
        { type: voteType },
        {
          timeout: 3000, // Very short timeout - voting shouldn't block UI
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
      // Graceful degradation - voting failures shouldn't break the app
      logger.warn('Vote recording failed (non-blocking)', {
        component: 'CommunityApiService',
        commentId,
        voteType,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return null instead of throwing to allow calling code to handle gracefully
      return null;
    }
  }

  /**
   * Removes a user's vote from a comment.
   *
   * Like voting, unvoting implements graceful degradation and won't throw
   * errors that could disrupt the user experience.
   *
   * @param commentId - ID of the comment to unvote
   * @returns Updated vote counts or null on failure
   */
  async unvoteComment(commentId: string): Promise<VoteResponse | null> {
    try {
      const response = await globalApiClient.delete<VoteResponse>(
        `${this.baseUrl}/community/comments/${commentId}/vote`,
        {
          timeout: 3000,
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
   *
   * Content moderation is essential for maintaining healthy discussions, but
   * the reporting mechanism itself is not critical to the user's immediate
   * workflow. We implement this with standard error handling since users
   * should be informed if their report didn't go through.
   *
   * The detailed report structure helps moderators quickly assess and act
   * on reports, improving moderation efficiency and community safety.
   *
   * @param reportData - Structured report information
   * @returns Confirmation with report ID for tracking
   */
  async reportComment(reportData: CommentReportData): Promise<ReportResponse> {
    const { commentId, violationType, reason, description, evidence } = reportData;

    try {
      const response = await globalApiClient.post<ReportResponse>(
        `${this.baseUrl}/community/comments/${commentId}/flag`,
        {
          flagType: violationType,
          reason,
          description,
          evidence
        },
        {
          timeout: this.defaultTimeout,
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
   *
   * Expert verification data changes very rarely (only when credentials are
   * updated or verification status changes), so we use the longest cache TTL
   * of any community endpoint. This reduces load on the verification system
   * while ensuring expert badges display reliably.
   *
   * @param userId - ID of the user to check expert status for
   * @returns Expert verification details and credentials
   */
  async getExpertVerification(userId: string): Promise<ExpertVerificationResponse> {
    try {
      const response = await globalApiClient.get<ExpertVerificationResponse>(
        `${this.baseUrl}/experts/${userId}/verification`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.expertVerifyCacheTTL
        }
      );

      logger.info('Expert verification loaded', {
        component: 'CommunityApiService',
        userId,
        isVerified: response.data.verified,
        expertise: response.data.expertise_areas.length
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
   *
   * Expert insights are high-value content that's professionally curated
   * and reviewed. Unlike regular comments, these are more stable and can
   * be cached longer. They represent deep analysis that helps users understand
   * complex legislation from authoritative sources.
   *
   * @param billId - ID of the bill to get insights for
   * @returns Array of expert insights with author details
   */
  async getExpertInsights(billId: number): Promise<ExpertInsight[]> {
    try {
      const response = await globalApiClient.get<ExpertInsight[]>(
        `${this.baseUrl}/bills/${billId}/expert-insights`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.expertInsightsCacheTTL
        }
      );

      const insights = response.data;

      logger.info('Expert insights loaded', {
        component: 'CommunityApiService',
        billId,
        count: insights.length
      });

      return insights;
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
   *
   * This is a privileged operation typically restricted to verified experts.
   * The submission may go through an editorial review process before being
   * published, which the response should indicate.
   *
   * @param insight - Complete insight data including analysis and citations
   * @returns Created insight object with publication status
   */
  async submitExpertInsight(insight: any): Promise<ExpertInsightSubmissionResponse> {
    try {
      const response = await globalApiClient.post<ExpertInsightSubmissionResponse>(
        `${this.baseUrl}/expert-insights`,
        insight,
        {
          timeout: 15000, // Longer timeout for potentially large insight content
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
   *
   * The activity feed is a discovery mechanism that helps users find interesting
   * discussions and trending topics. It aggregates various types of community
   * activity into a unified stream. The caching here balances freshness (users
   * want to see recent activity) with performance (the feed is expensive to
   * generate because it queries multiple data sources).
   *
   * The geographic filtering is particularly powerful for users who want to
   * focus on legislation affecting their local area, creating a sense of
   * relevant, personalized community around shared geographic interests.
   *
   * @param options - Comprehensive filtering and pagination options
   * @returns Array of activity items with author and content details
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
        `${this.baseUrl}/community/activity?${params.toString()}`,
        {
          timeout: 12000, // Slightly longer timeout for feed aggregation
          cacheTTL: this.activityCacheTTL
        }
      );

      const activities = response.data;

      logger.info('Activity feed loaded', {
        component: 'CommunityApiService',
        count: activities.length,
        timeRange,
        hasGeography: !!geography,
        followedOnly
      });

      return activities;
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
   *
   * Trending topics are algorithmically determined based on comment velocity,
   * vote activity, and user engagement. They help surface the most active
   * and interesting discussions happening right now. The moderate cache TTL
   * reflects that trends change gradually over hours, not instantly.
   *
   * @param limit - Number of trending topics to return
   * @returns Array of trending topics with engagement metrics
   */
  async getTrendingTopics(limit: number = 10): Promise<TrendingTopic[]> {
    try {
      const response = await globalApiClient.get<TrendingTopic[]>(
        `${this.baseUrl}/community/trending?limit=${limit}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.trendingCacheTTL
        }
      );

      const topics = response.data;

      logger.info('Trending topics loaded', {
        component: 'CommunityApiService',
        count: topics.length
      });

      return topics;
    } catch (error) {
      // Trending topics are nice-to-have, so we implement graceful degradation
      logger.warn('Failed to fetch trending topics (non-blocking)', {
        component: 'CommunityApiService',
        error: error instanceof Error ? error.message : String(error)
      });

      // Return empty array instead of throwing to allow calling code to continue
      return [];
    }
  }

  /**
   * Retrieves aggregate community participation statistics.
   *
   * These stats power dashboards and give users a sense of the community's
   * size and activity level. Since these are aggregates that don't need to
   * be perfectly real-time, we use a longer cache to reduce database load
   * from expensive counting queries.
   *
   * @returns Community-wide statistics and metrics
   */
  async getCommunityStats(): Promise<CommunityStats> {
    try {
      const response = await globalApiClient.get<CommunityStats>(
        `${this.baseUrl}/community/participation/stats`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.statsCacheTTL
        }
      );

      logger.info('Community stats loaded', {
        component: 'CommunityApiService',
        totalMembers: response.data.totalMembers,
        activeToday: response.data.activeToday
      });

      return response.data;
    } catch (error) {
      // Stats are informational, not critical
      logger.warn('Failed to fetch community stats (non-blocking)', {
        component: 'CommunityApiService',
        error: error instanceof Error ? error.message : String(error)
      });

      // Return empty object to allow calling code to handle gracefully
      return {} as CommunityStats;
    }
  }

  // ==========================================================================
  // Local Impact and Geographic Features
  // ==========================================================================

  /**
   * Fetches local impact metrics for specific geographic areas.
   *
   * This powerful feature helps users understand how legislation affects their
   * specific community. By providing metrics at the state, district, and county
   * level, users can see which bills have the most relevance to their area and
   * how their neighbors are engaging with those bills.
   *
   * This creates a sense of local civic community within the broader national
   * platform, making the experience feel more personally relevant and increasing
   * engagement with local representatives and legislation.
   *
   * @param location - Geographic filters (state, district, county)
   * @returns Local impact metrics and bill relevance scores
   */
  async getLocalImpactMetrics(location: LocationFilter): Promise<LocalImpactMetrics> {
    try {
      const params = new URLSearchParams();

      if (location.state) params.append('state', location.state);
      if (location.district) params.append('district', location.district);
      if (location.county) params.append('county', location.county);
      if (location.zipCode) params.append('zip', location.zipCode);

      const response = await globalApiClient.get<LocalImpactMetrics>(
        `${this.baseUrl}/community/local-impact?${params.toString()}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.statsCacheTTL // Same as community stats
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
   * Creates a new discussion thread for a bill.
   *
   * @param data - Thread creation data
   * @returns Created thread object
   */
  async createThread(data: { billId: number; title: string; description?: string }): Promise<DiscussionThread> {
    try {
      const response = await globalApiClient.post<DiscussionThread>(
        `${this.baseUrl}/community/threads`,
        {
          bill_id: data.billId,
          title: data.title,
          description: data.description
        },
        {
          timeout: this.defaultTimeout,
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
   * Updates an existing discussion thread.
   *
   * @param threadId - ID of the thread to update
   * @param updates - Thread update data
   * @returns Updated thread object
   */
  async updateThread(threadId: string, updates: { title?: string; description?: string }): Promise<DiscussionThread> {
    try {
      const response = await globalApiClient.put<DiscussionThread>(
        `${this.baseUrl}/community/threads/${threadId}`,
        updates,
        {
          timeout: this.defaultTimeout,
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
   * Deletes a discussion thread.
   *
   * @param threadId - ID of the thread to delete
   */
  async deleteThread(threadId: string): Promise<void> {
    try {
      await globalApiClient.delete(
        `${this.baseUrl}/community/threads/${threadId}`,
        {
          timeout: this.defaultTimeout,
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

  /**
   * Retrieves a specific thread by ID.
   *
   * @param threadId - ID of the thread to retrieve
   * @returns Thread object with metadata
   */
  async getThread(threadId: string): Promise<DiscussionThread | null> {
    try {
      const response = await globalApiClient.get<DiscussionThread>(
        `${this.baseUrl}/community/threads/${threadId}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.discussionCacheTTL
        }
      );

      logger.info('Thread loaded', {
        component: 'CommunityApiService',
        threadId
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch thread', {
        component: 'CommunityApiService',
        threadId,
        error
      });
      // Return null instead of throwing for graceful degradation
      return null;
    }
  }

  /**
   * Retrieves all threads for a bill.
   *
   * @param billId - ID of the bill
   * @returns Array of thread objects
   */
  async getBillThreads(billId: number): Promise<DiscussionThread[]> {
    try {
      const response = await globalApiClient.get<DiscussionThread[]>(
        `${this.baseUrl}/community/threads?bill_id=${billId}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.discussionCacheTTL
        }
      );

      logger.info('Bill threads loaded', {
        component: 'CommunityApiService',
        billId,
        count: response.data.length
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

  // ==========================================================================
  // Search and Discovery
  // ==========================================================================

  /**
   * Searches community content (comments, threads, insights).
   *
   * @param query - Search query string
   * @param options - Search filtering options
   * @returns Array of search results
   */
  async searchCommunity(query: string, options: {
    contentTypes?: Array<'comment' | 'thread' | 'insight'>;
    billId?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
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

      const response = await globalApiClient.get<any[]>(
        `${this.baseUrl}/community/search?${params.toString()}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: 2 * 60 * 1000 // 2 minutes cache for search results
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
   * @param error - Original error object from the API call
   * @param operation - Name of the operation that failed
   * @param context - Additional context for debugging
   * @returns Enriched error object ready to be thrown or handled
   */
  private async handleError(
    error: any,
    operation: string,
    context?: Record<string, any>
  ): Promise<Error> {
    await globalErrorHandler.handleError(error as Error, {
      component: 'CommunityApiService',
      operation,
      ...context
    });
    return error as Error;
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
 */
export const communityApiService = new CommunityApiService();