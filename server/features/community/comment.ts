import { databaseService } from '../../infrastructure/database/database-service.js';
import { db } from '../../db.js';
import { billComment as billComments, user as users, userProfile as userProfiles, bill as bills } from '../../../shared/schema/schema.js';
import { eq, and, desc, asc, sql, count, isNull, or } from 'drizzle-orm';
import { cacheService, CACHE_TTL, CACHE_KEYS } from '../../infrastructure/cache/cache-service.js';
import { logger } from '../../utils/logger.js';

// Types for comment operations
export interface CommentWithUser {
  id: number;
  billId: number;
  userId: string;
  content: string;
  commentType: string;
  isVerified: boolean;
  parentCommentId: number | null;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    role: string;
    verificationStatus: string;
  };
  userProfile?: {
    expertise: string[] | null;
    organization: string | null;
    reputationScore: number;
  };
  replies?: CommentWithUser[];
  replyCount: number;
  netVotes: number;
}

export interface CreateCommentData {
  billId: number;
  userId: string;
  content: string;
  commentType?: string;
  parentCommentId?: number;
}

export interface UpdateCommentData {
  content?: string;
  commentType?: string;
}

export interface CommentFilters {
  sort?: 'recent' | 'popular' | 'verified' | 'oldest';
  commentType?: string;
  expertOnly?: boolean;
  parentId?: number;
  limit?: number;
  offset?: number;
}

export interface CommentVote {
  commentId: number;
  userId: string;
  voteType: 'up' | 'down';
}

export interface CommentStats {
  totalComments: number;
  expertComments: number;
  verifiedComments: number;
  averageEngagement: number;
  topContributors: Array<{
    userId: string;
    userName: string;
    commentCount: number;
    totalVotes: number;
  }>;
}

/**
 * Comprehensive Comment Service
 * Handles threaded comments, voting, moderation, and expert verification
 */
export class CommentService {
  private readonly COMMENT_CACHE_TTL = CACHE_TTL.MEDIUM;

