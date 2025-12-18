// Consolidated WebSocket Service for Unified API Client Architecture
// Fully type-safe, optimized, and production-ready implementation
// Unified infrastructure consolidating all WebSocket managers

import { store } from '@client/store';
import {
  updateConnectionState,
  addBillUpdate,
  addCommunityUpdate,
  addNotification,
  addExpertActivity,
  updateEngagementMetrics
} from '@client/store/slices/realTimeSlice';

import { WebSocketConfig, Subscription, ConnectionState } from './types';

// ============================================================================
// Type Definitions
// ============================================================================

type EventListener<T = unknown> = (data: T) => void;

// Core message types
interface WebSocketMessage {
  type: string;
  topic?: string;
  data?: unknown;
  timestamp?: number;
  [key: string]: unknown;
}

interface HeartbeatMessage extends WebSocketMessage {
  type: 'heartbeat' | 'ping' | 'pong';
}

interface SubscriptionMessage extends WebSocketMessage {
  type: 'subscribe' | 'unsubscribe';
  topic: string;
  filters?: Record<string, unknown>;
  subscriptionId: string;
}

interface BatchMessage extends WebSocketMessage {
  type: 'batch';
  messages: WebSocketMessage[];
  timestamp: number;
}

// ============================================================================
// Bill Update Type Definitions
// ============================================================================

export interface BillsWebSocketConfig {
  readonly autoReconnect: boolean;
  readonly maxReconnectAttempts: number;
  readonly reconnectDelay: number;
  readonly heartbeatInterval: number;
  readonly batchUpdateInterval: number;
  readonly maxBatchSize: number;
}

export interface BillStatusUpdate {
  bill_id: number;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface BillEngagementUpdate {
  bill_id: number;
  viewCount?: number;
  saveCount?: number;
  commentCount?: number;
  shareCount?: number;
  timestamp: string;
}

export interface BillAmendmentUpdate {
  bill_id: number;
  amendment_id: string;
  type: 'added' | 'modified' | 'removed';
  title: string;
  summary: string;
  timestamp: string;
}

export interface BillVotingUpdate {
  bill_id: number;
  voting_date: string;
  voting_type: 'committee' | 'floor' | 'final';
  chamber: 'house' | 'senate' | 'both';
  timestamp: string;
}

export type BillRealTimeUpdate =
  | BillStatusUpdate
  | BillEngagementUpdate
  | BillAmendmentUpdate
  | BillVotingUpdate;

type BillUpdateType = 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';

interface BillUpdateMessage extends WebSocketMessage {
  type: 'billUpdate' | 'bill_update';
  bill_id: number;
  update: {
    type: string;
    data: BillRealTimeUpdate;
  };
  timestamp: number; // Changed from string to match WebSocketMessage
}

interface BatchedBillUpdatesMessage extends WebSocketMessage {
  type: 'batchedBillUpdates' | 'batched_updates';
  updates: BillRealTimeUpdate[];
}


// ============================================================================
// Enhanced Event Emitter with Type Safety
// ============================================================================

class EventEmitter {
  private events: Map<string, Set<EventListener>> = new Map();

  on(event: string, listener: EventListener): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);

