/**
 * Performance Monitor
 *
 * Responsibility: collect, store, and report on application performance metrics.
 * All thresholds come from monitoring-policy. The class tracks operation spans
 * and system-level metrics; it does not emit logs about security or audit events.
 */

import { logger } from '../core/logger';
import {
  CPU_CRITICAL_PERCENT,
  CPU_WARN_PERCENT,
  CACHE_CRITICAL_HIT_RATE,
  CACHE_WARN_HIT_RATE,
  INTERVALS,
  MAX_METRICS_HISTORY,
  MAX_OPERATIONS_HISTORY,
  MEMORY_CRITICAL_BYTES,
  MEMORY_WARN_BYTES,
  OP_CRITICAL_THRESHOLD_MS,
  OP_WARNING_THRESHOLD_MS,
} from './monitoring-policy';
import type {
  OperationMetrics,
  PerformanceMetric,
  ServicePerformanceReport,
  SystemHealthMetrics,
} from '../core/types';

// ─── Performance Monitor ──────────────────────────────────────────────────────

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[]       = [];
  private operations: OperationMetrics[]     = [];
  private monitoringTimer?: NodeJS.Timeout;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.startSystemMonitoring();
  }

  // ─── Operation spans ────────────────────────────────────────────────────────

  startOperation(
    service: string,
    operation: string,
    metadata: Record<string, unknown> = {},
  ): string {
    const operationId = generateId('op');
    this.operations.push({
      operationId,
      service,
      operation,
      startTime: new Date(),
      success: false,
      metadata,
      resourceUsage: { memoryBefore: process.memoryUsage() },
    });
    this.trimHistory(this.operations, MAX_OPERATIONS_HISTORY);
    return operationId;
  }

  endOperation(
    operationId: string,
    success = true,
    errorMessage?: string,
    additionalMetadata: Record<string, unknown> = {},
  ): OperationMetrics | null {
    const op = this.operations.find((o) => o.operationId === operationId);
    if (!op) {
      logger.warn({ operationId }, 'Unknown operationId in endOperation');
      return null;
    }

    const endTime   = new Date();
    const duration  = endTime.getTime() - op.startTime.getTime();
    const memAfter  = process.memoryUsage();

    op.endTime    = endTime;
    op.duration   = duration;
    op.success    = success;
    op.errorMessage = errorMessage;
    op.metadata   = { ...op.metadata, ...additionalMetadata };
    op.resourceUsage.memoryAfter = memAfter;

    this.recordMetric({
      name:  `${op.service}.${op.operation}.duration`,
      value: duration,
      unit:  'ms',
      tags:  { service: op.service, operation: op.operation, success: String(success) },
      threshold: { warning: OP_WARNING_THRESHOLD_MS, critical: OP_CRITICAL_THRESHOLD_MS },
    });

    const memDelta = memAfter.heapUsed - op.resourceUsage.memoryBefore.heapUsed;
    this.recordMetric({
      name:  `${op.service}.${op.operation}.memory_delta`,
      value: memDelta,
      unit:  'bytes',
      tags:  { service: op.service, operation: op.operation },
    });

    this.checkOperationThresholds(op);
    return op;
  }

  // ─── Custom metrics ──────────────────────────────────────────────────────────

  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const full: PerformanceMetric = {
      id:        generateId('metric'),
      timestamp: new Date(),
      ...metric,
    };
    this.metrics.push(full);
    this.trimHistory(this.metrics, MAX_METRICS_HISTORY);
    if (metric.threshold) this.checkMetricThreshold(full);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  getServicePerformanceReport(
    service: string,
    timeframe: '1h' | '24h' | '7d' = '1h',
  ): ServicePerformanceReport {
    const cutoff = timeframeCutoff(timeframe);
    const ops    = this.operations.filter(
      (op) => op.service === service && op.startTime >= cutoff && op.endTime,
    );

    if (ops.length === 0) {
      return emptyReport(service, timeframe);
    }

    const durations = ops.map((op) => op.duration!).sort((a, b) => a - b);
    const avgResponseTime = durations.reduce((s, d) => s + d, 0) / durations.length;
    const errorCount      = ops.filter((op) => !op.success).length;
    const errorRate       = (errorCount / ops.length) * 100;
    const timeframeMin    = timeframeMinutes(timeframe);
    const throughput      = ops.length / timeframeMin;

    const grouped = new Map<string, OperationMetrics[]>();
    ops.forEach((op) => {
      if (!grouped.has(op.operation)) grouped.set(op.operation, []);
      grouped.get(op.operation)!.push(op);
    });

    return {
      service,
      timeframe,
      metrics: {
        averageResponseTime: Math.round(avgResponseTime),
        p95ResponseTime:     Math.round(percentile(durations, 95)),
        p99ResponseTime:     Math.round(percentile(durations, 99)),
        throughput:          Math.round(throughput * 100) / 100,
        errorRate:           Math.round(errorRate * 100) / 100,
        successRate:         Math.round((100 - errorRate) * 100) / 100,
      },
      operations: Array.from(grouped.entries()).map(([operation, list]) => ({
        operation,
        count:        list.length,
        averageTime:  list.reduce((s, op) => s + (op.duration ?? 0), 0) / list.length,
        errorCount:   list.filter((op) => !op.success).length,
      })),
      recommendations: buildRecommendations({
        averageResponseTime: avgResponseTime,
        p95ResponseTime:     percentile(durations, 95),
        errorRate,
        operations: Array.from(grouped.entries()).map(([op, list]) => ({
          operation: op,
          averageTime: list.reduce((s, o) => s + (o.duration ?? 0), 0) / list.length,
          errorCount:  list.filter((o) => !o.success).length,
        })),
      }),
    };
  }

  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    const mem      = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const [cacheStats, dbStats] = await Promise.all([
      this.getCacheStatistics(),
      this.getDatabaseStatistics(),
    ]);

    return {
      timestamp: new Date(),
      cpu: {
        usage:       calcCpuPercent(cpuUsage),
        loadAverage: process.platform !== 'win32'
          ? (require('os') as { loadavg(): number[] }).loadavg()
          : [0, 0, 0],
      },
      memory: {
        used:      mem.heapUsed,
        free:      mem.heapTotal - mem.heapUsed,
        total:     mem.heapTotal,
        heapUsed:  mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
      database: dbStats,
      cache:    cacheStats,
      network:  { inboundTraffic: 0, outboundTraffic: 0, activeConnections: 0 },
    };
  }

  getPerformanceAlerts(): Array<{
    id: string;
    severity: 'warning' | 'critical';
    message: string;
    timestamp: Date;
    metric: string;
    value: number;
    threshold: number;
  }> {
    const alerts = this.getRecentMetrics('5m')
      .filter((m) => m.threshold)
      .flatMap((m): Array<{
        id: string;
        severity: 'warning' | 'critical';
        message: string;
        timestamp: Date;
        metric: string;
        value: number;
        threshold: number;
      }> => {
        if (m.value >= m.threshold!.critical) {
          return [{
            id: generateId('alert'), severity: 'critical' as const,
            message: `Critical threshold exceeded for ${m.name}`,
            timestamp: m.timestamp, metric: m.name,
            value: m.value, threshold: m.threshold!.critical,
          }];
        }
        if (m.value >= m.threshold!.warning) {
          return [{
            id: generateId('alert'), severity: 'warning' as const,
            message: `Warning threshold exceeded for ${m.name}`,
            timestamp: m.timestamp, metric: m.name,
            value: m.value, threshold: m.threshold!.warning,
          }];
        }
        return [];
      });
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
  }

  // ─── System monitoring loop ───────────────────────────────────────────────────

  private startSystemMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        const health = await this.getSystemHealthMetrics();

        this.recordMetric({
          name:  'system.memory.heap_used',
          value: health.memory.heapUsed,
          unit:  'bytes',
          tags:  { type: 'system' },
          threshold: { warning: MEMORY_WARN_BYTES, critical: MEMORY_CRITICAL_BYTES },
        });

        this.recordMetric({
          name:  'system.cpu.usage',
          value: health.cpu.usage,
          unit:  'percent',
          tags:  { type: 'system' },
          threshold: { warning: CPU_WARN_PERCENT, critical: CPU_CRITICAL_PERCENT },
        });

        this.recordMetric({
          name:  'system.cache.hit_rate',
          value: health.cache.hitRate,
          unit:  'percent',
          tags:  { type: 'cache' },
          threshold: { warning: CACHE_WARN_HIT_RATE, critical: CACHE_CRITICAL_HIT_RATE },
        });
      } catch (err) {
        logger.error({
          error: err instanceof Error ? err.message : String(err),
        }, 'System monitoring loop error');
      }
    }, INTERVALS.SYSTEM_METRICS);
  }

  // ─── Threshold checks ────────────────────────────────────────────────────────

  private checkOperationThresholds(op: OperationMetrics): void {
    if ((op.duration ?? 0) > OP_CRITICAL_THRESHOLD_MS) {
      logger.warn({
        service: op.service, operation: op.operation,
        duration: op.duration, operationId: op.operationId,
      }, 'Slow operation detected');
    }
    if (!op.success) {
      logger.error({
        service: op.service, operation: op.operation,
        errorMessage: op.errorMessage, operationId: op.operationId,
      }, 'Operation failed');
    }
  }

  private checkMetricThreshold(metric: PerformanceMetric): void {
    if (!metric.threshold) return;

    if (metric.value >= metric.threshold.critical) {
      logger.error({
        metric: metric.name, value: metric.value,
        threshold: metric.threshold.critical, unit: metric.unit,
      }, 'Critical performance threshold exceeded');
    } else if (metric.value >= metric.threshold.warning) {
      logger.warn({
        metric: metric.name, value: metric.value,
        threshold: metric.threshold.warning, unit: metric.unit,
      }, 'Performance warning threshold exceeded');
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private getRecentMetrics(timeframe: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.timestamp >= timeframeCutoff(timeframe));
  }

  private trimHistory<T>(arr: T[], max: number): void {
    if (arr.length > max) arr.splice(0, arr.length - max);
  }

  private async getCacheStatistics() {
    return { hitRate: 85, missRate: 15, evictionRate: 2, memoryUsage: 128 * 1024 * 1024 };
  }

  private async getDatabaseStatistics() {
    return { connectionCount: 10, activeQueries: 2, averageQueryTime: 45, slowQueries: 1 };
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function timeframeCutoff(tf: string): Date {
  const ms = tf === '5m' ? 300_000 : tf === '24h' ? 86_400_000 : tf === '7d' ? 604_800_000 : 3_600_000;
  return new Date(Date.now() - ms);
}

function timeframeMinutes(tf: string): number {
  return tf === '24h' ? 1440 : tf === '7d' ? 10080 : 60;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))] ?? 0;
}

