/**
 * Community WebSocket Hook
 * 
 * React hook for integrating community features with WebSocket real-time updates.
 * Provides easy access to discussion threads, expert verification, and community analytics.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { communityWebSocketMiddleware } from '../services/community-websocket-middleware';
import { communityBackendService } from '../services/community-backend-service';
import { notificationService } from '../services/notification-service';
import { logger } from '../utils/logger';

interface CommunityWebSocketState {
  isConnected: boolean;
  isInitialized: boolean;
  error: string | null;
  lastActivity: Date | null;
}

interface CommunityNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

interface DiscussionUpdate {
  billId: number;
  type: 'comment_added' | 'comment_updated' | 'comment_voted' | 'typing_indicator';
  data: any;
  timestamp: string;
}

interface ExpertUpdate {
  type: 'verification_updated' | 'insight_added';
  data: any;
  timestamp: string;
}

interface CommunityAnalytics {
  type: 'activity_update' | 'trending_update';
  data: any;
  timestamp: string;
}

/**
 * Main community WebSocket hook
 */
export function useCommunityWebSocket() {
  const [state, setState] = useState<CommunityWebSocketState>({
    isConnected: false,
    isInitialized: false,
    error: null,
    lastActivity: null,
  });

  const initializeRef = useRef(false);

  // Initialize community WebSocket middleware
  useEffect(() => {
    if (initializeRef.current) return;
    initializeRef.current = true;

    const initialize = async () => {
      try {
        await communityWebSocketMiddleware.initialize();
        
        setState(prev => ({
          ...prev,
          isInitialized: true,
          error: null,
        }));

        logger.info('Community WebSocket hook initialized', { component: 'useCommunityWebSocket' });
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize',
        }));

        logger.error('Failed to initialize community WebSocket hook', { component: 'useCommunityWebSocket' }, error);
      }
    };

    initialize();

    return () => {
      communityWebSocketMiddleware.cleanup();
    };
  }, []);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      const isConnected = communityWebSocketMiddleware.isConnected();
      setState(prev => ({
        ...prev,
        isConnected,
        lastActivity: isConnected ? new Date() : prev.lastActivity,
      }));
    };

    // Check immediately
    checkConnection();

    // Set up periodic checks
    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, []);

  // Memoized methods
  const subscribeToDiscussion = useCallback((billId: number) => {
    communityWebSocketMiddleware.subscribeToDiscussion(billId);
  }, []);

  const unsubscribeFromDiscussion = useCallback((billId: number) => {
    communityWebSocketMiddleware.unsubscribeFromDiscussion(billId);
  }, []);

  const sendTypingIndicator = useCallback((billId: number, parentId?: string) => {
    communityWebSocketMiddleware.sendTypingIndicator(billId, parentId);
  }, []);

  const stopTypingIndicator = useCallback((billId: number, parentId?: string) => {
    communityWebSocketMiddleware.stopTypingIndicator(billId, parentId);
  }, []);

  return {
    ...state,
    subscribeToDiscussion,
    unsubscribeFromDiscussion,
    sendTypingIndicator,
    stopTypingIndicator,
  };
}

/**
 * Hook for discussion-specific WebSocket updates
 */
export function useDiscussionUpdates(billId?: number) {
  const [updates, setUpdates] = useState<DiscussionUpdate[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const billIdRef = useRef(billId);
  billIdRef.current = billId;

  useEffect(() => {
    const handleCommentAdded = (event: CustomEvent) => {
      const data = event.detail;
      if (!billIdRef.current || data.billId === billIdRef.current) {
        setUpdates(prev => [{
          billId: data.billId,
          type: 'comment_added',
          data: data.comment,
          timestamp: data.timestamp,
        }, ...prev.slice(0, 49)]); // Keep last 50 updates
      }
    };

    const handleCommentUpdated = (event: CustomEvent) => {
      const data = event.detail;
      if (!billIdRef.current || data.billId === billIdRef.current) {
        setUpdates(prev => [{
          billId: data.billId,
          type: 'comment_updated',
          data: { commentId: data.commentId, updates: data.updates },
          timestamp: data.timestamp,
        }, ...prev.slice(0, 49)]);
      }
    };

    const handleCommentVoted = (event: CustomEvent) => {
      const data = event.detail;
      if (!billIdRef.current || data.billId === billIdRef.current) {
        setUpdates(prev => [{
          billId: data.billId,
          type: 'comment_voted',
          data: { commentId: data.commentId, voteType: data.voteType, newCounts: data.newCounts },
          timestamp: data.timestamp,
        }, ...prev.slice(0, 49)]);
      }
    };

    const handleTypingIndicator = (event: CustomEvent) => {
      const data = event.detail;
      if (!billIdRef.current || data.billId === billIdRef.current) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return prev.includes(data.userName) ? prev : [...prev, data.userName];
          } else {
            return prev.filter(user => user !== data.userName);
          }
        });
      }
    };

    // Add event listeners
    window.addEventListener('community:comment_added', handleCommentAdded);
    window.addEventListener('community:comment_updated', handleCommentUpdated);
    window.addEventListener('community:comment_voted', handleCommentVoted);
    window.addEventListener('community:typing_indicator', handleTypingIndicator);

    return () => {
      window.removeEventListener('community:comment_added', handleCommentAdded);
      window.removeEventListener('community:comment_updated', handleCommentUpdated);
      window.removeEventListener('community:comment_voted', handleCommentVoted);
      window.removeEventListener('community:typing_indicator', handleTypingIndicator);
    };
  }, []);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  return {
    updates,
    typingUsers,
    clearUpdates,
  };
}

