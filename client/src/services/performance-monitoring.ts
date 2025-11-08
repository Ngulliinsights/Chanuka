import { WebVitalsMetrics } from '../hooks/use-web-vitals';

export interface PerformanceBudget {
  name: string;
  limit: number;
  unit: string;
  description: string;
}

export interface PerformanceViolation {
  budget: PerformanceBudget;
  actualValue: number;
  threshold: number;
  severity: 'warning' | 'error';
}

export interface PerformanceReport {
  timestamp: string;
  metrics: WebVitalsMetrics;
  violations: PerformanceViolation[];
  healthScore: number;
  recommendations: string[];
}

export class PerformanceMonitoringService {
  private budgets: Record<string, PerformanceBudget> = {};
  private metricsHistory: Array<{ timestamp: string; metrics: WebVitalsMetrics }> = [];
  private maxHistorySize = 100;

  constructor() {
    this.loadBudgets().catch(error => {
      console.warn('Failed to initialize performance budgets:', error);
    });
  }

  private async loadBudgets() {
    // Load budgets from performance-budgets.json
    try {
      const response = await fetch('/performance-budgets.json');
      if (response.ok) {
        const config = await response.json();
        const env = process.env.NODE_ENV || 'development';
        const envBudgets = config.environments[env] || config.environments.development;

        this.budgets = {
          ...config.budgets.coreWebVitals,
          ...config.budgets.bundle,
          ...config.budgets.performance
        };
      }
    } catch (error) {
      console.warn('Failed to load performance budgets:', error);
      // Use default budgets
      this.budgets = {
        lcp: { name: 'LCP', limit: 2500, unit: 'ms', description: 'Largest Contentful Paint' },
        fid: { name: 'FID', limit: 100, unit: 'ms', description: 'First Input Delay' },
        cls: { name: 'CLS', limit: 0.1, unit: 'score', description: 'Cumulative Layout Shift' },
        fcp: { name: 'FCP', limit: 1800, unit: 'ms', description: 'First Contentful Paint' },
        ttfb: { name: 'TTFB', limit: 800, unit: 'ms', description: 'Time to First Byte' }
      };
    }
  }

  recordWebVitals(metrics: WebVitalsMetrics) {
    const timestamp = new Date().toISOString();
    this.metricsHistory.push({ timestamp, metrics });

    // Keep history size manageable
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }

    // Check for violations
    const violations = this.checkViolations(metrics);
    if (violations.length > 0) {
      this.reportViolations(violations);
    }
  }

  private checkViolations(metrics: WebVitalsMetrics): PerformanceViolation[] {
    const violations: PerformanceViolation[] = [];

    Object.entries(metrics).forEach(([key, value]) => {
      if (value === undefined) return;

      const budget = this.budgets[key];
      if (!budget) return;

      const threshold = budget.limit;
      if (value > threshold) {
        const severity = value > threshold * 1.5 ? 'error' : 'warning';
        violations.push({
          budget,
          actualValue: value,
          threshold,
          severity
        });
      }
    });

    return violations;
  }

  private reportViolations(violations: PerformanceViolation[]) {
    violations.forEach(violation => {
      const level = violation.severity === 'error' ? 'error' : 'warn';
      console[level](`Performance budget violation: ${violation.budget.name} exceeded ${violation.threshold}${violation.budget.unit} (actual: ${violation.actualValue.toFixed(2)}${violation.budget.unit})`);
    });

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(violations);
    }
  }

  private async sendToMonitoringService(violations: PerformanceViolation[]) {
    try {
      await fetch('/api/monitoring/performance-violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          violations,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.warn('Failed to send performance violations to monitoring service:', error);
    }
  }

  generateReport(): PerformanceReport {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1]?.metrics || {};
    const violations = this.checkViolations(latestMetrics);
    const healthScore = this.calculateHealthScore(latestMetrics, violations);

    return {
      timestamp: new Date().toISOString(),
      metrics: latestMetrics,
      violations,
      healthScore,
      recommendations: this.generateRecommendations(violations, latestMetrics)
    };
  }

  private calculateHealthScore(metrics: WebVitalsMetrics, violations: PerformanceViolation[]): number {
    let score = 100;

    // Deduct points for violations
    violations.forEach(violation => {
      const deduction = violation.severity === 'error' ? 20 : 10;
      score -= deduction;
    });

    // Bonus points for good metrics
    Object.entries(metrics).forEach(([key, value]) => {
      if (value === undefined) return;

      const budget = this.budgets[key];
      if (!budget) return;

      // Award points for metrics well below budget
      if (value < budget.limit * 0.5) {
        score += 5;
      } else if (value < budget.limit * 0.8) {
        score += 2;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(violations: PerformanceViolation[], metrics: WebVitalsMetrics): string[] {
    const recommendations: string[] = [];

    violations.forEach(violation => {
      switch (violation.budget.name) {
        case 'LCP':
          recommendations.push('Optimize Largest Contentful Paint by improving image loading, reducing server response times, and removing render-blocking JavaScript');
          break;
        case 'FID':
          recommendations.push('Improve First Input Delay by reducing JavaScript execution time and breaking up long tasks');
          break;
        case 'CLS':
          recommendations.push('Fix Cumulative Layout Shift by reserving space for dynamic content and avoiding inserting content above existing content');
          break;
        case 'FCP':
          recommendations.push('Speed up First Contentful Paint by optimizing CSS delivery and reducing render-blocking resources');
          break;
        case 'TTFB':
          recommendations.push('Reduce Time to First Byte by optimizing server response times and improving network performance');
          break;
      }
    });

    // General recommendations based on metrics
    if (metrics.lcp && metrics.lcp > 4000) {
      recommendations.push('Consider implementing critical resource hints (preload, prefetch) for above-the-fold content');
    }

    if (metrics.cls && metrics.cls > 0.25) {
      recommendations.push('Audit and fix layout shifts caused by web fonts, images without dimensions, or dynamically inserted content');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  getMetricsHistory(hours: number = 24): Array<{ timestamp: string; metrics: WebVitalsMetrics }> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(entry => new Date(entry.timestamp) > cutoff);
  }

  getAverageMetrics(hours: number = 24): WebVitalsMetrics {
    const history = this.getMetricsHistory(hours);
    if (history.length === 0) return {};

    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    history.forEach(entry => {
      Object.entries(entry.metrics).forEach(([key, value]) => {
        if (value !== undefined) {
          sums[key] = (sums[key] || 0) + value;
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    });

    const averages: WebVitalsMetrics = {};
    Object.keys(sums).forEach(key => {
      const sum = sums[key];
      const count = counts[key];
      if (sum !== undefined && count !== undefined) {
        averages[key as keyof WebVitalsMetrics] = sum / count;
      }
    });

    return averages;
  }
}

// Singleton instance
export const performanceMonitoring = new PerformanceMonitoringService();