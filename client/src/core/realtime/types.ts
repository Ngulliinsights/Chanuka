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
  billUpdates: Map<number, BillUpdate[]>;
  engagementData: Map<number, BillEngagementUpdate>;
  trackBill: (billId: number) => void;
  untrackBill: (billId: number) => void;
  getLatestUpdate: (billId: number) => BillUpdate | undefined;
}

export interface WebSocketConfig {
  url: string;
  reconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface RealTimeConfig {
  websocket: WebSocketConfig;
  enableBillTracking: boolean;
  enableCommunityUpdates: boolean;
  enableNotifications: boolean;
  updateThrottleMs: number;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface RealtimeConnection {
  id: string;
  url: string;
  isConnected: boolean;
  reconnectAttempts: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RealTimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

export interface WebSocketNotification extends RealTimeNotification {}

export interface WebSocketHookReturn {
  isConnected: boolean;
  connectionState: ConnectionState;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

export interface CivicWebSocketState {
  isConnected: boolean;
  connectionState: ConnectionState;
  subscriptions: Set<string>;
  lastError?: Error;
}

export interface CommunityRealTimeUpdate {
  type: 'comment' | 'vote' | 'typing';
  data: CommentUpdate | VoteUpdate | TypingIndicator;
  timestamp: Date;
}

export interface EngagementMetricsUpdate {
  billId: number;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: Date;
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
}

export type Subscription = WebSocketSubscription;

export interface RealTimeHandlers {
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
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
