import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StressTests } from '../testing/stress-tests';
import { createCacheService } from '../cache';
import { createRateLimitFactory } from '../rate-limiting';
import { Logger } from '../logging/logger';
import type { StressTestComponents, StressTestConfig } from '../testing/stress-tests';
import { logger } from '../observability/logging';

describe('Core Utilities Stress Tests', () => {
  let stressTests: StressTests;
  let components: StressTestComponents;

  const stressConfig: StressTestConfig = {
    systemStressDuration: 30000, // 30 seconds for CI
    systemStressConcurrency: 50,
    memoryPressureThreshold: 100 * 1024 * 1024, // 100MB
    maxConcurrency: 200
  };

  beforeAll(async () => {
    // Initialize components for stress testing
    const cache = createCacheService({
      provider: 'memory',
      maxMemoryMB: 200, // Higher limit for stress testing
      enableMetrics: true,
      keyPrefix: 'stress:',
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
      asyncTransport: true // Use async transport for stress testing
    });

    components = {
      cache,
      rateLimiter,
      logger
    };

    stressTests = new StressTests(stressConfig);

    // Set up event listeners for monitoring
    stressTests.on('stress:start', (data) => {
      console.log(`\n🚀 Starting stress tests for: ${data.components.join(', ')}`);
    });

    stressTests.on('stress:cache:memory:phase', (data) => {
      console.log(`  📊 Cache memory phase: ${data.phase} - ${data.objectCount} objects (${data.objectSize} bytes each)`);
    });

    stressTests.on('stress:cache:concurrency:level', (data) => {
      console.log(`  ⚡ Cache concurrency level: ${data.concurrency} - ${data.operationsPerSecond.toFixed(0)} ops/sec`);
    });

    stressTests.on('stress:rate-limit:flood:pattern', (data) => {
      console.log(`  🌊 Rate limit flood pattern: ${data.pattern} - ${(data.blockRate * 100).toFixed(1)}% blocked`);
    });

    stressTests.on('stress:logging:volume:test', (data) => {
      console.log(`  📝 Logging volume test: ${data.test} - ${data.actualLogsPerSecond.toFixed(0)} logs/sec`);
    });

    stressTests.on('stress:complete', (suite) => {
      console.log(`\n✅ Stress tests completed: ${suite.summary.successfulTests}/${suite.summary.totalTests} passed`);
    });
  });

  afterAll(async () => {
    // Cleanup
    if (components.cache && typeof (components.cache as any).destroy === 'function') {
      await (components.cache as any).destroy();
    }
  });

  describe('Cache Stress Tests', () => {
    it('should handle extreme memory pressure without crashing', async () => {
      const result = await stressTests.stressTestCacheMemory(components.cache!);
      
      expect(result.success).toBe(true);
      expect(result.memorySnapshots).toBeDefined();
      expect(result.memorySnapshots!.length).toBeGreaterThan(0);

      // Verify memory usage is tracked
      const snapshots = result.memorySnapshots!;
      const firstSnapshot = snapshots[0];
      const lastSnapshot = snapshots[snapshots.length - 1];
      
      expect(lastSnapshot.heapUsed).toBeGreaterThan(firstSnapshot.heapUsed);
      
      // Memory should not grow excessively (less than 500MB for test)
      expect(lastSnapshot.heapUsed).toBeLessThan(500 * 1024 * 1024);

      logger.info('\n=== Cache Memory Stress Results ===', { component: 'Chanuka' });
      console.log(`Memory growth: ${((lastSnapshot.heapUsed - firstSnapshot.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Peak heap usage: ${(lastSnapshot.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      if (result.cleanupResults) {
        console.log(`Memory freed after cleanup: ${(result.cleanupResults.memoryFreed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Heap reduction: ${result.cleanupResults.heapReduction.toFixed(1)}%`);
      }
    }, 120000); // 2 minute timeout

    it('should maintain performance under high concurrency', async () => {
      const result = await stressTests.stressTestCacheConcurrency(components.cache!);
      
      expect(result.success).toBe(true);
      expect(result.concurrencyResults).toBeDefined();
      expect(result.concurrencyResults!.length).toBeGreaterThan(0);

      const concurrencyResults = result.concurrencyResults!;
      
      // Verify performance doesn't degrade too much with increased concurrency
      const lowConcurrency = concurrencyResults.find(r => r.concurrency <= 50);
      const highConcurrency = concurrencyResults.find(r => r.concurrency >= 200);
      
      if (lowConcurrency && highConcurrency) {
        const performanceDegradation = (lowConcurrency.operationsPerSecond - highConcurrency.operationsPerSecond) / lowConcurrency.operationsPerSecond;
        expect(performanceDegradation).toBeLessThan(0.8); // Less than 80% degradation
      }

      // Error rates should be low across all concurrency levels
      concurrencyResults.forEach(result => {
        expect(result.errorRate).toBeLessThan(0.05); // Less than 5% error rate
      });

      logger.info('\n=== Cache Concurrency Stress Results ===', { component: 'Chanuka' });
      concurrencyResults.forEach(result => {
        console.log(`Concurrency ${result.concurrency}: ${result.operationsPerSecond.toFixed(0)} ops/sec, ${(result.errorRate * 100).toFixed(2)}% errors`);
      });
    }, 90000);
  });

  describe('Rate Limiting Stress Tests', () => {
    it('should handle flood attacks effectively', async () => {
      const result = await stressTests.stressTestRateLimitingFlood(components.rateLimiter!);
      
      expect(result.success).toBe(true);
      expect(result.floodResults).toBeDefined();
      expect(result.floodResults!.length).toBeGreaterThan(0);

      const floodResults = result.floodResults!;
      
      // Verify rate limiting is working (should block significant portion of flood traffic)
      floodResults.forEach(floodResult => {
        expect(floodResult.blockRate).toBeGreaterThan(0.5); // Should block at least 50% of flood traffic
        expect(floodResult.errorCount).toBeLessThan(floodResult.totalRequests * 0.01); // Less than 1% errors
      });

      logger.info('\n=== Rate Limiting Flood Stress Results ===', { component: 'Chanuka' });
      floodResults.forEach(result => {
        console.log(`${result.pattern}: ${result.requestsPerSecond.toFixed(0)} req/sec, ${(result.blockRate * 100).toFixed(1)}% blocked`);
      });
    }, 120000);

    it('should manage memory efficiently under load', async () => {
      const result = await stressTests.stressTestRateLimitingMemory(components.rateLimiter!);
      
      expect(result.success).toBe(true);
      expect(result.memorySnapshots).toBeDefined();
      expect(result.memoryDelta).toBeDefined();

      const memoryDelta = result.memoryDelta!;
      
      // Memory growth should be reasonable (less than 200MB for 100k users)
      expect(memoryDelta.heapUsed).toBeLessThan(200 * 1024 * 1024);

      logger.info('\n=== Rate Limiting Memory Stress Results ===', { component: 'Chanuka' });
      console.log(`Total memory growth: ${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`RSS growth: ${(memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`);
    }, 90000);
  });

  describe('Logging Stress Tests', () => {
    it('should handle high-volume logging without blocking', async () => {
      const result = await stressTests.stressTestLoggingVolume(components.logger!);
      
      expect(result.success).toBe(true);
      expect(result.volumeResults).toBeDefined();
      expect(result.volumeResults!.length).toBeGreaterThan(0);

      const volumeResults = result.volumeResults!;
      
      // Verify logging can handle high volumes
      volumeResults.forEach(volumeResult => {
        expect(volumeResult.actualLogsPerSecond).toBeGreaterThan(volumeResult.targetLogsPerSecond * 0.5); // At least 50% of target
        expect(volumeResult.errorRate).toBeLessThan(0.01); // Less than 1% error rate
      });

      logger.info('\n=== Logging Volume Stress Results ===', { component: 'Chanuka' });
      volumeResults.forEach(result => {
        console.log(`${result.test}: ${result.actualLogsPerSecond.toFixed(0)} logs/sec (target: ${result.targetLogsPerSecond}), ${(result.errorRate * 100).toFixed(2)}% errors`);
      });
    }, 120000);

    it('should maintain performance under concurrent logging', async () => {
      const result = await stressTests.stressTestLoggingConcurrency(components.logger!);
      
      expect(result.success).toBe(true);
      expect(result.concurrencyResults).toBeDefined();
      expect(result.concurrencyResults!.length).toBeGreaterThan(0);

      const concurrencyResults = result.concurrencyResults!;
      
      // Verify performance scales reasonably with concurrency
      concurrencyResults.forEach(concurrencyResult => {
        expect(concurrencyResult.operationsPerSecond).toBeGreaterThan(1000); // At least 1k logs/sec
        expect(concurrencyResult.errorRate).toBeLessThan(0.05); // Less than 5% error rate
      });

      logger.info('\n=== Logging Concurrency Stress Results ===', { component: 'Chanuka' });
      concurrencyResults.forEach(result => {
        console.log(`Concurrency ${result.concurrency}: ${result.operationsPerSecond.toFixed(0)} logs/sec, ${(result.errorRate * 100).toFixed(2)}% errors`);
      });
    }, 90000);
  });

  describe('System-Wide Stress Tests', () => {
    it('should handle system-wide stress without critical failures', async () => {
      const result = await stressTests.stressTestSystemWide(components);
      
      expect(result.success).toBe(true);
      expect(result.systemResults).toBeDefined();
      expect(result.memoryDelta).toBeDefined();

      const systemResults = result.systemResults!;
      const memoryDelta = result.memoryDelta!;
      
      // Verify system can handle mixed operations
      expect(systemResults.totalOperations).toBeGreaterThan(10000); // Should complete significant operations
      expect(systemResults.operationsPerSecond).toBeGreaterThan(500); // Reasonable throughput
      expect(systemResults.errorRate).toBeLessThan(0.1); // Less than 10% error rate

      // Memory growth should be controlled
      expect(memoryDelta.heapUsed).toBeLessThan(300 * 1024 * 1024); // Less than 300MB growth

      logger.info('\n=== System-Wide Stress Results ===', { component: 'Chanuka' });
      console.log(`Total operations: ${systemResults.totalOperations.toLocaleString()}`);
      console.log(`Operations per second: ${systemResults.operationsPerSecond.toFixed(0)}`);
      console.log(`Error rate: ${(systemResults.errorRate * 100).toFixed(2)}%`);
      console.log(`Concurrency: ${systemResults.concurrency}`);
      console.log(`Memory growth: ${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      logger.info('\nOperation breakdown:', { component: 'Chanuka' });
      console.log(`  Cache operations: ${systemResults.breakdown.cacheOps.toLocaleString()}`);
      console.log(`  Rate limit checks: ${systemResults.breakdown.rateLimitChecks.toLocaleString()}`);
      console.log(`  Log entries: ${systemResults.breakdown.logEntries.toLocaleString()}`);
      console.log(`  Errors: ${systemResults.breakdown.errors.toLocaleString()}`);
    }, 180000); // 3 minute timeout
  });

  describe('Full Stress Test Suite', () => {
    it('should run complete stress test suite without critical failures', async () => {
      const suite = await stressTests.runStressTests(components);
      
      expect(suite).toBeDefined();
      expect(suite.results.length).toBeGreaterThan(0);
      expect(suite.summary.criticalFailures).toBe(0); // No critical failures allowed
      
      // At least 80% of tests should pass
      const successRate = suite.summary.successfulTests / suite.summary.totalTests;
      expect(successRate).toBeGreaterThan(0.8);

      logger.info('\n=== Full Stress Test Suite Summary ===', { component: 'Chanuka' });
      console.log(`Total Tests: ${suite.summary.totalTests}`);
      console.log(`Successful: ${suite.summary.successfulTests}`);
      console.log(`Failed: ${suite.summary.failedTests}`);
      console.log(`Critical Failures: ${suite.summary.criticalFailures}`);
      console.log(`Success Rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`Total Duration: ${(suite.totalDurationMs / 1000).toFixed(1)}s`);

      logger.info('\n=== System Metrics ===', { component: 'Chanuka' });
      const metrics = suite.systemMetrics;
      console.log(`Memory Usage: ${(metrics.memory.heapUsed / 1024 / 1024).toFixed(2)}MB heap, ${(metrics.memory.rss / 1024 / 1024).toFixed(2)}MB RSS`);
      console.log(`CPU Usage: ${metrics.cpu.user}μs user, ${metrics.cpu.system}μs system`);
      console.log(`Uptime: ${metrics.uptime.toFixed(1)}s`);
      console.log(`Load Average: ${metrics.loadAverage.map(l => l.toFixed(2)).join(', ')}`);

      // Verify no memory leaks (heap should not be excessive)
      expect(metrics.memory.heapUsed).toBeLessThan(1024 * 1024 * 1024); // Less than 1GB

      // Log individual test results
      logger.info('\n=== Individual Test Results ===', { component: 'Chanuka' });
      suite.results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const duration = (result.durationMs / 1000).toFixed(1);
        console.log(`${status} ${result.name} (${duration}s)${result.error ? ` - ${result.error}` : ''}`);
      });

    }, 300000); // 5 minute timeout for full suite
  });

  describe('Stress Test Monitoring', () => {
    it('should detect resource exhaustion conditions', async () => {
      // This test verifies that stress tests can detect when resources are being exhausted
      const initialMemory = process.memoryUsage();
      
      // Run a subset of stress tests
      const cacheStressResult = await stressTests.stressTestCacheMemory(components.cache!);
      const rateLimitStressResult = await stressTests.stressTestRateLimitingMemory(components.rateLimiter!);
      
      expect(cacheStressResult.success).toBe(true);
      expect(rateLimitStressResult.success).toBe(true);

      // Verify memory tracking is working
      if (cacheStressResult.memorySnapshots) {
        const snapshots = cacheStressResult.memorySnapshots;
        expect(snapshots.length).toBeGreaterThan(1);
        
        // Memory should generally increase during the test
        const firstSnapshot = snapshots[0];
        const lastSnapshot = snapshots[snapshots.length - 1];
        expect(lastSnapshot.heapUsed).toBeGreaterThanOrEqual(firstSnapshot.heapUsed);
      }

      logger.info('\n=== Resource Exhaustion Detection ===', { component: 'Chanuka' });
      console.log(`Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Current memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      if (cacheStressResult.memoryDelta) {
        console.log(`Cache test memory delta: ${(cacheStressResult.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      }
      
      if (rateLimitStressResult.memoryDelta) {
        console.log(`Rate limit test memory delta: ${(rateLimitStressResult.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      }
    }, 180000);

    it('should provide actionable performance insights', async () => {
      // Run a quick system stress test to gather insights
      const systemResult = await stressTests.stressTestSystemWide(components);
      
      expect(systemResult.success).toBe(true);
      expect(systemResult.systemResults).toBeDefined();

      const results = systemResult.systemResults!;
      
      logger.info('\n=== Performance Insights ===', { component: 'Chanuka' });
      
      // Identify bottlenecks
      const { breakdown } = results;
      const totalOps = breakdown.cacheOps + breakdown.rateLimitChecks + breakdown.logEntries;
      
      if (totalOps > 0) {
        const cachePercentage = (breakdown.cacheOps / totalOps) * 100;
        const rateLimitPercentage = (breakdown.rateLimitChecks / totalOps) * 100;
        const loggingPercentage = (breakdown.logEntries / totalOps) * 100;
        
        console.log(`Operation distribution:`);
        console.log(`  Cache: ${cachePercentage.toFixed(1)}% (${breakdown.cacheOps.toLocaleString()} ops)`);
        console.log(`  Rate Limiting: ${rateLimitPercentage.toFixed(1)}% (${breakdown.rateLimitChecks.toLocaleString()} ops)`);
        console.log(`  Logging: ${loggingPercentage.toFixed(1)}% (${breakdown.logEntries.toLocaleString()} ops)`);
        
        // Provide insights
        if (results.operationsPerSecond < 1000) {
          logger.info('⚠️  Low throughput detected - consider optimizing critical paths', { component: 'Chanuka' });
        }
        
        if (results.errorRate > 0.05) {
          logger.info('⚠️  High error rate detected - investigate error handling', { component: 'Chanuka' });
        }
        
        if (systemResult.memoryDelta && systemResult.memoryDelta.heapUsed > 100 * 1024 * 1024) {
          logger.info('⚠️  High memory usage detected - check for memory leaks', { component: 'Chanuka' });
        }
      }

      // Performance should be reasonable
      expect(results.operationsPerSecond).toBeGreaterThan(100);
      expect(results.errorRate).toBeLessThan(0.2);
    }, 120000);
  });
});






