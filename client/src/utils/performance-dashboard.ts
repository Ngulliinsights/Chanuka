/**
 * Performance Dashboard Utilities
 *
 * Provides utilities for displaying performance metrics, budgets, and reports
 * in the user interface.
 */

import { useState, useEffect } from 'react';

import { logger } from './logger';
import { performanceBudgetChecker, PerformanceBudget } from './performance';
import { runtimePerformanceMonitor } from './performance-monitor';

interface PerformanceReport {
  timestamp: number;
  sessionId: string;
  metrics: {
    coreWebVitals: {
      lcp?: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; budget: number };
      fid?: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; budget: number };
      cls?: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; budget: number };
      fcp?: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; budget: number };
      ttfb?: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; budget: number };
    };
    memoryUsage?: number;
    bundleSize?: number;
    customMetrics?: Record<string, number>;
  };
  budgetStatus: {
    overall: 'good' | 'warning' | 'error';
    score: number;
    violations: Array<{
      metric: string;
      actual: number;
      limit: number;
      severity: 'warning' | 'error';
    }>;
    warnings: Array<{
      metric: string;
      actual: number;
      limit: number;
      severity: 'warning';
    }>;
  };
  recommendations: string[];
  trends: {
    regressions: Array<{
      metric: string;
      baselineValue: number;
      currentValue: number;
      changePercentage: number;
    }>;
  };
}

interface DashboardConfig {
  showCoreWebVitals: boolean;
  showMemoryUsage: boolean;
  showBundleSize: boolean;
  showTrends: boolean;
  showRecommendations: boolean;
  refreshInterval: number; // milliseconds
}

interface PerformanceDashboardData {
  currentReport: PerformanceReport | null;
  historicalReports: PerformanceReport[];
  config: DashboardConfig;
  isLoading: boolean;
  lastUpdated: number;
}

/**
 * Performance Dashboard Service
 */
