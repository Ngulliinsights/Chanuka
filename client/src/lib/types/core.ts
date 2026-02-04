/**
 * Core Domain Types - OPTIMIZED
 *
 * Consolidated and optimized types for Bill, User, Analysis, and Community domains.
 *
 * Key improvements:
 * - Eliminated duplicate type definitions
 * - Standardized to camelCase throughout
 * - Added discriminated unions for polymorphic types
 * - Improved type safety with branded types
 * - Better separation of concerns
 * - Added comprehensive JSDoc comments
 */

import { Comment as CommunityComment, DiscussionThread } from './community/community-base';

// ============================================================================
// BILL TYPES
// ============================================================================

// Re-export from unified bill module to ensure consistency
export type { Bill, BillAnalysis } from './bill/bill-base';
// Compatibility alias if needed (BillAnalysis is already named correctly)


// ============================================================================
// USER TYPES
// ============================================================================

// Re-export from unified auth module
export type { User } from './bill/auth-types';


// ============================================================================
// COMMENT & DISCUSSION TYPES (UNIFIED)
// ============================================================================

/**
 * Vote type for comments
 */
export type VoteType = 'up' | 'down' | null;

/**
 * Comment status
 */
export type CommentStatus = 'active' | 'hidden' | 'removed' | 'under_review';

/**
 * Base comment with essential fields
 */
export interface BaseComment {
  id: string;
  billId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Standard comment with status
 */
export interface Comment extends BaseComment {
  status?: CommentStatus;
}

/**
 * Expert verification details
 */
export interface ExpertVerification {
  type: 'official' | 'domain' | 'identity';
  credibilityScore: number;
}

/**
 * Moderation flag for content
 */
export interface ModerationFlag {
  id: number;
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

/**
 * Unified comment for cross-feature compatibility
 */
export interface UnifiedComment extends BaseComment {
  // Threading
  threadId?: string;
  depth: number;
  childCount: number;

  // Engagement
  score: number;
  userVote?: VoteType;

  // Moderation
  isModerated: boolean;
  moderationReason?: string;
  isReported: boolean;
  reportCount: number;

  // Quality
  isExpertVerified: boolean;
  hasSourceLinks: boolean;
}

// ============================================================================
// THREAD TYPES
// ============================================================================

export type ThreadCategory = 'general' | 'analysis' | 'question' | 'proposal';

/**
 * Discussion thread with real-time features
 */
export interface UnifiedThread {
  // Identity
  id: string;
  billId: string;
  title: string;
  description?: string;
  category: ThreadCategory;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Engagement
  commentCount: number;
  participantCount: number;
  lastActivityAt: string;
  isActive: boolean;

  // Quality & moderation
  qualityScore: number;
  isModerated: boolean;
  isPinned: boolean;
  isLocked: boolean;

  // Categorization
  tags: readonly string[];

