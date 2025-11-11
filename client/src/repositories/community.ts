/**
 * Community Repository
 *
 * Domain-specific repository for community features that extends the unified API client.
 * Provides clean interfaces for comments, discussions, community engagement, and
 * social interactions around bills.
 */

import { UnifiedApiClientImpl, globalApiClient } from '../core/api/client';
import {
  Comment,
  CommentFormData,
  DiscussionThread,
  User
} from '../core/api/types';
import { UnifiedWebSocketManager } from '../core/api/websocket';
import { logger } from '../utils/logger';

export interface CommunityRepositoryConfig {
  baseEndpoint: string;
  cacheTTL: {
    comments: number;
    discussions: number;
    engagement: number;
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
  moderation: {
    enablePreModeration: boolean;
    autoHideThreshold: number;
  };
}

export class CommunityRepository extends UnifiedApiClientImpl {
  private config: CommunityRepositoryConfig;
  private webSocketService: UnifiedWebSocketManager;

  constructor(config: CommunityRepositoryConfig) {
    super({
      baseUrl: globalApiClient.getConfig().baseUrl,
      timeout: globalApiClient.getConfig().timeout,
      retry: globalApiClient.getConfig().retry,
      cache: globalApiClient.getConfig().cache,
      websocket: globalApiClient.getConfig().websocket,
      headers: globalApiClient.getConfig().headers
    });

    this.config = config;
    this.webSocketService = new UnifiedWebSocketManager({
      url: 'ws://localhost:8080',
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 45000
      },
      message: {
        compression: false,
        batching: true,
        batchSize: 10,
        batchInterval: 1000
      }
    });
    this.initializeWebSocketIntegration();
  }

  /**
   * Initialize WebSocket integration for real-time community updates
   */
  private initializeWebSocketIntegration(): void {
    this.webSocketService.on('commentUpdate', this.handleRealTimeCommentUpdate.bind(this));
    this.webSocketService.on('discussionUpdate', this.handleRealTimeDiscussionUpdate.bind(this));
  }

  /**
   * Get discussion thread for a bill
   */
  async getDiscussionThread(billId: number): Promise<DiscussionThread> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/discussion`;

    const response = await this.get<DiscussionThread>(endpoint, {
      cache: { ttl: this.config.cacheTTL.discussions }
    });

    return response.data;
  }

  /**
   * Get comments for a bill with pagination
   */
  async getComments(
    billId: number,
    params?: {
      page?: number;
      limit?: number;
      sort?: 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
      expertOnly?: boolean;
      parentId?: number;
    }
  ): Promise<{
    comments: Comment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/comments`;
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', Math.min(params.limit, this.config.pagination.maxLimit).toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.expertOnly) queryParams.append('expert_only', 'true');
    if (params?.parentId) queryParams.append('parent_id', params.parentId.toString());

