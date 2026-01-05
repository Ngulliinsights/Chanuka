/**
 * Performance Regression Tester
 *
 * Automated performance regression testing system that monitors performance
 * metrics and alerts when performance degrades beyond acceptable thresholds
 *
 * Requirements: 11.4, 11.5
 */

import { logger } from '@client/utils/logger';

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
  thresholdValue: number;
  percentageIncrease: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Performance regression test configuration
 */
interface RegressionTestConfig {
  enabled: boolean;
  autoRun: boolean;
  testInterval: number; // in milliseconds
  baselineUpdateThreshold: number; // percentage change to update baseline
  alertThresholds: {
    loadTime: number; // percentage increase threshold
    renderTime: number;
    resourceCount: number;
    memoryUsage: number;
  };
  routes: string[]; // routes to test
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RegressionTestConfig = {
  enabled: process.env.NODE_ENV === 'development',
  autoRun: true,
  testInterval: 60000, // 1 minute
  baselineUpdateThreshold: 10, // 10% change
  alertThresholds: {
    loadTime: 20, // 20% increase
    renderTime: 30, // 30% increase
    resourceCount: 25, // 25% increase
    memoryUsage: 40 // 40% increase
  },
  routes: ['/', '/bills', '/search', '/dashboard', '/community']
};

/**
 * Performance Regression Tester Class
 */
export class PerformanceRegressionTester {
  private static instance: PerformanceRegressionTester;

  private config: RegressionTestConfig;
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private testResults: PerformanceTestResult[] = [];
  private testInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private constructor(config: Partial<RegressionTestConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadBaselines();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<RegressionTestConfig>): PerformanceRegressionTester {
    if (!PerformanceRegressionTester.instance) {
      PerformanceRegressionTester.instance = new PerformanceRegressionTester(config);
    }
    return PerformanceRegressionTester.instance;
  }

  /**
   * Load performance baselines from localStorage
   */
  private loadBaselines(): void {
    try {
      const stored = localStorage.getItem('performance-baselines');
      if (stored) {
        const baselines = JSON.parse(stored);
        Object.entries(baselines).forEach(([route, baseline]) => {
          this.baselines.set(route, {
            ...baseline as PerformanceBaseline,
            lastUpdated: new Date((baseline as any).lastUpdated)
          });
        });
        logger.info('Performance baselines loaded', { count: this.baselines.size });
      }
    } catch (error) {
      logger.warn('Failed to load performance baselines', { error });
    }
  }

  /**
   * Save performance baselines to localStorage
   */
  private saveBaselines(): void {
    try {
      const baselines = Object.fromEntries(this.baselines);
      localStorage.setItem('performance-baselines', JSON.stringify(baselines));
      logger.debug('Performance baselines saved');
    } catch (error) {
      logger.warn('Failed to save performance baselines', { error });
    }
  }

  /**
   * Create or update baseline for a route
   */
  public updateBaseline(
    routePath: string,
    loadTime: number,
    renderTime: number,
    resourceCount: number,
    memoryUsage: number
  ): void {
    const existing = this.baselines.get(routePath);

    if (existing) {
      // Update existing baseline with weighted average
      const weight = 0.8; // Give more weight to existing data
      existing.averageLoadTime = existing.averageLoadTime * weight + loadTime * (1 - weight);
      existing.averageRenderTime = existing.averageRenderTime * weight + renderTime * (1 - weight);
      existing.averageResourceCount = existing.averageResourceCount * weight + resourceCount * (1 - weight);
      existing.averageMemoryUsage = existing.averageMemoryUsage * weight + memoryUsage * (1 - weight);
      existing.sampleCount++;
      existing.lastUpdated = new Date();
    } else {
      // Create new baseline
      const baseline: PerformanceBaseline = {
        routePath,
        averageLoadTime: loadTime,
        averageRenderTime: renderTime,
        averageResourceCount: resourceCount,
        averageMemoryUsage: memoryUsage,
        sampleCount: 1,
        lastUpdated: new Date(),
        thresholds: {
          loadTimeThreshold: loadTime * 1.5, // 50% increase threshold
          renderTimeThreshold: renderTime * 1.5,
          resourceCountThreshold: resourceCount * 1.3, // 30% increase threshold
          memoryUsageThreshold: memoryUsage * 1.4 // 40% increase threshold
        }
      };
      this.baselines.set(routePath, baseline);
    }

    this.saveBaselines();
    logger.debug('Performance baseline updated', { route: routePath });
  }

