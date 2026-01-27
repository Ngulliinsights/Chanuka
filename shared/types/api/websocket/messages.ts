/**
 * WebSocket Message Types - Discriminated Union Pattern
 *
 * Standardized WebSocket message types following discriminated union pattern
 * for type-safe bidirectional communication between client and server.
 *
 * @module websocket-messages
 * @version 1.0.0
 */

// ============================================================================
// Branded Types for Connection and Subscription IDs
// ============================================================================

/**
 * Branded type for Connection IDs to prevent mixing with other ID types
 */
export type ConnectionId = string & { __brand: 'ConnectionId' };

/**
 * Branded type for Subscription IDs to prevent mixing with other ID types
 */
export type SubscriptionId = string & { __brand: 'SubscriptionId' };

/**
 * Branded type for Message IDs to prevent mixing with other ID types
 */
export type MessageId = string & { __brand: 'MessageId' };

/**
 * Create a branded ConnectionId from a string
 */
export function createConnectionId(id: string): ConnectionId {
  return id as ConnectionId;
}

/**
 * Create a branded SubscriptionId from a string
 */
export function createSubscriptionId(id: string): SubscriptionId {
  return id as SubscriptionId;
}

/**
 * Create a branded MessageId from a string
 */
export function createMessageId(id: string): MessageId {
  return id as MessageId;
}

/**
 * Type guard for ConnectionId
 */
export function isConnectionId(value: unknown): value is ConnectionId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for SubscriptionId
 */
export function isSubscriptionId(value: unknown): value is SubscriptionId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for MessageId
 */
export function isMessageId(value: unknown): value is MessageId {
  return typeof value === 'string' && value.length > 0;
}

// ============================================================================
// Connection State & Quality (shared with server)
// ============================================================================

/**
 * WebSocket connection lifecycle states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Connection quality assessment metrics
 */
export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'poor' | 'disconnected';
  /** Round-trip latency in milliseconds */
  latency: number;
  /** Packet loss percentage (0-100) */
  packetLoss?: number;
}

/**
 * Generic WebSocket message interface (for compatibility with server types)
 */
export interface WebSocketMessage<T = unknown> {
  /** Discriminator for message type routing and type narrowing */
  type: string;
  /** Message payload (optional for messages like ping/pong) */
  data?: T;
  /** Unique identifier for request/response correlation */
  messageId?: string;
  /** Unix timestamp (ms) when message was created */
  timestamp?: number;
}

// ============================================================================
// Base Message Interface
// ============================================================================

/**
 * Base interface for all WebSocket messages using discriminated union pattern
 * The 'type' field serves as the discriminant for proper type narrowing
 */
export interface WebSocketMessageBase {
  /**
   * Message type discriminant - determines the specific message type
   * This field is used for type narrowing in discriminated unions
   */
  type: string;

  /**
   * Unique message identifier for request/response correlation
   * Uses branded MessageId type for type safety
   */
  messageId?: MessageId;

  /**
   * Unix timestamp (ms) when message was created
   */
  timestamp?: number;

  /**
   * Connection ID associated with this message
   * Uses branded ConnectionId type for type safety
   */
  connectionId?: ConnectionId;
}

// ============================================================================
// Client-to-Server Messages (Discriminated Union)
// ============================================================================

/**
 * Authentication message - Client → Server
 */
export interface AuthMessage extends WebSocketMessageBase {
  type: 'auth' | 'authenticate';
  data: {
    token: string;
    clientInfo?: {
      platform?: string;
      version?: string;
      capabilities?: string[];
    };
  };
}

/**
 * Subscription request message - Client → Server
 */
export interface SubscribeMessage extends WebSocketMessageBase {
  type: 'subscribe';
  data: {
    /**
     * Subscription ID - uses branded type for type safety
     */
    subscriptionId: SubscriptionId;
    topics: string[];
    filters?: Record<string, unknown>;
    priority?: number;
  };
}

/**
 * Unsubscription request message - Client → Server
 */
export interface UnsubscribeMessage extends WebSocketMessageBase {
  type: 'unsubscribe';
  data: {
    /**
     * Subscription ID - uses branded type for type safety
     */
    subscriptionId: SubscriptionId;
    topics: string[];
  };
}

/**
 * Heartbeat ping message - Client → Server
 */
export interface HeartbeatPingMessage extends WebSocketMessageBase {
  type: 'ping';
  data: {
    sequence?: number;
    timestamp: number;
  };
}

/**
 * Client acknowledgment message - Client → Server
 */
export interface AcknowledgmentMessage extends WebSocketMessageBase {
  type: 'ack';
  data: {
    /**
     * Original message ID being acknowledged
     */
    originalMessageId: MessageId;
    success: boolean;
    timestamp: number;
  };
}

