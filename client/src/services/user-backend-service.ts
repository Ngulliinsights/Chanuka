/**
 * User Backend Service
 * 
 * Handles all backend integration for user dashboard functionality including
 * saved bills, tracking, engagement history, analytics, and preferences.
 */

import { globalConfig } from '../core/api/config';
import { logger } from '../utils/logger';
import type {
  UserDashboardData,
  TrackedBill,
  EngagementHistoryItem,
  CivicImpactMetrics,
  BillRecommendation,
  PrivacyControls,
  DataExportRequest,
  DashboardPreferences
} from '../types/user-dashboard';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  interests: string[];
  civic_engagement_score: number;
  verification_status: 'unverified' | 'verified' | 'expert';
  joined_date: string;
  last_active: string;
  activity_summary: {
    bills_tracked: number;
    comments_posted: number;
    streak_days: number;
    community_score: number;
    votes_cast: number;
    expert_contributions: number;
  };
}

export interface SavedBill {
  id: string;
  user_id: string;
  bill_id: number;
  bill: {
    id: number;
    bill_number: string;
    title: string;
    summary: string;
    status: string;
    urgency_level: string;
  };
  saved_at: string;
  notes?: string;
  tags: string[];
  notifications_enabled: boolean;
}

export interface UserEngagementActivity {
  id: string;
  user_id: string;
  action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  entity_type: 'bill' | 'comment' | 'dashboard' | 'profile';
  entity_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface UserNotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  bill_status_changes: boolean;
  new_comments: boolean;
  expert_analysis: boolean;
  weekly_digest: boolean;
  trending_bills: boolean;
  community_updates: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  criteria_met: Record<string, any>;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  title: string;
  description: string;
  progress: number;
  max_progress: number;
  completed: boolean;
  completed_at?: string;
  category: 'participation' | 'quality' | 'influence' | 'consistency';
}

