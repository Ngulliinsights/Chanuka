/**
 * ============================================================================
 * USER API SERVICE
 * ============================================================================
 * Core API communication layer for all user-related functionality including
 * profiles, preferences, saved content, engagement tracking, and achievements.
 *
 * This service implements intelligent caching strategies, graceful degradation
 * for non-critical operations, and comprehensive error handling to ensure a
 * smooth user experience even when backend services face issues.
 */

import { logger } from '@client/lib/utils/logger';

import { globalApiClient } from '../../../infrastructure/api/client';
import { globalErrorHandler } from '../../../infrastructure/api/errors';

// ============================================================================
// Type Re-exports
// ============================================================================

export type {
  UserProfile,
} from '@shared/validation/schemas/user.schema';

// These types are defined locally as they don't exist in shared schemas yet
export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  total: number;
  completed: boolean;
}

export interface ActivitySummary {
  totalActions: number;
  recentActivity: Array<{
    type: string;
    timestamp: string;
    description: string;
  }>;
}

export interface SavedBill {
  id: string;
  billId: string;
  notes?: string;
  tags?: string[];
  savedAt: string;
}

export interface UserEngagementHistory {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

// ============================================================================
// Request/Response Type Definitions
// ============================================================================

/**
 * Filters for querying saved bills with specific criteria.
 * These filters help users organize and find their saved legislation.
 */
export interface SavedBillsFilters {
  status?: string;
  urgency?: string;
  tags?: string[];
  policyArea?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Paginated response structure for saved bills.
 * Includes metadata for implementing infinite scroll or traditional pagination.
 */
export interface SavedBillsResponse {
  bills: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Filters for engagement history queries.
 * Allows users to review their civic participation across different timeframes and activities.
 */
export interface EngagementHistoryFilters {
  action_type?: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  entity_type?: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
  date_from?: string;
  date_to?: string;
}

/**
 * Comprehensive engagement history response with analytics.
 * Helps users understand their civic engagement patterns.
 */
export interface EngagementHistoryResponse {
  history: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
  analytics: {
    most_active_day: string;
    total_actions: number;
    action_breakdown: Record<string, number>;
    entity_breakdown: Record<string, number>;
  };
}

/**
 * Tracking action structure for recording user engagement.
 * These events power analytics, recommendations, and gamification features.
 */
export interface EngagementAction {
  action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
  entity_id: string;
  metadata?: Record<string, unknown>;
}

/**
 * Comprehensive dashboard data structure combining multiple data sources
 * into a single response to minimize API calls on the dashboard page.
 */
export interface DashboardData {
  profile: Record<string, unknown>;
  recent_activity: Record<string, unknown>[];
  saved_bills: Record<string, unknown>[];
  trending_bills: Record<string, unknown>[];
  recommendations: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  civic_score_trend: Array<{ date: string; score: number }>;
  achievements_progress: {
    recent_badges: Record<string, unknown>[];
    next_milestones: Record<string, unknown>[];
  };
}

// ============================================================================
// User API Service Class
// ============================================================================

/**
 * Centralized service for all user-related API operations.
 *
 * Design Philosophy:
 * - Profile operations are cached moderately (5 min) since they don't change frequently
 * - Preferences updates skip cache to ensure immediate consistency
 * - Engagement tracking fails gracefully to never block the user interface
 * - Saved bills use smart invalidation strategies to balance freshness and performance
 * - Dashboard data is cached briefly (2 min) to reduce load on personalization services
 */
export class UserApiService {
  private readonly baseUrl: string;
  private readonly defaultTimeout = 10000;

  // Different cache TTLs for different data types based on update frequency
  private readonly profileCacheTTL = 5 * 60 * 1000; // 5 minutes - profiles change occasionally
  private readonly savedBillsCacheTTL = 3 * 60 * 1000; // 3 minutes - saved collection changes frequently
  private readonly achievementsCacheTTL = 10 * 60 * 1000; // 10 minutes - achievements unlock gradually
  private readonly dashboardCacheTTL = 2 * 60 * 1000; // 2 minutes - needs freshness for good UX

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  // ==========================================================================
  // Profile Management Methods
  // ==========================================================================

  /**
   * Retrieves complete user profile with all related metadata.
   *
   * This is one of the most frequently called endpoints, so it uses moderate
   * caching to balance data freshness with performance. When userId is omitted,
   * it fetches the current authenticated user's profile.
   *
   * @param userId - Optional user ID; omit to fetch current user's profile
   * @returns Complete user profile with stats, preferences, and settings
   */
  async getUserProfile(userId?: string): Promise<Record<string, unknown>> {
    try {
      const endpoint = userId
        ? `${this.baseUrl}/users/${userId}/profile`
        : `${this.baseUrl}/users/profile`;

      const response = await globalApiClient.get<Record<string, unknown>>(endpoint, {
        timeout: this.defaultTimeout,
        cacheTTL: this.profileCacheTTL,
      });

      logger.info('User profile loaded', {
        component: 'UserApiService',
        userId: userId || 'current',
        hasData: !!response.data,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user profile', {
        component: 'UserApiService',
        userId,
        error,
      });
      throw await this.handleError(error, 'getUserProfile', { userId });
    }
  }

