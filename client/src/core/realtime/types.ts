/**
 * Real-time Types
 * 
 * Consolidated type definitions for all real-time functionality
 */

// ============================================================================
// Core WebSocket Types
// ============================================================================

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  heartbeat: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  reconnect: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
  message: {
    compression: boolean;
    batching: boolean;
    batchSize: number;
    batchInterval: number;
  };
  security: {
    validateOrigin: boolean;
    allowedOrigins: string[];
  };
}

export interface Subscription {
  id: string;
  topic: string;
  filters?: Record<string, unknown>;
  callback: MessageHandler;
  priority?: 'high' | 'medium' | 'low';
}

export type MessageHandler = (message: WebSocketMessage) => void;
export type EventListener<T = unknown> = (data: T) => void;
export type ErrorHandler = (error: Error, context?: Record<string, unknown>) => void;

// ============================================================================
// Message Types
// ============================================================================

export interface WebSocketMessage {
  type: string;
  topic?: string;
  data?: unknown;
  timestamp?: number;
  [key: string]: unknown;
}

export interface HeartbeatMessage extends WebSocketMessage {
  type: 'heartbeat' | 'ping' | 'pong';
}

export interface SubscriptionMessage extends WebSocketMessage {
  type: 'subscribe' | 'unsubscribe';
  topic: string;
  filters?: Record<string, unknown>;
  subscriptionId: string;
}

export interface BatchMessage extends WebSocketMessage {
  type: 'batch';
  messages: WebSocketMessage[];
  timestamp: number;
}

// ============================================================================
// Bill Real-time Types
// ============================================================================

export interface BillUpdate {
  type: string;
  data: {
    billId: number;
    [key: string]: unknown;
  };
  timestamp: string;
}

export interface BillStatusUpdate {
  bill_id: number;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface BillEngagementUpdate {
  bill_id: number;
  viewCount?: number;
  saveCount?: number;
  commentCount?: number;
  shareCount?: number;
  timestamp: string;
}

export interface BillAmendmentUpdate {
  bill_id: number;
  amendment_id: string;
  type: 'added' | 'modified' | 'removed';
  title: string;
  summary: string;
  timestamp: string;
}

export interface BillVotingUpdate {
  bill_id: number;
  voting_date: string;
  voting_type: 'committee' | 'floor' | 'final';
  chamber: 'house' | 'senate' | 'both';
  timestamp: string;
}

export type BillRealTimeUpdate =
  | BillStatusUpdate
  | BillEngagementUpdate
  | BillAmendmentUpdate
  | BillVotingUpdate;

// ============================================================================
// Community Real-time Types
// ============================================================================

export interface CommunityUpdate {
  type: string;
  discussionId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface TypingIndicator {
  userId: string;
  billId: number;
  parentId?: string;
  isTyping: boolean;
  timestamp: string;
}

export interface CommentUpdate {
  commentId: string;
  billId: number;
  parentId?: string;
  action: 'created' | 'updated' | 'deleted';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface VoteUpdate {
  billId: number;
  userId: string;
  voteType: 'support' | 'oppose' | 'neutral';
  timestamp: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface WebSocketNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  data?: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

// ============================================================================
// Real-time Handlers
// ============================================================================

export interface RealTimeHandlers {
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
  onBillUpdate?: (update: BillUpdate) => void;
  onCommunityUpdate?: (update: CommunityUpdate) => void;
  onNotification?: (notification: WebSocketNotification) => void;
  onTypingIndicator?: (indicator: TypingIndicator) => void;
  onCommentUpdate?: (update: CommentUpdate) => void;
  onVoteUpdate?: (update: VoteUpdate) => void;
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface WebSocketSubscription {
  type: 'bill' | 'community' | 'user_notifications' | 'expert_updates';
  id: string | number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface RealTimeConfig {
  websocket: WebSocketConfig;
  bills: {
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    heartbeatInterval: number;
    batchUpdateInterval: number;
    maxBatchSize: number;
  };
  community: {
    typingIndicatorTimeout: number;
    maxConcurrentSubscriptions: number;
    enablePresence: boolean;
  };
  notifications: {
    maxQueueSize: number;
    persistOffline: boolean;
    enablePush: boolean;
  };
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface WebSocketHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  error: string | null;
  notifications: WebSocketNotification[];
  notificationCount: number;
  getRecentActivity: (limit: number) => Array<{
    id: string;
    type: string;
    timestamp: string;
    bill_id?: string;
  }>;
  markNotificationRead: (id: string) => void;
  connect: () => void;
  disconnect: () => void;
  subscribe: (subscription: WebSocketSubscription) => string;
  unsubscribe: (subscription: WebSocketSubscription) => void;
}

export interface BillTrackingHookReturn {
  isConnected: boolean;
  subscribedBills: Set<number>;
  billUpdates: Map<number, BillUpdate[]>;
  engagementMetrics: Map<number, BillEngagementUpdate>;
  subscribeToBill: (billId: number) => void;
  unsubscribeFromBill: (billId: number) => void;
  getBillUpdates: (billId: number) => BillUpdate[];
  getEngagementMetrics: (billId: number) => BillEngagementUpdate | null;
}

export interface CommunityRealTimeHookReturn {
  isConnected: boolean;
  subscribedDiscussions: Set<string>;
  typingIndicators: Map<string, TypingIndicator[]>;
  recentComments: CommentUpdate[];
  subscribeToDiscussion: (billId: number) => void;
  unsubscribeFromDiscussion: (billId: number) => void;
  sendTypingIndicator: (billId: number, parentId?: string) => void;
  stopTypingIndicator: (billId: number, parentId?: string) => void;
  sendCommentUpdate: (billId: number, commentData: Record<string, unknown>) => void;
  sendVoteUpdate: (billId: number, voteData: Record<string, unknown>) => void;
}