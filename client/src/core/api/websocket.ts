// Consolidated WebSocket Service for Unified API Client Architecture
// Based on the consolidated API client design specifications

import { WebSocketConfig, Subscription, WebSocketEvents, BillUpdate, WebSocketNotification, UserPreferences, ConnectionState } from './types';
import { globalErrorHandler, ErrorFactory, ErrorCode } from './errors';

// WebSocketEvents interface imported from types.ts

// Type-safe Event Emitter for WebSocket events
class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, listener: (...args: any[]) => void): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);

    // Return unsubscribe function for easier cleanup
    return () => this.off(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      // Optimization: Clean up empty listener sets
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return;

    // Optimization: Convert to array once for iteration
    const listenerArray = Array.from(listeners);

    // Limit concurrent microtasks to prevent overwhelming the queue
    if (listenerArray.length > 10) {
      // For large listener counts, use setTimeout to batch processing
      setTimeout(() => {
        listenerArray.forEach(callback => {
          try {
            callback(...args);
          } catch (error) {
            console.error(`Error in event listener for '${event}':`, error);
          }
        });
      }, 0);
    } else {
      // For small listener counts, use microtasks
      listenerArray.forEach(callback => {
        try {
          queueMicrotask(() => callback(...args));
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

// ConnectionState imported from types.ts

// Unified WebSocket Manager
export class UnifiedWebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private subscriptions = new Map<string, Subscription>();
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private maxQueueSize = 100;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private eventEmitter = new EventEmitter();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<void> | null = null;
  private currentToken: string | null = null;
  private connectedAt: number | null = null;
  private lastPongTime: number | null = null;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  async connect(token?: string): Promise<void> {
    // Optimization: Return existing connection promise if already connecting
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

    // Clear any existing connection promise to prevent race conditions
    this.connectionPromise = null;

    // Create and store connection promise for reuse
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionState = ConnectionState.CONNECTING;

      try {
        const wsUrl = token
          ? `${this.config.url}?token=${encodeURIComponent(token)}`
          : this.config.url;
        this.ws = new WebSocket(wsUrl, this.config.protocols);

        // Optimization: Add connection timeout to prevent hanging
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

          // Optimization: Only reject if we're still trying to connect initially
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
    this.messageQueue = []; // Clear queue on explicit disconnect
    this.connectionState = ConnectionState.DISCONNECTED;
    this.eventEmitter.emit('disconnected');
  }

  subscribe(topic: string, callback: (message: any) => void, options?: {
    filters?: Record<string, any>;
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

    return subscriptionId;
  }

  // Bill-specific subscription features
  subscribeToBill(bill_id: number, subscriptionTypes?: Array<'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled'>): string {
    const message = {
      type: 'subscribe',
      data: { bill_id, subscriptionTypes }
    };

    if (!this.isConnected()) {
      console.warn('WebSocket not connected. Queueing subscription.');
      this.queueMessage(message);
      return `bill_${bill_id}`;
    }

    this.send(message);
    return `bill_${bill_id}`;
  }

  unsubscribeFromBill(bill_id: number): void {
    const message = {
      type: 'unsubscribe',
      data: { bill_id }
    };

    if (!this.isConnected()) {
      console.warn('WebSocket not connected. Queueing unsubscription.');
      this.queueMessage(message);
      return;
    }

    this.send(message);
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);

    // Send unsubscription message if connected
    if (this.isConnected()) {
      this.sendUnsubscriptionMessage(subscription);
    }
  }

  send(message: any): void {
    if (this.isConnected()) {
      try {
        const payload = JSON.stringify(message);
        // Optimization: Add message size check to prevent issues
        if (payload.length > 1024 * 1024) { // 1MB limit
          throw new Error('Message too large');
        }
        this.ws!.send(payload);
      } catch (error) {
        globalErrorHandler.handleError(error as Error, {
          component: 'websocket',
          operation: 'send'
        });
        this.emit('error', { message: 'Failed to send message', error });
        throw error;
      }
    } else {
      // Queue message for later
      this.queueMessage(message);
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

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
  }

  private onMessage(event: MessageEvent): void {
    try {
      const message = this.config.message.compression
        ? this.decompressMessage(event.data)
        : JSON.parse(event.data);

      // Handle heartbeat
      if (message.type === 'heartbeat') {
        this.handleHeartbeat(message);
        return;
      }

      // Handle pong (heartbeat response)
      if (message.type === 'pong') {
        this.handlePong(message);
        return;
      }

      // Route message to subscribers
      this.routeMessage(message);
    } catch (error) {
      globalErrorHandler.handleError(error as Error, {
        component: 'websocket',
        operation: 'onMessage'
      });
    }
  }

  private onDisconnected(event: CloseEvent): void {
    // Optimization: Update state before emitting events
    const wasConnected = this.connectionState === ConnectionState.CONNECTED;
    this.connectionState = event.code === 1000 ? ConnectionState.DISCONNECTED : ConnectionState.RECONNECTING;

    this.stopHeartbeat();

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    this.ws = null;

    // Attempt reconnection if enabled and not a clean close
    if (this.config.reconnect.enabled && event.code !== 1000 && wasConnected && this.reconnectAttempts < this.config.reconnect.maxAttempts) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.config.reconnect.maxAttempts) {
      this.connectionState = ConnectionState.FAILED;
      console.error('Max reconnection attempts reached');
    }

    this.eventEmitter.emit('disconnected', event);
  }

  private onError(error: Event | Error): void {
    this.connectionState = ConnectionState.FAILED;

    globalErrorHandler.handleError(error as Error, {
      component: 'websocket',
      operation: 'connection'
    });

    this.eventEmitter.emit('error', error);
  }

  private routeMessage(message: any): void {
    const matchingSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => this.matchesSubscription(sub, message));

    matchingSubscriptions.forEach(sub => {
      try {
        sub.callback(message);
      } catch (error) {
        globalErrorHandler.handleError(error as Error, {
          component: 'websocket',
          operation: 'routeMessage',
          subscriptionId: sub.id
        });
      }
    });

    // Emit general message event
    this.eventEmitter.emit('message', message);
  }

  private matchesSubscription(subscription: Subscription, message: any): boolean {
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

  private matchesFilters(message: any, filters: Record<string, any>): boolean {
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
    this.send({
      type: 'subscribe',
      topic: subscription.topic,
      filters: subscription.filters,
      subscriptionId: subscription.id
    });
  }

  private sendUnsubscriptionMessage(subscription: Subscription): void {
    this.send({
      type: 'unsubscribe',
      topic: subscription.topic,
      subscriptionId: subscription.id
    });
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach(subscription => {
      this.sendSubscriptionMessage(subscription);
    });
  }

  // Optimization: Better message queue management
  private queueMessage(message: any): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      // Remove oldest message to prevent unbounded growth
      this.messageQueue.shift();
      console.warn('Message queue full, removing oldest message');
    }
    this.messageQueue.push(message);
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`Flushing ${this.messageQueue.length} queued messages`);
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(message => {
      try {
        this.send(message);
      } catch (error) {
        console.error('Error sending queued message:', error);
        // Re-queue failed messages
        this.queueMessage(message);
      }
    });
  }

  // Optimized heartbeat with better timing guarantees
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected()) {
        this.stopHeartbeat();
        return;
      }

      // Check if connection is stale
      if (this.lastPongTime && Date.now() - this.lastPongTime > 45000) { // 45 seconds
        console.warn('No pong received, connection appears dead');
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

  private handleHeartbeat(message: any): void {
    // Update last pong time
    this.lastPongTime = Date.now();
  }

  private handlePong(message: any): void {
    // Update last pong time
    this.lastPongTime = Date.now();
  }

  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.messageQueue.length > 0) {
        this.processBatch();
      }
    }, this.config.message.batchInterval);
  }

  private processBatch(): void {
    const batch = this.messageQueue.splice(0, this.config.message.batchSize);

    if (batch.length > 0) {
      this.send({
        type: 'batch',
        messages: batch,
        timestamp: Date.now()
      });
    }
  }

  // Optimization: Exponential backoff with better jitter calculation
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;

    // Better exponential backoff: starts at 1s, doubles each time, caps at 30s
    const baseDelay = Math.min(
      this.config.reconnect.baseDelay * Math.pow(this.config.reconnect.backoffMultiplier, this.reconnectAttempts - 1),
      this.config.reconnect.maxDelay
    );

    // Full jitter: random between 0 and baseDelay for better distribution
    const delay = Math.random() * baseDelay;

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.reconnect.maxAttempts} in ${Math.round(delay)}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.currentToken) {
        this.connect(this.currentToken).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private compressMessage(message: any): string {
    // Placeholder for compression implementation
    // Would use a library like pako for actual compression
    return JSON.stringify(message);
  }

  private decompressMessage(data: string): any {
    // Placeholder for decompression implementation
    return JSON.parse(data);
  }

  // Enhanced error handling and metrics reporting
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    readyState: number | null;
    maxReconnectAttempts: number;
    state: ConnectionState;
    queuedMessages: number;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.ws?.readyState ?? null,
      maxReconnectAttempts: this.config.reconnect.maxAttempts,
      state: this.connectionState,
      queuedMessages: this.messageQueue.length
    };
  }

  getConnectionMetrics(): {
    status: ConnectionState;
    uptime: number | null;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    lastConnected: Date | null;
    lastPong: Date | null;
    queuedMessages: number;
  } {
    return {
      status: this.connectionState,
      uptime: this.connectedAt ? Date.now() - this.connectedAt : null,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.config.reconnect.maxAttempts,
      lastConnected: this.connectedAt ? new Date(this.connectedAt) : null,
      lastPong: this.lastPongTime ? new Date(this.lastPongTime) : null,
      queuedMessages: this.messageQueue.length
    };
  }

  setConnectionOptions(options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
    maxQueueSize?: number;
  }): void {
    if (options.maxReconnectAttempts !== undefined) {
      this.config.reconnect.maxAttempts = Math.max(0, options.maxReconnectAttempts);
    }
    if (options.reconnectDelay !== undefined) {
      this.config.reconnect.baseDelay = Math.max(100, options.reconnectDelay);
    }
    if (options.heartbeatInterval !== undefined) {
      this.config.heartbeat.interval = Math.max(5000, options.heartbeatInterval);
    }
    if (options.heartbeatTimeout !== undefined) {
      // Update both config and local variable
      this.config.heartbeat.timeout = Math.max(10000, options.heartbeatTimeout);
    }
    if (options.maxQueueSize !== undefined) {
      this.maxQueueSize = Math.max(0, options.maxQueueSize);
    }
  }

  resetReconnectionAttempts(): void {
    this.reconnectAttempts = 0;
  }

  // Optimization: Add method to clear message queue
  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  // Helper methods
  private isConnected(): boolean {
    return this.ws !== null &&
           this.ws.readyState === WebSocket.OPEN &&
           this.connectionState === ConnectionState.CONNECTED;
  }

  private emit(event: string, data?: any): void {
    this.eventEmitter.emit(event, data);
  }

  private cleanup(normalClose: boolean = false): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.ws) {
      // Store reference to avoid race conditions during cleanup
      const wsToClose = this.ws;
      this.ws = null;

      // Remove event handlers to prevent memory leaks
      wsToClose.onopen = null;
      wsToClose.onmessage = null;
      wsToClose.onclose = null;
      wsToClose.onerror = null;

      // Close connection after clearing reference
      if (normalClose) {
        wsToClose.close(1000, 'Client disconnect');
      } else {
        wsToClose.close();
      }
    }

    this.connectedAt = null;
    this.lastPongTime = null;

    // Clear connection promise to prevent race conditions
    if (this.connectionPromise) {
      this.connectionPromise = null;
    }
  }
}

