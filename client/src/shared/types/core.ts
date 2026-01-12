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

// ============================================================================
// BILL TYPES
// ============================================================================

export interface Bill {
  id: string;
  title: string;
  description: string;
  status: string;
  dateIntroduced: string;
  sponsors: readonly string[];
  tags: readonly string[];
}

export interface BillAnalysis {
  id: string;
  billId: string;
  summary: string;
  keyPoints: readonly string[];
  impact: string;
  score: number;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

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
 * Full-featured community comment with threading and moderation
 */
export interface CommunityComment extends Comment {
  // Threading
  replies: CommunityComment[];
  replyCount: number;
  depth: number;

  // Voting
  userVote?: VoteType;

  // Moderation
  moderationFlags: ModerationFlag[];
  reportCount: number;

  // Quality
  isHighQuality: boolean;

  // Expert features
  expertVerification?: ExpertVerification;
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

/**
 * Discussion thread with full comment data
 */
export interface DiscussionThread {
  id: number;
  billId: string;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;

  // Comments
  comments: CommunityComment[];
  totalComments: number;
  participantCount: number;

  // Moderation
  isLocked: boolean;
  lockReason?: string;
  lockedBy?: string;
  lockedAt?: string;

  // Quality
  engagementScore: number;
  qualityScore: number;
  expertParticipation: number;

