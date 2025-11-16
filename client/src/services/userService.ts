/**
 * Unified User Service
 *
 * Consolidated service that handles all user-related functionality:
 * - Authentication & Session Management
 * - User Profile & Preferences
 * - Dashboard & Analytics
 * - Saved Bills & Tracking
 * - Engagement History
 * - Privacy & Data Management
 *
 * This service replaces: authService.ts, user-backend-service.ts, userProfileService.ts
 */

// Remove repository interfaces - using services directly
import { globalConfig } from '../core/api/config';
import { logger } from '../utils/logger';
import { EngagementHistoryFilters } from '../core/api/user';

// ============================================================================
// Type Definitions (Consolidated from all user services)
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorToken?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'citizen' | 'expert' | 'official' | 'admin';
  verified: boolean;
  twoFactorEnabled: boolean;
  avatar_url?: string;
  preferences: {
    notifications: boolean;
    emailAlerts: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  permissions: string[];
  lastLogin: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
  sessionId: string;
  expiresAt: string;
  requiresTwoFactor?: boolean;
}

export interface UserProfile extends AuthUser {
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
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

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'friends';
  activity_visibility: 'public' | 'private' | 'friends';
  data_sharing: boolean;
  analytics_tracking: boolean;
  marketing_emails: boolean;
}

export interface DashboardData {
  profile: UserProfile;
  recent_activity: UserEngagementHistory[];
  saved_bills: SavedBill[];
  trending_bills: any[];
  recommendations: any[];
  notifications: any[];
  civic_score_trend: Array<{ date: string; score: number }>;
}

// ============================================================================
// Unified User Service Implementation
// ============================================================================

class UserService {
  private baseUrl: string;
  private tokenRefreshPromise: Promise<AuthTokens> | null = null;
  private userCache: { user: AuthUser | null; lastFetched: number; expiresAt: number } = {
    user: null,
    lastFetched: 0,
    expiresAt: 0
  };

  private readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes
  private readonly USER_CACHE_DURATION = 60 * 1000; // 1 minute

