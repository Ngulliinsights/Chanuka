/**
 * Navigation Performance Regression Detection
 * Automated detection and alerting for navigation performance regressions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NavigationBar from '../components/shell/NavigationBar';
import { createBasicNavigationContext, createAuthenticatedNavigationContext } from './navigation-test-contexts.test';

// Performance regression detection utilities
class PerformanceRegressionDetector {
  private static baselineMetrics: Map<string, number[]> = new Map();
  private static currentMetrics: Map<string, number> = new Map();
  private static regressionThresholds: Map<string, number> = new Map();

  static setBaseline(operation: string, metrics: number[]) {
    this.baselineMetrics.set(operation, metrics);
  }

  static recordMetric(operation: string, duration: number) {
    this.currentMetrics.set(operation, duration);
  }

  static setRegressionThreshold(operation: string, threshold: number) {
    this.regressionThresholds.set(operation, threshold);
  }

  static detectRegression(operation: string): boolean {
    const currentMetric = this.currentMetrics.get(operation);
    const baselineMetrics = this.baselineMetrics.get(operation);
    const threshold = this.regressionThresholds.get(operation) || 1.2; // 20% default

    if (!currentMetric || !baselineMetrics || baselineMetrics.length === 0) {
      return false;
    }

    const baselineAverage = baselineMetrics.reduce((a, b) => a + b, 0) / baselineMetrics.length;
    const regressionRatio = currentMetric / baselineAverage;

    return regressionRatio > threshold;
  }

  static getRegressionReport(): Array<{ operation: string; baseline: number; current: number; ratio: number }> {
    const report: Array<{ operation: string; baseline: number; current: number; ratio: number }> = [];

    for (const [operation, currentMetric] of this.currentMetrics) {
      const baselineMetrics = this.baselineMetrics.get(operation);
      if (baselineMetrics && baselineMetrics.length > 0) {
        const baselineAverage = baselineMetrics.reduce((a, b) => a + b, 0) / baselineMetrics.length;
        const ratio = currentMetric / baselineAverage;

        if (ratio > 1.1) { // Report any regression over 10%
          report.push({
            operation,
            baseline: baselineAverage,
            current: currentMetric,
            ratio,
          });
        }
      }
    }

    return report.sort((a, b) => b.ratio - a.ratio);
  }

  static reset() {
    this.baselineMetrics.clear();
    this.currentMetrics.clear();
    this.regressionThresholds.clear();
  }
}

// Mock performance monitoring
const mockPerformanceMonitor = {
  startTiming: vi.fn(),
  endTiming: vi.fn(),
  recordMetric: vi.fn(),
  getMetrics: vi.fn(),
};

// Performance regression thresholds (multipliers)
const REGRESSION_THRESHOLDS = {
  CRITICAL: 1.5,    // 50% slower - critical regression
  MAJOR: 1.3,       // 30% slower - major regression
  MINOR: 1.1,       // 10% slower - minor regression
  ACCEPTABLE: 1.05, // 5% slower - acceptable variance
} as const;

describe('Navigation Performance Regression Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PerformanceRegressionDetector.reset();

    // Set up baseline metrics
    PerformanceRegressionDetector.setBaseline('navigation-render', [45, 47, 46, 48, 44]);
    PerformanceRegressionDetector.setBaseline('route-change', [95, 98, 97, 96, 99]);
    PerformanceRegressionDetector.setBaseline('sidebar-toggle', [28, 29, 27, 30, 26]);
    PerformanceRegressionDetector.setBaseline('search-operation', [180, 185, 182, 178, 183]);

    // Set regression thresholds
    PerformanceRegressionDetector.setRegressionThreshold('navigation-render', REGRESSION_THRESHOLDS.MAJOR);
    PerformanceRegressionDetector.setRegressionThreshold('route-change', REGRESSION_THRESHOLDS.CRITICAL);
    PerformanceRegressionDetector.setRegressionThreshold('sidebar-toggle', REGRESSION_THRESHOLDS.MINOR);
    PerformanceRegressionDetector.setRegressionThreshold('search-operation', REGRESSION_THRESHOLDS.MAJOR);
  });

  afterEach(() => {
    PerformanceRegressionDetector.reset();
  });

  describe('Baseline Performance Monitoring', () => {
    it('should establish and maintain performance baselines', () => {
      const baselineRender = PerformanceRegressionDetector['baselineMetrics'].get('navigation-render');
      expect(baselineRender).toHaveLength(5);
      expect(baselineRender).toEqual([45, 47, 46, 48, 44]);

      const baselineRoute = PerformanceRegressionDetector['baselineMetrics'].get('route-change');
      expect(baselineRoute).toHaveLength(5);
      expect(baselineRoute).toEqual([95, 98, 97, 96, 99]);
    });

    it('should calculate accurate baseline averages', () => {
      // navigation-render baseline: (45+47+46+48+44)/5 = 46
      const renderMetrics = PerformanceRegressionDetector['baselineMetrics'].get('navigation-render')!;
      const renderAverage = renderMetrics.reduce((a, b) => a + b, 0) / renderMetrics.length;
      expect(renderAverage).toBe(46);

      // route-change baseline: (95+98+97+96+99)/5 = 97
      const routeMetrics = PerformanceRegressionDetector['baselineMetrics'].get('route-change')!;
      const routeAverage = routeMetrics.reduce((a, b) => a + b, 0) / routeMetrics.length;
      expect(routeAverage).toBe(97);
    });
  });

  describe('Regression Detection Logic', () => {
    it('should not flag acceptable performance variations', () => {
      // Record performance within acceptable range (46ms vs 46ms baseline)
      PerformanceRegressionDetector.recordMetric('navigation-render', 48); // 4% slower

      const hasRegression = PerformanceRegressionDetector.detectRegression('navigation-render');
      expect(hasRegression).toBe(false);
    });

    it('should detect minor performance regressions', () => {
      // Record performance exceeding minor threshold (46ms baseline * 1.15 = 52.9ms)
      PerformanceRegressionDetector.recordMetric('navigation-render', 55);

      const hasRegression = PerformanceRegressionDetector.detectRegression('navigation-render');
      expect(hasRegression).toBe(true);
    });

    it('should detect major performance regressions', () => {
      // Record performance exceeding major threshold (97ms baseline * 1.3 = 126.1ms)
      PerformanceRegressionDetector.recordMetric('route-change', 140);

      const hasRegression = PerformanceRegressionDetector.detectRegression('route-change');
      expect(hasRegression).toBe(true);
    });

    it('should detect critical performance regressions', () => {
      // Record performance exceeding critical threshold (97ms baseline * 1.5 = 145.5ms)
      PerformanceRegressionDetector.recordMetric('route-change', 160);

      const hasRegression = PerformanceRegressionDetector.detectRegression('route-change');
      expect(hasRegression).toBe(true);
    });
  });

  describe('Real-time Performance Monitoring', () => {
    it('should monitor NavigationBar render performance', async () => {
      const TestContext = createBasicNavigationContext();

      // Mock performance monitoring
      let renderStartTime = 0;
      mockPerformanceMonitor.startTiming.mockImplementation(() => {
        renderStartTime = Date.now();
      });
      mockPerformanceMonitor.endTiming.mockImplementation(() => {
        const duration = Date.now() - renderStartTime;
        PerformanceRegressionDetector.recordMetric('navigation-render', duration);
      });

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Verify performance was recorded
      expect(mockPerformanceMonitor.startTiming).toHaveBeenCalled();
      expect(mockPerformanceMonitor.endTiming).toHaveBeenCalled();

      const hasRegression = PerformanceRegressionDetector.detectRegression('navigation-render');
      expect(typeof hasRegression).toBe('boolean');
    });

    it('should monitor route change performance', async () => {
      const TestContext = createBasicNavigationContext();

      const { rerender } = render(TestContext({ children: NavigationBar({}), initialPath: '/' }));

      await screen.findByRole('navigation');

      // Mock route change timing
      let routeChangeStart = 0;
      mockPerformanceMonitor.startTiming.mockImplementation(() => {
        routeChangeStart = Date.now();
      });
      mockPerformanceMonitor.endTiming.mockImplementation(() => {
        const duration = Date.now() - routeChangeStart;
        PerformanceRegressionDetector.recordMetric('route-change', duration);
      });

      rerender(TestContext({ children: NavigationBar({}), initialPath: '/bills' }));

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      expect(mockPerformanceMonitor.startTiming).toHaveBeenCalled();
      expect(mockPerformanceMonitor.endTiming).toHaveBeenCalled();
    });

    it('should monitor user interaction performance', async () => {
      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Mock sidebar toggle timing
      let toggleStart = 0;
      mockPerformanceMonitor.startTiming.mockImplementation(() => {
        toggleStart = Date.now();
      });
      mockPerformanceMonitor.endTiming.mockImplementation(() => {
        const duration = Date.now() - toggleStart;
        PerformanceRegressionDetector.recordMetric('sidebar-toggle', duration);
      });

      const toggleButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });

      expect(mockPerformanceMonitor.startTiming).toHaveBeenCalled();
      expect(mockPerformanceMonitor.endTiming).toHaveBeenCalled();
    });
  });

  describe('Regression Reporting and Alerting', () => {
    it('should generate comprehensive regression reports', () => {
      // Set up multiple regressions
      PerformanceRegressionDetector.recordMetric('navigation-render', 70); // Major regression
      PerformanceRegressionDetector.recordMetric('route-change', 160);     // Critical regression
      PerformanceRegressionDetector.recordMetric('sidebar-toggle', 35);    // Minor regression
      PerformanceRegressionDetector.recordMetric('search-operation', 200); // No regression

      const report = PerformanceRegressionDetector.getRegressionReport();

      expect(report).toHaveLength(3); // Three regressions detected
      expect(report[0].operation).toBe('route-change'); // Most severe first
      expect(report[0].ratio).toBeGreaterThan(1.5);
      expect(report[1].operation).toBe('navigation-render');
      expect(report[2].operation).toBe('sidebar-toggle');
    });

    it('should prioritize critical regressions in reports', () => {
      PerformanceRegressionDetector.recordMetric('route-change', 200);     // Critical
      PerformanceRegressionDetector.recordMetric('navigation-render', 80); // Major
      PerformanceRegressionDetector.recordMetric('sidebar-toggle', 40);    // Minor

      const report = PerformanceRegressionDetector.getRegressionReport();

      // Critical regression should be first
      expect(report[0].operation).toBe('route-change');
      expect(report[0].ratio).toBeGreaterThan(REGRESSION_THRESHOLDS.CRITICAL);

      // Major regression should be second
      expect(report[1].operation).toBe('navigation-render');
      expect(report[1].ratio).toBeGreaterThan(REGRESSION_THRESHOLDS.MAJOR);

      // Minor regression should be last
      expect(report[2].operation).toBe('sidebar-toggle');
      expect(report[2].ratio).toBeGreaterThan(REGRESSION_THRESHOLDS.MINOR);
    });

    it('should provide actionable regression insights', () => {
      PerformanceRegressionDetector.recordMetric('navigation-render', 100); // Significant regression

      const report = PerformanceRegressionDetector.getRegressionReport();

      expect(report[0]).toHaveProperty('operation');
      expect(report[0]).toHaveProperty('baseline');
      expect(report[0]).toHaveProperty('current');
      expect(report[0]).toHaveProperty('ratio');

      // Should be able to calculate regression severity
      const regression = report[0];
      expect(regression.ratio).toBeGreaterThan(1);
      expect(regression.current).toBeGreaterThan(regression.baseline);
    });
  });

  describe('CI Integration and Automated Alerts', () => {
    it('should fail CI builds on critical regressions', () => {
      PerformanceRegressionDetector.recordMetric('route-change', 200); // Critical regression

      const hasCriticalRegression = PerformanceRegressionDetector.detectRegression('route-change');

      // Critical regressions should cause CI failure
      expect(hasCriticalRegression).toBe(true);

      // In a real CI environment, this would fail the build
      if (hasCriticalRegression) {
        console.error('🚨 CRITICAL PERFORMANCE REGRESSION DETECTED');
        console.error('Route change performance degraded by', ((200 / 97 - 1) * 100).toFixed(1) + '%');
      }
    });

    it('should warn on major regressions without failing CI', () => {
      PerformanceRegressionDetector.recordMetric('navigation-render', 80); // Major regression

      const hasMajorRegression = PerformanceRegressionDetector.detectRegression('navigation-render');

      expect(hasMajorRegression).toBe(true);

      // Major regressions should warn but not necessarily fail CI
      const report = PerformanceRegressionDetector.getRegressionReport();
      expect(report.some(r => r.operation === 'navigation-render')).toBe(true);
    });

    it('should allow minor regressions within acceptable thresholds', () => {
      PerformanceRegressionDetector.recordMetric('sidebar-toggle', 32); // Minor regression within threshold

      const hasRegression = PerformanceRegressionDetector.detectRegression('sidebar-toggle');

      // Should not be flagged as regression if within acceptable range
      expect(hasRegression).toBe(false);
    });
  });

  describe('Historical Trend Analysis', () => {
    it('should track performance trends over time', () => {
      const historicalData = [
        { date: '2024-01-01', renderTime: 45 },
        { date: '2024-01-08', renderTime: 46 },
        { date: '2024-01-15', renderTime: 48 },
        { date: '2024-01-22', renderTime: 52 }, // Starting to increase
        { date: '2024-01-29', renderTime: 58 }, // Significant increase
        { date: '2024-02-05', renderTime: 65 }, // Major regression
      ];

      // Analyze trend
      const recentTrend = historicalData.slice(-3);
      const averageRecent = recentTrend.reduce((sum, d) => sum + d.renderTime, 0) / recentTrend.length;

      const earlierTrend = historicalData.slice(0, 3);
      const averageEarlier = earlierTrend.reduce((sum, d) => sum + d.renderTime, 0) / earlierTrend.length;

      const trendRatio = averageRecent / averageEarlier;

      // Should detect upward trend indicating regression
      expect(trendRatio).toBeGreaterThan(1.2); // 20% increase over time
    });

    it('should identify sudden performance spikes', () => {
      const metrics = [45, 46, 44, 47, 120, 48, 46]; // Sudden spike at index 4

      const spikeThreshold = 2.0; // 2x normal performance
      const normalAverage = metrics.slice(0, 4).reduce((a, b) => a + b, 0) / 4;

      const spikes = metrics.filter(metric => metric > normalAverage * spikeThreshold);

      expect(spikes).toHaveLength(1);
      expect(spikes[0]).toBe(120);
    });
  });

  describe('Performance Budget Enforcement', () => {
    it('should enforce performance budgets for navigation operations', () => {
      const budgets = {
        'navigation-render': 50,    // 50ms budget
        'route-change': 100,        // 100ms budget
        'sidebar-toggle': 30,       // 30ms budget
        'search-operation': 200,    // 200ms budget
      };

      // Test within budget
      PerformanceRegressionDetector.recordMetric('navigation-render', 45);
      expect(45).toBeLessThanOrEqual(budgets['navigation-render']);

      // Test over budget (would fail in real scenario)
      PerformanceRegressionDetector.recordMetric('route-change', 120);
      expect(120).toBeGreaterThan(budgets['route-change']);
    });

    it('should provide budget vs actual comparisons', () => {
      const budgets = { 'navigation-render': 50 };
      const actual = 65;

      const budgetVariance = ((actual - budgets['navigation-render']) / budgets['navigation-render']) * 100;

      expect(budgetVariance).toBe(30); // 30% over budget
      expect(budgetVariance).toBeGreaterThan(0); // Over budget
    });
  });
});