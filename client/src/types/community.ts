/**
 * Community Hub and Activity Feed Types
 * 
 * Defines interfaces for community engagement, activity feeds,
 * trending algorithms, and local impact filtering.
 */

export interface ActivityItem {
  id: string;
  type: 'comment' | 'discussion' | 'expert_contribution' | 'bill_save' | 'bill_share' | 'campaign_join' | 'petition_sign';
  userId: string;
  userName: string;
  userAvatar?: string;
  expertInfo?: {
    verificationType: 'official' | 'domain' | 'identity';
    credibilityScore: number;
    specializations: string[];
  };
  
  // Content
  title: string;
  content?: string;
  summary?: string;
  
  // Related entities
  billId?: number;
  billTitle?: string;
  discussionId?: string;
  campaignId?: string;
  petitionId?: string;
  
  // Metadata
  timestamp: string;
  location?: {
    state?: string;
    district?: string;
    county?: string;
  };
  
  // Engagement metrics
  likes: number;
  replies: number;
  shares: number;
  userHasLiked?: boolean;
  
  // Trending metrics
  velocity: number; // Activity rate over time
  diversity: number; // Variety of user engagement
  substance: number; // Quality/depth score
  trendingScore: number; // Calculated trending score
}

export interface TrendingTopic {
  id: string;
  title: string;
  description: string;
  category: 'bill' | 'policy_area' | 'campaign' | 'general';
  
  // Related entities
  billIds: number[];
  policyAreas: string[];
  
  // Trending metrics
  activityCount: number;
  participantCount: number;
  expertCount: number;
  velocity: number;
  diversity: number;
  substance: number;
  trendingScore: number;
  
  // Time-based data
  hourlyActivity: number[];
  dailyActivity: number[];
  weeklyActivity: number[];
  
  // Geographic data
  geographicDistribution: Array<{
    state: string;
    count: number;
    percentage: number;
  }>;
  
  timestamp: string;
  lastUpdated: string;
}

export interface ExpertInsight {
  id: string;
  expertId: string;
  expertName: string;
  expertAvatar?: string;
  verificationType: 'official' | 'domain' | 'identity';
  credibilityScore: number;
  specializations: string[];
  
  // Content
  title: string;
  content: string;
  summary: string;
  confidence: number;
  methodology?: string;
  sources?: string[];
  
  // Related entities
  billId?: number;
  billTitle?: string;
  policyAreas: string[];
  
  // Engagement
  likes: number;
  comments: number;
  shares: number;
  communityValidation: {
    upvotes: number;
    downvotes: number;
    validationScore: number;
  };
  
  timestamp: string;
  lastUpdated: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  summary: string;
  type: 'advocacy' | 'petition' | 'awareness' | 'action';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  
  // Related entities
  billIds: number[];
  policyAreas: string[];
  
  // Organizer info
  organizerId: string;
  organizerName: string;
  organizerType: 'individual' | 'organization' | 'expert';
  
  // Goals and progress
  goal?: number;
  currentCount: number;
  progressPercentage: number;
  
  // Geographic targeting
  targetGeography?: {
    states?: string[];
    districts?: string[];
    counties?: string[];
  };
  
  // Engagement
  participantCount: number;
  shareCount: number;
  
  // Dates
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Petition {
  id: string;
  title: string;
  description: string;
  summary: string;
  
  // Related entities
  billIds: number[];
  policyAreas: string[];
  
  // Petition details
  targetOfficial?: string;
  targetOffice?: string;
  goal: number;
  currentSignatures: number;
  progressPercentage: number;
  
  // Creator info
  creatorId: string;
  creatorName: string;
  
  // Geographic data
  signaturesByLocation: Array<{
    state: string;
    count: number;
    percentage: number;
  }>;
  
  // Status
  status: 'active' | 'successful' | 'closed' | 'expired';
  
  // Dates
  createdAt: string;
  deadline?: string;
  updatedAt: string;
}

export interface CommunityFilters {
  contentTypes: Array<'comments' | 'discussions' | 'expert_insights' | 'campaigns' | 'petitions'>;
  policyAreas: string[];
  timeRange: 'hour' | 'day' | 'week' | 'month' | 'all';
  geography: {
    states: string[];
    districts: string[];
    counties: string[];
  };
  expertLevel: Array<'official' | 'domain' | 'identity' | 'community'>;
  sortBy: 'trending' | 'recent' | 'popular' | 'local_impact';
  showLocalOnly: boolean;
}

export interface TrendingAlgorithmConfig {
  velocityWeight: number; // How much recent activity matters
  diversityWeight: number; // How much variety in engagement matters
  substanceWeight: number; // How much quality/depth matters
  decayRate: number; // How quickly trending scores decay over time
  minimumActivity: number; // Minimum activity threshold for trending
  timeWindow: number; // Time window for calculating velocity (hours)
}

export interface LocalImpactMetrics {
  state?: string;
  district?: string;
  county?: string;
  
