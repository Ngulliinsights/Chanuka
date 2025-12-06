export interface VoteRequest {
  vote: boolean;
}

// Basic community types used across the app (minimal shapes to satisfy imports)
export interface ActivityItem {
  id: string;
  type: string;
  title?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface TrendingTopic {
  id: string;
  title: string;
  score: number;
  tags?: string[];
}

export interface ExpertInsight {
  id: string;
  authorId: string;
  summary: string;
  publishedAt?: string;
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

export interface CommunityStats {
  members: number;
  activeThreads: number;
  postsToday: number;
}

export interface LocalImpactMetrics {
  region: string;
  score: number;
  changes: Record<string, number>;
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
  editedAt?: string;
  
  // Voting system
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  
  // Threading
  replies: Comment[];
  replyCount: number;
  depth: number;
  
  // Moderation
  status: 'active' | 'hidden' | 'removed' | 'under_review';
  moderationFlags: ModerationFlag[];
  reportCount: number;
  
  // Quality metrics
  qualityScore: number;
  isHighQuality: boolean;
  
  // Expert verification
  isExpertComment: boolean;
  expertVerification?: {
    type: 'official' | 'domain' | 'identity';
    credibilityScore: number;
  };
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
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
}

export interface ModerationAction {
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

export interface TypingIndicator {
  userId: string;
  userName: string;
  billId: number;
  parentId?: string;
  timestamp: string;
}

export interface DiscussionThread {
  id: number;
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
  expertParticipation: number;
  
  // Real-time updates
  lastActivity: string;
  activeUsers: string[];
}

export interface CommunityFilters {
  tags?: string[];
  authors?: string[];
  dateRange?: { start?: string; end?: string };
}

export interface TrendingAlgorithmConfig {
  windowDays?: number;
  minScore?: number;
}

// Additional helper types used in components
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
  };
}

export type CommentSortOption = 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
export type CommentFilterOption = 'all' | 'expert_only' | 'high_quality' | 'recent';

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

// Quality assessment types
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

// Moderation statistics
export interface ModerationStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  averageResolutionTime: number;
  topViolationTypes: Array<{
    type: ModerationViolationType;
    count: number;
  }>;
  moderationActions: Array<{
    action: string;
    count: number;
  }>;
}

// Community guidelines
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

// User moderation history
export interface UserModerationHistory {
  userId: string;
  warnings: number;
  violations: number;
  bans: number;
  reputation: number;
  lastViolation?: string;
  status: 'good_standing' | 'warned' | 'restricted' | 'banned';
}

// Fallback export to allow broad imports when exact type isn't required
export type CommunityEntity =
  | ActivityItem
  | TrendingTopic
  | ExpertInsight
  | Campaign
  | Petition
  | DiscussionThread
  | Comment;