/**
 * Performance Utilities Module
 *
 * Provides comprehensive utilities for performance monitoring, benchmarking,
 * and optimization tracking.
 *
 * This module consolidates performance-related utilities from performance-monitoring-utils.ts
 * and other sources into a unified, framework-agnostic interface.
 */

import { logger } from '../observability/logging';

// ==================== Type Definitions ====================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface ApiPerformanceMetric extends PerformanceMetric {
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  requestSize?: number;
  responseSize?: number;
}

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  timestamp: number;
}

export interface CpuUsage {
  user: number;
  system: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  responseTime: number; // ms
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  errorRate: number; // percentage
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  timestamp: number;
}

// ==================== Performance Monitoring ====================

/**
 * Performance monitor class for tracking metrics.
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: ApiPerformanceMetric[] = [];
  private memoryMetrics: MemoryUsage[] = [];
  private cpuMetrics: CpuUsage[] = [];
  private thresholds: PerformanceThresholds;

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = {
      responseTime: 1000, // 1 second
      memoryUsage: 512, // 512 MB
      cpuUsage: 80, // 80%
      errorRate: 5, // 5%
      ...thresholds
    };
  }

  /**
   * Tracks a generic performance metric.
   */
  trackMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      ...(tags && { tags }),
      ...(metadata && { metadata })
    };

    this.metrics.push(metric);

    // Check thresholds and log warnings
    this.checkThresholds(metric);

    logger.debug('Performance metric tracked', { metric });
  }

  /**
   * Tracks API performance metric.
   */
  trackApiMetric(
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    requestSize?: number,
    responseSize?: number,
    tags?: Record<string, string>
  ): void {
    const metric: ApiPerformanceMetric = {
      name: 'api_request',
      value: responseTime,
      unit: 'ms',
      timestamp: Date.now(),
      method,
      endpoint,
      statusCode,
      responseTime,
      ...(requestSize !== undefined && { requestSize }),
      ...(responseSize !== undefined && { responseSize }),
      ...(tags && { tags })
    };

    this.apiMetrics.push(metric);

    // Check for slow responses
    if (responseTime > this.thresholds.responseTime) {
      logger.warn('Slow API response detected', {
        component: 'performance',
        method,
        endpoint,
        responseTime,
        threshold: this.thresholds.responseTime
      });
    }

    logger.debug('API metric tracked', { metric });
  }

  /**
   * Tracks memory usage.
   */
  trackMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const memoryMetric: MemoryUsage = {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
        timestamp: Date.now()
      };

      this.memoryMetrics.push(memoryMetric);

      const heapUsedMB = memoryMetric.heapUsed / 1024 / 1024;
      if (heapUsedMB > this.thresholds.memoryUsage) {
        logger.warn('High memory usage detected', {
          component: 'performance',
          heapUsedMB,
          threshold: this.thresholds.memoryUsage
        });
      }
    }
  }

  /**
   * Tracks CPU usage.
   */
  trackCpuUsage(): void {
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      const cpuMetric: CpuUsage = {
        user: usage.user,
        system: usage.system,
        timestamp: Date.now()
      };

      this.cpuMetrics.push(cpuMetric);

      // Calculate CPU percentage (simplified)
      const totalUsage = (cpuMetric.user + cpuMetric.system) / 1000000; // Convert to seconds
      if (totalUsage > this.thresholds.cpuUsage) {
        logger.warn('High CPU usage detected', {
          component: 'performance',
          totalUsage,
          threshold: this.thresholds.cpuUsage
        });
      }
    }
  }

  /**
   * Gets all performance metrics.
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Gets API performance metrics.
   */
  getApiMetrics(): ApiPerformanceMetric[] {
    return [...this.apiMetrics];
  }

  /**
   * Gets memory usage metrics.
   */
  getMemoryMetrics(): MemoryUsage[] {
    return [...this.memoryMetrics];
  }

  /**
   * Gets CPU usage metrics.
   */
  getCpuMetrics(): CpuUsage[] {
    return [...this.cpuMetrics];
  }

  /**
   * Clears all metrics.
   */
  clearMetrics(): void {
    this.metrics = [];
    this.apiMetrics = [];
    this.memoryMetrics = [];
    this.cpuMetrics = [];
  }

  /**
   * Gets performance summary statistics.
   */
  getPerformanceSummary() {
    const apiMetrics = this.apiMetrics;
    const totalRequests = apiMetrics.length;

    if (totalRequests === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        errorRate: 0,
        statusCodes: {},
        slowRequests: 0
      };
    }

    const responseTimes = apiMetrics.map(m => m.responseTime);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    const errorRequests = apiMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;

    const slowRequests = apiMetrics.filter(m => m.responseTime > this.thresholds.responseTime).length;

    const statusCodes = apiMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalRequests,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      errorRate,
      statusCodes,
      slowRequests
    };
  }

  private checkThresholds(_metric: PerformanceMetric): void {
    // Implement threshold checking logic here
    // This could be extended based on specific metric types
  }
}

