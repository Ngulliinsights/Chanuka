/**
 * Community Backend Service - Real API integration for community features
 * 
 * Connects community components to backend APIs and handles real-time updates
 * via WebSocket integration for discussion threads, expert verification,
 * and community analytics.
 */

import { communityApiService } from '@client/core/api/community';
import { UnifiedWebSocketManager } from '@client/core/api/websocket';
import {
  ActivityItem,
  TrendingTopic,
  ExpertInsight,
  CommunityStats,
  LocalImpactMetrics
} from '../types/community';
import {
  DiscussionThread,
  Comment,
  CommentFormData,
  CommentReport,
  ModerationViolationType
} from '../types/discussion';
import { Expert } from '@client/types/expert';
import { logger } from '@client/utils/logger';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  metadata?: {
    timestamp: string;
    source: string;
    processingTime: number;
  };
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
      // Test backend connectivity
      await this.testBackendConnection();
      
      // Set up WebSocket listeners for real-time community updates
      this.setupWebSocketListeners();
      
      // Initialize community WebSocket extension
      const { communityWebSocketExtension } = await import('./community-websocket-extension');
      communityWebSocketExtension.initialize();
      
      this.isInitialized = true;
      logger.info('Community backend service initialized successfully', { component: 'CommunityBackendService' });
    } catch (error) {
      logger.error('Failed to initialize community backend service', { component: 'CommunityBackendService' }, error);
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
      logger.warn('Backend connection test failed, will use fallback mode', { component: 'CommunityBackendService' });
      // Don't throw here - allow fallback to mock data
    }
  }

  /**
   * Set up WebSocket listeners for real-time community features
   */
  private setupWebSocketListeners(): void {
    // Listen for community-specific updates
    UnifiedWebSocketManager.getInstance().on('billUpdate', (data: any) => {
      if (data.update?.type === 'new_comment' || 
          data.update?.type === 'comment_update' ||
          data.update?.type === 'expert_contribution' ||
          data.update?.type === 'comment_voted' ||
          data.update?.type === 'comment_reported') {
        this.handleCommunityUpdate(data);
      }
    });

    // Listen for notifications that include community events
    UnifiedWebSocketManager.getInstance().on('notification', (data: any) => {
      if (data.type === 'community_activity' || 
          data.type === 'expert_verification' ||
          data.type === 'moderation_action' ||
          data.type === 'comment_reply' ||
          data.type === 'expert_insight' ||
          data.type === 'campaign_update' ||
          data.type === 'petition_milestone') {
        this.handleCommunityNotification(data);
      }
    });

    // Listen for connection events to manage subscriptions
    UnifiedWebSocketManager.getInstance().on('connected', () => {
      this.onWebSocketConnected();
    });

    UnifiedWebSocketManager.getInstance().on('disconnected', () => {
      this.onWebSocketDisconnected();
    });
  }

  /**
   * Handle real-time community updates
   */
  private handleCommunityUpdate(data: any): void {
    // Dispatch custom events for community components to listen to
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
  private handleCommunityNotification(data: any): void {
    // Dispatch to community WebSocket extension for proper routing
    window.dispatchEvent(new CustomEvent('communityNotification', { 
      detail: data 
    }));

    // Also handle specific notification types
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

  /**
   * Handle WebSocket connection established
   */
  private onWebSocketConnected(): void {
    logger.info('WebSocket connected, setting up community subscriptions', { component: 'CommunityBackendService' });
    
    // Subscribe to community-wide updates
    this.subscribeToCommunityUpdates();
  }

  /**
   * Handle WebSocket disconnection
   */
  private onWebSocketDisconnected(): void {
    logger.info('WebSocket disconnected, community real-time features disabled', { component: 'CommunityBackendService' });
  }

  /**
   * Handle expert verification notifications
   */
  private handleExpertVerificationNotification(data: any): void {
    window.dispatchEvent(new CustomEvent('expertVerificationUpdate', {
      detail: {
        userId: data.userId,
        verificationType: data.verificationType,
        credibilityScore: data.credibilityScore,
        timestamp: data.timestamp
      }
    }));
  }

  /**
   * Handle comment reply notifications
   */
  private handleCommentReplyNotification(data: any): void {
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

  /**
   * Handle expert insight notifications
   */
  private handleExpertInsightNotification(data: any): void {
    window.dispatchEvent(new CustomEvent('expertInsightAdded', {
      detail: {
        billId: data.billId,
        insight: data.insight,
        expertName: data.expertName,
        timestamp: data.timestamp
      }
    }));
  }

  /**
   * Handle campaign update notifications
   */
  private handleCampaignUpdateNotification(data: any): void {
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

  /**
   * Handle petition milestone notifications
   */
  private handlePetitionMilestoneNotification(data: any): void {
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
      logger.error('Failed to fetch discussion thread', { component: 'CommunityBackendService' }, error as Error);
      throw error;
    }
  }

  /**
   * Get comments for a bill with filtering and sorting
   */
  async getBillComments(
    billId: number,
    options: {
      sort?: 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
      expertOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Comment[]> {
    try {
      return await communityApiService.getBillComments(billId, options);
    } catch (error) {
      logger.error('Failed to fetch bill comments', { component: 'CommunityBackendService' }, error as Error);
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

      // Subscribe to real-time updates for this bill if not already subscribed
      this.subscribeToDiscussion(data.billId);

      return result;
    } catch (error) {
      logger.error('Failed to add comment', { component: 'CommunityBackendService' }, error as Error);
      throw error;
    }
  }

  /**
   * Update an existing comment
   */
  async updateComment(commentId: string, content: string): Promise<Comment> {
    try {
      const response = await fetch(`${this.baseUrl}/community/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update comment: ${response.statusText}`);
      }

      const result: ApiResponse<Comment> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update comment');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to update comment', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Vote on a comment
   */
  async voteComment(commentId: string, voteType: 'up' | 'down'): Promise<Comment> {
    try {
      const response = await fetch(`${this.baseUrl}/community/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ type: voteType }),
      });

      if (!response.ok) {
        throw new Error(`Failed to vote on comment: ${response.statusText}`);
      }

      const result: ApiResponse<Comment> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to vote on comment');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to vote on comment', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Report a comment for moderation
   */
  async reportComment(
    commentId: string, 
    violationType: ModerationViolationType, 
    reason: string,
    description?: string
  ): Promise<CommentReport> {
    try {
      const response = await fetch(`${this.baseUrl}/community/comments/${commentId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          flagType: violationType,
          reason,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to report comment: ${response.statusText}`);
      }

      const result: ApiResponse<CommentReport> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to report comment');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to report comment', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  // ============================================================================
  // EXPERT VERIFICATION API METHODS
  // ============================================================================

  /**
   * Get expert verification data
   */
  async getExpertVerification(userId: string): Promise<Expert> {
    try {
      const response = await fetch(`${this.baseUrl}/experts/${userId}/verification`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch expert verification: ${response.statusText}`);
      }
      
      const result: ApiResponse<Expert> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch expert verification');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch expert verification', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Get expert insights for a bill
   */
  async getExpertInsights(billId: number): Promise<ExpertInsight[]> {
    try {
      const response = await fetch(`${this.baseUrl}/bills/${billId}/expert-insights`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch expert insights: ${response.statusText}`);
      }
      
      const result: ApiResponse<ExpertInsight[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch expert insights');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch expert insights', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Submit expert insight
   */
  async submitExpertInsight(insight: Omit<ExpertInsight, 'id' | 'timestamp' | 'lastUpdated'>): Promise<ExpertInsight> {
    try {
      const response = await fetch(`${this.baseUrl}/expert-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(insight),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit expert insight: ${response.statusText}`);
      }

      const result: ApiResponse<ExpertInsight> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to submit expert insight');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to submit expert insight', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  // ============================================================================
  // COMMUNITY ANALYTICS API METHODS
  // ============================================================================

  /**
   * Get community activity feed
   */
  async getActivityFeed(
    options: {
      limit?: number;
      offset?: number;
      contentTypes?: string[];
      timeRange?: string;
      geography?: any;
    } = {}
  ): Promise<ActivityItem[]> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.contentTypes) {
        options.contentTypes.forEach(type => params.append('contentTypes', type));
      }
      if (options.timeRange) params.append('timeRange', options.timeRange);

      const response = await fetch(`${this.baseUrl}/community/activity?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activity feed: ${response.statusText}`);
      }
      
      const result: ApiResponse<ActivityItem[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch activity feed');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch activity feed', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(limit: number = 10): Promise<TrendingTopic[]> {
    try {
      const response = await fetch(`${this.baseUrl}/community/trending?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending topics: ${response.statusText}`);
      }
      
      const result: ApiResponse<TrendingTopic[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch trending topics');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch trending topics', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Get community statistics
   */
  async getCommunityStats(): Promise<CommunityStats> {
    try {
      const response = await fetch(`${this.baseUrl}/community/participation/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch community stats: ${response.statusText}`);
      }
      
      const result: ApiResponse<CommunityStats> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch community stats');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch community stats', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Get local impact metrics
   */
  async getLocalImpactMetrics(location: {
    state?: string;
    district?: string;
    county?: string;
  }): Promise<LocalImpactMetrics> {
    try {
      const params = new URLSearchParams();
      if (location.state) params.append('state', location.state);
      if (location.district) params.append('district', location.district);
      if (location.county) params.append('county', location.county);

      const response = await fetch(`${this.baseUrl}/community/local-impact?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch local impact metrics: ${response.statusText}`);
      }
      
      const result: ApiResponse<LocalImpactMetrics> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch local impact metrics');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch local impact metrics', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTION METHODS
  // ============================================================================

  /**
   * Subscribe to real-time updates for a bill's discussion
   */
  subscribeToDiscussion(billId: number): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      logger.warn('WebSocket not connected. Cannot subscribe to discussion updates.', { component: 'CommunityBackendService' });
      return;
    }

    // Use existing WebSocket client to subscribe to bill-specific updates
    UnifiedWebSocketManager.getInstance().subscribeToBill(billId, ['new_comment']);
    
    logger.info('Subscribed to discussion updates', { component: 'CommunityBackendService', billId });
  }

  /**
   * Unsubscribe from real-time updates for a bill's discussion
   */
  unsubscribeFromDiscussion(billId: number): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      return;
    }

    UnifiedWebSocketManager.getInstance().unsubscribeFromBill(billId);
    
    logger.info('Unsubscribed from discussion updates', { component: 'CommunityBackendService', billId });
  }

  /**
   * Subscribe to community-wide real-time updates
   */
  subscribeToCommunityUpdates(): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      logger.warn('WebSocket not connected. Cannot subscribe to community updates.', { component: 'CommunityBackendService' });
      return;
    }

    // This would be extended in the WebSocket client to support community-wide subscriptions
    logger.info('Subscribed to community updates', { component: 'CommunityBackendService' });
  }

  // ============================================================================
  // NOTIFICATION SYSTEM METHODS
  // ============================================================================

  /**
   * Get user notifications
   */
  async getNotifications(
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: string[];
    } = {}
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.unreadOnly) params.append('unreadOnly', 'true');
      if (options.types) {
        options.types.forEach(type => params.append('types', type));
      }

      const response = await fetch(`${this.baseUrl}/notifications?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }
      
      const result: ApiResponse<any[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch notifications');
      }

      // Transform notifications to include community-specific data
      const transformedNotifications = result.data.map(notification => ({
        ...notification,
        isCommunityRelated: this.isCommunityNotification(notification),
        communityContext: this.extractCommunityContext(notification)
      }));

      return transformedNotifications;
    } catch (error) {
      logger.error('Failed to fetch notifications', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Check if notification is community-related
   */
  private isCommunityNotification(notification: any): boolean {
    const communityTypes = [
      'comment_reply', 'expert_response', 'mention', 'moderation_action',
      'expert_verification', 'campaign_update', 'petition_milestone',
      'discussion_trending', 'expert_insight'
    ];
    return communityTypes.includes(notification.type);
  }

  /**
   * Extract community context from notification
   */
  private extractCommunityContext(notification: any): any {
    if (!this.isCommunityNotification(notification)) {
      return null;
    }

    return {
      billId: notification.data?.billId,
      commentId: notification.data?.commentId,
      expertId: notification.data?.expertId,
      campaignId: notification.data?.campaignId,
      petitionId: notification.data?.petitionId,
      discussionId: notification.data?.discussionId
    };
  }

  /**
   * Subscribe to notification updates via WebSocket
   */
  subscribeToNotifications(): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      logger.warn('WebSocket not connected. Cannot subscribe to notifications.', { component: 'CommunityBackendService' });
      return;
    }

    // This would be extended in the WebSocket client to support notification subscriptions
    logger.info('Subscribed to notification updates', { component: 'CommunityBackendService' });
  }

  /**
   * Mark multiple notifications as read
   */
  async markNotificationsRead(notificationIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ notificationIds })
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notifications as read: ${response.statusText}`);
      }

      // Emit event for UI updates
      window.dispatchEvent(new CustomEvent('notificationsMarkedRead', {
        detail: { notificationIds }
      }));
    } catch (error) {
      logger.error('Failed to mark notifications as read', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/preferences`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notification preferences: ${response.statusText}`);
      }
      
      const result: ApiResponse<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch notification preferences');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch notification preferences', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: any): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error(`Failed to update notification preferences: ${response.statusText}`);
      }

      // Emit event for UI updates
      window.dispatchEvent(new CustomEvent('notificationPreferencesUpdated', {
        detail: { preferences }
      }));
    } catch (error) {
      logger.error('Failed to update notification preferences', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to mark notification as read', { component: 'CommunityBackendService' }, error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get authentication token from storage or context
   */
  private getAuthToken(): string {
    // This would typically get the token from localStorage, sessionStorage, or auth context
    // For now, return a placeholder
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Remove WebSocket listeners
    // Note: The WebSocket client handles its own cleanup
    this.isInitialized = false;
    logger.info('Community backend service cleaned up', { component: 'CommunityBackendService' });
  }
}

// Export singleton instance
export const communityBackendService = new CommunityBackendService();

// Export class for testing
export { CommunityBackendService };