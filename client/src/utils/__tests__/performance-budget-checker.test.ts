/**
 * Performance Budget Checker Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceBudgetChecker } from '../performance';

describe('PerformanceBudgetChecker', () => {
  beforeEach(() => {
    // Reset any stored historical data
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkBudgets', () => {
    it('should validate Core Web Vitals within budget', async () => {
      const metrics = {
        lcp: 2000, // Within 2500ms budget
        fid: 50,   // Within 100ms budget
        cls: 0.05, // Within 0.1 budget
        fcp: 1500, // Within 1800ms budget
        ttfb: 600  // Within 800ms budget
      };

      const result = await performanceBudgetChecker.checkBudgets(metrics);

      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.overallHealth).toBe('good');
      expect(result.score).toBeGreaterThan(90);
    });

    it('should detect budget violations', async () => {
      const metrics = {
        lcp: 3000, // Exceeds 2500ms budget
        fid: 150,  // Exceeds 100ms budget
        cls: 0.15  // Exceeds 0.1 budget
      };

      const result = await performanceBudgetChecker.checkBudgets(metrics);

      expect(result.violations).toHaveLength(3);
      expect(result.overallHealth).toBe('error');
      expect(result.score).toBeLessThan(80);
    });

    it('should detect budget warnings', async () => {
      const metrics = {
        lcp: 2400, // 96% of budget (warning threshold is 90%)
        fid: 95,   // 95% of budget
      };

      const result = await performanceBudgetChecker.checkBudgets(metrics);

      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(2);
      expect(result.overallHealth).toBe('warning');
    });

    it('should handle bundle size validation', async () => {
      const metrics = {
        bundleSize: 2200000 // 2.2MB, exceeds 2MB budget
      };

      const result = await performanceBudgetChecker.checkBudgets(metrics);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metric).toBe('Bundle Size');
      expect(result.violations[0].actual).toBe(2200000);
    });

    it('should calculate correct performance score', async () => {
      const metrics = {
        lcp: 3000, // 20% over budget
        fid: 50,   // Good
        cls: 0.05, // Good
      };

      const result = await performanceBudgetChecker.checkBudgets(metrics);

      // Score should be reduced due to LCP violation
      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThan(70);
    });
  });

  describe('detectRegressions', () => {
    it('should detect performance regressions', async () => {
      // First, add some historical data
      const historicalMetrics = [
        { lcp: 2000, fid: 50, cls: 0.05 },
        { lcp: 2100, fid: 55, cls: 0.06 },
        { lcp: 2050, fid: 52, cls: 0.055 },
      ];

      // Simulate historical data by calling checkBudgets multiple times
      for (const metrics of historicalMetrics) {
        await performanceBudgetChecker.checkBudgets(metrics);
      }

      // Now test with a significant regression
      const currentMetrics = {
        lcp: 2800, // 37% increase from baseline
        fid: 50,
        cls: 0.05
      };

      const regressions = performanceBudgetChecker.detectRegressions(currentMetrics);

      expect(regressions).toHaveLength(1);
      expect(regressions[0].isRegression).toBe(true);
      expect(regressions[0].metric).toBe('lcp');
      expect(regressions[0].changePercentage).toBeGreaterThan(30);
    });

    it('should not detect regressions for minor changes', async () => {
      // Add baseline data
      await performanceBudgetChecker.checkBudgets({ lcp: 2000 });

      // Test with minor change (less than 10%)
      const currentMetrics = { lcp: 2100 }; // 5% increase
      const regressions = performanceBudgetChecker.detectRegressions(currentMetrics);

      expect(regressions).toHaveLength(0);
    });
  });

  describe('budget configuration', () => {
    it('should return current budget configuration', () => {
      const budgets = performanceBudgetChecker.getBudgets();

      expect(budgets).toBeDefined();
      expect(budgets?.budgets).toBeDefined();
      expect(budgets?.budgets.coreWebVitals).toBeDefined();
      expect(budgets?.budgets.bundle).toBeDefined();
    });

    it('should check if monitoring is enabled', () => {
      const isEnabled = performanceBudgetChecker.isMonitoringEnabled();
      expect(typeof isEnabled).toBe('boolean');
    });

    it('should return alert configuration', () => {
      const alertConfig = performanceBudgetChecker.getAlertConfig();

      expect(alertConfig).toHaveProperty('slack');
      expect(alertConfig).toHaveProperty('email');
      expect(alertConfig).toHaveProperty('github');
    });
  });

  describe('error handling', () => {
    it('should handle invalid metrics gracefully', async () => {
      const invalidMetrics = {
        lcp: 'invalid' as any,
        fid: null as any,
        cls: undefined
      };

      const result = await performanceBudgetChecker.checkBudgets(invalidMetrics);

      // Should not crash and return valid result
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('overallHealth');
    });

    it('should handle missing budgets gracefully', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // Force reload of budgets (this will use fallback)
      const { PerformanceBudgetChecker } = await import('../performance');
      const checker = new PerformanceBudgetChecker();

      const result = await checker.checkBudgets({ lcp: 2000 });

      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('overallHealth');
    });
  });
});