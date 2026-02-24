/**
 * Pretext Detection Notification Tests
 * 
 * Tests for notification integration in pretext detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PretextDetectionService } from '../application/pretext-detection.service';
import type { PretextAnalysisResult } from '../domain/types';

// Mock dependencies
vi.mock('@server/infrastructure/observability', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('@server/features/monitoring/domain/integration-monitor.service', () => ({
  integrationMonitor: {
    recordMetrics: vi.fn(),
    logEvent: vi.fn(),
    getFeatureMetrics: vi.fn()
  }
}));

vi.mock('@server/features/notifications/notification-service', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    createNotification: vi.fn()
  }))
}));

vi.mock('../domain/pretext-analysis.service', () => ({
  PretextAnalysisService: vi.fn().mockImplementation(() => ({
    analyzeBill: vi.fn()
  }))
}));

vi.mock('../infrastructure/pretext-repository', () => ({
  PretextRepository: vi.fn().mockImplementation(() => ({
    saveAnalysis: vi.fn(),
    createAlert: vi.fn().mockResolvedValue({
      id: 'alert-123',
      billId: 'bill-123',
      detections: [],
      score: 75,
      status: 'pending',
      createdAt: new Date()
    }),
    getAlerts: vi.fn(),
    updateAlertStatus: vi.fn()
  }))
}));

vi.mock('../infrastructure/pretext-cache', () => ({
  PretextCache: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    getStats: vi.fn().mockReturnValue({ size: 0, ttl: 300000 })
  }))
}));

describe('PretextDetectionService - Notifications', () => {
  let service: PretextDetectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PretextDetectionService();
  });

  describe('Alert Creation with Notifications', () => {
    it('should create alert and trigger notification when score exceeds threshold', async () => {
      const mockAnalysisResult: PretextAnalysisResult = {
        billId: 'bill-123',
        detections: [
          {
            type: 'hidden_provision',
            severity: 'high',
            description: 'Test detection',
            evidence: ['Evidence 1'],
            confidence: 85
          }
        ],
        score: 75,
        confidence: 80,
        analyzedAt: new Date()
      };

      // Mock the analysis service to return high-risk result
      const mockAnalysisService = (service as any).analysisService;
      mockAnalysisService.analyzeBill.mockResolvedValue(mockAnalysisResult);

      // Mock cache miss
      const mockCache = (service as any).cache;
      mockCache.get.mockResolvedValue(null);

      await service.analyze({ billId: 'bill-123' });

      // Verify alert was created
      const mockRepository = (service as any).repository;
      expect(mockRepository.createAlert).toHaveBeenCalledWith({
        billId: 'bill-123',
        detections: mockAnalysisResult.detections,
        score: 75,
        status: 'pending'
      });
    });

    it('should not create alert when score is below threshold', async () => {
      const mockAnalysisResult: PretextAnalysisResult = {
        billId: 'bill-123',
        detections: [],
        score: 45, // Below threshold of 60
        confidence: 80,
        analyzedAt: new Date()
      };

      const mockAnalysisService = (service as any).analysisService;
      mockAnalysisService.analyzeBill.mockResolvedValue(mockAnalysisResult);

      const mockCache = (service as any).cache;
      mockCache.get.mockResolvedValue(null);

      await service.analyze({ billId: 'bill-123' });

      // Verify alert was NOT created
      const mockRepository = (service as any).repository;
      expect(mockRepository.createAlert).not.toHaveBeenCalled();
    });
  });

  describe('Review Notifications', () => {
    it('should send notification when alert is reviewed', async () => {
      await service.reviewAlert({
        alertId: 'alert-123',
        status: 'approved',
        reviewedBy: 'admin-user',
        notes: 'Confirmed as valid concern'
      });

      // Verify repository was called
      const mockRepository = (service as any).repository;
      expect(mockRepository.updateAlertStatus).toHaveBeenCalledWith(
        'alert-123',
        'approved',
        'admin-user',
        'Confirmed as valid concern'
      );
    });

    it('should handle notification failure gracefully', async () => {
      // Mock repository to succeed
      const mockRepository = (service as any).repository;
      mockRepository.updateAlertStatus.mockResolvedValue(undefined);

      // Should not throw even if notification fails
      await expect(
        service.reviewAlert({
          alertId: 'alert-123',
          status: 'rejected',
          reviewedBy: 'admin-user'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Severity Calculation', () => {
    it('should calculate correct severity for different scores', () => {
      const getSeverity = (service as any).getAlertSeverity.bind(service);

      expect(getSeverity(95)).toBe('critical');
      expect(getSeverity(90)).toBe('critical');
      expect(getSeverity(85)).toBe('high');
      expect(getSeverity(75)).toBe('high');
      expect(getSeverity(70)).toBe('medium');
      expect(getSeverity(60)).toBe('medium');
      expect(getSeverity(50)).toBe('low');
    });
  });
});
