/**
 * Community WebSocket Middleware
 * 
 * Integrates community features with the existing WebSocket infrastructure
 * to provide real-time updates for discussions, expert verification, and
 * community analytics.
 */

import { UnifiedWebSocketManager } from '@client/core/api/websocket';
import { communityWebSocketExtension } from './community-websocket-extension';
import { communityBackendService } from './community-backend-service';
import { notificationService } from './notification-service';
import { logger } from '@client/utils/logger';

interface CommunityWebSocketConfig {
  enableDiscussions: boolean;
  enableExpertUpdates: boolean;
  enableCommunityAnalytics: boolean;
  enableModerationEvents: boolean;
  enableNotifications: boolean;
}

class CommunityWebSocketMiddleware {
  private isInitialized = false;
  private config: CommunityWebSocketConfig = {
    enableDiscussions: true,
    enableExpertUpdates: true,
    enableCommunityAnalytics: true,
    enableModerationEvents: true,
    enableNotifications: true,
  };

  /**
   * Initialize the community WebSocket middleware
   */
  async initialize(config?: Partial<CommunityWebSocketConfig>): Promise<void> {
    if (this.isInitialized) return;

    // Update configuration
    this.config = { ...this.config, ...config };

    try {
      // Initialize community WebSocket extension
      communityWebSocketExtension.initialize();

      // Initialize community backend service
      await communityBackendService.initialize();

      // Initialize notification service
      await notificationService.initialize();

      // Set up middleware event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info('Community WebSocket middleware initialized', { 
        component: 'CommunityWebSocketMiddleware',
        config: this.config 
      });
    } catch (error) {
      logger.error('Failed to initialize community WebSocket middleware', { 
        component: 'CommunityWebSocketMiddleware' 
      }, error);
      throw error;
    }
  }

  /**
   * Set up event handlers to bridge WebSocket events with community features
   */
  private setupEventHandlers(): void {
    // Handle WebSocket connection events
    UnifiedWebSocketManager.getInstance().on('connected', () => {
      this.onWebSocketConnected();
    });

    UnifiedWebSocketManager.getInstance().on('disconnected', () => {
      this.onWebSocketDisconnected();
    });

    // Handle bill updates that might include community data
    UnifiedWebSocketManager.getInstance().on('billUpdate', (data) => {
      this.handleBillUpdate(data);
    });

    // Handle general notifications
    UnifiedWebSocketManager.getInstance().on('notification', (data) => {
      this.handleNotification(data);
    });

    // Set up community-specific event handlers
    if (this.config.enableDiscussions) {
      this.setupDiscussionHandlers();
    }

    if (this.config.enableExpertUpdates) {
      this.setupExpertHandlers();
    }

    if (this.config.enableCommunityAnalytics) {
      this.setupAnalyticsHandlers();
    }

    if (this.config.enableModerationEvents) {
      this.setupModerationHandlers();
    }

    if (this.config.enableNotifications) {
      this.setupNotificationHandlers();
    }
  }

  /**
   * Handle WebSocket connection established
   */
  private onWebSocketConnected(): void {
    logger.info('WebSocket connected, setting up community subscriptions', { 
      component: 'CommunityWebSocketMiddleware' 
    });

    // Subscribe to community-wide updates if enabled
    if (this.config.enableCommunityAnalytics) {
      communityWebSocketExtension.subscribeToCommunityAnalytics();
    }

    if (this.config.enableExpertUpdates) {
      communityWebSocketExtension.subscribeToExpertUpdates();
    }

    if (this.config.enableModerationEvents) {
      communityWebSocketExtension.subscribeToModerationEvents();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private onWebSocketDisconnected(): void {
    logger.info('WebSocket disconnected, community real-time features disabled', { 
      component: 'CommunityWebSocketMiddleware' 
    });
  }

  /**
   * Handle bill updates and extract community-relevant information
   */
  private handleBillUpdate(data: any): void {
    const { bill_id, update } = data;

    // Forward community-related bill updates to the community extension
    const communityUpdateTypes = [
      'new_comment',
      'comment_update', 
      'expert_contribution',
      'moderation_action'
    ];

    if (communityUpdateTypes.includes(update.type)) {
      // The community WebSocket extension will handle this through its existing listeners
      logger.debug('Community-related bill update received', { 
        component: 'CommunityWebSocketMiddleware',
        billId: bill_id,
        updateType: update.type 
      });
    }
  }

  /**
   * Handle general notifications and route community-specific ones
   */
  private handleNotification(data: any): void {
    // Check if this is a community-related notification
    const communityTypes = [
      'mention', 'reply', 'expert_response', 'moderation', 
      'community_activity', 'expert_verification', 'campaign_update',
      'petition_milestone', 'discussion_trending', 'expert_insight'
    ];
    
    if (communityTypes.includes(data.type)) {
      // Forward to notification service for proper handling
      logger.debug('Community notification received', { 
        component: 'CommunityWebSocketMiddleware',
        type: data.type 
      });
    }
  }

  /**
   * Set up discussion-related event handlers
   */
  private setupDiscussionHandlers(): void {
    // Handle comment events
    communityWebSocketExtension.on('discussion:comment_added', (data) => {
      logger.debug('New comment added', { 
        component: 'CommunityWebSocketMiddleware',
        billId: data.billId 
      });

      // Emit custom event for components to listen to
      window.dispatchEvent(new CustomEvent('community:comment_added', { 
        detail: data 
      }));
    });

    communityWebSocketExtension.on('discussion:comment_updated', (data) => {
      logger.debug('Comment updated', { 
        component: 'CommunityWebSocketMiddleware',
        commentId: data.commentId 
      });

      window.dispatchEvent(new CustomEvent('community:comment_updated', { 
        detail: data 
      }));
    });

    communityWebSocketExtension.on('discussion:comment_voted', (data) => {
      logger.debug('Comment voted', { 
        component: 'CommunityWebSocketMiddleware',
        commentId: data.commentId,
        voteType: data.voteType 
      });

      window.dispatchEvent(new CustomEvent('community:comment_voted', { 
        detail: data 
      }));
    });

    communityWebSocketExtension.on('discussion:typing_indicator', (data) => {
      window.dispatchEvent(new CustomEvent('community:typing_indicator', { 
        detail: data 
      }));
    });
  }

  /**
   * Set up expert-related event handlers
   */
  private setupExpertHandlers(): void {
    communityWebSocketExtension.on('expert:verification_updated', (data) => {
      logger.debug('Expert verification updated', { 
        component: 'CommunityWebSocketMiddleware',
        userId: data.userId,
        verificationType: data.verificationType 
      });

      window.dispatchEvent(new CustomEvent('community:expert_verification_updated', { 
        detail: data 
      }));
    });

    communityWebSocketExtension.on('expert:insight_added', (data) => {
      logger.debug('Expert insight added', { 
        component: 'CommunityWebSocketMiddleware',
        billId: data.billId 
      });

      window.dispatchEvent(new CustomEvent('community:expert_insight_added', { 
        detail: data 
      }));
    });
  }

  /**
   * Set up community analytics event handlers
   */
  private setupAnalyticsHandlers(): void {
    communityWebSocketExtension.on('community:activity_update', (data) => {
      logger.debug('Community activity update', { 
        component: 'CommunityWebSocketMiddleware',
        type: data.type 
      });

      window.dispatchEvent(new CustomEvent('community:activity_update', { 
        detail: data 
      }));
    });

    communityWebSocketExtension.on('community:trending_update', (data) => {
      logger.debug('Trending topics updated', { 
        component: 'CommunityWebSocketMiddleware',
        topicsCount: data.topics.length 
      });

      window.dispatchEvent(new CustomEvent('community:trending_update', { 
        detail: data 
      }));
    });
  }

  /**
   * Set up moderation event handlers
   */
  private setupModerationHandlers(): void {
    communityWebSocketExtension.on('moderation:comment_reported', (data) => {
      logger.debug('Comment reported', { 
        component: 'CommunityWebSocketMiddleware',
        commentId: data.commentId 
      });

      window.dispatchEvent(new CustomEvent('community:comment_reported', { 
        detail: data 
      }));
    });

    communityWebSocketExtension.on('moderation:action_taken', (data) => {
      logger.debug('Moderation action taken', { 
        component: 'CommunityWebSocketMiddleware',
        commentId: data.commentId,
        action: data.action 
      });

      window.dispatchEvent(new CustomEvent('community:moderation_action', { 
        detail: data 
      }));
    });
  }

  /**
   * Set up notification event handlers
   */
  private setupNotificationHandlers(): void {
    communityWebSocketExtension.on('notification:community', (data) => {
      logger.debug('Community notification received', { 
        component: 'CommunityWebSocketMiddleware',
        type: data.type 
      });

      // The notification service will handle this through its own listeners
    });
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Subscribe to discussion updates for a specific bill
   */
  subscribeToDiscussion(billId: number): void {
    if (!this.isInitialized) {
      logger.warn('Community WebSocket middleware not initialized', { 
        component: 'CommunityWebSocketMiddleware' 
      });
      return;
    }

    if (this.config.enableDiscussions) {
      communityWebSocketExtension.subscribeToDiscussion(billId);
      logger.info('Subscribed to discussion updates', { 
        component: 'CommunityWebSocketMiddleware',
        billId 
      });
    }
  }

  /**
   * Unsubscribe from discussion updates for a specific bill
   */
  unsubscribeFromDiscussion(billId: number): void {
    if (!this.isInitialized) return;

    if (this.config.enableDiscussions) {
      communityWebSocketExtension.unsubscribeFromDiscussion(billId);
      logger.info('Unsubscribed from discussion updates', { 
        component: 'CommunityWebSocketMiddleware',
        billId 
      });
    }
  }

  /**
   * Send typing indicator for a discussion
   */
  sendTypingIndicator(billId: number, parentId?: string): void {
    if (!this.isInitialized || !this.config.enableDiscussions) return;

    communityWebSocketExtension.sendTypingIndicator(billId, parentId);
  }

  /**
   * Stop typing indicator for a discussion
   */
  stopTypingIndicator(billId: number, parentId?: string): void {
    if (!this.isInitialized || !this.config.enableDiscussions) return;

    communityWebSocketExtension.stopTypingIndicator(billId, parentId);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return UnifiedWebSocketManager.getInstance().isConnected();
  }

  /**
   * Get initialization status
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CommunityWebSocketConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Community WebSocket middleware configuration updated', { 
      component: 'CommunityWebSocketMiddleware',
      config: this.config 
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (!this.isInitialized) return;

    // Clean up community services
    communityWebSocketExtension.cleanup();
    communityBackendService.cleanup();
    notificationService.cleanup();

    this.isInitialized = false;
    logger.info('Community WebSocket middleware cleaned up', { 
      component: 'CommunityWebSocketMiddleware' 
    });
  }
}

// Export singleton instance
export const communityWebSocketMiddleware = new CommunityWebSocketMiddleware();

// Export class and types for testing
export { CommunityWebSocketMiddleware };
export type { CommunityWebSocketConfig };