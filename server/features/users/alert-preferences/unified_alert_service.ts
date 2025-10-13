import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { databaseService } from '../../../infrastructure/database/database-service';
import { notificationChannelService } from '../../../infrastructure/notifications/notification-channels';
import { userProfileService } from '../user-profile';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../../../infrastructure/cache/cache-service';
import * as schema from '@shared/schema';
import { z } from 'zod';
import { logger } from '@shared/utils/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AlertType = 
  | 'bill_status_change' 
  | 'new_comment' 
  | 'amendment' 
  | 'voting_scheduled' 
  | 'sponsor_update' 
  | 'engagement_milestone';

export type ChannelType = 'in_app' | 'email' | 'push' | 'sms' | 'webhook';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'filtered';

export interface AlertChannel {
  type: ChannelType;
  enabled: boolean;
  config: {
    email?: string;
    pushToken?: string;
    phoneNumber?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    verified: boolean;
  };
  priority: Priority;
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;
    timezone: string;
  };
}

export interface AlertConditions {
  billCategories?: string[];
  billStatuses?: string[];
  sponsorIds?: number[];
  keywords?: string[];
  minimumEngagement?: number;
  userRoles?: string[];
  timeRange?: {
    start: string; // HH:MM
    end: string;
  };
  dayOfWeek?: number[]; // 0-6
}

export interface SmartFilteringConfig {
  enabled: boolean;
  userInterestWeight: number; // 0-1
  engagementHistoryWeight: number; // 0-1
  trendingWeight: number; // 0-1
  duplicateFiltering: boolean;
  spamFiltering: boolean;
  minimumConfidence: number; // 0-1, threshold for sending
}

export interface FrequencyConfig {
  type: 'immediate' | 'batched';
  batchInterval?: 'hourly' | 'daily' | 'weekly';
  batchTime?: string; // HH:MM format
  batchDay?: number; // 0-6 for weekly
}

export interface AlertPreference {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  alertTypes: Array<{
    type: AlertType;
    enabled: boolean;
    priority: Priority;
    conditions?: AlertConditions;
  }>;
  channels: AlertChannel[];
  frequency: FrequencyConfig;
  smartFiltering: SmartFilteringConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertDeliveryLog {
  id: string;
  userId: string;
  preferenceId: string;
  alertType: AlertType;
  channels: ChannelType[];
  status: DeliveryStatus;
  deliveryAttempts: number;
  lastAttempt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  metadata: {
    billId?: number;
    sponsorId?: number;
    originalPriority: Priority;
    adjustedPriority?: Priority;
    filteredReason?: string;
    confidence?: number;
  };
  createdAt: Date;
}

export interface SmartFilteringResult {
  shouldSend: boolean;
  filteredReason?: string;
  adjustedPriority?: Priority;
  confidence: number; // 0-1
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const alertChannelSchema = z.object({
  type: z.enum(['in_app', 'email', 'push', 'sms', 'webhook']),
  enabled: z.boolean(),
  config: z.object({
    email: z.string().email().optional(),
    pushToken: z.string().optional(),
    phoneNumber: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    webhookSecret: z.string().optional(),
    verified: z.boolean().default(false)
  }),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string()
  }).optional()
});

const alertConditionsSchema = z.object({
  billCategories: z.array(z.string()).optional(),
  billStatuses: z.array(z.string()).optional(),
  sponsorIds: z.array(z.number()).optional(),
  keywords: z.array(z.string()).optional(),
  minimumEngagement: z.number().min(0).optional(),
  userRoles: z.array(z.string()).optional(),
  timeRange: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/)
  }).optional(),
  dayOfWeek: z.array(z.number().min(0).max(6)).optional()
});

export const alertPreferenceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  alertTypes: z.array(z.object({
    type: z.enum(['bill_status_change', 'new_comment', 'amendment', 'voting_scheduled', 'sponsor_update', 'engagement_milestone']),
    enabled: z.boolean(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    conditions: alertConditionsSchema.optional()
  })).min(1),
  channels: z.array(alertChannelSchema).min(1),
  frequency: z.object({
    type: z.enum(['immediate', 'batched']),
    batchInterval: z.enum(['hourly', 'daily', 'weekly']).optional(),
    batchTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    batchDay: z.number().min(0).max(6).optional()
  }).refine(data => {
    // If batched, require interval
    if (data.type === 'batched' && !data.batchInterval) {
      return false;
    }
    return true;
  }, { message: "Batched frequency requires batchInterval" }),
  smartFiltering: z.object({
    enabled: z.boolean(),
    userInterestWeight: z.number().min(0).max(1),
    engagementHistoryWeight: z.number().min(0).max(1),
    trendingWeight: z.number().min(0).max(1),
    duplicateFiltering: z.boolean(),
    spamFiltering: z.boolean(),
    minimumConfidence: z.number().min(0).max(1).default(0.3)
  })
});

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

