import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { databaseService } from '../../infrastructure/database/database-service.js';
import { notificationChannelService } from '../../infrastructure/notifications/notification-channels.js';
import { userProfileService } from './user-profile.js';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../../infrastructure/cache/cache-service.js';
import * as schema from '../../../shared/schema.js';
import { z } from 'zod';
import { logger } from '../../utils/logger';

// Types and interfaces
export interface AlertChannel {
  type: 'in_app' | 'email' | 'push' | 'sms';
  enabled: boolean;
  config: {
    email?: string;
    pushToken?: string;
    phoneNumber?: string;
    verified: boolean;
  };
  priority: 'low' | 'normal' | 'high';
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
    timezone: string;
  };
}

export interface AlertPreference {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  alertTypes: Array<{
    type: 'bill_status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 'sponsor_update' | 'engagement_milestone';
    enabled: boolean;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    conditions?: {
      billCategories?: string[];
      billStatuses?: string[];
      sponsorIds?: number[];
      keywords?: string[];
      minimumEngagement?: number;
    };
  }>;
  channels: AlertChannel[];
  frequency: {
    type: 'immediate' | 'batched';
    batchInterval?: 'hourly' | 'daily' | 'weekly';
    batchTime?: string; // HH:MM format for daily/weekly batches
    batchDay?: number; // 0-6 for weekly batches (0 = Sunday)
  };
  smartFiltering: {
    enabled: boolean;
    userInterestWeight: number; // 0-1, how much to weight user interests
    engagementHistoryWeight: number; // 0-1, how much to weight past engagement
    trendingWeight: number; // 0-1, how much to weight trending topics
    duplicateFiltering: boolean;
    spamFiltering: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertRule {
  id: string;
  preferenceId: string;
  name: string;
  conditions: {
    billCategories?: string[];
    billStatuses?: string[];
    sponsorIds?: number[];
    keywords?: string[];
    minimumEngagement?: number;
    userRoles?: string[];
    timeRange?: {
      start: string; // HH:MM
      end: string;   // HH:MM
    };
    dayOfWeek?: number[]; // 0-6
  };
  actions: {
    channels: string[];
    priority: 'low' | 'normal' | 'high' | 'urgent';
    template?: string;
    customMessage?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertDeliveryLog {
  id: string;
  userId: string;
  preferenceId: string;
  alertType: string;
  channels: string[];
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'filtered';
  deliveryAttempts: number;
  lastAttempt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  metadata: {
    billId?: number;
    sponsorId?: number;
    originalPriority: string;
    filteredReason?: string;
  };
  createdAt: Date;
}

export interface SmartFilteringResult {
  shouldSend: boolean;
  filteredReason?: string;
  adjustedPriority?: 'low' | 'normal' | 'high' | 'urgent';
  recommendedChannels?: string[];
  confidence: number; // 0-1
}

// Validation schemas
const alertChannelSchema = z.object({
  type: z.enum(['in_app', 'email', 'push', 'sms']),
  enabled: z.boolean(),
  config: z.object({
    email: z.string().email().optional(),
    pushToken: z.string().optional(),
    phoneNumber: z.string().optional(),
    verified: z.boolean().default(false)
  }),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string()
  }).optional()
});

const alertPreferenceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  alertTypes: z.array(z.object({
    type: z.enum(['bill_status_change', 'new_comment', 'amendment', 'voting_scheduled', 'sponsor_update', 'engagement_milestone']),
    enabled: z.boolean(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    conditions: z.object({
      billCategories: z.array(z.string()).optional(),
      billStatuses: z.array(z.string()).optional(),
      sponsorIds: z.array(z.number()).optional(),
      keywords: z.array(z.string()).optional(),
      minimumEngagement: z.number().min(0).optional()
    }).optional()
  })),
  channels: z.array(alertChannelSchema),
  frequency: z.object({
    type: z.enum(['immediate', 'batched']),
    batchInterval: z.enum(['hourly', 'daily', 'weekly']).optional(),
    batchTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    batchDay: z.number().min(0).max(6).optional()
  }),
  smartFiltering: z.object({
    enabled: z.boolean(),
    userInterestWeight: z.number().min(0).max(1),
    engagementHistoryWeight: z.number().min(0).max(1),
    trendingWeight: z.number().min(0).max(1),
    duplicateFiltering: z.boolean(),
    spamFiltering: z.boolean()
  })
});

const alertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  conditions: z.object({
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
  }),
  actions: z.object({
    channels: z.array(z.string()),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    template: z.string().optional(),
    customMessage: z.string().max(1000).optional()
  }),
  isActive: z.boolean().default(true)
});

