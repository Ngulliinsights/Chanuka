import {
  Metric,
  Counter,
  Gauge,
  Histogram,
  Summary,
  AnyMetric,
  MetricsRegistry,
  MetricValue,
  DEFAULT_CONFIG,
} from './types';

// ==================== Metric Implementations ====================

/**
 * Counter metric implementation
 */
export class CounterMetric implements Counter {
  public readonly type = 'counter' as const;
  public values: MetricValue[] = [];

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labels: Record<string, string> = {}
  ) {}

  increment(value: number = 1, labels: Record<string, string> = {}): void {
    if (value < 0) {
      throw new Error('Counter cannot be decremented');
    }

    const combinedLabels = { ...this.labels, ...labels };
    const existingIndex = this.findValueIndex(combinedLabels);

    if (existingIndex >= 0) {
      this.values[existingIndex].value += value;
      this.values[existingIndex].timestamp = new Date();
    } else {
      this.values.push({
        value,
        timestamp: new Date(),
        labels: combinedLabels,
      });
    }
  }

  get(labels: Record<string, string> = {}): number {
    const combinedLabels = { ...this.labels, ...labels };
    const existingIndex = this.findValueIndex(combinedLabels);
    return existingIndex >= 0 ? this.values[existingIndex].value : 0;
  }

  private findValueIndex(labels: Record<string, string>): number {
    return this.values.findIndex(v =>
      JSON.stringify(v.labels || {}) === JSON.stringify(labels)
    );
  }
}

/**
 * Gauge metric implementation
 */
export class GaugeMetric implements Gauge {
  public readonly type = 'gauge' as const;
  public values: MetricValue[] = [];

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labels: Record<string, string> = {}
  ) {}

  set(value: number, labels: Record<string, string> = {}): void {
    const combinedLabels = { ...this.labels, ...labels };
    const existingIndex = this.findValueIndex(combinedLabels);

    if (existingIndex >= 0) {
      this.values[existingIndex].value = value;
      this.values[existingIndex].timestamp = new Date();
    } else {
      this.values.push({
        value,
        timestamp: new Date(),
        labels: combinedLabels,
      });
    }
  }

  increment(value: number = 1, labels: Record<string, string> = {}): void {
    const combinedLabels = { ...this.labels, ...labels };
    const existingIndex = this.findValueIndex(combinedLabels);

    if (existingIndex >= 0) {
      this.values[existingIndex].value += value;
      this.values[existingIndex].timestamp = new Date();
    } else {
      this.values.push({
        value,
        timestamp: new Date(),
        labels: combinedLabels,
      });
    }
  }

  decrement(value: number = 1, labels: Record<string, string> = {}): void {
    this.increment(-value, labels);
  }

  get(labels: Record<string, string> = {}): number {
    const combinedLabels = { ...this.labels, ...labels };
    const existingIndex = this.findValueIndex(combinedLabels);
    return existingIndex >= 0 ? this.values[existingIndex].value : 0;
  }

  private findValueIndex(labels: Record<string, string>): number {
    return this.values.findIndex(v =>
      JSON.stringify(v.labels || {}) === JSON.stringify(labels)
    );
  }
}

/**
 * Histogram metric implementation
 */
export class HistogramMetric implements Histogram {
  public readonly type = 'histogram' as const;
  public values: MetricValue[] = [];
  public readonly buckets: number[];

  private observations: number[] = [];
  private sums: Record<string, number> = {};
  private counts: Record<string, number> = {};
  private bucketCounts: Record<string, Record<string, number>> = {};

  constructor(
    public readonly name: string,
    public readonly help: string,
    buckets: readonly number[] = DEFAULT_CONFIG.HISTOGRAM_BUCKETS,
    public readonly labels: Record<string, string> = {}
  ) {
    this.buckets = [...buckets].sort((a, b) => a - b);
  }

  observe(value: number, labels: Record<string, string> = {}): void {
    const combinedLabels = { ...this.labels, ...labels };
    const labelKey = JSON.stringify(combinedLabels);

    // Update observations
    this.observations.push(value);

    // Update sum and count
    this.sums[labelKey] = (this.sums[labelKey] || 0) + value;
    this.counts[labelKey] = (this.counts[labelKey] || 0) + 1;

    // Update bucket counts
    if (!this.bucketCounts[labelKey]) {
      this.bucketCounts[labelKey] = {};
    }

    for (const bucket of this.buckets) {
      const bucketKey = bucket.toString();
      if (value <= bucket) {
        this.bucketCounts[labelKey][bucketKey] =
          (this.bucketCounts[labelKey][bucketKey] || 0) + 1;
      }
    }

    // Add +Inf bucket
    this.bucketCounts[labelKey]['+Inf'] =
      (this.bucketCounts[labelKey]['+Inf'] || 0) + 1;

    // Update metric value
    const existingIndex = this.findValueIndex(combinedLabels);
    if (existingIndex >= 0) {
      this.values[existingIndex].value = this.counts[labelKey];
      this.values[existingIndex].timestamp = new Date();
    } else {
      this.values.push({
        value: this.counts[labelKey],
        timestamp: new Date(),
        labels: combinedLabels,
      });
    }
  }

  getBuckets(labels: Record<string, string> = {}): Record<string, number> {
    const combinedLabels = { ...this.labels, ...labels };
    const labelKey = JSON.stringify(combinedLabels);
    return this.bucketCounts[labelKey] || {};
  }