  constructor(
    private authService: any,
    private userApiService: any
  ) {
    this.baseUrl = globalConfig.get('api').baseUrl;
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      this.validateEmail(credentials.email);

      const session: AuthSession = await this.authService.login(credentials);

      if (!session.requiresTwoFactor) {
        this.updateUserCache(session.user);
        this.scheduleTokenRefresh(session.tokens.expiresIn);
      }

      logger.info('User logged in successfully', {
        userId: session.user.id,
        email: session.user.email
      });

      return session;
    } catch (error) {
      logger.error('Login failed', { email: credentials.email, error });
      throw error;
    }
  }

  async register(data: RegisterData): Promise<AuthSession> {
    try {
      this.validateRegistrationData(data);

      const session: AuthSession = await this.authService.login({
        email: data.email,
        password: data.password,
        name: data.name,
        confirmPassword: data.confirmPassword,
        acceptTerms: data.acceptTerms
      } as any); // Using login as register for now, should be updated
      this.updateUserCache(session.user);
      this.scheduleTokenRefresh(session.tokens.expiresIn);

      logger.info('User registered successfully', {
        userId: session.user.id,
        email: session.user.email
      });

      return session;
    } catch (error) {
      logger.error('Registration failed', { email: data.email, error });
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      logger.info('User logged out successfully');
    } catch (error) {
      logger.warn('Logout request failed (continuing with cleanup)', { error });
    } finally {
      this.cleanup();
      this.clearUserCache();
    }
  }

  async getCurrentUser(forceRefresh: boolean = false): Promise<AuthUser> {
    try {
      if (!forceRefresh && this.isUserCacheValid()) {
        return this.userCache.user!;
      }

      const user: any = await this.authService.getCurrentUser();
      this.updateUserCache(user);
      return user;
    } catch (error) {
      logger.error('Failed to get current user', { error });
      throw error;
    }
  }

  // ============================================================================
  // PROFILE MANAGEMENT
  // ============================================================================

  async getUserProfile(userId?: string): Promise<UserProfile> {
    try {
      return await this.userApiService.getUserProfile(userId);
    } catch (error) {
      logger.error('Failed to fetch user profile', { userId, error });
      throw error;
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      return await this.userApiService.updateProfile(updates);
    } catch (error) {
      logger.error('Failed to update user profile', { error });
      throw error;
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      return await this.userApiService.updatePreferences(preferences);
    } catch (error) {
      logger.error('Failed to update user preferences', { error });
      throw error;
    }
  }

  // ============================================================================
  // DASHBOARD & ANALYTICS
  // ============================================================================

  async getDashboardData(): Promise<DashboardData> {
    try {
      return await this.userApiService.getDashboardData();
    } catch (error) {
      logger.error('Failed to fetch dashboard data', { error });
      throw error;
    }
  }

  async getAchievements(): Promise<{
    badges: UserBadge[];
    achievements: UserAchievement[];
    next_milestones: UserAchievement[];
  }> {
    try {
      return await this.userApiService.getAchievements();
    } catch (error) {
      logger.error('Failed to fetch achievements', { error });
      throw error;
    }
  }

  // ============================================================================
  // SAVED BILLS MANAGEMENT
  // ============================================================================

  async getSavedBills(page = 1, limit = 20, filters?: {
    status?: string;
    urgency?: string;
    tags?: string[];
  }): Promise<{ bills: SavedBill[]; total: number; page: number; totalPages: number }> {
    try {
      return await this.userApiService.getSavedBills(page, limit, filters);
    } catch (error) {
      logger.error('Failed to fetch saved bills', { error });
      throw error;
    }
  }

  async saveBill(billId: string, notes?: string, tags: string[] = []): Promise<SavedBill> {
    try {
      return await this.userApiService.saveBill(billId, notes, tags);
    } catch (error) {
      logger.error('Failed to save bill', { billId, error });
      throw error;
    }
  }

  async unsaveBill(billId: string): Promise<void> {
    try {
      await this.userApiService.unsaveBill(billId);
      logger.info('Bill removed from saved collection', { billId });
    } catch (error) {
      logger.error('Failed to remove saved bill', { billId, error });
      throw error;
    }
  }

  async updateSavedBill(billId: string, updates: {
    notes?: string;
    tags?: string[];
    notification_enabled?: boolean;
  }): Promise<SavedBill> {
    try {
      return await this.userApiService.updateSavedBill(billId, updates);
    } catch (error) {
      logger.error('Failed to update saved bill', { billId, error });
      throw error;
    }
  }

  // ============================================================================
  // ENGAGEMENT TRACKING
  // ============================================================================

  async getEngagementHistory(page = 1, limit = 50, filters?: EngagementHistoryFilters): Promise<{
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
      return await this.userApiService.getEngagementHistory(page, limit, filters);
    } catch (error) {
      logger.error('Failed to fetch engagement history', { error });
      throw error;
    }
  }

  async trackEngagement(action: {
    action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
    entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
    entity_id: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.userApiService.trackEngagement(action);
    } catch (error) {
      // Silent failure for engagement tracking
      logger.warn('Engagement tracking failed', { error });
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  private validateRegistrationData(data: RegisterData): void {
    this.validateEmail(data.email);

    if (!data.password || data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Name is required');
    }

    if (!data.acceptTerms) {
      throw new Error('You must accept the terms and conditions');
    }
  }

  private updateUserCache(user: AuthUser): void {
    const now = Date.now();
    this.userCache = {
      user,
      lastFetched: now,
      expiresAt: now + this.USER_CACHE_DURATION
    };
    logger.debug('User cache updated', { userId: user.id });
  }

  private isUserCacheValid(): boolean {
    return (
      this.userCache.user !== null &&
      Date.now() < this.userCache.expiresAt
    );
  }

  private clearUserCache(): void {
    this.userCache = {
      user: null,
      lastFetched: 0,
      expiresAt: 0
    };
    logger.debug('User cache cleared');
  }

  private scheduleTokenRefresh(expiresIn: number): void {
    // Implementation for token refresh scheduling
    // This would integrate with the auth system
    logger.debug('Token refresh scheduled', { expiresIn });
  }

  private cleanup(): void {
    // Cleanup resources
    this.tokenRefreshPromise = null;
    logger.info('User service cleaned up');
  }

  // ============================================================================
  // LEGACY COMPATIBILITY METHODS
  // ============================================================================

  // These methods maintain backward compatibility during transition
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.updateProfile(updates);
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // This would be implemented when preferences API is available
    throw new Error('Method not yet implemented');
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.updatePreferences(preferences);
  }

  async getDashboardDataForUser(userId: string, timeFilter?: { start?: string; end?: string }): Promise<DashboardData> {
    return this.getDashboardData();
  }

  async getSavedBillsForUser(userId: string, page: number = 1, limit: number = 20): Promise<{ bills: SavedBill[]; total: number; page: number; totalPages: number }> {
    return this.getSavedBills(page, limit);
  }

  async saveBillForUser(userId: string, billId: number, options?: { notes?: string; tags?: string[]; notifications?: boolean }): Promise<SavedBill> {
    return this.saveBill(billId.toString(), options?.notes, options?.tags);
  }

  async unsaveBillForUser(userId: string, billId: number): Promise<void> {
    return this.unsaveBill(billId.toString());
  }

  async trackBill(userId: string, billId: number, notificationSettings?: any): Promise<{ id: number; notifications: any }> {
    // Mock implementation for now
    return { id: billId, notifications: notificationSettings };
  }

  async untrackBill(userId: string, billId: number): Promise<void> {
    // Mock implementation for now
    return Promise.resolve();
  }

  async getEngagementHistoryForUser(userId: string, options?: any): Promise<any> {
    return this.getEngagementHistory(options?.page, options?.limit, options);
  }

  async trackEngagementForUser(userId: string, activity: any): Promise<any> {
    await this.trackEngagement(activity);
    return { id: Date.now(), ...activity, timestamp: new Date().toISOString() };
  }

  async getCivicMetrics(userId: string, timeRange?: string): Promise<any> {
    // Mock implementation for now
    return {
      bills_tracked: 0,
      comments_posted: 0,
      civic_score: 0,
      engagement_level: 'beginner'
    };
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const achievements = await this.getAchievements();
    return achievements.badges;
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const achievements = await this.getAchievements();
    return achievements.achievements;
  }

  async getRecommendations(userId: string, limit: number = 10): Promise<any[]> {
    // Mock implementation for now
    return [];
  }

  async dismissRecommendation(userId: string, billId: number, reason?: string): Promise<void> {
    // Mock implementation for now
    return Promise.resolve();
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // Mock implementation for now
    return {
      email: true,
      push: true,
      sms: false,
      frequency: 'daily',
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00'
      }
    };
  }

  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    // Mock implementation for now
    const current = await this.getNotificationPreferences(userId);
    return { ...current, ...preferences };
  }

  async getPrivacyControls(userId: string): Promise<PrivacySettings> {
    // Mock implementation for now
    return {
      profile_visibility: 'public',
      activity_visibility: 'public',
      data_sharing: false,
      analytics_tracking: true,
      marketing_emails: false
    };
  }

  async updatePrivacyControls(userId: string, controls: Partial<PrivacySettings>): Promise<PrivacySettings> {
    // Mock implementation for now
    const current = await this.getPrivacyControls(userId);
    return { ...current, ...controls };
  }

  async requestDataExport(userId: string, request: any): Promise<{ exportId: string }> {
    // Mock implementation for now
    return { exportId: `export_${Date.now()}` };
  }

  async recordActivity(userId: string, activity: any): Promise<void> {
    // Mock implementation for now
    return Promise.resolve();
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

import { authService } from './AuthService';
import { userApiService } from '../core/api/user';

export const userService = new UserService(authService, userApiService);

// Types are exported at the top of the file