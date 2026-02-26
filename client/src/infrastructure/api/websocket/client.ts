/**
 * Unified WebSocket Client
 * 
 * Implements IWebSocketClient interface with:
 * - Connection management with reconnection
 * - Message sending and receiving
 * - Topic subscriptions
 * - Event handling
 * - Connection state tracking
 */

import { logger } from '@client/lib/utils/logger';
import { observability } from '@client/infrastructure/observability';
import {
  ConnectionState,
  WebSocketMessage,
} from '@shared/types/api/websocket';
import type {
  IWebSocketClient,
  WebSocketOptions,
  WebSocketClientEvents,
  WebSocketError,
} from '../types/websocket';

type EventHandler<K extends keyof WebSocketClientEvents> = WebSocketClientEvents[K];

/**
 * Unified WebSocket Client Implementation
 */
export class UnifiedWebSocketClient implements IWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketOptions;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private eventHandlers = new Map<
    keyof WebSocketClientEvents,
    Set<EventHandler<keyof WebSocketClientEvents>>
  >();
  private reconnectTimerRef: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempts = 0;
  private subscriptions = new Set<string>();
  private connectionStartTime: number | null = null;

  constructor(config: WebSocketOptions) {
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
      logger.debug('WebSocket already connected or connecting', {
        component: 'WebSocketClient',
        state: this.connectionState,
      });
      return;
    }

    this.connectionState = ConnectionState.CONNECTING;
    this.connectionStartTime = Date.now();
    this.emit('reconnecting', this.reconnectAttempts);

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventHandlers();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.connectionState = ConnectionState.DISCONNECTED;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.subscriptions.clear();

    logger.info('WebSocket disconnected', {
      component: 'WebSocketClient',
      url: this.config.url,
    });
  }

  /**
   * Send a message through the WebSocket connection
   */
  public send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      logger.debug('WebSocket message sent', {
        component: 'WebSocketClient',
        type: message.type,
      });
    } else {
      logger.warn('Cannot send message: WebSocket not connected', {
        component: 'WebSocketClient',
        state: this.connectionState,
        message,
      });
    }
  }

  /**
   * Subscribe to one or more topics
   */
  public subscribe(topics: string | string[]): boolean {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      logger.warn('Cannot subscribe: WebSocket not connected', {
        component: 'WebSocketClient',
        state: this.connectionState,
      });
      return false;
    }

    const topicList = Array.isArray(topics) ? topics : [topics];

    // Track subscriptions
    topicList.forEach(topic => this.subscriptions.add(topic));

    // Create subscription objects
    const subscriptions = topicList.map(topic => ({
      id: `${Date.now()}-${Math.random()}`,
      topic,
      timestamp: new Date().toISOString(),
    }));

    // Send subscription message
    const subscriptionMessage: WebSocketMessage = {
      type: 'subscribe',
      data: { subscriptions },
      timestamp: Date.now(),
    };
    this.send(subscriptionMessage);

    logger.info('Subscribed to topics', {
      component: 'WebSocketClient',
      topics: topicList,
    });

    return true;
  }

  /**
   * Unsubscribe from one or more topics
   */
  public unsubscribe(topics: string | string[]): boolean {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      logger.warn('Cannot unsubscribe: WebSocket not connected', {
        component: 'WebSocketClient',
        state: this.connectionState,
      });
      return false;
    }

    const topicList = Array.isArray(topics) ? topics : [topics];

    // Remove from tracked subscriptions
    topicList.forEach(topic => this.subscriptions.delete(topic));

    // Send unsubscription message
    const unsubscriptionMessage: WebSocketMessage = {
      type: 'unsubscribe',
      data: { topics: topicList },
      timestamp: Date.now(),
    };
    this.send(unsubscriptionMessage);

    logger.info('Unsubscribed from topics', {
      component: 'WebSocketClient',
      topics: topicList,
    });

    return true;
  }

  /**
   * Get the current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Register an event handler
   */
  public on<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler<keyof WebSocketClientEvents>);
  }

  /**
   * Unregister an event handler
   */
  public off<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void {
    this.eventHandlers.get(event)?.delete(handler as EventHandler<keyof WebSocketClientEvents>);
  }

  /**
   * Get all active subscriptions
   */
  public getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  // Private methods

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.connectionState = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connected');

      // Track connection performance
      if (this.connectionStartTime) {
        const connectionTime = Date.now() - this.connectionStartTime;
        observability.trackPerformance({
          name: 'websocket_connection_time',
          value: connectionTime,
          unit: 'ms',
          timestamp: new Date(),
        });
        this.connectionStartTime = null;
      }

      logger.info('WebSocket connected', {
        component: 'WebSocketClient',
        url: this.config.url,
      });

      // Resubscribe to topics after reconnection
      if (this.subscriptions.size > 0) {
        this.subscribe(Array.from(this.subscriptions));
      }
    };

    this.ws.onclose = event => {
      this.connectionState = ConnectionState.DISCONNECTED;
      this.stopHeartbeat();
      this.emit('disconnected', event.code, event.reason);

      logger.info('WebSocket closed', {
        component: 'WebSocketClient',
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      // Auto-reconnect logic
      const shouldReconnect =
        typeof this.config.reconnect === 'boolean'
          ? this.config.reconnect
          : this.config.reconnect?.enabled !== false;

      if (shouldReconnect && event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.emit('message', message);

        logger.debug('WebSocket message received', {
          component: 'WebSocketClient',
          type: message.type,
        });
      } catch (error) {
        logger.error('Failed to parse WebSocket message', {
          component: 'WebSocketClient',
          error,
          data: event.data,
        });
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

      // Track error with observability
      observability.trackError(error, {
        component: 'WebSocketClient',
        operation: 'connection',
        metadata: {
          url: this.config.url,
          state: this.connectionState,
        },
      });

      logger.error('WebSocket error', {
        component: 'WebSocketClient',
        error,
      });
    };
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
          logger.error('Error in WebSocket event handler', {
            component: 'WebSocketClient',
            event,
            error,
          });
        }
      });
    }
  }

  private startHeartbeat(): void {
    if (this.config.heartbeat?.interval) {
      this.heartbeatTimer = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.send({
            type: 'heartbeat',
            data: { type: 'ping', timestamp: Date.now() },
            timestamp: Date.now(),
          });
        }
      }, this.config.heartbeat.interval);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimerRef) {
      window.clearTimeout(this.reconnectTimerRef);
      this.reconnectTimerRef = null;
    }
  }

  private attemptReconnect(): void {
    const reconnectConfig =
      typeof this.config.reconnect === 'boolean'
        ? { enabled: this.config.reconnect, maxAttempts: 5, delay: 1000 }
        : this.config.reconnect || { enabled: true, maxAttempts: 5, delay: 1000 };

    if (this.reconnectAttempts < reconnectConfig.maxAttempts) {
      const reconnectDelay = Math.min(
        reconnectConfig.delay * Math.pow(2, this.reconnectAttempts),
        30000
      );

      logger.info('Attempting WebSocket reconnection', {
        component: 'WebSocketClient',
        attempt: this.reconnectAttempts + 1,
        maxAttempts: reconnectConfig.maxAttempts,
        delay: reconnectDelay,
      });

      this.reconnectTimerRef = window.setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, reconnectDelay);
    } else {
      this.connectionState = ConnectionState.FAILED;
      logger.error('WebSocket max reconnection attempts reached', {
        component: 'WebSocketClient',
        maxAttempts: reconnectConfig.maxAttempts,
      });
    }
  }

  private handleConnectionError(error: unknown): void {
    this.connectionState = ConnectionState.FAILED;
    
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Track error with observability
    observability.trackError(errorObj, {
      component: 'WebSocketClient',
      operation: 'connect',
      metadata: {
        url: this.config.url,
        reconnectAttempts: this.reconnectAttempts,
      },
    });
    
    logger.error('WebSocket connection failed', {
      component: 'WebSocketClient',
      error: errorObj.message,
    });
  }
}

/**
 * Create a new WebSocket client instance
 */
export function createWebSocketClient(config: WebSocketOptions): IWebSocketClient {
  return new UnifiedWebSocketClient(config);
}
