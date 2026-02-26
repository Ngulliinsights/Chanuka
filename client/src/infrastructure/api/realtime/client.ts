/**
 * Unified Realtime Client
 * 
 * Implements IRealtimeClient interface with:
 * - Topic-based subscriptions
 * - Event publishing
 * - Subscription management
 * - Connection awareness
 */

import { logger } from '@client/lib/utils/logger';
import { observability } from '@client/infrastructure/observability';
import type {
  IRealtimeClient,
  Subscription,
  EventHandler,
  RealtimeOptions,
} from '../types/realtime';
import { createWebSocketClient } from '../websocket/client';
import type { IWebSocketClient } from '../types/websocket';
import { WebSocketMessage } from '@shared/types/api/websocket';

/**
 * Unified Realtime Client Implementation
 */
export class UnifiedRealtimeClient implements IRealtimeClient {
  private wsClient: IWebSocketClient;
  private subscriptions = new Map<string, Subscription>();
  private topicHandlers = new Map<string, Set<EventHandler>>();
  private subscriptionCounter = 0;

  constructor(options: RealtimeOptions) {
    // Create WebSocket client with realtime options
    this.wsClient = createWebSocketClient({
      url: options.url,
      reconnect: options.autoReconnect !== false ? {
        enabled: true,
        maxAttempts: options.maxReconnectAttempts || 5,
        delay: options.reconnectDelay || 1000,
      } : false,
      heartbeat: options.enableHeartbeat !== false ? {
        interval: options.heartbeatInterval || 30000,
      } : undefined,
    });

    // Set up message routing
    this.wsClient.on('message', (message) => {
      this.handleMessage(message);
    });

    // Auto-connect
    this.wsClient.connect();

    logger.info('Realtime client initialized', {
      component: 'RealtimeClient',
      url: options.url,
    });
  }

  /**
   * Subscribe to a topic
   */
  public subscribe<T = unknown>(topic: string, handler: EventHandler<T>): Subscription {
    const subscriptionId = this.generateSubscriptionId();

    // Create subscription object
    const subscription: Subscription = {
      id: subscriptionId,
      topic,
      unsubscribe: () => this.unsubscribe(subscription),
    };

    // Store subscription
    this.subscriptions.set(subscriptionId, subscription);

    // Store handler
    if (!this.topicHandlers.has(topic)) {
      this.topicHandlers.set(topic, new Set());
    }
    this.topicHandlers.get(topic)!.add(handler as EventHandler);

    // Subscribe via WebSocket
    this.wsClient.subscribe(topic);

    logger.debug('Subscribed to topic', {
      component: 'RealtimeClient',
      topic,
      subscriptionId,
    });

    return subscription;
  }

  /**
   * Unsubscribe from a subscription
   */
  public unsubscribe(subscription: Subscription): void {
    const { id, topic } = subscription;

    // Remove subscription
    this.subscriptions.delete(id);

    // Remove handler
    const handlers = this.topicHandlers.get(topic);
    if (handlers) {
      // Note: We can't directly remove the handler without a reference
      // In a real implementation, we'd need to track handler-to-subscription mapping
      // For now, we'll check if there are any remaining subscriptions for this topic
      const hasOtherSubscriptions = Array.from(this.subscriptions.values())
        .some(sub => sub.topic === topic);

      if (!hasOtherSubscriptions) {
        // No more subscriptions for this topic, unsubscribe from WebSocket
        this.wsClient.unsubscribe(topic);
        this.topicHandlers.delete(topic);
      }
    }

    logger.debug('Unsubscribed from topic', {
      component: 'RealtimeClient',
      topic,
      subscriptionId: id,
    });
  }

  /**
   * Publish an event to a topic
   */
  public publish(topic: string, data: unknown): void {
    const message: WebSocketMessage = {
      type: 'publish',
      data: {
        topic,
        payload: data,
      },
      timestamp: Date.now(),
    };

    this.wsClient.send(message);

    logger.debug('Published event', {
      component: 'RealtimeClient',
      topic,
    });
  }

  /**
   * Check if connected to realtime server
   */
  public isConnected(): boolean {
    return this.wsClient.getConnectionState() === 'connected';
  }

  /**
   * Get all active subscriptions
   */
  public getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Clear all subscriptions
   */
  public clearSubscriptions(): void {
    // Unsubscribe from all topics
    const topics = new Set(Array.from(this.subscriptions.values()).map(sub => sub.topic));
    topics.forEach(topic => {
      this.wsClient.unsubscribe(topic);
    });

    // Clear internal state
    this.subscriptions.clear();
    this.topicHandlers.clear();

    logger.info('Cleared all subscriptions', {
      component: 'RealtimeClient',
    });
  }

  /**
   * Disconnect from realtime server
   */
  public disconnect(): void {
    this.clearSubscriptions();
    this.wsClient.disconnect();

    logger.info('Realtime client disconnected', {
      component: 'RealtimeClient',
    });
  }

  // Private methods

  private handleMessage(message: WebSocketMessage): void {
    const startTime = Date.now();
    
    try {
      // Extract topic from message
      const topic = this.extractTopic(message);
      if (!topic) {
        logger.warn('Received message without topic', {
          component: 'RealtimeClient',
          message,
        });
        return;
      }

      // Get handlers for this topic
      const handlers = this.topicHandlers.get(topic);
      if (!handlers || handlers.size === 0) {
        return;
      }

      // Extract data from message
      const data = this.extractData(message);

      // Call all handlers
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          
          // Track handler error
          observability.trackError(err, {
            component: 'RealtimeClient',
            operation: 'handleMessage',
            metadata: {
              topic,
            },
          });
          
          logger.error('Error in realtime event handler', {
            component: 'RealtimeClient',
            topic,
            error,
          });
        }
      });
      
      // Track message processing performance
      const processingTime = Date.now() - startTime;
      if (processingTime > 100) { // Only track slow messages
        observability.trackPerformance({
          name: 'realtime_message_processing',
          value: processingTime,
          unit: 'ms',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Track error
      observability.trackError(err, {
        component: 'RealtimeClient',
        operation: 'handleMessage',
        metadata: {
          messageType: message.type,
        },
      });
      
      logger.error('Error handling realtime message', {
        component: 'RealtimeClient',
        error,
      });
    }
  }

  private extractTopic(message: WebSocketMessage): string | null {
    // Try different message formats
    if (typeof message.data === 'object' && message.data !== null) {
      const data = message.data as Record<string, unknown>;
      if ('topic' in data && typeof data.topic === 'string') {
        return data.topic;
      }
    }

    // Fallback to message type as topic
    return message.type || null;
  }

  private extractData(message: WebSocketMessage): unknown {
    // Try different message formats
    if (typeof message.data === 'object' && message.data !== null) {
      const data = message.data as Record<string, unknown>;
      if ('payload' in data) {
        return data.payload;
      }
      if ('data' in data) {
        return data.data;
      }
    }

    return message.data;
  }

  private generateSubscriptionId(): string {
    this.subscriptionCounter++;
    return `rt_sub_${Date.now()}_${this.subscriptionCounter}`;
  }
}

/**
 * Create a new realtime client instance
 */
export function createRealtimeClient(options: RealtimeOptions): IRealtimeClient {
  return new UnifiedRealtimeClient(options);
}
