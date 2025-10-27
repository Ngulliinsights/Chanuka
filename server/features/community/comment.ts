
import { databaseService } from '../../infrastructure/database/database-service.js';
import { database as db } from '../../../shared/database/connection';
import { billComment as billComments, user as users, userProfile as userProfiles, bill as bills } from '../../../shared/schema/schema.js';
import { eq, and, desc, asc, sql, count, isNull, or, inArray } from 'drizzle-orm';
import { cacheService } from '../../infrastructure/cache/cache-service';
import { cacheKeys } from '../../../shared/core/src/caching/key-generator';
import { logger } from '../../../shared/core';

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
 * 
 * Optimizations include:
 * - Batch reply count queries to reduce database round trips
 * - Improved cache key generation for better invalidation
 * - Parallel data fetching where possible
 * - Better error handling and logging
 * - SQL injection prevention through parameterized queries
 */
export class CommentService {
  private readonly COMMENT_CACHE_TTL = 1800; // 30 minutes
  private readonly MAX_REPLY_DEPTH = 3; // Prevent infinite nesting
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  /**
   * Get comments for a bill with threading support
   * Optimized to batch reply count queries and load replies efficiently
   */
  async getBillComments(billId: number, filters: CommentFilters = {}): Promise<{
    comments: CommentWithUser[];
    totalCount: number;
    hasMore: boolean;
  }> {
    // Generate a stable cache key that properly serializes filters
    const cacheKey = this.generateCacheKey('bill_comments', billId, filters);

    const result = await databaseService.withFallback(
      async () => {
        // Check cache first
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

        // Sanitize and validate input parameters
        const {
          sort = 'recent',
          commentType,
          expertOnly = false,
          parentId,
          limit = this.DEFAULT_LIMIT,
          offset = 0
        } = filters;

        // Enforce max limit to prevent resource exhaustion
        const safeLimit = Math.min(limit, this.MAX_LIMIT);

        // Build query conditions efficiently
        const conditions = this.buildQueryConditions(billId, {
          commentType,
          expertOnly,
          parentId
        });

        // Execute main query with optimized joins
        const query = this.buildCommentQuery(conditions, sort);
        const results = await query.limit(safeLimit + 1).offset(offset);
        
        const hasMore = results.length > safeLimit;
        const comments = results.slice(0, safeLimit);

        // Get total count in parallel with comment processing
        const [totalCountResult, transformedComments] = await Promise.all([
          this.getTotalCount(billId, conditions),
          this.transformCommentsWithReplies(comments, parentId)
        ]);

        const result = {
          comments: transformedComments,
          totalCount: totalCountResult,
          hasMore
        };

        // Cache the result with error handling
        await this.safeCacheSet(cacheKey, result, this.COMMENT_CACHE_TTL);

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
   * Build query conditions with proper type safety
   */
  private buildQueryConditions(
    billId: number,
    options: {
      commentType?: string;
      expertOnly?: boolean;
      parentId?: number;
    }
  ) {
    const conditions = [eq(billComments.billId, billId)];

    // Handle parent comment filtering
    if (options.parentId !== undefined) {
      if (options.parentId === null) {
        conditions.push(isNull(billComments.parentCommentId));
      } else {
        conditions.push(eq(billComments.parentCommentId, options.parentId));
      }
    } else {
      // Default to top-level comments only
      conditions.push(isNull(billComments.parentCommentId));
    }

    if (options.commentType) {
      conditions.push(eq(billComments.commentType, options.commentType));
    }

    if (options.expertOnly) {
      conditions.push(
        or(
          eq(users.role, 'expert'),
          eq(billComments.isVerified, true)
        )
      );
    }

    return conditions;
  }

  /**
   * Build optimized comment query with proper sorting
   */
  private buildCommentQuery(conditions: any[], sort: string) {
    let query = db
      .select({
        comment: {
          id: billComments.id,
          billId: billComments.billId,
          userId: billComments.userId,
          content: billComments.content,
          commentType: billComments.commentType,
          isVerified: billComments.isVerified,
          parentCommentId: billComments.parentCommentId,
          upvotes: billComments.upvotes,
          downvotes: billComments.downvotes,
          createdAt: billComments.createdAt,
          updatedAt: billComments.updatedAt
        },
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
      .where(and(...conditions));

    // Apply sorting strategy based on filter
    return this.applySorting(query, sort);
  }

  /**
   * Apply sorting with optimized SQL expressions
   */
  private applySorting(query: any, sort: string) {
    switch (sort) {
      case 'popular':
        return query.orderBy(
          desc(sql`${billComments.upvotes} - ${billComments.downvotes}`),
          desc(billComments.createdAt)
        );
      case 'verified':
        return query.orderBy(
          desc(billComments.isVerified),
          desc(sql`${billComments.upvotes} - ${billComments.downvotes}`),
          desc(billComments.createdAt)
        );
      case 'oldest':
        return query.orderBy(asc(billComments.createdAt));
      default: // recent
        return query.orderBy(desc(billComments.createdAt));
    }
  }

  /**
   * Get total count efficiently
   */
  private async getTotalCount(billId: number, conditions: any[]): Promise<number> {
    try {
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(billComments)
        .where(and(...conditions));

      return Number(totalCount);
    } catch (error) {
      logger.error('Error getting total count', { billId, error });
      return 0;
    }
  }

  /**
   * Transform comments with replies using batch processing
   * This reduces N+1 queries by fetching all reply counts at once
   */
  private async transformCommentsWithReplies(
    comments: any[],
    parentId?: number
  ): Promise<CommentWithUser[]> {
    if (comments.length === 0) {
      return [];
    }

    // Batch fetch all reply counts in a single query
    const commentIds = comments.map(c => c.comment.id);
    const replyCounts = await this.getBatchReplyCounts(commentIds);

    // Transform comments with their reply counts
    const transformedComments: CommentWithUser[] = comments.map(row => ({
      ...row.comment,
      user: row.user,
      userProfile: row.userProfile,
      replies: [],
      replyCount: replyCounts.get(row.comment.id) || 0,
      netVotes: row.comment.upvotes - row.comment.downvotes
    }));

    // Load replies for top-level comments only (avoid loading for nested)
    if (parentId === undefined) {
      await this.loadRepliesForComments(transformedComments);
    }

    return transformedComments;
  }

  /**
   * Batch fetch reply counts for multiple comments
   * This replaces individual queries with a single grouped query
   */
  private async getBatchReplyCounts(commentIds: number[]): Promise<Map<number, number>> {
    if (commentIds.length === 0) {
      return new Map();
    }

    try {
      const results = await db
        .select({
          parentId: billComments.parentCommentId,
          count: count()
        })
        .from(billComments)
        .where(inArray(billComments.parentCommentId, commentIds))
        .groupBy(billComments.parentCommentId);

      return new Map(
        results.map(r => [Number(r.parentId), Number(r.count)])
      );
    } catch (error) {
      logger.error('Error fetching batch reply counts', { commentIds, error });
      return new Map();
    }
  }

  /**
   * Load replies for multiple comments efficiently
   */
  private async loadRepliesForComments(comments: CommentWithUser[]): Promise<void> {
    const loadPromises = comments.map(comment =>
      this.getCommentReplies(comment.id, { limit: 5 })
        .then(replies => {
          comment.replies = replies;
        })
        .catch(error => {
          logger.error('Error loading replies', { commentId: comment.id, error });
          comment.replies = [];
        })
    );

    await Promise.all(loadPromises);
  }

  /**
   * Get replies for a specific comment with improved error handling
   */
  async getCommentReplies(parentCommentId: number, filters: CommentFilters = {}): Promise<CommentWithUser[]> {
    const result = await databaseService.withFallback(
      async () => {
        const { sort = 'recent', limit = 10, offset = 0 } = filters;
        const safeLimit = Math.min(limit, this.MAX_LIMIT);

        const query = db
          .select({
            comment: {
              id: billComments.id,
              billId: billComments.billId,
              userId: billComments.userId,
              content: billComments.content,
              commentType: billComments.commentType,
              isVerified: billComments.isVerified,
              parentCommentId: billComments.parentCommentId,
              upvotes: billComments.upvotes,
              downvotes: billComments.downvotes,
              createdAt: billComments.createdAt,
              updatedAt: billComments.updatedAt
            },
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
          .where(eq(billComments.parentCommentId, parentCommentId))
          .orderBy(
            sort === 'popular'
              ? desc(sql`${billComments.upvotes} - ${billComments.downvotes}`)
              : asc(billComments.createdAt)
          )
          .limit(safeLimit)
          .offset(offset);

        const results = await query;

        // Batch fetch reply counts for all replies
        const commentIds = results.map(r => r.comment.id);
        const replyCounts = await this.getBatchReplyCounts(commentIds);

        return results.map(row => ({
          ...row.comment,
          user: row.user,
          userProfile: row.userProfile,
          replies: [], // Nested replies not loaded to prevent deep nesting
          replyCount: replyCounts.get(row.comment.id) || 0,
          netVotes: row.comment.upvotes - row.comment.downvotes
        }));
      },
      [],
      `getCommentReplies:${parentCommentId}`
    );

    return result.data;
  }

  /**
   * Create a new comment with comprehensive validation
   */
  async createComment(data: CreateCommentData): Promise<CommentWithUser> {
    const result = await databaseService.withFallback(
      async () => {
        // Validate input data
        this.validateCommentData(data);

        // Validate parent comment if specified
        if (data.parentCommentId) {
          await this.validateParentComment(data.parentCommentId, data.billId);
        }

        // Create the comment with proper defaults
        const [newComment] = await db
          .insert(billComments)
          .values({
            billId: data.billId,
            userId: data.userId,
            content: data.content.trim(),
            commentType: data.commentType || 'general',
            parentCommentId: data.parentCommentId || null,
            upvotes: 0,
            downvotes: 0,
            isVerified: false
          })
          .returning();

        // Fetch user information
        const userInfo = await this.getUserInfo(data.userId);

        // Clear related caches asynchronously
        this.clearCommentCaches(data.billId).catch(error =>
          logger.error('Error clearing caches', { billId: data.billId, error })
        );

        return {
          ...newComment,
          user: userInfo.user,
          userProfile: userInfo.userProfile,
          replies: [],
          replyCount: 0,
          netVotes: 0
        };
      },
      this.createFallbackComment(data),
      `createComment:${data.billId}`
    );

    return result.data;
  }

  /**
   * Validate comment data before insertion
   */
  private validateCommentData(data: CreateCommentData): void {
    if (!data.content || data.content.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }

    if (data.content.length > 5000) {
      throw new Error('Comment content exceeds maximum length of 5000 characters');
    }

    if (!data.billId || !data.userId) {
      throw new Error('Bill ID and User ID are required');
    }
  }

  /**
   * Validate parent comment exists and belongs to same bill
   */
  private async validateParentComment(parentCommentId: number, billId: number): Promise<void> {
    const [parentComment] = await db
      .select({ billId: billComments.billId })
      .from(billComments)
      .where(eq(billComments.id, parentCommentId))
      .limit(1);

    if (!parentComment) {
      throw new Error('Parent comment not found');
    }

    if (parentComment.billId !== billId) {
      throw new Error('Parent comment belongs to different bill');
    }
  }

  /**
   * Get user information efficiently
   */
  private async getUserInfo(userId: string) {
    const [userInfo] = await db
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

    if (!userInfo) {
      throw new Error('User not found');
    }

    return userInfo;
  }

  /**
   * Update an existing comment with validation
   */
  async updateComment(commentId: number, userId: string, data: UpdateCommentData): Promise<CommentWithUser> {
    const result = await databaseService.withFallback(
      async () => {
        // Validate update data
        if (data.content !== undefined) {
          const trimmedContent = data.content.trim();
          if (trimmedContent.length === 0) {
            throw new Error('Comment content cannot be empty');
          }
          if (trimmedContent.length > 5000) {
            throw new Error('Comment content exceeds maximum length');
          }
          data.content = trimmedContent;
        }

        // Verify ownership
        const existingComment = await this.verifyCommentOwnership(commentId, userId);

        // Update the comment
        const [updatedComment] = await db
          .update(billComments)
          .set({
            ...data,
            updatedAt: new Date()
          })
          .where(eq(billComments.id, commentId))
          .returning();

        // Get user information and reply count in parallel
        const [userInfo, replyCount] = await Promise.all([
          this.getUserInfo(userId),
          this.getReplyCount(commentId)
        ]);

        // Clear caches asynchronously
        this.clearCommentCaches(existingComment.billId).catch(error =>
          logger.error('Error clearing caches', { error })
        );

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
   * Verify comment ownership
   */
  private async verifyCommentOwnership(commentId: number, userId: string) {
    const [existingComment] = await db
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

    return existingComment;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: number, userId: string): Promise<boolean> {
    const result = await databaseService.withFallback(
      async () => {
        const existingComment = await this.verifyCommentOwnership(commentId, userId);

        // Soft delete by updating content
        await db
          .update(billComments)
          .set({
            content: '[Comment deleted by user]',
            updatedAt: new Date()
          })
          .where(eq(billComments.id, commentId));

        // Clear caches asynchronously
        this.clearCommentCaches(existingComment.billId).catch(error =>
          logger.error('Error clearing caches', { error })
        );

        return true;
      },
      false,
      `deleteComment:${commentId}`
    );

    return result.data;
  }

  /**
   * Get reply count for a single comment
   */
  private async getReplyCount(commentId: number): Promise<number> {
    try {
      const [{ count: replyCount }] = await db
        .select({ count: count() })
        .from(billComments)
        .where(eq(billComments.parentCommentId, commentId));

      return Number(replyCount);
    } catch (error) {
      logger.error('Error getting reply count', { commentId, error });
      return 0;
    }
  }

  /**
   * Get comprehensive comment statistics for a bill
   */
  async getCommentStats(billId: number): Promise<CommentStats> {
    const result = await databaseService.withFallback(
      async () => {
        const cacheKey = `bill_comments:stats:${billId}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }

        // Execute all stat queries in parallel for better performance
        const [
          totalCommentsResult,
          expertCommentsResult,
          verifiedCommentsResult,
          topContributorsResult
        ] = await Promise.all([
          this.getTotalCommentsCount(billId),
          this.getExpertCommentsCount(billId),
          this.getVerifiedCommentsCount(billId),
          this.getTopContributors(billId)
        ]);

        const stats: CommentStats = {
          totalComments: totalCommentsResult,
          expertComments: expertCommentsResult,
          verifiedComments: verifiedCommentsResult,
          averageEngagement: this.calculateAverageEngagement(
            totalCommentsResult,
            topContributorsResult
          ),
          topContributors: topContributorsResult
        };

        await this.safeCacheSet(cacheKey, stats, this.COMMENT_CACHE_TTL);
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
   * Get total comments count
   */
  private async getTotalCommentsCount(billId: number): Promise<number> {
    const [{ count: totalComments }] = await db
      .select({ count: count() })
      .from(billComments)
      .where(eq(billComments.billId, billId));

    return Number(totalComments);
  }

  /**
   * Get expert comments count
   */
  private async getExpertCommentsCount(billId: number): Promise<number> {
    const [{ count: expertComments }] = await db
      .select({ count: count() })
      .from(billComments)
      .innerJoin(users, eq(billComments.userId, users.id))
      .where(and(
        eq(billComments.billId, billId),
        eq(users.role, 'expert')
      ));

    return Number(expertComments);
  }

  /**
   * Get verified comments count
   */
  private async getVerifiedCommentsCount(billId: number): Promise<number> {
    const [{ count: verifiedComments }] = await db
      .select({ count: count() })
      .from(billComments)
      .where(and(
        eq(billComments.billId, billId),
        eq(billComments.isVerified, true)
      ));

    return Number(verifiedComments);
  }

  /**
   * Get top contributors
   */
  private async getTopContributors(billId: number) {
    const topContributors = await db
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

    return topContributors.map(c => ({
      userId: c.userId,
      userName: c.userName,
      commentCount: Number(c.commentCount),
      totalVotes: Number(c.totalVotes)
    }));
  }

  /**
   * Calculate average engagement
   */
  private calculateAverageEngagement(
    totalComments: number,
    contributors: Array<{ totalVotes: number }>
  ): number {
    if (totalComments === 0) {
      return 0;
    }

    const totalVotes = contributors.reduce((sum, c) => sum + c.totalVotes, 0);
    return totalVotes / totalComments;
  }

  /**
   * Generate stable cache key
   */
  private generateCacheKey(prefix: string, billId: number, filters: any): string {
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    
    return `${prefix}:${billId}:${filterString}`;
  }

  /**
   * Safe cache set with error handling
   */
  private async safeCacheSet(key: string, value: any, ttl: number): Promise<void> {
    try {
      await cacheService.set(key, value, ttl);
    } catch (error) {
      logger.error('Cache set failed', { key, error });
    }
  }

  /**
   * Clear comment-related caches with improved pattern matching
   */
  private async clearCommentCaches(billId: number): Promise<void> {
    const patterns = [
      `bill_comments:${billId}:*`,
      `bill_comments:stats:${billId}`
    ];

    for (const pattern of patterns) {
      try {
        await cacheService.deletePattern?.(pattern);
      } catch (error) {
        logger.error('Cache deletion failed', { pattern, error });
      }
    }
  }

  /**
   * Create fallback comment for offline mode
   */
  private createFallbackComment(data: CreateCommentData): CommentWithUser {
    return {
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
    };
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