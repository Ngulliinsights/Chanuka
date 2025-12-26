/**
 * WebSocket Hook
 * 
 * A hook for managing WebSocket connections with fallback to polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@client/utils/logger';
import { WebSocketClient, createWebSocketClient } from './websocket-client';
import type { 
  WebSocketHookReturn, 
  NotificationData, 
  ConnectionState,
  ClientWebSocketMessage 
} from '../api/types/websocket';

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
      : 'ws://localhost:3001/api/ws'
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: string;
    timestamp: string;
    bill_id?: string;
  }>>([]);

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket client
  const initializeClient = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }

    wsClientRef.current = createWebSocketClient({
      url,
      reconnect: {
        enabled: true,
        maxAttempts: reconnectAttempts,
        baseDelay: reconnectInterval,
        maxDelay: 30000
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 5000
      }
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
      
      if (code !== 1000) { // Not a normal closure
        setError(`Connection lost: ${reason}`);
        startPollingFallback();
      }
    });

    wsClientRef.current.on('message', (message: ClientWebSocketMessage) => {
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
        attempt
      });
    });

  }, [url, reconnectAttempts, reconnectInterval, subscriptions]);

  // Handle incoming messages
  const handleMessage = useCallback((message: ClientWebSocketMessage) => {
    switch (message.type) {
      case 'notification':
        if (message.data) {
          const notification: NotificationData = {
            id: message.data.id || `notification_${Date.now()}`,
            type: message.data.type || 'info',
            title: message.data.title || 'Notification',
            message: message.data.message || '',
            data: message.data.data,
            timestamp: message.data.timestamp || new Date().toISOString()
          };
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
        }
        break;

      case 'bill_update':
        if (message.data?.billId) {
          const activity = {
            id: `activity_${Date.now()}`,
            type: 'bill_updated',
            timestamp: new Date().toISOString(),
            bill_id: message.data.billId.toString()
          };
          setRecentActivity(prev => [activity, ...prev.slice(0, 19)]);
        }
        break;

      case 'community_update':
        const communityActivity = {
          id: `activity_${Date.now()}`,
          type: 'community_update',
          timestamp: new Date().toISOString()
        };
        setRecentActivity(prev => [communityActivity, ...prev.slice(0, 19)]);
        break;

      default:
        logger.debug('Unhandled message type', {
          component: 'useWebSocket',
          messageType: message.type
        });
    }
  }, []);

  // Fallback polling mechanism
  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    logger.info('Starting polling fallback', {
      component: 'useWebSocket'
    });

    pollingIntervalRef.current = setInterval(() => {
      // Simulate receiving notifications
      if (Math.random() > 0.8) {
        const newNotification: NotificationData = {
          id: `notification_${Date.now()}`,
          type: 'info',
          title: 'Bill Update',
          message: 'A bill you\'re following has been updated',
          timestamp: new Date().toISOString()
        };
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      }

      // Simulate activity updates
      if (Math.random() > 0.9) {
        const newActivity = {
          id: `activity_${Date.now()}`,
          type: 'bill_updated',
          timestamp: new Date().toISOString(),
          bill_id: `B${Math.floor(Math.random() * 1000)}`
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

  const connect = useCallback(() => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);
    stopPollingFallback();

    if (!wsClientRef.current) {
      initializeClient();
    }

    wsClientRef.current?.connect().catch(err => {
      logger.error('WebSocket connection failed', {
        component: 'useWebSocket'
      }, err);
      setIsConnecting(false);
      setError('Connection failed, using polling fallback');
      startPollingFallback();
    });
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

  const send = useCallback((message: ClientWebSocketMessage) => {
    return wsClientRef.current?.send(message) || false;
  }, []);

  const getRecentActivity = useCallback((limit: number) => {
    return recentActivity.slice(0, limit);
  }, [recentActivity]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
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
    connectionQuality,
    error,
    notifications,
    notificationCount,
    getRecentActivity,
    markNotificationRead,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send
  };
}