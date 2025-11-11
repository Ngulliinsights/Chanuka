/**
 * Real-time WebSocket Integration Types
 * 
 * Defines interfaces for real-time bill updates, community engagement,
 * and notification systems that extend the existing WebSocket implementation.
 */

// Extended WebSocket message types for civic engagement
export interface CivicWebSocketMessage {
  type: 'connected' | 'subscribed' | 'unsubscribed' | 'bill_update' | 'community_update' | 
        'engagement_metrics' | 'expert_activity' | 'notification' | 'error' | 'pong';
  
  // Bill-specific updates
  bill_id?: number;
  update?: BillRealTimeUpdate;
  
  // Community engagement updates
  community_update?: CommunityRealTimeUpdate;
  engagement_metrics?: EngagementMetricsUpdate;
  expert_activity?: ExpertActivityUpdate;
  
  // Notifications
  notification?: RealTimeNotification;
  
  // Error handling
  message?: string;
  data?: any;
  timestamp?: string;
}

export interface BillRealTimeUpdate {
  type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 
        'engagement_change' | 'constitutional_flag' | 'expert_analysis';
  data: any;
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
  lastMessage: CivicWebSocketMessage | null;
  reconnectAttempts: number;
  
  // Subscription tracking
  bill_subscriptions: Set<number>;
  community_subscriptions: Set<string>;
  expert_subscriptions: Set<string>;
  notification_subscriptions: boolean;
  
  // Real-time metrics
  connection_quality: 'excellent' | 'good' | 'poor' | 'disconnected';
  last_heartbeat: string | null;
  message_count: number;
}

// Polling fallback configuration
export interface PollingFallbackConfig {
  enabled: boolean;
  intervals: {
    bills: number;           // Bill status updates (ms)
    engagement: number;      // Engagement metrics (ms)
    notifications: number;   // User notifications (ms)
    community: number;       // Community activity (ms)
  };
  max_retries: number;
  backoff_multiplier: number;
}

// Real-time update handlers
export type RealTimeUpdateHandler = (update: CivicWebSocketMessage) => void;

export interface RealTimeHandlers {
  onBillUpdate?: (update: BillRealTimeUpdate) => void;
  onCommunityUpdate?: (update: CommunityRealTimeUpdate) => void;
  onEngagementUpdate?: (update: EngagementMetricsUpdate) => void;
  onExpertActivity?: (update: ExpertActivityUpdate) => void;
  onNotification?: (notification: RealTimeNotification) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}