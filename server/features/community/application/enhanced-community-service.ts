/**
 * Enhanced Community Service - Complete Infrastructure Integration
 * 
 * Integrates ALL infrastructure components:
 * - ✅ Validation (Zod schemas)
 * - ✅ Caching (cache-keys.ts)
 * - ✅ Security (SecureQueryBuilder, XSS prevention, audit logging)
 * - ✅ Error Handling (Result types)
 * - ✅ Transactions (withTransaction)
 */

import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';;
import { eq, and, desc, sql, or } from 'drizzle-orm';

// Infrastructure imports
import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL, createCacheInvalidation } from '@server/infrastructure/cache';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  GetCommentsSchema,
  LikeCommentSchema,
  FlagCommentSchema,
  ModerateCommentSchema,
  type CreateCommentInput,
  type UpdateCommentInput,
  type GetCommentsInput,
  type LikeCommentInput,
  type FlagCommentInput,
  type ModerateCommentInput,
} from './community-validation.schemas';

// Domain imports
import { Comment } from '../domain/entities/comment.entity';

/**
 * Enhanced CommunityService with complete infrastructure integration
 */
export class EnhancedCommunityService {
  private inputSanitizer = new InputSanitizationService();
  private cacheInvalidation = createCacheInvalidation(cacheService);

  // ============================================================================
  // Cache Invalidation Helpers
  // ============================================================================

  private async invalidateCommentCaches(commentId: string, billId?: string): Promise<void> {
    const invalidations = [
      cacheService.delete(cacheKeys.community('comment', commentId)),
    ];

    if (billId) {
      invalidations.push(
        cacheService.delete(cacheKeys.list('comment', { bill_id: billId })),
        cacheService.delete(cacheKeys.list('comment', { bill_id: billId, highlighted: true })),
      );
    }

    await Promise.all(invalidations);
  }

  // ============================================================================
  // COMMENT CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new comment with complete infrastructure integration
   */
  async createComment(data: CreateCommentInput, userId: string): Promise<AsyncServiceResult<Comment>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(CreateCommentSchema, data);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedData = validation.data!;

