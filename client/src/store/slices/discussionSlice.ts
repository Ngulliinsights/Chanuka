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
import { communityRepository } from '../../repositories';
import { communityWebSocketExtension } from '../../services/community-websocket-extension';
import { communityWebSocketMiddleware } from '../../services/community-websocket-middleware';
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

  // Real-time connection state
  isConnected: boolean;
  cleanupFunctions?: (() => void)[];
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
  
  // Backend integration
  loadBackendData: (billId: number) => Promise<void>;
  addBackendComment: (data: CommentFormData) => Promise<Comment>;
  voteBackendComment: (commentId: string, voteType: 'up' | 'down') => Promise<void>;
  reportBackendComment: (commentId: string, violationType: ModerationViolationType, reason: string, description?: string) => Promise<void>;
  
  // Mock data integration (fallback)
  loadMockData: () => Promise<void>;
  loadThreadData: (billId: number) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Real-time integration
  initializeRealTime: () => void;
  cleanupRealTime: () => void;
  
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

      // Backend integration
      loadBackendData: async (billId) => {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        try {
          // Initialize backend service if not already done
          await communityBackendService.initialize();

          // Load discussion thread and comments
          const [thread, comments] = await Promise.all([
            communityBackendService.getDiscussionThread(billId),
            communityBackendService.getBillComments(billId, {
              sort: get().sortPreference,
              limit: 50 // Load more comments initially
            })
          ]);

          set((state) => {
            // Set thread data
            state.threads[billId] = {
              ...thread,
              comments: comments
            };

            // Store individual comments for easier access
            const storeComment = (comment: Comment) => {
              state.comments[comment.id] = comment;
              comment.replies.forEach(storeComment);
            };
            
            comments.forEach(storeComment);
            
            state.loading = false;
            state.error = null;
            state.lastUpdateTime = new Date().toISOString();
          });

          // Subscribe to real-time updates for this discussion
          communityBackendService.subscribeToDiscussion(billId);

        } catch (error) {
          console.warn('Backend discussion loading failed, falling back to mock data:', error);
          
          // Fallback to mock data
          const { loadThreadData } = get();
          await loadThreadData(billId);
        }
      },

      addBackendComment: async (data) => {
        try {
          const comment = await communityBackendService.addComment(data);
          
          // Add to local state
          const { addComment } = get();
          addComment(comment);
          
          return comment;
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to add comment';
          });
          throw error;
        }
      },

      voteBackendComment: async (commentId, voteType) => {
        try {
          const updatedComment = await communityBackendService.voteComment(commentId, voteType);
          
          // Update local state
          const { updateComment } = get();
          updateComment(commentId, {
            upvotes: updatedComment.upvotes,
            downvotes: updatedComment.downvotes,
            userVote: updatedComment.userVote
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to vote on comment';
          });
          throw error;
        }
      },

      reportBackendComment: async (commentId, violationType, reason, description) => {
        try {
          const report = await communityBackendService.reportComment(commentId, violationType, reason, description);
          
          // Add to local state
          const { addReport } = get();
          addReport(report);
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to report comment';
          });
          throw error;
        }
      },

      // Real-time integration
      initializeRealTime: async () => {
        try {
          // Initialize community WebSocket middleware for discussions
          await communityWebSocketMiddleware.initialize({
            enableDiscussions: true,
            enableModerationEvents: true,
            enableNotifications: true,
            enableCommunityAnalytics: false, // Handled by community slice
            enableExpertUpdates: false, // Handled by community slice
          });

          // Set up event listeners for discussion updates
          const handleCommentAdded = (event: CustomEvent) => {
            const { addComment } = get();
            if (event.detail.comment) {
              addComment(event.detail.comment);
            }
          };

          const handleCommentUpdated = (event: CustomEvent) => {
            const { updateComment } = get();
            updateComment(event.detail.commentId, event.detail.updates);
          };

          const handleCommentVoted = (event: CustomEvent) => {
            const { updateComment } = get();
            updateComment(event.detail.commentId, {
              upvotes: event.detail.newCounts.upvotes,
              downvotes: event.detail.newCounts.downvotes
            });
          };

          const handleTypingIndicator = (event: CustomEvent) => {
            const { updateTypingIndicators } = get();
            const currentIndicators = get().typingIndicators;
            const data = event.detail;
            
            if (data.isTyping) {
              // Add or update typing indicator
              const existingIndex = currentIndicators.findIndex(
                i => i.userId === data.userId && i.billId === data.billId && i.parentId === data.parentId
              );
              
              const indicator = {
                userId: data.userId,
                userName: data.userName,
                billId: data.billId,
                parentId: data.parentId,
                timestamp: data.timestamp
              };
              
              if (existingIndex >= 0) {
                currentIndicators[existingIndex] = indicator;
              } else {
                currentIndicators.push(indicator);
              }
            } else {
              // Remove typing indicator
              const filteredIndicators = currentIndicators.filter(
                i => !(i.userId === data.userId && i.billId === data.billId && i.parentId === data.parentId)
              );
              updateTypingIndicators(filteredIndicators);
              return;
            }
            
            updateTypingIndicators([...currentIndicators]);
          };

          const handleCommentReported = (event: CustomEvent) => {
            set((state) => {
              state.pendingReports += 1;
              if (!state.moderationQueue.includes(event.detail.commentId)) {
                state.moderationQueue.push(event.detail.commentId);
              }
            });
          };

          const handleModerationAction = (event: CustomEvent) => {
            const { addModerationAction } = get();
            const data = event.detail;
            addModerationAction({
              id: `action_${Date.now()}`,
              commentId: data.commentId,
              moderatorId: 'system', // This would come from the event data
              action: data.action,
              reason: data.reason,
              createdAt: data.timestamp,
              appealable: true
            });
          };

          // Add event listeners
          window.addEventListener('community:comment_added', handleCommentAdded);
          window.addEventListener('community:comment_updated', handleCommentUpdated);
          window.addEventListener('community:comment_voted', handleCommentVoted);
          window.addEventListener('community:typing_indicator', handleTypingIndicator);
          window.addEventListener('community:comment_reported', handleCommentReported);
          window.addEventListener('community:moderation_action', handleModerationAction);

          // Store cleanup functions
          set((state) => {
            state.isConnected = true;
            state.cleanupFunctions = [
              () => window.removeEventListener('community:comment_added', handleCommentAdded),
              () => window.removeEventListener('community:comment_updated', handleCommentUpdated),
              () => window.removeEventListener('community:comment_voted', handleCommentVoted),
              () => window.removeEventListener('community:typing_indicator', handleTypingIndicator),
              () => window.removeEventListener('community:comment_reported', handleCommentReported),
              () => window.removeEventListener('community:moderation_action', handleModerationAction),
            ];
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to initialize real-time updates';
            state.isConnected = false;
          });
        }
      },

      cleanupRealTime: () => {
        const { cleanupFunctions } = get();
        
        // Clean up event listeners
        if (cleanupFunctions) {
          cleanupFunctions.forEach(cleanup => cleanup());
        }

        // Clean up middleware (only if no other slices are using it)
        // communityWebSocketMiddleware.cleanup();
        
        set((state) => {
          state.isConnected = false;
          state.cleanupFunctions = undefined;
        });
      },

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