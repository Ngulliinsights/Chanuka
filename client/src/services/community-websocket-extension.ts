/**
 * Community WebSocket Extension
 * 
 * Extends the existing WebSocket client with community-specific features
 * including discussion threads, expert verification, and community analytics.
 */

import { webSocketClient } from './websocket-client';
import { logger } from '../utils/logger';

// Community-specific WebSocket message types
interface CommunityWebSocketEvents {
  // Discussion events
  'discussion:comment_added': {
    billId: number;
    comment: any;
    timestamp: string;
  };
  'discussion:comment_updated': {
    billId: number;
    commentId: string;
    updates: any;
    timestamp: string;
  };
  'discussion:comment_voted': {
    billId: number;
    commentId: string;
    voteType: 'up' | 'down';
    newCounts: { upvotes: number; downvotes: number };
    timestamp: string;
  };
  'discussion:typing_indicator': {
    billId: number;
    userId: string;
    userName: string;
    isTyping: boolean;
    parentId?: string;
    timestamp: string;
  };

  // Expert verification events
  'expert:verification_updated': {
    userId: string;
    verificationType: 'official' | 'domain' | 'identity';
    credibilityScore: number;
    timestamp: string;
  };
  'expert:insight_added': {
    billId: number;
    insight: any;
    timestamp: string;
  };

  // Community analytics events
  'community:activity_update': {
    type: 'new_activity' | 'trending_update' | 'stats_update';
    data: any;
    timestamp: string;
  };
  'community:trending_update': {
    topics: any[];
    timestamp: string;
  };

  // Moderation events
  'moderation:comment_reported': {
    commentId: string;
    reportId: string;
    timestamp: string;
  };
  'moderation:action_taken': {
    commentId: string;
    action: string;
    reason: string;
    timestamp: string;
  };

  // Notification events
  'notification:community': {
    type: 'mention' | 'reply' | 'expert_response' | 'moderation';
    title: string;
    message: string;
    data: any;
    timestamp: string;
  };
}

class CommunityWebSocketExtension {
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isInitialized = false;
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize the community WebSocket extension
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Set up listeners for existing WebSocket events that relate to community features
    this.setupExistingEventListeners();
    
