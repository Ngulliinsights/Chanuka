/**
 * Trending Score Value Object
 * 
 * Calculates time-weighted engagement score for trending comments.
 * Recent activity is weighted more heavily than older activity.
 */

import { EngagementScore } from './engagement-score';

export type TrendingTimeframe = '1h' | '24h' | '7d';

export class TrendingScore {
  private readonly score: number;

  private constructor(
    private readonly engagementScore: EngagementScore,
    private readonly lastActivityAt: Date,
    private readonly timeframe: TrendingTimeframe,
  ) {
    this.score = this.calculateTrendingScore();
  }

  static calculate(
    upvotes: number,
    downvotes: number,
    lastActivityAt: Date,
    timeframe: TrendingTimeframe = '24h',
  ): TrendingScore {
    const engagement = EngagementScore.calculate(upvotes, downvotes);
    return new TrendingScore(engagement, lastActivityAt, timeframe);
  }

  private calculateTrendingScore(): number {
    const ageInHours = this.getAgeInHours();
    const maxAge = this.getMaxAgeForTimeframe();
    
    // Recency multiplier: 1.0 for brand new, decays to 0.1 over timeframe
    const recencyMultiplier = Math.max(0.1, 1 - ageInHours / maxAge);
    
    // Combine engagement score with recency
    return this.engagementScore.value * recencyMultiplier;
  }

  private getAgeInHours(): number {
    const now = Date.now();
    const activityTime = this.lastActivityAt.getTime();
    return (now - activityTime) / (1000 * 60 * 60);
  }

  private getMaxAgeForTimeframe(): number {
    switch (this.timeframe) {
      case '1h':
        return 1;
      case '24h':
        return 24;
      case '7d':
        return 168; // 7 * 24
      default:
        return 24;
    }
  }

  get value(): number {
    return this.score;
  }

  get engagement(): EngagementScore {
    return this.engagementScore;
  }

  get ageInHours(): number {
    return this.getAgeInHours();
  }

  isMoreTrendingThan(other: TrendingScore): boolean {
    return this.score > other.value;
  }

  isWithinTimeframe(): boolean {
    return this.getAgeInHours() <= this.getMaxAgeForTimeframe();
  }

  toString(): string {
    return `TrendingScore(${this.score.toFixed(4)}, age: ${this.ageInHours.toFixed(1)}h)`;
  }
}
