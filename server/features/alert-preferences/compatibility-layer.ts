/**
 * Backward Compatibility Layer for Alert Preferences
 * 
 * This module provides backward compatibility for code still using
 * the old alert-preferences API. It redirects all calls to the new
 * unified notifications system.
 * 
 * @deprecated Use @server/features/notifications instead
 */

import { logger } from '@server/infrastructure/observability';
import {
  alertPreferenceManagementService,
  alertDeliveryService,
  type AlertPreference,
  type AlertType,
  type Priority,
  type AlertDeliveryLog
} from '@server/features/notifications';

/**
 * @deprecated Use alertPreferenceManagementService from @server/features/notifications
 */
export class UnifiedAlertPreferenceService {
  constructor() {
    logger.warn('DEPRECATION WARNING: UnifiedAlertPreferenceService is deprecated. Use alertPreferenceManagementService from @server/features/notifications instead', {
      component: 'CompatibilityLayer'
    });
  }

  async createAlertPreference(
    user_id: string,
    preferenceData: any
  ): Promise<AlertPreference> {
    return alertPreferenceManagementService.createAlertPreference(user_id, preferenceData);
  }

  async getUserAlertPreferences(user_id: string): Promise<AlertPreference[]> {
    return alertPreferenceManagementService.getUserAlertPreferences(user_id);
  }

  async getAlertPreference(user_id: string, preferenceId: string): Promise<AlertPreference | null> {
    return alertPreferenceManagementService.getAlertPreference(user_id, preferenceId);
  }

  async updateAlertPreference(
    user_id: string,
    preferenceId: string,
    updates: any
  ): Promise<AlertPreference> {
    return alertPreferenceManagementService.updateAlertPreference(user_id, preferenceId, updates);
  }

  async deleteAlertPreference(user_id: string, preferenceId: string): Promise<void> {
    return alertPreferenceManagementService.deleteAlertPreference(user_id, preferenceId);
  }

  async processAlertDelivery(
    user_id: string,
    alertType: AlertType,
    alertData: any,
    originalPriority: Priority = 'normal'
  ): Promise<AlertDeliveryLog[]> {
    const result = await alertDeliveryService.processAlertDelivery({
      user_id,
      alertType,
      alertData,
      originalPriority
    });
    return result.deliveryLogs;
  }

  async getAlertDeliveryLogs(user_id: string, options: any = {}): Promise<any> {
    return alertPreferenceManagementService.getDeliveryLogs(user_id, options);
  }

  async getAlertPreferenceStats(user_id: string): Promise<any> {
    return alertPreferenceManagementService.getAlertPreferenceStats(user_id);
  }

  async processBatchedAlerts(user_id: string, preferenceId: string): Promise<number> {
    return alertDeliveryService.processBatchedAlerts(user_id, preferenceId);
  }

  async verifyChannel(
    user_id: string,
    preferenceId: string,
    channelType: any,
    verificationCode: string
  ): Promise<boolean> {
    // This functionality needs to be implemented in the new system
    logger.warn('verifyChannel not yet implemented in new system', {
      component: 'CompatibilityLayer'
    });
    return false;
  }

  getServiceStats() {
    return {
      serviceActive: true,
      version: '2.0.0-compat',
      lastUpdate: new Date(),
      deprecationNotice: 'This API is deprecated. Use @server/features/notifications instead',
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

  async shutdown(): Promise<void> {
    logger.info('Compatibility layer shutdown (no-op)', {
      component: 'CompatibilityLayer'
    });
  }
}

/**
 * @deprecated Use alertPreferenceManagementService from @server/features/notifications
 */
export const unifiedAlertPreferenceService = new UnifiedAlertPreferenceService();

// Re-export types for backward compatibility
export type {
  AlertPreference,
  AlertType,
  Priority,
  AlertDeliveryLog
} from '@server/features/notifications';
