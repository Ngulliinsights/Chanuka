/**
 * Unified Discussion Hook
 *
 * Consolidates useDiscussion.ts functionality while resolving:
 * - Mock thread creation from comments data (lines 82-96)
 * - Incomplete moderation implementations (lines 217-240)
 * - Type casting issues (as unknown usage)
 * - React Query + WebSocket event coordination
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { globalApiClient } from '../../../infrastructure/api/client';
import { StateSyncService } from '../../../infrastructure/community/services/state-sync.service';
import { WebSocketManager } from '@client/services/websocket-manager';
import type {
  CreateCommentRequest,
  CreateThreadRequest,
  DiscussionViewState,
  ModerationActionRequest,
  ModerationRequest,
  UnifiedComment,
  UnifiedModeration,
  UnifiedThread,
  UpdateCommentRequest,
  UseDiscussionReturn,
} from '../../../infrastructure/community/types';

// ============================================================================
// LOCAL TYPE AUGMENTATIONS
// Extends UnifiedComment with fields the API returns but the shared type omits.
// Remove these once UnifiedComment is updated upstream.
// ============================================================================

interface CommentVotes {
  up: number;
  down: number;
}

/**
 * Augmented comment type that includes fields present in API responses but not
 * yet reflected in the shared UnifiedComment interface. Using intersection
 * rather than casting so all other UnifiedComment fields remain strongly typed.
 */
type EnrichedComment = UnifiedComment & {
  id: string;
  authorId: string;
  votes: CommentVotes;
  isAuthorExpert: boolean;
  updatedAt: string;
};

// ============================================================================
// WEBSOCKET EVENT PAYLOAD TYPES
// ============================================================================

interface WsCommentPayload extends EnrichedComment {
  billId: number | string;
}

interface WsCommentDeletedPayload {
  id: string;
}

interface WsTypingPayload {
  threadId: number | string | undefined;
  userId: number | string;
  userName: string;
}

interface WsTypingStopPayload {
  threadId: number | string | undefined;
  userId: number | string;
}

interface WsPresencePayload {
  threadId: number | string | undefined;
  userId: number | string;
  status: 'online' | 'offline';
}

// ============================================================================
// HOOK OPTIONS
// ============================================================================

interface UseUnifiedDiscussionOptions {
  billId: number;
  autoSubscribe?: boolean;
  enableTypingIndicators?: boolean;
  enableRealtime?: boolean;
}

// Placeholder user ID used when the current user's ID is not yet resolved.
// Replace with a real auth context lookup when available.
const CURRENT_USER_ID = 0;

