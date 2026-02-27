/**
 * Alert Preference Entity
 * 
 * Represents a user's configured alert preferences including:
 * - Alert types and conditions
 * - Delivery channels and priorities
 * - Smart filtering configuration
 * - Batching and scheduling preferences
 */

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
    phone_number?: string;
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
  sponsor_ids?: number[];
  keywords?: string[];
  minimumEngagement?: number;
  user_roles?: string[];
  timeRange?: {
    start: string; // HH:MM
    end: string;
  };
  dayOfWeek?: number[]; // 0-6
}

export interface SmartFilteringConfig {
  enabled: boolean;
  user_interestWeight: number; // 0-1
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
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  alertTypes: Array<{
    type: AlertType;
    enabled: boolean;
    priority: Priority;
    conditions?: AlertConditions;
  }>;
  channels: AlertChannel[];
  frequency: FrequencyConfig;
  smartFiltering: SmartFilteringConfig;
  created_at: Date;
  updated_at: Date;
}

export interface AlertDeliveryLog {
  id: string;
  user_id: string;
  preferenceId: string;
  alertType: AlertType;
  channels: ChannelType[];
  status: DeliveryStatus;
  deliveryAttempts: number;
  lastAttempt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  metadata: {
    bill_id?: number;
    sponsor_id?: number;
    originalPriority: Priority;
    adjustedPriority?: Priority;
    filteredReason?: string;
    confidence?: number;
  };
  created_at: Date;
}

export interface SmartFilteringResult {
  shouldSend: boolean;
  filteredReason?: string;
  adjustedPriority?: Priority;
  confidence: number; // 0-1
}

/**
 * Alert Preference Entity Class
 */
export class AlertPreferenceEntity {
  constructor(public readonly data: AlertPreference) {}

  get id(): string {
    return this.data.id;
  }

  get userId(): string {
    return this.data.user_id;
  }

  get isActive(): boolean {
    return this.data.is_active;
  }

  get name(): string {
    return this.data.name;
  }

  /**
   * Check if a specific alert type is enabled
   */
  isAlertTypeEnabled(alertType: AlertType): boolean {
    const config = this.data.alertTypes.find(at => at.type === alertType);
    return config?.enabled ?? false;
  }

  /**
   * Get enabled channels for a specific priority level
   */
  getEnabledChannelsForPriority(priority: Priority): AlertChannel[] {
    return this.data.channels.filter(channel => {
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

  /**
   * Check if alert should be batched based on frequency config and priority
   */
  shouldBatch(priority: Priority): boolean {
    return this.data.frequency.type === 'batched' && priority !== 'urgent';
  }

  /**
   * Check if conditions match the alert data
   */
  matchesConditions(alertData: any, alertType: AlertType): boolean {
    const alertTypeConfig = this.data.alertTypes.find(at => at.type === alertType);
    if (!alertTypeConfig?.conditions) return true;

    const conditions = alertTypeConfig.conditions;

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
    if (conditions.sponsor_ids && conditions.sponsor_ids.length > 0) {
      if (!alertData.sponsor_id || 
          !conditions.sponsor_ids.includes(alertData.sponsor_id)) {
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

  /**
   * Update the preference data
   */
  update(updates: Partial<Omit<AlertPreference, 'id' | 'user_id' | 'created_at'>>): AlertPreferenceEntity {
    return new AlertPreferenceEntity({
      ...this.data,
      ...updates,
      updated_at: new Date()
    });
  }

  /**
   * Convert to plain object
   */
  toJSON(): AlertPreference {
    return { ...this.data };
  }
}
