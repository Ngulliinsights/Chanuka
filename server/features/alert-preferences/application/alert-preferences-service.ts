import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database/pool';
import {
  alert_preferences,
  type Notification,
  notifications,
  type User,
  users} from '@server/infrastructure/schema';
import { and, asc, count, desc, eq, gte, inArray, isNotNull,like, lte, or, sql } from 'drizzle-orm';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AlertPreference {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  alertTypes: AlertType[];
  channels: NotificationChannel[];
  frequency: AlertFrequency;
  smartFiltering: SmartFilteringConfig;
  created_at: Date;
  updated_at: Date;
}

export interface AlertType {
  type: string;
  enabled: boolean;
  priority: string;
  conditions?: AlertConditions;
}

export interface AlertConditions {
  billCategories?: string[];
  billStatuses?: string[];
  sponsor_ids?: string[];
  keywords?: string[];
  minimumEngagement?: number;
  user_roles?: string[];
  timeRange?: string;
  dayOfWeek?: string[];
}

export interface NotificationChannel {
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  priority: string;
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface AlertFrequency {
  type: 'immediate' | 'hourly' | 'daily' | 'weekly';
  batchInterval?: number;
  batchTime?: string;
  batchDay?: string;
}

export interface SmartFilteringConfig {
  enabled: boolean;
  user_interestWeight: number;
  engagementHistoryWeight: number;
  trendingWeight: number;
  duplicateFiltering: boolean;
  spamFiltering: boolean;
  minimumConfidence: number;
}

export interface AlertDeliveryLog {
  id: string;
  user_id: string;
  alert_preference_id: string;
  notification_id?: string;
  alert_type: string;
  channel: string;
  status: 'sent' | 'failed' | 'filtered' | 'queued';
  delivery_time?: Date;
  failure_reason?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

// ============================================================================
// ALERT PREFERENCES SERVICE
// ============================================================================

/**
 * AlertPreferencesService - Consolidated service for alert preferences and delivery
 * 
 * This service replaces the repository pattern with direct Drizzle ORM usage,
 * providing comprehensive alert preference management, delivery tracking, and
 * smart filtering capabilities.
 */
export class AlertPreferencesService {
  private get database() {
    return db;
  }

  // ============================================================================
  // ALERT PREFERENCE OPERATIONS
  // ============================================================================

  /**
   * Save an alert preference
   */
  async savePreference(preference: AlertPreference): Promise<void> {
    const logContext = { 
      component: 'AlertPreferencesService', 
      operation: 'savePreference',
      user_id: preference.user_id,
      preferenceId: preference.id 
    };
    logger.debug('Saving alert preference', logContext);

    try {
      // Get current user preferences
      const [user] = await this.database
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, preference.user_id))
        .limit(1);

      if (!user) {
        throw new Error(`User ${preference.user_id} not found`);
      }

      const currentPreferences = (user.preferences as any) || {};
      const alertPreferences = currentPreferences.alertPreferences || [];

      // Serialize the preference
      const preferenceData = this.serializePreference(preference);

      // Add or update the preference
      const existingIndex = alertPreferences.findIndex((p: unknown) => p.id === preference.id);
      if (existingIndex >= 0) {
        alertPreferences[existingIndex] = preferenceData;
      } else {
        alertPreferences.push(preferenceData);
      }

      // Update the database
      await this.database
        .update(users)
        .set({
          preferences: {
            ...currentPreferences,
            alertPreferences
          },
          updated_at: new Date()
        })
        .where(eq(users.id, preference.user_id));

