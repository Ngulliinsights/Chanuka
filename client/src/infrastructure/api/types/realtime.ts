/**
 * Realtime Client Type Definitions
 * 
 * Defines interfaces for realtime event subscriptions and pub/sub functionality
 * within the unified API module.
 */

import { WebSocketMessage } from '@shared/types/api/websocket';

/**
 * Realtime subscription handle
 */
export interface Subscription {
  /** Unique subscription ID */
  id: string;
  
  /** Topic being subscribed to */
  topic: string;
  
  /** Unsubscribe from this subscription */
  unsubscribe(): void;
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void;

/**
 * Realtime client interface
 * 
 * Provides methods for subscribing to realtime events, publishing events,
 * and managing subscriptions.
 */
export interface IRealtimeClient {
  /**
   * Subscribe to a topic
   * @param topic - Topic to subscribe to
   * @param handler - Event handler function
   * @returns Subscription handle
   */
  subscribe<T = unknown>(topic: string, handler: EventHandler<T>): Subscription;
  
  /**
   * Unsubscribe from a subscription
   * @param subscription - Subscription to cancel
   */
  unsubscribe(subscription: Subscription): void;
  
  /**
   * Publish an event to a topic
   * @param topic - Topic to publish to
   * @param data - Event data
   */
  publish(topic: string, data: unknown): void;
  
  /**
   * Check if connected to realtime server
   * @returns true if connected
   */
  isConnected(): boolean;
  
  /**
   * Get all active subscriptions
   * @returns Array of active subscriptions
   */
  getSubscriptions(): Subscription[];
  
  /**
   * Clear all subscriptions
   */
  clearSubscriptions(): void;
}

/**
 * Realtime event data
 */
export interface RealtimeEvent<T = unknown> {
  /** Event type/topic */
  type: string;
  
  /** Event data */
  data: T;
  
  /** Event timestamp */
  timestamp: number;
  
  /** Optional event ID */
  id?: string;
  
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Realtime configuration options
 */
export interface RealtimeOptions {
  /** WebSocket URL for realtime connection */
  url: string;
  
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  
  /** Enable heartbeat */
  enableHeartbeat?: boolean;
  
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
}

/**
 * Realtime hub state
 */
export interface RealtimeHubState {
  /** Connection status */
  connected: boolean;
  
  /** Number of active subscriptions */
  subscriptionCount: number;
  
  /** Last connection timestamp */
  lastConnected?: string;
  
  /** Last disconnection timestamp */
  lastDisconnected?: string;
  
  /** Reconnection attempts */
  reconnectAttempts: number;
}
