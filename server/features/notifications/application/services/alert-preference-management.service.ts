/**
 * Alert Preference Management Service
 * 
 * Application service for managing alert preferences including:
 * - CRUD operations
 * - Caching
 * - Database persistence
 * - Analytics
 */

import { logger } from '@server/infrastructure/observability';
import { cacheService } from '@server/infrastructure/cache';
import { db } from '@server/infrastructure/database';
import * as schema from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

import type {
  AlertPreference,
  AlertType,
  AlertDeliveryLog,
  DeliveryStatus,
  ChannelType
} from '../../domain/entities/alert-preference';
import { AlertPreferenceEntity } from '../../domain/entities/alert-preference';
import { alertPreferenceDomainService } from '../../domain/services/alert-preference-domain.service';

// Type for user preferences data
interface UserPreferencesData {
  alertPreferences?: AlertPreference[];
  deliveryLogs?: AlertDeliveryLog[];
  [key: string]: unknown;
}

function isUserPreferencesData(data: unknown): data is UserPreferencesData {
  return data !== null && typeof data === 'object';
}

export class AlertPreferenceManagementService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_LOGS_PER_USER = 1000;

  /**
   * Create a new alert preference
   */
  async createAlertPreference(
    user_id: string,
    preferenceData: Omit<AlertPreference, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<AlertPreference> {
    try {
      // Validate preference
      const validation = alertPreferenceDomainService.validatePreference({
        ...preferenceData,
        id: 'temp',
        user_id,
        created_at: new Date(),
        updated_at: new Date()
      } as AlertPreference);

      if (!validation.valid) {
        throw new Error(`Invalid preference: ${validation.errors.join(', ')}`);
      }

      const preferenceId = this.generatePreferenceId();
      
      const newPreference: AlertPreference = {
        id: preferenceId,
        user_id,
        ...preferenceData,
        created_at: new Date(),
        updated_at: new Date()
      };

      await this.storePreferenceInDatabase(user_id, newPreference);
      await this.clearUserCache(user_id);

      logger.info(`Alert preference created: ${preferenceId}`, {
        component: 'AlertPreferenceManagement',
        user_id,
        preferenceId
      });

      return newPreference;
    } catch (error) {
      logger.error('Error creating alert preference', {
        component: 'AlertPreferenceManagement',
        user_id
      }, error);
      throw error;
    }
  }

  /**
   * Get all alert preferences for a user
   */
  async getUserAlertPreferences(user_id: string): Promise<AlertPreference[]> {
    const cacheKey = `user:alert_preferences:${user_id}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as AlertPreference[];
      }
    } catch (err) {
      logger.warn('Cache read failed for alert preferences', {
        component: 'AlertPreferenceManagement',
        user_id
      });
    }

    try {
      const preferences = await this.fetchPreferencesFromDatabase(user_id);
      
      if (preferences.length === 0) {
        const defaultPref = await this.createDefaultAlertPreference(user_id);
        return [defaultPref];
      }

      await cacheService.set(cacheKey, preferences, this.CACHE_TTL);
      return preferences;
    } catch (error) {
      logger.error('Error fetching alert preferences', {
        component: 'AlertPreferenceManagement',
        user_id
      }, error);
      
      // Return default on error
      const defaultPref = await this.createDefaultAlertPreference(user_id);
      return [defaultPref];
    }
  }

  /**
   * Get a specific alert preference by ID
   */
  async getAlertPreference(
    user_id: string,
    preferenceId: string
  ): Promise<AlertPreference | null> {
    const preferences = await this.getUserAlertPreferences(user_id);
    return preferences.find(p => p.id === preferenceId) || null;
  }

  /**
   * Update an existing alert preference
   */
  async updateAlertPreference(
    user_id: string,
    preferenceId: string,
    updates: Partial<Omit<AlertPreference, 'id' | 'user_id' | 'created_at'>>
  ): Promise<AlertPreference> {
    try {
      const existingPreference = await this.getAlertPreference(user_id, preferenceId);
      
      if (!existingPreference) {
        throw new Error(`Alert preference ${preferenceId} not found`);
      }

      const entity = new AlertPreferenceEntity(existingPreference);
      const updatedEntity = entity.update(updates);
      const updatedPreference = updatedEntity.toJSON();

      // Validate updated preference
      const validation = alertPreferenceDomainService.validatePreference(updatedPreference);
      if (!validation.valid) {
        throw new Error(`Invalid preference update: ${validation.errors.join(', ')}`);
      }

      await this.updatePreferenceInDatabase(user_id, updatedPreference);
      await this.clearUserCache(user_id);

      logger.info(`Alert preference updated: ${preferenceId}`, {
        component: 'AlertPreferenceManagement',
        user_id,
        preferenceId
      });

      return updatedPreference;
    } catch (error) {
      logger.error('Error updating alert preference', {
        component: 'AlertPreferenceManagement',
        user_id,
        preferenceId
      }, error);
      throw error;
    }
  }

  /**
   * Delete an alert preference
   */
  async deleteAlertPreference(user_id: string, preferenceId: string): Promise<void> {
    try {
      const existingPreference = await this.getAlertPreference(user_id, preferenceId);
      
      if (!existingPreference) {
        throw new Error(`Alert preference ${preferenceId} not found`);
      }

      await this.removePreferenceFromDatabase(user_id, preferenceId);
      await this.clearUserCache(user_id);

      logger.info(`Alert preference deleted: ${preferenceId}`, {
        component: 'AlertPreferenceManagement',
        user_id,
        preferenceId
      });
    } catch (error) {
      logger.error('Error deleting alert preference', {
        component: 'AlertPreferenceManagement',
        user_id,
        preferenceId
      }, error);
      throw error;
    }
  }

  /**
   * Store delivery log
   */
  async storeDeliveryLog(log: AlertDeliveryLog): Promise<void> {
    try {
      const [user] = await db
        .select({ preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, log.user_id))
        .limit(1);

      const currentPreferences: UserPreferencesData = isUserPreferencesData(user?.preferences)
        ? user.preferences
        : {};
      
      const deliveryLogs = currentPreferences.deliveryLogs || [];
      deliveryLogs.push(log);

      // Keep only most recent logs
      if (deliveryLogs.length > this.MAX_LOGS_PER_USER) {
        deliveryLogs.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        deliveryLogs.splice(this.MAX_LOGS_PER_USER);
      }

      await db
        .update(schema.users)
        .set({
          preferences: {
            ...currentPreferences,
            deliveryLogs
          }
        })
        .where(eq(schema.users.id, log.user_id));
    } catch (error) {
      logger.error('Error storing delivery log', {
        component: 'AlertPreferenceManagement',
        user_id: log.user_id
      }, error);
    }
  }

  /**
   * Get delivery logs with filtering
   */
  async getDeliveryLogs(
    user_id: string,
    options: {
      page?: number;
      limit?: number;
      alertType?: AlertType;
      status?: DeliveryStatus;
      start_date?: Date;
      end_date?: Date;
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
      let allLogs = await this.fetchDeliveryLogsFromDatabase(user_id);

      // Apply filters
      if (options.alertType) {
        allLogs = allLogs.filter(log => log.alertType === options.alertType);
      }
      if (options.status) {
        allLogs = allLogs.filter(log => log.status === options.status);
      }
      if (options.start_date) {
        allLogs = allLogs.filter(log => log.created_at >= options.start_date!);
      }
      if (options.end_date) {
        allLogs = allLogs.filter(log => log.created_at <= options.end_date!);
      }

      // Sort by creation date descending
      allLogs.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

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
        component: 'AlertPreferenceManagement',
        user_id
      }, error);
      return {
        logs: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }
  }

  /**
   * Get alert preference statistics
   */
  async getAlertPreferenceStats(user_id: string): Promise<{
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
    const cacheKey = `user:alert_stats:${user_id}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as any;
      }
    } catch (err) {
      logger.warn('Cache read failed for alert stats', {
        component: 'AlertPreferenceManagement',
        user_id
      });
    }

    try {
      const preferences = await this.getUserAlertPreferences(user_id);
      const logs = await this.fetchDeliveryLogsFromDatabase(user_id);

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

      const result = {
        totalPreferences: preferences.length,
        activePreferences: preferences.filter(p => p.is_active).length,
        deliveryStats,
        channelStats
      };

      await cacheService.set(cacheKey, result, this.CACHE_TTL);
      return result;
    } catch (error) {
      logger.error('Error fetching alert stats', {
        component: 'AlertPreferenceManagement',
        user_id
      }, error);
      throw error;
    }
  }

  // Private helper methods

  private generatePreferenceId(): string {
    return `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createDefaultAlertPreference(user_id: string): Promise<AlertPreference> {
    const defaultPreference: AlertPreference = {
      id: `default_${user_id}`,
      user_id,
      name: 'Default Alerts',
      description: 'Default alert preferences for all bill updates',
      is_active: true,
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
        user_interestWeight: 0.6,
        engagementHistoryWeight: 0.3,
        trendingWeight: 0.1,
        duplicateFiltering: true,
        spamFiltering: true,
        minimumConfidence: 0.3
      },
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.storePreferenceInDatabase(user_id, defaultPreference);
    return defaultPreference;
  }

  private async storePreferenceInDatabase(
    user_id: string,
    preference: AlertPreference
  ): Promise<void> {
    const [user] = await db
      .select({ preferences: schema.users.preferences })
      .from(schema.users)
      .where(eq(schema.users.id, user_id))
      .limit(1);

    const currentPreferences: UserPreferencesData = isUserPreferencesData(user?.preferences)
      ? user.preferences
      : {};
    
    const alertPreferences = currentPreferences.alertPreferences || [];
    const existingIndex = alertPreferences.findIndex(p => p.id === preference.id);
    
    if (existingIndex >= 0) {
      alertPreferences[existingIndex] = preference;
    } else {
      alertPreferences.push(preference);
    }

    await db
      .update(schema.users)
      .set({
        preferences: {
          ...currentPreferences,
          alertPreferences
        },
        updated_at: new Date()
      })
      .where(eq(schema.users.id, user_id));
  }

  private async updatePreferenceInDatabase(
    user_id: string,
    preference: AlertPreference
  ): Promise<void> {
    await this.storePreferenceInDatabase(user_id, preference);
  }

  private async removePreferenceFromDatabase(
    user_id: string,
    preferenceId: string
  ): Promise<void> {
    const [user] = await db
      .select({ preferences: schema.users.preferences })
      .from(schema.users)
      .where(eq(schema.users.id, user_id))
      .limit(1);

    const currentPreferences: UserPreferencesData = isUserPreferencesData(user?.preferences)
      ? user.preferences
      : {};
    
    const alertPreferences = currentPreferences.alertPreferences || [];
    const updatedPreferences = alertPreferences.filter(p => p.id !== preferenceId);

    await db
      .update(schema.users)
      .set({
        preferences: {
          ...currentPreferences,
          alertPreferences: updatedPreferences
        },
        updated_at: new Date()
      })
      .where(eq(schema.users.id, user_id));
  }

  private async fetchPreferencesFromDatabase(user_id: string): Promise<AlertPreference[]> {
    const [user] = await db
      .select({ preferences: schema.users.preferences })
      .from(schema.users)
      .where(eq(schema.users.id, user_id))
      .limit(1);

    if (!user) {
      return [];
    }

    const currentPreferences: UserPreferencesData = isUserPreferencesData(user?.preferences)
      ? user.preferences
      : {};
    
    const alertPreferences = currentPreferences.alertPreferences || [];
    
    return alertPreferences.map(p => ({
      ...p,
      created_at: new Date(p.created_at),
      updated_at: new Date(p.updated_at)
    }));
  }

  private async fetchDeliveryLogsFromDatabase(user_id: string): Promise<AlertDeliveryLog[]> {
    const [user] = await db
      .select({ preferences: schema.users.preferences })
      .from(schema.users)
      .where(eq(schema.users.id, user_id))
      .limit(1);

    if (!user) {
      return [];
    }

    const currentPreferences: UserPreferencesData = isUserPreferencesData(user?.preferences)
      ? user.preferences
      : {};
    
    const deliveryLogs = currentPreferences.deliveryLogs || [];
    
    return deliveryLogs.map(log => ({
      ...log,
      created_at: new Date(log.created_at),
      lastAttempt: new Date(log.lastAttempt),
      deliveredAt: log.deliveredAt ? new Date(log.deliveredAt) : undefined
    }));
  }

  private async clearUserCache(user_id: string): Promise<void> {
    const patterns = [
      `user:alert_preferences:${user_id}`,
      `user:alert_stats:${user_id}`
    ];

    for (const pattern of patterns) {
      try {
        await cacheService.delete(pattern);
      } catch (error) {
        logger.warn(`Error clearing cache pattern ${pattern}`, {
          component: 'AlertPreferenceManagement'
        });
      }
    }
  }
}

export const alertPreferenceManagementService = new AlertPreferenceManagementService();
