/**
 * Unified WebSocket Middleware for Redux Toolkit
 *
 * Centralized real-time communication middleware that integrates with Redux Toolkit.
 * Uses the enhanced UnifiedWebSocketManager from the consolidated API client architecture.
 * Manages WebSocket connections, subscriptions, and dispatches actions to Redux store.
 */

import { Middleware, Dispatch, Action } from '@reduxjs/toolkit';

import { ConnectionState } from '@client/core/api/types';
import { UnifiedWebSocketManager, globalWebSocketPool } from '@client/core/api/websocket';
import {
  CivicWebSocketMessage,
  CivicWebSocketState,
  WebSocketSubscription,
  PollingFallbackConfig,
  RealTimeHandlers,
  BillRealTimeUpdate,
  CommunityRealTimeUpdate,
  EngagementMetricsUpdate,
  ExpertActivityUpdate,
  RealTimeNotification
} from '@client/types/realtime';
import { logger } from '@client/utils/logger';

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
  private subscriptions: {
    bills: number[];
    notifications: boolean;
  } = { bills: [], notifications: false };

  constructor(config: PollingFallbackConfig) {
    this.config = config;
  }

  setDispatch(_dispatch: Dispatch<Action>) {
    // Dispatch will be used when polling methods are implemented
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
    this.pollingTimers.forEach((timer) => {
      clearInterval(timer);
    });
    this.pollingTimers.clear();

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
  private _wsConfig: WebSocketConfig;
  private reduxDispatch: Dispatch<Action> | null = null;
  private handlers: RealTimeHandlers = {};
  private subscriptionIds: Map<string, string> = new Map(); // Maps local keys to WS subscription IDs
  
  // Race condition prevention
  private connectionStateUpdateTimeout: NodeJS.Timeout | null = null;
  private pendingConnectionState: Partial<CivicWebSocketState> | null = null;
  private subscriptionQueue: Array<() => Promise<void>> = [];
  private processingSubscriptions = false;

  constructor(config: WebSocketConfig) {
    this._wsConfig = config;
    this.wsManager = globalWebSocketPool.getConnection(config.url);
    this.pollingFallback = new PollingFallbackManager(config.pollingFallback);
    this.setupEventListeners();
  }

  setDispatch(dispatch: Dispatch<Action>) {
    this.reduxDispatch = dispatch;
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
    this.queueSubscriptionOperation(async () => {
      const key = `${subscription.type}:${subscription.id}`;

      // Check if already subscribed to prevent duplicates
      if (this.subscriptionIds.has(key)) {
        logger.debug('Already subscribed to', { 
          component: 'WebSocketMiddleware',
          key 
        });
        return;
      }

      // Handle different subscription types
      switch (subscription.type) {
        case 'bill': {
          const billId = Number(subscription.id);
          const subscriptionId = this.wsManager.subscribeToBill(billId);
          this.subscriptionIds.set(key, subscriptionId);
          break;
        }

        case 'user_notifications': {
          // For notifications, subscribe to general message events
          const notificationSubscriptionId = this.wsManager.subscribe('notifications', (message) => {
            this.handleNotification(message);
          });
          this.subscriptionIds.set(key, notificationSubscriptionId);
          break;
        }

        default: {
          // For other types, use general subscription
          const generalSubscriptionId = this.wsManager.subscribe(subscription.type, (message) => {
            this.handleMessage(message);
          });
          this.subscriptionIds.set(key, generalSubscriptionId);
          break;
        }
      }

      // Update polling fallback subscriptions
      this.updatePollingFallbackSubscriptions();
    });
  }

  unsubscribe(subscription: WebSocketSubscription) {
    this.queueSubscriptionOperation(async () => {
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
        this.updatePollingFallbackSubscriptions();
      }
    });
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

  private handleMessage(message: unknown) {
    try {
      // Map UnifiedWebSocketManager messages to CivicWebSocketMessage format
      const civicMessage: CivicWebSocketMessage = this.mapToCivicMessage(message);

      // Handle different message types
      switch (civicMessage.type) {
        case 'bill_update':
          if (civicMessage.update) {
            this.handlers.onBillUpdate?.(civicMessage.update);
            this.reduxDispatch?.(addBillUpdate(civicMessage.update));
          }
          break;

        case 'community_update':
          if (civicMessage.community_update) {
            this.handlers.onCommunityUpdate?.(civicMessage.community_update);
            this.reduxDispatch?.(addCommunityUpdate(civicMessage.community_update));
          }
          break;

        case 'engagement_metrics':
          if (civicMessage.engagement_metrics) {
            this.handlers.onEngagementUpdate?.(civicMessage.engagement_metrics);
            this.reduxDispatch?.(updateEngagementMetrics(civicMessage.engagement_metrics));
          }
          break;

        case 'expert_activity':
          if (civicMessage.expert_activity) {
            this.handlers.onExpertActivity?.(civicMessage.expert_activity);
            this.reduxDispatch?.(addExpertActivity(civicMessage.expert_activity));
          }
          break;

        case 'notification':
          if (civicMessage.notification) {
            this.handlers.onNotification?.(civicMessage.notification);
            this.reduxDispatch?.(addNotification(civicMessage.notification));
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
        message: message
      });
    }
  }

  private handleNotification(message: unknown) {
    // Handle notification messages
    const msg = message as Record<string, unknown>;
    if (msg.type === 'notification' && msg.notification) {
      const notification = msg.notification as RealTimeNotification;
      this.handlers.onNotification?.(notification);
      this.reduxDispatch?.(addNotification(notification));
    }
  }

  private mapToCivicMessage(message: unknown): CivicWebSocketMessage {
    // Map UnifiedWebSocketManager message format to CivicWebSocketMessage
    const msg = message as Record<string, unknown>;
    
    // Type guard for message type
    const messageType = msg.type as CivicWebSocketMessage['type'];
    const validTypes = ['connected', 'subscribed', 'unsubscribed', 'bill_update', 'community_update', 
                       'engagement_metrics', 'expert_activity', 'notification', 'error', 'pong'];
    
    if (!validTypes.includes(messageType)) {
      throw new Error(`Invalid message type: ${messageType}`);
    }

    return {
      type: messageType,
      update: msg.update as BillRealTimeUpdate | undefined,
      community_update: msg.community_update as CommunityRealTimeUpdate | undefined,
      engagement_metrics: msg.engagement_metrics as EngagementMetricsUpdate | undefined,
      expert_activity: msg.expert_activity as ExpertActivityUpdate | undefined,
      notification: msg.notification as RealTimeNotification | undefined,
      message: msg.message as string | undefined,
      timestamp: (msg.timestamp as string) || new Date().toISOString()
    };
  }

  private updateConnectionState() {
    if (!this.reduxDispatch) return;

    // Clear existing timeout to prevent race conditions
    if (this.connectionStateUpdateTimeout) {
      clearTimeout(this.connectionStateUpdateTimeout);
    }

    // Debounce connection state updates to prevent rapid state changes
    this.connectionStateUpdateTimeout = setTimeout(() => {
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

      // Merge with any pending state updates
      const finalState = this.pendingConnectionState 
        ? { ...this.pendingConnectionState, ...civicState }
        : civicState;

      this.reduxDispatch!(updateConnectionState(finalState));
      
      // Reset state
      this.pendingConnectionState = null;
      this.connectionStateUpdateTimeout = null;
    }, 100); // 100ms debounce to prevent rapid updates
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

  /**
   * Queue subscription operations to prevent race conditions
   */
  private async queueSubscriptionOperation(operation: () => Promise<void>) {
    this.subscriptionQueue.push(operation);
    
    if (!this.processingSubscriptions) {
      await this.processSubscriptionQueue();
    }
  }

  /**
   * Process queued subscription operations sequentially
   */
  private async processSubscriptionQueue() {
    this.processingSubscriptions = true;
    
    while (this.subscriptionQueue.length > 0) {
      const operation = this.subscriptionQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          logger.error('Subscription operation failed', {
            component: 'WebSocketMiddleware',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    
    this.processingSubscriptions = false;
  }

  /**
   * Update polling fallback subscriptions helper
   */
  private updatePollingFallbackSubscriptions() {
    const currentBills = Array.from(this.subscriptionIds.entries())
      .filter(([k]) => k.startsWith('bill:'))
      .map(([k]) => Number(k.split(':')[1]));
    
    this.pollingFallback.updateSubscriptions({
      bills: currentBills,
      notifications: this.subscriptionIds.has('user_notifications:user')
    });
  }

  /**
   * Cleanup method to clear timeouts and queues
   */
  cleanup() {
    if (this.connectionStateUpdateTimeout) {
      clearTimeout(this.connectionStateUpdateTimeout);
      this.connectionStateUpdateTimeout = null;
    }
    this.subscriptionQueue.length = 0;
    this.processingSubscriptions = false;
    this.pendingConnectionState = null;
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
export const webSocketMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  wsAdapter.setDispatch(store.dispatch);

  // Handle WebSocket-related actions
  const reduxAction = action as Action & { type: string; payload?: unknown };
  if (reduxAction.type === 'realTime/connect') {
    wsAdapter.connect().catch((error: Error) => {
      logger.error('Failed to connect WebSocket', {
        component: 'WebSocketMiddleware',
        error: error instanceof Error ? error.message : String(error)
      });
    });
  } else if (reduxAction.type === 'realTime/disconnect') {
    wsAdapter.disconnect();
  } else if (reduxAction.type === 'realTime/subscribe') {
    wsAdapter.subscribe(reduxAction.payload as WebSocketSubscription);
  } else if (reduxAction.type === 'realTime/unsubscribe') {
    wsAdapter.unsubscribe(reduxAction.payload as WebSocketSubscription);
  } else if (reduxAction.type === 'realTime/setHandlers') {
    wsAdapter.setHandlers(reduxAction.payload as RealTimeHandlers);
  }

  return next(action);
};

// Export WebSocket adapter for direct access and metrics
export { wsAdapter };