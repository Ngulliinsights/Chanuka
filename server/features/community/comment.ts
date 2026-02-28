import { cacheService } from '@server/infrastructure/cache';
import { CACHE_TTL_SHORT } from '@shared/core/primitives';
import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';;
import { bills, comments, user_profiles, users } from '@server/infrastructure/schema';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { inputSanitizationService, queryValidationService, securityAuditService } from '@server/features/security';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

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
  } | null;
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

// ---------------------------------------------------------------------------
// Drizzle select shape (reused across several methods)
// ---------------------------------------------------------------------------

const COMMENT_SELECT = {
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
    updated_at: comments.updated_at,
  },
  user: {
    id: users.id,
    name: users.name,
    role: users.role,
    verification_status: users.verification_status,
  },
  user_profiles: {
    expertise: user_profiles.expertise,
    organization: user_profiles.organization,
    reputation_score: user_profiles.reputation_score,
  },
} as const;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Comprehensive Comment Service
 * Handles threaded comments, voting, moderation, and expert verification.
 *
 * Optimisations:
 * - Batch reply-count queries to reduce database round trips
 * - Parallel data fetching where possible
 * - Stable, deterministic cache key generation
 * - Full SQL injection prevention via parameterised Drizzle queries
 */
export class CommentService {
  private readonly COMMENT_CACHE_TTL = 1800; // 30 minutes
  private readonly MAX_LIMIT = 100;
  private readonly DEFAULT_LIMIT = 20;

  // -------------------------------------------------------------------------
  // Public: read
  // -------------------------------------------------------------------------

  /**
   * Get paginated, threaded comments for a bill.
   */
  async getBillComments(
    bill_id: number,
    filters: CommentFilters = {},
  ): Promise<{ comments: CommentWithUser[]; totalCount: number; hasMore: boolean }> {
    const cacheKey = this.generateCacheKey('bill_comments', bill_id, filters);

    const cached = await cacheService.get(cacheKey);
    if (cached) return cached as Awaited<ReturnType<typeof this.getBillComments>>;

    try {
      const {
        sort = 'recent',
        commentType,
        expertOnly = false,
        parent_id,
        limit = this.DEFAULT_LIMIT,
        offset = 0,
      } = filters;

      const safeLimit = Math.min(limit, this.MAX_LIMIT);
      const conditions = this.buildQueryConditions(bill_id, { commentType, expertOnly, parent_id });
      const baseQuery = this.buildCommentQuery(conditions, sort);

      const [rawResults, totalCount] = await Promise.all([
        baseQuery.limit(safeLimit + 1).offset(offset),
        this.getTotalCount(conditions),
      ]);

      const hasMore = rawResults.length > safeLimit;
      const pageRows = rawResults.slice(0, safeLimit);
      const transformedComments = await this.transformCommentsWithReplies(pageRows, parent_id);

      const result = { comments: transformedComments, totalCount, hasMore };
      await this.safeCacheSet(cacheKey, result, this.COMMENT_CACHE_TTL);
      return result;
    } catch (error) {
      logger.error('Failed to get bill comments', {
        error,
        component: 'CommentService',
        operation: 'getBillComments',
        context: { bill_id },
      });
      return { comments: [], totalCount: 0, hasMore: false };
    }
  }

  /**
   * Get replies for a specific comment.
   */
  async getCommentReplies(
    parent_id: number,
    filters: CommentFilters = {},
  ): Promise<CommentWithUser[]> {
    try {
      const { sort = 'recent', limit = 10, offset = 0 } = filters;
      const safeLimit = Math.min(limit, this.MAX_LIMIT);

      const results = await db
        .select(COMMENT_SELECT)
        .from(comments)
        .innerJoin(users, eq(comments.user_id, users.id))
        .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
        .where(eq(comments.parent_id, parent_id))
        .orderBy(
          sort === 'popular'
            ? desc(sql`${comments.upvotes} - ${comments.downvotes}`)
            : asc(comments.created_at),
        )
        .limit(safeLimit)
        .offset(offset);

      const comment_ids = results.map((r) => r.comment.id as number);
      const replyCounts = await this.getBatchReplyCounts(comment_ids);

      return results.map((row) => ({
        ...row.comment,
        user: row.user,
        user_profiles: row.user_profiles,
        replies: [],
        replyCount: replyCounts.get(row.comment.id as number) ?? 0,
        netVotes: row.comment.upvotes - row.comment.downvotes,
      }));
    } catch (error) {
      logger.error('Failed to get comment replies', {
        error,
        component: 'CommentService',
        operation: 'getCommentReplies',
        context: { parent_id },
      });
      return [];
    }
  }

