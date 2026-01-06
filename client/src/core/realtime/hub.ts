/**
 * Client Real-time Hub
 *
 * Consolidated real-time architecture that combines state management,
 * WebSocket connections, and service orchestration into a single hub.
 * The WebSocket manager serves as the primary engine for all real-time operations.
 */

import { logger } from '../../utils/logger';

import { getRealTimeConfig } from './config';
import { UnifiedWebSocketManager } from './manager';
import { BillTrackingService } from './services/bill-tracking';
import { CommunityService } from './services/community';
import { NotificationService } from './services/notifications';
import {
  CivicWebSocketState,
  BillRealTimeUpdate,
  CommunityRealTimeUpdate,
  EngagementMetricsUpdate,
  ExpertActivityUpdate,
  RealTimeNotification,
  WebSocketSubscription,
  RealTimeHandlers,
} from './types';
import { ConnectionState } from './types';
import { EventEmitter } from './utils/event-emitter';

export interface RealTimeHubState {
  // Connection state
  connection: CivicWebSocketState;

  // Real-time updates - using arrays instead of Maps for Immer compatibility
  billUpdates: Record<number, BillRealTimeUpdate[]>;
  communityUpdates: Record<string, CommunityRealTimeUpdate[]>;
  engagementMetrics: Record<number, EngagementMetricsUpdate>;
  expertActivities: ExpertActivityUpdate[];
  notifications: RealTimeNotification[];

  // UI state
  showNotifications: boolean;
  notificationCount: number;
  lastUpdateTimestamp: string | null;
}

export class RealTimeHub {
  private static instance: RealTimeHub | null = null;
  private wsManager: UnifiedWebSocketManager;
  private billTrackingService: BillTrackingService;
  private communityService: CommunityService;
  private notificationService: NotificationService;
  private eventEmitter = new EventEmitter();
  private handlers: RealTimeHandlers = {};
  private isInitialized = false;

  // State management
  private state: RealTimeHubState;
  private stateListeners: Set<(state: RealTimeHubState) => void> = new Set();

  private constructor() {
    const config = getRealTimeConfig();
    this.wsManager = UnifiedWebSocketManager.getInstance(config.websocket);

    this.billTrackingService = new BillTrackingService(this.wsManager);
    this.communityService = new CommunityService(this.wsManager);
    this.notificationService = new NotificationService(this.wsManager);

    this.state = this.createInitialState();
    this.setupWebSocketEventHandlers();
  }

  static getInstance(): RealTimeHub {
    if (!RealTimeHub.instance) {
      RealTimeHub.instance = new RealTimeHub();
    }
    return RealTimeHub.instance;
  }

  // ============================================================================
  // Initialization & Lifecycle
  // ============================================================================

  async initialize(token?: string): Promise<void> {
    if (this.isInitialized) {
      logger.debug('RealTimeHub already initialized', {
        component: 'RealTimeHub',
      });
      return;
    }

    try {
      // Connect WebSocket first
      await this.wsManager.connect(token);

      // Initialize sub-services
      await this.billTrackingService.initialize();
      await this.communityService.initialize();
      await this.notificationService.initialize();

      // Set up message routing
      this.setupMessageRouting();

      this.isInitialized = true;

      logger.info('RealTimeHub initialized successfully', {
        component: 'RealTimeHub',
      });
    } catch (error) {
      logger.error(
        'Failed to initialize RealTimeHub',
        {
          component: 'RealTimeHub',
        },
        error
      );
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Shutdown sub-services
      await this.billTrackingService.shutdown();
      await this.communityService.shutdown();
      await this.notificationService.shutdown();

      // Disconnect WebSocket
      this.wsManager.disconnect();

      this.isInitialized = false;

      logger.info('RealTimeHub shut down successfully', {
        component: 'RealTimeHub',
      });
    } catch (error) {
      logger.error(
        'Error during RealTimeHub shutdown',
        {
          component: 'RealTimeHub',
        },
        error
      );
    }
  }

  // ============================================================================
  // State Management
  // ============================================================================

  getState(): RealTimeHubState {
    return { ...this.state };
  }

