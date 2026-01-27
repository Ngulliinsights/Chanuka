/**
 * Unified WebSocket Middleware for Redux Toolkit
 *
 * Centralized real-time communication middleware that integrates with Redux Toolkit.
 * Uses the enhanced UnifiedWebSocketManager from the consolidated API client architecture.
 * Manages WebSocket connections, subscriptions, and dispatches actions to Redux store.
 */

import { Middleware, Dispatch, Action } from '@reduxjs/toolkit';
import { ConnectionState } from '@server/infrastructure/schema/websocket';

import { realTimeService } from '@client/core/realtime';
import { WebSocketSubscription } from '@client/core/realtime/types';
import {
  CivicWebSocketState,
  PollingFallbackConfig,
  RealTimeHandlers,
  BillRealTimeUpdate,
  RealTimeNotification,
} from '@client/core/realtime/types';
import { logger } from '@client/lib/utils/logger';

import { updateConnectionState, addBillUpdate, addNotification } from '../slices/realTimeSlice';

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
  private pollingTimers: Map<string, number> = new Map();
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
      const billTimer = window.setInterval(() => {
        this.pollBillUpdates();
      }, this.config.intervals.bills);

      this.pollingTimers.set('bills', billTimer);
    }

    // Poll for engagement metrics
    const engagementTimer = window.setInterval(() => {
      this.pollEngagementMetrics();
    }, this.config.intervals.engagement);

    this.pollingTimers.set('engagement', engagementTimer);

    // Poll for notifications
    if (this.subscriptions.notifications) {
      const notificationTimer = window.setInterval(() => {
        this.pollNotifications();
      }, this.config.intervals.notifications);

      this.pollingTimers.set('notifications', notificationTimer);
    }
  }

  stopPolling() {
    this.pollingTimers.forEach(timer => {
      window.clearInterval(timer);
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
        error: error instanceof Error ? error.message : String(error),
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
        error: error instanceof Error ? error.message : String(error),
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
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// Redux middleware adapter for RealTimeService
class WebSocketMiddlewareAdapter {
  private pollingFallback: PollingFallbackManager;
  private reduxDispatch: Dispatch<Action> | null = null;
  private handlers: RealTimeHandlers = {};
  private subscriptionIds: Map<string, string> = new Map(); // Maps local keys to WS subscription IDs

  // Race condition prevention
  private connectionStateUpdateTimeout: number | null = null;
  private pendingConnectionState: Partial<CivicWebSocketState> | null = null;
  private subscriptionQueue: Array<() => Promise<void>> = [];
  private processingSubscriptions = false;

  constructor(config: WebSocketConfig) {
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
      await realTimeService.connect();
      this.pollingFallback.stopPolling();
      this.updateConnectionState();
    } catch (error) {
      logger.error('Failed to connect WebSocket', {
        component: 'WebSocketMiddleware',
        error: error instanceof Error ? error.message : String(error),
      });
      // Start polling fallback on connection failure
      this.pollingFallback.startPolling();
      throw error;
    }
  }

  disconnect() {
    realTimeService.disconnect();
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
          key,
        });
        return;
      }

      // Use realTimeService for subscriptions
      const subscriptionId = realTimeService.subscribe(subscription);
      this.subscriptionIds.set(key, subscriptionId);

      // Update polling fallback subscriptions
      this.updatePollingFallbackSubscriptions();
    });
  }

  unsubscribe(subscription: WebSocketSubscription) {
    this.queueSubscriptionOperation(async () => {
      const key = `${subscription.type}:${subscription.id}`;
      const subscriptionId = this.subscriptionIds.get(key);

      if (subscriptionId) {
        realTimeService.unsubscribe(subscriptionId);
        this.subscriptionIds.delete(key);

        // Update polling fallback subscriptions
        this.updatePollingFallbackSubscriptions();
      }
    });
  }

  private setupEventListeners() {
    // Listen to realTimeService events
    realTimeService.on('connected', () => {
      logger.info('WebSocket connected', { component: 'WebSocketMiddleware' });
      this.pollingFallback.stopPolling();
      this.handlers.onConnectionChange?.(true);
      this.updateConnectionState();
    });

    realTimeService.on('disconnected', () => {
      logger.warn('WebSocket disconnected', {
        component: 'WebSocketMiddleware',
      });
      this.pollingFallback.startPolling();
      this.handlers.onConnectionChange?.(false);
      this.updateConnectionState();
    });

    realTimeService.on('error', (data: unknown) => {
      const error = data as Error;
      logger.error(
        'WebSocket error',
        {
          component: 'WebSocketMiddleware',
        },
        error
      );
      this.handlers.onError?.(error.message);
      this.updateConnectionState();
    });

    // Listen to specific real-time events
    realTimeService.on('billUpdate', (data: unknown) => {
      const update = data as BillRealTimeUpdate;
      this.handlers.onBillUpdate?.(update);
      this.reduxDispatch?.(addBillUpdate(update));
    });

    realTimeService.on('notification', (data: unknown) => {
      const notification = data as RealTimeNotification;
      this.handlers.onNotification?.(notification);
      this.reduxDispatch?.(addNotification(notification));
    });
  }

  // Message handling is now done directly through event listeners

  private updateConnectionState() {
    if (!this.reduxDispatch) return;

    // Clear existing timeout to prevent race conditions
    if (this.connectionStateUpdateTimeout) {
      window.clearTimeout(this.connectionStateUpdateTimeout);
    }

    // Debounce connection state updates to prevent rapid state changes
    this.connectionStateUpdateTimeout = window.setTimeout(() => {
      const isConnected = realTimeService.isConnected();

      // Map realTimeService state to CivicWebSocketState
      const civicState: Partial<CivicWebSocketState> = {
        isConnected,
        isConnecting: false, // realTimeService doesn't expose connecting state
        error: null,
        reconnectAttempts: 0,
        connection_quality: isConnected ? 'excellent' : 'disconnected',
        last_heartbeat: null,
        message_count: 0,
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

  getConnectionMetrics() {
    // Return basic metrics since realTimeService doesn't expose detailed metrics
    return {
      status: realTimeService.isConnected()
        ? ConnectionState.CONNECTED
        : ConnectionState.DISCONNECTED,
      reconnectAttempts: 0,
      lastPong: null,
    };
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
            error: error instanceof Error ? error.message : String(error),
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
      notifications: this.subscriptionIds.has('user_notifications:user'),
    });
  }

  /**
   * Cleanup method to clear timeouts and queues
   */
  cleanup() {
    if (this.connectionStateUpdateTimeout) {
      window.clearTimeout(this.connectionStateUpdateTimeout);
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
      bills: 30000, // 30 seconds
      engagement: 60000, // 1 minute
      notifications: 15000, // 15 seconds
      community: 45000, // 45 seconds
    },
    max_retries: 3,
    backoff_multiplier: 1.5,
  },
};

const wsAdapter = new WebSocketMiddlewareAdapter(wsConfig);

// WebSocket middleware
export const webSocketMiddleware: Middleware = store => next => (action: unknown) => {
  wsAdapter.setDispatch(store.dispatch);

  // Handle WebSocket-related actions
  const reduxAction = action as Action & { type: string; payload?: unknown };
  if (reduxAction.type === 'realTime/connect') {
    wsAdapter.connect().catch((error: Error) => {
      logger.error('Failed to connect WebSocket', {
        component: 'WebSocketMiddleware',
        error: error instanceof Error ? error.message : String(error),
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
