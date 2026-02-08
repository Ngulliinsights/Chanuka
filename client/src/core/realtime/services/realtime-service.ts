/**
 * Real-time Service
 *
 * Main service orchestrating all real-time functionality.
 * Provides a unified interface for WebSocket connections, subscriptions, and real-time updates.
 */

import { logger } from '@client/lib/utils/logger';

import { getRealTimeConfig } from '../config';
import { UnifiedWebSocketManager } from '../manager';
import {
  RealTimeConfig,
  ConnectionState,
  WebSocketSubscription,
  RealTimeHandlers,
  WebSocketMessage,
  EventListener,
} from '../types';

import { BillTrackingService } from './bill-tracking';
import { CommunityService } from './community';
import { NotificationService } from './notifications';

export class RealTimeService {
  private static instance: RealTimeService | null = null;
  private wsManager: UnifiedWebSocketManager;
  private billTrackingService: BillTrackingService;
  private communityService: CommunityService;
  private notificationService: NotificationService;
  private config: RealTimeConfig;
  private handlers: RealTimeHandlers = {};
  private isInitialized = false;

  private constructor() {
    this.config = getRealTimeConfig();
    this.wsManager = UnifiedWebSocketManager.getInstance(this.config.websocket);
    this.billTrackingService = new BillTrackingService(this.wsManager);
    this.communityService = new CommunityService(this.wsManager);
    this.notificationService = new NotificationService(this.wsManager);
  }

  static getInstance(): RealTimeService {
    if (!RealTimeService.instance) {
      RealTimeService.instance = new RealTimeService();
    }
    return RealTimeService.instance;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(token?: string): Promise<void> {
    if (this.isInitialized) {
      logger.debug('RealTimeService already initialized', {
        component: 'RealTimeService',
      });
      return;
    }

    try {
      // Connect WebSocket
      await this.wsManager.connect(token);

      // Initialize sub-services
      await this.billTrackingService.initialize();
      await this.communityService.initialize();
      await this.notificationService.initialize();

      // Set up event handlers
      this.setupEventHandlers();

      this.isInitialized = true;

      logger.info('RealTimeService initialized successfully', {
        component: 'RealTimeService',
      });
    } catch (error) {
      logger.error(
        'Failed to initialize RealTimeService',
        {
          component: 'RealTimeService',
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

      logger.info('RealTimeService shut down successfully', {
        component: 'RealTimeService',
      });
    } catch (error) {
      logger.error(
        'Error during RealTimeService shutdown',
        {
          component: 'RealTimeService',
        },
        error
      );
    }
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(token?: string): Promise<void> {
    return this.wsManager.connect(token);
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

    return this.wsManager.subscribe(topic, (message: WebSocketMessage) => {
      this.handleMessage(subscription, message);
    });
  }

  unsubscribe(subscriptionId: string): void {
    this.wsManager.unsubscribe(subscriptionId);
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

  // ============================================================================
  // Event Handlers
  // ============================================================================

  setHandlers(handlers: RealTimeHandlers): void {
    this.handlers = { ...handlers };
  }

  on(event: string, listener: EventListener): () => void {
    return this.wsManager.on(event, listener);
  }

  off(event: string, listener: EventListener): void {
    this.wsManager.off(event, listener);
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
  } {
    return {
      connectionState: this.getConnectionState(),
      isConnected: this.isConnected(),
      subscriptionCount: this.wsManager.getSubscriptionCount(),
      billSubscriptions: this.billTrackingService.getSubscriptionCount(),
      communitySubscriptions: this.communityService.getSubscriptionCount(),
      notificationSubscriptions: this.notificationService.getSubscriptionCount(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupEventHandlers(): void {
    // Connection events
    this.wsManager.on('connected', () => {
      this.handlers.onConnectionChange?.(true);
      logger.info('WebSocket connected', {
        component: 'RealTimeService',
      });
    });

    this.wsManager.on('disconnected', () => {
      this.handlers.onConnectionChange?.(false);
      logger.warn('WebSocket disconnected', {
        component: 'RealTimeService',
      });
    });

    // Error event handler - properly typed to handle unknown error data
    this.wsManager.on('error', (data: unknown) => {
      // Convert unknown data to Error type for the handler
      const error = data instanceof Error ? data : new Error(String(data));
      this.handlers.onError?.(error);
      logger.error(
        'WebSocket error',
        {
          component: 'RealTimeService',
        },
        error
      );
    });
  }

  private handleMessage(subscription: WebSocketSubscription, message: WebSocketMessage): void {
    try {
      switch (subscription.type) {
        case 'bill':
          this.billTrackingService.handleMessage(message);
          break;
        case 'community':
          this.communityService.handleMessage(message);
          break;
        case 'notification':
          this.notificationService.handleMessage(message);
          break;
        default:
          logger.warn('Unknown subscription type', {
            component: 'RealTimeService',
            type: subscription.type,
          });
      }
    } catch (error) {
      logger.error(
        'Error handling real-time message',
        {
          component: 'RealTimeService',
          subscription,
        },
        error
      );
    }
  }
}

// Export singleton instance
export const realTimeService = RealTimeService.getInstance();
