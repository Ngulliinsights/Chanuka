/**
 * Simplified WebSocket Hook for Real-time Civic Engagement
 *
 * Focused on UI concerns only. Business logic is handled
 * by dedicated services for better separation of concerns.
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';

import { billTrackingService } from '@client/services/billTrackingService';
import { stateManagementService } from '@client/services/stateManagementService';
import { webSocketService } from '@client/services/webSocketService';
import { logger } from '@client/utils/logger';

import {
  ConnectionState,
  BillUpdate,
  WebSocketNotification,
  WebSocketSubscription,
  RealTimeHandlers,
  CommunityUpdate,
  ConnectionQuality,
  BillTrackingPreferences
} from '../types/api';


// Hook-specific types (UI-focused)
export interface UseWebSocketOptions {
  autoConnect?: boolean;
  subscriptions?: WebSocketSubscription[];
  handlers?: RealTimeHandlers;
}

export interface UseWebSocketReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: ConnectionQuality;
  error: string | null;

  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;

  // Subscription management
  subscribe: (subscription: WebSocketSubscription) => void;
  unsubscribe: (subscription: WebSocketSubscription) => void;

  // Real-time data (UI state only)
  billUpdates: Record<number, BillUpdate[]>;
  communityUpdates: Record<string, CommunityUpdate[]>;
  notifications: WebSocketNotification[];
  notificationCount: number;

  // Utility functions
  getBillUpdates: (billId: number) => BillUpdate[];
  getRecentActivity: (limit?: number) => (BillUpdate | CommunityUpdate)[];
  markNotificationRead: (notificationId: string) => void;
  
  // Preferences management
  updatePreferences: (preferences: Partial<BillTrackingPreferences>) => void;
  getPreferences: () => BillTrackingPreferences;
}

/**
 * Main unified WebSocket hook - simplified for UI concerns only
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    subscriptions = [],
    handlers = {}
  } = options;

  // Local UI state only (no business logic)
  const [billUpdates, setBillUpdates] = useState<Record<number, BillUpdate[]>>({});
  const [communityUpdates, setCommunityUpdates] = useState<Record<string, CommunityUpdate[]>>({});
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);

  // Track handlers to avoid stale closures
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Memoized connection state getters
  const isConnected = useMemo(() => connectionState === ConnectionState.CONNECTED, [connectionState]);
  const isConnecting = useMemo(() => connectionState === ConnectionState.CONNECTING, [connectionState]);
  const connectionQuality: ConnectionQuality = useMemo(() => {
    if (!isConnected) return 'disconnected';
    return 'good'; // Simplified quality estimation
  }, [isConnected]);

  // UI-focused event handlers (no business logic)
  const handleBillUpdate = useCallback((update: BillUpdate) => {
    setBillUpdates(prev => {
      const billId = update.data.billId;
      const existing = prev[billId] || [];

      // Simple deduplication for UI
      const isDuplicate = existing.some(u =>
        u.timestamp === update.timestamp && u.type === update.type
      );

      if (isDuplicate) return prev;

      const newUpdates = [update, ...existing].slice(0, 50);
      return { ...prev, [billId]: newUpdates };
    });

    handlersRef.current.onBillUpdate?.(update);
  }, []);

  const handleCommunityUpdate = useCallback((update: CommunityUpdate) => {
    setCommunityUpdates(prev => {
      const existing = prev[update.discussionId] || [];
      const newUpdates = [update, ...existing].slice(0, 30);
      return { ...prev, [update.discussionId]: newUpdates };
    });

    handlersRef.current.onCommunityUpdate?.(update);
  }, []);

  const handleNotification = useCallback((notification: WebSocketNotification) => {
    setNotifications(prev => {
      // Simple deduplication for UI
      const isDuplicate = prev.some(n =>
        n.title === notification.title &&
        n.message === notification.message &&
        Math.abs(new Date(n.timestamp).getTime() - new Date(notification.timestamp).getTime()) < 1000
      );

      if (isDuplicate) return prev;

      return [notification, ...prev].slice(0, 20);
    });

    handlersRef.current.onNotification?.(notification);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    const newState = connected ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED;
    setConnectionState(newState);
    setError(null);
    handlersRef.current.onConnectionChange?.(connected);
  }, []);

  const handleError = useCallback((error: Error) => {
    setError(error.message);
    setConnectionState(ConnectionState.FAILED);
    handlersRef.current.onError?.(error);
  }, []);

  // Set up service event handlers
  useEffect(() => {
    const serviceHandlers: RealTimeHandlers = {
      onBillUpdate: handleBillUpdate,
      onCommunityUpdate: handleCommunityUpdate,
      onNotification: handleNotification,
      onConnectionChange: handleConnectionChange,
      onError: handleError
    };

    webSocketService.setHandlers(serviceHandlers);

    // Sync connection state
    setConnectionState(webSocketService.getConnectionState());

    return () => {
      // Clean up handlers
      webSocketService.setHandlers({});
    };
  }, [handleBillUpdate, handleCommunityUpdate, handleNotification, handleConnectionChange, handleError]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !webSocketService.isConnected()) {
      connect();
    }
  }, [autoConnect]);

  // Handle initial subscriptions
  useEffect(() => {
    if (webSocketService.isConnected() && subscriptions.length > 0) {
      subscriptions.forEach(subscription => {
        webSocketService.subscribe(subscription);
      });
    }
  }, [webSocketService.isConnected(), subscriptions]);

  // Connection management (delegates to service)
  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      await webSocketService.connect();
    } catch (error) {
      setConnectionState(ConnectionState.FAILED);
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  // Subscription management (delegates to service)
  const subscribe = useCallback((subscription: WebSocketSubscription) => {
    webSocketService.subscribe(subscription);
  }, []);

  const unsubscribe = useCallback((subscription: WebSocketSubscription) => {
    webSocketService.unsubscribe(subscription);
  }, []);

  // Utility functions (UI-focused)
  const getBillUpdates = useCallback((billId: number) => {
    return billUpdates[billId] || [];
  }, [billUpdates]);

  const getRecentActivity = useCallback((limit = 20) => {
    const billActivity = Object.values(billUpdates).flat();
    const communityActivity = Object.values(communityUpdates).flat();
    return [...billActivity, ...communityActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [billUpdates, communityUpdates]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  // Preferences management (delegates to service)
  const updatePreferences = useCallback((preferences: Partial<BillTrackingPreferences>) => {
    billTrackingService.updatePreferences(preferences);
  }, []);

  const getPreferences = useCallback(() => {
    return billTrackingService.getPreferences();
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
    subscribe,
    unsubscribe,

    // Real-time data (UI state only)
    billUpdates,
    communityUpdates,
    notifications,
    notificationCount,

    // Utility functions
    getBillUpdates,
    getRecentActivity,
    markNotificationRead: markNotificationAsRead,

    // Preferences management
    updatePreferences,
    getPreferences
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
    billUpdates: webSocket.getBillUpdates(billId)
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

// Backward compatibility hooks (simplified versions)

/**
 * Legacy hook for bill updates (maintained for backward compatibility)
 */
