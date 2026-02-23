/**
 * Engagement Score Value Object
 * 
 * Calculates and represents comment engagement using Wilson score confidence interval.
 * Provides fair ranking that accounts for both vote count and vote ratio.
 */

export class EngagementScore {
  private readonly score: number;

  private constructor(
    private readonly upvotes: number,
    private readonly downvotes: number,
  ) {
    this.score = this.calculateWilsonScore();
  }

  static calculate(upvotes: number, downvotes: number): EngagementScore {
    if (upvotes < 0 || downvotes < 0) {
      throw new Error('Vote counts cannot be negative');
    }
    return new EngagementScore(upvotes, downvotes);
  }

  /**
   * Wilson score lower bound for 95% confidence interval
   * 
   * This algorithm is used by Reddit and provides better ranking than simple
   * upvote/downvote ratio, especially for comments with few votes.
   * 
   * @see https://www.evanmiller.org/how-not-to-sort-by-average-rating.html
   */
  private calculateWilsonScore(): number {
    const totalVotes = this.upvotes + this.downvotes;
    
    if (totalVotes === 0) {
      return 0;
    }

    const positiveRatio = this.upvotes / totalVotes;
    const z = 1.96; // 95% confidence
    const n = totalVotes;

    const wilson =
      (positiveRatio + (z * z) / (2 * n) -
        z * Math.sqrt((positiveRatio * (1 - positiveRatio) + (z * z) / (4 * n)) / n)) /
      (1 + (z * z) / n);

    // Blend Wilson score with logarithmic vote weight
    // This gives some advantage to comments with more total engagement
    return Math.max(0, wilson * Math.log(totalVotes + 1) + this.netVotes * 0.1);
  }

  get value(): number {
    return this.score;
  }

  get netVotes(): number {
    return this.upvotes - this.downvotes;
  }

  get totalVotes(): number {
    return this.upvotes + this.downvotes;
  }

  get upvoteRatio(): number {
    const total = this.totalVotes;
    return total === 0 ? 0 : this.upvotes / total;
  }

  isMoreEngagedThan(other: EngagementScore): boolean {
    return this.score > other.value;
  }

  toString(): string {
    return `EngagementScore(${this.score.toFixed(4)}, ↑${this.upvotes} ↓${this.downvotes})`;
  }
}
