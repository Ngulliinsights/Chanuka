// ============================================================================
// PERFORMANCE MONITORING SYSTEM
// ============================================================================
// Comprehensive performance monitoring, optimization, and alerting

import { logger } from '@shared/core/src/index.js';
import { cache } from '@shared/core/src/index.js';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface OperationMetrics {
  operationId: string;
  service: string;
  operation: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  metadata: Record<string, any>;
  resourceUsage: {
    memoryBefore: NodeJS.MemoryUsage;
    memoryAfter?: NodeJS.MemoryUsage;
    cpuTime?: number;
  };
}

export interface ServicePerformanceReport {
  service: string;
  timeframe: string;
  metrics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
    successRate: number;
  };
  operations: Array<{
    operation: string;
    count: number;
    averageTime: number;
    errorCount: number;
  }>;
  recommendations: string[];
}

export interface SystemHealthMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
  };
  database: {
    connectionCount: number;
    activeQueries: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
  };
  network: {
    inboundTraffic: number;
    outboundTraffic: number;
    activeConnections: number;
  };
}

/**
 * Performance Monitor
 * 
 * Provides comprehensive performance monitoring, metrics collection,
 * and optimization recommendations for the entire platform.
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private operations: OperationMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 10000;
  private readonly MAX_OPERATIONS_HISTORY = 5000;
  private readonly MONITORING_INTERVAL = 30000; // 30 seconds
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

  /**
   * Start monitoring an operation
   */
  startOperation(
    service: string,
    operation: string,
    metadata: Record<string, any> = {}
  ): string {
    const operationId = this.generateOperationId();
    const operationMetric: OperationMetrics = {
      operationId,
      service,
      operation,
      startTime: new Date(),
      success: false,
      metadata,
      resourceUsage: {
        memoryBefore: process.memoryUsage()
      }
    };

    this.operations.push(operationMetric);
    this.trimOperationsHistory();

    return operationId;
  }

  /**
   * End monitoring an operation
   */
  endOperation(
    operationId: string,
    success: boolean = true,
    errorMessage?: string,
    additionalMetadata: Record<string, any> = {}
  ): OperationMetrics | null {
    const operation = this.operations.find(op => op.operationId === operationId);
    if (!operation) {
      logger.warn('Operation not found for performance monitoring', { operationId });
      return null;
    }

    const endTime = new Date();
    const duration = endTime.getTime() - operation.startTime.getTime();
    const memoryAfter = process.memoryUsage();

    operation.endTime = endTime;
    operation.duration = duration;
    operation.success = success;
    operation.errorMessage = errorMessage;
    operation.metadata = { ...operation.metadata, ...additionalMetadata };
    operation.resourceUsage.memoryAfter = memoryAfter;

    // Record performance metrics
    this.recordMetric({
      name: `${operation.service}.${operation.operation}.duration`,
      value: duration,
      unit: 'ms',
      tags: {
        service: operation.service,
        operation: operation.operation,
        success: success.toString()
      },
      threshold: {
        warning: 1000, // 1 second
        critical: 5000  // 5 seconds
      }
    });

    // Record memory usage
    const memoryDelta = memoryAfter.heapUsed - operation.resourceUsage.memoryBefore.heapUsed;
    this.recordMetric({
      name: `${operation.service}.${operation.operation}.memory_delta`,
      value: memoryDelta,
      unit: 'bytes',
      tags: {
        service: operation.service,
        operation: operation.operation
      }
    });

    // Check for performance issues
    this.checkPerformanceThresholds(operation);

    return operation;
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const performanceMetric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: new Date(),
      ...metric
    };

    this.metrics.push(performanceMetric);
    this.trimMetricsHistory();

    // Check thresholds if defined
    if (metric.threshold) {
      this.checkMetricThreshold(performanceMetric);
    }
  }

  /**
   * Get performance report for a service
   */
  getServicePerformanceReport(
    service: string,
    timeframe: '1h' | '24h' | '7d' = '1h'
  ): ServicePerformanceReport {
    const cutoffTime = this.getTimeframeCutoff(timeframe);
    const serviceOperations = this.operations.filter(
      op => op.service === service && 
            op.startTime >= cutoffTime && 
            op.endTime
    );

    if (serviceOperations.length === 0) {
      return {
        service,
        timeframe,
        metrics: {
          averageResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          throughput: 0,
          errorRate: 0,
          successRate: 0
        },
        operations: [],
        recommendations: ['No operations recorded in this timeframe']
      };
    }

    // Calculate response time metrics
    const durations = serviceOperations
      .map(op => op.duration!)
      .sort((a, b) => a - b);

    const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p95ResponseTime = durations[Math.floor(durations.length * 0.95)];
    const p99ResponseTime = durations[Math.floor(durations.length * 0.99)];

    // Calculate throughput (operations per minute)
    const timeframeMinutes = this.getTimeframeMinutes(timeframe);
    const throughput = serviceOperations.length / timeframeMinutes;

    // Calculate error rate
    const errorCount = serviceOperations.filter(op => !op.success).length;
    const errorRate = (errorCount / serviceOperations.length) * 100;
    const successRate = 100 - errorRate;

    // Group operations by type
    const operationGroups = new Map<string, OperationMetrics[]>();
    serviceOperations.forEach(op => {
      if (!operationGroups.has(op.operation)) {
        operationGroups.set(op.operation, []);
      }
      operationGroups.get(op.operation)!.push(op);
    });

    const operations = Array.from(operationGroups.entries()).map(([operation, ops]) => ({
      operation,
      count: ops.length,
      averageTime: ops.reduce((sum, op) => sum + (op.duration || 0), 0) / ops.length,
      errorCount: ops.filter(op => !op.success).length
    }));

    // Generate recommendations
    const recommendations = this.generatePerformanceRecommendations({
      service,
      averageResponseTime,
      p95ResponseTime,
      errorRate,
      operations
    });

    return {
      service,
      timeframe,
      metrics: {
        averageResponseTime: Math.round(averageResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        p99ResponseTime: Math.round(p99ResponseTime),
        throughput: Math.round(throughput * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        successRate: Math.round(successRate * 100) / 100
      },
      operations,
      recommendations
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Get cache statistics
    const cacheStats = await this.getCacheStatistics();
    
    // Get database statistics (would be implemented with actual DB monitoring)
    const dbStats = await this.getDatabaseStatistics();

    return {
      timestamp: new Date(),
      cpu: {
        usage: this.calculateCpuUsage(cpuUsage),
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
      },
      memory: {
        used: memoryUsage.heapUsed,
        free: memoryUsage.heapTotal - memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal
      },
      database: dbStats,
      cache: cacheStats,
      network: {
        inboundTraffic: 0, // Would be implemented with actual network monitoring
        outboundTraffic: 0,
        activeConnections: 0
      }
    };
  }

  /**
   * Get performance optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    impact: string;
    effort: string;
  }> {
    const recommendations = [];
    const recentMetrics = this.getRecentMetrics('1h');

    // Analyze response times
    const slowOperations = recentMetrics.filter(m => 
      m.name.includes('.duration') && m.value > 2000
    );

    if (slowOperations.length > 0) {
      recommendations.push({
        category: 'Performance',
        priority: 'high' as const,
        recommendation: 'Optimize slow operations identified in monitoring',
        impact: 'Improved user experience and reduced server load',
        effort: 'Medium - requires code optimization'
      });
    }

    // Analyze memory usage
    const memoryMetrics = recentMetrics.filter(m => m.name.includes('.memory_delta'));
    const highMemoryOps = memoryMetrics.filter(m => m.value > 50 * 1024 * 1024); // 50MB

    if (highMemoryOps.length > 0) {
      recommendations.push({
        category: 'Memory',
        priority: 'medium' as const,
        recommendation: 'Investigate high memory usage operations',
        impact: 'Reduced memory pressure and better scalability',
        effort: 'High - requires memory profiling and optimization'
      });
    }

    // Analyze error rates
    const errorMetrics = this.operations.filter(op => 
      !op.success && 
      op.startTime > new Date(Date.now() - 3600000) // Last hour
    );

    if (errorMetrics.length > this.operations.length * 0.05) { // > 5% error rate
      recommendations.push({
        category: 'Reliability',
        priority: 'high' as const,
        recommendation: 'Address high error rate in operations',
        impact: 'Improved system reliability and user satisfaction',
        effort: 'Medium - requires error analysis and fixes'
      });
    }

    // Analyze cache performance
    const cacheHitRate = this.calculateCacheHitRate();
    if (cacheHitRate < 0.8) { // Less than 80% hit rate
      recommendations.push({
        category: 'Caching',
        priority: 'medium' as const,
        recommendation: 'Improve cache hit rate by optimizing cache keys and TTL',
        impact: 'Reduced database load and faster response times',
        effort: 'Low - adjust cache configuration'
      });
    }

    return recommendations;
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts(): Array<{
    id: string;
    severity: 'warning' | 'critical';
    message: string;
    timestamp: Date;
    metric: string;
    value: number;
    threshold: number;
  }> {
    const alerts = [];
    const recentMetrics = this.getRecentMetrics('5m');

    for (const metric of recentMetrics) {
      if (metric.threshold) {
        if (metric.value >= metric.threshold.critical) {
          alerts.push({
            id: this.generateAlertId(),
            severity: 'critical' as const,
            message: `Critical threshold exceeded for ${metric.name}`,
            timestamp: metric.timestamp,
            metric: metric.name,
            value: metric.value,
            threshold: metric.threshold.critical
          });
        } else if (metric.value >= metric.threshold.warning) {
          alerts.push({
            id: this.generateAlertId(),
            severity: 'warning' as const,
            message: `Warning threshold exceeded for ${metric.name}`,
            timestamp: metric.timestamp,
            metric: metric.name,
            value: metric.value,
            threshold: metric.threshold.warning
          });
        }
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Start system-wide performance monitoring
   */
  private startSystemMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        const healthMetrics = await this.getSystemHealthMetrics();
        
        // Record system metrics
        this.recordMetric({
          name: 'system.memory.heap_used',
          value: healthMetrics.memory.heapUsed,
          unit: 'bytes',
          tags: { type: 'system' },
          threshold: {
            warning: 500 * 1024 * 1024, // 500MB
            critical: 1024 * 1024 * 1024 // 1GB
          }
        });

        this.recordMetric({
          name: 'system.cpu.usage',
          value: healthMetrics.cpu.usage,
          unit: 'percent',
          tags: { type: 'system' },
          threshold: {
            warning: 70,
            critical: 90
          }
        });

        this.recordMetric({
          name: 'system.cache.hit_rate',
          value: healthMetrics.cache.hitRate,
          unit: 'percent',
          tags: { type: 'cache' },
          threshold: {
            warning: 70, // Below 70% hit rate
            critical: 50  // Below 50% hit rate
          }
        });

      } catch (error) {
        logger.error('System monitoring failed', error);
      }
    }, this.MONITORING_INTERVAL);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
  }

  // Private helper methods

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trimMetricsHistory(): void {
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  private trimOperationsHistory(): void {
    if (this.operations.length > this.MAX_OPERATIONS_HISTORY) {
      this.operations = this.operations.slice(-this.MAX_OPERATIONS_HISTORY);
    }
  }

  private getTimeframeCutoff(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 3600000);
      case '24h':
        return new Date(now.getTime() - 86400000);
      case '7d':
        return new Date(now.getTime() - 604800000);
      default:
        return new Date(now.getTime() - 3600000);
    }
  }

  private getTimeframeMinutes(timeframe: string): number {
    switch (timeframe) {
      case '1h':
        return 60;
      case '24h':
        return 1440;
      case '7d':
        return 10080;
      default:
        return 60;
    }
  }

  private getRecentMetrics(timeframe: string): PerformanceMetric[] {
    const cutoff = this.getTimeframeCutoff(timeframe);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  private checkPerformanceThresholds(operation: OperationMetrics): void {
    if (operation.duration && operation.duration > 5000) { // 5 seconds
      logger.warn('Slow operation detected', {
        service: operation.service,
        operation: operation.operation,
        duration: operation.duration,
        operationId: operation.operationId
      });
    }

    if (!operation.success) {
      logger.error('Operation failed', {
        service: operation.service,
        operation: operation.operation,
        errorMessage: operation.errorMessage,
        operationId: operation.operationId
      });
    }
  }

  private checkMetricThreshold(metric: PerformanceMetric): void {
    if (!metric.threshold) return;

    if (metric.value >= metric.threshold.critical) {
      logger.error('Critical performance threshold exceeded', {
        metric: metric.name,
        value: metric.value,
        threshold: metric.threshold.critical,
        unit: metric.unit,
        tags: Object.entries(metric.tags).map(([key, value]) => `${key}:${value}`)
      });
    } else if (metric.value >= metric.threshold.warning) {
      logger.warn('Performance warning threshold exceeded', {
        metric: metric.name,
        value: metric.value,
        threshold: metric.threshold.warning,
        unit: metric.unit,
        tags: Object.entries(metric.tags).map(([key, value]) => `${key}:${value}`)
      });
    }
  }

  private generatePerformanceRecommendations(data: {
    service: string;
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    operations: Array<{ operation: string; averageTime: number; errorCount: number }>;
  }): string[] {
    const recommendations = [];

    if (data.averageResponseTime > 1000) {
      recommendations.push('Average response time is high. Consider optimizing database queries and adding caching.');
    }

    if (data.p95ResponseTime > 3000) {
      recommendations.push('95th percentile response time is concerning. Investigate slow operations and optimize bottlenecks.');
    }

    if (data.errorRate > 5) {
      recommendations.push('Error rate is above acceptable threshold. Review error logs and implement better error handling.');
    }

    const slowOperations = data.operations.filter(op => op.averageTime > 2000);
    if (slowOperations.length > 0) {
      recommendations.push(`Slow operations detected: ${slowOperations.map(op => op.operation).join(', ')}. Consider optimization.`);
    }

    const errorProneOperations = data.operations.filter(op => op.errorCount > 0);
    if (errorProneOperations.length > 0) {
      recommendations.push(`Operations with errors: ${errorProneOperations.map(op => op.operation).join(', ')}. Review and fix issues.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! Continue monitoring for any changes.');
    }

    return recommendations;
  }

  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU usage calculation
    return Math.min(100, (cpuUsage.user + cpuUsage.system) / 1000000 * 100);
  }

  private async getCacheStatistics(): Promise<{
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
  }> {
    // This would integrate with actual cache implementation
    return {
      hitRate: 85, // 85% hit rate
      missRate: 15, // 15% miss rate
      evictionRate: 2, // 2% eviction rate
      memoryUsage: 128 * 1024 * 1024 // 128MB
    };
  }

  private async getDatabaseStatistics(): Promise<{
    connectionCount: number;
    activeQueries: number;
    averageQueryTime: number;
    slowQueries: number;
  }> {
    // This would integrate with actual database monitoring
    return {
      connectionCount: 10,
      activeQueries: 2,
      averageQueryTime: 45, // 45ms
      slowQueries: 1
    };
  }

  private calculateCacheHitRate(): number {
    // This would calculate actual cache hit rate
    return 0.85; // 85% hit rate
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience function for operation monitoring
export function monitorOperation<T>(
  service: string,
  operation: string,
  fn: () => Promise<T>,
  metadata: Record<string, any> = {}
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const operationId = performanceMonitor.startOperation(service, operation, metadata);
    
    try {
      const result = await fn();
      performanceMonitor.endOperation(operationId, true, undefined, { resultType: typeof result });
      resolve(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      performanceMonitor.endOperation(operationId, false, errorMessage);
      reject(error);
    }
  });
}