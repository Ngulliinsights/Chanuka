import {
  Counter,
  Gauge,
  Histogram,
  Summary,
  AnyMetric,
  MetricValue,
  DEFAULT_CONFIG,
  MetricType,
} from './types';
import { Result, Ok, Err } from '../../primitives/types/result';
import { AsyncCorrelationManager } from '../stack';

// ==================== Enhanced Metric Implementations ====================

/**
 * Enhanced counter with atomic operations, correlation ID tagging, and Result error handling
 */
export class AtomicCounter implements Counter {
  public readonly type = 'counter' as const;
  public values: MetricValue[] = [];
  private _value = 0;
  private readonly mutex = new Mutex();

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labels: Record<string, string> = {}
  ) {}

  async increment(value: number = 1, labels: Record<string, string> = {}): Promise<Result<void, Error>> {
    if (value < 0) {
      return new Err(Error('Counter cannot be decremented'));
    }

    return this.mutex.withLock(async () => {
      try {
        this._value += value;
        const combinedLabels = { ...this.labels, ...labels };

        // Add correlation ID if available
        const correlationId = this.getCorrelationId();
        if (correlationId) {
          combinedLabels.correlation_id = correlationId;
        }

        const existingIndex = this.findValueIndex(combinedLabels);

        if (existingIndex >= 0) {
          this.values[existingIndex].value = this._value;
          this.values[existingIndex].timestamp = new Date();
        } else {
          this.values.push({
            value: this._value,
            timestamp: new Date(),
            labels: combinedLabels,
          });
        }

        return new Ok(undefined);
      } catch (error) {
        return new Err(error as Error);
      }
    });
  }

  get(labels: Record<string, string> = {}): number {
    const combinedLabels = { ...this.labels, ...labels };
    return this._value;
  }

  private findValueIndex(labels: Record<string, string>): number {
    return this.values.findIndex(v =>
      JSON.stringify(v.labels || {}) === JSON.stringify(labels)
    );
  }

  private getCorrelationId(): string | undefined {
    // This would be injected from the observability stack
    return process.env.CORRELATION_ID;
  }
}

/**
 * Enhanced gauge with atomic operations and correlation ID tagging
 */
export class AtomicGauge implements Gauge {
  public readonly type = 'gauge' as const;
  public values: MetricValue[] = [];
  private _value = 0;
  private readonly mutex = new Mutex();

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labels: Record<string, string> = {}
  ) {}

  async set(value: number, labels: Record<string, string> = {}): Promise<Result<void, Error>> {
    return this.mutex.withLock(async () => {
      try {
        this._value = value;
        const combinedLabels = { ...this.labels, ...labels, ...(this.getCorrelationId() ? { correlation_id: this.getCorrelationId()! } : {}) };

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

        return new Ok(undefined);
      } catch (error) {
        return new Err(error as Error);
      }
    });
  }

  async increment(value: number = 1, labels: Record<string, string> = {}): Promise<Result<void, Error>> {
    return this.mutex.withLock(async () => {
      try {
        this._value += value;
        const combinedLabels = { ...this.labels, ...labels, ...(this.getCorrelationId() ? { correlation_id: this.getCorrelationId()! } : {}) };

        const existingIndex = this.findValueIndex(combinedLabels);

        if (existingIndex >= 0) {
          this.values[existingIndex].value = this._value;
          this.values[existingIndex].timestamp = new Date();
        } else {
          this.values.push({
            value: this._value,
            timestamp: new Date(),
            labels: combinedLabels,
          });
        }

        return new Ok(undefined);
      } catch (error) {
        return new Err(error as Error);
      }
    });
  }

  async decrement(value: number = 1, labels: Record<string, string> = {}): Promise<Result<void, Error>> {
    return this.increment(-value, labels);
  }

  get(labels: Record<string, string> = {}): number {
    return this._value;
  }

  private findValueIndex(labels: Record<string, string>): number {
    return this.values.findIndex(v =>
      JSON.stringify(v.labels || {}) === JSON.stringify(labels)
    );
  }

  private getCorrelationId(): string | undefined {
    return process.env.CORRELATION_ID;
  }
}

/**
 * Enhanced histogram with aggregation, sampling, and atomic operations
 */
export class AggregatingHistogram implements Histogram {
  public readonly type = 'histogram' as const;
  public values: MetricValue[] = [];
  public readonly buckets: number[];
  private observations: number[] = [];
  private sums: Record<string, number> = {};
  private counts: Record<string, number> = {};
  private bucketCounts: Record<string, Record<string, number>> = {};
  private readonly mutex = new Mutex();
  private readonly sampleRate: number;
  private sampleCount = 0;

