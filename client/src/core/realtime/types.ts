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
  timestamp: Date;
}

export interface BillRealTimeUpdate extends BillUpdate {}

export interface BillEngagementUpdate {
  billId: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  timestamp: Date;
}

export interface BillTrackingHookReturn {
  isConnected: boolean;
  trackedBills: Set<number>;
  subscribedBills?: Set<number>;
  billUpdates: Map<number, BillUpdate[]>;
  engagementData: Map<number, BillEngagementUpdate>;
  trackBill: (billId: number) => void;
  untrackBill: (billId: number) => void;
  getLatestUpdate: (billId: number) => BillUpdate | undefined;
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
}

export interface MessageConfig {
  maxSize: number;
  compression?: boolean;
  batchEnabled?: boolean;
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
  // Extended properties for direct access
  delay?: number;
  validateOrigin?: boolean;
  batchSize?: number;
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
  };
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
  data?: any; // For backwards compatibility
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
  type?: 'bill' | 'community' | 'expert' | 'notification';
  topic?: string;
  callback?: (data: any) => void;
  filters?: Record<string, any>;
}

export type Subscription = WebSocketSubscription;

export interface RealTimeHandlers {
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  // Extended handlers for specific update types
  onBillUpdate?: (update: any) => void;
  onCommunityUpdate?: (update: any) => void;
  onEngagementUpdate?: (update: any) => void;
  onExpertActivity?: (update: any) => void;
  onNotification?: (notification: RealTimeNotification) => void;
  onConnectionChange?: (state: ConnectionState) => void;
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
  interval: number;
  maxRetries: number;
}
