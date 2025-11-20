/**
 * useCommunityRealTime Hook - Real-time community features integration
 * 
 * Provides React components with real-time community updates including
 * discussion threads, expert verification, and community analytics.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { communityWebSocketExtension, CommunityWebSocketEvents } from '@client/services/community-websocket-extension';
import { useCommunityStore } from '@client/store/slices/communitySlice';
import { useAppSelector, useAppDispatch } from '@client/store/hooks';
import { selectDiscussionState } from '@client/store/slices/discussionSlice';
import { logger } from '@client/utils/logger';

interface UseCommunityRealTimeOptions {
  billId?: number;
  enableTypingIndicators?: boolean;
  enableExpertUpdates?: boolean;
  enableModerationEvents?: boolean;
}

interface UseCommunityRealTimeReturn {
  // Connection state
  isConnected: boolean;
  
  // Discussion features
  sendTypingIndicator: (parentId?: string) => void;
  stopTypingIndicator: (parentId?: string) => void;
  subscribeToDiscussion: (billId: number) => void;
  unsubscribeFromDiscussion: (billId: number) => void;
  
  // Expert features
  subscribeToExpertUpdates: () => void;
  
  // Moderation features
  subscribeToModerationEvents: () => void;
  
  // Analytics features
  subscribeToCommunityAnalytics: () => void;
  
  // Cleanup
  cleanup: () => void;
}

export function useCommunityRealTime(options: UseCommunityRealTimeOptions = {}): UseCommunityRealTimeReturn {
  const {
    billId,
    enableTypingIndicators = true,
    enableExpertUpdates = true,
    enableModerationEvents = false
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const communityStore = useCommunityStore();
  const dispatch = useAppDispatch();
  const discussionState = useAppSelector(selectDiscussionState);
  
  // Track active subscriptions to avoid duplicates
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize community real-time features
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Initialize WebSocket extension
        communityWebSocketExtension.initialize();
        
        // Initialize store real-time features
        communityStore.initializeRealTime();
        discussionStore.initializeRealTime();

        if (mounted) {
          setIsConnected(communityWebSocketExtension.isConnected());
        }

        logger.info('Community real-time features initialized', { component: 'useCommunityRealTime' });
      } catch (error) {
        logger.error('Failed to initialize community real-time features', { component: 'useCommunityRealTime' }, error);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [communityStore, discussionStore]);

  // Auto-subscribe to discussion if billId is provided
  useEffect(() => {
    if (billId && isConnected) {
      subscribeToDiscussion(billId);
      
      return () => {
        unsubscribeFromDiscussion(billId);
      };
    }
  }, [billId, isConnected]);

  // Auto-subscribe to expert updates if enabled
  useEffect(() => {
    if (enableExpertUpdates && isConnected) {
      subscribeToExpertUpdates();
    }
  }, [enableExpertUpdates, isConnected]);

  // Auto-subscribe to moderation events if enabled
  useEffect(() => {
    if (enableModerationEvents && isConnected) {
      subscribeToModerationEvents();
    }
  }, [enableModerationEvents, isConnected]);

  // Discussion features
  const sendTypingIndicator = useCallback((parentId?: string) => {
    if (!enableTypingIndicators || !billId || !isConnected) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    communityWebSocketExtension.sendTypingIndicator(billId, parentId);

    // Auto-stop after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingIndicator(parentId);
    }, 3000);
  }, [billId, enableTypingIndicators, isConnected]);

  const stopTypingIndicator = useCallback((parentId?: string) => {
    if (!enableTypingIndicators || !billId || !isConnected) return;

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Send stop typing indicator
    communityWebSocketExtension.stopTypingIndicator(billId, parentId);
  }, [billId, enableTypingIndicators, isConnected]);

  const subscribeToDiscussion = useCallback((targetBillId: number) => {
    if (!isConnected) {
      logger.warn('Cannot subscribe to discussion: not connected', { component: 'useCommunityRealTime' });
      return;
    }

    const subscriptionKey = `discussion:${targetBillId}`;
    
    if (subscriptionsRef.current.has(subscriptionKey)) {
      return; // Already subscribed
    }

    communityWebSocketExtension.subscribeToDiscussion(targetBillId);
    subscriptionsRef.current.add(subscriptionKey);

    logger.info('Subscribed to discussion', { component: 'useCommunityRealTime', billId: targetBillId });
  }, [isConnected]);

  const unsubscribeFromDiscussion = useCallback((targetBillId: number) => {
    const subscriptionKey = `discussion:${targetBillId}`;
    
    if (!subscriptionsRef.current.has(subscriptionKey)) {
      return; // Not subscribed
    }

    communityWebSocketExtension.unsubscribeFromDiscussion(targetBillId);
    subscriptionsRef.current.delete(subscriptionKey);

    // Clear typing indicators for this bill
    if (typingTimeoutRef.current && billId === targetBillId) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    logger.info('Unsubscribed from discussion', { component: 'useCommunityRealTime', billId: targetBillId });
  }, [billId]);

  // Expert features
  const subscribeToExpertUpdates = useCallback(() => {
    if (!isConnected) {
      logger.warn('Cannot subscribe to expert updates: not connected', { component: 'useCommunityRealTime' });
      return;
    }

    const subscriptionKey = 'expert:updates';
    
    if (subscriptionsRef.current.has(subscriptionKey)) {
      return; // Already subscribed
    }

    communityWebSocketExtension.subscribeToExpertUpdates();
    subscriptionsRef.current.add(subscriptionKey);

    logger.info('Subscribed to expert updates', { component: 'useCommunityRealTime' });
  }, [isConnected]);

  // Moderation features
  const subscribeToModerationEvents = useCallback(() => {
    if (!isConnected) {
      logger.warn('Cannot subscribe to moderation events: not connected', { component: 'useCommunityRealTime' });
      return;
    }

    const subscriptionKey = 'moderation:events';
    
    if (subscriptionsRef.current.has(subscriptionKey)) {
      return; // Already subscribed
    }

    communityWebSocketExtension.subscribeToModerationEvents();
    subscriptionsRef.current.add(subscriptionKey);

    logger.info('Subscribed to moderation events', { component: 'useCommunityRealTime' });
  }, [isConnected]);

  // Analytics features
  const subscribeToCommunityAnalytics = useCallback(() => {
    if (!isConnected) {
      logger.warn('Cannot subscribe to community analytics: not connected', { component: 'useCommunityRealTime' });
      return;
    }

    const subscriptionKey = 'community:analytics';
    
    if (subscriptionsRef.current.has(subscriptionKey)) {
      return; // Already subscribed
    }

    communityWebSocketExtension.subscribeToCommunityAnalytics();
    subscriptionsRef.current.add(subscriptionKey);

    logger.info('Subscribed to community analytics', { component: 'useCommunityRealTime' });
  }, [isConnected]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Clear subscriptions
    subscriptionsRef.current.clear();

    // Cleanup stores
    communityStore.cleanupRealTime();
    discussionStore.cleanupRealTime();

    // Cleanup WebSocket extension
    communityWebSocketExtension.cleanup();

    setIsConnected(false);

    logger.info('Community real-time features cleaned up', { component: 'useCommunityRealTime' });
  }, [communityStore, discussionStore]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // Connection state
    isConnected,
    
    // Discussion features
    sendTypingIndicator,
    stopTypingIndicator,
    subscribeToDiscussion,
    unsubscribeFromDiscussion,
    
    // Expert features
    subscribeToExpertUpdates,
    
    // Moderation features
    subscribeToModerationEvents,
    
    // Analytics features
    subscribeToCommunityAnalytics,
    
    // Cleanup
    cleanup
  };
}

/**
 * Hook for typing indicators in discussions
 */