  constructor(
    public readonly name: string,
    public readonly help: string,
    buckets: readonly number[] = DEFAULT_CONFIG.HISTOGRAM_BUCKETS,
    public readonly labels: Record<string, string> = {},
    options: { sampleRate?: number } = {}
  ) {
    this.buckets = [...buckets].sort((a, b) => a - b);
    this.sampleRate = options.sampleRate ?? 1.0; // 1.0 = sample all, 0.1 = sample 10%
  }

  async observe(value: number, labels: Record<string, string> = {}): Promise<Result<void, Error>> {
    // Apply sampling
    this.sampleCount++;
    if (Math.random() > this.sampleRate) {
      return new Ok(undefined); // Skip this observation based on sampling rate
    }

    return this.mutex.withLock(async () => {
      try {
        const combinedLabels = { ...this.labels, ...labels, ...(this.getCorrelationId() ? { correlation_id: this.getCorrelationId()! } : {}) };
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

        return new Ok(undefined);
      } catch (error) {
        return new Err(error as Error);
      }
    });
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

  private getCorrelationId(): string | undefined {
    return process.env.CORRELATION_ID;
  }
}

/**
 * Enhanced summary with aggregation, sampling, and atomic operations
 */
export class AggregatingSummary implements Summary {
  public readonly type = 'summary' as const;
  public values: MetricValue[] = [];
  public readonly quantiles: number[];
  private observations: number[] = [];
  private sums: Record<string, number> = {};
  private counts: Record<string, number> = {};
  private quantileValues: Record<string, Record<string, number>> = {};
  private readonly mutex = new Mutex();
  private readonly sampleRate: number;
  private sampleCount = 0;

  constructor(
    public readonly name: string,
    public readonly help: string,
    quantiles: readonly number[] = DEFAULT_CONFIG.SUMMARY_QUANTILES,
    public readonly labels: Record<string, string> = {},
    options: { sampleRate?: number } = {}
  ) {
    this.quantiles = [...quantiles].sort((a, b) => a - b);
    this.sampleRate = options.sampleRate ?? 1.0;
  }

  async observe(value: number, labels: Record<string, string> = {}): Promise<Result<void, Error>> {
    // Apply sampling
    this.sampleCount++;
    if (Math.random() > this.sampleRate) {
      return new Ok(undefined);
    }

    return this.mutex.withLock(async () => {
      try {
        const combinedLabels = { ...this.labels, ...labels, ...(this.getCorrelationId() ? { correlation_id: this.getCorrelationId()! } : {}) };
        const labelKey = JSON.stringify(combinedLabels);

        // Update observations
        this.observations.push(value);

        // Update sum and count
        this.sums[labelKey] = (this.sums[labelKey] || 0) + value;
        this.counts[labelKey] = (this.counts[labelKey] || 0) + 1;

        // Calculate quantiles periodically to avoid excessive computation
        if (this.observations.length % 100 === 0) { // Recalculate every 100 observations
          this.quantileValues[labelKey] = this.calculateQuantiles();
        }

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

        return new Ok(undefined);
      } catch (error) {
        return new Err(error as Error);
      }
    });
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

  private getCorrelationId(): string | undefined {
    return process.env.CORRELATION_ID;
  }
}

// ==================== Mutex for Atomic Operations ====================

/**
 * Simple mutex implementation for atomic operations
 */
class Mutex {
  private locked = false;
  private waiting: Array<() => void> = [];

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.release();
        }
      };

      if (this.locked) {
        this.waiting.push(execute);
      } else {
        this.locked = true;
        execute();
      }
    });
  }

  private release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}

// ==================== Factory Functions ====================

export function createAtomicCounter(
  name: string,
  help: string,
  labels: Record<string, string> = {}
): AtomicCounter {
  return new AtomicCounter(name, help, labels);
}

export function createAtomicGauge(
  name: string,
  help: string,
  labels: Record<string, string> = {}
): AtomicGauge {
  return new AtomicGauge(name, help, labels);
}

export function createAggregatingHistogram(
  name: string,
  help: string,
  buckets: readonly number[] = DEFAULT_CONFIG.HISTOGRAM_BUCKETS,
  labels: Record<string, string> = {},
  options: { sampleRate?: number } = {}
): AggregatingHistogram {
  return new AggregatingHistogram(name, help, buckets, labels, options);
}

export function createAggregatingSummary(
  name: string,
  help: string,
  quantiles: readonly number[] = DEFAULT_CONFIG.SUMMARY_QUANTILES,
  labels: Record<string, string> = {},
  options: { sampleRate?: number } = {}
): AggregatingSummary {
  return new AggregatingSummary(name, help, quantiles, labels, options);
}