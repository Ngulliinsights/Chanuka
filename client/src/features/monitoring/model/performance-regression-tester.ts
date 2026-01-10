/**
 * Performance Regression Tester
 *
 * Automated performance regression testing system that monitors performance
 * metrics and alerts when performance degrades beyond acceptable thresholds
 *
 * Requirements: 11.4, 11.5
 */

import { logger } from '@client/shared/utils/logger';

/**
 * Performance baseline for a route
 */
interface PerformanceBaseline {
  routePath: string;
  averageLoadTime: number;
  averageRenderTime: number;
  averageResourceCount: number;
  averageMemoryUsage: number;
  sampleCount: number;
  lastUpdated: Date;
  thresholds: {
    loadTimeThreshold: number; // Maximum acceptable load time
    renderTimeThreshold: number; // Maximum acceptable render time
    resourceCountThreshold: number; // Maximum acceptable resource count
    memoryUsageThreshold: number; // Maximum acceptable memory usage
  };
}

/**
 * Performance test result
 */
interface PerformanceTestResult {
  routePath: string;
  loadTime: number;
  renderTime: number;
  resourceCount: number;
  memoryUsage: number;
  timestamp: Date;
  passed: boolean;
  regressions: PerformanceRegression[];
}

/**
 * Performance regression details
 */
interface PerformanceRegression {
  metric: 'loadTime' | 'renderTime' | 'resourceCount' | 'memoryUsage';
  currentValue: number;
  baselineValue: number;
  threshold: number;
  severity: 'minor' | 'major' | 'critical';
  percentageIncrease: number;
}

class PerformanceRegressionTester {
  private static instance: PerformanceRegressionTester;
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private testResults: PerformanceTestResult[] = [];
  private isRunning = false;
  private testInterval: NodeJS.Timeout | null = null;

  static getInstance(): PerformanceRegressionTester {
    if (!PerformanceRegressionTester.instance) {
      PerformanceRegressionTester.instance = new PerformanceRegressionTester();
    }
    return PerformanceRegressionTester.instance;
  }

  /**
   * Start automated regression testing
   */
  startAutomatedTesting(intervalMs: number = 300000): void {
    // 5 minutes default
    if (this.isRunning) {
      logger.warn('Performance regression testing already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting automated performance regression testing');

    this.testInterval = setInterval(() => {
      this.runRegressionTests();
    }, intervalMs);
  }

  /**
   * Stop automated regression testing
   */
  stopAutomatedTesting(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }

    logger.info('Stopped automated performance regression testing');
  }

  /**
   * Run regression tests for all routes
   */
  private async runRegressionTests(): Promise<void> {
    const routes = this.getTestRoutes();

    for (const route of routes) {
      try {
        const result = await this.testRoute(route);
        this.testResults.push(result);

        if (!result.passed) {
          this.handleRegressionDetected(result);
        }

        // Keep only last 100 results
        if (this.testResults.length > 100) {
          this.testResults = this.testResults.slice(-50);
        }
      } catch (error) {
        logger.error(`Failed to test route ${route}`, { error });
      }
    }
  }

  /**
   * Test a specific route for performance regressions
   */
  private async testRoute(routePath: string): Promise<PerformanceTestResult> {
    const startTime = performance.now();

    // Simulate navigation and measurement
    const metrics = await this.measureRoutePerformance(routePath);
    const baseline = this.baselines.get(routePath);

    const result: PerformanceTestResult = {
      routePath,
      ...metrics,
      timestamp: new Date(),
      passed: true,
      regressions: [],
    };

    if (baseline) {
      result.regressions = this.detectRegressions(metrics, baseline);
      result.passed = result.regressions.length === 0;
    }

    return result;
  }

  /**
   * Measure performance metrics for a route
   */
  private async measureRoutePerformance(routePath: string): Promise<{
    loadTime: number;
    renderTime: number;
    resourceCount: number;
    memoryUsage: number;
  }> {
    // Simplified measurement - in real implementation would navigate and measure
    return {
      loadTime: Math.random() * 2000 + 500, // 500-2500ms
      renderTime: Math.random() * 100 + 10, // 10-110ms
      resourceCount: Math.floor(Math.random() * 50) + 10, // 10-60 resources
      memoryUsage: Math.random() * 50 + 20, // 20-70MB
    };
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(
    metrics: { loadTime: number; renderTime: number; resourceCount: number; memoryUsage: number },
    baseline: PerformanceBaseline
  ): PerformanceRegression[] {
    const regressions: PerformanceRegression[] = [];

    // Check each metric against baseline and thresholds
    const checks = [
      {
        metric: 'loadTime' as const,
        current: metrics.loadTime,
        baseline: baseline.averageLoadTime,
        threshold: baseline.thresholds.loadTimeThreshold,
      },
      {
        metric: 'renderTime' as const,
        current: metrics.renderTime,
        baseline: baseline.averageRenderTime,
        threshold: baseline.thresholds.renderTimeThreshold,
      },
      {
        metric: 'resourceCount' as const,
        current: metrics.resourceCount,
        baseline: baseline.averageResourceCount,
        threshold: baseline.thresholds.resourceCountThreshold,
      },
      {
        metric: 'memoryUsage' as const,
        current: metrics.memoryUsage,
        baseline: baseline.averageMemoryUsage,
        threshold: baseline.thresholds.memoryUsageThreshold,
      },
    ];

    for (const check of checks) {
      if (check.current > check.threshold) {
        const percentageIncrease = ((check.current - check.baseline) / check.baseline) * 100;

        let severity: 'minor' | 'major' | 'critical' = 'minor';
        if (percentageIncrease > 50) severity = 'critical';
        else if (percentageIncrease > 25) severity = 'major';

        regressions.push({
          metric: check.metric,
          currentValue: check.current,
          baselineValue: check.baseline,
          threshold: check.threshold,
          severity,
          percentageIncrease,
        });
      }
    }

    return regressions;
  }

  /**
   * Handle regression detection
   */
  private handleRegressionDetected(result: PerformanceTestResult): void {
    logger.error('Performance regression detected', {
      route: result.routePath,
      regressions: result.regressions,
    });

    // In a real implementation, this would:
    // - Send alerts to development team
    // - Create GitHub issues
    // - Update monitoring dashboards
    // - Trigger automated rollback if critical
  }

  /**
   * Get routes to test
   */
  private getTestRoutes(): string[] {
    return ['/', '/dashboard', '/search', '/bills', '/community'];
  }

  /**
   * Set baseline for a route
   */
  setBaseline(
    routePath: string,
    baseline: Omit<PerformanceBaseline, 'routePath' | 'lastUpdated'>
  ): void {
    this.baselines.set(routePath, {
      ...baseline,
      routePath,
      lastUpdated: new Date(),
    });

    logger.info(`Performance baseline set for ${routePath}`, { baseline });
  }

  /**
   * Get test results
   */
  getTestResults(): PerformanceTestResult[] {
    return [...this.testResults];
  }

  /**
   * Get baselines
   */
  getBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.baselines);
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = [];
  }
}

// Export singleton instance
export const performanceRegressionTester = PerformanceRegressionTester.getInstance();

// Export types
export type { PerformanceBaseline, PerformanceTestResult, PerformanceRegression };
