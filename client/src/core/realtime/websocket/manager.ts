/**
 * Unified WebSocket Manager
 * 
 * Consolidated WebSocket management for all real-time features.
 * Replaces scattered WebSocket implementations with a single, optimized manager.
 */

import { logger } from '@client/utils/logger';
import { EventEmitter } from '../utils/event-emitter';
import { 
  WebSocketConfig, 
  ConnectionState, 
  Subscription, 
  WebSocketMessage,
  MessageHandler,
  EventListener,
  HeartbeatMessage,
  SubscriptionMessage,
  BatchMessage
} from '../types';

export class UnifiedWebSocketManager {
  private static instance: UnifiedWebSocketManager | null = null;
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private subscriptions = new Map<string, Subscription>();
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private maxQueueSize = 100;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private eventEmitter = new EventEmitter();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<void> | null = null;
  private currentToken: string | null = null;
  private connectedAt: number | null = null;
  private lastPongTime: number | null = null;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  static getInstance(config?: WebSocketConfig): UnifiedWebSocketManager {
    if (!UnifiedWebSocketManager.instance && config) {
      UnifiedWebSocketManager.instance = new UnifiedWebSocketManager(config);
    }
    return UnifiedWebSocketManager.instance!;
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(token?: string): Promise<void> {
    // Return existing connection promise if already connecting with same token
    if (this.connectionPromise &&
        this.connectionState === ConnectionState.CONNECTING &&
        this.currentToken === token) {
      return this.connectionPromise;
    }

    // Already connected with same token, return immediately
    if (this.connectionState === ConnectionState.CONNECTED &&
        this.isConnected() &&
        this.currentToken === token) {
      return Promise.resolve();
    }

    // Clean up any existing connection before creating new one
    this.currentToken = token || null;
    this.cleanup(false);

    // Create and store connection promise for reuse
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionState = ConnectionState.CONNECTING;

      try {
        const wsUrl = token
          ? `${this.config.url}?token=${encodeURIComponent(token)}`
          : this.config.url;
        this.ws = new WebSocket(wsUrl, this.config.protocols);

        // Connection timeout to prevent hanging
        const connectionTimeout = setTimeout(() => {
          if (this.connectionState === ConnectionState.CONNECTING) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.onConnected();
          resolve();
        };

        this.ws.onmessage = (event) => this.onMessage(event);
        this.ws.onclose = (event) => this.onDisconnected(event);
        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          this.onError(error);

          if (this.connectionState === ConnectionState.CONNECTING) {
            reject(error);
          }
        };
      } catch (error) {
        this.connectionState = ConnectionState.DISCONNECTED;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    this.cleanup(true);
    this.currentToken = null;
    this.messageQueue = [];
    this.connectionState = ConnectionState.DISCONNECTED;
    this.eventEmitter.emit('disconnected');
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  subscribe(topic: string, callback: MessageHandler, options?: {
    filters?: Record<string, unknown>;
    priority?: 'high' | 'medium' | 'low';
  }): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: Subscription = {
      id: subscriptionId,
      topic,
      filters: options?.filters,
      callback,
      priority: options?.priority || 'medium'
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send subscription message if connected
    if (this.isConnected()) {
      this.sendSubscriptionMessage(subscription);
    }

    logger.debug('WebSocket subscription created', {
      component: 'UnifiedWebSocketManager',
      subscriptionId,
      topic
    });

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);

    // Send unsubscription message if connected
    if (this.isConnected()) {
      this.sendUnsubscriptionMessage(subscription);
    }

    logger.debug('WebSocket subscription removed', {
      component: 'UnifiedWebSocketManager',
      subscriptionId,
      topic: subscription.topic
    });
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  send(message: WebSocketMessage): void {
    if (this.isConnected()) {
      try {
        const payload = JSON.stringify(message);
        // Message size check to prevent issues
        if (payload.length > 1024 * 1024) { // 1MB limit
          throw new Error('Message too large');
        }
        this.ws!.send(payload);
      } catch (error) {
        logger.error('Failed to send WebSocket message', {
          component: 'UnifiedWebSocketManager'
        }, error);
        this.emit('error', { message: 'Failed to send message', error });
        throw error;
      }
    } else {
      // Queue message for later
      this.queueMessage(message);
    }
  }

  // ============================================================================
  // Event Management
  // ============================================================================

  on(event: string, listener: EventListener): () => void {
    return this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: EventListener): void {
    this.eventEmitter.off(event, listener);
  }

  private emit(event: string, ...args: unknown[]): void {
    this.eventEmitter.emit(event, ...args);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private onConnected(): void {
    this.connectionState = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    this.connectedAt = Date.now();
    this.lastPongTime = Date.now();

    // Start heartbeat if enabled
    if (this.config.heartbeat.enabled) {
      this.startHeartbeat();
    }

    // Start batch processing if enabled
    if (this.config.message.batching) {
      this.startBatchProcessing();
    }

    // Re-subscribe to all topics
    this.resubscribeAll();

    // Send queued messages
    this.flushMessageQueue();

    this.eventEmitter.emit('connected');

    logger.info('WebSocket connected successfully', {
      component: 'UnifiedWebSocketManager',
      subscriptions: this.subscriptions.size
    });
  }

  private onMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle heartbeat
      if (message.type === 'heartbeat' || message.type === 'pong') {
        this.handleHeartbeat(message as HeartbeatMessage);
        return;
      }

      // Route message to subscribers
      this.routeMessage(message);
    } catch (error) {
      logger.error('Failed to process WebSocket message', {
        component: 'UnifiedWebSocketManager'
      }, error);
    }
  }

  private onDisconnected(event: CloseEvent): void {
    const wasConnected = this.connectionState === ConnectionState.CONNECTED;
    this.connectionState = event.code === 1000 ? ConnectionState.DISCONNECTED : ConnectionState.RECONNECTING;

    this.stopHeartbeat();
    this.stopBatchProcessing();
    this.ws = null;

    // Attempt reconnection if enabled and not a clean close
    if (this.config.reconnect.enabled && 
        event.code !== 1000 && 
        wasConnected && 
        this.reconnectAttempts < this.config.reconnect.maxAttempts) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.config.reconnect.maxAttempts) {
      this.connectionState = ConnectionState.FAILED;
      logger.error('Max reconnection attempts reached', {
        component: 'UnifiedWebSocketManager'
      });
    }

    this.eventEmitter.emit('disconnected', event);

    logger.warn('WebSocket disconnected', {
      component: 'UnifiedWebSocketManager',
      code: event.code,
      reason: event.reason
    });
  }

  private onError(error: Event | Error): void {
    this.connectionState = ConnectionState.FAILED;

    const errorObj = error instanceof Error ? error : new Error('WebSocket connection error');

    logger.error('WebSocket error', {
      component: 'UnifiedWebSocketManager'
    }, errorObj);

    this.eventEmitter.emit('error', errorObj);
  }

  private routeMessage(message: WebSocketMessage): void {
    const matchingSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => this.matchesSubscription(sub, message));

    matchingSubscriptions.forEach(sub => {
      try {
        sub.callback(message);
      } catch (error) {
        logger.error('Error in subscription callback', {
          component: 'UnifiedWebSocketManager',
          subscriptionId: sub.id
        }, error);
      }
    });

    // Emit general message event
    this.eventEmitter.emit('message', message);
  }

