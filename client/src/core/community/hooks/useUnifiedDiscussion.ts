/**
 * Unified Discussion Hook
 * 
 * Consolidates useDiscussion.ts functionality while resolving:
 * - Mock thread creation from comments data (lines 82-96)
 * - Incomplete moderation implementations (lines 217-240)  
 * - Type casting issues (as any usage)
 * - React Query + WebSocket event coordination
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { globalApiClient } from '../../api/client';
import { StateSyncService } from '../services/state-sync.service';
import { WebSocketManager } from '../services/websocket-manager';

import type {
  CreateCommentRequest,
  CreateThreadRequest,
  DiscussionState,
  ModerationRequest,
  UnifiedComment,
  UnifiedThread,
  UpdateCommentRequest,
  UseDiscussionReturn,
} from '../types';

interface UseUnifiedDiscussionOptions {
  billId: number;
  autoSubscribe?: boolean;
  enableTypingIndicators?: boolean;
  enableRealtime?: boolean;
}

export function useUnifiedDiscussion({
  billId,
  autoSubscribe = true,
  enableTypingIndicators = true,
  enableRealtime = true,
}: UseUnifiedDiscussionOptions): UseDiscussionReturn {
  const queryClient = useQueryClient();
  const [discussionState, setDiscussionState] = useState<DiscussionState>({
    currentBillId: String(billId),
    sortBy: 'newest',
    filterBy: 'all',
    showModerated: false,
    autoSubscribe,
    enableTypingIndicators,
  });

  // WebSocket manager for real-time features
  const wsManager = useMemo(() => 
    enableRealtime ? WebSocketManager.getInstance() : null, 
    [enableRealtime]
  );

  // State sync service for coordinating React Query + EventBus
  const stateSyncService = useMemo(() => 
    new StateSyncService(queryClient, wsManager), 
    [queryClient, wsManager]
  );

  // ============================================================================
  // QUERIES (React Query)
  // ============================================================================

  // Fetch comments for the bill
  const {
    data: comments = [],
    isLoading: isLoadingComments,
    error: commentsError,
  } = useQuery({
    queryKey: ['comments', billId, discussionState.sortBy, discussionState.filterBy],
    queryFn: async () => {
      const response = await globalApiClient.get(`/api/bills/${billId}/comments`, {
        params: {
          sort: discussionState.sortBy,
          filter: discussionState.filterBy,
          include_moderated: discussionState.showModerated,
        },
      });
      return response.data as UnifiedComment[];
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch threads for the bill (real threads, not mock ones)
  const {
    data: threads = [],
    isLoading: isLoadingThreads,
    error: threadsError,
  } = useQuery({
    queryKey: ['threads', billId],
    queryFn: async () => {
      const response = await globalApiClient.get(`/api/bills/${billId}/threads`);
      return response.data as UnifiedThread[];
    },
    staleTime: 60000, // 1 minute
  });

  // Current thread (if selected)
  const currentThread = useMemo(() => {
    return discussionState.currentThreadId 
      ? threads.find(t => t.id === discussionState.currentThreadId)
      : undefined;
  }, [threads, discussionState.currentThreadId]);

  // ============================================================================
  // MUTATIONS (Create, Update, Delete)
  // ============================================================================

  const createCommentMutation = useMutation({
    mutationFn: async (data: CreateCommentRequest) => {
      const response = await globalApiClient.post('/api/comments', data);
      return response.data as UnifiedComment;
    },
    onSuccess: (newComment) => {
      // Update React Query cache
      queryClient.setQueryData(
        ['comments', billId, discussionState.sortBy, discussionState.filterBy],
        (old: UnifiedComment[] = []) => [newComment, ...old]
      );
      
      // Sync with WebSocket if enabled
      stateSyncService.syncCommentCreated(newComment);
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async (data: UpdateCommentRequest) => {
      const response = await globalApiClient.put(`/api/comments/${data.commentId}`, {
        content: data.content,
      });
      return response.data as UnifiedComment;
    },
    onSuccess: (updatedComment) => {
      // Update React Query cache
      queryClient.setQueryData(
        ['comments', billId, discussionState.sortBy, discussionState.filterBy],
        (old: UnifiedComment[] = []) => 
          old.map(comment => 
            comment.id === updatedComment.id ? updatedComment : comment
          )
      );
      
      // Sync with WebSocket
      stateSyncService.syncCommentUpdated(updatedComment);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await globalApiClient.delete(`/api/comments/${commentId}`);
      return commentId;
    },
    onSuccess: (commentId) => {
      // Update React Query cache
      queryClient.setQueryData(
        ['comments', billId, discussionState.sortBy, discussionState.filterBy],
        (old: UnifiedComment[] = []) => 
          old.filter(comment => comment.id !== commentId)
      );
      
      // Sync with WebSocket
      stateSyncService.syncCommentDeleted(commentId);
    },
  });

  const voteCommentMutation = useMutation({
    mutationFn: async ({ commentId, vote }: { commentId: string; vote: 'up' | 'down' }) => {
      const response = await globalApiClient.post(`/api/comments/${commentId}/vote`, { vote });
      return response.data as UnifiedComment;
    },
    onSuccess: (updatedComment) => {
      // Update React Query cache
      queryClient.setQueryData(
        ['comments', billId, discussionState.sortBy, discussionState.filterBy],
        (old: UnifiedComment[] = []) => 
          old.map(comment => 
            comment.id === updatedComment.id ? updatedComment : comment
          )
      );
      
      // Sync with WebSocket
      stateSyncService.syncCommentVoted(updatedComment);
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data: CreateThreadRequest) => {
      const response = await globalApiClient.post('/api/threads', data);
      return response.data as UnifiedThread;
    },
    onSuccess: (newThread) => {
      // Update React Query cache
      queryClient.setQueryData(
        ['threads', billId],
        (old: UnifiedThread[] = []) => [newThread, ...old]
      );
      
      // Auto-select the new thread
      setDiscussionState(prev => ({
        ...prev,
        currentThreadId: newThread.id,
      }));
      
      // Sync with WebSocket
      stateSyncService.syncThreadCreated(newThread);
    },
  });

  // Complete moderation implementation (was incomplete in original)
  const reportContentMutation = useMutation({
    mutationFn: async (data: ModerationRequest) => {
      const response = await globalApiClient.post('/api/moderation/report', data);
      return response.data;
    },
    onSuccess: () => {
      // Refresh comments to show updated report status
      queryClient.invalidateQueries({ queryKey: ['comments', billId] });
    },
  });

  // ============================================================================
  // REAL-TIME FEATURES (WebSocket + EventBus coordination)
  // ============================================================================

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!wsManager || !enableRealtime) return;

    const unsubscribers = [
      // Comment events
      wsManager.on('comment:created', (data) => {
        if (data.comment.billId === String(billId)) {
          queryClient.setQueryData(
            ['comments', billId, discussionState.sortBy, discussionState.filterBy],
            (old: UnifiedComment[] = []) => [data.comment, ...old]
          );
        }
      }),

      wsManager.on('comment:updated', (data) => {
        if (data.comment.billId === String(billId)) {
          queryClient.setQueryData(
            ['comments', billId, discussionState.sortBy, discussionState.filterBy],
            (old: UnifiedComment[] = []) => 
              old.map(comment => 
                comment.id === data.comment.id ? data.comment : comment
              )
          );
        }
      }),

      wsManager.on('comment:deleted', (data) => {
        queryClient.setQueryData(
          ['comments', billId, discussionState.sortBy, discussionState.filterBy],
          (old: UnifiedComment[] = []) => 
            old.filter(comment => comment.id !== data.commentId)
        );
      }),

      // Typing indicators
      wsManager.on('user:typing', (data) => {
        if (enableTypingIndicators && data.threadId === discussionState.currentThreadId) {
          setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
        }
      }),

      wsManager.on('user:stopped_typing', (data) => {
        if (enableTypingIndicators && data.threadId === discussionState.currentThreadId) {
          setTypingUsers(prev => prev.filter(id => id !== data.userId));
        }
      }),

      // Active users
      wsManager.on('user:joined', (data) => {
        if (data.threadId === discussionState.currentThreadId) {
          setActiveUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
        }
      }),

      wsManager.on('user:left', (data) => {
        if (data.threadId === discussionState.currentThreadId) {
          setActiveUsers(prev => prev.filter(id => id !== data.userId));
        }
      }),
    ];

    // Join the bill's discussion room
    wsManager.joinRoom(`bill:${billId}`);
    if (discussionState.currentThreadId) {
      wsManager.joinRoom(`thread:${discussionState.currentThreadId}`);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
      wsManager.leaveRoom(`bill:${billId}`);
      if (discussionState.currentThreadId) {
        wsManager.leaveRoom(`thread:${discussionState.currentThreadId}`);
      }
    };
  }, [wsManager, billId, discussionState.currentThreadId, enableRealtime, enableTypingIndicators, queryClient, discussionState.sortBy, discussionState.filterBy]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const createComment = useCallback(async (data: CreateCommentRequest): Promise<UnifiedComment> => {
    return createCommentMutation.mutateAsync(data);
  }, [createCommentMutation]);

  const updateComment = useCallback(async (data: UpdateCommentRequest): Promise<UnifiedComment> => {
    return updateCommentMutation.mutateAsync(data);
  }, [updateCommentMutation]);

  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    await deleteCommentMutation.mutateAsync(commentId);
  }, [deleteCommentMutation]);

  const voteComment = useCallback(async (commentId: string, vote: 'up' | 'down'): Promise<void> => {
    await voteCommentMutation.mutateAsync({ commentId, vote });
  }, [voteCommentMutation]);

  const createThread = useCallback(async (data: CreateThreadRequest): Promise<UnifiedThread> => {
    return createThreadMutation.mutateAsync(data);
  }, [createThreadMutation]);

  const selectThread = useCallback((threadId: string) => {
    setDiscussionState(prev => ({
      ...prev,
      currentThreadId: threadId,
    }));
  }, []);

  const reportContent = useCallback(async (data: ModerationRequest): Promise<void> => {
    await reportContentMutation.mutateAsync(data);
  }, [reportContentMutation]);

  const startTyping = useCallback(() => {
    if (wsManager && enableTypingIndicators && discussionState.currentThreadId) {
      wsManager.emit('user:typing', {
        threadId: discussionState.currentThreadId,
        userId: 'current-user',
        userName: 'Current User',
      });
    }
  }, [wsManager, enableTypingIndicators, discussionState.currentThreadId]);

  const stopTyping = useCallback(() => {
    if (wsManager && enableTypingIndicators && discussionState.currentThreadId) {
      wsManager.emit('user:stopped_typing', {
        threadId: discussionState.currentThreadId,
        userId: 'current-user',
      });
    }
  }, [wsManager, enableTypingIndicators, discussionState.currentThreadId]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // Data
    comments,
    threads,
    currentThread,
    
    // Loading states
    isLoading: isLoadingComments || isLoadingThreads,
    isLoadingComments,
    isLoadingThreads,
    
    // Error states
    error: commentsError?.message || threadsError?.message,
    
    // Actions
    createComment,
    updateComment,
    deleteComment,
    voteComment,
    createThread,
    selectThread,
    reportContent,
    
    // Real-time
    typingUsers,
    activeUsers,
    startTyping,
    stopTyping,
  };
}