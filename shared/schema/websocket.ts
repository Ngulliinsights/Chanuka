/**
 * Unified WebSocket Type System
 * 
 * Single source of truth for WebSocket communication between client and server.
 * Provides type-safe message definitions, configuration, and runtime validation.
 * 
 * @module websocket-types
 * @version 2.0.0
 */

// ============================================================================
// Core Enums
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
 * Standard WebSocket close codes (RFC 6455)
 */
export enum WebSocketErrorCode {
  CLOSE_NORMAL = 1000,
  CLOSE_GOING_AWAY = 1001,
  CLOSE_PROTOCOL_ERROR = 1002,
  CLOSE_UNSUPPORTED = 1003,
  CLOSE_ABNORMAL = 1006,
  CLOSE_POLICY_VIOLATION = 1008,
  CLOSE_TOO_LARGE = 1009,
  CLOSE_INTERNAL_ERROR = 1011,
}

/**
 * Priority levels for message and subscription handling
 */
export enum Priority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

// ============================================================================
// Base Message Types
// ============================================================================

/**
 * Base interface for all WebSocket messages.
 * Provides consistent structure for bidirectional communication.
 * 
 * @template T - Type of the message payload data
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

/**
 * Message with required data payload
 */
export interface WebSocketMessageWithData<T> extends WebSocketMessage<T> {
  data: T;
}

// ============================================================================
// Connection State & Quality
// ============================================================================

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
 * Aggregated connection statistics
 */
export interface ConnectionMetrics {
  /** Unix timestamp when connection was established */
  connectedAt: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  /** Current round-trip latency in ms */
  latency: number;
  /** Number of reconnection attempts */
  reconnectCount?: number;
}

/**
 * Extended error interface for WebSocket failures
 */
