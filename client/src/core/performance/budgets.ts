/**
 * Performance Budgets Module
 *
 * Monitors performance metrics against defined budgets and provides
 * budget compliance checking with detailed reporting.
 */

import { PerformanceBudget, PerformanceMetric, BudgetCheckResult } from './types';

/**
 * Performance Budget Checker class
 */
export class PerformanceBudgetChecker {
  private static instance: PerformanceBudgetChecker;
  private budgets: PerformanceBudget[] = [];
  private checkHistory: Array<{
    timestamp: Date;
    metric: PerformanceMetric;
    result: BudgetCheckResult;
  }> = [];
  private readonly MAX_HISTORY = 1000;

  private constructor() {
    this.setupDefaultBudgets();
  }

  static getInstance(): PerformanceBudgetChecker {
    if (!PerformanceBudgetChecker.instance) {
      PerformanceBudgetChecker.instance = new PerformanceBudgetChecker();
    }
    return PerformanceBudgetChecker.instance;
  }

  /**
   * Sets up industry-standard performance budgets
   */
  private setupDefaultBudgets(): void {
    this.budgets = [
      // Core Web Vitals budgets
      {
        metric: 'LCP',
        budget: 2500,
        warning: 2000,
        description: 'Largest Contentful Paint - measures loading performance',
        category: 'loading',
      },
      {
        metric: 'FID',
        budget: 100,
        warning: 75,
        description: 'First Input Delay - measures interactivity',
        category: 'interactivity',
      },
      {
        metric: 'INP',
        budget: 200,
        warning: 150,
        description: 'Interaction to Next Paint - measures responsiveness',
        category: 'interactivity',
      },
      {
        metric: 'CLS',
        budget: 0.1,
        warning: 0.05,
        description: 'Cumulative Layout Shift - measures visual stability',
        category: 'visual-stability',
      },
      {
        metric: 'FCP',
        budget: 1800,
        warning: 1500,
        description: 'First Contentful Paint - measures perceived loading',
        category: 'loading',
      },
      {
        metric: 'TTFB',
        budget: 800,
        warning: 600,
        description: 'Time to First Byte - measures server response time',
        category: 'network',
      },

      // Resource budgets
      {
        metric: 'bundle-size',
        budget: 250000,
        warning: 200000,
        description: 'JavaScript bundle size in bytes',
        category: 'loading',
      },
      {
        metric: 'memory-usage',
        budget: 50000000,
        warning: 40000000,
        description: 'Memory usage in bytes',
        category: 'memory',
      },
      {
        metric: 'dom-size',
        budget: 1500,
        warning: 1200,
        description: 'Number of DOM nodes',
        category: 'loading',
      },
      {
        metric: 'image-size',
        budget: 1000000,
        warning: 800000,
        description: 'Total image payload in bytes',
        category: 'loading',
      },
      {
        metric: 'font-size',
        budget: 100000,
        warning: 80000,
        description: 'Total font payload in bytes',
        category: 'loading',
      },
    ];
  }

  /**
   * Checks if a metric is within its performance budget
   */
  checkBudget(metric: PerformanceMetric): BudgetCheckResult {
    const budget = this.budgets.find(b => b.metric === metric.name);

    // If no budget is defined, consider it a pass
    if (!budget) {
      const result: BudgetCheckResult = {
        status: 'pass',
        message: `No budget defined for metric: ${metric.name}`,
        recommendations: ['Consider setting a performance budget for this metric'],
      };

      this.recordCheck(metric, result);
      return result;
    }

    // Calculate exceedance percentages
    const budgetExceedance = ((metric.value - budget.budget) / budget.budget) * 100;
    const warningExceedance = ((metric.value - budget.warning) / budget.warning) * 100;

    let result: BudgetCheckResult;

    // Check for budget failure
    if (metric.value > budget.budget) {
      result = {
        status: 'fail',
        budget,
        message: `Budget exceeded by ${budgetExceedance.toFixed(1)}%: ${metric.value.toFixed(2)} > ${budget.budget}`,
        exceedancePercentage: budgetExceedance,
        recommendations: this.generateRecommendations(metric, budget, 'fail'),
      };
    }
    // Check for warning threshold
    else if (metric.value > budget.warning) {
      result = {
        status: 'warning',
        budget,
        message: `Warning threshold exceeded by ${warningExceedance.toFixed(1)}%: ${metric.value.toFixed(2)} > ${budget.warning}`,
        exceedancePercentage: warningExceedance,
        recommendations: this.generateRecommendations(metric, budget, 'warning'),
      };
    }
    // Within acceptable limits
    else {
      const utilizationPercentage = (metric.value / budget.warning) * 100;
      result = {
        status: 'pass',
        budget,
        message: `Within budget (${utilizationPercentage.toFixed(1)}% of warning threshold)`,
        recommendations:
          utilizationPercentage > 80
            ? ['Monitor closely as metric is approaching warning threshold']
            : [],
      };
    }

    this.recordCheck(metric, result);
    return result;
  }

