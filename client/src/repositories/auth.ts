/**
 * Auth Repository
 *
 * Domain-specific repository for authentication and user profile management
 * that extends the unified API client. Provides clean interfaces for auth operations
 * including login/logout, token management, user profiles, and RBAC.
 */

import { UnifiedApiClientImpl, globalApiClient } from '../core/api/client';
import { LoginCredentials } from '../core/api/types';
import { User, AuthResponse } from '../types/auth';
import {
  UserProfile,
  UserPreferences,
  SavedBill,
  UserEngagementHistory,
  UserBadge,
  UserAchievement,
  ActivitySummary
} from '../services/userProfileService';
import { logger } from '../utils/logger';

export interface AuthRepositoryConfig {
  baseEndpoint: string;
  cacheTTL: {
    user: number;
    profile: number;
    preferences: number;
    session: number;
  };
  tokenRefresh: {
    bufferMinutes: number;
    maxRetries: number;
  };
}

export class AuthRepository extends UnifiedApiClientImpl {
  private config: AuthRepositoryConfig;
  private currentUser: User | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor(config: AuthRepositoryConfig) {
    super({
      baseUrl: globalApiClient.getConfig().baseUrl,
      timeout: globalApiClient.getConfig().timeout,
      retry: globalApiClient.getConfig().retry,
      cache: globalApiClient.getConfig().cache,
      websocket: globalApiClient.getConfig().websocket,
      headers: globalApiClient.getConfig().headers
    });

    this.config = config;
  }

  /**
   * Authenticate user with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const endpoint = `${this.config.baseEndpoint}/auth/login`;

    const response = await this.post(endpoint, credentials);

    const result = response.data as AuthResponse;
    if (result.success && result.data) {
      this.currentUser = result.data.user;
      this.scheduleTokenRefresh(result.data.tokens?.expiresAt || Date.now() + 3600000);
      logger.info('User logged in successfully', { userId: this.currentUser.id });
    }

    return result;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    const endpoint = `${this.config.baseEndpoint}/auth/logout`;

    try {
      await this.post(endpoint);
    } catch (error) {
      // Logout should not fail the operation
      logger.warn('Logout API call failed, but proceeding with local cleanup', { error });
    }

    this.clearTokenRefreshTimer();
    this.currentUser = null;
    logger.info('User logged out successfully');
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    const endpoint = `${this.config.baseEndpoint}/auth/refresh`;

    const response = await this.post(endpoint);

    const result = response.data as AuthResponse;
    if (result.success && result.data) {
      this.scheduleTokenRefresh(result.data.tokens?.expiresAt || Date.now() + 3600000);
      logger.debug('Token refreshed successfully');
    }

    return result;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    const endpoint = `${this.config.baseEndpoint}/auth/me`;

    try {
      const response = await this.get<User>(endpoint, {
        cache: { ttl: this.config.cacheTTL.user }
      });

      this.currentUser = response.data;
      return response.data;
    } catch (error) {
      logger.error('Failed to get current user', { error });
      return null;
    }
  }

  /**
   * Get complete user profile with all related data
   */
  async getUserProfile(userId?: string): Promise<UserProfile> {
    const endpoint = userId
      ? `${this.config.baseEndpoint}/users/${userId}/profile`
      : `${this.config.baseEndpoint}/users/profile`;

    const response = await this.get<UserProfile>(endpoint, {
      cache: { ttl: this.config.cacheTTL.profile }
    });

    return response.data;
  }

  /**
   * Update user profile information
   */
  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const endpoint = `${this.config.baseEndpoint}/users/profile`;

    const response = await this.put<UserProfile>(endpoint, profileData);

    // Update current user if it's the same user
    if (this.currentUser && response.data.id === this.currentUser.id) {
      this.currentUser = { ...this.currentUser, ...profileData };
    }

    logger.info('User profile updated successfully', {
      userId: response.data.id,
      updatedFields: Object.keys(profileData)
    });

    return response.data;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const endpoint = `${this.config.baseEndpoint}/users/preferences`;

    const response = await this.put<UserPreferences>(endpoint, preferences);

    logger.info('User preferences updated successfully', {
      updatedPreferences: Object.keys(preferences)
    });

