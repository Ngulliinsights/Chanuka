/**
 * Comment Ranking Domain Service
 * 
 * Implements various ranking algorithms for comment display order.
 * Supports: best, hot, new, controversial, top
 */

import { EngagementScore } from '../value-objects/engagement-score';
import { TrendingScore, TrendingTimeframe } from '../value-objects/trending-score';

export interface RankableComment {
  id: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export type RankingAlgorithm = 'best' | 'hot' | 'new' | 'controversial' | 'top';

export interface RankedComment extends RankableComment {
  rank: number;
  score: number;
}

export class CommentRankingService {
  /**
   * Rank comments using specified algorithm
   */
  rankComments(
    comments: RankableComment[],
    algorithm: RankingAlgorithm = 'best',
    timeframe: TrendingTimeframe = '24h',
  ): RankedComment[] {
    const scored = comments.map((comment) => ({
      ...comment,
      score: this.calculateScore(comment, algorithm, timeframe),
      rank: 0,
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Assign ranks
    scored.forEach((comment, index) => {
      comment.rank = index + 1;
    });

    return scored;
  }

  /**
   * Calculate score based on algorithm
   */
  private calculateScore(
    comment: RankableComment,
    algorithm: RankingAlgorithm,
    timeframe: TrendingTimeframe,
  ): number {
    switch (algorithm) {
      case 'best':
        return this.bestScore(comment);
      case 'hot':
        return this.hotScore(comment, timeframe);
      case 'new':
        return this.newScore(comment);
      case 'controversial':
        return this.controversialScore(comment);
      case 'top':
        return this.topScore(comment);
      default:
        return this.bestScore(comment);
    }
  }

  /**
   * Best: Wilson score (quality ranking)
   */
  private bestScore(comment: RankableComment): number {
    const engagement = EngagementScore.calculate(comment.upvotes, comment.downvotes);
    return engagement.value;
  }

  /**
   * Hot: Time-weighted engagement (trending)
   */
  private hotScore(comment: RankableComment, timeframe: TrendingTimeframe): number {
    const trending = TrendingScore.calculate(
      comment.upvotes,
      comment.downvotes,
      comment.updatedAt,
      timeframe,
    );
    return trending.value;
  }

  /**
   * New: Chronological order
   */
  private newScore(comment: RankableComment): number {
    return comment.createdAt.getTime();
  }

  /**
   * Controversial: High engagement with mixed votes
   */
  private controversialScore(comment: RankableComment): number {
    const total = comment.upvotes + comment.downvotes;
    if (total === 0) return 0;

    // Controversy is high when votes are evenly split
    const ratio = Math.min(comment.upvotes, comment.downvotes) / Math.max(comment.upvotes, comment.downvotes);
    
    // Multiply by total engagement
    return ratio * total;
  }

  /**
   * Top: Simple net votes
   */
  private topScore(comment: RankableComment): number {
    return comment.upvotes - comment.downvotes;
  }

  /**
   * Get top N comments
   */
  getTopComments(
    comments: RankableComment[],
    limit: number,
    algorithm: RankingAlgorithm = 'best',
    timeframe: TrendingTimeframe = '24h',
  ): RankedComment[] {
    const ranked = this.rankComments(comments, algorithm, timeframe);
    return ranked.slice(0, limit);
  }

  /**
   * Filter comments by minimum score threshold
   */
  filterByMinimumScore(
    comments: RankableComment[],
    minimumScore: number,
    algorithm: RankingAlgorithm = 'best',
  ): RankableComment[] {
    return comments.filter((comment) => {
      const score = this.calculateScore(comment, algorithm, '24h');
      return score >= minimumScore;
    });
  }
}
