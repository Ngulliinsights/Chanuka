import { ChannelType } from './channel-type';
import { Priority } from './priority';

/**
 * Alert Channel Value Object
 * Represents a notification delivery channel with its configuration
 */
export class AlertChannel {
  constructor(
    public readonly type: ChannelType,
    public readonly enabled: boolean,
    public readonly config: ChannelConfig,
    public readonly priority: Priority,
    public readonly quietHours?: QuietHours
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.type.requiresVerification() && !this.config.verified) {
      throw new Error(`Channel ${this.type.toString()} requires verification`);
    }

    if (this.quietHours) {
      this.validateQuietHours(this.quietHours);
    }
  }

  private validateQuietHours(quietHours: QuietHours): void {
    const startTime = this.parseTime(quietHours.startTime);
    const endTime = this.parseTime(quietHours.endTime);

    if (startTime >= endTime) {
      throw new Error('Quiet hours start time must be before end time');
    }
  }

  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time format: ${time}`);
    }
    return hours * 60 + minutes;
  }

  isInQuietHours(currentTime?: Date): boolean {
    if (!this.quietHours || !this.quietHours.enabled) {
      return false;
    }

    const now = currentTime || new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = this.parseTime(this.quietHours.startTime);
    const endMinutes = this.parseTime(this.quietHours.endTime);

    // Handle overnight quiet hours
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  }

  shouldDeliverForPriority(alertPriority: Priority): boolean {
    if (!this.enabled) {
      return false;
    }

    // Urgent alerts go to all enabled channels
    if (alertPriority.equals(Priority.URGENT)) {
      return true;
    }

    // High priority alerts go to normal and high priority channels
    if (alertPriority.equals(Priority.HIGH) && !this.priority.equals(Priority.LOW)) {
      return true;
    }

    // Normal alerts go to normal priority channels
    if (alertPriority.equals(Priority.NORMAL) && this.priority.equals(Priority.NORMAL)) {
      return true;
    }

    // Low priority alerts go to all channels
    if (alertPriority.equals(Priority.LOW)) {
      return true;
    }

    return false;
  }

  equals(other: AlertChannel): boolean {
    return (
      this.type.equals(other.type) &&
      this.enabled === other.enabled &&
      this.priority.equals(other.priority) &&
      JSON.stringify(this.config) === JSON.stringify(other.config) &&
      JSON.stringify(this.quietHours) === JSON.stringify(other.quietHours)
    );
  }
}

export interface ChannelConfig {
  email?: string;
  pushToken?: string;
  phoneNumber?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  verified: boolean;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  timezone: string;
}




































