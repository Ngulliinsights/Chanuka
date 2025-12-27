/**
 * Real-time Core Module
 * 
 * Central entry point for the real-time subsystem.
 * USES SHARED TYPES from @client/core/api/types to ensure consistency.
 */

// ✅ IMPORT from the Central Truth
import type {
  ConnectionState,
  WebSocketMessage
} from '@client/core/api/types';

import { WebSocketClient } from '../websocket-client';

// Re-export the shared types so consumers of this module still find them here
export {
  ConnectionState,
  WebSocketClient
};

// Define ConnectionQuality locally since it's not exported from API types
export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
  packetLoss?: number;
}

// ============================================================================
// Client-specific realtime types (migrated from legacy types/realtime.ts)
// ============================================================================

export interface BillRealTimeUpdate {
  type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 
        'engagement_change' | 'constitutional_flag' | 'expert_analysis';
  data: Record<string, unknown>;
  timestamp: string;
  bill_id: number;
}

export interface CommunityRealTimeUpdate {
  type: 'new_discussion' | 'comment_added' | 'expert_joined' | 'consensus_change' | 
        'moderation_action' | 'trending_topic';
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
  type: 'bill_status' | 'community_activity' | 'expert_response' | 'trending_bill' | 
        'constitutional_alert' | 'engagement_milestone';
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
// Hook Return Types (These are specific to React, so keep them here)
// ============================================================================

export interface WebSocketHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: ConnectionQuality['level'];
  error: string | null;
  // Use proper typing for notifications
  notifications: WebSocketMessage[];
  notificationCount: number;

  connect: () => void;
  disconnect: () => void;
  subscribe: (topics: string | string[]) => void;
  unsubscribe: (topics: string | string[]) => void;
  send: (message: WebSocketMessage) => void;
}

export interface BillTrackingHookReturn {
  isConnected: boolean;
  // Use shared types for strict typing
  subscribedBills: Set<number>;
  subscribeToBill: (billId: number) => void;
  unsubscribeFromBill: (billId: number) => void;
}