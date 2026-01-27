/**
 * Community Services Types
 *
 * Type definitions for community service APIs and WebSocket communication
 *
 * @module shared/types/community/community-services
 */

import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  DiscussionThread,
  ThreadEvent,
  UserEvent,
  CommunityUpdate,
  CommentQueryOptions,
  SearchOptions,
  SearchResult,
  ExpertInsight,
  Vote,
  VoteRequest,
} from './community-base';

// ============================================================================
// API Service Types
// ============================================================================

/**
 * Response from fetching comments
 */
export interface CommentsResponse {
  readonly comments: Comment[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

/**
 * Response from fetching discussion threads
 */
export interface ThreadsResponse {
  readonly threads: DiscussionThread[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

/**
 * Response from creating content
 */
export interface CreateResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
}

/**
 * Response from updating content
 */
export interface UpdateResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly previousVersion?: T;
  readonly message?: string;
}

/**
 * Response from deleting content
 */
export interface DeleteResponse {
  readonly success: boolean;
  readonly deletedAt: string;
  readonly message?: string;
}

/**
 * Generic list response
 */
export interface ListResponse<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

/**
 * Error response
 */
export interface ErrorResponse {
  readonly error: string;
  readonly code: string;
  readonly statusCode: number;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

/**
 * Base WebSocket message
 */
export interface WebSocketMessage {
  readonly id?: string;
  readonly type: string;
  readonly timestamp: string;
  readonly data?: unknown;
  readonly error?: string;
}

/**
 * Discussion message via WebSocket
 */
export interface DiscussionMessage extends WebSocketMessage {
  readonly type: 'discussion';
  readonly discussionId: number;
  readonly data: ThreadEvent | Comment;
}

/**
 * Comment update message
 */
export interface CommentUpdateMessage extends WebSocketMessage {
  readonly type: 'comment_update';
  readonly data: {
    readonly commentId: number;
    readonly threadId: number;
    readonly update: Partial<Comment>;
  };
}

/**
 * Typing indicator message
 */
export interface TypingIndicatorMessage extends WebSocketMessage {
  readonly type: 'typing_indicator';
  readonly data: {
    readonly userId: number;
    readonly username: string;
    readonly threadId: number;
  };
}

/**
 * Real-time notification message
 */
export interface NotificationMessage extends WebSocketMessage {
  readonly type: 'notification';
  readonly data: {
    readonly userId: number;
    readonly notificationType: string;
    readonly content: string;
    readonly relatedId?: number;
  };
}

/**
 * Moderation event message
 */
export interface ModerationMessage extends WebSocketMessage {
  readonly type: 'moderation_event';
  readonly data: {
    readonly contentId: number;
    readonly action: 'flagged' | 'removed' | 'approved';
    readonly reason?: string;
    readonly moderatorId?: number;
  };
}

/**
 * Expert activity message
 */
export interface ExpertActivityMessage extends WebSocketMessage {
  readonly type: 'expert_activity';
  readonly data: {
    readonly expertId: number;
    readonly activity: 'insight_posted' | 'insight_updated' | 'endorsement';
    readonly billId?: number;
    readonly insightId?: number;
  };
}

// ============================================================================
// Real-time Update Types
// ============================================================================

/**
 * Typing indicator state
 */
export interface TypingIndicator {
  readonly userId: number;
  readonly username: string;
  readonly startedAt: number;
}

/**
 * Comment update event
 */
export interface CommentUpdateEvent {
  readonly commentId: number;
  readonly threadId: number;
  readonly changes: Partial<Comment>;
  readonly updatedAt: string;
}

/**
 * Vote update event
 */
export interface VoteUpdateEvent {
  readonly voteId: number;
  readonly commentId?: number;
  readonly billId?: number;
  readonly userId: number;
  readonly voteType: string;
  readonly timestamp: string;
}

/**
 * Presence update (user joined/left)
 */
export interface PresenceUpdate {
  readonly userId: number;
  readonly username: string;
  readonly action: 'joined' | 'left';
  readonly threadId?: number;
  readonly timestamp: string;
}

// ============================================================================
// Service Operation Types
// ============================================================================

/**
 * Batch operation request
 */
export interface BatchOperation<T> {
  readonly operations: Array<{
    readonly type: 'create' | 'update' | 'delete';
    readonly data: T;
  }>;
}

/**
 * Batch operation response
 */
export interface BatchOperationResponse<T> {
  readonly successful: T[];
  readonly failed: Array<{
    readonly data: T;
    readonly error: string;
  }>;
  readonly total: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  readonly page?: number;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Sort parameters
 */
export interface SortParams {
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Filter parameters
 */
export interface FilterParams {
  readonly filters?: Record<string, unknown>;
  readonly search?: string;
}

/**
 * Combined query parameters
 */
export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

// ============================================================================
// Cache & State Types
// ============================================================================

/**
 * Cached item with metadata
 */
export interface CachedItem<T> {
  readonly data: T;
  readonly cachedAt: number;
  readonly expiresAt: number;
  readonly version: number;
}

/**
 * Cache key configuration
 */
export interface CacheKey {
  readonly namespace: string;
  readonly key: string;
  readonly version?: number;
}

/**
 * State synchronization request
 */
export interface SyncRequest {
  readonly clientVersion: number;
  readonly lastSyncTime: number;
  readonly changedItems: Record<string, unknown>;
}

/**
 * State synchronization response
 */
export interface SyncResponse {
  readonly serverVersion: number;
  readonly updates: Record<string, unknown>;
  readonly deletions: string[];
  readonly conflicts?: Array<{
    readonly itemId: string;
    readonly clientVersion: unknown;
    readonly serverVersion: unknown;
  }>;
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * Subscription configuration
 */
export interface Subscription {
  readonly id: string;
  readonly topic: string;
  readonly filters?: Record<string, unknown>;
  readonly callback: (message: WebSocketMessage) => void;
  readonly createdAt: number;
}

/**
 * Subscription manager
 */
export interface SubscriptionManager {
  subscribe: (topic: string, callback: (message: WebSocketMessage) => void) => string;
  unsubscribe: (subscriptionId: string) => void;
  unsubscribeAll: (topic: string) => void;
  getActiveSubscriptions: () => Subscription[];
}

// ============================================================================
// Health Check Types
// ============================================================================

/**
 * Service health status
 */
export interface HealthStatus {
  readonly status: 'healthy' | 'degraded' | 'offline';
  readonly latency: number;
  readonly lastCheckTime: string;
  readonly uptime: number;
  readonly errorRate: number;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  readonly connected: boolean;
  readonly connectionTime: number;
  readonly disconnectReason?: string;
  readonly reconnectAttempts: number;
  readonly lastHeartbeat: string;
}
