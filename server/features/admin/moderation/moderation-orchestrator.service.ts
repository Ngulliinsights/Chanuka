/**
 * Moderation Workflow Orchestrator Service
 * 
 * Main coordination service that orchestrates the entire moderation workflow.
 * This service acts as the primary interface for moderation operations.
 */

import { contentAnalysisService } from '@server/features/admin/moderation/content-analysis.service.ts';
import { moderationAnalyticsService } from '@server/features/admin/moderation/moderation-analytics.service.ts';
import { moderationDecisionService } from '@server/features/admin/moderation/moderation-decision.service.ts';
import { moderationQueueService } from '@server/features/admin/moderation/moderation-queue.service.ts';
import { logger  } from '@shared/core';

import { 
  BulkModerationOperation,
  ContentAnalysisResult,
  ContentAnalytics,
  ContentModerationFilters, 
  ModerationActionRecord,
  ModerationItem, 
  PaginationInfo
} from './types.js';

/**
 * Main orchestrator for the content moderation system.
 * 
 * This service coordinates between all moderation components and provides
 * a unified interface for moderation operations.
 */
export class ModerationOrchestratorService {
  private static instance: ModerationOrchestratorService;

  public static getInstance(): ModerationOrchestratorService {
    if (!ModerationOrchestratorService.instance) {
      ModerationOrchestratorService.instance = new ModerationOrchestratorService();
    }
    return ModerationOrchestratorService.instance;
  }

  // Queue Management Operations

  /**
   * Retrieves the moderation queue with filtering and pagination
   */
  async getModerationQueue(
    page = 1,
    limit = 20,
    filters?: ContentModerationFilters
  ): Promise<{
    items: ModerationItem[];
    pagination: PaginationInfo;
  }> {
    try {
      return await moderationQueueService.getModerationQueue(page, limit, filters);
    } catch (error) {
      logger.error('Error in moderation orchestrator - getModerationQueue:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Creates a new content report with optional automated analysis
   */
  async createReport(
    content_type: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency',
    content_id: number,
    reportType: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other',
    reason: string,
    reportedBy: string,
    autoDetected = false,
    description?: string,
    performAnalysis = true
  ): Promise<{ 
    success: boolean; 
    message: string; 
    report_id?: number;
    analysis?: ContentAnalysisResult;
  }> {
    try {
      // Create the report
      const reportResult = await moderationQueueService.createReport(
        content_type,
        content_id,
        reportType,
        reason,
        reportedBy,
        autoDetected,
        description
      );

      // Optionally perform content analysis for additional context
      let analysis: ContentAnalysisResult | undefined;
      if (performAnalysis && (content_type === 'bill' || content_type === 'comment')) {
        try {
          // We would need to fetch the content first, but for now we'll skip this
          // In a real implementation, we'd fetch the content and analyze it
          analysis = undefined;
        } catch (analysisError) {
          logger.warn('Content analysis failed during report creation:', {
            component: 'ModerationOrchestrator',
            error: analysisError instanceof Error ? analysisError.message : String(analysisError)
          });
        }
      }

      return {
        ...reportResult,
        analysis
      };
    } catch (error) {
      logger.error('Error in moderation orchestrator - createReport:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Content Analysis Operations

  /**
   * Analyzes content for policy violations
   */
  async analyzeContent(
    content_type: 'bill' | 'comment',
    content: string,
    additionalContext?: {
      authorId?: string;
      relatedContentId?: number;
    }
  ): Promise<ContentAnalysisResult> {
    try {
      return await contentAnalysisService.analyzeContent(content_type, content, additionalContext);
    } catch (error) {
      logger.error('Error in moderation orchestrator - analyzeContent:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Decision Processing Operations

  /**
   * Reviews a content report and applies moderation action
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
      return await moderationDecisionService.reviewReport(
        report_id,
        moderatorId,
        decision,
        actionType,
        resolutionNotes
      );
    } catch (error) {
      logger.error('Error in moderation orchestrator - reviewReport:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Performs bulk moderation operations
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
      return await moderationDecisionService.bulkModerateReports(operation);
    } catch (error) {
      logger.error('Error in moderation orchestrator - bulkModerateReports:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Retrieves moderation history
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
      return await moderationDecisionService.getModerationHistory(
        content_type,
        content_id,
        page,
        limit
      );
    } catch (error) {
      logger.error('Error in moderation orchestrator - getModerationHistory:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Analytics and Reporting Operations

  /**
   * Retrieves comprehensive moderation statistics
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
      return await moderationAnalyticsService.getModerationStats(start_date, end_date);
    } catch (error) {
      logger.error('Error in moderation orchestrator - getModerationStats:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generates comprehensive content analytics
   */
  async getContentAnalytics(): Promise<ContentAnalytics> {
    try {
      return await moderationAnalyticsService.getContentAnalytics();
    } catch (error) {
      logger.error('Error in moderation orchestrator - getContentAnalytics:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Workflow Orchestration Methods

  /**
   * Processes content submission through the moderation pipeline
   */
  async processContentSubmission(
    content_type: 'bill' | 'comment',
    content: string,
    authorId: string,
    content_id?: number
  ): Promise<{
    approved: boolean;
    requiresReview: boolean;
    analysis: ContentAnalysisResult;
    report_id?: number;
  }> {
    try {
      // Analyze the content
      const analysis = await this.analyzeContent(content_type, content, { authorId });

      // Determine if content should be auto-flagged
      if (analysis.shouldFlag) {
        // Create an automated report
        const reportResult = await this.createReport(
          content_type,
          content_id || 0, // In real implementation, this would be the actual content ID
          analysis.detectedIssues[0]?.type as any || 'other',
          `Automated detection: ${analysis.detectedIssues.map(i => i.description).join(', ')}`,
          'system',
          true,
          `Analysis score: ${analysis.overallScore}. Issues: ${analysis.detectedIssues.length}`,
          false // Don't re-analyze
        );

        return {
          approved: false,
          requiresReview: true,
          analysis,
          report_id: reportResult.report_id
        };
      }

      return {
        approved: true,
        requiresReview: false,
        analysis
      };
    } catch (error) {
      logger.error('Error in moderation orchestrator - processContentSubmission:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Handles escalated moderation decisions
   */
  async handleEscalation(
    report_id: number,
    escalationReason: string,
    escalatedBy: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // In a full implementation, this would:
      // 1. Notify senior moderators
      // 2. Add escalation tracking
      // 3. Update report priority
      // 4. Log escalation event

      logger.info('Moderation escalation handled:', {
        component: 'ModerationOrchestrator',
        report_id,
        escalationReason,
        escalatedBy
      });

      return {
        success: true,
        message: 'Escalation processed successfully'
      };
    } catch (error) {
      logger.error('Error in moderation orchestrator - handleEscalation:', {
        component: 'ModerationOrchestrator',
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        message: 'Failed to process escalation'
      };
    }
  }
}

export const moderationOrchestratorService = ModerationOrchestratorService.getInstance();


