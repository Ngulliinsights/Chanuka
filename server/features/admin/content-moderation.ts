/**
 * Legacy Content Moderation Service
 * 
 * This file maintains backward compatibility while delegating to the new
 * decomposed moderation services. New code should use the services from
 * the ./moderation/ directory directly.
 * 
 * @deprecated Use moderationOrchestratorService from './moderation/index.js' instead
 */

import { logger  } from '@shared/core';

import { 
  BulkModerationOperation,
  ContentAnalysisResult,
  ContentAnalytics,
  ContentModerationFilters,
  ModerationActionRecord,
  ModerationItem,
  moderationOrchestratorService} from './moderation/index.js';

// Re-export types for backward compatibility
export type {
  ContentModerationFilters,
  ModerationItem,
  ModerationActionRecord,
  ContentAnalytics,
  BulkModerationOperation,
  ContentAnalysisResult
} from './moderation/index.js';

/**
 * Legacy ContentModerationService wrapper
 * 
 * @deprecated Use moderationOrchestratorService directly instead
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
   * @deprecated Use moderationOrchestratorService.getModerationQueue() instead
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
    return moderationOrchestratorService.getModerationQueue(page, limit, filters);
  }

  /**
   * @deprecated Use moderationOrchestratorService.reviewReport() instead
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
    return moderationOrchestratorService.reviewReport(
      report_id,
      moderatorId,
      decision,
      actionType,
      resolutionNotes
    );
  }

  /**
   * @deprecated Use moderationOrchestratorService.bulkModerateReports() instead
   */
  async bulkModerateReports(
    operation: BulkModerationOperation
  ): Promise<{ 
    success: boolean; 
    message: string; 
    processedCount: number;
    failedIds: number[];
  }> {
    return moderationOrchestratorService.bulkModerateReports(operation);
  }

  /**
   * @deprecated Use moderationOrchestratorService.analyzeContent() instead
   */
  async analyzeContent(
    content_type: 'bill' | 'comment',
    content: string,
    additionalContext?: {
      authorId?: string;
      relatedContentId?: number;
    }
  ): Promise<ContentAnalysisResult> {
    return moderationOrchestratorService.analyzeContent(content_type, content, additionalContext);
  }

  /**
   * @deprecated Use moderationOrchestratorService.createReport() instead
   */
  async createReport(
    content_type: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency',
    content_id: number,
    reportType: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other',
    reason: string,
    reportedBy: string,
    autoDetected = false,
    description?: string
  ): Promise<{ success: boolean; message: string; report_id?: number }> {
    const result = await moderationOrchestratorService.createReport(
      content_type,
      content_id,
      reportType,
      reason,
      reportedBy,
      autoDetected,
      description,
      false // Don't perform analysis in legacy method
    );
    
    return {
      success: result.success,
      message: result.message,
      report_id: result.report_id
    };
  }

  /**
   * @deprecated Use moderationOrchestratorService.getModerationStats() instead
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
    return moderationOrchestratorService.getModerationStats(start_date, end_date);
  }

  /**
   * @deprecated Use moderationOrchestratorService.getContentAnalytics() instead
   */
  async getContentAnalytics(): Promise<ContentAnalytics> {
    return moderationOrchestratorService.getContentAnalytics();
  }

  /**
   * @deprecated Use moderationOrchestratorService.getModerationHistory() instead
   */
  async getModerationHistory(
    content_type?: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency',
    content_id?: number,
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
    return moderationOrchestratorService.getModerationHistory(content_type, content_id, page, limit);
  }
}

/**
 * Singleton instance of the content moderation service.
 * @deprecated Use moderationOrchestratorService from './moderation/index.js' instead
 */
export const contentModerationService = ContentModerationService.getInstance();


