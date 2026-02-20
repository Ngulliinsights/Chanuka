/**
 * Legacy User Service Compatibility Layer
 *
 * Provides backward compatibility for the old UserService API while
 * delegating to the new decomposed services. This allows for gradual
 * migration without breaking existing code.
 */

import {
  AuthCredentials as LoginCredentials,
  RegisterData,
  AuthSession,
  AuthUser,
  UserProfile,
  UserPreferences,
  DashboardData,
  SavedBill,
  UserEngagementHistory,
  EngagementFilters as EngagementHistoryFilters,
  Recommendation,
  Notification,
  UserBadge,
  UserAchievement,
  ActivitySummary
} from '@client/lib/services/interfaces';

// Import services directly from their source files to avoid circular dependencies
import { authService } from './auth-service';
import { userProfileService } from './profile-service';
import { dashboardService } from './dashboard-service';
import { engagementService } from './engagement-service';
import { achievementService } from './achievements-service';

// ============================================================================
// LEGACY USER SERVICE API
// ============================================================================

/**
 * Legacy UserService class that maintains backward compatibility
 * while delegating to the new decomposed services.
 */
export class UserService {
  // ============================================================================
  // AUTHENTICATION METHODS (Delegated to AuthService)
  // ============================================================================

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    return authService.login(credentials);
  }

  async register(data: RegisterData): Promise<AuthSession> {
    return authService.register(data);
  }

  async logout(): Promise<void> {
    return authService.logout();
  }

  async getCurrentUser(forceRefresh = false): Promise<AuthUser> {
    return authService.getCurrentUser(forceRefresh);
  }

  // ============================================================================
  // PROFILE MANAGEMENT (Delegated to UserProfileService)
  // ============================================================================

  async getUserProfile(userId?: string): Promise<UserProfile> {
    return userProfileService.getUserProfile(userId);
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return userProfileService.updateProfile(updates);
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return userProfileService.updatePreferences(preferences);
  }

  async updateAvatar(file: File): Promise<string> {
    return userProfileService.updateAvatar(file);
  }

  async updateCoverImage(file: File): Promise<string> {
    return userProfileService.updateCoverImage(file);
  }

  async getUserStatistics(userId?: string): Promise<ActivitySummary> {
    return userProfileService.getUserStatistics(userId);
  }

  async getUserBadges(userId?: string): Promise<UserBadge[]> {
    return userProfileService.getUserBadges(userId);
  }

  async getUserAchievements(userId?: string): Promise<UserAchievement[]> {
    return userProfileService.getUserAchievements(userId);
  }

  async getActivityHistory(
    userId?: string,
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
  }> {
    return userProfileService.getActivityHistory(userId, options);
  }

  // ============================================================================
  // DASHBOARD METHODS (Delegated to DashboardService)
  // ============================================================================

  async getDashboardData(): Promise<DashboardData> {
    return dashboardService.getDashboardData();
  }

  async getDashboardWidgets(): Promise<unknown[]> {
    return dashboardService.getDashboardWidgets();
  }

  async updateDashboardLayout(layout: unknown): Promise<void> {
    return dashboardService.updateDashboardLayout(layout);
  }

  async getUserMetrics(timeRange?: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    return dashboardService.getUserMetrics(timeRange);
  }

  async getBillRecommendations(limit?: number): Promise<Recommendation[]> {
    return dashboardService.getBillRecommendations(limit);
  }

  async getUnreadNotificationsCount(): Promise<number> {
    return dashboardService.getUnreadNotificationsCount();
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    return dashboardService.markNotificationAsRead(notificationId);
  }

  async getNotifications(page?: number, limit?: number): Promise<Notification[]> {
    return dashboardService.getNotifications(page, limit);
  }

  async clearNotifications(): Promise<void> {
    return dashboardService.clearNotifications();
  }

  // ============================================================================
  // ENGAGEMENT METHODS (Delegated to EngagementService)
  // ============================================================================

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
    return engagementService.getEngagementHistory({ page, limit, filters });
  }

  async trackEngagement(action: {
    action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
    entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
    entity_id: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    return engagementService.trackEngagement(action);
  }

  async getSessionData(): Promise<{
    sessionId: string;
    startTime: string;
    lastActivity: string;
    pageViews: number;
    actions: number;
  }> {
    return engagementService.getSessionData();
  }

  async endSession(): Promise<void> {
    return engagementService.endSession();
  }

  async getUserStreak(userId?: string): Promise<{
    current_streak: number;
    longest_streak: number;
    last_active: string;
    next_milestone: number;
  }> {
    return engagementService.getUserStreak(userId);
  }

  // ============================================================================
  // ACHIEVEMENT METHODS (Delegated to AchievementService)
  // ============================================================================

  async getAchievementDefinitions(): Promise<unknown[]> {
    return achievementService.getAchievementDefinitions();
  }


  async checkAchievementProgress(achievementId: string, userId?: string): Promise<any> {
    return achievementService.checkAchievementProgress(achievementId, userId);
  }

  async awardAchievement(achievementId: string, userId?: string): Promise<UserAchievement> {
    return achievementService.awardAchievement(achievementId, userId);
  }

  async getAchievementStats(userId?: string): Promise<{
    total_earned: number;
    total_points: number;
    completion_rate: number;
    top_categories: Array<{ category: string; count: number }>;
  }> {
    return achievementService.getAchievementStats(userId);
  }

  async getLeaderboard(category?: string, limit?: number): Promise<Array<{
    user_id: string;
    username: string;
    total_points: number;
    rank: number;
  }>> {
    return achievementService.getLeaderboard(category, limit);
  }

  // ============================================================================
  // LEGACY COMPATIBILITY METHODS
  // ============================================================================

  /**
   * @deprecated Use updateProfile() instead
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    console.warn('updateUserProfile is deprecated. Use updateProfile() instead.');
    return this.updateProfile(updates);
  }

  /**
   * @deprecated Use updatePreferences() instead
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    console.warn('updateUserPreferences is deprecated. Use updatePreferences() instead.');
    return this.updatePreferences(preferences);
  }

  /**
   * @deprecated Use getDashboardData() instead
   */
  async getDashboardDataForUser(userId: string): Promise<DashboardData> {
    console.warn('getDashboardDataForUser is deprecated. Use getDashboardData() instead.');
    return this.getDashboardData();
  }

  /**
   * @deprecated Use getSavedBills() instead
   */
  async getSavedBillsForUser(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{
    bills: SavedBill[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    console.warn('getSavedBillsForUser is deprecated. Use getSavedBills() instead.');
    return this.getSavedBills(page, limit);
  }

  /**
   * @deprecated Use saveBill() instead
   */
  async saveBillForUser(
    userId: string,
    billId: number,
    options?: { notes?: string; tags?: string[] }
  ): Promise<SavedBill> {
    console.warn('saveBillForUser is deprecated. Use saveBill() instead.');
    return this.saveBill(billId.toString(), options?.notes, options?.tags);
  }

  /**
   * @deprecated Use unsaveBill() instead
   */
  async unsaveBillForUser(userId: string, billId: number): Promise<void> {
    console.warn('unsaveBillForUser is deprecated. Use unsaveBill() instead.');
    return this.unsaveBill(billId.toString());
  }

  /**
   * @deprecated Use getEngagementHistory() instead
   */
  async getEngagementHistoryForUser(
    userId: string,
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
    console.warn('getEngagementHistoryForUser is deprecated. Use getEngagementHistory() instead.');
    return this.getEngagementHistory(options?.page, options?.limit, options?.filters);
  }

  /**
   * @deprecated Use trackEngagement() instead
   */
  async trackEngagementForUser(
    userId: string,
    activity: {
      action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
      entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
      entity_id: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<UserEngagementHistory> {
    console.warn('trackEngagementForUser is deprecated. Use trackEngagement() instead.');
    await this.trackEngagement(activity);
    return {
      id: `${Date.now()}`,
      user_id: userId,
      action_type: activity.action_type,
      entity_type: activity.entity_type,
      entity_id: activity.entity_id,
      metadata: activity.metadata ?? {},
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // NEW METHODS NOT IN ORIGINAL USER SERVICE
  // ============================================================================

  /**
   * Get saved bills with pagination
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
    // This would need to be implemented in a SavedBillsService
    // For now, return empty result
    return {
      bills: [],
      total: 0,
      page: 1,
      totalPages: 1
    };
  }

  /**
   * Save a bill
   */
  async saveBill(billId: string, notes?: string, tags: string[] = []): Promise<SavedBill> {
    // This would need to be implemented in a SavedBillsService
    // For now, throw error
    throw new Error('saveBill method not implemented in legacy compatibility layer');
  }

  /**
   * Remove saved bill
   */
  async unsaveBill(billId: string): Promise<void> {
    // This would need to be implemented in a SavedBillsService
    // For now, throw error
    throw new Error('unsaveBill method not implemented in legacy compatibility layer');
  }

  /**
   * Update saved bill
   */
  async updateSavedBill(
    billId: string,
    updates: {
      notes?: string;
      tags?: string[];
      notification_enabled?: boolean;
    }
  ): Promise<SavedBill> {
    // This would need to be implemented in a SavedBillsService
    // For now, throw error
    throw new Error('updateSavedBill method not implemented in legacy compatibility layer');
  }
}

// ============================================================================
// SINGLETON INSTANCE WITH PROXY PATTERN
// ============================================================================

/**
 * Creates a singleton instance of the legacy UserService.
 */
const createLegacyUserServiceInstance = (): UserService => {
  return new UserService();
};

/**
 * Gets or creates the singleton instance using globalThis for HMR compatibility.
 */
const getOrCreateLegacyInstance = (): UserService => {
  const globalAny = globalThis as { __LEGACY_USER_SERVICE_INSTANCE?: UserService };

  if (!globalAny.__LEGACY_USER_SERVICE_INSTANCE) {
    globalAny.__LEGACY_USER_SERVICE_INSTANCE = createLegacyUserServiceInstance();
  }

  return globalAny.__LEGACY_USER_SERVICE_INSTANCE;
};

/**
 * Exported singleton instance using Proxy pattern for transparent access.
 * This allows calling methods directly on userService as if it were the actual instance.
 */
export const userService = new Proxy({} as unknown as UserService, {
  get(_target, prop: string | symbol) {
    const instance = getOrCreateLegacyInstance();
    const value = (instance as unknown as Record<PropertyKey, unknown>)[prop];

    // Bind methods to maintain correct 'this' context
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }

    return value;
  },
  set(_target, prop: string | symbol, value) {
    const instance = getOrCreateLegacyInstance();
    (instance as unknown as Record<PropertyKey, unknown>)[prop] = value;
    return true;
  },
});

// Export all types for external use
export type {
  LoginCredentials,
  RegisterData,
  AuthSession,
  AuthUser,
  UserProfile,
  UserPreferences,
  DashboardData,
  SavedBill,
  UserEngagementHistory,
  EngagementHistoryFilters,
  Recommendation,
  Notification,
  UserBadge,
  UserAchievement,
  ActivitySummary
};
