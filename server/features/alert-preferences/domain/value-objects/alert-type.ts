/**
 * Alert Type Value Object
 * Represents the different types of alerts that can be sent
 */
export class AlertType {
  private constructor(private readonly value: string) {}

  static readonly BILL_STATUS_CHANGE = new AlertType('bill_status_change');
  static readonly NEW_COMMENT = new AlertType('new_comment');
  static readonly AMENDMENT = new AlertType('amendment');
  static readonly VOTING_SCHEDULED = new AlertType('voting_scheduled');
  static readonly SPONSOR_UPDATE = new AlertType('sponsor_update');
  static readonly ENGAGEMENT_MILESTONE = new AlertType('engagement_milestone');

  static fromString(value: string): AlertType {
    switch (value) {
      case 'bill_status_change':
        return AlertType.BILL_STATUS_CHANGE;
      case 'new_comment':
        return AlertType.NEW_COMMENT;
      case 'amendment':
        return AlertType.AMENDMENT;
      case 'voting_scheduled':
        return AlertType.VOTING_SCHEDULED;
      case 'sponsor_update':
        return AlertType.SPONSOR_UPDATE;
      case 'engagement_milestone':
        return AlertType.ENGAGEMENT_MILESTONE;
      default:
        throw new Error(`Invalid alert type: ${value}`);
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: AlertType): boolean {
    return this.value === other.value;
  }

  getDefaultPriority(): Priority {
    switch (this.value) {
      case 'voting_scheduled':
        return Priority.HIGH;
      case 'bill_status_change':
      case 'amendment':
      case 'sponsor_update':
        return Priority.NORMAL;
      case 'new_comment':
      case 'engagement_milestone':
        return Priority.LOW;
      default:
        return Priority.NORMAL;
    }
  }
}

// Import Priority here to avoid circular dependency
import { Priority } from './priority';








































