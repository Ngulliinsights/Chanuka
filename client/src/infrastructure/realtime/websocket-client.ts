/**
 * WebSocket Client Module
 *
 * Client-side WebSocket connection management.
 * Uses unified WebSocket types from shared schema for consistency.
 */

import {
  ConnectionState,
  WebSocketMessage,
} from '@shared/types/api/websocket';
import type { WebSocketConfig } from '@client/infrastructure/realtime/types';

// WebSocket error interface (for client-side use)
interface WebSocketError extends Error {
  code: number;
  wasClean: boolean;
  timestamp: string;
}

import { logger } from '@client/lib/utils/logger';

// Define events specific to the client implementation
export interface WebSocketClientEvents {
  connected: () => void;
  disconnected: (code: number, reason: string) => void;
  message: (message: WebSocketMessage) => void;
  error: (error: WebSocketError) => void;
  reconnecting: (attempt: number) => void;
}

type EventHandler<T extends keyof WebSocketClientEvents> = WebSocketClientEvents[T];

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig; // ✅ Uses shared config type
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private eventHandlers = new Map<
    keyof WebSocketClientEvents,
    Set<EventHandler<keyof WebSocketClientEvents>>
  >();

  // Cross-platform timer handles (browser-compatible)
  private reconnectTimerRef: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempts = 0;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.connectionState = ConnectionState.CONNECTING;
    this.emit('reconnecting', this.reconnectAttempts);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.connectionState = ConnectionState.DISCONNECTED;
    this.stopHeartbeat();
    this.clearReconnectTimer();
  }

  public send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn('Cannot send message: WebSocket not connected', { message });
    }
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // ... (Keep your existing private helper methods: setupEventHandlers, startHeartbeat, etc.)
  // Just ensure they use the ConnectionState enum from the import

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.connectionState = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connected');
    };

    this.ws.onclose = event => {
      this.connectionState = ConnectionState.DISCONNECTED;
      this.stopHeartbeat();
      this.emit('disconnected', event.code, event.reason);

      // Auto-reconnect logic based on client config
      const shouldReconnect = typeof this.config.reconnect === 'boolean' 
        ? this.config.reconnect 
        : this.config.reconnect?.enabled !== false;
      
      if (shouldReconnect) {
        this.attemptReconnect();
      }
    };

    this.ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.emit('message', message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message', { error, data: event.data });
      }
    };

    this.ws.onerror = () => {
      const error: WebSocketError = {
        name: 'WebSocketError',
        message: 'WebSocket connection error',
        code: 0,
        wasClean: false,
        timestamp: new Date().toISOString(),
      };
      this.emit('error', error);
    };
  }

  // Event Emitter Logic
  public on<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler<keyof WebSocketClientEvents>);
  }

  public off<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void {
    this.eventHandlers.get(event)?.delete(handler as EventHandler<keyof WebSocketClientEvents>);
  }

  private emit<K extends keyof WebSocketClientEvents>(
    event: K,
    ...args: Parameters<WebSocketClientEvents[K]>
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as (...args: Parameters<WebSocketClientEvents[K]>) => void)(...args);
        } catch (error) {
          logger.error('Error in WebSocket event handler', { event, error });
        }
      });
    }
  }

  // Implementation for missing methods
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startHeartbeat() {
    if (this.config.heartbeat?.interval) {
      this.heartbeatTimer = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.send({
            type: 'heartbeat',
            data: { type: 'ping', timestamp: Date.now() },
          });
        }
      }, this.config.heartbeat.interval);
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimerRef) {
      window.clearTimeout(this.reconnectTimerRef);
      this.reconnectTimerRef = null;
    }
  }

  private attemptReconnect() {
    const reconnectConfig = typeof this.config.reconnect === 'boolean' 
      ? { enabled: this.config.reconnect, maxAttempts: 5, delay: 1000 }
      : this.config.reconnect || { enabled: true, maxAttempts: 5, delay: 1000 };

    if (this.reconnectAttempts < reconnectConfig.maxAttempts) {
      const reconnectDelay = Math.min(
        reconnectConfig.delay * Math.pow(2, this.reconnectAttempts),
        30000
      );

      this.reconnectTimerRef = window.setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, reconnectDelay);
    }
  }

  public subscribe(topics: string | string[]): boolean {
    if (this.connectionState !== ConnectionState.CONNECTED) return false;
    
    // Convert single topic to array
    const topicList = Array.isArray(topics) ? topics : [topics];
    
    // Create subscription objects
    const subscriptions = topicList.map(topic => ({
      id: `${Date.now()}-${Math.random()}`,
      topic,
      timestamp: new Date().toISOString()
    }));

    // Send subscription message with proper typing
    const subscriptionMessage: WebSocketMessage = {
      type: 'subscribe',
      data: { subscriptions },
      timestamp: Date.now()
    };
    this.send(subscriptionMessage);

    return true;
  }

  public unsubscribe(topics: string | string[]): boolean {
    if (this.connectionState !== ConnectionState.CONNECTED) return false;

    // Convert single topic to array
    const topicList = Array.isArray(topics) ? topics : [topics];

    // Send unsubscription message with proper typing
    const unsubscriptionMessage: WebSocketMessage = {
      type: 'unsubscribe',
      data: { topics: topicList },
      timestamp: Date.now()
    };
    this.send(unsubscriptionMessage);

    return true;
  }

  private handleConnectionError(error: unknown) {
    this.connectionState = ConnectionState.FAILED;
    logger.error('WebSocket connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function createWebSocketClient(config: WebSocketConfig): WebSocketClient {
  return new WebSocketClient(config);
}
