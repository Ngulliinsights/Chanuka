/**
 * Pretext Detection Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PretextDetectionService } from '../application/pretext-detection.service';
import type { PretextAnalysisInput } from '../domain/types';

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

vi.mock('@server/infrastructure/database', () => ({
  db: {
    query: vi.fn()
  }
}));

vi.mock('@server/features/ml/models/trojan-bill-detector', () => ({
  TrojanBillDetector: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      riskScore: 75,
      confidence: 0.85,
      detections: [
        {
          type: 'hidden_provision',
          severity: 'high',
          description: 'Hidden provision detected',
          evidence: ['Section 5.2'],
          confidence: 0.85
        }
      ]
    })
  }))
}));

describe('PretextDetectionService', () => {
  let service: PretextDetectionService;

  beforeEach(() => {
    service = new PretextDetectionService();
    vi.clearAllMocks();
  });

  describe('analyze', () => {
    it('should analyze a bill and return results', async () => {
      const input: PretextAnalysisInput = {
        billId: 'test-bill-123'
      };

      const result = await service.analyze(input);

      expect(result).toBeDefined();
      expect(result.billId).toBe('test-bill-123');
      expect(result.score).toBe(75);
      expect(result.confidence).toBe(0.85);
      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].type).toBe('hidden_provision');
    });

    it('should use cached results when available', async () => {
      const input: PretextAnalysisInput = {
        billId: 'test-bill-123'
      };

      // First call - should analyze
      const result1 = await service.analyze(input);
      
      // Second call - should use cache
      const result2 = await service.analyze(input);

      expect(result1).toEqual(result2);
    });

    it('should force re-analysis when force flag is true', async () => {
      const input: PretextAnalysisInput = {
        billId: 'test-bill-123',
        force: true
      };

      const result = await service.analyze(input);

      expect(result).toBeDefined();
      expect(result.billId).toBe('test-bill-123');
    });

    it('should handle analysis errors gracefully', async () => {
      const input: PretextAnalysisInput = {
        billId: 'invalid-bill'
      };

      // Mock error
      const mockError = new Error('Analysis failed');
      vi.spyOn(service as any, 'analysisService').mockImplementation({
        analyzeBill: vi.fn().mockRejectedValue(mockError)
      });

      await expect(service.analyze(input)).rejects.toThrow('Analysis failed');
    });
  });

  describe('getAlerts', () => {
    it('should retrieve alerts with filters', async () => {
      const alerts = await service.getAlerts({
        status: 'pending',
        limit: 10
      });

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should retrieve all alerts when no filters provided', async () => {
      const alerts = await service.getAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('reviewAlert', () => {
    it('should approve an alert', async () => {
      await expect(
        service.reviewAlert({
          alertId: 'alert-123',
          status: 'approved',
          reviewedBy: 'admin-user'
        })
      ).resolves.not.toThrow();
    });

    it('should reject an alert with notes', async () => {
      await expect(
        service.reviewAlert({
          alertId: 'alert-123',
          status: 'rejected',
          notes: 'False positive',
          reviewedBy: 'admin-user'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getAnalytics', () => {
    it('should retrieve analytics for date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const analytics = await service.getAnalytics(startDate, endDate);

      expect(analytics).toBeDefined();
      expect(analytics.cacheStats).toBeDefined();
    });

    it('should retrieve analytics with default date range', async () => {
      const analytics = await service.getAnalytics();

      expect(analytics).toBeDefined();
    });
  });
});
