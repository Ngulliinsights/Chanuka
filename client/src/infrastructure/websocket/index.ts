/**
 * WebSocket Module
 * 
 * Provides reliable WebSocket connections with automatic reconnection
 */

export {
  WebSocketManager,
  WebSocketManagerImpl,
  ReconnectionConfig,
  ConnectionState,
  createWebSocketManager,
} from '../api/websocket/manager';
