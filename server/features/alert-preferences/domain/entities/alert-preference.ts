import { AlertChannel } from '../value-objects/alert-channel';
import { AlertType } from '../value-objects/alert-type';
import { Priority } from '../value-objects/priority';
import { SmartFilteringConfig } from '../value-objects/smart-filtering-config';
import { FrequencyConfig } from '../value-objects/frequency-config';
import { AlertConditions } from '../value-objects/alert-conditions';

/**
 * Alert Preference Entity
 * Represents a user's alert preference configuration
 */
export class AlertPreference {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly isActive: boolean,
    public readonly alertTypes: AlertTypeConfig[],
    public readonly channels: AlertChannel[],
    public readonly frequency: FrequencyConfig,
    public readonly smartFiltering: SmartFilteringConfig,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly description?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Alert preference ID is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Preference name is required');
    }

    if (this.alertTypes.length === 0) {
      throw new Error('At least one alert type must be configured');
    }

    if (this.channels.length === 0) {
      throw new Error('At least one channel must be configured');
    }

    // Validate that all alert types have unique types
    const types = this.alertTypes.map(at => at.type.toString());
    if (new Set(types).size !== types.length) {
      throw new Error('Alert types must be unique');
    }
  }

  /**
   * Checks if this preference should trigger for a given alert type
   */
  shouldTriggerFor(alertType: AlertType, alertData: any, userRole?: string, currentTime?: Date): boolean {
    if (!this.isActive) {
      return false;
    }

    const typeConfig = this.alertTypes.find(at => at.type.equals(alertType));
    if (!typeConfig || !typeConfig.enabled) {
      return false;
    }

    // Check conditions if specified
    if (typeConfig.conditions && !typeConfig.conditions.matches(alertData, userRole, currentTime)) {
      return false;
    }

    return true;
  }

  /**
   * Gets the priority for a specific alert type
   */
  getPriorityFor(alertType: AlertType): Priority {
    const typeConfig = this.alertTypes.find(at => at.type.equals(alertType));
    return typeConfig ? typeConfig.priority : alertType.getDefaultPriority();
  }

  /**
   * Gets enabled channels for a given priority
   */
  getEnabledChannelsForPriority(priority: Priority): AlertChannel[] {
    return this.channels.filter(channel => channel.shouldDeliverForPriority(priority));
  }

  /**
   * Checks if the preference supports a specific channel type
   */
  hasChannelType(channelType: string): boolean {
    return this.channels.some(channel => channel.type.toString() === channelType && channel.enabled);
  }

  /**
   * Creates a new preference with updated properties
   */
  update(updates: Partial<AlertPreferenceUpdate>): AlertPreference {
    return new AlertPreference(
      this.id,
      this.userId,
      updates.name ?? this.name,
      updates.isActive ?? this.isActive,
      updates.alertTypes ?? this.alertTypes,
      updates.channels ?? this.channels,
      updates.frequency ?? this.frequency,
      updates.smartFiltering ?? this.smartFiltering,
      this.createdAt,
      new Date(),
      updates.description ?? this.description
    );
  }

  /**
   * Checks if this preference equals another
   */
  equals(other: AlertPreference): boolean {
    return (
      this.id === other.id &&
      this.userId === other.userId &&
      this.name === other.name &&
      this.description === other.description &&
      this.isActive === other.isActive &&
      this.alertTypesEqual(other.alertTypes) &&
      this.channelsEqual(other.channels) &&
      this.frequency.equals(other.frequency) &&
      this.smartFiltering.equals(other.smartFiltering)
    );
  }

  private alertTypesEqual(other: AlertTypeConfig[]): boolean {
    if (this.alertTypes.length !== other.length) {
      return false;
    }

    for (let i = 0; i < this.alertTypes.length; i++) {
      const a = this.alertTypes[i];
      const b = other[i];

      if (!a.type.equals(b.type) ||
          a.enabled !== b.enabled ||
          !a.priority.equals(b.priority) ||
          !this.conditionsEqual(a.conditions, b.conditions)) {
        return false;
      }
    }

    return true;
  }

  private conditionsEqual(a?: AlertConditions, b?: AlertConditions): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.equals(b);
  }

  private channelsEqual(other: AlertChannel[]): boolean {
    if (this.channels.length !== other.length) {
      return false;
    }

    for (let i = 0; i < this.channels.length; i++) {
      if (!this.channels[i].equals(other[i])) {
        return false;
      }
    }

    return true;
  }
}

export interface AlertTypeConfig {
  type: AlertType;
  enabled: boolean;
  priority: Priority;
  conditions?: AlertConditions;
}

export interface AlertPreferenceUpdate {
  name?: string;
  description?: string;
  isActive?: boolean;
  alertTypes?: AlertTypeConfig[];
  channels?: AlertChannel[];
  frequency?: FrequencyConfig;
  smartFiltering?: SmartFilteringConfig;
}




































