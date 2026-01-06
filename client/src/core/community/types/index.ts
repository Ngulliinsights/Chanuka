/**
 * Unified Community Types
 *
 * Single source of truth for all community and discussion types,
 * resolving conflicts identified in discussion_community_integration_analysis.md
 */

// ============================================================================
// BASE COMMENT INTERFACE
// ============================================================================

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

// ============================================================================
// UNIFIED COMMENT INTERFACE (resolves duplicate definitions)
// ============================================================================

export interface UnifiedComment extends BaseComment {
  // Threading support
  threadId?: string;
  depth: number;
  childCount: number;

  // Engagement metrics
  score: number;
  userVote?: 'up' | 'down';

  // Moderation
  isModerated: boolean;
  moderationReason?: string;
  isReported: boolean;
  reportCount: number;

  // Quality metrics
  isExpertVerified: boolean;
  hasSourceLinks: boolean;
}

// ============================================================================
// UNIFIED THREAD INTERFACE (resolves multiple inconsistent definitions)
// ============================================================================

export interface UnifiedThread {
  id: string;
  billId: string;
  title: string;
  description?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Engagement metrics (rich metadata from discussion.ts)
  commentCount: number;
  participantCount: number;
  lastActivityAt: string;
  isActive: boolean;

  // Quality and moderation
  qualityScore: number;
  isModerated: boolean;
  isPinned: boolean;
  isLocked: boolean;

  // Tags and categorization
  tags: string[];
  category: 'general' | 'analysis' | 'question' | 'proposal';

  // Real-time state
  activeUsers: string[];
  typingUsers: string[];
}

// ============================================================================
// UNIFIED MODERATION TYPES (resolves inconsistent violation types)
// ============================================================================

export type ViolationType =
  | 'spam'
  | 'harassment'
  | 'inappropriate_language' // Standardized naming
  | 'misinformation'
  | 'off_topic'
  | 'personal_attack'
  | 'copyright_violation'
  | 'hate_speech'
  | 'duplicate_content';

export interface UnifiedModeration {
  id: string;
  contentId: string;
  contentType: 'comment' | 'thread';
  reportedBy: string;
  reportedAt: string;
  violationType: ViolationType;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  moderatedBy?: string;
  moderatedAt?: string;
  action?: 'none' | 'warning' | 'hide' | 'delete' | 'ban_user';
  moderatorNotes?: string;
}

// ============================================================================
// STATE MANAGEMENT TYPES (unified React Query + EventBus)
// ============================================================================

export interface CommunityState {
  comments: Record<string, UnifiedComment>;
  threads: Record<string, UnifiedThread>;
  loading: {
    comments: boolean;
    threads: boolean;
    moderation: boolean;
  };
  error: {
    comments?: string;
    threads?: string;
    moderation?: string;
  };
  realtime: {
    connected: boolean;
    typingUsers: Record<string, string[]>; // threadId -> userIds
    activeUsers: Record<string, string[]>; // threadId -> userIds
  };
}

export interface DiscussionState {
  currentBillId?: string;
  currentThreadId?: string;
  selectedCommentId?: string;
  sortBy: 'newest' | 'oldest' | 'score' | 'quality';
  filterBy: 'all' | 'expert_verified' | 'high_quality';
  showModerated: boolean;
  autoSubscribe: boolean;
  enableTypingIndicators: boolean;
}

// ============================================================================
// API TYPES (standardized parameter naming)
// ============================================================================

export interface CreateCommentRequest {
  billId: string; // Consistent camelCase
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
  category: UnifiedThread['category'];
  tags?: string[];
}

export interface ModerationRequest {
  contentId: string;
  contentType: 'comment' | 'thread';
  violationType: ViolationType;
  description: string;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface UseDiscussionReturn {
  // Data
  comments: UnifiedComment[];
  threads: UnifiedThread[];
  currentThread?: UnifiedThread;

  // Loading states
  isLoading: boolean;
  isLoadingComments: boolean;
  isLoadingThreads: boolean;

  // Error states
  error?: string;

  // Actions
  createComment: (data: CreateCommentRequest) => Promise<UnifiedComment>;
  updateComment: (data: UpdateCommentRequest) => Promise<UnifiedComment>;
  deleteComment: (commentId: string) => Promise<void>;
  voteComment: (commentId: string, vote: 'up' | 'down') => Promise<void>;

  // Thread actions
  createThread: (data: CreateThreadRequest) => Promise<UnifiedThread>;
  selectThread: (threadId: string) => void;

  // Moderation
  reportContent: (data: ModerationRequest) => Promise<void>;

  // Real-time
  typingUsers: string[];
  activeUsers: string[];
  startTyping: () => void;
  stopTyping: () => void;
}

export interface UseCommunityReturn {
  // All discussion functionality plus community-specific features
  discussion: UseDiscussionReturn;

  // Community stats
  stats: {
    totalComments: number;
    totalThreads: number;
    activeUsers: number;
    expertComments: number;
  };

  // Social features
  shareThread: (threadId: string, platform: string) => Promise<void>;
  bookmarkComment: (commentId: string) => Promise<void>;
  followThread: (threadId: string) => Promise<void>;

  // Expert insights
  expertInsights: UnifiedComment[];
  trendingTopics: string[];
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export interface WebSocketEvents {
  // Comment events
  'comment:created': { comment: UnifiedComment };
  'comment:updated': { comment: UnifiedComment };
  'comment:deleted': { commentId: string };
  'comment:voted': { commentId: string; score: number };

  // Thread events
  'thread:created': { thread: UnifiedThread };
  'thread:updated': { thread: UnifiedThread };

  // Real-time presence
  'user:typing': { threadId: string; userId: string; userName: string };
  'user:stopped_typing': { threadId: string; userId: string };
  'user:joined': { threadId: string; userId: string; userName: string };
  'user:left': { threadId: string; userId: string };

  // Moderation events
  'content:moderated': { contentId: string; action: string };
}

// ============================================================================
// CONFIGURATION TYPES
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
