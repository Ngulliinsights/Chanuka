/**
 * useDiscussion Hook - React hook for managing discussion functionality
 * 
 * Provides a clean interface for components to interact with discussions,
 * including real-time updates, WebSocket integration, and state management.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  selectDiscussionState, 
  selectThread, 
  selectComment, 
  selectThreadComments,
  loadDiscussionData,
  addCommentAsync,
  voteCommentAsync,
  reportCommentAsync,
  setLoading,
  setError
} from '../store/slices/discussionSlice';
import { discussionService } from '../services/discussion-service';
import { 
  CommentFormData, 
  ModerationViolationType,
  CommentUpdateEvent,
  ModerationEvent,
  TypingIndicator
} from '../types/discussion';

interface UseDiscussionOptions {
  billId: number;
  autoSubscribe?: boolean;
  enableTypingIndicators?: boolean;
}

interface UseDiscussionReturn {
  // Data
  thread: ReturnType<typeof useDiscussionSelectors>['getThread'];
  comments: ReturnType<typeof useDiscussionSelectors>['getThreadComments'];
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
  
  // Store selectors and actions
  const {
    getThread,
    getThreadComments,
    getTypingIndicators,
    loading,
    error,
    setLoading,
    setError,
    setThread,
    handleCommentUpdate,
    handleModerationEvent,
    updateTypingIndicators,
    addComment: addCommentToStore,
    updateComment: updateCommentInStore,
    removeComment: removeCommentFromStore,
    voteComment: voteCommentInStore,
    addReport,
    addModerationAction,
  } = useDiscussionSelectors();

  // Get current thread and comments
  const thread = getThread(billId);
  const comments = getThreadComments(billId);
  const typingIndicators = getTypingIndicators(billId);

  // Initialize discussion service
  useEffect(() => {
    discussionService.initialize().catch(console.error);
  }, []);

  // Set up real-time event listeners
  useEffect(() => {
    const handleCommentUpdateEvent = (event: CustomEvent<CommentUpdateEvent>) => {
      if (event.detail.billId === billId) {
        handleCommentUpdate(event.detail);
      }
    };

    const handleModerationEventUpdate = (event: CustomEvent<ModerationEvent>) => {
      handleModerationEvent(event.detail);
    };

    const handleTypingUpdate = (event: CustomEvent<TypingIndicator[]>) => {
      const relevantIndicators = event.detail.filter(indicator => indicator.billId === billId);
      updateTypingIndicators(relevantIndicators);
    };

    // Add event listeners
    window.addEventListener('discussionUpdate', handleCommentUpdateEvent as EventListener);
    window.addEventListener('moderationUpdate', handleModerationEventUpdate as EventListener);
    
    if (enableTypingIndicators) {
      window.addEventListener('typingUpdate', handleTypingUpdate as EventListener);
    }

    return () => {
      window.removeEventListener('discussionUpdate', handleCommentUpdateEvent as EventListener);
      window.removeEventListener('moderationUpdate', handleModerationEventUpdate as EventListener);
      
      if (enableTypingIndicators) {
        window.removeEventListener('typingUpdate', handleTypingUpdate as EventListener);
      }
    };
  }, [billId, enableTypingIndicators, handleCommentUpdate, handleModerationEvent, updateTypingIndicators]);

  // Load initial thread data
  const loadThread = useCallback(async () => {
    if (!billId) return;

    setLoading(true);
    setError(null);

    try {
      const threadData = await discussionService.getDiscussionThread(billId);
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

    discussionService.subscribeToDiscussion(billId);
    setIsSubscribed(true);
  }, [billId, isSubscribed]);

  // Unsubscribe from real-time updates
  const unsubscribe = useCallback(() => {
    if (!isSubscribed || !billId) return;

    discussionService.unsubscribeFromDiscussion(billId);
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
      const comment = await discussionService.addComment(data);
      addCommentToStore(comment);
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }, [addCommentToStore]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    try {
      const comment = await discussionService.updateComment(commentId, content);
      updateCommentInStore(commentId, comment);
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  }, [updateCommentInStore]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await discussionService.deleteComment(commentId);
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
      await discussionService.voteComment(commentId, voteType);
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
      const report = await discussionService.reportComment(commentId, violationType, reason, description);
      addReport(report);
    } catch (error) {
      console.error('Failed to report comment:', error);
      throw error;
    }
  }, [addReport]);

  const moderateComment = useCallback(async (commentId: string, action: string, reason: string) => {
    try {
      const moderationAction = await discussionService.moderateComment(commentId, action, reason);
      addModerationAction(moderationAction);
      
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

    discussionService.sendTypingIndicator(billId, parentId);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      discussionService.stopTypingIndicator(billId, parentId);
    }, 3000);
  }, [billId, enableTypingIndicators]);

  const stopTypingIndicator = useCallback((parentId?: string) => {
    if (!enableTypingIndicators) return;

    discussionService.stopTypingIndicator(billId, parentId);
    
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