/**
 * Unified WebSocket Hook for Real-time Civic Engagement
 *
 * Provides comprehensive WebSocket functionality for React components.
 * Combines all subscription types (bill, community, user_notifications) and
 * specialized hooks while maintaining backward compatibility.
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { UnifiedWebSocketManager } from '../core/api/websocket';
import {
  ConnectionState,
  BillUpdate,
  WebSocketNotification
} from '../core/api/types';
import { store } from '../store';
import { updateBill } from '../store/slices/billsSlice';
import { logger } from '../utils/logger';

// Consolidated types
export interface WebSocketSubscription {
  type: 'bill' | 'community' | 'user_notifications';
  id: string | number;
}

export interface RealTimeHandlers {
  onBillUpdate?: (update: BillUpdate) => void;
  onCommunityUpdate?: (update: any) => void;
  onEngagementUpdate?: (metrics: any) => void;
  onExpertActivity?: (activity: any) => void;
  onNotification?: (notification: WebSocketNotification) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: any) => void;
}

export interface BillRealTimeUpdate extends BillUpdate {
  bill_id: number;
}

export interface CommunityRealTimeUpdate {
  type: string;
  discussion_id: string;
  data: any;
  timestamp: string;
}

export interface EngagementMetricsUpdate {
  bill_id: number;
  views: number;
  comments: number;
  shares: number;
  timestamp: string;
}

export interface ExpertActivityUpdate {
  expert_id: number;
  type: string;
  data: any;
  timestamp: string;
}

export interface RealTimeNotification extends WebSocketNotification {
  id: string;
  read: boolean;
  timestamp: string;
}

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  subscriptions?: WebSocketSubscription[];
  handlers?: RealTimeHandlers;
}

export interface UseWebSocketReturn {
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
  billUpdates: Record<number, BillRealTimeUpdate[]>;
  communityUpdates: Record<string, CommunityRealTimeUpdate[]>;
  engagementMetrics: Record<number, EngagementMetricsUpdate>;
  expertActivities: ExpertActivityUpdate[];
  notifications: RealTimeNotification[];
  notificationCount: number;

  // Utility functions
  getBillUpdates: (billId: number) => BillRealTimeUpdate[];
  getEngagementMetrics: (billId: number) => EngagementMetricsUpdate | undefined;
  getRecentActivity: (limit?: number) => (BillRealTimeUpdate | CommunityRealTimeUpdate)[];
  markNotificationRead: (notificationId: string) => void;
}

/**
 * Main unified WebSocket hook
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    subscriptions = [],
    handlers = {}
  } = options;

  // Use the singleton WebSocket manager instance
  const wsManager = useRef<UnifiedWebSocketManager>(
    UnifiedWebSocketManager.getInstance()
  );

  // Local state for real-time data with deduplication
  const [billUpdates, setBillUpdates] = useState<Record<number, BillRealTimeUpdate[]>>({});
  const [communityUpdates, setCommunityUpdates] = useState<Record<string, CommunityRealTimeUpdate[]>>({});
  const [engagementMetrics, setEngagementMetrics] = useState<Record<number, EngagementMetricsUpdate>>({});
  const [expertActivities, setExpertActivities] = useState<ExpertActivityUpdate[]>([]);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);

  // Track subscriptions to avoid duplicates
  const activeSubscriptions = useRef<Set<string>>(new Set());
  const handlersRef = useRef(handlers);

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Memoized connection state getters
  const isConnected = useMemo(() => connectionState === ConnectionState.CONNECTED, [connectionState]);
  const isConnecting = useMemo(() => connectionState === ConnectionState.CONNECTING, [connectionState]);
  const connectionQuality = useMemo(() => {
    if (!isConnected) return 'disconnected';
    // Simple quality estimation based on connection state
    return 'good';
  }, [isConnected]);

  // Memoized event handlers with stable references
  const handleBillUpdate = useCallback((update: BillUpdate) => {
    const billUpdate: BillRealTimeUpdate = {
      ...update,
      bill_id: update.data?.bill_id || 0
    };

    setBillUpdates(prev => {
      const billId = billUpdate.bill_id;
      const existing = prev[billId] || [];

      // Deduplication logic
      const isDuplicate = existing.some(u =>
        u.timestamp === billUpdate.timestamp &&
        u.type === billUpdate.type &&
        u.data?.bill_id === billUpdate.data?.bill_id
      );

      if (isDuplicate) return prev;

      const newUpdates = [billUpdate, ...existing].slice(0, 50); // Keep last 50 updates
      return { ...prev, [billId]: newUpdates };
    });

    // Update Redux store for bill changes
    if (update.data) {
      const billUpdates: Partial<any> = {};
      let hasStatusChange = false;
      let hasEngagementUpdate = false;

      // Process update based on type
      switch (update.type) {
        case 'status_change':
          if (update.data.oldStatus && update.data.newStatus) {
            billUpdates.status = update.data.newStatus;
            billUpdates.lastUpdated = update.timestamp;
            hasStatusChange = true;
          }
          break;

        case 'new_comment':
          // Comment updates might affect comment count
          billUpdates.lastUpdated = update.timestamp;
          break;

        case 'amendment':
          // Amendment updates don't directly modify bill data
          // but we track them for notifications
          billUpdates.lastUpdated = update.timestamp;
          break;

        case 'voting_scheduled':
          // Voting updates might affect status or add metadata
          billUpdates.lastUpdated = update.timestamp;
          break;
      }

      // Handle engagement metrics if present in the update data
      if (update.data.viewCount !== undefined ||
          update.data.saveCount !== undefined ||
          update.data.commentCount !== undefined ||
          update.data.shareCount !== undefined) {
        if (update.data.viewCount !== undefined) {
          billUpdates.viewCount = update.data.viewCount;
        }
        if (update.data.saveCount !== undefined) {
          billUpdates.saveCount = update.data.saveCount;
        }
        if (update.data.commentCount !== undefined) {
          billUpdates.commentCount = update.data.commentCount;
        }
        if (update.data.shareCount !== undefined) {
          billUpdates.shareCount = update.data.shareCount;
        }
        hasEngagementUpdate = true;
      }

      // Update bills store if there are changes
      if (Object.keys(billUpdates).length > 0) {
        store.dispatch(updateBill({ id: billUpdate.bill_id, updates: billUpdates }));

        logger.debug('Bill updated in Redux store', {
          component: 'useWebSocket',
          billId: billUpdate.bill_id,
          updates: Object.keys(billUpdates),
          hasStatusChange,
          hasEngagementUpdate
        });
      }
    }

    handlersRef.current.onBillUpdate?.(billUpdate);
    logger.debug('Bill update received', {
      component: 'useWebSocket',
      billId: billUpdate.bill_id,
      type: billUpdate.type
    });
  }, []);

  const handleNotification = useCallback((notification: WebSocketNotification) => {
    const realTimeNotification: RealTimeNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      read: false,
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => {
      // Deduplication logic
      const isDuplicate = prev.some(n =>
        n.title === realTimeNotification.title &&
        n.message === realTimeNotification.message &&
        n.timestamp === realTimeNotification.timestamp
      );

      if (isDuplicate) return prev;

      const newNotifications = [realTimeNotification, ...prev].slice(0, 20); // Keep last 20 notifications
      return newNotifications;
    });

    handlersRef.current.onNotification?.(realTimeNotification);
    logger.debug('Notification received', {
      component: 'useWebSocket',
      type: realTimeNotification.type
    });
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    const newState = connected ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED;
    setConnectionState(newState);
    setError(null);

    handlersRef.current.onConnectionChange?.(connected);
    logger.info(`WebSocket ${connected ? 'connected' : 'disconnected'}`, {
      component: 'useWebSocket'
    });
  }, []);

  const handleError = useCallback((error: any) => {
    setError(error.message || 'WebSocket error');
    setConnectionState(ConnectionState.FAILED);

    handlersRef.current.onError?.(error);
    logger.error('WebSocket error', {
      component: 'useWebSocket',
      error
    });
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    const manager = wsManager.current;

    // Subscribe to events
    const handleConnected = () => handleConnectionChange(true);
    const handleDisconnected = () => handleConnectionChange(false);

    manager.on('connected', handleConnected);
    manager.on('disconnected', handleDisconnected);
    manager.on('error', handleError);
    manager.on('billUpdate', handleBillUpdate);
    manager.on('notification', handleNotification);

    return () => {
      // Clean up event listeners
      manager.off('connected', handleConnected);
      manager.off('disconnected', handleDisconnected);
      manager.off('error', handleError);
      manager.off('billUpdate', handleBillUpdate);
      manager.off('notification', handleNotification);
    };
  }, [handleBillUpdate, handleNotification, handleConnectionChange, handleError]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && connectionState === ConnectionState.DISCONNECTED) {
      connect();
    }
  }, [autoConnect]);

  // Handle initial subscriptions
  useEffect(() => {
    if (isConnected && subscriptions.length > 0) {
      subscriptions.forEach(subscription => {
        const key = `${subscription.type}:${subscription.id}`;
        if (!activeSubscriptions.current.has(key)) {
          subscribeToChannel(subscription);
        }
      });
    }
  }, [isConnected, subscriptions]);

  // Connection management
  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      await wsManager.current.connect();
      logger.info('WebSocket connection initiated', { component: 'useWebSocket' });
    } catch (error) {
      setConnectionState(ConnectionState.FAILED);
      setError(error instanceof Error ? error.message : String(error));
      logger.error('Failed to connect WebSocket', {
        component: 'useWebSocket',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    wsManager.current.disconnect();
    activeSubscriptions.current.clear();
    setConnectionState(ConnectionState.DISCONNECTED);
    logger.info('WebSocket disconnected', { component: 'useWebSocket' });
  }, []);

  // Subscription management
  const subscribeToChannel = useCallback((subscription: WebSocketSubscription) => {
    const key = `${subscription.type}:${subscription.id}`;

    if (!activeSubscriptions.current.has(key)) {
      if (subscription.type === 'bill') {
        wsManager.current.subscribeToBill(subscription.id as number);
      } else {
        // For other subscription types, use general subscribe method
        wsManager.current.subscribe(subscription.type, (message) => {
          // Handle different message types
          if (subscription.type === 'community') {
            const communityUpdate: CommunityRealTimeUpdate = {
              type: message.type || 'update',
              discussion_id: subscription.id as string,
              data: message.data || message,
              timestamp: message.timestamp || new Date().toISOString()
            };

            setCommunityUpdates(prev => {
              const existing = prev[subscription.id as string] || [];
              const newUpdates = [communityUpdate, ...existing].slice(0, 30);
              return { ...prev, [subscription.id as string]: newUpdates };
            });

            handlersRef.current.onCommunityUpdate?.(communityUpdate);
          } else if (subscription.type === 'user_notifications') {
            // Handle user notifications
            const notification: WebSocketNotification = {
              type: message.type || 'notification',
              title: message.title || 'Notification',
              message: message.message || '',
              data: message.data
            };
            handleNotification(notification);
          }
        });
      }

      activeSubscriptions.current.add(key);
      logger.debug('Subscribed to WebSocket channel', {
        component: 'useWebSocket',
        subscription: key
      });
    }
  }, [handleNotification]);

  const unsubscribeFromChannel = useCallback((subscription: WebSocketSubscription) => {
    const key = `${subscription.type}:${subscription.id}`;

    if (activeSubscriptions.current.has(key)) {
      if (subscription.type === 'bill') {
        wsManager.current.unsubscribeFromBill(subscription.id as number);
      } else {
        // For other types, we would need to track subscription IDs
        // This is a simplified version
        wsManager.current.unsubscribe(key);
      }

      activeSubscriptions.current.delete(key);
      logger.debug('Unsubscribed from WebSocket channel', {
        component: 'useWebSocket',
        subscription: key
      });
    }
  }, []);

  // Utility functions
  const getBillUpdates = useCallback((billId: number) => {
    return billUpdates[billId] || [];
  }, [billUpdates]);

  const getEngagementMetrics = useCallback((billId: number) => {
    return engagementMetrics[billId];
  }, [engagementMetrics]);

  const getRecentActivity = useCallback((limit?: number) => {
    const billActivity = Object.values(billUpdates).flat();
    const communityActivity = Object.values(communityUpdates).flat();
    const allActivity = [...billActivity, ...communityActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit || 20);
    return allActivity;
  }, [billUpdates, communityUpdates]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up subscriptions but don't disconnect WebSocket
      // as it might be used by other components
      activeSubscriptions.current.clear();
    };
  }, []);

  // Memoized notification count
  const notificationCount = useMemo(() =>
    notifications.filter(n => !n.read).length,
    [notifications]
  );

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionQuality,
    error,

    // Connection management
    connect,
    disconnect,

    // Subscription management
    subscribe: subscribeToChannel,
    unsubscribe: unsubscribeFromChannel,

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
    markNotificationRead: markNotificationAsRead
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
    communityUpdates: webSocket.communityUpdates[discussionId] || []
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

// Backward compatibility hooks

/**
 * Legacy hook for bill updates (maintained for backward compatibility)
 */