  /**
   * Updates user profile information with immediate cache invalidation.
   *
   * Profile updates need to be reflected immediately, so we skip caching
   * on the write operation. This ensures the next profile read gets fresh data.
   *
   * @param profileData - Partial profile data to update
   * @returns Updated profile object
   */
  async updateProfile(
    profileData: Partial<Record<string, unknown>>
  ): Promise<Record<string, unknown>> {
    try {
      const response = await globalApiClient.put<Record<string, unknown>>(
        `${this.baseUrl}/users/profile`,
        profileData,
        {
          timeout: this.defaultTimeout,
          skipCache: true,
        }
      );

      logger.info('User profile updated', {
        component: 'UserApiService',
        updatedFields: Object.keys(profileData),
        fieldCount: Object.keys(profileData).length,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update user profile', {
        component: 'UserApiService',
        fields: Object.keys(profileData),
        error,
      });
      throw await this.handleError(error, 'updateProfile');
    }
  }

  /**
   * Updates user preferences for notifications, privacy, and display settings.
   *
   * Preferences changes should take effect immediately throughout the application,
   * so we aggressively skip all caching on this operation.
   *
   * @param preferences - Preference settings to update
   * @returns Updated preferences object
   */
  async updatePreferences(
    preferences: Partial<Record<string, unknown>>
  ): Promise<Record<string, unknown>> {
    try {
      const response = await globalApiClient.put<Record<string, unknown>>(
        `${this.baseUrl}/users/preferences`,
        preferences,
        {
          timeout: this.defaultTimeout,
          skipCache: true,
        }
      );

      logger.info('User preferences updated', {
        component: 'UserApiService',
        updatedPreferences: Object.keys(preferences),
        count: Object.keys(preferences).length,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update user preferences', {
        component: 'UserApiService',
        preferences: Object.keys(preferences),
        error,
      });
      throw await this.handleError(error, 'updatePreferences');
    }
  }

  /**
   * Uploads a new user avatar image with file type validation.
   *
   * This method handles multipart form data uploads and includes detailed
   * logging of file characteristics for debugging upload issues.
   *
   * @param file - Image file (JPEG, PNG, WebP recommended)
   * @returns Object containing the new avatar URL
   */
  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    // Validate file type before sending to prevent unnecessary uploads
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      const error = new Error(
        `Invalid file type: ${file.type}. Allowed types: ${validTypes.join(', ')}`
      );
      logger.warn('Avatar upload rejected - invalid file type', {
        component: 'UserApiService',
        fileType: file.type,
        fileName: file.name,
      });
      throw error;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const error = new Error(
        `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 5MB`
      );
      logger.warn('Avatar upload rejected - file too large', {
        component: 'UserApiService',
        fileSize: file.size,
        fileName: file.name,
      });
      throw error;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await globalApiClient.post(`${this.baseUrl}/users/avatar`, formData, {
        timeout: 30000, // Longer timeout for file uploads
        skipCache: true,
      });

      logger.info('Avatar uploaded successfully', {
        component: 'UserApiService',
        fileSize: file.size,
        fileType: file.type,
        fileName: file.name,
      });

      return response.data as { avatar_url: string };
    } catch (error) {
      logger.error('Failed to upload avatar', {
        component: 'UserApiService',
        fileSize: file.size,
        fileType: file.type,
        error,
      });
      throw await this.handleError(error, 'uploadAvatar');
    }
  }

  // ==========================================================================
  // Saved Bills Management
  // ==========================================================================

