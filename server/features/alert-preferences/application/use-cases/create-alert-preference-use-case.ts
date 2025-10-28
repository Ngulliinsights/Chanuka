import { AlertPreference } from '../../domain/entities/alert-preference';
import { AlertChannel } from '../../domain/value-objects/alert-channel';
import { AlertType } from '../../domain/value-objects/alert-type';
import { Priority } from '../../domain/value-objects/priority';
import { SmartFilteringConfig } from '../../domain/value-objects/smart-filtering-config';
import { FrequencyConfig } from '../../domain/value-objects/frequency-config';
import { AlertConditions } from '../../domain/value-objects/alert-conditions';
import { ChannelType } from '../../domain/value-objects/channel-type';
import { IAlertPreferenceRepository } from '../../domain/repositories/alert-preference-repository';
import { CreateAlertPreferenceCommand } from '../commands/create-alert-preference-command';

/**
 * Use case for creating alert preferences
 */
export class CreateAlertPreferenceUseCase {
  constructor(
    private readonly alertPreferenceRepository: IAlertPreferenceRepository
  ) {}

  /**
   * Executes the create alert preference use case
   */
  async execute(command: CreateAlertPreferenceCommand): Promise<AlertPreference> {
    // Convert command DTOs to domain objects
    const alertTypes = command.alertTypes.map(at => this.convertAlertTypeConfig(at));
    const channels = command.channels.map(ch => this.convertAlertChannel(ch));
    const frequency = this.convertFrequencyConfig(command.frequency);
    const smartFiltering = this.convertSmartFilteringConfig(command.smartFiltering);

    // Create the alert preference entity
    const alertPreference = new AlertPreference(
      this.generatePreferenceId(),
      command.userId,
      command.name,
      command.isActive,
      alertTypes,
      channels,
      frequency,
      smartFiltering,
      new Date(),
      new Date(),
      command.description
    );

    // Save to repository
    await this.alertPreferenceRepository.save(alertPreference);

    return alertPreference;
  }

  private convertAlertTypeConfig(command: any): any {
    return {
      type: AlertType.fromString(command.type),
      enabled: command.enabled,
      priority: Priority.fromString(command.priority),
      conditions: command.conditions ? this.convertAlertConditions(command.conditions) : undefined
    };
  }

  private convertAlertConditions(command: any): AlertConditions {
    return new AlertConditions(
      command.billCategories,
      command.billStatuses,
      command.sponsorIds,
      command.keywords,
      command.minimumEngagement,
      command.userRoles,
      command.timeRange ? {
        start: command.timeRange.start,
        end: command.timeRange.end
      } : undefined,
      command.dayOfWeek
    );
  }

  private convertAlertChannel(command: any): AlertChannel {
    const channelType = ChannelType.fromString(command.type);
    const priority = Priority.fromString(command.priority);

    const config = {
      email: command.config.email,
      pushToken: command.config.pushToken,
      phoneNumber: command.config.phoneNumber,
      webhookUrl: command.config.webhookUrl,
      webhookSecret: command.config.webhookSecret,
      verified: command.config.verified
    };

    const quietHours = command.quietHours ? {
      enabled: command.quietHours.enabled,
      startTime: command.quietHours.startTime,
      endTime: command.quietHours.endTime,
      timezone: command.quietHours.timezone
    } : undefined;

    return new AlertChannel(channelType, command.enabled, config, priority, quietHours);
  }

  private convertFrequencyConfig(command: any): FrequencyConfig {
    return new FrequencyConfig(
      command.type,
      command.batchInterval,
      command.batchTime,
      command.batchDay
    );
  }

  private convertSmartFilteringConfig(command: any): SmartFilteringConfig {
    return new SmartFilteringConfig(
      command.enabled,
      command.userInterestWeight,
      command.engagementHistoryWeight,
      command.trendingWeight,
      command.duplicateFiltering,
      command.spamFiltering,
      command.minimumConfidence
    );
  }

  private generatePreferenceId(): string {
    return `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}





































