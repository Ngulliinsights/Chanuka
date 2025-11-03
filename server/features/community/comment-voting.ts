import { databaseService } from '../../infrastructure/database/database-service.js';
import { database as db } from '../../../shared/database/connection';
import { comments, User, comment_votes } from '../../../shared/schema';

// Alias for backward compatibility
const comments = comments;
const comment_votess = comment_votes;
import { eq, and, sql, desc } from 'drizzle-orm';
import { cacheService } from '@server/infrastructure/cache';
import { cacheKeys } from '../../../shared/core/src/caching/key-generator';
import { logger  } from '../../../shared/core/src/index.js';
import { CACHE_TTL_SHORT } from '../../../shared/core/src/primitives/constants/time.js';

export interface VoteResult {
  success: boolean;
  newUpvotes: number;
  newDownvotes: number;
  netVotes: number;
  userVote: 'up' | 'down' | null;
}

export interface CommentEngagementStats {
  comment_id: number;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  engagement_score: number;
  popularityRank: number;
}

/**
 * Comment Voting and Engagement Service
 * Handles upvotes, downvotes, and engagement analytics
 */
export class CommentVotingService { private readonly VOTE_CACHE_TTL = CACHE_TTL_SHORT;

  /**
   * Vote on a comment (upvote or downvote)
   */
  async voteOnComment(comment_id: number, user_id: string, vote_type: 'up' | 'down'): Promise<VoteResult> {
    const result = await databaseService.withFallback(
      async () => {
        // Check if comment exists
        const [comment] = await db
          .select()
          .from(comments)
          .where(eq(comments.id, comment_id))
          .limit(1);

        if (!comment) {
          throw new Error('Comment not found');
         }

        // Check if user has already voted on this comment
        const [existingVote] = await db
          .select()
          .from(comment_votess)
          .where(and(
            eq(comment_votess.comment_id, comment_id),
            eq(comment_votess.user_id, user_id)
          ))
          .limit(1);

        let upvoteChange = 0;
        let downvoteChange = 0;
        let finalVoteType: 'up' | 'down' | null = vote_type;

        if (existingVote) {
          // User has already voted
          if (existingVote.vote_type === vote_type) {
            // Same vote type - remove the vote (toggle off)
            await db
              .delete(comment_votess)
              .where(eq(comment_votess.id, existingVote.id));

            if (vote_type === 'up') {
              upvoteChange = -1;
            } else {
              downvoteChange = -1;
            }
            finalVoteType = null;
          } else {
            // Different vote type - change the vote
            await db
              .update(comment_votess)
              .set({
                vote_type,
                updated_at: new Date()
              })
              .where(eq(comment_votess.id, existingVote.id));

            if (vote_type === 'up') {
              upvoteChange = 1;
              downvoteChange = -1;
            } else {
              upvoteChange = -1;
              downvoteChange = 1;
            }
          }
        } else { // New vote
          await db
            .insert(comment_votess)
            .values({
              comment_id,
              user_id,
              vote_type
             });

          if (vote_type === 'up') {
            upvoteChange = 1;
          } else {
            downvoteChange = 1;
          }
        }

        // Update comment vote counts in database
        const [updatedComment] = await db
          .update(comments)
          .set({
            upvotes: sql`${comments.upvotes} + ${upvoteChange}`,
            downvotes: sql`${comments.downvotes} + ${downvoteChange}`,
            updated_at: new Date()
          })
          .where(eq(comments.id, comment_id))
          .returning();

        // Clear related caches
        await this.clearVotingCaches(comment_id, comment.bill_id);

        return {
          success: true,
          newUpvotes: updatedComment.upvotes,
          newDownvotes: updatedComment.downvotes,
          netVotes: updatedComment.upvotes - updatedComment.downvotes,
          userVote: finalVoteType
        };
      },
      {
        success: false,
        newUpvotes: 0,
        newDownvotes: 0,
        netVotes: 0,
        userVote: null
      },
      `voteOnComment:${comment_id}:${ user_id }`
    );
    return result.data;
  }

  /**
   * Get user's vote on a specific comment
   */
  async getUserVote(comment_id: number, user_id: string): Promise<'up' | 'down' | null> {
    const result = await databaseService.withFallback(
      async () => {
        const [vote] = await db
          .select({ vote_type: comment_votess.vote_type })
          .from(comment_votess)
          .where(and(
            eq(comment_votess.comment_id, comment_id),
            eq(comment_votess.user_id, user_id)
          ))
          .limit(1);

        return vote ? vote.vote_type as 'up' | 'down' : null;
      },
      null,
      `getUserVote:${comment_id}:${ user_id }`
    );
    return result.data;
  }

