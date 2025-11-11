/**
 * WebSocket Hook for Real-time Civic Engagement
 * 
 * Provides easy integration with WebSocket functionality for React components.
 * Handles subscriptions, real-time updates, and graceful fallback to polling.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRealTimeStore } from '../store/slices/realTimeSlice';
import { wsClient } from '../store/middleware/webSocketMiddleware';
import { 
  WebSocketSubscription, 
  RealTimeHandlers,
  BillRealTimeUpdate,
  CommunityRealTimeUpdate,
  EngagementMetricsUpdate,
  ExpertActivityUpdate,
  RealTimeNotification
} from '../types/realtime';
import { logger } from '../utils/logger';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  subscriptions?: WebSocketSubscription[];
  handlers?: RealTimeHandlers;
}

interface UseWebSocketReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  error: string | null;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Subscription management
  subscribe: (subscription: WebSocketSubscription) => void;
  unsubscribe: (subscription: WebSocketSubscription) => void;
  
  // Real-time data
  billUpdates: Map<number, BillRealTimeUpdate[]>;
  communityUpdates: Map<string, CommunityRealTimeUpdate[]>;
  engagementMetrics: Map<number, EngagementMetricsUpdate>;
  expertActivities: ExpertActivityUpdate[];
  notifications: RealTimeNotification[];
  notificationCount: number;
  
  // Utility functions
  getBillUpdates: (billId: number) => BillRealTimeUpdate[];
  getEngagementMetrics: (billId: number) => EngagementMetricsUpdate | undefined;
  getRecentActivity: (limit?: number) => (BillRealTimeUpdate | CommunityRealTimeUpdate)[];
  markNotificationRead: (notificationId: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    subscriptions = [],
    handlers = {}
  } = options;

  // Get real-time store state and actions
  const {
    connection,
    billUpdates,
    communityUpdates,
    engagementMetrics,
    expertActivities,
    notifications,
    notificationCount,
    subscribe: storeSubscribe,
    unsubscribe: storeUnsubscribe,
    getRecentUpdates,
    markNotificationRead: storeMarkNotificationRead
  } = useRealTimeStore();

  // Track subscriptions to avoid duplicates
  const activeSubscriptions = useRef<Set<string>>(new Set());
  const handlersRef = useRef(handlers);

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Set up WebSocket handlers
  useEffect(() => {
    const wsHandlers: RealTimeHandlers = {
      onBillUpdate: (update) => {
        handlersRef.current.onBillUpdate?.(update);
        logger.debug('Bill update received', { 
          component: 'useWebSocket',
          billId: update.bill_id,
          type: update.type
        });
      },
      
      onCommunityUpdate: (update) => {
        handlersRef.current.onCommunityUpdate?.(update);
        logger.debug('Community update received', { 
          component: 'useWebSocket',
          type: update.type,
          discussionId: update.discussion_id
        });
      },
      
      onEngagementUpdate: (metrics) => {
        handlersRef.current.onEngagementUpdate?.(metrics);
        logger.debug('Engagement metrics updated', { 
          component: 'useWebSocket',
          billId: metrics.bill_id
        });
      },
      
      onExpertActivity: (activity) => {
        handlersRef.current.onExpertActivity?.(activity);
        logger.debug('Expert activity received', { 
          component: 'useWebSocket',
          expertId: activity.expert_id,
          type: activity.type
        });
      },
      
      onNotification: (notification) => {
        handlersRef.current.onNotification?.(notification);
        logger.debug('Notification received', { 
          component: 'useWebSocket',
          type: notification.type,
          priority: notification.priority
        });
      },
      
      onConnectionChange: (connected) => {
        handlersRef.current.onConnectionChange?.(connected);
        logger.info(`WebSocket ${connected ? 'connected' : 'disconnected'}`, { 
          component: 'useWebSocket'
        });
      },
      
      onError: (error) => {
        handlersRef.current.onError?.(error);
        logger.error('WebSocket error', { 
          component: 'useWebSocket',
          error
        });
      }
    };

    wsClient.setHandlers(wsHandlers);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !connection.isConnected && !connection.isConnecting) {
      connect();
    }
  }, [autoConnect]);

  // Handle initial subscriptions
  useEffect(() => {
    if (connection.isConnected && subscriptions.length > 0) {
      subscriptions.forEach(subscription => {
        const key = `${subscription.type}:${subscription.id}`;
        if (!activeSubscriptions.current.has(key)) {
          subscribe(subscription);
        }
      });
    }
  }, [connection.isConnected, subscriptions]);

  // Connection management
  const connect = useCallback(async () => {
    try {
      await wsClient.connect();
      logger.info('WebSocket connection initiated', { component: 'useWebSocket' });
    } catch (error) {
      logger.error('Failed to connect WebSocket', { 
        component: 'useWebSocket',
        error: error.toString()
      });
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
    activeSubscriptions.current.clear();
    logger.info('WebSocket disconnected', { component: 'useWebSocket' });
  }, []);

  // Subscription management
  const subscribe = useCallback((subscription: WebSocketSubscription) => {
    const key = `${subscription.type}:${subscription.id}`;
    
    if (!activeSubscriptions.current.has(key)) {
      wsClient.subscribe(subscription);
      storeSubscribe(subscription);
      activeSubscriptions.current.add(key);
      
      logger.debug('Subscribed to WebSocket channel', { 
        component: 'useWebSocket',
        subscription: key
      });
    }
  }, [storeSubscribe]);

  const unsubscribe = useCallback((subscription: WebSocketSubscription) => {
    const key = `${subscription.type}:${subscription.id}`;
    
    if (activeSubscriptions.current.has(key)) {
      wsClient.unsubscribe(subscription);
      storeUnsubscribe(subscription);
      activeSubscriptions.current.delete(key);
      
      logger.debug('Unsubscribed from WebSocket channel', { 
        component: 'useWebSocket',
        subscription: key
      });
    }
  }, [storeUnsubscribe]);

  // Utility functions
  const getBillUpdates = useCallback((billId: number) => {
    return billUpdates.get(billId) || [];
  }, [billUpdates]);

  const getEngagementMetrics = useCallback((billId: number) => {
    return engagementMetrics.get(billId);
  }, [engagementMetrics]);

  const getRecentActivity = useCallback((limit?: number) => {
    return getRecentUpdates(limit);
  }, [getRecentUpdates]);

  const markNotificationRead = useCallback((notificationId: string) => {
    storeMarkNotificationRead(notificationId);
  }, [storeMarkNotificationRead]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up subscriptions but don't disconnect WebSocket
      // as it might be used by other components
      activeSubscriptions.current.clear();
    };
  }, []);

  return {
    // Connection state
    isConnected: connection.isConnected,
    isConnecting: connection.isConnecting,
    connectionQuality: connection.connection_quality,
    error: connection.error,
    
    // Connection management
    connect,
    disconnect,
    
    // Subscription management
    subscribe,
    unsubscribe,
    
    // Real-time data
    billUpdates,
    communityUpdates,
    engagementMetrics,
    expertActivities,
    notifications,
    notificationCount,
    
    // Utility functions
    getBillUpdates,
    getEngagementMetrics,
    getRecentActivity,
    markNotificationRead
  };
}

// Specialized hooks for common use cases

/**
 * Hook for tracking a specific bill's real-time updates
 */
export function useBillRealTime(billId: number) {
  const webSocket = useWebSocket({
    subscriptions: [{ type: 'bill', id: billId }]
  });

  return {
    ...webSocket,
    billUpdates: webSocket.getBillUpdates(billId),
    engagementMetrics: webSocket.getEngagementMetrics(billId)
  };
}

/**
 * Hook for community discussion real-time updates
 */
export function useCommunityRealTime(discussionId: string) {
  const webSocket = useWebSocket({
    subscriptions: [{ type: 'community', id: discussionId }]
  });

  return {
    ...webSocket,
    communityUpdates: webSocket.communityUpdates.get(discussionId) || []
  };
}

/**
 * Hook for user notifications
 */
export function useNotifications() {
  const webSocket = useWebSocket({
    subscriptions: [{ type: 'user_notifications', id: 'user' }]
  });

  return {
    notifications: webSocket.notifications,
    notificationCount: webSocket.notificationCount,
    markAsRead: webSocket.markNotificationRead,
    isConnected: webSocket.isConnected
  };
}