/**
 * Union type for all client-to-server messages
 * This discriminated union enables proper type narrowing based on the 'type' field
 */
export type ClientToServerMessage =
  | AuthMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | HeartbeatPingMessage
  | AcknowledgmentMessage;

// ============================================================================
// Server-to-Client Messages (Discriminated Union)
// ============================================================================

/**
 * Heartbeat pong message - Server → Client
 */
export interface HeartbeatPongMessage extends WebSocketMessageBase {
  type: 'pong';
  data: {
    sequence?: number;
    timestamp: number;
    /**
     * Round-trip latency calculation
     */
    latency?: number;
  };
}

/**
 * Connection established message - Server → Client
 */
export interface ConnectionEstablishedMessage extends WebSocketMessageBase {
  type: 'connected';
  data: {
    /**
     * Assigned connection ID - uses branded type for type safety
     */
    connectionId: ConnectionId;
    timestamp: number;
    protocolVersion: string;
    serverInfo?: {
      version?: string;
      capabilities?: string[];
    };
  };
}

/**
 * Connection state change message - Server → Client
 */
export interface ConnectionStateMessage extends WebSocketMessageBase {
  type: 'connection_state';
  data: {
    state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'reconnecting';
    timestamp: number;
    reason?: string;
    connectionQuality?: {
      level: 'excellent' | 'good' | 'poor' | 'disconnected';
      latency: number;
      packetLoss?: number;
    };
  };
}

/**
 * Bill update notification - Server → Client
 */
export interface BillUpdateMessage extends WebSocketMessageBase {
  type: 'bill_update';
  data: {
    billId: number;
    updateType: 'status_change' | 'engagement_change' | 'amendment' | 'voting_scheduled';
    previousValue?: unknown;
    newValue: unknown;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Community update notification - Server → Client
 */
export interface CommunityUpdateMessage extends WebSocketMessageBase {
  type: 'community_update';
  data: {
    discussionId: string;
    userId?: string;
    action: 'created' | 'updated' | 'deleted' | 'typing_start' | 'typing_stop';
    content?: string | Record<string, unknown>;
    timestamp: string;
  };
}

/**
 * User notification message - Server → Client
 */
export interface NotificationMessage extends WebSocketMessageBase {
  type: 'notification';
  data: {
    id: string;
    notificationType: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    priority: number;
    timestamp: string;
    read?: boolean;
    expiresAt?: string;
    data?: Record<string, unknown>;
  };
}

/**
 * System message - Server → Client
 */
export interface SystemMessage extends WebSocketMessageBase {
  type: 'system';
  data: {
    level: 'info' | 'warn' | 'error';
    message: string;
    maintenance?: boolean;
    affectedServices?: string[];
    timestamp: number;
  };
}

/**
 * Union type for all server-to-client messages
 * This discriminated union enables proper type narrowing based on the 'type' field
 */
export type ServerToClientMessage =
  | HeartbeatPongMessage
  | ConnectionEstablishedMessage
  | ConnectionStateMessage
  | BillUpdateMessage
  | CommunityUpdateMessage
  | NotificationMessage
  | SystemMessage;

/**
 * Union type for all WebSocket messages (bidirectional)
 */
export type AnyWebSocketMessage = ClientToServerMessage | ServerToClientMessage;

// ============================================================================
// Type Guards for Message Validation
// ============================================================================

/**
 * Type guard for WebSocketMessageBase
 */
export function isWebSocketMessageBase(value: unknown): value is WebSocketMessageBase {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as WebSocketMessageBase).type === 'string' &&
    (value as WebSocketMessageBase).type.length > 0
  );
}

/**
 * Type guard for client-to-server messages
 */
export function isClientToServerMessage(message: WebSocketMessageBase): message is ClientToServerMessage {
  const clientTypes: string[] = ['auth', 'authenticate', 'subscribe', 'unsubscribe', 'ping', 'ack'];
  return clientTypes.includes(message.type);
}

/**
 * Type guard for server-to-client messages
 */
export function isServerToClientMessage(message: WebSocketMessageBase): message is ServerToClientMessage {
  const serverTypes: string[] = [
    'pong', 'connected', 'connection_state',
    'bill_update', 'community_update', 'notification', 'system'
  ];
  return serverTypes.includes(message.type);
}

/**
 * Type guard for authentication messages
 */
export function isAuthMessage(message: WebSocketMessageBase): message is AuthMessage {
  return message.type === 'auth' || message.type === 'authenticate';
}

/**
 * Type guard for subscription messages
 */
