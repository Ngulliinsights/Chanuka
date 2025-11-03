import { eq, and, desc, asc, sql, count, isNull, or, inArray } from 'drizzle-orm';
import { databaseService } from '../../../../infrastructure/database/database-service';
import { comments, users, user_profiles } from '@shared/schema';
import { ICommentRepository, CommentWithUser, CreateCommentData, UpdateCommentData, CommentFilters, CommentStats } from '../../domain/repositories/comment-repository';

export class CommentRepositoryImpl implements ICommentRepository {
  private get db() {
    return databaseService.getDatabase();
  }

  async findById(id: number): Promise<CommentWithUser | null> {
    const result = await databaseService.withFallback(
      async () => {
        const [comment] = await this.db
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

  async findByBillId(billId: number, filters: CommentFilters = {}): Promise<{
    comments: CommentWithUser[];
    totalCount: number;
    hasMore: boolean;
  }> {
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
        const conditions = this.buildQueryConditions(billId, { commentType, expertOnly, parent_id });

        const query = this.buildCommentQuery(conditions, sort);
        const results = await query.limit(safeLimit + 1).offset(offset);

        const hasMore = results.length > safeLimit;
        const comments = results.slice(0, safeLimit);

        const totalCount = await this.getTotalCount(billId, conditions);
        const transformedComments = await this.transformCommentsWithReplies(comments, parent_id);

        return {
          comments: transformedComments,
          totalCount,
          hasMore
        };
      },
      { comments: [], totalCount: 0, hasMore: false },
      `findCommentsByBillId:${billId}`
    );
    return result.data;
  }

  async findReplies(parentId: number, filters: CommentFilters = {}): Promise<CommentWithUser[]> {
    const result = await databaseService.withFallback(
      async () => {
        const { sort = 'recent', limit = 10, offset = 0 } = filters;
        const safeLimit = Math.min(limit, 100);

        const query = this.db
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
          .where(eq(comments.parent_id, parentId))
          .orderBy(
            sort === 'popular'
              ? desc(sql`${comments.upvotes} - ${comments.downvotes}`)
              : asc(comments.created_at)
          )
          .limit(safeLimit)
          .offset(offset);

        const results = await query;
        const commentIds = results.map(r => r.comment.id);
        const replyCounts = await this.getBatchReplyCounts(commentIds);

        return results.map(row => ({
          ...row.comment,
          user: row.user,
          user_profiles: row.user_profiles,
          replies: [],
          replyCount: replyCounts.get(row.comment.id) || 0,
          netVotes: row.comment.upvotes - row.comment.downvotes
        }));
      },
      [],
      `findCommentReplies:${parentId}`
    );
    return result.data;
  }

  async create(data: CreateCommentData): Promise<CommentWithUser> {
    const result = await databaseService.withFallback(
      async () => {
        const [newComment] = await this.db
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
    return result.data;
  }

  async update(id: number, userId: string, data: UpdateCommentData): Promise<CommentWithUser> {
    const result = await databaseService.withFallback(
      async () => {
        if (data.content !== undefined) {
          data.content = data.content.trim();
        }

        const [updatedComment] = await this.db
          .update(comments)
          .set({
            ...data,
            updated_at: new Date()
          })
          .where(and(eq(comments.id, id), eq(comments.user_id, userId)))
          .returning();

        if (!updatedComment) {
          throw new Error('Comment not found or access denied');
        }

        const userInfo = await this.getUserInfo(userId);
        const replyCount = await this.getReplyCount(id);

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
      `updateComment:${id}`
    );
    return result.data;
  }

  async delete(id: number, userId: string): Promise<boolean> {
    const result = await databaseService.withFallback(
      async () => {
        const result = await this.db
          .delete(comments)
          .where(and(eq(comments.id, id), eq(comments.user_id, userId)));

        return result.rowCount > 0;
      },
      false,
      `deleteComment:${id}`
    );
    return result.data;
  }

  async vote(commentId: number, userId: string, voteType: 'up' | 'down'): Promise<void> {
    await databaseService.withTransaction(
      async (tx) => {
        // This is a simplified implementation - in a real app you'd have a votes table
        const updateField = voteType === 'up' ? 'upvotes' : 'downvotes';
        await tx
          .update(comments)
          .set({
            [updateField]: sql`${comments[updateField]} + 1`,
            updated_at: new Date()
          })
          .where(eq(comments.id, commentId));
      },
      `voteComment:${commentId}`
    );
  }

  async getVote(commentId: number, userId: string): Promise<any | null> {
    // Simplified - in a real app you'd query a votes table
    return null;
  }

  async getStats(billId: number): Promise<CommentStats> {
    const result = await databaseService.withFallback(
      async () => {
        const [totalCommentsResult] = await this.db
          .select({ count: count() })
          .from(comments)
          .where(eq(comments.bill_id, billId));

        const [expertCommentsResult] = await this.db
          .select({ count: count() })
          .from(comments)
          .innerJoin(users, eq(comments.user_id, users.id))
          .where(and(
            eq(comments.bill_id, billId),
            eq(users.role, 'expert')
          ));

        const [verifiedCommentsResult] = await this.db
          .select({ count: count() })
          .from(comments)
          .where(and(
            eq(comments.bill_id, billId),
            eq(comments.is_verified, true)
          ));

        const topContributors = await this.db
          .select({
            user_id: users.id,
            userName: users.name,
            comment_count: count(comments.id),
            totalVotes: sql<number>`SUM(${comments.upvotes} - ${comments.downvotes})`
          })
          .from(comments)
          .innerJoin(users, eq(comments.user_id, users.id))
          .where(eq(comments.bill_id, billId))
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
      `getCommentStats:${billId}`
    );
    return result.data;
  }

  async verifyComment(id: number): Promise<void> {
    await databaseService.withTransaction(
      async (tx) => {
        await tx
          .update(comments)
          .set({
            is_verified: true,
            updated_at: new Date()
          })
          .where(eq(comments.id, id));
      },
      `verifyComment:${id}`
    );
  }

  async unverifyComment(id: number): Promise<void> {
    await databaseService.withTransaction(
      async (tx) => {
        await tx
          .update(comments)
          .set({
            is_verified: false,
            updated_at: new Date()
          })
          .where(eq(comments.id, id));
      },
      `unverifyComment:${id}`
    );
  }

  async getReplyCount(commentId: number): Promise<number> {
    const result = await databaseService.withFallback(
      async () => {
        const [{ count: replyCount }] = await this.db
          .select({ count: count() })
          .from(comments)
          .where(eq(comments.parent_id, commentId));

        return Number(replyCount);
      },
      0,
      `getReplyCount:${commentId}`
    );
    return result.data;
  }

  private buildQueryConditions(bill_id: number, options: {
    commentType?: string;
    expertOnly?: boolean;
    parent_id?: number;
  }) {
    const conditions = [eq(comments.bill_id, bill_id)];

    if (options.parent_id !== undefined) {
      if (options.parent_id === null) {
        conditions.push(isNull(comments.parent_id));
      } else {
        conditions.push(eq(comments.parent_id, options.parent_id));
      }
    } else {
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

  private buildCommentQuery(conditions: any[], sort: string) {
    let query = this.db
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

    switch (sort) {
      case 'popular':
        query = query.orderBy(
          desc(sql`${comments.upvotes} - ${comments.downvotes}`),
          desc(comments.created_at)
        );
        break;
      case 'verified':
        query = query.orderBy(
          desc(comments.is_verified),
          desc(sql`${comments.upvotes} - ${comments.downvotes}`),
          desc(comments.created_at)
        );
        break;
      case 'oldest':
        query = query.orderBy(asc(comments.created_at));
        break;
      default: // recent
        query = query.orderBy(desc(comments.created_at));
    }

    return query;
  }

  private async getTotalCount(bill_id: number, conditions: any[]): Promise<number> {
    const [{ count: totalCount }] = await this.db
      .select({ count: count() })
      .from(comments)
      .where(and(...conditions));

    return Number(totalCount);
  }

  private async transformCommentsWithReplies(comments: any[], parent_id?: number): Promise<CommentWithUser[]> {
    if (comments.length === 0) return [];

    const commentIds = comments.map(c => c.comment.id);
    const replyCounts = await this.getBatchReplyCounts(commentIds);

    const transformedComments: CommentWithUser[] = comments.map(row => ({
      ...row.comment,
      user: row.user,
      user_profiles: row.user_profiles,
      replies: [],
      replyCount: replyCounts.get(row.comment.id) || 0,
      netVotes: row.comment.upvotes - row.comment.downvotes
    }));

    if (parent_id === undefined) {
      await this.loadRepliesForComments(transformedComments);
    }

    return transformedComments;
  }

  private async getBatchReplyCounts(commentIds: number[]): Promise<Map<number, number>> {
    if (commentIds.length === 0) return new Map();

    const results = await this.db
      .select({
        parent_id: comments.parent_id,
        count: count()
      })
      .from(comments)
      .where(inArray(comments.parent_id, commentIds))
      .groupBy(comments.parent_id);

    return new Map(
      results.map(r => [Number(r.parent_id), Number(r.count)])
    );
  }

  private async loadRepliesForComments(comments: CommentWithUser[]): Promise<void> {
    const promises = comments.map(comment =>
      this.findReplies(comment.id, { limit: 5 })
        .then(replies => {
          comment.replies = replies;
        })
        .catch(error => {
          console.error(`Error loading replies for comment ${comment.id}:`, error);
          comment.replies = [];
        })
    );

    await Promise.all(promises);
  }

  private async getUserInfo(user_id: string) {
    const [userInfo] = await this.db
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

  private createFallbackComment(data: CreateCommentData): CommentWithUser {
    return {
      id: Date.now(),
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
}

export const commentRepository = new CommentRepositoryImpl();