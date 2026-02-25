/**
 * Cross-cutting concern: Metrics Service
 * Handles application-level metrics collection for user operations
 */

import { logger } from '@server/infrastructure/observability';

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

export interface OperationMetrics { operation: string;
  duration: number;
  success: boolean;
  user_id?: string;
  errorType?: string;
 }

export class MetricsService {
  private static instance: MetricsService;
  private metrics: MetricData[] = [];

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  recordOperationMetrics(metrics: OperationMetrics): void { const baseTags = {
      operation: metrics.operation,
      success: metrics.success.toString(),
      ...(metrics.user_id && { user_id: metrics.user_id  }),
      ...(metrics.errorType && { errorType: metrics.errorType })
    };

    // Record operation count
    this.recordMetric({
      name: 'user_operation_count',
      value: 1,
      tags: baseTags
    });

    // Record operation duration
    this.recordMetric({
      name: 'user_operation_duration',
      value: metrics.duration,
      tags: baseTags
    });

    // Record success/failure rates
    this.recordMetric({
      name: 'user_operation_success_rate',
      value: metrics.success ? 1 : 0,
      tags: { operation: metrics.operation }
    });
  }

  recordMetric(metric: MetricData): void {
    const metricData: MetricData = {
      ...metric,
      timestamp: metric.timestamp || Date.now()
    };

    // In a real implementation, this would send to a metrics system
    // For now, we'll store in memory and log
    this.metrics.push(metricData);

    logger.info(
      {
        metric: metricData.name,
        value: metricData.value,
        tags: metricData.tags,
        timestamp: new Date(metricData.timestamp || Date.now()).toISOString()
      },
      `METRIC: ${metricData.name} = ${metricData.value}`
    });
  }

  getMetricsSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {};

    // Group metrics by name
    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, MetricData[]>);

    // Calculate summaries
    for (const [name, metrics] of Object.entries(grouped)) {
      const values = metrics.map(m => m.value);
      summary[name] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    }

    return summary;
  }

  incrementCounter(name: string, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value: 1,
      tags
    });
  }

  recordTiming(name: string, duration: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value: duration,
      tags
    });
  }
}

// Convenience functions
export const recordOperationMetrics = MetricsService.getInstance().recordOperationMetrics.bind(MetricsService.getInstance());
export const recordMetric = MetricsService.getInstance().recordMetric.bind(MetricsService.getInstance());
export const incrementCounter = MetricsService.getInstance().incrementCounter.bind(MetricsService.getInstance());
export const recordTiming = MetricsService.getInstance().recordTiming.bind(MetricsService.getInstance());








































