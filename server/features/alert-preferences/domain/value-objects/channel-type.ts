/**
 * Channel Type Value Object
 * Represents the different delivery channels for alerts
 */
export class ChannelType {
  private constructor(private readonly value: string) {}

  static readonly IN_APP = new ChannelType('in_app');
  static readonly EMAIL = new ChannelType('email');
  static readonly PUSH = new ChannelType('push');
  static readonly SMS = new ChannelType('sms');
  static readonly WEBHOOK = new ChannelType('webhook');

  static fromString(value: string): ChannelType {
    switch (value) {
      case 'in_app':
        return ChannelType.IN_APP;
      case 'email':
        return ChannelType.EMAIL;
      case 'push':
        return ChannelType.PUSH;
      case 'sms':
        return ChannelType.SMS;
      case 'webhook':
        return ChannelType.WEBHOOK;
      default:
        throw new Error(`Invalid channel type: ${value}`);
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: ChannelType): boolean {
    return this.value === other.value;
  }

  requiresVerification(): boolean {
    return [ChannelType.EMAIL.value, ChannelType.SMS.value, ChannelType.PUSH.value, ChannelType.WEBHOOK.value].includes(this.value);
  }

  isExternalChannel(): boolean {
    return this.value !== ChannelType.IN_APP.value;
  }
}






































