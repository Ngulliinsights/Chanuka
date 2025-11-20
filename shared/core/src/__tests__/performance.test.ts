import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { PerformanceBenchmarks } from '../testing/performance-benchmarks';
import { createCacheService } from '../cache';
import { createRateLimitFactory } from '../rate-limiting';
import { Logger } from '@shared/core/src/observability/logging';
import { ValidationService } from '../validation/validation-service';
import type { BenchmarkComponents, BenchmarkConfig } from '../testing/performance-benchmarks';
import { logger } from '@shared/core/src/observability/logging';

describe('Core Utilities Performance Benchmarks', () => {
  let benchmarks: PerformanceBenchmarks;
  let components: BenchmarkComponents;

  const benchmarkConfig: BenchmarkConfig = {
    iterations: {
      cache: {
        get: 5000,
        set: 2500,
        delete: 2500,
        batchGet: 500,
        batchSet: 250,
        concurrentReads: 2500,
        concurrentWrites: 1250,
        mixed: 1500
      },
      rateLimit: {
        single: 2500,
        burst: 2500,
        concurrent: 5000
      },
      logging: {
        single: 5000,
        volume: 50,
        concurrent: 2500,
        structured: 2500,
        context: 2500
      },
      validation: {
        simple: 5000,
        complex: 500,
        batch: 250,
        schemaCompilation: 500
      },
      integration: {
        fullPipeline: 1000,
        cacheValidation: 500,
        rateLimitLogging: 2500
      }
    },
    concurrency: {
      cache: {
        reads: 25,
        writes: 15,
        mixed: 20
      },
      rateLimit: {
        burst: 50,
        concurrent: 25
      },
      logging: {
        concurrent: 25
      }
    }
  };

  beforeAll(async () => {
    // Initialize components for testing
    const cache = createCacheService({
      provider: 'memory',
      maxMemoryMB: 100,
      enableMetrics: true,
      keyPrefix: 'benchmark:',
      defaultTtlSec: 300,
      enableCompression: false,
      compressionThreshold: 1024,
      enableCircuitBreaker: true
    });

    const rateLimitFactory = createRateLimitFactory();
    const rateLimiter = rateLimitFactory.createStore('sliding-window');

    const logger = new Logger({
      level: 'info',
      pretty: false,
      enableMetrics: true,
      redactPaths: ['password', 'token'],
      asyncTransport: false
    });

    const validator = new ValidationService();
    
    // Register test schemas
    await validator.registerSchema('user', {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'number', minimum: 0, maximum: 150 },
        email: { type: 'string', format: 'email' }
      },
      required: ['name', 'age', 'email']
    });

    await validator.registerSchema('complex-user', {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            profile: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                preferences: {
                  type: 'object',
                  properties: {
                    theme: { type: 'string', enum: ['light', 'dark'] },
                    notifications: {
                      type: 'object',
                      properties: {
                        email: { type: 'boolean' },
                        push: { type: 'boolean' },
                        sms: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            },
            addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  street: { type: 'string' },
                  city: { type: 'string' },
                  zip: { type: 'string' }
                }
              }
            },
            orders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        price: { type: 'number' },
                        quantity: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    components = {
      cache,
      rateLimiter,
      logger,
      validator
    };

    benchmarks = new PerformanceBenchmarks(benchmarkConfig);
  });

  afterAll(async () => {
    // Cleanup
    if (components.cache && typeof (components.cache as any).destroy === 'function') {
      await (components.cache as any).destroy();
    }
  });

  describe('Cache Performance', () => {
    it('should benchmark cache operations within acceptable performance thresholds', async () => {
      const results = await benchmarks.benchmarkCache(components.cache!);
      
      // Verify all benchmarks completed successfully
      const failedBenchmarks = results.filter(r => !r.success);
      expect(failedBenchmarks).toHaveLength(0);

      // Performance assertions
      const getResult = results.find(r => r.name === 'cache:get');
      expect(getResult).toBeDefined();
      expect(getResult!.operationsPerSecond).toBeGreaterThan(10000); // Should handle 10k+ ops/sec
      expect(getResult!.averageTimeMs).toBeLessThan(1); // Should be sub-millisecond

      const setResult = results.find(r => r.name === 'cache:set');
      expect(setResult).toBeDefined();
      expect(setResult!.operationsPerSecond).toBeGreaterThan(5000); // Should handle 5k+ ops/sec
      expect(setResult!.averageTimeMs).toBeLessThan(2); // Should be under 2ms

      const concurrentReadsResult = results.find(r => r.name === 'cache:concurrent-reads');
      expect(concurrentReadsResult).toBeDefined();
      expect(concurrentReadsResult!.operationsPerSecond).toBeGreaterThan(5000); // Should handle concurrent load

      // Log results for analysis
      logger.info('\n=== Cache Performance Results ===', { component: 'Chanuka' });
      results.forEach(result => {
        if (result.success) {
          console.log(`${result.name}: ${result.operationsPerSecond.toFixed(0)} ops/sec, avg: ${(result.averageTimeMs || 0).toFixed(2)}ms`);
        }
      });
    }, 60000); // 60 second timeout

    it('should handle memory usage efficiently', async () => {
      const results = await benchmarks.benchmarkCache(components.cache!);
      const memoryResult = results.find(r => r.name === 'cache:memory-usage');
      
      expect(memoryResult).toBeDefined();
      expect(memoryResult!.success).toBe(true);
      expect(memoryResult!.memoryResults).toBeDefined();

      // Memory usage should be reasonable
      const memoryPoints = memoryResult!.memoryResults!;
      const largestPoint = memoryPoints[memoryPoints.length - 1];
      
      // Should not use excessive memory (less than 100MB for test data)
      expect(largestPoint.heapUsed).toBeLessThan(100 * 1024 * 1024);

      logger.info('\n=== Cache Memory Usage ===', { component: 'Chanuka' });
      memoryPoints.forEach(point => {
        console.log(`${point.sizeKB}KB x ${point.entryCount}: ${(point.heapUsed / 1024 / 1024).toFixed(2)}MB heap`);
      });
    }, 30000);
  });

  describe('Rate Limiting Performance', () => {
    it('should benchmark rate limiting operations within acceptable thresholds', async () => {
      const results = await benchmarks.benchmarkRateLimit(components.rateLimiter!);
      
      const failedBenchmarks = results.filter(r => !r.success);
      expect(failedBenchmarks).toHaveLength(0);

      const singleResult = results.find(r => r.name === 'rate-limit:single');
      expect(singleResult).toBeDefined();
      expect(singleResult!.operationsPerSecond).toBeGreaterThan(5000); // Should handle 5k+ checks/sec
      expect(singleResult!.averageTimeMs).toBeLessThan(2); // Should be under 2ms

      const burstResult = results.find(r => r.name === 'rate-limit:burst');
      expect(burstResult).toBeDefined();
      expect(burstResult!.operationsPerSecond).toBeGreaterThan(2000); // Should handle burst traffic

      logger.info('\n=== Rate Limiting Performance Results ===', { component: 'Chanuka' });
      results.forEach(result => {
        if (result.success && result.operationsPerSecond) {
          console.log(`${result.name}: ${result.operationsPerSecond.toFixed(0)} ops/sec, avg: ${(result.averageTimeMs || 0).toFixed(2)}ms`);
        }
      });
    }, 45000);

    it('should compare algorithm performance', async () => {
      const results = await benchmarks.benchmarkRateLimit(components.rateLimiter!);
      const algorithmResult = results.find(r => r.name === 'rate-limit:algorithms');
      
      expect(algorithmResult).toBeDefined();
      expect(algorithmResult!.success).toBe(true);
      expect(algorithmResult!.customResults?.algorithmResults).toBeDefined();

      const algorithmResults = algorithmResult!.customResults!.algorithmResults;
      
      logger.info('\n=== Rate Limiting Algorithm Comparison ===', { component: 'Chanuka' });
      algorithmResults.forEach((result: any) => {
        console.log(`${result.algorithm}: ${result.avgTimeMs.toFixed(2)}ms average`);
        expect(result.avgTimeMs).toBeLessThan(5); // All algorithms should be under 5ms
      });
    }, 30000);
  });

  describe('Logging Performance', () => {
    it('should benchmark logging operations within acceptable thresholds', async () => {
      const results = await benchmarks.benchmarkLogging(components.logger!);
      
      const failedBenchmarks = results.filter(r => !r.success);
      expect(failedBenchmarks).toHaveLength(0);

      const singleResult = results.find(r => r.name === 'logging:single');
      expect(singleResult).toBeDefined();
      expect(singleResult!.operationsPerSecond).toBeGreaterThan(10000); // Should handle 10k+ logs/sec
      expect(singleResult!.averageTimeMs).toBeLessThan(1); // Should be sub-millisecond

      const structuredResult = results.find(r => r.name === 'logging:structured');
      expect(structuredResult).toBeDefined();
      expect(structuredResult!.operationsPerSecond).toBeGreaterThan(5000); // Should handle structured logs efficiently

      const concurrentResult = results.find(r => r.name === 'logging:concurrent');
      expect(concurrentResult).toBeDefined();
      expect(concurrentResult!.operationsPerSecond).toBeGreaterThan(5000); // Should handle concurrent logging

      logger.info('\n=== Logging Performance Results ===', { component: 'Chanuka' });
      results.forEach(result => {
        if (result.success) {
          console.log(`${result.name}: ${result.operationsPerSecond.toFixed(0)} ops/sec, avg: ${(result.averageTimeMs || 0).toFixed(2)}ms`);
        }
      });
    }, 45000);
  });

  describe('Validation Performance', () => {
    it('should benchmark validation operations within acceptable thresholds', async () => {
      const results = await benchmarks.benchmarkValidation(components.validator!);
      
      const failedBenchmarks = results.filter(r => !r.success);
      expect(failedBenchmarks).toHaveLength(0);

      const simpleResult = results.find(r => r.name === 'validation:simple');
      expect(simpleResult).toBeDefined();
      expect(simpleResult!.operationsPerSecond).toBeGreaterThan(10000); // Should handle 10k+ validations/sec
      expect(simpleResult!.averageTimeMs).toBeLessThan(1); // Should be sub-millisecond

      const complexResult = results.find(r => r.name === 'validation:complex');
      expect(complexResult).toBeDefined();
      expect(complexResult!.operationsPerSecond).toBeGreaterThan(1000); // Should handle complex validations efficiently
      expect(complexResult!.averageTimeMs).toBeLessThan(5); // Should be under 5ms

      const batchResult = results.find(r => r.name === 'validation:batch');
      expect(batchResult).toBeDefined();
      expect(batchResult!.operationsPerSecond).toBeGreaterThan(100); // Should handle batch validations

      logger.info('\n=== Validation Performance Results ===', { component: 'Chanuka' });
      results.forEach(result => {
        if (result.success) {
          console.log(`${result.name}: ${result.operationsPerSecond.toFixed(0)} ops/sec, avg: ${(result.averageTimeMs || 0).toFixed(2)}ms`);
        }
      });
    }, 45000);
  });

  describe('Integration Performance', () => {
    it('should benchmark integration scenarios within acceptable thresholds', async () => {
      const results = await benchmarks.benchmarkIntegration(components);
      
      const failedBenchmarks = results.filter(r => !r.success);
      expect(failedBenchmarks).toHaveLength(0);

      const pipelineResult = results.find(r => r.name === 'integration:full-pipeline');
      expect(pipelineResult).toBeDefined();
      expect(pipelineResult!.operationsPerSecond).toBeGreaterThan(1000); // Should handle full pipeline efficiently
      expect(pipelineResult!.averageTimeMs).toBeLessThan(10); // Should be under 10ms

      const cacheValidationResult = results.find(r => r.name === 'integration:cache-validation');
      expect(cacheValidationResult).toBeDefined();
      expect(cacheValidationResult!.operationsPerSecond).toBeGreaterThan(2000); // Should handle cache+validation efficiently

      const rateLimitLoggingResult = results.find(r => r.name === 'integration:rate-limit-logging');
      expect(rateLimitLoggingResult).toBeDefined();
      expect(rateLimitLoggingResult!.operationsPerSecond).toBeGreaterThan(3000); // Should handle rate limiting + logging efficiently

      logger.info('\n=== Integration Performance Results ===', { component: 'Chanuka' });
      results.forEach(result => {
        if (result.success) {
          console.log(`${result.name}: ${result.operationsPerSecond.toFixed(0)} ops/sec, avg: ${(result.averageTimeMs || 0).toFixed(2)}ms`);
        }
      });
    }, 60000);
  });

  describe('Full Benchmark Suite', () => {
    it('should run complete benchmark suite and generate comprehensive report', async () => {
      const suite = await benchmarks.runAll(components);
      
      expect(suite).toBeDefined();
      expect(suite.results.length).toBeGreaterThan(0);
      expect(suite.summary.successfulTests).toBeGreaterThan(0);
      expect(suite.summary.failedTests).toBe(0);

      // Verify environment info is captured
      expect(suite.environment.nodeVersion).toBeDefined();
      expect(suite.environment.platform).toBeDefined();
      expect(suite.environment.cpuCount).toBeGreaterThan(0);
      expect(suite.environment.totalMemoryMB).toBeGreaterThan(0);

      // Verify category stats
      expect(suite.summary.categoryStats.cache).toBeDefined();
      expect(suite.summary.categoryStats['rate-limit']).toBeDefined();
      expect(suite.summary.categoryStats.logging).toBeDefined();
      expect(suite.summary.categoryStats.validation).toBeDefined();
      expect(suite.summary.categoryStats.integration).toBeDefined();

      logger.info('\n=== Full Benchmark Suite Summary ===', { component: 'Chanuka' });
      console.log(`Total Tests: ${suite.summary.totalTests}`);
      console.log(`Successful: ${suite.summary.successfulTests}`);
      console.log(`Failed: ${suite.summary.failedTests}`);
      console.log(`Total Duration: ${suite.totalDurationMs.toFixed(0)}ms`);
      console.log(`Environment: Node ${suite.environment.nodeVersion} on ${suite.environment.platform}`);
      console.log(`CPUs: ${suite.environment.cpuCount}, Memory: ${suite.environment.totalMemoryMB.toFixed(0)}MB`);

      logger.info('\n=== Category Performance Summary ===', { component: 'Chanuka' });
      Object.entries(suite.summary.categoryStats).forEach(([category, stats]) => {
        console.log(`${category}: ${stats.averageOpsPerSecond.toFixed(0)} avg ops/sec, ${stats.averageTimeMs.toFixed(2)}ms avg time`);
      });

      // Performance regression detection
      const criticalBenchmarks = [
        { name: 'cache:get', minOpsPerSecond: 10000 },
        { name: 'cache:set', minOpsPerSecond: 5000 },
        { name: 'rate-limit:single', minOpsPerSecond: 5000 },
        { name: 'logging:single', minOpsPerSecond: 10000 },
        { name: 'validation:simple', minOpsPerSecond: 10000 },
        { name: 'integration:full-pipeline', minOpsPerSecond: 1000 }
      ];

      logger.info('\n=== Performance Regression Check ===', { component: 'Chanuka' });
      criticalBenchmarks.forEach(({ name, minOpsPerSecond }) => {
        const result = suite.results.find(r => r.name === name);
        if (result && result.success) {
          const passed = result.operationsPerSecond >= minOpsPerSecond;
          console.log(`${name}: ${result.operationsPerSecond.toFixed(0)} ops/sec ${passed ? '✓' : '✗'} (min: ${minOpsPerSecond})`);
          expect(result.operationsPerSecond).toBeGreaterThanOrEqual(minOpsPerSecond);
        }
      });

    }, 180000); // 3 minute timeout for full suite
  });

  describe('Performance Monitoring', () => {
    it('should detect performance regressions', async () => {
      // This test would typically compare against baseline performance metrics
      // For now, we'll just verify that performance is within acceptable ranges
      
      const suite = await benchmarks.runAll(components);
      
      // Define performance baselines (these would typically come from historical data)
      const baselines = {
        'cache:get': { minOps: 10000, maxAvgTime: 1 },
        'cache:set': { minOps: 5000, maxAvgTime: 2 },
        'rate-limit:single': { minOps: 5000, maxAvgTime: 2 },
        'logging:single': { minOps: 10000, maxAvgTime: 1 },
        'validation:simple': { minOps: 10000, maxAvgTime: 1 }
      };

      const regressions: string[] = [];

      Object.entries(baselines).forEach(([benchmarkName, baseline]) => {
        const result = suite.results.find(r => r.name === benchmarkName);
        if (result && result.success) {
          if (result.operationsPerSecond < baseline.minOps) {
            regressions.push(`${benchmarkName}: ops/sec below baseline (${result.operationsPerSecond} < ${baseline.minOps})`);
          }
          if ((result.averageTimeMs || 0) > baseline.maxAvgTime) {
            regressions.push(`${benchmarkName}: avg time above baseline (${result.averageTimeMs} > ${baseline.maxAvgTime})`);
          }
        }
      });

      if (regressions.length > 0) {
        logger.info('\n=== Performance Regressions Detected ===', { component: 'Chanuka' });
        regressions.forEach(regression => console.log(`⚠️  ${regression}`));
      }

      expect(regressions).toHaveLength(0);
    }, 120000);

    it('should provide percentile analysis for critical operations', async () => {
      const suite = await benchmarks.runAll(components);
      
      const criticalOperations = ['cache:get', 'cache:set', 'rate-limit:single', 'logging:single'];
      
      logger.info('\n=== Percentile Analysis ===', { component: 'Chanuka' });
      criticalOperations.forEach(opName => {
        const result = suite.results.find(r => r.name === opName);
        if (result && result.success && result.percentiles) {
          console.log(`${opName}:`);
          console.log(`  P50: ${result.percentiles.p50.toFixed(2)}ms`);
          console.log(`  P90: ${result.percentiles.p90.toFixed(2)}ms`);
          console.log(`  P95: ${result.percentiles.p95.toFixed(2)}ms`);
          console.log(`  P99: ${result.percentiles.p99.toFixed(2)}ms`);
          
          // P99 should be reasonable for critical operations
          expect(result.percentiles.p99).toBeLessThan(10); // P99 under 10ms
        }
      });
    }, 120000);
  });
});















