  /**
   * Find a single comment by ID, with reply count.
   */
  async findCommentById(id: number): Promise<CommentWithUser | null> {
    try {
      const [row] = await db
        .select(COMMENT_SELECT)
        .from(comments)
        .innerJoin(users, eq(comments.user_id, users.id))
        .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
        .where(eq(comments.id, id))
        .limit(1);

      if (!row) return null;

      const replyCount = await this.getReplyCount(id);

      return {
        ...row.comment,
        user: row.user,
        user_profiles: row.user_profiles,
        replies: [],
        replyCount,
        netVotes: row.comment.upvotes - row.comment.downvotes,
      };
    } catch (error) {
      logger.error('Failed to find comment by ID', {
        error,
        component: 'CommentService',
        operation: 'findCommentById',
        context: { id },
      });
      return null;
    }
  }

  /**
   * Get aggregate statistics for a bill's comments.
   */
  async getCommentStats(bill_id: number): Promise<CommentStats> {
    const cacheKey = `bill_comments:stats:${bill_id}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return cached as CommentStats;

    const empty: CommentStats = {
      totalComments: 0,
      expertComments: 0,
      verifiedComments: 0,
      averageEngagement: 0,
      topContributors: [],
    };

    try {
      const [[totalRow], [expertRow], [verifiedRow], topContributors] = await Promise.all([
        db
          .select({ count: count() })
          .from(comments)
          .where(eq(comments.bill_id, bill_id)),
        db
          .select({ count: count() })
          .from(comments)
          .innerJoin(users, eq(comments.user_id, users.id))
          .where(and(eq(comments.bill_id, bill_id), eq(users.role, 'expert'))),
        db
          .select({ count: count() })
          .from(comments)
          .where(and(eq(comments.bill_id, bill_id), eq(comments.is_verified, true))),
        db
          .select({
            user_id: users.id,
            userName: users.name,
            comment_count: count(comments.id),
            totalVotes: sql<number>`COALESCE(SUM(${comments.upvotes} - ${comments.downvotes}), 0)`,
          })
          .from(comments)
          .innerJoin(users, eq(comments.user_id, users.id))
          .where(eq(comments.bill_id, bill_id))
          .groupBy(users.id, users.name)
          .orderBy(desc(count(comments.id)))
          .limit(5),
      ]);

      const totalComments = Number(totalRow.count);
      const contributors = topContributors.map((c) => ({
        user_id: c.user_id,
        userName: c.userName,
        comment_count: Number(c.comment_count),
        totalVotes: Number(c.totalVotes),
      }));

      const stats: CommentStats = {
        totalComments,
        expertComments: Number(expertRow.count),
        verifiedComments: Number(verifiedRow.count),
        averageEngagement: this.calculateAverageEngagement(totalComments, contributors),
        topContributors: contributors,
      };

      await this.safeCacheSet(cacheKey, stats, this.COMMENT_CACHE_TTL);
      return stats;
    } catch (error) {
      logger.error('Failed to get comment stats', {
        error,
        component: 'CommentService',
        operation: 'getCommentStats',
        context: { bill_id },
      });
      await this.safeCacheSet(cacheKey, empty, this.COMMENT_CACHE_TTL);
      return empty;
    }
  }

  // -------------------------------------------------------------------------
  // Public: write
  // -------------------------------------------------------------------------

  /**
   * Create a new comment, with input validation and optional parent validation.
   */
  async createComment(data: CreateCommentData): Promise<CommentWithUser> {
    this.validateCommentData(data);

    // 1. Validate inputs
    const validation = queryValidationService.validateInputs([
      String(data.bill_id),
      data.user_id,
      data.content
    ]);
    if (validation.hasErrors()) {
      throw new Error(`Invalid comment data: ${validation.getErrorMessage()}`);
    }

    // 2. Sanitize inputs - CRITICAL for XSS prevention
    const sanitizedContent = inputSanitizationService.sanitizeHtml(data.content.trim());
    const sanitizedCommentType = data.commentType 
      ? inputSanitizationService.sanitizeString(data.commentType)
      : 'general';

    if (data.parent_id) {
      await this.validateParentComment(data.parent_id, data.bill_id);
    }

    try {
      const [newComment] = await db
        .insert(comments)
        .values({
          bill_id: data.bill_id,
          user_id: data.user_id,
          content: sanitizedContent,
          commentType: sanitizedCommentType,
          parent_id: data.parent_id ?? null,
          upvotes: 0,
          downvotes: 0,
          is_verified: false,
        })
        .returning();

      const userInfo = await this.getUserInfo(data.user_id);

      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        eventType: 'comment_created',
        userId: data.user_id,
        ipAddress: 'internal',
        userAgent: 'comment-service',
        resource: `comment:${newComment.id}`,
        action: 'create',
        timestamp: new Date(),
        metadata: { 
          bill_id: data.bill_id,
          comment_type: sanitizedCommentType,
          has_parent: !!data.parent_id
        }
      });

      // Process comment through argument intelligence pipeline (async, non-blocking)
      this.processCommentArguments(newComment, userInfo).catch((error) =>
        logger.error('Error processing comment arguments', {
          error,
          context: { comment_id: newComment.id, bill_id: data.bill_id },
        }),
      );

      this.clearCommentCaches(data.bill_id).catch((error) =>
        logger.error('Error clearing comment caches after create', {
          error,
          context: { bill_id: data.bill_id },
        }),
      );

      return {
        ...newComment,
        user: userInfo.user,
        user_profiles: userInfo.user_profiles,
        replies: [],
        replyCount: 0,
        netVotes: 0,
      };
    } catch (error) {
      logger.error('Failed to create comment', {
        error,
        component: 'CommentService',
        operation: 'createComment',
        context: { bill_id: data.bill_id },
      });
      return this.createFallbackComment(data);
    }
  }

  /**
   * Process comment through argument intelligence pipeline
   * This runs asynchronously and doesn't block comment creation
   */
  private async processCommentArguments(
    comment: typeof comments.$inferSelect,
    userInfo: Awaited<ReturnType<typeof this.getUserInfo>>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Dynamically import to avoid circular dependencies
      const { argumentIntelligenceService } = await import('@server/features/argument-intelligence');

      // Build user demographics from profile
      const userDemographics = userInfo.user_profiles
        ? {
            expertise: userInfo.user_profiles.expertise,
            organization: userInfo.user_profiles.organization,
            reputation_score: userInfo.user_profiles.reputation_score,
          }
        : undefined;

      // Process the comment
      const result = await argumentIntelligenceService.processComment({
        text: comment.content,
        billId: String(comment.bill_id),
        userId: comment.user_id,
        commentId: String(comment.id),
        userDemographics,
        submissionContext: {
          commentType: comment.commentType,
          parentId: comment.parent_id ? String(comment.parent_id) : undefined,
          timestamp: comment.created_at,
        },
      });

      const processingTime = Date.now() - startTime;

      logger.info('Comment processed through argument intelligence', {
        component: 'CommentService',
        context: {
          comment_id: comment.id,
          bill_id: comment.bill_id,
          processingTime,
          claimsExtracted: result.claimsExtracted,
          evidenceFound: result.evidenceFound,
          position: result.position,
        },
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Log but don't throw - argument processing is supplementary
      logger.error('Failed to process comment arguments', {
        error,
        component: 'CommentService',
        context: {
          comment_id: comment.id,
          processingTime,
        },
      });
    }
  }

  /**
   * Update an existing comment owned by the given user.
   */
  async updateComment(
    comment_id: number,
    user_id: string,
    data: UpdateCommentData,
  ): Promise<CommentWithUser | null> {
    // 1. Validate inputs
    const validation = queryValidationService.validateInputs([
      String(comment_id),
      user_id
    ]);
    if (validation.hasErrors()) {
      throw new Error(`Invalid comment update data: ${validation.getErrorMessage()}`);
    }

    // 2. Sanitize inputs
    if (data.content !== undefined) {
      const trimmed = data.content.trim();
      if (trimmed.length === 0) throw new Error('Comment content cannot be empty');
      if (trimmed.length > 5000) throw new Error('Comment content exceeds maximum length');
      data.content = inputSanitizationService.sanitizeHtml(trimmed);
    }

    if (data.commentType !== undefined) {
      data.commentType = inputSanitizationService.sanitizeString(data.commentType);
    }

    try {
      const [updatedComment] = await db
        .update(comments)
        .set({ ...data, updated_at: new Date() })
        .where(and(eq(comments.id, comment_id), eq(comments.user_id, user_id)))
        .returning();

      if (!updatedComment) throw new Error('Comment not found or access denied');

      const [userInfo, replyCount] = await Promise.all([
        this.getUserInfo(user_id),
        this.getReplyCount(comment_id),
      ]);

      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        eventType: 'comment_updated',
        userId: user_id,
        ipAddress: 'internal',
        userAgent: 'comment-service',
        resource: `comment:${comment_id}`,
        action: 'update',
        timestamp: new Date(),
        metadata: { 
          comment_id,
          bill_id: updatedComment.bill_id,
          updated_fields: Object.keys(data)
        }
      });

      this.clearCommentCaches(updatedComment.bill_id).catch((error) =>
        logger.error('Error clearing comment caches after update', { error }),
      );

      return {
        ...updatedComment,
        user: userInfo.user,
        user_profiles: userInfo.user_profiles,
        replies: [],
        replyCount,
        netVotes: updatedComment.upvotes - updatedComment.downvotes,
      };
    } catch (error) {
      logger.error('Failed to update comment', {
        error,
        component: 'CommentService',
        operation: 'updateComment',
        context: { comment_id },
      });
      return null;
    }
  }

  /**
   * Hard-delete a comment owned by the given user.
   */
  async deleteComment(comment_id: number, user_id: string): Promise<boolean> {
    // 1. Validate inputs
    const validation = queryValidationService.validateInputs([
      String(comment_id),
      user_id
    ]);
    if (validation.hasErrors()) {
      throw new Error(`Invalid comment deletion data: ${validation.getErrorMessage()}`);
    }

    const comment = await this.findCommentById(comment_id);
    if (!comment) return false;

    try {
      const result = await db
        .delete(comments)
        .where(and(eq(comments.id, comment_id), eq(comments.user_id, user_id)));

      const deleted = (result.rowCount ?? 0) > 0;

      if (deleted) {
        // 2. Audit log
        await securityAuditService.logSecurityEvent({
          eventType: 'comment_deleted',
          userId: user_id,
          ipAddress: 'internal',
          userAgent: 'comment-service',
          resource: `comment:${comment_id}`,
          action: 'delete',
          timestamp: new Date(),
          metadata: { 
            comment_id,
            bill_id: comment.bill_id
          }
        });

        this.clearCommentCaches(comment.bill_id).catch((error) =>
          logger.error('Error clearing comment caches after delete', { error }),
        );
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete comment', {
        error,
        component: 'CommentService',
        operation: 'deleteComment',
        context: { comment_id },
      });
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Private: query builders
  // -------------------------------------------------------------------------

  private buildQueryConditions(
    bill_id: number,
    options: { commentType?: string; expertOnly?: boolean; parent_id?: number },
  ) {
    const conditions = [eq(comments.bill_id, bill_id)];

    // Filter by parent / top-level
    if (options.parent_id !== undefined) {
      conditions.push(eq(comments.parent_id, options.parent_id));
    } else {
      conditions.push(isNull(comments.parent_id));
    }

    if (options.commentType) {
      conditions.push(eq(comments.commentType, options.commentType));
    }

    if (options.expertOnly) {
      conditions.push(or(eq(users.role, 'expert'), eq(comments.is_verified, true))!);
    }

    return conditions;
  }

  private buildCommentQuery(conditions: ReturnType<typeof this.buildQueryConditions>, sort: string) {
    const base = db
      .select(COMMENT_SELECT)
      .from(comments)
      .innerJoin(users, eq(comments.user_id, users.id))
      .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
      .where(and(...conditions));

    return this.applySorting(base, sort);
  }

  private applySorting(query: any, sort: string) {
    switch (sort) {
      case 'popular':
        return query.orderBy(
          desc(sql`${comments.upvotes} - ${comments.downvotes}`),
          desc(comments.created_at),
        );
      case 'verified':
        return query.orderBy(
          desc(comments.is_verified),
          desc(sql`${comments.upvotes} - ${comments.downvotes}`),
          desc(comments.created_at),
        );
      case 'oldest':
        return query.orderBy(asc(comments.created_at));
      default:
        return query.orderBy(desc(comments.created_at));
    }
  }

  private async getTotalCount(
    conditions: ReturnType<typeof this.buildQueryConditions>,
  ): Promise<number> {
    try {
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(comments)
        .innerJoin(users, eq(comments.user_id, users.id))
        .where(and(...conditions));
      return Number(total);
    } catch (error) {
      logger.error('Error getting total comment count', { error });
      return 0;
    }
  }

  // -------------------------------------------------------------------------
  // Private: comment transformation
  // -------------------------------------------------------------------------

  private async transformCommentsWithReplies(
    rows: Awaited<ReturnType<typeof this.buildCommentQuery>>,
    parent_id?: number,
  ): Promise<CommentWithUser[]> {
    if (rows.length === 0) return [];

    const comment_ids = rows.map((r) => r.comment.id as number);
    const replyCounts = await this.getBatchReplyCounts(comment_ids);

    const transformed: CommentWithUser[] = rows.map((row) => ({
      ...row.comment,
      user: row.user,
      user_profiles: row.user_profiles,
      replies: [],
      replyCount: replyCounts.get(row.comment.id as number) ?? 0,
      netVotes: row.comment.upvotes - row.comment.downvotes,
    }));

    // Only hydrate replies at the top level to prevent infinite nesting
    if (parent_id === undefined) {
      await this.loadRepliesForComments(transformed);
    }

    return transformed;
  }

  /**
   * Batch-fetch reply counts for multiple parent comments in a single query.
   */
  private async getBatchReplyCounts(comment_ids: number[]): Promise<Map<number, number>> {
    if (comment_ids.length === 0) return new Map();

    try {
      const results = await db
        .select({ parent_id: comments.parent_id, count: count() })
        .from(comments)
        .where(inArray(comments.parent_id, comment_ids))
        .groupBy(comments.parent_id);

      return new Map(results.map((r) => [Number(r.parent_id), Number(r.count)]));
    } catch (error) {
      logger.error('Error fetching batch reply counts', { error, comment_ids });
      return new Map();
    }
  }

  /**
   * Load a shallow first page of replies for each top-level comment.
   */
  private async loadRepliesForComments(commentList: CommentWithUser[]): Promise<void> {
    await Promise.all(
      commentList.map((comment) =>
        this.getCommentReplies(Number(comment.id), { limit: 5 })
          .then((replies) => {
            comment.replies = replies;
          })
          .catch((error) => {
            logger.error('Error loading replies for comment', {
              error,
              context: { comment_id: comment.id },
            });
            comment.replies = [];
          }),
      ),
    );
  }

  private async getReplyCount(comment_id: number): Promise<number> {
    try {
      const [{ count: replyCount }] = await db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.parent_id, comment_id));
      return Number(replyCount);
    } catch (error) {
      logger.error('Error getting reply count', {
        error,
        context: { comment_id },
      });
      return 0;
    }
  }

  // -------------------------------------------------------------------------
  // Private: validation and user info
  // -------------------------------------------------------------------------

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

  private async validateParentComment(parent_id: number, bill_id: number): Promise<void> {
    const [parentComment] = await db
      .select({ bill_id: comments.bill_id })
      .from(comments)
      .where(eq(comments.id, parent_id))
      .limit(1);

    if (!parentComment) throw new Error('Parent comment not found');
    if (parentComment.bill_id !== bill_id) {
      throw new Error('Parent comment belongs to a different bill');
    }
  }

  private async getUserInfo(user_id: string) {
    const [userInfo] = await db
      .select({
        user: {
          id: users.id,
          name: users.name,
          role: users.role,
          verification_status: users.verification_status,
        },
        user_profiles: {
          expertise: user_profiles.expertise,
          organization: user_profiles.organization,
          reputation_score: user_profiles.reputation_score,
        },
      })
      .from(users)
      .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
      .where(eq(users.id, user_id))
      .limit(1);

    if (!userInfo) throw new Error('User not found');
    return userInfo;
  }

  // -------------------------------------------------------------------------
  // Private: cache helpers
  // -------------------------------------------------------------------------

  private generateCacheKey(prefix: string, bill_id: number, filters: Record<string, unknown>): string {
    const filterString = Object.keys(filters)
      .sort()
      .map((key) => `${key}:${filters[key]}`)
      .join('|');
    return `${prefix}:${bill_id}:${filterString}`;
  }

  private async safeCacheSet(key: string, value: unknown, ttl: number): Promise<void> {
    try {
      await cacheService.set(key, value, ttl);
    } catch (error) {
      logger.error('Cache set failed', { error, context: { key } });
    }
  }

  private async clearCommentCaches(bill_id: number): Promise<void> {
    const patterns = [`bill_comments:${bill_id}:*`, `bill_comments:stats:${bill_id}`];
    await Promise.allSettled(
      patterns.map((pattern) =>
        cacheService.deletePattern?.(pattern) ??
        cacheService.delete(pattern),
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Private: fallback / sample data
  // -------------------------------------------------------------------------

  private calculateAverageEngagement(
    totalComments: number,
    contributors: Array<{ totalVotes: number }>,
  ): number {
    if (totalComments === 0) return 0;
    return contributors.reduce((sum, c) => sum + c.totalVotes, 0) / totalComments;
  }

  private createFallbackComment(data: CreateCommentData): CommentWithUser {
    return {
      id: Date.now().toString(),
      bill_id: data.bill_id,
      user_id: data.user_id,
      content: data.content,
      commentType: data.commentType ?? 'general',
      is_verified: false,
      parent_id: data.parent_id ?? null,
      upvotes: 0,
      downvotes: 0,
      created_at: new Date(),
      updated_at: new Date(),
      user: { id: data.user_id, name: 'Sample User', role: 'citizen', verification_status: 'pending' },
      user_profiles: null,
      replies: [],
      replyCount: 0,
      netVotes: 0,
    };
  }

  /** Offline / demo sample comments. */
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
        user: { id: 'user1', name: 'Dr. Amina Hassan', role: 'expert', verification_status: 'verified' },
        user_profiles: { expertise: ['Constitutional Law'], organization: 'University Law School', reputation_score: 95 },
        replies: [],
        replyCount: 0,
        netVotes: 21,
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
        user: { id: 'user2', name: 'James Kiprotich', role: 'advocate', verification_status: 'verified' },
        user_profiles: { expertise: ['Digital Rights'], organization: 'Digital Rights Foundation', reputation_score: 78 },
        replies: [],
        replyCount: 0,
        netVotes: 17,
      },
    ];
  }
}

export const commentService = new CommentService();