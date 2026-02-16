/**
 * Community Base Types - Single Source of Truth
 *
 * Core types for community features including discussions, comments, votes,
 * and expert insights. This is the primary location for all community-related
 * types to prevent duplication and inconsistency.
 *
 * @module shared/types/community/community-base
 */

// ============================================================================
// Discussion Thread Types
// ============================================================================

/**
 * A discussion thread about a specific bill or topic
 *
 * @example
 * const thread: DiscussionThread = {
 *   id: 1,
 *   billId: 123,
 *   title: 'Healthcare Reform Discussion',
 *   createdAt: '2026-01-13T10:00:00Z',
 *   updatedAt: '2026-01-13T15:30:00Z',
 *   participantCount: 45,
 *   messageCount: 238,
 *   pinned: true
 * };
 */
export interface DiscussionThread {
  readonly id: number;
  readonly billId: number;
  readonly title: string;
  readonly description?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastActivity?: string;
  readonly participantCount?: number;
  readonly participants?: number;
  readonly messageCount: number;
  readonly viewCount?: number;
  readonly pinned: boolean;
  readonly locked: boolean;
  readonly tags?: ReadonlyArray<string>;
  readonly category?: string;
  readonly ownerId?: number;
}

/**
 * Metadata about a discussion thread without full content
 */
export interface DiscussionThreadMetadata {
  readonly id: number;
  readonly billId: number;
  readonly title: string;
  readonly participantCount?: number;
  readonly participants?: number;
  readonly messageCount?: number;
  readonly comment_count?: number;
  readonly lastActivityTime?: string;
  readonly isActive?: boolean;
  readonly expertReplyCount?: number;
}

/**
 * Participant in a discussion thread
 */
export interface ThreadParticipant {
  readonly userId: number;
  readonly username: string;
  readonly isExpert: boolean;
  readonly joinedAt: string;
  readonly messageCount: number;
}

// ============================================================================
// Comment Types
// ============================================================================

/**
 * Vote counts for a comment
 */
export interface CommentVotes {
  readonly up: number;
  readonly down: number;
  readonly userVote?: 'up' | 'down' | null;
}

/**
 * Request to create a new comment
 */
export interface CreateCommentRequest {
  readonly billId: number;
  readonly threadId?: number;
  readonly content: string;
  readonly parentId?: number;
  readonly attachments?: string[];
  readonly mentions?: number[];
}

/**
 * Request to update a comment
 */
export interface UpdateCommentRequest {
  readonly content: string;
  readonly attachments?: string[];
  readonly mentions?: number[];
}

/**
 * Request to create a new discussion thread
 */
export interface CreateThreadRequest {
  readonly billId: number;
  readonly title: string;
  readonly description?: string;
}

/**
 * Request to update a discussion thread
 */
export interface UpdateThreadRequest {
  readonly title?: string;
  readonly description?: string;
}

/**
 * Request to share content
 */
export interface ShareRequest {
  readonly platform: string;
  readonly url: string;
  readonly title: string;
  readonly description?: string;
}

/**
 * Request to report/flag a comment
 */
export interface CommentReportData {
  readonly commentId: number;
  readonly reason: 'spam' | 'offensive' | 'misinformation' | 'harassment' | 'other';
  readonly details?: string;
  readonly violationType?: string;
  readonly description?: string;
  readonly evidence?: string;
}

// ============================================================================
// Vote Types
// ============================================================================

/**
 * A vote on a bill or comment
 */
