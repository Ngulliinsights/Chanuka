/**
 * Real-time Core Module
 *
 * Central entry point for the real-time subsystem.
 * Uses unified WebSocket types from shared schema for consistency.
 */

// Import unified types from shared types
import type { ConnectionQuality, WebSocketMessage } from '@shared/types/api/websocket';

import { WebSocketClient } from '../websocket-client';

// Re-export shared types for backward compatibility
export type { ConnectionQuality, WebSocketMessage } from '@shared/types/api/websocket';

export { WebSocketClient };

// ============================================================================
// Connection State Enum
// ============================================================================

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  CLOSED = 'closed',
  FAILED = 'failed',
}

// ============================================================================
// Polling Fallback Configuration
// ============================================================================

export interface PollingFallbackConfig {
  enabled: boolean;
  intervals: {
    bills: number;
    engagement: number;
    notifications: number;
    community: number;
  };
  max_retries: number;
  backoff_multiplier: number;
}

// ============================================================================
// WebSocket Configuration and Protocol Types
// ============================================================================

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  heartbeat?: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
  message?: {
    compression: boolean;
    batching: boolean;
    batchSize?: number;
    batchInterval?: number;
  };
  security?: {
    validateOrigin: boolean;
    allowedOrigins?: string[];
  };
}

export interface RealTimeConfig {
  websocket: WebSocketConfig;
  bills?: {
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    heartbeatInterval: number;
    batchUpdateInterval: number;
    maxBatchSize: number;
  };
  community?: {
    typingIndicatorTimeout: number;
    maxConcurrentSubscriptions?: number;
  };
}

// Subscription type for tracking subscribed topics/entities
export interface Subscription {
  id: string;
  topic: string;
  filters?: {
    update_types?: string[];
    priority_threshold?: 'low' | 'medium' | 'high';
    expert_only?: boolean;
  };
  callback?: MessageHandler;
  priority?: 'high' | 'medium' | 'low';
  type?: 'bill' | 'community' | 'expert' | 'user_notifications';
}

// Message handler types
export type MessageHandler = (message: WebSocketMessage) => void;
export type EventListener = (event: Event) => void;

// Type aliases for backward compatibility with service files
export type BillUpdate = BillRealTimeUpdate;
export type BillEngagementUpdate = EngagementMetricsUpdate;
export type CommunityUpdate = CommunityRealTimeUpdate;
export type TypingIndicator = Record<string, unknown>;
export type CommentUpdate = Record<string, unknown>;
export type VoteUpdate = Record<string, unknown>;
export type WebSocketNotification = RealTimeNotification;

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface HeartbeatMessage {
  type: 'heartbeat';
  id?: string;
  timestamp: number;
}

export interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  subscriptions?: Subscription[];
  topic?: string;
  filters?: Record<string, unknown>;
  subscriptionId?: string;
  id?: string;
  timestamp: number;
}

export interface BatchMessage {
  type: 'batch';
  messages: WebSocketMessage[];
  id?: string;
  timestamp: number;
}

// ============================================================================
// Consolidated Client Real-time Domain Types
// ============================================================================

/**
 * These types represent domain-specific real-time events and updates.
 * They are separate from WebSocket protocol types and define the business logic
 * for real-time features in the client application.
 */

export interface BillRealTimeUpdate {
  type:
    | 'status_change'
    | 'new_comment'
    | 'amendment'
    | 'voting_scheduled'
    | 'engagement_change'
    | 'constitutional_flag'
    | 'expert_analysis';
  data: Record<string, unknown>;
  timestamp: string;
  bill_id: number;
}

export interface CommunityRealTimeUpdate {
  type:
    | 'new_discussion'
    | 'comment_added'
    | 'expert_joined'
    | 'consensus_change'
    | 'moderation_action'
    | 'trending_topic';
  bill_id?: number;
  discussion_id?: string;
  data: {
    content?: string;
    author?: {
      id: string;
      name: string;
      expert?: boolean;
      verification_type?: string;
    };
    metrics?: {
      participants: number;
      comments: number;
      expert_count: number;
    };
  };
  timestamp: string;
}

export interface EngagementMetricsUpdate {
  bill_id: number;
  metrics: {
    view_count: number;
    save_count: number;
    comment_count: number;
    share_count: number;
    expert_engagement: number;
    community_sentiment: 'positive' | 'neutral' | 'negative';
    controversy_level: 'low' | 'medium' | 'high';
  };
  timestamp: string;
}

export interface ExpertActivityUpdate {
  type: 'new_analysis' | 'verification_change' | 'consensus_update' | 'credibility_change';
  expert_id: string;
  bill_id?: number;
  data: {
    expert_name: string;
    verification_type: 'official' | 'domain' | 'identity';
    credibility_score?: number;
    analysis_preview?: string;
    consensus_position?: string;
  };
  timestamp: string;
}

export interface RealTimeNotification {
  id: string;
  type:
    | 'bill_status'
    | 'community_activity'
    | 'expert_response'
    | 'trending_bill'
    | 'constitutional_alert'
    | 'engagement_milestone';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Associated data
  bill_id?: number;
  expert_id?: string;
  discussion_id?: string;

  // Notification metadata
  created_at: string;
  expires_at?: string;
  read: boolean;

  // Action data
  action_url?: string;
  action_text?: string;
}

// WebSocket subscription types
export interface WebSocketSubscription {
  type: 'bill' | 'community' | 'expert' | 'user_notifications';
  id: string | number;
  filters?: {
    update_types?: string[];
    priority_threshold?: 'low' | 'medium' | 'high';
    expert_only?: boolean;
  };
}

// Connection state for civic features
export interface CivicWebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: Record<string, unknown> | null;
  reconnectAttempts: number;

  // Subscription tracking - using arrays for Immer compatibility
  bill_subscriptions: number[];
  community_subscriptions: string[];
  expert_subscriptions: string[];
  notification_subscriptions: boolean;

  // Real-time metrics
  connection_quality: 'excellent' | 'good' | 'poor' | 'disconnected';
  last_heartbeat: string | null;
  message_count: number;
}

// Real-time update handlers
export type RealTimeUpdateHandler = (update: Record<string, unknown>) => void;

export interface RealTimeHandlers {
  onBillUpdate?: (update: BillRealTimeUpdate) => void;
  onCommunityUpdate?: (update: CommunityRealTimeUpdate) => void;
  onEngagementUpdate?: (update: EngagementMetricsUpdate) => void;
  onExpertActivity?: (update: ExpertActivityUpdate) => void;
  onNotification?: (notification: RealTimeNotification) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

// ============================================================================
// React Hook Return Types
// ============================================================================

export interface WebSocketHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: ConnectionQuality['level'];
  error: string | null;
  notifications: WebSocketMessage[];
  notificationCount: number;

  connect: () => void;
  disconnect: () => void;
  subscribe: (topics: string | string[]) => void;
  unsubscribe: (topics: string | string[]) => void;
  send: (message: WebSocketMessage) => void;
  getRecentActivity: (limit: number) => Array<{
    id: string;
    type: string;
    timestamp: string;
    bill_id?: string;
  }>;
  markNotificationRead: (id: string) => void; 
}

export interface BillTrackingHookReturn {
  isConnected: boolean;
  // Use shared types for strict typing
  subscribedBills: Set<number>;
  subscribeToBill: (billId: number) => void;
  unsubscribeFromBill: (billId: number) => void;
}
