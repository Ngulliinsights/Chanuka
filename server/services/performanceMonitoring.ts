/**
 * Performance Monitoring Service
 * 
 * Full implementation for real-time performance metric collection,
 * threshold monitoring, alert generation, and reporting.
 */

import { logger } from '@shared/core';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface PerformanceThreshold {
  metric: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAlert {
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  message: string;
}

export interface PerformanceReport {
  startTime: Date;
  endTime: Date;
  metrics: {
    name: string;
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  }[];
  alerts: PerformanceAlert[];
  summary: {
    totalMetrics: number;
    totalAlerts: number;
    criticalAlerts: number;
  };
}

/**
 * Performance Monitoring Service
 */
export class PerformanceMonitoringService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private alerts: PerformanceAlert[] = [];
  private readonly maxMetricsPerName = 10000; // Keep last 10k metrics per name
  private readonly maxAlerts = 1000; // Keep last 1k alerts

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    try {
      // Get or create metrics array for this metric name
      let metricsArray = this.metrics.get(metric.name);
      if (!metricsArray) {
        metricsArray = [];
        this.metrics.set(metric.name, metricsArray);
      }

      // Add metric
      metricsArray.push(metric);

      // Trim if exceeds max
      if (metricsArray.length > this.maxMetricsPerName) {
        metricsArray.shift();
      }

      // Check thresholds
      const threshold = this.thresholds.get(metric.name);
      if (threshold && metric.value > threshold.threshold) {
        this.generateAlert(metric, threshold);
      }

      logger.debug('Performance metric recorded', {
        name: metric.name,
        value: metric.value,
        timestamp: metric.timestamp,
      });
    } catch (error) {
      logger.error('Failed to record performance metric', { error, metric });
    }
  }

  /**
   * Get performance metrics for a time range
   */
  getMetrics(startTime: Date, endTime: Date, metricName?: string): PerformanceMetric[] {
    try {
      const results: PerformanceMetric[] = [];

      // Filter by metric name if provided
      const metricsToSearch = metricName
        ? [this.metrics.get(metricName) || []]
        : Array.from(this.metrics.values());

      for (const metricsArray of metricsToSearch) {
        for (const metric of metricsArray) {
          if (metric.timestamp >= startTime && metric.timestamp <= endTime) {
            results.push(metric);
          }
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to get performance metrics', { error, startTime, endTime });
      return [];
    }
  }

  /**
   * Set performance threshold
   */
  setThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.metric, threshold);
    logger.info('Performance threshold set', { threshold });
  }

  /**
   * Remove performance threshold
   */
  removeThreshold(metricName: string): void {
    this.thresholds.delete(metricName);
    logger.info('Performance threshold removed', { metricName });
  }

  /**
   * Check if performance thresholds are exceeded
   */
  checkThresholds(thresholds: PerformanceThreshold[]): boolean {
    try {
      for (const threshold of thresholds) {
        const metricsArray = this.metrics.get(threshold.metric);
        if (!metricsArray || metricsArray.length === 0) {
          continue;
        }

        // Check the most recent metric
        const latestMetric = metricsArray[metricsArray.length - 1];
        if (latestMetric.value > threshold.threshold) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check performance thresholds', { error, thresholds });
      return false;
    }
  }

  /**
   * Generate alert for threshold violation
   */
  private generateAlert(metric: PerformanceMetric, threshold: PerformanceThreshold): void {
    const alert: PerformanceAlert = {
      metric: metric.name,
      value: metric.value,
      threshold: threshold.threshold,
      severity: threshold.severity,
      timestamp: new Date(),
      message: `Performance metric "${metric.name}" exceeded threshold: ${metric.value} > ${threshold.threshold}`,
    };

    this.alerts.push(alert);

    // Trim if exceeds max
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    logger.warn('Performance alert generated', { alert });
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 100): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    logger.info('Performance alerts cleared');
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Generate performance report
   */
  generateReport(startTime: Date, endTime: Date): PerformanceReport {
    try {
      const metrics = this.getMetrics(startTime, endTime);
      const metricsByName = new Map<string, number[]>();

      // Group metrics by name
      for (const metric of metrics) {
        let values = metricsByName.get(metric.name);
        if (!values) {
          values = [];
          metricsByName.set(metric.name, values);
        }
        values.push(metric.value);
      }

      // Calculate statistics for each metric
      const metricStats = Array.from(metricsByName.entries()).map(([name, values]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        
        return {
          name,
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: sum / values.length,
          p50: this.calculatePercentile(sorted, 50),
          p95: this.calculatePercentile(sorted, 95),
          p99: this.calculatePercentile(sorted, 99),
        };
      });

      // Filter alerts for time range
      const alertsInRange = this.alerts.filter(
        alert => alert.timestamp >= startTime && alert.timestamp <= endTime
      );

      const criticalAlerts = alertsInRange.filter(
        alert => alert.severity === 'critical'
      ).length;

      const report: PerformanceReport = {
        startTime,
        endTime,
        metrics: metricStats,
        alerts: alertsInRange,
        summary: {
          totalMetrics: metrics.length,
          totalAlerts: alertsInRange.length,
          criticalAlerts,
        },
      };

      logger.info('Performance report generated', {
        startTime,
        endTime,
        totalMetrics: metrics.length,
        totalAlerts: alertsInRange.length,
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate performance report', { error, startTime, endTime });
      return {
        startTime,
        endTime,
        metrics: [],
        alerts: [],
        summary: {
          totalMetrics: 0,
          totalAlerts: 0,
          criticalAlerts: 0,
        },
      };
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    logger.info('Performance metrics cleared');
  }

  /**
   * Get current statistics
   */
  getStats(): {
    totalMetricNames: number;
    totalMetrics: number;
    totalAlerts: number;
    thresholds: number;
  } {
    let totalMetrics = 0;
    for (const metricsArray of this.metrics.values()) {
      totalMetrics += metricsArray.length;
    }

    return {
      totalMetricNames: this.metrics.size,
      totalMetrics,
      totalAlerts: this.alerts.length,
      thresholds: this.thresholds.size,
    };
  }
}

/**
 * Global instance
 */
export const performanceMonitoring = new PerformanceMonitoringService();

/**
 * Export default
 */
export default performanceMonitoring;
