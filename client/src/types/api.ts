/**
 * Standardized API Type Definitions
 * 
 * This module provides consistent type definitions across all layers
 * to eliminate naming inconsistencies and type mismatches.
 */

// ============================================================================
// Core Bill Types
// ============================================================================

export interface BillUpdateData {
  billId: number;
  title?: string;
  oldStatus?: BillStatus;
  newStatus?: BillStatus;
  viewCount?: number;
  saveCount?: number;
  commentCount?: number;
  shareCount?: number;
  changes?: Record<string, unknown>;
  timestamp?: string;
}

export interface BillUpdate {
  type: BillSubscriptionType;
  data: BillUpdateData;
  timestamp: string;
}

export type BillSubscriptionType = 
  | 'status_change' 
  | 'new_comment' 
  | 'amendment' 
  | 'voting_scheduled' 
  | 'sponsor_change';

export enum BillStatus {
  INTRODUCED = 'introduced',
  COMMITTEE = 'committee',
  FLOOR_DEBATE = 'floor_debate',
  PASSED_HOUSE = 'passed_house',
  PASSED_SENATE = 'passed_senate',
  PASSED = 'passed',
  FAILED = 'failed',
  SIGNED = 'signed',
  VETOED = 'vetoed',
  OVERRIDE_ATTEMPT = 'override_attempt'
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WebSocketSubscription {
  type: 'bill' | 'community' | 'user_notifications';
  id: string | number;
}

export interface WebSocketNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  data?: Record<string, unknown>;
  timestamp: string;
  read?: boolean;
}

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// Community Types
// ============================================================================

export interface CommunityUpdate {
  type: string;
  discussionId: string;
  data: unknown;
  timestamp: string;
}

// ============================================================================
// Engagement Types
// ============================================================================

export interface EngagementMetrics {
  billId: number;
  views: number;
  comments: number;
  shares: number;
  saves: number;
  timestamp: string;
}

export interface EngagementAction {
  actionType: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  entityType: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
  entityId: string | number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Connection Types
// ============================================================================

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  CLOSING = 'closing'
}

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

// ============================================================================
// Real-time Handler Types
// ============================================================================

export interface RealTimeHandlers {
  onBillUpdate?: (update: BillUpdate) => void;
  onCommunityUpdate?: (update: CommunityUpdate) => void;
  onEngagementUpdate?: (metrics: EngagementMetrics) => void;
  onNotification?: (notification: WebSocketNotification) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface BillTrackingPreferences {
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
  updateFrequency: 'immediate' | 'hourly' | 'daily';
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
}