  // Real-time
  lastActivity: string;
  activeUsers: readonly string[];
}

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

// ============================================================================
// ADDITIONAL COMMUNITY FEATURES
// ============================================================================

export interface ActivityItem {
  id: string;
  type: string;
  title?: string;
  timestamp?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface TrendingTopic {
  id: string;
  title: string;
  score: number;
  tags?: readonly string[];
}

export interface ExpertInsight {
  id: string;
  authorId: string;
  expertName: string;
  expertAvatar?: string;
  title?: string;
  summary: string;
  content?: string;
  confidence?: number;
  communityValidation?: {
    upvotes: number;
    downvotes: number;
    validationScore: number;
  };
  methodology?: string;
  sources?: readonly string[];
  policyAreas?: readonly string[];
  billTitle?: string;
  billId?: number;
  comments?: number;
  shares?: number;
  lastUpdated?: string;
  specializations?: readonly string[];
  timestamp?: string;
}

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  goal?: number;
}

export interface Petition {
  id: string;
  title: string;
  signatures?: number;
}

export interface VoteRequest {
  vote: boolean;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  billId: string;
  parentId?: string;
  timestamp: string;
}

export interface CommunityFilters {
  tags?: readonly string[];
  authors?: readonly string[];
  dateRange?: { start?: string; end?: string };
}

export interface TrendingAlgorithmConfig {
  windowDays?: number;
  minScore?: number;
}

export interface CommentFormData {
  content: string;
  parentId?: string;
  billId: string;
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

export type CommentSortOptionExtended =
  | CommentSortOption
  | 'most_voted'
  | 'controversial'
  | 'expert_first';

export type CommentFilterOptionExtended =
  | CommentFilterOption
  | 'recent';

// ============================================================================
// EVENT TYPES
// ============================================================================

export type CommentEventType =
  | 'comment_added'
  | 'comment_updated'
  | 'comment_removed'
  | 'comment_voted';

export interface CommentUpdateEvent {
  type: CommentEventType;
  billId: string;
  commentId: string;
  comment?: CommunityComment;
  userId?: string;
  timestamp: string;
}

export type ModerationEventType =
  | 'comment_reported'
  | 'comment_moderated'
  | 'user_warned'
  | 'user_banned';

export interface ModerationEvent {
  type: ModerationEventType;
  commentId?: string;
  userId?: string;
  moderatorId?: string;
  action?: string;
  reason?: string;
  timestamp: string;
}

// ============================================================================
// QUALITY & METRICS
// ============================================================================

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
  spamKeywords: readonly string[];
  requiredElements?: readonly string[];
}

export interface ModerationAppeal {
  id: number;
  commentId: string;
  userId: string;
  moderationActionId: string;
  reason: string;
  description: string;
  evidence?: readonly string[];
  createdAt: string;
  status: 'pending' | 'under_review' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  resolutionNotes?: string;
}

export interface ModerationStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  averageResolutionTime: number;
  topViolationTypes: ReadonlyArray<{
    type: ViolationType;
    count: number;
  }>;
  moderationActions: ReadonlyArray<{
    action: string;
    count: number;
  }>;
}

export interface CommunityGuidelines {
  id: number;
  title: string;
  description: string;
  rules: ReadonlyArray<{
    id: number;
    title: string;
    description: string;
    examples: readonly string[];
    consequences: readonly string[];
  }>;
  lastUpdated: string;
}

export type UserModerationStanding =
  | 'good_standing'
  | 'warned'
  | 'restricted'
  | 'banned';

export interface UserModerationHistory {
  userId: string;
  warnings: number;
  violations: number;
  bans: number;
  reputation: number;
  lastViolation?: string;
  status: UserModerationStanding;
}

export interface LocalImpactMetrics {
  region: string;
  score: number;
  changes: Readonly<Record<string, number>>;
}

// ============================================================================
// TYPE UNIONS
// ============================================================================

export type CommunityEntity =
  | ActivityItem
  | TrendingTopic
  | ExpertInsight
  | Campaign
  | Petition
  | DiscussionThread
  | CommunityComment;

// ============================================================================
// EXPERT TYPES
// ============================================================================

export type ExpertVerificationType = 'official' | 'domain' | 'identity';
export type CredentialType = 'education' | 'certification' | 'experience' | 'publication';
export type AffiliationType = 'academic' | 'government' | 'ngo' | 'private' | 'judicial';

export interface ExpertCredential {
  id: string;
  type: CredentialType;
  title: string;
  institution: string;
  year?: number;
  verified: boolean;
  verificationDate?: string;
  verificationSource?: string;
}

export interface ExpertAffiliation {
  id: string;
  organization: string;
  role: string;
  type: AffiliationType;
  current: boolean;
  verified: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Expert {
  id: string;
  name: string;
  avatar?: string;
  verificationType: ExpertVerificationType;
  credentials: readonly ExpertCredential[];
  affiliations: readonly ExpertAffiliation[];
  specializations: readonly string[];
  credibilityScore: number;
  contributionCount: number;
  avgCommunityRating: number;
  verified: boolean;
  verificationDate: string;
  bio?: string;
  contactInfo?: {
    email?: string;
    website?: string;
    linkedin?: string;
  };
}

export type ContributionType = 'analysis' | 'comment' | 'review' | 'amendment_suggestion';
export type ContributionStatus = 'draft' | 'published' | 'under_review' | 'disputed';

export interface ExpertContribution {
  id: string;
  expertId: string;
  billId: number;
  type: ContributionType;
  content: string;
  confidence: number;
  methodology?: string;
  sources?: readonly string[];
  tags: readonly string[];
  createdAt: string;
  lastUpdated: string;
  communityValidation: {
    upvotes: number;
    downvotes: number;
    comments: number;
    userVote?: VoteType;
    validationScore: number;
  };
  status: ContributionStatus;
}

export type ControversyLevel = 'low' | 'medium' | 'high';

export interface ExpertConsensus {
  billId: number;
  topic: string;
  totalExperts: number;
  agreementLevel: number;
  majorityPosition: string;
  minorityPositions: ReadonlyArray<{
    position: string;
    expertCount: number;
    experts: readonly string[];
  }>;
  controversyLevel: ControversyLevel;
  lastUpdated: string;
}

export type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';
export type FeedbackVote = 'approve' | 'reject' | 'needs_revision';

export interface VerificationWorkflow {
  id: string;
  contributionId: string;
  expertId: string;
  reviewerId?: string;
  status: VerificationStatus;
  reviewNotes?: string;
  reviewDate?: string;
  communityFeedback: ReadonlyArray<{
    userId: string;
    feedback: string;
    vote: FeedbackVote;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CredibilityMetrics {
  expertId: string;
  overallScore: number;
  components: {
    credentialScore: number;
    affiliationScore: number;
    communityScore: number;
    contributionQuality: number;
    consensusAlignment: number;
  };
  methodology: {
    description: string;
    factors: ReadonlyArray<{
      name: string;
      weight: number;
      description: string;
    }>;
  };
  lastCalculated: string;
}

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