  /**
   * Test performance against baseline
   */
  public testPerformance(
    routePath: string,
    loadTime: number,
    renderTime: number,
    resourceCount: number,
    memoryUsage: number
  ): PerformanceTestResult {
    const baseline = this.baselines.get(routePath);

    if (!baseline) {
      // No baseline exists, create one and pass the test
      this.updateBaseline(routePath, loadTime, renderTime, resourceCount, memoryUsage);
      return {
        routePath,
        loadTime,
        renderTime,
        resourceCount,
        memoryUsage,
        timestamp: new Date(),
        passed: true,
        regressions: []
      };
    }

    const regressions: PerformanceRegression[] = [];

    // Test load time
    if (loadTime > baseline.thresholds.loadTimeThreshold) {
      const percentageIncrease = ((loadTime - baseline.averageLoadTime) / baseline.averageLoadTime) * 100;
      regressions.push({
        metric: 'loadTime',
        currentValue: loadTime,
        baselineValue: baseline.averageLoadTime,
        thresholdValue: baseline.thresholds.loadTimeThreshold,
        percentageIncrease,
        severity: this.getSeverity(percentageIncrease, this.config.alertThresholds.loadTime)
      });
    }

    // Test render time
    if (renderTime > baseline.thresholds.renderTimeThreshold) {
      const percentageIncrease = ((renderTime - baseline.averageRenderTime) / baseline.averageRenderTime) * 100;
      regressions.push({
        metric: 'renderTime',
        currentValue: renderTime,
        baselineValue: baseline.averageRenderTime,
        thresholdValue: baseline.thresholds.renderTimeThreshold,
        percentageIncrease,
        severity: this.getSeverity(percentageIncrease, this.config.alertThresholds.renderTime)
      });
    }

    // Test resource count
    if (resourceCount > baseline.thresholds.resourceCountThreshold) {
      const percentageIncrease = ((resourceCount - baseline.averageResourceCount) / baseline.averageResourceCount) * 100;
      regressions.push({
        metric: 'resourceCount',
        currentValue: resourceCount,
        baselineValue: baseline.averageResourceCount,
        thresholdValue: baseline.thresholds.resourceCountThreshold,
        percentageIncrease,
        severity: this.getSeverity(percentageIncrease, this.config.alertThresholds.resourceCount)
      });
    }

    // Test memory usage
    if (memoryUsage > baseline.thresholds.memoryUsageThreshold) {
      const percentageIncrease = ((memoryUsage - baseline.averageMemoryUsage) / baseline.averageMemoryUsage) * 100;
      regressions.push({
        metric: 'memoryUsage',
        currentValue: memoryUsage,
        baselineValue: baseline.averageMemoryUsage,
        thresholdValue: baseline.thresholds.memoryUsageThreshold,
        percentageIncrease,
        severity: this.getSeverity(percentageIncrease, this.config.alertThresholds.memoryUsage)
      });
    }

    const result: PerformanceTestResult = {
      routePath,
      loadTime,
      renderTime,
      resourceCount,
      memoryUsage,
      timestamp: new Date(),
      passed: regressions.length === 0,
      regressions
    };

    // Store test result
    this.testResults.push(result);

    // Keep only last 100 results
    if (this.testResults.length > 100) {
      this.testResults = this.testResults.slice(-100);
    }

    // Log regressions
    if (regressions.length > 0) {
      logger.warn('Performance regression detected', {
        route: routePath,
        regressions: regressions.map(r => ({
          metric: r.metric,
          increase: `${r.percentageIncrease.toFixed(1)}%`,
          severity: r.severity
        }))
      });
    }

    // Update baseline if performance is consistently better
    const shouldUpdateBaseline = this.shouldUpdateBaseline(baseline, loadTime, renderTime, resourceCount, memoryUsage);
    if (shouldUpdateBaseline) {
      this.updateBaseline(routePath, loadTime, renderTime, resourceCount, memoryUsage);
    }

    return result;
  }