  /**
   * Retrieves user's saved bills with pagination and filtering.
   *
   * Saved bills are a core feature for users tracking legislation, so this
   * endpoint is optimized for quick response times with smart caching that
   * gets invalidated when users modify their saved collection.
   *
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @param filters - Optional filtering criteria
   * @returns Paginated saved bills with metadata
   */
  async getSavedBills(
    page = 1,
    limit = 20,
    filters?: SavedBillsFilters
  ): Promise<SavedBillsResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Add filters only if they have values
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      const response = await globalApiClient.get(
        `${this.baseUrl}/users/saved-bills?${params.toString()}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: this.savedBillsCacheTTL,
        }
      );

      const data = response.data as SavedBillsResponse;

      logger.info('Saved bills loaded', {
        component: 'UserApiService',
        page,
        count: data.bills?.length || 0,
        total: data.total,
        hasFilters: !!filters,
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch saved bills', {
        component: 'UserApiService',
        page,
        filters,
        error,
      });
      throw await this.handleError(error, 'getSavedBills');
    }
  }

  /**
   * Saves a bill to user's collection with optional notes and tags.
   *
   * This operation immediately invalidates the saved bills cache to ensure
   * the new item appears in subsequent queries. Notifications are enabled
   * by default to keep users informed of bill updates.
   *
   * @param billId - ID of the bill to save
   * @param notes - Optional personal notes about the bill
   * @param tags - Optional tags for organization
   * @returns Saved bill object with metadata
   */
  async saveBill(
    billId: string,
    notes?: string,
    tags: string[] = []
  ): Promise<Record<string, unknown>> {
    try {
      const response = await globalApiClient.post<Record<string, unknown>>(
        `${this.baseUrl}/users/saved-bills`,
        {
          bill_id: billId,
          notes,
          tags,
          notification_enabled: true, // Default to notifications on
        },
        {
          timeout: this.defaultTimeout,
          skipCache: true,
        }
      );

      logger.info('Bill saved successfully', {
        component: 'UserApiService',
        billId,
        hasNotes: !!notes,
        tagCount: tags.length,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to save bill', {
        component: 'UserApiService',
        billId,
        error,
      });
      throw await this.handleError(error, 'saveBill', { billId });
    }
  }

  /**
   * Removes a bill from user's saved collection.
   *
   * Cache invalidation ensures the removed item disappears from saved bills
   * lists immediately without requiring a manual refresh.
   *
   * @param billId - ID of the bill to remove
   */
  async unsaveBill(billId: string): Promise<void> {
    try {
      await globalApiClient.delete(`${this.baseUrl}/users/saved-bills/${billId}`, {
        timeout: this.defaultTimeout,
        skipCache: true,
      });

      logger.info('Bill removed from saved collection', {
        component: 'UserApiService',
        billId,
      });
    } catch (error) {
      logger.error('Failed to remove saved bill', {
        component: 'UserApiService',
        billId,
        error,
      });
      throw await this.handleError(error, 'unsaveBill', { billId });
    }
  }

  /**
   * Updates metadata for a saved bill (notes, tags, notification preferences).
   *
   * This allows users to organize and annotate their saved bills without
   * removing and re-adding them. The operation is lightweight and uses
   * PATCH semantics to update only the specified fields.
   *
   * @param billId - ID of the saved bill
   * @param updates - Fields to update
   * @returns Updated saved bill object
   */
  async updateSavedBill(
    billId: string,
    updates: {
      notes?: string;
      tags?: string[];
      notification_enabled?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    try {
      const response = await globalApiClient.patch<Record<string, unknown>>(
        `${this.baseUrl}/users/saved-bills/${billId}`,
        updates,
        {
          timeout: this.defaultTimeout,
          skipCache: true,
        }
      );

      logger.info('Saved bill updated', {
        component: 'UserApiService',
        billId,
        updatedFields: Object.keys(updates),
        fieldCount: Object.keys(updates).length,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update saved bill', {
        component: 'UserApiService',
        billId,
        updates: Object.keys(updates),
        error,
      });
      throw await this.handleError(error, 'updateSavedBill', { billId });
    }
  }

  // ==========================================================================
  // Engagement Tracking Methods
  // ==========================================================================

  /**
   * Retrieves user's engagement history with comprehensive analytics.
   *
   * This endpoint powers the user activity dashboard, showing patterns in
   * civic participation over time. The analytics help users understand their
   * engagement trends and most active periods.
   *
   * @param page - Page number
   * @param limit - Items per page
   * @param filters - Optional filtering criteria
   * @returns Engagement history with analytics breakdown
   */
  async getEngagementHistory(
    page = 1,
    limit = 50,
    filters?: EngagementHistoryFilters
  ): Promise<EngagementHistoryResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await globalApiClient.get(
        `${this.baseUrl}/users/engagement-history?${params.toString()}`,
        {
          timeout: this.defaultTimeout,
          cacheTTL: 5 * 60 * 1000, // 5 minute cache for history
        }
      );

      const data = response.data as EngagementHistoryResponse;

      logger.info('Engagement history loaded', {
        component: 'UserApiService',
        page,
        count: data.history?.length || 0,
        total: data.total,
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch engagement history', {
        component: 'UserApiService',
        page,
        filters,
        error,
      });
      throw await this.handleError(error, 'getEngagementHistory');
    }
  }

  /**
   * Records a user engagement action for analytics and recommendations.
   *
   * CRITICAL: This method implements graceful degradation. Tracking failures
   * should NEVER break the user experience, so errors are logged but not thrown.
   * This ensures that even if the analytics service is down, users can still
   * interact with content normally.
   *
   * @param action - Engagement action to record
   */
  async trackEngagement(action: EngagementAction): Promise<void> {
    try {
      await globalApiClient.post(`${this.baseUrl}/users/engagement`, action, {
        timeout: 5000, // Shorter timeout - tracking shouldn't slow down UI
        skipCache: true,
      });

      // Use debug level since this happens frequently
      logger.debug('Engagement tracked', {
        component: 'UserApiService',
        action: action.action_type,
        entity: action.entity_type,
        entityId: action.entity_id,
      });
    } catch (error) {
      // Silent failure - tracking should never block user actions
      // Use warn instead of error since this is expected to fail occasionally
      logger.warn('Engagement tracking failed (non-blocking)', {
        component: 'UserApiService',
        action: action.action_type,
        entity: action.entity_type,
        error: error instanceof Error ? error.message : String(error),
      });
      // Intentionally NOT throwing error - graceful degradation
    }
  }

  // ==========================================================================
  // Achievements and Gamification
  // ==========================================================================

  /**
   * Retrieves user's badges, achievements, and progress toward next milestones.
   *
   * This powers the gamification system that encourages civic engagement.
   * Achievements are cached longer since they don't update frequently, and
   * checking too often would make earning them less exciting.
   *
   * @returns Achievement data with progress indicators
   */
  async getAchievements(): Promise<{
    badges: Record<string, unknown>[];
    achievements: Record<string, unknown>[];
    next_milestones: Record<string, unknown>[];
  }> {
    try {
      const response = await globalApiClient.get<{
        badges: Record<string, unknown>[];
        achievements: Record<string, unknown>[];
        next_milestones: Record<string, unknown>[];
      }>(`${this.baseUrl}/users/achievements`, {
        timeout: this.defaultTimeout,
        cacheTTL: this.achievementsCacheTTL,
      });

      const data = response.data as {
        badges: Record<string, unknown>[];
        achievements: Record<string, unknown>[];
        next_milestones: Record<string, unknown>[];
      };

      logger.info('Achievements loaded', {
        component: 'UserApiService',
        badgeCount: data.badges?.length || 0,
        achievementCount: data.achievements?.length || 0,
        milestoneCount: data.next_milestones?.length || 0,
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch achievements', {
        component: 'UserApiService',
        error,
      });
      throw await this.handleError(error, 'getAchievements');
    }
  }

  // ==========================================================================
  // Dashboard and Aggregated Data
  // ==========================================================================

  /**
   * Fetches comprehensive dashboard data in a single request.
   *
   * This is a critical optimization that combines multiple data sources into
   * one response, dramatically reducing the number of API calls needed to
   * render the user dashboard. The short cache TTL (2 min) keeps the dashboard
   * feeling fresh while preventing excessive backend load.
   *
   * This endpoint aggregates:
   * - User profile and stats
   * - Recent activity feed
   * - Saved bills (top items)
   * - Trending bills (personalized)
   * - AI-powered recommendations
   * - Unread notifications
   * - Civic score trends over time
   * - Achievement progress
   *
   * @returns Comprehensive dashboard data structure
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/users/dashboard`, {
        timeout: 15000, // Longer timeout since this aggregates multiple data sources
        cacheTTL: this.dashboardCacheTTL,
      });

