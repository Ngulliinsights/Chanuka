/**
 * Performance Monitoring Service
 *
 * Real-time performance monitoring with Core Web Vitals tracking,
 * budget enforcement, and automated alerting.
 */

import { EventEmitter } from 'events';

import { logger } from '../observability/logging';
import { PerformanceBudget, PerformanceBudgetConfig, getPerformanceBudgets, validateBudgetConfig } from './budgets';

export interface PerformanceMetric {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Timestamp when metric was recorded */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface BudgetViolation {
  /** Budget that was violated */
  budget: PerformanceBudget;
  /** Actual value that violated the budget */
  actualValue: number;
  /** Expected threshold */
  threshold: number;
  /** Severity level */
  severity: 'warning' | 'error';
  /** Timestamp of violation */
  timestamp: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

export interface PerformanceReport {
  /** Report timestamp */
  timestamp: number;
  /** Environment */
  environment: string;
  /** All collected metrics */
  metrics: PerformanceMetric[];
  /** Budget violations found */
  violations: BudgetViolation[];
  /** Overall health score (0-100) */
  healthScore: number;
  /** Recommendations for improvement */
  recommendations: string[];
}

export interface AlertConfig {
  /** Email recipients */
  emailRecipients: string[];
  /** Slack webhook URL */
  slackWebhook?: string;
  /** Alert on warnings */
  alertOnWarnings: boolean;
  /** Minimum time between alerts (ms) */
  throttleMs: number;
}

export class PerformanceMonitoringService extends EventEmitter {
  private budgets: PerformanceBudgetConfig;
  private metrics: PerformanceMetric[] = [];
  private violations: BudgetViolation[] = [];
  private alertConfig: AlertConfig;
  private lastAlertTime = 0;
  private isMonitoring = false;

  constructor(
    budgets?: PerformanceBudgetConfig,
    alertConfig?: Partial<AlertConfig>
  ) {
    super();

    // Validate and set budgets
    this.budgets = budgets || getPerformanceBudgets();
    const validation = validateBudgetConfig(this.budgets);
    if (!validation.valid) {
      throw new Error(`Invalid budget configuration: ${validation.errors.join(', ')}`);
    }

    // Set alert configuration
    this.alertConfig = {
      emailRecipients: [],
      alertOnWarnings: true,
      throttleMs: 5 * 60 * 1000, // 5 minutes
      ...alertConfig,
    };

    this.setupEventListeners();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    logger.info('Performance monitoring started', { component: 'performance-monitoring' });

    // Start collecting Core Web Vitals if in browser environment
    if (typeof window !== 'undefined') {
      this.startWebVitalsCollection();
    }

    this.emit('monitoring-started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    logger.info('Performance monitoring stopped', { component: 'performance-monitoring' });

    this.emit('monitoring-stopped');
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);
    this.checkBudgetViolation(fullMetric);

    this.emit('metric-recorded', fullMetric);
    logger.debug('Performance metric recorded', {
      component: 'performance-monitoring',
      metric: fullMetric,
    });
  }

  /**
   * Record Core Web Vitals metric
   */
  recordWebVital(name: string, value: number, metadata?: Record<string, unknown>): void {
    this.recordMetric({
      name,
      value,
      unit: name === 'cls' ? 'score' : 'ms',
      metadata: {
        ...metadata,
        vital: true,
      },
    });
  }

  /**
   * Record bundle size metric
   */
  recordBundleMetric(name: string, sizeInBytes: number, metadata?: Record<string, unknown>): void {
    this.recordMetric({
      name,
      value: sizeInBytes / 1024, // Convert to KB
      unit: 'KB',
      metadata: {
        ...metadata,
        bundle: true,
        bytes: sizeInBytes,
      },
    });
  }

