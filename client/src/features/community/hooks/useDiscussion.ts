/**
 * useDiscussion Hook - React hook for managing discussion functionality
 *
 * Provides a clean interface for components to interact with discussions,
 * including real-time updates, WebSocket integration, and state management.
 * Now uses React Query instead of Redux for state management.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useComments, useThreads, useThreadParticipation } from './useCommunity';
import { communityWebSocketManager } from '@client/services/CommunityWebSocketManager';
import { eventBus } from '@client/utils/EventBus';
import {
  Comment,
  DiscussionThread,
  CommentFormData,
  ModerationViolationType,
  CommentUpdateEvent,
  ModerationEvent,
  TypingIndicator
} from '@client/types/discussion';

interface UseDiscussionOptions {
  billId: number;
  autoSubscribe?: boolean;
  enableTypingIndicators?: boolean;
}

interface UseDiscussionReturn {
  // Data
  thread: DiscussionThread | null;
  comments: Comment[];
  typingIndicators: TypingIndicator[];
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  addComment: (data: CommentFormData) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  voteComment: (commentId: string, voteType: 'up' | 'down') => Promise<void>;
  reportComment: (commentId: string, violationType: ModerationViolationType, reason: string, description?: string) => Promise<void>;
  moderateComment: (commentId: string, action: string, reason: string) => Promise<void>;
  
  // Real-time features
  sendTypingIndicator: (parentId?: string) => void;
  stopTypingIndicator: (parentId?: string) => void;
  refreshThread: () => Promise<void>;
  
  // Utility
  subscribe: () => void;
  unsubscribe: () => void;
}

export function useDiscussion({
  billId,
  autoSubscribe = true,
  enableTypingIndicators = true
}: UseDiscussionOptions): UseDiscussionReturn {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use React Query hooks instead of Redux
  const commentsQuery = useComments(billId.toString());
  const threadsQuery = useThreads();
  const participationQuery = useThreadParticipation(billId.toString());

  // Extract data from React Query results
  const thread = threadsQuery.threads.data?.find(t => t.id === billId.toString()) || null;
  const comments = commentsQuery.comments.data || [];
  const typingIndicators: TypingIndicator[] = []; // Not implemented in React Query yet
  const loading = commentsQuery.comments.isLoading || threadsQuery.threads.isLoading || false;
  const error = commentsQuery.comments.error?.message || threadsQuery.threads.error?.message || null;

  // Initialize WebSocket manager
  useEffect(() => {
    communityWebSocketManager.connect().catch(console.error);
  }, []);

  // Set up real-time event listeners
  useEffect(() => {
    const handleCommentUpdateEvent = (data: CommentUpdateEvent) => {
      if (data.billId === billId) {
        handleCommentUpdate(data);
      }
    };

    const handleModerationEventUpdate = (data: ModerationEvent) => {
      handleModerationEvent(data);
    };

    const handleTypingUpdate = (data: TypingIndicator[]) => {
      const relevantIndicators = data.filter(indicator => indicator.billId === billId);
      updateTypingIndicators(relevantIndicators);
    };

    // Subscribe to EventBus events
    const unsubscribeComment = eventBus.on('discussionUpdate', handleCommentUpdateEvent);
    const unsubscribeModeration = eventBus.on('moderationUpdate', handleModerationEventUpdate);
    let unsubscribeTyping: (() => void) | undefined;

    if (enableTypingIndicators) {
      unsubscribeTyping = eventBus.on('typingUpdate', handleTypingUpdate);
    }

    return () => {
      unsubscribeComment();
      unsubscribeModeration();
      unsubscribeTyping?.();
    };
  }, [billId, enableTypingIndicators, handleCommentUpdate, handleModerationEvent, updateTypingIndicators]);

  // Load initial thread data
  const loadThread = useCallback(async () => {
    if (!billId) return;

    setLoading(true);
    setError(null);

    try {
      const threadData = await communityApiService.getDiscussionThread(billId);
      setThread(billId, threadData);
    } catch (error) {
      console.error('Failed to load discussion thread:', error);
      setError(error instanceof Error ? error.message : 'Failed to load discussion');
    } finally {
      setLoading(false);
    }
  }, [billId, setLoading, setError, setThread]);

  // Subscribe to real-time updates
  const subscribe = useCallback(() => {
    if (isSubscribed || !billId) return;

    communityWebSocketManager.subscribeToDiscussion(billId);
    setIsSubscribed(true);
  }, [billId, isSubscribed]);

  // Unsubscribe from real-time updates
  const unsubscribe = useCallback(() => {
    if (!isSubscribed || !billId) return;

    // Note: communityWebSocketManager.subscribeToDiscussion returns an unsubscribe function
    // For now, we'll just set the flag. In a full implementation, we'd track the unsubscribe function.
    setIsSubscribed(false);
  }, [billId, isSubscribed]);

  // Auto-subscribe and load thread on mount
  useEffect(() => {
    loadThread();
    
    if (autoSubscribe) {
      subscribe();
    }

    return () => {
      if (autoSubscribe) {
        unsubscribe();
      }
    };
  }, [billId, autoSubscribe, loadThread, subscribe, unsubscribe]);

  // Comment actions
  const addComment = useCallback(async (data: CommentFormData) => {
    try {
      const comment = await communityApiService.addComment({
        billId: data.billId,
        content: data.content,
        parentId: data.parentId,
        mentions: [],
        attachments: []
      });
      addCommentToStore(comment);
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }, [addCommentToStore]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    try {
      const comment = await communityApiService.updateComment(commentId, content);
      updateCommentInStore(commentId, comment);
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  }, [updateCommentInStore]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await communityApiService.deleteComment(commentId);
      removeCommentFromStore(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }, [removeCommentFromStore]);

  const voteComment = useCallback(async (commentId: string, voteType: 'up' | 'down') => {
    try {
      // Optimistic update
      voteCommentInStore(commentId, voteType, 'current-user'); // TODO: Get actual user ID

      // Send to server
      await communityApiService.voteComment(commentId, voteType === 'up' ? 'up' : 'down');
    } catch (error) {
      console.error('Failed to vote on comment:', error);
      // TODO: Revert optimistic update
      throw error;
    }
  }, [voteCommentInStore]);

  const reportComment = useCallback(async (
    commentId: string,
    violationType: ModerationViolationType,
    reason: string,
    description?: string
  ) => {
    try {
      const report = await communityApiService.reportComment({
        commentId,
        violationType: violationType as any,
        reason,
        description
      });
      addReport(report);
    } catch (error) {
      console.error('Failed to report comment:', error);
      throw error;
    }
  }, [addReport]);

  const moderateComment = useCallback(async (commentId: string, action: string, reason: string) => {
    try {
      // Note: communityApiService doesn't have moderateComment, this might need to be added
      // For now, we'll just update the store
      addModerationAction({} as any);

      // Update comment status based on action
      if (action === 'hide') {
        updateCommentInStore(commentId, { status: 'hidden' });
      } else if (action === 'remove') {
        updateCommentInStore(commentId, { status: 'removed' });
      }
    } catch (error) {
      console.error('Failed to moderate comment:', error);
      throw error;
    }
  }, [addModerationAction, updateCommentInStore]);

  // Typing indicators
  const sendTypingIndicator = useCallback((parentId?: string) => {
    if (!enableTypingIndicators) return;

    communityWebSocketManager.sendTypingIndicator(billId, parentId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      communityWebSocketManager.stopTypingIndicator(billId, parentId);
    }, 3000);
  }, [billId, enableTypingIndicators]);

  const stopTypingIndicator = useCallback((parentId?: string) => {
    if (!enableTypingIndicators) return;

    communityWebSocketManager.stopTypingIndicator(billId, parentId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [billId, enableTypingIndicators]);

  // Refresh thread data
  const refreshThread = useCallback(async () => {
    await loadThread();
  }, [loadThread]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Data
    thread,
    comments,
    typingIndicators,
    
    // State
    loading,
    error,
    
    // Actions
    addComment,
    updateComment,
    deleteComment,
    voteComment,
    reportComment,
    moderateComment,
    
    // Real-time features
    sendTypingIndicator,
    stopTypingIndicator,
    refreshThread,
    
    // Utility
    subscribe,
    unsubscribe,
  };
}