/**
 * Unified Alert Preference Management Service
 * 
 * This service consolidates all alert preference management functionality including:
 * - CRUD operations for alert preferences
 * - Smart filtering based on user interests and engagement
 * - Multi-channel delivery management
 * - Batching and scheduling
 * - Delivery tracking and analytics
 */
export class UnifiedAlertPreferenceService {
  private db = databaseService.getDatabase();

  // ========================================================================
  // PREFERENCE MANAGEMENT
  // ========================================================================

  /**
   * Creates a new alert preference for a user
   * @param userId - The user's ID
   * @param preferenceData - The preference configuration
   * @returns The created preference
   */
  async createAlertPreference(
    userId: string,
    preferenceData: Omit<AlertPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<AlertPreference> {
    try {
      // Validate the incoming data to ensure it meets all requirements
      alertPreferenceSchema.parse(preferenceData);

      const preferenceId = this.generatePreferenceId();
      
      const newPreference: AlertPreference = {
        id: preferenceId,
        userId,
        ...preferenceData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in database within the user's preferences JSON column
      await this.storePreferenceInDatabase(userId, newPreference);
      
      // Clear the user's cache so next fetch gets fresh data
      await this.clearUserPreferenceCache(userId);

      logger.info(`Alert preference created: ${preferenceId}`, { 
        component: 'AlertPreferenceService',
        userId,
        preferenceId 
      });

      return newPreference;

    } catch (error) {
      logger.error('Error creating alert preference', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      throw error;
    }
  }

  /**
   * Retrieves all alert preferences for a user with caching
   */
  async getUserAlertPreferences(userId: string): Promise<AlertPreference[]> {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:alert_preferences`;

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const preferences = await this.fetchPreferencesFromDatabase(userId);
          
          // If no preferences exist, create and return default
          if (preferences.length === 0) {
            const defaultPref = await this.createDefaultAlertPreference(userId);
            return [defaultPref];
          }
          
          return preferences;
        } catch (error) {
          logger.error('Error fetching alert preferences', { 
            component: 'AlertPreferenceService',
            userId 
          }, error);
          // Return default on error to ensure system continues working
          return [await this.createDefaultAlertPreference(userId)];
        }
      },
      CACHE_TTL.USER_DATA
    );
  }

  /**
   * Gets a specific alert preference by ID
   */
  async getAlertPreference(userId: string, preferenceId: string): Promise<AlertPreference | null> {
    const preferences = await this.getUserAlertPreferences(userId);
    return preferences.find(p => p.id === preferenceId) || null;
  }

  /**
   * Updates an existing alert preference
   */
  async updateAlertPreference(
    userId: string,
    preferenceId: string,
    updates: Partial<Omit<AlertPreference, 'id' | 'userId' | 'createdAt'>>
  ): Promise<AlertPreference> {
    try {
      const existingPreference = await this.getAlertPreference(userId, preferenceId);
      
      if (!existingPreference) {
        throw new Error(`Alert preference ${preferenceId} not found`);
      }

      // Validate partial updates
      if (Object.keys(updates).length > 0) {
        alertPreferenceSchema.partial().parse(updates);
      }

      const updatedPreference: AlertPreference = {
        ...existingPreference,
        ...updates,
        updatedAt: new Date()
      };

      await this.updatePreferenceInDatabase(userId, updatedPreference);
      await this.clearUserPreferenceCache(userId);

      logger.info(`Alert preference updated: ${preferenceId}`, { 
        component: 'AlertPreferenceService',
        userId,
        preferenceId 
      });

      return updatedPreference;

    } catch (error) {
      logger.error('Error updating alert preference', { 
        component: 'AlertPreferenceService',
        userId,
        preferenceId 
      }, error);
      throw error;
    }
  }

  /**
   * Deletes an alert preference
   */
  async deleteAlertPreference(userId: string, preferenceId: string): Promise<void> {
    try {
      const existingPreference = await this.getAlertPreference(userId, preferenceId);
      
      if (!existingPreference) {
        throw new Error(`Alert preference ${preferenceId} not found`);
      }

      await this.removePreferenceFromDatabase(userId, preferenceId);
      await this.clearUserPreferenceCache(userId);

      logger.info(`Alert preference deleted: ${preferenceId}`, { 
        component: 'AlertPreferenceService',
        userId,
        preferenceId 
      });

    } catch (error) {
      logger.error('Error deleting alert preference', { 
        component: 'AlertPreferenceService',
        userId,
        preferenceId 
      }, error);
      throw error;
    }
  }

  // ========================================================================
  // SMART FILTERING
  // ========================================================================

  /**
   * Processes smart filtering to determine if an alert should be sent
   * 
   * This method evaluates multiple factors:
   * - User interest matching based on their explicit preferences
   * - Historical engagement patterns
   * - Trending topic relevance
   * - Duplicate detection
   * - Spam filtering
   * 
   * @returns A result indicating whether to send and with what priority
   */
  async processSmartFiltering(
    userId: string,
    alertType: AlertType,
    alertData: any,
    preference: AlertPreference
  ): Promise<SmartFilteringResult> {
    try {
      // If filtering is disabled, send everything
      if (!preference.smartFiltering.enabled) {
        return {
          shouldSend: true,
          confidence: 1.0
        };
      }

      let score = 0;
      let maxScore = 0;
      const reasons: string[] = [];

      // Calculate user interest score using configured weight
      if (preference.smartFiltering.userInterestWeight > 0) {
        const userInterestScore = await this.calculateUserInterestScore(userId, alertData);
        score += userInterestScore * preference.smartFiltering.userInterestWeight;
        maxScore += preference.smartFiltering.userInterestWeight;
        
        if (userInterestScore < 0.3) {
          reasons.push('Low relevance to user interests');
        }
      }

      // Calculate engagement history score
      if (preference.smartFiltering.engagementHistoryWeight > 0) {
        const engagementScore = await this.calculateEngagementHistoryScore(userId, alertData);
        score += engagementScore * preference.smartFiltering.engagementHistoryWeight;
        maxScore += preference.smartFiltering.engagementHistoryWeight;
        
        if (engagementScore < 0.2) {
          reasons.push('Low engagement with similar content');
        }
      }

      // Calculate trending score
      if (preference.smartFiltering.trendingWeight > 0) {
        const trendingScore = await this.calculateTrendingScore(alertData);
        score += trendingScore * preference.smartFiltering.trendingWeight;
        maxScore += preference.smartFiltering.trendingWeight;
      }

      // Check for duplicates
      if (preference.smartFiltering.duplicateFiltering) {
        const isDuplicate = await this.checkForDuplicateAlert(userId, alertType, alertData);
        if (isDuplicate) {
          return {
            shouldSend: false,
            filteredReason: 'Duplicate alert filtered',
            confidence: 1.0
          };
        }
      }

      // Check for spam
      if (preference.smartFiltering.spamFiltering) {
        const isSpam = await this.checkForSpam(userId, alertType);
        if (isSpam) {
          return {
            shouldSend: false,
            filteredReason: 'Spam alert filtered',
            confidence: 0.9
          };
        }
      }

      // Calculate final confidence score
      const confidence = maxScore > 0 ? score / maxScore : 1.0;
      const shouldSend = confidence >= preference.smartFiltering.minimumConfidence;

      // Adjust priority based on confidence level
      let adjustedPriority: Priority | undefined;
      if (confidence >= 0.8) {
        adjustedPriority = 'high';
      } else if (confidence >= 0.6) {
        adjustedPriority = 'normal';
      } else if (confidence >= preference.smartFiltering.minimumConfidence) {
        adjustedPriority = 'low';
      }

      return {
        shouldSend,
        filteredReason: shouldSend ? undefined : reasons.join(', '),
        adjustedPriority,
        confidence
      };

    } catch (error) {
      logger.error('Error processing smart filtering', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      // On error, default to sending with medium confidence
      return {
        shouldSend: true,
        confidence: 0.5
      };
    }
  }

  // ========================================================================
  // ALERT DELIVERY
  // ========================================================================

  /**
   * Processes alert delivery based on user preferences
   * 
   * This method orchestrates the entire delivery process:
   * 1. Fetches user preferences
   * 2. Applies smart filtering
   * 3. Determines channels and priority
   * 4. Handles batching or immediate delivery
   * 5. Logs all delivery attempts
   */
  async processAlertDelivery(
    userId: string,
    alertType: AlertType,
    alertData: any,
    originalPriority: Priority = 'normal'
  ): Promise<AlertDeliveryLog[]> {
    try {
      const preferences = await this.getUserAlertPreferences(userId);
      const deliveryLogs: AlertDeliveryLog[] = [];

      for (const preference of preferences) {
        // Skip inactive preferences
        if (!preference.isActive) continue;

        // Check if this alert type is enabled
        const alertTypeConfig = preference.alertTypes.find(at => at.type === alertType);
        if (!alertTypeConfig || !alertTypeConfig.enabled) continue;

        // Check if conditions match (if specified)
        if (alertTypeConfig.conditions && !this.matchesConditions(alertData, alertTypeConfig.conditions)) {
          continue;
        }

        // Apply smart filtering
        const filteringResult = await this.processSmartFiltering(userId, alertType, alertData, preference);
        
        if (!filteringResult.shouldSend) {
          // Log filtered alert
          const log = this.createDeliveryLog(
            userId,
            preference.id,
            alertType,
            [],
            'filtered',
            originalPriority,
            {
              filteredReason: filteringResult.filteredReason,
              confidence: filteringResult.confidence,
              billId: alertData.billId,
              sponsorId: alertData.sponsorId
            }
          );
          
          deliveryLogs.push(log);
          await this.storeDeliveryLog(log);
          continue;
        }

        // Determine final priority
        const finalPriority = filteringResult.adjustedPriority || alertTypeConfig.priority;

        // Get enabled channels appropriate for this priority
        const enabledChannels = this.getEnabledChannelsForPriority(preference.channels, finalPriority);

        if (enabledChannels.length === 0) continue;

        // Handle batching vs immediate delivery
        if (preference.frequency.type === 'batched' && finalPriority !== 'urgent') {
          await this.addToBatch(userId, preference.id, {
            alertType,
            alertData,
            priority: finalPriority,
            channels: enabledChannels.map(ch => ch.type)
          });
          
          const log = this.createDeliveryLog(
            userId,
            preference.id,
            alertType,
            enabledChannels.map(ch => ch.type),
            'pending',
            originalPriority,
            {
              adjustedPriority: finalPriority,
              confidence: filteringResult.confidence,
              billId: alertData.billId,
              sponsorId: alertData.sponsorId
            }
          );
          
          deliveryLogs.push(log);
          await this.storeDeliveryLog(log);
        } else {
          // Immediate delivery
          const deliveryResult = await this.deliverImmediateAlert(
            userId,
            alertType,
            alertData,
            enabledChannels,
            finalPriority
          );

          const log = this.createDeliveryLog(
            userId,
            preference.id,
            alertType,
            enabledChannels.map(ch => ch.type),
            deliveryResult.success ? 'sent' : 'failed',
            originalPriority,
            {
              adjustedPriority: finalPriority,
              confidence: filteringResult.confidence,
              billId: alertData.billId,
              sponsorId: alertData.sponsorId
            },
            deliveryResult.success ? new Date() : undefined,
            deliveryResult.error
          );
          
          deliveryLogs.push(log);
          await this.storeDeliveryLog(log);
        }
      }

      logger.info(`Alert delivery processed: ${deliveryLogs.length} logs created`, { 
        component: 'AlertPreferenceService',
        userId,
        alertType 
      });

      return deliveryLogs;

    } catch (error) {
      logger.error('Error processing alert delivery', { 
        component: 'AlertPreferenceService',
        userId,
        alertType 
      }, error);
      throw error;
    }
  }

  // ========================================================================
  // ANALYTICS AND REPORTING
  // ========================================================================

  /**
   * Retrieves delivery logs with pagination and filtering
   */
  async getAlertDeliveryLogs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      alertType?: AlertType;
      status?: DeliveryStatus;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    logs: AlertDeliveryLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);

    try {
      let allLogs = await this.fetchDeliveryLogsFromDatabase(userId);
      
      // Apply filters
      if (options.alertType) {
        allLogs = allLogs.filter(log => log.alertType === options.alertType);
      }
      
      if (options.status) {
        allLogs = allLogs.filter(log => log.status === options.status);
      }
      
      if (options.startDate) {
        allLogs = allLogs.filter(log => log.createdAt >= options.startDate!);
      }
      
      if (options.endDate) {
        allLogs = allLogs.filter(log => log.createdAt <= options.endDate!);
      }

      // Sort by creation date descending
      allLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Paginate
      const total = allLogs.length;
      const startIndex = (page - 1) * limit;
      const paginatedLogs = allLogs.slice(startIndex, startIndex + limit);

      return {
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error fetching delivery logs', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      return {
        logs: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }
  }

  /**
   * Gets comprehensive statistics about alert preferences and delivery
   */
  async getAlertPreferenceStats(userId: string): Promise<{
    totalPreferences: number;
    activePreferences: number;
    deliveryStats: {
      totalAlerts: number;
      successfulDeliveries: number;
      failedDeliveries: number;
      filteredAlerts: number;
    };
    channelStats: Record<ChannelType, {
      enabled: boolean;
      deliveries: number;
      successRate: number;
    }>;
  }> {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:alert_stats`;

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const preferences = await this.getUserAlertPreferences(userId);
          const logs = await this.fetchDeliveryLogsFromDatabase(userId);

          const deliveryStats = {
            totalAlerts: logs.length,
            successfulDeliveries: logs.filter(log => 
              log.status === 'sent' || log.status === 'delivered'
            ).length,
            failedDeliveries: logs.filter(log => log.status === 'failed').length,
            filteredAlerts: logs.filter(log => log.status === 'filtered').length
          };

          const channelStats: any = {};
          const channelTypes: ChannelType[] = ['in_app', 'email', 'push', 'sms', 'webhook'];
          
          for (const channelType of channelTypes) {
            const channelLogs = logs.filter(log => log.channels.includes(channelType));
            const successfulChannelLogs = channelLogs.filter(log => 
              log.status === 'sent' || log.status === 'delivered'
            );
            
            channelStats[channelType] = {
              enabled: preferences.some(p => 
                p.channels.some(ch => ch.type === channelType && ch.enabled)
              ),
              deliveries: channelLogs.length,
              successRate: channelLogs.length > 0 
                ? (successfulChannelLogs.length / channelLogs.length) * 100 
                : 0
            };
          }

          return {
            totalPreferences: preferences.length,
            activePreferences: preferences.filter(p => p.isActive).length,
            deliveryStats,
            channelStats
          };

        } catch (error) {
          logger.error('Error fetching alert stats', { 
            component: 'AlertPreferenceService',
            userId 
          }, error);
          throw error;
        }
      },
      CACHE_TTL.ALERT_DATA
    );
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private async createDefaultAlertPreference(userId: string): Promise<AlertPreference> {
    const defaultPreference: AlertPreference = {
      id: `default_${userId}`,
      userId,
      name: 'Default Alerts',
      description: 'Default alert preferences for all bill updates',
      isActive: true,
      alertTypes: [
        {
          type: 'bill_status_change',
          enabled: true,
          priority: 'normal'
        },
        {
          type: 'voting_scheduled',
          enabled: true,
          priority: 'high'
        }
      ],
      channels: [
        {
          type: 'in_app',
          enabled: true,
          config: { verified: true },
          priority: 'normal'
        }
      ],
      frequency: {
        type: 'immediate'
      },
      smartFiltering: {
        enabled: true,
        userInterestWeight: 0.6,
        engagementHistoryWeight: 0.3,
        trendingWeight: 0.1,
        duplicateFiltering: true,
        spamFiltering: true,
        minimumConfidence: 0.3
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.storePreferenceInDatabase(userId, defaultPreference);
    return defaultPreference;
  }

  private async calculateUserInterestScore(userId: string, alertData: any): Promise<number> {
    try {
      const userProfile = await userProfileService.getUserProfile(userId);
      const userInterests = userProfile.interests || [];

      if (userInterests.length === 0) return 0.5;

      let matchScore = 0;
      let totalChecks = 0;

      if (alertData.billCategory) {
        totalChecks++;
        if (userInterests.some(interest => 
          interest.toLowerCase() === alertData.billCategory.toLowerCase()
        )) {
          matchScore += 1;
        }
      }

      if (alertData.keywords && Array.isArray(alertData.keywords)) {
        for (const keyword of alertData.keywords) {
          totalChecks++;
          if (userInterests.some(interest => 
            interest.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(interest.toLowerCase())
          )) {
            matchScore += 0.5;
          }
        }
      }

      return totalChecks > 0 ? Math.min(matchScore / totalChecks, 1.0) : 0.5;

    } catch (error) {
      logger.error('Error calculating user interest score', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      return 0.5;
    }
  }

  private async calculateEngagementHistoryScore(userId: string, alertData: any): Promise<number> {
    try {
      const engagementHistory = await userProfileService.getUserEngagementHistory(userId);
      
      if (engagementHistory.totalBillsTracked === 0) return 0.5;

      if (alertData.billCategory) {
        const categoryEngagement = engagementHistory.topCategories?.find(
          cat => cat.category.toLowerCase() === alertData.billCategory.toLowerCase()
        );
        
        if (categoryEngagement) {
          return Math.min(
            categoryEngagement.engagementCount / engagementHistory.totalBillsTracked, 
            1.0
          );
        }
      }

      return 0.5;

    } catch (error) {
      logger.error('Error calculating engagement history score', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      return 0.5;
    }
  }

  private async calculateTrendingScore(alertData: any): Promise<number> {
    // In production, this would analyze actual trending metrics
    // For now, use engagement count if available
    if (alertData.engagementCount && typeof alertData.engagementCount === 'number') {
      // Normalize engagement count to 0-1 scale (assuming max of 1000)
      return Math.min(alertData.engagementCount / 1000, 1.0);
    }
    return 0.5;
  }

  private async checkForDuplicateAlert(
    userId: string, 
    alertType: AlertType, 
    alertData: any
  ): Promise<boolean> {
    try {
      const recentLogs = await this.getRecentDeliveryLogs(userId, 24);
      
      return recentLogs.some(log => 
        log.alertType === alertType &&
        log.metadata.billId === alertData.billId &&
        log.status !== 'failed'
      );

    } catch (error) {
      logger.error('Error checking for duplicate alert', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      return false;
    }
  }

  private async checkForSpam(userId: string, alertType: AlertType): Promise<boolean> {
    try {
      const recentLogs = await this.getRecentDeliveryLogs(userId, 1);
      
      // Simple spam detection: more than 10 alerts of same type in last hour
      const sameTypeCount = recentLogs.filter(log => log.alertType === alertType).length;
      return sameTypeCount > 10;

    } catch (error) {
      logger.error('Error checking for spam', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      return false;
    }
  }

  private matchesConditions(alertData: any, conditions: AlertConditions): boolean {
    // Check bill categories
    if (conditions.billCategories && conditions.billCategories.length > 0) {
      if (!alertData.billCategory || 
          !conditions.billCategories.includes(alertData.billCategory)) {
        return false;
      }
    }

    // Check bill statuses
    if (conditions.billStatuses && conditions.billStatuses.length > 0) {
      if (!alertData.billStatus || 
          !conditions.billStatuses.includes(alertData.billStatus)) {
        return false;
      }
    }

    // Check sponsor IDs
    if (conditions.sponsorIds && conditions.sponsorIds.length > 0) {
      if (!alertData.sponsorId || 
          !conditions.sponsorIds.includes(alertData.sponsorId)) {
        return false;
      }
    }

    // Check keywords
    if (conditions.keywords && conditions.keywords.length > 0) {
      const alertText = [
        alertData.title,
        alertData.description,
        alertData.content
      ].filter(Boolean).join(' ').toLowerCase();
      
      const hasMatchingKeyword = conditions.keywords.some(keyword =>
        alertText.includes(keyword.toLowerCase())
      );
      
      if (!hasMatchingKeyword) {
        return false;
      }
    }

    // Check minimum engagement
    if (conditions.minimumEngagement && alertData.engagementCount) {
      if (alertData.engagementCount < conditions.minimumEngagement) {
        return false;
      }
    }

    return true;
  }

  private getEnabledChannelsForPriority(
    channels: AlertChannel[], 
    priority: Priority
  ): AlertChannel[] {
    return channels.filter(channel => {
      if (!channel.enabled) return false;
      
      // Urgent alerts go to all enabled channels
      if (priority === 'urgent') return true;
      
      // High priority alerts go to normal and high priority channels
      if (priority === 'high' && channel.priority !== 'low') return true;
      
      // Normal alerts go to normal priority channels
      if (priority === 'normal' && channel.priority === 'normal') return true;
      
      // Low priority alerts go to all channels
      if (priority === 'low') return true;
      
      return false;
    });
  }

  private async deliverImmediateAlert(
    userId: string,
    alertType: AlertType,
    alertData: any,
    channels: AlertChannel[],
    priority: Priority
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const notificationTypeMap: Record<AlertType, { type: any; subType?: any }> = {
        'bill_status_change': { type: 'bill_update', subType: 'status_change' },
        'new_comment': { type: 'bill_update', subType: 'new_comment' },
        'amendment': { type: 'bill_update', subType: 'amendment' },
        'voting_scheduled': { type: 'bill_update', subType: 'voting_scheduled' },
        'sponsor_update': { type: 'bill_update', subType: 'status_change' },
        'engagement_milestone': { type: 'digest' }
      };

      const mapped = notificationTypeMap[alertType] || { type: 'system_alert' };

      await notificationChannelService.sendMultiChannelNotification({
        userId,
        type: mapped.type,
        subType: mapped.subType,
        title: alertData.title || this.getDefaultTitle(alertType),
        message: alertData.message || alertData.description || 'You have a new alert',
        priority: priority as any,
        relatedBillId: (alertData && alertData.billId) || undefined,
        metadata: alertData as any
      });

      return { success: true };

    } catch (error) {
      logger.error('Error delivering immediate alert', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getDefaultTitle(alertType: AlertType): string {
    const titles: Record<AlertType, string> = {
      'bill_status_change': 'Bill Status Update',
      'new_comment': 'New Comment',
      'amendment': 'Bill Amendment',
      'voting_scheduled': 'Voting Scheduled',
      'sponsor_update': 'Sponsor Update',
      'engagement_milestone': 'Engagement Milestone Reached'
    };
    return titles[alertType] || 'New Alert';
  }

  private async addToBatch(
    userId: string, 
    preferenceId: string, 
    alertData: any
  ): Promise<void> {
    const batchKey = `alert_batch:${userId}:${preferenceId}`;
    
    try {
      const existingBatch = await cacheService.get(batchKey) || [];
      existingBatch.push({
        ...alertData,
        timestamp: new Date()
      });
      
  await cacheService.set(batchKey, existingBatch, CACHE_TTL.LONG);
    } catch (error) {
      logger.error('Error adding to batch', { 
        component: 'AlertPreferenceService',
        userId,
        preferenceId 
      }, error);
    }
  }

  private createDeliveryLog(
    userId: string,
    preferenceId: string,
    alertType: AlertType,
    channels: ChannelType[],
    status: DeliveryStatus,
    originalPriority: Priority,
    metadata: any,
    deliveredAt?: Date,
    failureReason?: string
  ): AlertDeliveryLog {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      preferenceId,
      alertType,
      channels,
      status,
      deliveryAttempts: status === 'failed' ? 1 : 0,
      lastAttempt: new Date(),
      deliveredAt,
      failureReason,
      metadata: {
        originalPriority,
        ...metadata
      },
      createdAt: new Date()
    };
  }

  private generatePreferenceId(): string {
    return `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========================================================================
  // DATABASE OPERATIONS
  // ========================================================================

  /**
   * Store preference in the database (users.preferences JSON column)
   */
  private async storePreferenceInDatabase(
    userId: string, 
    preference: AlertPreference
  ): Promise<void> {
    try {
      // Fetch current user preferences
      const [user] = await this.db
        .select({ preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      const currentPreferences = (user?.preferences as any) || {};
      const alertPreferences = currentPreferences.alertPreferences || [];
      
      // Add or update the preference
      const existingIndex = alertPreferences.findIndex((p: any) => p.id === preference.id);
      if (existingIndex >= 0) {
        alertPreferences[existingIndex] = preference;
      } else {
        alertPreferences.push(preference);
      }

      // Update the database
      await this.db
        .update(schema.users)
        .set({
          preferences: {
            ...currentPreferences,
            alertPreferences
          },
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, userId));

    } catch (error) {
      logger.error('Error storing preference in database', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      throw error;
    }
  }

  /**
   * Update an existing preference in the database
   */
  private async updatePreferenceInDatabase(
    userId: string, 
    preference: AlertPreference
  ): Promise<void> {
    await this.storePreferenceInDatabase(userId, preference);
  }

  /**
   * Remove a preference from the database
   */
  private async removePreferenceFromDatabase(
    userId: string, 
    preferenceId: string
  ): Promise<void> {
    try {
      const [user] = await this.db
        .select({ preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      const currentPreferences = (user?.preferences as any) || {};
      const alertPreferences = currentPreferences.alertPreferences || [];
      
      // Filter out the preference
      const updatedPreferences = alertPreferences.filter((p: any) => p.id !== preferenceId);

      // Update the database
      await this.db
        .update(schema.users)
        .set({
          preferences: {
            ...currentPreferences,
            alertPreferences: updatedPreferences
          },
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, userId));

    } catch (error) {
      logger.error('Error removing preference from database', { 
        component: 'AlertPreferenceService',
        userId,
        preferenceId 
      }, error);
      throw error;
    }
  }

  /**
   * Fetch all preferences for a user from the database
   */
  private async fetchPreferencesFromDatabase(userId: string): Promise<AlertPreference[]> {
    try {
      const [user] = await this.db
        .select({ preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!user) {
        return [];
      }

      const currentPreferences = (user.preferences as any) || {};
      const alertPreferences = currentPreferences.alertPreferences || [];
      
      // Convert stored data to AlertPreference objects with proper Date types
      return alertPreferences.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }));

    } catch (error) {
      logger.error('Error fetching preferences from database', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      throw error;
    }
  }

  /**
   * Store a delivery log in the database
   */
  private async storeDeliveryLog(log: AlertDeliveryLog): Promise<void> {
    try {
      // Store in user preferences under deliveryLogs array
      const [user] = await this.db
        .select({ preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, log.userId))
        .limit(1);

      const currentPreferences = (user?.preferences as any) || {};
      const deliveryLogs = currentPreferences.deliveryLogs || [];
      
      // Add new log
      deliveryLogs.push(log);
      
      // Keep only the most recent 1000 logs per user
      if (deliveryLogs.length > 1000) {
        deliveryLogs.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        deliveryLogs.splice(1000);
      }

      // Update the database
      await this.db
        .update(schema.users)
        .set({
          preferences: {
            ...currentPreferences,
            deliveryLogs
          }
        })
        .where(eq(schema.users.id, log.userId));

    } catch (error) {
      logger.error('Error storing delivery log', { 
        component: 'AlertPreferenceService',
        userId: log.userId 
      }, error);
    }
  }

  /**
   * Fetch all delivery logs for a user from the database
   */
  private async fetchDeliveryLogsFromDatabase(userId: string): Promise<AlertDeliveryLog[]> {
    try {
      const [user] = await this.db
        .select({ preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!user) {
        return [];
      }

      const currentPreferences = (user.preferences as any) || {};
      const deliveryLogs = currentPreferences.deliveryLogs || [];
      
      // Convert to proper types
      return deliveryLogs.map((log: any) => ({
        ...log,
        createdAt: new Date(log.createdAt),
        lastAttempt: new Date(log.lastAttempt),
        deliveredAt: log.deliveredAt ? new Date(log.deliveredAt) : undefined
      }));

    } catch (error) {
      logger.error('Error fetching delivery logs from database', { 
        component: 'AlertPreferenceService',
        userId 
      }, error);
      return [];
    }
  }

  /**
   * Get recent delivery logs within specified hours
   */
  private async getRecentDeliveryLogs(userId: string, hours: number): Promise<AlertDeliveryLog[]> {
    const allLogs = await this.fetchDeliveryLogsFromDatabase(userId);
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return allLogs.filter(log => log.createdAt >= cutoffTime);
  }

  /**
   * Clear cached preferences for a user
   */
  private async clearUserPreferenceCache(userId: string): Promise<void> {
    const patterns = [
      `${CACHE_KEYS.USER_PROFILE(userId)}:alert_preferences`,
      `${CACHE_KEYS.USER_PROFILE(userId)}:alert_stats`
    ];

    for (const pattern of patterns) {
      try {
        await cacheService.delete(pattern);
      } catch (error) {
        logger.error(`Error clearing cache pattern ${pattern}`, { 
          component: 'AlertPreferenceService' 
        }, error);
      }
    }
  }

  // ========================================================================
  // PUBLIC UTILITY METHODS
  // ========================================================================

  /**
   * Process batched alerts for a user
   * This should be called by a scheduled job
   */
  async processBatchedAlerts(userId: string, preferenceId: string): Promise<number> {
    const batchKey = `alert_batch:${userId}:${preferenceId}`;
    
    try {
      const batch = await cacheService.get(batchKey);
      
      if (!batch || batch.length === 0) {
        return 0;
      }

      const preference = await this.getAlertPreference(userId, preferenceId);
      
      if (!preference) {
        logger.warn(`Preference ${preferenceId} not found for batched alerts`, {
          component: 'AlertPreferenceService',
          userId,
          preferenceId
        });
        return 0;
      }

      // Group alerts by type
      const groupedAlerts = batch.reduce((acc: any, alert: any) => {
        if (!acc[alert.alertType]) {
          acc[alert.alertType] = [];
        }
        acc[alert.alertType].push(alert);
        return acc;
      }, {});

      // Send batch notification
      await notificationChannelService.sendMultiChannelNotification({
        userId,
        type: 'digest',
        title: 'Alert Digest',
        message: `You have ${batch.length} new alerts`,
        priority: 'medium',
        metadata: {
          batch: groupedAlerts,
          preferenceId
        } as any,
        relatedBillId: undefined
      });

      // Clear the batch
      await cacheService.delete(batchKey);

      logger.info(`Processed ${batch.length} batched alerts`, {
        component: 'AlertPreferenceService',
        userId,
        preferenceId
      });

      return batch.length;

    } catch (error) {
      logger.error('Error processing batched alerts', {
        component: 'AlertPreferenceService',
        userId,
        preferenceId
      }, error);
      return 0;
    }
  }

  /**
   * Verify a notification channel (email, SMS, etc.)
   */
  async verifyChannel(
    userId: string,
    preferenceId: string,
    channelType: ChannelType,
    verificationCode: string
  ): Promise<boolean> {
    try {
      // In production, verify the code against a stored verification token
      // For now, we'll assume verification is successful
      
      const preference = await this.getAlertPreference(userId, preferenceId);
      
      if (!preference) {
        throw new Error('Preference not found');
      }

      const channelIndex = preference.channels.findIndex(ch => ch.type === channelType);
      
      if (channelIndex === -1) {
        throw new Error('Channel not found');
      }

      // Update the channel's verified status
      preference.channels[channelIndex].config.verified = true;
      
      await this.updateAlertPreference(userId, preferenceId, {
        channels: preference.channels
      });

      logger.info(`Channel ${channelType} verified`, {
        component: 'AlertPreferenceService',
        userId,
        preferenceId
      });

      return true;

    } catch (error) {
      logger.error('Error verifying channel', {
        component: 'AlertPreferenceService',
        userId,
        preferenceId,
        channelType
      }, error);
      return false;
    }
  }

  /**
   * Get service health and statistics
   */
  getServiceStats() {
    return {
      serviceActive: true,
      version: '2.0.0',
      lastUpdate: new Date(),
      features: [
        'Smart Filtering',
        'Multi-Channel Delivery',
        'Batched Notifications',
        'Duplicate Detection',
        'Spam Filtering',
        'Priority Adjustment',
        'Engagement Tracking'
      ]
    };
  }

  /**
   * Shutdown service gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Unified Alert Preference Service...', { 
      component: 'AlertPreferenceService' 
    });
    // Perform any necessary cleanup
    logger.info('Unified Alert Preference Service shutdown complete', { 
      component: 'AlertPreferenceService' 
    });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const unifiedAlertPreferenceService = new UnifiedAlertPreferenceService();