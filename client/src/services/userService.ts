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
 * This service replaces: authBackendService.ts, user-backend-service.ts, userProfileService.ts
 */

import { userApiService } from '../core/api/user';
import { authApiService } from '../core/api/auth';
import { globalConfig } from '../core/api/config';
import { logger } from '../utils/logger';

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

  constructor() {
    this.baseUrl = globalConfig.get('api').baseUrl;
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      this.validateEmail(credentials.email);

      const session: AuthSession = await authApiService.login(credentials);

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

      const session: AuthSession = await authApiService.register(data);
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
      await authApiService.logout();
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

      const user: AuthUser = await authApiService.getCurrentUser();
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
      return await userApiService.getUserProfile(userId);
    } catch (error) {
      logger.error('Failed to fetch user profile', { userId, error });
      throw error;
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      return await userApiService.updateProfile(updates);
    } catch (error) {
      logger.error('Failed to update user profile', { error });
      throw error;
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      return await userApiService.updatePreferences(preferences);
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
      return await userApiService.getDashboardData();
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
      return await userApiService.getAchievements();
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
      return await userApiService.getSavedBills(page, limit, filters);
    } catch (error) {
      logger.error('Failed to fetch saved bills', { error });
      throw error;
    }
  }

  async saveBill(billId: string, notes?: string, tags: string[] = []): Promise<SavedBill> {
    try {
      return await userApiService.saveBill(billId, notes, tags);
    } catch (error) {
      logger.error('Failed to save bill', { billId, error });
      throw error;
    }
  }

  async unsaveBill(billId: string): Promise<void> {
    try {
      await userApiService.unsaveBill(billId);
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
      return await userApiService.updateSavedBill(billId, updates);
    } catch (error) {
      logger.error('Failed to update saved bill', { billId, error });
      throw error;
    }
  }

  // ============================================================================
  // ENGAGEMENT TRACKING
  // ============================================================================

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
      return await userApiService.getEngagementHistory(page, limit, filters);
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
      await userApiService.trackEngagement(action);
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
  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.updateProfile(updates);
  }

  async getUserPreferences(): Promise<UserPreferences> {
    // This would be implemented when preferences API is available
    throw new Error('Method not yet implemented');
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.updatePreferences(preferences);
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const userService = new UserService();

// Types are exported at the top of the file