export function useUnifiedDiscussion({
  billId,
  autoSubscribe = true,
  enableTypingIndicators = true,
  enableRealtime = true,
}: UseUnifiedDiscussionOptions): UseDiscussionReturn {
  const queryClient = useQueryClient();

  const [discussionState, setDiscussionState] = useState<DiscussionViewState>({
    currentBillId: String(billId),
    sortBy: 'newest',
    filterBy: 'all',
    showModerated: false,
    autoSubscribe,
    enableTypingIndicators,
  });

  const wsManager = useMemo(
    () => (enableRealtime ? WebSocketManager.getInstance() : null),
    [enableRealtime]
  );

  const stateSyncService = useMemo(
    () => new StateSyncService(queryClient, wsManager),
    [queryClient, wsManager]
  );

  const commentsQueryKey = useMemo(
    () => ['comments', billId, discussionState.sortBy, discussionState.filterBy] as const,
    [billId, discussionState.sortBy, discussionState.filterBy]
  );

  // ============================================================================
  // QUERIES
  // ============================================================================

  const {
    data: comments = [],
    isLoading: isLoadingComments,
    error: commentsError,
  } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      const response = await globalApiClient.get(`/api/bills/${billId}/comments`, {
        params: {
          sort: discussionState.sortBy,
          filter: discussionState.filterBy,
          include_moderated: discussionState.showModerated,
        },
      });
      return response.data as EnrichedComment[];
    },
    staleTime: 30_000,
  });

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
    staleTime: 60_000,
  });

  const currentThread = useMemo(
    () =>
      discussionState.currentThreadId
        ? threads.find(t => t.id === discussionState.currentThreadId)
        : undefined,
    [threads, discussionState.currentThreadId]
  );

  // ============================================================================
  // CACHE HELPERS
  // ============================================================================

  const prependComment = useCallback(
    (newComment: EnrichedComment) => {
      queryClient.setQueryData(
        commentsQueryKey,
        (old: EnrichedComment[] = []) => [newComment, ...old]
      );
    },
    [queryClient, commentsQueryKey]
  );

  const replaceComment = useCallback(
    (updated: EnrichedComment) => {
      queryClient.setQueryData(
        commentsQueryKey,
        (old: EnrichedComment[] = []) =>
          old.map(c => (c.id === updated.id ? updated : c))
      );
    },
    [queryClient, commentsQueryKey]
  );

  const removeComment = useCallback(
    (commentId: string) => {
      queryClient.setQueryData(
        commentsQueryKey,
        (old: EnrichedComment[] = []) =>
          old.filter(c => String(c.id) !== String(commentId))
      );
    },
    [queryClient, commentsQueryKey]
  );

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const createCommentMutation = useMutation({
    mutationFn: async (data: CreateCommentRequest) => {
      const response = await globalApiClient.post('/api/comments', data);
      return response.data as EnrichedComment;
    },
    onSuccess: newComment => {
      prependComment(newComment);
      stateSyncService.syncCommentCreated(newComment);
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async (data: UpdateCommentRequest) => {
      const response = await globalApiClient.put(`/api/comments/${data.commentId}`, {
        content: data.content,
      });
      return response.data as EnrichedComment;
    },
    onSuccess: updatedComment => {
      replaceComment(updatedComment);
      stateSyncService.syncCommentUpdated(updatedComment);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await globalApiClient.delete(`/api/comments/${commentId}`);
      return commentId;
    },
    onSuccess: commentId => {
      removeComment(commentId);
      stateSyncService.syncCommentDeleted(commentId);
    },
  });

  const voteCommentMutation = useMutation({
    mutationFn: async ({ commentId, vote }: { commentId: string; vote: 'up' | 'down' }) => {
      const response = await globalApiClient.post(`/api/comments/${commentId}/vote`, { vote });
      return response.data as EnrichedComment;
    },
    onSuccess: updatedComment => {
      replaceComment(updatedComment);
      stateSyncService.syncCommentVoted(updatedComment);
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data: CreateThreadRequest) => {
      const response = await globalApiClient.post('/api/threads', data);
      return response.data as UnifiedThread;
    },
    onSuccess: newThread => {
      queryClient.setQueryData(
        ['threads', billId],
        (old: UnifiedThread[] = []) => [newThread, ...old]
      );
      setDiscussionState(prev => ({ ...prev, currentThreadId: newThread.id }));
      stateSyncService.syncThreadCreated(newThread);
    },
  });

  const reportContentMutation = useMutation({
    mutationFn: async (data: ModerationRequest) => {
      const response = await globalApiClient.post('/api/moderation/report', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', billId] });
    },
  });

  /**
   * Moderator action mutation.
   *
   * Posts to POST /api/moderation/action, receives a UnifiedModeration record,
   * then delegates cache invalidation and WebSocket broadcast to StateSyncService.
   */
  const moderateContentMutation = useMutation({
    mutationFn: async (data: ModerationActionRequest) => {
      const response = await globalApiClient.post('/api/moderation/action', data);
      return response.data as UnifiedModeration;
    },
    onSuccess: moderation => {
      stateSyncService.syncModerationAction(moderation, billId);
    },
  });

  // ============================================================================
  // REAL-TIME FEATURES
  // ============================================================================

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!wsManager || !enableRealtime) return;

    const unsubscribers = [
      wsManager.on('comment:new', (payload: unknown) => {
        const comment = payload as WsCommentPayload;
        if (String(comment.billId) === String(billId)) {
          prependComment(comment);
        }
      }),

      wsManager.on('comment:updated', (payload: unknown) => {
        const updatedComment = payload as WsCommentPayload;
        if (String(updatedComment.billId) === String(billId)) {
          replaceComment(updatedComment);
        }
      }),

      wsManager.on('comment:deleted', (payload: unknown) => {
        const { id } = payload as WsCommentDeletedPayload;
        removeComment(id);
      }),

      wsManager.on('typing:indicator', (payload: unknown) => {
        const data = payload as WsTypingPayload;
        if (enableTypingIndicators && data.threadId === discussionState.currentThreadId) {
          const userIdStr = String(data.userId);
          setTypingUsers(prev => [...prev.filter(id => id !== userIdStr), userIdStr]);
        }
      }),

      // Clear the typing indicator immediately when a peer explicitly stops.
      wsManager.on('typing:stop', (payload: unknown) => {
        const data = payload as WsTypingStopPayload;
        if (enableTypingIndicators && data.threadId === discussionState.currentThreadId) {
          const userIdStr = String(data.userId);
          setTypingUsers(prev => prev.filter(id => id !== userIdStr));
        }
      }),

      wsManager.on('presence:update', (payload: unknown) => {
        const data = payload as WsPresencePayload;
        if (data.threadId === discussionState.currentThreadId) {
          const userIdStr = String(data.userId);
          if (data.status === 'online') {
            setActiveUsers(prev => [...prev.filter(id => id !== userIdStr), userIdStr]);
          } else {
            setActiveUsers(prev => prev.filter(id => id !== userIdStr));
          }
        }
      }),
    ];

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
  }, [
    wsManager,
    billId,
    discussionState.currentThreadId,
    enableRealtime,
    enableTypingIndicators,
    prependComment,
    replaceComment,
    removeComment,
  ]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const createComment = useCallback(
    (data: CreateCommentRequest): Promise<UnifiedComment> =>
      createCommentMutation.mutateAsync(data),
    [createCommentMutation]
  );

  const updateComment = useCallback(
    (data: UpdateCommentRequest): Promise<UnifiedComment> =>
      updateCommentMutation.mutateAsync(data),
    [updateCommentMutation]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      await deleteCommentMutation.mutateAsync(commentId);
    },
    [deleteCommentMutation]
  );

  const voteComment = useCallback(
    async (commentId: string, vote: 'up' | 'down'): Promise<void> => {
      await voteCommentMutation.mutateAsync({ commentId, vote });
    },
    [voteCommentMutation]
  );

  const createThread = useCallback(
    (data: CreateThreadRequest): Promise<UnifiedThread> =>
      createThreadMutation.mutateAsync(data),
    [createThreadMutation]
  );

  const selectThread = useCallback((threadId: number) => {
    setDiscussionState(prev => ({ ...prev, currentThreadId: threadId }));
  }, []);

  const reportContent = useCallback(
    async (data: ModerationRequest): Promise<void> => {
      await reportContentMutation.mutateAsync(data);
    },
    [reportContentMutation]
  );

  const moderateContent = useCallback(
    async (data: ModerationActionRequest): Promise<void> => {
      await moderateContentMutation.mutateAsync(data);
    },
    [moderateContentMutation]
  );

  /**
   * Manually invalidate the comment cache for this bill.
   * Useful for components that need an explicit escape hatch beyond React
   * Query's automatic background refetching.
   */
  const invalidateComments = useCallback((): void => {
    stateSyncService.invalidateRelatedQueries(billId);
  }, [stateSyncService, billId]);

  const startTyping = useCallback(() => {
    if (wsManager && enableTypingIndicators && discussionState.currentThreadId) {
      wsManager.emit('typing:indicator', {
        threadId: discussionState.currentThreadId,
        userId: CURRENT_USER_ID,
        userName: 'Current User', // Replace with real auth context when available
      } satisfies WsTypingPayload);
    }
  }, [wsManager, enableTypingIndicators, discussionState.currentThreadId]);

  /**
   * Emit an explicit stop signal so peers clear the typing indicator
   * immediately rather than waiting for the server-side timeout.
   */
  const stopTyping = useCallback(() => {
    if (wsManager && enableTypingIndicators && discussionState.currentThreadId) {
      wsManager.emit('typing:stop', {
        threadId: discussionState.currentThreadId,
        userId: CURRENT_USER_ID,
      } satisfies WsTypingStopPayload);
    }
  }, [wsManager, enableTypingIndicators, discussionState.currentThreadId]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    comments,
    threads,
    currentThread,

    isLoading: isLoadingComments || isLoadingThreads,
    isLoadingComments,
    isLoadingThreads,

    error: commentsError?.message ?? threadsError?.message,

    createComment,
    updateComment,
    deleteComment,
    voteComment,
    createThread,
    selectThread,
    reportContent,
    moderateContent,

    invalidateComments,

    typingUsers,
    activeUsers,
    startTyping,
    stopTyping,
  };
}