/**
 * WebSocket API Types
 * 
 * TypeScript definitions for the WebSocket API server
 */


// ============================================================================
// Core WebSocket Types
// ============================================================================

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  CLOSING = 'closing'
}

export enum WebSocketErrorCode {
  // Standard WebSocket close codes
  NORMAL_CLOSURE = 1000,
  GOING_AWAY = 1001,
  PROTOCOL_ERROR = 1002,
  UNSUPPORTED_DATA = 1003,
  RESERVED = 1004,
  NO_STATUS_RECEIVED = 1005,
  ABNORMAL_CLOSURE = 1006,
  INVALID_FRAME_PAYLOAD_DATA = 1007,
  POLICY_VIOLATION = 1008,
  MESSAGE_TOO_BIG = 1009,
  MANDATORY_EXTENSION = 1010,
  INTERNAL_SERVER_ERROR = 1011,
  SERVICE_RESTART = 1012,
  TRY_AGAIN_LATER = 1013,
  BAD_GATEWAY = 1014,
  TLS_HANDSHAKE = 1015,

  // Custom error codes
  AUTHENTICATION_FAILED = 4000,
  AUTHORIZATION_FAILED = 4001,
  RATE_LIMIT_EXCEEDED = 4002,
  INVALID_MESSAGE = 4003,
  SUBSCRIPTION_FAILED = 4004,
  CONNECTION_TIMEOUT = 4005
}

// ============================================================================
// Base Types and Interfaces
// ============================================================================

/**
 * Generic client representation for WebSocket connections.
 * Extend this interface with your specific client implementation.
 */
export interface WebSocketClient {
  readonly id: string;
  readonly userId?: string;
  readonly sessionId: string;
  readonly authenticated: boolean;
  readonly subscriptions: ReadonlySet<string>;
  readonly connectionTime: number;
  readonly lastActivity: number;
}

/**
 * Generic filter configuration for subscriptions.
 */
export type FilterConfig = Readonly<Record<string, string | number | boolean | null>>;

/**
 * Message data can be a record of unknown values or primitives.
 */
export type MessageData = Readonly<Record<string, unknown>> | string | number | boolean | null;

// ============================================================================
// Message Types
// ============================================================================

export interface WebSocketMessage {
  type: string;
  topic?: string;
  data?: MessageData;
  timestamp?: number;
  messageId?: string;
}

export interface WebSocketError {
  code: WebSocketErrorCode;
  message: string;
  details?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}

// Authentication Messages
export interface AuthMessage extends WebSocketMessage {
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

// Subscription Messages
export interface SubscribeMessage extends WebSocketMessage {
  type: 'subscribe';
  data: {
    topics: string[];
    filters?: FilterConfig;
  };
}

export interface UnsubscribeMessage extends WebSocketMessage {
  type: 'unsubscribe';
  data: {
    topics: string[];
  };
}

// Heartbeat Messages
export interface HeartbeatMessage extends WebSocketMessage {
  type: 'ping' | 'pong';
  data?: {
    sequence?: number;
    timestamp: number;
  };
}

// System Messages
export interface SystemMessage extends WebSocketMessage {
  type: 'system' | 'server' | 'announcement';
  data: {
    level: 'info' | 'warning' | 'error';
    message: string;
    details?: Readonly<Record<string, unknown>>;
  };
}

// Connection Messages
export interface ConnectionMessage extends WebSocketMessage {
  type: 'connected' | 'disconnected' | 'reconnecting';
  data: {
    connectionId: string;
    sessionId: string;
    serverTime: string;
    reason?: string;
  };
}

// Error Messages
export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  data: WebSocketError;
}

// ============================================================================
// Topic-based Messages
// ============================================================================

/**
 * Supported bill update types for real-time notifications.
 */
export type BillUpdateType = 'status_change' | 'engagement_change' | 'amendment' | 'voting_scheduled';

/**
 * Generic value type for bill updates - can be primitive or structured data.
 */
export type BillUpdateValue = string | number | boolean | Readonly<Record<string, unknown>>;

// Bill-related messages
export interface BillUpdateMessage extends WebSocketMessage {
  type: 'bill_update' | 'bill_status_change' | 'bill_engagement';
  topic?: `bill:${number}`;
  data: {
    billId: number;
    updateType: BillUpdateType;
    previousValue?: BillUpdateValue;
    newValue: BillUpdateValue;
    metadata?: Readonly<Record<string, unknown>>;
  };
}

/**
 * Community action types for discussion updates.
 */
export type CommunityAction = 'created' | 'updated' | 'deleted' | 'typing_start' | 'typing_stop';

/**
 * Community content can be text, structured comment data, or other formats.
 */
export type CommunityContent = string | Readonly<{
  text: string;
  mentions?: string[];
  attachments?: ReadonlyArray<{ type: string; url: string }>;
}>;

// Community-related messages
export interface CommunityUpdateMessage extends WebSocketMessage {
  type: 'community_update' | 'comment' | 'vote' | 'typing';
  topic?: `discussion:${number}` | `community:${string}`;
  data: {
    discussionId: string;
    userId?: string;
    action: CommunityAction;
    content?: CommunityContent;
    timestamp: string;
  };
}

// Notification messages
export interface NotificationMessage extends WebSocketMessage {
  type: 'notification' | 'alert';
  data: {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Readonly<Record<string, unknown>>;
    actions?: ReadonlyArray<{
      readonly label: string;
      readonly action: string;
      readonly data?: unknown;
    }>;
    expiresAt?: string;
  };
}

// ============================================================================
// Notification and Subscription Types
// ============================================================================

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface WebSocketNotification {
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}

export interface WebSocketSubscription {
  readonly type: 'bill' | 'community' | 'user_notifications';
  readonly id: string | number;
}

