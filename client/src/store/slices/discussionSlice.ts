/**
 * Discussion State Management with Zustand
 * 
 * Manages discussion threads, comments, real-time updates,
 * and community moderation for bill discussions.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { mockDataService } from '../../services/mockDataService';
import { 
  DiscussionThread, 
  Comment, 
  CommentReport, 
  ModerationAction,
  CommentUpdateEvent,
  ModerationEvent,
  TypingIndicator,
  CommentSortOption,
  CommentFilterOption
} from '../../types/discussion';

interface DiscussionState {
  // Data
  threads: Record<number, DiscussionThread>; // Keyed by billId
  comments: Record<string, Comment>; // Keyed by commentId
  reports: Record<string, CommentReport>; // Keyed by reportId
  moderationActions: Record<string, ModerationAction>; // Keyed by actionId

  // UI State
  loading: boolean;
  error: string | null;

  // Real-time state
  typingIndicators: TypingIndicator[];
  lastUpdateTime: string | null;

  // User preferences
  sortPreference: CommentSortOption;
  filterPreference: CommentFilterOption;
  
  // Moderation state
  pendingReports: number;
  moderationQueue: string[]; // Comment IDs requiring moderation
}

interface DiscussionActions {
  // Thread management
  setThread: (billId: number, thread: DiscussionThread) => void;
  updateThread: (billId: number, updates: Partial<DiscussionThread>) => void;
  
  // Comment management
  addComment: (comment: Comment) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  removeComment: (commentId: string) => void;
  voteComment: (commentId: string, voteType: 'up' | 'down', userId: string) => void;
  
  // Real-time updates
  handleCommentUpdate: (event: CommentUpdateEvent) => void;
  handleModerationEvent: (event: ModerationEvent) => void;
  updateTypingIndicators: (indicators: TypingIndicator[]) => void;
  
  // Reporting and moderation
  addReport: (report: CommentReport) => void;
  updateReport: (reportId: string, updates: Partial<CommentReport>) => void;
  addModerationAction: (action: ModerationAction) => void;
  
  // User preferences
  setSortPreference: (sort: CommentSortOption) => void;
  setFilterPreference: (filter: CommentFilterOption) => void;
  
  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Mock data integration
  loadMockData: () => Promise<void>;
  loadThreadData: (billId: number) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Utility actions
  reset: () => void;
  resetThread: (billId: number) => void;
}

const initialState: DiscussionState = {
  // Data
  threads: {},
  comments: {},
  reports: {},
  moderationActions: {},

  // UI State
  loading: false,
  error: null,

  // Real-time state
  typingIndicators: [],
  lastUpdateTime: null,

  // User preferences
  sortPreference: 'newest',
  filterPreference: 'all',
  
  // Moderation state
  pendingReports: 0,
  moderationQueue: [],
};

export const useDiscussionStore = create<DiscussionState & DiscussionActions>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Thread management
      setThread: (billId, thread) => set((state) => {
        state.threads[billId] = thread;
        
        // Also store individual comments for easier access
        const storeComment = (comment: Comment) => {
          state.comments[comment.id] = comment;
          comment.replies.forEach(storeComment);
        };
        
        thread.comments.forEach(storeComment);
      }),

      updateThread: (billId, updates) => set((state) => {
        if (state.threads[billId]) {
          Object.assign(state.threads[billId], updates);
        }
      }),

      // Comment management
      addComment: (comment) => set((state) => {
        state.comments[comment.id] = comment;
        
        // Add to appropriate thread
        const thread = state.threads[comment.billId];
        if (thread) {
          if (comment.parentId) {
            // Find parent comment and add as reply
            const addToParent = (comments: Comment[]): boolean => {
              for (const c of comments) {
                if (c.id === comment.parentId) {
                  c.replies.push(comment);
                  c.replyCount += 1;
                  return true;
                }
                if (addToParent(c.replies)) return true;
              }
              return false;
            };
            addToParent(thread.comments);
          } else {
            // Add as top-level comment
            thread.comments.unshift(comment);
          }
          
          thread.totalComments += 1;
          thread.lastActivity = comment.createdAt;
        }
      }),

      updateComment: (commentId, updates) => set((state) => {
        const comment = state.comments[commentId];
        if (comment) {
          Object.assign(comment, updates);
          
          // Update in thread structure as well
          const updateInThread = (comments: Comment[]): boolean => {
            for (const c of comments) {
              if (c.id === commentId) {
                Object.assign(c, updates);
                return true;
              }
              if (updateInThread(c.replies)) return true;
            }
            return false;
          };
          
          const thread = state.threads[comment.billId];
          if (thread) {
            updateInThread(thread.comments);
          }
        }
      }),

      removeComment: (commentId) => set((state) => {
        const comment = state.comments[commentId];
        if (!comment) return;
        
        // Mark as removed instead of deleting to preserve thread structure
        comment.status = 'removed';
        comment.content = '[Comment removed]';
        
        // Update in thread structure
        const updateInThread = (comments: Comment[]): boolean => {
          for (const c of comments) {
            if (c.id === commentId) {
              c.status = 'removed';
              c.content = '[Comment removed]';
              return true;
            }
            if (updateInThread(c.replies)) return true;
          }
          return false;
        };
        
        const thread = state.threads[comment.billId];
        if (thread) {
          updateInThread(thread.comments);
        }
      }),

      voteComment: (commentId, voteType, _userId) => set((state) => {
        const comment = state.comments[commentId];
        if (!comment) return;
        
        const previousVote = comment.userVote;
        
        // Update vote counts
        if (previousVote === voteType) {
          // Remove vote
          if (voteType === 'up') {
            comment.upvotes -= 1;
          } else {
            comment.downvotes -= 1;
          }
          comment.userVote = null;
        } else {
          // Add new vote, remove previous if exists
          if (previousVote === 'up') {
            comment.upvotes -= 1;
          } else if (previousVote === 'down') {
            comment.downvotes -= 1;
          }
          
          if (voteType === 'up') {
            comment.upvotes += 1;
          } else {
            comment.downvotes += 1;
          }
          comment.userVote = voteType;
        }
        
        // Update in thread structure
        const updateInThread = (comments: Comment[]): boolean => {
          for (const c of comments) {
            if (c.id === commentId) {
              c.upvotes = comment.upvotes;
              c.downvotes = comment.downvotes;
              c.userVote = comment.userVote;
              return true;
            }
            if (updateInThread(c.replies)) return true;
          }
          return false;
        };
        
        const thread = state.threads[comment.billId];
        if (thread) {
          updateInThread(thread.comments);
        }
      }),

      // Real-time updates
      handleCommentUpdate: (event) => set((state) => {
        state.lastUpdateTime = event.timestamp;
        
        switch (event.type) {
          case 'comment_added':
            if (event.comment) {
              // Add comment using existing action
              const addComment = get().addComment;
              addComment(event.comment);
            }
            break;
            
          case 'comment_updated':
            if (event.comment) {
              const updateComment = get().updateComment;
              updateComment(event.commentId, event.comment);
            }
            break;
            
          case 'comment_removed':
            const removeComment = get().removeComment;
            removeComment(event.commentId);
            break;
            
          case 'comment_voted':
            // Vote updates would be handled by the vote action
            break;
        }
      }),

      handleModerationEvent: (event) => set((state) => {
        state.lastUpdateTime = event.timestamp;
        
        switch (event.type) {
          case 'comment_reported':
            if (event.commentId) {
              state.pendingReports += 1;
              if (!state.moderationQueue.includes(event.commentId)) {
                state.moderationQueue.push(event.commentId);
              }
            }
            break;
            
          case 'comment_moderated':
            if (event.commentId) {
              const index = state.moderationQueue.indexOf(event.commentId);
              if (index > -1) {
                state.moderationQueue.splice(index, 1);
              }
              state.pendingReports = Math.max(0, state.pendingReports - 1);
            }
            break;
        }
      }),

      updateTypingIndicators: (indicators) => set((state) => {
        state.typingIndicators = indicators;
      }),

      // Reporting and moderation
      addReport: (report) => set((state) => {
        state.reports[report.id] = report;
        state.pendingReports += 1;
        
        if (!state.moderationQueue.includes(report.commentId)) {
          state.moderationQueue.push(report.commentId);
        }
      }),

      updateReport: (reportId, updates) => set((state) => {
        const report = state.reports[reportId];
        if (report) {
          Object.assign(report, updates);
          
          // Update pending count if status changed
          if (updates.status && updates.status !== 'pending' && report.status === 'pending') {
            state.pendingReports = Math.max(0, state.pendingReports - 1);
          }
        }
      }),

      addModerationAction: (action) => set((state) => {
        state.moderationActions[action.id] = action;
        
        // Remove from moderation queue
        const index = state.moderationQueue.indexOf(action.commentId);
        if (index > -1) {
          state.moderationQueue.splice(index, 1);
        }
      }),

      // User preferences
      setSortPreference: (sort) => set((state) => {
        state.sortPreference = sort;
      }),

      setFilterPreference: (filter) => set((state) => {
        state.filterPreference = filter;
      }),

      // Loading and error states
      setLoading: (loading) => set((state) => {
        state.loading = loading;
      }),

      setError: (error) => set((state) => {
        state.error = error;
      }),

      // Utility actions
      reset: () => set(() => ({ ...initialState })),

      resetThread: (billId) => set((state) => {
        delete state.threads[billId];
        
        // Remove comments for this thread
        Object.keys(state.comments).forEach(commentId => {
          if (state.comments[commentId].billId === billId) {
            delete state.comments[commentId];
          }
        });
      }),
    })),
    {
      name: 'discussion-store',
    }
  )
);

// Selectors for computed values
export const useDiscussionSelectors = () => {
  const state = useDiscussionStore();

  // Get thread by bill ID
  const getThread = (billId: number): DiscussionThread | null => {
    return state.threads[billId] || null;
  };

  // Get comment by ID
  const getComment = (commentId: string): Comment | null => {
    return state.comments[commentId] || null;
  };

  // Get comments for a thread with sorting and filtering
  const getThreadComments = (
    billId: number, 
    sortBy: CommentSortOption = state.sortPreference,
    filterBy: CommentFilterOption = state.filterPreference
  ): Comment[] => {
    const thread = state.threads[billId];
    if (!thread) return [];

    let comments = [...thread.comments];

    // Apply filters
    switch (filterBy) {
      case 'expert_only':
        comments = comments.filter(comment => comment.isExpertComment);
        break;
      case 'high_quality':
        comments = comments.filter(comment => comment.isHighQuality || comment.qualityScore > 0.7);
        break;
      case 'recent':
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        comments = comments.filter(comment => new Date(comment.createdAt) > oneDayAgo);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'newest':
        comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'most_voted':
        comments.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
        break;
      case 'controversial':
        comments.sort((a, b) => {
          const aControversy = Math.min(a.upvotes, a.downvotes) / Math.max(a.upvotes + a.downvotes, 1);
          const bControversy = Math.min(b.upvotes, b.downvotes) / Math.max(b.upvotes + b.downvotes, 1);
          return bControversy - aControversy;
        });
        break;
      case 'expert_first':
        comments.sort((a, b) => {
          if (a.isExpertComment && !b.isExpertComment) return -1;
          if (!a.isExpertComment && b.isExpertComment) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
    }

    return comments;
  };

  // Get typing indicators for a thread
  const getTypingIndicators = (billId: number): TypingIndicator[] => {
    return state.typingIndicators.filter(indicator => indicator.billId === billId);
  };

  // Get moderation statistics
  const getModerationStats = () => {
    const reports = Object.values(state.reports);
    const actions = Object.values(state.moderationActions);
    
    return {
      totalReports: reports.length,
      pendingReports: state.pendingReports,
      resolvedReports: reports.filter(r => r.status === 'resolved').length,
      totalActions: actions.length,
      queueLength: state.moderationQueue.length
    };
  };

  return {
    ...state,
    getThread,
    getComment,
    getThreadComments,
    getTypingIndicators,
    getModerationStats,
  };
};