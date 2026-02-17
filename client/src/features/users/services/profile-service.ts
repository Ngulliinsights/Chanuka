/**
 * User Profile Service
 *
 * Handles all user profile-related functionality including:
 * - Profile management
 * - User preferences
 * - Activity tracking
 * - Badge and achievement management
 */

import { CacheService } from '@client/lib/services/cache';
import {
  ServiceErrorFactory,
  ValidationError,
  ResourceNotFoundError,
  SystemError
} from '@client/lib/services/errors';
import { ServiceLifecycleInterface } from '@client/lib/services/factory';
import {
  UserProfileService as IProfileService,
  UserProfile,
  UserBadge,
  UserAchievement,
  ActivitySummary,
  UserEngagementHistory,
  EngagementFilters,
  UserPreferences
} from '@client/lib/services/interfaces';
import { logger } from '@client/lib/utils/logger';

export class UserProfileService implements IProfileService, ServiceLifecycleInterface {
  public readonly id = 'UserProfileService';
  public readonly config = {
    name: 'UserProfileService',
    version: '1.0.0',
    description: 'Manages user profiles and preferences',
    dependencies: [],
    options: {
      profileCacheTTL: 10 * 60 * 1000, // 10 minutes
      activityCacheTTL: 5 * 60 * 1000, // 5 minutes
      maxBadgesPerUser: 100,
      maxAchievementsPerUser: 200
    }
  };

  public cache: CacheService;

  constructor() {
    this.cache = new CacheService({
      name: 'profile',
      defaultTTL: 10 * 60 * 1000, // 10 minutes
      storageBackend: 'hybrid',
      compression: true,
      metrics: true
    });
  }

  async init(config?: unknown): Promise<void> {
    await this.cache.warmCache();
    logger.info('UserProfileService initialized');
  }

