/**
 * Community WebSocket Manager
 *
 * Unified WebSocket management for all community features including
 * discussions, expert updates, analytics, and real-time notifications.
 * Integrates with EventBus for consistent event handling across the application.
 */

import { eventBus } from '@client/utils/EventBus';
import { logger } from '@client/utils/logger';

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp?: string;
  billId?: number;
  userId?: string;
}

interface SubscriptionHandler {
  event: string;
  handler: (data: any) => void;
  unsubscribe: () => void;
}

export class CommunityWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private subscriptions = new Map<string, SubscriptionHandler>();
  private url: string;

  constructor(url: string = '/ws/community') {
    this.url = url;
  }

  /**
   * Initialize WebSocket connection
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);

      return new Promise((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'));

        this.ws.onopen = () => {
          logger.info('Community WebSocket connected', { component: 'CommunityWebSocketManager' });
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          logger.warn('Community WebSocket closed', {
            component: 'CommunityWebSocketManager',
            code: event.code,
            reason: event.reason
          });
          this.isConnecting = false;
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          logger.error('Community WebSocket error', { component: 'CommunityWebSocketManager' }, error);
          this.isConnecting = false;
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.clearSubscriptions();
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribe to an event
   */
  subscribe(event: string, handler: (data: any) => void): () => void {
    const subscriptionKey = `${event}-${Date.now()}-${Math.random()}`;

    const unsubscribe = eventBus.on(event, handler);

    const subscription: SubscriptionHandler = {
      event,
      handler,
      unsubscribe
    };

    this.subscriptions.set(subscriptionKey, subscription);

    // Send subscription message to server if connected
    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        payload: { event }
      });
    }

    logger.debug('Subscribed to community event', {
      component: 'CommunityWebSocketManager',
      event
    });

    return () => {
      this.unsubscribe(subscriptionKey);
    };
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(subscriptionKey: string): void {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);

      // Send unsubscription message to server if connected
      if (this.isConnected()) {
        this.send({
          type: 'unsubscribe',
          payload: { event: subscription.event }
        });
      }

      logger.debug('Unsubscribed from community event', {
        component: 'CommunityWebSocketManager',
        event: subscription.event
      });
    }
  }

  /**
   * Publish an event to all subscribers
   */
  publish(event: string, data: any): void {
    eventBus.emit(event, data);

    // Also send to server if connected
    if (this.isConnected()) {
      this.send({
        type: 'publish',
        payload: { event, data }
      });
    }

    logger.debug('Published community event', {
      component: 'CommunityWebSocketManager',
      event
    });
  }

  /**
   * Send a message to the WebSocket server
   */
  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Emit the event through EventBus
      eventBus.emit(message.type, message.payload);

      logger.debug('Received community WebSocket message', {
        component: 'CommunityWebSocketManager',
        type: message.type
      });
    } catch (error) {
      logger.error('Failed to parse WebSocket message', {
        component: 'CommunityWebSocketManager'
      }, error);
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max WebSocket reconnection attempts reached', {
        component: 'CommunityWebSocketManager'
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info('Attempting WebSocket reconnection', {
      component: 'CommunityWebSocketManager',
      attempt: this.reconnectAttempts,
      delay
    });

    setTimeout(() => {
      this.connect().catch(error => {
        logger.error('WebSocket reconnection failed', {
          component: 'CommunityWebSocketManager'
        }, error);
      });
    }, delay);
  }

  /**
   * Clear all subscriptions
   */
  private clearSubscriptions(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
  }

  /**
   * Subscribe to discussion events for a specific bill
   */
  subscribeToDiscussion(billId: number): () => void {
    return this.subscribe(`discussion:${billId}`, (data) => {
      // Handle discussion-specific events
      eventBus.emit('discussionUpdate', data);
    });
  }

  /**
   * Subscribe to expert updates
   */
  subscribeToExpertUpdates(): () => void {
    return this.subscribe('expert:updates', (data) => {
      eventBus.emit('expertUpdate', data);
    });
  }

  /**
   * Subscribe to moderation events
   */
  subscribeToModerationEvents(): () => void {
    return this.subscribe('moderation:events', (data) => {
      eventBus.emit('moderationUpdate', data);
    });
  }

  /**
   * Subscribe to community analytics
   */
  subscribeToCommunityAnalytics(): () => void {
    return this.subscribe('community:analytics', (data) => {
      eventBus.emit('analyticsUpdate', data);
    });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(billId: number, parentId?: string): void {
    this.publish('typing:start', { billId, parentId });
  }

  /**
   * Stop typing indicator
   */
  stopTypingIndicator(billId: number, parentId?: string): void {
    this.publish('typing:stop', { billId, parentId });
  }

  /**
   * Send comment update
   */
  sendCommentUpdate(billId: number, commentData: any): void {
    this.publish(`comment:update:${billId}`, commentData);
  }

  /**
   * Send vote update
   */
  sendVoteUpdate(billId: number, voteData: any): void {
    this.publish(`vote:update:${billId}`, voteData);
  }
}

// Singleton instance
export const communityWebSocketManager = new CommunityWebSocketManager();