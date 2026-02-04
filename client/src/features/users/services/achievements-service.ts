/**
 * Achievements Service
 *
 * Handles all achievement-related functionality including:
 * - Achievement definitions and criteria
 * - Achievement progress tracking
 * - Achievement awarding
 * - Achievement statistics and leaderboards
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
  AchievementService as IAchievementService,
  AchievementDefinition,
  AchievementCriteria,
  UserAchievementProgress,
  UserAchievement
} from '@client/lib/services/interfaces';
import { logger } from '@client/lib/utils/logger';

export class AchievementService implements IAchievementService, ServiceLifecycleInterface {
  public readonly id = 'AchievementService';
  public readonly config = {
    name: 'AchievementService',
    version: '1.0.0',
    description: 'Manages user achievements and badges',
    dependencies: [],
    options: {
      achievementsCacheTTL: 15 * 60 * 1000, // 15 minutes
      progressCacheTTL: 5 * 60 * 1000, // 5 minutes
      leaderboardCacheTTL: 30 * 60 * 1000, // 30 minutes
      maxAchievementsPerUser: 200,
      checkProgressInterval: 60000 // 1 minute
    }
  };

  public cache: CacheService;
  private progressMonitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new CacheService({
      name: 'achievements',
      defaultTTL: 15 * 60 * 1000, // 15 minutes
      storageBackend: 'hybrid',
      compression: true,
      metrics: true
    });
  }

  async init(config?: any): Promise<void> {
    await this.cache.warmCache();
    this.startProgressMonitoring();
    logger.info('AchievementService initialized');
  }

  async dispose(): Promise<void> {
    // Clear interval to prevent memory leak
    if (this.progressMonitoringInterval) {
      clearInterval(this.progressMonitoringInterval);
      this.progressMonitoringInterval = null;
    }
    await this.cache.clear();
    logger.info('AchievementService disposed');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const cacheStats = await this.cache.getStatistics();
      return cacheStats.storageInfo.available;
    } catch (error) {
      logger.error('AchievementService health check failed', { error });
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
      achievementsCacheTTL: this.config.options?.achievementsCacheTTL,
      progressCacheTTL: this.config.options?.progressCacheTTL
    };
  }

  // ============================================================================
  // ACHIEVEMENT DEFINITIONS
  // ============================================================================

  async getAchievementDefinitions(): Promise<AchievementDefinition[]> {
    try {
      const cacheKey = 'achievement_definitions';

      // Try cache first
      let definitions = await this.cache.get<AchievementDefinition[]>(cacheKey);
      if (definitions) {
        return definitions;
      }

      // Fetch from server
      definitions = await this.fetchAchievementDefinitionsFromServer();

      // Cache the result
      await this.cache.set(cacheKey, definitions, this.config.options?.achievementsCacheTTL);

      return definitions;
    } catch (error) {
      throw new SystemError(
        'Failed to get achievement definitions',
        'AchievementService',
        'getAchievementDefinitions',
        undefined,
        { originalError: error }
      );
    }
  }

  // ============================================================================
  // USER ACHIEVEMENTS
  // ============================================================================

  async getUserAchievements(userId?: string): Promise<{
    earned: UserAchievement[];
    progress: UserAchievementProgress[];
    next_milestones: AchievementDefinition[];
  }> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const cacheKey = `user_achievements_${currentUserId}`;

      // Try cache first
      let result = await this.cache.get<{
        earned: UserAchievement[];
        progress: UserAchievementProgress[];
        next_milestones: AchievementDefinition[];
      }>(cacheKey);

      if (result) {
        return result;
      }

      // Fetch from server
      result = await this.fetchUserAchievementsFromServer(currentUserId);

      // Cache the result
      await this.cache.set(cacheKey, result, this.config.options?.achievementsCacheTTL);

      return result;
    } catch (error) {
      throw new SystemError(
        'Failed to get user achievements',
        'AchievementService',
        'getUserAchievements',
        undefined,
        { originalError: error, userId }
      );
    }
  }

  async checkAchievementProgress(achievementId: string, userId?: string): Promise<UserAchievementProgress> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const cacheKey = `achievement_progress_${currentUserId}_${achievementId}`;

      // Try cache first
      let progress = await this.cache.get<UserAchievementProgress>(cacheKey);
      if (progress) {
        return progress;
      }

      // Fetch from server
      progress = await this.fetchAchievementProgressFromServer(currentUserId, achievementId);

      // Cache the result
      await this.cache.set(cacheKey, progress, this.config.options?.progressCacheTTL);

      return progress;
    } catch (error) {
      throw new SystemError(
        'Failed to check achievement progress',
        'AchievementService',
        'checkAchievementProgress',
        undefined,
        { originalError: error, achievementId, userId }
      );
    }
  }

  async awardAchievement(achievementId: string, userId?: string): Promise<UserAchievement> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();

      // Check if already earned
      const userAchievements = await this.getUserAchievements(currentUserId);
      const alreadyEarned = userAchievements.earned.some(a => a.id === achievementId);

      if (alreadyEarned) {
        throw new ValidationError(
          'Achievement already earned',
          'AchievementService',
          'awardAchievement',
          'achievementId',
          achievementId
        );
      }

      // Award achievement
      const achievement = await this.awardAchievementToUser(currentUserId, achievementId);

      // Update cache
      await this.invalidateUserAchievementsCache(currentUserId);

      logger.info('Achievement awarded successfully', { userId: currentUserId, achievementId });

      return achievement;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new SystemError(
        'Failed to award achievement',
        'AchievementService',
        'awardAchievement',
        undefined,
        { originalError: error, achievementId, userId }
      );
    }
  }

  // ============================================================================
  // ACHIEVEMENT STATISTICS
  // ============================================================================

  async getAchievementStats(userId?: string): Promise<{
    total_earned: number;
    total_points: number;
    completion_rate: number;
    top_categories: Array<{ category: string; count: number }>;
  }> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const cacheKey = `achievement_stats_${currentUserId}`;

      // Try cache first
      let stats = await this.cache.get<{
        total_earned: number;
        total_points: number;
        completion_rate: number;
        top_categories: Array<{ category: string; count: number }>;
      }>(cacheKey);

      if (stats) {
        return stats;
      }

      // Fetch from server
      stats = await this.fetchAchievementStatsFromServer(currentUserId);

      // Cache the result
      await this.cache.set(cacheKey, stats, this.config.options?.achievementsCacheTTL);

      return stats;
    } catch (error) {
      throw new SystemError(
        'Failed to get achievement stats',
        'AchievementService',
        'getAchievementStats',
        undefined,
        { originalError: error, userId }
      );
    }
  }

  async getLeaderboard(category?: string, limit?: number): Promise<Array<{
    user_id: string;
    username: string;
    total_points: number;
    rank: number;
  }>> {
    try {
      const cacheKey = `leaderboard_${category || 'all'}_${limit || 10}`;

      // Try cache first
      let leaderboard = await this.cache.get<Array<{
        user_id: string;
        username: string;
        total_points: number;
        rank: number;
      }>>(cacheKey);

      if (leaderboard) {
        return leaderboard;
      }

      // Fetch from server
      leaderboard = await this.fetchLeaderboardFromServer(category, limit);

      // Cache the result
      await this.cache.set(cacheKey, leaderboard, this.config.options?.leaderboardCacheTTL);

      return leaderboard;
    } catch (error) {
      throw new SystemError(
        'Failed to get leaderboard',
        'AchievementService',
        'getLeaderboard',
        undefined,
        { originalError: error, category, limit }
      );
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private startProgressMonitoring(): void {
    // Check achievement progress periodically
    this.progressMonitoringInterval = setInterval(async () => {
      try {
        await this.checkAllAchievementProgress();
      } catch (error) {
        logger.warn('Achievement progress check failed', { error });
      }
    }, this.config.options?.checkProgressInterval);
  }

  private async getCurrentUserId(): Promise<string> {
    // In a real implementation, this would get the current user ID from auth service
    return 'current_user_id';
  }

  private async fetchAchievementDefinitionsFromServer(): Promise<AchievementDefinition[]> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'achievement_1',
            title: 'Bill Enthusiast',
            description: 'Track 10 bills',
            icon: 'bookmark',
            category: 'engagement',
            criteria: {
              type: 'count',
              target: 10,
              reset_period: 'never',
              conditions: { action_type: 'track' }
            },
            reward_points: 100,
            rarity: 'common'
          }
        ]);
      }, 500);
    });
  }

  private async fetchUserAchievementsFromServer(userId: string): Promise<{
    earned: UserAchievement[];
    progress: UserAchievementProgress[];
    next_milestones: AchievementDefinition[];
  }> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          earned: [],
          progress: [],
          next_milestones: []
        });
      }, 500);
    });
  }

  private async fetchAchievementProgressFromServer(userId: string, achievementId: string): Promise<UserAchievementProgress> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          achievement_id: achievementId,
          progress: 5,
          max_progress: 10,
          completed: false,
          completed_at: undefined,
          last_updated: new Date().toISOString()
        });
      }, 500);
    });
  }

  private async awardAchievementToUser(userId: string, achievementId: string): Promise<UserAchievement> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: achievementId,
          title: 'Bill Enthusiast',
          description: 'Track 10 bills',
          progress: 10,
          max_progress: 10,
          completed: true,
          completed_at: new Date().toISOString(),
          reward_points: 100
        });
      }, 500);
    });
  }

  private async fetchAchievementStatsFromServer(userId: string): Promise<{
    total_earned: number;
    total_points: number;
    completion_rate: number;
    top_categories: Array<{ category: string; count: number }>;
  }> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          total_earned: 5,
          total_points: 500,
          completion_rate: 25,
          top_categories: [
            { category: 'engagement', count: 3 },
            { category: 'community', count: 2 }
          ]
        });
      }, 500);
    });
  }

  private async fetchLeaderboardFromServer(category?: string, limit?: number): Promise<Array<{
    user_id: string;
    username: string;
    total_points: number;
    rank: number;
  }>> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            user_id: 'user_1',
            username: 'Top User',
            total_points: 1000,
            rank: 1
          }
        ]);
      }, 500);
    });
  }

  private async checkAllAchievementProgress(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const definitions = await this.getAchievementDefinitions();

      for (const definition of definitions) {
        await this.checkAchievementProgress(definition.id, userId);
      }
    } catch (error) {
      logger.warn('Failed to check all achievement progress', { error });
    }
  }

  private async invalidateUserAchievementsCache(userId: string): Promise<void> {
    const keys = [
      `user_achievements_${userId}`,
      `achievement_stats_${userId}`
    ];

    for (const key of keys) {
      await this.cache.delete(key);
    }
  }
}

// Export singleton instance
export const achievementService = new AchievementService();
