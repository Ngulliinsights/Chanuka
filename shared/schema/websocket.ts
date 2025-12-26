/**
 * Shared WebSocket Types
 * 
 * Message types and interfaces shared between client and server
 */

// ============================================================================
// Shared Message Types
// ============================================================================

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
  messageId?: string;
}

export interface BillUpdate {
  billId: number;
  updateType: 'status_change' | 'engagement_change' | 'amendment' | 'voting_scheduled';
  previousValue?: any;
  newValue: any;
  metadata?: Record<string, unknown>;
}

export interface NotificationData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface CommunityUpdate {
  discussionId: string;
  userId?: string;
  action: 'created' | 'updated' | 'deleted' | 'typing_start' | 'typing_stop';
  content?: string | Record<string, any>;
  timestamp: string;
}

// ============================================================================
// Message Type Definitions
// ============================================================================

export interface AuthMessage extends WebSocketMessage {
  type: 'auth' | 'authenticate';
  data: {
    token: string;
    clientInfo?: {
      platform?: string;
      version?: string;
      capabilities?: string[];
    };
  };
}

export interface SubscribeMessage extends WebSocketMessage {
  type: 'subscribe';
  data: {
    topics: string[];
    filters?: Record<string, any>;
  };
}

export interface UnsubscribeMessage extends WebSocketMessage {
  type: 'unsubscribe';
  data: {
    topics: string[];
  };
}

export interface HeartbeatMessage extends WebSocketMessage {
  type: 'ping' | 'pong';
  data?: {
    sequence?: number;
    timestamp: number;
  };
}

export interface BillUpdateMessage extends WebSocketMessage {
  type: 'bill_update' | 'bill_status_change' | 'bill_engagement';
  data: BillUpdate;
}

export interface CommunityUpdateMessage extends WebSocketMessage {
  type: 'community_update' | 'comment' | 'vote' | 'typing';
  data: CommunityUpdate;
}

export interface NotificationMessage extends WebSocketMessage {
  type: 'notification' | 'alert';
  data: NotificationData;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  data: {
    code: number;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// Union Types
// ============================================================================

export type ClientToServerMessage = 
  | AuthMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | HeartbeatMessage;

export type ServerToClientMessage = 
  | BillUpdateMessage
  | CommunityUpdateMessage
  | NotificationMessage
  | ErrorMessage
  | HeartbeatMessage;

export type AnyWebSocketMessage = ClientToServerMessage | ServerToClientMessage;