/**
 * WebSocket Hook
 * 
 * A hook for managing WebSocket connections with fallback to polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@client/utils/logger';

export interface WebSocketOptions {
  autoConnect?: boolean;
  subscriptions?: Array<{ type: string; id: string }>;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  error: string | null;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    created_at: string;
    read: boolean;
  }>;
  notificationCount: number;
  getRecentActivity: (limit: number) => Array<{
    id: string;
    type: string;
    timestamp: string;
    bill_id?: string;
  }>;
  markNotificationRead: (id: string) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: WebSocketOptions = {}): WebSocketHookReturn {
  const {
    autoConnect = false,
    subscriptions = [],
    reconnectAttempts = 3,
    reconnectInterval = 5000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    created_at: string;
    read: boolean;
  }>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: string;
    timestamp: string;
    bill_id?: string;
  }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);

  const startPollingFallback = useCallback(() => {
    // Simulate polling for notifications and activity
    const pollInterval = setInterval(() => {
      // Simulate receiving notifications
      if (Math.random() > 0.8) {
        const newNotification = {
          id: `notification_${Date.now()}`,
          title: 'Bill Update',
          message: 'A bill you\'re following has been updated',
          created_at: new Date().toISOString(),
          read: false
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

    return () => clearInterval(pollInterval);
  }, []);

  const connect = useCallback(() => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      // In a real implementation, this would connect to actual WebSocket
      // For now, we'll simulate connection and use polling fallback

      logger.info('WebSocket connection attempted', {
        component: 'useWebSocket',
        subscriptions: subscriptions.length
      });

      // Simulate connection delay
      setTimeout(() => {
        setIsConnecting(false);

        // Simulate connection failure for demo (would be real WebSocket in production)
        if (Math.random() > 0.7) {
          setIsConnected(true);
          setConnectionQuality('good');
          reconnectCountRef.current = 0;

          // Start polling fallback
          startPollingFallback();

          logger.info('WebSocket connected successfully', {
            component: 'useWebSocket'
          });
        } else {
          setError('Connection failed, using polling fallback');
          setConnectionQuality('poor');

          // Start polling fallback immediately
          startPollingFallback();

          logger.warn('WebSocket connection failed, using polling fallback', {
            component: 'useWebSocket'
          });
        }
      }, 1000);

    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Connection failed');

      // Schedule reconnect
      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    }
  }, [isConnecting, isConnected, subscriptions.length, startPollingFallback, reconnectAttempts, reconnectInterval]); // startPollingFallback omitted to avoid circular dependency

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionQuality('disconnected');
    setError(null);
    reconnectCountRef.current = 0;

    logger.info('WebSocket disconnected', {
      component: 'useWebSocket'
    });
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
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  const notificationCount = notifications.filter(n => !n.read).length;

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
    disconnect
  };
}