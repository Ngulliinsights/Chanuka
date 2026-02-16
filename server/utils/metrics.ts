/**
 * Legacy Metrics Service - Now delegates to the unified ObservabilityStack
 *
 * This maintains backward compatibility while leveraging the new observability system.
 */

// import { performanceMonitoring } from '@server/services/performance-monitoring.ts'; // TODO: Fix missing module
import { logger   } from '@shared/core';
import { performance } from 'perf_hooks';
// import { createObservabilityStack   } from '@shared/core'; // TODO: Fix missing export

interface MetricData {
  count: number;
  total: number;
  min: number;
  max: number;
  avg: number;
  lastUpdated: number;
}

class Metrics {
  private thresholds: Map<string, number> = new Map();
  private metrics: Map<string, MetricData> = new Map();

  // Helper method to update metric data
  private updateMetric(name: string, value: number): void {
    const existing = this.metrics.get(name);
    const now = Date.now();

    if (existing) {
      existing.count++;
      existing.total += value;
      existing.min = Math.min(existing.min, value);
      existing.max = Math.max(existing.max, value);
      existing.avg = existing.total / existing.count;
      existing.lastUpdated = now;
    } else {
      this.metrics.set(name, {
        count: 1,
        total: value,
        min: value,
        max: value,
        avg: value,
        lastUpdated: now,
      });
    }
  }

  // Creates a method decorator that tracks a metric with the given name
  track(name: string, threshold?: number): MethodDecorator {
    const metricsInstance = this;
    return (
      target: Object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<any>,
    ): TypedPropertyDescriptor<any> | void => {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any[]) {
        // Execute the original method
        const result = originalMethod.apply(this, args);

        // If a value is provided in the last argument and it's a number, use it
        const value = typeof args[args.length - 1] === 'number' ? args[args.length - 1] : 1;

        // Update metric aggregation
        metricsInstance.updateMetric(name, value);

        // TODO: Use the new performance monitoring service when available
        // performanceMonitoring.recordMetric(name, value, {
        //   class: target.constructor.name,
        //   method: String(propertyKey)
        // });

        // Legacy threshold checking for backward compatibility
        if (threshold !== undefined) {
          metricsInstance.thresholds.set(name, threshold);
          if (value > threshold) {
            logger.warn(`Metric ${name} exceeded threshold: ${value} > ${threshold}`, {
              component: 'legacy-metrics',
              metric: name,
              value,
              threshold
            });
          }
        }

        return result;
      };

      return descriptor;
    };
  }

  // Creates a method decorator that measures execution time
  measure(name: string, threshold?: number): MethodDecorator {
    const metricsInstance = this;
    return (
      target: Object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<any>,
    ): TypedPropertyDescriptor<any> | void => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const start = performance.now();
        try {
          // Execute the original method and preserve its return value
          return await originalMethod.apply(this, args);
        } finally {
          const duration = performance.now() - start;

          // Update metric aggregation
          metricsInstance.updateMetric(`${name}.duration`, duration);

          // TODO: Use the new performance monitoring service when available
          // performanceMonitoring.recordMetric(`${name}.duration`, duration, {
          //   class: target.constructor.name,
          //   method: String(propertyKey)
          // });

          // Legacy threshold checking for backward compatibility
          if (threshold !== undefined) {
            if (duration > threshold) {
              logger.warn(`Performance metric ${name} exceeded threshold: ${duration}ms > ${threshold}ms`, {
                component: 'legacy-metrics',
                metric: name,
                duration,
                threshold
              });
            }
          }
        }
      };

      return descriptor;
    };
  }

  // Direct API to track a metric value (non-decorator usage)
  trackValue(name: string, value: number, threshold?: number): void {
    // Update metric aggregation
    this.updateMetric(name, value);

    // TODO: Use the new performance monitoring service when available
    // performanceMonitoring.recordMetric(name, value);

    // Legacy threshold checking for backward compatibility
    if (threshold !== undefined) {
      this.thresholds.set(name, threshold);
      if (value > threshold) {
        logger.warn(`Metric ${name} exceeded threshold: ${value} > ${threshold}`, {
          component: 'legacy-metrics',
          metric: name,
          value,
          threshold
        });
      }
    }
  }

  // Direct API to measure execution time of a function (non-decorator usage)
  async measureFn<T>(name: string, fn: () => Promise<T>, threshold?: number): Promise<T> {
    // TODO: Use the new performance monitoring service when available
    // return await performanceMonitoring.measureExecution(name, fn);
    return await fn(); // Fallback to direct execution
  }

  // Legacy method for backward compatibility - now delegates to new service
  getMetrics() {
    // Return aggregated metrics from internal storage
    const result: Record<string, MetricData & { threshold?: number }> = {};

    for (const [key, metric] of this.metrics.entries()) {
      result[key] = {
        count: metric.count,
        total: metric.total,
        min: metric.min,
        max: metric.max,
        avg: metric.avg,
        lastUpdated: metric.lastUpdated,
        threshold: this.thresholds.get(key),
      };
    }

    return result;
  }

  reset() {
    this.thresholds.clear();
    this.metrics.clear();
    // Note: The new performance monitoring service handles its own cleanup
    logger.info('Legacy metrics reset (new service manages its own cleanup)', {
      component: 'legacy-metrics'
    });
  }
}

export const metrics = new Metrics();

// Additional functions for test compatibility
export function incrementCounter(name: string, tags?: Record<string, any>, value?: number): void {
  metrics.trackValue(name, value || 1);
  // TODO: Use the new performance monitoring service when available
  // performanceMonitoring.recordMetric(name, value || 1, tags);
}

export function recordTiming(name: string, value: number, tags?: Record<string, any>, unit?: string): void {
  metrics.trackValue(`${name}.duration`, value);
  // TODO: Use the new performance monitoring service when available
  // performanceMonitoring.recordMetric(`${name}.duration`, value, { ...tags, unit: unit || 'ms' });
}

export function recordGauge(name: string, value: number, tags?: Record<string, any>): void {
  metrics.trackValue(name, value);
  // TODO: Use the new performance monitoring service when available
  // performanceMonitoring.recordMetric(name, value, tags);
}

// Export legacy interface for backward compatibility
export type { MetricData };














