export function useBillUpdates(bill_id?: number) {
  const [updates, setUpdates] = useState<BillUpdate[]>([]);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);

  const wsManager = UnifiedWebSocketManager.getInstance();

  useEffect(() => {
    const handleBillUpdate = (data: any) => {
      const update = data.update as BillUpdate;

      if (!bill_id || update.data.bill_id === bill_id) {
        setUpdates(prev => {
          // Deduplicate updates based on timestamp and bill_id
          const isDuplicate = prev.some(u =>
            u.timestamp === update.timestamp &&
            u.data.bill_id === update.data.bill_id
          );

          if (isDuplicate) return prev;

          const newUpdates = [update, ...prev];
          return newUpdates.slice(0, 50);
        });
      }
    };

    const handleNotification = (notification: WebSocketNotification) => {
      setNotifications(prev => {
        // Deduplicate notifications
        const isDuplicate = prev.some(n =>
          n.title === notification.title &&
          n.message === notification.message
        );

        if (isDuplicate) return prev;

        const newNotifications = [notification, ...prev];
        return newNotifications.slice(0, 20);
      });
    };

    const handleBatchedUpdates = (batchedNotification: WebSocketNotification) => {
      handleNotification(batchedNotification);
    };

    // Set up event listeners
    const unsubBillUpdate = wsManager.on('billUpdate', handleBillUpdate);
    const unsubNotification = wsManager.on('notification', handleNotification);
    const unsubBatched = wsManager.on('batchedUpdates', handleBatchedUpdates);

    return () => {
      unsubBillUpdate();
      unsubNotification();
      unsubBatched();
    };
  }, [bill_id, wsManager]);

  const clearUpdates = useCallback(() => setUpdates([]), []);
  const clearNotifications = useCallback(() => setNotifications([]), []);

  return useMemo(() => ({
    updates,
    notifications,
    clearUpdates,
    clearNotifications
  }), [updates, notifications, clearUpdates, clearNotifications]);
}

