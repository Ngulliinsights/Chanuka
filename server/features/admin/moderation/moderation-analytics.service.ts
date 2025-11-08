/**
 * Moderation Analytics Service
 * 
 * Handles analytics, statistics, and reporting for the moderation system.
 */

import { database as db } from '@shared/database';
import { bill, 
  comments, 
  users, 
  content_report, 
  moderation_action
 } from '../shared/schema';
import { eq, count, desc, sql, and, gte, inArray } from 'drizzle-orm';
import { logger  } from '../../../../shared/core/src/index.js';
import { ContentAnalytics } from './types.js';

export class ModerationAnalyticsService {
  private static instance: ModerationAnalyticsService;

  public static getInstance(): ModerationAnalyticsService {
    if (!ModerationAnalyticsService.instance) {
      ModerationAnalyticsService.instance = new ModerationAnalyticsService();
    }
    return ModerationAnalyticsService.instance;
  }

  /**
   * Retrieves comprehensive moderation statistics for analytics dashboards
   */
  async getModerationStats(
    start_date: Date,
    end_date: Date
  ): Promise<{
    reportsCreated: number;
    reportsResolved: number;
    reportsPending: number;
    averageResolutionTime: number;
    reportsByType: { type: string; count: number }[];
    actionsByType: { type: string; count: number }[];
    moderatorActivity: {
      moderatorId: string;
      moderatorName: string;
      review_count: number;
      averageReviewTime: number;
    }[];
    content_typeBreakdown: { content_type: string; count: number }[];
    severityBreakdown: { severity: string; count: number }[];
  }> {
    try {
      // Count reports created in the time period
      const [reportsCreatedResult] = await db
        .select({ count: count() })
        .from(content_report)
        .where(
          and(
            gte(content_report.created_at, start_date),
            sql`${content_report.created_at} <= ${ end_date }`
          )
        );

      // Count reports resolved in the time period
      const [reportsResolvedResult] = await db
        .select({ count: count() })
        .from(content_report)
        .where(
          and(
            eq(content_report.status, 'resolved'),
            sql`${content_report.reviewedAt} IS NOT NULL`,
            gte(content_report.reviewedAt, start_date),
            sql`${content_report.reviewedAt} <= ${ end_date }`
          )
        );

      // Count currently pending reports
      const [reportsPendingResult] = await db
        .select({ count: count() })
        .from(content_report)
        .where(eq(content_report.status, 'pending'));

      // Calculate average resolution time
      const averageResolutionTime = await this.calculateAverageResolutionTime(start_date, end_date);

      // Group reports by type
      const reportsByType = await this.getReportsByType(start_date, end_date);

      // Group moderation actions by type
      const actionsByType = await this.getActionsByType(start_date, end_date);

      // Get moderator activity
      const moderatorActivity = await this.getModeratorActivity(start_date, end_date);

      // Content type breakdown
      const content_typeBreakdown = await this.getContentTypeBreakdown(start_date, end_date);

      // Severity breakdown
      const severityBreakdown = await this.getSeverityBreakdown(start_date, end_date);

      return {
        reportsCreated: Number(reportsCreatedResult.count),
        reportsResolved: Number(reportsResolvedResult.count),
        reportsPending: Number(reportsPendingResult.count),
        averageResolutionTime,
        reportsByType,
        actionsByType,
        moderatorActivity,
        content_typeBreakdown,
        severityBreakdown
      };
    } catch (error) {
      logger.error('Error fetching moderation stats:', {
        component: 'ModerationAnalytics',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generates comprehensive analytics about content moderation performance
   */
  async getContentAnalytics(): Promise<ContentAnalytics> {
    try {
      // Get total content across the platform
      const [totalBills] = await db.select({ count: count() }).from(bill);
      const [totalComments] = await db.select({ count: count() }).from(comments);
      const totalContent = Number(totalBills.count) + Number(totalComments.count);

      // Get report counts by status
      const [pendingReports] = await db
        .select({ count: count() })
        .from(content_report)
        .where(eq(content_report.status, 'pending'));

      const [reviewedReports] = await db
        .select({ count: count() })
        .from(content_report)
        .where(eq(content_report.status, 'reviewed'));

      const [resolvedReports] = await db
        .select({ count: count() })
        .from(content_report)
        .where(eq(content_report.status, 'resolved'));

      const [dismissedReports] = await db
        .select({ count: count() })
        .from(content_report)
        .where(eq(content_report.status, 'dismissed'));

      const [escalatedReports] = await db
        .select({ count: count() })
        .from(content_report)
        .where(eq(content_report.status, 'escalated'));

      // Calculate average review time
      const averageReviewTime = await this.calculateOverallAverageReviewTime();

      // Get top moderators
      const topModerators = await this.getTopModerators();

      // Calculate content quality score
      const totalReports = Number(pendingReports.count) + 
                          Number(reviewedReports.count) + 
                          Number(resolvedReports.count) +
                          Number(dismissedReports.count) +
                          Number(escalatedReports.count);
      
      const contentQualityScore = totalContent > 0
        ? ((totalContent - totalReports) / totalContent) * 100
        : 100;

      // Get report reasons breakdown
      const reportReasons = await this.getReportReasonsBreakdown();

      return {
        totalContent,
        pendingModeration: Number(pendingReports.count),
        reviewedContent: Number(reviewedReports.count),
        resolvedContent: Number(resolvedReports.count),
        dismissedContent: Number(dismissedReports.count),
        escalatedContent: Number(escalatedReports.count),
        averageReviewTime,
        topModerators,
        contentQualityScore,
        reportReasons
      };
    } catch (error) {
      logger.error('Error fetching content analytics:', {
        component: 'ModerationAnalytics',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Private helper methods

  private async calculateAverageResolutionTime(start_date: Date, end_date: Date): Promise<number> {
    const resolvedReports = await db
      .select({
        created_at: content_report.created_at,
        reviewedAt: content_report.reviewedAt
      })
      .from(content_report)
      .where(
        and(
          eq(content_report.status, 'resolved'),
          sql`${content_report.reviewedAt} IS NOT NULL`,
          gte(content_report.reviewedAt, start_date),
          sql`${content_report.reviewedAt} <= ${ end_date }`
        )
      );

    return resolvedReports.length > 0
      ? resolvedReports.reduce((sum, report) => {
        if (!report.reviewedAt || !report.created_at) return sum;
        const resolutionTime = report.reviewedAt.getTime() - report.created_at.getTime();
        return sum + resolutionTime;
      }, 0) / resolvedReports.length / (1000 * 60 * 60) // Convert to hours
      : 0;
  }

  private async getReportsByType(start_date: Date, end_date: Date) {
    const reportsByTypeData = await db
      .select({
        type: content_report.reportType,
        count: count()
      })
      .from(content_report)
      .where(
        and(
          gte(content_report.created_at, start_date),
          sql`${content_report.created_at} <= ${ end_date }`
        )
      )
      .groupBy(content_report.reportType)
      .orderBy(desc(sql`count(*)`));

    return reportsByTypeData.map(item => ({
      type: item.type,
      count: Number(item.count)
    }));
  }

  private async getActionsByType(start_date: Date, end_date: Date) {
    const actionsByTypeData = await db
      .select({
        type: moderation_action.actionType,
        count: count()
      })
      .from(moderation_action)
      .where(
        and(
          gte(moderation_action.created_at, start_date),
          sql`${moderation_action.created_at} <= ${ end_date }`
        )
      )
      .groupBy(moderation_action.actionType)
      .orderBy(desc(sql`count(*)`));

    return actionsByTypeData.map(item => ({
      type: item.type,
      count: Number(item.count)
    }));
  }

  private async getModeratorActivity(start_date: Date, end_date: Date) {
    const moderatorActivityData = await db
      .select({
        moderatorId: moderation_action.moderatorId,
        review_count: count()
      })
      .from(moderation_action)
      .where(
        and(
          gte(moderation_action.created_at, start_date),
          sql`${moderation_action.created_at} <= ${ end_date }`
        )
      )
      .groupBy(moderation_action.moderatorId)
      .orderBy(desc(sql`count(*)`));

    const moderatorIds = moderatorActivityData.map(m => m.moderatorId);
    const moderatorDetails = moderatorIds.length > 0
      ? await db
        .select({ id: users.id, name: users.name })
        .from(user)
        .where(inArray(users.id, moderatorIds))
      : [];

    return await Promise.all(
      moderatorActivityData.map(async (mod) => {
        const moderator = moderatorDetails.find(m => m.id === mod.moderatorId);

        // Calculate average review time for this moderator
        const moderatorReports = await db
          .select({
            created_at: content_report.created_at,
            reviewedAt: content_report.reviewedAt
          })
          .from(content_report)
          .where(
            and(
              eq(content_report.reviewedBy, mod.moderatorId),
              sql`${content_report.reviewedAt} IS NOT NULL`,
              gte(content_report.reviewedAt, start_date),
              sql`${content_report.reviewedAt} <= ${ end_date }`
            )
          );

        const averageReviewTime = moderatorReports.length > 0
          ? moderatorReports.reduce((sum, report) => {
            if (!report.reviewedAt || !report.created_at) return sum;
            const reviewTime = report.reviewedAt.getTime() - report.created_at.getTime();
            return sum + reviewTime;
          }, 0) / moderatorReports.length / (1000 * 60 * 60) // Convert to hours
          : 0;

        return {
          moderatorId: mod.moderatorId,
          moderatorName: moderator?.name || 'Unknown',
          review_count: Number(mod.review_count),
          averageReviewTime
        };
      })
    );
  }

  private async getContentTypeBreakdown(start_date: Date, end_date: Date) {
    const content_typeBreakdownData = await db
      .select({
        content_type: content_report.content_type,
        count: count()
      })
      .from(content_report)
      .where(
        and(
          gte(content_report.created_at, start_date),
          sql`${content_report.created_at} <= ${ end_date }`
        )
      )
      .groupBy(content_report.content_type);

    return content_typeBreakdownData.map(item => ({
      content_type: item.content_type,
      count: Number(item.count)
    }));
  }

  private async getSeverityBreakdown(start_date: Date, end_date: Date) {
    const severityBreakdownData = await db
      .select({
        severity: content_report.severity,
        count: count()
      })
      .from(content_report)
      .where(
        and(
          gte(content_report.created_at, start_date),
          sql`${content_report.created_at} <= ${ end_date }`
        )
      )
      .groupBy(content_report.severity);

    return severityBreakdownData.map(item => ({
      severity: item.severity,
      count: Number(item.count)
    }));
  }

  private async calculateOverallAverageReviewTime(): Promise<number> {
    const reviewedItems = await db
      .select({
        created_at: content_report.created_at,
        reviewedAt: content_report.reviewedAt
      })
      .from(content_report)
      .where(sql`${content_report.reviewedAt} IS NOT NULL`);

    return reviewedItems.length > 0
      ? reviewedItems.reduce((sum, item) => {
        if (!item.reviewedAt || !item.created_at) return sum;
        const reviewTime = item.reviewedAt.getTime() - item.created_at.getTime();
        return sum + reviewTime;
      }, 0) / reviewedItems.length / (1000 * 60 * 60) // Convert to hours
      : 0;
  }

  private async getTopModerators() {
    const topModeratorsData = await db
      .select({
        moderatorId: moderation_action.moderatorId,
        actionCount: count()
      })
      .from(moderation_action)
      .groupBy(moderation_action.moderatorId)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const moderatorIds = topModeratorsData.map(m => m.moderatorId);
    const moderatorDetails = moderatorIds.length > 0
      ? await db
        .select({ id: users.id, name: users.name })
        .from(user)
        .where(inArray(users.id, moderatorIds))
      : [];

    return topModeratorsData.map(mod => {
      const moderator = moderatorDetails.find(m => m.id === mod.moderatorId);
      return {
        id: mod.moderatorId,
        name: moderator?.name || 'Unknown',
        actionsCount: Number(mod.actionCount)
      };
    });
  }

  private async getReportReasonsBreakdown() {
    const reportReasonsData = await db
      .select({
        reportType: content_report.reportType,
        reportCount: count()
      })
      .from(content_report)
      .groupBy(content_report.reportType)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return reportReasonsData.map(item => ({
      reason: item.reportType,
      count: Number(item.reportCount)
    }));
  }
}

export const moderationAnalyticsService = ModerationAnalyticsService.getInstance();