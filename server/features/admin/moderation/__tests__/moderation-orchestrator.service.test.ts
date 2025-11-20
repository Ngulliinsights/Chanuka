/**
 * Unit tests for ModerationOrchestratorService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModerationOrchestratorService } from '../moderation-orchestrator.service.js';

// Mock the individual services
vi.mock('../content-analysis.service.js', () => ({
  contentAnalysisService: {
    analyzeContent: vi.fn(),
    calculateSeverity: vi.fn()
  }
}));

vi.mock('../moderation-queue.service.js', () => ({
  moderationQueueService: {
    getModerationQueue: vi.fn(),
    createReport: vi.fn(),
    getReportById: vi.fn()
  }
}));

vi.mock('../moderation-decision.service.js', () => ({
  moderationDecisionService: {
    reviewReport: vi.fn(),
    bulkModerateReports: vi.fn(),
    getModerationHistory: vi.fn()
  }
}));

vi.mock('../moderation-analytics.service.js', () => ({
  moderationAnalyticsService: {
    getModerationStats: vi.fn(),
    getContentAnalytics: vi.fn()
  }
}));

describe('ModerationOrchestratorService', () => {
  let service: ModerationOrchestratorService;

  beforeEach(() => {
    service = ModerationOrchestratorService.getInstance();
    vi.clearAllMocks();
  });

  describe('processContentSubmission', () => {
    it('should approve content with no issues', async () => {
      const { contentAnalysisService } = await import('../content-analysis.service.js');
      
      vi.mocked(contentAnalysisService.analyzeContent).mockResolvedValue({
        shouldFlag: false,
        severity: 'info',
        detectedIssues: [],
        overallScore: 0,
        recommendations: ['Content appears to meet community guidelines']
      });

      const result = await service.processContentSubmission(
        'comment',
        'This is a good comment',
        'user123'
      );

      expect(result.approved).toBe(true);
      expect(result.requiresReview).toBe(false);
      expect(result.report_id).toBeUndefined();
    });

    it('should flag problematic content for review', async () => {
      const { contentAnalysisService } = await import('../content-analysis.service.js');
      const { moderationQueueService } = await import('../moderation-queue.service.js');
      
      vi.mocked(contentAnalysisService.analyzeContent).mockResolvedValue({
        shouldFlag: true,
        severity: 'high',
        detectedIssues: [{
          type: 'harassment',
          description: 'Contains harassment',
          confidence: 0.8,
          severity: 'high'
        }],
        overallScore: 4.5,
        recommendations: ['Remove harassment']
      });

      vi.mocked(moderationQueueService.createReport).mockResolvedValue({
        success: true,
        message: 'Report created',
        report_id: 123
      });

      const result = await service.processContentSubmission(
        'comment',
        'This is harassment content',
        'user123',
        456
      );

      expect(result.approved).toBe(false);
      expect(result.requiresReview).toBe(true);
      expect(result.report_id).toBe(123);
      expect(contentAnalysisService.analyzeContent).toHaveBeenCalledWith(
        'comment',
        'This is harassment content',
        { authorId: 'user123' }
      );
    });
  });

  describe('handleEscalation', () => {
    it('should handle escalation successfully', async () => {
      const result = await service.handleEscalation(
        123,
        'Complex case requiring senior review',
        'moderator456'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Escalation processed successfully');
    });
  });

  describe('delegation methods', () => {
    it('should delegate getModerationQueue to queue service', async () => {
      const { moderationQueueService } = await import('../moderation-queue.service.js');
      const mockResult = {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      };
      
      vi.mocked(moderationQueueService.getModerationQueue).mockResolvedValue(mockResult);

      const result = await service.getModerationQueue(1, 20);

      expect(moderationQueueService.getModerationQueue).toHaveBeenCalledWith(1, 20, undefined);
      expect(result).toBe(mockResult);
    });

    it('should delegate reviewReport to decision service', async () => {
      const { moderationDecisionService } = await import('../moderation-decision.service.js');
      const mockResult = {
        success: true,
        message: 'Report reviewed',
        report: undefined
      };
      
      vi.mocked(moderationDecisionService.reviewReport).mockResolvedValue(mockResult);

      const result = await service.reviewReport(123, 'mod456', 'resolve', 'hide', 'Resolved');

      expect(moderationDecisionService.reviewReport).toHaveBeenCalledWith(
        123, 'mod456', 'resolve', 'hide', 'Resolved'
      );
      expect(result).toBe(mockResult);
    });

    it('should delegate analyzeContent to analysis service', async () => {
      const { contentAnalysisService } = await import('../content-analysis.service.js');
      const mockResult = {
        shouldFlag: false,
        severity: 'info' as const,
        detectedIssues: [],
        overallScore: 0,
        recommendations: []
      };
      
      vi.mocked(contentAnalysisService.analyzeContent).mockResolvedValue(mockResult);

      const result = await service.analyzeContent('comment', 'test content');

      expect(contentAnalysisService.analyzeContent).toHaveBeenCalledWith('comment', 'test content', undefined);
      expect(result).toBe(mockResult);
    });
  });
});