export interface Vote {
  readonly id: number;
  readonly billId?: number;
  readonly commentId?: number;
  readonly userId: number;
  readonly voteType: VoteType;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export type VoteType = 'yea' | 'nay' | 'abstain' | 'undecided';

/**
 * Response after submitting a vote
 */
export interface VoteResponse {
  readonly success: boolean;
  readonly updated: boolean;
  readonly previousVote?: VoteType;
  readonly currentVote: VoteType;
  readonly timestamp: string;
  readonly score?: number;
}

/**
 * Vote request
 */
export interface VoteRequest {
  readonly billId?: number;
  readonly commentId?: number;
  readonly voteType: VoteType;
}

// ============================================================================
// Expert Types
// ============================================================================

/**
 * An expert user with verified credentials
 *
 * @example
 * const expert: Expert = {
 *   id: 789,
 *   userId: 789,
 *   name: 'Dr. Jane Smith',
 *   domain: 'healthcare',
 *   credentials: ['MD', 'Public Health'],
 *   verifiedAt: '2025-06-01T00:00:00Z'
 * };
 */
export interface Expert {
  readonly id: string | number;
  readonly userId?: number;
  readonly name: string;
  readonly avatar?: string;
  readonly domain?: ExpertDomain;
  readonly credentials: ExpertCredential[];
  readonly bio?: string;
  readonly affiliations?: ExpertAffiliation[];
  readonly specializations?: string[];
  readonly verifiedAt?: string;
  readonly verificationLevel?: 'pending' | 'verified' | 'revoked';
  readonly verificationType?: 'official' | 'domain' | 'identity';
  readonly verified?: boolean;
  readonly verificationDate?: string;
  readonly insightCount?: number;
  readonly credibilityScore?: number;
  readonly contributionCount?: number;
  readonly avgCommunityRating?: number;
  readonly contactInfo?: {
    email?: string;
    website?: string;
    linkedin?: string;
  };
}

export type ExpertDomain =
  | 'healthcare'
  | 'education'
  | 'environment'
  | 'economy'
  | 'infrastructure'
  | 'security'
  | 'technology'
  | 'legal'
  | 'science'
  | 'other';

/**
 * Expert credential verification
 */
export interface ExpertCredential {
  readonly id: string | number;
  readonly expertId?: number;
  readonly credential?: string;
  readonly issuingOrganization?: string;
  readonly issueDate?: string;
  readonly expiryDate?: string;
  readonly verified: boolean;
  readonly type?: 'education' | 'certification' | 'experience' | 'publication' | string;
  readonly title?: string;
  readonly institution?: string;
  readonly year?: number;
  readonly verificationDate?: string;
  readonly verificationSource?: string;
}

/**
 * Expert affiliation with an organization
 */
export interface ExpertAffiliation {
  readonly id: string | number;
  readonly expertId?: number;
  readonly organization: string;
  readonly role: string;
  readonly type: 'academic' | 'government' | 'nonprofit' | 'corporate' | 'independent' | 'ngo' | 'private' | 'judicial';
  readonly startDate?: string;
  readonly endDate?: string;
  readonly verified: boolean;
  readonly current?: boolean;
}

/**
 * Expert contribution to a bill or discussion
 */
export interface ExpertContribution {
  readonly id: string | number;
  readonly expertId: string | number;
  readonly billId?: string | number;
  readonly type: 'analysis' | 'insight' | 'review' | 'testimony' | 'comment' | 'amendment_suggestion';
  readonly title?: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly lastUpdated?: string;
  readonly upvotes?: number;
  readonly downvotes?: number;
  readonly verified?: boolean;
  readonly confidence?: number;
  readonly methodology?: string;
  readonly sources?: string[];
  readonly tags?: string[];
  readonly communityValidation?: CommunityValidation;
  readonly status?: 'published' | 'under_review' | 'draft' | 'disputed';
}

/**
 * Expert consensus on a bill or topic
 */
export interface ExpertConsensus {
  readonly id?: string;
  readonly billId: string;
  readonly topic: string;
  readonly totalExperts: number;
  readonly agreementLevel: number;
  readonly majorityPosition?: string;
  readonly minorityPositions?: ReadonlyArray<{
    readonly position: string;
    readonly expertCount: number;
    readonly experts: ReadonlyArray<string>;
  }>;
  readonly positions?: ReadonlyArray<{
    readonly stance: string;
    readonly count: number;
    readonly percentage: number;
  }>;
  readonly keyPoints?: ReadonlyArray<string>;
  readonly controversyLevel?: 'low' | 'medium' | 'high';
  readonly lastUpdated: string;
}

/**
 * Credibility metrics for an expert
 */
export interface CredibilityMetrics {
  readonly expertId?: string;
  readonly overallScore: number;
  readonly factualAccuracy?: number;
  readonly sourceQuality?: number;
  readonly peerEndorsements?: number;
  readonly communityTrust?: number;
  readonly verificationLevel?: 'basic' | 'verified' | 'distinguished';
  readonly components?: {
    credentialScore: number;
    affiliationScore: number;
    communityScore: number;
    contributionQuality: number;
    consensusAlignment: number;
  };
  readonly methodology?: {
    description: string;
    factors: Array<{
      name: string;
      weight: number;
      description: string;
    }>;
  };
  readonly lastCalculated: string;
}

/**
 * Community validation of expert content
 */
export interface CommunityValidation {
  readonly id: string | number;
  readonly contentId: string | number;
  readonly contentType: 'insight' | 'contribution' | 'analysis';
  readonly upvotes: number;
  readonly downvotes: number;
  readonly validationScore: number;
  readonly flagCount: number;
  readonly lastUpdated: string;
  readonly userVote?: 'up' | 'down' | null;
  readonly comments?: number;
}

/**
 * Verification workflow for expert contributions
 */
export interface VerificationWorkflow {
  readonly id: string | number;
  readonly contributionId: string | number;
  readonly expertId?: string | number;
  readonly status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';
  readonly reviewerId?: number;
  readonly submittedAt: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly reviewedAt?: string;
  readonly feedback?: ReadonlyArray<string>;
  readonly communityFeedback?: Array<{
    userId: string;
    feedback: string;
    vote: 'approve' | 'reject' | 'needs_revision';
    timestamp: string;
  }>;
  readonly currentStep: number;
  readonly totalSteps: number;
}

/**
 * Expert verification type enumeration
 */
export type ExpertVerificationType = 'official' | 'domain' | 'identity' | 'academic' | 'professional' | 'government' | 'independent';

/**
 * Contribution type enumeration
 */
export type ContributionType = 'analysis' | 'insight' | 'review' | 'testimony' | 'comment';

/**
 * Expert verification response
 */
export interface ExpertVerificationResponse {
  readonly expertId: number;
  readonly verified: boolean;
  readonly domain: ExpertDomain;
  readonly credentialCount: number;
  readonly lastVerifiedAt: string;
  readonly badges?: string[];
  readonly expertise_areas?: string[];
}

/**
 * Expert insight submission
 */
export interface ExpertInsight {
  readonly id: number | string;
  readonly billId: number | string;
  readonly expertId: number | string;
  readonly expertName?: string;
  readonly expertAvatar?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly lastUpdated?: string;
  readonly published: boolean;
  readonly reviewStatus: 'pending' | 'approved' | 'rejected';
  readonly upvoteCount?: number;
  readonly downvoteCount?: number;
  readonly confidence?: number;
  readonly timestamp?: string;
  readonly billTitle?: string;
  readonly communityValidation?: {
    readonly validationScore: number;
    readonly upvotes: number;
    readonly downvotes: number;
  };
  readonly comments?: number;
  readonly shares?: number;
  readonly specializations?: string[];
  readonly methodology?: string;
  readonly sources?: string[];
  readonly policyAreas?: string[];
}

/**
 * Request to submit an expert insight
 */
export interface ExpertInsightSubmission {
  readonly billId: number;
  readonly content: string;
  readonly references?: string[];
  readonly attachments?: string[];
}

/**
 * Response for expert insight submission
 */
export interface ExpertInsightSubmissionResponse {
  readonly id?: number;
  readonly insightId: number;
  readonly billId: number;
  readonly status: 'pending' | 'approved' | 'rejected';
  readonly submittedAt: string;
  readonly expectedReviewTime?: string;
}

// ============================================================================
// Activity & Engagement Types
// ============================================================================

/**
 * An activity item in the community feed
 */
export interface ActivityItem {
  readonly id: string;
  readonly type: ActivityType;
  readonly userId: number | string;
  readonly userName?: string;
  readonly userAvatar?: string;
  readonly billId?: number | string;
  readonly billTitle?: string;
  readonly threadId?: number | string;
  readonly commentId?: number | string;
  readonly timestamp: string;
  readonly title?: string;
  readonly content?: string;
  readonly summary?: string;
  readonly location?: LocationFilter;
  readonly trendingScore?: number;
  readonly userHasLiked?: boolean;
  readonly likes?: number;
  readonly replies?: number;
  readonly shares?: number;
  readonly expertInfo?: {
    readonly isVerified: boolean;
    readonly specialty?: string;
    readonly credibilityScore?: number;
  };
  readonly metadata?: Record<string, unknown>;
}

export type ActivityType =
  | 'comment_posted'
  | 'comment_liked'
  | 'comment_replied'
  | 'thread_created'
  | 'thread_pinned'
  | 'expert_insight_posted'
  | 'vote_cast'
  | 'topic_trending'
  | 'user_followed'
  | 'achievement_unlocked'
  | 'comment'
  | 'discussion'
  | 'expert_contribution'
  | 'bill_save'
  | 'bill_share'
  | 'campaign_join'
  | 'petition_sign';
export type TopicCategory =
  | 'healthcare'
  | 'education'
  | 'environment'
  | 'economy'
  | 'security'
  | 'infrastructure'
  | 'social'
  | 'other';

/**
 * Community statistics
 */
export interface CommunityStats {
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly totalComments: number;
  readonly totalThreads: number;
  readonly totalExperts: number;
  readonly averageCommentLength: number;
  readonly engagementRate: number;
}

/**
 * Local impact metrics for a bill
 */
export interface LocalImpactMetrics {
  readonly billId: number;
  readonly region?: string;
  readonly communityReach: number;
  readonly engagementLevel: 'low' | 'medium' | 'high' | 'very_high';
  readonly sentimentScore: number; // -1 to 1
  readonly topicsRaised: string[];
}

// ============================================================================
// Content Types
// ============================================================================

/**
 * Attachment to a comment or post
 */
export interface Attachment {
  readonly id?: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly url: string;
  readonly size: number;
  readonly uploadedAt?: string;
}

/**
 * Mention of another user
 */
export interface Mention {
  readonly userId: number;
  readonly username: string;
  readonly position: number;
}

/**
 * Contributor with activity metrics
 */
export interface Contributor {
  readonly userId: number;
  readonly username: string;
  readonly commentCount: number;
  readonly threadCount: number;
  readonly insightCount?: number;
  readonly followerCount: number;
  readonly joinedAt: string;
  readonly reputation?: number;
}

// ============================================================================
// Query & Filter Types
// ============================================================================

/**
 * Options for sorting comments
 */
export type CommentSortField =
  | 'newest'
  | 'oldest'
  | 'most_voted'
  | 'controversial'
  | 'expert_first'
  | 'most_replied';

/**
 * Query parameters for fetching comments
 */
export interface CommentQueryOptions {
  readonly sort?: CommentSortField;
  readonly expertOnly?: boolean;
  readonly parentId?: number;
  readonly includeReplies?: boolean;
  readonly page?: number;
  readonly limit?: number;
  readonly offset?: number;
  readonly minVotes?: number;
}

/**
 * Comments query parameters (extended form)
 */
export interface CommentsQueryParams extends CommentQueryOptions {
  readonly billId?: number;
  readonly threadId?: number;
}

/**
 * Form data for creating a comment
 */
export interface CommentFormData {
  readonly billId: number;
  readonly content: string;
  readonly parentId?: number;
}

/**
 * Options for activity feed filtering
 */
export interface ActivityFeedOptions {
  readonly activityTypes?: ActivityType[];
  readonly timeRange?: 'day' | 'week' | 'month' | 'all';
  readonly categoryFilter?: TopicCategory[];
  readonly includeFollowing?: boolean;
  readonly page?: number;
  readonly limit?: number;
  readonly offset?: number;
  readonly contentTypes?: string[];
  readonly geography?: LocationFilter;
  readonly followedOnly?: boolean;
}

/**
 * Location filter for local impact
 */
export interface LocationFilter {
  readonly region?: string;
  readonly state?: string;
  readonly county?: string;
  readonly district?: string;
  readonly zipCode?: string;
}

/**
 * Search options for community content
 */
export interface SearchOptions {
  readonly query: string;
  readonly searchType?: 'comments' | 'threads' | 'experts' | 'insights' | 'all';
  readonly filters?: Record<string, unknown>;
  readonly sortBy?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly offset?: number;
  readonly contentTypes?: string[];
  readonly billId?: number;
}

/**
 * Search result item for community content
 */
export interface SearchResult {
  readonly id: string | number;
  readonly type: 'comment' | 'thread' | 'expert' | 'insight' | 'bill';
  readonly title?: string;
  readonly content?: string;
  readonly author?: string;
  readonly createdAt?: string;
  readonly relevanceScore: number;
  readonly highlightedContent?: string;
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// Extended Types for API Responses
// ============================================================================

/**
 * Data for creating a comment
 */
export interface CommentCreateData {
  readonly billId: number;
  readonly content: string;
  readonly parentId?: number;
  readonly threadId?: number;
  readonly mentions?: number[];
  readonly attachments?: string[];
}

/**
 * Extended Community Statistics
 */
export interface ExtendedCommunityStats extends CommunityStats {
  readonly totalMembers: number;
  readonly activeToday: number;
  readonly activeThisWeek: number;
  readonly activeThisMonth: number;
  readonly averageEngagement: number;
  readonly topContributors?: Array<{
    readonly id: number;
    readonly name: string;
    readonly commentCount: number;
  }>;
}

/**
 * Extended Local Impact Metrics
 */
export interface ExtendedLocalImpactMetrics extends LocalImpactMetrics {
  readonly billsDiscussed: number;
  readonly localRepresentatives?: number;
  readonly communityEngagement: number;
  readonly recentActivity: number;
  readonly domainExperts?: number;
  readonly potentialImpact?: number;
}

/**
 * Insight Submission (alias for ExpertInsightSubmission)
 */
export type InsightSubmission = ExpertInsightSubmission;

// ============================================================================
// Event Types
// ============================================================================

/**
 * Community update event
 */
export interface CommunityUpdate {
  readonly type: CommunityUpdateType;
  readonly discussionId?: string;
  readonly commentId?: string;
  readonly threadId?: string;
  readonly userId?: number;
  readonly data: unknown;
  readonly timestamp: string;
}

export type CommunityUpdateType =
  | 'comment_posted'
  | 'comment_updated'
  | 'comment_deleted'
  | 'thread_created'
  | 'thread_updated'
  | 'vote_cast'
  | 'insight_posted'
  | 'expert_joined';

/**
 * Thread event for real-time updates
 */
export interface ThreadEvent {
  readonly eventId: string;
  readonly threadId: number;
  readonly eventType: 'comment_added' | 'thread_updated' | 'user_joined';
  readonly userId?: number;
  readonly timestamp: string;
  readonly payload?: Record<string, unknown>;
}

/**
 * User activity event
 */
export interface UserEvent {
  readonly eventId: string;
  readonly userId: number;
  readonly eventType: 'followed' | 'unfollowed' | 'muted' | 'blocked';
  readonly targetUserId?: number;
  readonly timestamp: string;
}

/**
 * Report/moderation event
 */
export interface ReportResponse {
  readonly id?: number;
  readonly reportId?: number;
  readonly contentId: number;
  readonly contentType: 'comment' | 'thread' | 'insight' | 'user';
  readonly reportedAt: string;
  readonly status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
  readonly moderatorNotes?: string;
}

/**
 * Search result item
 */
export interface CommunitySearchResult {
  readonly id: number;
  readonly type: 'comment' | 'thread' | 'expert' | 'insight';
  readonly title?: string;
  readonly content?: string;
  readonly author?: string;
  readonly createdAt?: string;
  readonly relevanceScore: number;
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a DiscussionThread
 */
export function isDiscussionThread(value: unknown): value is DiscussionThread {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.billId === 'number' &&
    typeof obj.title === 'string' &&
    typeof obj.pinned === 'boolean'
  );
}

/**
 * Check if a value is a Comment
 */
export function isComment(value: unknown): value is Comment {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.threadId === 'number' &&
    typeof obj.content === 'string' &&
    typeof obj.authorId === 'number' &&
    obj.votes !== undefined
  );
}


/**
 * Check if a value is an Expert
 */
export function isExpert(value: unknown): value is Expert {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.userId === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.domain === 'string' &&
    Array.isArray(obj.credentials)
  );
}

// ============================================================================
// Campaign & Petition Types
// ============================================================================

export interface Campaign {
  id: string;
  title: string;
  description: string;
  organizerId: string;
  startDate: string;
  endDate?: string;
  goal: number;
  currentProgress: number;
  status: 'active' | 'completed' | 'cancelled';
  tags: string[];
}

export interface Petition {
  id: string;
  title: string;
  summary: string;
  target: string;
  signatureCount: number;
  signatureGoal: number;
  deadline?: string;
  status: 'open' | 'closed' | 'submitted';
  creatorId: string;
  createdAt: string;
}