      const data = response.data as DashboardData;

      logger.info('Dashboard data loaded', {
        component: 'UserApiService',
        activityCount: data.recent_activity?.length || 0,
        savedBillsCount: data.saved_bills?.length || 0,
        recommendationsCount: data.recommendations?.length || 0,
        notificationsCount: data.notifications?.length || 0,
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch dashboard data', {
        component: 'UserApiService',
        error,
      });
      throw await this.handleError(error, 'getDashboardData');
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Centralized error handling that enriches errors with context.
   *
   * This method ensures consistent error reporting across all user operations
   * while preserving important context that helps with debugging production issues.
   *
   * @param error - Original error object
   * @param operation - Name of the operation that failed
   * @param context - Additional context for debugging
   * @returns Enriched error object
   */
  private async handleError(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>
  ): Promise<Error> {
    const handler = globalErrorHandler as (
      error: unknown,
      context?: Record<string, unknown>
    ) => void;
    handler(error, {
      component: 'UserApiService',
      operation,
      ...context,
    });
    return error as Error;
  }
}

// ============================================================================
// Global Instance Export
// ============================================================================

/**
 * Pre-configured global instance of the user API service.
 * Use this throughout the application for consistency and to benefit
 * from the configured caching strategies and error handling.
 */
export const userApiService = new UserApiService();