  /**
   * Record design system audit results
   */
  recordDesignSystemAudit(auditResults: {
    violationsFound: number;
    warningsFound: number;
    filesScanned: number;
  }, metadata?: Record<string, unknown>): void {
    // Record violations as a metric
    this.recordMetric({
      name: 'design-system-violations',
      value: auditResults.violationsFound,
      unit: 'count',
      metadata: {
        ...(metadata as Record<string, unknown>),
        audit: true,
        type: 'violations',
        warnings: auditResults.warningsFound,
        filesScanned: auditResults.filesScanned,
      },
    });

    // Record warnings as a separate metric
    this.recordMetric({
      name: 'design-system-warnings',
      value: auditResults.warningsFound,
      unit: 'count',
      metadata: {
        ...(metadata as Record<string, unknown>),
        audit: true,
        type: 'warnings',
        violations: auditResults.violationsFound,
        filesScanned: auditResults.filesScanned,
      },
    });

    // Record coverage (files scanned) as a metric
    this.recordMetric({
      name: 'design-system-coverage',
      value: auditResults.filesScanned,
      unit: 'files',
      metadata: {
        ...(metadata as Record<string, unknown>),
        audit: true,
        type: 'coverage',
        violations: auditResults.violationsFound,
        warnings: auditResults.warningsFound,
      },
    });
  }

  /**
   * Check if a metric violates any budgets
   */
  private checkBudgetViolation(metric: PerformanceMetric): void {
    const allBudgets = [
      ...Object.values(this.budgets.coreWebVitals),
      ...Object.values(this.budgets.bundleSize),
      ...Object.values(this.budgets.styling),
      ...this.budgets.custom,
    ];

    for (const budget of allBudgets) {
      if (budget.metric !== metric.name) continue;

      const violation = this.evaluateBudgetViolation(budget, metric);
      if (violation) {
        this.violations.push(violation);
        this.emit('budget-violation', violation);

        // Handle alerts
        if (violation.severity === 'error' || (violation.severity === 'warning' && this.alertConfig.alertOnWarnings)) {
          this.sendAlert(violation);
        }

        logger.warn('Performance budget violation detected', {
          component: 'performance-monitoring',
          violation,
        });
      }
    }
  }

  /**
   * Evaluate if a metric violates a budget
   */
  private evaluateBudgetViolation(budget: PerformanceBudget, metric: PerformanceMetric): BudgetViolation | null {
    const { threshold, warningThreshold, operator, failOnViolation } = budget;

    // Check main threshold
    const violatesMainThreshold = this.compareValues(metric.value, threshold, operator);

    // Check warning threshold
    let severity: 'warning' | 'error' = 'warning';
    let effectiveThreshold = threshold;

    if (warningThreshold !== undefined) {
      const violatesWarningThreshold = this.compareValues(metric.value, warningThreshold, operator);
      if (violatesWarningThreshold) {
        severity = failOnViolation ? 'error' : 'warning';
        effectiveThreshold = warningThreshold;
      } else if (violatesMainThreshold) {
        severity = 'error';
      }
    } else if (violatesMainThreshold) {
      severity = failOnViolation ? 'error' : 'warning';
    }

    if (!violatesMainThreshold && (warningThreshold === undefined || !this.compareValues(metric.value, warningThreshold, operator))) {
      return null;
    }

    return {
      budget,
      actualValue: metric.value,
      threshold: effectiveThreshold,
      severity,
      timestamp: metric.timestamp,
      context: {
        metric,
        environment: this.budgets.config.environment,
      },
    };
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: number, threshold: number, operator: PerformanceBudget['operator']): boolean {
    switch (operator) {
      case 'less-than':
        return actual >= threshold;
      case 'less-than-equal':
        return actual > threshold;
      case 'greater-than':
        return actual <= threshold;
      case 'greater-than-equal':
        return actual < threshold;
      default:
        return false;
    }
  }

