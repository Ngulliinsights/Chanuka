/**
 * Optimized Performance Monitoring Service - Phase 6
 *
 * Comprehensive performance monitoring with production optimization,
 * intelligent sampling, configurable levels, and business KPI integration.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { logger } from '@shared/core/src/observability/logging';
import { config } from '../config/index.js';

// Monitoring levels
export enum MonitoringLevel {
  MINIMAL = 'minimal',     // Critical metrics only
  STANDARD = 'standard',   // Balanced monitoring
  DETAILED = 'detailed'    // Full observability
}

// Sampling strategies
export enum SamplingStrategy {
  NONE = 'none',           // No sampling
  PROBABILISTIC = 'probabilistic',  // Random sampling
  ADAPTIVE = 'adaptive',   // Load-based sampling
  BURST = 'burst'          // Burst detection sampling
}

// Metric types
export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface AggregatedMetric {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  lastValue: number;
  firstTimestamp: number;
  lastTimestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceAlert {
  id: string;
  type: 'anomaly' | 'regression' | 'threshold' | 'trend';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  message: string;
  value: number;
  threshold?: number;
  baseline?: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface BusinessKPI {
  name: string;
  value: number;
  target?: number;
  status: 'on_track' | 'at_risk' | 'off_track';
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: number;
  metadata?: Record<string, any>;
}

// Configuration interfaces
export interface MonitoringConfig {
  level: MonitoringLevel;
  sampling: {
    strategy: SamplingStrategy;
    rate: number;  // 0.0 to 1.0
    adaptiveThreshold: number;
    burstThreshold: number;
  };
  retention: {
    rawMetrics: number;      // hours
    aggregatedMetrics: number; // days
    alerts: number;          // days
  };
  alerting: {
    enabled: boolean;
    anomalyDetection: boolean;
    regressionDetection: boolean;
    thresholds: Record<string, number>;
  };
  memory: {
    maxMetrics: number;
    cleanupInterval: number; // minutes
  };
  business: {
    kpis: string[];
    updateInterval: number; // minutes
  };
}

export interface SamplingDecision {
  shouldSample: boolean;
  reason: string;
  rate: number;
}

// Default configuration
const DEFAULT_CONFIG: MonitoringConfig = {
  level: MonitoringLevel.STANDARD,
  sampling: {
    strategy: SamplingStrategy.ADAPTIVE,
    rate: 0.1, // 10% sampling by default
    adaptiveThreshold: 1000, // requests per minute
    burstThreshold: 5000
  },
  retention: {
    rawMetrics: 24,     // 24 hours
    aggregatedMetrics: 30, // 30 days
    alerts: 7           // 7 days
  },
  alerting: {
    enabled: true,
    anomalyDetection: true,
    regressionDetection: true,
    thresholds: {
      response_time_p95: 5000,    // 5 seconds
      error_rate: 0.05,           // 5%
      throughput_drop: 0.2        // 20% drop
    }
  },
  memory: {
    maxMetrics: 100000,
    cleanupInterval: 15 // 15 minutes
  },
  business: {
    kpis: ['user_satisfaction', 'conversion_rate', 'revenue_per_user'],
    updateInterval: 60 // 1 hour
  }
};

/**
 * Optimized Performance Monitoring Service
 */
export class PerformanceMonitoringService extends EventEmitter {
  private static instance: PerformanceMonitoringService;
  private config: MonitoringConfig;
  private isRunning = false;

  // Data storage with memory optimization
  private rawMetrics: Map<string, MetricData[]> = new Map();
  private aggregatedMetrics: Map<string, AggregatedMetric> = new Map();
  private alerts: PerformanceAlert[] = [];
  private businessKPIs: Map<string, BusinessKPI> = new Map();

  // Sampling state
  private currentLoad = 0;
  private samplingRates: Map<string, number> = new Map();

  // Time-based aggregation
  private aggregationWindows: Map<string, { minute: number, hour: number, day: number }> = new Map();

  // Anomaly detection
  private baselines: Map<string, { mean: number, std: number, count: number }> = new Map();

  // Cleanup timers
  private cleanupTimer?: NodeJS.Timeout;
  private aggregationTimer?: NodeJS.Timeout;
  private kpiUpdateTimer?: NodeJS.Timeout;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  public static getInstance(config?: Partial<MonitoringConfig>): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService(config);
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Initialize the monitoring service
   */
  private initialize(): void {
    this.setupCleanupTimers();
    this.setupAggregationTimers();
    this.setupKPIUpdateTimers();
    logger.info('Performance monitoring service initialized', {
      component: 'performance-monitoring',
      level: this.config.level,
      sampling: this.config.sampling
    });
  }

