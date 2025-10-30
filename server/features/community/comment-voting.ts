import { databaseService } from '../../infrastructure/database/database-service.js';
import { database as db } from '../../../shared/database/connection';
import { billComment, User, commentVote } from '../../../shared/schema';

// Alias for backward compatibility
const billComments = billComment;
const commentVotes = commentVote;
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
  commentId: number;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  engagementScore: number;
  popularityRank: number;
}

/**
 * Comment Voting and Engagement Service
 * Handles upvotes, downvotes, and engagement analytics
 */
export class CommentVotingService {
  private readonly VOTE_CACHE_TTL = CACHE_TTL_SHORT;

  /**
   * Vote on a comment (upvote or downvote)
   */
  async voteOnComment(commentId: number, userId: string, voteType: 'up' | 'down'): Promise<VoteResult> {
    const result = await databaseService.withFallback(
      async () => {
        // Check if comment exists
        const [comment] = await db
          .select()
          .from(billComments)
          .where(eq(billComments.id, commentId))
          .limit(1);

        if (!comment) {
          throw new Error('Comment not found');
        }

        // Check if user has already voted on this comment
        const [existingVote] = await db
          .select()
          .from(commentVotes)
          .where(and(
            eq(commentVotes.commentId, commentId),
            eq(commentVotes.userId, userId)
          ))
          .limit(1);

        let upvoteChange = 0;
        let downvoteChange = 0;
        let finalVoteType: 'up' | 'down' | null = voteType;

        if (existingVote) {
          // User has already voted
          if (existingVote.voteType === voteType) {
            // Same vote type - remove the vote (toggle off)
            await db
              .delete(commentVotes)
              .where(eq(commentVotes.id, existingVote.id));

            if (voteType === 'up') {
              upvoteChange = -1;
            } else {
              downvoteChange = -1;
            }
            finalVoteType = null;
          } else {
            // Different vote type - change the vote
            await db
              .update(commentVotes)
              .set({
                voteType,
                updatedAt: new Date()
              })
              .where(eq(commentVotes.id, existingVote.id));

            if (voteType === 'up') {
              upvoteChange = 1;
              downvoteChange = -1;
            } else {
              upvoteChange = -1;
              downvoteChange = 1;
            }
          }
        } else {
          // New vote
          await db
            .insert(commentVotes)
            .values({
              commentId,
              userId,
              voteType
            });

          if (voteType === 'up') {
            upvoteChange = 1;
          } else {
            downvoteChange = 1;
          }
        }

        // Update comment vote counts in database
        const [updatedComment] = await db
          .update(billComments)
          .set({
            upvotes: sql`${billComments.upvotes} + ${upvoteChange}`,
            downvotes: sql`${billComments.downvotes} + ${downvoteChange}`,
            updatedAt: new Date()
          })
          .where(eq(billComments.id, commentId))
          .returning();

        // Clear related caches
        await this.clearVotingCaches(commentId, comment.billId);

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
      `voteOnComment:${commentId}:${userId}`
    );
    return result.data;
  }

  /**
   * Get user's vote on a specific comment
   */
  async getUserVote(commentId: number, userId: string): Promise<'up' | 'down' | null> {
    const result = await databaseService.withFallback(
      async () => {
        const [vote] = await db
          .select({ voteType: commentVotes.voteType })
          .from(commentVotes)
          .where(and(
            eq(commentVotes.commentId, commentId),
            eq(commentVotes.userId, userId)
          ))
          .limit(1);

        return vote ? vote.voteType as 'up' | 'down' : null;
      },
      null,
      `getUserVote:${commentId}:${userId}`
    );
    return result.data;
  }

  /**
   * Get voting statistics for multiple comments
   */
  async getCommentVotingStats(commentIds: number[]): Promise<Map<number, CommentEngagementStats>> {
    const result = await databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.COMMENT_VOTES}:stats:${commentIds.join(',')}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return new Map(cached);
        }

        const comments = await db
          .select({
            id: billComments.id,
            upvotes: billComments.upvotes,
            downvotes: billComments.downvotes
          })
          .from(billComments)
          .where(sql`${billComments.id} = ANY(${commentIds})`);

        const statsMap = new Map<number, CommentEngagementStats>();

        comments.forEach((comment, index) => {
          const netVotes = comment.upvotes - comment.downvotes;
          const totalVotes = comment.upvotes + comment.downvotes;

          // Calculate engagement score (weighted by recency and vote ratio)
          const engagementScore = this.calculateEngagementScore(
            comment.upvotes,
            comment.downvotes,
            totalVotes
          );

          statsMap.set(comment.id, {
            commentId: comment.id,
            upvotes: comment.upvotes,
            downvotes: comment.downvotes,
            netVotes,
            engagementScore,
            popularityRank: index + 1 // This would be calculated based on sorting
          });
        });

        // Cache the results
        await cacheService.set(cacheKey, Array.from(statsMap.entries()), this.VOTE_CACHE_TTL);