    return response.data as UserProfile;
  }

  /**
   * Get user's saved bills
   */
  async getSavedBills(
    page = 1,
    limit = 20,
    filters?: {
      status?: string;
      urgency?: string;
      tags?: string[];
    }
  ): Promise<{ bills: SavedBill[]; total: number; page: number; totalPages: number }> {
    const endpoint = `${this.config.baseEndpoint}/users/saved-bills`;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.urgency) queryParams.append('urgency', filters.urgency);
    if (filters?.tags?.length) queryParams.append('tags', filters.tags.join(','));

    const response = await this.get(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.profile }
    });

    return response.data as { bills: SavedBill[]; total: number; page: number; totalPages: number };
  }

  /**
   * Save a bill to user's collection
   */
  async saveBill(billId: string, notes?: string, tags: string[] = []): Promise<SavedBill> {
    const endpoint = `${this.config.baseEndpoint}/users/saved-bills`;

    const response = await this.post(endpoint, {
      bill_id: billId,
      notes,
      tags,
      notification_enabled: true
    });

    logger.info('Bill saved successfully', { billId, tags: tags.length });

    return response.data as SavedBill;
  }

  /**
   * Remove a bill from user's saved collection
   */
  async unsaveBill(billId: string): Promise<void> {
    const endpoint = `${this.config.baseEndpoint}/users/saved-bills/${billId}`;

    await this.delete(endpoint);

    logger.info('Bill removed from saved collection', { billId });
  }

  /**
   * Get user engagement history
   */
  async getEngagementHistory(
    page = 1,
    limit = 50,
    filters?: {
      action_type?: string;
      entity_type?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<{
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
    const endpoint = `${this.config.baseEndpoint}/users/engagement-history`;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters?.action_type) queryParams.append('action_type', filters.action_type);
    if (filters?.entity_type) queryParams.append('entity_type', filters.entity_type);
    if (filters?.date_from) queryParams.append('date_from', filters.date_from);
    if (filters?.date_to) queryParams.append('date_to', filters.date_to);

    const response = await this.get(endpoint);

    return response.data as {
      history: UserEngagementHistory[];
      total: number;
      page: number;
      totalPages: number;
      analytics: {
        most_active_day: string;
        total_actions: number;
        action_breakdown: Record<string, number>;
      };
    };
  }

  /**
   * Get user achievements and badges
   */
  async getAchievements(): Promise<{
    badges: UserBadge[];
    achievements: UserAchievement[];
    next_milestones: UserAchievement[];
  }> {
    const endpoint = `${this.config.baseEndpoint}/users/achievements`;

    const response = await this.get(endpoint, {
      cache: { ttl: this.config.cacheTTL.profile }
    });

    return response.data as {
      badges: UserBadge[];
      achievements: UserAchievement[];
      next_milestones: UserAchievement[];
    };
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const endpoint = `${this.config.baseEndpoint}/users/avatar`;

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await this.post(endpoint, formData);

    logger.info('Avatar uploaded successfully', {
      fileSize: file.size,
      fileType: file.type
    });

    return response.data as { avatar_url: string };
  }

  /**
   * Get user dashboard data
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
    const endpoint = `${this.config.baseEndpoint}/users/dashboard`;

    const response = await this.get(endpoint, {
      cache: { ttl: this.config.cacheTTL.session }
    });

    return response.data as {
      profile: UserProfile;
      recent_activity: UserEngagementHistory[];
      saved_bills: SavedBill[];
      trending_bills: any[];
      recommendations: any[];
      notifications: any[];
      civic_score_trend: Array<{ date: string; score: number }>;
    };
  }

  /**
   * Check if user has specific permission
   */
  async checkPermission(resource: string, action: string): Promise<boolean> {
    const endpoint = `${this.config.baseEndpoint}/auth/check-permission`;

    try {
      const response = await this.post<{ granted: boolean }>(endpoint, {
        resource,
        action
      });

      return response.data.granted;
    } catch (error) {
      logger.error('Permission check failed', { resource, action, error });
      return false;
    }
  }

  /**
   * Get user roles and permissions
   */
  async getUserRoles(userId?: string): Promise<any[]> {
    const endpoint = userId
      ? `${this.config.baseEndpoint}/users/${userId}/roles`
      : `${this.config.baseEndpoint}/users/roles`;

    const response = await this.get<any[]>(endpoint, {
      cache: { ttl: this.config.cacheTTL.user }
    });

    return response.data;
  }

  /**
   * Get active sessions for current user
   */
  async getActiveSessions(): Promise<any[]> {
    const endpoint = `${this.config.baseEndpoint}/auth/sessions`;

    const response = await this.get<any[]>(endpoint, {
      cache: { ttl: this.config.cacheTTL.session }
    });

    return response.data;
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId: string): Promise<void> {
    const endpoint = `${this.config.baseEndpoint}/auth/sessions/${sessionId}`;

    await this.delete(endpoint);

    logger.info('Session terminated', { sessionId });
  }

  /**
   * Terminate all other sessions
   */
  async terminateAllOtherSessions(): Promise<void> {
    const endpoint = `${this.config.baseEndpoint}/auth/sessions/others`;

    await this.delete(endpoint);

    logger.info('All other sessions terminated');
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    this.clearTokenRefreshTimer();

    const refreshTime = expiresAt - Date.now() - (this.config.tokenRefresh.bufferMinutes * 60 * 1000);

    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(async () => {
        try {
          await this.refreshToken();
        } catch (error) {
          logger.error('Automatic token refresh failed', { error });
        }
      }, refreshTime);
    }
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get current user without API call
   */
  getCurrentUserSync(): User | null {
    return this.currentUser;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearTokenRefreshTimer();
    this.currentUser = null;
  }
}

// Default configuration
const defaultConfig: AuthRepositoryConfig = {
  baseEndpoint: '/api',
  cacheTTL: {
    user: 10 * 60 * 1000, // 10 minutes
    profile: 5 * 60 * 1000, // 5 minutes
    preferences: 30 * 60 * 1000, // 30 minutes
    session: 2 * 60 * 1000 // 2 minutes
  },
  tokenRefresh: {
    bufferMinutes: 5,
    maxRetries: 3
  }
};

// Export singleton instance
export const authRepository = new AuthRepository(defaultConfig);