  /**
   * Get voting statistics for multiple comments
   */
  async getCommentVotingStats(comment_ids: number[]): Promise<Map<number, CommentEngagementStats>> {
    const result = await databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.COMMENT_VOTES}:stats:${comment_ids.join(',')}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return new Map(cached);
        }

        const comments = await db
          .select({
            id: comments.id,
            upvotes: comments.upvotes,
            downvotes: comments.downvotes
          })
          .from(comments)
          .where(sql`${comments.id} = ANY(${comment_ids})`);

        const statsMap = new Map<number, CommentEngagementStats>();

        comments.forEach((comment, index) => {
          const netVotes = comment.upvotes - comment.downvotes;
          const totalVotes = comment.upvotes + comment.downvotes;

          // Calculate engagement score (weighted by recency and vote ratio)
          const engagement_score = this.calculateEngagementScore(
            comment.upvotes,
            comment.downvotes,
            totalVotes
          );

          statsMap.set(comment.id, {
            comment_id: comment.id,
            upvotes: comment.upvotes,
            downvotes: comment.downvotes,
            netVotes,
            engagement_score,
            popularityRank: index + 1 // This would be calculated based on sorting
          });
        });

        // Cache the results
        await cacheService.set(cacheKey, Array.from(statsMap.entries()), this.VOTE_CACHE_TTL);

        return statsMap;
      },
      new Map(),
      `getCommentVotingStats:${comment_ids.join(',')}`
    );
    return result.data;
  }

  /**
   * Get trending comments based on voting patterns
   */
  async getTrendingComments(bill_id: number, timeframe: '1h' | '24h' | '7d' = '24h', limit: number = 10): Promise<{
    comment_id: number;
    netVotes: number;
    engagement_score: number;
    trendingScore: number;
  }[]> {
    const result = await databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.COMMENT_VOTES}:trending:${ bill_id }:${timeframe}:${limit}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

        // Calculate time threshold
        const timeThreshold = new Date();
        switch (timeframe) {
          case '1h':
            timeThreshold.setHours(timeThreshold.getHours() - 1);
            break;
          case '24h':
            timeThreshold.setDate(timeThreshold.getDate() - 1);
            break;
          case '7d':
            timeThreshold.setDate(timeThreshold.getDate() - 7);
            break;
        }

        const comments = await db
          .select({
            id: comments.id,
            upvotes: comments.upvotes,
            downvotes: comments.downvotes,
            created_at: comments.created_at,
            updated_at: comments.updated_at
          })
          .from(comments)
          .where(and(
            eq(comments.bill_id, bill_id),
            sql`${comments.updated_at} >= ${timeThreshold}`
          ))
          .orderBy(sql`${comments.upvotes} - ${comments.downvotes} DESC`)
          .limit(limit);

        const trendingComments = comments.map(comment => {
          const netVotes = comment.upvotes - comment.downvotes;
          const totalVotes = comment.upvotes + comment.downvotes;
          const engagement_score = this.calculateEngagementScore(
            comment.upvotes,
            comment.downvotes,
            totalVotes
          );

          // Calculate trending score based on recency and engagement
          const ageInHours = (Date.now() - comment.updated_at.getTime()) / (1000 * 60 * 60);
          const recencyMultiplier = Math.max(0.1, 1 - (ageInHours / 24)); // Decay over 24 hours
          const trendingScore = engagement_score * recencyMultiplier;

          return {
            comment_id: comment.id,
            netVotes,
            engagement_score,
            trendingScore
          };
        }).sort((a, b) => b.trendingScore - a.trendingScore);

        await cacheService.set(cacheKey, trendingComments, this.VOTE_CACHE_TTL);
        return trendingComments;
      },
      [],
      `getTrendingComments:${ bill_id }:${timeframe}`
    );
    return result.data;
  }

  /**
   * Get user's voting history for comments
   */
  async getUserVotingHistory(user_id: string, limit: number = 50): Promise<{ comment_id: number;
    vote_type: 'up' | 'down';
    votedAt: Date;
    bill_id: number;
    billTitle: string;
   }[]> { const result = await databaseService.withFallback(
      async () => {
        // Get user's votes from database with comment and bill information
        const userVotes = await db
          .select({
            comment_id: comment_votess.comment_id,
            vote_type: comment_votess.vote_type,
            votedAt: comment_votess.updated_at,
            bill_id: comments.bill_id,
            billTitle: sql<string>`(SELECT title FROM bills WHERE id = ${comments.bill_id })`
          })
          .from(comment_votess)
          .innerJoin(comments, eq(comment_votess.comment_id, comments.id))
          .where(eq(comment_votess.user_id, user_id))
          .orderBy(desc(comment_votess.updated_at))
          .limit(limit);

        return userVotes.map(vote => ({ comment_id: vote.comment_id,
          vote_type: vote.vote_type as 'up' | 'down',
          votedAt: vote.votedAt,
          bill_id: vote.bill_id,
          billTitle: vote.billTitle || 'Unknown Bill'
         }));
      },
      [],
      `getUserVotingHistory:${ user_id }`
    );
    return result.data;
  }

  /**
   * Calculate engagement score for a comment
   */
  private calculateEngagementScore(upvotes: number, downvotes: number, totalVotes: number): number {
    if (totalVotes === 0) return 0;

    const netVotes = upvotes - downvotes;
    const voteRatio = upvotes / totalVotes;
    
    // Wilson score confidence interval for better ranking
    const z = 1.96; // 95% confidence
    const phat = voteRatio;
    const n = totalVotes;
    
    if (n === 0) return 0;
    
    const wilson = (phat + z * z / (2 * n) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)) / (1 + z * z / n);
    
    // Combine Wilson score with absolute vote count
    const engagement_score = wilson * Math.log(totalVotes + 1) + netVotes * 0.1;
    
    return Math.max(0, engagement_score);
  }

  /**
   * Clear voting-related caches
   */
  private async clearVotingCaches(comment_id: number, bill_id: number): Promise<void> {
    const patterns = [
      `${CACHE_KEYS.COMMENT_VOTES}:stats:*`,
      `${CACHE_KEYS.COMMENT_VOTES}:trending:${ bill_id }:*`,
      `${CACHE_KEYS.BILL_COMMENTS}:${ bill_id }:*`
    ];

    for (const pattern of patterns) {
      await cacheService.deletePattern(pattern);
    }
  }

  /**
   * Get vote summary for a bill's comments
   */
  async getBillCommentVoteSummary(bill_id: number): Promise<{
    totalVotes: number;
    totalUpvotes: number;
    totalDownvotes: number;
    averageEngagement: number;
    mostUpvotedCommentId: number | null;
    mostControversialCommentId: number | null;
  }> {
    const result = await databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.COMMENT_VOTES}:summary:${ bill_id }`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

        const [summary] = await db
          .select({
            totalUpvotes: sql<number>`SUM(${comments.upvotes})`,
            totalDownvotes: sql<number>`SUM(${comments.downvotes})`,
            comment_count: sql<number>`COUNT(*)`,
            maxUpvotes: sql<number>`MAX(${comments.upvotes})`,
            maxControversy: sql<number>`MAX(${comments.upvotes} + ${comments.downvotes})`
          })
          .from(comments)
          .where(eq(comments.bill_id, bill_id));

        // Get most upvoted comment
        const [mostUpvoted] = await db
          .select({ id: comments.id })
          .from(comments)
          .where(and(
            eq(comments.bill_id, bill_id),
            eq(comments.upvotes, summary.maxUpvotes)
          ))
          .limit(1);

        // Get most controversial comment (highest total votes)
        const [mostControversial] = await db
          .select({
            id: comments.id,
            totalVotes: sql<number>`${comments.upvotes} + ${comments.downvotes}`
          })
          .from(comments)
          .where(eq(comments.bill_id, bill_id))
          .orderBy(sql`${comments.upvotes} + ${comments.downvotes} DESC`)
          .limit(1);

        const summaryResult = {
          totalVotes: Number(summary.totalUpvotes) + Number(summary.totalDownvotes),
          totalUpvotes: Number(summary.totalUpvotes),
          totalDownvotes: Number(summary.totalDownvotes),
          averageEngagement: Number(summary.comment_count) > 0 ?
            (Number(summary.totalUpvotes) + Number(summary.totalDownvotes)) / Number(summary.comment_count) : 0,
          mostUpvotedCommentId: mostUpvoted?.id || null,
          mostControversialCommentId: mostControversial?.id || null
        };

        await cacheService.set(cacheKey, summaryResult, this.VOTE_CACHE_TTL);
        return summaryResult;
      },
      {
        totalVotes: 0,
        totalUpvotes: 0,
        totalDownvotes: 0,
        averageEngagement: 0,
        mostUpvotedCommentId: null,
        mostControversialCommentId: null
      },
      `getBillCommentVoteSummary:${ bill_id }`
    );
    return result.data;
  }
}

export const commentVotingService = new CommentVotingService();














