      logger.info('✅ Alert preference saved successfully', { 
        ...logContext, 
        name: preference.name 
      });
    } catch (error) {
      logger.error('Failed to save alert preference', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Find alert preference by ID and user ID
   */
  async findPreferenceByIdAndUserId(id: string, user_id: string): Promise<AlertPreference | null> {
    const logContext = { 
      component: 'AlertPreferencesService', 
      operation: 'findPreferenceByIdAndUserId',
      id,
      user_id 
    };
    logger.debug('Finding alert preference by ID and user ID', logContext);

    try {
      const preferences = await this.findPreferencesByUserId(user_id);
      const preference = preferences.find(p => p.id === id) || null;

      logger.debug('Alert preference lookup completed', { 
        ...logContext, 
        found: !!preference 
      });

      return preference;
    } catch (error) {
      logger.error('Failed to find alert preference', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Find all alert preferences for a user
   */
  async findPreferencesByUserId(user_id: string): Promise<AlertPreference[]> {
    const logContext = { 
      component: 'AlertPreferencesService', 
      operation: 'findPreferencesByUserId',
      user_id 
    };
    logger.debug('Finding alert preferences for user', logContext);

    try {
      const [user] = await this.database
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, user_id))
        .limit(1);

      if (!user) {
        logger.debug('User not found', logContext);
        return [];
      }

      const currentPreferences = (user.preferences as any) || {};
      const alertPreferences = currentPreferences.alertPreferences || [];

      const preferences = alertPreferences.map((p: unknown) => this.deserializePreference(p));

      logger.debug('✅ Alert preferences retrieved', { 
        ...logContext, 
        count: preferences.length 
      });

      return preferences;
    } catch (error) {
      logger.error('Failed to find alert preferences for user', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Update an alert preference
   */
  async updatePreference(preference: AlertPreference): Promise<void> {
    const logContext = { 
      component: 'AlertPreferencesService', 
      operation: 'updatePreference',
      preferenceId: preference.id 
    };
    logger.debug('Updating alert preference', logContext);

    try {
      preference.updated_at = new Date();
      await this.savePreference(preference);

      logger.info('✅ Alert preference updated successfully', logContext);
    } catch (error) {
      logger.error('Failed to update alert preference', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Delete an alert preference
   */
  async deletePreference(id: string, user_id: string): Promise<void> {
    const logContext = { 
      component: 'AlertPreferencesService', 
      operation: 'deletePreference',
      id,
      user_id 
    };
    logger.debug('Deleting alert preference', logContext);

    try {
      const [user] = await this.database
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, user_id))
        .limit(1);

      if (!user) {
        throw new Error(`User ${user_id} not found`);
      }

      const currentPreferences = (user.preferences as any) || {};
      const alertPreferences = currentPreferences.alertPreferences || [];

      // Filter out the preference
      const updatedPreferences = alertPreferences.filter((p: unknown) => p.id !== id);

      // Update the database
      await this.database
        .update(users)
        .set({
          preferences: {
            ...currentPreferences,
            alertPreferences: updatedPreferences
          },
          updated_at: new Date()
        })
        .where(eq(users.id, user_id));

      logger.info('✅ Alert preference deleted successfully', logContext);
    } catch (error) {
      logger.error('Failed to delete alert preference', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Check if alert preference exists
   */
  async preferenceExists(id: string, user_id: string): Promise<boolean> {
    const logContext = { 
      component: 'AlertPreferencesService', 
      operation: 'preferenceExists',
      id,
      user_id 
    };
    logger.debug('Checking if alert preference exists', logContext);

    try {
      const preference = await this.findPreferenceByIdAndUserId(id, user_id);
      const exists = preference !== null;

      logger.debug('Alert preference existence check completed', { 
        ...logContext, 
        exists 
      });

      return exists;
    } catch (error) {
      logger.error('Failed to check alert preference existence', { ...logContext, error });
      return false;
    }
  }

  // ============================================================================
  // DELIVERY LOG OPERATIONS
  // ============================================================================

  /**
   * Save a delivery log entry
   */
  async saveDeliveryLog(log: AlertDeliveryLog): Promise<void> {
    const logContext = { 
      component: 'AlertPreferencesService', 
      operation: 'saveDeliveryLog',
      user_id: log.user_id,
      status: log.status 
    };
    logger.debug('Saving delivery log', logContext);

    try {
      // For now, we'll store delivery logs in the notifications table
      // In a full implementation, you might want a separate delivery_logs table
      await this.database
        .insert(notifications)
        .values({
          id: log.id,
          user_id: log.user_id,
          type: log.alert_type,
          title: `Alert: ${log.alert_type}`,
          message: `Alert delivered via ${log.channel}`,
          data: {
            alert_preference_id: log.alert_preference_id,
            channel: log.channel,
            status: log.status,
            delivery_time: log.delivery_time,
            failure_reason: log.failure_reason,
            metadata: log.metadata
          },
          is_read: false,
          created_at: log.created_at,
          updated_at: log.created_at
        });

      logger.info('✅ Delivery log saved successfully', logContext);
    } catch (error) {
      logger.error('Failed to save delivery log', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Find delivery logs by user ID with pagination
   */
  async findDeliveryLogsByUserId(
    user_id: string,
    options: {
      page?: number;
      limit?: number;
      alertType?: string;
      status?: string;
      start_date?: Date;
      end_date?: Date;
    } = {}
  ): Promise<{
    logs: AlertDeliveryLog[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const logContext = { 
      component: 'AlertPreferencesService', 
      operation: 'findDeliveryLogsByUserId',
      user_id,
      options 
    };
    logger.debug('Finding delivery logs for user', logContext);

    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      // Build query conditions
      const conditions = [eq(notifications.user_id, user_id)];

      if (options.alertType) {
        conditions.push(eq(notifications.type, options.alertType));
      }

      if (options.start_date) {
        conditions.push(gte(notifications.created_at, options.start_date));
      }

      if (options.end_date) {
        conditions.push(lte(notifications.created_at, options.end_date));
      }

      // Get total count
      const [totalResult] = await this.database
        .select({ count: count() })
        .from(notifications)
        .where(and(...conditions));

      const total = totalResult.count;

      // Get paginated results
      const results = await this.database
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.created_at))
        .limit(limit)
        .offset(offset);

      // Convert notifications to delivery logs
      const logs: AlertDeliveryLog[] = results.map(notification => ({
        id: notification.id,
        user_id: notification.user_id,
        alert_preference_id: (notification.data as any)?.alert_preference_id || '',
        notification_id: notification.id,
        alert_type: notification.type,
        channel: (notification.data as any)?.channel || 'unknown',
        status: (notification.data as any)?.status || 'sent',
        delivery_time: (notification.data as any)?.delivery_time || notification.created_at,
        failure_reason: (notification.data as any)?.failure_reason,
        metadata: (notification.data as any)?.metadata,
        created_at: notification.created_at
      }));

      const pages = Math.ceil(total / limit);

      logger.debug('✅ Delivery logs retrieved', { 
        ...logContext, 
        total,
        returned: logs.length 
      });

      return {
        logs,
        total,
        page,
        limit,
        pages
      };
    } catch (error) {
      logger.error('Failed to find delivery logs for user', { ...logContext, error });
      throw error;
    }
  }

  /**
   * Get delivery statistics for a user
   */
  async getDeliveryStatsByUserId(user_id: string): Promise<{
    totalLogs: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    filteredLogs: number;
    channelStats: Record<string, {
      deliveries: number;
      successRate: number;
    }>;
  }> {
    const logContext = { 
      component: 'AlertPreferencesService', 
      operation: 'getDeliveryStatsByUserId',
      user_id 
    };
    logger.debug('Getting delivery statistics for user', logContext);

    try {
      // Get basic statistics from notifications
      const [basicStats] = await this.database
        .select({
          total: count(),
          successful: sql<number>`COUNT(*) FILTER (WHERE (data->>'status')::text = 'sent')`,
          failed: sql<number>`COUNT(*) FILTER (WHERE (data->>'status')::text = 'failed')`,
          filtered: sql<number>`COUNT(*) FILTER (WHERE (data->>'status')::text = 'filtered')`
        })
        .from(notifications)
        .where(eq(notifications.user_id, user_id));

      // Get channel statistics
      const channelResults = await this.database
        .select({
          channel: sql<string>`(data->>'channel')::text`,
          total: count(),
          successful: sql<number>`COUNT(*) FILTER (WHERE (data->>'status')::text = 'sent')`
        })
        .from(notifications)
        .where(eq(notifications.user_id, user_id))
        .groupBy(sql`(data->>'channel')::text`);

      const channelStats: Record<string, { deliveries: number; successRate: number }> = {};
      channelResults.forEach(result => {
        if (result.channel) {
          channelStats[result.channel] = {
            deliveries: result.total,
            successRate: result.total > 0 ? (result.successful / result.total) * 100 : 0
          };
        }
      });

      const stats = {
        totalLogs: basicStats.total,
        successfulDeliveries: basicStats.successful,
        failedDeliveries: basicStats.failed,
        filteredLogs: basicStats.filtered,
        channelStats
      };

      logger.debug('✅ Delivery statistics retrieved', { ...logContext, stats });
      return stats;
    } catch (error) {
      logger.error('Failed to get delivery statistics', { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Serialize alert preference for storage
   */
  private serializePreference(preference: AlertPreference): any {
    return {
      id: preference.id,
      user_id: preference.user_id,
      name: preference.name,
      description: preference.description,
      is_active: preference.is_active,
      alertTypes: preference.alertTypes.map(at => ({
        type: at.type,
        enabled: at.enabled,
        priority: at.priority,
        conditions: at.conditions ? {
          billCategories: at.conditions.billCategories,
          billStatuses: at.conditions.billStatuses,
          sponsor_ids: at.conditions.sponsor_ids,
          keywords: at.conditions.keywords,
          minimumEngagement: at.conditions.minimumEngagement,
          user_roles: at.conditions.user_roles,
          timeRange: at.conditions.timeRange,
          dayOfWeek: at.conditions.dayOfWeek
        } : undefined
      })),
      channels: preference.channels.map(ch => ({
        type: ch.type,
        enabled: ch.enabled,
        config: ch.config,
        priority: ch.priority,
        quietHours: ch.quietHours
      })),
      frequency: {
        type: preference.frequency.type,
        batchInterval: preference.frequency.batchInterval,
        batchTime: preference.frequency.batchTime,
        batchDay: preference.frequency.batchDay
      },
      smartFiltering: {
        enabled: preference.smartFiltering.enabled,
        user_interestWeight: preference.smartFiltering.user_interestWeight,
        engagementHistoryWeight: preference.smartFiltering.engagementHistoryWeight,
        trendingWeight: preference.smartFiltering.trendingWeight,
        duplicateFiltering: preference.smartFiltering.duplicateFiltering,
        spamFiltering: preference.smartFiltering.spamFiltering,
        minimumConfidence: preference.smartFiltering.minimumConfidence
      },
      created_at: preference.created_at.toISOString(),
      updated_at: preference.updated_at.toISOString()
    };
  }

  /**
   * Deserialize alert preference from storage
   */
  private deserializePreference(data: unknown): AlertPreference {
    return {
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      description: data.description,
      is_active: data.is_active,
      alertTypes: data.alertTypes || [],
      channels: data.channels || [],
      frequency: data.frequency || { type: 'immediate' },
      smartFiltering: data.smartFiltering || {
        enabled: false,
        user_interestWeight: 0.5,
        engagementHistoryWeight: 0.3,
        trendingWeight: 0.2,
        duplicateFiltering: true,
        spamFiltering: true,
        minimumConfidence: 0.7
      },
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      // Simple query to test database connectivity
      await this.database.select({ count: count() }).from(users).limit(1);
      
      return {
        status: 'healthy',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Alert preferences service health check failed', { 
        component: 'AlertPreferencesService',
        error 
      });
      
      return {
        status: 'unhealthy',
        timestamp: new Date()
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of AlertPreferencesService for application-wide use.
 */
export const alertPreferencesService = new AlertPreferencesService();


