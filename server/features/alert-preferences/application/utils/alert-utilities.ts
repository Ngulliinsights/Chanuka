import { unifiedAlertPreferenceService, AlertPreference, AlertType, Priority } from '../../domain/services/unified-alert-preference-service';
import { logger  } from '../../../../../shared/core/src/index.js';
import { cacheService } from '../../../../infrastructure/cache';

/**
 * Alert System Utilities and Helper Functions
 * 
 * This module provides utility functions for:
 * - Data migration from legacy alert systems
 * - Batch processing of alerts
 * - Scheduled jobs for batched notifications
 * - Alert template generation
 * - Validation helpers
 */

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

/**
 * Migrates legacy alert preferences to the unified system
 * 
 * @param user_id - The user ID to migrate
 * @param legacyPreferences - Old preference structure
 * @returns The newly created unified preferences
 */
export async function migrateLegacyPreferences(
  user_id: string,
  legacyPreferences: any
): Promise<AlertPreference[]> { try {
    logger.info('Starting legacy preference migration', {
      component: 'AlertUtilities',
      user_id
     });

    const migratedPreferences: AlertPreference[] = [];

    // Check if legacy preferences exist
    if (!legacyPreferences || typeof legacyPreferences !== 'object') { logger.warn('No legacy preferences found, creating default', {
        component: 'AlertUtilities',
        user_id
       });
      return [];
    }

    // Migrate from old "alerts" structure
    if (legacyPreferences.alerts) { const oldAlerts = legacyPreferences.alerts;
      
      const newPreference = await unifiedAlertPreferenceService.createAlertPreference(user_id, {
        name: 'Migrated Alerts',
        description: 'Automatically migrated from legacy system',
        is_active: oldAlerts.enabled !== false,
        alertTypes: [
          {
            type: 'bill_status_change',
            enabled: oldAlerts.billStatusChanges !== false,
            priority: 'normal'
           },
          {
            type: 'new_comment',
            enabled: oldAlerts.comments !== false,
            priority: 'low'
          },
          {
            type: 'voting_scheduled',
            enabled: oldAlerts.voting !== false,
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
          type: oldAlerts.batching ? 'batched' : 'immediate',
          batchInterval: oldAlerts.batchInterval || 'daily',
          batchTime: oldAlerts.batchTime || '09:00'
        },
        smartFiltering: {
          enabled: true,
          user_interestWeight: 0.6,
          engagementHistoryWeight: 0.3,
          trendingWeight: 0.1,
          duplicateFiltering: true,
          spamFiltering: true,
          minimumConfidence: 0.3
        }
      });

      migratedPreferences.push(newPreference);
    }

    // Migrate from "advancedAlerts" structure (from document 3)
    if (legacyPreferences.advancedAlerts) { const advanced = legacyPreferences.advancedAlerts;
      
      if (advanced.granularSettings) {
        const newPreference = await unifiedAlertPreferenceService.createAlertPreference(user_id, {
          name: 'Advanced Settings (Migrated)',
          description: 'Migrated from advanced alert settings',
          is_active: true,
          alertTypes: [
            {
              type: 'bill_status_change',
              enabled: advanced.granularSettings.billStatusChanges?.enabled || true,
              priority: 'normal',
              conditions: {
                billCategories: advanced.granularSettings.billStatusChanges?.categories || [],
                sponsor_ids: advanced.granularSettings.billStatusChanges?.sponsors?.map(Number) || [],
                keywords: advanced.granularSettings.billStatusChanges?.customKeywords || []
               }
            },
            {
              type: 'voting_scheduled',
              enabled: advanced.granularSettings.votingAlerts?.enabled || true,
              priority: 'high'
            },
            {
              type: 'amendment',
              enabled: advanced.granularSettings.amendmentTracking?.enabled || false,
              priority: 'normal'
            },
            {
              type: 'sponsor_update',
              enabled: advanced.granularSettings.sponsorshipChanges?.enabled || false,
              priority: 'normal'
            }
          ],
          channels: migrateChannelConfigs(advanced.channelConfigs),
          frequency: migrateFrequencyConfig(advanced.scheduling),
          smartFiltering: migrateSmartFiltering(advanced.smartFiltering)
        });

        migratedPreferences.push(newPreference);
      }
    }

    logger.info(`Migrated ${migratedPreferences.length} preferences`, { component: 'AlertUtilities',
      user_id
     });

    return migratedPreferences;

  } catch (error) { logger.error('Error migrating legacy preferences', {
      component: 'AlertUtilities',
      user_id
     }, error);
    throw error;
  }
}

import type { AlertChannel } from '../../domain/services/unified-alert-preference-service';

/**
 * Helper to migrate channel configs from advanced alerts
 */
function migrateChannelConfigs(channelConfigs: any): AlertChannel[] {
  const channels: AlertChannel[] = [];

  if (channelConfigs?.inApp?.enabled) {
    channels.push({
      type: 'in_app',
      enabled: true,
      config: { verified: true },
      priority: 'normal'
    });
  }

  if (channelConfigs?.email?.enabled) {
    channels.push({
      type: 'email',
      enabled: true,
      config: {
        email: channelConfigs.email.emailAddress,
        verified: channelConfigs.email.verified || false
      },
      priority: 'normal'
    });
  }

  if (channelConfigs?.push?.enabled) {
    channels.push({
      type: 'push',
      enabled: true,
      config: {
        pushToken: channelConfigs.push.deviceTokens?.[0],
        verified: true
      },
      priority: 'normal',
      quietHours: channelConfigs.push.quietHours?.enabled ? {
        enabled: true,
        startTime: channelConfigs.push.quietHours.start,
        endTime: channelConfigs.push.quietHours.end,
        timezone: channelConfigs.push.quietHours.timezone
      } : undefined
    });
  }

  if (channelConfigs?.sms?.enabled) {
    channels.push({
      type: 'sms',
      enabled: true,
      config: {
        phoneNumber: channelConfigs.sms.phoneNumber,
        verified: channelConfigs.sms.verified || false
      },
      priority: 'urgent'
    });
  }

  if (channelConfigs?.webhook?.enabled) {
    channels.push({
      type: 'webhook',
      enabled: true,
      config: {
        webhookUrl: channelConfigs.webhook.url,
        webhookSecret: channelConfigs.webhook.secret,
        verified: true
      },
      priority: 'normal'
    });
  }

  // Ensure at least one channel
  if (channels.length === 0) {
    channels.push({
      type: 'in_app',
      enabled: true,
      config: { verified: true },
      priority: 'normal'
    });
  }

  return channels;
}

/**
 * Helper to migrate frequency/scheduling config
 */
function migrateFrequencyConfig(scheduling: any): any {
  if (!scheduling || !scheduling.digestScheduling?.enabled) {
    return { type: 'immediate' };
  }

  const digest = scheduling.digestScheduling;
  
  return {
    type: 'batched',
    batchInterval: digest.frequency || 'daily',
    batchTime: digest.preferredTime || '09:00',
    batchDay: digest.dayOfWeek
  };
}

/**
 * Helper to migrate smart filtering config
 */
function migrateSmartFiltering(smartFiltering: any): any {
  if (!smartFiltering) {
    return {
      enabled: true,
      user_interestWeight: 0.6,
      engagementHistoryWeight: 0.3,
      trendingWeight: 0.1,
      duplicateFiltering: true,
      spamFiltering: true,
      minimumConfidence: 0.3
    };
  }

  const interest = smartFiltering.interestBasedFiltering || {};
  
  return {
    enabled: interest.enabled !== false,
    user_interestWeight: interest.enabled ? 0.6 : 0,
    engagementHistoryWeight: interest.useEngagementHistory ? 0.3 : 0,
    trendingWeight: 0.1,
    duplicateFiltering: true,
    spamFiltering: true,
    minimumConfidence: interest.confidenceThreshold || 0.3
  };
}

// ============================================================================
// BATCH PROCESSING UTILITIES
// ============================================================================

/**
 * Processes all pending batched alerts for all users
 * Should be called by a scheduled job
 * 
 * @param batchInterval - The interval to process ('hourly', 'daily', 'weekly')
 * @returns Number of batches processed
 */
export async function processAllBatchedAlerts(
  batchInterval: 'hourly' | 'daily' | 'weekly'
): Promise<{ processed: number; failed: number }> {
  try {
    logger.info(`Starting batch processing for ${batchInterval} alerts`, {
      component: 'AlertUtilities'
    });

  // In production, you would query the database for all users with batched preferences
  // For now, we'll get this from cache keys
  const allKeys = await cacheService.keys();
  const batchKeys = allKeys.filter(k => k.startsWith('alert_batch:'));
    
    let processed = 0;
    let failed = 0;

    for (const key of batchKeys) { try {
        // Parse key to get user_id and preferenceId
        const parts = key.split(':');
        if (parts.length !== 3) continue;
        
        const user_id = parts[1];
        const preferenceId = parts[2];

        // Get the preference to check interval
        const preference = await unifiedAlertPreferenceService.getAlertPreference(
          user_id,
          preferenceId
        );

        if (!preference) continue;

        // Check if this preference should be processed now
        if (preference.frequency.type !== 'batched') continue;
        if (preference.frequency.batchInterval !== batchInterval) continue;

        // For daily/weekly, check if it's the right time
        if (batchInterval === 'daily' || batchInterval === 'weekly') {
          if (!shouldProcessBatchNow(preference)) continue;
         }

        // Process the batch
        const count = await unifiedAlertPreferenceService.processBatchedAlerts(
          user_id,
          preferenceId
        );

        if (count > 0) { processed++;
          logger.info(`Processed batch for user ${user_id }, preference ${preferenceId}`, {
            component: 'AlertUtilities',
            count
          });
        }

      } catch (error) {
        failed++;
        logger.error('Error processing batch', {
          component: 'AlertUtilities',
          key
        }, error);
      }
    }

    logger.info(`Batch processing complete: ${processed} processed, ${failed} failed`, {
      component: 'AlertUtilities',
      batchInterval
    });

    return { processed, failed };

  } catch (error) {
    logger.error('Error in batch processing', {
      component: 'AlertUtilities',
      batchInterval
    }, error);
    throw error;
  }
}

/**
 * Checks if a batched preference should be processed now
 */
function shouldProcessBatchNow(preference: AlertPreference): boolean {
  if (preference.frequency.type !== 'batched') return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay();

  // Parse batch time
  const [batchHour, batchMinute] = (preference.frequency.batchTime || '09:00')
    .split(':')
    .map(Number);

  // Check if current time matches batch time (within 5-minute window)
  const timeMatches = 
    currentHour === batchHour && 
    Math.abs(currentMinute - batchMinute) <= 5;

  if (!timeMatches) return false;

  // For weekly batches, check day of week
  if (preference.frequency.batchInterval === 'weekly') {
    return currentDay === (preference.frequency.batchDay || 1);
  }

  return true;
}

// ============================================================================
// ALERT TEMPLATE UTILITIES
// ============================================================================

/**
 * Generates a formatted alert message based on type and data
 */
export function generateAlertMessage(
  alertType: AlertType,
  alertData: any
): { title: string; message: string } {
  switch (alertType) {
    case 'bill_status_change':
      return {
        title: `Bill Status Update: ${alertData.billTitle || 'Unknown Bill'}`,
        message: `The status of ${alertData.billTitle || 'a bill you\'re tracking'} has changed from "${alertData.oldStatus || 'unknown'}" to "${alertData.newStatus || 'unknown'}".`
      };

    case 'new_comment':
      return {
        title: 'New Comment on Tracked Bill',
        message: `${alertData.commenterName || 'Someone'} commented on ${alertData.billTitle || 'a bill you\'re tracking'}: "${alertData.commentPreview || 'View full comment'}"`
      };

    case 'amendment':
      return {
        title: `Amendment to ${alertData.billTitle || 'Tracked Bill'}`,
        message: `An amendment has been ${alertData.amendmentAction || 'proposed'} for ${alertData.billTitle || 'a bill you\'re tracking'}. ${alertData.amendmentSummary || 'View details for more information.'}`
      };

    case 'voting_scheduled':
      return {
        title: `Voting Scheduled: ${alertData.billTitle || 'Tracked Bill'}`,
        message: `A vote has been scheduled for ${alertData.billTitle || 'a bill you\'re tracking'} on ${alertData.votingDate ? new Date(alertData.votingDate).toLocaleDateString() : 'an upcoming date'}.`
      };

    case 'sponsor_update':
      return {
        title: `Sponsor Update: ${alertData.billTitle || 'Tracked Bill'}`,
        message: alertData.sponsorAdded 
          ? `${alertData.sponsorName || 'A sponsor'} has been added to ${alertData.billTitle || 'a bill you\'re tracking'}.`
          : `${alertData.sponsorName || 'A sponsor'} has been removed from ${alertData.billTitle || 'a bill you\'re tracking'}.`
      };

    case 'engagement_milestone':
      return {
        title: `Engagement Milestone: ${alertData.billTitle || 'Tracked Bill'}`,
        message: `${alertData.billTitle || 'A bill you\'re tracking'} has reached ${alertData.engagementCount || 0} ${alertData.engagement_type || 'engagements'}!`
      };

    default:
      return {
        title: 'New Alert',
        message: alertData.message || 'You have a new alert.'
      };
  }
}

/**
 * Generates a batched alert digest message
 */
export function generateBatchDigest(
  alerts: any[],
  preferenceId: string
): { title: string; message: string; html?: string } {
  const groupedByType = alerts.reduce((acc: any, alert: any) => {
    if (!acc[alert.alertType]) {
      acc[alert.alertType] = [];
    }
    acc[alert.alertType].push(alert);
    return acc;
  }, {});

  const title = `Alert Digest - ${alerts.length} Updates`;
  
  let message = `You have ${alerts.length} new alerts:\n\n`;
  let html = `<h2>Alert Digest</h2><p>You have ${alerts.length} new alerts:</p>`;

  for (const [type, typeAlerts] of Object.entries(groupedByType) as [AlertType, any[]][]) {
    message += `${getAlertTypeLabel(type)} (${typeAlerts.length}):\n`;
    html += `<h3>${getAlertTypeLabel(type)} (${typeAlerts.length})</h3><ul>`;
    
    for (const alert of typeAlerts.slice(0, 5)) {
      const alertMsg = generateAlertMessage(type, alert.alertData);
      message += `- ${alertMsg.title}\n`;
      html += `<li><strong>${alertMsg.title}</strong><br>${alertMsg.message}</li>`;
    }
    
    if (typeAlerts.length > 5) {
      message += `... and ${typeAlerts.length - 5} more\n`;
      html += `<li><em>... and ${typeAlerts.length - 5} more</em></li>`;
    }
    
    message += '\n';
    html += '</ul>';
  }

  return { title, message, html };
}

/**
 * Gets a human-readable label for an alert type
 */
function getAlertTypeLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    'bill_status_change': 'Bill Status Changes',
    'new_comment': 'New Comments',
    'amendment': 'Amendments',
    'voting_scheduled': 'Voting Scheduled',
    'sponsor_update': 'Sponsor Updates',
    'engagement_milestone': 'Engagement Milestones'
  };
  return labels[type] || type;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates alert data before processing
 */
