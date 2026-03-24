/**
 * Moderation Workflow Orchestrator Service
 *
 * Central coordinator for the content moderation system. Delegates to
 * specialized services and provides a single, stable interface for all
 * moderation operations.
 */

import { contentAnalysisService } from '@server/features/admin/moderation/content-analysis.service';
import { moderationAnalyticsService } from '@server/features/admin/moderation/moderation-analytics.service';
import { moderationDecisionService } from '@server/features/admin/moderation/moderation-decision.service';
import { moderationQueueService } from '@server/features/admin/moderation/moderation-queue.service';
import { logger } from '@server/infrastructure/observability';

import {
  BulkModerationOperation,
  ContentAnalysisResult,
  ContentAnalytics,
  ContentModerationFilters,
  ModerationActionRecord,
  ModerationItem,
  PaginationInfo,
} from './types';

// ─── Supporting types ─────────────────────────────────────────────────────────

type ContentType = 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency';
type AnalyzableContentType = Extract<ContentType, 'bill' | 'comment'>;
type ReportType = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other';
type DecisionType = 'resolve' | 'dismiss' | 'escalate';
type ActionType = 'warn' | 'hide' | 'delete' | 'ban_user' | 'verify' | 'highlight';

interface CreateReportOptions {
  contentType: ContentType;
  contentId: number;
  reportType: ReportType;
  reason: string;
  reportedBy: string;
  autoDetected?: boolean;
  description?: string;
}

interface CreateReportResult {
  success: boolean;
  message: string;
  reportId?: number;
}

interface ReviewReportResult {
  success: boolean;
  message: string;
  report?: ModerationItem;
}

interface BulkModerationResult {
  success: boolean;
  message: string;
  processedCount: number;
  failedIds: number[];
}

interface ProcessSubmissionResult {
  approved: boolean;
  requiresReview: boolean;
  analysis: ContentAnalysisResult;
  reportId?: number;
}

interface EscalationResult {
  success: boolean;
  message: string;
}

interface ModerationStats {
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
  contentTypeBreakdown: { contentType: string | null; count: number }[];
  severityBreakdown: { severity: string | null; count: number }[];
}

