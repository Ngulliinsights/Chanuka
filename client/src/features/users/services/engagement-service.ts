/**
 * Engagement Service
 *
 * Handles all user engagement tracking and analytics including:
 * - Engagement history tracking
 * - Session management
 * - User streak tracking
 * - Engagement analytics
 */

import { CacheService } from '@client/lib/services/cache';
import {
  ServiceErrorFactory,
  ValidationError,
  SystemError
} from '@client/lib/services/errors';
import { ServiceLifecycleInterface } from '@client/lib/services/factory';
import {
  EngagementService as IEngagementService,
  UserEngagementHistory,
  EngagementFilters,
  EngagementAnalytics
} from '@client/lib/services/interfaces';
import { logger } from '@client/lib/utils/logger';

export class EngagementService implements IEngagementService, ServiceLifecycleInterface {
  public readonly id = 'EngagementService';
  public readonly config = {
    name: 'EngagementService',
    version: '1.0.0',
    description: 'Tracks and analyzes user engagement',
    dependencies: [],
    options: {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      engagementCacheTTL: 5 * 60 * 1000, // 5 minutes
      analyticsCacheTTL: 10 * 60 * 1000, // 10 minutes
      maxSessionDuration: 4 * 60 * 60 * 1000, // 4 hours
      trackPageViews: true,
      trackActions: true
    }
  };

  public cache: CacheService;
  private currentSessionId: string | null = null;
  private sessionStartTime: number = 0;
  private pageViews: number = 0;
  private actions: number = 0;
  private sessionTrackingInterval: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;
  private unloadHandler: (() => void) | null = null;

  constructor() {
    this.cache = new CacheService({
      name: 'engagement',
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      storageBackend: 'hybrid',
      compression: true,
      metrics: true
    });

    this.initializeSession();
  }

  async init(config?: unknown): Promise<void> {
    await this.cache.warmCache();
    this.startSessionTracking();
    logger.info('EngagementService initialized');
  }

