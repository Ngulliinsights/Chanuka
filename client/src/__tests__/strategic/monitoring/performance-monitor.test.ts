/**
 * Performance Monitoring System Tests
 * Tests for the central performance monitoring system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { PerformanceAlertsManager } from '@client/infrastructure/performance/alerts';
import { PerformanceBudgetChecker } from '@client/infrastructure/performance/budgets';
import { PerformanceMonitor } from '@client/infrastructure/performance/monitor';
import { WebVitalsMonitor } from '@client/infrastructure/performance/web-vitals';

// Mock dependencies
vi.mock('../../../core/performance/budgets', () => ({
  PerformanceBudgetChecker: {
    getInstance: vi.fn(() => ({
      checkBudget: vi.fn(() => ({ status: 'pass' })),
      getComplianceStats: vi.fn(() => ({ passing: 10, warning: 2, failing: 1 })),
      resetHistory: vi.fn(),
    })),
  },
}));

vi.mock('../../../core/performance/alerts', () => ({
  PerformanceAlertsManager: {
    getInstance: vi.fn(() => ({
      checkMetric: vi.fn(() => Promise.resolve()),
      getAlertStats: vi.fn(() => ({ total: 0, critical: 0, warning: 0 })),
      getActiveAlerts: vi.fn(() => []),
      clearAlerts: vi.fn(),
      updateConfig: vi.fn(),
    })),
  },
}));

vi.mock('../../../core/performance/web-vitals', () => ({
  WebVitalsMonitor: {
    getInstance: vi.fn(() => ({
      getWebVitalsScores: vi.fn(() => ({ lcp: 85, fid: 90, cls: 95 })),
      getMetrics: vi.fn(() => []),
      getOverallScore: vi.fn(() => 90),
      disconnect: vi.fn(),
      reset: vi.fn(),
      updateConfig: vi.fn(),
      addListener: vi.fn(),
    })),
  },
}));

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let mockBudgetChecker: any;
  let mockAlertsManager: any;
  let mockWebVitalsMonitor: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock instances
    mockBudgetChecker = {
      checkBudget: vi.fn(() => ({ status: 'pass' })),
      getComplianceStats: vi.fn(() => ({ passing: 10, warning: 2, failing: 1 })),
      resetHistory: vi.fn(),
    };

    mockAlertsManager = {
      checkMetric: vi.fn(() => Promise.resolve()),
      getAlertStats: vi.fn(() => ({ total: 0, critical: 0, warning: 0 })),
      getActiveAlerts: vi.fn(() => []),
      clearAlerts: vi.fn(),
      updateConfig: vi.fn(),
    };

    mockWebVitalsMonitor = {
      getWebVitalsScores: vi.fn(() => ({ lcp: 85, fid: 90, cls: 95 })),
      getMetrics: vi.fn(() => []),
      getOverallScore: vi.fn(() => 90),
      disconnect: vi.fn(),
      reset: vi.fn(),
      updateConfig: vi.fn(),
      addListener: vi.fn(),
    };

    // Mock the getInstance methods
    (PerformanceBudgetChecker.getInstance as any).mockReturnValue(mockBudgetChecker);
    (PerformanceAlertsManager.getInstance as any).mockReturnValue(mockAlertsManager);
    (WebVitalsMonitor.getInstance as any).mockReturnValue(mockWebVitalsMonitor);

    // Create monitor instance using singleton pattern
    monitor = PerformanceMonitor.getInstance({
      enabled: true,
      budgets: { enabled: true, checkInterval: 1000 },
      alerts: { enabled: true, maxAlerts: 10, retentionMs: 3600000, externalReporting: true },
      webVitals: { enabled: true, reportingThreshold: 0.1, sampleRate: 1.0 },
    });
  });

  afterEach(() => {
    // Cleanup
    PerformanceMonitor.destroyInstance();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(PerformanceMonitor);
    });

    it('should initialize with default configuration', () => {
      const instance = PerformanceMonitor.getInstance();
      const stats = instance.getPerformanceStats();

      expect(stats.totalMetrics).toBe(0);
      expect(stats.totalAlerts).toBe(0);
      expect(stats.averageLoadTime).toBe(0);
    });

    it('should validate configuration', () => {
      expect(() => {
        PerformanceMonitor.getInstance({
          enabled: true,
          budgets: { enabled: true, checkInterval: 500 }, // Too low
          alerts: { enabled: true, maxAlerts: 10, retentionMs: 3600000, externalReporting: true },
          webVitals: { enabled: true, reportingThreshold: 0.1, sampleRate: 1.0 },
        });
      }).not.toThrow(); // Should adjust to minimum interval
    });
  });

  describe('Performance Monitoring', () => {
    it('should track custom metrics', async () => {
      const metric = {
        name: 'custom-metric',
        value: 100,
        timestamp: new Date(),
        url: 'https://example.com',
        category: 'loading' as const,
        metadata: { source: 'test' },
      };

      await monitor.recordCustomMetric(metric);

      const customMetrics = monitor.getCustomMetrics();
      expect(customMetrics).toHaveLength(1);
      expect(customMetrics[0].name).toBe('custom-metric');
      expect(customMetrics[0].value).toBe(100);
    });

    it('should process metrics through budget checker', async () => {
      const metric = {
        name: 'LCP',
        value: 2500,
        timestamp: new Date(),
        url: 'https://example.com',
        category: 'loading' as const,
        metadata: {},
      };

      await monitor.recordCustomMetric(metric);

      expect(mockBudgetChecker.checkBudget).toHaveBeenCalledWith(metric);
    });

    it('should process metrics through alerts manager', async () => {
      const metric = {
        name: 'FID',
        value: 300,
        timestamp: new Date(),
        url: 'https://example.com',
        category: 'interactivity' as const,
        metadata: {},
      };

      await monitor.recordCustomMetric(metric);

      expect(mockAlertsManager.checkMetric).toHaveBeenCalledWith(metric);
    });

    it('should maintain metrics history within limits', async () => {
      // Add more than the maximum allowed metrics
      for (let i = 0; i < 1100; i++) {
        await monitor.recordCustomMetric({
          name: `metric-${i}`,
          value: i,
          timestamp: new Date(),
          url: 'https://example.com',
          category: 'loading' as const,
          metadata: {},
        });
      }

      const customMetrics = monitor.getCustomMetrics();
      expect(customMetrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Performance Statistics', () => {
    it('should calculate overall performance statistics', () => {
      const stats = monitor.getPerformanceStats();

      expect(stats).toHaveProperty('totalMetrics');
      expect(stats).toHaveProperty('totalAlerts');
      expect(stats).toHaveProperty('totalSuggestions');
      expect(stats).toHaveProperty('averageLoadTime');
      expect(stats).toHaveProperty('webVitalsScores');
      expect(stats).toHaveProperty('budgetCompliance');
      expect(stats).toHaveProperty('lastAnalysis');
      expect(stats.lastAnalysis).toBeInstanceOf(Date);
    });

    it('should get Web Vitals metrics', () => {
      const webVitals = monitor.getWebVitalsMetrics();

      expect(Array.isArray(webVitals)).toBe(true);
      expect(mockWebVitalsMonitor.getMetrics).toHaveBeenCalled();
    });

    it('should get custom metrics', () => {
      const customMetrics = monitor.getCustomMetrics();

      expect(Array.isArray(customMetrics)).toBe(true);
      expect(customMetrics).toEqual([]);
    });

    it('should get active alerts', () => {
      const alerts = monitor.getActiveAlerts();

      expect(Array.isArray(alerts)).toBe(true);
      expect(mockAlertsManager.getActiveAlerts).toHaveBeenCalled();
    });

    it('should get budget compliance stats', () => {
      const compliance = monitor.getBudgetCompliance();

      expect(compliance).toHaveProperty('passing');
      expect(compliance).toHaveProperty('warning');
      expect(compliance).toHaveProperty('failing');
      expect(mockBudgetChecker.getComplianceStats).toHaveBeenCalled();
    });

    it('should get overall performance score', () => {
      const score = monitor.getOverallScore();

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(mockWebVitalsMonitor.getOverallScore).toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration dynamically', () => {
      monitor.updateConfig({
        enabled: false,
        budgets: { enabled: false, checkInterval: 2000 },
        alerts: { enabled: false, maxAlerts: 10, retentionMs: 3600000, externalReporting: false },
        webVitals: { enabled: false, reportingThreshold: 0.1, sampleRate: 0.5 },
      });

      expect(mockWebVitalsMonitor.updateConfig).toHaveBeenCalledWith({
        enabled: false,
        reportingThreshold: 0.1,
        sampleRate: 0.5,
      });
      expect(mockAlertsManager.updateConfig).toHaveBeenCalledWith({
        enabled: false,
        maxAlerts: 10,
        retentionMs: 3600000,
        externalReporting: false,
      });
    });

    it('should handle monitoring state changes', () => {
      // Start monitoring
      monitor.updateConfig({
        enabled: true,
        budgets: { enabled: true, checkInterval: 1000 },
        alerts: { enabled: true, maxAlerts: 10, retentionMs: 3600000, externalReporting: true },
        webVitals: { enabled: true, reportingThreshold: 0.1, sampleRate: 1.0 },
      });

      // Stop monitoring
      monitor.updateConfig({
        enabled: false,
        budgets: { enabled: true, checkInterval: 1000 },
        alerts: { enabled: true, maxAlerts: 10, retentionMs: 3600000, externalReporting: true },
        webVitals: { enabled: true, reportingThreshold: 0.1, sampleRate: 1.0 },
      });

      expect(mockWebVitalsMonitor.disconnect).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Reset', () => {
    it('should reset all data', () => {
      // Add some data first
      monitor.recordCustomMetric({
        name: 'test-metric',
        value: 100,
        timestamp: new Date(),
        url: 'https://example.com',
        category: 'loading' as const,
        metadata: {},
      });

      monitor.reset();

      const customMetrics = monitor.getCustomMetrics();
      expect(customMetrics).toHaveLength(0);
      expect(mockBudgetChecker.resetHistory).toHaveBeenCalled();
      expect(mockAlertsManager.clearAlerts).toHaveBeenCalled();
    });

    it('should destroy instance properly', () => {
      PerformanceMonitor.destroyInstance();

      expect(mockWebVitalsMonitor.disconnect).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle metric processing errors gracefully', async () => {
      // Mock budget checker to throw error
      mockBudgetChecker.checkBudget.mockImplementation(() => {
        throw new Error('Budget check failed');
      });

      const metric = {
        name: 'LCP',
        value: 2500,
        timestamp: new Date(),
        url: 'https://example.com',
        category: 'loading' as const,
        metadata: {},
      };

      // Should not throw
      await expect(monitor.recordCustomMetric(metric)).resolves.toBeUndefined();
    });

    it('should handle alert checking errors gracefully', async () => {
      // Mock alerts manager to throw error
      mockAlertsManager.checkMetric.mockImplementation(() => {
        throw new Error('Alert check failed');
      });

      const metric = {
        name: 'FID',
        value: 300,
        timestamp: new Date(),
        url: 'https://example.com',
        category: 'interactivity' as const,
        metadata: {},
      };

      // Should not throw
      await expect(monitor.recordCustomMetric(metric)).resolves.toBeUndefined();
    });
  });

  describe('Performance Optimization', () => {
    it('should process multiple metrics efficiently', async () => {
      const startTime = performance.now();

      // Process many metrics
      const metrics = Array.from({ length: 100 }, (_, i) => ({
        name: `metric-${i}`,
        value: i,
        timestamp: new Date(),
        url: 'https://example.com',
        category: 'loading' as const,
        metadata: {},
      }));

      await Promise.all(metrics.map(metric => monitor.recordCustomMetric(metric)));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 1 second for 100 metrics)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent metric recording', async () => {
      const metrics = Array.from({ length: 50 }, (_, i) => ({
        name: `concurrent-metric-${i}`,
        value: i,
        timestamp: new Date(),
        url: 'https://example.com',
        category: 'loading' as const,
        metadata: {},
      }));

      // Record metrics concurrently
      await Promise.all(metrics.map(metric => monitor.recordCustomMetric(metric)));

      const customMetrics = monitor.getCustomMetrics();
      expect(customMetrics.length).toBe(50);
    });
  });
});
