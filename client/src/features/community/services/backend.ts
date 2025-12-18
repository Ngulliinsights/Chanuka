/**
 * Community Backend Service - Community Feature
 * 
 * Migrated from client/src/services/community-backend-service.ts
 * Real API integration for community features with WebSocket support
 * for discussion threads, expert verification, and community analytics.
 */

// Type imports first
import type { DiscussionThread, Comment, CommentFormData } from '@client/types/community';

import { communityApiService } from '@client/core/api/community';
import { globalWebSocketPool } from '@client/core/api/websocket';
import { logger } from '@client/utils/logger';
import type { BillUpdateType } from '@client/core/api/websocket';

// Define proper types instead of 'any'
interface WebSocketBillUpdate {
  update: {
    type: 'new_comment' | 'comment_update' | 'expert_contribution' | 'comment_voted' | 'comment_reported';
    data: Record<string, unknown>;
  };
  bill_id: number;
  timestamp: string;
}

interface WebSocketNotification {
  type: 'community_activity' | 'expert_verification' | 'moderation_action' | 
        'comment_reply' | 'expert_insight' | 'campaign_update' | 'petition_milestone';
  userId?: string;
  verificationType?: string;
  credibilityScore?: number;
  commentId?: string;
  parentId?: string;
  billId?: number;
  authorName?: string;
  insight?: string;
  expertName?: string;
  campaignId?: string;
  updateType?: string;
  newCount?: number;
  milestone?: number;
  petitionId?: string;
  currentSignatures?: number;
  goal?: number;
  timestamp: string;
}

interface CommentQueryOptions {
  sort?: 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
  expertOnly?: boolean;
  limit?: number;
  offset?: number;
}

interface WebSocketUpdateType {
  type: 'new_comment';
}

class CommunityBackendService {
  private baseUrl: string;
  private isInitialized = false;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize the service with WebSocket integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.testBackendConnection();
      this.setupWebSocketListeners();
      