function calcCpuPercent(usage: NodeJS.CpuUsage): number {
  return Math.min(100, (usage.user + usage.system) / 1_000_000 * 100);
}

function emptyReport(service: string, timeframe: string): ServicePerformanceReport {
  return {
    service, timeframe,
    metrics: { averageResponseTime: 0, p95ResponseTime: 0, p99ResponseTime: 0, throughput: 0, errorRate: 0, successRate: 0 },
    operations: [],
    recommendations: ['No operations recorded in this timeframe'],
  };
}

function buildRecommendations(data: {
  averageResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  operations: Array<{ operation: string; averageTime: number; errorCount: number }>;
}): string[] {
  const recs: string[] = [];
  if (data.averageResponseTime > OP_WARNING_THRESHOLD_MS)
    recs.push('Average response time is high. Consider optimising queries and adding caching.');
  if (data.p95ResponseTime > OP_CRITICAL_THRESHOLD_MS)
    recs.push('P95 response time is concerning. Investigate slow operations.');
  if (data.errorRate > 5)
    recs.push('Error rate exceeds 5%. Review error logs and improve error handling.');
  const slow = data.operations.filter((op) => op.averageTime > OP_WARNING_THRESHOLD_MS * 2);
  if (slow.length) recs.push(`Slow operations: ${slow.map((o) => o.operation).join(', ')}.`);
  if (!recs.length) recs.push('Performance looks good. Continue monitoring.');
  return recs;
}

// ─── Singleton & convenience wrapper ─────────────────────────────────────────

export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Wrap an async function with automatic start/end performance tracking.
 * Replaces the previous Promise constructor anti-pattern.
 */
export async function monitorOperation<T>(
  service: string,
  operation: string,
  fn: () => Promise<T>,
  metadata: Record<string, unknown> = {},
): Promise<T> {
  const operationId = performanceMonitor.startOperation(service, operation, metadata);
  try {
    const result = await fn();
    performanceMonitor.endOperation(operationId, true, undefined, { resultType: typeof result });
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    performanceMonitor.endOperation(operationId, false, msg);
    throw err;
  }
}