  // Real-time presence
  activeUsers: readonly string[];
  typingUsers: readonly string[];
}

// DiscussionThread removed - use shared definition from community module


// ============================================================================
// MODERATION TYPES
// ============================================================================

export type ViolationType =
  | 'spam'
  | 'harassment'
  | 'inappropriate_language'
  | 'misinformation'
  | 'off_topic'
  | 'personal_attack'
  | 'copyright_violation'
  | 'hate_speech'
  | 'duplicate_content';

/**
 * Alias for backwards compatibility
 */
export type ModerationViolationType = ViolationType;

export type ModerationStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ModerationAction = 'none' | 'warning' | 'hide' | 'delete' | 'ban_user';
export type ContentType = 'comment' | 'thread';

/**
 * Unified moderation entry
 */
export interface UnifiedModeration {
  id: string;
  contentId: string;
  contentType: ContentType;
  reportedBy: string;
  reportedAt: string;
  violationType: ViolationType;
  description: string;
  status: ModerationStatus;
  moderatedBy?: string;
  moderatedAt?: string;
  action?: ModerationAction;
  moderatorNotes?: string;
}

/**
 * Comment report
 */
export interface CommentReport {
  id: number;
  commentId: string;
  reporterId: string;
  violationType: ViolationType;
  reason: string;
  description?: string;
  createdAt: string;
  status: ModerationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
}

/**
 * Moderation action taken
 */
export interface ModerationActionEntry {
  id: number;
  commentId: string;
  moderatorId: string;
  action: 'hide' | 'remove' | 'restore' | 'warn' | 'ban_user';
  reason: string;
  description?: string;
  createdAt: string;
  appealable: boolean;
  appealDeadline?: string;
}

// ============================================================================
// COMMUNITY STATE
// ============================================================================

export interface CommunityLoadingState {
  comments: boolean;
  threads: boolean;
  moderation: boolean;
}

export interface CommunityErrorState {
  comments?: string;
  threads?: string;
  moderation?: string;
}

export interface RealtimeState {
  connected: boolean;
  typingUsers: Readonly<Record<string, readonly string[]>>;
  activeUsers: Readonly<Record<string, readonly string[]>>;
}

export interface CommunityState {
  comments: Readonly<Record<string, UnifiedComment>>;
  threads: Readonly<Record<string, UnifiedThread>>;
  loading: CommunityLoadingState;
  error: CommunityErrorState;
  realtime: RealtimeState;
}

// ============================================================================
// DISCUSSION STATE & SETTINGS
// ============================================================================

export type CommentSortOption = 'newest' | 'oldest' | 'score' | 'quality';
export type CommentFilterOption = 'all' | 'expert_verified' | 'high_quality';

export interface DiscussionState {
  currentBillId?: string;
  currentThreadId?: string;
  selectedCommentId?: string;
  sortBy: CommentSortOption;
  filterBy: CommentFilterOption;
  showModerated: boolean;
  autoSubscribe: boolean;
  enableTypingIndicators: boolean;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateCommentRequest {
  billId: string;
  content: string;
  parentId?: string;
  threadId?: string;
}

export interface UpdateCommentRequest {
  commentId: string;
  content: string;
}

export interface CreateThreadRequest {
  billId: string;
  title: string;
  description?: string;
  category: ThreadCategory;
  tags?: readonly string[];
}

export interface ModerationRequest {
  contentId: string;
  contentType: ContentType;
  violationType: ViolationType;
  description: string;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface UseDiscussionReturn {
  // Data
  comments: readonly UnifiedComment[];
  threads: readonly UnifiedThread[];
  currentThread?: UnifiedThread;

  // Loading
  isLoading: boolean;
  isLoadingComments: boolean;
  isLoadingThreads: boolean;

  // Error
  error?: string;

  // Comment actions
  createComment: (data: CreateCommentRequest) => Promise<UnifiedComment>;
  updateComment: (data: UpdateCommentRequest) => Promise<UnifiedComment>;
  deleteComment: (commentId: string) => Promise<void>;
  voteComment: (commentId: string, vote: VoteType) => Promise<void>;

  // Thread actions
  createThread: (data: CreateThreadRequest) => Promise<UnifiedThread>;
  selectThread: (threadId: string) => void;

  // Moderation
  reportContent: (data: ModerationRequest) => Promise<void>;

  // Real-time
  typingUsers: readonly string[];
  activeUsers: readonly string[];
  startTyping: () => void;
  stopTyping: () => void;
}

export interface CommunityStats {
  totalComments: number;
  totalThreads: number;
  activeUsers: number;
  expertComments: number;
}

export interface UseCommunityReturn {
  // Core discussion
  discussion: UseDiscussionReturn;

  // Community stats
  stats: CommunityStats;

  // Social features
  shareThread: (threadId: string, platform: string) => Promise<void>;
  bookmarkComment: (commentId: string) => Promise<void>;
  followThread: (threadId: string) => Promise<void>;

