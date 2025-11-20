import { logger } from '@shared/core/src/index.js';

/**
 * Validation Metrics Collector Service
 * Collects and aggregates validation metrics across all validation services
 * Provides real-time and historical metrics for monitoring and observability
 */

export interface ValidationMetric {
  service: string;
  operation: string;
  timestamp: number;
  duration: number;
  success: boolean;
  errorType?: string;
  errorCategory?: 'security' | 'format' | 'business_logic' | 'system';
  metadata?: Record<string, any>;
}

export interface ValidationMetricsSummary {
  totalValidations: number;
  successRate: number;
  averageDuration: number;
  errorBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  serviceBreakdown: Record<string, {
    total: number;
    success: number;
    averageDuration: number;
    errors: Record<string, number>;
  }>;
  timeRange: {
    start: number;
    end: number;
  };
}

export interface ValidationHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  services: Record<string, {
    status: 'healthy' | 'warning' | 'critical';
    successRate: number;
    averageDuration: number;
    lastError?: string;
    lastErrorTime?: number;
  }>;
  alerts: string[];
  timestamp: number;
}

export class ValidationMetricsCollector {
  private static instance: ValidationMetricsCollector;
  private metrics: ValidationMetric[] = [];
  private readonly maxMetricsHistory = 10000; // Keep last 10k metrics
  private readonly retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    // Clean up old metrics periodically
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000); // Every hour
  }

  public static getInstance(): ValidationMetricsCollector {
    if (!ValidationMetricsCollector.instance) {
      ValidationMetricsCollector.instance = new ValidationMetricsCollector();
    }
    return ValidationMetricsCollector.instance;
  }

  /**
   * Record a validation metric
   */
  public recordMetric(metric: Omit<ValidationMetric, 'timestamp'>): void {
    const fullMetric: ValidationMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Maintain size limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log significant events
    if (!metric.success) {
      logger.warn('Validation failure recorded', {
        component: 'validation-metrics',
        service: metric.service,
        operation: metric.operation,
        errorType: metric.errorType || 'unknown',
        errorCategory: metric.errorCategory || 'system',
        duration: metric.duration
      });
    }
  }

  /**
   * Record validation start time for duration calculation
   */
  public startValidation(service: string, operation: string, metadata?: Record<string, any>): (success?: boolean, errorType?: string, errorCategory?: ValidationMetric['errorCategory']) => void {
    const startTime = Date.now();

    return (success: boolean = true, errorType?: string, errorCategory?: ValidationMetric['errorCategory']) => {
      const duration = Date.now() - startTime;
      const metric: Omit<ValidationMetric, 'timestamp'> = {
        service,
        operation,
        duration,
        success
      };

      if (errorType) metric.errorType = errorType;
      if (errorCategory) metric.errorCategory = errorCategory;
      if (metadata) metric.metadata = metadata;

      this.recordMetric(metric);
    };
  }

  /**
   * Get real-time metrics summary
   */
  public getMetricsSummary(hoursBack: number = 1): ValidationMetricsSummary {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    const totalValidations = recentMetrics.length;
    const successfulValidations = recentMetrics.filter(m => m.success).length;
    const successRate = totalValidations > 0 ? (successfulValidations / totalValidations) * 100 : 0;

    const durations = recentMetrics.map(m => m.duration);
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const errorBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};
    const serviceBreakdown: Record<string, {
      total: number;
      success: number;
      averageDuration: number;
      errors: Record<string, number>;
    }> = {};

    for (const metric of recentMetrics) {
      // Error breakdown
      if (!metric.success && metric.errorType) {
        errorBreakdown[metric.errorType] = (errorBreakdown[metric.errorType] || 0) + 1;
      }

      // Category breakdown
      if (metric.errorCategory) {
        categoryBreakdown[metric.errorCategory] = (categoryBreakdown[metric.errorCategory] || 0) + 1;
      }

      // Service breakdown
      if (!serviceBreakdown[metric.service]) {
        serviceBreakdown[metric.service] = {
          total: 0,
          success: 0,
          averageDuration: 0,
          errors: {}
        };
      }

      const serviceStats = serviceBreakdown[metric.service]!;
      serviceStats.total++;
      if (metric.success) {
        serviceStats.success++;
      } else if (metric.errorType) {
        serviceStats.errors[metric.errorType] = (serviceStats.errors[metric.errorType] || 0) + 1;
      }
    }

    // Calculate average durations per service
    for (const service of Object.values(serviceBreakdown)) {
      const serviceMetrics = recentMetrics.filter(m => serviceBreakdown[m.service] === service);
      const serviceDurations = serviceMetrics.map(m => m.duration);
      service.averageDuration = serviceDurations.length > 0
        ? serviceDurations.reduce((sum, d) => sum + d, 0) / serviceDurations.length
        : 0;
    }

    return {
      totalValidations,
      successRate,
      averageDuration,
      errorBreakdown,
      categoryBreakdown,
      serviceBreakdown,
      timeRange: {
        start: cutoffTime,
        end: Date.now()
      }
    };
  }

  /**
   * Get validation health status
   */
  public getHealthStatus(): ValidationHealthStatus {
    const summary = this.getMetricsSummary(1); // Last hour
    const alerts: string[] = [];

    const services: Record<string, {
      status: 'healthy' | 'warning' | 'critical';
      successRate: number;
      averageDuration: number;
      lastError?: string;
      lastErrorTime?: number;
    }> = {};

    // Analyze each service
    for (const [serviceName, serviceData] of Object.entries(summary.serviceBreakdown)) {
      const successRate = serviceData.total > 0 ? (serviceData.success / serviceData.total) * 100 : 100;
      const avgDuration = serviceData.averageDuration;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let lastError: string | undefined;
      let lastErrorTime: number | undefined;

      // Find last error for this service
      const serviceErrors = this.metrics
        .filter(m => m.service === serviceName && !m.success)
        .sort((a, b) => b.timestamp - a.timestamp);

      if (serviceErrors.length > 0) {
        const lastErrorMetric = serviceErrors[0]!;
        lastError = lastErrorMetric.errorType;
        lastErrorTime = lastErrorMetric.timestamp;
      }

      // Determine status based on criteria
      if (successRate < 80) {
        status = 'critical';
        alerts.push(`${serviceName}: Success rate below 80% (${successRate.toFixed(1)}%)`);
      } else if (successRate < 95) {
        status = 'warning';
        alerts.push(`${serviceName}: Success rate below 95% (${successRate.toFixed(1)}%)`);
      }

      // Check for performance issues (arbitrary thresholds)
      if (avgDuration > 1000) { // Over 1 second
        status = status === 'critical' ? 'critical' : 'warning';
        alerts.push(`${serviceName}: Average duration too high (${avgDuration.toFixed(0)}ms)`);
      }

      services[serviceName] = {
        status,
        successRate,
        averageDuration: avgDuration,
        ...(lastError && { lastError }),
        ...(lastErrorTime && { lastErrorTime })
      };
    }

    // Overall status
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (Object.values(services).some(s => s.status === 'critical')) {
      overall = 'critical';
    } else if (Object.values(services).some(s => s.status === 'warning')) {
      overall = 'warning';
    }

    return {
      overall,
      services,
      alerts,
      timestamp: Date.now()
    };
  }

  /**
   * Get historical metrics for trend analysis
   */
  public getHistoricalMetrics(hours: number = 24, intervalMinutes: number = 60): Array<{
    timestamp: number;
    totalValidations: number;
    successRate: number;
    averageDuration: number;
    errorCount: number;
  }> {
    const now = Date.now();
    const intervalMs = intervalMinutes * 60 * 1000;
    const totalIntervals = Math.floor((hours * 60 * 60 * 1000) / intervalMs);

    const historicalData = [];

    for (let i = totalIntervals; i >= 0; i--) {
      const intervalStart = now - (i * intervalMs);
      const intervalEnd = intervalStart + intervalMs;

      const intervalMetrics = this.metrics.filter(
        m => m.timestamp >= intervalStart && m.timestamp < intervalEnd
      );

      const totalValidations = intervalMetrics.length;
      const successfulValidations = intervalMetrics.filter(m => m.success).length;
      const successRate = totalValidations > 0 ? (successfulValidations / totalValidations) * 100 : 0;
      const durations = intervalMetrics.map(m => m.duration);
      const averageDuration = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;
      const errorCount = intervalMetrics.filter(m => !m.success).length;

      historicalData.push({
        timestamp: intervalStart,
        totalValidations,
        successRate,
        averageDuration,
        errorCount
      });
    }

    return historicalData;
  }

  /**
   * Get detailed error analysis
   */
  public getErrorAnalysis(hoursBack: number = 24): {
    topErrors: Array<{ errorType: string; count: number; percentage: number }>;
    errorTrends: Array<{ timestamp: number; errorCount: number }>;
    categoryDistribution: Record<string, number>;
  } {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    const errors = recentMetrics.filter(m => !m.success);
    const totalErrors = errors.length;

    // Top errors
    const errorCounts: Record<string, number> = {};
    for (const error of errors) {
      const errorType = error.errorType || 'unknown';
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    }

    const topErrors = Object.entries(errorCounts)
      .map(([errorType, count]) => ({
        errorType,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Error trends (hourly)
    const errorTrends = [];
    for (let hour = hoursBack; hour >= 0; hour--) {
      const hourStart = Date.now() - (hour * 60 * 60 * 1000);
      const hourEnd = hourStart + (60 * 60 * 1000);
      const hourErrors = errors.filter(e => e.timestamp >= hourStart && e.timestamp < hourEnd);

      errorTrends.push({
        timestamp: hourStart,
        errorCount: hourErrors.length
      });
    }

    // Category distribution
    const categoryDistribution: Record<string, number> = {};
    for (const error of errors) {
      const category = error.errorCategory || 'unknown';
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    }

    return {
      topErrors,
      errorTrends,
      categoryDistribution
    };
  }

  /**
   * Export metrics for external analysis
   */
  public exportMetrics(format: 'json' | 'csv' = 'json', hoursBack: number = 24): string {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    const metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (format === 'csv') {
      const headers = ['timestamp', 'service', 'operation', 'duration', 'success', 'errorType', 'errorCategory', 'metadata'];
      const rows = metrics.map(m => [
        m.timestamp,
        m.service,
        m.operation,
        m.duration,
        m.success,
        m.errorType || '',
        m.errorCategory || '',
        JSON.stringify(m.metadata || {})
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Clean up old metrics to prevent memory issues
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.retentionPeriod;
    const initialCount = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    const removedCount = initialCount - this.metrics.length;
    if (removedCount > 0) {
      logger.info('Cleaned up old validation metrics', {
        component: 'validation-metrics',
        removed: removedCount,
        remaining: this.metrics.length
      });
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  public reset(): void {
    this.metrics = [];
    logger.info('Validation metrics reset', { component: 'validation-metrics' });
  }
}

// Export singleton instance
export const validationMetricsCollector = ValidationMetricsCollector.getInstance();