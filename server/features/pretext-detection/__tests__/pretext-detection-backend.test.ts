/**
 * Pretext Detection Backend Integration Tests
 * 
 * Tests for TASK-1.3: Pretext Detection Backend Integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PretextDetectionService } from '../application/pretext-detection.service';
import { PretextRepository } from '../infrastructure/pretext-repository';
import { PretextCache } from '../infrastructure/pretext-cache';
import { EnhancedNotificationService } from '@server/infrastructure/notifications/enhanced-notification.service';

// Mock dependencies
vi.mock('../infrastructure/pretext-repository');
vi.mock('../infrastructure/pretext-cache');
vi.mock('@server/infrastructure/notifications/enhanced-notification.service');
vi.mock('@server/features/monitoring/domain/integration-monitor.service', () => ({
  integrationMonitor: {
    recordMetrics: vi.fn(),
    logEvent: vi.fn(),
  },
}));

describe('TASK-1.3: Pretext Detection Backend Integration', () => {
  let service: PretextDetectionService;
  let mockRepository: any;
  let mockCache: any;
  let mockNotificationService: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock implementations
    mockRepository = {
      saveAnalysis: vi.fn(),
      getAnalysis: vi.fn(),
      createAlert: vi.fn(),
      getAlerts: vi.fn(),
      updateAlertStatus: vi.fn(),
      getAdminUsers: vi.fn(),
      getAlertById: vi.fn(),
      getUsersInterestedInBill: vi.fn(),
    };

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      invalidate: vi.fn(),
      getStats: vi.fn(() => ({ size: 0, ttl: 300000 })),
    };

    mockNotificationService = {
      send: vi.fn(),
    };

    // Mock constructors
    vi.mocked(PretextRepository).mockImplementation(() => mockRepository);
    vi.mocked(PretextCache).mockImplementation(() => mockCache);
    vi.mocked(EnhancedNotificationService).mockImplementation(() => mockNotificationService);

    service = new PretextDetectionService();
  });

  describe('Analysis Endpoint', () => {
    it('should analyze a bill and return results', async () => {
      const billId = 'bill-123';
      const mockResult = {
        billId,
        detections: [
          {
            type: 'hidden_clause',
            severity: 'high' as const,
            description: 'Hidden clause detected',
            evidence: ['Section 5.2'],
            confidence: 0.85,
          },
        ],
        score: 75,
        confidence: 0.85,
        analyzedAt: new Date(),
      };

      mockCache.get.mockResolvedValue(null);
      mockRepository.saveAnalysis.mockResolvedValue(undefined);
      mockRepository.createAlert.mockResolvedValue({
        id: 'alert-1',
        billId,
        detections: mockResult.detections,
        score: mockResult.score,
        status: 'pending',
        createdAt: new Date(),
      });
      mockRepository.getAdminUsers.mockResolvedValue([
        { id: 'admin-1', email: 'admin@example.com' },
      ]);

      // Mock the analysis service
      const mockAnalysisService = {
        analyzeBill: vi.fn().mockResolvedValue(mockResult),
      };
      (service as any).analysisService = mockAnalysisService;

      const result = await service.analyze({ billId });

      expect(result).toEqual(mockResult);
      expect(mockCache.set).toHaveBeenCalledWith(billId, mockResult);
      expect(mockRepository.saveAnalysis).toHaveBeenCalledWith(mockResult);
    });

    it('should use cached results when available', async () => {
      const billId = 'bill-123';
      const cachedResult = {
        billId,
        detections: [],
        score: 30,
        confidence: 0.9,
        analyzedAt: new Date(),
      };

      mockCache.get.mockResolvedValue(cachedResult);

      const result = await service.analyze({ billId });

      expect(result).toEqual(cachedResult);
      expect(mockCache.get).toHaveBeenCalledWith(billId);
      expect(mockRepository.saveAnalysis).not.toHaveBeenCalled();
    });

    it('should force re-analysis when force flag is true', async () => {
      const billId = 'bill-123';
      const mockResult = {
        billId,
        detections: [],
        score: 30,
        confidence: 0.9,
        analyzedAt: new Date(),
      };

      mockCache.get.mockResolvedValue({ ...mockResult, score: 20 });
      mockRepository.saveAnalysis.mockResolvedValue(undefined);

      const mockAnalysisService = {
        analyzeBill: vi.fn().mockResolvedValue(mockResult),
      };
      (service as any).analysisService = mockAnalysisService;

      const result = await service.analyze({ billId, force: true });

      expect(result).toEqual(mockResult);
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockRepository.saveAnalysis).toHaveBeenCalled();
    });
  });

  describe('Alerts Endpoint', () => {
    it('should retrieve alerts with filters', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          billId: 'bill-123',
          detections: [],
          score: 75,
          status: 'pending' as const,
          createdAt: new Date(),
        },
      ];

      mockRepository.getAlerts.mockResolvedValue(mockAlerts);

      const result = await service.getAlerts({ status: 'pending', limit: 10 });

      expect(result).toEqual(mockAlerts);
      expect(mockRepository.getAlerts).toHaveBeenCalledWith({
        status: 'pending',
        limit: 10,
      });
    });

    it('should retrieve all alerts when no filters provided', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          billId: 'bill-123',
          detections: [],
          score: 75,
          status: 'pending' as const,
          createdAt: new Date(),
        },
        {
          id: 'alert-2',
          billId: 'bill-456',
          detections: [],
          score: 85,
          status: 'approved' as const,
          createdAt: new Date(),
        },
      ];

      mockRepository.getAlerts.mockResolvedValue(mockAlerts);

      const result = await service.getAlerts();

      expect(result).toEqual(mockAlerts);
      expect(mockRepository.getAlerts).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Review Endpoint', () => {
    it('should approve an alert and send notifications', async () => {
      const alertId = 'alert-1';
      const reviewInput = {
        alertId,
        status: 'approved' as const,
        reviewedBy: 'admin-1',
        notes: 'Confirmed issue',
      };

      mockRepository.updateAlertStatus.mockResolvedValue(undefined);
      mockRepository.getAlertById.mockResolvedValue({
        id: alertId,
        billId: 'bill-123',
        detections: [],
        score: 75,
        status: 'pending',
        createdAt: new Date(),
      });
      mockRepository.getUsersInterestedInBill.mockResolvedValue([
        { id: 'user-1', email: 'user@example.com' },
      ]);

      await service.reviewAlert(reviewInput);

      expect(mockRepository.updateAlertStatus).toHaveBeenCalledWith(
        alertId,
        'approved',
        'admin-1',
        'Confirmed issue'
      );
      expect(mockNotificationService.send).toHaveBeenCalled();
    });

    it('should reject an alert with notes', async () => {
      const alertId = 'alert-1';
      const reviewInput = {
        alertId,
        status: 'rejected' as const,
        reviewedBy: 'admin-1',
        notes: 'False positive',
      };

      mockRepository.updateAlertStatus.mockResolvedValue(undefined);
      mockRepository.getAlertById.mockResolvedValue({
        id: alertId,
        billId: 'bill-123',
        detections: [],
        score: 75,
        status: 'pending',
        createdAt: new Date(),
      });
      mockRepository.getUsersInterestedInBill.mockResolvedValue([]);

      await service.reviewAlert(reviewInput);

      expect(mockRepository.updateAlertStatus).toHaveBeenCalledWith(
        alertId,
        'rejected',
        'admin-1',
        'False positive'
      );
    });
  });

  describe('Notification Integration', () => {
    it('should send notifications to admins when alert is created', async () => {
      const billId = 'bill-123';
      const mockResult = {
        billId,
        detections: [
          {
            type: 'hidden_clause',
            severity: 'critical' as const,
            description: 'Critical issue',
            evidence: ['Section 1'],
            confidence: 0.95,
          },
        ],
        score: 95,
        confidence: 0.95,
        analyzedAt: new Date(),
      };

      mockCache.get.mockResolvedValue(null);
      mockRepository.saveAnalysis.mockResolvedValue(undefined);
      mockRepository.createAlert.mockResolvedValue({
        id: 'alert-1',
        billId,
        detections: mockResult.detections,
        score: mockResult.score,
        status: 'pending',
        createdAt: new Date(),
      });
      mockRepository.getAdminUsers.mockResolvedValue([
        { id: 'admin-1', email: 'admin1@example.com' },
        { id: 'admin-2', email: 'admin2@example.com' },
      ]);

      const mockAnalysisService = {
        analyzeBill: vi.fn().mockResolvedValue(mockResult),
      };
      (service as any).analysisService = mockAnalysisService;

      await service.analyze({ billId });

      expect(mockNotificationService.send).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          type: 'in-app',
          priority: 'urgent',
        })
      );
    });
  });

  describe('Caching Layer', () => {
    it('should cache analysis results', async () => {
      const billId = 'bill-123';
      const mockResult = {
        billId,
        detections: [],
        score: 30,
        confidence: 0.9,
        analyzedAt: new Date(),
      };

      mockCache.get.mockResolvedValue(null);
      mockRepository.saveAnalysis.mockResolvedValue(undefined);

      const mockAnalysisService = {
        analyzeBill: vi.fn().mockResolvedValue(mockResult),
      };
      (service as any).analysisService = mockAnalysisService;

      await service.analyze({ billId });

      expect(mockCache.set).toHaveBeenCalledWith(billId, mockResult);
    });

    it('should return cache stats in analytics', async () => {
      mockCache.getStats.mockReturnValue({ size: 5, ttl: 300000 });

      const result = await service.getAnalytics();

      expect(result.cacheStats).toEqual({ size: 5, ttl: 300000 });
    });
  });

  describe('Monitoring Integration', () => {
    it('should record metrics for successful analysis', async () => {
      const { integrationMonitor } = await import(
        '@server/features/monitoring/domain/integration-monitor.service'
      );

      const billId = 'bill-123';
      const mockResult = {
        billId,
        detections: [],
        score: 30,
        confidence: 0.9,
        analyzedAt: new Date(),
      };

      mockCache.get.mockResolvedValue(null);
      mockRepository.saveAnalysis.mockResolvedValue(undefined);

      const mockAnalysisService = {
        analyzeBill: vi.fn().mockResolvedValue(mockResult),
      };
      (service as any).analysisService = mockAnalysisService;

      await service.analyze({ billId });

      expect(integrationMonitor.recordMetrics).toHaveBeenCalledWith(
        'pretext-detection',
        expect.objectContaining({
          totalRequests: 1,
          successfulRequests: 1,
          failedRequests: 0,
        }),
        expect.any(Object)
      );
    });
  });
});
