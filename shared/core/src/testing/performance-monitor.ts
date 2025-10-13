import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

/**
 * Performance monitoring and reporting utility
 * Tracks performance metrics over time and generates reports
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeMonitors: Map<string, NodeJS.Timer> = new Map();
  private baselineData: Map<string, PerformanceBaseline> = new Map();
  private alertThresholds: Map<string, AlertThreshold> = new Map();

  constructor(private config: PerformanceMonitorConfig = {}) {
    super();
    this.loadBaselines();
    this.setupDefaultThresholds();
  }

  /**
   * Start monitoring a specific metric
   */
  startMonitoring(metricName: string, collector: () => Promise<number>, intervalMs: number = 5000): void {
    if (this.activeMonitors.has(metricName)) {
      this.stopMonitoring(metricName);
    }

    const timer = setInterval(async () => {
      try {
        const value = await collector();
        this.recordMetric(metricName, value);
      } catch (error) {
        this.emit('monitor:error', { metricName, error });
      }
    }, intervalMs);

    this.activeMonitors.set(metricName, timer);
    this.emit('monitor:started', { metricName, intervalMs });
  }

  /**
   * Stop monitoring a specific metric
   */
  stopMonitoring(metricName: string): void {
    const timer = this.activeMonitors.get(metricName);
    if (timer) {
      clearInterval(timer);
      this.activeMonitors.delete(metricName);
      this.emit('monitor:stopped', { metricName });
    }
  }

  /**
   * Stop all active monitoring
   */
  stopAllMonitoring(): void {
    for (const metricName of this.activeMonitors.keys()) {
      this.stopMonitoring(metricName);
    }
  }

  /**
   * Record a single metric value
   */
  recordMetric(metricName: string, value: number, metadata?: Record<string, any>): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      value,
      metadata
    };

    this.metrics.get(metricName)!.push(metric);

    // Check for alerts
    this.checkAlerts(metricName, value);

    // Trim old data if needed
    this.trimMetrics(metricName);

    this.emit('metric:recorded', { metricName, value, metadata });
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(metricName: string, timeRangeMs?: number): PerformanceMetric[] {
    const metrics = this.metrics.get(metricName) || [];
    
    if (!timeRangeMs) {
      return metrics;
    }

    const cutoff = Date.now() - timeRangeMs;
    return metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Calculate statistics for a metric
   */
  getMetricStats(metricName: string, timeRangeMs?: number): MetricStats | null {
    const metrics = this.getMetrics(metricName, timeRangeMs);
    
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value);
    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((sum, v) => sum + v, 0) / values.length,
      median: this.calculatePercentile(sorted, 50),
      p90: this.calculatePercentile(sorted, 90),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      stdDev: this.calculateStandardDeviation(values),
      trend: this.calculateTrend(metrics)
    };
  }

  /**
   * Set performance baseline for a metric
   */
  setBaseline(metricName: string, baseline: PerformanceBaseline): void {
    this.baselineData.set(metricName, baseline);
    this.saveBaselines();
    this.emit('baseline:set', { metricName, baseline });
  }

  /**
   * Get performance baseline for a metric
   */
  getBaseline(metricName: string): PerformanceBaseline | null {
    return this.baselineData.get(metricName) || null;
  }

  /**
   * Compare current performance against baseline
   */
  compareToBaseline(metricName: string, timeRangeMs: number = 3600000): BaselineComparison | null {
    const baseline = this.getBaseline(metricName);
    const stats = this.getMetricStats(metricName, timeRangeMs);

    if (!baseline || !stats) {
      return null;
    }

    const meanDiff = ((stats.mean - baseline.expectedValue) / baseline.expectedValue) * 100;
    const p95Diff = ((stats.p95 - baseline.p95Threshold) / baseline.p95Threshold) * 100;

    return {
      metricName,
      baseline,
      current: stats,
      meanDifference: meanDiff,
      p95Difference: p95Diff,
      isRegression: meanDiff > baseline.regressionThreshold || stats.p95 > baseline.p95Threshold,
      severity: this.calculateRegressionSeverity(meanDiff, p95Diff, baseline)
    };
  }

  /**
   * Set alert threshold for a metric
   */
  setAlertThreshold(metricName: string, threshold: AlertThreshold): void {
    this.alertThresholds.set(metricName, threshold);
    this.emit('threshold:set', { metricName, threshold });
  }

  /**
   * Generate performance report
   */
  generateReport(timeRangeMs: number = 3600000): PerformanceReport {
    const reportTime = new Date();
    const metricReports: MetricReport[] = [];
    const alerts: PerformanceAlert[] = [];
    const regressions: BaselineComparison[] = [];

    for (const metricName of this.getMetricNames()) {
      const stats = this.getMetricStats(metricName, timeRangeMs);
      if (!stats) continue;

      const baseline = this.compareToBaseline(metricName, timeRangeMs);
      if (baseline?.isRegression) {
        regressions.push(baseline);
      }

      metricReports.push({
        metricName,
        stats,
        baseline: baseline || undefined,
        dataPoints: this.getMetrics(metricName, timeRangeMs).length
      });
    }

    // Get recent alerts
    const recentAlerts = this.getRecentAlerts(timeRangeMs);
    alerts.push(...recentAlerts);

    return {
      timestamp: reportTime,
      timeRangeMs,
      summary: {
        totalMetrics: metricReports.length,
        activeMonitors: this.activeMonitors.size,
        totalAlerts: alerts.length,
        regressions: regressions.length
      },
      metrics: metricReports,
      alerts,
      regressions,
      systemInfo: this.getSystemInfo()
    };
  }

  /**
   * Export performance data
   */
  exportData(format: 'json' | 'csv' = 'json', timeRangeMs?: number): string {
    const data: Record<string, PerformanceMetric[]> = {};
    
    for (const metricName of this.getMetricNames()) {
      data[metricName] = this.getMetrics(metricName, timeRangeMs);
    }

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }

  /**
   * Save performance report to file
   */
  saveReport(report: PerformanceReport, filePath?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = filePath || `performance-report-${timestamp}.json`;
    const fullPath = join(this.config.reportsDir || './reports', fileName);

    // Ensure directory exists
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, JSON.stringify(report, null, 2));
    this.emit('report:saved', { filePath: fullPath, report });
    
    return fullPath;
  }

  /**
   * Load historical performance data
   */
  loadHistoricalData(filePath: string): void {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    
    for (const [metricName, metrics] of Object.entries(data)) {
      if (Array.isArray(metrics)) {
        this.metrics.set(metricName, metrics as PerformanceMetric[]);
      }
    }

    this.emit('data:loaded', { filePath, metricsCount: Object.keys(data).length });
  }

  /**
   * Create performance dashboard data
   */
  getDashboardData(timeRangeMs: number = 3600000): DashboardData {
    const metrics: DashboardMetric[] = [];
    const alerts: PerformanceAlert[] = this.getRecentAlerts(timeRangeMs);
    
    for (const metricName of this.getMetricNames()) {
      const stats = this.getMetricStats(metricName, timeRangeMs);
      const recentMetrics = this.getMetrics(metricName, timeRangeMs);
      const baseline = this.compareToBaseline(metricName, timeRangeMs);

      if (stats && recentMetrics.length > 0) {
        metrics.push({
          name: metricName,
          current: stats.mean,
          trend: stats.trend,
          status: this.getMetricStatus(metricName, stats.mean),
          sparkline: recentMetrics.slice(-50).map(m => ({ x: m.timestamp, y: m.value })),
          baseline: baseline?.baseline.expectedValue,
          isRegression: baseline?.isRegression || false
        });
      }
    }

    return {
      timestamp: Date.now(),
      timeRangeMs,
      metrics,
      alerts: alerts.slice(-10), // Last 10 alerts
      systemHealth: this.calculateSystemHealth(metrics),
      summary: {
        totalMetrics: metrics.length,
        healthyMetrics: metrics.filter(m => m.status === 'healthy').length,
        warningMetrics: metrics.filter(m => m.status === 'warning').length,
        criticalMetrics: metrics.filter(m => m.status === 'critical').length,
        regressions: metrics.filter(m => m.isRegression).length
      }
    };
  }

  // Private helper methods
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateTrend(metrics: PerformanceMetric[]): 'up' | 'down' | 'stable' {
    if (metrics.length < 2) return 'stable';

    const recent = metrics.slice(-10);
    const older = metrics.slice(-20, -10);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return 'up';
    if (change < -0.05) return 'down';
    return 'stable';
  }

  private calculateRegressionSeverity(meanDiff: number, p95Diff: number, baseline: PerformanceBaseline): 'low' | 'medium' | 'high' | 'critical' {
    const maxDiff = Math.max(Math.abs(meanDiff), Math.abs(p95Diff));
    
    if (maxDiff > baseline.regressionThreshold * 3) return 'critical';
    if (maxDiff > baseline.regressionThreshold * 2) return 'high';
    if (maxDiff > baseline.regressionThreshold) return 'medium';
    return 'low';
  }

  private checkAlerts(metricName: string, value: number): void {
    const threshold = this.alertThresholds.get(metricName);
    if (!threshold) return;

    let alertLevel: 'warning' | 'critical' | null = null;

    if (threshold.critical && (value > threshold.critical.max || value < threshold.critical.min)) {
      alertLevel = 'critical';
    } else if (threshold.warning && (value > threshold.warning.max || value < threshold.warning.min)) {
      alertLevel = 'warning';
    }

    if (alertLevel) {
      const alert: PerformanceAlert = {
        timestamp: Date.now(),
        metricName,
        level: alertLevel,
        value,
        threshold: threshold[alertLevel]!,
        message: `${metricName} ${alertLevel}: ${value} (threshold: ${threshold[alertLevel]!.min}-${threshold[alertLevel]!.max})`
      };

      this.emit('alert', alert);
    }
  }

  private trimMetrics(metricName: string): void {
    const maxAge = this.config.maxDataAge || 24 * 60 * 60 * 1000; // 24 hours
    const maxPoints = this.config.maxDataPoints || 10000;
    
    const metrics = this.metrics.get(metricName);
    if (!metrics) return;

    const cutoff = Date.now() - maxAge;
    let filtered = metrics.filter(m => m.timestamp >= cutoff);

    if (filtered.length > maxPoints) {
      filtered = filtered.slice(-maxPoints);
    }

    this.metrics.set(metricName, filtered);
  }

  private loadBaselines(): void {
    const baselineFile = this.config.baselineFile || './performance-baselines.json';
    if (existsSync(baselineFile)) {
      try {
        const data = JSON.parse(readFileSync(baselineFile, 'utf8'));
        for (const [metricName, baseline] of Object.entries(data)) {
          this.baselineData.set(metricName, baseline as PerformanceBaseline);
        }
      } catch (error) {
        this.emit('error', { message: 'Failed to load baselines', error });
      }
    }
  }

  private saveBaselines(): void {
    const baselineFile = this.config.baselineFile || './performance-baselines.json';
    const data = Object.fromEntries(this.baselineData);
    
    try {
      writeFileSync(baselineFile, JSON.stringify(data, null, 2));
    } catch (error) {
      this.emit('error', { message: 'Failed to save baselines', error });
    }
  }

  private setupDefaultThresholds(): void {
    // Default thresholds for common metrics
    this.setAlertThreshold('response-time', {
      warning: { min: 0, max: 1000 }, // 1 second
      critical: { min: 0, max: 5000 } // 5 seconds
    });

    this.setAlertThreshold('error-rate', {
      warning: { min: 0, max: 0.05 }, // 5%
      critical: { min: 0, max: 0.1 } // 10%
    });

    this.setAlertThreshold('memory-usage', {
      warning: { min: 0, max: 500 * 1024 * 1024 }, // 500MB
      critical: { min: 0, max: 1024 * 1024 * 1024 } // 1GB
    });
  }

  private getRecentAlerts(timeRangeMs: number): PerformanceAlert[] {
    // This would typically be stored separately
    // For now, return empty array
    return [];
  }

  private getMetricStatus(metricName: string, value: number): 'healthy' | 'warning' | 'critical' {
    const threshold = this.alertThresholds.get(metricName);
    if (!threshold) return 'healthy';

    if (threshold.critical && (value > threshold.critical.max || value < threshold.critical.min)) {
      return 'critical';
    }
    if (threshold.warning && (value > threshold.warning.max || value < threshold.warning.min)) {
      return 'warning';
    }
    return 'healthy';
  }

  private calculateSystemHealth(metrics: DashboardMetric[]): 'healthy' | 'warning' | 'critical' {
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;
    const totalCount = metrics.length;

    if (criticalCount > 0 || (criticalCount + warningCount) / totalCount > 0.5) {
      return 'critical';
    }
    if (warningCount > 0 || (warningCount) / totalCount > 0.2) {
      return 'warning';
    }
    return 'healthy';
  }

  private getSystemInfo(): SystemInfo {
    const memUsage = process.memoryUsage();
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpuUsage: process.cpuUsage(),
      loadAverage: require('os').loadavg()
    };
  }

  private convertToCSV(data: Record<string, PerformanceMetric[]>): string {
    const rows: string[] = ['timestamp,metric,value,metadata'];
    
    for (const [metricName, metrics] of Object.entries(data)) {
      for (const metric of metrics) {
        const metadata = metric.metadata ? JSON.stringify(metric.metadata) : '';
        rows.push(`${metric.timestamp},${metricName},${metric.value},"${metadata}"`);
      }
    }
    
    return rows.join('\n');
  }
}

