/**
 * Community API Service
 * Core API communication layer for community functionality
 * Extracted from services/community-backend-service.ts during infrastructure consolidation
 */

import { globalApiClient } from './client';
import { logger } from '../../utils/logger';

// Re-export types from the correct type files
export type {
  DiscussionThread,
  Comment,
  CommentFormData,
  CommentReport,
  ModerationAction,
  ModerationViolationType
} from '../../types/discussion';

export type { Expert } from '../../types/expert';

export type {
  ActivityItem,
  TrendingTopic,
  CommunityStats,
  LocalImpactMetrics
} from '../../types/community';

/**
 * Community API Service Class
 * Handles all community-related API communication
 */
export class CommunityApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api';
  }

  /**
   * Get discussion thread for a bill
   */
  async getDiscussionThread(billId: number): Promise<any> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/bills/${billId}/discussion`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch discussion thread', {
        component: 'CommunityApi',
        billId,
        error
      });
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
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (options.sort) params.append('sort', options.sort);
      if (options.expertOnly) params.append('expert', 'true');
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());

      const response = await globalApiClient.get(`${this.baseUrl}/community/comments/${billId}?${params.toString()}`);
      return response.data as any[];
    } catch (error) {
      logger.error('Failed to fetch bill comments', {
        component: 'CommunityApi',
        billId,
        error
      });
      throw error;
    }
  }

  /**
   * Add a new comment
   */
  async addComment(data: { billId: number; content: string; parentId?: string }): Promise<any> {
    try {
      const response = await globalApiClient.post(
        `${this.baseUrl}/community/comments`,
        {
          bill_id: data.billId,
          content: data.content,
          parent_id: data.parentId,
        },
        { skipCache: true }
      );

      logger.info('Comment added successfully', {
        component: 'CommunityApi',
        billId: data.billId,
        commentId: (response.data as any)?.id
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to add comment', {
        component: 'CommunityApi',
        billId: data.billId,
        error
      });
      throw error;
    }
  }

  /**
   * Update an existing comment
   */
  async updateComment(commentId: string, content: string): Promise<any> {
    try {
      const response = await globalApiClient.put(
        `${this.baseUrl}/community/comments/${commentId}`,
        { content },
        { skipCache: true }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to update comment', {
        component: 'CommunityApi',
        commentId,
        error
      });
      throw error;
    }
  }

  /**
   * Vote on a comment
   */
  async voteComment(commentId: string, voteType: 'up' | 'down'): Promise<any> {
    try {
      const response = await globalApiClient.post(
        `${this.baseUrl}/community/comments/${commentId}/vote`,
        { type: voteType },
        { skipCache: true }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to vote on comment', {
        component: 'CommunityApi',
        commentId,
        voteType,
        error
      });
      throw error;
    }
  }

  /**
   * Report a comment for moderation
   */
  async reportComment(
    commentId: string,
    violationType: string,
    reason: string,
    description?: string
  ): Promise<any> {
    try {
      const response = await globalApiClient.post(
        `${this.baseUrl}/community/comments/${commentId}/flag`,
        {
          flagType: violationType,
          reason,
          description,
        },
        { skipCache: true }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to report comment', {
        component: 'CommunityApi',
        commentId,
        error
      });
      throw error;
    }
  }

  /**
   * Get expert verification data
   */
  async getExpertVerification(userId: string): Promise<any> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/experts/${userId}/verification`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch expert verification', {
        component: 'CommunityApi',
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Get expert insights for a bill
   */
  async getExpertInsights(billId: number): Promise<any[]> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/bills/${billId}/expert-insights`);
      return response.data as any[];
    } catch (error) {
      logger.error('Failed to fetch expert insights', {
        component: 'CommunityApi',
        billId,
        error
      });
      throw error;
    }
  }

  /**
   * Submit expert insight
   */
  async submitExpertInsight(insight: any): Promise<any> {
    try {
      const response = await globalApiClient.post(
        `${this.baseUrl}/expert-insights`,
        insight,
        { skipCache: true }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to submit expert insight', {
        component: 'CommunityApi',
        error
      });
      throw error;
    }
  }

  /**
   * Get community activity feed
   */
  async getActivityFeed(options: {
    limit?: number;
    offset?: number;
    contentTypes?: string[];
    timeRange?: string;
    geography?: any;
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.contentTypes) {
        options.contentTypes.forEach(type => params.append('contentTypes', type));
      }
      if (options.timeRange) params.append('timeRange', options.timeRange);

      const response = await globalApiClient.get(`${this.baseUrl}/community/activity?${params.toString()}`);
      return response.data as any[];
    } catch (error) {
      logger.error('Failed to fetch activity feed', {
        component: 'CommunityApi',
        error
      });
      throw error;
    }
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(limit: number = 10): Promise<any[]> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/community/trending?limit=${limit}`);
      return response.data as any[];
    } catch (error) {
      logger.error('Failed to fetch trending topics', {
        component: 'CommunityApi',
        error
      });
      throw error;
    }
  }

  /**
   * Get community statistics
   */
  async getCommunityStats(): Promise<any> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/community/participation/stats`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch community stats', {
        component: 'CommunityApi',
        error
      });
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
  }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (location.state) params.append('state', location.state);
      if (location.district) params.append('district', location.district);
      if (location.county) params.append('county', location.county);

      const response = await globalApiClient.get(`${this.baseUrl}/community/local-impact?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch local impact metrics', {
        component: 'CommunityApi',
        location,
        error
      });
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getNotifications(options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: string[];
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.unreadOnly) params.append('unreadOnly', 'true');
      if (options.types) {
        options.types.forEach(type => params.append('types', type));
      }

      const response = await globalApiClient.get(`${this.baseUrl}/notifications?${params.toString()}`);
      return response.data as any[];
    } catch (error) {
      logger.error('Failed to fetch notifications', {
        component: 'CommunityApi',
        error
      });
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markNotificationsRead(notificationIds: string[]): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.baseUrl}/notifications/mark-read`,
        { notificationIds },
        { skipCache: true }
      );
    } catch (error) {
      logger.error('Failed to mark notifications as read', {
        component: 'CommunityApi',
        error
      });
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<any> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/notifications/preferences`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch notification preferences', {
        component: 'CommunityApi',
        error
      });
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: any): Promise<void> {
    try {
      await globalApiClient.put(
        `${this.baseUrl}/notifications/preferences`,
        preferences,
        { skipCache: true }
      );
    } catch (error) {
      logger.error('Failed to update notification preferences', {
        component: 'CommunityApi',
        error
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.baseUrl}/notifications/${notificationId}/read`,
        {},
        { skipCache: true }
      );
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        component: 'CommunityApi',
        notificationId,
        error
      });
      throw error;
    }
  }
}

// Global community API service instance
export const communityApiService = new CommunityApiService();