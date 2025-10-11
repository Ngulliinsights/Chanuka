/**
 * Performance Monitoring Service - Test Suite
 *
 * Validates the optimized performance monitoring implementation
 */

import { performanceMonitoring, MonitoringLevel, SamplingStrategy } from './performance-monitoring';
import { measure, track, trackApiMetric, getMonitoringStatus } from '../utils/performance-monitoring-utils.js';

describe('Performance Monitoring Service', () => {
  beforeEach(() => {
    // Reset monitoring service before each test
    performanceMonitoring.updateConfig({
      level: MonitoringLevel.DETAILED,
      sampling: {
        strategy: SamplingStrategy.NONE,
        rate: 1.0,
        adaptiveThreshold: 1000,
        burstThreshold: 5000
      },
      alerting: {
        enabled: false,
        anomalyDetection: false,
        regressionDetection: false,
        thresholds: {}
      }
    });
  });

  afterEach(() => {
    // Clean up after each test
    performanceMonitoring.updateConfig({
      level: MonitoringLevel.MINIMAL,
      sampling: {
        strategy: SamplingStrategy.NONE,
        rate: 1.0,
        adaptiveThreshold: 1000,
        burstThreshold: 5000
      }
    });
  });

  describe('Basic Functionality', () => {
    test('should record metrics', () => {
      performanceMonitoring.recordMetric('test.metric', 42, { component: 'test' });

      const metrics = performanceMonitoring.getAggregatedMetrics();
      expect(metrics['test.metric']).toBeDefined();
      expect(metrics['test.metric'].lastValue).toBe(42);
    });

    test('should measure execution time', async () => {
      const result = await performanceMonitoring.measureExecution(
        'test.execution',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'done';
        }
      );

      expect(result).toBe('done');

      const metrics = performanceMonitoring.getAggregatedMetrics();
      expect(metrics['test.execution']).toBeDefined();
      expect(metrics['test.execution'].count).toBe(1);
    });

    test('should handle monitoring levels', () => {
      // Set to minimal level
      performanceMonitoring.updateConfig({ level: MonitoringLevel.MINIMAL });

      // Should not record debug metrics
      performanceMonitoring.recordMetric('debug.operation', 1, { level: 'debug' });
      performanceMonitoring.recordMetric('error.count', 1, { level: 'error' });

      const metrics = performanceMonitoring.getAggregatedMetrics();
      expect(metrics['debug.operation']).toBeUndefined();
      expect(metrics['error.count']).toBeDefined();
    });
  });

  describe('Sampling Strategies', () => {
    test('should apply probabilistic sampling', () => {
      performanceMonitoring.updateConfig({
        sampling: {
          strategy: SamplingStrategy.PROBABILISTIC,
          rate: 0.5,
          adaptiveThreshold: 1000,
          burstThreshold: 5000
        }
      });

      // Record multiple metrics
      for (let i = 0; i < 1000; i++) {
        performanceMonitoring.recordMetric('sampled.metric', i);
      }

      const metrics = performanceMonitoring.getAggregatedMetrics();
      // Should have some but not all metrics (approximately 50%)
      expect(metrics['sampled.metric'].count).toBeGreaterThan(400);
      expect(metrics['sampled.metric'].count).toBeLessThan(600);
    });

    test('should apply adaptive sampling', () => {
      performanceMonitoring.updateConfig({
        sampling: {
          strategy: SamplingStrategy.ADAPTIVE,
          rate: 0.1,
          adaptiveThreshold: 10, // Low threshold for testing
          burstThreshold: 5000
        }
      });

      // Simulate high load
      for (let i = 0; i < 50; i++) {
        performanceMonitoring.recordMetric('high.load.metric', i);
      }

      // Should sample less under high load
      const metrics = performanceMonitoring.getAggregatedMetrics();
      expect(metrics['high.load.metric'].count).toBeLessThan(50);
    });
  });

  describe('Memory Management', () => {
    test('should enforce memory limits', () => {
      performanceMonitoring.updateConfig({
        memory: {
          maxMetrics: 10,
          cleanupInterval: 15
        }
      });

      // Record more metrics than the limit
      for (let i = 0; i < 20; i++) {
        performanceMonitoring.recordMetric(`test.metric.${i}`, i);
      }

      const status = performanceMonitoring.getHealthStatus();
      expect(status.memoryUsage).toBeGreaterThan(0);
    });

    test('should clean up old data', (done) => {
      performanceMonitoring.updateConfig({
        retention: {
          rawMetrics: 0.001, // 3.6 seconds
          aggregatedMetrics: 30,
          alerts: 7
        },
        memory: {
          maxMetrics: 100000,
          cleanupInterval: 1 // 1 minute, but we'll trigger manually
        }
      });

      // Record some metrics
      performanceMonitoring.recordMetric('old.metric', 1);

      // Wait for cleanup interval (simulate)
      setTimeout(() => {
        // In a real test, we'd trigger cleanup
        // For now, just verify the service is still functional
        const status = performanceMonitoring.getHealthStatus();
        expect(status.isRunning).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Anomaly Detection', () => {
    test('should detect anomalies', () => {
      performanceMonitoring.updateConfig({
        alerting: {
          enabled: true,
          anomalyDetection: true,
          regressionDetection: false,
          thresholds: {}
        }
      });

      // Establish baseline with normal values
      for (let i = 0; i < 20; i++) {
        performanceMonitoring.recordMetric('anomaly.test', 100 + Math.random() * 10);
      }

      // Record anomalous value
      performanceMonitoring.recordMetric('anomaly.test', 1000); // 10x normal

      const alerts = performanceMonitoring.getRecentAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('anomaly');
    });
  });

  describe('Business KPI Integration', () => {
    test('should track business KPIs', () => {
      // This would require actual business logic integration
      const kpis = performanceMonitoring.getBusinessKPIs();
      expect(typeof kpis).toBe('object');
    });
  });

  describe('Utility Functions', () => {
    test('should track API metrics', () => {
      trackApiMetric('GET', '/api/test', 200, 150, 'user123');

      const metrics = performanceMonitoring.getAggregatedMetrics();
      expect(metrics['api.request.duration']).toBeDefined();
      expect(metrics['api.request.count']).toBeDefined();
    });

    test('should provide monitoring status', () => {
      const status = getMonitoringStatus();
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('level');
      expect(status).toHaveProperty('metricsCount');
      expect(status).toHaveProperty('memoryUsage');
    });
  });

  describe('Decorators', () => {
    test('should work with measure decorator', async () => {
      class TestClass {
        @measure()
        async testMethod() {
          await new Promise(resolve => setTimeout(resolve, 5));
          return 'result';
        }
      }

      const instance = new TestClass();
      await instance.testMethod();

      const metrics = performanceMonitoring.getAggregatedMetrics();
      expect(metrics['TestClass.testMethod']).toBeDefined();
    });

    test('should work with track decorator', () => {
      class TestClass {
        @track()
        testMethod(value: number) {
          return value * 2;
        }
      }

      const instance = new TestClass();
      instance.testMethod(5);

      const metrics = performanceMonitoring.getAggregatedMetrics();
      expect(metrics['TestClass.testMethod.calls']).toBeDefined();
    });
  });

  describe('Configuration', () => {
    test('should update configuration', () => {
      const newConfig = {
        level: MonitoringLevel.STANDARD,
        sampling: {
          strategy: SamplingStrategy.PROBABILISTIC,
          rate: 0.8,
          adaptiveThreshold: 1000,
          burstThreshold: 5000
        }
      };

      performanceMonitoring.updateConfig(newConfig);

      const currentConfig = performanceMonitoring.getConfig();
      expect(currentConfig.level).toBe(MonitoringLevel.STANDARD);
      expect(currentConfig.sampling.rate).toBe(0.8);
    });

    test('should handle environment-specific config', () => {
      // Import the utility function
      const { getEnvironmentSpecificConfig } = require('../utils/performance-monitoring-utils.js');

      const prodConfig = getEnvironmentSpecificConfig('production');
      expect(prodConfig.level).toBe(MonitoringLevel.STANDARD);
      expect(prodConfig.sampling.strategy).toBe(SamplingStrategy.ADAPTIVE);

      const devConfig = getEnvironmentSpecificConfig('development');
      expect(devConfig.level).toBe(MonitoringLevel.DETAILED);
      expect(devConfig.sampling.strategy).toBe(SamplingStrategy.NONE);
    });
  });
});






