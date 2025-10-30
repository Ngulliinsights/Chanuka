/**
 * Unit tests for legacy ContentModerationService wrapper
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentModerationService } from '../content-moderation.js';

// Mock the orchestrator service
vi.mock('../moderation/moderation-orchestrator.service.js', () => ({
  moderationOrchestratorService: {
    getModerationQueue: vi.fn(),
    reviewReport: vi.fn(),
    bulkModerateReports: vi.fn(),
    analyzeContent: vi.fn(),
    createReport: vi.fn(),
    getModerationStats: vi.fn(),
    getContentAnalytics: vi.fn(),
    getModerationHistory: vi.fn()
  }
}));

describe('ContentModerationService (Legacy Wrapper)', () => {
  let service: ContentModerationService;

  beforeEach(() => {
    service = ContentModerationService.getInstance();
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    const service1 = ContentModerationService.getInstance();
    const service2 = ContentModerationService.getInstance();
    expect(service1).toBe(service2);
  });

  describe('delegation to orchestrator service', () => {
    it('should delegate getModerationQueue', async () => {
      const { moderationOrchestratorService } = await import('../moderation/moderation-orchestrator.service.js');
      const mockResult = {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      };
      
      vi.mocked(moderationOrchestratorService.getModerationQueue).mockResolvedValue(mockResult);

      const result = await service.getModerationQueue(1, 20, { status: 'pending' });

      expect(moderationOrchestratorService.getModerationQueue).toHaveBeenCalledWith(
        1, 20, { status: 'pending' }
      );
      expect(result).toBe(mockResult);
    });

    it('should delegate reviewReport', async () => {
      const { moderationOrchestratorService } = await import('../moderation/moderation-orchestrator.service.js');
      const mockResult = {
        success: true,
        message: 'Report reviewed successfully'
      };
      
      vi.mocked(moderationOrchestratorService.reviewReport).mockResolvedValue(mockResult);

      const result = await service.reviewReport(123, 'mod456', 'resolve', 'hide', 'Test resolution');

      expect(moderationOrchestratorService.reviewReport).toHaveBeenCalledWith(
        123, 'mod456', 'resolve', 'hide', 'Test resolution'
      );
      expect(result).toBe(mockResult);
    });

    it('should delegate bulkModerateReports', async () => {
      const { moderationOrchestratorService } = await import('../moderation/moderation-orchestrator.service.js');
      const mockResult = {
        success: true,
        message: 'Bulk operation completed',
        processedCount: 5,
        failedIds: []
      };
      
      vi.mocked(moderationOrchestratorService.bulkModerateReports).mockResolvedValue(mockResult);

      const operation = {
        reportIds: [1, 2, 3, 4, 5],
        action: 'resolve' as const,
        resolutionNotes: 'Bulk resolution',
        moderatorId: 'mod123'
      };

      const result = await service.bulkModerateReports(operation);

      expect(moderationOrchestratorService.bulkModerateReports).toHaveBeenCalledWith(operation);
      expect(result).toBe(mockResult);
    });

    it('should delegate analyzeContent', async () => {
      const { moderationOrchestratorService } = await import('../moderation/moderation-orchestrator.service.js');
      const mockResult = {
        shouldFlag: false,
        severity: 'info' as const,
        detectedIssues: [],
        overallScore: 0,
        recommendations: ['Content appears clean']
      };
      
      vi.mocked(moderationOrchestratorService.analyzeContent).mockResolvedValue(mockResult);

      const result = await service.analyzeContent('comment', 'Test content', { authorId: 'user123' });

      expect(moderationOrchestratorService.analyzeContent).toHaveBeenCalledWith(
        'comment', 'Test content', { authorId: 'user123' }
      );
      expect(result).toBe(mockResult);
    });

    it('should delegate createReport and transform result', async () => {
      const { moderationOrchestratorService } = await import('../moderation/moderation-orchestrator.service.js');
      const mockResult = {
        success: true,
        message: 'Report created',
        reportId: 456,
        analysis: undefined
      };
      
      vi.mocked(moderationOrchestratorService.createReport).mockResolvedValue(mockResult);

      const result = await service.createReport(
        'comment',
        123,
        'spam',
        'This is spam',
        'user456',
        false,
        'Additional description'
      );

      expect(moderationOrchestratorService.createReport).toHaveBeenCalledWith(
        'comment',
        123,
        'spam',
        'This is spam',
        'user456',
        false,
        'Additional description',
        false // Analysis disabled in legacy method
      );
      
      // Should transform result to legacy format
      expect(result).toEqual({
        success: true,
        message: 'Report created',
        reportId: 456
      });
    });

    it('should delegate getModerationStats', async () => {
      const { moderationOrchestratorService } = await import('../moderation/moderation-orchestrator.service.js');
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockResult = {
        reportsCreated: 100,
        reportsResolved: 80,
        reportsPending: 20,
        averageResolutionTime: 2.5,
        reportsByType: [],
        actionsByType: [],
        moderatorActivity: [],
        contentTypeBreakdown: [],
        severityBreakdown: []
      };
      
      vi.mocked(moderationOrchestratorService.getModerationStats).mockResolvedValue(mockResult);

      const result = await service.getModerationStats(startDate, endDate);

      expect(moderationOrchestratorService.getModerationStats).toHaveBeenCalledWith(startDate, endDate);
      expect(result).toBe(mockResult);
    });

    it('should delegate getContentAnalytics', async () => {
      const { moderationOrchestratorService } = await import('../moderation/moderation-orchestrator.service.js');
      const mockResult = {
        totalContent: 1000,
        pendingModeration: 50,
        reviewedContent: 800,
        resolvedContent: 700,
        dismissedContent: 100,
        escalatedContent: 50,
        averageReviewTime: 1.5,
        topModerators: [],
        contentQualityScore: 95,
        reportReasons: []
      };
      
      vi.mocked(moderationOrchestratorService.getContentAnalytics).mockResolvedValue(mockResult);

      const result = await service.getContentAnalytics();

      expect(moderationOrchestratorService.getContentAnalytics).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should delegate getModerationHistory', async () => {
      const { moderationOrchestratorService } = await import('../moderation/moderation-orchestrator.service.js');
      const mockResult = {
        actions: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      };
      
      vi.mocked(moderationOrchestratorService.getModerationHistory).mockResolvedValue(mockResult);

      const result = await service.getModerationHistory('comment', 123, 1, 20);

      expect(moderationOrchestratorService.getModerationHistory).toHaveBeenCalledWith(
        'comment', 123, 1, 20
      );
      expect(result).toBe(mockResult);
    });
  });
});