  // Activity metrics
  totalActivity: number;
  uniqueParticipants: number;
  expertParticipants: number;
  
  // Bill-specific metrics
  billsDiscussed: number;
  billsSaved: number;
  billsShared: number;
  
  // Engagement metrics
  campaignsActive: number;
  petitionsActive: number;
  averageEngagement: number;
  
  // Trending topics in this area
  topTopics: Array<{
    title: string;
    score: number;
    category: string;
  }>;
  
  lastUpdated: string;
}

export interface CommunityStats {
  totalMembers: number;
  activeToday: number;
  activeThisWeek: number;
  totalDiscussions: number;
  totalComments: number;
  expertContributions: number;
  activeCampaigns: number;
  activePetitions: number;
  lastUpdated: string;
}

export type ActivityType = 'comment' | 'discussion' | 'expert_contribution' | 'bill_save' | 'bill_share' | 'campaign_join' | 'petition_sign';
export type CampaignType = 'advocacy' | 'petition' | 'awareness' | 'action';
export type CampaignStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type PetitionStatus = 'active' | 'successful' | 'closed' | 'expired';
export type SortOption = 'trending' | 'recent' | 'popular' | 'local_impact';

// Additional types for community features
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
  editedAt?: string;

  // Voting system
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;

  // Threading
  replies: Comment[];
  replyCount: number;
  depth: number; // 0-4 (max 5 levels)

  // Moderation
  status: 'active' | 'hidden' | 'removed' | 'under_review';
  moderationFlags: ModerationFlag[];
  reportCount: number;

  // Quality metrics
  qualityScore: number; // 0-1 based on length, engagement, etc.
  isHighQuality: boolean;

  // Expert verification
  isExpertComment: boolean;
  expertVerification?: {
    type: 'official' | 'domain' | 'identity';
    credibilityScore: number;
  };
}

export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'link';
  url: string;
  filename: string;
  size?: number;
  mimeType?: string;
}

export interface Mention {
  id: string;
  user_id: string;
  username: string;
  start: number;
  end: number;
}

export interface DiscussionThread {
  id: string;
  billId: number;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;

  // Comments and engagement
  comments: Comment[];
  totalComments: number;
  participantCount: number;

  // Moderation
  isLocked: boolean;
  lockReason?: string;
  lockedBy?: string;
  lockedAt?: string;

  // Quality metrics
  engagementScore: number;
  qualityScore: number;
  expertParticipation: number; // Percentage of comments from experts

  // Real-time updates
  lastActivity: string;
  activeUsers: string[]; // Currently viewing/typing users
}

export interface ThreadParticipant {
  user_id: string;
  username: string;
  avatar?: string;
  joinedAt: string;
  last_seen_at: string;
  postCount: number;
}

export interface SocialShare {
  id: string;
  bill_id?: string;
  threadId?: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email';
  url: string;
  title: string;
  description?: string;
  sharedBy: string;
  shared_at: string;
  clickCount: number;
}

export interface Contributor {
  user_id: string;
  username: string;
  avatar?: string;
  comment_count: number;
  threadCount: number;
  reputation: number;
  badge?: string;
}

// API request/response types
export interface CreateCommentRequest {
  content: string;
  bill_id?: string;
  parent_id?: string;
  attachments?: File[];
}

export interface CreateThreadRequest {
  title: string;
  content: string;
  bill_id?: string;
  tags: string[];
  isSticky?: boolean;
}

export interface UpdateCommentRequest {
  content: string;
  attachments?: File[];
}

export interface VoteRequest {
  comment_id: string;
  vote: 'up' | 'down' | null;
}

export interface ShareRequest {
  bill_id?: string;
  threadId?: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email';
  message?: string;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  hasMore: boolean;
}

export interface ThreadsResponse {
  threads: DiscussionThread[];
  total: number;
  hasMore: boolean;
}

// Real-time event types
export interface CommentEvent {
  type: 'comment_created' | 'comment_updated' | 'comment_deleted' | 'vote_changed';
  comment_id: string;
  bill_id?: string;
  data: any;
}

export interface ThreadEvent {
  type: 'thread_created' | 'thread_updated' | 'thread_locked' | 'thread_unlocked';
  threadId: string;
  bill_id?: string;
  data: any;
}

export interface UserEvent {
  type: 'user_joined' | 'user_left' | 'user_typing';
  user_id: string;
  threadId?: string;
  data: any;
}

// Discussion and moderation types
export interface CommentFormData {
  content: string;
  parentId?: string;
  billId: number;
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
    quality?: string;
  };
}