  async dispose(): Promise<void> {
    // Clear interval
    if (this.sessionTrackingInterval) {
      clearInterval(this.sessionTrackingInterval);
      this.sessionTrackingInterval = null;
    }
    // Remove event listeners
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = null;
    }
    await this.endSession();
    await this.cache.clear();
    logger.info('EngagementService disposed');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const cacheStats = await this.cache.getStatistics();
      return cacheStats.storageInfo.available;
    } catch (error) {
      logger.error('EngagementService health check failed', { error });
      return false;
    }
  }

  getInfo() {
    return {
      ...this.config,
      currentSessionId: this.currentSessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      pageViews: this.pageViews,
      actions: this.actions
    };
  }

  async getStatistics(): Promise<Record<string, unknown>> {
    return {
      cacheMetrics: this.cache.getMetrics(),
      currentSession: await this.getSessionData(),
      engagementCacheTTL: this.config.options?.engagementCacheTTL
    };
  }

  // ============================================================================
  // ENGAGEMENT TRACKING
  // ============================================================================

  async trackEngagement(action: {
    action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
    entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
    entity_id: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const engagement: UserEngagementHistory = {
        id: `engagement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: await this.getCurrentUserId(),
        action_type: action.action_type,
        entity_type: action.entity_type,
        entity_id: action.entity_id,
        timestamp: new Date().toISOString(),
        metadata: action.metadata || {}
      };

      // Save to server
      await this.saveEngagementToServer(engagement);

      // Update local counters
      this.actions++;
      this.updateSessionActivity();

      // Update analytics cache
      await this.updateEngagementAnalytics(engagement);

      logger.debug('Engagement tracked', { action: action.action_type, entityId: action.entity_id });
    } catch (error) {
      logger.warn('Engagement tracking failed', { error, action });
      // Don't throw error to avoid disrupting user experience
    }
  }

  // ============================================================================
  // ENGAGEMENT HISTORY
  // ============================================================================

  async getEngagementHistory(options?: {
    page?: number;
    limit?: number;
    filters?: EngagementFilters;
  }): Promise<{
    history: UserEngagementHistory[];
    total: number;
    page: number;
    totalPages: number;
    analytics: EngagementAnalytics;
  }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const filters = options?.filters || {};

      const cacheKey = `engagement_history_${page}_${limit}_${JSON.stringify(filters)}`;

      // Try cache first
      let result = await this.cache.get<{
        history: UserEngagementHistory[];
        total: number;
        page: number;
        totalPages: number;
        analytics: EngagementAnalytics;
      }>(cacheKey);

      if (result) {
        return result;
      }

      // Fetch from server
      result = await this.fetchEngagementHistoryFromServer(page, limit, filters);

      // Cache the result
      await this.cache.set(cacheKey, result, this.config.options?.engagementCacheTTL);

      return result;
    } catch (error) {
      throw new SystemError(
        'Failed to get engagement history',
        'EngagementService',
        'getEngagementHistory',
        undefined,
        { originalError: error }
      );
    }
  }

  async getEngagementStats(userId?: string): Promise<EngagementAnalytics> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const cacheKey = `engagement_stats_${currentUserId}`;

      // Try cache first
      let stats = await this.cache.get<EngagementAnalytics>(cacheKey);
      if (stats) {
        return stats;
      }

      // Fetch from server
      stats = await this.fetchEngagementStatsFromServer(currentUserId);

      // Cache the result
      await this.cache.set(cacheKey, stats, this.config.options?.analyticsCacheTTL);

      return stats;
    } catch (error) {
      throw new SystemError(
        'Failed to get engagement stats',
        'EngagementService',
        'getEngagementStats',
        undefined,
        { originalError: error, userId }
      );
    }
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async getSessionData(): Promise<{
    sessionId: string;
    startTime: string;
    lastActivity: string;
    pageViews: number;
    actions: number;
  }> {
    return {
      sessionId: this.currentSessionId || 'no_session',
      startTime: new Date(this.sessionStartTime).toISOString(),
      lastActivity: new Date().toISOString(),
      pageViews: this.pageViews,
      actions: this.actions
    };
  }

  async endSession(): Promise<void> {
    if (this.currentSessionId) {
      try {
        await this.saveSessionToServer();
        this.currentSessionId = null;
        this.sessionStartTime = 0;
        this.pageViews = 0;
        this.actions = 0;
      } catch (error) {
        logger.warn('Failed to save session data', { error });
      }
    }
  }

  // ============================================================================
  // STREAK TRACKING
  // ============================================================================

  async getUserStreak(userId?: string): Promise<{
    current_streak: number;
    longest_streak: number;
    last_active: string;
    next_milestone: number;
  }> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      const cacheKey = `user_streak_${currentUserId}`;

      // Try cache first
      let streak = await this.cache.get<{
        current_streak: number;
        longest_streak: number;
        last_active: string;
        next_milestone: number;
      }>(cacheKey);

      if (streak) {
        return streak;
      }

      // Fetch from server
      streak = await this.fetchUserStreakFromServer(currentUserId);

      // Cache the result
      await this.cache.set(cacheKey, streak, this.config.options?.engagementCacheTTL);

      return streak;
    } catch (error) {
      throw new SystemError(
        'Failed to get user streak',
        'EngagementService',
        'getUserStreak',
        undefined,
        { originalError: error, userId }
      );
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeSession(): void {
    this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStartTime = Date.now();
    this.pageViews = 1; // Initial page view
    this.actions = 0;
  }

  private startSessionTracking(): void {
    // Track page visibility changes
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.updateSessionActivity();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Track page unload
    this.unloadHandler = () => {
      this.endSession();
    };
    window.addEventListener('beforeunload', this.unloadHandler);

    // Track periodic session updates
    this.sessionTrackingInterval = setInterval(() => {
      this.updateSessionActivity();
    }, 60000); // Every minute
  }

  private updateSessionActivity(): void {
    if (this.currentSessionId) {
      // Check if session should be extended
      const now = Date.now();
      const sessionDuration = now - this.sessionStartTime;

      if (sessionDuration > (this.config.options?.maxSessionDuration || 4 * 60 * 60 * 1000)) {
        // Start new session
        this.initializeSession();
      }
    }
  }

  private async getCurrentUserId(): Promise<string> {
    // In a real implementation, this would get the current user ID from auth service
    return 'current_user_id';
  }

  private async saveEngagementToServer(engagement: UserEngagementHistory): Promise<void> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  private async fetchEngagementHistoryFromServer(
    page: number,
    limit: number,
    filters: EngagementFilters
  ): Promise<{
    history: UserEngagementHistory[];
    total: number;
    page: number;
    totalPages: number;
    analytics: EngagementAnalytics;
  }> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          history: [],
          total: 0,
          page: 1,
          totalPages: 1,
          analytics: {
            total_actions: 0,
            action_breakdown: {},
            most_active_day: new Date().toISOString(),
            most_active_hour: 14,
            engagement_trend: [],
            top_entities: [],
            average_session_duration: 0
          }
        });
      }, 500);
    });
  }

  private async fetchEngagementStatsFromServer(userId: string): Promise<EngagementAnalytics> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          total_actions: 100,
          action_breakdown: { view: 50, comment: 20, save: 15, share: 10, vote: 5 },
          most_active_day: new Date().toISOString(),
          most_active_hour: 14,
          engagement_trend: [],
          top_entities: [],
          average_session_duration: 1200
        });
      }, 500);
    });
  }

  private async saveSessionToServer(): Promise<void> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  private async fetchUserStreakFromServer(userId: string): Promise<{
    current_streak: number;
    longest_streak: number;
    last_active: string;
    next_milestone: number;
  }> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          current_streak: 7,
          longest_streak: 15,
          last_active: new Date().toISOString(),
          next_milestone: 10
        });
      }, 500);
    });
  }

  private async updateEngagementAnalytics(engagement: UserEngagementHistory): Promise<void> {
    try {
      const cacheKey = `engagement_analytics_${engagement.user_id}`;
      let analytics = await this.cache.get<EngagementAnalytics>(cacheKey);

      if (!analytics) {
        analytics = {
          total_actions: 0,
          action_breakdown: {},
          most_active_day: new Date().toISOString(),
          most_active_hour: 0,
          engagement_trend: [],
          top_entities: [],
          average_session_duration: 0
        };
      }

      // Update analytics
      analytics.total_actions++;
      analytics.action_breakdown[engagement.action_type] = (analytics.action_breakdown[engagement.action_type] || 0) + 1;

      // Cache updated analytics
      await this.cache.set(cacheKey, analytics, this.config.options?.analyticsCacheTTL);
    } catch (error) {
      logger.warn('Failed to update engagement analytics', { error, engagement });
    }
  }
}

// Export singleton instance
export const engagementService = new EngagementService();