export function validateAlertData(
  alertType: AlertType,
  alertData: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!alertData) {
    errors.push('Alert data is required');
    return { valid: false, errors };
  }

  // Common validations
  if (alertData.bill_id && typeof alertData.bill_id !== 'number') { errors.push('bill_id must be a number');
   }

  // Type-specific validations
  switch (alertType) {
    case 'bill_status_change':
      if (!alertData.oldStatus) errors.push('oldStatus is required');
      if (!alertData.newStatus) errors.push('newStatus is required');
      break;

    case 'new_comment':
      if (!alertData.commentPreview && !alertData.commentText) {
        errors.push('Comment content is required');
      }
      break;

    case 'voting_scheduled':
      if (!alertData.votingDate) errors.push('votingDate is required');
      break;

    case 'sponsor_update':
      if (!alertData.sponsorName) errors.push('sponsorName is required');
      if (alertData.sponsorAdded === undefined) {
        errors.push('sponsorAdded flag is required');
      }
      break;

    case 'engagement_milestone':
      if (!alertData.engagementCount) errors.push('engagementCount is required');
      if (!alertData.engagement_type) errors.push('engagement_type is required');
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// ANALYTICS UTILITIES
// ============================================================================

/**
 * Generates a comprehensive report for a user's alert activity
 */
export async function generateUserAlertReport(
  user_id: string,
  days: number = 30
): Promise<{
  summary: any;
  topAlertTypes: any[];
  channelPerformance: any[];
  recommendations: string[];
}> { try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await unifiedAlertPreferenceService.getAlertDeliveryLogs(user_id, {
      startDate,
      limit: 1000
     });

    const stats = await unifiedAlertPreferenceService.getAlertPreferenceStats(user_id);

    // Calculate top alert types
    const typeCounts: Record<string, number> = {};
    logs.logs.forEach(log => {
      typeCounts[log.alertType] = (typeCounts[log.alertType] || 0) + 1;
    });

    const topAlertTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Channel performance
    const channelPerformance = Object.entries(stats.channelStats).map(([channel, data]: [string, any]) => ({
      channel,
      deliveries: data.deliveries,
      successRate: data.successRate,
      enabled: data.enabled
    }));

    // Generate recommendations
    const recommendations: string[] = [];

    if (stats.deliveryStats.filteredAlerts > stats.deliveryStats.successfulDeliveries * 0.5) {
      recommendations.push('Consider lowering your smart filtering confidence threshold to receive more alerts');
    }

    if (stats.deliveryStats.failedDeliveries > 5) {
      recommendations.push('Some channels are experiencing delivery failures. Please verify your contact information');
    }

    const emailChannel = channelPerformance.find(c => c.channel === 'email');
    if (emailChannel && emailChannel.enabled && emailChannel.successRate < 90) {
      recommendations.push('Your email delivery rate is low. Check your email settings and spam folder');
    }

    if (stats.totalPreferences > 5) {
      recommendations.push('You have many alert preferences. Consider consolidating them for easier management');
    }

    return {
      summary: {
        period: `Last ${days} days`,
        totalPreferences: stats.totalPreferences,
        activePreferences: stats.activePreferences,
        ...stats.deliveryStats
      },
      topAlertTypes,
      channelPerformance,
      recommendations
    };

  } catch (error) { logger.error('Error generating user alert report', {
      component: 'AlertUtilities',
      user_id
     }, error);
    throw error;
  }
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

/**
 * Cleans up old delivery logs (keeps last 1000 per user)
 */
export async function cleanupOldDeliveryLogs(user_id: string): Promise<number> { try {
    // This is handled automatically in the storeDeliveryLog method
    // but can be called manually if needed
    logger.info('Delivery log cleanup is handled automatically', {
      component: 'AlertUtilities',
      user_id
     });
    return 0;
  } catch (error) { logger.error('Error cleaning up delivery logs', {
      component: 'AlertUtilities',
      user_id
     }, error);
    return 0;
  }
}

/**
 * Clears expired batch caches
 */
export async function clearExpiredBatches(): Promise<number> {
  try {
    // Cache service handles TTL automatically
    // This is a placeholder for manual cleanup if needed
    logger.info('Batch cache cleanup is handled automatically by TTL', {
      component: 'AlertUtilities'
    });
    return 0;
  } catch (error) {
    logger.error('Error clearing expired batches', {
      component: 'AlertUtilities'
    }, error);
    return 0;
  }
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const alertUtilities = {
  migration: {
    migrateLegacyPreferences
  },
  batch: {
    processAllBatchedAlerts,
    shouldProcessBatchNow
  },
  templates: {
    generateAlertMessage,
    generateBatchDigest,
    getAlertTypeLabel
  },
  validation: {
    validateAlertData
  },
  analytics: {
    generateUserAlertReport
  },
  cleanup: {
    cleanupOldDeliveryLogs,
    clearExpiredBatches
  }
};






































