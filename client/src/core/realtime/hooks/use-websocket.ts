/**
 * WebSocket Hook
 *
 * A hook for managing WebSocket connections with fallback to polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@client/lib/utils/logger';

import type {
  WebSocketHookReturn,
  RealTimeNotification,
  WebSocketMessage,
} from '../types';

import { WebSocketClient, createWebSocketClient } from '../websocket-client';

export interface WebSocketOptions {
  autoConnect?: boolean;
  subscriptions?: Array<{ type: string; id: string }>;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  url?: string;
}

export function useWebSocket(options: WebSocketOptions = {}): WebSocketHookReturn {
  const {
    autoConnect = false,
    subscriptions = [],
    reconnectAttempts = 3,
    reconnectInterval = 5000,
    url = process.env.NODE_ENV === 'production'
      ? 'wss://api.chanuka.org/ws'
      : 'ws://localhost:3001/api/ws',
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<
    'excellent' | 'good' | 'poor' | 'disconnected'
  >('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: string;
      type: string;
      timestamp: string;
      bill_id?: string;
    }>
  >([]);

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Forward declarations for these are needed because they are used in initializeClient
  // which is defined before them. Ideally we'd reorder but to minimize diff noise we'll use refs/hoisting or define valid order.
  // Actually, initializeClient calls startPollingFallback, so startPollingFallback must be defined or stable.
  // But initializeClient is a callback.
  // Let's define startPollingFallback first.
  
  // Fallback polling mechanism
  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    logger.info('Starting polling fallback', {
      component: 'useWebSocket',
    });

    pollingIntervalRef.current = setInterval(() => {
      // Simulate receiving notifications
      if (Math.random() > 0.8) {
        const newNotification: RealTimeNotification = {
          id: `notification_${Date.now()}`,
          type: 'info' as any, // Simplified for fallback
          title: 'Bill Update',
          message: "A bill you're following has been updated",
          priority: 'medium',
          created_at: new Date().toISOString(),
          read: false
        } as unknown as RealTimeNotification;
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      }

      // Simulate activity updates
      if (Math.random() > 0.9) {
        const newActivity = {
          id: `activity_${Date.now()}`,
          type: 'bill_updated',
          timestamp: new Date().toISOString(),
          bill_id: `B${Math.floor(Math.random() * 1000)}`,
        };
        setRecentActivity(prev => [newActivity, ...prev.slice(0, 19)]);
      }
    }, 5000);
  }, []);

  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'notification':
        if (message.data) {
          const notification: RealTimeNotification = {
            id: (message.data as any).id || `notification_${Date.now()}`,
            type: (message.data as any).type || 'community_activity',
            title: (message.data as any).title || 'Notification',
            message: (message.data as any).message || '',
            priority: (message.data as any).priority || 'medium',
            created_at: (message.data as any).timestamp || new Date().toISOString(),
            read: false,
          } as RealTimeNotification;
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
        }
        break;

      case 'bill_update':
        if ((message.data as any)?.billId) {
          const activity = {
            id: `activity_${Date.now()}`,
            type: 'bill_updated',
            timestamp: new Date().toISOString(),
            bill_id: (message.data as any).billId.toString(),
          };
          setRecentActivity(prev => [activity, ...prev.slice(0, 19)]);
        }
        break;

      case 'community_update':
        const communityActivity = {
          id: `activity_${Date.now()}`,
          type: 'community_update',
          timestamp: new Date().toISOString(),
        };
        setRecentActivity(prev => [communityActivity, ...prev.slice(0, 19)]);
        break;

      default:
        logger.debug('Unhandled message type', {
          component: 'useWebSocket',
          messageType: message.type,
        });
    }
  }, []);

  // Initialize WebSocket client
  const initializeClient = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }

    wsClientRef.current = createWebSocketClient({
      url,
      reconnect: true,
      reconnectInterval,
      maxReconnectAttempts: reconnectAttempts,
      heartbeatInterval: 30000,
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
      },
    });

    // Set up event handlers
    wsClientRef.current.on('connected', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionQuality('good');
      setError(null);

      // Subscribe to initial topics
      subscriptions.forEach(sub => {
        wsClientRef.current?.subscribe(`${sub.type}:${sub.id}`);
      });
    });

    wsClientRef.current.on('disconnected', (code, reason) => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionQuality('disconnected');

      if (code !== 1000) {
        // Not a normal closure
        setError(`Connection lost: ${reason}`);
        startPollingFallback();
      }
    });

    wsClientRef.current.on('message', (message: WebSocketMessage) => {
      handleMessage(message);
    });

    wsClientRef.current.on('error', (err: Error) => {
      setError(err.message);
      setConnectionQuality('poor');
      startPollingFallback();
    });

    wsClientRef.current.on('reconnecting', (attempt: number) => {
      setIsConnecting(true);
      setConnectionQuality('poor');
      logger.info('WebSocket reconnecting', {
        component: 'useWebSocket',
        attempt,
      });
    });
  }, [url, reconnectAttempts, reconnectInterval, subscriptions, handleMessage, startPollingFallback]);

  const connect = useCallback(() => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);
    stopPollingFallback();

    if (!wsClientRef.current) {
      initializeClient();
    }

    try {
      wsClientRef.current?.connect();
    } catch (err) {
      logger.error(
        'WebSocket connection failed',
        {
          component: 'useWebSocket',
        },
        err as Error
      );
      setIsConnecting(false);
      setError('Connection failed, using polling fallback');
      startPollingFallback();
    }
  }, [isConnecting, isConnected, initializeClient, stopPollingFallback, startPollingFallback]);

  const disconnect = useCallback(() => {
    stopPollingFallback();
    wsClientRef.current?.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionQuality('disconnected');
    setError(null);
  }, [stopPollingFallback]);

  const subscribe = useCallback((topics: string | string[]) => {
    return wsClientRef.current?.subscribe(topics) || false;
  }, []);

  const unsubscribe = useCallback((topics: string | string[]) => {
    return wsClientRef.current?.unsubscribe(topics) || false;
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    return wsClientRef.current?.send(message) || false;
  }, []);

  const getRecentActivity = useCallback(() => {
    return recentActivity.slice(0, 20);
  }, [recentActivity]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      initializeClient();
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only depend on autoConnect to avoid recreating client

  const notificationCount = notifications.filter((n: any) => !n.read).length;

  return {
    isConnected,
    isConnecting,
    connectionState: isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected',
    lastMessage: null,
    sendMessage: send,
    subscribe: (channel: string) => subscribe(channel),
    unsubscribe: (channel: string) => unsubscribe(channel),
    connect,
    disconnect,
    notifications,
    connectionQuality: connectionQuality as 'good' | 'fair' | 'poor',
    error: error ? new Error(error) : null,
    getRecentActivity,
    markNotificationRead,
  };
}