export interface ModerationFlag {
  id: string;
  commentId: string;
  reporterId: string;
  type: ModerationViolationType;
  reason: string;
  description?: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'upheld';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
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

export interface ModerationAction {
  id: string;
  commentId: string;
  moderatorId: string;
  action: 'hide' | 'remove' | 'restore' | 'warn' | 'ban_user';
  reason: string;
  description?: string;
  createdAt: string;
  appealable: boolean;
  appealDeadline?: string;
}

export interface CommentReport {
  id: string;
  commentId: string;
  reporterId: string;
  violationType: ModerationViolationType;
  reason: string;
  description?: string;
  createdAt: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
}

export interface ModerationStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  averageResolutionTime: number; // in hours
  topViolationTypes: Array<{
    type: ModerationViolationType;
    count: number;
  }>;
  moderationActions: Array<{
    action: string;
    count: number;
  }>;
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

// Real-time events for WebSocket integration
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

// Quality assessment types
export interface CommentQualityMetrics {
  length: number;
  readabilityScore: number;
  sentimentScore: number;
  hasLinks: boolean;
  hasCitations: boolean;
  engagementRatio: number; // upvotes / (upvotes + downvotes)
  responseRate: number; // replies / views
}

export interface QualityThresholds {
  minLength: number;
  maxLength: number;
  minReadabilityScore: number;
  minSentimentScore: number;
  spamKeywords: string[];
  requiredElements?: string[]; // For expert comments
}

// Appeal system types
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
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  resolutionNotes?: string;
}

export type CommentSortOption = 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
export type CommentFilterOption = 'all' | 'expert_only' | 'high_quality' | 'recent';

// Runtime type guards for API response validation
export function isActivityItem(obj: any): obj is ActivityItem {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    ['comment', 'discussion', 'expert_contribution', 'bill_save', 'bill_share', 'campaign_join', 'petition_sign'].includes(obj.type) &&
    typeof obj.userId === 'string' &&
    typeof obj.userName === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.timestamp === 'string' &&
    typeof obj.likes === 'number' &&
    typeof obj.replies === 'number' &&
    typeof obj.shares === 'number';
}

export function isComment(obj: any): obj is Comment {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.authorId === 'string' &&
    typeof obj.authorName === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.upvotes === 'number' &&
    typeof obj.downvotes === 'number' &&
    Array.isArray(obj.replies) &&
    typeof obj.replyCount === 'number' &&
    typeof obj.depth === 'number';
}

export function isCommunityStats(obj: any): obj is CommunityStats {
  return obj &&
    typeof obj.totalMembers === 'number' &&
    typeof obj.activeToday === 'number' &&
    typeof obj.activeThisWeek === 'number' &&
    typeof obj.totalDiscussions === 'number' &&
    typeof obj.totalComments === 'number' &&
    typeof obj.expertContributions === 'number' &&
    typeof obj.activeCampaigns === 'number' &&
    typeof obj.activePetitions === 'number' &&
    typeof obj.lastUpdated === 'string';
}

export function isActivityItemArray(obj: any): obj is ActivityItem[] {
  return Array.isArray(obj) && obj.every(isActivityItem);
}

export function isCommentArray(obj: any): obj is Comment[] {
  return Array.isArray(obj) && obj.every(isComment);
}

// Error type definitions
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface ValidationError extends ApiError {
  code: 'VALIDATION_ERROR';
  field: string;
  value: any;
}

export interface NetworkError extends ApiError {
  code: 'NETWORK_ERROR';
  statusCode?: number;
  url?: string;
}

export interface AuthenticationError extends ApiError {
  code: 'AUTHENTICATION_ERROR';
  requiredRole?: string;
}

export interface CommunityApiError extends ApiError {
  code: 'COMMUNITY_API_ERROR';
  operation: string;
  billId?: number;
  commentId?: string;
}

export type CommunityError = ValidationError | NetworkError | AuthenticationError | CommunityApiError;

// Error type guards
export function isApiError(obj: any): obj is ApiError {
  return obj &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.timestamp === 'string';
}

export function isValidationError(obj: any): obj is ValidationError {
  return isApiError(obj) && obj.code === 'VALIDATION_ERROR' && 'field' in obj && typeof obj.field === 'string';
}

export function isNetworkError(obj: any): obj is NetworkError {
  return isApiError(obj) && obj.code === 'NETWORK_ERROR';
}

export function isAuthenticationError(obj: any): obj is AuthenticationError {
  return isApiError(obj) && obj.code === 'AUTHENTICATION_ERROR';
}

export function isCommunityApiError(obj: any): obj is CommunityApiError {
  return isApiError(obj) && obj.code === 'COMMUNITY_API_ERROR';
}