  /**
   * Generates specific recommendations based on metric and budget status
   */
  private generateRecommendations(
    metric: PerformanceMetric,
    _budget: PerformanceBudget,
    status: 'warning' | 'fail'
  ): string[] {
    const recommendations: string[] = [];

    switch (metric.name) {
      case 'LCP':
        recommendations.push(
          'Optimize images with modern formats (WebP, AVIF)',
          'Implement lazy loading for below-the-fold content',
          'Reduce server response times',
          'Eliminate render-blocking resources'
        );
        break;

      case 'FID':
      case 'INP':
        recommendations.push(
          'Break up long tasks into smaller chunks',
          'Optimize JavaScript execution',
          'Use web workers for heavy computations',
          'Implement code splitting and lazy loading'
        );
        break;

      case 'CLS':
        recommendations.push(
          'Set explicit dimensions for images and videos',
          'Reserve space for dynamic content',
          'Avoid inserting content above existing content',
          'Use CSS transforms instead of changing layout properties'
        );
        break;

      case 'FCP':
        recommendations.push(
          'Inline critical CSS',
          'Optimize web fonts loading',
          'Reduce server response times',
          'Eliminate render-blocking JavaScript'
        );
        break;

      case 'TTFB':
        recommendations.push(
          'Optimize server performance',
          'Use a Content Delivery Network (CDN)',
          'Implement server-side caching',
          'Optimize database queries'
        );
        break;

      case 'bundle-size':
        recommendations.push(
          'Implement code splitting',
          'Remove unused dependencies',
          'Use tree shaking to eliminate dead code',
          'Compress JavaScript with gzip/brotli'
        );
        break;

      case 'memory-usage':
        recommendations.push(
          'Fix memory leaks in JavaScript',
          'Optimize image and media usage',
          'Implement proper cleanup in components',
          'Use memory profiling tools'
        );
        break;

      case 'dom-size':
        recommendations.push(
          'Implement virtual scrolling for large lists',
          'Remove unnecessary DOM elements',
          'Use CSS instead of DOM manipulation where possible',
          'Optimize component rendering'
        );
        break;

      default:
        recommendations.push(
          'Review and optimize the specific metric',
          'Consider implementing performance monitoring',
          'Analyze the root cause of performance issues'
        );
    }

    // Add severity-specific recommendations
    if (status === 'fail') {
      recommendations.unshift('CRITICAL: Immediate optimization required');
    } else if (status === 'warning') {
      recommendations.unshift('Monitor and plan optimization');
    }

    return recommendations;
  }

  /**
   * Records a budget check in history
   */
  private recordCheck(metric: PerformanceMetric, result: BudgetCheckResult): void {
    this.checkHistory.push({
      timestamp: new Date(),
      metric,
      result,
    });

    // Maintain history size
    if (this.checkHistory.length > this.MAX_HISTORY) {
      this.checkHistory = this.checkHistory.slice(-this.MAX_HISTORY);
    }
  }