export class PerformanceDashboardService {
  private reports: PerformanceReport[] = [];
  private config: DashboardConfig;
  private refreshTimer: NodeJS.Timeout | null = null;
  private maxReports = 100; // Keep last 100 reports

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      showCoreWebVitals: true,
      showMemoryUsage: true,
      showBundleSize: true,
      showTrends: true,
      showRecommendations: true,
      refreshInterval: 30000, // 30 seconds
      ...config
    };
  }

  /**
   * Generate a comprehensive performance report
   */
  async generateReport(): Promise<PerformanceReport> {
    try {
      const metrics = runtimePerformanceMonitor.getMetrics();
      const sessionInfo = runtimePerformanceMonitor.getSessionInfo();

      const budgets = performanceBudgetChecker.getBudgets();

      // Check budgets for each metric
      const violations: Array<{ metric: string; actual: number; limit: number; severity: 'warning' | 'error' }> = [];
      const warnings: Array<{ metric: string; actual: number; limit: number; severity: 'warning' }> = [];

      // Check each metric individually
      const metricsToCheck = [
        { name: 'LCP', value: metrics.coreWebVitals.lcp },
        { name: 'FID', value: metrics.coreWebVitals.fid },
        { name: 'CLS', value: metrics.coreWebVitals.cls },
        { name: 'FCP', value: metrics.coreWebVitals.fcp },
        { name: 'TTFB', value: metrics.coreWebVitals.ttfb },
        { name: 'memory-usage', value: metrics.memoryUsage },
        { name: 'bundle-size', value: metrics.bundleSize }
      ].filter(m => m.value !== undefined);

      for (const metric of metricsToCheck) {
        const budgetResult = performanceBudgetChecker.checkBudget({
          name: metric.name,
          value: metric.value!,
          timestamp: new Date(),
          category: 'loading'
        });

        if (budgetResult.status === 'fail') {
          violations.push({
            metric: metric.name,
            actual: metric.value!,
            limit: budgetResult.budget?.budget || 0,
            severity: 'error'
          });
        } else if (budgetResult.status === 'warning') {
          warnings.push({
            metric: metric.name,
            actual: metric.value!,
            limit: budgetResult.budget?.warning || 0,
            severity: 'warning'
          });
        }
      }

      // Calculate overall score (simplified)
      const violationScore = violations.length * 20;
      const warningScore = warnings.length * 10;
      const score = Math.max(0, 100 - violationScore - warningScore);
      const overall = score >= 80 ? 'good' : score >= 50 ? 'warning' : 'error';

      // No regressions detection implemented yet
      const regressions: Array<{ metric: string; baselineValue: number; currentValue: number; changePercentage: number }> = [];

      const report: PerformanceReport = {
        timestamp: Date.now(),
        sessionId: sessionInfo.sessionId,
        metrics: {
          coreWebVitals: {
            lcp: metrics.coreWebVitals.lcp ? {
              value: metrics.coreWebVitals.lcp,
              rating: this.getRating('LCP', metrics.coreWebVitals.lcp, budgets),
              budget: this.getBudgetValue('LCP', budgets) || 2500
            } : undefined,
            fid: metrics.coreWebVitals.fid ? {
              value: metrics.coreWebVitals.fid,
              rating: this.getRating('FID', metrics.coreWebVitals.fid, budgets),
              budget: this.getBudgetValue('FID', budgets) || 100
            } : undefined,
            cls: metrics.coreWebVitals.cls ? {
              value: metrics.coreWebVitals.cls,
              rating: this.getRating('CLS', metrics.coreWebVitals.cls, budgets),
              budget: this.getBudgetValue('CLS', budgets) || 0.1
            } : undefined,
            fcp: metrics.coreWebVitals.fcp ? {
              value: metrics.coreWebVitals.fcp,
              rating: this.getRating('FCP', metrics.coreWebVitals.fcp, budgets),
              budget: this.getBudgetValue('FCP', budgets) || 1800
            } : undefined,
            ttfb: metrics.coreWebVitals.ttfb ? {
              value: metrics.coreWebVitals.ttfb,
              rating: this.getRating('TTFB', metrics.coreWebVitals.ttfb, budgets),
              budget: this.getBudgetValue('TTFB', budgets) || 800
            } : undefined,
          },
          memoryUsage: metrics.memoryUsage,
          bundleSize: metrics.bundleSize,
          customMetrics: metrics.customMetrics
        },
        budgetStatus: {
          overall,
          score,
          violations,
          warnings
        },
        recommendations: this.generateRecommendations({ violations, warnings }),
        trends: {
          regressions
        }
      };

      // Store report
      this.reports.push(report);
      if (this.reports.length > this.maxReports) {
        this.reports.shift();
      }

      return report;
    } catch (error) {
      logger.error('Failed to generate performance report', { error });
      throw error;
    }
  }

  /**
   * Get current dashboard data
   */
  async getDashboardData(): Promise<PerformanceDashboardData> {
    const currentReport = this.reports.length > 0 ? this.reports[this.reports.length - 1] : null;

    return {
      currentReport,
      historicalReports: [...this.reports],
      config: { ...this.config },
      isLoading: false,
      lastUpdated: currentReport?.timestamp || 0
    };
  }

  /**
   * Start automatic report generation
   */
  startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      try {
        await this.generateReport();
      } catch (error) {
        logger.error('Failed to auto-generate performance report', { error });
      }
    }, this.config.refreshInterval);
  }

  /**
   * Stop automatic report generation
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Update dashboard configuration
   */
  updateConfig(newConfig: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart auto-refresh if interval changed
    if (newConfig.refreshInterval) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
    }
  }

  /**
   * Get budget value for a metric
   */
  private getBudgetValue(metric: string, budgets: PerformanceBudget[]): number | undefined {
    const budget = budgets.find(b => b.metric === metric);
    return budget?.budget;
  }

  /**
   * Get performance rating for a metric
   */
  private getRating(metric: string, value: number, budgets: PerformanceBudget[]): 'good' | 'needs-improvement' | 'poor' {
    const budget = budgets.find(b => b.metric === metric);
    if (!budget) return 'good';

    if (value <= budget.warning) return 'good';
    if (value <= budget.budget) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(data: { violations: Array<{ metric: string; actual: number; limit: number; severity: 'warning' | 'error' }>; warnings: Array<{ metric: string; actual: number; limit: number; severity: 'warning' }> }): string[] {
    const recommendations: string[] = [];

    if (data.violations.some((v) => v.metric.includes('LCP'))) {
      recommendations.push('Optimize Largest Contentful Paint by improving image loading and reducing render-blocking resources');
    }

    if (data.violations.some((v) => v.metric.includes('FID'))) {
      recommendations.push('Improve First Input Delay by reducing JavaScript execution time and optimizing event handlers');
    }

    if (data.violations.some((v) => v.metric.includes('CLS'))) {
      recommendations.push('Fix Cumulative Layout Shift by reserving space for dynamic content and avoiding DOM manipulation');
    }

    if (data.violations.some((v) => v.metric.includes('bundle-size'))) {
      recommendations.push('Reduce bundle size through code splitting, tree shaking, and lazy loading');
    }

    if (data.warnings.length > 0) {
      recommendations.push('Monitor warning-level metrics to prevent future violations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable limits - continue monitoring for regressions');
    }

    return recommendations;
  }

  /**
   * Export reports as JSON
   */
  exportReports(): string {
    return JSON.stringify({
      reports: this.reports,
      config: this.config,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Clear all stored reports
   */
  clearReports(): void {
    this.reports = [];
  }

  /**
   * Get performance summary for quick display
   */
  getSummary(): {
    overall: 'good' | 'warning' | 'error';
    score: number;
    activeViolations: number;
    activeWarnings: number;
    lastUpdated: number;
  } {
    const latest = this.reports[this.reports.length - 1];

    if (!latest) {
      return {
        overall: 'good',
        score: 100,
        activeViolations: 0,
        activeWarnings: 0,
        lastUpdated: 0
      };
    }

    return {
      overall: latest.budgetStatus.overall,
      score: latest.budgetStatus.score,
      activeViolations: latest.budgetStatus.violations.length,
      activeWarnings: latest.budgetStatus.warnings.length,
      lastUpdated: latest.timestamp
    };
  }
}

// Global instance
export const performanceDashboard = new PerformanceDashboardService();

// React hook for using dashboard data
export function usePerformanceDashboard() {
  const [data, setData] = useState<PerformanceDashboardData>({
    currentReport: null,
    historicalReports: [],
    config: performanceDashboard['config'],
    isLoading: true,
    lastUpdated: 0
  });

  useEffect(() => {
    let mounted = true;

    const updateData = async () => {
      try {
        const dashboardData = await performanceDashboard.getDashboardData();
        if (mounted) {
          setData(dashboardData);
        }
      } catch (error) {
        logger.error('Failed to update dashboard data', { error });
      }
    };

    // Initial load
    updateData();

    // Start auto-refresh
    performanceDashboard.startAutoRefresh();

    // Set up periodic updates
    const intervalId = setInterval(updateData, 5000); // Update every 5 seconds

    return () => {
      mounted = false;
      clearInterval(intervalId);
      performanceDashboard.stopAutoRefresh();
    };
  }, []);

  return data;
}
