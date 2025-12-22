/**
 * WebSocket Adapters Module Exports
 * 
 * Provides adapter pattern for different WebSocket transport implementations
 */

export { WebSocketAdapter } from './websocket-adapter';
export { NativeWebSocketAdapter } from './native-websocket-adapter';
export { SocketIOAdapter } from './socketio-adapter';
export { RedisAdapter } from './redis-adapter';
export type { 
  WebSocketMessage, 
  ServiceStats, 
  HealthStatus 
} from './websocket-adapter';