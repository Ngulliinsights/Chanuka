import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { defaultApiConfig } from '../config/api.js';
import { logger } from '@shared/core';

export interface BillUpdate {
  type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
  data: {
    billId: number;
    oldStatus?: string;
    newStatus?: string;
    title?: string;
    [key: string]: any;
  };
  timestamp: string;
}

export interface WebSocketNotification {
  type: string;
  title: string;
  message: string;
  data?: any;
}

export interface UserPreferences {
  billTracking: {
    statusChanges: boolean;
    newComments: boolean;
    votingSchedule: boolean;
    amendments: boolean;
    updateFrequency: 'immediate' | 'hourly' | 'daily';
    notificationChannels: {
      inApp: boolean;
      email: boolean;
      push: boolean;
    };
    quietHours?: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
}

// Enhanced type-safe event map with proper typing
interface WebSocketEvents {
  connected: { timestamp: string };
  disconnected: { code: number; reason: string };
  error: any;
  billUpdate: { billId: number; update: BillUpdate; timestamp: string };
  notification: WebSocketNotification;
  batchedUpdates: WebSocketNotification;
  preferences: UserPreferences;
  preferencesUpdated: UserPreferences;
  subscribed: { billId: number };
  unsubscribed: { billId: number };
}

// Optimization: Add connection state enum for clearer state management
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionState = ConnectionState.DISCONNECTED;
  
  // Optimization: Use Map for O(1) lookup instead of checking arrays
  private eventListeners: Map<string, Set<Function>> = new Map();
  
  // Heartbeat optimization: More precise timing control
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutMs = 45000; // 45 seconds before considering connection dead
  private heartbeatIntervalMs = 30000; // Send ping every 30 seconds
  private lastPongTime: number | null = null;
  private connectedAt: number | null = null;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private currentToken: string | null = null;
  
  // Optimization: Message queue for offline buffering
  private messageQueue: any[] = [];
  private maxQueueSize = 100;
  
  // Optimization: Connection promise for better async handling
  private connectionPromise: Promise<void> | null = null;

  constructor(private baseUrl: string = defaultApiConfig.baseUrl.replace(/^http/, 'ws')) {}