  /**
   * Updates or creates a performance budget
   */
  setBudget(
    metric: string,
    budget: number,
    warning: number,
    description?: string,
    category?: string
  ): void {
    if (budget <= 0 || warning <= 0) {
      throw new Error('Budget values must be greater than zero');
    }

    if (warning > budget) {
      throw new Error('Warning threshold must be less than or equal to budget');
    }

    const existingIndex = this.budgets.findIndex(b => b.metric === metric);
    const newBudget: PerformanceBudget = {
      metric,
      budget,
      warning,
      description,
      category,
    };

    if (existingIndex >= 0) {
      this.budgets[existingIndex] = newBudget;
    } else {
      this.budgets.push(newBudget);
    }
  }

  /**
   * Removes a budget
   */
  removeBudget(metric: string): boolean {
    const index = this.budgets.findIndex(b => b.metric === metric);
    if (index >= 0) {
      this.budgets.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Returns all configured budgets
   */
  getBudgets(): PerformanceBudget[] {
    return [...this.budgets]; // Return a copy to prevent external modifications
  }

  /**
   * Returns a specific budget by metric name
   */
  getBudget(metric: string): PerformanceBudget | undefined {
    return this.budgets.find(b => b.metric === metric);
  }

  /**
   * Returns budgets by category
   */
  getBudgetsByCategory(category: string): PerformanceBudget[] {
    return this.budgets.filter(b => b.category === category);
  }

  /**
   * Gets budget compliance statistics
   */
  getComplianceStats(): {
    total: number;
    passing: number;
    warning: number;
    failing: number;
    passRate: number;
  } {
    const recentChecks = this.checkHistory.slice(-100); // Last 100 checks
    const total = recentChecks.length;

    if (total === 0) {
      return { total: 0, passing: 0, warning: 0, failing: 0, passRate: 0 };
    }

    const passing = recentChecks.filter(c => c.result.status === 'pass').length;
    const warning = recentChecks.filter(c => c.result.status === 'warning').length;
    const failing = recentChecks.filter(c => c.result.status === 'fail').length;
    const passRate = (passing / total) * 100;

    return { total, passing, warning, failing, passRate };
  }

  /**
   * Gets recent budget check history
   */
  getCheckHistory(limit: number = 50): Array<{
    timestamp: Date;
    metric: PerformanceMetric;
    result: BudgetCheckResult;
  }> {
    return this.checkHistory.slice(-limit);
  }

  /**
   * Gets failing metrics from recent checks
   */
  getFailingMetrics(): Array<{
    metric: string;
    value: number;
    budget: number;
    exceedancePercentage: number;
    lastCheck: Date;
  }> {
    const recentChecks = this.checkHistory.slice(-100);
    const failingChecks = recentChecks.filter(c => c.result.status === 'fail');

    // Group by metric and get the most recent failing check for each
    const failingByMetric = new Map<string, (typeof failingChecks)[0]>();

    failingChecks.forEach(check => {
      const existing = failingByMetric.get(check.metric.name);
      if (!existing || check.timestamp > existing.timestamp) {
        failingByMetric.set(check.metric.name, check);
      }
    });

    return Array.from(failingByMetric.values()).map(check => ({
      metric: check.metric.name,
      value: check.metric.value,
      budget: check.result.budget?.budget || 0,
      exceedancePercentage: check.result.exceedancePercentage || 0,
      lastCheck: check.timestamp,
    }));
  }

  /**
   * Exports budget configuration for backup or sharing
   */
  exportBudgets(): {
    timestamp: Date;
    budgets: PerformanceBudget[];
    stats: any;
  } {
    return {
      timestamp: new Date(),
      budgets: this.getBudgets(),
      stats: this.getComplianceStats(),
    };
  }

  /**
   * Imports budget configuration
   */
  importBudgets(budgets: PerformanceBudget[]): void {
    // Validate budgets before importing
    const validBudgets = budgets.filter(budget => {
      return (
        budget.metric && budget.budget > 0 && budget.warning > 0 && budget.warning <= budget.budget
      );
    });

    this.budgets = validBudgets;
  }

  /**
   * Resets all budget check history
   */
  resetHistory(): void {
    this.checkHistory = [];
  }
}
