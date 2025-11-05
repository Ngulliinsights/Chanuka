import { AlertChannel } from '../../domain/value-objects/alert-channel';
import { AlertType } from '../../domain/value-objects/alert-type';
import { Priority } from '../../domain/value-objects/priority';
import { SmartFilteringConfig } from '../../domain/value-objects/smart-filtering-config';
import { FrequencyConfig } from '../../domain/value-objects/frequency-config';
import { AlertConditions } from '../../domain/value-objects/alert-conditions';

/**
 * Command to create a new alert preference
 */
export class CreateAlertPreferenceCommand { constructor(
    public readonly user_id: string,
    public readonly name: string,
    public readonly is_active: boolean,
    public readonly alertTypes: AlertTypeConfigCommand[],
    public readonly channels: AlertChannelCommand[],
    public readonly frequency: FrequencyConfigCommand,
    public readonly smartFiltering: SmartFilteringConfigCommand,
    public readonly description?: string
  ) { }
}

/**
 * Command DTOs for alert type configuration
 */
export class AlertTypeConfigCommand {
  constructor(
    public readonly type: string,
    public readonly enabled: boolean,
    public readonly priority: string,
    public readonly conditions?: AlertConditionsCommand
  ) {}
}

/**
 * Command DTO for alert conditions
 */
export class AlertConditionsCommand {
  constructor(
    public readonly billCategories?: string[],
    public readonly billStatuses?: string[],
    public readonly sponsor_ids?: number[],
    public readonly keywords?: string[],
    public readonly minimumEngagement?: number,
    public readonly user_roles?: string[],
    public readonly timeRange?: TimeRangeCommand,
    public readonly dayOfWeek?: number[]
  ) {}
}

/**
 * Command DTO for time range
 */
export class TimeRangeCommand {
  constructor(
    public readonly start: string,
    public readonly end: string
  ) {}
}

/**
 * Command DTO for alert channel
 */
export class AlertChannelCommand {
  constructor(
    public readonly type: string,
    public readonly enabled: boolean,
    public readonly config: ChannelConfigCommand,
    public readonly priority: string,
    public readonly quietHours?: QuietHoursCommand
  ) {}
}

/**
 * Command DTO for channel configuration
 */
export class ChannelConfigCommand {
  constructor(
    public readonly email?: string,
    public readonly pushToken?: string,
    public readonly phone_number?: string,
    public readonly webhookUrl?: string,
    public readonly webhookSecret?: string,
    public readonly verified: boolean = false
  ) {}
}

/**
 * Command DTO for quiet hours
 */
export class QuietHoursCommand {
  constructor(
    public readonly enabled: boolean,
    public readonly startTime: string,
    public readonly endTime: string,
    public readonly timezone: string
  ) {}
}

/**
 * Command DTO for frequency configuration
 */
export class FrequencyConfigCommand {
  constructor(
    public readonly type: 'immediate' | 'batched',
    public readonly batchInterval?: 'hourly' | 'daily' | 'weekly',
    public readonly batchTime?: string,
    public readonly batchDay?: number
  ) {}
}

/**
 * Command DTO for smart filtering configuration
 */
export class SmartFilteringConfigCommand {
  constructor(
    public readonly enabled: boolean,
    public readonly user_interestWeight: number,
    public readonly engagementHistoryWeight: number,
    public readonly trendingWeight: number,
    public readonly duplicateFiltering: boolean,
    public readonly spamFiltering: boolean,
    public readonly minimumConfidence: number
  ) {}
}





































