/**
 * Community Service
 * Modernized service for community features with standardized patterns
 */

import { Result, Ok, Err } from '../../../../shared/core/primitives/types/result';
import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import { comments, votes, reports, users, bills } from '@server/infrastructure/schema';
import { eq, and, desc, asc, sql, count, isNull, inArray } from 'drizzle-orm';
import { 
  Comment, 
  Vote, 
  Report,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateVoteRequest,
  CreateReportRequest,
  UpdateReportRequest,
  CommentQueryParams,
  VoteQueryParams,
  ReportQueryParams,
  CommentStatus,
  VoteType,
  ReportStatus
} from '../../../../shared/types/api/contracts/community.contracts';
import { cacheService } from '@server/infrastructure/cache';


export class CommunityService {
  private readonly cachePrefix = 'community';
  private readonly cacheTTL = 300; // 5 minutes

  // Comment Operations
  async getComments(params: CommentQueryParams): Promise<Result<Comment[], Error>> {
    try {
      const cacheKey = `${this.cachePrefix}:comments:${JSON.stringify(params)}`;
      const cached = await cacheService.get<Comment[]>(cacheKey);
      if (cached) {
        return Ok(cached);
      }

      let query = readDatabase
        .select({
          id: comments.id,
          billId: comments.billId,
          userId: comments.userId,
          parentId: comments.parentId,
          content: comments.content,
          type: comments.type,
          status: comments.status,
          metadata: comments.metadata,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          editedAt: comments.editedAt,
          // Engagement metrics
          upvotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.type} = 'upvote' THEN 1 ELSE 0 END), 0)::int`,
          downvotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.type} = 'downvote' THEN 1 ELSE 0 END), 0)::int`,
          replies: sql<number>`(SELECT COUNT(*) FROM ${comments} c2 WHERE c2.parent_id = ${comments.id})::int`,
          reports: sql<number>`(SELECT COUNT(*) FROM ${reports} r WHERE r.target_id = ${comments.id} AND r.target_type = 'comment')::int`
        })
        .from(comments)
        .leftJoin(votes, and(
          eq(votes.targetId, comments.id),
          eq(votes.targetType, 'comment')
        ))
        .groupBy(comments.id);

      // Apply filters
      const conditions = [];
      if (params.billId) conditions.push(eq(comments.billId, params.billId));
      if (params.userId) conditions.push(eq(comments.userId, params.userId));
      if (params.parentId) conditions.push(eq(comments.parentId, params.parentId));
      if (params.type) conditions.push(eq(comments.type, params.type));
      if (params.status) conditions.push(eq(comments.status, params.status));
      if (params.isHighlighted !== undefined) {
        conditions.push(sql`${comments.metadata}->>'isHighlighted' = ${params.isHighlighted.toString()}`);
      }
      if (params.dateFrom) conditions.push(sql`${comments.createdAt} >= ${params.dateFrom}`);
      if (params.dateTo) conditions.push(sql`${comments.createdAt} <= ${params.dateTo}`);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting
      const sortBy = params.sortBy || 'createdAt';
      const sortOrder = params.sortOrder || 'desc';
      
      if (sortBy === 'createdAt') {
        query = query.orderBy(sortOrder === 'desc' ? desc(comments.createdAt) : asc(comments.createdAt));
      } else if (sortBy === 'upvotes') {
        query = query.orderBy(sortOrder === 'desc' ? desc(sql`upvotes`) : asc(sql`upvotes`));
      }

      // Apply pagination
      const limit = Math.min(params.limit || 20, 100);
      const offset = params.offset || 0;
      query = query.limit(limit).offset(offset);

      const results = await query;

      // Transform results to include engagement data
      const commentsWithEngagement: Comment[] = results.map(row => ({
        id: row.id,
        billId: row.billId,
        userId: row.userId,
        parentId: row.parentId,
        content: row.content,
        type: row.type,
        status: row.status,
        metadata: {
          ...row.metadata,
          isHighlighted: row.metadata?.isHighlighted || false,
          isOfficial: row.metadata?.isOfficial || false,
          isPinned: row.metadata?.isPinned || false,
          tags: row.metadata?.tags || []
        },
        engagement: {
          upvotes: row.upvotes,
          downvotes: row.downvotes,
          replies: row.replies,
          reports: row.reports,
          shares: 0 // TODO: Implement shares tracking
        },
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        editedAt: row.editedAt?.toISOString()
      }));

      await cacheService.set(cacheKey, commentsWithEngagement, this.cacheTTL);
      return Ok(commentsWithEngagement);

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to get comments');
      return Err(new Error('Failed to retrieve comments'));
    }
  }

  async getCommentById(id: string): Promise<Result<Comment, Error>> {
    try {
      const cacheKey = `${this.cachePrefix}:comment:${id}`;
      const cached = await cacheService.get<Comment>(cacheKey);
      if (cached) {
        return Ok(cached);
      }

      const result = await readDatabase
        .select({
          id: comments.id,
          billId: comments.billId,
          userId: comments.userId,
          parentId: comments.parentId,
          content: comments.content,
          type: comments.type,
          status: comments.status,
          metadata: comments.metadata,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          editedAt: comments.editedAt,
          upvotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.type} = 'upvote' THEN 1 ELSE 0 END), 0)::int`,
          downvotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.type} = 'downvote' THEN 1 ELSE 0 END), 0)::int`,
          replies: sql<number>`(SELECT COUNT(*) FROM ${comments} c2 WHERE c2.parent_id = ${comments.id})::int`,
          reports: sql<number>`(SELECT COUNT(*) FROM ${reports} r WHERE r.target_id = ${comments.id} AND r.target_type = 'comment')::int`
        })
        .from(comments)
        .leftJoin(votes, and(
          eq(votes.targetId, comments.id),
          eq(votes.targetType, 'comment')
        ))
        .where(eq(comments.id, id))
        .groupBy(comments.id)
        .limit(1);

      if (result.length === 0) {
        return Err(new Error('Comment not found'));
      }

      const row = result[0];
      const comment: Comment = {
        id: row.id,
        billId: row.billId,
        userId: row.userId,
        parentId: row.parentId,
        content: row.content,
        type: row.type,
        status: row.status,
        metadata: {
          ...row.metadata,
          isHighlighted: row.metadata?.isHighlighted || false,
          isOfficial: row.metadata?.isOfficial || false,
          isPinned: row.metadata?.isPinned || false,
          tags: row.metadata?.tags || []
        },
        engagement: {
          upvotes: row.upvotes,
          downvotes: row.downvotes,
          replies: row.replies,
          reports: row.reports,
          shares: 0
        },
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        editedAt: row.editedAt?.toISOString()
      };

      await cacheService.set(cacheKey, comment, this.cacheTTL);
      return Ok(comment);

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', commentId: id }, 'Failed to get comment');
      return Err(new Error('Failed to retrieve comment'));
    }
  }

  async createComment(data: CreateCommentRequest, userId: string): Promise<Result<Comment, Error>> {
    try {
      return await withTransaction(async (tx) => {
        // Validate bill exists
        const billExists = await tx
          .select({ id: bills.id })
          .from(bills)
          .where(eq(bills.id, data.billId))
          .limit(1);

        if (billExists.length === 0) {
          return Err(new Error('Bill not found'));
        }

        // Validate parent comment if specified
        if (data.parentId) {
          const parentExists = await tx
            .select({ id: comments.id })
            .from(comments)
            .where(eq(comments.id, data.parentId))
            .limit(1);

          if (parentExists.length === 0) {
            return Err(new Error('Parent comment not found'));
          }
        }

        const newComment = {
          billId: data.billId,
          userId,
          parentId: data.parentId || null,
          content: data.content,
          type: data.type || 'general',
          status: 'active' as CommentStatus,
          metadata: {
            isHighlighted: false,
            isOfficial: false,
            isPinned: false,
            tags: data.tags || []
          }
        };

        const result = await tx
          .insert(comments)
          .values(newComment)
          .returning();

        const createdComment = result[0];

        // Audit log
        logger.info({
          action: 'comment_created',
          userId,
          resourceType: 'comment',
          resourceId: createdComment.id,
          metadata: { billId: data.billId, parentId: data.parentId }
        }, 'Comment created');

        // Invalidate cache
        await this.invalidateCommentCaches(data.billId);

        const comment: Comment = {
          id: createdComment.id,
          billId: createdComment.billId,
          userId: createdComment.userId,
          parentId: createdComment.parentId,
          content: createdComment.content,
          type: createdComment.type,
          status: createdComment.status,
          metadata: createdComment.metadata,
          engagement: {
            upvotes: 0,
            downvotes: 0,
            replies: 0,
            reports: 0,
            shares: 0
          },
          createdAt: createdComment.createdAt.toISOString(),
          updatedAt: createdComment.updatedAt.toISOString()
        };

        return Ok(comment);
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', data }, 'Failed to create comment');
      return Err(new Error('Failed to create comment'));
    }
  }

  async updateComment(id: string, data: UpdateCommentRequest, userId: string): Promise<Result<Comment, Error>> {
    try {
      return await withTransaction(async (tx) => {
        // Check if comment exists and user owns it
        const existingComment = await tx
          .select()
          .from(comments)
          .where(and(eq(comments.id, id), eq(comments.userId, userId)))
          .limit(1);

        if (existingComment.length === 0) {
          return Err(new Error('Comment not found or access denied'));
        }

        const updateData: any = {
          updatedAt: new Date(),
          editedAt: new Date()
        };

        if (data.content !== undefined) updateData.content = data.content;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.tags !== undefined) {
          updateData.metadata = {
            ...existingComment[0].metadata,
            tags: data.tags
          };
        }

        const result = await tx
          .update(comments)
          .set(updateData)
          .where(eq(comments.id, id))
          .returning();

        const updatedComment = result[0];

        // Audit log
        logger.info({
          action: 'comment_updated',
          userId,
          resourceType: 'comment',
          resourceId: id,
          metadata: { changes: Object.keys(updateData) }
        }, 'Comment updated');

        // Invalidate cache
        await this.invalidateCommentCaches(updatedComment.billId, id);

        return await this.getCommentById(id);
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', commentId: id }, 'Failed to update comment');
      return Err(new Error('Failed to update comment'));
    }
  }

  async deleteComment(id: string, userId: string): Promise<Result<void, Error>> {
    try {
      return await withTransaction(async (tx) => {
        // Check if comment exists and user owns it
        const existingComment = await tx
          .select({ billId: comments.billId })
          .from(comments)
          .where(and(eq(comments.id, id), eq(comments.userId, userId)))
          .limit(1);

        if (existingComment.length === 0) {
          return Err(new Error('Comment not found or access denied'));
        }

        // Soft delete by updating status
        await tx
          .update(comments)
          .set({ 
            status: 'deleted' as CommentStatus,
            updatedAt: new Date()
          })
          .where(eq(comments.id, id));

        // Audit log
        logger.info({
          action: 'comment_deleted',
          userId,
          resourceType: 'comment',
          resourceId: id
        }, 'Comment deleted');

        // Invalidate cache
        await this.invalidateCommentCaches(existingComment[0].billId, id);

        return Ok(undefined);
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', commentId: id }, 'Failed to delete comment');
      return Err(new Error('Failed to delete comment'));
    }
  }

  // Vote Operations
  async createVote(data: CreateVoteRequest, userId: string): Promise<Result<Vote, Error>> {
    try {
      return await withTransaction(async (tx) => {
        // Check if user already voted on this target
        const existingVote = await tx
          .select()
          .from(votes)
          .where(and(
            eq(votes.userId, userId),
            eq(votes.targetId, data.targetId),
            eq(votes.targetType, data.targetType)
          ))
          .limit(1);

        if (existingVote.length > 0) {
          // Update existing vote
          const result = await tx
            .update(votes)
            .set({ type: data.type })
            .where(eq(votes.id, existingVote[0].id))
            .returning();

          const vote: Vote = {
            id: result[0].id,
            userId: result[0].userId,
            targetId: result[0].targetId,
            targetType: result[0].targetType,
            type: result[0].type,
            createdAt: result[0].createdAt.toISOString()
          };

          return Ok(vote);
        } else {
          // Create new vote
          const result = await tx
            .insert(votes)
            .values({
              userId,
              targetId: data.targetId,
              targetType: data.targetType,
              type: data.type
            })
            .returning();

          const vote: Vote = {
            id: result[0].id,
            userId: result[0].userId,
            targetId: result[0].targetId,
            targetType: result[0].targetType,
            type: result[0].type,
            createdAt: result[0].createdAt.toISOString()
          };

          // Invalidate related caches
          await this.invalidateVoteCaches(data.targetId, data.targetType);

          return Ok(vote);
        }
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', data }, 'Failed to create vote');
      return Err(new Error('Failed to create vote'));
    }
  }

  // Cache invalidation helpers
  private async invalidateCommentCaches(billId: string, commentId?: string): Promise<void> {
    const patterns = [
      `${this.cachePrefix}:comments:*`,
      `${this.cachePrefix}:bill:${billId}:*`
    ];
    
    if (commentId) {
      patterns.push(`${this.cachePrefix}:comment:${commentId}`);
    }

    await Promise.all(patterns.map(pattern => cacheService.deletePattern(pattern)));
  }

  private async invalidateVoteCaches(targetId: string, targetType: string): Promise<void> {
    const patterns = [
      `${this.cachePrefix}:votes:*`,
      `${this.cachePrefix}:${targetType}:${targetId}:*`
    ];

    await Promise.all(patterns.map(pattern => cacheService.deletePattern(pattern)));
  }
}

export const communityService = new CommunityService();