  async dispose(): Promise<void> {
    await this.cache.clear();
    logger.info('UserProfileService disposed');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const cacheStats = await this.cache.getStatistics();
      return cacheStats.storageInfo.available;
    } catch (error) {
      logger.error('UserProfileService health check failed', { error });
      return false;
    }
  }

  getInfo() {
    return {
      ...this.config,
      cacheSize: this.cache.getMetrics().size
    };
  }

  async getStatistics(): Promise<Record<string, unknown>> {
    return {
      cacheMetrics: this.cache.getMetrics(),
      profileCacheTTL: this.config.options?.profileCacheTTL,
      activityCacheTTL: this.config.options?.activityCacheTTL
    };
  }

  // ============================================================================
  // PROFILE MANAGEMENT
  // ============================================================================

  async getUserProfile(userId?: string): Promise<UserProfile> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const cacheKey = `profile_${currentUserId}`;

      // Try cache first
      let profile = await this.cache.get<UserProfile>(cacheKey);
      if (profile) {
        return profile;
      }

      // Fetch from server
      profile = await this.fetchUserProfileFromServer(currentUserId);

      // Cache the result
      await this.cache.set(cacheKey, profile, this.config.options?.profileCacheTTL);

      return profile;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }

      throw new SystemError(
        'Failed to get user profile',
        'UserProfileService',
        'getUserProfile',
        undefined,
        { originalError: error, userId }
      );
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const currentUserId = await this.getCurrentUserId();

      // Validate updates
      this.validateProfileUpdates(updates);

      // Fetch current profile
      const currentProfile = await this.getUserProfile(currentUserId);

      // Merge updates
      const updatedProfile = { ...currentProfile, ...updates };

      // Save to server
      const savedProfile = await this.saveUserProfileToServer(currentUserId, updatedProfile);

      // Update cache
      const cacheKey = `profile_${currentUserId}`;
      await this.cache.set(cacheKey, savedProfile, this.config.options?.profileCacheTTL);

      // Invalidate related caches
      await this.invalidateUserCaches(currentUserId);

      logger.info('User profile updated successfully', { userId: currentUserId });

      return savedProfile;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new SystemError(
        'Failed to update user profile',
        'UserProfileService',
        'updateProfile',
        undefined,
        { originalError: error }
      );
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const currentUserId = await this.getCurrentUserId();

      // Validate preferences
      this.validatePreferences(preferences);

      // Fetch current profile
      const profile = await this.getUserProfile(currentUserId);

      // Update preferences
      const updatedPreferences = { ...profile.preferences, ...preferences };

      // Save to server
      const savedProfile = await this.saveUserProfileToServer(currentUserId, {
        ...profile,
        preferences: updatedPreferences
      });

      // Update cache
      const cacheKey = `profile_${currentUserId}`;
      await this.cache.set(cacheKey, savedProfile, this.config.options?.profileCacheTTL);

      logger.info('User preferences updated successfully', { userId: currentUserId });

      return savedProfile.preferences;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new SystemError(
        'Failed to update user preferences',
        'UserProfileService',
        'updatePreferences',
        undefined,
        { originalError: error }
      );
    }
  }

  async updateAvatar(file: File): Promise<string> {
    try {
      const currentUserId = await this.getCurrentUserId();

      // Validate file
      this.validateAvatarFile(file);

      // Upload file
      const avatarUrl = await this.uploadAvatarFile(file, currentUserId);

      // Update profile
      const updatedProfile = await this.updateProfile({ avatar_url: avatarUrl });

      logger.info('User avatar updated successfully', { userId: currentUserId });

      return updatedProfile.avatar_url!;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new SystemError(
        'Failed to update user avatar',
        'UserProfileService',
        'updateAvatar',
        undefined,
        { originalError: error }
      );
    }
  }

  async updateCoverImage(file: File): Promise<string> {
    try {
      const currentUserId = await this.getCurrentUserId();

      // Validate file
      this.validateCoverImageFile(file);

      // Upload file
      const coverImageUrl = await this.uploadCoverImageFile(file, currentUserId);

      // Update profile
      const updatedProfile = await this.updateProfile({ cover_image_url: coverImageUrl });

      logger.info('User cover image updated successfully', { userId: currentUserId });

      return updatedProfile.cover_image_url!;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new SystemError(
        'Failed to update user cover image',
        'UserProfileService',
        'updateCoverImage',
        undefined,
        { originalError: error }
      );
    }
  }

  // ============================================================================
  // STATISTICS AND ACHIEVEMENTS
  // ============================================================================

  async getUserStatistics(userId?: string): Promise<ActivitySummary> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const cacheKey = `statistics_${currentUserId}`;

      // Try cache first
      let statistics = await this.cache.get<ActivitySummary>(cacheKey);
      if (statistics) {
        return statistics;
      }

      // Fetch from server
      statistics = await this.fetchUserStatisticsFromServer(currentUserId);

      // Cache the result
      await this.cache.set(cacheKey, statistics, this.config.options?.activityCacheTTL);

      return statistics;
    } catch (error) {
      throw new SystemError(
        'Failed to get user statistics',
        'UserProfileService',
        'getUserStatistics',
        undefined,
        { originalError: error, userId }
      );
    }
  }

  async getUserBadges(userId?: string): Promise<UserBadge[]> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const cacheKey = `badges_${currentUserId}`;

      // Try cache first
      let badges = await this.cache.get<UserBadge[]>(cacheKey);
      if (badges) {
        return badges;
      }

      // Fetch from server
      badges = await this.fetchUserBadgesFromServer(currentUserId);

      // Cache the result
      await this.cache.set(cacheKey, badges, this.config.options?.activityCacheTTL);

      return badges;
    } catch (error) {
      throw new SystemError(
        'Failed to get user badges',
        'UserProfileService',
        'getUserBadges',
        undefined,
        { originalError: error, userId }
      );
    }
  }

  async getUserAchievements(userId?: string): Promise<UserAchievement[]> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const cacheKey = `achievements_${currentUserId}`;

      // Try cache first
      let achievements = await this.cache.get<UserAchievement[]>(cacheKey);
      if (achievements) {
        return achievements;
      }

      // Fetch from server
      achievements = await this.fetchUserAchievementsFromServer(currentUserId);

      // Cache the result
      await this.cache.set(cacheKey, achievements, this.config.options?.activityCacheTTL);

      return achievements;
    } catch (error) {
      throw new SystemError(
        'Failed to get user achievements',
        'UserProfileService',
        'getUserAchievements',
        undefined,
        { originalError: error, userId }
      );
    }
  }

  async getActivityHistory(userId?: string, options?: {
    page?: number;
    limit?: number;
    filters?: EngagementFilters;
  }): Promise<{
    history: UserEngagementHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const filters = options?.filters || {};

      const cacheKey = `activity_${currentUserId}_${page}_${limit}_${JSON.stringify(filters)}`;

      // Try cache first
      let result = await this.cache.get<{
        history: UserEngagementHistory[];
        total: number;
        page: number;
        totalPages: number;
      }>(cacheKey);

      if (result) {
        return result;
      }

      // Fetch from server
      result = await this.fetchActivityHistoryFromServer(currentUserId, page, limit, filters);

      // Cache the result
      await this.cache.set(cacheKey, result, this.config.options?.activityCacheTTL);

      return result;
    } catch (error) {
      throw new SystemError(
        'Failed to get activity history',
        'UserProfileService',
        'getActivityHistory',
        undefined,
        { originalError: error, userId }
      );
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async getCurrentUserId(): Promise<string> {
    // In a real implementation, this would get the current user ID from auth service
    return 'current_user_id';
  }

  private validateProfileUpdates(updates: Partial<UserProfile>): void {
    if (updates.name && (updates.name.length < 2 || updates.name.length > 100)) {
      throw new ValidationError(
        'Name must be between 2 and 100 characters',
        'UserProfileService',
        'validateProfileUpdates',
        'name',
        updates.name
      );
    }

    if (updates.bio && updates.bio.length > 500) {
      throw new ValidationError(
        'Bio cannot exceed 500 characters',
        'UserProfileService',
        'validateProfileUpdates',
        'bio',
        updates.bio
      );
    }

    if (updates.location && updates.location.length > 100) {
      throw new ValidationError(
        'Location cannot exceed 100 characters',
        'UserProfileService',
        'validateProfileUpdates',
        'location',
        updates.location
      );
    }
  }

  private validatePreferences(preferences: Partial<UserPreferences>): void {
    if (preferences.theme && !['light', 'dark', 'system'].includes(preferences.theme)) {
      throw new ValidationError(
        'Invalid theme value',
        'UserProfileService',
        'validatePreferences',
        'theme',
        preferences.theme
      );
    }

    if (preferences.language && preferences.language.length !== 2) {
      throw new ValidationError(
        'Invalid language code',
        'UserProfileService',
        'validatePreferences',
        'language',
        preferences.language
      );
    }

    if (preferences.email_frequency && !['immediate', 'daily', 'weekly', 'never'].includes(preferences.email_frequency)) {
      throw new ValidationError(
        'Invalid email frequency',
        'UserProfileService',
        'validatePreferences',
        'email_frequency',
        preferences.email_frequency
      );
    }
  }

  private validateAvatarFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      throw new ValidationError(
        'File must be an image',
        'UserProfileService',
        'validateAvatarFile',
        'file',
        file.type
      );
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new ValidationError(
        'File size cannot exceed 5MB',
        'UserProfileService',
        'validateAvatarFile',
        'file',
        file.size
      );
    }
  }

  private validateCoverImageFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      throw new ValidationError(
        'File must be an image',
        'UserProfileService',
        'validateCoverImageFile',
        'file',
        file.type
      );
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new ValidationError(
        'File size cannot exceed 10MB',
        'UserProfileService',
        'validateCoverImageFile',
        'file',
        file.size
      );
    }
  }

  private async fetchUserProfileFromServer(userId: string): Promise<UserProfile> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          role: 'citizen',
          verified: true,
          twoFactorEnabled: false,
          bio: 'Test bio',
          location: 'Nairobi, Kenya',
          website: 'https://example.com',
          twitter: '@testuser',
          linkedin: 'test-user',
          cover_image_url: undefined,
          civic_engagement_score: 85,
          badges: [],
          achievements: [],
          activity_summary: {
            bills_tracked: 10,
            comments_posted: 5,
            discussions_started: 2,
            votes_cast: 15,
            expert_contributions: 0,
            community_score: 90,
            streak_days: 7,
            last_active: new Date().toISOString()
          },
          preferences: {
            theme: 'light',
            language: 'en',
            timezone: 'UTC',
            email_frequency: 'immediate',
            notification_preferences: {
              email: true,
              push: true,
              sms: false,
              frequency: 'immediate',
              quiet_hours: { enabled: false, start_time: '22:00', end_time: '08:00' }
            },
            privacy_settings: {
              profile_visibility: 'public',
              activity_visibility: 'public',
              data_sharing: true,
              analytics_tracking: true,
              marketing_emails: false
            },
            dashboard_layout: 'compact',
            default_bill_view: 'grid',
            auto_save_drafts: true,
            show_onboarding_tips: true
          },
          permissions: ['read:bills', 'comment:bills', 'save:bills'],
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }, 500);
    });
  }

  private async saveUserProfileToServer(userId: string, profile: UserProfile): Promise<UserProfile> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(profile);
      }, 500);
    });
  }

  private async uploadAvatarFile(file: File, userId: string): Promise<string> {
    // Simulate file upload
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://example.com/avatars/${userId}.jpg`);
      }, 1000);
    });
  }

  private async uploadCoverImageFile(file: File, userId: string): Promise<string> {
    // Simulate file upload
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://example.com/covers/${userId}.jpg`);
      }, 1000);
    });
  }

  private async fetchUserStatisticsFromServer(userId: string): Promise<ActivitySummary> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          bills_tracked: 10,
          comments_posted: 5,
          discussions_started: 2,
          votes_cast: 15,
          expert_contributions: 0,
          community_score: 90,
          streak_days: 7,
          last_active: new Date().toISOString()
        });
      }, 500);
    });
  }

  private async fetchUserBadgesFromServer(userId: string): Promise<UserBadge[]> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'badge_1',
            name: 'First Bill Tracked',
            description: 'Tracked your first bill',
            icon: 'bookmark',
            earned_at: new Date().toISOString(),
            category: 'engagement'
          }
        ]);
      }, 500);
    });
  }

  private async fetchUserAchievementsFromServer(userId: string): Promise<UserAchievement[]> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'achievement_1',
            title: 'Bill Enthusiast',
            description: 'Track 10 bills',
            progress: 10,
            max_progress: 10,
            completed: true,
            completed_at: new Date().toISOString(),
            reward_points: 100
          }
        ]);
      }, 500);
    });
  }

  private async fetchActivityHistoryFromServer(
    userId: string,
    page: number,
    limit: number,
    filters: EngagementFilters
  ): Promise<{
    history: UserEngagementHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          history: [
            {
              id: 'activity_1',
              user_id: userId,
              action_type: 'view',
              entity_type: 'bill',
              entity_id: 'bill_123',
              timestamp: new Date().toISOString(),
              metadata: { bill_title: 'Test Bill' }
            }
          ],
          total: 1,
          page: 1,
          totalPages: 1
        });
      }, 500);
    });
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    const keys = [
      `profile_${userId}`,
      `statistics_${userId}`,
      `badges_${userId}`,
      `achievements_${userId}`
    ];

    for (const key of keys) {
      await this.cache.delete(key);
    }
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService();