export interface WebSocketError extends Error {
  code: WebSocketErrorCode | number;
  /** Whether connection was closed cleanly */
  wasClean: boolean;
  /** Human-readable close reason */
  reason?: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Additional context for debugging */
  details?: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Exponential backoff configuration for reconnection
 */
export interface ReconnectConfig {
  /** Maximum reconnection attempts before giving up */
  maxRetries: number;
  /** Initial delay in milliseconds */
  baseDelay: number;
  /** Maximum delay cap in milliseconds */
  maxDelay: number;
  /** Backoff multiplier (default: 2) */
  multiplier?: number;
}

/**
 * Heartbeat/keepalive configuration
 */
export interface HeartbeatConfig {
  /** Interval between ping messages in milliseconds */
  interval: number;
  /** Timeout waiting for pong response in milliseconds */
  timeout: number;
  /** Include sequence number in heartbeat */
  includeSequence?: boolean;
}

/**
 * Message queue and size constraints
 */
export interface MessageConfig {
  /** Maximum queued messages before dropping */
  maxQueueSize: number;
  /** Maximum message size in bytes */
  maxMessageSize: number;
  /** Enable message compression */
  compression?: boolean;
}

/**
 * Authentication configuration
 */
export interface WebSocketAuthConfig {
  /** Function to retrieve auth token (sync or async) */
  tokenSource: () => string | Promise<string>;
  /** Custom header name (default: "Authorization") */
  header?: string;
  /** Token refresh interval in milliseconds */
  refreshInterval?: number;
}

/**
 * Comprehensive WebSocket client configuration
 */
export interface WebSocketConfig {
  /** WebSocket server URL (ws:// or wss://) */
  url: string;
  /** Auto-connect on instantiation */
  autoConnect?: boolean;
  /** Reconnection strategy */
  reconnect?: ReconnectConfig;
  /** Heartbeat configuration */
  heartbeat?: HeartbeatConfig;
  /** Message handling options */
  message?: MessageConfig;
  /** Authentication configuration */
  auth?: WebSocketAuthConfig;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom protocols */
  protocols?: string | string[];
}

/**
 * WebSocket server configuration
 */
export interface WebSocketServerConfig {
  /** Server port (default: 8080) */
  port?: number;
  /** Server path (default: "/") */
  path?: string;
  /** Enable per-message deflate compression */
  perMessageDeflate?: boolean;
  /** Maximum payload size in bytes */
  maxPayload?: number;
  /** Client tracking enabled */
  clientTracking?: boolean;
}

// ============================================================================
// Domain-Specific Data Types
// ============================================================================

/**
 * Legislative bill update event
 */
export interface BillUpdate {
  billId: number;
  updateType: 'status_change' | 'engagement_change' | 'amendment' | 'voting_scheduled';
  previousValue?: unknown;
  newValue: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * User notification data
 */
export interface NotificationData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  priority: Priority;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Read status */
  read?: boolean;
  /** ISO 8601 expiration timestamp */
  expiresAt?: string;
  /** Additional context data */
  data?: Record<string, unknown>;
}

/**
 * Community discussion update event
 */
export interface CommunityUpdate {
  discussionId: string;
  userId?: string;
  action: 'created' | 'updated' | 'deleted' | 'typing_start' | 'typing_stop';
  content?: string | Record<string, unknown>;
  /** ISO 8601 timestamp */
  timestamp: string;
}

// ============================================================================
// Client → Server Messages
// ============================================================================

/**
 * Authentication message with client metadata
 */
export interface AuthMessage extends WebSocketMessageWithData<{
  token: string;
  clientInfo?: {
    platform?: string;
    version?: string;
    capabilities?: string[];
  };
}> {
  type: 'auth' | 'authenticate';
}

/**
 * Topic subscription request
 */
export interface SubscribeMessage extends WebSocketMessageWithData<{
  topics: string[];
  filters?: Record<string, unknown>;
  priority?: Priority;
}> {
  type: 'subscribe';
}

/**
 * Topic unsubscription request
 */
export interface UnsubscribeMessage extends WebSocketMessageWithData<{
  topics: string[];
}> {
  type: 'unsubscribe';
}

/**
 * Heartbeat ping/pong messages
 */
export interface HeartbeatMessage extends WebSocketMessage<{
  sequence?: number;
  timestamp: number;
}> {
  type: 'ping' | 'pong';
}

// ============================================================================
// Server → Client Messages
// ============================================================================

/**
 * Bill update notification
 */
export interface BillUpdateMessage extends WebSocketMessageWithData<BillUpdate> {
  type: 'bill_update' | 'bill_status_change' | 'bill_engagement';
}

/**
 * Community activity notification
 */
export interface CommunityUpdateMessage extends WebSocketMessageWithData<CommunityUpdate> {
  type: 'community_update' | 'comment' | 'vote' | 'typing';
}

/**
 * User notification
 */
export interface NotificationMessage extends WebSocketMessageWithData<NotificationData> {
  type: 'notification' | 'alert';
}

/**
 * Error response message
 */
export interface ErrorMessage extends WebSocketMessageWithData<{
  code: number;
  message: string;
  details?: Record<string, unknown>;
  recoverable?: boolean;
}> {
  type: 'error';
}

/**
 * Connection state change notification
 */
export interface ConnectionMessage extends WebSocketMessage<{
  clientId?: string;
  timestamp: number;
  reason?: string;
  quality?: ConnectionQuality;
}> {
  type: 'connected' | 'disconnected' | 'reconnecting';
}

/**
 * System-level announcement
 */
export interface SystemMessage extends WebSocketMessageWithData<{
  level: 'info' | 'warn' | 'error';
  message: string;
  maintenance?: boolean;
  affectedServices?: string[];
}> {
  type: 'system';
}

// ============================================================================
// Message Union Types
// ============================================================================

/**
 * All messages that clients can send to server
 */
export type ClientToServerMessage =
  | AuthMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | HeartbeatMessage;

/**
 * All messages that server can send to clients
 */
export type ServerToClientMessage =
  | BillUpdateMessage
  | CommunityUpdateMessage
  | NotificationMessage
  | ErrorMessage
  | ConnectionMessage
  | SystemMessage
  | HeartbeatMessage;

/**
 * Union of all possible WebSocket messages
 */
export type AnyWebSocketMessage = ClientToServerMessage | ServerToClientMessage;

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Active subscription record
 */
export interface Subscription {
  id: string;
  topic: string;
  priority?: Priority;
  filters?: Record<string, unknown>;
  /** Unix timestamp when subscription was created */
  createdAt: number;
}

/**
 * Client-side subscription with callback
 */
export interface SubscriptionHandler {
  topic: string;
  callback: (data: unknown) => void;
  id: string;
  priority?: Priority;
  /** Unix timestamp of last message received */
  lastMessageAt?: number;
}

// ============================================================================
// Statistics & Monitoring
// ============================================================================

/**
 * Detailed WebSocket connection statistics
 */
export interface WebSocketStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  /** Unix timestamp when connected */
  connectedAt?: number;
  /** Unix timestamp of last activity */
  lastActivity: number;
  reconnectCount: number;
  connectionQuality: ConnectionQuality['level'];
  /** Average latency over last N messages */
  averageLatency?: number;
  /** Message rate (messages/second) */
  messageRate?: number;
}

