/**
 * Moderation Decision Handler Service
 * 
 * Handles decision processing, action application, and content modification.
 */

import { database as db } from '@shared/database';
import { comments, 
  content_report, 
  moderation_action,
  users
 } from '@shared/shared/schema';
import { eq, count, desc, sql, and, gte, inArray } from 'drizzle-orm';
import { logger  } from '@shared/core';
import { 
  ModerationItem, 
  ModerationActionRecord, 
  BulkModerationOperation,
  PaginationInfo
} from './types.js';
import { moderationQueueService } from './moderation-queue.service.js';

export class ModerationDecisionService {
  private static instance: ModerationDecisionService;

  public static getInstance(): ModerationDecisionService {
    if (!ModerationDecisionService.instance) {
      ModerationDecisionService.instance = new ModerationDecisionService();
    }
    return ModerationDecisionService.instance;
  }

  /**
   * Reviews a content report and applies the appropriate moderation action
   */
  async reviewReport(
    report_id: number,
    moderatorId: string,
    decision: 'resolve' | 'dismiss' | 'escalate',
    actionType: 'warn' | 'hide' | 'delete' | 'ban_user' | 'verify' | 'highlight',
    resolutionNotes: string
  ): Promise<{
    success: boolean;
    message: string;
    report?: ModerationItem;
  }> {
    try {
      // Fetch the report to be reviewed
      const [report] = await db
        .select()
        .from(content_report)
        .where(eq(content_report.id, report_id));

      if (!report) {
        return {
          success: false,
          message: 'Report not found'
        };
      }

      // Update the report with the review decision
      await db
        .update(content_report)
        .set({
          status: decision === 'resolve' ? 'resolved' : 
                  decision === 'dismiss' ? 'dismissed' : 'escalated',
          reviewedBy: moderatorId,
          reviewedAt: new Date(),
          resolutionNotes: resolutionNotes,
          updated_at: new Date()
        })
        .where(eq(content_report.id, report_id));

      // Record the moderation action
      await db.insert(moderation_action).values({
        content_type: report.content_type,
        content_id: report.content_id,
        actionType: actionType,
        reason: resolutionNotes,
        moderatorId: moderatorId,
        report_id: report_id
      });

      // Apply the actual moderation action to the content
      if (decision === 'resolve') {
        await this.applyModerationAction(
          report.content_type,
          report.content_id,
          report.reportedBy,
          actionType
        );
      }

      // Fetch the updated report
      const updatedReport = await moderationQueueService.getReportById(report_id);

      return {
        success: true,
        message: `Report ${decision}d successfully`,
        report: updatedReport || undefined
      };
    } catch (error) {
      logger.error('Error reviewing report:', {
        component: 'ModerationDecision',
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        message: 'Failed to review report'
      };
    }
  }

  /**
   * Performs bulk moderation operations on multiple reports
   */
  async bulkModerateReports(
    operation: BulkModerationOperation
  ): Promise<{ 
    success: boolean; 
    message: string; 
    processedCount: number;
    failedIds: number[];
  }> {
    try {
      let processedCount = 0;
      const failedIds: number[] = [];

      for (const report_id of operation.reportIds) {
        try {
          const [report] = await db
            .select()
            .from(content_report)
            .where(eq(content_report.id, report_id));

          if (!report) {
            failedIds.push(report_id);
            continue;
          }

          // Update report status
          await db
            .update(content_report)
            .set({
              status: operation.action === 'resolve' ? 'resolved' :
                      operation.action === 'dismiss' ? 'dismissed' :
                      operation.action === 'escalate' ? 'escalated' : 'resolved',
              reviewedBy: operation.moderatorId,
              reviewedAt: new Date(),
              resolutionNotes: operation.resolutionNotes,
              updated_at: new Date()
            })
            .where(eq(content_report.id, report_id));

          // Record action
          const actionType = operation.action === 'delete' ? 'delete' : 'hide';
          await db.insert(moderation_action).values({
            content_type: report.content_type,
            content_id: report.content_id,
            actionType: actionType,
            reason: operation.resolutionNotes,
            moderatorId: operation.moderatorId,
            report_id: report_id
          });

          // Apply action to content if resolving
          if (operation.action === 'resolve' || operation.action === 'delete') {
            await this.applyModerationAction(
              report.content_type,
              report.content_id,
              report.reportedBy,
              actionType
            );
          }

          processedCount++;
        } catch (itemError) {
          logger.error('Error processing bulk item:', {
            component: 'ModerationDecision',
            report_id,
            error: itemError instanceof Error ? itemError.message : String(itemError)
          });
          failedIds.push(report_id);
        }
      }

      return {
        success: failedIds.length === 0,
        message: `Bulk moderation completed. ${processedCount}/${operation.reportIds.length} reports processed.`,
        processedCount,
        failedIds
      };
    } catch (error) {
      logger.error('Error performing bulk moderation:', {
        component: 'ModerationDecision',
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        message: 'Failed to perform bulk moderation',
        processedCount: 0,
        failedIds: operation.reportIds
      };
    }
  }

  /**
   * Retrieves the complete moderation history for specific content or system-wide
   */
  async getModerationHistory(
    content_type?: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency',
    content_id?: number,
    page = 1,
    limit = 20
  ): Promise<{
    actions: ModerationActionRecord[];
    pagination: PaginationInfo;
  }> {
    try {
      const offset = (page - 1) * limit;

      const conditions = [];

      if (content_type && content_id) {
        conditions.push(eq(moderation_action.content_type, content_type));
        conditions.push(eq(moderation_action.content_id, content_id));
      }

      // Fetch actions with moderator details
      const actions = await db
        .select({
          id: moderation_action.id,
          content_type: moderation_action.content_type,
          content_id: moderation_action.content_id,
          actionType: moderation_action.actionType,
          reason: moderation_action.reason,
          moderatorId: moderation_action.moderatorId,
          moderatorName: users.name,
          created_at: moderation_action.created_at
        })
        .from(moderation_action)
        .innerJoin(user, eq(moderation_action.moderatorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(moderation_action.created_at))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countResult = await db
        .select({ count: count() })
        .from(moderation_action)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count ?? 0;

      return {
        actions: actions.map(action => ({
          id: action.id,
          content_type: action.content_type,
          content_id: action.content_id,
          actionType: action.actionType,
          reason: action.reason,
          moderatorId: action.moderatorId,
          moderatorName: action.moderatorName,
          created_at: action.created_at
        })),
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching moderation history:', {
        component: 'ModerationDecision',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Applies the moderation action to the actual content
   */
  private async applyModerationAction(
    content_type: string,
    content_id: number,
    reportedBy: string,
    actionType: 'warn' | 'hide' | 'delete' | 'ban_user' | 'verify' | 'highlight'
  ): Promise<void> {
    try {
      switch (actionType) {
        case 'delete':
          if (content_type === 'comment') {
            await db
              .update(comments)
              .set({
                content: '[Content removed by moderator]',
                is_deleted: true,
                updated_at: new Date()
              })
              .where(eq(comments.id, content_id));
          }
          break;

        case 'hide':
          if (content_type === 'comment') {
            await db
              .update(comments)
              .set({ 
                content: '[Comment hidden by moderator]',
                is_deleted: true,
                updated_at: new Date()
              })
              .where(eq(comments.id, content_id));
          }
          break;

        case 'warn':
          if (content_type === 'comment') {
            const [comment] = await db
              .select()
              .from(comments)
              .where(eq(comments.id, content_id));

            if (comment && !comment.is_deleted) {
              await db
                .update(comments)
                .set({
                  content: `[⚠️ Moderator Warning: This comment was flagged for policy violation]\n\n${comment.content}`,
                  updated_at: new Date()
                })
                .where(eq(comments.id, content_id));
            }
          }
          break;

        case 'ban_user':
          // In a full implementation, this would:
          // 1. Mark the user as banned
          // 2. Hide/delete all their content
          // 3. Prevent them from posting
          // For now, we just log the action
          logger.warn('User ban action required:', { component: 'ModerationDecision',
            user_id: reportedBy,
            content_type,
            content_id
           });
          
          // Hide the specific content
          if (content_type === 'comment') {
            await db
              .update(comments)
              .set({ 
                content: '[Content removed - user banned for policy violations]',
                is_deleted: true,
                updated_at: new Date()
              })
              .where(eq(comments.id, content_id));
          }
          break;

        case 'verify':
          // Mark content as verified/endorsed by moderators
          if (content_type === 'comment') {
            await db
              .update(comments)
              .set({ 
                is_verified: true,
                updated_at: new Date()
              })
              .where(eq(comments.id, content_id));
          }
          break;

        case 'highlight':
          // In a full implementation, this might add a special badge
          // or increase visibility of quality content
          logger.info('Content highlighted:', {
            component: 'ModerationDecision',
            content_type,
            content_id
          });
          break;

        default:
          logger.warn('Unknown action type:', {
            component: 'ModerationDecision',
            actionType
          });
      }
    } catch (error) {
      logger.error('Error applying moderation action:', {
        component: 'ModerationDecision',
        content_type,
        content_id,
        actionType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const moderationDecisionService = ModerationDecisionService.getInstance();