interface RawModerationStats {
  reportsCreated?: number;
  reports_created?: number;
  reportsResolved?: number;
  reports_resolved?: number;
  reportsPending?: number;
  reports_pending?: number;
  averageResolutionTime?: number;
  average_resolution_time?: number;
  reportsByType?: { type: string; count: number }[];
  reports_by_type?: { type: string; count: number }[];
  actionsByType?: { type: string; count: number }[];
  actions_by_type?: { type: string; count: number }[];
  moderatorActivity?: Array<{
    moderatorId?: string;
    moderator_id?: string;
    moderatorName?: string;
    moderator_name?: string;
    reviewCount?: number;
    review_count?: number;
    averageReviewTime?: number;
    average_review_time?: number;
  }>;
  moderator_activity?: Array<{
    moderatorId?: string;
    moderator_id?: string;
    moderatorName?: string;
    moderator_name?: string;
    reviewCount?: number;
    review_count?: number;
    averageReviewTime?: number;
    average_review_time?: number;
  }>;
  contentTypeBreakdown?: Array<{ contentType?: string | null; content_type?: string | null; count: number }>;
  content_type_breakdown?: Array<{ contentType?: string | null; content_type?: string | null; count: number }>;
  severityBreakdown?: Array<{ severity?: string | null; count: number }>;
  severity_breakdown?: Array<{ severity?: string | null; count: number }>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ModerationOrchestratorService {
  private static instance: ModerationOrchestratorService;

  static getInstance(): ModerationOrchestratorService {
    if (!ModerationOrchestratorService.instance) {
      ModerationOrchestratorService.instance = new ModerationOrchestratorService();
    }
    return ModerationOrchestratorService.instance;
  }

  // ─── Queue management ────────────────────────────────────────────────────────

  /**
   * Returns the moderation queue with optional filtering and pagination.
   */
  getModerationQueue(
    page = 1,
    limit = 20,
    filters?: ContentModerationFilters,
  ): Promise<{ items: ModerationItem[]; pagination: PaginationInfo }> {
    return this.exec('getModerationQueue', () =>
      moderationQueueService.getModerationQueue(page, limit, filters),
    );
  }

  /**
   * Creates a new content report.
   *
   * Note: Pass the real `contentId` at the call site — this method does not
   * accept a sentinel value such as `0` for unknown IDs.
   */
  async createReport(options: CreateReportOptions): Promise<CreateReportResult> {
    const {
      contentType,
      contentId,
      reportType,
      reason,
      reportedBy,
      autoDetected = false,
      description,
    } = options;

    return this.exec('createReport', () =>
      moderationQueueService.createReport(
        contentType,
        contentId,
        reportType,
        reason,
        reportedBy,
        autoDetected,
        description,
      ),
    );
  }

  // ─── Content analysis ────────────────────────────────────────────────────────

  /**
   * Analyzes content for policy violations.
   */
  analyzeContent(
    contentType: AnalyzableContentType,
    content: string,
    additionalContext?: { authorId?: string; relatedContentId?: number },
  ): Promise<ContentAnalysisResult> {
    return this.exec('analyzeContent', () =>
      contentAnalysisService.analyzeContent(contentType, content, additionalContext),
    );
  }

  // ─── Decision processing ─────────────────────────────────────────────────────

  /**
   * Reviews a content report and records the moderation decision.
   */
  reviewReport(
    reportId: number,
    moderatorId: string,
    decision: DecisionType,
    actionType: ActionType,
    resolutionNotes: string,
  ): Promise<ReviewReportResult> {
    return this.exec('reviewReport', () =>
      moderationDecisionService.reviewReport(
        reportId,
        moderatorId,
        decision,
        actionType,
        resolutionNotes,
      ),
    );
  }

  /**
   * Applies a moderation action to multiple reports in one operation.
   */
  bulkModerateReports(operation: BulkModerationOperation): Promise<BulkModerationResult> {
    return this.exec('bulkModerateReports', () =>
      moderationDecisionService.bulkModerateReports(operation),
    );
  }

  /**
   * Returns the moderation action history, optionally scoped to a piece of content.
   */
  getModerationHistory(
    contentType?: ContentType,
    contentId?: number,
    page = 1,
    limit = 20,
  ): Promise<{ actions: ModerationActionRecord[]; pagination: PaginationInfo }> {
    return this.exec('getModerationHistory', () =>
      moderationDecisionService.getModerationHistory(contentType, contentId, page, limit),
    );
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  /**
   * Returns moderation statistics for the given date range.
   */
  getModerationStats(startDate: Date, endDate: Date): Promise<ModerationStats> {
    return this.exec('getModerationStats', async () => {
      const stats = await moderationAnalyticsService.getModerationStats(startDate, endDate);
      return this.normalizeModerationStats(stats);
    });
  }

  /**
   * Normalizes the raw analytics service response to match the orchestrator's
   * ModerationStats interface (snake_case → camelCase property transformation).
   */
  private normalizeModerationStats(stats: RawModerationStats): ModerationStats {
    const normalizedContentTypes = (
      stats.contentTypeBreakdown ||
      stats.content_type_breakdown ||
      []
    ).map((item: { contentType?: string | null; content_type?: string | null; count: number }) => ({
      contentType: item.contentType ?? item.content_type ?? null,
      count: item.count,
    }));

    const normalizedSeverity = (stats.severityBreakdown || stats.severity_breakdown || []).map(
      (item: { severity?: string | null; count: number }) => ({
        severity: item.severity ?? null,
        count: item.count,
      }),
    );

    return {
      reportsCreated: stats.reportsCreated ?? stats.reports_created ?? 0,
      reportsResolved: stats.reportsResolved ?? stats.reports_resolved ?? 0,
      reportsPending: stats.reportsPending ?? stats.reports_pending ?? 0,
      averageResolutionTime: stats.averageResolutionTime ?? stats.average_resolution_time ?? 0,
      reportsByType: stats.reportsByType ?? stats.reports_by_type ?? [],
      actionsByType: stats.actionsByType ?? stats.actions_by_type ?? [],
      moderatorActivity: (stats.moderatorActivity || stats.moderator_activity || []).map(
        (activity: {
          moderatorId?: string;
          moderator_id?: string;
          moderatorName?: string;
          moderator_name?: string;
          reviewCount?: number;
          review_count?: number;
          averageReviewTime?: number;
          average_review_time?: number;
        }) => ({
          moderatorId: activity.moderatorId || activity.moderator_id || '',
          moderatorName: activity.moderatorName || activity.moderator_name || '',
          reviewCount: activity.reviewCount || activity.review_count || 0,
          averageReviewTime: activity.averageReviewTime || activity.average_review_time || 0,
        }),
      ),
      contentTypeBreakdown: normalizedContentTypes,
      severityBreakdown: normalizedSeverity,
    };
  }

  /**
   * Returns aggregated content analytics.
   */
  getContentAnalytics(): Promise<ContentAnalytics> {
    return this.exec('getContentAnalytics', () =>
      moderationAnalyticsService.getContentAnalytics(),
    );
  }

  // ─── Workflow orchestration ──────────────────────────────────────────────────

  /**
   * Runs newly submitted content through the analysis pipeline and, when the
   * content is flagged, automatically creates a moderation report.
   *
   * @param contentId - The persisted ID of the content being submitted.
   *   The caller must supply a valid ID; `0` or negative values are rejected.
   */
  async processContentSubmission(
    contentType: AnalyzableContentType,
    content: string,
    authorId: string,
    contentId: number,
  ): Promise<ProcessSubmissionResult> {
    if (!Number.isInteger(contentId) || contentId <= 0) {
      throw new Error(
        `processContentSubmission requires a valid contentId (received ${contentId}). ` +
        'Persist the content before running moderation analysis.',
      );
    }

    return this.exec('processContentSubmission', async () => {
      const analysis = await this.analyzeContent(contentType, content, { authorId });

      if (!analysis.shouldFlag) {
        return { approved: true, requiresReview: false, analysis };
      }

      const reportType = this.resolveReportType(analysis.detectedIssues[0]?.type);
      const reason = analysis.detectedIssues.map(i => i.description).join('; ');
      const description = `Analysis score: ${analysis.overallScore}. Issues detected: ${analysis.detectedIssues.length}`;

      const reportResult = await this.createReport({
        contentType,
        contentId,
        reportType,
        reason: `Automated detection: ${reason}`,
        reportedBy: 'system',
        autoDetected: true,
        description,
      });

      return {
        approved: false,
        requiresReview: true,
        analysis,
        reportId: reportResult.reportId,
      };
    });
  }

  /**
   * Records an escalation event for a report.
   *
   * TODO: Full implementation should notify senior moderators, update report
   * priority, and persist an escalation audit trail.
   */
  async handleEscalation(
    reportId: number,
    escalationReason: string,
    escalatedBy: string,
  ): Promise<EscalationResult> {
    return this.exec('handleEscalation', async () => {
      logger.info(
        { component: 'ModerationOrchestrator', reportId, escalationReason, escalatedBy },
        'Escalation event received — full escalation workflow not yet implemented',
      );

      // Placeholder until the escalation workflow is built out.
      return { success: true, message: 'Escalation logged' };
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Wraps any delegate call with consistent error logging and re-throws.
   * Eliminates the identical try/catch boilerplate across every public method.
   */
  private async exec<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      logger.error(
        {
          component: 'ModerationOrchestrator',
          operation,
          error: error instanceof Error ? error.message : String(error),
        },
        'Moderation orchestrator error',
      );
      throw error;
    }
  }

  /**
   * Maps a raw issue type string to the `ReportType` union.
   * Falls back to `'other'` for unrecognized values.
   */
  private resolveReportType(rawType: string | undefined): ReportType {
    const VALID_REPORT_TYPES = new Set<ReportType>([
      'spam', 'harassment', 'misinformation', 'inappropriate', 'copyright', 'other',
    ]);
    const candidate = rawType as ReportType;
    return VALID_REPORT_TYPES.has(candidate) ? candidate : 'other';
  }
}

export const moderationOrchestratorService = ModerationOrchestratorService.getInstance();