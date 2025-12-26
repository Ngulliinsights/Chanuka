// ============================================================================
// Enums & Constants
// ============================================================================

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

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

export enum SubscriptionPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// ============================================================================
// Core Interfaces
// ============================================================================

export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
  packetLoss?: number;
}

export interface ConnectionMetrics {
  connectedAt: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  latency: number;
}

export interface WebSocketError extends Error {
  code: WebSocketErrorCode | number;
  wasClean: boolean;
  reason?: string;
  timestamp: string;
  details?: unknown;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ReconnectConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export interface HeartbeatConfig {
  interval: number;
  timeout: number;
}

export interface MessageConfig {
  maxQueueSize: number;
  maxMessageSize: number;
}

export interface WebSocketAuthConfig {
  tokenSource: () => string | Promise<string>;
  header?: string;
}

export interface WebSocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnect?: ReconnectConfig;
  heartbeat?: HeartbeatConfig;
  auth?: WebSocketAuthConfig;
  debug?: boolean;
}

export interface WebSocketServerConfig {
  port?: number;
  path?: string;
  perMessageDeflate?: boolean;
}

// ============================================================================
// Message Envelopes
// ============================================================================

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  id?: string;
  timestamp?: number;
}

export interface ClientWebSocketMessage<T = unknown> {
  type: string;
  data: T;
  messageId: string;
  timestamp: number;
}

// ============================================================================
// Specific Payloads (Client -> Server)
// ============================================================================

export interface AuthMessage {
  token: string;
}

export interface SubscribeMessage {
  topics: string[];
}

export interface UnsubscribeMessage {
  topics: string[];
}

export interface HeartbeatMessage {
  type: 'ping' | 'pong';
  timestamp: number;
}

export interface WebSocketRequest<T = unknown> {
  id: string;
  method: string;
  params?: T;
}

export type ClientToServerMessage = 
  | AuthMessage 
  | SubscribeMessage 
  | UnsubscribeMessage 
  | HeartbeatMessage 
  | WebSocketRequest;

// ============================================================================
// Specific Payloads (Server -> Client)
// ============================================================================

export interface SystemMessage {
  type: 'system';
  level: 'info' | 'warn' | 'error';
  message: string;
  maintenance?: boolean;
}

export interface ConnectionMessage {
  type: 'connected' | 'disconnected' | 'reconnecting';
  clientId?: string;
  timestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  details?: unknown;
}

export interface WebSocketResponse<T = unknown> {
  id: string;
  result?: T;
  error?: { code: number; message: string };
}

// Feature Updates
export interface BillUpdateMessage {
  billId: number;
  type: 'status_change' | 'amendment' | 'vote_scheduled' | 'new_comment';
  previousValue?: unknown;
  newValue: unknown;
  metadata?: Record<string, unknown>;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CommunityUpdateMessage {
  type: 'comment' | 'vote' | 'share';
  entityId: string;
  entityType: 'bill' | 'comment';
  data: unknown;
}

export type ServerToClientMessage =
  | SystemMessage
  | ConnectionMessage
  | ErrorMessage
  | WebSocketResponse
  | BillUpdateMessage
  | CommunityUpdateMessage
  | NotificationMessage;

export type AnyWebSocketMessage = ClientToServerMessage | ServerToClientMessage;

// ============================================================================
// State & Tracking
// ============================================================================

export interface ClientInfo {
  id: string;
  userAgent: string;
  ip?: string;
  connectedAt: number;
  subscriptions: string[];
}

export interface WebSocketStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  connectedAt?: number;
  lastActivity: number;
  reconnectCount: number;
}

export interface Subscription {
  id: string;
  topic: string;
  priority?: SubscriptionPriority;
  filters?: Record<string, unknown>;
}

export interface WebSocketSubscription {
  topic: string;
  callback: MessageHandler;
  id: string;
}

export interface WebSocketNotification {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  read: boolean;
}

// ============================================================================
// Handlers & Functional Types
// ============================================================================

export type MessageHandler<T = unknown> = (data: T) => void;
export type ConnectionHandler = (state: ConnectionState) => void;
export type ErrorHandler = (error: WebSocketError) => void;
export type FilterFunction = (message: WebSocketMessage) => boolean;

export interface RealTimeHandlers {
  [topic: string]: MessageHandler[];
}

export interface WebSocketEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: WebSocketError) => void;
  onMessage?: (message: AnyWebSocketMessage) => void;
}