/**
 * Hook for expert verification and insights updates
 */
export function useExpertUpdates() {
  const [updates, setUpdates] = useState<ExpertUpdate[]>([]);

  useEffect(() => {
    const handleVerificationUpdate = (event: CustomEvent) => {
      const data = event.detail;
      setUpdates(prev => [{
        type: 'verification_updated',
        data: {
          userId: data.userId,
          verificationType: data.verificationType,
          credibilityScore: data.credibilityScore,
        },
        timestamp: data.timestamp,
      }, ...prev.slice(0, 29)]); // Keep last 30 updates
    };

    const handleInsightAdded = (event: CustomEvent) => {
      const data = event.detail;
      setUpdates(prev => [{
        type: 'insight_added',
        data: {
          billId: data.billId,
          insight: data.insight,
        },
        timestamp: data.timestamp,
      }, ...prev.slice(0, 29)]);
    };

    window.addEventListener('community:expert_verification_updated', handleVerificationUpdate);
    window.addEventListener('community:expert_insight_added', handleInsightAdded);

    return () => {
      window.removeEventListener('community:expert_verification_updated', handleVerificationUpdate);
      window.removeEventListener('community:expert_insight_added', handleInsightAdded);
    };
  }, []);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  return {
    updates,
    clearUpdates,
  };
}

/**
 * Hook for community analytics updates
 */
export function useCommunityAnalytics() {
  const [analytics, setAnalytics] = useState<CommunityAnalytics[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);

  useEffect(() => {
    const handleActivityUpdate = (event: CustomEvent) => {
      const data = event.detail;
      setAnalytics(prev => [{
        type: 'activity_update',
        data: data.data,
        timestamp: data.timestamp,
      }, ...prev.slice(0, 19)]); // Keep last 20 updates
    };

    const handleTrendingUpdate = (event: CustomEvent) => {
      const data = event.detail;
      setTrendingTopics(data.topics);
      setAnalytics(prev => [{
        type: 'trending_update',
        data: { topics: data.topics },
        timestamp: data.timestamp,
      }, ...prev.slice(0, 19)]);
    };

    window.addEventListener('community:activity_update', handleActivityUpdate);
    window.addEventListener('community:trending_update', handleTrendingUpdate);

    return () => {
      window.removeEventListener('community:activity_update', handleActivityUpdate);
      window.removeEventListener('community:trending_update', handleTrendingUpdate);
    };
  }, []);

  const clearAnalytics = useCallback(() => {
    setAnalytics([]);
  }, []);

  return {
    analytics,
    trendingTopics,
    clearAnalytics,
  };
}

/**
 * Hook for community notifications
 */
export function useCommunityNotifications() {
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Get initial notifications
    const loadNotifications = async () => {
      try {
        const initialNotifications = notificationService.getNotifications();
        const communityNotifications = initialNotifications
          .filter(n => n.isCommunityRelated)
          .map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            data: n.data,
            timestamp: n.createdAt,
          }));

        setNotifications(communityNotifications);
        setUnreadCount(notificationService.getUnreadCount());
      } catch (error) {
        logger.error('Failed to load community notifications', { component: 'useCommunityNotifications' }, error);
      }
    };

    loadNotifications();

    // Listen for new notifications
    const handleNotificationReceived = (notification: any) => {
      if (notification.isCommunityRelated) {
        setNotifications(prev => [{
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: notification.createdAt,
        }, ...prev.slice(0, 49)]);
      }
    };

    const handleUnreadCountChanged = (count: number) => {
      setUnreadCount(count);
    };

    const unsubscribeReceived = notificationService.on('notification:received', handleNotificationReceived);
    const unsubscribeCount = notificationService.on('unread_count:changed', handleUnreadCountChanged);

    return () => {
      unsubscribeReceived();
      unsubscribeCount();
    };
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      logger.error('Failed to mark notification as read', { component: 'useCommunityNotifications' }, error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      logger.error('Failed to mark all notifications as read', { component: 'useCommunityNotifications' }, error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
    } catch (error) {
      logger.error('Failed to delete notification', { component: 'useCommunityNotifications' }, error);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

/**
 * Hook for community backend API integration
 */
export function useCommunityBackend() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await communityBackendService.initialize();
        setIsInitialized(true);
        setError(null);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to initialize community backend');
        logger.error('Failed to initialize community backend', { component: 'useCommunityBackend' }, error);
      }
    };

    initialize();
  }, []);

  return {
    isInitialized,
    error,
    communityBackendService,
  };
}