// ==================== Benchmarking ====================

/**
 * Runs a benchmark test for a function.
 */
export async function benchmark<T>(
  name: string,
  fn: () => Promise<T> | T,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  const times: number[] = [];
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const iterationStart = performance.now();
    await fn();
    const iterationEnd = performance.now();
    times.push(iterationEnd - iterationStart);
  }

  const totalTime = Date.now() - startTime;
  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  // Calculate standard deviation
  const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
  const standardDeviation = Math.sqrt(variance);

  const result: BenchmarkResult = {
    name,
    iterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    standardDeviation,
    timestamp: Date.now()
  };

  logger.info('Benchmark completed', { benchmark: result });

  return result;
}

/**
 * Performance timing decorator.
 */
export function timed(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        performanceMonitor.trackMetric(name, duration, 'ms');
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        performanceMonitor.trackMetric(`${name}_error`, duration, 'ms');
        throw error;
      }
    };

    return descriptor;
  };
}

// ==================== Memory Optimization ====================

/**
 * Forces garbage collection if available (only in development).
 */
export function forceGarbageCollection(): void {
  if (typeof global !== 'undefined' && (global as any).gc) {
    (global as any).gc();
    logger.debug('Forced garbage collection', { component: 'performance' });
  }
}

/**
 * Gets current memory usage in a readable format.
 */
export function getMemoryUsage(): { used: string; total: string; percentage: number } | null {
  if (typeof process === 'undefined' || !process.memoryUsage) {
    return null;
  }

  const usage = process.memoryUsage();
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const percentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);

  return {
    used: `${usedMB} MB`,
    total: `${totalMB} MB`,
    percentage
  };
}

// ==================== Global Instances ====================

/**
 * Global performance monitor instance.
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize monitoring system.
 */
export function initializeMonitoring(thresholds?: Partial<PerformanceThresholds>): PerformanceMonitor {
  const monitor = new PerformanceMonitor(thresholds);
  logger.info('Performance monitoring initialized', { component: 'performance' });
  return monitor;
}

/**
 * Track API metric (convenience function).
 */
export function trackApiMetric(
  method: string,
  endpoint: string,
  statusCode: number,
  responseTime: number,
  requestSize?: number,
  responseSize?: number,
  tags?: Record<string, string>
): void {
  performanceMonitor.trackApiMetric(method, endpoint, statusCode, responseTime, requestSize, responseSize, tags);
}

/**
 * Track generic metric (convenience function).
 */
export function trackMetric(
  name: string,
  value: number,
  unit: string,
  tags?: Record<string, string>,
  metadata?: Record<string, any>
): void {
  performanceMonitor.trackMetric(name, value, unit, tags, metadata);
}

/**
 * Get performance summary (convenience function).
 */
export function getPerformanceSummary() {
  return performanceMonitor.getPerformanceSummary();
}

// ==================== Utility Functions ====================

/**
 * Measures execution time of a function.
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T,
  name?: string
): Promise<{ result: T; executionTime: number }> {
  const start = performance.now();
  const result = await fn();
  const executionTime = performance.now() - start;

  if (name) {
    trackMetric(name, executionTime, 'ms');
  }

  return { result, executionTime };
}

/**
 * Creates a performance profile for a code block.
 */
export function createPerformanceProfile(name: string): { end: () => number } {
  const start = performance.now();

  return {
    end: () => {
      const duration = performance.now() - start;
      trackMetric(name, duration, 'ms');
      return duration;
    }
  };
}



