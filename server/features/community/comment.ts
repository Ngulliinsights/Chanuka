
import { cacheService } from '@server/infrastructure/cache/cache-service';
import { databaseService } from '@server/infrastructure/database/database-service.js';
import { cacheKeys } from '@shared/core/caching/key-generator';
import { database as db } from '@server/infrastructure/database';
import { comments } from '@server/infrastructure/schema';
import { user_profiles,users } from '@server/infrastructure/schema';
import { bills } from '@server/infrastructure/schema';
import { and, asc, count, desc, eq, inArray,isNull, or, sql } from 'drizzle-orm';

import { logger } from '@/shared/core';

// Types for comment operations
export interface CommentWithUser {
  id: string;
  bill_id: number;
  user_id: string;
  content: string;
  commentType: string;
  is_verified: boolean;
  parent_id: number | null;
  upvotes: number;
  downvotes: number;
  created_at: Date;
  updated_at: Date;
  user: {
    id: string;
    name: string;
    role: string;
    verification_status: string;
  };
  user_profiles?: {
    expertise: string[] | null;
    organization: string | null;
    reputation_score: number;
  };
  replies?: CommentWithUser[];
  replyCount: number;
  netVotes: number;
}

export interface CreateCommentData {
  bill_id: number;
  user_id: string;
  content: string;
  commentType?: string;
  parent_id?: number;
}

export interface UpdateCommentData {
  content?: string;
  commentType?: string;
}

export interface CommentFilters {
  sort?: 'recent' | 'popular' | 'verified' | 'oldest';
  commentType?: string;
  expertOnly?: boolean;
  parent_id?: number;
  limit?: number;
  offset?: number;
}

export interface CommentVote {
  commentId: string;
  user_id: string;
  vote_type: 'up' | 'down';
}