  subscribeToState(listener: (state: RealTimeHubState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private updateState(updater: (state: RealTimeHubState) => void): void {
    const prevState = { ...this.state };
    updater(this.state);
    this.notifyStateListeners(prevState);
  }

  private notifyStateListeners(prevState: RealTimeHubState): void {
    // Only notify if state actually changed
    if (JSON.stringify(prevState) !== JSON.stringify(this.state)) {
      this.stateListeners.forEach(listener => {
        try {
          listener(this.getState());
        } catch (error) {
          logger.error(
            'Error in state listener',
            {
              component: 'RealTimeHub',
            },
            error
          );
        }
      });
    }
  }

  private createInitialState(): RealTimeHubState {
    const initialConnectionState: CivicWebSocketState = {
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null,
      reconnectAttempts: 0,
      bill_subscriptions: [],
      community_subscriptions: [],
      expert_subscriptions: [],
      notification_subscriptions: false,
      connection_quality: 'disconnected',
      last_heartbeat: null,
      message_count: 0,
    };

    return {
      connection: initialConnectionState,
      billUpdates: {},
      communityUpdates: {},
      engagementMetrics: {},
      expertActivities: [],
      notifications: [],
      showNotifications: false,
      notificationCount: 0,
      lastUpdateTimestamp: null,
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(token?: string): Promise<void> {
    this.updateState(state => {
      state.connection.isConnecting = true;
      state.connection.error = null;
    });

    try {
      await this.wsManager.connect(token);
    } catch (error) {
      this.updateState(state => {
        state.connection.isConnecting = false;
        state.connection.error = error instanceof Error ? error.message : 'Connection failed';
      });
      throw error;
    }
  }

  disconnect(): void {
    this.wsManager.disconnect();
  }

  isConnected(): boolean {
    return this.wsManager.getConnectionState() === ConnectionState.CONNECTED;
  }

  getConnectionState(): ConnectionState {
    return this.wsManager.getConnectionState();
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  subscribe(subscription: WebSocketSubscription): string {
    const topic = `${subscription.type}:${subscription.id}`;

    // Update state
    this.updateState(state => {
      switch (subscription.type) {
        case 'bill': {
          const billId = Number(subscription.id);
          if (!state.connection.bill_subscriptions.includes(billId)) {
            state.connection.bill_subscriptions.push(billId);
          }
          break;
        }
        case 'community': {
          const communityId = String(subscription.id);
          if (!state.connection.community_subscriptions.includes(communityId)) {
            state.connection.community_subscriptions.push(communityId);
          }
          break;
        }
        case 'expert': {
          const expertId = String(subscription.id);
          if (!state.connection.expert_subscriptions.includes(expertId)) {
            state.connection.expert_subscriptions.push(expertId);
          }
          break;
        }
        case 'user_notifications':
          state.connection.notification_subscriptions = true;
          break;
      }
    });

    // Subscribe via WebSocket manager
    return this.wsManager.subscribe(topic, (message: unknown) => {
      this.handleIncomingMessage(subscription, message);
    });
  }

  unsubscribe(subscriptionId: string): void {
    // Find the subscription to update state
    // Note: We don't have direct access to subscription details from ID,
    // so we'll let the WebSocket manager handle the unsubscribe
    this.wsManager.unsubscribe(subscriptionId);
  }

  // ============================================================================
  // State Update Actions (Redux-like)
  // ============================================================================

  updateConnectionState(update: Partial<CivicWebSocketState>): void {
    this.updateState(state => {
      state.connection = { ...state.connection, ...update };
    });
  }

  addBillUpdate(update: BillRealTimeUpdate): void {
    this.updateState(state => {
      const billId = update.bill_id;
      const existing = state.billUpdates[billId] || [];

      // Keep only last 50 updates per bill
      const updates = [...existing, update].slice(-50);
      state.billUpdates[billId] = updates;

      state.lastUpdateTimestamp = update.timestamp;
    });

    this.handlers.onBillUpdate?.(update);
  }

  addCommunityUpdate(update: CommunityRealTimeUpdate): void {
    this.updateState(state => {
      const discussionId = update.discussion_id || 'general';
      const existing = state.communityUpdates[discussionId] || [];

      // Keep only last 100 community updates per discussion
      const updates = [...existing, update].slice(-100);
      state.communityUpdates[discussionId] = updates;

      state.lastUpdateTimestamp = update.timestamp;
    });

    this.handlers.onCommunityUpdate?.(update);
  }

  updateEngagementMetrics(metrics: EngagementMetricsUpdate): void {
    this.updateState(state => {
      state.engagementMetrics[metrics.bill_id] = metrics;
      state.lastUpdateTimestamp = metrics.timestamp;
    });

    this.handlers.onEngagementUpdate?.(metrics);
  }

  addExpertActivity(activity: ExpertActivityUpdate): void {
    this.updateState(state => {
      // Keep only last 200 expert activities
      state.expertActivities = [...state.expertActivities, activity].slice(-200);
      state.lastUpdateTimestamp = activity.timestamp;
    });

    this.handlers.onExpertActivity?.(activity);
  }

  addNotification(notification: RealTimeNotification): void {
    this.updateState(state => {
      // Add to beginning of notifications array
      state.notifications = [notification, ...state.notifications].slice(0, 100);

      // Update unread count
      state.notificationCount = state.notifications.filter(n => !n.read).length;

      state.lastUpdateTimestamp = notification.created_at;
    });

    this.handlers.onNotification?.(notification);
  }

  markNotificationRead(notificationId: string): void {
    this.updateState(state => {
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        state.notificationCount = Math.max(0, state.notificationCount - 1);
      }
    });
  }

  clearNotifications(): void {
    this.updateState(state => {
      state.notifications = [];
      state.notificationCount = 0;
    });
  }

  toggleNotifications(): void {
    this.updateState(state => {
      state.showNotifications = !state.showNotifications;
    });
  }

  clearBillUpdates(billId: number): void {
    this.updateState(state => {
      delete state.billUpdates[billId];
    });
  }

  clearCommunityUpdates(discussionId: string): void {
    this.updateState(state => {
      delete state.communityUpdates[discussionId];
    });
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  setHandlers(handlers: RealTimeHandlers): void {
    this.handlers = { ...handlers };
  }

  on(event: string, listener: (data: unknown) => void): () => void {
    return this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (data: unknown) => void): void {
    this.eventEmitter.off(event, listener);
  }

  // ============================================================================
  // Service Access
  // ============================================================================

  getBillTrackingService(): BillTrackingService {
    return this.billTrackingService;
  }

  getCommunityService(): CommunityService {
    return this.communityService;
  }

  getNotificationService(): NotificationService {
    return this.notificationService;
  }

  getWebSocketManager(): UnifiedWebSocketManager {
    return this.wsManager;
  }

  // ============================================================================
  // Statistics and Monitoring
  // ============================================================================

  getStats(): {
    connectionState: ConnectionState;
    isConnected: boolean;
    subscriptionCount: number;
    billSubscriptions: number;
    communitySubscriptions: number;
    notificationSubscriptions: number;
    stateUpdateCount: number;
  } {
    return {
      connectionState: this.getConnectionState(),
      isConnected: this.isConnected(),
      subscriptionCount: this.wsManager.getSubscriptionCount(),
      billSubscriptions: this.state.connection.bill_subscriptions.length,
      communitySubscriptions: this.state.connection.community_subscriptions.length,
      notificationSubscriptions: this.state.connection.notification_subscriptions ? 1 : 0,
      stateUpdateCount: this.stateListeners.size,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupWebSocketEventHandlers(): void {
    // Connection events
    this.wsManager.on('connected', () => {
      this.updateState(state => {
        state.connection.isConnected = true;
        state.connection.isConnecting = false;
        state.connection.error = null;
        state.connection.connection_quality = 'excellent';
      });

      this.handlers.onConnectionChange?.(true);
      this.eventEmitter.emit('connected');
    });

    this.wsManager.on('disconnected', () => {
      this.updateState(state => {
        state.connection.isConnected = false;
        state.connection.isConnecting = false;
        state.connection.connection_quality = 'disconnected';
      });

      this.handlers.onConnectionChange?.(false);
      this.eventEmitter.emit('disconnected');
    });

    this.wsManager.on('error', (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateState(state => {
        state.connection.error = err.message;
        state.connection.isConnecting = false;
      });

      this.handlers.onError?.(err.message);
      this.eventEmitter.emit('error', err);
    });
  }

  private setupMessageRouting(): void {
    // The individual services handle their own message routing
    // This hub coordinates the overall flow
  }

  private handleIncomingMessage(subscription: WebSocketSubscription, message: unknown): void {
    try {
      // Cast message to WebSocketMessage type for service handlers
      const wsMessage = message as {
        type: string;
        data?: unknown;
        timestamp?: number;
        [key: string]: unknown;
      };

      // Route to appropriate service
      switch (subscription.type) {
        case 'bill':
          this.billTrackingService.handleMessage(wsMessage);
          break;
        case 'community':
          this.communityService.handleMessage(wsMessage);
          break;
        case 'user_notifications':
          this.notificationService.handleMessage(wsMessage);
          break;
        default:
          logger.warn('Unknown subscription type in hub', {
            component: 'RealTimeHub',
            type: subscription.type,
          });
      }
    } catch (error) {
      logger.error(
        'Error handling message in hub',
        {
          component: 'RealTimeHub',
          subscription,
        },
        error
      );
    }
  }
}

// Export singleton instance
export const realTimeHub = RealTimeHub.getInstance();