        return statsMap;
      },
      new Map(),
      `getCommentVotingStats:${commentIds.join(',')}`
    );
    return result.data;
  }

  /**
   * Get trending comments based on voting patterns
   */
  async getTrendingComments(billId: number, timeframe: '1h' | '24h' | '7d' = '24h', limit: number = 10): Promise<{
    commentId: number;
    netVotes: number;
    engagementScore: number;
    trendingScore: number;
  }[]> {
    const result = await databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.COMMENT_VOTES}:trending:${billId}:${timeframe}:${limit}`;
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
            id: billComments.id,
            upvotes: billComments.upvotes,
            downvotes: billComments.downvotes,
            createdAt: billComments.createdAt,
            updatedAt: billComments.updatedAt
          })
          .from(billComments)
          .where(and(
            eq(billComments.billId, billId),
            sql`${billComments.updatedAt} >= ${timeThreshold}`
          ))
          .orderBy(sql`${billComments.upvotes} - ${billComments.downvotes} DESC`)
          .limit(limit);

        const trendingComments = comments.map(comment => {
          const netVotes = comment.upvotes - comment.downvotes;
          const totalVotes = comment.upvotes + comment.downvotes;
          const engagementScore = this.calculateEngagementScore(
            comment.upvotes,
            comment.downvotes,
            totalVotes
          );

          // Calculate trending score based on recency and engagement
          const ageInHours = (Date.now() - comment.updatedAt.getTime()) / (1000 * 60 * 60);
          const recencyMultiplier = Math.max(0.1, 1 - (ageInHours / 24)); // Decay over 24 hours
          const trendingScore = engagementScore * recencyMultiplier;

          return {
            commentId: comment.id,
            netVotes,
            engagementScore,
            trendingScore
          };
        }).sort((a, b) => b.trendingScore - a.trendingScore);

        await cacheService.set(cacheKey, trendingComments, this.VOTE_CACHE_TTL);
        return trendingComments;
      },
      [],
      `getTrendingComments:${billId}:${timeframe}`
    );
    return result.data;
  }

  /**
   * Get user's voting history for comments
   */
  async getUserVotingHistory(userId: string, limit: number = 50): Promise<{
    commentId: number;
    voteType: 'up' | 'down';
    votedAt: Date;
    billId: number;
    billTitle: string;
  }[]> {
    const result = await databaseService.withFallback(
      async () => {
        // Get user's votes from database with comment and bill information
        const userVotes = await db
          .select({
            commentId: commentVotes.commentId,
            voteType: commentVotes.voteType,
            votedAt: commentVotes.updatedAt,
            billId: billComments.billId,
            billTitle: sql<string>`(SELECT title FROM bills WHERE id = ${billComments.billId})`
          })
          .from(commentVotes)
          .innerJoin(billComments, eq(commentVotes.commentId, billComments.id))
          .where(eq(commentVotes.userId, userId))
          .orderBy(desc(commentVotes.updatedAt))
          .limit(limit);

        return userVotes.map(vote => ({
          commentId: vote.commentId,
          voteType: vote.voteType as 'up' | 'down',
          votedAt: vote.votedAt,
          billId: vote.billId,
          billTitle: vote.billTitle || 'Unknown Bill'
        }));
      },
      [],
      `getUserVotingHistory:${userId}`
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
    const engagementScore = wilson * Math.log(totalVotes + 1) + netVotes * 0.1;
    
    return Math.max(0, engagementScore);
  }

  /**
   * Clear voting-related caches
   */
  private async clearVotingCaches(commentId: number, billId: number): Promise<void> {
    const patterns = [
      `${CACHE_KEYS.COMMENT_VOTES}:stats:*`,
      `${CACHE_KEYS.COMMENT_VOTES}:trending:${billId}:*`,
      `${CACHE_KEYS.BILL_COMMENTS}:${billId}:*`
    ];

    for (const pattern of patterns) {
      await cacheService.deletePattern(pattern);
    }
  }

  /**
   * Get vote summary for a bill's comments
   */
  async getBillCommentVoteSummary(billId: number): Promise<{
    totalVotes: number;
    totalUpvotes: number;
    totalDownvotes: number;
    averageEngagement: number;
    mostUpvotedCommentId: number | null;
    mostControversialCommentId: number | null;
  }> {
    const result = await databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.COMMENT_VOTES}:summary:${billId}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

        const [summary] = await db
          .select({
            totalUpvotes: sql<number>`SUM(${billComments.upvotes})`,
            totalDownvotes: sql<number>`SUM(${billComments.downvotes})`,
            commentCount: sql<number>`COUNT(*)`,
            maxUpvotes: sql<number>`MAX(${billComments.upvotes})`,
            maxControversy: sql<number>`MAX(${billComments.upvotes} + ${billComments.downvotes})`
          })
          .from(billComments)
          .where(eq(billComments.billId, billId));

        // Get most upvoted comment
        const [mostUpvoted] = await db
          .select({ id: billComments.id })
          .from(billComments)
          .where(and(
            eq(billComments.billId, billId),
            eq(billComments.upvotes, summary.maxUpvotes)
          ))
          .limit(1);

        // Get most controversial comment (highest total votes)
        const [mostControversial] = await db
          .select({
            id: billComments.id,
            totalVotes: sql<number>`${billComments.upvotes} + ${billComments.downvotes}`
          })
          .from(billComments)
          .where(eq(billComments.billId, billId))
          .orderBy(sql`${billComments.upvotes} + ${billComments.downvotes} DESC`)
          .limit(1);

        const summaryResult = {
          totalVotes: Number(summary.totalUpvotes) + Number(summary.totalDownvotes),
          totalUpvotes: Number(summary.totalUpvotes),
          totalDownvotes: Number(summary.totalDownvotes),
          averageEngagement: Number(summary.commentCount) > 0 ?
            (Number(summary.totalUpvotes) + Number(summary.totalDownvotes)) / Number(summary.commentCount) : 0,
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
      `getBillCommentVoteSummary:${billId}`
    );
    return result.data;
  }
}

export const commentVotingService = new CommentVotingService();














































