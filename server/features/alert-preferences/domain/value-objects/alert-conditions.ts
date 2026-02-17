/**
 * Alert Conditions Value Object
 * Defines the conditions under which an alert should be triggered
 */
export class AlertConditions {
  constructor(
    public readonly billCategories?: string[],
    public readonly billStatuses?: string[],
    public readonly sponsor_ids?: number[],
    public readonly keywords?: string[],
    public readonly minimumEngagement?: number,
    public readonly user_roles?: string[],
    public readonly timeRange?: TimeRange,
    public readonly dayOfWeek?: number[]
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.minimumEngagement !== undefined && this.minimumEngagement < 0) {
      throw new Error('Minimum engagement must be non-negative');
    }

    if (this.dayOfWeek) {
      for (const day of this.dayOfWeek) {
        if (day < 0 || day > 6) {
          throw new Error('Day of week must be between 0 and 6');
        }
      }
    }

    if (this.timeRange) {
      this.validateTimeRange(this.timeRange);
    }
  }

  private validateTimeRange(timeRange: TimeRange): void {
    if (!this.isValidTime(timeRange.start) || !this.isValidTime(timeRange.end)) {
      throw new Error('Invalid time format in time range');
    }

    const startMinutes = this.parseTime(timeRange.start);
    const endMinutes = this.parseTime(timeRange.end);

    if (startMinutes >= endMinutes) {
      throw new Error('Time range start must be before end');
    }
  }

  private isValidTime(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  matchesBillCategory(category?: string): boolean {
    if (!this.billCategories || this.billCategories.length === 0) {
      return true; // No category filter
    }
    return category ? this.billCategories.includes(category) : false;
  }

  matchesBillStatus(status?: string): boolean {
    if (!this.billStatuses || this.billStatuses.length === 0) {
      return true; // No status filter
    }
    return status ? this.billStatuses.includes(status) : false;
  }

  matchesSponsor(sponsor_id?: number): boolean {
    if (!this.sponsor_ids || this.sponsor_ids.length === 0) {
      return true; // No sponsor filter
    }
    return sponsor_id ? this.sponsor_ids.includes(sponsor_id) : false;
  }

  matchesKeywords(text?: string): boolean {
    if (!this.keywords || this.keywords.length === 0) {
      return true; // No keyword filter
    }

    if (!text) {
      return false;
    }

    const lowerText = text.toLowerCase();
    return this.keywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase())
    );
  }

  matchesEngagement(engagementCount?: number): boolean {
    if (this.minimumEngagement === undefined) {
      return true; // No engagement filter
    }
    return engagementCount ? engagementCount >= this.minimumEngagement : false;
  }

  matchesUserRole(user_role?: string): boolean {
    if (!this.user_roles || this.user_roles.length === 0) {
      return true; // No role filter
    }
    return user_role ? this.user_roles.includes(user_role) : false;
  }

  matchesTimeRange(currentTime?: Date): boolean {
    if (!this.timeRange) {
      return true; // No time range filter
    }

    const now = currentTime || new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = this.parseTime(this.timeRange.start);
    const endMinutes = this.parseTime(this.timeRange.end);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  matchesDayOfWeek(currentTime?: Date): boolean {
    if (!this.dayOfWeek || this.dayOfWeek.length === 0) {
      return true; // No day filter
    }

    const now = currentTime || new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    return this.dayOfWeek.includes(currentDay);
  }

  /**
   * Evaluates all conditions against the provided alert data
   */
  matches(alertData: unknown, user_role?: string, currentTime?: Date): boolean {
    return (
      this.matchesBillCategory(alertData.billCategory) &&
      this.matchesBillStatus(alertData.billStatus) &&
      this.matchesSponsor(alertData.sponsor_id) &&
      this.matchesKeywords(alertData.title || alertData.description || alertData.content) &&
      this.matchesEngagement(alertData.engagementCount) &&
      this.matchesUserRole(user_role) &&
      this.matchesTimeRange(currentTime) &&
      this.matchesDayOfWeek(currentTime)
    );
  }

  equals(other: AlertConditions): boolean {
    return (
      JSON.stringify(this.billCategories) === JSON.stringify(other.billCategories) &&
      JSON.stringify(this.billStatuses) === JSON.stringify(other.billStatuses) &&
      JSON.stringify(this.sponsor_ids) === JSON.stringify(other.sponsor_ids) &&
      JSON.stringify(this.keywords) === JSON.stringify(other.keywords) &&
      this.minimumEngagement === other.minimumEngagement &&
      JSON.stringify(this.user_roles) === JSON.stringify(other.user_roles) &&
      JSON.stringify(this.timeRange) === JSON.stringify(other.timeRange) &&
      JSON.stringify(this.dayOfWeek) === JSON.stringify(other.dayOfWeek)
    );
  }
}

export interface TimeRange {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}








































