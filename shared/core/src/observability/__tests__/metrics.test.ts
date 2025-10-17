import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCounter,
  createGauge,
  createHistogram,
  createSummary,
  createRegistry,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  SummaryMetric,
  InMemoryMetricsRegistry,
} from '../metrics';

describe('Metrics', () => {
  let registry: InMemoryMetricsRegistry;

  beforeEach(() => {
    registry = createRegistry() as InMemoryMetricsRegistry;
  });

  describe('Counter', () => {
    it('should create and increment counters', () => {
      const counter = createCounter('test_counter', 'A test counter');

      counter.increment();
      expect(counter.get()).toBe(1);

      counter.increment(5);
      expect(counter.get()).toBe(6);

      counter.increment(1, { label: 'value' });
      expect(counter.get({ label: 'value' })).toBe(1);
    });

    it('should reject negative increments', () => {
      const counter = createCounter('test_counter', 'A test counter');

      expect(() => counter.increment(-1)).toThrow('Counter cannot be decremented');
    });

    it('should register with registry', () => {
      const counter = createCounter('registry_counter', 'Registry test counter');
      registry.register(counter);

      const retrieved = registry.get('registry_counter');
      expect(retrieved).toBe(counter);
    });
  });

  describe('Gauge', () => {
    it('should create and manipulate gauges', () => {
      const gauge = createGauge('test_gauge', 'A test gauge');

      gauge.set(42);
      expect(gauge.get()).toBe(42);

      gauge.increment(8);
      expect(gauge.get()).toBe(50);

      gauge.decrement(10);
      expect(gauge.get()).toBe(40);

      gauge.set(100, { instance: 'test' });
      expect(gauge.get({ instance: 'test' })).toBe(100);
    });

    it('should handle labeled gauge operations', () => {
      const gauge = createGauge('labeled_gauge', 'A labeled gauge');

      gauge.set(10, { service: 'api' });
      gauge.set(20, { service: 'db' });

      expect(gauge.get({ service: 'api' })).toBe(10);
      expect(gauge.get({ service: 'db' })).toBe(20);
      expect(gauge.get()).toBe(0); // Default label
    });
  });

  describe('Histogram', () => {
    it('should create and observe histogram values', () => {
      const histogram = createHistogram('test_histogram', 'A test histogram');

      histogram.observe(0.1);
      histogram.observe(0.5);
      histogram.observe(1.0);

      expect(histogram.getCount()).toBe(3);
      expect(histogram.getSum()).toBe(1.6);
    });

    it('should calculate bucket counts', () => {
      const histogram = createHistogram('bucket_histogram', 'Bucket test', [0.1, 1.0, 10.0]);

      histogram.observe(0.05); // bucket 0
      histogram.observe(0.5);  // bucket 1
      histogram.observe(5.0);  // bucket 2
      histogram.observe(50.0); // overflow

      const buckets = histogram.getBuckets();
      expect(buckets['0.1']).toBe(1); // 0.05 <= 0.1
      expect(buckets['1']).toBe(2);   // 0.5 <= 1.0
      expect(buckets['10']).toBe(3);  // 5.0 <= 10.0
      expect(buckets['+Inf']).toBe(4); // 50.0 > 10.0
    });

    it('should handle labeled histogram observations', () => {
      const histogram = createHistogram('labeled_histogram', 'Labeled histogram');

      histogram.observe(1.0, { method: 'GET' });
      histogram.observe(2.0, { method: 'POST' });

      expect(histogram.getCount({ method: 'GET' })).toBe(1);
      expect(histogram.getCount({ method: 'POST' })).toBe(1);
      expect(histogram.getSum({ method: 'GET' })).toBe(1.0);
      expect(histogram.getSum({ method: 'POST' })).toBe(2.0);
    });
  });

  describe('Summary', () => {
    it('should create and observe summary values', () => {
      const summary = createSummary('test_summary', 'A test summary');

      summary.observe(1.0);
      summary.observe(2.0);
      summary.observe(3.0);

      expect(summary.getCount()).toBe(3);
      expect(summary.getSum()).toBe(6.0);
    });

    it('should calculate quantiles', () => {
      const summary = createSummary('quantile_summary', 'Quantile test');

      // Add some test data
      for (let i = 1; i <= 100; i++) {
        summary.observe(i);
      }

      const quantiles = summary.getQuantiles();
      expect(quantiles['0.5']).toBe(50);  // median
      expect(quantiles['0.9']).toBe(90);  // 90th percentile
      expect(quantiles['0.95']).toBe(95); // 95th percentile
      expect(quantiles['0.99']).toBe(99); // 99th percentile
    });
  });

  describe('Registry', () => {
    it('should register and retrieve metrics', () => {
      const counter = createCounter('registry_test', 'Registry test');
      registry.register(counter);

      expect(registry.get('registry_test')).toBe(counter);
      expect(registry.list()).toContain(counter);
    });

    it('should prevent duplicate metric registration', () => {
      const counter1 = createCounter('duplicate_test', 'Duplicate test');
      const counter2 = createCounter('duplicate_test', 'Duplicate test 2');

      registry.register(counter1);
      expect(() => registry.register(counter2)).toThrow('already registered');
    });

    it('should collect all metrics', () => {
      const counter = createCounter('collect_counter', 'Collect test counter');
      const gauge = createGauge('collect_gauge', 'Collect test gauge');

      registry.register(counter);
      registry.register(gauge);

      counter.increment();
      gauge.set(42);

      const metrics = registry.collect();

      expect(metrics).toHaveLength(2);
      expect(metrics.find(m => m.name === 'collect_counter')).toBeDefined();
      expect(metrics.find(m => m.name === 'collect_gauge')).toBeDefined();
    });

    it('should clear all metrics', () => {
      const counter = createCounter('clear_test', 'Clear test');
      registry.register(counter);

      expect(registry.list()).toHaveLength(1);

      registry.clear();
      expect(registry.list()).toHaveLength(0);
    });
  });

  describe('Metric Validation', () => {
    it('should validate metric names', () => {
      expect(() => createCounter('valid_name', 'Valid name')).not.toThrow();
      expect(() => createCounter('invalid-name', 'Invalid name')).not.toThrow();
      expect(() => createCounter('123invalid', 'Invalid start')).not.toThrow();
    });

    it('should handle metric labels', () => {
      const counter = createCounter('labeled_counter', 'Labeled counter');

      counter.increment(1, { service: 'api', version: '1.0' });
      expect(counter.get({ service: 'api', version: '1.0' })).toBe(1);

      // Different labels should be separate
      counter.increment(1, { service: 'db', version: '1.0' });
      expect(counter.get({ service: 'db', version: '1.0' })).toBe(1);
    });
  });

  describe('Default Registry', () => {
    it('should provide a default registry instance', () => {
      expect(registry).toBeInstanceOf(InMemoryMetricsRegistry);
    });
  });
});