      this.isInitialized = true;
      logger.info('Community backend service initialized successfully', { 
        component: 'CommunityBackendService' 
      });
    } catch (error) {
      logger.error('Failed to initialize community backend service', { 
        component: 'CommunityBackendService' 
      }, error);
      throw error;
    }
  }

  /**
   * Test backend connection
   */
  private async testBackendConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.statusText}`);
      }
      
      logger.info('Backend connection verified', { component: 'CommunityBackendService' });
    } catch (error) {
      logger.warn('Backend connection test failed, will use fallback mode', { 
        component: 'CommunityBackendService' 
      });
    }
  }

  /**
   * Set up WebSocket listeners for real-time community features
   */
  private setupWebSocketListeners(): void {
    const wsManager = globalWebSocketPool.getConnection('ws://localhost:8080');

    // Accept unknown payloads from the WebSocket manager and narrow locally
    wsManager.on('billUpdate', (raw: unknown) => {
      const data = raw as WebSocketBillUpdate;
      if (data?.update && (
          data.update.type === 'new_comment' || 
          data.update.type === 'comment_update' ||
          data.update.type === 'expert_contribution' ||
          data.update.type === 'comment_voted' ||
          data.update.type === 'comment_reported')) {
        this.handleCommunityUpdate(data);
      }
    });

    wsManager.on('notification', (raw: unknown) => {
      const data = raw as WebSocketNotification;
      if (data && (
          data.type === 'community_activity' || 
          data.type === 'expert_verification' ||
          data.type === 'moderation_action' ||
          data.type === 'comment_reply' ||
          data.type === 'expert_insight' ||
          data.type === 'campaign_update' ||
          data.type === 'petition_milestone')) {
        this.handleCommunityNotification(data);
      }
    });

    wsManager.on('connected', () => {
      this.onWebSocketConnected();
    });

    wsManager.on('disconnected', () => {
      this.onWebSocketDisconnected();
    });
  }

  /**
   * Handle real-time community updates
   */
  private handleCommunityUpdate(data: WebSocketBillUpdate): void {
    window.dispatchEvent(new CustomEvent('communityUpdate', { 
      detail: {
        type: data.update.type,
        billId: data.bill_id,
        data: data.update.data,
        timestamp: data.timestamp
      }
    }));
  }

  /**
   * Handle community notifications
   */
  private handleCommunityNotification(data: WebSocketNotification): void {
    window.dispatchEvent(new CustomEvent('communityNotification', { 
      detail: data 
    }));

    switch (data.type) {
      case 'expert_verification':
        this.handleExpertVerificationNotification(data);
        break;
      case 'comment_reply':
        this.handleCommentReplyNotification(data);
        break;
      case 'expert_insight':
        this.handleExpertInsightNotification(data);
        break;
      case 'campaign_update':
        this.handleCampaignUpdateNotification(data);
        break;
      case 'petition_milestone':
        this.handlePetitionMilestoneNotification(data);
        break;
    }
  }

  private onWebSocketConnected(): void {
    logger.info('WebSocket connected, setting up community subscriptions', { 
      component: 'CommunityBackendService' 
    });
    this.subscribeToCommunityUpdates();
  }

  private onWebSocketDisconnected(): void {
    logger.info('WebSocket disconnected, community real-time features disabled', { 
      component: 'CommunityBackendService' 
    });
  }

  private handleExpertVerificationNotification(data: WebSocketNotification): void {
    if (!data.userId) return;
    
    window.dispatchEvent(new CustomEvent('expertVerificationUpdate', {
      detail: {
        userId: data.userId,
        verificationType: data.verificationType,
        credibilityScore: data.credibilityScore,
        timestamp: data.timestamp
      }
    }));
  }

  private handleCommentReplyNotification(data: WebSocketNotification): void {
    if (!data.commentId) return;
    
    window.dispatchEvent(new CustomEvent('commentReply', {
      detail: {
        commentId: data.commentId,
        parentId: data.parentId,
        billId: data.billId,
        authorName: data.authorName,
        timestamp: data.timestamp
      }
    }));
  }

  private handleExpertInsightNotification(data: WebSocketNotification): void {
    if (!data.billId) return;
    
    window.dispatchEvent(new CustomEvent('expertInsightAdded', {
      detail: {
        billId: data.billId,
        insight: data.insight,
        expertName: data.expertName,
        timestamp: data.timestamp
      }
    }));
  }

  private handleCampaignUpdateNotification(data: WebSocketNotification): void {
    if (!data.campaignId) return;
    
    window.dispatchEvent(new CustomEvent('campaignUpdate', {
      detail: {
        campaignId: data.campaignId,
        updateType: data.updateType,
        newCount: data.newCount,
        milestone: data.milestone,
        timestamp: data.timestamp
      }
    }));
  }

  private handlePetitionMilestoneNotification(data: WebSocketNotification): void {
    if (!data.petitionId) return;
    
    window.dispatchEvent(new CustomEvent('petitionMilestone', {
      detail: {
        petitionId: data.petitionId,
        milestone: data.milestone,
        currentSignatures: data.currentSignatures,
        goal: data.goal,
        timestamp: data.timestamp
      }
    }));
  }

  // ============================================================================
  // DISCUSSION THREAD API METHODS
  // ============================================================================

  /**
   * Get discussion thread for a bill
   */
  async getDiscussionThread(billId: number): Promise<DiscussionThread> {
    try {
      return await communityApiService.getDiscussionThread(billId);
    } catch (error) {
      logger.error('Failed to fetch discussion thread', { 
        component: 'CommunityBackendService' 
      }, error as Error);
      throw error;
    }
  }

  /**
   * Get comments for a bill with filtering and sorting
   */
  async getBillComments(
    billId: number,
    options: CommentQueryOptions = {}
  ): Promise<Comment[]> {
    try {
      return await communityApiService.getBillComments(billId, options);
    } catch (error) {
      logger.error('Failed to fetch bill comments', { 
        component: 'CommunityBackendService' 
      }, error as Error);
      throw error;
    }
  }

  /**
   * Add a new comment
   */
  async addComment(data: CommentFormData): Promise<Comment> {
    try {
      const result = await communityApiService.addComment({
        billId: data.billId,
        content: data.content,
        parentId: data.parentId
      });

      this.subscribeToDiscussion(data.billId);
      return result;
    } catch (error) {
      logger.error('Failed to add comment', { 
        component: 'CommunityBackendService' 
      }, error as Error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for a bill's discussion
   */
  subscribeToDiscussion(billId: number): void {
    const wsManager = globalWebSocketPool.getConnection('ws://localhost:8080');
    
    if (!wsManager.getConnectionStatus().connected) {
      logger.warn('WebSocket not connected. Cannot subscribe to discussion updates.', { 
        component: 'CommunityBackendService' 
      });
      return;
    }

    const updateTypes: BillUpdateType[] = ['new_comment'];
    wsManager.subscribeToBill(billId, updateTypes);
    
    logger.info('Subscribed to discussion updates', { 
      component: 'CommunityBackendService', 
      billId 
    });
  }

  /**
   * Subscribe to community-wide real-time updates
   */
  subscribeToCommunityUpdates(): void {
    const wsManager = globalWebSocketPool.getConnection('ws://localhost:8080');
    
    if (!wsManager.getConnectionStatus().connected) {
      logger.warn('WebSocket not connected. Cannot subscribe to community updates.', { 
        component: 'CommunityBackendService' 
      });
      return;
    }

    logger.info('Subscribed to community updates', { 
      component: 'CommunityBackendService' 
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.isInitialized = false;
    logger.info('Community backend service cleaned up', { 
      component: 'CommunityBackendService' 
    });
  }
}

// Export singleton instance
export const communityBackendService = new CommunityBackendService();

export default communityBackendService;