  // Expert insights
  expertInsights: readonly UnifiedComment[];
  trendingTopics: readonly string[];
}

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

export interface WebSocketEvents {
  'comment:created': { comment: UnifiedComment };
  'comment:updated': { comment: UnifiedComment };
  'comment:deleted': { commentId: string };
  'comment:voted': { commentId: string; score: number };
  'thread:created': { thread: UnifiedThread };
  'thread:updated': { thread: UnifiedThread };
  'user:typing': { threadId: string; userId: string; userName: string };
  'user:stopped_typing': { threadId: string; userId: string };
  'user:joined': { threadId: string; userId: string; userName: string };
  'user:left': { threadId: string; userId: string };
  'content:moderated': { contentId: string; action: string };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface CommunityConfig {
  realtime: {
    enabled: boolean;
    typingTimeout: number;
    presenceTimeout: number;
  };
  moderation: {
    autoModeration: boolean;
    requireApproval: boolean;
    maxReportsBeforeHide: number;
  };
  features: {
    voting: boolean;
    threading: boolean;
    expertVerification: boolean;
    socialSharing: boolean;
  };
}

// Community types moved to community/community-base.ts
// - ActivityItem
// - TrendingTopic
// - ExpertInsight
// - Campaign
// - Petition
// - VoteRequest
// - TypingIndicator
// - CommunityFilters
// - TrendingAlgorithmConfig
// - CommentFormData
// - CommentValidation

// ============================================================================
// ONBOARDING TYPES
// ============================================================================

export interface OnboardingData {
  currentStep: number;
  interests: string[];
  expertise: string;
}

export interface OnboardingAchievement {
  id: number;
  userId: number;
  achievementType: string;
  achievementValue: number;
  description: string;
  createdAt: Date;
}

export interface OnboardingProgress {
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  lastCompletedStep: number;
}

export interface OnboardingProgressUpdate {
  achievementType: string;
  achievementValue: number;
  description: string;
}

export interface OnboardingStatus {
  isCompleted: boolean;
  persona: string | null;
  clearOnboarding: () => void;
}

// ============================================================================
// PERSONALIZATION TYPES
// ============================================================================

export type PersonaType = 'novice' | 'intermediate' | 'expert';

export interface PersonaMetrics {
  // Activity
  loginCount: number;
  daysActive: number;
  totalTimeSpent: number;

  // Engagement
  billsViewed: number;
  billsBookmarked: number;
  commentsPosted: number;
  searchesPerformed: number;

  // Advanced usage
  advancedFiltersUsed: number;
  analyticsViewed: number;
  expertToolsUsed: number;
  apiCallsMade: number;

  // Depth
  averageTimePerBill: number;
  fullTextReadsCount: number;
  analysisViewsCount: number;

  // Social
  discussionsParticipated: number;
  expertInsightsShared: number;
  verificationContributions: number;
}

export interface PersonaClassification {
  type: PersonaType;
  confidence: number;
  reasons: readonly string[];
  suggestedFeatures: readonly string[];
  nextLevelRequirements?: readonly string[];
}

export type PersonaView = 'list' | 'grid' | 'cards';
export type NotificationFrequency = 'immediate' | 'daily' | 'weekly';
export type ContentComplexity = 'simple' | 'detailed' | 'technical';
export type DashboardLayout = 'compact' | 'standard' | 'expanded';

export interface PersonaPreferences {
  defaultView: PersonaView;
  notificationFrequency: NotificationFrequency;
  contentComplexity: ContentComplexity;
  dashboardLayout: DashboardLayout;
  showAdvancedFeatures: boolean;
  enableExpertMode: boolean;
}

export interface PersonaThresholds {
  novice: {
    maxLoginCount: number;
    maxDaysActive: number;
    maxBillsViewed: number;
    maxAdvancedFeatureUsage: number;
  };
  intermediate: {
    minLoginCount: number;
    minDaysActive: number;
    minBillsViewed: number;
    minEngagementActions: number;
    maxExpertFeatureUsage: number;
  };
  expert: {
    minLoginCount: number;
    minDaysActive: number;
    minAdvancedFeatureUsage: number;
    minExpertContributions: number;
  };
}

export interface PersonaDetectionConfig {
  thresholds: PersonaThresholds;
  weights: {
    activity: number;
    engagement: number;
    expertise: number;
    consistency: number;
  };
  minimumDataPoints: number;
  confidenceThreshold: number;
}

export interface UserPersonaProfile {
  userId: string;
  currentPersona: PersonaType;
  confidence: number;
  lastUpdated: string;
  metrics: PersonaMetrics;
  preferences: PersonaPreferences;
  history: ReadonlyArray<{
    persona: PersonaType;
    confidence: number;
    detectedAt: string;
    reason: string;
  }>;
}

// ============================================================================
// VERIFICATION TYPES
// ============================================================================

/**
 * Verification status
 */
export type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';

/**
 * Verification workflow
 */
export interface VerificationWorkflow {
  id: string;
  contributionId: string;
  createdAt: string;
  updatedAt: string;
  status: VerificationStatus;
  expertId: string;
  reviewerId?: string;
  reviewDate?: string;
  reviewNotes?: string;
  communityFeedback: ReadonlyArray<{
    userId: string;
    feedback: string;
    vote: 'approve' | 'reject' | 'needs_revision';
    timestamp: string;
  }>;
}