class UserBackendService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = globalConfig.get('api').baseUrl;
    this.timeout = globalConfig.get('api').timeout;
  }

  // User Profile Management
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/profile`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user profile', { userId, error });
      throw new Error('Failed to fetch user profile');
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/profile`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update user profile', { userId, updates, error });
      throw new Error('Failed to update user profile');
    }
  }

  // Dashboard Data
  async getDashboardData(userId: string, timeFilter?: { start?: string; end?: string }): Promise<UserDashboardData> {
    try {
      const params = new URLSearchParams();
      if (timeFilter?.start) params.append('start_date', timeFilter.start);
      if (timeFilter?.end) params.append('end_date', timeFilter.end);

      const response = await this.makeRequest(`/api/users/${userId}/dashboard?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch dashboard data', { userId, timeFilter, error });
      throw new Error('Failed to fetch dashboard data');
    }
  }

  // Saved Bills Management
  async getSavedBills(userId: string, page: number = 1, limit: number = 20): Promise<{
    bills: SavedBill[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await this.makeRequest(`/api/users/${userId}/saved-bills?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch saved bills', { userId, page, limit, error });
      throw new Error('Failed to fetch saved bills');
    }
  }

  async saveBill(userId: string, billId: number, options?: {
    notes?: string;
    tags?: string[];
    notifications?: boolean;
  }): Promise<SavedBill> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/saved-bills`, {
        method: 'POST',
        body: JSON.stringify({
          bill_id: billId,
          notes: options?.notes,
          tags: options?.tags || [],
          notifications_enabled: options?.notifications ?? true
        })
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to save bill', { userId, billId, options, error });
      throw new Error('Failed to save bill');
    }
  }

  async unsaveBill(userId: string, billId: number): Promise<void> {
    try {
      await this.makeRequest(`/api/users/${userId}/saved-bills/${billId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      logger.error('Failed to unsave bill', { userId, billId, error });
      throw new Error('Failed to unsave bill');
    }
  }

  async updateSavedBill(userId: string, billId: number, updates: {
    notes?: string;
    tags?: string[];
    notifications_enabled?: boolean;
  }): Promise<SavedBill> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/saved-bills/${billId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update saved bill', { userId, billId, updates, error });
      throw new Error('Failed to update saved bill');
    }
  }

  // Bill Tracking
  async trackBill(userId: string, billId: number, notificationSettings?: {
    status_changes?: boolean;
    new_comments?: boolean;
    expert_analysis?: boolean;
  }): Promise<TrackedBill> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/tracked-bills`, {
        method: 'POST',
        body: JSON.stringify({
          bill_id: billId,
          notifications: notificationSettings || {
            status_changes: true,
            new_comments: false,
            expert_analysis: true
          }
        })
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to track bill', { userId, billId, notificationSettings, error });
      throw new Error('Failed to track bill');
    }
  }

  async untrackBill(userId: string, billId: number): Promise<void> {
    try {
      await this.makeRequest(`/api/users/${userId}/tracked-bills/${billId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      logger.error('Failed to untrack bill', { userId, billId, error });
      throw new Error('Failed to untrack bill');
    }
  }

  async updateBillTracking(userId: string, billId: number, notifications: {
    status_changes?: boolean;
    new_comments?: boolean;
    expert_analysis?: boolean;
  }): Promise<TrackedBill> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/tracked-bills/${billId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notifications })
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update bill tracking', { userId, billId, notifications, error });
      throw new Error('Failed to update bill tracking');
    }
  }

  // Engagement History
  async getEngagementHistory(userId: string, options?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    activities: UserEngagementActivity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const params = new URLSearchParams({
        page: (options?.page || 1).toString(),
        limit: (options?.limit || 50).toString()
      });

      if (options?.type) params.append('type', options.type);
      if (options?.startDate) params.append('start_date', options.startDate);
      if (options?.endDate) params.append('end_date', options.endDate);

      const response = await this.makeRequest(`/api/users/${userId}/engagement-history?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch engagement history', { userId, options, error });
      throw new Error('Failed to fetch engagement history');
    }
  }

  async trackEngagement(userId: string, activity: {
    action_type: string;
    entity_type: string;
    entity_id: string;
    metadata?: Record<string, any>;
  }): Promise<UserEngagementActivity> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/engagement`, {
        method: 'POST',
        body: JSON.stringify(activity)
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to track engagement', { userId, activity, error });
      throw new Error('Failed to track engagement');
    }
  }

  // Civic Engagement Analytics
  async getCivicMetrics(userId: string, timeRange?: string): Promise<CivicImpactMetrics> {
    try {
      const params = new URLSearchParams();
      if (timeRange) params.append('time_range', timeRange);

      const response = await this.makeRequest(`/api/users/${userId}/civic-metrics?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch civic metrics', { userId, timeRange, error });
      throw new Error('Failed to fetch civic metrics');
    }
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/badges`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user badges', { userId, error });
      throw new Error('Failed to fetch user badges');
    }
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/achievements`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user achievements', { userId, error });
      throw new Error('Failed to fetch user achievements');
    }
  }

  // Recommendations
  async getRecommendations(userId: string, limit: number = 10): Promise<BillRecommendation[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });

      const response = await this.makeRequest(`/api/users/${userId}/recommendations?${params.toString()}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch recommendations', { userId, limit, error });
      throw new Error('Failed to fetch recommendations');
    }
  }

  async dismissRecommendation(userId: string, billId: number, reason?: string): Promise<void> {
    try {
      await this.makeRequest(`/api/users/${userId}/recommendations/${billId}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    } catch (error) {
      logger.error('Failed to dismiss recommendation', { userId, billId, reason, error });
      throw new Error('Failed to dismiss recommendation');
    }
  }

  async provideFeedback(userId: string, billId: number, feedback: {
    relevant: boolean;
    reason?: string;
    rating?: number;
  }): Promise<void> {
    try {
      await this.makeRequest(`/api/users/${userId}/recommendations/${billId}/feedback`, {
        method: 'POST',
        body: JSON.stringify(feedback)
      });
    } catch (error) {
      logger.error('Failed to provide recommendation feedback', { userId, billId, feedback, error });
      throw new Error('Failed to provide recommendation feedback');
    }
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<DashboardPreferences> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/preferences`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user preferences', { userId, error });
      throw new Error('Failed to fetch user preferences');
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<DashboardPreferences>): Promise<DashboardPreferences> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/preferences`, {
        method: 'PATCH',
        body: JSON.stringify(preferences)
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update user preferences', { userId, preferences, error });
      throw new Error('Failed to update user preferences');
    }
  }

  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/notification-preferences`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch notification preferences', { userId, error });
      throw new Error('Failed to fetch notification preferences');
    }
  }

  async updateNotificationPreferences(userId: string, preferences: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/notification-preferences`, {
        method: 'PATCH',
        body: JSON.stringify(preferences)
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update notification preferences', { userId, preferences, error });
      throw new Error('Failed to update notification preferences');
    }
  }

  // Privacy Controls
  async getPrivacyControls(userId: string): Promise<PrivacyControls> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/privacy`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch privacy controls', { userId, error });
      throw new Error('Failed to fetch privacy controls');
    }
  }

  async updatePrivacyControls(userId: string, controls: Partial<PrivacyControls>): Promise<PrivacyControls> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/privacy`, {
        method: 'PATCH',
        body: JSON.stringify(controls)
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update privacy controls', { userId, controls, error });
      throw new Error('Failed to update privacy controls');
    }
  }

  // Data Export
  async requestDataExport(userId: string, request: DataExportRequest): Promise<{
    exportId: string;
    estimatedCompletionTime: string;
    downloadUrl?: string;
  }> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/data-export`, {
        method: 'POST',
        body: JSON.stringify(request)
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to request data export', { userId, request, error });
      throw new Error('Failed to request data export');
    }
  }

  async getDataExportStatus(userId: string, exportId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string;
    error?: string;
  }> {
    try {
      const response = await this.makeRequest(`/api/users/${userId}/data-export/${exportId}/status`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get data export status', { userId, exportId, error });
      throw new Error('Failed to get data export status');
    }
  }

  // Activity Tracking
  async recordActivity(userId: string, activity: {
    action_type: string;
    entity_type: string;
    entity_id: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Fire and forget for activity tracking
      this.makeRequest(`/api/users/${userId}/activity`, {
        method: 'POST',
        body: JSON.stringify({
          ...activity,
          timestamp: new Date().toISOString()
        })
      }).catch(error => {
        logger.warn('Failed to record activity (non-critical)', { userId, activity, error });
      });
    } catch (error) {
      // Don't throw for activity tracking failures
      logger.warn('Failed to record activity (non-critical)', { userId, activity, error });
    }
  }

  // Utility Methods
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add authentication header if available
    const token = this.getAuthToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      signal: AbortSignal.timeout(this.timeout)
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  private getAuthToken(): string | null {
    // Get token from localStorage, sessionStorage, or auth store
    // This would integrate with your authentication system
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }
}

// Export singleton instance
export const userBackendService = new UserBackendService();
export default userBackendService;