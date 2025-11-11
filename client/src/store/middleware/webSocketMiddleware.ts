/**
 * WebSocket Middleware for Real-time Civic Engagement
 * 
 * Extends existing WebSocket implementation for bill tracking and community features.
 * Provides graceful fallback to polling and handles real-time notifications.
 */

import { Middleware } from '@reduxjs/toolkit';
import { logger } from '../../utils/logger';
import { 
  CivicWebSocketMessage, 
  CivicWebSocketState, 
  WebSocketSubscription,
  PollingFallbackConfig,
  RealTimeHandlers
} from '../../types/realtime';

// WebSocket middleware configuration
interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  pollingFallback: PollingFallbackConfig;
}

class CivicWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private state: CivicWebSocketState;
  private handlers: RealTimeHandlers = {};
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map();
  private dispatch: any = null;

  constructor(config: WebSocketConfig) {
    this.config = config;
    this.state = {
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null,
      reconnectAttempts: 0,
      bill_subscriptions: new Set(),
      community_subscriptions: new Set(),
      expert_subscriptions: new Set(),
      notification_subscriptions: false,
      connection_quality: 'disconnected',
      last_heartbeat: null,
      message_count: 0
    };
  }

  setDispatch(dispatch: any) {
    this.dispatch = dispatch;
  }

  setHandlers(handlers: RealTimeHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state.isConnected || this.state.isConnecting) {
        resolve();
        return;
      }

      this.state.isConnecting = true;
      this.updateConnectionState();

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          logger.info('WebSocket connected', { component: 'WebSocketMiddleware' });
          this.state.isConnected = true;
          this.state.isConnecting = false;
          this.state.error = null;
          this.state.reconnectAttempts = 0;
          this.state.connection_quality = 'excellent';
          
          this.updateConnectionState();
          this.startHeartbeat();
          this.stopPollingFallback();
          
          // Resubscribe to previous subscriptions
          this.resubscribe();
          
          this.handlers.onConnectionChange?.(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          logger.warn('WebSocket disconnected', { 
            component: 'WebSocketMiddleware',
            code: event.code,
            reason: event.reason
          });
          
          this.state.isConnected = false;
          this.state.isConnecting = false;
          this.state.connection_quality = 'disconnected';
          
          this.updateConnectionState();
          this.stopHeartbeat();
          this.handlers.onConnectionChange?.(false);
          
          // Start polling fallback
          this.startPollingFallback();
          
          // Attempt reconnection
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error', { 
            component: 'WebSocketMiddleware',
            error: error.toString()
          });
          
          this.state.error = 'Connection error';
          this.state.connection_quality = 'poor';
          this.updateConnectionState();
          
          this.handlers.onError?.('WebSocket connection error');
          
          if (this.state.isConnecting) {
            reject(new Error('WebSocket connection failed'));
          }
        };

      } catch (error) {
        this.state.isConnecting = false;
        this.state.error = 'Failed to create WebSocket connection';
        this.updateConnectionState();
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.stopHeartbeat();
    this.stopReconnect();
    this.stopPollingFallback();
    
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.connection_quality = 'disconnected';
    this.updateConnectionState();
  }

  subscribe(subscription: WebSocketSubscription) {
    // Track subscription locally
    switch (subscription.type) {
      case 'bill':
        this.state.bill_subscriptions.add(Number(subscription.id));
        break;
      case 'community':
        this.state.community_subscriptions.add(String(subscription.id));
        break;
      case 'expert':
        this.state.expert_subscriptions.add(String(subscription.id));
        break;
      case 'user_notifications':
        this.state.notification_subscriptions = true;
        break;
    }

    // Send subscription message if connected
    if (this.state.isConnected && this.ws) {
      this.send({
        type: 'subscribe',
        subscription
      });
    }

    this.updateConnectionState();
  }

  unsubscribe(subscription: WebSocketSubscription) {
    // Remove from local tracking
    switch (subscription.type) {
      case 'bill':
        this.state.bill_subscriptions.delete(Number(subscription.id));
        break;
      case 'community':
        this.state.community_subscriptions.delete(String(subscription.id));
        break;
      case 'expert':
        this.state.expert_subscriptions.delete(String(subscription.id));
        break;
      case 'user_notifications':
        this.state.notification_subscriptions = false;
        break;
    }

    // Send unsubscription message if connected
    if (this.state.isConnected && this.ws) {
      this.send({
        type: 'unsubscribe',
        subscription
      });
    }

    this.updateConnectionState();
  }

  private send(message: any) {
    if (this.state.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: string) {
    try {
      const message: CivicWebSocketMessage = JSON.parse(data);
      this.state.lastMessage = message;
      this.state.message_count++;
      
      // Update connection quality based on message frequency
      this.updateConnectionQuality();
      
      // Handle different message types
      switch (message.type) {
        case 'connected':
          logger.info('WebSocket handshake complete', { component: 'WebSocketMiddleware' });
          break;
          
        case 'bill_update':
          if (message.update) {
            this.handlers.onBillUpdate?.(message.update);
            this.dispatch?.({
              type: 'realTime/billUpdate',
              payload: message.update
            });
          }
          break;
          
        case 'community_update':
          if (message.community_update) {
            this.handlers.onCommunityUpdate?.(message.community_update);
            this.dispatch?.({
              type: 'realTime/communityUpdate',
              payload: message.community_update
            });
          }
          break;
          
        case 'engagement_metrics':
          if (message.engagement_metrics) {
            this.handlers.onEngagementUpdate?.(message.engagement_metrics);
            this.dispatch?.({
              type: 'realTime/engagementUpdate',
              payload: message.engagement_metrics
            });
          }
          break;
          
        case 'expert_activity':
          if (message.expert_activity) {
            this.handlers.onExpertActivity?.(message.expert_activity);
            this.dispatch?.({
              type: 'realTime/expertActivity',
              payload: message.expert_activity
            });
          }
          break;
          
        case 'notification':
          if (message.notification) {
            this.handlers.onNotification?.(message.notification);
            this.dispatch?.({
              type: 'realTime/notification',
              payload: message.notification
            });
          }
          break;
          
        case 'pong':
          this.state.last_heartbeat = new Date().toISOString();
          break;
          
        case 'error':
          logger.error('WebSocket server error', { 
            component: 'WebSocketMiddleware',
            message: message.message
          });
          this.handlers.onError?.(message.message || 'Server error');
          break;
      }
      
      this.updateConnectionState();
      
    } catch (error) {
      logger.error('Failed to parse WebSocket message', { 
        component: 'WebSocketMiddleware',
        error: error.toString(),
        data
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.state.isConnected && this.ws) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', { component: 'WebSocketMiddleware' });
      return;
    }

    this.stopReconnect();
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.state.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.reconnectTimer = setTimeout(() => {
      this.state.reconnectAttempts++;
      logger.info(`Attempting WebSocket reconnection (${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts})`, {
        component: 'WebSocketMiddleware'
      });
      
      this.connect().catch(() => {
        // Reconnection failed, will be handled by onclose
      });
    }, delay);
  }

  private stopReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resubscribe() {
    // Resubscribe to bills
    this.state.bill_subscriptions.forEach(billId => {
      this.subscribe({ type: 'bill', id: billId });
    });

    // Resubscribe to community discussions
    this.state.community_subscriptions.forEach(discussionId => {
      this.subscribe({ type: 'community', id: discussionId });
    });

    // Resubscribe to expert activities
    this.state.expert_subscriptions.forEach(expertId => {
      this.subscribe({ type: 'expert', id: expertId });
    });

    // Resubscribe to notifications
    if (this.state.notification_subscriptions) {
      this.subscribe({ type: 'user_notifications', id: 'user' });
    }
  }

  private startPollingFallback() {
    if (!this.config.pollingFallback.enabled) return;

    logger.info('Starting polling fallback', { component: 'WebSocketMiddleware' });

    // Poll for bill updates
    if (this.state.bill_subscriptions.size > 0) {
      const billTimer = setInterval(() => {
        this.pollBillUpdates();
      }, this.config.pollingFallback.intervals.bills);
      
      this.pollingTimers.set('bills', billTimer);
    }

    // Poll for engagement metrics
    const engagementTimer = setInterval(() => {
      this.pollEngagementMetrics();
    }, this.config.pollingFallback.intervals.engagement);
    
    this.pollingTimers.set('engagement', engagementTimer);

    // Poll for notifications
    if (this.state.notification_subscriptions) {
      const notificationTimer = setInterval(() => {
        this.pollNotifications();
      }, this.config.pollingFallback.intervals.notifications);
      
      this.pollingTimers.set('notifications', notificationTimer);
    }
  }

  private stopPollingFallback() {
    this.pollingTimers.forEach((timer, key) => {
      clearInterval(timer);
      this.pollingTimers.delete(key);
    });
    
    if (this.pollingTimers.size === 0) {
      logger.info('Stopped polling fallback', { component: 'WebSocketMiddleware' });
    }
  }

  private async pollBillUpdates() {
    // Implementation would make API calls for bill updates
    // This is a placeholder for the polling fallback
    try {
      const billIds = Array.from(this.state.bill_subscriptions);
      if (billIds.length === 0) return;

      // Make API call to get bill updates
      // const response = await fetch(`/api/bills/updates?ids=${billIds.join(',')}`);
      // const updates = await response.json();
      
      // Process updates through handlers
      // updates.forEach(update => this.handlers.onBillUpdate?.(update));
      
    } catch (error) {
      logger.error('Polling fallback error for bills', { 
        component: 'WebSocketMiddleware',
        error: error.toString()
      });
    }
  }

  private async pollEngagementMetrics() {
    // Placeholder for engagement metrics polling
    try {
      // const response = await fetch('/api/engagement/metrics');
      // const metrics = await response.json();
      // this.handlers.onEngagementUpdate?.(metrics);
    } catch (error) {
      logger.error('Polling fallback error for engagement', { 
        component: 'WebSocketMiddleware',
        error: error.toString()
      });
    }
  }

  private async pollNotifications() {
    // Placeholder for notifications polling
    try {
      // const response = await fetch('/api/notifications/recent');
      // const notifications = await response.json();
      // notifications.forEach(notification => this.handlers.onNotification?.(notification));
    } catch (error) {
      logger.error('Polling fallback error for notifications', { 
        component: 'WebSocketMiddleware',
        error: error.toString()
      });
    }
  }

  private updateConnectionQuality() {
    const now = Date.now();
    const lastHeartbeat = this.state.last_heartbeat ? new Date(this.state.last_heartbeat).getTime() : 0;
    const timeSinceHeartbeat = now - lastHeartbeat;

    if (!this.state.isConnected) {
      this.state.connection_quality = 'disconnected';
    } else if (timeSinceHeartbeat > 30000) { // 30 seconds
      this.state.connection_quality = 'poor';
    } else if (timeSinceHeartbeat > 10000) { // 10 seconds
      this.state.connection_quality = 'good';
    } else {
      this.state.connection_quality = 'excellent';
    }
  }

  private updateConnectionState() {
    if (this.dispatch) {
      this.dispatch({
        type: 'realTime/updateConnectionState',
        payload: { ...this.state }
      });
    }
  }

  getState(): CivicWebSocketState {
    return { ...this.state };
  }
}

// Create WebSocket client instance
const wsConfig: WebSocketConfig = {
  url: process.env.VITE_WS_URL || 'ws://localhost:3001/ws',
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  pollingFallback: {
    enabled: true,
    intervals: {
      bills: 30000,        // 30 seconds
      engagement: 60000,   // 1 minute
      notifications: 15000, // 15 seconds
      community: 45000     // 45 seconds
    },
    max_retries: 3,
    backoff_multiplier: 1.5
  }
};

const wsClient = new CivicWebSocketClient(wsConfig);

// WebSocket middleware
export const webSocketMiddleware: Middleware = (store) => (next) => (action) => {
  const { dispatch } = store;
  wsClient.setDispatch(dispatch);

  // Handle WebSocket-related actions
  switch (action.type) {
    case 'realTime/connect':
      wsClient.connect().catch((error) => {
        logger.error('Failed to connect WebSocket', { 
          component: 'WebSocketMiddleware',
          error: error.toString()
        });
      });
      break;

    case 'realTime/disconnect':
      wsClient.disconnect();
      break;

    case 'realTime/subscribe':
      wsClient.subscribe(action.payload);
      break;

    case 'realTime/unsubscribe':
      wsClient.unsubscribe(action.payload);
      break;

    case 'realTime/setHandlers':
      wsClient.setHandlers(action.payload);
      break;
  }

  return next(action);
};

// Export WebSocket client for direct access
export { wsClient };