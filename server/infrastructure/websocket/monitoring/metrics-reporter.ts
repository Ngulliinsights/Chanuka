/**
 * Metrics Reporter for WebSocket Service
 * Generates and formats metrics reports for monitoring and logging
 */

import { IConnectionManager, IHealthChecker, IMetricsReporter, IOperationQueueManager,IStatisticsCollector, MetricsReport } from '../types';
import { logger } from '@server/infrastructure/observability';


/**
 * Report format options
 */
type ReportFormat = 'json' | 'prometheus' | 'csv' | 'human';

/**
 * Export options for metrics
 */
interface ExportOptions {
  format: ReportFormat;
  includeHistorical: boolean;
  timeWindow?: number; // milliseconds
  precision?: number; // decimal places for numbers
}

/**
 * Default export options
 */
const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'json',
  includeHistorical: false,
  precision: 2,
};

/**
 * MetricsReporter class for generating and exporting WebSocket service metrics
 * Integrates with existing logging system and provides multiple output formats
 */
export class MetricsReporter implements IMetricsReporter {
  private readonly statisticsCollector: IStatisticsCollector;
  private readonly healthChecker: IHealthChecker;
  private readonly queueManager: IOperationQueueManager;
  private readonly logger: ((message: string, level?: string) => void) | undefined;

  constructor(
    statisticsCollector: IStatisticsCollector,
    healthChecker: IHealthChecker,
    connectionManager: IConnectionManager,
    queueManager: IOperationQueueManager,
    logger?: (message: string, level?: string) => void
  ) {
    this.statisticsCollector = statisticsCollector;
    this.healthChecker = healthChecker;
    this.queueManager = queueManager;
    this.logger = logger;
  }

  /**
   * Generate a comprehensive metrics report
   * @returns Complete metrics report
   */
  generateReport(): MetricsReport {
    const timestamp = Date.now();
    const connectionStats = this.statisticsCollector.getMetrics();
    const performanceMetrics = this.statisticsCollector.getPerformanceMetrics();
    const healthStatus = this.healthChecker.getHealthStatus();
    const memoryUsage = process.memoryUsage();

    const uptime = timestamp - connectionStats.startTime;
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;


    // Use health status for additional metrics context
    const isHealthy = healthStatus.status === 'healthy';
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    return {
      timestamp,
      uptime,
      connections: connectionStats,
      memory: {
        usage: memoryUsagePercent,
        pressure: this.calculateMemoryPressure(memoryUsage),
        leaks: isHealthy ? 0 : 1, // Use health status to indicate potential leaks
      },
      performance: {
        averageLatency: performanceMetrics.averageLatency,
        throughput: performanceMetrics.throughput,
        errorRate: performanceMetrics.errorRate,
      },
      queues: {
        size: this.queueManager.getQueueSize(),
        overflows: connectionStats.queueOverflows,
        processed: connectionStats.totalMessages,
      },
    };
  }

  /**
   * Export metrics in the specified format
   * @param options Export options
   * @returns Formatted metrics data
   */
  exportMetrics(options: Partial<ExportOptions> = {}): Record<string, unknown> {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    const report = this.generateReport();

    switch (opts.format) {
      case 'json':
        return this.formatAsJson(report, opts);
      case 'prometheus':
        return this.formatAsPrometheus(report, opts);
      case 'csv':
        return this.formatAsCsv(report, opts);
      case 'human':
        return this.formatAsHuman(report, opts);
      default:
        throw new Error(`Unsupported format: ${opts.format}`);
    }
  }