/**
 * Connected client information (server-side)
 */
export interface ClientInfo {
  id: string;
  userAgent: string;
  ip?: string;
  /** Unix timestamp when connected */
  connectedAt: number;
  subscriptions: string[];
  connectionQuality: ConnectionQuality['level'];
  /** Client platform and version */
  clientInfo?: {
    platform?: string;
    version?: string;
  };
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Generic message handler function
 */
export type MessageHandler<T = unknown> = (data: T, message: WebSocketMessage<T>) => void | Promise<void>;

/**
 * Connection state change handler
 */
export type ConnectionHandler = (state: ConnectionState, metrics?: ConnectionMetrics) => void;

/**
 * Error handler function
 */
export type ErrorHandler = (error: WebSocketError) => void;

/**
 * Message filter predicate
 */
export type FilterFunction = (message: WebSocketMessage) => boolean;

/**
 * Topic-based message handlers registry
 */
export interface MessageHandlerRegistry {
  [topic: string]: MessageHandler[];
}

/**
 * WebSocket lifecycle event handlers
 */
export interface WebSocketEventHandlers {
  onConnect?: (metrics: ConnectionMetrics) => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: WebSocketError) => void;
  onMessage?: (message: AnyWebSocketMessage) => void;
  onReconnecting?: (attempt: number, maxRetries: number) => void;
  onQualityChange?: (quality: ConnectionQuality) => void;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for client-to-server messages
 */
export function isClientToServerMessage(message: WebSocketMessage): message is ClientToServerMessage {
  return ['auth', 'authenticate', 'subscribe', 'unsubscribe', 'ping'].includes(message.type);
}

/**
 * Type guard for server-to-client messages
 */
export function isServerToClientMessage(message: WebSocketMessage): message is ServerToClientMessage {
  const serverTypes = [
    'bill_update', 'bill_status_change', 'bill_engagement',
    'community_update', 'comment', 'vote', 'typing',
    'notification', 'alert', 'error',
    'connected', 'disconnected', 'reconnecting',
    'system', 'pong'
  ];
  return serverTypes.includes(message.type);
}

/**
 * Type guard for heartbeat messages
 */
export function isHeartbeatMessage(message: WebSocketMessage): message is HeartbeatMessage {
  return message.type === 'ping' || message.type === 'pong';
}

/**
 * Type guard for error messages
 */
export function isErrorMessage(message: WebSocketMessage): message is ErrorMessage {
  return message.type === 'error';
}

/**
 * Type guard for notification messages
 */
export function isNotificationMessage(message: WebSocketMessage): message is NotificationMessage {
  return message.type === 'notification' || message.type === 'alert';
}

/**
 * Validate basic WebSocket message structure
 */
export function isValidWebSocketMessage(value: unknown): value is WebSocketMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const msg = value as WebSocketMessage;
  return typeof msg.type === 'string' && msg.type.length > 0;
}

/**
 * Validate message has required data payload
 */
export function hasMessageData<T>(message: WebSocketMessage<T>): message is WebSocketMessageWithData<T> {
  return message.data !== undefined;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract message data type from a message type
 */
export type ExtractMessageData<T extends WebSocketMessage> = 
  T extends WebSocketMessage<infer D> ? D : never;

/**
 * Create a handler type for a specific message type
 */
export type HandlerForMessage<T extends WebSocketMessage> = 
  MessageHandler<ExtractMessageData<T>>;

/**
 * Make all config properties partial (for updates)
 */
export type PartialConfig<T> = {
  [P in keyof T]?: T[P] extends object ? PartialConfig<T[P]> : T[P];
};

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  reconnect: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    multiplier: 2
  } as ReconnectConfig,
  
  heartbeat: {
    interval: 30000,
    timeout: 5000,
    includeSequence: false
  } as HeartbeatConfig,
  
  message: {
    maxQueueSize: 100,
    maxMessageSize: 1024 * 1024, // 1MB
    compression: false
  } as MessageConfig,
  
  server: {
    port: 8080,
    path: '/',
    perMessageDeflate: true,
    maxPayload: 10 * 1024 * 1024, // 10MB
    clientTracking: true
  } as WebSocketServerConfig
} as const;