  getSum(labels: Record<string, string> = {}): number {
    const combinedLabels = { ...this.labels, ...labels };
    const labelKey = JSON.stringify(combinedLabels);
    return this.sums[labelKey] || 0;
  }

  getCount(labels: Record<string, string> = {}): number {
    const combinedLabels = { ...this.labels, ...labels };
    const labelKey = JSON.stringify(combinedLabels);
    return this.counts[labelKey] || 0;
  }

  private findValueIndex(labels: Record<string, string>): number {
    return this.values.findIndex(v =>
      JSON.stringify(v.labels || {}) === JSON.stringify(labels)
    );
  }
}

/**
 * Summary metric implementation
 */
export class SummaryMetric implements Summary {
  public readonly type = 'summary' as const;
  public values: MetricValue[] = [];
  public readonly quantiles: number[];

  private observations: number[] = [];
  private sums: Record<string, number> = {};
  private counts: Record<string, number> = {};
  private quantileValues: Record<string, Record<string, number>> = {};

  constructor(
    public readonly name: string,
    public readonly help: string,
    quantiles: readonly number[] = DEFAULT_CONFIG.SUMMARY_QUANTILES,
    public readonly labels: Record<string, string> = {}
  ) {
    this.quantiles = [...quantiles].sort((a, b) => a - b);
  }

  observe(value: number, labels: Record<string, string> = {}): void {
    const combinedLabels = { ...this.labels, ...labels };
    const labelKey = JSON.stringify(combinedLabels);

    // Update observations
    this.observations.push(value);

    // Update sum and count
    this.sums[labelKey] = (this.sums[labelKey] || 0) + value;
    this.counts[labelKey] = (this.counts[labelKey] || 0) + 1;

    // Calculate quantiles
    this.quantileValues[labelKey] = this.calculateQuantiles();

    // Update metric value
    const existingIndex = this.findValueIndex(combinedLabels);
    if (existingIndex >= 0) {
      this.values[existingIndex].value = this.counts[labelKey];
      this.values[existingIndex].timestamp = new Date();
    } else {
      this.values.push({
        value: this.counts[labelKey],
        timestamp: new Date(),
        labels: combinedLabels,
      });
    }
  }

  getQuantiles(labels: Record<string, string> = {}): Record<string, number> {
    const combinedLabels = { ...this.labels, ...labels };
    const labelKey = JSON.stringify(combinedLabels);
    return this.quantileValues[labelKey] || {};
  }

  getSum(labels: Record<string, string> = {}): number {
    const combinedLabels = { ...this.labels, ...labels };
    const labelKey = JSON.stringify(combinedLabels);
    return this.sums[labelKey] || 0;
  }

  getCount(labels: Record<string, string> = {}): number {
    const combinedLabels = { ...this.labels, ...labels };
    const labelKey = JSON.stringify(combinedLabels);
    return this.counts[labelKey] || 0;
  }

  private calculateQuantiles(): Record<string, number> {
    if (this.observations.length === 0) return {};

    const sorted = [...this.observations].sort((a, b) => a - b);
    const result: Record<string, number> = {};

    for (const quantile of this.quantiles) {
      const index = Math.ceil(sorted.length * quantile) - 1;
      const idx = Math.max(0, Math.min(index, sorted.length - 1));
      result[quantile.toString()] = sorted[idx];
    }

    return result;
  }

  private findValueIndex(labels: Record<string, string>): number {
    return this.values.findIndex(v =>
      JSON.stringify(v.labels || {}) === JSON.stringify(labels)
    );
  }
}

// ==================== Metrics Registry ====================

/**
 * In-memory metrics registry
 */
export class InMemoryMetricsRegistry implements MetricsRegistry {
  private metrics = new Map<string, AnyMetric>();

  register(metric: AnyMetric): void {
    if (this.metrics.has(metric.name)) {
      throw new Error(`Metric '${metric.name}' is already registered`);
    }
    this.metrics.set(metric.name, metric);
  }

  unregister(name: string): boolean {
    return this.metrics.delete(name);
  }

  get(name: string): AnyMetric | undefined {
    return this.metrics.get(name);
  }

  list(): AnyMetric[] {
    return Array.from(this.metrics.values());
  }

  clear(): void {
    this.metrics.clear();
  }

  collect(): Metric[] {
    return this.list().map(metric => ({
      name: metric.name,
      help: metric.help,
      type: metric.type,
      values: metric.values,
      labels: metric.labels,
    }));
  }
}

// ==================== Factory Functions ====================

export function createCounter(
  name: string,
  help: string,
  labels: Record<string, string> = {}
): Counter {
  return new CounterMetric(name, help, labels);
}

export function createGauge(
  name: string,
  help: string,
  labels: Record<string, string> = {}
): Gauge {
  return new GaugeMetric(name, help, labels);
}

export function createHistogram(
  name: string,
  help: string,
  buckets: readonly number[] = DEFAULT_CONFIG.HISTOGRAM_BUCKETS,
  labels: Record<string, string> = {}
): Histogram {
  return new HistogramMetric(name, help, buckets, labels);
}

export function createSummary(
  name: string,
  help: string,
  quantiles: readonly number[] = DEFAULT_CONFIG.SUMMARY_QUANTILES,
  labels: Record<string, string> = {}
): Summary {
  return new SummaryMetric(name, help, quantiles, labels);
}

export function createRegistry(): MetricsRegistry {
  return new InMemoryMetricsRegistry();
}

// ==================== Default Registry ====================

export const defaultRegistry = createRegistry();





