// WebSocket Connection Pool for managing multiple connections
export class WebSocketConnectionPool {
  private connections = new Map<string, UnifiedWebSocketManager>();
  private defaultConfig: WebSocketConfig;

  constructor(defaultConfig: WebSocketConfig) {
    this.defaultConfig = defaultConfig;
  }

  getConnection(url: string, config?: Partial<WebSocketConfig>): UnifiedWebSocketManager {
    if (!this.connections.has(url)) {
      const wsConfig = { ...this.defaultConfig, ...config, url };
      const manager = new UnifiedWebSocketManager(wsConfig);
      this.connections.set(url, manager);
    }
    return this.connections.get(url)!;
  }

  removeConnection(url: string): void {
    const connection = this.connections.get(url);
    if (connection) {
      connection.disconnect();
      this.connections.delete(url);
    }
  }

  getAllConnections(): UnifiedWebSocketManager[] {
    return Array.from(this.connections.values());
  }

  disconnectAll(): void {
    this.connections.forEach(connection => connection.disconnect());
    this.connections.clear();
  }
}

// Global WebSocket connection pool with enhanced configuration
export const globalWebSocketPool = new WebSocketConnectionPool({
  url: 'ws://localhost:8080',
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  },
  heartbeat: {
    enabled: true,
    interval: 30000,
    timeout: 45000 // 45-second timeout for stale connection detection
  },
  message: {
    compression: false,
    batching: true,
    batchSize: 10,
    batchInterval: 1000
  }
});