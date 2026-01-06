/**
 * Discussion State Management - Optimized Redux Toolkit Slice
 * Manages discussion threads, comments, real-time updates, and moderation
 *
 * Key optimizations:
 * - Normalized state structure for O(1) lookups
 * - Efficient comment tree operations
 * - Memoized selectors to prevent unnecessary re-renders
 * - Type-safe async operations with proper error handling
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// Temporary type definitions to avoid import issues
interface RootState {
  discussion: DiscussionState;
}

// Base types (normally imported from @client/types)
interface Comment {
  id: string;
  billId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  upvotes: number;
  downvotes: number;
  status: 'active' | 'hidden' | 'removed' | 'under_review';
  qualityScore: number;
  isExpertComment: boolean;
}

interface DiscussionThread {
  id: number;
  billId: string;
  title?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  totalComments: number;
  participantCount: number;
  isLocked: boolean;
  engagementScore: number;
  qualityScore: number;
  expertParticipation: number;
  lastActivity: string;
  activeUsers: string[];
}

interface CommentReport {
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

interface ModerationAction {
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

interface CommentFormData {
  content: string;
  parentId?: string;
  billId: string;
}

type CommentSortOption = 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
type CommentFilterOption = 'all' | 'expert_only' | 'high_quality' | 'recent';
type ModerationViolationType =
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'off_topic'
  | 'inappropriate_language'
  | 'personal_attack'
  | 'duplicate_content'
  | 'copyright_violation'
  | 'other';

// Mock logger to avoid import issues
const logger = {
  error: (message: string, context?: Record<string, unknown>, error?: unknown) => {
    console.error(message, context, error);
  },
  info: (message: string, context?: Record<string, unknown>) => {
    console.info(message, context);
  },
};

// Extended Comment type with computed properties for efficient tree operations
interface ExtendedComment extends Comment {
  replies: string[]; // Store IDs instead of full objects for normalized state
  replyCount: number;
  userVote: 'up' | 'down' | null;
  isEdited?: boolean;
  editHistory?: Array<{ timestamp: string; content: string }>;
}

// Extended DiscussionThread type optimized for normalized storage
interface ExtendedDiscussionThread extends Omit<DiscussionThread, 'comments'> {
  topLevelCommentIds: string[]; // Store only top-level comment IDs
  isPinned?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// Interface for comment tree with nested structure (used in selectors)
interface CommentTreeNode extends Omit<ExtendedComment, 'replies'> {
  replies: CommentTreeNode[];
  isHighQuality?: boolean;
}

// State interface with optimized structure
interface DiscussionState {
  threads: Record<number, ExtendedDiscussionThread>;
  comments: Record<string, ExtendedComment>;
  reports: Record<string, CommentReport>;
  moderationActions: Record<string, ModerationAction>;

  loading: boolean;
  error: string | null;
  isConnected: boolean;

  sortPreference: CommentSortOption;
  filterPreference: CommentFilterOption;

  pendingReports: number;
  moderationQueue: string[];
}

// Type-safe async thunk return types
interface LoadDiscussionDataResult {
  billId: number;
  thread: ExtendedDiscussionThread;
  comments: Record<string, ExtendedComment>; // Return as normalized map
}

interface VoteCommentResult {
  commentId: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
}

// Helper to convert nested comment structure to normalized flat structure
const normalizeComments = (comments: Comment[]): Record<string, ExtendedComment> => {
  const normalized: Record<string, ExtendedComment> = {};

  const processComment = (comment: Comment, parentId?: string): void => {
    const replies = (comment as Comment & { replies?: Comment[] }).replies || [];
    const replyIds = replies.map((r: Comment) => r.id);

    normalized[comment.id] = {
      ...comment,
      parentId: parentId || comment.parentId,
      replies: replyIds,
      replyCount: replies.length,
      userVote: (comment as Comment & { userVote?: 'up' | 'down' | null }).userVote || null,
    };

    // Recursively process nested replies
    replies.forEach((reply: Comment) => processComment(reply, comment.id));
  };

  comments.forEach(comment => processComment(comment));
  return normalized;
};

// Async thunks with proper typing and error handling
export const loadDiscussionData = createAsyncThunk<LoadDiscussionDataResult, number>(
  'discussion/loadData',
  async (billId: number, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      // const response = await api.discussions.getByBillId(billId);

      const now = new Date().toISOString();
      const mockComments: Comment[] = []; // Would come from API response

      const normalizedComments = normalizeComments(mockComments);
      const topLevelCommentIds = Object.values(normalizedComments)
        .filter(c => !c.parentId)
        .map(c => c.id);

      const thread: ExtendedDiscussionThread = {
        id: billId,
        billId: billId.toString(),
        topLevelCommentIds,
        createdAt: now,
        updatedAt: now,
        totalComments: Object.keys(normalizedComments).length,
        participantCount: new Set(Object.values(normalizedComments).map(c => c.authorId)).size,
        isLocked: false,
        engagementScore: 0,
        qualityScore: 0,
        expertParticipation: 0,
        activeUsers: [],
        isPinned: false,
        lastActivity: now,
        tags: [],
        metadata: {},
      };

      return { billId, thread, comments: normalizedComments };
    } catch (error) {
      logger.error('Failed to load discussion data:', { billId, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load discussion');
    }
  }
);

export const addCommentAsync = createAsyncThunk<ExtendedComment, CommentFormData>(
  'discussion/addComment',
  async (data: CommentFormData, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      // const response = await api.comments.create(data);

      const now = new Date().toISOString();
      const newComment: ExtendedComment = {
        id: `temp-${Date.now()}`, // Use temporary ID until backend responds
        billId: data.billId,
        content: data.content,
        parentId: data.parentId || undefined,
        authorId: 'current-user-id', // Should come from auth context
        authorName: 'Current User', // Should come from auth context
        createdAt: now,
        updatedAt: now,
        upvotes: 0,
        downvotes: 0,
        replies: [],
        replyCount: 0,
        userVote: null,
        status: 'active',
        isEdited: false,
        editHistory: [],
        qualityScore: 0.5,
        isExpertComment: false,
      };

      return newComment;
    } catch (error) {
      logger.error('Failed to add comment:', { data, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add comment');
    }
  }
);

export const voteCommentAsync = createAsyncThunk<
  VoteCommentResult,
  { commentId: string; voteType: 'up' | 'down' }
>('discussion/voteComment', async ({ commentId, voteType }, { getState, rejectWithValue }) => {
  try {
    // TODO: Replace with actual API call
    // const response = await api.comments.vote(commentId, voteType);

    const state = getState() as RootState;
    const comment = state.discussion.comments[commentId];

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Calculate new vote counts based on previous state
    let upvotes = comment.upvotes;
    let downvotes = comment.downvotes;
    let newUserVote: 'up' | 'down' | null = voteType;

    // Remove previous vote if exists
    if (comment.userVote === 'up') {
      upvotes -= 1;
    } else if (comment.userVote === 'down') {
      downvotes -= 1;
    }

    // Toggle or apply new vote
    if (comment.userVote === voteType) {
      newUserVote = null; // User is removing their vote
    } else {
      if (voteType === 'up') {
        upvotes += 1;
      } else {
        downvotes += 1;
      }
    }

    return {
      commentId,
      upvotes,
      downvotes,
      userVote: newUserVote,
    };
  } catch (error) {
    logger.error('Failed to vote on comment:', { commentId, voteType, error });
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to vote');
  }
});

export const reportCommentAsync = createAsyncThunk<
  CommentReport,
  {
    commentId: string;
    violationType: ModerationViolationType;
    reason: string;
    description?: string;
  }
>(
  'discussion/reportComment',
  async ({ commentId, violationType, reason, description }, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      // const response = await api.comments.report({ commentId, violationType, reason, description });

      const report: CommentReport = {
        id: Date.now(),
        commentId,
        reporterId: 'current-user-id', // Should come from auth context
        violationType,
        reason,
        description,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      logger.info('Comment reported:', { commentId, violationType });
      return report;
    } catch (error) {
      logger.error('Failed to report comment:', { commentId, error });
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to report comment');
    }
  }
);

const initialState: DiscussionState = {
  threads: {},
  comments: {},
  reports: {},
  moderationActions: {},
  loading: false,
  error: null,
  isConnected: false,
  sortPreference: 'newest',
  filterPreference: 'all',
  pendingReports: 0,
  moderationQueue: [],
};

const discussionSlice = createSlice({
  name: 'discussion',
  initialState,
  reducers: {
    setThread: (
      state,
      action: PayloadAction<{
        billId: number;
        thread: ExtendedDiscussionThread;
        comments: Record<string, ExtendedComment>;
      }>
    ) => {
      const { billId, thread, comments } = action.payload;
      state.threads[billId] = thread;
      Object.assign(state.comments, comments);
    },

    updateThread: (
      state,
      action: PayloadAction<{ billId: number; updates: Partial<ExtendedDiscussionThread> }>
    ) => {
      const { billId, updates } = action.payload;
      const thread = state.threads[billId];
      if (thread) {
        Object.assign(thread, updates);
      }
    },

    addComment: (state, action: PayloadAction<ExtendedComment>) => {
      const comment = action.payload;
      state.comments[comment.id] = comment;

      const thread = state.threads[Number(comment.billId)];
      if (!thread) return;

      if (comment.parentId) {
        // Add as reply to parent comment
        const parent = state.comments[comment.parentId];
        if (parent) {
          parent.replies.push(comment.id);
          parent.replyCount += 1;
        }
      } else {
        // Add as top-level comment at the beginning for newest-first display
        thread.topLevelCommentIds.unshift(comment.id);
      }

      thread.totalComments += 1;
      thread.lastActivity = comment.createdAt;
    },

    updateComment: (
      state,
      action: PayloadAction<{ commentId: string; updates: Partial<ExtendedComment> }>
    ) => {
      const { commentId, updates } = action.payload;
      const comment = state.comments[commentId];

      if (comment) {
        Object.assign(comment, updates);

        // Update thread's last activity if comment is being edited
        if (updates.content !== undefined || updates.isEdited !== undefined) {
          const thread = state.threads[Number(comment.billId)];
          if (thread) {
            thread.lastActivity = new Date().toISOString();
          }
        }
      }
    },

    removeComment: (state, action: PayloadAction<string>) => {
      const commentId = action.payload;
      const comment = state.comments[commentId];
      if (!comment) return;

      // Mark as removed to preserve thread structure and maintain reply relationships
      comment.status = 'removed';
      comment.content = '[Comment removed]';

      const thread = state.threads[Number(comment.billId)];
      if (thread) {
        thread.lastActivity = new Date().toISOString();
      }
    },

    voteComment: (state, action: PayloadAction<{ commentId: string; voteType: 'up' | 'down' }>) => {
      const { commentId, voteType } = action.payload;
      const comment = state.comments[commentId];
      if (!comment) return;

      const previousVote = comment.userVote;

      // Remove previous vote if exists
      if (previousVote === 'up') {
        comment.upvotes = Math.max(0, comment.upvotes - 1);
      } else if (previousVote === 'down') {
        comment.downvotes = Math.max(0, comment.downvotes - 1);
      }

      // Toggle or apply new vote
      if (previousVote === voteType) {
        comment.userVote = null;
      } else {
        if (voteType === 'up') {
          comment.upvotes += 1;
        } else {
          comment.downvotes += 1;
        }
        comment.userVote = voteType;
      }
    },

    setSortPreference: (state, action: PayloadAction<CommentSortOption>) => {
      state.sortPreference = action.payload;
    },

    setFilterPreference: (state, action: PayloadAction<CommentFilterOption>) => {
      state.filterPreference = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    clearError: state => {
      state.error = null;
    },

    reset: () => initialState,

    resetThread: (state, action: PayloadAction<number>) => {
      const billId = action.payload;
      const thread = state.threads[billId];

      if (thread) {
        // Remove all comments associated with this thread
        const removeCommentAndReplies = (commentId: string): void => {
          const comment = state.comments[commentId];
          if (comment) {
            comment.replies.forEach((replyId: string) => removeCommentAndReplies(replyId));
            delete state.comments[commentId];
          }
        };

        thread.topLevelCommentIds.forEach((commentId: string) =>
          removeCommentAndReplies(commentId)
        );
        delete state.threads[billId];
      }
    },
  },
  extraReducers: builder => {
    builder
      // Load discussion data
      .addCase(loadDiscussionData.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDiscussionData.fulfilled, (state, action) => {
        const { billId, thread, comments } = action.payload;
        state.loading = false;
        state.threads[billId] = thread;
        Object.assign(state.comments, comments);
      })
      .addCase(loadDiscussionData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load discussion';
      })

      // Add comment
      .addCase(addCommentAsync.pending, state => {
        state.error = null;
      })
      .addCase(addCommentAsync.fulfilled, (state, action) => {
        discussionSlice.caseReducers.addComment(state, action);
      })
      .addCase(addCommentAsync.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to add comment';
      })

      // Vote on comment
      .addCase(voteCommentAsync.fulfilled, (state, action) => {
        const { commentId, upvotes, downvotes, userVote } = action.payload;
        const comment = state.comments[commentId];
        if (comment) {
          comment.upvotes = upvotes;
          comment.downvotes = downvotes;
          comment.userVote = userVote;
        }
      })
      .addCase(voteCommentAsync.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to vote';
      })

      // Report comment
      .addCase(reportCommentAsync.fulfilled, (state, action) => {
        const report = action.payload;
        state.reports[report.id] = report;
        state.pendingReports += 1;

        if (!state.moderationQueue.includes(report.commentId)) {
          state.moderationQueue.push(report.commentId);
        }
      })
      .addCase(reportCommentAsync.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to report comment';
      });
  },
});

export const {
  setThread,
  updateThread,
  addComment,
  updateComment,
  removeComment,
  voteComment,
  setSortPreference,
  setFilterPreference,
  setLoading,
  setError,
  clearError,
  setConnected,
  reset,
  resetThread,
} = discussionSlice.actions;

export default discussionSlice.reducer;

// ============================================================================
// Optimized Selectors with Memoization
// ============================================================================

export const selectDiscussionState = (state: RootState) => state.discussion;

export const selectThread = createSelector(
  [selectDiscussionState, (_: RootState, billId: number) => billId],
  (discussion, billId) => discussion.threads[billId] || null
);

export const selectComment = createSelector(
  [selectDiscussionState, (_: RootState, commentId: string) => commentId],
  (discussion, commentId) => discussion.comments[commentId] || null
);

// Recursively build comment tree from normalized state
const buildCommentTree = (
  commentId: string,
  commentsMap: Record<string, ExtendedComment>
): CommentTreeNode | null => {
  const comment = commentsMap[commentId];
  if (!comment) {
    return null;
  }

  return {
    ...comment,
    replies: comment.replies
      .map((replyId: string) => buildCommentTree(replyId, commentsMap))
      .filter((node): node is CommentTreeNode => node !== null),
  };
};

export const selectThreadComments = createSelector(
  [
    selectDiscussionState,
    (_: RootState, billId: number) => billId,
    (_: RootState, __: number, sortBy?: CommentSortOption) => sortBy,
    (_: RootState, __: number, ___?: CommentSortOption, filterBy?: CommentFilterOption) => filterBy,
  ],
  (discussion, billId, sortBy, filterBy) => {
    const thread = discussion.threads[billId];
    if (!thread) return [];

    const sort = sortBy || discussion.sortPreference;
    const filter = filterBy || discussion.filterPreference;

    // Build full comment trees from normalized state
    let comments = thread.topLevelCommentIds
      .map((id: string) => buildCommentTree(id, discussion.comments))
      .filter((node): node is CommentTreeNode => node !== null);

    // Apply filtering based on the selected option
    if (filter === 'expert_only') {
      comments = comments.filter((c: CommentTreeNode) => c.isExpertComment);
    } else if (filter === 'high_quality') {
      comments = comments.filter(
        (c: CommentTreeNode) => c.isHighQuality || (c.qualityScore && c.qualityScore > 0.7)
      );
    } else if (filter === 'recent') {
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
      comments = comments.filter(
        (c: CommentTreeNode) => new Date(c.createdAt).getTime() > cutoffTime
      );
    }

    // Apply sorting with optimized comparators
    const comparators: Record<
      CommentSortOption,
      (a: CommentTreeNode, b: CommentTreeNode) => number
    > = {
      oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      most_voted: (a, b) => {
        const scoreA = a.upvotes - a.downvotes;
        const scoreB = b.upvotes - b.downvotes;
        return scoreB - scoreA;
      },
      controversial: (a, b) => {
        // Wilson score for controversy (high engagement from both sides)
        const controversyScore = (c: CommentTreeNode) => {
          const total = c.upvotes + c.downvotes;
          if (total === 0) return 0;
          return Math.min(c.upvotes, c.downvotes) / total;
        };
        return controversyScore(b) - controversyScore(a);
      },
      expert_first: (a, b) => {
        if (a.isExpertComment !== b.isExpertComment) {
          return a.isExpertComment ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      },
    };

    return comments.sort(comparators[sort]);
  }
);

export const selectCommentReplies = createSelector(
  [selectDiscussionState, (_: RootState, commentId: string) => commentId],
  (discussion, commentId) => {
    const comment = discussion.comments[commentId];
    if (!comment) return [];

    return comment.replies
      .map((replyId: string) => buildCommentTree(replyId, discussion.comments))
      .filter((node): node is CommentTreeNode => node !== null);
  }
);

export const selectModerationStats = createSelector([selectDiscussionState], discussion => {
  const reports = Object.values(discussion.reports);
  return {
    totalReports: reports.length,
    pendingReports: discussion.pendingReports,
    resolvedReports: reports.filter((r: CommentReport) => r.status === 'resolved').length,
    dismissedReports: reports.filter((r: CommentReport) => r.status === 'dismissed').length,
    totalActions: Object.keys(discussion.moderationActions).length,
    queueLength: discussion.moderationQueue.length,
  };
});

export const selectThreadStats = createSelector([selectThread], thread => {
  if (!thread) return null;

  return {
    totalComments: thread.totalComments,
    participantCount: thread.participantCount,
    isLocked: thread.isLocked,
    isPinned: thread.isPinned || false,
    lastActivity: thread.lastActivity,
  };
});