  /**
   * Get comments for a bill with threading support
   */
  async getBillComments(billId: number, filters: CommentFilters = {}): Promise<{
    comments: CommentWithUser[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const cacheKey = `${CACHE_KEYS.BILL_COMMENTS}:${billId}:${JSON.stringify(filters)}`;

    const result = await databaseService.withFallback(
      async () => {
        // Check cache first
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

        const {
          sort = 'recent',
          commentType,
          expertOnly = false,
          parentId,
          limit = 20,
          offset = 0
        } = filters;

        // Build base query
        let query = db()
          .select({
            comment: billComments,
            user: {
              id: users.id,
              name: users.name,
              role: users.role,
              verificationStatus: users.verificationStatus
            },
            userProfile: {
              expertise: userProfiles.expertise,
              organization: userProfiles.organization,
              reputationScore: userProfiles.reputationScore
            }
          })
          .from(billComments)
          .innerJoin(users, eq(billComments.userId, users.id))
          .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
          .where(eq(billComments.billId, billId));

        // Apply filters
        const conditions = [eq(billComments.billId, billId)];

        if (parentId !== undefined) {
          if (parentId === null) {
            conditions.push(isNull(billComments.parentCommentId));
          } else {
            conditions.push(eq(billComments.parentCommentId, parentId));
          }
        } else {
          // Default to top-level comments only
          conditions.push(isNull(billComments.parentCommentId));
        }

        if (commentType) {
          conditions.push(eq(billComments.commentType, commentType));
        }

        if (expertOnly) {
          conditions.push(sql`${users.role} = 'expert' OR ${billComments.isVerified} = true`);
        }

        query = query.where(and(...conditions));

        // Apply sorting
        switch (sort) {
          case 'popular':
            query = query.orderBy(
              desc(sql`${billComments.upvotes} - ${billComments.downvotes}`),
              desc(billComments.createdAt)
            );
            break;
          case 'verified':
            query = query.orderBy(
              desc(billComments.isVerified),
              desc(sql`${billComments.upvotes} - ${billComments.downvotes}`),
              desc(billComments.createdAt)
            );
            break;
          case 'oldest':
            query = query.orderBy(asc(billComments.createdAt));
            break;
          default: // recent
            query = query.orderBy(desc(billComments.createdAt));
        }

        // Apply pagination
        const results = await query.limit(limit + 1).offset(offset);
        const hasMore = results.length > limit;
        const comments = results.slice(0, limit);

        // Get total count
        const [{ count: totalCount }] = await db()
          .select({ count: count() })
          .from(billComments)
          .where(and(...conditions));

        // Transform results and get reply counts
        const transformedComments: CommentWithUser[] = await Promise.all(
          comments.map(async (row) => {
            const replyCount = await this.getReplyCount(row.comment.id);

            return {
              ...row.comment,
              user: row.user,
              userProfile: row.userProfile,
              replies: [], // Will be populated separately if needed
              replyCount,
              netVotes: row.comment.upvotes - row.comment.downvotes
            };
          })
        );

        // If not filtering by parentId, load replies for top-level comments
        if (parentId === undefined) {
          for (const comment of transformedComments) {
            comment.replies = await this.getCommentReplies(comment.id, { limit: 5 });
          }
        }

        const result = {
          comments: transformedComments,
          totalCount: Number(totalCount),
          hasMore
        };

        // Cache the result
        await cacheService.set(cacheKey, result, this.COMMENT_CACHE_TTL);

        return result;
      },
      {
        comments: this.getSampleComments(billId),
        totalCount: 2,
        hasMore: false
      },
      `getBillComments:${billId}`
    );

    return result.data;
  }

  /**
   * Get replies for a specific comment
   */
  async getCommentReplies(parentCommentId: number, filters: CommentFilters = {}): Promise<CommentWithUser[]> {
    const result = await databaseService.withFallback(
      async () => {
        const { sort = 'recent', limit = 10, offset = 0 } = filters;

        let query = db()
          .select({
            comment: billComments,
            user: {
              id: users.id,
              name: users.name,
              role: users.role,
              verificationStatus: users.verificationStatus
            },
            userProfile: {
              expertise: userProfiles.expertise,
              organization: userProfiles.organization,
              reputationScore: userProfiles.reputationScore
            }
          })
          .from(billComments)
          .innerJoin(users, eq(billComments.userId, users.id))
          .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
          .where(eq(billComments.parentCommentId, parentCommentId));

        // Apply sorting
        switch (sort) {
          case 'popular':
            query = query.orderBy(
              desc(sql`${billComments.upvotes} - ${billComments.downvotes}`),
              asc(billComments.createdAt)
            );
            break;
          default: // recent
            query = query.orderBy(asc(billComments.createdAt));
        }

        const results = await query.limit(limit).offset(offset);

        return Promise.all(
          results.map(async (row) => {
            const replyCount = await this.getReplyCount(row.comment.id);

            return {
              ...row.comment,
              user: row.user,
              userProfile: row.userProfile,
              replies: [], // Nested replies not loaded by default
              replyCount,
              netVotes: row.comment.upvotes - row.comment.downvotes
            };
          })
        );
      },
      [],
      `getCommentReplies:${parentCommentId}`
    );

    return result.data;
  }

  /**
   * Create a new comment
   */
  async createComment(data: CreateCommentData): Promise<CommentWithUser> {
    const result = await databaseService.withFallback(
      async () => {
        // Validate parent comment exists if specified
        if (data.parentCommentId) {
          const parentComment = await db()
            .select()
            .from(billComments)
            .where(eq(billComments.id, data.parentCommentId))
            .limit(1);

          if (parentComment.length === 0) {
            throw new Error('Parent comment not found');
          }

          // Ensure parent comment belongs to the same bill
          if (parentComment[0].billId !== data.billId) {
            throw new Error('Parent comment belongs to different bill');
          }
        }

        // Create the comment
        const [newComment] = await db()
          .insert(billComments)
          .values({
            billId: data.billId,
            userId: data.userId,
            content: data.content,
            commentType: data.commentType || 'general',
            parentCommentId: data.parentCommentId || null,
            upvotes: 0,
            downvotes: 0,
            isVerified: false
          })
          .returning();

        // Get user and profile information
        const [userInfo] = await db()
          .select({
            user: {
              id: users.id,
              name: users.name,
              role: users.role,
              verificationStatus: users.verificationStatus
            },
            userProfile: {
              expertise: userProfiles.expertise,
              organization: userProfiles.organization,
              reputationScore: userProfiles.reputationScore
            }
          })
          .from(users)
          .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
          .where(eq(users.id, data.userId));

        // Clear related caches
        await this.clearCommentCaches(data.billId);

        return {
          ...newComment,
          user: userInfo.user,
          userProfile: userInfo.userProfile,
          replies: [],
          replyCount: 0,
          netVotes: 0
        };
      },
      {
        id: Date.now(),
        billId: data.billId,
        userId: data.userId,
        content: data.content,
        commentType: data.commentType || 'general',
        isVerified: false,
        parentCommentId: data.parentCommentId || null,
        upvotes: 0,
        downvotes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: data.userId,
          name: 'Sample User',
          role: 'citizen',
          verificationStatus: 'pending'
        },
        replies: [],
        replyCount: 0,
        netVotes: 0
      },
      `createComment:${data.billId}`
    );

    return result.data;
  }