  /**
   * Start the monitoring service
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.emit('started');
    logger.info('Performance monitoring service started', { component: 'performance-monitoring' });
  }

  /**
   * Stop the monitoring service
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.aggregationTimer) clearInterval(this.aggregationTimer);
    if (this.kpiUpdateTimer) clearInterval(this.kpiUpdateTimer);

    this.emit('stopped');
    logger.info('Performance monitoring service stopped', { component: 'performance-monitoring' });
  }

  /**
   * Record a performance metric with sampling
   */
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    if (!this.isRunning) return;

    // Check monitoring level
    if (!this.shouldRecordMetric(name)) return;

    // Apply sampling
    const samplingDecision = this.shouldSample(name);
    if (!samplingDecision.shouldSample) return;

    const metric: MetricData = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      metadata
    };

    // Store raw metric with memory limits
    this.storeRawMetric(metric);

    // Update aggregations
    this.updateAggregations(metric);

    // Check for alerts
    this.checkAlerts(metric);

    // Emit event for real-time processing
    this.emit('metricRecorded', metric);
  }

  /**
   * Record execution time for a function
   */
  async measureExecution<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    if (!this.isRunning || !this.shouldRecordMetric(name)) {
      return fn();
    }

    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.recordMetric(`${name}.duration`, duration, tags, {
        success: true,
        startTime,
        endTime: startTime + duration
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.recordMetric(`${name}.duration`, duration, tags, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        startTime,
        endTime: startTime + duration
      });

      throw error;
    }
  }

  /**
   * Get current monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
    logger.info('Performance monitoring configuration updated', {
      component: 'performance-monitoring',
      updates
    });
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): Record<string, AggregatedMetric> {
    const result: Record<string, AggregatedMetric> = {};
    for (const [key, metric] of this.aggregatedMetrics) {
      result[key] = { ...metric };
    }
    return result;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 50): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get business KPIs
   */
  getBusinessKPIs(): Record<string, BusinessKPI> {
    const result: Record<string, BusinessKPI> = {};
    for (const [key, kpi] of this.businessKPIs) {
      result[key] = { ...kpi };
    }
    return result;
  }

  /**
   * Get monitoring health status
   */
  getHealthStatus(): {
    isRunning: boolean;
    level: MonitoringLevel;
    metricsCount: number;
    alertsCount: number;
    memoryUsage: number;
    lastCleanup: number;
  } {
    return {
      isRunning: this.isRunning,
      level: this.config.level,
      metricsCount: Array.from(this.rawMetrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      alertsCount: this.alerts.length,
      memoryUsage: this.calculateMemoryUsage(),
      lastCleanup: Date.now() // Would track actual cleanup time
    };
  }

  // Private methods

  /**
   * Determine if a metric should be recorded based on monitoring level
   */
  private shouldRecordMetric(name: string): boolean {
    switch (this.config.level) {
      case MonitoringLevel.MINIMAL:
        return name.includes('error') || name.includes('critical') || name.includes('health');
      case MonitoringLevel.STANDARD:
        return !name.includes('debug') && !name.includes('trace');
      case MonitoringLevel.DETAILED:
        return true;
      default:
        return true;
    }
  }

  /**
   * Determine if a metric should be sampled
   */
  private shouldSample(metricName: string): SamplingDecision {
    const strategy = this.config.sampling.strategy;

    switch (strategy) {
      case SamplingStrategy.NONE:
        return { shouldSample: true, reason: 'no_sampling', rate: 1.0 };

      case SamplingStrategy.PROBABILISTIC:
        const rate = this.samplingRates.get(metricName) || this.config.sampling.rate;
        const shouldSample = Math.random() < rate;
        return { shouldSample, reason: 'probabilistic', rate };

      case SamplingStrategy.ADAPTIVE:
        return this.adaptiveSampling(metricName);

      case SamplingStrategy.BURST:
        return this.burstSampling(metricName);

      default:
        return { shouldSample: true, reason: 'default', rate: 1.0 };
    }
  }

  /**
   * Adaptive sampling based on current load
   */
  private adaptiveSampling(metricName: string): SamplingDecision {
    const loadThreshold = this.config.sampling.adaptiveThreshold;
    const currentLoad = this.getCurrentLoad();

    let rate: number;
    if (currentLoad > loadThreshold * 2) {
      rate = 0.01; // 1% sampling under high load
    } else if (currentLoad > loadThreshold) {
      rate = 0.05; // 5% sampling under moderate load
    } else {
      rate = 0.5; // 50% sampling under normal load
    }

    this.samplingRates.set(metricName, rate);
    const shouldSample = Math.random() < rate;

    return {
      shouldSample,
      reason: `adaptive_load_${currentLoad}`,
      rate
    };
  }

  /**
   * Burst detection sampling
   */
  private burstSampling(metricName: string): SamplingDecision {
    const burstThreshold = this.config.sampling.burstThreshold;
    const currentLoad = this.getCurrentLoad();

    if (currentLoad > burstThreshold) {
      // During bursts, sample everything to capture the event
      return { shouldSample: true, reason: 'burst_detected', rate: 1.0 };
    } else {
      // Normal sampling during non-burst periods
      const rate = this.config.sampling.rate;
      const shouldSample = Math.random() < rate;
      return { shouldSample, reason: 'normal_burst', rate };
    }
  }

  /**
   * Get current system load (simplified)
   */
  private getCurrentLoad(): number {
    // This would integrate with actual load monitoring
    // For now, use a simple metric count-based approximation
    const now = Date.now();
    const recentMetrics = Array.from(this.rawMetrics.values())
      .flat()
      .filter(m => now - m.timestamp < 60000) // Last minute
      .length;

    this.currentLoad = recentMetrics;
    return recentMetrics;
  }

  /**
   * Store raw metric with memory management
   */
  private storeRawMetric(metric: MetricData): void {
    const key = this.getMetricKey(metric.name, metric.tags);
    let metrics = this.rawMetrics.get(key) || [];

    metrics.push(metric);

    // Enforce per-key memory limits (distribute maxMetrics across keys)
    const maxMetricsPerKey = Math.max(100, Math.floor(this.config.memory.maxMetrics / Math.max(1, this.rawMetrics.size)));
    if (metrics.length > maxMetricsPerKey) {
      // Keep most recent metrics for this key
      metrics = metrics.slice(-maxMetricsPerKey);
    }

    this.rawMetrics.set(key, metrics);

    // Enforce global memory limits
    this.enforceGlobalMetricsLimit();
  }

  /**
   * Update metric aggregations
   */
  private updateAggregations(metric: MetricData): void {
    const key = this.getMetricKey(metric.name, metric.tags);
    const existing = this.aggregatedMetrics.get(key);

    if (existing) {
      // Update existing aggregation
      existing.count++;
      existing.sum += metric.value;
      existing.min = Math.min(existing.min, metric.value);
      existing.max = Math.max(existing.max, metric.value);
      existing.avg = existing.sum / existing.count;
      existing.lastValue = metric.value;
      existing.lastTimestamp = metric.timestamp;

      // Update percentiles (simplified)
      this.updatePercentiles(existing, metric.value);
    } else {
      // Create new aggregation
      this.aggregatedMetrics.set(key, {
        name: metric.name,
        count: 1,
        sum: metric.value,
        min: metric.value,
        max: metric.value,
        avg: metric.value,
        p50: metric.value,
        p95: metric.value,
        p99: metric.value,
        lastValue: metric.value,
        firstTimestamp: metric.timestamp,
        lastTimestamp: metric.timestamp,
        tags: metric.tags
      });
    }
  }

  /**
   * Update percentile calculations (simplified)
   */
  private updatePercentiles(agg: AggregatedMetric, newValue: number): void {
    // Simplified percentile tracking - in production, use a proper algorithm
    agg.p50 = agg.avg; // Approximation
    agg.p95 = Math.max(agg.p95, newValue * 0.95); // Conservative estimate
    agg.p99 = Math.max(agg.p99, newValue * 0.99); // Conservative estimate
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metric: MetricData): void {
    if (!this.config.alerting.enabled) return;

    // Threshold-based alerts
    this.checkThresholdAlerts(metric);

    // Anomaly detection
    if (this.config.alerting.anomalyDetection) {
      this.checkAnomalyAlerts(metric);
    }

    // Regression detection
    if (this.config.alerting.regressionDetection) {
      this.checkRegressionAlerts(metric);
    }
  }

  /**
   * Check threshold-based alerts
   */
  private checkThresholdAlerts(metric: MetricData): void {
    const threshold = this.config.alerting.thresholds[metric.name];
    if (!threshold) return;

    let triggered = false;
    let message = '';

    if (metric.name.includes('response_time') && metric.value > threshold) {
      triggered = true;
      message = `Response time ${metric.value}ms exceeds threshold ${threshold}ms`;
    } else if (metric.name.includes('error_rate') && metric.value > threshold) {
      triggered = true;
      message = `Error rate ${(metric.value * 100).toFixed(2)}% exceeds threshold ${(threshold * 100).toFixed(2)}%`;
    }

    if (triggered) {
      this.createAlert({
        type: 'threshold',
        severity: 'high',
        metric: metric.name,
        message,
        value: metric.value,
        threshold,
        timestamp: metric.timestamp,
        tags: metric.tags
      });
    }
  }

  /**
   * Check for anomalous metric values
   */
  private checkAnomalyAlerts(metric: MetricData): void {
    const baseline = this.baselines.get(metric.name);
    if (!baseline || baseline.count < 10) {
      // Update baseline
      this.updateBaseline(metric.name, metric.value);
      return;
    }

    // Simple statistical anomaly detection
    const zScore = Math.abs((metric.value - baseline.mean) / baseline.std);
    if (zScore > 3) { // 3 standard deviations
      this.createAlert({
        type: 'anomaly',
        severity: zScore > 5 ? 'critical' : 'high',
        metric: metric.name,
        message: `Anomalous value detected: ${metric.value} (z-score: ${zScore.toFixed(2)})`,
        value: metric.value,
        baseline: baseline.mean,
        timestamp: metric.timestamp,
        tags: metric.tags
      });
    }

    this.updateBaseline(metric.name, metric.value);
  }

  /**
   * Check for performance regressions
   */
  private checkRegressionAlerts(metric: MetricData): void {
    // Simplified regression detection - compare with recent trend
    const history = this.rawMetrics.get(this.getMetricKey(metric.name, metric.tags)) || [];
    if (history.length < 20) return;

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);

    const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

    const changePercent = Math.abs((recentAvg - olderAvg) / olderAvg);

    if (changePercent > 0.5) { // 50% change
      const direction = recentAvg > olderAvg ? 'increased' : 'decreased';
      this.createAlert({
        type: 'regression',
        severity: 'medium',
        metric: metric.name,
        message: `Performance regression detected: ${direction} by ${(changePercent * 100).toFixed(1)}%`,
        value: recentAvg,
        baseline: olderAvg,
        timestamp: metric.timestamp,
        tags: metric.tags
      });
    }
  }

  /**
   * Update statistical baseline for anomaly detection
   */
  private updateBaseline(metricName: string, value: number): void {
    const existing = this.baselines.get(metricName);

    if (existing) {
      // Online variance calculation
      existing.count++;
      const delta = value - existing.mean;
      existing.mean += delta / existing.count;
      const delta2 = value - existing.mean;
      existing.std = Math.sqrt((existing.std * existing.std * (existing.count - 1) + delta * delta2) / existing.count);
    } else {
      this.baselines.set(metricName, {
        mean: value,
        std: 0,
        count: 1
      });
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(alert: Omit<PerformanceAlert, 'id'>): void {
    const alertWithId: PerformanceAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.alerts.push(alertWithId);

    // Keep only recent alerts
    const maxAlerts = 1000;
    if (this.alerts.length > maxAlerts) {
      this.alerts = this.alerts.slice(-maxAlerts);
    }

    this.emit('alertCreated', alertWithId);
    logger.warn('Performance alert created', {
      component: 'performance-monitoring',
      alert: alertWithId
    });
  }

  /**
   * Update business KPIs
   */
  private async updateBusinessKPIs(): Promise<void> {
    for (const kpiName of this.config.business.kpis) {
      try {
        const kpi = await this.calculateBusinessKPI(kpiName);
        this.businessKPIs.set(kpiName, kpi);
      } catch (error) {
        logger.error(`Failed to calculate business KPI: ${kpiName}`, {
          component: 'performance-monitoring',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Calculate a business KPI (placeholder implementation)
   */
  private async calculateBusinessKPI(name: string): Promise<BusinessKPI> {
    // This would integrate with actual business metrics
    // For now, return mock data based on performance metrics

    let value = 0;
    let target = 0;
    let status: BusinessKPI['status'] = 'on_track';
    let trend: BusinessKPI['trend'] = 'stable';

    switch (name) {
      case 'user_satisfaction':
        // Based on error rates and response times
        const errorRate = this.getAggregatedMetric('error_rate')?.avg || 0;
        const responseTime = this.getAggregatedMetric('response_time')?.p95 || 0;
        value = Math.max(0, 100 - (errorRate * 1000) - (responseTime / 100));
        target = 95;
        break;

      case 'conversion_rate':
        // Mock conversion rate
        value = 3.2;
        target = 3.5;
        break;

      case 'revenue_per_user':
        // Mock revenue metric
        value = 45.50;
        target = 50.00;
        break;
    }

    if (value < target * 0.9) {
      status = 'off_track';
      trend = 'declining';
    } else if (value < target * 0.95) {
      status = 'at_risk';
      trend = 'stable';
    } else {
      status = 'on_track';
      trend = 'improving';
    }

    return {
      name,
      value,
      target,
      status,
      trend,
      lastUpdated: Date.now()
    };
  }

  /**
   * Get aggregated metric by name
   */
  private getAggregatedMetric(name: string): AggregatedMetric | undefined {
    for (const [key, metric] of this.aggregatedMetrics) {
      if (key.startsWith(name)) {
        return metric;
      }
    }
    return undefined;
  }

  /**
   * Generate metric key for storage
   */
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;

    const sortedTags = Object.keys(tags)
      .sort()
      .map(key => `${key}=${tags[key]}`)
      .join(',');

    return sortedTags ? `${name}{${sortedTags}}` : name;
  }

  /**
   * Calculate current memory usage
   */
  private calculateMemoryUsage(): number {
    const rawMetricsSize = Array.from(this.rawMetrics.values())
      .reduce((sum, arr) => sum + arr.length, 0);

    const aggregatedSize = this.aggregatedMetrics.size;
    const alertsSize = this.alerts.length;

    return rawMetricsSize + aggregatedSize + alertsSize;
  }

  /**
   * Setup cleanup timers
   */
  private setupCleanupTimers(): void {
    const interval = this.config.memory.cleanupInterval * 60 * 1000; // Convert to milliseconds
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, interval);
  }

  /**
   * Setup aggregation timers
   */
  private setupAggregationTimers(): void {
    // Aggregate every 5 minutes
    this.aggregationTimer = setInterval(() => {
      this.performTimeBasedAggregation();
    }, 5 * 60 * 1000);
  }

  /**
   * Setup KPI update timers
   */
  private setupKPIUpdateTimers(): void {
    const interval = this.config.business.updateInterval * 60 * 1000;
    this.kpiUpdateTimer = setInterval(() => {
      this.updateBusinessKPIs();
    }, interval);

    // Initial update
    this.updateBusinessKPIs();
  }

  /**
   * Enforce global metrics limit to prevent memory leaks
   */
  private enforceGlobalMetricsLimit(): void {
    const totalMetrics = Array.from(this.rawMetrics.values()).reduce((sum, arr) => sum + arr.length, 0);

    if (totalMetrics > this.config.memory.maxMetrics) {
      // Calculate how many metrics to remove
      const excessCount = totalMetrics - this.config.memory.maxMetrics;

      // Remove from oldest metrics across all keys
      let removedCount = 0;
      const keysToProcess = Array.from(this.rawMetrics.keys());

      for (const key of keysToProcess) {
        if (removedCount >= excessCount) break;

        const metrics = this.rawMetrics.get(key);
        if (!metrics || metrics.length === 0) continue;

        // Remove oldest metrics from this key
        const metricsToRemove = Math.min(metrics.length, excessCount - removedCount);
        const remainingMetrics = metrics.slice(metricsToRemove);

        if (remainingMetrics.length === 0) {
          this.rawMetrics.delete(key);
        } else {
          this.rawMetrics.set(key, remainingMetrics);
        }

        removedCount += metricsToRemove;
      }
    }
  }

  /**
   * Perform memory cleanup
   */
  private performCleanup(): void {
    const now = Date.now();
    const rawRetention = this.config.retention.rawMetrics * 60 * 60 * 1000; // Convert to milliseconds
    const alertRetention = this.config.retention.alerts * 24 * 60 * 60 * 1000;

    // Clean up old raw metrics
    for (const [key, metrics] of this.rawMetrics) {
      const filtered = metrics.filter(m => now - m.timestamp < rawRetention);
      if (filtered.length === 0) {
        this.rawMetrics.delete(key);
      } else {
        this.rawMetrics.set(key, filtered);
      }
    }

    // Clean up old alerts
    this.alerts = this.alerts.filter(a => now - a.timestamp < alertRetention);

    // Enforce global limits after cleanup
    this.enforceGlobalMetricsLimit();

    logger.debug('Performance monitoring cleanup completed', {
      component: 'performance-monitoring',
      remainingMetrics: Array.from(this.rawMetrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      remainingAlerts: this.alerts.length
    });
  }

  /**
   * Perform time-based aggregation
   */
  private performTimeBasedAggregation(): void {
    // This would implement proper time-series aggregation
    // For now, just log that aggregation ran
    logger.debug('Time-based aggregation completed', {
      component: 'performance-monitoring',
      aggregatedMetrics: this.aggregatedMetrics.size
    });
  }
}

// Export singleton instance
export const performanceMonitoring = PerformanceMonitoringService.getInstance();











