// Type definitions
export interface PerformanceMonitorConfig {
  maxDataAge?: number;
  maxDataPoints?: number;
  baselineFile?: string;
  reportsDir?: string;
}

export interface PerformanceMetric {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface MetricStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  stdDev: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PerformanceBaseline {
  expectedValue: number;
  p95Threshold: number;
  regressionThreshold: number; // Percentage
  createdAt: number;
  description?: string;
}

export interface BaselineComparison {
  metricName: string;
  baseline: PerformanceBaseline;
  current: MetricStats;
  meanDifference: number; // Percentage
  p95Difference: number; // Percentage
  isRegression: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertThreshold {
  warning?: { min: number; max: number };
  critical?: { min: number; max: number };
}

export interface PerformanceAlert {
  timestamp: number;
  metricName: string;
  level: 'warning' | 'critical';
  value: number;
  threshold: { min: number; max: number };
  message: string;
}

export interface MetricReport {
  metricName: string;
  stats: MetricStats;
  baseline?: BaselineComparison;
  dataPoints: number;
}

export interface PerformanceReport {
  timestamp: Date;
  timeRangeMs: number;
  summary: {
    totalMetrics: number;
    activeMonitors: number;
    totalAlerts: number;
    regressions: number;
  };
  metrics: MetricReport[];
  alerts: PerformanceAlert[];
  regressions: BaselineComparison[];
  systemInfo: SystemInfo;
}

export interface DashboardMetric {
  name: string;
  current: number;
  trend: 'up' | 'down' | 'stable';
  status: 'healthy' | 'warning' | 'critical';
  sparkline: Array<{ x: number; y: number }>;
  baseline?: number;
  isRegression: boolean;
}

export interface DashboardData {
  timestamp: number;
  timeRangeMs: number;
  metrics: DashboardMetric[];
  alerts: PerformanceAlert[];
  systemHealth: 'healthy' | 'warning' | 'critical';
  summary: {
    totalMetrics: number;
    healthyMetrics: number;
    warningMetrics: number;
    criticalMetrics: number;
    regressions: number;
  };
}

export interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  loadAverage: number[];
}






