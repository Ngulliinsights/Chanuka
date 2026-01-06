/**
 * WebSocket Manager
 *
 * Unified WebSocket management for real-time community features.
 * Consolidates WebSocket logic from CommunityWebSocketManager and EventBus.
 */

import type { WebSocketEvents } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler<T = any> = (data: T) => void;

export class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private eventHandlers = new Map<keyof WebSocketEvents, EventHandler[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private joinedRooms = new Set<string>();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Connect to WebSocket server
   */
  connect(url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for current connection attempt
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      this.isConnecting = true;
      const wsUrl = url || this.getWebSocketUrl();

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Rejoin rooms after reconnection
          this.joinedRooms.forEach(room => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ event: 'join_room', data: { room } }));
            }
          });

          resolve();
        };

        this.ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          this.ws = null;
          this.attemptReconnect();
        };

        this.ws.onerror = error => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.joinedRooms.clear();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  /**
   * Send message to server
   */
  send<K extends keyof WebSocketEvents>(event: K, data: WebSocketEvents[K]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    } else {
      console.warn('WebSocket not connected, message not sent:', event, data);
    }
  }

  /**
   * Emit event (alias for send)
   */
  emit<K extends keyof WebSocketEvents>(event: K, data: WebSocketEvents[K]): void {
    this.send(event, data);
  }

  /**
   * Subscribe to WebSocket events
   */
  on<K extends keyof WebSocketEvents>(
    event: K,
    handler: EventHandler<WebSocketEvents[K]>
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    const handlers = this.eventHandlers.get(event)!;
    handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off<K extends keyof WebSocketEvents>(event: K, handler?: EventHandler<WebSocketEvents[K]>): void {
    if (!handler) {
      // Remove all handlers for this event
      this.eventHandlers.delete(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Join a room for targeted messaging
   */
  joinRoom(room: string): void {
    this.joinedRooms.add(room);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'join_room', data: { room } }));
    }
  }

  /**
   * Leave a room
   */
  leaveRoom(room: string): void {
    this.joinedRooms.delete(room);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'leave_room', data: { room } }));
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: {
    event: keyof WebSocketEvents;
    data: Record<string, unknown>;
  }): void {
    const { event, data } = message;
    const handlers = this.eventHandlers.get(event);

    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Get WebSocket URL from environment or default
   */
  private getWebSocketUrl(): string {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}/ws`;
    }
    return 'ws://localhost:3001/ws';
  }
}
