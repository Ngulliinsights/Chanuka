import { Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { performanceMonitor } from './performance-monitor.js';
import { errorTracker } from '../../core/errors/error-tracker.js';
import { logger } from '@shared/utils/logger';

export interface APMMetrics {
  requestMetrics: {
    totalRequests: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    slowestEndpoints: Array<{
      endpoint: string;
      method: string;
      averageTime: number;
      requestCount: number;
    }>;
  };
  systemMetrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    uptime: number;
    eventLoopDelay: number;
    activeHandles: number;
    activeRequests: number;
  };
  businessMetrics: {
    activeUsers: number;
    billsTracked: number;
    commentsPosted: number;
    searchQueries: number;
    notificationsSent: number;
  };
  alertStatus: {
    activeAlerts: number;
    recentAlerts: Array<{
      type: string;
      message: string;
      severity: string;
      timestamp: Date;
    }>;
  };
}

export interface PerformanceBaseline {
  endpoint: string;
  method: string;
  baselineResponseTime: number;
  baselineErrorRate: number;
  sampleSize: number;
  lastUpdated: Date;
  confidence: number; // 0-1 scale
}

export interface PerformanceAlert {
  id: string;
  type: 'response_time' | 'error_rate' | 'throughput' | 'system_resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  endpoint?: string;
  currentValue: number;
  thresholdValue: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

class APMService {
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private businessMetrics: Map<string, number> = new Map();
  private systemMetricsHistory: Array<{ timestamp: Date; metrics: any }> = [];
  private readonly BASELINE_CONFIDENCE_THRESHOLD = 0.8;
  private readonly BASELINE_MIN_SAMPLES = 100;
  private readonly HISTORY_RETENTION_HOURS = 24;

  constructor() {
    // Initialize business metrics
    this.initializeBusinessMetrics();

    // Start periodic monitoring
    this.startPeriodicMonitoring();

    // Clean up old data periodically
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // 1 hour
  }

  /**
   * Get comprehensive APM metrics
   */
  async getAPMMetrics(): Promise<APMMetrics> {
    const requestMetrics = await this.getRequestMetrics();
    const systemMetrics = await this.getSystemMetrics();
    const businessMetrics = this.getBusinessMetrics();
    const alertStatus = this.getAlertStatus();

    return {
      requestMetrics,
      systemMetrics,
      businessMetrics,
      alertStatus
    };
  }

  /**
   * Get request performance metrics
   */
  private async getRequestMetrics() {
    const summary = performanceMonitor.getPerformanceSummary();
    const traces = performanceMonitor.getRecentTraces(1000);
    
    // Calculate percentiles
    const responseTimes = traces
      .filter(trace => trace.duration !== undefined)
      .map(trace => trace.duration!)
      .sort((a, b) => a - b);

    const p50 = this.calculatePercentile(responseTimes, 0.5);
    const p95 = this.calculatePercentile(responseTimes, 0.95);
    const p99 = this.calculatePercentile(responseTimes, 0.99);

    // Calculate requests per second
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentTraces = traces.filter(trace => 
      trace.endTime && trace.endTime > oneMinuteAgo
    );
    const requestsPerSecond = recentTraces.length / 60;

    return {
      totalRequests: summary.totalRequests,
      requestsPerSecond,
      averageResponseTime: summary.averageResponseTime,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      errorRate: summary.errorRate,
      slowestEndpoints: summary.slowestEndpoints.map(endpoint => ({
        endpoint: endpoint.endpoint,
        method: endpoint.endpoint.split(' ')[0] || 'GET',
        averageTime: endpoint.avgTime,
        requestCount: traces.filter(t => 
          `${t.method} ${t.url}` === endpoint.endpoint
        ).length
      }))
    };
  }

  /**
   * Get system performance metrics
   */
  private async getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    // Measure event loop delay
    const eventLoopDelay = await this.measureEventLoopDelay();

    return {
      memoryUsage,
      cpuUsage,
      uptime,
      eventLoopDelay,
      activeHandles: (process as any)._getActiveHandles().length,
      activeRequests: (process as any)._getActiveRequests().length
    };
  }

