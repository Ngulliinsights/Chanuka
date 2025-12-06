/**
 * WebSocket Service
 * 
 * Business logic service for managing WebSocket connections,
 * subscriptions, and real-time data processing.
 */

import { UnifiedWebSocketManager } from '@client/core/api/websocket';
import { logger } from '@client/utils/logger';

import { 
  WebSocketSubscription, 
  BillUpdate, 
  WebSocketNotification, 
  CommunityUpdate,
  ConnectionState,
  RealTimeHandlers 
} from '../types/api';

import { billTrackingService } from './billTrackingService';
import { stateManagementService } from './stateManagementService';

export class WebSocketService {
  private wsManager: UnifiedWebSocketManager;
  private activeSubscriptions = new Set<string>();
  private handlers: RealTimeHandlers = {};
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;

  constructor() {
    this.wsManager = UnifiedWebSocketManager.getInstance();
    this.setupEventListeners();
  }

  /**
   * Sets up WebSocket event listeners
   */
  private setupEventListeners(): void {
    this.wsManager.on('connected', this.handleConnected.bind(this));
    this.wsManager.on('disconnected', this.handleDisconnected.bind(this));
    this.wsManager.on('error', this.handleError.bind(this));
    this.wsManager.on('billUpdate', this.handleBillUpdate.bind(this));
    this.wsManager.on('notification', this.handleNotification.bind(this));
  }

  /**
   * Connects to WebSocket
   */
  async connect(token?: string): Promise<void> {
    try {
      this.connectionState = ConnectionState.CONNECTING;
      await this.wsManager.connect(token);
      
      logger.info('WebSocket connection initiated', {
        component: 'WebSocketService'
      });
    } catch (error) {
      this.connectionState = ConnectionState.FAILED;
      logger.error('Failed to connect WebSocket', {
        component: 'WebSocketService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Disconnects from WebSocket
   */
  disconnect(): void {
    this.wsManager.disconnect();
    this.activeSubscriptions.clear();
    this.connectionState = ConnectionState.DISCONNECTED;
    
    logger.info('WebSocket disconnected', {
      component: 'WebSocketService'
    });
  }

  /**
   * Subscribes to a WebSocket channel
   */
  subscribe(subscription: WebSocketSubscription): void {
    const key = `${subscription.type}:${subscription.id}`;

    if (this.activeSubscriptions.has(key)) {
      logger.debug('Already subscribed to channel', {
        component: 'WebSocketService',
        subscription: key
      });
      return;
    }

    try {
      if (subscription.type === 'bill') {
        this.wsManager.subscribeToBill(subscription.id as number);
      } else {
        // For other subscription types, use general subscribe method
        this.wsManager.subscribe(subscription.type, (message) => {
          this.handleGenericMessage(subscription, message);
        });
      }

      this.activeSubscriptions.add(key);
      
      logger.debug('Subscribed to WebSocket channel', {
        component: 'WebSocketService',
        subscription: key
      });
    } catch (error) {
      logger.error('Failed to subscribe to channel', {
        component: 'WebSocketService',
        subscription: key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Unsubscribes from a WebSocket channel
   */
  unsubscribe(subscription: WebSocketSubscription): void {
    const key = `${subscription.type}:${subscription.id}`;

    if (!this.activeSubscriptions.has(key)) {
      return;
    }

    try {
      if (subscription.type === 'bill') {
        this.wsManager.unsubscribeFromBill(subscription.id as number);
      } else {
        this.wsManager.unsubscribe(key);
      }

      this.activeSubscriptions.delete(key);
      
      logger.debug('Unsubscribed from WebSocket channel', {
        component: 'WebSocketService',
        subscription: key
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from channel', {
        component: 'WebSocketService',
        subscription: key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sets event handlers
   */
  setHandlers(handlers: RealTimeHandlers): void {
    this.handlers = { ...handlers };
  }

  /**
   * Gets connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Checks if connected
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Gets active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions);
  }

  /**
   * Handles WebSocket connection
   */
  private handleConnected(): void {
    this.connectionState = ConnectionState.CONNECTED;
    this.handlers.onConnectionChange?.(true);
    
    logger.info('WebSocket connected', {
      component: 'WebSocketService'
    });
  }

  /**
   * Handles WebSocket disconnection
   */
  private handleDisconnected(): void {
    this.connectionState = ConnectionState.DISCONNECTED;
    this.handlers.onConnectionChange?.(false);
    
    logger.warn('WebSocket disconnected', {
      component: 'WebSocketService'
    });
  }

  /**
   * Handles WebSocket errors
   */
  private handleError(error: any): void {
    this.connectionState = ConnectionState.FAILED;
    this.handlers.onError?.(error);
    
    logger.error('WebSocket error', {
      component: 'WebSocketService',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  /**
   * Handles bill updates from WebSocket
   */
  private async handleBillUpdate(data: any): Promise<void> {
    try {
      const update: BillUpdate = {
        type: data.type,
        data: {
          billId: data.bill_id || data.billId,
          ...data.update?.data
        },
        timestamp: data.timestamp || new Date().toISOString()
      };

      // Process through business logic service
      await billTrackingService.processBillUpdate(update);

      // Notify handlers
      this.handlers.onBillUpdate?.(update);

      logger.debug('Bill update processed', {
        component: 'WebSocketService',
        billId: update.data.billId,
        type: update.type
      });
    } catch (error) {
      logger.error('Failed to process bill update', {
        component: 'WebSocketService',
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handles notifications from WebSocket
   */
  private handleNotification(notification: any): void {
    try {
      const processedNotification: WebSocketNotification = {
        id: notification.id || `notification_${Date.now()}`,
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        priority: notification.priority || 'normal',
        data: notification.data,
        timestamp: notification.timestamp || new Date().toISOString(),
        read: false
      };

      // Add to state
      stateManagementService.addNotification(processedNotification);

      // Notify handlers
      this.handlers.onNotification?.(processedNotification);

      logger.debug('Notification processed', {
        component: 'WebSocketService',
        notificationId: processedNotification.id,
        type: processedNotification.type
      });
    } catch (error) {
      logger.error('Failed to process notification', {
        component: 'WebSocketService',
        notification,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handles generic messages for non-bill subscriptions
   */
  private handleGenericMessage(subscription: WebSocketSubscription, message: any): void {
    try {
      if (subscription.type === 'community') {
        const communityUpdate: CommunityUpdate = {
          type: message.type || 'update',
          discussionId: subscription.id as string,
          data: message.data || message,
          timestamp: message.timestamp || new Date().toISOString()
        };

        this.handlers.onCommunityUpdate?.(communityUpdate);
      } else if (subscription.type === 'user_notifications') {
        this.handleNotification(message);
      }
    } catch (error) {
      logger.error('Failed to process generic message', {
        component: 'WebSocketService',
        subscription,
        message,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Gets service statistics
   */
  getStats(): {
    connectionState: ConnectionState;
    activeSubscriptions: number;
    isConnected: boolean;
  } {
    return {
      connectionState: this.connectionState,
      activeSubscriptions: this.activeSubscriptions.size,
      isConnected: this.isConnected()
    };
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();