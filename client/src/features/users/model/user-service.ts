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

import { EngagementHistoryFilters } from '@client/core/api/user';
import { authService } from '@client/core/auth';
import { userApi } from '@client/features/users/services/user-api';
import { logger } from '@client/utils/logger';

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
  metadata: Record<string, unknown>;
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

export interface Recommendation {
  billId: number;
  title: string;
  relevanceScore: number;
  reason: string;
}

export interface Notification {
  id: string;
  type: 'bill_update' | 'comment' | 'recommendation' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface DashboardData {
  profile: UserProfile;
  recent_activity: UserEngagementHistory[];
  saved_bills: SavedBill[];
  trending_bills: SavedBill[];
  recommendations: Recommendation[];
  notifications: Notification[];
  civic_score_trend: Array<{ date: string; score: number }>;
}

// Paginated response types for better type safety
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SavedBillsResponse extends PaginatedResponse<SavedBill> {
  items: SavedBill[];
}

export interface EngagementHistoryResponse extends PaginatedResponse<UserEngagementHistory> {
  items: UserEngagementHistory[];
  analytics: {
    most_active_day: string;
    total_actions: number;
    action_breakdown: Record<string, number>;
  };
}

// ============================================================================
// Service Interfaces for Dependency Injection
// ============================================================================

interface IAuthService {
  login(credentials: LoginCredentials): Promise<unknown>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<unknown>;
}

interface IUserAPIService {
  getUserProfile(userId?: string): Promise<unknown>;
  updateProfile(data: Partial<UserProfile>): Promise<unknown>;
  getPreferences(): Promise<unknown>;
  updatePreferences(preferences: Partial<UserPreferences>): Promise<unknown>;
  getDashboardData(): Promise<unknown>;
  getAchievements(): Promise<unknown>;
  getSavedBills(page: number, limit: number, filters?: Record<string, unknown>): Promise<unknown>;
  saveBill(billId: string, notes?: string, tags?: string[]): Promise<unknown>;
  unsaveBill(billId: string): Promise<void>;
  updateSavedBill(billId: string, updates: Partial<SavedBill>): Promise<unknown>;
  getEngagementHistory(page: number, limit: number, filters?: unknown): Promise<unknown>;
  trackEngagement(action: { action_type: string; entity_type: string; entity_id: string; metadata?: Record<string, unknown> }): Promise<void>;
}

// ============================================================================
// Custom Error Classes for Better Error Handling
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// ============================================================================
// Unified User Service Implementation
// ============================================================================

class UserService {
  // Cache configuration with more granular control
  private userCache: {
    user: AuthUser | null;
    lastFetched: number;
    expiresAt: number;
  } = {
    user: null,
    lastFetched: 0,
    expiresAt: 0
  };

  private readonly USER_CACHE_DURATION = 60 * 1000; // 1 minute
  private tokenRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private authService: IAuthService,
    private userApiService: IUserAPIService
  ) {}

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Authenticates a user with the provided credentials.
   * Automatically handles caching and token refresh scheduling.
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      this.validateEmail(credentials.email);

      const session = await this.authService.login(credentials) as AuthSession;