  private matchesSubscription(subscription: Subscription, message: WebSocketMessage): boolean {
    // Check topic match
    if (subscription.topic !== message.topic && subscription.topic !== '*') {
      return false;
    }

    // Check filters
    if (subscription.filters) {
      return this.matchesFilters(message, subscription.filters);
    }

    return true;
  }

  private matchesFilters(message: WebSocketMessage, filters: Record<string, unknown>): boolean {
    for (const [key, expectedValue] of Object.entries(filters)) {
      const actualValue = message[key];

      if (Array.isArray(expectedValue)) {
        if (!expectedValue.includes(actualValue)) {
          return false;
        }
      } else if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  private sendSubscriptionMessage(subscription: Subscription): void {
    const message: SubscriptionMessage = {
      type: 'subscribe',
      topic: subscription.topic,
      filters: subscription.filters,
      subscriptionId: subscription.id
    };
    this.send(message);
  }

  private sendUnsubscriptionMessage(subscription: Subscription): void {
    const message: SubscriptionMessage = {
      type: 'unsubscribe',
      topic: subscription.topic,
      subscriptionId: subscription.id
    };
    this.send(message);
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach(subscription => {
      this.sendSubscriptionMessage(subscription);
    });

    logger.debug('Re-subscribed to all topics', {
      component: 'UnifiedWebSocketManager',
      count: this.subscriptions.size
    });
  }

  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      // Remove oldest message to prevent unbounded growth
      this.messageQueue.shift();
      logger.warn('Message queue full, removing oldest message', {
        component: 'UnifiedWebSocketManager'
      });
    }
    this.messageQueue.push(message);
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    logger.debug('Flushing message queue', {
      component: 'UnifiedWebSocketManager',
      count: this.messageQueue.length
    });

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(message => {
      try {
        this.send(message);
      } catch (error) {
        logger.error('Error sending queued message', {
          component: 'UnifiedWebSocketManager'
        }, error);
        // Re-queue failed messages
        this.queueMessage(message);
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected()) {
        this.stopHeartbeat();
        return;
      }

      // Check if connection is stale
      if (this.lastPongTime && Date.now() - this.lastPongTime > this.config.heartbeat.timeout + 15000) {
        logger.warn('No pong received, connection appears dead', {
          component: 'UnifiedWebSocketManager'
        });
        this.ws?.close(4000, 'Heartbeat timeout');
        return;
      }

      this.send({ type: 'ping' });
    }, this.config.heartbeat.interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleHeartbeat(_message: HeartbeatMessage): void {
    this.lastPongTime = Date.now();
  }

  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.messageQueue.length > 0) {
        this.processBatch();
      }
    }, this.config.message.batchInterval);
  }

  private stopBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private processBatch(): void {
    const batch = this.messageQueue.splice(0, this.config.message.batchSize);

    if (batch.length > 0) {
      const batchMessage: BatchMessage = {
        type: 'batch',
        messages: batch,
        timestamp: Date.now()
      };
      this.send(batchMessage);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnect.backoff === 'exponential'
      ? this.config.reconnect.delay * Math.pow(2, this.reconnectAttempts - 1)
      : this.config.reconnect.delay * this.reconnectAttempts;

    logger.info('Scheduling WebSocket reconnection', {
      component: 'UnifiedWebSocketManager',
      attempt: this.reconnectAttempts,
      delay
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.currentToken || undefined).catch(error => {
        logger.error('WebSocket reconnection failed', {
          component: 'UnifiedWebSocketManager'
        }, error);
      });
    }, delay);
  }

  private cleanup(clearSubscriptions: boolean = false): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.stopHeartbeat();
    this.stopBatchProcessing();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (clearSubscriptions) {
      this.subscriptions.clear();
    }

    this.connectionPromise = null;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}