  // Enhanced connect method with better promise handling
  async connect(token: string): Promise<void> {
    // Optimization: Return existing connection promise if already connecting
    if (this.connectionPromise && this.connectionState === ConnectionState.CONNECTING) {
      return this.connectionPromise;
    }

    // Already connected, return immediately
    if (this.connectionState === ConnectionState.CONNECTED && this.isConnected()) {
      return Promise.resolve();
    }

    this.currentToken = token;
    this.cleanup(false);

    // Create and store connection promise for reuse
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionState = ConnectionState.CONNECTING;

      try {
        const wsUrl = `${this.baseUrl}/ws?token=${encodeURIComponent(token)}`;
        logger.info('WebSocket attempting to connect to:', { component: 'Chanuka' }, wsUrl);
        this.ws = new WebSocket(wsUrl);

        // Optimization: Add connection timeout to prevent hanging
        const connectionTimeout = setTimeout(() => {
          if (this.connectionState === ConnectionState.CONNECTING) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          logger.info('WebSocket connected successfully', { component: 'Chanuka' });
          this.connectionState = ConnectionState.CONNECTED;
          this.reconnectAttempts = 0;
          this.connectedAt = Date.now();
          this.lastPongTime = Date.now();
          
          // Optimization: Process queued messages on reconnection
          this.flushMessageQueue();
          
          this.startHeartbeat();
          this.emit('connected', { timestamp: new Date().toISOString() });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            logger.error('Error parsing WebSocket message:', { component: 'Chanuka' }, error);
            // Optimization: Don't crash on malformed messages
            this.emit('error', { message: 'Failed to parse message', error });
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          logger.info('WebSocket connection closed:', { component: 'Chanuka' }, event.code, event.reason);
          
          // Optimization: Update state before emitting events
          const wasConnected = this.connectionState === ConnectionState.CONNECTED;
          this.connectionState = event.code === 1000 ? ConnectionState.DISCONNECTED : ConnectionState.RECONNECTING;
          
          this.stopHeartbeat();
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // Optimization: Only attempt reconnection if we were successfully connected before
          if (event.code !== 1000 && wasConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.connectionState = ConnectionState.FAILED;
            logger.error('Max reconnection attempts reached', { component: 'Chanuka' });
            this.emit('error', { message: 'Failed to reconnect after maximum attempts' });
            reject(new Error('Max reconnection attempts reached'));
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          logger.error('WebSocket error:', { component: 'Chanuka' }, error);
          this.emit('error', error);
          
          // Optimization: Only reject if we're still trying to connect initially
          if (this.connectionState === ConnectionState.CONNECTING) {
            reject(error);
          }
        };

      } catch (error) {
        this.connectionState = ConnectionState.DISCONNECTED;
        logger.error('Failed to connect to WebSocket:', { component: 'Chanuka' }, error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Optimized message handling with early returns
  private handleMessage(message: any): void {
    this.lastPongTime = Date.now();

    // Optimization: Use object lookup instead of switch for better performance
    const messageHandlers: Record<string, () => void> = {
      connected: () => this.emit('connected', message.data),
      bill_update: () => this.emit('billUpdate', {
        billId: message.billId,
        update: message.update,
        timestamp: message.timestamp
      }),
      notification: () => this.emit('notification', message.notification),
      batched_bill_updates: () => this.emit('batchedUpdates', message.notification),
      preferences: () => this.emit('preferences', message.data),
      preferences_updated: () => this.emit('preferencesUpdated', message.data),
      subscribed: () => this.emit('subscribed', message.data),
      unsubscribed: () => this.emit('unsubscribed', message.data),
      error: () => this.emit('error', { message: message.message }),
      pong: () => { /* Already updated lastPongTime */ }
    };

    const handler = messageHandlers[message.type];
    if (handler) {
      handler();
    } else {
      logger.info('Unknown message type:', { component: 'Chanuka' }, message.type);
    }
  }

  // Optimization: Queue messages when offline instead of throwing
  subscribeToBill(billId: number, subscriptionTypes?: Array<'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled'>): void {
    const message = {
      type: 'subscribe',
      data: { billId, subscriptionTypes }
    };

    if (!this.isConnected()) {
      console.warn('WebSocket not connected. Queueing subscription.');
      this.queueMessage(message);
      return;
    }

    this.send(message);
  }

  unsubscribeFromBill(billId: number): void {
    const message = {
      type: 'unsubscribe',
      data: { billId }
    };

    if (!this.isConnected()) {
      console.warn('WebSocket not connected. Queueing unsubscription.');
      this.queueMessage(message);
      return;
    }

    this.send(message);
  }

  getPreferences(): void {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    this.send({ type: 'get_preferences' });
  }

  updatePreferences(preferences: Partial<UserPreferences['billTracking']>): void {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    this.send({
      type: 'update_preferences',
      data: { preferences }
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
        logger.error('Error sending queued message:', { component: 'Chanuka' }, error);
        // Re-queue failed messages
        this.queueMessage(message);
      }
    });
  }

  // Optimized heartbeat with better timing guarantees
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (!this.isConnected()) {
        this.stopHeartbeat();
        return;
      }

      // Check if connection is stale
      if (this.lastPongTime && Date.now() - this.lastPongTime > this.heartbeatTimeoutMs) {
        console.warn('No pong received, connection appears dead');
        this.ws?.close(4000, 'Heartbeat timeout');
        return;
      }
      
      this.send({ type: 'ping' });
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Optimization: Add validation and error handling to send
  private send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot send message: WebSocket not open');
    }

    try {
      const payload = JSON.stringify(message);
      // Optimization: Add message size check to prevent issues
      if (payload.length > 1024 * 1024) { // 1MB limit
        throw new Error('Message too large');
      }
      this.ws.send(payload);
    } catch (error) {
      logger.error('Error sending WebSocket message:', { component: 'Chanuka' }, error);
      this.emit('error', { message: 'Failed to send message', error });
      throw error;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && 
           this.ws.readyState === WebSocket.OPEN && 
           this.connectionState === ConnectionState.CONNECTED;
  }

  disconnect(): void {
    this.cleanup(true);
    this.currentToken = null;
    this.messageQueue = []; // Clear queue on explicit disconnect
    this.connectionState = ConnectionState.DISCONNECTED;
  }

  private cleanup(normalClose: boolean = false): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.stopHeartbeat();
    
    if (this.ws) {
      // Optimization: Remove event handlers to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      if (normalClose) {
        this.ws.close(1000, 'Client disconnect');
      } else {
        this.ws.close();
      }
      this.ws = null;
    }
    
    this.connectedAt = null;
    this.lastPongTime = null;
    this.connectionPromise = null;
  }

  // Optimization: Exponential backoff with better jitter calculation
  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) return;

    this.reconnectAttempts++;
    
    // Better exponential backoff: starts at 1s, doubles each time, caps at 30s
    const baseDelay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    // Full jitter: random between 0 and baseDelay for better distribution
    const delay = Math.random() * baseDelay;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      if (this.currentToken) {
        this.connect(this.currentToken).catch(error => {
          logger.error('Reconnection failed:', { component: 'WebSocketClient' }, error);
        });
      }
    }, delay);
  }

  // Optimization: Type-safe event listeners with better memory management
  on<K extends keyof WebSocketEvents>(event: K, callback: (data: WebSocketEvents[K]) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    // Return unsubscribe function for easier cleanup
    return () => this.off(event, callback);
  }

  off<K extends keyof WebSocketEvents>(event: K, callback: (data: WebSocketEvents[K]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      // Optimization: Clean up empty listener sets
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners || listeners.size === 0) return;

    // Optimization: Convert to array once for iteration
    const listenerArray = Array.from(listeners);
    listenerArray.forEach(callback => {
      try {
        // Optimization: Use microtask to prevent blocking
        queueMicrotask(() => callback(data));
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
      }
    });
  }

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
      maxReconnectAttempts: this.maxReconnectAttempts,
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
      maxReconnectAttempts: this.maxReconnectAttempts,
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
      this.maxReconnectAttempts = Math.max(0, options.maxReconnectAttempts);
    }
    if (options.reconnectDelay !== undefined) {
      this.reconnectDelay = Math.max(100, options.reconnectDelay);
    }
    if (options.heartbeatInterval !== undefined) {
      this.heartbeatIntervalMs = Math.max(5000, options.heartbeatInterval);
    }
    if (options.heartbeatTimeout !== undefined) {
      this.heartbeatTimeoutMs = Math.max(10000, options.heartbeatTimeout);
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
}

