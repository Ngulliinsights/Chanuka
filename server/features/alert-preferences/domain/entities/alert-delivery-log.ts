import { AlertType } from '../value-objects/alert-type';
import { Priority } from '../value-objects/priority';
import { ChannelType } from '../value-objects/channel-type';

/**
 * Alert Delivery Log Entity
 * Records the delivery attempts and results for alerts
 */
export class AlertDeliveryLog { constructor(
    public readonly id: string,
    public readonly user_id: string,
    public readonly preferenceId: string,
    public readonly alertType: AlertType,
    public readonly channels: ChannelType[],
    public readonly status: DeliveryStatus,
    public readonly deliveryAttempts: number,
    public readonly lastAttempt: Date,
    public readonly metadata: DeliveryMetadata,
    public readonly created_at: Date,
    public readonly deliveredAt?: Date,
    public readonly failureReason?: string
  ) {
    this.validate();
   }

  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Delivery log ID is required');
    }

    if (!this.user_id || this.user_id.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!this.preferenceId || this.preferenceId.trim().length === 0) {
      throw new Error('Preference ID is required');
    }

    if (this.deliveryAttempts < 0) {
      throw new Error('Delivery attempts cannot be negative');
    }

    if (this.deliveredAt && this.deliveredAt > new Date()) {
      throw new Error('Delivered date cannot be in the future');
    }

    if (this.created_at > new Date()) {
      throw new Error('Created date cannot be in the future');
    }
  }

  /**
   * Checks if the delivery was successful
   */
  isSuccessful(): boolean {
    return this.status === DeliveryStatus.SENT || this.status === DeliveryStatus.DELIVERED;
  }

  /**
   * Checks if the delivery failed
   */
  isFailed(): boolean {
    return this.status === DeliveryStatus.FAILED;
  }

  /**
   * Checks if the alert was filtered out
   */
  isFiltered(): boolean {
    return this.status === DeliveryStatus.FILTERED;
  }

  /**
   * Checks if the delivery is still pending
   */
  isPending(): boolean {
    return this.status === DeliveryStatus.PENDING;
  }

  /**
   * Records a delivery attempt
   */
  recordAttempt(success: boolean, failureReason?: string): AlertDeliveryLog {
    const newAttempts = this.deliveryAttempts + 1;
    const newStatus = success ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
    const deliveredAt = success ? new Date() : undefined;

    return new AlertDeliveryLog(
      this.id,
      this.user_id,
      this.preferenceId,
      this.alertType,
      this.channels,
      newStatus,
      newAttempts,
      new Date(),
      this.metadata,
      this.created_at,
      deliveredAt,
      failureReason || this.failureReason
    );
  }

  /**
   * Marks the delivery as filtered
   */
  markAsFiltered(reason: string): AlertDeliveryLog {
    return new AlertDeliveryLog(
      this.id,
      this.user_id,
      this.preferenceId,
      this.alertType,
      this.channels,
      DeliveryStatus.FILTERED,
      this.deliveryAttempts,
      this.lastAttempt,
      {
        ...this.metadata,
        filteredReason: reason
      },
      this.created_at,
      undefined,
      undefined
    );
  }

  /**
   * Gets the channels that were attempted
   */
  getAttemptedChannels(): ChannelType[] {
    return this.channels;
  }

  /**
   * Checks if a specific channel was attempted
   */
  wasChannelAttempted(channelType: ChannelType): boolean {
    return this.channels.some(ch => ch.equals(channelType));
  }

  /**
   * Gets the original priority of the alert
   */
  getOriginalPriority(): Priority {
    return Priority.fromString(this.metadata.originalPriority);
  }

  /**
   * Gets the adjusted priority if any
   */
  getAdjustedPriority(): Priority | undefined {
    return this.metadata.adjustedPriority
      ? Priority.fromString(this.metadata.adjustedPriority)
      : undefined;
  }

  /**
   * Gets the confidence score if available
   */
  getConfidence(): number | undefined {
    return this.metadata.confidence;
  }

  /**
   * Checks if this log equals another
   */
  equals(other: AlertDeliveryLog): boolean {
    return (
      this.id === other.id &&
      this.user_id === other.user_id &&
      this.preferenceId === other.preferenceId &&
      this.alertType.equals(other.alertType) &&
      this.channelsEqual(other.channels) &&
      this.status === other.status &&
      this.deliveryAttempts === other.deliveryAttempts &&
      this.failureReason === other.failureReason &&
      JSON.stringify(this.metadata) === JSON.stringify(other.metadata)
    );
  }

  private channelsEqual(other: ChannelType[]): boolean {
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

/**
 * Delivery Status Enum
 */
export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  FILTERED = 'filtered'
}

/**
 * Delivery Metadata Interface
 */
export interface DeliveryMetadata { bill_id?: number;
  sponsor_id?: number;
  originalPriority: string;
  adjustedPriority?: string;
  filteredReason?: string;
  confidence?: number;
 }





