export function isSubscribeMessage(message: WebSocketMessageBase): message is SubscribeMessage {
  return message.type === 'subscribe';
}

/**
 * Type guard for unsubscription messages
 */
export function isUnsubscribeMessage(message: WebSocketMessageBase): message is UnsubscribeMessage {
  return message.type === 'unsubscribe';
}

/**
 * Type guard for heartbeat ping messages
 */
export function isHeartbeatPingMessage(message: WebSocketMessageBase): message is HeartbeatPingMessage {
  return message.type === 'ping';
}

/**
 * Type guard for heartbeat pong messages
 */
export function isHeartbeatPongMessage(message: WebSocketMessageBase): message is HeartbeatPongMessage {
  return message.type === 'pong';
}

/**
 * Type guard for connection established messages
 */
export function isConnectionEstablishedMessage(message: WebSocketMessageBase): message is ConnectionEstablishedMessage {
  return message.type === 'connected';
}

/**
 * Type guard for connection state messages
 */
export function isConnectionStateMessage(message: WebSocketMessageBase): message is ConnectionStateMessage {
  return message.type === 'connection_state';
}

/**
 * Type guard for bill update messages
 */
export function isBillUpdateMessage(message: WebSocketMessageBase): message is BillUpdateMessage {
  return message.type === 'bill_update';
}

/**
 * Type guard for community update messages
 */
export function isCommunityUpdateMessage(message: WebSocketMessageBase): message is CommunityUpdateMessage {
  return message.type === 'community_update';
}

/**
 * Type guard for notification messages
 */
export function isNotificationMessage(message: WebSocketMessageBase): message is NotificationMessage {
  return message.type === 'notification';
}

/**
 * Type guard for system messages
 */
export function isSystemMessage(message: WebSocketMessageBase): message is SystemMessage {
  return message.type === 'system';
}

/**
 * Type guard for acknowledgment messages
 */
export function isAcknowledgmentMessage(message: WebSocketMessageBase): message is AcknowledgmentMessage {
  return message.type === 'ack';
}

// ============================================================================
// Message Validation Utilities
// ============================================================================

/**
 * Validate that a message has the required data payload
 */
export function hasRequiredData(
  message: WebSocketMessageBase,
  dataValidator?: (data: unknown) => boolean
): boolean {
  return (
    (message as { data?: unknown }).data !== undefined &&
    (dataValidator ? dataValidator((message as { data?: unknown }).data) : true)
  );
}

/**
 * Validate message structure and data
 */
export function validateWebSocketMessage(
  message: unknown,
  options?: {
    requireMessageId?: boolean;
    requireConnectionId?: boolean;
    requireTimestamp?: boolean;
  }
): message is WebSocketMessageBase {
  if (!isWebSocketMessageBase(message)) {
    return false;
  }

  if (options?.requireMessageId && !isMessageId(message.messageId)) {
    return false;
  }

  if (options?.requireConnectionId && !isConnectionId(message.connectionId)) {
    return false;
  }

  if (options?.requireTimestamp && typeof message.timestamp !== 'number') {
    return false;
  }

  return true;
}

/**
 * Validate authentication message structure
 */
export function validateAuthMessage(message: unknown): message is AuthMessage {
  if (!isWebSocketMessageBase(message)) {
    return false;
  }

  return (
    isAuthMessage(message) &&
    hasRequiredData(message, (data) => {
      return (
        typeof data === 'object' &&
        data !== null &&
        typeof (data as { token: string }).token === 'string' &&
        (data as { token: string }).token.length > 0
      );
    })
  );
}

/**
 * Validate subscription message structure
 */
export function validateSubscribeMessage(message: unknown): message is SubscribeMessage {
  if (!isWebSocketMessageBase(message)) {
    return false;
  }

  return (
    isSubscribeMessage(message) &&
    hasRequiredData(message, (data) => {
      return (
        typeof data === 'object' &&
        data !== null &&
        Array.isArray((data as { topics: string[] }).topics) &&
        isSubscriptionId((data as { subscriptionId: SubscriptionId }).subscriptionId)
      );
    })
  );
}

/**
 * Validate unsubscription message structure
 */
export function validateUnsubscribeMessage(message: unknown): message is UnsubscribeMessage {
  if (!isWebSocketMessageBase(message)) {
    return false;
  }

  return (
    isUnsubscribeMessage(message) &&
    hasRequiredData(message, (data) => {
      return (
        typeof data === 'object' &&
        data !== null &&
        Array.isArray((data as { topics: string[] }).topics) &&
        isSubscriptionId((data as { subscriptionId: SubscriptionId }).subscriptionId)
      );
    })
  );
}