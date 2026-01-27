/**
 * WebSocket Types - Main Export
 *
 * Centralized export of all WebSocket-related types, messages, and errors.
 * This module provides a single entry point for importing WebSocket types.
 *
 * @module websocket-types
 * @version 1.0.0
 */

// Export branded types
export type {
  ConnectionId,
  SubscriptionId,
  MessageId,
} from './messages';

// Export branded type creators
export {
  createConnectionId,
  createSubscriptionId,
  createMessageId,
} from './messages';

// Export branded type guards
export {
  isConnectionId,
  isSubscriptionId,
  isMessageId,
} from './messages';

// Export message interfaces
export type {
  WebSocketMessageBase,
  AuthMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  HeartbeatPingMessage,
  AcknowledgmentMessage,
  ClientToServerMessage,
  HeartbeatPongMessage,
  ConnectionEstablishedMessage,
  ConnectionStateMessage,
  BillUpdateMessage,
  CommunityUpdateMessage,
  NotificationMessage,
  SystemMessage,
  ServerToClientMessage,
  AnyWebSocketMessage,
  // Connection types (shared with server)
  ConnectionQuality,
  WebSocketMessage,
} from './messages';

// Export connection state enum
export { ConnectionState } from './messages';

// Export message type guards
export {
  isWebSocketMessageBase,
  isClientToServerMessage,
  isServerToClientMessage,
  isAuthMessage,
  isSubscribeMessage,
  isUnsubscribeMessage,
  isHeartbeatPingMessage,
  isHeartbeatPongMessage,
  isConnectionEstablishedMessage,
  isConnectionStateMessage,
  isBillUpdateMessage,
  isCommunityUpdateMessage,
  isNotificationMessage,
  isSystemMessage,
  isAcknowledgmentMessage,
} from './messages';

// Export message validation utilities
export {
  hasRequiredData,
  validateWebSocketMessage,
  validateAuthMessage,
  validateSubscribeMessage,
  validateUnsubscribeMessage,
} from './messages';

// Export error classes
export {
  WebSocketError,
  WebSocketConnectionError,
  WebSocketAuthError,
  WebSocketMessageError,
  WebSocketSubscriptionError,
  WebSocketProtocolError,
  WebSocketTimeoutError,
  WebSocketRateLimitError,
  WebSocketServerError,
  WebSocketClientError,
} from './errors';

// Export error type guards
export {
  isWebSocketError,
  isWebSocketConnectionError,
  isWebSocketAuthError,
  isWebSocketMessageError,
  isWebSocketSubscriptionError,
  isWebSocketProtocolError,
  isWebSocketTimeoutError,
  isWebSocketRateLimitError,
  isWebSocketServerError,
  isWebSocketClientError,
} from './errors';

// Export error creation utilities
export {
  createConnectionError,
  createAuthError,
  createMessageError,
  createSubscriptionError,
  createProtocolError,
  createTimeoutError,
  createRateLimitError,
  createServerError,
  createClientError,
} from './errors';

// Export error handling utilities
export {
  extractWebSocketErrorInfo,
  websocketErrorToSafeObject,
} from './errors';

// ============================================================================
// Version Information
// ============================================================================

export const WEBSOCKET_TYPES_VERSION = '1.0.0';

export const WEBSOCKET_TYPES_CHANGELOG = {
  '1.0.0': 'Initial release with discriminated union pattern, branded types, and comprehensive error hierarchy',
} as const;