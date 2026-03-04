/**
 * WebSocket Manager Export
 * 
 * Re-exports the WebSocketManager from the infrastructure/api layer.
 * This provides backward compatibility while maintaining a single source of truth
 * in the infrastructure layer.
 */

export { WebSocketManager } from '@client/infrastructure/api';
