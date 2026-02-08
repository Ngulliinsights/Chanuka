/**
 * Real-time Types
 * Type definitions for real-time features
 */

export interface TypingIndicator {
  userId: string;
  billId: number;
  parentId?: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface CommentUpdate {
  id: string;
  billId: number;
  parentId?: string;
  userId: string;
  content: string;
  timestamp: Date;
  action: 'created' | 'updated' | 'deleted';
}

export interface CommunityUpdate extends CommentUpdate {}

export interface VoteUpdate {
  id: string;
  billId: number;
  userId: string;
  vote: 'yes' | 'no' | 'abstain';
  voteType?: 'yes' | 'no' | 'abstain' | 'neutral'; // For backward compatibility
  timestamp: Date;
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

export interface BillUpdate {
  billId: number;
  type: 'status' | 'content' | 'vote' | 'engagement';
  data: any;
  timestamp: Date | string;
}

export interface BillRealTimeUpdate extends BillUpdate {
  bill_id: number; // Server uses snake_case
  oldStatus?: string;
  newStatus?: string;
  viewCount?: number;
  commentCount?: number;
  amendment_id?: string;
  voting_date?: string;
}

export interface BillEngagementUpdate {
  billId: number;
  bill_id?: number; // For backward compatibility with server messages
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  viewCount?: number;
  saveCount?: number;
  commentCount?: number;
  shareCount?: number;
  timestamp: Date | string;
}

export interface BillTrackingHookReturn {
  isConnected: boolean;
  trackedBills?: Set<number>;
  subscribedBills: Set<number>;
  billUpdates: Map<number, BillUpdate[]>;
  engagementData?: Map<number, BillEngagementUpdate>;
  engagementMetrics: Map<number, BillEngagementUpdate>;
  trackBill?: (billId: number) => void;
  untrackBill?: (billId: number) => void;
  subscribeToBill: (billId: number) => void;
  unsubscribeFromBill: (billId: number) => void;
  getBillUpdates: (billId: number) => BillUpdate[];
  getEngagementMetrics: (billId: number) => BillEngagementUpdate | null;
  getLatestUpdate?: (billId: number) => BillUpdate | undefined;
}

export interface HeartbeatConfig {
  enabled: boolean;
  interval: number;
  timeout?: number;
}

export interface SecurityConfig {
  encryption: boolean;
  tokenRefresh?: boolean;
  maxConnectionAge?: number;
  validateOrigin?: boolean;
  allowedOrigins?: string[];
}

export interface MessageConfig {
  maxSize: number;
  compression?: boolean;
  batchEnabled?: boolean;
  batching?: {
    enabled: boolean;
    maxSize: number;
    flushInterval: number;
  };
}

export interface ReconnectConfig {
  enabled: boolean;
  maxAttempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
}


export interface WebSocketConfig {
  url: string;
  reconnect: boolean | ReconnectConfig;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  heartbeat?: HeartbeatConfig;
  security?: SecurityConfig;
  message?: MessageConfig;
  protocols?: string[];
}

export interface RealTimeConfig {
  websocket: WebSocketConfig;
  enableBillTracking: boolean;
  enableCommunityUpdates: boolean;
  enableNotifications: boolean;
  updateThrottleMs: number;
  bills?: {
    pollingInterval: number;
    batchUpdates?: boolean;
    autoReconnect?: boolean;
  };
}

// Import from shared types for consistency
export interface WebSocketMessage {
  type: string;
  data?: any;
  payload?: any; // For backwards compatibility
  messageId?: string;
  timestamp?: number;
}

export interface RealtimeConnection {
  id: string;
  url: string;
  isConnected: boolean;
  reconnectAttempts: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// Const object for runtime enum values
export const ConnectionState = {
  DISCONNECTED: 'disconnected' as const,
  CONNECTING: 'connecting' as const,
  CONNECTED: 'connected' as const,
  RECONNECTING: 'reconnecting' as const,
  ERROR: 'error' as const,
} as const;

export interface RealTimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high';
  read?: boolean;
  created_at?: string;
}

export interface WebSocketNotification extends RealTimeNotification {
  priority?: 'low' | 'medium' | 'high';
  read?: boolean;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  isConnecting?: boolean;
  connectionState: ConnectionState;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  // Extended methods for UI components
  connect?: () => void;
  disconnect?: () => void;
  notifications?: RealTimeNotification[];
  connectionQuality?: 'good' | 'fair' | 'poor';
  error?: Error | null;
  getRecentActivity?: () => any[];
  markNotificationRead?: (id: string) => void;
}

export interface CivicWebSocketState {
  isConnected: boolean;
  isConnecting?: boolean;
  connectionState?: ConnectionState;
  subscriptions?: Set<string>;
  lastError?: Error;
  error?: Error | string | null;
  lastMessage?: any;
  reconnectAttempts?: number;
  connection_quality?: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  last_heartbeat?: string | null;
  message_count?: number;
  // Changed from Set to arrays to match hub.ts usage
  bill_subscriptions: number[];
  community_subscriptions: string[];
  expert_subscriptions: string[];
  notification_subscriptions: boolean;
}

export interface CommunityRealTimeUpdate {
  type: 'comment' | 'vote' | 'typing';
  data: CommentUpdate | VoteUpdate | TypingIndicator;
  timestamp: Date | string;
  discussion_id?: string;
}

export interface EngagementMetricsUpdate {
  billId: number;
  bill_id: number;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: Date | string;
}

export interface ExpertActivityUpdate {
  expertId: string;
  activity: string;
  billId?: number;
  timestamp: Date;
}

export interface WebSocketSubscription {
  id: string;
  channel: string;
  handler: (data: any) => void;
  createdAt: Date;
  // Extended properties
  type?: 'bill' | 'community' | 'expert' | 'notification' | 'user_notifications';
  topic?: string;
  callback?: (data: any) => void;
  filters?: Record<string, any>;
  priority?: number;
}

export type Subscription = WebSocketSubscription;

export interface RealTimeHandlers {
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error | string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  // Extended handlers for specific update types
  onBillUpdate?: (update: any) => void;
  onCommunityUpdate?: (update: any) => void;
  onEngagementUpdate?: (update: any) => void;
  onExpertActivity?: (update: any) => void;
  onNotification?: (notification: RealTimeNotification) => void;
  onConnectionChange?: (state: boolean | ConnectionState) => void;
}

export type MessageHandler = (message: WebSocketMessage) => void;
export type EventListener = (event: any) => void;

export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: Date;
}

export interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  channel: string;
  timestamp: Date;
}

export interface BatchMessage {
  type: 'batch';
  messages: WebSocketMessage[];
  timestamp: Date;
}


export interface PollingFallbackConfig {
  enabled: boolean;
  interval?: number; // For simple polling
  intervals?: { // For granular polling per feature
    bills?: number;
    engagement?: number;
    notifications?: number;
    community?: number;
  };
  maxRetries?: number;
  max_retries?: number; // Alias
  backoff_multiplier?: number;
}
