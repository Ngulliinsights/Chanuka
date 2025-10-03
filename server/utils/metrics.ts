import { performance } from 'perf_hooks';

interface MetricData {
  count: number;
  total: number;
  min: number;
  max: number;
  avg: number;
  lastUpdated: number;
}

class Metrics {
  private metrics: Map<string, MetricData> = new Map();
  private thresholds: Map<string, number> = new Map();

  // Internal method to update a metric
  private updateMetric(name: string, value: number, threshold?: number): void {
    const current = this.metrics.get(name) || {
      count: 0,
      total: 0,
      min: Infinity,
      max: -Infinity,
      avg: 0,
      lastUpdated: Date.now(),
    };

    current.count++;
    current.total += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    current.avg = current.total / current.count;
    current.lastUpdated = Date.now();

    this.metrics.set(name, current);

    if (threshold !== undefined) {
      this.thresholds.set(name, threshold);
      if (value > threshold) {
        console.warn(`Metric ${name} exceeded threshold: ${value} > ${threshold}`);
      }
    }
  }

  // Creates a method decorator that tracks a metric with the given name
  track(name: string, threshold?: number): MethodDecorator {
    return (
      target: Object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<any>,
    ): TypedPropertyDescriptor<any> | void => {
      const originalMethod = descriptor.value;

      descriptor.value = (...args: any[]) => {
        // Execute the original method
        const result = originalMethod.apply(this, args);

        // If a value is provided in the last argument and it's a number, use it
        const value = typeof args[args.length - 1] === 'number' ? args[args.length - 1] : 1;
        this.updateMetric(name, value, threshold);

        return result;
      };

      return descriptor;
    };
  }

  // Creates a method decorator that measures execution time
  measure(name: string, threshold?: number): MethodDecorator {
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
          // 'this' here refers to the instance where the decorated method is called
          // We need to use the metrics instance rather than 'this'
          metrics.updateMetric(name, duration, threshold);
        }
      };

      return descriptor;
    };
  }

  // Direct API to track a metric value (non-decorator usage)
  trackValue(name: string, value: number, threshold?: number): void {
    this.updateMetric(name, value, threshold);
  }

  // Direct API to measure execution time of a function (non-decorator usage)
  async measureFn<T>(name: string, fn: () => Promise<T>, threshold?: number): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.updateMetric(name, duration, threshold);
    }
  }

  getMetrics() {
    const result: Record<string, MetricData & { threshold?: number }> = {};
    for (const entry of Array.from(this.metrics.entries())) {
      const [key, value] = entry;
      result[key] = {
        ...value,
        threshold: this.thresholds.get(key),
      };
    }
    return result;
  }

  reset() {
    this.metrics.clear();
    this.thresholds.clear();
  }
}

export const metrics = new Metrics();