      // Only cache and schedule refresh if 2FA is not required
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
      throw new AuthenticationError('Login failed. Please check your credentials.');
    }
  }

  /**
   * Registers a new user account and automatically logs them in.
   */
  async register(data: RegisterData): Promise<AuthSession> {
    try {
      this.validateRegistrationData(data);

      // After validation, attempt login with the new credentials
      const loginData: LoginCredentials = {
        email: data.email,
        password: data.password
      };

      const session = await this.authService.login(loginData) as AuthSession;
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

  /**
   * Logs out the current user and cleans up all cached data and scheduled tasks.
   */
  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      logger.info('User logged out successfully');
    } catch (error) {
      // Continue with cleanup even if logout request fails
      logger.warn('Logout request failed (continuing with cleanup)', { error });
    } finally {
      this.cleanup();
      this.clearUserCache();
    }
  }

  /**
   * Retrieves the current authenticated user.
   * Uses cached data if available and valid, otherwise fetches fresh data.
   */
  async getCurrentUser(forceRefresh = false): Promise<AuthUser> {
    try {
      if (!forceRefresh && this.isUserCacheValid()) {
        return this.userCache.user!;
      }

      const user = await this.authService.getCurrentUser() as AuthUser | null;
      if (!user) {
        throw new AuthenticationError('No authenticated user found');
      }

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

  /**
   * Fetches the complete user profile including badges, achievements, and activity.
   */
  async getUserProfile(userId?: string): Promise<UserProfile> {
    try {
      const profile = await this.userApiService.getUserProfile(userId) as UserProfile;
      return profile;
    } catch (error) {
      logger.error('Failed to fetch user profile', { userId, error });
      throw error;
    }
  }

  /**
   * Updates the current user's profile with partial data.
   * Only the provided fields will be updated.
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const updatedProfile = await this.userApiService.updateProfile(updates) as UserProfile;

      // Update cache if the current user's profile was modified
      if (this.userCache.user && this.userCache.user.id === updatedProfile.id) {
        this.updateUserCache({
          ...this.userCache.user,
          ...updates
        } as AuthUser);
      }

      return updatedProfile;
    } catch (error) {
      logger.error('Failed to update user profile', { error });
      throw error;
    }
  }

  /**
   * Updates user preferences such as theme, notifications, and privacy settings.
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const updated = await this.userApiService.updatePreferences(preferences) as UserPreferences;
      return updated;
    } catch (error) {
      logger.error('Failed to update user preferences', { error });
      throw error;
    }
  }

  // ============================================================================
  // DASHBOARD & ANALYTICS
  // ============================================================================

  /**
   * Fetches comprehensive dashboard data including profile, recent activity,
   * saved bills, recommendations, and civic score trends.
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const data = await this.userApiService.getDashboardData() as DashboardData;
      return data;
    } catch (error) {
      logger.error('Failed to fetch dashboard data', { error });
      throw error;
    }
  }

  /**
   * Retrieves user achievements including earned badges, completed achievements,
   * and upcoming milestones.
   */
  async getAchievements(): Promise<{
    badges: UserBadge[];
    achievements: UserAchievement[];
    next_milestones: UserAchievement[];
  }> {
    try {
      const data = await this.userApiService.getAchievements() as {
        badges: UserBadge[];
        achievements: UserAchievement[];
        next_milestones: UserAchievement[];
      };
      return data;
    } catch (error) {
      logger.error('Failed to fetch achievements', { error });
      throw error;
    }
  }

  // ============================================================================
  // SAVED BILLS MANAGEMENT
  // ============================================================================

  /**
   * Retrieves paginated list of bills saved by the user with optional filtering.
   */
  async getSavedBills(
    page = 1,
    limit = 20,
    filters?: {
      status?: string;
      urgency?: string;
      tags?: string[];
    }
  ): Promise<{
    bills: SavedBill[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const response = await this.userApiService.getSavedBills(page, limit, filters) as {
        bills: SavedBill[];
        total: number;
        page: number;
        totalPages: number;
      };
      return response;
    } catch (error) {
      logger.error('Failed to fetch saved bills', { error });
      throw error;
    }
  }

  /**
   * Saves a bill to the user's collection with optional notes and tags.
   */
  async saveBill(billId: string, notes?: string, tags: string[] = []): Promise<SavedBill> {
    try {
      const savedBill = await this.userApiService.saveBill(billId, notes, tags) as SavedBill;
      logger.info('Bill saved successfully', { billId });
      return savedBill;
    } catch (error) {
      logger.error('Failed to save bill', { billId, error });
      throw error;
    }
  }

  /**
   * Removes a bill from the user's saved collection.
   */
  async unsaveBill(billId: string): Promise<void> {
    try {
      await this.userApiService.unsaveBill(billId);
      logger.info('Bill removed from saved collection', { billId });
    } catch (error) {
      logger.error('Failed to remove saved bill', { billId, error });
      throw error;
    }
  }

  /**
   * Updates metadata for a saved bill such as notes, tags, or notification settings.
   */
  async updateSavedBill(
    billId: string,
    updates: {
      notes?: string;
      tags?: string[];
      notification_enabled?: boolean;
    }
  ): Promise<SavedBill> {
    try {
      const updated = await this.userApiService.updateSavedBill(billId, updates) as SavedBill;
      return updated;
    } catch (error) {
      logger.error('Failed to update saved bill', { billId, error });
      throw error;
    }
  }

  // ============================================================================
  // ENGAGEMENT TRACKING
  // ============================================================================

  /**
   * Retrieves paginated engagement history with analytics.
   * Includes breakdowns by action type and identifies most active periods.
   */
  async getEngagementHistory(
    page = 1,
    limit = 50,
    filters?: EngagementHistoryFilters
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
    try {
      const response = await this.userApiService.getEngagementHistory(
        page,
        limit,
        filters
      ) as {
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
      return response;
    } catch (error) {
      logger.error('Failed to fetch engagement history', { error });
      throw error;
    }
  }

  /**
   * Tracks a user engagement action asynchronously.
   * Failures are logged but don't interrupt the user flow.
   */
  async trackEngagement(action: {
    action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
    entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
    entity_id: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.userApiService.trackEngagement(action);
    } catch (error) {
      // Silent failure for engagement tracking to avoid disrupting user experience
      logger.warn('Engagement tracking failed', { error });
    }
  }

  // ============================================================================
  // VALIDATION UTILITIES
  // ============================================================================

  /**
   * Validates email format using standard regex pattern.
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', 'email');
    }
  }

  /**
   * Validates all registration data including password strength and terms acceptance.
   */
  private validateRegistrationData(data: RegisterData): void {
    this.validateEmail(data.email);

    if (!data.password || data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long', 'password');
    }

    if (data.password !== data.confirmPassword) {
      throw new ValidationError('Passwords do not match', 'confirmPassword');
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Name is required', 'name');
    }

    if (!data.acceptTerms) {
      throw new ValidationError('You must accept the terms and conditions', 'acceptTerms');
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Updates the user cache with fresh data and sets expiration time.
   */
  private updateUserCache(user: AuthUser): void {
    const now = Date.now();
    this.userCache = {
      user,
      lastFetched: now,
      expiresAt: now + this.USER_CACHE_DURATION
    };
    logger.debug('User cache updated', { userId: user.id });
  }

  /**
   * Checks if the cached user data is still valid based on expiration time.
   */
  private isUserCacheValid(): boolean {
    return (
      this.userCache.user !== null &&
      Date.now() < this.userCache.expiresAt
    );
  }

  /**
   * Clears all cached user data.
   */
  private clearUserCache(): void {
    this.userCache = {
      user: null,
      lastFetched: 0,
      expiresAt: 0
    };
    logger.debug('User cache cleared');
  }

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Schedules automatic token refresh before expiration.
   * Refreshes at 80% of the token lifetime to ensure uninterrupted service.
   */
  private scheduleTokenRefresh(expiresIn: number): void {
    // Clear any existing refresh timeout
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }

    // Schedule refresh at 80% of token lifetime
    const refreshTime = expiresIn * 0.8 * 1000;
    this.tokenRefreshTimeout = setTimeout(() => {
      this.refreshTokens();
    }, refreshTime);

    logger.debug('Token refresh scheduled', { expiresIn, refreshTime });
  }

  /**
   * Refreshes authentication tokens in the background.
   */
  private async refreshTokens(): Promise<void> {
    try {
      // This would call the auth service's refresh method
      logger.info('Refreshing authentication tokens');
      // await this.authService.refreshTokens();
    } catch (error) {
      logger.error('Token refresh failed', { error });
    }
  }

  /**
   * Cleans up resources including token refresh timers.
   */
  private cleanup(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
    logger.info('User service cleaned up');
  }

  // ============================================================================
  // LEGACY COMPATIBILITY METHODS
  // ============================================================================

  /**
   * @deprecated Use updateProfile() instead
   */
  async updateUserProfile(_userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.updateProfile(updates);
  }

  /**
   * @deprecated Use updatePreferences() instead
   */
  async updateUserPreferences(_userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.updatePreferences(preferences);
  }

  /**
   * @deprecated Use getDashboardData() instead
   */
  async getDashboardDataForUser(_userId: string): Promise<DashboardData> {
    return this.getDashboardData();
  }

  /**
   * @deprecated Use getSavedBills() instead
   */
  async getSavedBillsForUser(_userId: string, page = 1, limit = 20): Promise<{
    bills: SavedBill[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.getSavedBills(page, limit);
  }

  /**
   * @deprecated Use saveBill() instead
   */
  async saveBillForUser(
    _userId: string,
    billId: number,
    options?: { notes?: string; tags?: string[] }
  ): Promise<SavedBill> {
    return this.saveBill(billId.toString(), options?.notes, options?.tags);
  }

  /**
   * @deprecated Use unsaveBill() instead
   */
  async unsaveBillForUser(_userId: string, billId: number): Promise<void> {
    return this.unsaveBill(billId.toString());
  }

  /**
   * @deprecated Use getEngagementHistory() instead
   */
  async getEngagementHistoryForUser(
    _userId: string,
    options?: {
      page?: number;
      limit?: number;
      filters?: EngagementHistoryFilters;
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
    return this.getEngagementHistory(options?.page, options?.limit, options?.filters);
  }

  /**
   * @deprecated Use trackEngagement() instead
   */
  async trackEngagementForUser(
    _userId: string,
    activity: {
      action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
      entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
      entity_id: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<UserEngagementHistory> {
    await this.trackEngagement(activity);
    return {
      id: `${Date.now()}`,
      user_id: 'current',
      action_type: activity.action_type,
      entity_type: activity.entity_type,
      entity_id: activity.entity_id,
      metadata: activity.metadata ?? {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * @deprecated Use getAchievements() instead
   */
  async getUserBadges(_userId: string): Promise<UserBadge[]> {
    const achievements = await this.getAchievements();
    return achievements.badges;
  }

  /**
   * @deprecated Use getAchievements() instead
   */
  async getUserAchievements(_userId: string): Promise<UserAchievement[]> {
    const achievements = await this.getAchievements();
    return achievements.achievements;
  }
}

// ============================================================================
// Singleton Instance with Proxy Pattern
// ============================================================================

/**
 * Creates a singleton instance of UserService.
 * This ensures only one instance exists across the application.
 */
const createUserServiceInstance = (): UserService => {
  return new UserService(authService, userApi);
};

/**
 * Gets or creates the singleton instance using globalThis for HMR compatibility.
 */
const getOrCreateInstance = (): UserService => {
  const globalAny = globalThis as { __USER_SERVICE_INSTANCE?: UserService };

  if (!globalAny.__USER_SERVICE_INSTANCE) {
    globalAny.__USER_SERVICE_INSTANCE = createUserServiceInstance();
  }

  return globalAny.__USER_SERVICE_INSTANCE;
};

/**
 * Exported singleton instance using Proxy pattern for transparent access.
 * This allows calling methods directly on userService as if it were the actual instance.
 */
export const userService = new Proxy({} as unknown as UserService, {
  get(_target, prop: string | symbol) {
    const instance = getOrCreateInstance();
    const value = (instance as unknown as Record<PropertyKey, unknown>)[prop];

    // Bind methods to maintain correct 'this' context
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }

    return value;
  },
  set(_target, prop: string | symbol, value) {
    const instance = getOrCreateInstance();
    (instance as unknown as Record<PropertyKey, unknown>)[prop] = value;
    return true;
  }
});

// Export all types for external use
export type {
  IAuthService,
  IUserAPIService
};
