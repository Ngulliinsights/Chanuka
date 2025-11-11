/**
 * Discussion Threading and Community Moderation Types
 * 
 * Defines interfaces for discussion threads, comments, moderation,
 * and community reporting functionality.
 */

export interface Comment {
  id: string;
  billId: number;
  parentId?: string; // For nested threading
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
  id: string;
  title: string;
  description: string;
  rules: Array<{
    id: string;
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
  id: string;
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