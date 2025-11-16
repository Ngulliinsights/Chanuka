/**
 * User API Service
 * Core API communication layer for user functionality
 * Extracted from services/userProfileService.ts during infrastructure consolidation
 */

import { globalApiClient } from './client';
import { logger } from '../../utils/logger';

// Re-export types from the main user service for convenience
export type {
  UserProfile,
  UserBadge,
  UserAchievement,
  ActivitySummary,
  SavedBill,
  UserEngagementHistory,
  UserPreferences
} from '../../services/userService';

/**
 * User API Service Class
 * Handles all user-related API communication
 */
export class UserApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api';
  }

  /**
   * Get complete user profile with all related data
   */
  async getUserProfile(userId?: string): Promise<any> {
    try {
      const endpoint = userId ? `${this.baseUrl}/users/${userId}/profile` : `${this.baseUrl}/users/profile`;
      const response = await globalApiClient.get(endpoint);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user profile', {
        component: 'UserApi',
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(profileData: any): Promise<any> {
    try {
      const response = await globalApiClient.put(
        `${this.baseUrl}/users/profile`,
        profileData,
        { skipCache: true }
      );

      logger.info('User profile updated successfully', {
        component: 'UserApi',
        updatedFields: Object.keys(profileData)
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update user profile', {
        component: 'UserApi',
        error
      });
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: any): Promise<any> {
    try {
      const response = await globalApiClient.put(
        `${this.baseUrl}/users/preferences`,
        preferences,
        { skipCache: true }
      );

      logger.info('User preferences updated successfully', {
        component: 'UserApi',
        updatedPreferences: Object.keys(preferences)
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update user preferences', {
        component: 'UserApi',
        error
      });
      throw error;
    }
  }

  /**
   * Get user's saved bills with pagination
   */
  async getSavedBills(page = 1, limit = 20, filters?: {
    status?: string;
    urgency?: string;
    tags?: string[];
  }): Promise<{ bills: any[]; total: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters && Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        )
      });

      const response = await globalApiClient.get(`${this.baseUrl}/users/saved-bills?${params}`);
      return response.data as { bills: any[]; total: number; page: number; totalPages: number };
    } catch (error) {
      logger.error('Failed to fetch saved bills', {
        component: 'UserApi',
        error
      });
      throw error;
    }
  }

  /**
   * Save a bill to user's collection
   */
  async saveBill(billId: string, notes?: string, tags: string[] = []): Promise<any> {
    try {
      const response = await globalApiClient.post(
        `${this.baseUrl}/users/saved-bills`,
        {
          bill_id: billId,
          notes,
          tags,
          notification_enabled: true
        },
        { skipCache: true }
      );

      logger.info('Bill saved successfully', {
        component: 'UserApi',
        billId,
        tags: tags.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to save bill', {
        component: 'UserApi',
        billId,
        error
      });
      throw error;
    }
  }

  /**
   * Remove a bill from user's saved collection
   */
  async unsaveBill(billId: string): Promise<void> {
    try {
      await globalApiClient.delete(`${this.baseUrl}/users/saved-bills/${billId}`, { skipCache: true });

      logger.info('Bill removed from saved collection', {
        component: 'UserApi',
        billId
      });
    } catch (error) {
      logger.error('Failed to remove saved bill', {
        component: 'UserApi',
        billId,
        error
      });
      throw error;
    }
  }

  /**
   * Update saved bill metadata (notes, tags, notifications)
   */
  async updateSavedBill(billId: string, updates: {
    notes?: string;
    tags?: string[];
    notification_enabled?: boolean;
  }): Promise<any> {
    try {
      const response = await globalApiClient.patch(
        `${this.baseUrl}/users/saved-bills/${billId}`,
        updates,
        { skipCache: true }
      );

      logger.info('Saved bill updated successfully', {
        component: 'UserApi',
        billId,
        updates: Object.keys(updates)
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update saved bill', {
        component: 'UserApi',
        billId,
        error
      });
      throw error;
    }
  }

  /**
   * Get user engagement history with pagination
   */
  async getEngagementHistory(page = 1, limit = 50, filters?: {
    action_type?: string;
    entity_type?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    history: any[];
    total: number;
    page: number;
    totalPages: number;
    analytics: {
      most_active_day: string;
      total_actions: number;
      action_breakdown: Record<string, number>;
    };
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters && Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        )
      });

      const response = await globalApiClient.get(`${this.baseUrl}/users/engagement-history?${params}`);
      return response.data as {
        history: any[];
        total: number;
        page: number;
        totalPages: number;
        analytics: {
          most_active_day: string;
          total_actions: number;
          action_breakdown: Record<string, number>;
        };
      };
    } catch (error) {
      logger.error('Failed to fetch engagement history', {
        component: 'UserApi',
        error
      });
      throw error;
    }
  }

  /**
   * Track user engagement action
   */
  async trackEngagement(action: {
    action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
    entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
    entity_id: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await globalApiClient.post(
        `${this.baseUrl}/users/engagement`,
        action,
        { skipCache: true }
      );
    } catch (error) {
      // Silent failure for engagement tracking
      logger.warn('Engagement tracking failed', {
        component: 'UserApi',
        action: action.action_type,
        entity: action.entity_type,
        error
      });
    }
  }

  /**
   * Get user achievements and progress
   */
  async getAchievements(): Promise<{
    badges: any[];
    achievements: any[];
    next_milestones: any[];
  }> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/users/achievements`);
      return response.data as {
        badges: any[];
        achievements: any[];
        next_milestones: any[];
      };
    } catch (error) {
      logger.error('Failed to fetch achievements', {
        component: 'UserApi',
        error
      });
      throw error;
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await globalApiClient.post(
        `${this.baseUrl}/users/avatar`,
        formData,
        { skipCache: true }
      );

      logger.info('Avatar uploaded successfully', {
        component: 'UserApi',
        fileSize: file.size,
        fileType: file.type
      });

      return response.data as { avatar_url: string };
    } catch (error) {
      logger.error('Failed to upload avatar', {
        component: 'UserApi',
        error
      });
      throw error;
    }
  }

  /**
   * Get user dashboard data with personalized content
   */
  async getDashboardData(): Promise<{
    profile: any;
    recent_activity: any[];
    saved_bills: any[];
    trending_bills: any[];
    recommendations: any[];
    notifications: any[];
    civic_score_trend: Array<{ date: string; score: number }>;
  }> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/users/dashboard`);
      return response.data as {
        profile: any;
        recent_activity: any[];
        saved_bills: any[];
        trending_bills: any[];
        recommendations: any[];
        notifications: any[];
        civic_score_trend: Array<{ date: string; score: number }>;
      };
    } catch (error) {
      logger.error('Failed to fetch dashboard data', {
        component: 'UserApi',
        error
      });
      throw error;
    }
  }
}

// Global user API service instance
export const userApiService = new UserApiService();