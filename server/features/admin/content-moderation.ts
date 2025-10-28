import { database as db } from '../../../shared/database/connection';
import { 
  bill, 
  billComment, 
  user, 
  contentReport, 
  moderationAction, 
  sponsor 
} from '../../../shared/schema';
import { eq, count, desc, sql, and, gte, or, inArray, SQL } from 'drizzle-orm';
import { logger } from '../../../shared/core/index.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Filters for querying the moderation queue
 * These filters allow moderators to narrow down content that needs review
 */
export interface ContentModerationFilters {
  contentType?: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency';
  status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'escalated';
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  dateRange?: {
    start: Date;
    end: Date;
  };
  moderator?: string; // UUID of the reviewer
  reportType?: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other';
  autoDetected?: boolean;
}

/**
 * Represents a single item in the moderation queue with full context
 */
export interface ModerationItem {
  id: number;
  contentType: 'comment' | 'bill' | 'user_profile' | 'sponsor_transparency';
  contentId: number;
  content: {
    title?: string;
    text: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
    createdAt: Date;
  };
  reportType: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  description?: string;
  reportedBy: string;
  autoDetected: boolean;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'escalated';
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  resolutionNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Record of a moderation action taken by a moderator
 */
export interface ModerationActionRecord {
  id: number;
  contentType: string;
  contentId: number;
  actionType: 'warn' | 'hide' | 'delete' | 'ban_user' | 'verify' | 'highlight';
  reason: string;
  moderatorId: string;
  moderatorName: string;
  createdAt: Date;
}

/**
 * Analytics data about the moderation system's performance
 */
export interface ContentAnalytics {
  totalContent: number;
  pendingModeration: number;
  reviewedContent: number;
  resolvedContent: number;
  dismissedContent: number;
  escalatedContent: number;
  averageReviewTime: number;
  topModerators: {
    id: string;
    name: string;
    actionsCount: number;
  }[];
  contentQualityScore: number;
  reportReasons: {
    reason: string;
    count: number;
  }[];
}

/**
 * Parameters for bulk moderation operations
 */
export interface BulkModerationOperation {
  reportIds: number[]; // IDs from contentReport table
  action: 'resolve' | 'dismiss' | 'escalate' | 'delete';
  resolutionNotes: string;
  moderatorId: string;
}

// ============================================================================
// CONTENT MODERATION SERVICE
// ============================================================================

/**
 * ContentModerationService handles all content moderation operations.
 * 
 * This service provides a comprehensive moderation workflow including:
 * - Queue management with filtering and pagination
 * - Content analysis and automated flagging
 * - Manual review and action application
 * - Analytics and reporting
 * - Bulk operations for efficiency
 */
export class ContentModerationService {
  private static instance: ContentModerationService;

  public static getInstance(): ContentModerationService {
    if (!ContentModerationService.instance) {
      ContentModerationService.instance = new ContentModerationService();
    }
    return ContentModerationService.instance;
  }