// ============================================================================
// Real-time Handler Types
// ============================================================================

export interface RealTimeHandlers {
  onBillUpdate?: (update: BillUpdate) => void;
  onCommunityUpdate?: (update: CommunityUpdateMessage['data']) => void;
  onEngagementUpdate?: (metrics: Readonly<Record<string, number>>) => void;
  onNotification?: (notification: WebSocketNotification) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// WebSocket Configuration Types
// ============================================================================

export interface ReconnectConfig {
  readonly enabled: boolean;
  readonly maxAttempts: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
}

export interface HeartbeatConfig {
  readonly enabled: boolean;
  readonly interval: number;
  readonly timeout: number;
  readonly message?: string;
}

export interface MessageConfig {
  readonly compression: boolean;
  readonly batching: boolean;
  readonly batchSize: number;
  readonly batchInterval: number;
  readonly maxMessageSize?: number;
}

export interface WebSocketAuthConfig {
  readonly type: 'token' | 'session';
  readonly tokenProvider?: () => Promise<string>;
}

export interface WebSocketConfig {
  readonly url: string;
  readonly protocols?: ReadonlyArray<string>;
  readonly reconnect: ReconnectConfig;
  readonly heartbeat: HeartbeatConfig;
  readonly message: MessageConfig;
  readonly authentication?: WebSocketAuthConfig;
}

export interface Subscription {
  readonly id: string;
  readonly topic: string;
  readonly filters?: FilterConfig;
  readonly callback: (message: unknown) => void;
  readonly priority: SubscriptionPriority;
}

export type SubscriptionPriority = 'low' | 'medium' | 'high';

// ============================================================================
// WebSocket Events
// ============================================================================

/**
 * Type-safe event map for WebSocket events.
 */
export interface WebSocketEvents {
  connected: { timestamp: string; connectionId: string };
  disconnected: { code: number; reason: string; wasClean: boolean };
  error: { error: Error; context?: string };
  message: { data: unknown; type: string };
  billUpdate: BillUpdate;
  notification: WebSocketNotification;
  batchedUpdates: { updates: ReadonlyArray<unknown> };
  subscribed: { topic: string; subscriptionId: string };
  unsubscribed: { topic: string; subscriptionId: string };
  reconnecting: { attempt: number; maxAttempts: number };
  heartbeat: { sent: boolean; acknowledged: boolean };
}

// ============================================================================
// Client Information
// ============================================================================

export interface ClientInfo {
  userId?: string;
  sessionId: string;
  connectionId: string;
  platform?: string;
  version?: string;
  capabilities: string[];
  subscriptions: string[];
  connectionTime: number;
  lastActivity: number;
  ip?: string;
  userAgent?: string;
}

// ============================================================================
// Server Configuration
// ============================================================================

export interface WebSocketServerConfig {
  path: string;
  maxConnections: number;
  maxConnectionsPerUser: number;
  maxSubscriptionsPerConnection: number;
  maxMessageSize: number; // in bytes
  heartbeatInterval: number; // in milliseconds
  connectionTimeout: number; // in milliseconds
  cleanupInterval: number; // in milliseconds
  maxAge: number; // in milliseconds
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// ============================================================================
// Statistics and Metrics
// ============================================================================

export interface WebSocketStats {
  totalConnections: number;
  authenticatedConnections: number;
  totalSubscriptions: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
}

export interface ConnectionMetrics {
  connectionId: string;
  userId?: string;
  sessionId: string;
  subscriptions: number;
  messagesReceived: number;
  messagesSent: number;
  connectionTime: number;
  lastActivity: number;
  ip?: string;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface WebSocketRequest {
  type: string;
  data?: MessageData;
  requestId?: string;
  timestamp: number;
}

export interface WebSocketResponse {
  type: string;
  data?: MessageData;
  requestId?: string;
  timestamp: number;
  success: boolean;
  error?: WebSocketError;
}

// ============================================================================
// Handler Function Types
// ============================================================================

/**
 * Handler function for processing incoming WebSocket messages.
 * 
 * @param client - The WebSocket client sending the message
 * @param message - The typed message being processed
 */
export type MessageHandler<T extends WebSocketMessage = WebSocketMessage> = 
  (client: WebSocketClient, message: T) => void | Promise<void>;

/**
 * Handler function called when a new WebSocket connection is established.
 * 
 * @param client - The newly connected WebSocket client
 * @param request - The HTTP upgrade request object
 */
export type ConnectionHandler = 
  (client: WebSocketClient, request: Request) => void | Promise<void>;

/**
 * Handler function for WebSocket errors.
 * 
 * @param error - The error that occurred
 * @param client - The client associated with the error (if applicable)
 */
export type ErrorHandler = 
  (error: Error, client?: WebSocketClient) => void | Promise<void>;

/**
 * Filter function to determine if a message should be delivered to a client.
 * 
 * @param message - The message being evaluated
 * @param client - The client to potentially receive the message
 * @returns true if the message should be delivered, false otherwise
 */
export type FilterFunction = 
  (message: WebSocketMessage, client: WebSocketClient) => boolean;

// ============================================================================
// Export Union Types for Convenience
// ============================================================================

export type AnyWebSocketMessage = 
  | WebSocketMessage
  | AuthMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | HeartbeatMessage
  | SystemMessage
  | ConnectionMessage
  | ErrorMessage
  | BillUpdateMessage
  | CommunityUpdateMessage
  | NotificationMessage;

export type ClientToServerMessage = 
  | AuthMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | HeartbeatMessage;

export type ServerToClientMessage = 
  | SystemMessage
  | ConnectionMessage
  | ErrorMessage
  | BillUpdateMessage
  | CommunityUpdateMessage
  | NotificationMessage;