  /**
   * Determine severity based on percentage increase
   */
  private getSeverity(percentageIncrease: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    if (percentageIncrease >= threshold * 3) return 'critical';
    if (percentageIncrease >= threshold * 2) return 'high';
    if (percentageIncrease >= threshold * 1.5) return 'medium';
    return 'low';
  }

  /**
   * Check if baseline should be updated
   */
  private shouldUpdateBaseline(
    baseline: PerformanceBaseline,
    loadTime: number,
    renderTime: number,
    resourceCount: number,
    memoryUsage: number
  ): boolean {
    const loadTimeImprovement = ((baseline.averageLoadTime - loadTime) / baseline.averageLoadTime) * 100;
    const renderTimeImprovement = ((baseline.averageRenderTime - renderTime) / baseline.averageRenderTime) * 100;

    // Update baseline if there's significant improvement
    return loadTimeImprovement > this.config.baselineUpdateThreshold ||
           renderTimeImprovement > this.config.baselineUpdateThreshold;
  }

  /**
   * Start automated testing
   */
  public startAutomatedTesting(): void {
    if (!this.config.enabled || !this.config.autoRun || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.testInterval = setInterval(() => {
      this.runAutomatedTests();
    }, this.config.testInterval);

    logger.info('Automated performance regression testing started', {
      interval: this.config.testInterval,
      routes: this.config.routes
    });
  }

  /**
   * Stop automated testing
   */
  public stopAutomatedTesting(): void {
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }
    this.isRunning = false;
    logger.info('Automated performance regression testing stopped');
  }

  /**
   * Run automated tests for all configured routes
   */
  private async runAutomatedTests(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Get current performance metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');
      const memoryInfo = (performance as any).memory;

      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        const renderTime = navigation.domInteractive - navigation.fetchStart;
        const resourceCount = resources.length;
        const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize : 0;

        const currentRoute = window.location.pathname;

        // Test current route if it's in the configured routes
        if (this.config.routes.includes(currentRoute)) {
          this.testPerformance(currentRoute, loadTime, renderTime, resourceCount, memoryUsage);
        }
      }
    } catch (error) {
      logger.error('Failed to run automated performance tests', { error });
    }
  }

  /**
   * Get test results
   */
  public getTestResults(routePath?: string): PerformanceTestResult[] {
    if (routePath) {
      return this.testResults.filter(result => result.routePath === routePath);
    }
    return [...this.testResults];
  }

  /**
   * Get performance baselines
   */
  public getBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.baselines);
  }

  /**
   * Get regression summary
   */
  public getRegressionSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalRegressions: number;
    regressionsByRoute: Record<string, number>;
    regressionsBySeverity: Record<string, number>;
  } {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalRegressions = this.testResults.reduce((sum, r) => sum + r.regressions.length, 0);

    const regressionsByRoute: Record<string, number> = {};
    const regressionsBySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.testResults.forEach(result => {
      if (result.regressions.length > 0) {
        regressionsByRoute[result.routePath] = (regressionsByRoute[result.routePath] || 0) + result.regressions.length;

        result.regressions.forEach(regression => {
          regressionsBySeverity[regression.severity]++;
        });
      }
    });

    return {
      totalTests,
      passedTests,
      failedTests,
      totalRegressions,
      regressionsByRoute,
      regressionsBySeverity
    };
  }

  /**
   * Clear all test data
   */
  public clearTestData(): void {
    this.testResults = [];
    this.baselines.clear();
    localStorage.removeItem('performance-baselines');
    logger.info('Performance test data cleared');
  }

  /**
   * Export test data
   */
  public exportTestData(): string {
    const data = {
      baselines: Object.fromEntries(this.baselines),
      testResults: this.testResults,
      summary: this.getRegressionSummary(),
      config: this.config,
      exportedAt: new Date()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<RegressionTestConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart automated testing if it was running
    if (this.isRunning) {
      this.stopAutomatedTesting();
      this.startAutomatedTesting();
    }

    logger.info('Performance regression tester configuration updated', { config: this.config });
  }
}

/**
 * Initialize performance regression tester
 */
export const performanceRegressionTester = PerformanceRegressionTester.getInstance();

// Auto-start in development mode
if (process.env.NODE_ENV === 'development') {
  performanceRegressionTester.startAutomatedTesting();
}

export default PerformanceRegressionTester;