    return () => this.off(event, listener);
  }

  off(event: string, listener: EventListener): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event: string, data?: unknown): void {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return;

    const listenerArray = Array.from(listeners);

    if (listenerArray.length > 10) {
      setTimeout(() => {
        listenerArray.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in event listener for '${event}':`, error);
          }
        });
      }, 0);
    } else {
      listenerArray.forEach(callback => {
        try {
          queueMicrotask(() => callback(data));
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

// ============================================================================
// Error Handling
// ============================================================================

function handleError(error: Error, context?: Record<string, unknown>): void {
  console.error('[WebSocket Error]', {
    message: error.message,
    stack: error.stack,
    ...context
  });
}

// ============================================================================
// Unified WebSocket Manager
// ============================================================================

export class UnifiedWebSocketManager {
  private static instance: UnifiedWebSocketManager | null = null;
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private subscriptions = new Map<string, Subscription>();
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private maxQueueSize = 100;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private eventEmitter = new EventEmitter();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionPromise: Promise<void> | null = null;
  private currentToken: string | null = null;
  private connectedAt: number | null = null;
  private lastPongTime: number | null = null;

  // Bill-specific properties
  private billsConfig: BillsWebSocketConfig;
  private subscribedBills = new Set<number>();
  private updateQueue: BillRealTimeUpdate[] = [];
  private billsBatchTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: WebSocketConfig, billsConfig?: Partial<BillsWebSocketConfig>) {
    this.config = config;
    this.billsConfig = {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      heartbeatInterval: 30000,
      batchUpdateInterval: 1000,
      maxBatchSize: 50,
      ...billsConfig
    };
  }

  static getInstance(): UnifiedWebSocketManager {
    if (!UnifiedWebSocketManager.instance) {
      UnifiedWebSocketManager.instance = globalWebSocketPool.getConnection('ws://localhost:8080');
    }
    return UnifiedWebSocketManager.instance;
  }

  async connect(token?: string): Promise<void> {
    if (this.connectionPromise &&
        this.connectionState === ConnectionState.CONNECTING &&
        this.currentToken === token) {
      return this.connectionPromise;
    }

    if (this.connectionState === ConnectionState.CONNECTED &&
        this.isConnected() &&
        this.currentToken === token) {
      return Promise.resolve();
    }

    this.currentToken = token || null;
    this.cleanup(false);
    this.connectionPromise = null;

    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionState = ConnectionState.CONNECTING;

      store.dispatch(updateConnectionState({
        isConnecting: true,
        error: null
      }));

      try {
        const wsUrl = token
          ? `${this.config.url}?token=${encodeURIComponent(token)}`
          : this.config.url;
        this.ws = new WebSocket(wsUrl, this.config.protocols as string[]);

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

  subscribe(topic: string, callback: (message: unknown) => void, options?: {
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

    if (this.isConnected()) {
      this.sendSubscriptionMessage(subscription);
    }

    return subscriptionId;
  }

  subscribeToBill(bill_id: number, subscriptionTypes?: BillUpdateType[]): string {
    const message: WebSocketMessage = {
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
    const message: WebSocketMessage = {
      type: 'unsubscribe',
      data: { bill_id }
    };

    // cSpell:ignore unsubscription
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

    // cSpell:ignore unsubscription
    if (this.isConnected()) {
      this.sendUnsubscriptionMessage(subscription);
    }
  }

  send(message: WebSocketMessage): void {
    if (this.isConnected()) {
      try {
        const payload = JSON.stringify(message);
        if (payload.length > 1024 * 1024) {
          throw new Error('Message too large');
        }
        this.ws!.send(payload);
      } catch (error) {
        handleError(error as Error, {
          component: 'websocket',
          operation: 'send'
        });
        this.emit('error', { message: 'Failed to send message', error });
        throw error;
      }
    } else {
      this.queueMessage(message);
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  on(event: string, listener: EventListener): () => void {
    return this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: EventListener): void {
    this.eventEmitter.off(event, listener);
  }

  private emit(event: string, data?: unknown): void {
    this.eventEmitter.emit(event, data);
  }

  private onConnected(): void {
    this.connectionState = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    this.connectedAt = Date.now();
    this.lastPongTime = Date.now();

    store.dispatch(updateConnectionState({
      isConnected: true,
      isConnecting: false,
      error: null,
      connection_quality: 'excellent',
      last_heartbeat: new Date().toISOString(),
      reconnectAttempts: 0
    }));

    if (this.config.heartbeat.enabled) {
      this.startHeartbeat();
    }

    if (this.config.message.batching) {
      this.startBatchProcessing();
    }

    this.startBillsBatchProcessing();
    this.resubscribeAll();
    this.resubscribeAllBills();
    this.flushMessageQueue();

    this.eventEmitter.emit('connected');
  }

  private onMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = this.config.message.compression
        ? this.decompressMessage(event.data)
        : JSON.parse(event.data);

      if (message.type === 'heartbeat' || message.type === 'pong') {
        this.handleHeartbeat(message as HeartbeatMessage);
        return;
      }

      if (message.type === 'billUpdate' || message.type === 'bill_update') {
        this.handleBillUpdateMessage(message as unknown as BillUpdateMessage);
        return;
      }

      if (message.type === 'batchedBillUpdates' || message.type === 'batched_updates') {
        this.handleBatchedBillUpdatesMessage(message as BatchedBillUpdatesMessage);
        return;
      }

      if (message.type === 'community_update' || message.type === 'communityUpdate') {
        this.handleCommunityUpdateMessage(message);
        return;
      }

      if (message.type === 'notification') {
        this.handleNotificationMessage(message);
        return;
      }

      if (message.type === 'expert_activity' || message.type === 'expertActivity') {
        this.handleExpertActivityMessage(message);
        return;
      }

      if (message.type === 'engagement_metrics' || message.type === 'engagementMetrics') {
        this.handleEngagementMetricsMessage(message);
        return;
      }

      this.routeMessage(message);
    } catch (error) {
      handleError(error as Error, {
        component: 'websocket',
        operation: 'onMessage'
      });
    }
  }

  private onDisconnected(event: CloseEvent): void {
    const wasConnected = this.connectionState === ConnectionState.CONNECTED;
    this.connectionState = event.code === 1000 ? ConnectionState.DISCONNECTED : ConnectionState.RECONNECTING;

    store.dispatch(updateConnectionState({
      isConnected: false,
      isConnecting: this.connectionState === ConnectionState.RECONNECTING,
      connection_quality: 'disconnected',
      error: null
    }));

    this.stopHeartbeat();

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    this.ws = null;

    if (this.config.reconnect.enabled && event.code !== 1000 && wasConnected && this.reconnectAttempts < this.config.reconnect.maxAttempts) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.config.reconnect.maxAttempts) {
      this.connectionState = ConnectionState.FAILED;
      console.error('Max reconnection attempts reached');
      store.dispatch(updateConnectionState({
        isConnected: false,
        isConnecting: false,
        connection_quality: 'disconnected',
        error: 'Max reconnection attempts reached'
      }));
    }

    this.eventEmitter.emit('disconnected', event);
  }

  private onError(error: Event | Error): void {
    this.connectionState = ConnectionState.FAILED;

    const errorObj = error instanceof Error ? error : new Error('WebSocket connection error');

    handleError(errorObj, {
      component: 'websocket',
      operation: 'connection'
    });

    this.eventEmitter.emit('error', errorObj);
  }

  private routeMessage(message: WebSocketMessage): void {
    const matchingSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => this.matchesSubscription(sub, message));

    matchingSubscriptions.forEach(sub => {
      try {
        sub.callback(message);
      } catch (error) {
        handleError(error as Error, {
          component: 'websocket',
          operation: 'routeMessage',
          subscriptionId: sub.id
        });
      }
    });

    this.eventEmitter.emit('message', message);
  }

  private matchesSubscription(subscription: Subscription, message: WebSocketMessage): boolean {
    if (subscription.topic !== message.topic && subscription.topic !== '*') {
      return false;
    }

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

  // cSpell:ignore Unsubscription
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
  }

  private resubscribeAllBills(): void {
    this.subscribedBills.forEach(billId => {
      this.subscribeToBill(billId, [
        'status_change',
        'new_comment',
        'amendment',
        'voting_scheduled'
      ]);
    });

    console.info('Re-subscribed to all bills', {
      billCount: this.subscribedBills.size
    });
  }

  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
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

      if (this.lastPongTime && Date.now() - this.lastPongTime > 45000) {
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

  // ============================================================================
  // Bill-specific batch processing
  // ============================================================================

  private startBillsBatchProcessing(): void {
    if (this.billsBatchTimer) {
      clearInterval(this.billsBatchTimer);
    }

    this.billsBatchTimer = setInterval(() => {
      if (this.updateQueue.length > 0) {
        this.processBillsBatchedUpdates();
      }
    }, this.billsConfig.batchUpdateInterval);
  }

  private processBillsBatchedUpdates(): void {
    if (this.updateQueue.length === 0) return;

    const updates = this.updateQueue.splice(0, this.billsConfig.maxBatchSize);
    const updatesByBill = new Map<number, BillRealTimeUpdate[]>();

    updates.forEach(update => {
      const billId = update.bill_id;
      if (!updatesByBill.has(billId)) {
        updatesByBill.set(billId, []);
      }
      updatesByBill.get(billId)!.push(update);
    });

    updatesByBill.forEach((billUpdates, billId) => {
      try {
        this.processBillUpdates(billId, billUpdates);
      } catch (error) {
        console.error('Failed to process updates for bill', {
          billId,
          updateCount: billUpdates.length,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  private queueBillUpdate(update: BillRealTimeUpdate): void {
    this.updateQueue.push(update);

    if (this.updateQueue.length > this.billsConfig.maxBatchSize * 2) {
      this.updateQueue = this.updateQueue.slice(-this.billsConfig.maxBatchSize);
      console.warn('Bill update queue overflow, removed oldest updates');
    }
  }

  private processBillUpdates(billId: number, updates: BillRealTimeUpdate[]): void {
    updates.forEach(update => {
      const updateType = this.getBillUpdateType(update);
      const timestamp = update.timestamp || new Date().toISOString();
      store.dispatch(addBillUpdate({
        type: updateType as 'status_change' | 'engagement_change' | 'amendment' | 'voting_scheduled',
        data: update,
        timestamp,
        bill_id: update.bill_id
      }));
    });

    updates.forEach(update => {
      this.eventEmitter.emit('billUpdate', {
        bill_id: billId,
        update: {
          type: this.getBillUpdateType(update),
          data: update
        },
        timestamp: update.timestamp || new Date().toISOString()
      });
    });

    if (updates.length > 1) {
      this.eventEmitter.emit('batchedBillUpdates', {
        bill_id: billId,
        updates: updates.map(update => ({
          type: this.getBillUpdateType(update),
          data: update
        })),
        timestamp: new Date().toISOString()
      });
    }
  }

  private getBillUpdateType(update: BillRealTimeUpdate): string {
    if (this.isBillStatusUpdate(update)) return 'status_change';
    if (this.isBillEngagementUpdate(update)) return 'engagement_change';
    if (this.isBillAmendmentUpdate(update)) return 'amendment';
    if (this.isBillVotingUpdate(update)) return 'voting_scheduled';
    return 'unknown';
  }

  private isBillStatusUpdate(update: BillRealTimeUpdate): update is BillStatusUpdate {
    return 'oldStatus' in update && 'newStatus' in update;
  }

  private isBillEngagementUpdate(update: BillRealTimeUpdate): update is BillEngagementUpdate {
    return 'viewCount' in update || 'saveCount' in update || 
           'commentCount' in update || 'shareCount' in update;
  }

  private isBillAmendmentUpdate(update: BillRealTimeUpdate): update is BillAmendmentUpdate {
    return 'amendment_id' in update;
  }

  private isBillVotingUpdate(update: BillRealTimeUpdate): update is BillVotingUpdate {
    return 'voting_date' in update;
  }

  private handleBillUpdateMessage(message: BillUpdateMessage): void {
    try {
      const { bill_id, update, timestamp } = message;

      this.queueBillUpdate({
        ...update.data,
        bill_id,
        timestamp: new Date(timestamp).toISOString()
      } as BillRealTimeUpdate);
    } catch (error) {
      console.error('Failed to handle bill update message', { error, message });
    }
  }

  private handleBatchedBillUpdatesMessage(message: BatchedBillUpdatesMessage): void {
    try {
      const updates: BillRealTimeUpdate[] = Array.isArray(message.updates) ? message.updates : [];

      updates.forEach((update: BillRealTimeUpdate) => {
        this.queueBillUpdate({
          ...update,
          timestamp: update.timestamp || new Date().toISOString()
        });
      });

      if (this.updateQueue.length >= this.billsConfig.maxBatchSize) {
        this.processBillsBatchedUpdates();
      }
    } catch (error) {
      console.error('Failed to handle batched bill updates', { error, message });
    }
  }

  private handleCommunityUpdateMessage(message: WebSocketMessage): void {
    try {
      // Cast to expected Redux type - validation should happen at message parsing
      store.dispatch(addCommunityUpdate(message as never));
    } catch (error) {
      console.error('Failed to handle community update', { error, message });
    }
  }

  private handleNotificationMessage(message: WebSocketMessage): void {
    try {
      // Cast to expected Redux type - validation should happen at message parsing
      store.dispatch(addNotification(message as never));
    } catch (error) {
      console.error('Failed to handle notification', { error, message });
    }
  }

  private handleExpertActivityMessage(message: WebSocketMessage): void {
    try {
      // Cast to expected Redux type - validation should happen at message parsing
      store.dispatch(addExpertActivity(message as never));
    } catch (error) {
      console.error('Failed to handle expert activity', { error, message });
    }
  }

  private handleEngagementMetricsMessage(message: WebSocketMessage): void {
    try {
      // Cast to expected Redux type - validation should happen at message parsing
      store.dispatch(updateEngagementMetrics(message as never));
    } catch (error) {
      console.error('Failed to handle engagement metrics', { error, message });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;

    const baseDelay = Math.min(
      this.config.reconnect.baseDelay * Math.pow(this.config.reconnect.backoffMultiplier, this.reconnectAttempts - 1),
      this.config.reconnect.maxDelay
    );

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

  private decompressMessage(data: string): WebSocketMessage {
    return JSON.parse(data);
  }

  // ============================================================================
  // Public utility methods
  // ============================================================================

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

  subscribeToBillUpdates(billId: number, updateTypes?: BillUpdateType[]): void {
    if (this.subscribedBills.has(billId)) return;

    try {
      this.subscribeToBill(billId, updateTypes);
      this.subscribedBills.add(billId);

      console.info('Subscribed to bill updates', {
        billId,
        updateTypes,
        totalSubscriptions: this.subscribedBills.size
      });
    } catch (error) {
      console.error('Failed to subscribe to bill updates', { billId, error });
      throw error;
    }
  }

  unsubscribeFromBillUpdates(billId: number): void {
    if (!this.subscribedBills.has(billId)) return;

    try {
      this.unsubscribeFromBill(billId);
      this.subscribedBills.delete(billId);
    } catch (error) {
      console.error('Failed to unsubscribe from bill updates', { billId, error });
      throw error;
    }
  }

  getBillSubscriptionStatus(): {
    subscribedBills: number[];
    subscriptionCount: number;
    updateQueueSize: number;
    isConnected: boolean;
  } {
    return {
      subscribedBills: Array.from(this.subscribedBills),
      subscriptionCount: this.subscribedBills.size,
      updateQueueSize: this.updateQueue.length,
      isConnected: this.isConnected()
    };
  }

  isConnected(): boolean {
    return this.ws !== null &&
           this.ws.readyState === WebSocket.OPEN &&
           this.connectionState === ConnectionState.CONNECTED;
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

    if (this.billsBatchTimer) {
      clearInterval(this.billsBatchTimer);
      this.billsBatchTimer = null;
    }

    if (this.updateQueue.length > 0) {
      this.processBillsBatchedUpdates();
    }

    this.updateQueue = [];

    if (this.ws) {
      const wsToClose = this.ws;
      this.ws = null;

      wsToClose.onopen = null;
      wsToClose.onmessage = null;
      wsToClose.onclose = null;
      wsToClose.onerror = null;

      if (normalClose) {
        wsToClose.close(1000, 'Client disconnect');
      } else {
        wsToClose.close();
      }
    }

    this.connectedAt = null;
    this.lastPongTime = null;

    if (this.connectionPromise) {
      this.connectionPromise = null;
    }
  }
}

// ============================================================================
// WebSocket Connection Pool
// ============================================================================

export class WebSocketConnectionPool {
  private connections = new Map<string, UnifiedWebSocketManager>();
  private defaultConfig: WebSocketConfig;
  private defaultBillsConfig: BillsWebSocketConfig;

  constructor(defaultConfig: WebSocketConfig, defaultBillsConfig?: BillsWebSocketConfig) {
    this.defaultConfig = defaultConfig;
    this.defaultBillsConfig = defaultBillsConfig || {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      heartbeatInterval: 30000,
      batchUpdateInterval: 1000,
      maxBatchSize: 50
    };
  }

  getConnection(url: string, config?: Partial<WebSocketConfig>, billsConfig?: Partial<BillsWebSocketConfig>): UnifiedWebSocketManager {
    if (!this.connections.has(url)) {
      const wsConfig = { ...this.defaultConfig, ...config, url };
      const mergedBillsConfig = { ...this.defaultBillsConfig, ...billsConfig };
      const manager = new UnifiedWebSocketManager(wsConfig, mergedBillsConfig);
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

// ============================================================================
// Global WebSocket Pool Instance
// ============================================================================

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
    timeout: 45000
  },
  message: {
    compression: false,
    batching: true,
    batchSize: 10,
    batchInterval: 1000
  }
}, {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 2000,
  heartbeatInterval: 30000,
  batchUpdateInterval: 1000,
  maxBatchSize: 50
});