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
  authorId: string;
  body: string;
  createdAt?: string;
  editedAt?: string | null;
}

export interface CommentReport {
  id: string;
  commentId: string;
  reporterId: string;
  reason?: string;
}

export type ModerationAction = 'remove' | 'warn' | 'suspend' | 'escalate';
export type ModerationFlag = 'spam' | 'abuse' | 'other';

export interface TypingIndicator {
  userId: string;
  threadId: string;
  isTyping: boolean;
}

export interface DiscussionThread {
  id: string;
  title: string;
  comments: Comment[];
  createdAt?: string;
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
  body: string;
  attachments?: string[];
}

export interface CommentValidation {
  valid: boolean;
  errors?: Record<string, string>;
}

export type CommentSortOption = 'newest' | 'oldest' | 'most_upvoted';
export type CommentFilterOption = 'all' | 'with_replies' | 'from_experts';

export type ModerationViolationType = 'hate' | 'harassment' | 'misinformation' | 'other';

// Fallback export to allow broad imports when exact type isn't required
export type CommunityEntity =
  | ActivityItem
  | TrendingTopic
  | ExpertInsight
  | Campaign
  | Petition
  | DiscussionThread
  | Comment;