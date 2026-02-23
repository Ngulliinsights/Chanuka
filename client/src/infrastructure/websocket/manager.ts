/**
 * WebSocket Manager with Reconnection
 * 
 * Provides reliable WebSocket connections with:
 * - Exponential backoff reconnection (1s, 2s, 4s, 8s, 16s, max 30s)
 * - Connection state tracking
 * - Error logging with context
 * - Event-based message handling
 * 
 * Feature: comprehensive-bug-fixes
 * Requirements: 7.2, 13.1
 */

export interface WebSocketManager {
  connect(url: string): Promise<void>;
  disconnect(): void;
  send(data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
  getConnectionState(): ConnectionState;
}

export interface ReconnectionConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

interface ErrorContext {
  operation: string;
  layer: 'client';
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

type EventHandler = (data: unknown) => void;

export class WebSocketManagerImpl implements WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private config: ReconnectionConfig = {
    maxRetries: 10,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  constructor(config?: Partial<ReconnectionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async connect(url: string): Promise<void> {
    this.url = url;
    this.connectionState = 'connecting';

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          console.log('[WebSocket] Connected successfully', {
            url: this.url,
            timestamp: new Date().toISOString(),
          });
          this.emit('connected', { url: this.url });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit('message', data);
            
            // Emit specific event type if available
            if (data.type) {
              this.emit(data.type, data);
            }
          } catch (error) {
            console.error('[WebSocket] Failed to parse message', {
              error,
              rawData: event.data,
            });
          }
        };

        this.ws.onerror = (event) => {
          this.handleError(event);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };
      } catch (error) {
        this.connectionState = 'failed';
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    console.log('[WebSocket] Disconnected', {
      url: this.url,
      timestamp: new Date().toISOString(),
    });
  }

  send(data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message - not connected', {
        state: this.connectionState,
        readyState: this.ws?.readyState,
      });
      return;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
    } catch (error) {
      console.error('[WebSocket] Failed to send message', {
        error,
        data,
      });
    }
  }

  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('[WebSocket] Error in event handler', {
            event,
            error,
          });
        }
      });
    }
  }

  private handleError(event: Event): void {
    const context: ErrorContext = {
      operation: 'websocket_error',
      layer: 'client',
      timestamp: new Date(),
      severity: 'high',
      metadata: {
        readyState: this.ws?.readyState,
        reconnectAttempts: this.reconnectAttempts,
        url: this.url,
      },
    };

    console.error('[WebSocket] Error occurred', event, context);
    this.emit('error', { event, context });
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Connection closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      reconnectAttempts: this.reconnectAttempts,
    });

    this.emit('disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    // Only attempt reconnection if not manually disconnected
    if (this.connectionState !== 'disconnected') {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxRetries) {
      this.connectionState = 'failed';
      console.error('[WebSocket] Max reconnection attempts reached', {
        maxRetries: this.config.maxRetries,
        url: this.url,
      });
      this.emit('reconnect_failed', {
        attempts: this.reconnectAttempts,
        maxRetries: this.config.maxRetries,
      });
      return;
    }

    this.connectionState = 'reconnecting';
    const delay = this.calculateBackoff();

    console.log('[WebSocket] Attempting reconnection', {
      attempt: this.reconnectAttempts + 1,
      maxRetries: this.config.maxRetries,
      delay,
      url: this.url,
    });

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts + 1,
      delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.url).catch((error) => {
        console.error('[WebSocket] Reconnection failed', {
          error,
          attempt: this.reconnectAttempts,
        });
      });
    }, delay);
  }

  private calculateBackoff(): number {
    const delay = Math.min(
      this.config.initialDelay * Math.pow(
        this.config.backoffMultiplier,
        this.reconnectAttempts
      ),
      this.config.maxDelay
    );
    return delay;
  }
}

/**
 * Create a new WebSocket manager instance
 */
export function createWebSocketManager(
  config?: Partial<ReconnectionConfig>
): WebSocketManager {
  return new WebSocketManagerImpl(config);
}
