/**
 * Unified Performance Utilities
 * 
 * Consolidates performance monitoring utilities from server/utils/performance-monitoring-utils.ts
 */

import { logger } from '../../observability/logging';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

interface ApiMetric extends PerformanceMetric {
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: ApiMetric[] = [];

  /**
   * Track a generic performance metric
   */
  trackMetric(name: string, value: number, unit: string, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);
    logger.debug('Performance metric tracked', { metric });
  }

  /**
   * Track API performance metric
   */
  trackApiMetric(method: string, endpoint: string, statusCode: number, responseTime: number, tags?: Record<string, string>) {
    const metric: ApiMetric = {
      name: 'api_request',
      value: responseTime,
      unit: 'ms',
      timestamp: Date.now(),
      method,
      endpoint,
      statusCode,
      responseTime,
      tags
    };

    this.apiMetrics.push(metric);
    logger.debug('API metric tracked', { metric });
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get API metrics
   */
  getApiMetrics(): ApiMetric[] {
    return [...this.apiMetrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.apiMetrics = [];
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const apiMetrics = this.apiMetrics;
    const totalRequests = apiMetrics.length;
    const avgResponseTime = totalRequests > 0 
      ? apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests 
      : 0;
    
    const statusCodes = apiMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalRequests,
      avgResponseTime,
      statusCodes,
      metricsCount: this.metrics.length
    };
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize monitoring system
 */
export function initializeMonitoring() {
  logger.info('Performance monitoring initialized', { component: 'performance' });
  return performanceMonitor;
}

/**
 * Track API metric
 */
export function trackApiMetric(method: string, endpoint: string, statusCode: number, responseTime: number, tags?: Record<string, string>) {
  performanceMonitor.trackApiMetric(method, endpoint, statusCode, responseTime, tags);
}

/**
 * Track generic metric
 */
export function trackMetric(name: string, value: number, unit: string, tags?: Record<string, string>) {
  performanceMonitor.trackMetric(name, value, unit, tags);
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  return performanceMonitor.getMetricsSummary();
}

/**
 * Performance timing decorator
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
        trackMetric(name, duration, 'ms');
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        trackMetric(`${name}_error`, duration, 'ms');
        throw error;
      }
    };

    return descriptor;
  };
}

export { PerformanceMonitor, performanceMonitor };
export type { PerformanceMetric, ApiMetric };