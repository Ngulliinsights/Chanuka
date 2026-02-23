/**
 * Community Service - Core Real-time Module
 *
 * Handles real-time community features including discussions, comments,
 * typing indicators, and expert activities through WebSocket connections.
 */

import { logger } from '@client/lib/utils/logger';

import { UnifiedWebSocketManager } from '../manager';
import {
  CommentUpdate,
  TypingIndicator,
  VoteUpdate,
  WebSocketMessage,
} from '../types';

export class CommunityService {
  private wsManager: UnifiedWebSocketManager;
  private subscribedDiscussions = new Set<string>();
  private subscribedExperts = new Set<string>();
  private typingIndicators = new Map<string, TypingIndicator[]>();
  private recentComments: CommentUpdate[] = [];
  private recentVotes: VoteUpdate[] = [];
  private typingTimeouts = new Map<string, NodeJS.Timeout>();
  private isInitialized = false;

  constructor(wsManager: UnifiedWebSocketManager) {
    this.wsManager = wsManager;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up WebSocket event handlers
      this.setupEventHandlers();

      this.isInitialized = true;

      logger.info('CommunityService initialized', {
        component: 'CommunityService',
      });
    } catch (error) {
      logger.error(
        'Failed to initialize CommunityService',
        {
          component: 'CommunityService',
        },
        error
      );
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Unsubscribe from all discussions
      for (const discussionId of this.subscribedDiscussions) {
        this.unsubscribeFromDiscussion(discussionId);
      }

      // Clear typing timeouts
      for (const timeout of this.typingTimeouts.values()) {
        clearTimeout(timeout);
      }

      // Clear data
      this.subscribedDiscussions.clear();
      this.subscribedExperts.clear();
      this.typingIndicators.clear();
      this.recentComments = [];
      this.recentVotes = [];
      this.typingTimeouts.clear();

      this.isInitialized = false;

      logger.info('CommunityService shut down', {
        component: 'CommunityService',
      });
    } catch (error) {
      logger.error(
        'Error during CommunityService shutdown',
        {
          component: 'CommunityService',
        },
        error
      );
    }
  }

  // ============================================================================
  // Discussion Subscriptions
  // ============================================================================

  subscribeToDiscussion(billId: number): string {
    const discussionId = `bill_${billId}`;

    if (this.subscribedDiscussions.has(discussionId)) {
      logger.debug('Already subscribed to discussion', {
        component: 'CommunityService',
        discussionId,
      });
      return discussionId;
    }

    const subscriptionId = this.wsManager.subscribe(`discussion:${billId}`, message =>
      this.handleDiscussionMessage(discussionId, message)
    );

    this.subscribedDiscussions.add(discussionId);

    logger.info('Subscribed to discussion', {
      component: 'CommunityService',
      discussionId,
      billId,
      subscriptionId,
    });

    return subscriptionId;
  }

  unsubscribeFromDiscussion(discussionId: string): void {
    if (!this.subscribedDiscussions.has(discussionId)) {
      return;
    }

    this.subscribedDiscussions.delete(discussionId);

    // Clear typing indicators for this discussion
    this.typingIndicators.delete(discussionId);

    logger.info('Unsubscribed from discussion', {
      component: 'CommunityService',
      discussionId,
    });
  }

  // ============================================================================
  // Expert Subscriptions
  // ============================================================================

  subscribeToExpertUpdates(): string {
    const subscriptionId = this.wsManager.subscribe('expert:updates', message =>
      this.handleExpertMessage(message)
    );

    logger.info('Subscribed to expert updates', {
      component: 'CommunityService',
      subscriptionId,
    });

    return subscriptionId;
  }

  subscribeToModerationEvents(): string {
    const subscriptionId = this.wsManager.subscribe('moderation:events', message =>
      this.handleModerationMessage(message)
    );

    logger.info('Subscribed to moderation events', {
      component: 'CommunityService',
      subscriptionId,
    });

    return subscriptionId;
  }

  // ============================================================================
  // Typing Indicators
  // ============================================================================

  sendTypingIndicator(billId: number, parentId?: string): void {
    const message = {
      type: 'typing_start',
      data: {
        billId,
        parentId,
        timestamp: new Date().toISOString(),
      },
    };

    this.wsManager.send(message);

    // Set timeout to automatically stop typing indicator
    const key = `${billId}_${parentId || 'root'}`;
    if (this.typingTimeouts.has(key)) {
      clearTimeout(this.typingTimeouts.get(key)!);
    }

    const timeout = setTimeout(() => {
      this.stopTypingIndicator(billId, parentId);
    }, 3000); // 3 seconds

    this.typingTimeouts.set(key, timeout);

    logger.debug('Sent typing indicator', {
      component: 'CommunityService',
      billId,
      parentId,
    });
  }

  stopTypingIndicator(billId: number, parentId?: string): void {
    const message = {
      type: 'typing_stop',
      data: {
        billId,
        parentId,
        timestamp: new Date().toISOString(),
      },
    };

    this.wsManager.send(message);

    // Clear timeout
    const key = `${billId}_${parentId || 'root'}`;
    if (this.typingTimeouts.has(key)) {
      clearTimeout(this.typingTimeouts.get(key)!);
      this.typingTimeouts.delete(key);
    }

    logger.debug('Stopped typing indicator', {
      component: 'CommunityService',
      billId,
      parentId,
    });
  }

  // ============================================================================
  // Comment and Vote Updates
  // ============================================================================

  sendCommentUpdate(billId: number, commentData: Record<string, unknown>): void {
    const message = {
      type: 'comment_update',
      data: {
        billId,
        ...commentData,
        timestamp: new Date().toISOString(),
      },
    };

    this.wsManager.send(message);

    logger.debug('Sent comment update', {
      component: 'CommunityService',
      billId,
      commentData,
    });
  }

  sendVoteUpdate(billId: number, voteData: Record<string, unknown>): void {
    const message = {
      type: 'vote_update',
      data: {
        billId,
        ...voteData,
        timestamp: new Date().toISOString(),
      },
    };

    this.wsManager.send(message);

    logger.debug('Sent vote update', {
      component: 'CommunityService',
      billId,
      voteData,
    });
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  handleMessage(message: WebSocketMessage): void {
    try {
      switch (message.type) {
        case 'community_update':
        case 'communityUpdate':
          this.handleCommentUpdateMessage(message);
          break;
        case 'typing_indicator':
        case 'typingIndicator':
          this.handleTypingIndicatorMessage(message);
          break;
        case 'comment_update':
        case 'commentUpdate':
          this.handleCommentUpdateMessage(message);
          break;
        case 'vote_update':
        case 'voteUpdate':
          this.handleVoteUpdateMessage(message);
          break;
        case 'expert_activity':
        case 'expertActivity':
          this.handleExpertMessage(message);
          break;
        case 'moderation_event':
        case 'moderationEvent':
          this.handleModerationMessage(message);
          break;
        default:
          logger.debug('Unknown community message type', {
            component: 'CommunityService',
            messageType: message.type,
          });
      }
    } catch (error) {
      logger.error(
        'Error handling community message',
        {
          component: 'CommunityService',
          messageType: message.type,
        },
        error
      );
    }
  }

  private handleDiscussionMessage(discussionId: string, message: WebSocketMessage): void {
    try {
      // Process discussion-specific messages
      const data = message as unknown;
      const update: CommentUpdate = {
        id: data.comment_id || data.commentId || `comment_${Date.now()}`,
        billId: data.bill_id || data.billId,
        parentId: data.parent_id || data.parentId,
        userId: data.user_id || data.userId || 'unknown',
        content: data.content || '',
        timestamp: new Date(data.timestamp || Date.now()),
        action: data.action || 'created',
      };

      // Keep only recent comments (last 100)
      this.recentComments = [update, ...this.recentComments].slice(0, 100);

      logger.debug('Received discussion update', {
        component: 'CommunityService',
        discussionId,
        updateType: update.action,
        commentId: update.id,
      });
    } catch (error) {
      logger.error(
        'Error handling discussion message',
        {
          component: 'CommunityService',
          discussionId,
          messageType: message.type,
        },
        error
      );
    }
  }

  private handleTypingIndicatorMessage(message: WebSocketMessage): void {
    try {
      const data = message as unknown;
      const indicator: TypingIndicator = {
        userId: data.user_id || data.userId || 'unknown',
        billId: data.bill_id || data.billId,
        parentId: data.parent_id || data.parentId,
        isTyping: data.is_typing !== false, // Default to true
        timestamp: new Date(data.timestamp || Date.now()),
      };

      const key = `${indicator.billId}_${indicator.parentId || 'root'}`;
      const existing = this.typingIndicators.get(key) || [];

      if (indicator.isTyping) {
        // Add or update typing indicator
        const filtered = existing.filter(t => t.userId !== indicator.userId);
        this.typingIndicators.set(key, [...filtered, indicator]);
      } else {
        // Remove typing indicator
        const filtered = existing.filter(t => t.userId !== indicator.userId);
        this.typingIndicators.set(key, filtered);
      }

      logger.debug('Updated typing indicator', {
        component: 'CommunityService',
        userId: indicator.userId,
        billId: indicator.billId,
        isTyping: indicator.isTyping,
      });
    } catch (error) {
      logger.error(
        'Error handling typing indicator message',
        {
          component: 'CommunityService',
        },
        error
      );
    }
  }

  private handleCommentUpdateMessage(message: WebSocketMessage): void {
    try {
      const data = message as unknown;
      const update: CommentUpdate = {
        id: data.comment_id || data.commentId || `comment_${Date.now()}`,
        billId: data.bill_id || data.billId,
        parentId: data.parent_id || data.parentId,
        userId: data.user_id || data.userId || 'unknown',
        content: data.content || '',
        timestamp: new Date(data.timestamp || Date.now()),
        action: data.action || 'created',
      };

      // Keep only recent comments (last 100)
      this.recentComments = [update, ...this.recentComments].slice(0, 100);

      logger.debug('Processed comment update', {
        component: 'CommunityService',
        commentId: update.id,
        billId: update.billId,
        action: update.action,
      });
    } catch (error) {
      logger.error(
        'Error handling comment update message',
        {
          component: 'CommunityService',
        },
        error
      );
    }
  }

  private handleVoteUpdateMessage(message: WebSocketMessage): void {
    try {
      const data = message as unknown;
      const voteType = data.vote_type || data.voteType || data.vote || 'abstain';
      const update: VoteUpdate = {
        id: data.id || `vote_${Date.now()}`,
        billId: data.bill_id || data.billId,
        userId: data.user_id || data.userId || 'unknown',
        vote: voteType === 'neutral' ? 'abstain' : voteType,
        voteType: voteType,
        timestamp: new Date(data.timestamp || Date.now()),
      };

      // Keep only recent votes (last 100)
      this.recentVotes = [update, ...this.recentVotes].slice(0, 100);

      logger.debug('Processed vote update', {
        component: 'CommunityService',
        billId: update.billId,
        userId: update.userId,
        voteType: update.voteType,
      });
    } catch (error) {
      logger.error(
        'Error handling vote update message',
        {
          component: 'CommunityService',
        },
        error
      );
    }
  }

  private handleExpertMessage(message: WebSocketMessage): void {
    try {
      const data = message as unknown;

      logger.debug('Processed expert activity', {
        component: 'CommunityService',
        expertId: data.expert_id || data.expertId,
        activityType: data.type,
      });
    } catch (error) {
      logger.error(
        'Error handling expert message',
        {
          component: 'CommunityService',
        },
        error
      );
    }
  }

  private handleModerationMessage(message: WebSocketMessage): void {
    try {
      const data = message as unknown;

      logger.debug('Processed moderation event', {
        component: 'CommunityService',
        eventType: data.type,
        targetId: data.target_id || data.targetId,
      });
    } catch (error) {
      logger.error(
        'Error handling moderation message',
        {
          component: 'CommunityService',
        },
        error
      );
    }
  }

  // ============================================================================
  // Data Access
  // ============================================================================

  getTypingIndicators(billId: number, parentId?: string): TypingIndicator[] {
    const key = `${billId}_${parentId || 'root'}`;
    return this.typingIndicators.get(key) || [];
  }

  getRecentComments(limit: number = 20): CommentUpdate[] {
    return this.recentComments.slice(0, limit);
  }

  getRecentVotes(limit: number = 20): VoteUpdate[] {
    return this.recentVotes.slice(0, limit);
  }

  getSubscriptionCount(): number {
    return this.subscribedDiscussions.size + this.subscribedExperts.size;
  }

  // ============================================================================
  // Event Handlers Setup
  // ============================================================================

  private setupEventHandlers(): void {
    this.wsManager.on('connected', () => {
      // Re-subscribe to discussions on reconnection
      const discussionIds = Array.from(this.subscribedDiscussions);
      this.subscribedDiscussions.clear();

      discussionIds.forEach(discussionId => {
        const billId = parseInt(discussionId.replace('bill_', ''));
        if (!isNaN(billId)) {
          this.subscribeToDiscussion(billId);
        }
      });

      logger.info('Re-subscribed to discussions after reconnection', {
        component: 'CommunityService',
        discussionCount: discussionIds.length,
      });
    });

    this.wsManager.on('disconnected', () => {
      // Clear typing indicators on disconnect
      this.typingIndicators.clear();

      logger.warn('WebSocket disconnected, community features paused', {
        component: 'CommunityService',
      });
    });
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  getStats(): {
    subscribedDiscussions: number;
    subscribedExperts: number;
    activeTypingIndicators: number;
    recentComments: number;
    recentVotes: number;
  } {
    const activeTypingIndicators = Array.from(this.typingIndicators.values()).reduce(
      (sum, indicators) => sum + indicators.length,
      0
    );

    return {
      subscribedDiscussions: this.subscribedDiscussions.size,
      subscribedExperts: this.subscribedExperts.size,
      activeTypingIndicators,
      recentComments: this.recentComments.length,
      recentVotes: this.recentVotes.length,
    };
  }
}