    const response = await this.get(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.comments }
    });

    return response.data as {
      comments: Comment[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
    };
  }

  /**
   * Add a comment to a bill
   */
  async addComment(commentData: CommentFormData): Promise<Comment> {
    const endpoint = `${this.config.baseEndpoint}/bills/${commentData.billId}/comments`;

    const response = await this.post(endpoint, {
      content: commentData.content,
      parent_id: commentData.parentId
    });

    // Subscribe to real-time updates for this comment thread
    this.subscribeToCommentUpdates(commentData.billId);

    logger.info('Comment added successfully', {
      billId: commentData.billId,
      commentId: response.data.id
    });

    return response.data as Comment;
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: number, content: string): Promise<Comment> {
    const endpoint = `${this.config.baseEndpoint}/comments/${commentId}`;

    const response = await this.patch(endpoint, { content });

    logger.info('Comment updated successfully', { commentId });

    return response.data as Comment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: number): Promise<void> {
    const endpoint = `${this.config.baseEndpoint}/comments/${commentId}`;

    await this.delete(endpoint);

    logger.info('Comment deleted successfully', { commentId });
  }

  /**
   * Vote on a comment
   */
  async voteComment(commentId: number, vote: 'up' | 'down'): Promise<Comment> {
    const endpoint = `${this.config.baseEndpoint}/comments/${commentId}/vote`;

    const response = await this.post(endpoint, { vote });

    return response.data as Comment;
  }

  /**
   * Report a comment for moderation
   */
  async reportComment(commentId: number, reason: string, details?: string): Promise<void> {
    const endpoint = `${this.config.baseEndpoint}/comments/${commentId}/report`;

    await this.post(endpoint, { reason, details });

    logger.info('Comment reported', { commentId, reason });
  }

  /**
   * Get comment replies
   */
  async getCommentReplies(
    commentId: number,
    page = 1,
    limit = 20
  ): Promise<{
    replies: Comment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
    };
  }> {
    const endpoint = `${this.config.baseEndpoint}/comments/${commentId}/replies`;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.min(limit, this.config.pagination.maxLimit).toString()
    });

    const response = await this.get(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.comments }
    });

    return response.data as {
      replies: Comment[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        hasNext: boolean;
      };
    };
  }

  /**
   * Create a new discussion thread
   */
  async createDiscussionThread(billId: number, title: string, content: string): Promise<DiscussionThread> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/discussions`;

    const response = await this.post(endpoint, { title, content });

    logger.info('Discussion thread created', {
      billId,
      threadId: response.data.id,
      title
    });

    return response.data as DiscussionThread;
  }

  /**
   * Get discussion threads for a bill
   */
  async getDiscussionThreads(
    billId: number,
    page = 1,
    limit = 10
  ): Promise<{
    threads: DiscussionThread[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
    };
  }> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/discussions`;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.min(limit, this.config.pagination.maxLimit).toString()
    });

    const response = await this.get(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.discussions }
    });

    return response.data as {
      threads: DiscussionThread[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        hasNext: boolean;
      };
    };
  }

  /**
   * Get messages in a discussion thread
   */
  async getDiscussionMessages(
    threadId: number,
    page = 1,
    limit = 50
  ): Promise<{
    messages: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
    };
  }> {
    const endpoint = `${this.config.baseEndpoint}/discussions/${threadId}/messages`;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.min(limit, this.config.pagination.maxLimit).toString()
    });

    const response = await this.get(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.discussions }
    });

    return response.data as {
      messages: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        hasNext: boolean;
      };
    };
  }

  /**
   * Add a message to a discussion thread
   */
  async addDiscussionMessage(threadId: number, content: string): Promise<any> {
    const endpoint = `${this.config.baseEndpoint}/discussions/${threadId}/messages`;

    const response = await this.post(endpoint, { content });

    logger.info('Discussion message added', { threadId, messageId: response.data.id });

    return response.data;
  }

  /**
   * Get community engagement statistics
   */
  async getEngagementStats(billId: number): Promise<{
    total_comments: number;
    total_discussions: number;
    active_participants: number;
    expert_contributions: number;
    controversial_comments: number;
    last_activity: string;
  }> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/community/stats`;

    const response = await this.get(endpoint, {
      cache: { ttl: this.config.cacheTTL.engagement }
    });

    return response.data as {
      total_comments: number;
      total_discussions: number;
      active_participants: number;
      expert_contributions: number;
      controversial_comments: number;
      last_activity: string;
    };
  }

  /**
   * Get top contributors for a bill
   */
  async getTopContributors(billId: number, limit = 10): Promise<{
    contributors: Array<{
      user: User;
      comment_count: number;
      vote_count: number;
      reputation: number;
    }>;
  }> {
    const endpoint = `${this.config.baseEndpoint}/bills/${billId}/contributors`;
    const queryParams = new URLSearchParams({
      limit: limit.toString()
    });

    const response = await this.get(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.engagement }
    });

    return response.data as {
      contributors: Array<{
        user: User;
        comment_count: number;
        vote_count: number;
        reputation: number;
      }>;
    };
  }

  /**
   * Subscribe to real-time comment updates for a bill
   */
  private subscribeToCommentUpdates(billId: number): void {
    this.webSocketService.subscribe(`bill-comments:${billId}`, ['new_comment', 'comment_vote', 'comment_update']);
    logger.debug('Subscribed to comment updates', { billId });
  }

  /**
   * Handle real-time comment updates from WebSocket
   */
  private handleRealTimeCommentUpdate(data: any): void {
    try {
      const { billId, comment, action } = data;
      logger.info('Real-time comment update received', { billId, commentId: comment?.id, action });

      // Invalidate comment cache for the bill
      this.invalidateCommentCache(billId);

      // Emit event for store to handle
      this.emit('commentUpdate', { billId, comment, action });
    } catch (error) {
      logger.error('Failed to handle real-time comment update', { error });
    }
  }

  /**
   * Handle real-time discussion updates from WebSocket
   */
  private handleRealTimeDiscussionUpdate(data: any): void {
    try {
      const { billId, thread, action } = data;
      logger.info('Real-time discussion update received', { billId, threadId: thread?.id, action });

      // Invalidate discussion cache for the bill
      this.invalidateDiscussionCache(billId);

      // Emit event for store to handle
      this.emit('discussionUpdate', { billId, thread, action });
    } catch (error) {
      logger.error('Failed to handle real-time discussion update', { error });
    }
  }

  /**
   * Invalidate comment cache for a bill
   */
  private invalidateCommentCache(billId: number): void {
    logger.debug('Comment cache invalidated', { billId });
  }

  /**
   * Invalidate discussion cache for a bill
   */
  private invalidateDiscussionCache(billId: number): void {
    logger.debug('Discussion cache invalidated', { billId });
  }

  /**
   * Event emitter for real-time updates
   */
  private eventListeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners[event];
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }
}

// Default configuration
const defaultConfig: CommunityRepositoryConfig = {
  baseEndpoint: '/api',
  cacheTTL: {
    comments: 2 * 60 * 1000, // 2 minutes
    discussions: 5 * 60 * 1000, // 5 minutes
    engagement: 10 * 60 * 1000 // 10 minutes
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },
  moderation: {
    enablePreModeration: false,
    autoHideThreshold: -5 // Hide comments with vote score below this
  }
};

// Export singleton instance
export const communityRepository = new CommunityRepository(defaultConfig);