/**
 * Legacy hook for WebSocket connection management (maintained for backward compatibility)
 */
export function useWebSocketConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    reconnectAttempts: 0,
    readyState: null as number | null,
    maxReconnectAttempts: 5,
    state: 'disconnected',
    queuedMessages: 0
  });

  const wsManager = UnifiedWebSocketManager.getInstance();

  const updateConnectionState = useCallback(() => {
    const connected = wsManager.isConnected();
    const status = {
      connected,
      reconnectAttempts: 0, // UnifiedWebSocketManager doesn't expose this
      readyState: connected ? 1 : 0,
      maxReconnectAttempts: 5,
      state: connected ? 'connected' : 'disconnected',
      queuedMessages: 0
    };

    setIsConnected(connected);
    setConnectionStatus(status);
  }, [wsManager]);

  useEffect(() => {
    const handleConnected = () => updateConnectionState();
    const handleDisconnected = () => updateConnectionState();
    const handleError = (error: any) => {
      logger.error('WebSocket error:', { component: 'useWebSocketConnection' }, error);
      updateConnectionState();
    };

    // Set up event listeners
    const unsubscribeConnected = wsManager.on('connected', handleConnected);
    const unsubscribeDisconnected = wsManager.on('disconnected', handleDisconnected);
    const unsubscribeError = wsManager.on('error', handleError);

    updateConnectionState();

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeError();
    };
  }, [updateConnectionState, wsManager]);

  return useMemo(() => ({
    isConnected,
    connectionStatus,
    connect: (token: string) => wsManager.connect(token),
    disconnect: () => wsManager.disconnect(),
    subscribeToBill: (bill_id: number, types?: any) =>
      wsManager.subscribeToBill(bill_id, types),
    unsubscribeFromBill: (bill_id: number) =>
      wsManager.unsubscribeFromBill(bill_id),
    on: (event: any, callback: any) =>
      wsManager.on(event, callback),
    off: (event: any, callback: any) =>
      wsManager.off(event, callback),
    updatePreferences: (preferences: any) =>
      wsManager.updatePreferences(preferences),
    getWebSocketManager: () => wsManager
  }), [isConnected, connectionStatus, wsManager]);
}

// Legacy types are now imported from '../core/api/types' for consistency