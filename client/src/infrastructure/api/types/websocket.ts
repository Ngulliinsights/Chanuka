/**
 * WebSocket Client Type Definitions
 * 
 * Defines interfaces for WebSocket client functionality within the unified API module.
 * Uses shared WebSocket types from @shared/types/api/websocket for consistency.
 */

import {
  ConnectionState,
  ConnectionQuality,
  WebSocketMessage,
} from '@shared/types/api/websocket';

/**
 * WebSocket connection options
 */
export interface WebSocketOptions {
  /** WebSocket server URL */
  url: string;
  
  /** Reconnection configuration */
  reconnect?: boolean | {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
  
  /** Heartbeat configuration */
  heartbeat?: {
    interval: number;
    timeout?: number;
  };
  
  /** Connection timeout in milliseconds */
  timeout?: number;
  
  /** Custom headers for WebSocket handshake */
  headers?: Record<string, string>;
  
  /** Protocols to use */
  protocols?: string | string[];
}

/**
 * WebSocket client interface
 * 
 * Provides methods for managing WebSocket connections, sending messages,
 * and subscribing to topics.
 */
export interface IWebSocketClient {
  /**
   * Connect to the WebSocket server
   */
  connect(): void;
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void;
  
  /**
   * Send a message through the WebSocket connection
   * @param message - Message to send
   */
  send(message: WebSocketMessage): void;
  
  /**
   * Subscribe to one or more topics
   * @param topics - Topic or array of topics to subscribe to
   * @returns true if subscription was successful
   */
  subscribe(topics: string | string[]): boolean;
  
  /**
   * Unsubscribe from one or more topics
   * @param topics - Topic or array of topics to unsubscribe from
   * @returns true if unsubscription was successful
   */
  unsubscribe(topics: string | string[]): boolean;
  
  /**
   * Get the current connection state
   * @returns Current connection state
   */
  getConnectionState(): ConnectionState;
  
  /**
   * Register an event handler
   * @param event - Event name
   * @param handler - Event handler function
   */
  on<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void;
  
  /**
   * Unregister an event handler
   * @param event - Event name
   * @param handler - Event handler function
   */
  off<K extends keyof WebSocketClientEvents>(
    event: K,
    handler: WebSocketClientEvents[K]
  ): void;
}

/**
 * WebSocket client events
 */
export interface WebSocketClientEvents {
  connected: () => void;
  disconnected: (code: number, reason: string) => void;
  message: (message: WebSocketMessage) => void;
  error: (error: WebSocketError) => void;
  reconnecting: (attempt: number) => void;
}

/**
 * WebSocket error interface
 */
export interface WebSocketError extends Error {
  code: number;
  wasClean: boolean;
  timestamp: string;
}

// Re-export shared types for convenience
export { ConnectionState, ConnectionQuality, WebSocketMessage };