  /**
   * Update an existing comment
   */
  async updateComment(commentId: number, userId: string, data: UpdateCommentData): Promise<CommentWithUser> {
    const result = await databaseService.withFallback(
      async () => {
        // Verify comment exists and belongs to user
        const [existingComment] = await db()
          .select()
          .from(billComments)
          .where(and(
            eq(billComments.id, commentId),
            eq(billComments.userId, userId)
          ))
          .limit(1);

        if (!existingComment) {
          throw new Error('Comment not found or access denied');
        }

        // Update the comment
        const [updatedComment] = await db()
          .update(billComments)
          .set({
            ...data,
            updatedAt: new Date()
          })
          .where(eq(billComments.id, commentId))
          .returning();

        // Get user information
        const [userInfo] = await db()
          .select({
            user: {
              id: users.id,
              name: users.name,
              role: users.role,
              verificationStatus: users.verificationStatus
            },
            userProfile: {
              expertise: userProfiles.expertise,
              organization: userProfiles.organization,
              reputationScore: userProfiles.reputationScore
            }
          })
          .from(users)
          .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
          .where(eq(users.id, userId));

        const replyCount = await this.getReplyCount(commentId);

        // Clear related caches
        await this.clearCommentCaches(existingComment.billId);

        return {
          ...updatedComment,
          user: userInfo.user,
          userProfile: userInfo.userProfile,
          replies: [],
          replyCount,
          netVotes: updatedComment.upvotes - updatedComment.downvotes
        };
      },
      null as any,
      `updateComment:${commentId}`
    );

    return result.data;
  }

  /**
   * Delete a comment (soft delete by marking as deleted)
   */
  async deleteComment(commentId: number, userId: string): Promise<boolean> {
    const result = await databaseService.withFallback(
      async () => {
        // Verify comment exists and belongs to user
        const [existingComment] = await db()
          .select()
          .from(billComments)
          .where(and(
            eq(billComments.id, commentId),
            eq(billComments.userId, userId)
          ))
          .limit(1);

        if (!existingComment) {
          throw new Error('Comment not found or access denied');
        }

        // Soft delete by updating content
        await db()
          .update(billComments)
          .set({
            content: '[Comment deleted by user]',
            updatedAt: new Date()
          })
          .where(eq(billComments.id, commentId));

        // Clear related caches
        await this.clearCommentCaches(existingComment.billId);

        return true;
      },
      false,
      `deleteComment:${commentId}`
    );

    return result.data;
  }

