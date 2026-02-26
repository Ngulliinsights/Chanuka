/**
 * WebSocket Client Sub-Module
 * 
 * Consolidated WebSocket functionality including:
 * - WebSocket client with reconnection
 * - Connection state management
 * - Topic subscriptions
 * - Event handling
 * - Heartbeat mechanism
 */

// Unified WebSocket client
export {
  UnifiedWebSocketClient,
  createWebSocketClient,
} from './client';

// Legacy WebSocket manager (for backward compatibility)
export {
  WebSocketManager,
  WebSocketManagerImpl,
  createWebSocketManager,
  type ReconnectionConfig,
  type ConnectionState as LegacyConnectionState,
} from './manager';

// WebSocket types
export type {
  IWebSocketClient,
  WebSocketOptions,
  WebSocketClientEvents,
  WebSocketError,
  ConnectionState,
  ConnectionQuality,
  WebSocketMessage,
} from '../types/websocket';
