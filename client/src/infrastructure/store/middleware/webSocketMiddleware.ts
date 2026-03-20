/**
 * Unified WebSocket Middleware for Redux Toolkit
 *
 * Centralized real-time communication middleware that integrates with Redux Toolkit.
 * Uses the unified realtime client from the consolidated API architecture.
 * Manages subscriptions and dispatches actions to Redux store.
 */

import { Middleware, Dispatch, Action } from '@reduxjs/toolkit';

import { realTimeService } from '@client/infrastructure/api/realtime';
import { Subscription } from '@client/infrastructure/api/types/realtime';
import {
  CivicWebSocketState,
  PollingFallbackConfig,
  RealTimeHandlers,
  BillRealTimeUpdate,
  RealTimeNotification,
  CommunityRealTimeUpdate,
  EngagementMetricsUpdate,
  ExpertActivityUpdate,
} from '@shared/core/types/realtime';
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
    if (this.subscriptions.bills.length > 0 && this.config.intervals?.bills) {
      const billTimer = window.setInterval(() => {
        this.pollBillUpdates();
      }, this.config.intervals.bills);

      this.pollingTimers.set('bills', billTimer);
    }

    // Poll for engagement metrics
    if (this.config.intervals?.engagement) {
      const engagementTimer = window.setInterval(() => {
        this.pollEngagementMetrics();
      }, this.config.intervals.engagement);

      this.pollingTimers.set('engagement', engagementTimer);
    }

    // Poll for notifications
    if (this.subscriptions.notifications && this.config.intervals?.notifications) {
      const notificationTimer = window.setInterval(() => {
        this.pollNotifications();
      }, this.config.intervals.notifications);

      this.pollingTimers.set('notifications', notificationTimer);
    }
  }

  stopPolling() {
    this.pollingTimers.forEach(timer => {
      if (timer) {
        window.clearInterval(timer);
      }
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
  private subscriptions: Map<string, Subscription> = new Map(); // Maps local keys to subscription objects

  // Race condition prevention
  private connectionStateUpdateTimeout: number | null = null;

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

  /**
   * Subscribe to a bill's real-time updates
   */
  subscribeToBill(billId: number) {
    const key = `bill:${billId}`;
    if (this.subscriptions.has(key)) {
      logger.debug('Already subscribed to bill', {
        component: 'WebSocketMiddleware',
        billId,
      });
      return;
    }

    const subscription = realTimeService.subscribe<BillRealTimeUpdate>(
      `bills:${billId}`,
      (update: BillRealTimeUpdate) => {
        this.handlers.onBillUpdate?.(update);
        this.reduxDispatch?.(addBillUpdate(update));
      }
    );

    this.subscriptions.set(key, subscription);
    this.updatePollingFallbackSubscriptions();
  }

  /**
   * Subscribe to notification updates
   */
  subscribeToNotifications() {
    const key = 'notifications:user';
    if (this.subscriptions.has(key)) {
      logger.debug('Already subscribed to notifications', {
        component: 'WebSocketMiddleware',
      });
      return;
    }

    const subscription = realTimeService.subscribe<RealTimeNotification>(
      'notifications:user',
      (notification: RealTimeNotification) => {
        this.handlers.onNotification?.(notification);
        this.reduxDispatch?.(addNotification(notification));
      }
    );

    this.subscriptions.set(key, subscription);
    this.updatePollingFallbackSubscriptions();
  }

  /**
   * Unsubscribe from a bill's updates
   */
  unsubscribeFromBill(billId: number) {
    const key = `bill:${billId}`;
    const subscription = this.subscriptions.get(key);

    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
      this.updatePollingFallbackSubscriptions();
    }
  }

  /**
   * Unsubscribe from notifications
   */
  unsubscribeFromNotifications() {
    const key = 'notifications:user';
    const subscription = this.subscriptions.get(key);

    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
      this.updatePollingFallbackSubscriptions();
    }
  }

  private setupEventListeners() {
    // Listen to realTimeService events using the legacy on() interface
    realTimeService.on<BillRealTimeUpdate>('billUpdate', (update: BillRealTimeUpdate) => {
      this.handlers.onBillUpdate?.(update);
      this.reduxDispatch?.(addBillUpdate(update));
    });

    realTimeService.on<RealTimeNotification>('notification', (notification: RealTimeNotification) => {
      this.handlers.onNotification?.(notification);
      this.reduxDispatch?.(addNotification(notification));
    });

    realTimeService.on<CommunityRealTimeUpdate>('communityUpdate', (update: CommunityRealTimeUpdate) => {
      this.handlers.onCommunityUpdate?.(update);
    });

    realTimeService.on<EngagementMetricsUpdate>('engagementMetrics', (update: EngagementMetricsUpdate) => {
      this.handlers.onEngagementUpdate?.(update);
    });

    realTimeService.on<ExpertActivityUpdate>('expertActivity', (update: ExpertActivityUpdate) => {
      this.handlers.onExpertActivity?.(update);
    });

    realTimeService.on('error', (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('WebSocket error', {
        component: 'WebSocketMiddleware',
        error: errorMsg,
      });
      this.handlers.onError?.(errorMsg);
      this.updateConnectionState();
    });
  }

  private updateConnectionState() {
    const dispatch = this.reduxDispatch;
    if (!dispatch) return;

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
        bill_subscriptions: Array.from(this.subscriptions.keys())
          .filter(k => k.startsWith('bill:'))
          .map(k => Number(k.split(':')[1])),
        community_subscriptions: [],
        expert_subscriptions: [],
        notification_subscriptions: this.subscriptions.has('notifications:user'),
      };

      dispatch(updateConnectionState(civicState));

      // Reset timeout
      this.connectionStateUpdateTimeout = null;
    }, 100); // 100ms debounce to prevent rapid updates
  }

  /**
   * Update polling fallback subscriptions helper
   */
  private updatePollingFallbackSubscriptions() {
    const currentBills = Array.from(this.subscriptions.keys())
      .filter(k => k.startsWith('bill:'))
      .map(k => Number(k.split(':')[1]));

    this.pollingFallback.updateSubscriptions({
      bills: currentBills,
      notifications: this.subscriptions.has('notifications:user'),
    });
  }

  /**
   * Cleanup method to clear timeouts and subscriptions
   */
  cleanup() {
    if (this.connectionStateUpdateTimeout) {
      window.clearTimeout(this.connectionStateUpdateTimeout);
      this.connectionStateUpdateTimeout = null;
    }
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions.clear();
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
  if (reduxAction.type === 'realTime/subscribeToBill') {
    wsAdapter.subscribeToBill(reduxAction.payload as number);
  } else if (reduxAction.type === 'realTime/unsubscribeFromBill') {
    wsAdapter.unsubscribeFromBill(reduxAction.payload as number);
  } else if (reduxAction.type === 'realTime/subscribeToNotifications') {
    wsAdapter.subscribeToNotifications();
  } else if (reduxAction.type === 'realTime/unsubscribeFromNotifications') {
    wsAdapter.unsubscribeFromNotifications();
  } else if (reduxAction.type === 'realTime/setHandlers') {
    wsAdapter.setHandlers(reduxAction.payload as RealTimeHandlers);
  }

  return next(action);
};

// Export WebSocket adapter for direct access
export { wsAdapter };
