/**
 * Unified WebSocket Middleware for Redux Toolkit
 *
 * Centralized real-time communication middleware that integrates with Redux Toolkit.
 * Uses the enhanced UnifiedWebSocketManager from the consolidated API client architecture.
 * Manages WebSocket connections, subscriptions, and dispatches actions to Redux store.
 */

import { Middleware } from '@reduxjs/toolkit';
import { logger } from '../../utils/logger';
import { UnifiedWebSocketManager, globalWebSocketPool } from '../../core/api/websocket';
import { ConnectionState } from '../../core/api/types';
import {
  CivicWebSocketMessage,
  CivicWebSocketState,
  WebSocketSubscription,
  PollingFallbackConfig,
  RealTimeHandlers
} from '../../types/realtime';
import {
  updateConnectionState,
  addBillUpdate,
  addCommunityUpdate,
  updateEngagementMetrics,
  addExpertActivity,
  addNotification
} from '../slices/realTimeSlice';

// WebSocket middleware configuration
interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  pollingFallback: PollingFallbackConfig;
}

// Polling fallback manager for when WebSocket is unavailable
class PollingFallbackManager {
  private config: PollingFallbackConfig;
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map();
  private handlers: RealTimeHandlers = {};
  private dispatch: any = null;
  private subscriptions: {
    bills: number[];
    notifications: boolean;
  } = { bills: [], notifications: false };

  constructor(config: PollingFallbackConfig) {
    this.config = config;
  }

  setDispatch(dispatch: any) {
    this.dispatch = dispatch;
  }