  /**
   * Generate a comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const recentMetrics = this.getRecentMetrics(24 * 60 * 60 * 1000); // Last 24 hours
    const recentViolations = this.getRecentViolations(24 * 60 * 60 * 1000);

    const healthScore = this.calculateHealthScore(recentMetrics, recentViolations);
    const recommendations = this.generateRecommendations(recentMetrics, recentViolations);

    return {
      timestamp: Date.now(),
      environment: this.budgets.config.environment,
      metrics: recentMetrics,
      violations: recentViolations,
      healthScore,
      recommendations,
    };
  }

  /**
   * Get recent metrics within a time window
   */
  private getRecentMetrics(timeWindowMs: number): PerformanceMetric[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get recent violations within a time window
   */
  private getRecentViolations(timeWindowMs: number): BudgetViolation[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.violations.filter(v => v.timestamp >= cutoff);
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(metrics: PerformanceMetric[], violations: BudgetViolation[]): number {
    let score = 100;

    // Penalize for violations
    const errorViolations = violations.filter(v => v.severity === 'error').length;
    const warningViolations = violations.filter(v => v.severity === 'warning').length;

    score -= errorViolations * 15; // -15 points per error
    score -= warningViolations * 5;  // -5 points per warning

    // Bonus for good Core Web Vitals
    const coreWebVitals = metrics.filter(m => m.metadata?.vital);
    if (coreWebVitals.length > 0) {
      const avgLcp = this.getAverageMetricValue(coreWebVitals, 'lcp');
      const avgFid = this.getAverageMetricValue(coreWebVitals, 'fid');
      const avgCls = this.getAverageMetricValue(coreWebVitals, 'cls');

      if (avgLcp && avgLcp < 2000) score += 5;
      if (avgFid && avgFid < 50) score += 5;
      if (avgCls && avgCls < 0.05) score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations based on metrics and violations
   */
  private generateRecommendations(metrics: PerformanceMetric[], violations: BudgetViolation[]): string[] {
    const recommendations: string[] = [];

    // Bundle size recommendations
    const bundleMetrics = metrics.filter(m => m.metadata?.bundle);
    if (bundleMetrics.length > 0) {
      const totalJsSize = this.getAverageMetricValue(bundleMetrics, 'totalJsSize');
      if (totalJsSize && totalJsSize > 800) {
        recommendations.push('Consider code splitting to reduce initial bundle size');
      }
    }

    // Core Web Vitals recommendations
    const coreWebVitals = metrics.filter(m => m.metadata?.vital);
    if (coreWebVitals.length > 0) {
      const avgLcp = this.getAverageMetricValue(coreWebVitals, 'lcp');
      const avgCls = this.getAverageMetricValue(coreWebVitals, 'cls');

      if (avgLcp && avgLcp > 2500) {
        recommendations.push('Optimize Largest Contentful Paint by improving server response times and resource loading');
      }
      if (avgCls && avgCls > 0.1) {
        recommendations.push('Fix Cumulative Layout Shift by reserving space for dynamic content');
      }
    }

    // Violation-based recommendations
    const errorBudgets = violations
      .filter(v => v.severity === 'error')
      .map(v => v.budget.category)
      .filter((v, i, arr) => arr.indexOf(v) === i); // Unique categories

    if (errorBudgets.includes('bundle-size')) {
      recommendations.push('Reduce bundle size through tree shaking, compression, and lazy loading');
    }
    if (errorBudgets.includes('core-web-vitals')) {
      recommendations.push('Audit and optimize Core Web Vitals metrics');
    }
    if (errorBudgets.includes('styling')) {
      recommendations.push('Optimize styling bundle size through CSS purging, compression, and lazy loading');
    }

    return recommendations;
  }

  /**
   * Get average value for a specific metric
   */
  private getAverageMetricValue(metrics: PerformanceMetric[], metricName: string): number | null {
    const relevantMetrics = metrics.filter(m => m.name === metricName);
    if (relevantMetrics.length === 0) return null;

    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }

  /**
   * Send alert for budget violation
   */
  private async sendAlert(violation: BudgetViolation): Promise<void> {
    const now = Date.now();
    if (now - this.lastAlertTime < this.alertConfig.throttleMs) {
      return; // Throttle alerts
    }

    this.lastAlertTime = now;

    const message = this.formatAlertMessage(violation);

    // Send email alerts
    if (this.alertConfig.emailRecipients.length > 0) {
      await this.sendEmailAlert(message, violation);
    }

    // Send Slack alerts
    if (this.alertConfig.slackWebhook) {
      await this.sendSlackAlert(message, violation);
    }

    this.emit('alert-sent', { violation, message });
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(violation: BudgetViolation): string {
    const { budget, actualValue, threshold, severity } = violation;
    const severityEmoji = severity === 'error' ? '🚨' : '⚠️';

    return `${severityEmoji} Performance Budget Violation

${budget.name}
• Expected: ${threshold}${budget.unit} (${budget.operator.replace('-', ' ')})
• Actual: ${actualValue.toFixed(2)}${budget.unit}
• Severity: ${severity.toUpperCase()}

Environment: ${this.budgets.config.environment}
Time: ${new Date(violation.timestamp).toISOString()}`;
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(_message: string, violation: BudgetViolation): Promise<void> {
    // Implementation would depend on email service (SendGrid, AWS SES, etc.)
    logger.info('Email alert would be sent', {
      component: 'performance-monitoring',
      recipients: this.alertConfig.emailRecipients,
      violation: violation.budget.name,
    });
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(message: string, violation: BudgetViolation): Promise<void> {
    if (!this.alertConfig.slackWebhook) return;

    try {
      const response = await fetch(this.alertConfig.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          attachments: [{
            color: violation.severity === 'error' ? 'danger' : 'warning',
            fields: [
              {
                title: 'Budget',
                value: violation.budget.name,
                short: true,
              },
              {
                title: 'Threshold',
                value: `${violation.threshold}${violation.budget.unit}`,
                short: true,
              },
              {
                title: 'Actual',
                value: `${violation.actualValue.toFixed(2)}${violation.budget.unit}`,
                short: true,
              },
            ],
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send Slack alert', {
        component: 'performance-monitoring',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Start collecting Core Web Vitals
   */
  private startWebVitalsCollection(): void {
    // Note: web-vitals library should be installed as a dependency
    // For now, we'll skip automatic collection and rely on manual recording
    logger.info('Core Web Vitals collection ready - ensure web-vitals package is installed', {
      component: 'performance-monitoring',
    });

    // TODO: Uncomment when web-vitals is added as a dependency
    /*
    try {
      const webVitals = require('web-vitals');
      if (webVitals && typeof webVitals.getCLS === 'function') {
        webVitals.getCLS((metric: any) => {
          this.recordWebVital('cls', metric.value, { id: metric.id });
        });

        webVitals.getFID((metric: any) => {
          this.recordWebVital('fid', metric.value, { id: metric.id });
        });

        webVitals.getFCP((metric: any) => {
          this.recordWebVital('fcp', metric.value, { id: metric.id });
        });

        webVitals.getLCP((metric: any) => {
          this.recordWebVital('lcp', metric.value, { id: metric.id });
        });

        webVitals.getTTFB((metric: any) => {
          this.recordWebVital('ttfb', metric.value, { id: metric.id });
        });
      }
    } catch (error) {
      logger.warn('web-vitals library not available, manual metric recording required', {
        component: 'performance-monitoring',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    */
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.on('budget-violation', (violation: BudgetViolation) => {
      logger.warn('Budget violation detected', {
        component: 'performance-monitoring',
        budget: violation.budget.name,
        severity: violation.severity,
        actual: violation.actualValue,
        threshold: violation.threshold,
      });
    });
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    violationsCount: number;
    healthScore: number;
    lastMetricTime: number | undefined;
  } {
    const recentMetrics = this.getRecentMetrics(60 * 60 * 1000); // Last hour
    const recentViolations = this.getRecentViolations(60 * 60 * 1000);

    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metrics.length,
      violationsCount: this.violations.length,
      healthScore: this.calculateHealthScore(recentMetrics, recentViolations),
      lastMetricTime: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1]?.timestamp : undefined,
    };
  }

  /**
   * Clear all collected data
   */
  clearData(): void {
    this.metrics = [];
    this.violations = [];
    logger.info('Performance monitoring data cleared', { component: 'performance-monitoring' });
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitoringService();