  /**
   * Retrieves the moderation queue with filtering and pagination.
   * 
   * This is the primary interface for moderators to see what content
   * needs their attention. The queue is sorted by severity first
   * (critical issues bubble to the top), then by creation date.
   */
  async getModerationQueue(
    page = 1,
    limit = 20,
    filters?: ContentModerationFilters
  ): Promise<{
    items: ModerationItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;

      // Build dynamic WHERE conditions based on filters
      const conditions: SQL[] = [];

      if (filters?.contentType) {
        conditions.push(eq(contentReport.contentType, filters.contentType));
      }

      if (filters?.status) {
        conditions.push(eq(contentReport.status, filters.status));
      }

      if (filters?.severity) {
        conditions.push(eq(contentReport.severity, filters.severity));
      }

      if (filters?.reportType) {
        conditions.push(eq(contentReport.reportType, filters.reportType));
      }

      if (filters?.moderator) {
        conditions.push(eq(contentReport.reviewedBy, filters.moderator));
      }

      if (filters?.autoDetected !== undefined) {
        conditions.push(eq(contentReport.autoDetected, filters.autoDetected));
      }

      if (filters?.dateRange) {
        conditions.push(gte(contentReport.createdAt, filters.dateRange.start));
        conditions.push(sql`${contentReport.createdAt} <= ${filters.dateRange.end}`);
      }

      // Fetch reports with all their details
      const queueItems = await db
        .select({
          id: contentReport.id,
          contentType: contentReport.contentType,
          contentId: contentReport.contentId,
          reportType: contentReport.reportType,
          severity: contentReport.severity,
          reason: contentReport.reason,
          description: contentReport.description,
          reportedBy: contentReport.reportedBy,
          autoDetected: contentReport.autoDetected,
          status: contentReport.status,
          reviewedBy: contentReport.reviewedBy,
          reviewedAt: contentReport.reviewedAt,
          resolutionNotes: contentReport.resolutionNotes,
          createdAt: contentReport.createdAt,
          updatedAt: contentReport.updatedAt
        })
        .from(contentReport)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(contentReport.severity), desc(contentReport.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countResult = await db
        .select({ count: count() })
        .from(contentReport)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count ?? 0;

      // Enhance each item with the actual content details
      const enhancedItems = await Promise.all(
        queueItems.map(async (item) => {
          const contentDetails = await this.getContentDetails(
            item.contentType, 
            item.contentId
          );
          return {
            ...item,
            content: contentDetails
          } as ModerationItem;
        })
      );

      return {
        items: enhancedItems,
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching moderation queue:', {
        component: 'ContentModeration',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Reviews a content report and applies the appropriate moderation action.
   * 
   * This method handles the core moderation workflow: a moderator reviews
   * a report, decides what action to take, and both the report status
   * and the actual content are updated accordingly.
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
      const [updatedReport] = await db
        .select()
        .from(contentReport)
        .where(eq(contentReport.id, reportId));

      const contentDetails = await this.getContentDetails(
        updatedReport.contentType,
        updatedReport.contentId
      );

      return {
        success: true,
        message: `Report ${decision}d successfully`,
        report: {
          ...updatedReport,
          content: contentDetails
        } as ModerationItem
      };
    } catch (error) {
      logger.error('Error reviewing report:', {
        component: 'ContentModeration',
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        message: 'Failed to review report'
      };
    }
  }

  /**
   * Performs bulk moderation operations on multiple reports.
   * 
   * This is useful when moderators need to handle many similar reports
   * at once, such as clearing out obvious spam or approving multiple
   * false positives from automated detection.
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
            component: 'ContentModeration',
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
        component: 'ContentModeration',
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
   * Analyzes content for policy violations without creating a report.
   * 
   * This is useful for real-time content analysis during submission,
   * allowing the system to warn users about potential issues before
   * they post, or automatically flag content that clearly violates policies.
   */
  async analyzeContent(
    contentType: 'bill' | 'comment',
    content: string,
    additionalContext?: {
      authorId?: string;
      relatedContentId?: number;
    }
  ): Promise<{
    shouldFlag: boolean;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    detectedIssues: {
      type: string;
      description: string;
      confidence: number;
      severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    }[];
    overallScore: number;
    recommendations: string[];
  }> {
    try {
      const detectedIssues: {
        type: string;
        description: string;
        confidence: number;
        severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
      }[] = [];

      const lowerContent = content.toLowerCase();

      // Check for profanity and explicit language
      const profanityPatterns = [
        'fuck', 'shit', 'damn', 'bastard', 'asshole', 'bitch',
        'crap', 'piss', 'dick', 'cock', 'pussy'
      ];

      const profanityCount = profanityPatterns.filter(word =>
        lowerContent.includes(word)
      ).length;

      if (profanityCount > 0) {
        detectedIssues.push({
          type: 'inappropriate',
          description: `Detected ${profanityCount} instance(s) of explicit language`,
          confidence: Math.min(profanityCount * 0.3, 1),
          severity: profanityCount >= 3 ? 'high' : profanityCount >= 2 ? 'medium' : 'low'
        });
      }

      // Check for spam indicators
      const hasExcessiveCaps = content.split('').filter(c =>
        c === c.toUpperCase() && c !== c.toLowerCase()
      ).length / content.length > 0.5;

      const linkCount = (content.match(/https?:\/\//g) || []).length;
      const hasExcessiveLinks = linkCount > 3;

      const words = content.split(/\s+/);
      const uniqueWords = new Set(words.map(w => w.toLowerCase()));
      const hasRepetitiveText = words.length > 10 && uniqueWords.size / words.length < 0.3;

      if (hasExcessiveCaps || hasExcessiveLinks || hasRepetitiveText) {
        const spamSignals = [hasExcessiveCaps, hasExcessiveLinks, hasRepetitiveText]
          .filter(Boolean).length;

        detectedIssues.push({
          type: 'spam',
          description: 'Content shows characteristics of spam (excessive caps, links, or repetition)',
          confidence: spamSignals * 0.33,
          severity: spamSignals >= 2 ? 'high' : 'medium'
        });
      }

      // Check for hate speech and violent language
      const hateSpeechPatterns = [
        'hate', 'kill', 'die', 'destroy', 'eliminate',
        'inferior', 'subhuman', 'vermin', 'scum'
      ];

      const hateSpeechCount = hateSpeechPatterns.filter(word =>
        lowerContent.includes(word)
      ).length;

      if (hateSpeechCount > 0) {
        detectedIssues.push({
          type: 'harassment',
          description: 'Content may contain hate speech or violent language',
          confidence: Math.min(hateSpeechCount * 0.4, 1),
          severity: hateSpeechCount >= 3 ? 'critical' : hateSpeechCount >= 2 ? 'high' : 'medium'
        });
      }

      // Check for personal attacks and harassment
      const harassmentPatterns = [
        'you are', 'you\'re a', 'idiot', 'moron', 'stupid',
        'shut up', 'kill yourself', 'loser', 'pathetic'
      ];

      const harassmentCount = harassmentPatterns.filter(phrase =>
        lowerContent.includes(phrase)
      ).length;

      if (harassmentCount > 0) {
        detectedIssues.push({
          type: 'harassment',
          description: 'Content may contain personal attacks or harassment',
          confidence: Math.min(harassmentCount * 0.35, 1),
          severity: harassmentCount >= 2 ? 'high' : 'medium'
        });
      }

      // Check content quality
      if (content.length < 10) {
        detectedIssues.push({
          type: 'inappropriate',
          description: 'Content is extremely short and may not be substantive',
          confidence: 0.6,
          severity: 'low'
        });
      }

      // Check for misinformation markers
      // cspell:disable-next-line
      const misinformationMarkers = [
        'they don\'t want you to know', 'the truth they\'re hiding',
        'big pharma', 'wake up', 'do your own research',
        'mainstream media won\'t tell you'
      ];

      const misinformationCount = misinformationMarkers.filter(phrase =>
        lowerContent.includes(phrase)
      ).length;

      if (misinformationCount > 0) {
        detectedIssues.push({
          type: 'misinformation',
          description: 'Content contains phrases commonly associated with misinformation',
          confidence: misinformationCount * 0.3,
          severity: 'medium'
        });
      }

      // Calculate overall risk score
      const severityWeights = {
        info: 0.5,
        low: 1,
        medium: 2,
        high: 3,
        critical: 4
      };

      const overallScore = detectedIssues.reduce((score, issue) => {
        return score + (issue.confidence * severityWeights[issue.severity]);
      }, 0);

      const hasCriticalIssues = detectedIssues.some(i => i.severity === 'critical');
      const shouldFlag = hasCriticalIssues || overallScore >= 3;

      // Determine overall severity
      let overallSeverity: 'info' | 'low' | 'medium' | 'high' | 'critical';
      if (hasCriticalIssues || overallScore >= 6) {
        overallSeverity = 'critical';
      } else if (overallScore >= 4) {
        overallSeverity = 'high';
      } else if (overallScore >= 2) {
        overallSeverity = 'medium';
      } else if (overallScore >= 1) {
        overallSeverity = 'low';
      } else {
        overallSeverity = 'info';
      }

      // Generate recommendations
      const recommendations: string[] = [];

      if (detectedIssues.some(i => i.type === 'inappropriate')) {
        recommendations.push('Consider removing explicit language to maintain a professional tone');
      }

      if (detectedIssues.some(i => i.type === 'spam')) {
        recommendations.push('Reduce repetition, excessive capitalization, or number of links');
      }

      if (detectedIssues.some(i => i.type === 'harassment')) {
        recommendations.push('Focus on ideas rather than personal attacks. Remove any hateful or violent language');
      }

      if (detectedIssues.some(i => i.type === 'misinformation')) {
        recommendations.push('Support claims with credible sources and avoid conspiracy language');
      }

      if (recommendations.length === 0 && !shouldFlag) {
        recommendations.push('Content appears to meet community guidelines');
      }

      return {
        shouldFlag,
        severity: overallSeverity,
        detectedIssues,
        overallScore: Math.round(overallScore * 100) / 100,
        recommendations
      };
    } catch (error) {
      logger.error('Error analyzing content:', {
        component: 'ContentModeration',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        shouldFlag: false,
        severity: 'info',
        detectedIssues: [],
        overallScore: 0,
        recommendations: ['Content analysis temporarily unavailable']
      };
    }
  }

  /**
   * Creates a new content report (flag).
   * 
   * This can be called either by users reporting content manually,
   * or by automated systems when they detect policy violations.
   */
  async createReport(
    contentType: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency',
    contentId: number,
    reportType: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other',
    reason: string,
    reportedBy: string,
    autoDetected = false,
    description?: string
  ): Promise<{ success: boolean; message: string; reportId?: number }> {
    try {
      // Check if there's already a pending report for this content
      const [existingReport] = await db
        .select()
        .from(contentReport)
        .where(
          and(
            eq(contentReport.contentType, contentType),
            eq(contentReport.contentId, contentId),
            eq(contentReport.status, 'pending')
          )
        );

      // Calculate severity based on report type
      const severity = this.calculateSeverity(reportType);

      if (existingReport) {
        // Update existing report instead of creating duplicate
        await db
          .update(contentReport)
          .set({
            reason: `${existingReport.reason}; ${reason}`,
            description: description ? 
              `${existingReport.description || ''}; ${description}` : 
              existingReport.description,
            updatedAt: new Date()
          })
          .where(eq(contentReport.id, existingReport.id));

        return { 
          success: true, 
          message: 'Existing report updated',
          reportId: existingReport.id
        };
      } else {
        // Create new report
        const [newReport] = await db
          .insert(contentReport)
          .values({
            contentType,
            contentId,
            reportedBy,
            reportType,
            reason,
            description,
            status: 'pending',
            severity,
            autoDetected
          })
          .returning({ id: contentReport.id });

        return { 
          success: true, 
          message: 'Content reported successfully',
          reportId: newReport.id
        };
      }
    } catch (error) {
      logger.error('Error creating report:', {
        component: 'ContentModeration',
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, message: 'Failed to report content' };
    }
  }

  /**
   * Retrieves comprehensive moderation statistics for analytics dashboards.
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

      const averageResolutionTime = resolvedReports.length > 0
        ? resolvedReports.reduce((sum, report) => {
          if (!report.reviewedAt || !report.createdAt) return sum;
          const resolutionTime = report.reviewedAt.getTime() - report.createdAt.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedReports.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      // Group reports by type
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

      const reportsByType = reportsByTypeData.map(item => ({
        type: item.type,
        count: Number(item.count)
      }));

      // Group moderation actions by type
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

      const actionsByType = actionsByTypeData.map(item => ({
        type: item.type,
        count: Number(item.count)
      }));

      // Get moderator activity
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

      const moderatorActivity = await Promise.all(
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

      // Content type breakdown
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

      const contentTypeBreakdown = contentTypeBreakdownData.map(item => ({
        contentType: item.contentType,
        count: Number(item.count)
      }));

      // Severity breakdown
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

      const severityBreakdown = severityBreakdownData.map(item => ({
        severity: item.severity,
        count: Number(item.count)
      }));

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
        component: 'ContentModeration',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generates comprehensive analytics about content moderation performance.
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
      const reviewedItems = await db
        .select({
          createdAt: contentReport.createdAt,
          reviewedAt: contentReport.reviewedAt
        })
        .from(contentReport)
        .where(sql`${contentReport.reviewedAt} IS NOT NULL`);

      const averageReviewTime = reviewedItems.length > 0
        ? reviewedItems.reduce((sum, item) => {
          if (!item.reviewedAt || !item.createdAt) return sum;
          const reviewTime = item.reviewedAt.getTime() - item.createdAt.getTime();
          return sum + reviewTime;
        }, 0) / reviewedItems.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      // Get top moderators
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

      const topModerators = topModeratorsData.map(mod => {
        const moderator = moderatorDetails.find(m => m.id === mod.moderatorId);
        return {
          id: mod.moderatorId,
          name: moderator?.name || 'Unknown',
          actionsCount: Number(mod.actionCount)
        };
      });

      // Calculate content quality score
      // This is a simple metric: (content without issues / total content) * 100
      const totalReports = Number(pendingReports.count) + 
                          Number(reviewedReports.count) + 
                          Number(resolvedReports.count) +
                          Number(dismissedReports.count) +
                          Number(escalatedReports.count);
      
      const contentQualityScore = totalContent > 0
        ? ((totalContent - totalReports) / totalContent) * 100
        : 100;

      // Get report reasons breakdown
      const reportReasonsData = await db
        .select({
          reportType: contentReport.reportType,
          reportCount: count()
        })
        .from(contentReport)
        .groupBy(contentReport.reportType)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const reportReasons = reportReasonsData.map(item => ({
        reason: item.reportType,
        count: Number(item.reportCount)
      }));

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
        component: 'ContentModeration',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Retrieves the complete moderation history for specific content or system-wide.
   */
  async getModerationHistory(
    contentType?: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency',
    contentId?: number,
    page = 1,
    limit = 20
  ): Promise<{
    actions: ModerationActionRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;

      const conditions: SQL[] = [];

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
        component: 'ContentModeration',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Fetches the full details of content being moderated.
   * This provides moderators with context about what they're reviewing.
   */
  private async getContentDetails(
    contentType: string, 
    contentId: number
  ): Promise<{
    title?: string;
    text: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
    createdAt: Date;
  }> {
    try {
      if (contentType === 'bill') {
        const [billData] = await db
          .select({
            title: bill.title,
            text: bill.summary,
            sponsorId: bill.sponsorId,
            createdAt: bill.createdAt
          })
          .from(bill)
          .where(eq(bill.id, contentId));

        if (!billData) {
          return {
            title: 'Bill not found',
            text: '',
            author: { id: '', name: 'Unknown', email: '' },
            createdAt: new Date()
          };
        }

        // Get sponsor details if available
        let sponsorData: { id: number; name: string; email: string | null } | null = null;
        if (billData.sponsorId) {
          const sponsorResult = await db
            .select({ id: sponsor.id, name: sponsor.name, email: sponsor.email })
            .from(sponsor)
            .where(eq(sponsor.id, billData.sponsorId));
          sponsorData = sponsorResult[0] || null;
        }

        return {
          title: billData.title,
          text: billData.text || '',
          author: sponsorData 
            ? { 
                id: sponsorData.id.toString(), 
                name: sponsorData.name, 
                email: sponsorData.email || '' 
              }
            : { 
                id: billData.sponsorId?.toString() || '', 
                name: 'Unknown', 
                email: '' 
              },
          createdAt: billData.createdAt
        };

      } else if (contentType === 'comment') {
        const [commentData] = await db
          .select({
            text: billComment.content,
            authorId: billComment.userId,
            createdAt: billComment.createdAt,
            authorName: user.name,
            authorEmail: user.email
          })
          .from(billComment)
          .innerJoin(user, eq(billComment.userId, user.id))
          .where(eq(billComment.id, contentId));

        if (!commentData) {
          return {
            text: 'Comment not found',
            author: { id: '', name: 'Unknown', email: '' },
            createdAt: new Date()
          };
        }

        return {
          text: commentData.text,
          author: {
            id: commentData.authorId,
            name: commentData.authorName,
            email: commentData.authorEmail
          },
          createdAt: commentData.createdAt
        };
      }

      // For other content types (user_profile, sponsor_transparency)
      return {
        text: 'Content details not available for this type',
        author: { id: '', name: 'System', email: '' },
        createdAt: new Date()
      };

    } catch (error) {
      logger.error('Error fetching content details:', {
        component: 'ContentModeration',
        contentType,
        contentId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        text: 'Error loading content',
        author: { id: '', name: 'Unknown', email: '' },
        createdAt: new Date()
      };
    }
  }

  /**
   * Calculates severity level based on the type of report.
   * This helps prioritize what moderators should review first.
   */
  private calculateSeverity(
    reportType: string
  ): 'info' | 'low' | 'medium' | 'high' | 'critical' {
    const criticalTypes = ['harassment'];
    const highTypes = ['misinformation', 'copyright'];
    const mediumTypes = ['spam', 'inappropriate'];
    const lowTypes = ['other'];

    const normalizedType = reportType.toLowerCase();

    if (criticalTypes.includes(normalizedType)) {
      return 'critical';
    } else if (highTypes.includes(normalizedType)) {
      return 'high';
    } else if (mediumTypes.includes(normalizedType)) {
      return 'medium';
    } else if (lowTypes.includes(normalizedType)) {
      return 'low';
    }

    return 'info';
  }

  /**
   * Applies the moderation action to the actual content.
   * This is where moderator decisions translate into visible changes.
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
            component: 'ContentModeration',
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
            component: 'ContentModeration',
            contentType,
            contentId
          });
          break;

        default:
          logger.warn('Unknown action type:', {
            component: 'ContentModeration',
            actionType
          });
      }
    } catch (error) {
      logger.error('Error applying moderation action:', {
        component: 'ContentModeration',
        contentType,
        contentId,
        actionType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of the content moderation service.
 * Use this throughout your application to ensure consistent state.
 */
export const contentModerationService = ContentModerationService.getInstance();
