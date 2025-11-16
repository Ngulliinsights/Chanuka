/**
 * Discussion State Management - Optimized Redux Toolkit Slice
 * Manages discussion threads, comments, real-time updates, and moderation
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { mockDataService } from '../../services/mockDataService';
import { communityBackendService } from '../../services/community-backend-service';
import {
  DiscussionThread,
  Comment,
  CommentReport,
  ModerationAction,
  CommentSortOption,
  CommentFilterOption,
  CommentFormData,
  ModerationViolationType
} from '../../types/discussion';
import { logger } from '../../utils/logger';
import type { RootState } from '../index';

// State interface with clear organization
interface DiscussionState {
  threads: Record<number, DiscussionThread>;
  comments: Record<string, Comment>;
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

// Async thunks with fallback handling
export const loadDiscussionData = createAsyncThunk(
  'discussion/loadData',
  async (billId: number) => {
    try {
      await communityBackendService.initialize();
      const [thread, comments] = await Promise.all([
        communityBackendService.getDiscussionThread(billId),
        communityBackendService.getBillComments(billId, { sort: 'newest', limit: 50 })
      ]);
      return { billId, thread: { ...thread, comments }, comments };
    } catch (error) {
      logger.warn('Backend failed, using mock data:', { error });
      const mockThread = await mockDataService.getDiscussionThread(billId);
      if (!mockThread) throw new Error(`Mock discussion thread not found for bill ${billId}`);
      return { billId, thread: mockThread, comments: mockThread.comments };
    }
  }
);

export const addCommentAsync = createAsyncThunk(
  'discussion/addComment',
  async (data: CommentFormData, { rejectWithValue }) => {
    try {
      return await communityBackendService.addComment(data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add comment');
    }
  }
);

export const voteCommentAsync = createAsyncThunk(
  'discussion/voteComment',
  async ({ commentId, voteType }: { commentId: string; voteType: 'up' | 'down' }, { rejectWithValue }) => {
    try {
      const updatedComment = await communityBackendService.voteComment(commentId, voteType);
      return { commentId, updatedComment };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to vote');
    }
  }
);

export const reportCommentAsync = createAsyncThunk(
  'discussion/reportComment',
  async ({
    commentId,
    violationType,
    reason,
    description
  }: {
    commentId: string;
    violationType: ModerationViolationType;
    reason: string;
    description?: string;
  }, { rejectWithValue }) => {
    try {
      return await communityBackendService.reportComment(commentId, violationType, reason, description);
    } catch (error) {
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

// Helper function to recursively store comments in flat structure
const storeCommentRecursively = (state: DiscussionState, comment: Comment) => {
  state.comments[comment.id] = comment;
  comment.replies.forEach(reply => storeCommentRecursively(state, reply));
};

// Helper function to recursively update comments in thread structure
const updateCommentInTree = (comments: Comment[], commentId: string, updater: (c: Comment) => void): boolean => {
  for (const comment of comments) {
    if (comment.id === commentId) {
      updater(comment);
      return true;
    }
    if (updateCommentInTree(comment.replies, commentId, updater)) return true;
  }
  return false;
};

const discussionSlice = createSlice({
  name: 'discussion',
  initialState,
  reducers: {
    setThread: (state, action: PayloadAction<{ billId: number; thread: DiscussionThread }>) => {
      const { billId, thread } = action.payload;
      state.threads[billId] = thread;
      thread.comments.forEach(comment => storeCommentRecursively(state, comment));
    },

    updateThread: (state, action: PayloadAction<{ billId: number; updates: Partial<DiscussionThread> }>) => {
      const { billId, updates } = action.payload;
      if (state.threads[billId]) {
        Object.assign(state.threads[billId], updates);
      }
    },

    addComment: (state, action: PayloadAction<Comment>) => {
      const comment = action.payload;
      state.comments[comment.id] = comment;

      const thread = state.threads[comment.billId];
      if (!thread) return;

      if (comment.parentId) {
        // Add as reply to parent comment
        updateCommentInTree(thread.comments, comment.parentId, (parent) => {
          parent.replies.push(comment);
          parent.replyCount += 1;
        });
      } else {
        // Add as top-level comment
        thread.comments.unshift(comment);
      }

      thread.totalComments += 1;
      thread.lastActivity = comment.createdAt;
    },

    updateComment: (state, action: PayloadAction<{ commentId: string; updates: Partial<Comment> }>) => {
      const { commentId, updates } = action.payload;
      const comment = state.comments[commentId];
      if (!comment) return;

      Object.assign(comment, updates);

      const thread = state.threads[comment.billId];
      if (thread) {
        updateCommentInTree(thread.comments, commentId, (c) => Object.assign(c, updates));
      }
    },

    removeComment: (state, action: PayloadAction<string>) => {
      const commentId = action.payload;
      const comment = state.comments[commentId];
      if (!comment) return;

      // Mark as removed to preserve thread structure
      const removal = { status: 'removed' as const, content: '[Comment removed]' };
      Object.assign(comment, removal);

      const thread = state.threads[comment.billId];
      if (thread) {
        updateCommentInTree(thread.comments, commentId, (c) => Object.assign(c, removal));
      }
    },

    voteComment: (state, action: PayloadAction<{ commentId: string; voteType: 'up' | 'down'; userId: string }>) => {
      const { commentId, voteType } = action.payload;
      const comment = state.comments[commentId];
      if (!comment) return;

      const previousVote = comment.userVote;

      // Remove previous vote if exists
      if (previousVote === 'up') comment.upvotes -= 1;
      else if (previousVote === 'down') comment.downvotes -= 1;

      // Toggle or apply new vote
      if (previousVote === voteType) {
        comment.userVote = null;
      } else {
        if (voteType === 'up') comment.upvotes += 1;
        else comment.downvotes += 1;
        comment.userVote = voteType;
      }

      // Sync to thread structure
      const thread = state.threads[comment.billId];
      if (thread) {
        updateCommentInTree(thread.comments, commentId, (c) => {
          c.upvotes = comment.upvotes;
          c.downvotes = comment.downvotes;
          c.userVote = comment.userVote;
        });
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

    reset: () => initialState,

    resetThread: (state, action: PayloadAction<number>) => {
      const billId = action.payload;
      delete state.threads[billId];

      // Remove associated comments
      Object.keys(state.comments).forEach(commentId => {
        if (state.comments[commentId].billId === billId) {
          delete state.comments[commentId];
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDiscussionData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDiscussionData.fulfilled, (state, action) => {
        const { billId, thread, comments } = action.payload;
        state.loading = false;
        state.threads[billId] = thread;
        comments.forEach((comment: Comment) => storeCommentRecursively(state, comment));
      })
      .addCase(loadDiscussionData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load discussion';
      })

      .addCase(addCommentAsync.fulfilled, (state, action) => {
        discussionSlice.caseReducers.addComment(state, { payload: action.payload, type: 'discussion/addComment' });
      })
      .addCase(addCommentAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      .addCase(voteCommentAsync.fulfilled, (state, action) => {
        const { commentId, updatedComment } = action.payload;
        discussionSlice.caseReducers.updateComment(state, {
          payload: {
            commentId,
            updates: {
              upvotes: updatedComment.upvotes,
              downvotes: updatedComment.downvotes,
              userVote: updatedComment.userVote
            }
          },
          type: 'discussion/updateComment'
        });
      })
      .addCase(voteCommentAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      .addCase(reportCommentAsync.fulfilled, (state, action) => {
        const report = action.payload;
        state.reports[report.id] = report;
        state.pendingReports += 1;

        if (!state.moderationQueue.includes(report.commentId)) {
          state.moderationQueue.push(report.commentId);
        }
      })
      .addCase(reportCommentAsync.rejected, (state, action) => {
        state.error = action.payload as string;
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
  setConnected,
  reset,
  resetThread,
} = discussionSlice.actions;

export default discussionSlice.reducer;

// Optimized selectors with proper memoization
export const selectDiscussionState = (state: RootState) => state.discussion;

export const selectThread = createSelector(
  [selectDiscussionState, (_: RootState, billId: number) => billId],
  (discussion, billId) => discussion.threads[billId] || null
);

export const selectComment = createSelector(
  [selectDiscussionState, (_: RootState, commentId: string) => commentId],
  (discussion, commentId) => discussion.comments[commentId] || null
);

export const selectThreadComments = createSelector(
  [
    selectDiscussionState,
    (_: RootState, billId: number) => billId,
    (_: RootState, __: number, sortBy?: CommentSortOption) => sortBy,
    (_: RootState, __: number, ___?: CommentSortOption, filterBy?: CommentFilterOption) => filterBy
  ],
  (discussion, billId, sortBy, filterBy) => {
    const thread = discussion.threads[billId];
    if (!thread) return [];

    const sort = sortBy || discussion.sortPreference;
    const filter = filterBy || discussion.filterPreference;
    let comments = [...thread.comments];

    // Apply filtering
    if (filter === 'expert_only') {
      comments = comments.filter(c => c.isExpertComment);
    } else if (filter === 'high_quality') {
      comments = comments.filter(c => c.isHighQuality || c.qualityScore > 0.7);
    } else if (filter === 'recent') {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      comments = comments.filter(c => new Date(c.createdAt).getTime() > cutoff);
    }

    // Apply sorting
    const comparators: Record<CommentSortOption, (a: Comment, b: Comment) => number> = {
      oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      most_voted: (a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes),
      controversial: (a, b) => {
        const controversy = (c: Comment) =>
          Math.min(c.upvotes, c.downvotes) / Math.max(c.upvotes + c.downvotes, 1);
        return controversy(b) - controversy(a);
      },
      expert_first: (a, b) => {
        if (a.isExpertComment !== b.isExpertComment) {
          return a.isExpertComment ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    };

    return comments.sort(comparators[sort]);
  }
);

export const selectModerationStats = createSelector(
  [selectDiscussionState],
  (discussion) => ({
    totalReports: Object.keys(discussion.reports).length,
    pendingReports: discussion.pendingReports,
    resolvedReports: Object.values(discussion.reports).filter(r => r.status === 'resolved').length,
    totalActions: Object.keys(discussion.moderationActions).length,
    queueLength: discussion.moderationQueue.length
  })
);