/**
 * Frequency Configuration Value Object
 * Defines how alerts should be delivered (immediate or batched)
 */
export class FrequencyConfig {
  constructor(
    public readonly type: 'immediate' | 'batched',
    public readonly batchInterval?: 'hourly' | 'daily' | 'weekly',
    public readonly batchTime?: string,
    public readonly batchDay?: number
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.type === 'batched') {
      if (!this.batchInterval) {
        throw new Error('Batched frequency requires batchInterval');
      }

      if (this.batchTime && !this.isValidTime(this.batchTime)) {
        throw new Error('Invalid batch time format');
      }

      if (this.batchDay !== undefined && (this.batchDay < 0 || this.batchDay > 6)) {
        throw new Error('Batch day must be between 0 and 6');
      }
    }
  }

  private isValidTime(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  isImmediate(): boolean {
    return this.type === 'immediate';
  }

  isBatched(): boolean {
    return this.type === 'batched';
  }

  shouldBatchUrgentAlerts(): boolean {
    return false; // Urgent alerts are never batched
  }

  getBatchSchedule(): { interval: string; time?: string; day?: number } | null {
    if (!this.isBatched()) {
      return null;
    }

    return {
      interval: this.batchInterval!,
      time: this.batchTime,
      day: this.batchDay
    };
  }

  equals(other: FrequencyConfig): boolean {
    return (
      this.type === other.type &&
      this.batchInterval === other.batchInterval &&
      this.batchTime === other.batchTime &&
      this.batchDay === other.batchDay
    );
  }
}