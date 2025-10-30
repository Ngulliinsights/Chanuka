/**
 * Moderation Analytics Service
 * 
 * Handles analytics, statistics, and reporting for the moderation system.
 */

import { database as db } from '../../../../shared/database/connection';
import { 
  bill, 
  billComment, 
  user, 
  contentReport, 
  moderationAction
} from '../../../../shared/schema';
import { eq, count, desc, sql, and, gte, inArray } from 'drizzle-orm';
import { logger } from '../../../../shared/core/index.js';
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
    startDate: Date,
    endDate: Date
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
      reviewCount: number;
      averageReviewTime: number;
    }[];
    contentTypeBreakdown: { contentType: string; count: number }[];
    severityBreakdown: { severity: string; count: number }[];
  }> {
    try {
      // Count reports created in the time period
      const [reportsCreatedResult] = await db
        .select({ count: count() })
        .from(contentReport)
        .where(
          and(
            gte(contentReport.createdAt, startDate),
            sql`${contentReport.createdAt} <= ${endDate}`
          )
        );

      // Count reports resolved in the time period
      const [reportsResolvedResult] = await db
        .select({ count: count() })
        .from(contentReport)
        .where(
          and(
            eq(contentReport.status, 'resolved'),
            sql`${contentReport.reviewedAt} IS NOT NULL`,
            gte(contentReport.reviewedAt, startDate),
            sql`${contentReport.reviewedAt} <= ${endDate}`
          )
        );

      // Count currently pending reports
      const [reportsPendingResult] = await db
        .select({ count: count() })
        .from(contentReport)
        .where(eq(contentReport.status, 'pending'));

      // Calculate average resolution time
      const averageResolutionTime = await this.calculateAverageResolutionTime(startDate, endDate);

      // Group reports by type
      const reportsByType = await this.getReportsByType(startDate, endDate);

      // Group moderation actions by type
      const actionsByType = await this.getActionsByType(startDate, endDate);

      // Get moderator activity
      const moderatorActivity = await this.getModeratorActivity(startDate, endDate);

      // Content type breakdown
      const contentTypeBreakdown = await this.getContentTypeBreakdown(startDate, endDate);

      // Severity breakdown
      const severityBreakdown = await this.getSeverityBreakdown(startDate, endDate);

      return {
        reportsCreated: Number(reportsCreatedResult.count),
        reportsResolved: Number(reportsResolvedResult.count),
        reportsPending: Number(reportsPendingResult.count),
        averageResolutionTime,
        reportsByType,
        actionsByType,
        moderatorActivity,
        contentTypeBreakdown,
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
      const [totalComments] = await db.select({ count: count() }).from(billComment);
      const totalContent = Number(totalBills.count) + Number(totalComments.count);

      // Get report counts by status
      const [pendingReports] = await db
        .select({ count: count() })
        .from(contentReport)
        .where(eq(contentReport.status, 'pending'));

      const [reviewedReports] = await db
        .select({ count: count() })
        .from(contentReport)
        .where(eq(contentReport.status, 'reviewed'));

      const [resolvedReports] = await db
        .select({ count: count() })
        .from(contentReport)
        .where(eq(contentReport.status, 'resolved'));

      const [dismissedReports] = await db
        .select({ count: count() })
        .from(contentReport)
        .where(eq(contentReport.status, 'dismissed'));

      const [escalatedReports] = await db
        .select({ count: count() })
        .from(contentReport)
        .where(eq(contentReport.status, 'escalated'));

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

  private async calculateAverageResolutionTime(startDate: Date, endDate: Date): Promise<number> {
    const resolvedReports = await db
      .select({
        createdAt: contentReport.createdAt,
        reviewedAt: contentReport.reviewedAt
      })
      .from(contentReport)
      .where(
        and(
          eq(contentReport.status, 'resolved'),
          sql`${contentReport.reviewedAt} IS NOT NULL`,
          gte(contentReport.reviewedAt, startDate),
          sql`${contentReport.reviewedAt} <= ${endDate}`
        )
      );

    return resolvedReports.length > 0
      ? resolvedReports.reduce((sum, report) => {
        if (!report.reviewedAt || !report.createdAt) return sum;
        const resolutionTime = report.reviewedAt.getTime() - report.createdAt.getTime();
        return sum + resolutionTime;
      }, 0) / resolvedReports.length / (1000 * 60 * 60) // Convert to hours
      : 0;
  }

  private async getReportsByType(startDate: Date, endDate: Date) {
    const reportsByTypeData = await db
      .select({
        type: contentReport.reportType,
        count: count()
      })
      .from(contentReport)
      .where(
        and(
          gte(contentReport.createdAt, startDate),
          sql`${contentReport.createdAt} <= ${endDate}`
        )
      )
      .groupBy(contentReport.reportType)
      .orderBy(desc(sql`count(*)`));

    return reportsByTypeData.map(item => ({
      type: item.type,
      count: Number(item.count)
    }));
  }

  private async getActionsByType(startDate: Date, endDate: Date) {
    const actionsByTypeData = await db
      .select({
        type: moderationAction.actionType,
        count: count()
      })
      .from(moderationAction)
      .where(
        and(
          gte(moderationAction.createdAt, startDate),
          sql`${moderationAction.createdAt} <= ${endDate}`
        )
      )
      .groupBy(moderationAction.actionType)
      .orderBy(desc(sql`count(*)`));

    return actionsByTypeData.map(item => ({
      type: item.type,
      count: Number(item.count)
    }));
  }

  private async getModeratorActivity(startDate: Date, endDate: Date) {
    const moderatorActivityData = await db
      .select({
        moderatorId: moderationAction.moderatorId,
        reviewCount: count()
      })
      .from(moderationAction)
      .where(
        and(
          gte(moderationAction.createdAt, startDate),
          sql`${moderationAction.createdAt} <= ${endDate}`
        )
      )
      .groupBy(moderationAction.moderatorId)
      .orderBy(desc(sql`count(*)`));

    const moderatorIds = moderatorActivityData.map(m => m.moderatorId);
    const moderatorDetails = moderatorIds.length > 0
      ? await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, moderatorIds))
      : [];

    return await Promise.all(
      moderatorActivityData.map(async (mod) => {
        const moderator = moderatorDetails.find(m => m.id === mod.moderatorId);

        // Calculate average review time for this moderator
        const moderatorReports = await db
          .select({
            createdAt: contentReport.createdAt,
            reviewedAt: contentReport.reviewedAt
          })
          .from(contentReport)
          .where(
            and(
              eq(contentReport.reviewedBy, mod.moderatorId),
              sql`${contentReport.reviewedAt} IS NOT NULL`,
              gte(contentReport.reviewedAt, startDate),
              sql`${contentReport.reviewedAt} <= ${endDate}`
            )
          );

        const averageReviewTime = moderatorReports.length > 0
          ? moderatorReports.reduce((sum, report) => {
            if (!report.reviewedAt || !report.createdAt) return sum;
            const reviewTime = report.reviewedAt.getTime() - report.createdAt.getTime();
            return sum + reviewTime;
          }, 0) / moderatorReports.length / (1000 * 60 * 60) // Convert to hours
          : 0;

        return {
          moderatorId: mod.moderatorId,
          moderatorName: moderator?.name || 'Unknown',
          reviewCount: Number(mod.reviewCount),
          averageReviewTime
        };
      })
    );
  }

  private async getContentTypeBreakdown(startDate: Date, endDate: Date) {
    const contentTypeBreakdownData = await db
      .select({
        contentType: contentReport.contentType,
        count: count()
      })
      .from(contentReport)
      .where(
        and(
          gte(contentReport.createdAt, startDate),
          sql`${contentReport.createdAt} <= ${endDate}`
        )
      )
      .groupBy(contentReport.contentType);

    return contentTypeBreakdownData.map(item => ({
      contentType: item.contentType,
      count: Number(item.count)
    }));
  }

  private async getSeverityBreakdown(startDate: Date, endDate: Date) {
    const severityBreakdownData = await db
      .select({
        severity: contentReport.severity,
        count: count()
      })
      .from(contentReport)
      .where(
        and(
          gte(contentReport.createdAt, startDate),
          sql`${contentReport.createdAt} <= ${endDate}`
        )
      )
      .groupBy(contentReport.severity);

    return severityBreakdownData.map(item => ({
      severity: item.severity,
      count: Number(item.count)
    }));
  }

  private async calculateOverallAverageReviewTime(): Promise<number> {
    const reviewedItems = await db
      .select({
        createdAt: contentReport.createdAt,
        reviewedAt: contentReport.reviewedAt
      })
      .from(contentReport)
      .where(sql`${contentReport.reviewedAt} IS NOT NULL`);

    return reviewedItems.length > 0
      ? reviewedItems.reduce((sum, item) => {
        if (!item.reviewedAt || !item.createdAt) return sum;
        const reviewTime = item.reviewedAt.getTime() - item.createdAt.getTime();
        return sum + reviewTime;
      }, 0) / reviewedItems.length / (1000 * 60 * 60) // Convert to hours
      : 0;
  }

  private async getTopModerators() {
    const topModeratorsData = await db
      .select({
        moderatorId: moderationAction.moderatorId,
        actionCount: count()
      })
      .from(moderationAction)
      .groupBy(moderationAction.moderatorId)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const moderatorIds = topModeratorsData.map(m => m.moderatorId);
    const moderatorDetails = moderatorIds.length > 0
      ? await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, moderatorIds))
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
        reportType: contentReport.reportType,
        reportCount: count()
      })
      .from(contentReport)
      .groupBy(contentReport.reportType)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return reportReasonsData.map(item => ({
      reason: item.reportType,
      count: Number(item.reportCount)
    }));
  }
}

export const moderationAnalyticsService = ModerationAnalyticsService.getInstance();