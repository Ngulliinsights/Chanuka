/**
 * Moderation Decision Handler Service
 * 
 * Handles decision processing, action application, and content modification.
 */

import { database as db } from '../../../../shared/database/connection';
import { 
  billComment, 
  contentReport, 
  moderationAction,
  user
} from '../../../../shared/schema';
import { eq, count, desc, sql, and, gte, inArray } from 'drizzle-orm';
import { logger } from '../../../../shared/core/index.js';
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
    reportId: number,
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
        .from(contentReport)
        .where(eq(contentReport.id, reportId));

      if (!report) {
        return {
          success: false,
          message: 'Report not found'
        };
      }

      // Update the report with the review decision
      await db
        .update(contentReport)
        .set({
          status: decision === 'resolve' ? 'resolved' : 
                  decision === 'dismiss' ? 'dismissed' : 'escalated',
          reviewedBy: moderatorId,
          reviewedAt: new Date(),
          resolutionNotes: resolutionNotes,
          updatedAt: new Date()
        })
        .where(eq(contentReport.id, reportId));

      // Record the moderation action
      await db.insert(moderationAction).values({
        contentType: report.contentType,
        contentId: report.contentId,
        actionType: actionType,
        reason: resolutionNotes,
        moderatorId: moderatorId,
        reportId: reportId
      });

      // Apply the actual moderation action to the content
      if (decision === 'resolve') {
        await this.applyModerationAction(
          report.contentType,
          report.contentId,
          report.reportedBy,
          actionType
        );
      }

      // Fetch the updated report
      const updatedReport = await moderationQueueService.getReportById(reportId);

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

      for (const reportId of operation.reportIds) {
        try {
          const [report] = await db
            .select()
            .from(contentReport)
            .where(eq(contentReport.id, reportId));

          if (!report) {
            failedIds.push(reportId);
            continue;
          }

          // Update report status
          await db
            .update(contentReport)
            .set({
              status: operation.action === 'resolve' ? 'resolved' :
                      operation.action === 'dismiss' ? 'dismissed' :
                      operation.action === 'escalate' ? 'escalated' : 'resolved',
              reviewedBy: operation.moderatorId,
              reviewedAt: new Date(),
              resolutionNotes: operation.resolutionNotes,
              updatedAt: new Date()
            })
            .where(eq(contentReport.id, reportId));

          // Record action
          const actionType = operation.action === 'delete' ? 'delete' : 'hide';
          await db.insert(moderationAction).values({
            contentType: report.contentType,
            contentId: report.contentId,
            actionType: actionType,
            reason: operation.resolutionNotes,
            moderatorId: operation.moderatorId,
            reportId: reportId
          });

          // Apply action to content if resolving
          if (operation.action === 'resolve' || operation.action === 'delete') {
            await this.applyModerationAction(
              report.contentType,
              report.contentId,
              report.reportedBy,
              actionType
            );
          }

          processedCount++;
        } catch (itemError) {
          logger.error('Error processing bulk item:', {
            component: 'ModerationDecision',
            reportId,
            error: itemError instanceof Error ? itemError.message : String(itemError)
          });
          failedIds.push(reportId);
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
    contentType?: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency',
    contentId?: number,
    page = 1,
    limit = 20
  ): Promise<{
    actions: ModerationActionRecord[];
    pagination: PaginationInfo;
  }> {
    try {
      const offset = (page - 1) * limit;

      const conditions = [];

      if (contentType && contentId) {
        conditions.push(eq(moderationAction.contentType, contentType));
        conditions.push(eq(moderationAction.contentId, contentId));
      }

      // Fetch actions with moderator details
      const actions = await db
        .select({
          id: moderationAction.id,
          contentType: moderationAction.contentType,
          contentId: moderationAction.contentId,
          actionType: moderationAction.actionType,
          reason: moderationAction.reason,
          moderatorId: moderationAction.moderatorId,
          moderatorName: user.name,
          createdAt: moderationAction.createdAt
        })
        .from(moderationAction)
        .innerJoin(user, eq(moderationAction.moderatorId, user.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(moderationAction.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countResult = await db
        .select({ count: count() })
        .from(moderationAction)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count ?? 0;

      return {
        actions: actions.map(action => ({
          id: action.id,
          contentType: action.contentType,
          contentId: action.contentId,
          actionType: action.actionType,
          reason: action.reason,
          moderatorId: action.moderatorId,
          moderatorName: action.moderatorName,
          createdAt: action.createdAt
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
    contentType: string,
    contentId: number,
    reportedBy: string,
    actionType: 'warn' | 'hide' | 'delete' | 'ban_user' | 'verify' | 'highlight'
  ): Promise<void> {
    try {
      switch (actionType) {
        case 'delete':
          if (contentType === 'comment') {
            await db
              .update(billComment)
              .set({
                content: '[Content removed by moderator]',
                isDeleted: true,
                updatedAt: new Date()
              })
              .where(eq(billComment.id, contentId));
          }
          break;

        case 'hide':
          if (contentType === 'comment') {
            await db
              .update(billComment)
              .set({ 
                content: '[Comment hidden by moderator]',
                isDeleted: true,
                updatedAt: new Date()
              })
              .where(eq(billComment.id, contentId));
          }
          break;

        case 'warn':
          if (contentType === 'comment') {
            const [comment] = await db
              .select()
              .from(billComment)
              .where(eq(billComment.id, contentId));

            if (comment && !comment.isDeleted) {
              await db
                .update(billComment)
                .set({
                  content: `[⚠️ Moderator Warning: This comment was flagged for policy violation]\n\n${comment.content}`,
                  updatedAt: new Date()
                })
                .where(eq(billComment.id, contentId));
            }
          }
          break;

        case 'ban_user':
          // In a full implementation, this would:
          // 1. Mark the user as banned
          // 2. Hide/delete all their content
          // 3. Prevent them from posting
          // For now, we just log the action
          logger.warn('User ban action required:', {
            component: 'ModerationDecision',
            userId: reportedBy,
            contentType,
            contentId
          });
          
          // Hide the specific content
          if (contentType === 'comment') {
            await db
              .update(billComment)
              .set({ 
                content: '[Content removed - user banned for policy violations]',
                isDeleted: true,
                updatedAt: new Date()
              })
              .where(eq(billComment.id, contentId));
          }
          break;

        case 'verify':
          // Mark content as verified/endorsed by moderators
          if (contentType === 'comment') {
            await db
              .update(billComment)
              .set({ 
                isVerified: true,
                updatedAt: new Date()
              })
              .where(eq(billComment.id, contentId));
          }
          break;

        case 'highlight':
          // In a full implementation, this might add a special badge
          // or increase visibility of quality content
          logger.info('Content highlighted:', {
            component: 'ModerationDecision',
            contentType,
            contentId
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
        contentType,
        contentId,
        actionType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const moderationDecisionService = ModerationDecisionService.getInstance();