/**
 * Comprehensive Alert Preference Management Service
 * Handles user alert preferences, smart filtering, and delivery management
 */
export class AlertPreferenceService {
  private db = databaseService.getDatabase();

  /**
   * Create a new alert preference for a user
   */
  async createAlertPreference(
    userId: string,
    preferenceData: Omit<AlertPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<AlertPreference> {
    try {
      console.log(`📋 Creating alert preference for user ${userId}`);

      // Validate preference data
      alertPreferenceSchema.parse(preferenceData);

      const preferenceId = `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newPreference: AlertPreference = {
        id: preferenceId,
        userId,
        ...preferenceData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in cache (since we don't have a dedicated table)
      await this.storeAlertPreference(newPreference);

      // Clear user's preference cache
      await this.clearUserPreferenceCache(userId);

      // Send confirmation notification
      await this.sendPreferenceUpdateNotification(userId, 'created', newPreference.name);

      console.log(`✅ Alert preference created: ${preferenceId}`);
      return newPreference;

    } catch (error) {
      console.error(`Error creating alert preference for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all alert preferences for a user
   */
  async getUserAlertPreferences(userId: string): Promise<AlertPreference[]> {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:alert_preferences`;

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          // Get preferences from cache storage
          const preferences = await this.getAllUserPreferences(userId);
          return preferences;
        } catch (error) {
          console.error(`Error getting alert preferences for user ${userId}:`, error);
          
          // Return default preferences
          return [await this.createDefaultAlertPreference(userId)];
        }
      },
      CACHE_TTL.USER_DATA
    );
  }

  /**
   * Get a specific alert preference
   */
  async getAlertPreference(userId: string, preferenceId: string): Promise<AlertPreference | null> {
    try {
      const preferences = await this.getUserAlertPreferences(userId);
      return preferences.find(p => p.id === preferenceId) || null;
    } catch (error) {
      console.error(`Error getting alert preference ${preferenceId} for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update an alert preference
   */
  async updateAlertPreference(
    userId: string,
    preferenceId: string,
    updates: Partial<Omit<AlertPreference, 'id' | 'userId' | 'createdAt'>>
  ): Promise<AlertPreference> {
    try {
      console.log(`📝 Updating alert preference ${preferenceId} for user ${userId}`);

      const existingPreference = await this.getAlertPreference(userId, preferenceId);
      if (!existingPreference) {
        throw new Error(`Alert preference ${preferenceId} not found`);
      }

      // Validate updates
      if (updates.alertTypes || updates.channels || updates.frequency || updates.smartFiltering) {
        alertPreferenceSchema.partial().parse(updates);
      }

      const updatedPreference: AlertPreference = {
        ...existingPreference,
        ...updates,
        updatedAt: new Date()
      };

      // Store updated preference
      await this.storeAlertPreference(updatedPreference);

      // Clear user's preference cache
      await this.clearUserPreferenceCache(userId);

      // Send update notification
      await this.sendPreferenceUpdateNotification(userId, 'updated', updatedPreference.name);

      console.log(`✅ Alert preference updated: ${preferenceId}`);
      return updatedPreference;

    } catch (error) {
      console.error(`Error updating alert preference ${preferenceId} for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an alert preference
   */
  async deleteAlertPreference(userId: string, preferenceId: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting alert preference ${preferenceId} for user ${userId}`);

      const existingPreference = await this.getAlertPreference(userId, preferenceId);
      if (!existingPreference) {
        throw new Error(`Alert preference ${preferenceId} not found`);
      }

      // Remove from storage
      await this.removeAlertPreference(preferenceId);

      // Clear user's preference cache
      await this.clearUserPreferenceCache(userId);

      // Send deletion notification
      await this.sendPreferenceUpdateNotification(userId, 'deleted', existingPreference.name);

      console.log(`✅ Alert preference deleted: ${preferenceId}`);

    } catch (error) {
      console.error(`Error deleting alert preference ${preferenceId} for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create an alert rule for a preference
   */
  async createAlertRule(
    userId: string,
    preferenceId: string,
    ruleData: Omit<AlertRule, 'id' | 'preferenceId' | 'createdAt' | 'updatedAt'>
  ): Promise<AlertRule> {
    try {
      console.log(`📏 Creating alert rule for preference ${preferenceId}`);

      // Validate rule data
      alertRuleSchema.parse(ruleData);

      // Verify preference exists
      const preference = await this.getAlertPreference(userId, preferenceId);
      if (!preference) {
        throw new Error(`Alert preference ${preferenceId} not found`);
      }

      const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newRule: AlertRule = {
        id: ruleId,
        preferenceId,
        ...ruleData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store rule
      await this.storeAlertRule(newRule);

      console.log(`✅ Alert rule created: ${ruleId}`);
      return newRule;

    } catch (error) {
      console.error(`Error creating alert rule for preference ${preferenceId}:`, error);
      throw error;
    }
  }

  /**
   * Process smart filtering for an alert
   */
  async processSmartFiltering(
    userId: string,
    alertType: string,
    alertData: any,
    preference: AlertPreference
  ): Promise<SmartFilteringResult> {
    try {
      if (!preference.smartFiltering.enabled) {
        return {
          shouldSend: true,
          confidence: 1.0
        };
      }

      let score = 0;
      let maxScore = 0;
      const reasons: string[] = [];

      // User interest matching
      if (preference.smartFiltering.userInterestWeight > 0) {
        const userInterestScore = await this.calculateUserInterestScore(userId, alertData);
        score += userInterestScore * preference.smartFiltering.userInterestWeight;
        maxScore += preference.smartFiltering.userInterestWeight;
        
        if (userInterestScore < 0.3) {
          reasons.push('Low relevance to user interests');
        }
      }

      // Engagement history matching
      if (preference.smartFiltering.engagementHistoryWeight > 0) {
        const engagementScore = await this.calculateEngagementHistoryScore(userId, alertData);
        score += engagementScore * preference.smartFiltering.engagementHistoryWeight;
        maxScore += preference.smartFiltering.engagementHistoryWeight;
        
        if (engagementScore < 0.2) {
          reasons.push('Low engagement with similar content');
        }
      }

      // Trending topic weighting
      if (preference.smartFiltering.trendingWeight > 0) {
        const trendingScore = await this.calculateTrendingScore(alertData);
        score += trendingScore * preference.smartFiltering.trendingWeight;
        maxScore += preference.smartFiltering.trendingWeight;
      }

      // Duplicate filtering
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

      // Spam filtering
      if (preference.smartFiltering.spamFiltering) {
        const isSpam = await this.checkForSpam(userId, alertType, alertData);
        if (isSpam) {
          return {
            shouldSend: false,
            filteredReason: 'Spam alert filtered',
            confidence: 0.9
          };
        }
      }

      const confidence = maxScore > 0 ? score / maxScore : 1.0;
      const shouldSend = confidence >= 0.3; // Threshold for sending

      // Adjust priority based on confidence
      let adjustedPriority: 'low' | 'normal' | 'high' | 'urgent' | undefined;
      if (confidence >= 0.8) {
        adjustedPriority = 'high';
      } else if (confidence >= 0.6) {
        adjustedPriority = 'normal';
      } else if (confidence >= 0.3) {
        adjustedPriority = 'low';
      }

      return {
        shouldSend,
        filteredReason: shouldSend ? undefined : reasons.join(', '),
        adjustedPriority,
        confidence
      };

    } catch (error) {
      logger.error('Error processing smart filtering:', { component: 'SimpleTool' }, error);
      // Default to sending on error
      return {
        shouldSend: true,
        confidence: 0.5
      };
    }
  }

  /**
   * Process alert delivery based on user preferences
   */
  async processAlertDelivery(
    userId: string,
    alertType: string,
    alertData: any,
    originalPriority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<AlertDeliveryLog[]> {
    try {
      console.log(`📤 Processing alert delivery for user ${userId}, type: ${alertType}`);

      const preferences = await this.getUserAlertPreferences(userId);
      const deliveryLogs: AlertDeliveryLog[] = [];

      for (const preference of preferences) {
        if (!preference.isActive) continue;

        // Check if this alert type is enabled in this preference
        const alertTypeConfig = preference.alertTypes.find(at => at.type === alertType);
        if (!alertTypeConfig || !alertTypeConfig.enabled) continue;

        // Apply smart filtering
        const filteringResult = await this.processSmartFiltering(userId, alertType, alertData, preference);
        
        if (!filteringResult.shouldSend) {
          // Log filtered alert
          const log: AlertDeliveryLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            preferenceId: preference.id,
            alertType,
            channels: [],
            status: 'filtered',
            deliveryAttempts: 0,
            lastAttempt: new Date(),
            metadata: {
              billId: alertData.billId,
              sponsorId: alertData.sponsorId,
              originalPriority,
              filteredReason: filteringResult.filteredReason
            },
            createdAt: new Date()
          };
          
          deliveryLogs.push(log);
          await this.storeDeliveryLog(log);
          continue;
        }

        // Determine final priority
        const finalPriority = filteringResult.adjustedPriority || alertTypeConfig.priority;

        // Get enabled channels for this preference
        const enabledChannels = preference.channels
          .filter(ch => ch.enabled)
          .filter(ch => this.isChannelAvailableForPriority(ch, finalPriority));

        if (enabledChannels.length === 0) continue;

        // Check frequency and batching
        if (preference.frequency.type === 'batched') {
          await this.addToBatch(userId, preference.id, {
            alertType,
            alertData,
            priority: finalPriority,
            channels: enabledChannels.map(ch => ch.type)
          });
          
          const log: AlertDeliveryLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            preferenceId: preference.id,
            alertType,
            channels: enabledChannels.map(ch => ch.type),
            status: 'pending',
            deliveryAttempts: 0,
            lastAttempt: new Date(),
            metadata: {
              billId: alertData.billId,
              sponsorId: alertData.sponsorId,
              originalPriority
            },
            createdAt: new Date()
          };
          
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

          const log: AlertDeliveryLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            preferenceId: preference.id,
            alertType,
            channels: enabledChannels.map(ch => ch.type),
            status: deliveryResult.success ? 'sent' : 'failed',
            deliveryAttempts: 1,
            lastAttempt: new Date(),
            deliveredAt: deliveryResult.success ? new Date() : undefined,
            failureReason: deliveryResult.error,
            metadata: {
              billId: alertData.billId,
              sponsorId: alertData.sponsorId,
              originalPriority
            },
            createdAt: new Date()
          };
          
          deliveryLogs.push(log);
          await this.storeDeliveryLog(log);
        }
      }

      console.log(`✅ Alert delivery processed: ${deliveryLogs.length} logs created`);
      return deliveryLogs;

    } catch (error) {
      console.error(`Error processing alert delivery for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get alert delivery logs for a user
   */
  async getAlertDeliveryLogs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      alertType?: string;
      status?: string;
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
      // Get logs from cache storage
      const allLogs = await this.getAllDeliveryLogs(userId);
      
      // Apply filters
      let filteredLogs = allLogs;
      
      if (options.alertType) {
        filteredLogs = filteredLogs.filter(log => log.alertType === options.alertType);
      }
      
      if (options.status) {
        filteredLogs = filteredLogs.filter(log => log.status === options.status);
      }
      
      if (options.startDate) {
        filteredLogs = filteredLogs.filter(log => log.createdAt >= options.startDate!);
      }
      
      if (options.endDate) {
        filteredLogs = filteredLogs.filter(log => log.createdAt <= options.endDate!);
      }

      // Sort by creation date (newest first)
      filteredLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Paginate
      const total = filteredLogs.length;
      const startIndex = (page - 1) * limit;
      const paginatedLogs = filteredLogs.slice(startIndex, startIndex + limit);

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
      console.error(`Error getting alert delivery logs for user ${userId}:`, error);
      return {
        logs: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }
  }

  /**
   * Get alert preference statistics
   */
  async getAlertPreferenceStats(userId: string): Promise<{
    totalPreferences: number;
    activePreferences: number;
    totalRules: number;
    deliveryStats: {
      totalAlerts: number;
      successfulDeliveries: number;
      failedDeliveries: number;
      filteredAlerts: number;
    };
    channelStats: {
      [channel: string]: {
        enabled: boolean;
        deliveries: number;
        successRate: number;
      };
    };
  }> {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:alert_stats`;

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const preferences = await this.getUserAlertPreferences(userId);
          const logs = await this.getAllDeliveryLogs(userId);
          const rules = await this.getAllUserRules(userId);

          const deliveryStats = {
            totalAlerts: logs.length,
            successfulDeliveries: logs.filter(log => log.status === 'sent' || log.status === 'delivered').length,
            failedDeliveries: logs.filter(log => log.status === 'failed').length,
            filteredAlerts: logs.filter(log => log.status === 'filtered').length
          };

          const channelStats: any = {};
          const channelTypes = ['in_app', 'email', 'push', 'sms'];
          
          for (const channelType of channelTypes) {
            const channelLogs = logs.filter(log => log.channels.includes(channelType));
            const successfulChannelLogs = channelLogs.filter(log => log.status === 'sent' || log.status === 'delivered');
            
            channelStats[channelType] = {
              enabled: preferences.some(p => p.channels.some(ch => ch.type === channelType && ch.enabled)),
              deliveries: channelLogs.length,
              successRate: channelLogs.length > 0 ? (successfulChannelLogs.length / channelLogs.length) * 100 : 0
            };
          }

          return {
            totalPreferences: preferences.length,
            activePreferences: preferences.filter(p => p.isActive).length,
            totalRules: rules.length,
            deliveryStats,
            channelStats
          };

        } catch (error) {
          console.error(`Error getting alert preference stats for user ${userId}:`, error);
          return {
            totalPreferences: 0,
            activePreferences: 0,
            totalRules: 0,
            deliveryStats: {
              totalAlerts: 0,
              successfulDeliveries: 0,
              failedDeliveries: 0,
              filteredAlerts: 0
            },
            channelStats: {}
          };
        }
      },
      CACHE_TTL.ANALYTICS
    );
  }

  /**
   * Helper methods
   */
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
          type: 'new_comment',
          enabled: true,
          priority: 'low'
        }
      ],
      channels: [
        {
          type: 'in_app',
          enabled: true,
          config: { verified: true },
          priority: 'normal'
        },
        {
          type: 'email',
          enabled: true,
          config: { verified: false },
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
        spamFiltering: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.storeAlertPreference(defaultPreference);
    return defaultPreference;
  }

  private async calculateUserInterestScore(userId: string, alertData: any): Promise<number> {
    try {
      // Get user interests from user profile service
      const userProfile = await userProfileService.getUserProfile(userId);
      const userInterests = userProfile.interests || [];

      if (userInterests.length === 0) return 0.5; // Neutral score

      // Check if alert data matches user interests
      let matchScore = 0;
      let totalChecks = 0;

      if (alertData.billCategory) {
        totalChecks++;
        if (userInterests.includes(alertData.billCategory.toLowerCase())) {
          matchScore += 1;
        }
      }

      if (alertData.keywords) {
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
      logger.error('Error calculating user interest score:', { component: 'SimpleTool' }, error);
      return 0.5;
    }
  }

  private async calculateEngagementHistoryScore(userId: string, alertData: any): Promise<number> {
    try {
      // Get user engagement history
      const engagementHistory = await userProfileService.getUserEngagementHistory(userId);
      
      if (engagementHistory.totalBillsTracked === 0) return 0.5;

      // Check engagement with similar content
      let engagementScore = 0;
      
      if (alertData.billCategory) {
        const categoryEngagement = engagementHistory.topCategories.find(
          cat => cat.category.toLowerCase() === alertData.billCategory.toLowerCase()
        );
        
        if (categoryEngagement) {
          engagementScore = Math.min(categoryEngagement.engagementCount / engagementHistory.totalBillsTracked, 1.0);
        }
      }

      return engagementScore;

    } catch (error) {
      logger.error('Error calculating engagement history score:', { component: 'SimpleTool' }, error);
      return 0.5;
    }
  }

  private async calculateTrendingScore(alertData: any): Promise<number> {
    // Simplified trending calculation
    // In a real implementation, this would analyze current engagement trends
    return Math.random() * 0.5 + 0.25; // Random score between 0.25 and 0.75
  }

  private async checkForDuplicateAlert(userId: string, alertType: string, alertData: any): Promise<boolean> {
    try {
      const recentLogs = await this.getRecentDeliveryLogs(userId, 24); // Last 24 hours
      
      return recentLogs.some(log => 
        log.alertType === alertType &&
        log.metadata.billId === alertData.billId &&
        log.status !== 'failed'
      );

    } catch (error) {
      logger.error('Error checking for duplicate alert:', { component: 'SimpleTool' }, error);
      return false;
    }
  }

  private async checkForSpam(userId: string, alertType: string, alertData: any): Promise<boolean> {
    try {
      const recentLogs = await this.getRecentDeliveryLogs(userId, 1); // Last hour
      
      // Simple spam detection: more than 10 alerts of same type in last hour
      const sameTypeCount = recentLogs.filter(log => log.alertType === alertType).length;
      return sameTypeCount > 10;

    } catch (error) {
      logger.error('Error checking for spam:', { component: 'SimpleTool' }, error);
      return false;
    }
  }

  private isChannelAvailableForPriority(channel: AlertChannel, priority: string): boolean {
    // Check if channel is appropriate for the priority level
    if (priority === 'urgent') return true;
    if (priority === 'high' && channel.priority !== 'low') return true;
    if (priority === 'normal' && channel.priority === 'normal') return true;
    if (priority === 'low') return true;
    
    return false;
  }

  private async deliverImmediateAlert(
    userId: string,
    alertType: string,
    alertData: any,
    channels: AlertChannel[],
    priority: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await notificationService.sendNotification({
        userId,
        type: alertType,
        title: alertData.title || `${alertType} Alert`,
        message: alertData.message || 'You have a new alert',
        data: alertData,
        priority: priority as any,
        channels: channels.map(ch => ch.type) as any
      });

      return { success: true };

    } catch (error) {
      logger.error('Error delivering immediate alert:', { component: 'SimpleTool' }, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async addToBatch(userId: string, preferenceId: string, alertData: any): Promise<void> {
    const batchKey = `alert_batch:${userId}:${preferenceId}`;
    
    try {
      const existingBatch = await cacheService.get(batchKey) || [];
      existingBatch.push({
        ...alertData,
        timestamp: new Date()
      });
      
      await cacheService.set(batchKey, existingBatch, CACHE_TTL.NOTIFICATIONS);
    } catch (error) {
      logger.error('Error adding to batch:', { component: 'SimpleTool' }, error);
    }
  }

  private async sendPreferenceUpdateNotification(
    userId: string,
    action: 'created' | 'updated' | 'deleted',
    preferenceName: string
  ): Promise<void> {
    try {
      await notificationService.sendNotification({
        userId,
        type: 'alert_preference_update',
        title: 'Alert Preferences Updated',
        message: `Your alert preference "${preferenceName}" has been ${action}`,
        data: { action, preferenceName },
        priority: 'low',
        channels: ['in_app']
      });
    } catch (error) {
      logger.error('Error sending preference update notification:', { component: 'SimpleTool' }, error);
    }
  }

  // Cache storage methods (simplified - would use proper database in production)
  private async storeAlertPreference(preference: AlertPreference): Promise<void> {
    const key = `alert_preference:${preference.id}`;
    await cacheService.set(key, preference, CACHE_TTL.USER_DATA);
  }

  private async removeAlertPreference(preferenceId: string): Promise<void> {
    const key = `alert_preference:${preferenceId}`;
    await cacheService.delete(key);
  }

  private async getAllUserPreferences(userId: string): Promise<AlertPreference[]> {
    // This would query a proper database in production
    // For now, return empty array as we're using cache storage
    return [];
  }

  private async storeAlertRule(rule: AlertRule): Promise<void> {
    const key = `alert_rule:${rule.id}`;
    await cacheService.set(key, rule, CACHE_TTL.USER_DATA);
  }

  private async getAllUserRules(userId: string): Promise<AlertRule[]> {
    // This would query a proper database in production
    return [];
  }

  private async storeDeliveryLog(log: AlertDeliveryLog): Promise<void> {
    const key = `delivery_log:${log.id}`;
    await cacheService.set(key, log, CACHE_TTL.ANALYTICS);
  }

  private async getAllDeliveryLogs(userId: string): Promise<AlertDeliveryLog[]> {
    // This would query a proper database in production
    return [];
  }

  private async getRecentDeliveryLogs(userId: string, hours: number): Promise<AlertDeliveryLog[]> {
    const allLogs = await this.getAllDeliveryLogs(userId);
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return allLogs.filter(log => log.createdAt >= cutoffTime);
  }

  private async clearUserPreferenceCache(userId: string): Promise<void> {
    const patterns = [
      `${CACHE_KEYS.USER_PROFILE(userId)}:alert_preferences`,
      `${CACHE_KEYS.USER_PROFILE(userId)}:alert_stats`
    ];

    for (const pattern of patterns) {
      try {
        await cacheService.delete(pattern);
      } catch (error) {
        console.error(`Error clearing cache pattern ${pattern}:`, error);
      }
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      serviceActive: true,
      lastUpdate: new Date()
    };
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Alert Preference Service...', { component: 'SimpleTool' });
    // Cleanup any resources if needed
    logger.info('Alert Preference Service shutdown complete', { component: 'SimpleTool' });
  }
}

export const alertPreferenceService = new AlertPreferenceService();