export function useBillUpdates(billId?: number) {
  const [updates, setUpdates] = useState<BillUpdate[]>([]);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);

  const { billUpdates, notifications: wsNotifications } = useWebSocket({
    subscriptions: billId ? [{ type: 'bill', id: billId }] : []
  });

  useEffect(() => {
    if (billId) {
      const billSpecificUpdates = billUpdates[billId] || [];
      setUpdates(billSpecificUpdates);
    }
  }, [billId, billUpdates]);

  useEffect(() => {
    setNotifications(wsNotifications);
  }, [wsNotifications]);

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
  const webSocket = useWebSocket();

  return useMemo(() => ({
    isConnected: webSocket.isConnected,
    connectionStatus: {
      connected: webSocket.isConnected,
      reconnectAttempts: 0,
      readyState: webSocket.isConnected ? 1 : 0,
      maxReconnectAttempts: 5,
      state: webSocket.isConnected ? 'connected' : 'disconnected',
      queuedMessages: 0
    },
    connect: (token?: string) => webSocket.connect(),
    disconnect: () => webSocket.disconnect(),
    subscribeToBill: (billId: number) =>
      webSocket.subscribe({ type: 'bill', id: billId }),
    unsubscribeFromBill: (billId: number) =>
      webSocket.unsubscribe({ type: 'bill', id: billId }),
    on: () => () => {}, // Simplified for compatibility
    off: () => {}, // Simplified for compatibility
    updatePreferences: webSocket.updatePreferences,
    getWebSocketManager: () => webSocketService
  }), [webSocket]);
}