export interface CommentStats {
  totalComments: number;
  expertComments: number;
  verifiedComments: number;
  averageEngagement: number;
  topContributors: Array<{
    user_id: string;
    userName: string;
    comment_count: number;
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
  async getBillComments(bill_id: number, filters: CommentFilters = {}): Promise<{
    comments: CommentWithUser[];
    totalCount: number;
    hasMore: boolean;
  }> {
    // Generate a stable cache key that properly serializes filters
    const cacheKey = this.generateCacheKey('bill_comments', bill_id, filters);

    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Direct Drizzle usage instead of repository
    const result = await databaseService.withFallback(
      async () => {
        const {
          sort = 'recent',
          commentType,
          expertOnly = false,
          parent_id,
          limit = 20,
          offset = 0
        } = filters;

        const safeLimit = Math.min(limit, 100);
        const conditions = this.buildQueryConditions(bill_id, { commentType, expertOnly, parent_id });

        const query = this.buildCommentQuery(conditions, sort);
        const results = await query.limit(safeLimit + 1).offset(offset);

        const hasMore = results.length > safeLimit;
        const comments = results.slice(0, safeLimit);

        const totalCount = await this.getTotalCount(bill_id, conditions);
        const transformedComments = await this.transformCommentsWithReplies(comments, parent_id);

        return {
          comments: transformedComments,
          totalCount,
          hasMore
        };
      },
      { comments: [], totalCount: 0, hasMore: false },
      `findCommentsByBillId:${bill_id}`
    );

    // Cache the result with error handling
    await this.safeCacheSet(cacheKey, result.data, this.COMMENT_CACHE_TTL);

    return result.data;
  }

  /**
   * Build query conditions with proper type safety
   */
  private buildQueryConditions(
    bill_id: number,
    options: {
      commentType?: string;
      expertOnly?: boolean;
      parent_id?: number;
    }
  ) {
    const conditions = [eq(comments.bill_id, bill_id)];

    // Handle parent comment filtering
    if (options.parent_id !== undefined) {
      if (options.parent_id === null) {
        conditions.push(isNull(comments.parent_id));
      } else {
        conditions.push(eq(comments.parent_id, options.parent_id));
      }
    } else {
      // Default to top-level comments only
      conditions.push(isNull(comments.parent_id));
    }

    if (options.commentType) {
      conditions.push(eq(comments.commentType, options.commentType));
    }

    if (options.expertOnly) {
      conditions.push(
        or(
          eq(users.role, 'expert'),
          eq(comments.is_verified, true)
        )
      );
    }

    return conditions;
  }

  /**
   * Build optimized comment query with proper sorting
   */
  private buildCommentQuery(conditions: any[], sort: string) {
    const query = db
      .select({
        comment: {
          id: comments.id,
          bill_id: comments.bill_id,
          user_id: comments.user_id,
          content: comments.content,
          commentType: comments.commentType,
          is_verified: comments.is_verified,
          parent_id: comments.parent_id,
          upvotes: comments.upvotes,
          downvotes: comments.downvotes,
          created_at: comments.created_at,
          updated_at: comments.updated_at
        },
        user: {
          id: users.id,
          name: users.name,
          role: users.role,
          verification_status: users.verification_status
        },
        user_profiles: {
          expertise: user_profiles.expertise,
          organization: user_profiles.organization,
          reputation_score: user_profiles.reputation_score
        }
      })
      .from(comments)
      .innerJoin(users, eq(comments.user_id, users.id))
      .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
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
          desc(sql`${comments.upvotes} - ${comments.downvotes}`),
          desc(comments.created_at)
        );
      case 'verified':
        return query.orderBy(
          desc(comments.is_verified),
          desc(sql`${comments.upvotes} - ${comments.downvotes}`),
          desc(comments.created_at)
        );
      case 'oldest':
        return query.orderBy(asc(comments.created_at));
      default: // recent
        return query.orderBy(desc(comments.created_at));
    }
  }

  /**
   * Get total count efficiently
   */
  private async getTotalCount(bill_id: number, conditions: any[]): Promise<number> {
    try {
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(comments)
        .where(and(...conditions));

      return Number(totalCount);
    } catch (error) {
      logger.error('Error getting total count', { bill_id, error });
      return 0;
    }
  }

  /**
   * Transform comments with replies using batch processing
   * This reduces N+1 queries by fetching all reply counts at once
   */
  private async transformCommentsWithReplies(
    comments: any[],
    parent_id?: number
  ): Promise<CommentWithUser[]> {
    if (comments.length === 0) {
      return [];
    }

    // Batch fetch all reply counts in a single query
    const comment_ids = comments.map(c => c.comment.id);
    const replyCounts = await this.getBatchReplyCounts(comment_ids);

    // Transform comments with their reply counts
    const transformedComments: CommentWithUser[] = comments.map(row => ({
      ...row.comment,
      user: row.user,
      user_profiles: row.user_profiles,
      replies: [],
      replyCount: replyCounts.get(row.comment.id) || 0,
      netVotes: row.comment.upvotes - row.comment.downvotes
    }));

    // Load replies for top-level comments only (avoid loading for nested)
    if (parent_id === undefined) {
      await this.loadRepliesForComments(transformedComments);
    }

    return transformedComments;
  }

  /**
   * Batch fetch reply counts for multiple comments
   * This replaces individual queries with a single grouped query
   */
  private async getBatchReplyCounts(comment_ids: number[]): Promise<Map<number, number>> {
    if (comment_ids.length === 0) {
      return new Map();
    }

    try {
      const results = await db
        .select({
          parent_id: comments.parent_id,
          count: count()
        })
        .from(comments)
        .where(inArray(comments.parent_id, comment_ids))
        .groupBy(comments.parent_id);

      return new Map(
        results.map(r => [Number(r.parent_id), Number(r.count)])
      );
    } catch (error) {
      logger.error('Error fetching batch reply counts', { comment_ids, error });
      return new Map();
    }
  }

  /**
   * Load replies for multiple comments efficiently
   */
  private async loadRepliesForComments(comment: CommentWithUser[]): Promise<void> {
    const loadPromises = comments.map(comment =>
      this.getCommentReplies(comment.id, { limit: 5 })
        .then(replies => {
          comment.replies = replies;
        })
        .catch(error => {
          logger.error('Error loading replies', { comment_id: comment.id, error });
          comment.replies = [];
        })
    );

    await Promise.all(loadPromises);
  }

  /**
   * Get replies for a specific comment with improved error handling
   */
  async getCommentReplies(parent_id: number, filters: CommentFilters = {}): Promise<CommentWithUser[]> {
    const result = await databaseService.withFallback(
      async () => {
        const { sort = 'recent', limit = 10, offset = 0 } = filters;
        const safeLimit = Math.min(limit, this.MAX_LIMIT);

        const query = db
          .select({
            comment: {
              id: comments.id,
              bill_id: comments.bill_id,
              user_id: comments.user_id,
              content: comments.content,
              commentType: comments.commentType,
              is_verified: comments.is_verified,
              parent_id: comments.parent_id,
              upvotes: comments.upvotes,
              downvotes: comments.downvotes,
              created_at: comments.created_at,
              updated_at: comments.updated_at
            },
            user: {
              id: users.id,
              name: users.name,
              role: users.role,
              verification_status: users.verification_status
            },
            user_profiles: {
              expertise: user_profiles.expertise,
              organization: user_profiles.organization,
              reputation_score: user_profiles.reputation_score
            }
          })
          .from(comments)
          .innerJoin(users, eq(comments.user_id, users.id))
          .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
          .where(eq(comments.parent_id, parent_id))
          .orderBy(
            sort === 'popular'
              ? desc(sql`${comments.upvotes} - ${comments.downvotes}`)
              : asc(comments.created_at)
          )
          .limit(safeLimit)
          .offset(offset);

        const results = await query;

        // Batch fetch reply counts for all replies
        const comment_ids = results.map(r => r.comment.id);
        const replyCounts = await this.getBatchReplyCounts(comment_ids);

        return results.map(row => ({
          ...row.comment,
          user: row.user,
          user_profiles: row.user_profiles,
          replies: [], // Nested replies not loaded to prevent deep nesting
          replyCount: replyCounts.get(row.comment.id) || 0,
          netVotes: row.comment.upvotes - row.comment.downvotes
        }));
      },
      [],
      `getCommentReplies:${parent_id}`
    );

    return result.data;
  }

  /**
   * Create a new comment with comprehensive validation
   */
  async createComment(data: CreateCommentData): Promise<CommentWithUser> {
    // Validate input data
    this.validateCommentData(data);

    // Validate parent comment if specified
    if (data.parent_id) {
      await this.validateParentComment(data.parent_id, data.bill_id);
    }

    // Direct Drizzle usage instead of repository
    const comment = await databaseService.withFallback(
      async () => {
        const [newComment] = await db
          .insert(comments)
          .values({
            bill_id: data.bill_id,
            user_id: data.user_id,
            content: data.content.trim(),
            commentType: data.commentType || 'general',
            parent_id: data.parent_id || null,
            upvotes: 0,
            downvotes: 0,
            is_verified: false
          })
          .returning();

        const userInfo = await this.getUserInfo(data.user_id);

        return {
          ...newComment,
          user: userInfo.user,
          user_profiles: userInfo.user_profiles,
          replies: [],
          replyCount: 0,
          netVotes: 0
        };
      },
      this.createFallbackComment(data),
      `createComment:${data.bill_id}`
    );

    // Clear related caches asynchronously
    this.clearCommentCaches(data.bill_id).catch(error =>
      logger.error('Error clearing caches', { bill_id: data.bill_id, error })
    );

    return comment.data;
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

    if (!data.bill_id || !data.user_id) {
      throw new Error('Bill ID and User ID are required');
    }
  }

  /**
   * Validate parent comment exists and belongs to same bill
   */
  private async validateParentComment(parent_id: number, bill_id: number): Promise<void> {
    const [parentComment] = await db
      .select({ bill_id: comments.bill_id })
      .from(comments)
      .where(eq(comments.id, parent_id))
      .limit(1);

    if (!parentComment) {
      throw new Error('Parent comment not found');
    }

    if (parentComment.bill_id !== bill_id) {
      throw new Error('Parent comment belongs to different bill');
    }
  }

  /**
   * Get user information efficiently
   */
  private async getUserInfo(user_id: string) {
    const [userInfo] = await db
      .select({
        user: {
          id: users.id,
          name: users.name,
          role: users.role,
          verification_status: users.verification_status
        },
        user_profiles: {
          expertise: user_profiles.expertise,
          organization: user_profiles.organization,
          reputation_score: user_profiles.reputation_score
        }
      })
      .from(users)
      .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
      .where(eq(users.id, user_id));

    if (!userInfo) {
      throw new Error('User not found');
    }

    return userInfo;
  }

  /**
   * Update an existing comment with validation
   */
  async updateComment(comment_id: number, user_id: string, data: UpdateCommentData): Promise<CommentWithUser> {
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

    // Direct Drizzle usage instead of repository
    const updatedComment = await databaseService.withFallback(
      async () => {
        if (data.content !== undefined) {
          data.content = data.content.trim();
        }

        const [updatedComment] = await db
          .update(comments)
          .set({
            ...data,
            updated_at: new Date()
          })
          .where(and(eq(comments.id, comment_id), eq(comments.user_id, user_id)))
          .returning();

        if (!updatedComment) {
          throw new Error('Comment not found or access denied');
        }

        const userInfo = await this.getUserInfo(user_id);
        const replyCount = await this.getReplyCount(comment_id);

        return {
          ...updatedComment,
          user: userInfo.user,
          user_profiles: userInfo.user_profiles,
          replies: [],
          replyCount,
          netVotes: updatedComment.upvotes - updatedComment.downvotes
        };
      },
      null as any,
      `updateComment:${comment_id}`
    );

    // Clear caches asynchronously
    this.clearCommentCaches(updatedComment.data.bill_id).catch(error =>
      logger.error('Error clearing caches', { error })
    );

    return updatedComment.data;
  }

  /**
   * Verify comment ownership
   */
  private async verifyCommentOwnership(comment_id: number, user_id: string) {
    const [existingComment] = await db
      .select()
      .from(comments)
      .where(and(
        eq(comments.id, comment_id),
        eq(comments.user_id, user_id)
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
  async deleteComment(comment_id: number, user_id: string): Promise<boolean> {
    // Get comment first to know which bill to clear cache for
    const comment = await this.findCommentById(comment_id);
    if (!comment) return false;

    // Direct Drizzle usage instead of repository
    const deleted = await databaseService.withFallback(
      async () => {
        const result = await db
          .delete(comments)
          .where(and(eq(comments.id, comment_id), eq(comments.user_id, user_id)));

        return result.rowCount > 0;
      },
      false,
      `deleteComment:${comment_id}`
    );

    if (deleted.data) {
      // Clear caches asynchronously
      this.clearCommentCaches(comment.bill_id).catch(error =>
        logger.error('Error clearing caches', { error })
      );
    }

    return deleted.data;
  }

  /**
   * Find comment by ID
   */
  async findCommentById(id: number): Promise<CommentWithUser | null> {
    const result = await databaseService.withFallback(
      async () => {
        const [comment] = await db
          .select({
            comment: {
              id: comments.id,
              bill_id: comments.bill_id,
              user_id: comments.user_id,
              content: comments.content,
              commentType: comments.commentType,
              is_verified: comments.is_verified,
              parent_id: comments.parent_id,
              upvotes: comments.upvotes,
              downvotes: comments.downvotes,
              created_at: comments.created_at,
              updated_at: comments.updated_at
            },
            user: {
              id: users.id,
              name: users.name,
              role: users.role,
              verification_status: users.verification_status
            },
            user_profiles: {
              expertise: user_profiles.expertise,
              organization: user_profiles.organization,
              reputation_score: user_profiles.reputation_score
            }
          })
          .from(comments)
          .innerJoin(users, eq(comments.user_id, users.id))
          .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
          .where(eq(comments.id, id));

        if (!comment) return null;

        const replyCount = await this.getReplyCount(id);

        return {
          ...comment.comment,
          user: comment.user,
          user_profiles: comment.user_profiles,
          replies: [],
          replyCount,
          netVotes: comment.comment.upvotes - comment.comment.downvotes
        };
      },
      null,
      `findCommentById:${id}`
    );
    return result.data;
  }

  /**
   * Get reply count for a single comment
   */
  private async getReplyCount(comment_id: number): Promise<number> {
    const result = await databaseService.withFallback(
      async () => {
        const [{ count: replyCount }] = await db
          .select({ count: count() })
          .from(comments)
          .where(eq(comments.parent_id, comment_id));

        return Number(replyCount);
      },
      0,
      `getReplyCount:${comment_id}`
    );
    return result.data;
  }

  /**
   * Get comprehensive comment statistics for a bill
   */
  async getCommentStats(bill_id: number): Promise<CommentStats> {
    const cacheKey = `bill_comments:stats:${bill_id}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Direct Drizzle usage instead of repository
    const stats = await databaseService.withFallback(
      async () => {
        const [totalCommentsResult] = await db
          .select({ count: count() })
          .from(comments)
          .where(eq(comments.bill_id, bill_id));

        const [expertCommentsResult] = await db
          .select({ count: count() })
          .from(comments)
          .innerJoin(users, eq(comments.user_id, users.id))
          .where(and(
            eq(comments.bill_id, bill_id),
            eq(users.role, 'expert')
          ));

        const [verifiedCommentsResult] = await db
          .select({ count: count() })
          .from(comments)
          .where(and(
            eq(comments.bill_id, bill_id),
            eq(comments.is_verified, true)
          ));

        const topContributors = await db
          .select({
            user_id: users.id,
            userName: users.name,
            comment_count: count(comments.id),
            totalVotes: sql<number>`SUM(${comments.upvotes} - ${comments.downvotes})`
          })
          .from(comments)
          .innerJoin(users, eq(comments.user_id, users.id))
          .where(eq(comments.bill_id, bill_id))
          .groupBy(users.id, users.name)
          .orderBy(desc(count(comments.id)))
          .limit(5);

        const totalComments = Number(totalCommentsResult.count);
        const contributors = topContributors.map(c => ({
          user_id: c.user_id,
          userName: c.userName,
          comment_count: Number(c.comment_count),
          totalVotes: Number(c.totalVotes)
        }));

        return {
          totalComments,
          expertComments: Number(expertCommentsResult.count),
          verifiedComments: Number(verifiedCommentsResult.count),
          averageEngagement: totalComments > 0 ? contributors.reduce((sum, c) => sum + c.totalVotes, 0) / totalComments : 0,
          topContributors: contributors
        };
      },
      {
        totalComments: 0,
        expertComments: 0,
        verifiedComments: 0,
        averageEngagement: 0,
        topContributors: []
      },
      `getCommentStats:${bill_id}`
    );

    await this.safeCacheSet(cacheKey, stats.data, this.COMMENT_CACHE_TTL);
    return stats.data;
  }

  /**
   * Get total comments count
   */
  private async getTotalCommentsCount(bill_id: number): Promise<number> {
    const [{ count: totalComments }] = await db
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.bill_id, bill_id));

    return Number(totalComments);
  }

  /**
   * Get expert comments count
   */
  private async getExpertCommentsCount(bill_id: number): Promise<number> {
    const [{ count: expertComments }] = await db
      .select({ count: count() })
      .from(comments)
      .innerJoin(users, eq(comments.user_id, users.id))
      .where(and(
        eq(comments.bill_id, bill_id),
        eq(users.role, 'expert')
      ));

    return Number(expertComments);
  }

  /**
   * Get verified comments count
   */
  private async getVerifiedCommentsCount(bill_id: number): Promise<number> {
    const [{ count: verifiedComments }] = await db
      .select({ count: count() })
      .from(comments)
      .where(and(
        eq(comments.bill_id, bill_id),
        eq(comments.is_verified, true)
      ));

    return Number(verifiedComments);
  }

  /**
   * Get top contributors
   */
  private async getTopContributors(bill_id: number) {
    const topContributors = await db
      .select({
        user_id: users.id,
        userName: users.name,
        comment_count: count(comments.id),
        totalVotes: sql<number>`SUM(${comments.upvotes} - ${comments.downvotes})`
      })
      .from(comments)
      .innerJoin(users, eq(comments.user_id, users.id))
      .where(eq(comments.bill_id, bill_id))
      .groupBy(users.id, users.name)
      .orderBy(desc(count(comments.id)))
      .limit(5);

    return topContributors.map(c => ({
      user_id: c.user_id,
      userName: c.userName,
      comment_count: Number(c.comment_count),
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
  private generateCacheKey(prefix: string, bill_id: number, filters: any): string {
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');

    return `${prefix}:${bill_id}:${filterString}`;
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
  private async clearCommentCaches(bill_id: number): Promise<void> {
    const patterns = [
      `bill_comments:${bill_id}:*`,
      `bill_comments:stats:${bill_id}`
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
      id: Date.now().toString(),
      bill_id: data.bill_id,
      user_id: data.user_id,
      content: data.content,
      commentType: data.commentType || 'general',
      is_verified: false,
      parent_id: data.parent_id || null,
      upvotes: 0,
      downvotes: 0,
      created_at: new Date(),
      updated_at: new Date(),
      user: {
        id: data.user_id,
        name: 'Sample User',
        role: 'citizen',
        verification_status: 'pending'
      },
      replies: [],
      replyCount: 0,
      netVotes: 0
    };
  }

  /**
   * Sample comments for fallback mode
   */
  private getSampleComments(bill_id: number): CommentWithUser[] {
    return [
      {
        id: '1',
        bill_id,
        user_id: 'user1',
        content: 'This bill raises several constitutional concerns regarding the separation of powers.',
        commentType: 'general',
        is_verified: true,
        parent_id: null,
        upvotes: 23,
        downvotes: 2,
        created_at: new Date('2024-01-18T10:30:00Z'),
        updated_at: new Date('2024-01-18T10:30:00Z'),
        user: {
          id: 'user1',
          name: 'Dr. Amina Hassan',
          role: 'expert',
          verification_status: 'verified'
        },
        user_profiles: {
          expertise: ['Constitutional Law'],
          organization: 'University Law School',
          reputation_score: 95
        },
        replies: [],
        replyCount: 0,
        netVotes: 21
      },
      {
        id: '2',
        bill_id,
        user_id: 'user2',
        content: 'From a digital rights perspective, Section 15 of this bill is particularly concerning.',
        commentType: 'general',
        is_verified: false,
        parent_id: null,
        upvotes: 18,
        downvotes: 1,
        created_at: new Date('2024-01-19T14:15:00Z'),
        updated_at: new Date('2024-01-19T14:15:00Z'),
        user: {
          id: 'user2',
          name: 'James Kiprotich',
          role: 'advocate',
          verification_status: 'verified'
        },
        user_profiles: {
          expertise: ['Digital Rights'],
          organization: 'Digital Rights Foundation',
          reputation_score: 78
        },
        replies: [],
        replyCount: 0,
        netVotes: 17
      }
    ];
  }
}

export const commentService = new CommentService();



