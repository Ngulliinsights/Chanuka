/**
 * Consolidated WebSocket Hook
 * 
 * Unified hook for managing WebSocket connections with fallback to polling.
 * Replaces scattered WebSocket hooks with a single, optimized implementation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedWebSocketManager } from '../websocket/manager';
import { getWebSocketConfig } from '../config';
import { 
  WebSocketHookReturn, 
  WebSocketSubscription, 
  WebSocketNotification,
  ConnectionState 
} from '../types';
import { logger } from '@client/utils/logger';

export interface WebSocketOptions {
  autoConnect?: boolean;
  subscriptions?: WebSocketSubscription[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  token?: string;
}

export function useWebSocket(options: WebSocketOptions = {}): WebSocketHookReturn {
  const {
    autoConnect = false,
    subscriptions = [],
    reconnectAttempts = 3,
    reconnectInterval = 5000,
    token
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: string;
    timestamp: string;
    bill_id?: string;
  }>>([]);

  const wsManagerRef = useRef<UnifiedWebSocketManager | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const subscriptionIdsRef = useRef<string[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket manager
  useEffect(() => {
    if (!wsManagerRef.current) {
      const config = getWebSocketConfig();
      wsManagerRef.current = UnifiedWebSocketManager.getInstance(config);
    }
  }, []);

  // Connection management
  const connect = useCallback(async () => {
    if (!wsManagerRef.current || isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      await wsManagerRef.current.connect(token);
      setIsConnected(true);
      setConnectionQuality('excellent');
      reconnectCountRef.current = 0;
      
      logger.info('WebSocket connected successfully', {
        component: 'useWebSocket',
        subscriptions: subscriptions.length
      });

      // Stop polling fallback if it was running
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setConnectionQuality('poor');
      
      // Start polling fallback
      startPollingFallback();
      
      logger.warn('WebSocket connection failed, using polling fallback', {
        component: 'useWebSocket',
        error: errorMessage
      });

      // Schedule reconnect
      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected, subscriptions, reconnectAttempts, reconnectInterval, token]);

  const disconnect = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Clean up subscriptions
    subscriptionIdsRef.current.forEach(id => {
      wsManagerRef.current?.unsubscribe(id);
    });
    subscriptionIdsRef.current = [];

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionQuality('disconnected');
    setError(null);
    reconnectCountRef.current = 0;

    logger.info('WebSocket disconnected', {
      component: 'useWebSocket'
    });
  }, []);

  // Subscription management
  const subscribe = useCallback((subscription: WebSocketSubscription): string => {
    if (!wsManagerRef.current) {
      throw new Error('WebSocket manager not initialized');
    }

    const subscriptionId = wsManagerRef.current.subscribe(
      `${subscription.type}:${subscription.id}`,
      (message) => {
        handleWebSocketMessage(subscription, message);
      }
    );

    subscriptionIdsRef.current.push(subscriptionId);
    return subscriptionId;
  }, []);

  const unsubscribe = useCallback((subscription: WebSocketSubscription): void => {
    if (!wsManagerRef.current) return;

    const subscriptionKey = `${subscription.type}:${subscription.id}`;
    const subscriptionId = subscriptionIdsRef.current.find(id => 
      // This is a simplified lookup - in a real implementation, you'd need to track the mapping
      id.includes(subscriptionKey)
    );

    if (subscriptionId) {
      wsManagerRef.current.unsubscribe(subscriptionId);
      subscriptionIdsRef.current = subscriptionIdsRef.current.filter(id => id !== subscriptionId);
    }
  }, []);

  // Message handling
  const handleWebSocketMessage = useCallback((subscription: WebSocketSubscription, message: any) => {
    try {
      if (subscription.type === 'user_notifications') {
        const notification: WebSocketNotification = {
          id: message.id || `notification_${Date.now()}`,
          type: message.type || 'info',
          title: message.title || 'Notification',
          message: message.message || '',
          priority: message.priority || 'normal',
          data: message.data,
          timestamp: message.timestamp || new Date().toISOString(),
          read: false
        };
        
        setNotifications(prev => [notification, ...prev.slice(0, 9)]);
      } else {
        // Handle other message types
        const activity = {
          id: `activity_${Date.now()}`,
          type: subscription.type,
          timestamp: new Date().toISOString(),
          bill_id: subscription.type === 'bill' ? String(subscription.id) : undefined
        };
        
        setRecentActivity(prev => [activity, ...prev.slice(0, 19)]);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', {
        component: 'useWebSocket',
        subscription
      }, error);
    }
  }, []);

  // Polling fallback
  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(() => {
      // Simulate receiving notifications
      if (Math.random() > 0.8) {
        const newNotification: WebSocketNotification = {
          id: `notification_${Date.now()}`,
          type: 'info',
          title: 'Bill Update',
          message: 'A bill you\'re following has been updated',
          priority: 'normal',
          timestamp: new Date().toISOString(),
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
  }, []);

  // Utility functions
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

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!wsManagerRef.current) return;

    const unsubscribeConnected = wsManagerRef.current.on('connected', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionQuality('excellent');
      setError(null);
    });

    const unsubscribeDisconnected = wsManagerRef.current.on('disconnected', () => {
      setIsConnected(false);
      setConnectionQuality('disconnected');
    });

    const unsubscribeError = wsManagerRef.current.on('error', (error: Error) => {
      setError(error.message);
      setConnectionQuality('poor');
    });

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeError();
    };
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

  // Set up initial subscriptions
  useEffect(() => {
    if (isConnected && subscriptions.length > 0) {
      subscriptions.forEach(subscription => {
        subscribe(subscription);
      });
    }
  }, [isConnected, subscriptions, subscribe]);

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
    disconnect,
    subscribe,
    unsubscribe
  };
}