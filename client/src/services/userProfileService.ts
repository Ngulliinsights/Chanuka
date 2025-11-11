/**
 * User Profile Service
 * Handles user profile management, preferences, and backend integration
 */

import { apiService } from './apiService';
import { logger } from '../utils/logger';
import { User, PrivacySettings, NotificationPreferences } from '../types/auth';
import { mockUserData } from './mockUserData';

export interface UserProfile extends User {
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  avatar_url?: string;
  cover_image_url?: string;
  civic_engagement_score: number;
  badges: UserBadge[];
  achievements: UserAchievement[];
  activity_summary: ActivitySummary;
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  category: 'engagement' | 'expertise' | 'community' | 'achievement';
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  max_progress: number;
  completed: boolean;
  completed_at?: string;
  reward_points: number;
}

export interface ActivitySummary {
  bills_tracked: number;
  comments_posted: number;
  discussions_started: number;
  votes_cast: number;
  expert_contributions: number;
  community_score: number;
  streak_days: number;
  last_active: string;
}

export interface SavedBill {
  id: string;
  bill_id: string;
  user_id: string;
  saved_at: string;
  notes?: string;
  tags: string[];
  notification_enabled: boolean;
  bill: {
    id: string;
    title: string;
    bill_number: string;
    status: string;
    urgency_level: string;
    last_updated: string;
  };
}

export interface UserEngagementHistory {
  id: string;
  user_id: string;
  action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
  entity_id: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  notification_preferences: NotificationPreferences;
  privacy_settings: PrivacySettings;
  dashboard_layout: 'compact' | 'comfortable' | 'spacious';
  default_bill_view: 'grid' | 'list';
  auto_save_drafts: boolean;
  show_onboarding_tips: boolean;
}

class UserProfileService {
  /**
   * Get complete user profile with all related data
   */
  async getUserProfile(userId?: string): Promise<UserProfile> {
    try {
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
        return mockUserData.profile;
      }

      const endpoint = userId ? `/api/users/${userId}/profile` : '/api/users/profile';
      const response = await apiService.get<UserProfile>(endpoint);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (error) {
      logger.error('Failed to fetch user profile', { component: 'UserProfileService' }, error);
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await apiService.put<UserProfile>('/api/users/profile', profileData);
      
      if (response.success) {
        logger.info('User profile updated successfully', { 
          component: 'UserProfileService',
          updatedFields: Object.keys(profileData)
        });
        return response.data;
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      logger.error('Failed to update user profile', { component: 'UserProfileService' }, error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await apiService.put<UserPreferences>('/api/users/preferences', preferences);
      
      if (response.success) {
        logger.info('User preferences updated successfully', { 
          component: 'UserProfileService',
          updatedPreferences: Object.keys(preferences)
        });
        return response.data;
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      logger.error('Failed to update user preferences', { component: 'UserProfileService' }, error);
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
  }): Promise<{ bills: SavedBill[]; total: number; page: number; totalPages: number }> {
    try {
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedBills = mockUserData.savedBills.slice(startIndex, endIndex);
        
        return {
          bills: paginatedBills,
          total: mockUserData.savedBills.length,
          page,
          totalPages: Math.ceil(mockUserData.savedBills.length / limit)
        };
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters && Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        )
      });

      const response = await apiService.get<{
        bills: SavedBill[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/api/users/saved-bills?${params}`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error('Failed to fetch saved bills');
      }
    } catch (error) {
      logger.error('Failed to fetch saved bills', { component: 'UserProfileService' }, error);
      throw error;
    }
  }

  /**
   * Save a bill to user's collection
   */
  async saveBill(billId: string, notes?: string, tags: string[] = []): Promise<SavedBill> {
    try {
      const response = await apiService.post<SavedBill>('/api/users/saved-bills', {
        bill_id: billId,
        notes,
        tags,
        notification_enabled: true
      });
      
      if (response.success) {
        logger.info('Bill saved successfully', { 
          component: 'UserProfileService',
          billId,
          tags: tags.length
        });
        return response.data;
      } else {
        throw new Error('Failed to save bill');
      }
    } catch (error) {
      logger.error('Failed to save bill', { component: 'UserProfileService', billId }, error);
      throw error;
    }
  }

  /**
   * Remove a bill from user's saved collection
   */
  async unsaveBill(billId: string): Promise<void> {
    try {
      const response = await apiService.delete(`/api/users/saved-bills/${billId}`);
      
      if (response.success) {
        logger.info('Bill removed from saved collection', { 
          component: 'UserProfileService',
          billId
        });
      } else {
        throw new Error('Failed to remove saved bill');
      }
    } catch (error) {
      logger.error('Failed to remove saved bill', { component: 'UserProfileService', billId }, error);
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
  }): Promise<SavedBill> {
    try {
      const response = await apiService.patch<SavedBill>(`/api/users/saved-bills/${billId}`, updates);
      
      if (response.success) {
        logger.info('Saved bill updated successfully', { 
          component: 'UserProfileService',
          billId,
          updates: Object.keys(updates)
        });
        return response.data;
      } else {
        throw new Error('Failed to update saved bill');
      }
    } catch (error) {
      logger.error('Failed to update saved bill', { component: 'UserProfileService', billId }, error);
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
    history: UserEngagementHistory[]; 
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

      const response = await apiService.get(`/api/users/engagement-history?${params}`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error('Failed to fetch engagement history');
      }
    } catch (error) {
      logger.error('Failed to fetch engagement history', { component: 'UserProfileService' }, error);
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
      const response = await apiService.post('/api/users/engagement', action);
      
      if (!response.success) {
        // Don't throw error for tracking failures, just log
        logger.warn('Failed to track engagement', { 
          component: 'UserProfileService',
          action: action.action_type,
          entity: action.entity_type
        });
      }
    } catch (error) {
      // Silent failure for engagement tracking
      logger.warn('Engagement tracking failed', { component: 'UserProfileService' }, error);
    }
  }

  /**
   * Get user achievements and progress
   */
  async getAchievements(): Promise<{
    badges: UserBadge[];
    achievements: UserAchievement[];
    next_milestones: UserAchievement[];
  }> {
    try {
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay
        return {
          badges: mockUserData.badges,
          achievements: mockUserData.achievements,
          next_milestones: mockUserData.achievements.filter(a => !a.completed).slice(0, 3)
        };
      }

      const response = await apiService.get('/api/users/achievements');
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error('Failed to fetch achievements');
      }
    } catch (error) {
      logger.error('Failed to fetch achievements', { component: 'UserProfileService' }, error);
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

      const response = await apiService.post<{ avatar_url: string }>('/api/users/avatar', formData);
      
      if (response.success) {
        logger.info('Avatar uploaded successfully', { 
          component: 'UserProfileService',
          fileSize: file.size,
          fileType: file.type
        });
        return response.data;
      } else {
        throw new Error('Failed to upload avatar');
      }
    } catch (error) {
      logger.error('Failed to upload avatar', { component: 'UserProfileService' }, error);
      throw error;
    }
  }

  /**
   * Get user dashboard data with personalized content
   */
  async getDashboardData(): Promise<{
    profile: UserProfile;
    recent_activity: UserEngagementHistory[];
    saved_bills: SavedBill[];
    trending_bills: any[];
    recommendations: any[];
    notifications: any[];
    civic_score_trend: Array<{ date: string; score: number }>;
  }> {
    try {
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
        return mockUserData.dashboardData;
      }

      const response = await apiService.get('/api/users/dashboard');
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      logger.error('Failed to fetch dashboard data', { component: 'UserProfileService' }, error);
      throw error;
    }
  }
}

export const userProfileService = new UserProfileService();