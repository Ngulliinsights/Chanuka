/**
 * useDiscussion Hook - React hook for managing discussion functionality
 *
 * Provides a clean interface for components to interact with discussions,
 * including real-time updates, WebSocket integration, and state management.
 * Now uses React Query instead of Redux for state management.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { communityWebSocketManager } from '../../../services/CommunityWebSocketManager';
import { eventBus } from '../../../utils/EventBus';
import {
  Comment,
  DiscussionThread,
  CommentFormData,
  ModerationViolationType,
  CommentUpdateEvent,
  ModerationEvent,
  TypingIndicator
} from '../../../types/discussion';
import { useComments } from '..';

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
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to actual data using useCommunity hooks
  const {
    comments: commentsQuery,
    createComment,
    updateComment: updateCommentMutation,
    deleteComment: deleteCommentMutation,
    voteOnComment
  } = useComments(billId.toString());

  // Extract data and states from React Query
  const comments = (commentsQuery.data || []) as any;
  const loading = commentsQuery.isLoading;
  const error = commentsQuery.error?.message || null;

  // Create a mock thread from the comments data
  const thread: DiscussionThread | null = comments.length > 0 ? {
    id: billId,
    billId,
    comments: comments as any,
    totalComments: comments.length,
    participantCount: new Set(comments.map((c: any) => c.authorId)).size,
    isLocked: false,
    engagementScore: comments.reduce((sum: number, c: any) => sum + (c.upvotes || 0) + (c.downvotes || 0), 0),
    qualityScore: comments.reduce((sum: number, c: any) => sum + (c.qualityScore || 0), 0) / comments.length || 0,
    expertParticipation: (comments.filter((c: any) => c.isExpertComment).length / comments.length) * 100 || 0,
    lastActivity: comments.length > 0 ? comments[0].updatedAt : new Date().toISOString(),
    activeUsers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } : null;

  // Initialize WebSocket manager
  useEffect(() => {
    communityWebSocketManager.connect().catch(console.error);
  }, []);

  // Set up real-time event listeners
  useEffect(() => {
    const handleCommentUpdateEvent = (data: CommentUpdateEvent) => {
      if (data.billId === billId) {
        // Refresh comments when updates occur
        commentsQuery.refetch();
      }
    };

    const handleModerationEventUpdate = (data: ModerationEvent) => {
      // Refresh comments when moderation events occur
      commentsQuery.refetch();
    };

    const handleTypingUpdate = (data: TypingIndicator[]) => {
      // Update typing indicators for this bill
      setTypingIndicators(prev =>
        data.filter(indicator => indicator.billId === billId)
      );
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
  }, [billId, enableTypingIndicators]);

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

  // Auto-subscribe on mount
  useEffect(() => {
    if (autoSubscribe) {
      subscribe();
    }

    return () => {
      if (autoSubscribe) {
        unsubscribe();
      }
    };
  }, [billId, autoSubscribe, subscribe, unsubscribe]);

  // Comment actions - connected to real API
  const addComment = useCallback(async (data: CommentFormData) => {
    try {
      await createComment.mutateAsync({
        bill_id: data.billId,
        content: data.content,
        parent_id: data.parentId
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }, [createComment]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    try {
      await updateCommentMutation.mutateAsync({
        comment_id: commentId,
        request: { content }
      });
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  }, [updateCommentMutation]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteCommentMutation.mutateAsync(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }, [deleteCommentMutation]);

  const voteComment = useCallback(async (commentId: string, voteType: 'up' | 'down') => {
    try {
      await voteOnComment.mutateAsync({
        comment_id: commentId,
        vote_type: voteType
      });
    } catch (error) {
      console.error('Failed to vote on comment:', error);
      throw error;
    }
  }, [voteOnComment]);

  const reportComment = useCallback(async (
    commentId: string,
    violationType: ModerationViolationType,
    reason: string,
    description?: string
  ) => {
    try {
      // This would need to be implemented with a mutation
      console.log('Report comment:', { commentId, violationType, reason, description });
    } catch (error) {
      console.error('Failed to report comment:', error);
      throw error;
    }
  }, []);

  const moderateComment = useCallback(async (commentId: string, action: string, reason: string) => {
    try {
      // Mock implementation
      console.log('Moderate comment:', { commentId, action, reason });
    } catch (error) {
      console.error('Failed to moderate comment:', error);
      throw error;
    }
  }, []);

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
    await commentsQuery.refetch();
  }, [commentsQuery]);

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