  setHandlers(handlers: RealTimeHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  updateSubscriptions(subscriptions: { bills: number[]; notifications: boolean }) {
    this.subscriptions = { ...subscriptions };
    this.restartPollingIfNeeded();
  }

  startPolling() {
    if (!this.config.enabled) return;

    logger.info('Starting polling fallback', { component: 'WebSocketMiddleware' });

    this.stopPolling();

    // Poll for bill updates
    if (this.subscriptions.bills.length > 0) {
      const billTimer = setInterval(() => {
        this.pollBillUpdates();
      }, this.config.intervals.bills);

      this.pollingTimers.set('bills', billTimer);
    }

    // Poll for engagement metrics
    const engagementTimer = setInterval(() => {
      this.pollEngagementMetrics();
    }, this.config.intervals.engagement);

    this.pollingTimers.set('engagement', engagementTimer);

    // Poll for notifications
    if (this.subscriptions.notifications) {
      const notificationTimer = setInterval(() => {
        this.pollNotifications();
      }, this.config.intervals.notifications);

      this.pollingTimers.set('notifications', notificationTimer);
    }
  }

  stopPolling() {
    this.pollingTimers.forEach((timer, key) => {
      clearInterval(timer);
      this.pollingTimers.delete(key);
    });

    if (this.pollingTimers.size === 0) {
      logger.info('Stopped polling fallback', { component: 'WebSocketMiddleware' });
    }
  }

  private restartPollingIfNeeded() {
    if (this.pollingTimers.size > 0) {
      this.startPolling(); // Restart with updated subscriptions
    }
  }

  private async pollBillUpdates() {
    try {
      const billIds = Array.from(this.subscriptions.bills);
      if (billIds.length === 0) return;

      // Make API call to get bill updates
      // const response = await fetch(`/api/bills/updates?ids=${billIds.join(',')}`);
      // const updates = await response.json();

      // Process updates through handlers
      // updates.forEach(update => this.handlers.onBillUpdate?.(update));

    } catch (error) {
      logger.error('Polling fallback error for bills', {
        component: 'WebSocketMiddleware',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async pollEngagementMetrics() {
    try {
      // const response = await fetch('/api/engagement/metrics');
      // const metrics = await response.json();
      // this.handlers.onEngagementUpdate?.(metrics);
    } catch (error) {
      logger.error('Polling fallback error for engagement', {
        component: 'WebSocketMiddleware',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async pollNotifications() {
    try {
      // const response = await fetch('/api/notifications/recent');
      // const notifications = await response.json();
      // notifications.forEach(notification => this.handlers.onNotification?.(notification));
    } catch (error) {
      logger.error('Polling fallback error for notifications', {
        component: 'WebSocketMiddleware',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Redux middleware adapter for UnifiedWebSocketManager
class WebSocketMiddlewareAdapter {
  private wsManager: UnifiedWebSocketManager;
  private pollingFallback: PollingFallbackManager;
  private config: WebSocketConfig;
  private dispatch: any = null;
  private handlers: RealTimeHandlers = {};
  private subscriptionIds: Map<string, string> = new Map(); // Maps local keys to WS subscription IDs

  constructor(config: WebSocketConfig) {
    this.config = config;
    this.wsManager = globalWebSocketPool.getConnection(config.url);
    this.pollingFallback = new PollingFallbackManager(config.pollingFallback);
    this.setupEventListeners();
  }

  setDispatch(dispatch: any) {
    this.dispatch = dispatch;
    this.pollingFallback.setDispatch(dispatch);
  }

  setHandlers(handlers: RealTimeHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
    this.pollingFallback.setHandlers(handlers);
  }

  async connect(): Promise<void> {
    try {
      await this.wsManager.connect();
      this.pollingFallback.stopPolling();
      this.updateConnectionState();
    } catch (error) {
      logger.error('Failed to connect WebSocket', {
        component: 'WebSocketMiddleware',
        error: error instanceof Error ? error.message : String(error)
      });
      // Start polling fallback on connection failure
      this.pollingFallback.startPolling();
      throw error;
    }
  }

  disconnect() {
    this.wsManager.disconnect();
    this.pollingFallback.stopPolling();
    this.updateConnectionState();
  }

  subscribe(subscription: WebSocketSubscription) {
    const key = `${subscription.type}:${subscription.id}`;

    // Handle different subscription types
    switch (subscription.type) {
      case 'bill':
        const billId = Number(subscription.id);
        const subscriptionId = this.wsManager.subscribeToBill(billId);
        this.subscriptionIds.set(key, subscriptionId);

        // Update polling fallback subscriptions
        const currentBills = Array.from(this.subscriptionIds.entries())
          .filter(([k, _]) => k.startsWith('bill:'))
          .map(([k, _]) => Number(k.split(':')[1]));
        this.pollingFallback.updateSubscriptions({
          bills: currentBills,
          notifications: this.subscriptionIds.has('user_notifications:user')
        });
        break;

      case 'user_notifications':
        // For notifications, subscribe to general message events
        const notifSubscriptionId = this.wsManager.subscribe('notifications', (message) => {
          this.handleNotification(message);
        });
        this.subscriptionIds.set(key, notifSubscriptionId);

        this.pollingFallback.updateSubscriptions({
          bills: Array.from(this.subscriptionIds.entries())
            .filter(([k, _]) => k.startsWith('bill:'))
            .map(([k, _]) => Number(k.split(':')[1])),
          notifications: true
        });
        break;

      default:
        // For other types, use general subscription
        const generalSubscriptionId = this.wsManager.subscribe(subscription.type, (message) => {
          this.handleMessage(message);
        });
        this.subscriptionIds.set(key, generalSubscriptionId);
        break;
    }
  }

  unsubscribe(subscription: WebSocketSubscription) {
    const key = `${subscription.type}:${subscription.id}`;
    const subscriptionId = this.subscriptionIds.get(key);

    if (subscriptionId) {
      if (subscription.type === 'bill') {
        this.wsManager.unsubscribeFromBill(Number(subscription.id));
      } else {
        this.wsManager.unsubscribe(subscriptionId);
      }
      this.subscriptionIds.delete(key);

      // Update polling fallback subscriptions
      const currentBills = Array.from(this.subscriptionIds.entries())
        .filter(([k, _]) => k.startsWith('bill:'))
        .map(([k, _]) => Number(k.split(':')[1]));
      this.pollingFallback.updateSubscriptions({
        bills: currentBills,
        notifications: this.subscriptionIds.has('user_notifications:user')
      });
    }
  }

  private setupEventListeners() {
    // Listen to WebSocket manager events
    this.wsManager.on('connected', () => {
      logger.info('WebSocket connected', { component: 'WebSocketMiddleware' });
      this.pollingFallback.stopPolling();
      this.handlers.onConnectionChange?.(true);
      this.updateConnectionState();
    });

    this.wsManager.on('disconnected', (event) => {
      logger.warn('WebSocket disconnected', {
        component: 'WebSocketMiddleware',
        code: event?.code,
        reason: event?.reason
      });
      this.pollingFallback.startPolling();
      this.handlers.onConnectionChange?.(false);
      this.updateConnectionState();
    });

    this.wsManager.on('error', (error) => {
      logger.error('WebSocket error', {
        component: 'WebSocketMiddleware',
        error: error.toString()
      });
      this.handlers.onError?.('WebSocket connection error');
      this.updateConnectionState();
    });

    this.wsManager.on('message', (message) => {
      this.handleMessage(message);
    });
  }

  private handleMessage(message: any) {
    try {
      // Map UnifiedWebSocketManager messages to CivicWebSocketMessage format
      const civicMessage: CivicWebSocketMessage = this.mapToCivicMessage(message);

      // Handle different message types
      switch (civicMessage.type) {
        case 'bill_update':
          if (civicMessage.update) {
            this.handlers.onBillUpdate?.(civicMessage.update);
            this.dispatch?.(addBillUpdate(civicMessage.update));
          }
          break;

        case 'community_update':
          if (civicMessage.community_update) {
            this.handlers.onCommunityUpdate?.(civicMessage.community_update);
            this.dispatch?.(addCommunityUpdate(civicMessage.community_update));
          }
          break;

        case 'engagement_metrics':
          if (civicMessage.engagement_metrics) {
            this.handlers.onEngagementUpdate?.(civicMessage.engagement_metrics);
            this.dispatch?.(updateEngagementMetrics(civicMessage.engagement_metrics));
          }
          break;

        case 'expert_activity':
          if (civicMessage.expert_activity) {
            this.handlers.onExpertActivity?.(civicMessage.expert_activity);
            this.dispatch?.(addExpertActivity(civicMessage.expert_activity));
          }
          break;

        case 'notification':
          if (civicMessage.notification) {
            this.handlers.onNotification?.(civicMessage.notification);
            this.dispatch?.(addNotification(civicMessage.notification));
          }
          break;

        case 'error':
          logger.error('WebSocket server error', {
            component: 'WebSocketMiddleware',
            message: civicMessage.message
          });
          this.handlers.onError?.(civicMessage.message || 'Server error');
          break;
      }

      this.updateConnectionState();

    } catch (error) {
      logger.error('Failed to handle WebSocket message', {
        component: 'WebSocketMiddleware',
        error: error instanceof Error ? error.message : String(error),
        message
      });
    }
  }

  private handleNotification(message: any) {
    // Handle notification messages
    if (message.type === 'notification' && message.notification) {
      this.handlers.onNotification?.(message.notification);
      this.dispatch?.(addNotification(message.notification));
    }
  }

  private mapToCivicMessage(message: any): CivicWebSocketMessage {
    // Map UnifiedWebSocketManager message format to CivicWebSocketMessage
    return {
      type: message.type,
      update: message.update,
      community_update: message.community_update,
      engagement_metrics: message.engagement_metrics,
      expert_activity: message.expert_activity,
      notification: message.notification,
      message: message.message,
      timestamp: message.timestamp || new Date().toISOString()
    };
  }

  private updateConnectionState() {
    if (!this.dispatch) return;

    const wsStatus = this.wsManager.getConnectionStatus();
    const metrics = this.wsManager.getConnectionMetrics();

    // Map UnifiedWebSocketManager state to CivicWebSocketState
    const civicState: Partial<CivicWebSocketState> = {
      isConnected: wsStatus.connected,
      isConnecting: wsStatus.state === ConnectionState.CONNECTING,
      error: wsStatus.state === ConnectionState.FAILED ? 'Connection failed' : null,
      reconnectAttempts: wsStatus.reconnectAttempts,
      connection_quality: this.mapConnectionQuality(metrics.status),
      last_heartbeat: metrics.lastPong?.toISOString() || null,
      message_count: 0 // This would need to be tracked separately if needed
    };

    this.dispatch(updateConnectionState(civicState));
  }

  private mapConnectionQuality(status: ConnectionState): 'excellent' | 'good' | 'poor' | 'disconnected' {
    switch (status) {
      case ConnectionState.CONNECTED:
        return 'excellent';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'good';
      case ConnectionState.FAILED:
        return 'poor';
      default:
        return 'disconnected';
    }
  }

  getConnectionMetrics() {
    return this.wsManager.getConnectionMetrics();
  }
}

// Create WebSocket middleware adapter instance
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

const wsAdapter = new WebSocketMiddlewareAdapter(wsConfig);

// WebSocket middleware
export const webSocketMiddleware: Middleware = (store) => (next) => (action: any) => {
  const { dispatch } = store;
  wsAdapter.setDispatch(dispatch);

  // Handle WebSocket-related actions
  if (action.type === 'realTime/connect') {
    wsAdapter.connect().catch((error: any) => {
      logger.error('Failed to connect WebSocket', {
        component: 'WebSocketMiddleware',
        error: error instanceof Error ? error.message : String(error)
      });
    });
  } else if (action.type === 'realTime/disconnect') {
    wsAdapter.disconnect();
  } else if (action.type === 'realTime/subscribe') {
    wsAdapter.subscribe(action.payload);
  } else if (action.type === 'realTime/unsubscribe') {
    wsAdapter.unsubscribe(action.payload);
  } else if (action.type === 'realTime/setHandlers') {
    wsAdapter.setHandlers(action.payload);
  }

  return next(action);
};

// Export WebSocket adapter for direct access and metrics
export { wsAdapter };