  /**
   * Log metrics report using the configured logger
   * @param level Log level (default: 'info')
   * @param options Export options
   */
  logMetrics(level: string = 'info', options: Partial<ExportOptions> = {}): void {
    if (!this.logger) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('No logger configured for MetricsReporter');
      }
      return;
    }

    try {
      const metrics = this.exportMetrics({ ...options, format: 'human' });
      this.logger(metrics.report as string, level);
    } catch (error) {
      try {
        this.logger(`Failed to log metrics: ${error}`, 'error');
      } catch (logError) {
        // If logging the error also fails, just ignore it to prevent throwing
        if (process.env.NODE_ENV !== 'production') {
          logger.error('Failed to log metrics error:', logError);
        }
      }
    }
  }

  /**
   * Get real-time metrics summary
   * @returns Current metrics summary
   */
  getRealTimeMetrics(): {
    status: string;
    connections: number;
    throughput: number;
    latency: number;
    memoryUsage: number;
    queueSize: number;
    uptime: number;
  } {
    const report = this.generateReport();
    const healthStatus = this.healthChecker.getHealthStatus();

    return {
      status: healthStatus.status,
      connections: report.connections.activeConnections,
      throughput: report.performance.throughput,
      latency: report.performance.averageLatency,
      memoryUsage: report.memory.usage,
      queueSize: report.queues.size,
      uptime: report.uptime,
    };
  }

  /**
   * Format report as JSON
   * @param report Metrics report
   * @param options Export options
   * @returns JSON formatted data
   */
  private formatAsJson(report: MetricsReport, options: ExportOptions): Record<string, unknown> {
    const data: Record<string, unknown> = {
      ...report,
      healthStatus: this.healthChecker.getHealthStatus(),
    };

    if (options.includeHistorical && options.timeWindow) {
      const historicalData = this.statisticsCollector.getHistoricalData(options.timeWindow);
      data.historical = historicalData;
    }

    // Round numbers to specified precision
    if (options.precision !== undefined) {
      this.roundNumbers(data, options.precision);
    }

    return data;
  }

  /**
   * Format report as Prometheus metrics
   * @param report Metrics report
   * @param options Export options
   * @returns Prometheus formatted data
   */
  private formatAsPrometheus(report: MetricsReport, options: ExportOptions): Record<string, unknown> {
    const precision = options.precision || 2;
    const lines: string[] = [];

    // Connection metrics
    lines.push(`# HELP websocket_connections_total Total number of WebSocket connections`);
    lines.push(`# TYPE websocket_connections_total counter`);
    lines.push(`websocket_connections_total ${report.connections.totalConnections}`);

    lines.push(`# HELP websocket_connections_active Current number of active WebSocket connections`);
    lines.push(`# TYPE websocket_connections_active gauge`);
    lines.push(`websocket_connections_active ${report.connections.activeConnections}`);

    lines.push(`# HELP websocket_connections_peak Peak number of concurrent connections`);
    lines.push(`# TYPE websocket_connections_peak gauge`);
    lines.push(`websocket_connections_peak ${report.connections.peakConnections}`);

    // Message metrics
    lines.push(`# HELP websocket_messages_total Total number of messages processed`);
    lines.push(`# TYPE websocket_messages_total counter`);
    lines.push(`websocket_messages_total ${report.connections.totalMessages}`);

    lines.push(`# HELP websocket_messages_dropped_total Total number of dropped messages`);
    lines.push(`# TYPE websocket_messages_dropped_total counter`);
    lines.push(`websocket_messages_dropped_total ${report.connections.droppedMessages}`);

    lines.push(`# HELP websocket_broadcasts_total Total number of broadcast operations`);
    lines.push(`# TYPE websocket_broadcasts_total counter`);
    lines.push(`websocket_broadcasts_total ${report.connections.totalBroadcasts}`);

    // Performance metrics
    lines.push(`# HELP websocket_latency_average_ms Average message processing latency in milliseconds`);
    lines.push(`# TYPE websocket_latency_average_ms gauge`);
    lines.push(`websocket_latency_average_ms ${report.performance.averageLatency.toFixed(precision)}`);

    lines.push(`# HELP websocket_throughput_messages_per_second Current message throughput`);
    lines.push(`# TYPE websocket_throughput_messages_per_second gauge`);
    lines.push(`websocket_throughput_messages_per_second ${report.performance.throughput.toFixed(precision)}`);

    lines.push(`# HELP websocket_error_rate_percent Current error rate percentage`);
    lines.push(`# TYPE websocket_error_rate_percent gauge`);
    lines.push(`websocket_error_rate_percent ${report.performance.errorRate.toFixed(precision)}`);

    // Memory metrics
    lines.push(`# HELP websocket_memory_usage_percent Memory usage percentage`);
    lines.push(`# TYPE websocket_memory_usage_percent gauge`);
    lines.push(`websocket_memory_usage_percent ${report.memory.usage.toFixed(precision)}`);

    // Queue metrics
    lines.push(`# HELP websocket_queue_size Current queue size`);
    lines.push(`# TYPE websocket_queue_size gauge`);
    lines.push(`websocket_queue_size ${report.queues.size}`);

    lines.push(`# HELP websocket_queue_overflows_total Total number of queue overflows`);
    lines.push(`# TYPE websocket_queue_overflows_total counter`);
    lines.push(`websocket_queue_overflows_total ${report.connections.queueOverflows}`);

    // Uptime
    lines.push(`# HELP websocket_uptime_seconds Service uptime in seconds`);
    lines.push(`# TYPE websocket_uptime_seconds gauge`);
    lines.push(`websocket_uptime_seconds ${Math.floor(report.uptime / 1000)}`);

    return { metrics: lines.join('\n') };
  }

  /**
   * Format report as CSV
   * @param report Metrics report
   * @param options Export options
   * @returns CSV formatted data
   */
  private formatAsCsv(report: MetricsReport, options: ExportOptions): Record<string, unknown> {
    const precision = options.precision || 2;
    const headers = [
      'timestamp',
      'uptime_ms',
      'active_connections',
      'total_connections',
      'peak_connections',
      'total_messages',
      'total_broadcasts',
      'dropped_messages',
      'duplicate_messages',
      'queue_overflows',
      'reconnections',
      'average_latency_ms',
      'throughput_msg_per_sec',
      'error_rate_percent',
      'memory_usage_percent',
      'queue_size',
    ];

    const values = [
      report.timestamp,
      report.uptime,
      report.connections.activeConnections,
      report.connections.totalConnections,
      report.connections.peakConnections,
      report.connections.totalMessages,
      report.connections.totalBroadcasts,
      report.connections.droppedMessages,
      report.connections.duplicateMessages,
      report.connections.queueOverflows,
      report.connections.reconnections,
      report.performance.averageLatency.toFixed(precision),
      report.performance.throughput.toFixed(precision),
      report.performance.errorRate.toFixed(precision),
      report.memory.usage.toFixed(precision),
      report.queues.size,
    ];

    return {
      headers: headers.join(','),
      values: values.join(','),
      csv: `${headers.join(',')}\n${values.join(',')}`,
    };
  }

  /**
   * Format report as human-readable text
   * @param report Metrics report
   * @param options Export options
   * @returns Human-readable formatted data
   */
  private formatAsHuman(report: MetricsReport, options: ExportOptions): Record<string, unknown> {
    const precision = options.precision || 2;
    const healthStatus = this.healthChecker.getHealthStatus();
    const uptimeHours = (report.uptime / (1000 * 60 * 60)).toFixed(1);

    const lines = [
      '=== WebSocket Service Metrics Report ===',
      `Timestamp: ${new Date(report.timestamp).toISOString()}`,
      `Status: ${healthStatus.status.toUpperCase()}`,
      `Uptime: ${uptimeHours} hours`,
      '',
      '--- Connection Statistics ---',
      `Active Connections: ${report.connections.activeConnections}`,
      `Total Connections: ${report.connections.totalConnections}`,
      `Peak Connections: ${report.connections.peakConnections}`,
      `Reconnections: ${report.connections.reconnections}`,
      '',
      '--- Message Statistics ---',
      `Total Messages: ${report.connections.totalMessages}`,
      `Total Broadcasts: ${report.connections.totalBroadcasts}`,
      `Dropped Messages: ${report.connections.droppedMessages}`,
      `Duplicate Messages: ${report.connections.duplicateMessages}`,
      '',
      '--- Performance Metrics ---',
      `Average Latency: ${report.performance.averageLatency.toFixed(precision)}ms`,
      `Throughput: ${report.performance.throughput.toFixed(precision)} msg/sec`,
      `Error Rate: ${report.performance.errorRate.toFixed(precision)}%`,
      '',
      '--- Memory Usage ---',
      `Memory Usage: ${report.memory.usage.toFixed(precision)}%`,
      `Memory Pressure: ${report.memory.pressure.toFixed(precision)}`,
      '',
      '--- Queue Status ---',
      `Queue Size: ${report.queues.size}`,
      `Queue Overflows: ${report.queues.overflows}`,
      `Messages Processed: ${report.queues.processed}`,
      '',
      '--- Health Checks ---',
      `Connections: ${healthStatus.checks.connections ? 'PASS' : 'FAIL'}`,
      `Memory: ${healthStatus.checks.memory ? 'PASS' : 'FAIL'}`,
      `Queues: ${healthStatus.checks.queues ? 'PASS' : 'FAIL'}`,
      `Performance: ${healthStatus.checks.performance ? 'PASS' : 'FAIL'}`,
    ];

    return { report: lines.join('\n') };
  }

  /**
   * Calculate memory pressure based on memory usage
   * @param memoryUsage Node.js memory usage object
   * @returns Memory pressure value (0-1)
   */
  private calculateMemoryPressure(memoryUsage: NodeJS.MemoryUsage): number {
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;
    const usageRatio = usedMemory / totalMemory;

    // Simple pressure calculation - could be enhanced with more sophisticated algorithms
    if (usageRatio < 0.7) return 0;
    if (usageRatio < 0.8) return 0.3;
    if (usageRatio < 0.9) return 0.6;
    return 1.0;
  }

  /**
   * Recursively round numbers in an object to specified precision
   * @param obj Object to process
   * @param precision Number of decimal places
   */
  // TODO: Replace 'any' with proper type definition
  private roundNumbers(obj: unknown, precision: number): void {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'number' && !Number.isInteger(value)) {
          obj[key] = Number(value.toFixed(precision));
        } else if (typeof value === 'object' && value !== null) {
          this.roundNumbers(value, precision);
        }
      }
    }
  }

  /**
   * Schedule periodic metrics reporting
   * @param intervalMs Reporting interval in milliseconds
   * @param level Log level for reports
   * @param options Export options
   * @returns Timer ID for cancellation
   */
  schedulePeriodicReporting(
    intervalMs: number,
    level: string = 'info',
    options: Partial<ExportOptions> = {}
  ): NodeJS.Timeout {
    return setInterval(() => {
      this.logMetrics(level, options);
    }, intervalMs);
  }

  /**
   * Generate alert-worthy metrics summary
   * @returns Metrics that might require attention
   */
  getAlertMetrics(): {
    alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      value: number;
      threshold: number;
    }>;
    summary: Record<string, unknown>;
  } {
    const report = this.generateReport();
    const healthStatus = this.healthChecker.getHealthStatus();
    const alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      value: number;
      threshold: number;
    }> = [];

    // Check for high error rate
    if (report.performance.errorRate > 5) {
      alerts.push({
        type: 'error_rate',
        severity: report.performance.errorRate > 10 ? 'high' : 'medium',
        message: `High error rate detected: ${report.performance.errorRate.toFixed(2)}%`,
        value: report.performance.errorRate,
        threshold: 5,
      });
    }

    // Check for high latency
    if (report.performance.averageLatency > 1000) {
      alerts.push({
        type: 'latency',
        severity: report.performance.averageLatency > 5000 ? 'critical' : 'high',
        message: `High latency detected: ${report.performance.averageLatency.toFixed(2)}ms`,
        value: report.performance.averageLatency,
        threshold: 1000,
      });
    }

    // Check for high memory usage
    if (report.memory.usage > 85) {
      alerts.push({
        type: 'memory',
        severity: report.memory.usage > 95 ? 'critical' : 'high',
        message: `High memory usage: ${report.memory.usage.toFixed(2)}%`,
        value: report.memory.usage,
        threshold: 85,
      });
    }

    // Check for queue overflows
    if (report.connections.queueOverflows > 0) {
      alerts.push({
        type: 'queue_overflow',
        severity: 'medium',
        message: `Queue overflows detected: ${report.connections.queueOverflows}`,
        value: report.connections.queueOverflows,
        threshold: 0,
      });
    }

    return {
      alerts,
      summary: {
        status: healthStatus.status,
        alertCount: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        timestamp: report.timestamp,
      },
    };
  }
}