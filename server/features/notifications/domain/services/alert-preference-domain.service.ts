/**
 * Alert Preference Domain Service
 * 
 * Core business logic for alert preferences including:
 * - Preference validation
 * - Condition matching
 * - Channel selection
 * - Smart filtering coordination
 */

import type {
  AlertPreference,
  AlertType,
  Priority,
  AlertChannel,
  AlertConditions,
  SmartFilteringResult
} from '../entities/alert-preference';
import { AlertPreferenceEntity } from '../entities/alert-preference';

export class AlertPreferenceDomainService {
  /**
   * Validate alert preference configuration
   */
  validatePreference(preference: AlertPreference): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!preference.name || preference.name.trim().length === 0) {
      errors.push('Preference name is required');
    }

    // Validate alert types
    if (!preference.alertTypes || preference.alertTypes.length === 0) {
      errors.push('At least one alert type must be configured');
    }

    // Validate channels
    if (!preference.channels || preference.channels.length === 0) {
      errors.push('At least one channel must be configured');
    }

    // Validate smart filtering weights sum
    const sf = preference.smartFiltering;
    if (sf.enabled) {
      const totalWeight = sf.user_interestWeight + sf.engagementHistoryWeight + sf.trendingWeight;
      if (totalWeight > 1.0) {
        errors.push('Smart filtering weights must sum to <= 1.0');
      }
    }

    // Validate batching configuration
    if (preference.frequency.type === 'batched') {
      if (!preference.frequency.batchInterval) {
        errors.push('Batch interval is required for batched frequency');
      }
      if (preference.frequency.batchInterval === 'daily' || preference.frequency.batchInterval === 'weekly') {
        if (!preference.frequency.batchTime) {
          errors.push('Batch time is required for daily/weekly batching');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if alert data matches preference conditions
   */
  matchesConditions(
    alertData: any,
    alertType: AlertType,
    preference: AlertPreference
  ): boolean {
    const entity = new AlertPreferenceEntity(preference);
    return entity.matchesConditions(alertData, alertType);
  }

  /**
   * Get enabled channels for a given priority level
   */
  getChannelsForPriority(
    preference: AlertPreference,
    priority: Priority
  ): AlertChannel[] {
    const entity = new AlertPreferenceEntity(preference);
    return entity.getEnabledChannelsForPriority(priority);
  }

  /**
   * Determine if alert should be batched
   */
  shouldBatchAlert(
    preference: AlertPreference,
    priority: Priority
  ): boolean {
    const entity = new AlertPreferenceEntity(preference);
    return entity.shouldBatch(priority);
  }

  /**
   * Calculate adjusted priority based on confidence score
   */
  adjustPriority(
    originalPriority: Priority,
    confidence: number
  ): Priority {
    if (confidence >= 0.8) {
      return 'high';
    } else if (confidence >= 0.6) {
      return 'normal';
    } else if (confidence >= 0.3) {
      return 'low';
    }
    return originalPriority;
  }

  /**
   * Merge multiple filtering results
   */
  mergeFilteringResults(
    results: SmartFilteringResult[]
  ): SmartFilteringResult {
    if (results.length === 0) {
      return {
        shouldSend: true,
        confidence: 0.5,
        filteredReason: undefined,
        adjustedPriority: undefined
      };
    }

    // If any result blocks, use that
    const blocking = results.find(r => !r.shouldSend);
    if (blocking) {
      return blocking;
    }

    // Average confidence across all results
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    // Collect all reasons
    const reasons = results
      .map(r => r.filteredReason)
      .filter(Boolean)
      .join(', ');

    return {
      shouldSend: true,
      confidence: avgConfidence,
      filteredReason: reasons || undefined,
      adjustedPriority: this.adjustPriority('normal', avgConfidence)
    };
  }

  /**
   * Check if quiet hours are active
   */
  isInQuietHours(channel: AlertChannel): boolean {
    if (!channel.quietHours?.enabled) {
      return false;
    }

    try {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = channel.quietHours.startTime.split(':').map(Number);
      const [endH, endM] = channel.quietHours.endTime.split(':').map(Number);
      
      const startMins = (startH ?? 0) * 60 + (startM ?? 0);
      const endMins = (endH ?? 0) * 60 + (endM ?? 0);

      // Handle same-day window vs midnight-spanning window
      if (startMins <= endMins) {
        return nowMins >= startMins && nowMins < endMins;
      } else {
        return nowMins >= startMins || nowMins < endMins;
      }
    } catch {
      return false;
    }
  }

  /**
   * Filter channels based on quiet hours
   */
  filterChannelsByQuietHours(
    channels: AlertChannel[],
    priority: Priority
  ): AlertChannel[] {
    // Urgent alerts bypass quiet hours
    if (priority === 'urgent') {
      return channels;
    }

    return channels.filter(channel => !this.isInQuietHours(channel));
  }
}

export const alertPreferenceDomainService = new AlertPreferenceDomainService();