      // 2. Sanitize inputs (XSS prevention)
      const sanitizedContent = this.inputSanitizer.sanitizeHtml(validatedData.content);
      const sanitizedBillId = this.inputSanitizer.sanitizeString(validatedData.bill_id);
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);

      // 3. Execute with transaction
      const comment = await withTransaction(async () => {
        // Create comment using secure query builder
        const [newComment] = await secureQueryBuilderService
          .insert('comments')
          .values({
            bill_id: sanitizedBillId,
            user_id: sanitizedUserId,
            content: sanitizedContent,
            parent_id: validatedData.parent_id || null,
            comment_type: validatedData.comment_type || 'comment',
            is_anonymous: validatedData.is_anonymous || false,
            moderation_status: 'pending',
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        // Update bill engagement count
        await secureQueryBuilderService
          .update('bills')
          .set({
            comment_count: sql`comment_count + 1`,
            updated_at: new Date(),
          })
          .where('id', '=', sanitizedBillId);

        return Comment.create({
          id: newComment.id,
          billId: newComment.bill_id,
          userId: newComment.user_id,
          content: sanitizedContent,
          parentCommentId: newComment.parent_id,
        });
      });

      // 4. Audit log
      await securityAuditService.logSecurityEvent({
        event_type: 'comment_created',
        severity: 'low',
        user_id: sanitizedUserId,
        ip_address: 'internal',
        user_agent: 'enhanced-community-service',
        resource: `comment:${comment.id}`,
        action: 'create',
        success: true,
        details: {
          bill_id: sanitizedBillId,
          comment_type: validatedData.comment_type,
          has_parent: !!validatedData.parent_id,
        },
      });

      // 5. Invalidate caches
      await this.invalidateCommentCaches(comment.id, sanitizedBillId);

      logger.info('Comment created successfully', { 
        comment_id: comment.id,
        bill_id: sanitizedBillId,
        user_id: sanitizedUserId,
      });

      return comment;
    }, { service: 'EnhancedCommunityService', operation: 'createComment' });
  }

  /**
   * Get comment by ID with caching
   */
  async getCommentById(id: string): Promise<AsyncServiceResult<Comment | null>> {
    return safeAsync(async () => {
      // 1. Validate and sanitize input
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid comment ID');
      }

      const sanitizedId = this.inputSanitizer.sanitizeString(id);

      // 2. Check cache
      const cacheKey = cacheKeys.community('comment', sanitizedId);
      const cached = await cacheService.get<Comment>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for comment');
        return cached;
      }

      // 3. Query database with secure builder
      const [commentRow] = await secureQueryBuilderService
        .select()
        .from('comments')
        .where('id', '=', sanitizedId)
        .limit(1);

      if (!commentRow) return null;

      // 4. Sanitize output (XSS prevention)
      const comment = Comment.create({
        id: commentRow.id,
        billId: commentRow.bill_id,
        userId: commentRow.user_id,
        content: this.inputSanitizer.sanitizeHtml(commentRow.content),
        parentCommentId: commentRow.parent_id,
      });

      // 5. Cache result
      await cacheService.set(cacheKey, comment, CACHE_TTL.COMMUNITY);

      return comment;
    }, { service: 'EnhancedCommunityService', operation: 'getCommentById' });
  }

  /**
   * Get comments for a bill with caching
   */
  async getComments(filters: GetCommentsInput): Promise<AsyncServiceResult<Comment[]>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(GetCommentsSchema, filters);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedFilters = validation.data!;
      const sanitizedBillId = this.inputSanitizer.sanitizeString(validatedFilters.bill_id);

      // 2. Check cache
      const cacheKey = cacheKeys.list('comment', {
        bill_id: sanitizedBillId,
        parent_id: validatedFilters.parent_id,
        comment_type: validatedFilters.comment_type,
        highlighted: validatedFilters.highlighted,
        sortBy: validatedFilters.sortBy,
      });
      const cached = await cacheService.get<Comment[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for comments list');
        return cached;
      }

      // 3. Build query with secure builder
      const page = validatedFilters.page ? parseInt(validatedFilters.page) : 1;
      const limit = validatedFilters.limit ? parseInt(validatedFilters.limit) : 20;
      const offset = (page - 1) * limit;

      const conditions: any[] = [
        { column: 'bill_id', operator: '=', value: sanitizedBillId },
        { column: 'moderation_status', operator: '=', value: 'approved' },
      ];

      if (validatedFilters.parent_id) {
        conditions.push({
          column: 'parent_id',
          operator: '=',
          value: this.inputSanitizer.sanitizeString(validatedFilters.parent_id),
        });
      } else {
        conditions.push({
          column: 'parent_id',
          operator: 'IS',
          value: null,
        });
      }

      if (validatedFilters.comment_type) {
        conditions.push({
          column: 'comment_type',
          operator: '=',
          value: validatedFilters.comment_type,
        });
      }

      if (validatedFilters.highlighted) {
        conditions.push({
          column: 'is_highlighted',
          operator: '=',
          value: true,
        });
      }

      // 4. Execute query
      let query = secureQueryBuilderService.select().from('comments');
      
      conditions.forEach(condition => {
        query = query.where(condition.column, condition.operator, condition.value);
      });

      // Apply sorting
      const sortColumn = validatedFilters.sortBy === 'popular' ? 'like_count' :
                        validatedFilters.sortBy === 'endorsements' ? 'endorsement_count' :
                        validatedFilters.sortBy === 'controversial' ? 'reply_count' :
                        'created_at';
      
      const results = await query
        .orderBy(sortColumn, 'desc')
        .limit(limit)
        .offset(offset);

      // 5. Sanitize outputs (XSS prevention)
      const comments = results.map(row => 
        Comment.create({
          id: row.id,
          billId: row.bill_id,
          userId: row.user_id,
          content: this.inputSanitizer.sanitizeHtml(row.content),
          parentCommentId: row.parent_id,
        })
      );

      // 6. Cache results
      await cacheService.set(cacheKey, comments, CACHE_TTL.COMMUNITY);

      return comments;
    }, { service: 'EnhancedCommunityService', operation: 'getComments' });
  }

  /**
   * Update comment with validation and XSS prevention
   */
  async updateComment(id: string, updates: UpdateCommentInput, userId: string): Promise<AsyncServiceResult<Comment>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(UpdateCommentSchema, updates);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedUpdates = validation.data!;
      const sanitizedId = this.inputSanitizer.sanitizeString(id);
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);

      // 2. Sanitize content (XSS prevention)
      const sanitizedContent = this.inputSanitizer.sanitizeHtml(validatedUpdates.content);

      // 3. Execute update with authorization check
      const [updatedComment] = await secureQueryBuilderService
        .update('comments')
        .set({
          content: sanitizedContent,
          updated_at: new Date(),
          is_edited: true,
        })
        .where('id', '=', sanitizedId)
        .where('user_id', '=', sanitizedUserId) // Authorization check
        .returning();

      if (!updatedComment) {
        throw new Error('Comment not found or unauthorized');
      }

      const comment = Comment.create({
        id: updatedComment.id,
        billId: updatedComment.bill_id,
        userId: updatedComment.user_id,
        content: sanitizedContent,
        parentCommentId: updatedComment.parent_id,
      });

      // 4. Audit log
      await securityAuditService.logSecurityEvent({
        event_type: 'comment_updated',
        severity: 'low',
        user_id: sanitizedUserId,
        ip_address: 'internal',
        user_agent: 'enhanced-community-service',
        resource: `comment:${sanitizedId}`,
        action: 'update',
        success: true,
      });

      // 5. Invalidate caches
      await this.invalidateCommentCaches(sanitizedId, updatedComment.bill_id);

      return comment;
    }, { service: 'EnhancedCommunityService', operation: 'updateComment' });
  }

  /**
   * Delete comment with authorization
   */
  async deleteComment(id: string, userId: string, isAdmin: boolean = false): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      const sanitizedId = this.inputSanitizer.sanitizeString(id);
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);

      // Execute with transaction
      const result = await withTransaction(async () => {
        // Get comment first to check authorization and get bill_id
        const [comment] = await secureQueryBuilderService
          .select()
          .from('comments')
          .where('id', '=', sanitizedId)
          .limit(1);

        if (!comment) {
          throw new Error('Comment not found');
        }

        // Authorization check
        if (!isAdmin && comment.user_id !== sanitizedUserId) {
          throw new Error('Unauthorized to delete this comment');
        }

        // Soft delete
        await secureQueryBuilderService
          .update('comments')
          .set({
            is_deleted: true,
            deleted_at: new Date(),
            updated_at: new Date(),
          })
          .where('id', '=', sanitizedId);

        // Update bill engagement count
        await secureQueryBuilderService
          .update('bills')
          .set({
            comment_count: sql`GREATEST(comment_count - 1, 0)`,
            updated_at: new Date(),
          })
          .where('id', '=', comment.bill_id);

        return { success: true, billId: comment.bill_id };
      });

      // Audit log
      await securityAuditService.logSecurityEvent({
        event_type: 'comment_deleted',
        severity: 'medium',
        user_id: sanitizedUserId,
        ip_address: 'internal',
        user_agent: 'enhanced-community-service',
        resource: `comment:${sanitizedId}`,
        action: 'delete',
        success: true,
        details: {
          is_admin: isAdmin,
        },
      });

      // Invalidate caches
      await this.invalidateCommentCaches(sanitizedId, result.billId);

      return true;
    }, { service: 'EnhancedCommunityService', operation: 'deleteComment' });
  }

  // ============================================================================
  // COMMENT INTERACTIONS
  // ============================================================================

  /**
   * Like/unlike a comment
   */
  async toggleLike(data: LikeCommentInput, userId: string): Promise<AsyncServiceResult<{ liked: boolean }>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(LikeCommentSchema, data);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedData = validation.data!;
      const sanitizedCommentId = this.inputSanitizer.sanitizeString(validatedData.comment_id);
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);

      // 2. Execute with transaction
      const result = await withTransaction(async () => {
        // Check if like exists
        const [existingLike] = await secureQueryBuilderService
          .select()
          .from('comment_likes')
          .where('comment_id', '=', sanitizedCommentId)
          .where('user_id', '=', sanitizedUserId)
          .limit(1);

        let liked: boolean;

        if (existingLike) {
          // Unlike
          await secureQueryBuilderService
            .delete('comment_likes')
            .where('comment_id', '=', sanitizedCommentId)
            .where('user_id', '=', sanitizedUserId);

          await secureQueryBuilderService
            .update('comments')
            .set({ like_count: sql`GREATEST(like_count - 1, 0)` })
            .where('id', '=', sanitizedCommentId);

          liked = false;
        } else {
          // Like
          await secureQueryBuilderService
            .insert('comment_likes')
            .values({
              comment_id: sanitizedCommentId,
              user_id: sanitizedUserId,
              created_at: new Date(),
            });

          await secureQueryBuilderService
            .update('comments')
            .set({ like_count: sql`like_count + 1` })
            .where('id', '=', sanitizedCommentId);

          liked = true;
        }

        return { liked };
      });

      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        event_type: result.liked ? 'comment_liked' : 'comment_unliked',
        severity: 'low',
        user_id: sanitizedUserId,
        ip_address: 'internal',
        user_agent: 'enhanced-community-service',
        resource: `comment:${sanitizedCommentId}`,
        action: 'interact',
        success: true,
      });

      // 4. Invalidate caches
      await cacheService.delete(cacheKeys.community('comment', sanitizedCommentId));

      return result;
    }, { service: 'EnhancedCommunityService', operation: 'toggleLike' });
  }

  /**
   * Flag a comment for moderation
   */
  async flagComment(data: FlagCommentInput, userId: string): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(FlagCommentSchema, data);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedData = validation.data!;
      const sanitizedCommentId = this.inputSanitizer.sanitizeString(validatedData.comment_id);
      const sanitizedUserId = this.inputSanitizer.sanitizeString(userId);
      const sanitizedDetails = validatedData.details 
        ? this.inputSanitizer.sanitizeString(validatedData.details)
        : null;

      // 2. Execute with transaction
      await withTransaction(async () => {
        // Create flag record
        await secureQueryBuilderService
          .insert('comment_flags')
          .values({
            comment_id: sanitizedCommentId,
            user_id: sanitizedUserId,
            reason: validatedData.reason,
            details: sanitizedDetails,
            created_at: new Date(),
          });

        // Update comment moderation status
        await secureQueryBuilderService
          .update('comments')
          .set({
            moderation_status: 'flagged',
            flag_count: sql`flag_count + 1`,
            updated_at: new Date(),
          })
          .where('id', '=', sanitizedCommentId);
      });

      // 3. Audit log (high severity for flagged content)
      await securityAuditService.logSecurityEvent({
        event_type: 'comment_flagged',
        severity: 'high',
        user_id: sanitizedUserId,
        ip_address: 'internal',
        user_agent: 'enhanced-community-service',
        resource: `comment:${sanitizedCommentId}`,
        action: 'flag',
        success: true,
        details: {
          reason: validatedData.reason,
          has_details: !!sanitizedDetails,
        },
      });

      // 4. Invalidate caches
      await cacheService.delete(cacheKeys.community('comment', sanitizedCommentId));

      return true;
    }, { service: 'EnhancedCommunityService', operation: 'flagComment' });
  }

  // ============================================================================
  // MODERATION OPERATIONS
  // ============================================================================

  /**
   * Moderate a comment (admin/moderator only)
   */
  async moderateComment(data: ModerateCommentInput, moderatorId: string): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      // 1. Validate input
      const validation = await validateData(ModerateCommentSchema, data);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const validatedData = validation.data!;
      const sanitizedCommentId = this.inputSanitizer.sanitizeString(validatedData.comment_id);
      const sanitizedModeratorId = this.inputSanitizer.sanitizeString(moderatorId);
      const sanitizedNotes = validatedData.moderator_notes
        ? this.inputSanitizer.sanitizeString(validatedData.moderator_notes)
        : null;

      // 2. Execute update
      await secureQueryBuilderService
        .update('comments')
        .set({
          moderation_status: validatedData.status,
          moderated_by: sanitizedModeratorId,
          moderated_at: new Date(),
          moderator_notes: sanitizedNotes,
          updated_at: new Date(),
        })
        .where('id', '=', sanitizedCommentId);

      // 3. Audit log (high severity for moderation actions)
      await securityAuditService.logSecurityEvent({
        event_type: 'comment_moderated',
        severity: 'high',
        user_id: sanitizedModeratorId,
        ip_address: 'internal',
        user_agent: 'enhanced-community-service',
        resource: `comment:${sanitizedCommentId}`,
        action: 'moderate',
        success: true,
        details: {
          status: validatedData.status,
          has_notes: !!sanitizedNotes,
        },
      });

      // 4. Invalidate caches
      await cacheService.delete(cacheKeys.community('comment', sanitizedCommentId));

      return true;
    }, { service: 'EnhancedCommunityService', operation: 'moderateComment' });
  }
}

/**
 * Factory function to create enhanced community service instance
 */
export function createEnhancedCommunityService(): EnhancedCommunityService {
  return new EnhancedCommunityService();
}

/**
 * Singleton instance
 */
export const enhancedCommunityService = createEnhancedCommunityService();