// Singleton instance
export const webSocketClient = new WebSocketClient();

// Optimized React hook with better state management
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(webSocketClient.getConnectionStatus());
  
  // Optimization: Memoize callbacks to prevent unnecessary re-renders
  const updateConnectionState = useCallback(() => {
    const connected = webSocketClient.isConnected();
    const status = webSocketClient.getConnectionStatus();
    
    setIsConnected(connected);
    setConnectionStatus(status);
  }, []);

  useEffect(() => {
    // Optimization: Create stable callback references using useCallback pattern
    const handleConnected = () => updateConnectionState();
    const handleDisconnected = () => updateConnectionState();
    const handleError = (error: any) => {
      logger.error('WebSocket error:', { component: 'Chanuka' }, error);
      updateConnectionState();
    };

    // Store unsubscribe functions
    const unsubscribeConnected = webSocketClient.on('connected', handleConnected);
    const unsubscribeDisconnected = webSocketClient.on('disconnected', handleDisconnected);
    const unsubscribeError = webSocketClient.on('error', handleError);

    updateConnectionState();

    // Optimization: Use returned unsubscribe functions
    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeError();
    };
  }, [updateConnectionState]);

  // Optimization: Memoize the returned object to prevent unnecessary re-renders
  return useMemo(() => ({
    isConnected,
    connectionStatus,
    connect: (token: string) => webSocketClient.connect(token),
    disconnect: () => webSocketClient.disconnect(),
    subscribeToBill: (billId: number, types?: any) => 
      webSocketClient.subscribeToBill(billId, types),
    unsubscribeFromBill: (billId: number) => 
      webSocketClient.unsubscribeFromBill(billId),
    getPreferences: () => webSocketClient.getPreferences(),
    updatePreferences: (prefs: any) => 
      webSocketClient.updatePreferences(prefs),
    on: (event: any, callback: any) => 
      webSocketClient.on(event, callback),
    off: (event: any, callback: any) => 
      webSocketClient.off(event, callback)
  }), [isConnected, connectionStatus]);
}

// Optimized bill updates hook with deduplication
export function useBillUpdates(billId?: number) {
  const [updates, setUpdates] = useState<BillUpdate[]>([]);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  
  const billIdRef = useRef(billId);
  billIdRef.current = billId;

  useEffect(() => {
    const handleBillUpdate = (data: any) => {
      const update = data.update as BillUpdate;
      
      if (!billIdRef.current || update.data.billId === billIdRef.current) {
        setUpdates(prev => {
          // Optimization: Deduplicate updates based on timestamp and billId
          const isDuplicate = prev.some(u => 
            u.timestamp === update.timestamp && 
            u.data.billId === update.data.billId
          );
          
          if (isDuplicate) return prev;
          
          const newUpdates = [update, ...prev];
          return newUpdates.slice(0, 50);
        });
      }
    };

    const handleNotification = (notification: WebSocketNotification) => {
      setNotifications(prev => {
        // Optimization: Deduplicate notifications
        const isDuplicate = prev.some(n => 
          n.title === notification.title && 
          n.message === notification.message
        );
        
        if (isDuplicate) return prev;
        
        const newNotifications = [notification, ...prev];
        return newNotifications.slice(0, 20);
      });
    };

    const handleBatchedUpdates = (batchedNotification: WebSocketNotification) => {
      handleNotification(batchedNotification);
    };

    // Use the returned unsubscribe functions
    const unsubBillUpdate = webSocketClient.on('billUpdate', handleBillUpdate);
    const unsubNotification = webSocketClient.on('notification', handleNotification);
    const unsubBatched = webSocketClient.on('batchedUpdates', handleBatchedUpdates);

    return () => {
      unsubBillUpdate();
      unsubNotification();
      unsubBatched();
    };
  }, []);

  // Optimization: Memoize callbacks
  const clearUpdates = useCallback(() => setUpdates([]), []);
  const clearNotifications = useCallback(() => setNotifications([]), []);

  return useMemo(() => ({
    updates,
    notifications,
    clearUpdates,
    clearNotifications
  }), [updates, notifications, clearUpdates, clearNotifications]);
}











