    this.isInitialized = true;
    logger.info('Community WebSocket extension initialized', { component: 'CommunityWebSocketExtension' });
  }

  /**
   * Set up listeners for existing WebSocket events
   */
  private setupExistingEventListeners(): void {
    // Listen for bill updates that might include community data
    webSocketClient.on('billUpdate', (data: any) => {
      this.handleBillUpdate(data);
    });

    // Listen for notifications that might be community-related
    webSocketClient.on('notification', (data: any) => {
      this.handleNotification(data);
    });
  }

  /**
   * Handle bill updates and extract community-relevant information
   */
  private handleBillUpdate(data: any): void {
    const { bill_id, update } = data;

    switch (update.type) {
      case 'new_comment':
        this.emit('discussion:comment_added', {
          billId: bill_id,
          comment: update.data.comment,
          timestamp: update.data.timestamp || new Date().toISOString()
        });
        break;

      case 'comment_update':
        this.emit('discussion:comment_updated', {
          billId: bill_id,
          commentId: update.data.commentId,
          updates: update.data.updates,
          timestamp: update.data.timestamp || new Date().toISOString()
        });
        break;

      case 'expert_contribution':
        this.emit('expert:insight_added', {
          billId: bill_id,
          insight: update.data.insight,
          timestamp: update.data.timestamp || new Date().toISOString()
        });
        break;

      default:
        // Handle other update types as general community activity
        this.emit('community:activity_update', {
          type: 'new_activity',
          data: {
            billId: bill_id,
            updateType: update.type,
            updateData: update.data
          },
          timestamp: update.data.timestamp || new Date().toISOString()
        });
    }
  }

  /**
   * Handle notifications and route community-specific ones
   */
  private handleNotification(data: any): void {
    // Check if this is a community-related notification
    const communityTypes = ['mention', 'reply', 'expert_response', 'moderation', 'community_activity'];
    
    if (communityTypes.includes(data.type)) {
      this.emit('notification:community', {
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        timestamp: data.timestamp || new Date().toISOString()
      });
    }
  }

  // ============================================================================
  // DISCUSSION THREAD METHODS
  // ============================================================================

  /**
   * Subscribe to discussion updates for a specific bill
   */
  subscribeToDiscussion(billId: number): void {
    if (!webSocketClient.isConnected()) {
      logger.warn('WebSocket not connected. Cannot subscribe to discussion.', { component: 'CommunityWebSocketExtension' });
      return;
    }

    // Use existing WebSocket client subscription with community-specific types
    webSocketClient.subscribeToBill(billId, [
      'new_comment', 
      'comment_update', 
      'expert_contribution',
      'moderation_action'
    ]);

    logger.info('Subscribed to discussion updates', { component: 'CommunityWebSocketExtension', billId });
  }

  /**
   * Unsubscribe from discussion updates for a specific bill
   */
  unsubscribeFromDiscussion(billId: number): void {
    if (!webSocketClient.isConnected()) {
      return;
    }

    webSocketClient.unsubscribeFromBill(billId);
    
    // Clear any typing indicators for this bill
    this.clearTypingIndicators(billId);

    logger.info('Unsubscribed from discussion updates', { component: 'CommunityWebSocketExtension', billId });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(billId: number, parentId?: string): void {
    if (!webSocketClient.isConnected()) {
      logger.warn('WebSocket not connected. Cannot send typing indicator.', { component: 'CommunityWebSocketExtension' });
      return;
    }

    // Create a unique key for this typing session
    const typingKey = `${billId}-${parentId || 'root'}`;

    // Clear any existing timeout for this typing session
    const existingTimeout = this.typingTimeouts.get(typingKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Send typing indicator via existing WebSocket (this would need server support)
    // For now, we'll emit it locally and set up auto-stop
    this.emit('discussion:typing_indicator', {
      billId,
      userId: 'current_user', // This would come from auth context
      userName: 'Current User', // This would come from auth context
      isTyping: true,
      parentId,
      timestamp: new Date().toISOString()
    });

    // Auto-stop typing indicator after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      this.stopTypingIndicator(billId, parentId);
    }, 3000);

    this.typingTimeouts.set(typingKey, timeout);
  }

  /**
   * Stop typing indicator
   */
  stopTypingIndicator(billId: number, parentId?: string): void {
    const typingKey = `${billId}-${parentId || 'root'}`;

    // Clear timeout
    const existingTimeout = this.typingTimeouts.get(typingKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.typingTimeouts.delete(typingKey);
    }

    // Send stop typing indicator
    this.emit('discussion:typing_indicator', {
      billId,
      userId: 'current_user', // This would come from auth context
      userName: 'Current User', // This would come from auth context
      isTyping: false,
      parentId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Clear all typing indicators for a bill
   */
  private clearTypingIndicators(billId: number): void {
    // Clear all timeouts for this bill
    for (const [key, timeout] of this.typingTimeouts.entries()) {
      if (key.startsWith(`${billId}-`)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }
  }

  // ============================================================================
  // EXPERT VERIFICATION METHODS
  // ============================================================================

  /**
   * Subscribe to expert verification updates
   */
  subscribeToExpertUpdates(): void {
    if (!webSocketClient.isConnected()) {
      logger.warn('WebSocket not connected. Cannot subscribe to expert updates.', { component: 'CommunityWebSocketExtension' });
      return;
    }

    // This would be implemented with server-side support for expert-specific subscriptions
    logger.info('Subscribed to expert verification updates', { component: 'CommunityWebSocketExtension' });
  }

  /**
   * Notify about expert verification update
   */
  notifyExpertVerificationUpdate(userId: string, verificationType: 'official' | 'domain' | 'identity', credibilityScore: number): void {
    this.emit('expert:verification_updated', {
      userId,
      verificationType,
      credibilityScore,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================================
  // COMMUNITY ANALYTICS METHODS
  // ============================================================================

  /**
   * Subscribe to community analytics updates
   */
  subscribeToCommunityAnalytics(): void {
    if (!webSocketClient.isConnected()) {
      logger.warn('WebSocket not connected. Cannot subscribe to community analytics.', { component: 'CommunityWebSocketExtension' });
      return;
    }

    // This would be implemented with server-side support for analytics subscriptions
    logger.info('Subscribed to community analytics updates', { component: 'CommunityWebSocketExtension' });
  }

  /**
   * Update trending topics
   */
  updateTrendingTopics(topics: any[]): void {
    this.emit('community:trending_update', {
      topics,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Update community activity
   */
  updateCommunityActivity(type: 'new_activity' | 'trending_update' | 'stats_update', data: any): void {
    this.emit('community:activity_update', {
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================================
  // MODERATION METHODS
  // ============================================================================

  /**
   * Subscribe to moderation events (for moderators)
   */
  subscribeToModerationEvents(): void {
    if (!webSocketClient.isConnected()) {
      logger.warn('WebSocket not connected. Cannot subscribe to moderation events.', { component: 'CommunityWebSocketExtension' });
      return;
    }

    // This would be implemented with server-side support for moderation subscriptions
    logger.info('Subscribed to moderation events', { component: 'CommunityWebSocketExtension' });
  }

  /**
   * Notify about comment report
   */
  notifyCommentReported(commentId: string, reportId: string): void {
    this.emit('moderation:comment_reported', {
      commentId,
      reportId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify about moderation action
   */
  notifyModerationAction(commentId: string, action: string, reason: string): void {
    this.emit('moderation:action_taken', {
      commentId,
      action,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================================
  // EVENT SYSTEM METHODS
  // ============================================================================

  /**
   * Add event listener for community events
   */
  on<K extends keyof CommunityWebSocketEvents>(
    event: K, 
    callback: (data: CommunityWebSocketEvents[K]) => void
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof CommunityWebSocketEvents>(
    event: K, 
    callback: (data: CommunityWebSocketEvents[K]) => void
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit<K extends keyof CommunityWebSocketEvents>(
    event: K, 
    data: CommunityWebSocketEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners || listeners.size === 0) return;

    const listenerArray = Array.from(listeners);
    
    listenerArray.forEach(callback => {
      try {
        queueMicrotask(() => callback(data));
      } catch (error) {
        logger.error(`Error in community WebSocket event listener for '${event}':`, { component: 'CommunityWebSocketExtension' }, error);
      }
    });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return webSocketClient.isConnected();
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear all typing timeouts
    for (const timeout of this.typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.typingTimeouts.clear();

    // Clear event listeners
    this.eventListeners.clear();

    this.isInitialized = false;
    logger.info('Community WebSocket extension cleaned up', { component: 'CommunityWebSocketExtension' });
  }
}

// Export singleton instance
export const communityWebSocketExtension = new CommunityWebSocketExtension();

// Export class and types for testing
export { CommunityWebSocketExtension };
export type { CommunityWebSocketEvents };