  /**
   * Get reply count for a comment
   */
  private async getReplyCount(commentId: number): Promise<number> {
    try {
      const [{ count: replyCount }] = await db()
        .select({ count: count() })
        .from(billComments)
        .where(eq(billComments.parentCommentId, commentId));

      return Number(replyCount);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get comment statistics for a bill
   */
  async getCommentStats(billId: number): Promise<CommentStats> {
    const result = await databaseService.withFallback(
      async () => {
        const cacheKey = `${CACHE_KEYS.BILL_COMMENTS}:stats:${billId}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

        // Get total comment count
        const [{ count: totalComments }] = await db()
          .select({ count: count() })
          .from(billComments)
          .where(eq(billComments.billId, billId));

        // Get expert comment count
        const [{ count: expertComments }] = await db()
          .select({ count: count() })
          .from(billComments)
          .innerJoin(users, eq(billComments.userId, users.id))
          .where(and(
            eq(billComments.billId, billId),
            eq(users.role, 'expert')
          ));

        // Get verified comment count
        const [{ count: verifiedComments }] = await db()
          .select({ count: count() })
          .from(billComments)
          .where(and(
            eq(billComments.billId, billId),
            eq(billComments.isVerified, true)
          ));

        // Get top contributors
        const topContributors = await db()
          .select({
            userId: users.id,
            userName: users.name,
            commentCount: count(billComments.id),
            totalVotes: sql<number>`SUM(${billComments.upvotes} - ${billComments.downvotes})`
          })
          .from(billComments)
          .innerJoin(users, eq(billComments.userId, users.id))
          .where(eq(billComments.billId, billId))
          .groupBy(users.id, users.name)
          .orderBy(desc(count(billComments.id)))
          .limit(5);

        const stats: CommentStats = {
          totalComments: Number(totalComments),
          expertComments: Number(expertComments),
          verifiedComments: Number(verifiedComments),
          averageEngagement: Number(totalComments) > 0 ?
            topContributors.reduce((sum, c) => sum + Number(c.totalVotes), 0) / Number(totalComments) : 0,
          topContributors: topContributors.map(c => ({
            userId: c.userId,
            userName: c.userName,
            commentCount: Number(c.commentCount),
            totalVotes: Number(c.totalVotes)
          }))
        };

        await cacheService.set(cacheKey, stats, this.COMMENT_CACHE_TTL);
        return stats;
      },
      {
        totalComments: 0,
        expertComments: 0,
        verifiedComments: 0,
        averageEngagement: 0,
        topContributors: []
      },
      `getCommentStats:${billId}`
    );

    return result.data;
  }

  /**
   * Clear comment-related caches
   */
  private async clearCommentCaches(billId: number): Promise<void> {
    const patterns = [
      `${CACHE_KEYS.BILL_COMMENTS}:${billId}:*`,
      `${CACHE_KEYS.BILL_COMMENTS}:stats:${billId}`
    ];

    for (const pattern of patterns) {
      await cacheService.deletePattern(pattern);
    }
  }

  /**
   * Sample comments for fallback mode
   */
  private getSampleComments(billId: number): CommentWithUser[] {
    return [
      {
        id: 1,
        billId,
        userId: 'user1',
        content: 'This bill raises several constitutional concerns regarding the separation of powers.',
        commentType: 'general',
        isVerified: true,
        parentCommentId: null,
        upvotes: 23,
        downvotes: 2,
        createdAt: new Date('2024-01-18T10:30:00Z'),
        updatedAt: new Date('2024-01-18T10:30:00Z'),
        user: {
          id: 'user1',
          name: 'Dr. Amina Hassan',
          role: 'expert',
          verificationStatus: 'verified'
        },
        userProfile: {
          expertise: ['Constitutional Law'],
          organization: 'University Law School',
          reputationScore: 95
        },
        replies: [],
        replyCount: 0,
        netVotes: 21
      },
      {
        id: 2,
        billId,
        userId: 'user2',
        content: 'From a digital rights perspective, Section 15 of this bill is particularly concerning.',
        commentType: 'general',
        isVerified: false,
        parentCommentId: null,
        upvotes: 18,
        downvotes: 1,
        createdAt: new Date('2024-01-19T14:15:00Z'),
        updatedAt: new Date('2024-01-19T14:15:00Z'),
        user: {
          id: 'user2',
          name: 'James Kiprotich',
          role: 'advocate',
          verificationStatus: 'verified'
        },
        userProfile: {
          expertise: ['Digital Rights'],
          organization: 'Digital Rights Foundation',
          reputationScore: 78
        },
        replies: [],
        replyCount: 0,
        netVotes: 17
      }
    ];
  }
}

export const commentService = new CommentService();





