  /**
   * Get business metrics
   */
  private getBusinessMetrics() {
    return {
      activeUsers: this.businessMetrics.get('activeUsers') || 0,
      billsTracked: this.businessMetrics.get('billsTracked') || 0,
      commentsPosted: this.businessMetrics.get('commentsPosted') || 0,
      searchQueries: this.businessMetrics.get('searchQueries') || 0,
      notificationsSent: this.businessMetrics.get('notificationsSent') || 0
    };
  }

  /**
   * Get alert status
   */
  private getAlertStatus() {
    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => !alert.resolved);

    const recentAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.timestamp > new Date(Date.now() - 3600000)) // Last hour
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(alert => ({
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp
      }));

    return {
      activeAlerts: activeAlerts.length,
      recentAlerts
    };
  }

  /**
   * Update performance baselines
   */
  async updateBaselines(): Promise<void> {
    const traces = performanceMonitor.getRecentTraces(5000);
    const endpointGroups = new Map<string, number[]>();

    // Group traces by endpoint
    traces.forEach(trace => {
      if (!trace.duration || !trace.statusCode || trace.statusCode >= 400) return;
      
      const key = `${trace.method}:${trace.url}`;
      if (!endpointGroups.has(key)) {
        endpointGroups.set(key, []);
      }
      endpointGroups.get(key)!.push(trace.duration);
    });

    // Calculate baselines for each endpoint
    endpointGroups.forEach((responseTimes, endpointKey) => {
      if (responseTimes.length < this.BASELINE_MIN_SAMPLES) return;

      const [method, endpoint] = endpointKey.split(':', 2);
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const baselineResponseTime = this.calculatePercentile(sortedTimes, 0.95);
      
      // Calculate confidence based on sample size and variance
      const variance = this.calculateVariance(sortedTimes);
      const confidence = Math.min(1, responseTimes.length / 1000) * 
                        Math.max(0.5, 1 - (variance / baselineResponseTime));

      const baseline: PerformanceBaseline = {
        endpoint,
        method,
        baselineResponseTime,
        baselineErrorRate: 0, // Will be calculated separately
        sampleSize: responseTimes.length,
        lastUpdated: new Date(),
        confidence
      };

      this.baselines.set(endpointKey, baseline);
    });

    console.log(`[APM] Updated ${this.baselines.size} performance baselines`);
  }

  /**
   * Check for performance regressions
   */
  async checkPerformanceRegressions(): Promise<PerformanceAlert[]> {
    const regressions = performanceMonitor.checkPerformanceRegressions();
    const alerts: PerformanceAlert[] = [];

    regressions.forEach(regression => {
      const alertId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const severity = this.calculateRegressionSeverity(regression.regressionPercent);
      
      const alert: PerformanceAlert = {
        id: alertId,
        type: 'response_time',
        severity,
        message: `Performance regression detected on ${regression.endpoint}: ${regression.regressionPercent.toFixed(1)}% slower than baseline`,
        endpoint: regression.endpoint,
        currentValue: regression.currentAvg,
        thresholdValue: regression.baselineAvg,
        timestamp: new Date(),
        resolved: false
      };

      this.alerts.set(alertId, alert);
      alerts.push(alert);

      // Track as error for comprehensive monitoring
      errorTracker.trackError(
        `Performance regression: ${regression.endpoint}`,
        {
          endpoint: regression.endpoint,
          currentAvg: regression.currentAvg,
          baselineAvg: regression.baselineAvg,
          regressionPercent: regression.regressionPercent
        },
        severity,
        'system'
      );
    });

    return alerts;
  }

  /**
   * Track business metric
   */
  trackBusinessMetric(metric: string, value: number): void {
    this.businessMetrics.set(metric, value);
  }

  /**
   * Increment business metric
   */
  incrementBusinessMetric(metric: string, increment: number = 1): void {
    const current = this.businessMetrics.get(metric) || 0;
    this.businessMetrics.set(metric, current + increment);
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(timeRange: 'hour' | 'day' | 'week' = 'hour'): Promise<{
    summary: APMMetrics;
    trends: Array<{ timestamp: Date; metrics: any }>;
    recommendations: string[];
  }> {
    const summary = await this.getAPMMetrics();
    
    // Get historical data based on time range
    const cutoffTime = this.getCutoffTime(timeRange);
    const trends = this.systemMetricsHistory
      .filter(entry => entry.timestamp > cutoffTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary);

    return {
      summary,
      trends,
      recommendations
    };
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();
    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => {
        // Sort by severity, then by timestamp
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }

  /**
   * Initialize business metrics
   */
  private initializeBusinessMetrics(): void {
    const metrics = [
      'activeUsers', 'billsTracked', 'commentsPosted', 
      'searchQueries', 'notificationsSent'
    ];
    
    metrics.forEach(metric => {
      this.businessMetrics.set(metric, 0);
    });
  }

  /**
   * Start periodic monitoring
   */
  private startPeriodicMonitoring(): void {
    // Update baselines every 5 minutes
    setInterval(async () => {
      try {
        await this.updateBaselines();
      } catch (error) {
        logger.error('[APM] Error updating baselines:', { component: 'Chanuka' }, error);
      }
    }, 300000);

    // Check for regressions every minute
    setInterval(async () => {
      try {
        await this.checkPerformanceRegressions();
      } catch (error) {
        logger.error('[APM] Error checking regressions:', { component: 'Chanuka' }, error);
      }
    }, 60000);

    // Collect system metrics every 30 seconds
    setInterval(async () => {
      try {
        const metrics = await this.getSystemMetrics();
        this.systemMetricsHistory.push({
          timestamp: new Date(),
          metrics
        });

        // Keep only recent history
        const cutoffTime = new Date(Date.now() - this.HISTORY_RETENTION_HOURS * 3600000);
        this.systemMetricsHistory = this.systemMetricsHistory
          .filter(entry => entry.timestamp > cutoffTime);
      } catch (error) {
        logger.error('[APM] Error collecting system metrics:', { component: 'Chanuka' }, error);
      }
    }, 30000);
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Measure event loop delay
   */
  private measureEventLoopDelay(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      setImmediate(() => {
        const delay = performance.now() - start;
        resolve(delay);
      });
    });
  }

  /**
   * Calculate regression severity
   */
  private calculateRegressionSeverity(regressionPercent: number): 'low' | 'medium' | 'high' | 'critical' {
    if (regressionPercent > 200) return 'critical';
    if (regressionPercent > 100) return 'high';
    if (regressionPercent > 50) return 'medium';
    return 'low';
  }

  /**
   * Get cutoff time for time range
   */
  private getCutoffTime(timeRange: 'hour' | 'day' | 'week'): Date {
    const now = Date.now();
    switch (timeRange) {
      case 'hour': return new Date(now - 3600000);
      case 'day': return new Date(now - 86400000);
      case 'week': return new Date(now - 604800000);
      default: return new Date(now - 3600000);
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: APMMetrics): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    if (metrics.requestMetrics.p95ResponseTime > 2000) {
      recommendations.push('Consider optimizing slow endpoints - 95th percentile response time exceeds 2 seconds');
    }

    // Error rate recommendations
    if (metrics.requestMetrics.errorRate > 5) {
      recommendations.push('High error rate detected - investigate and fix failing endpoints');
    }

    // Memory recommendations
    const memoryUsageMB = metrics.systemMetrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 500) {
      recommendations.push('High memory usage detected - consider memory optimization or scaling');
    }

    // Event loop recommendations
    if (metrics.systemMetrics.eventLoopDelay > 10) {
      recommendations.push('Event loop delay detected - check for blocking operations');
    }

    // Business metric recommendations
    if (metrics.businessMetrics.activeUsers > 1000 && metrics.requestMetrics.p95ResponseTime > 1000) {
      recommendations.push('Consider implementing caching or database optimization for high user load');
    }

    return recommendations;
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffTime = new Date(Date.now() - 24 * 3600000); // 24 hours

    // Clean up old alerts
    const alertsToDelete: string[] = [];
    this.alerts.forEach((alert, id) => {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoffTime) {
        alertsToDelete.push(id);
      }
    });
    alertsToDelete.forEach(id => this.alerts.delete(id));

    // Clean up old baselines (keep only recent ones)
    const baselineCutoff = new Date(Date.now() - 7 * 24 * 3600000); // 7 days
    const baselinesToDelete: string[] = [];
    this.baselines.forEach((baseline, key) => {
      if (baseline.lastUpdated < baselineCutoff) {
        baselinesToDelete.push(key);
      }
    });
    baselinesToDelete.forEach(key => this.baselines.delete(key));
  }
}

// Export singleton instance
export const apmService = new APMService();






