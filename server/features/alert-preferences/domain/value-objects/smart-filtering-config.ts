/**
 * Smart Filtering Configuration Value Object
 * Defines the configuration for intelligent alert filtering
 */
export class SmartFilteringConfig {
  constructor(
    public readonly enabled: boolean,
    public readonly user_interestWeight: number,
    public readonly engagementHistoryWeight: number,
    public readonly trendingWeight: number,
    public readonly duplicateFiltering: boolean,
    public readonly spamFiltering: boolean,
    public readonly minimumConfidence: number
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.user_interestWeight < 0 || this.user_interestWeight > 1) {
      throw new Error('User interest weight must be between 0 and 1');
    }

    if (this.engagementHistoryWeight < 0 || this.engagementHistoryWeight > 1) {
      throw new Error('Engagement history weight must be between 0 and 1');
    }

    if (this.trendingWeight < 0 || this.trendingWeight > 1) {
      throw new Error('Trending weight must be between 0 and 1');
    }

    const totalWeight = this.user_interestWeight + this.engagementHistoryWeight + this.trendingWeight;
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error('Weights must sum to 1.0');
    }

    if (this.minimumConfidence < 0 || this.minimumConfidence > 1) {
      throw new Error('Minimum confidence must be between 0 and 1');
    }
  }

  calculateConfidence(
    user_interestScore: number,
    engagement_score: number,
    trendingScore: number
  ): number {
    if (!this.enabled) {
      return 1.0; // No filtering, always send
    }

    const confidence =
      user_interestScore * this.user_interestWeight +
      engagement_score * this.engagementHistoryWeight +
      trendingScore * this.trendingWeight;

    return Math.max(0, Math.min(1, confidence)); // Clamp to [0, 1]
  }

  shouldSendAlert(confidence: number): boolean {
    return confidence >= this.minimumConfidence;
  }

  equals(other: SmartFilteringConfig): boolean {
    return (
      this.enabled === other.enabled &&
      this.user_interestWeight === other.user_interestWeight &&
      this.engagementHistoryWeight === other.engagementHistoryWeight &&
      this.trendingWeight === other.trendingWeight &&
      this.duplicateFiltering === other.duplicateFiltering &&
      this.spamFiltering === other.spamFiltering &&
      this.minimumConfidence === other.minimumConfidence
    );
  }
}





