export function useTypingIndicators(billId: number, parentId?: string) {
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for typing indicators
  useEffect(() => {
    const unsubscribe = communityWebSocketExtension.on('discussion:typing_indicator', (data) => {
      if (data.billId !== billId || data.parentId !== parentId) return;

      setTypingUsers(prev => {
        if (data.isTyping) {
          // Add user to typing list if not already there
          const existingIndex = prev.findIndex(u => u.userId === data.userId);
          if (existingIndex >= 0) {
            return prev; // Already typing
          }
          return [...prev, { userId: data.userId, userName: data.userName }];
        } else {
          // Remove user from typing list
          return prev.filter(u => u.userId !== data.userId);
        }
      });
    });

    return unsubscribe;
  }, [billId, parentId]);

  const startTyping = useCallback(() => {
    if (isTyping) return;

    setIsTyping(true);
    communityWebSocketExtension.sendTypingIndicator(billId, parentId);

    // Auto-stop after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [billId, parentId, isTyping]);

  const stopTyping = useCallback(() => {
    if (!isTyping) return;

    setIsTyping(false);
    communityWebSocketExtension.stopTypingIndicator(billId, parentId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [billId, parentId, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        communityWebSocketExtension.stopTypingIndicator(billId, parentId);
      }
    };
  }, [billId, parentId, isTyping]);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping
  };
}

/**
 * Hook for real-time community analytics
 */
export function useCommunityAnalytics() {
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [activityUpdates, setActivityUpdates] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to community analytics
    communityWebSocketExtension.subscribeToCommunityAnalytics();

    // Listen for trending updates
    const unsubscribeTrending = communityWebSocketExtension.on('community:trending_update', (data) => {
      setTrendingTopics(data.topics);
    });

    // Listen for activity updates
    const unsubscribeActivity = communityWebSocketExtension.on('community:activity_update', (data) => {
      setActivityUpdates(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 updates
    });

    return () => {
      unsubscribeTrending();
      unsubscribeActivity();
    };
  }, []);

  return {
    trendingTopics,
    activityUpdates
  };
}