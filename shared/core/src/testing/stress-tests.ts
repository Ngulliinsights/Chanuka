import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { LoadTester } from '../../shared/core/src/testing/load-tester';
import type { CacheService } from '../../caching/core/interfaces';
import type { RateLimitStore } from '../../shared/core/src/rate-limiting/types';
import { UnifiedLogger } from '../observability/logging/logger';

/**
 * Stress testing utilities for core components
 * Tests system behavior under extreme load conditions
 */
export class StressTests extends EventEmitter {
  private loadTester: LoadTester;

  constructor(private config: StressTestConfig = {}) {
    super();
    this.loadTester = new LoadTester();
  }

  /**
   * Run comprehensive stress tests
   */
  async runStressTests(components: StressTestComponents): Promise<StressTestSuite> {
    const startTime = performance.now();
    const results: StressTestResult[] = [];

    this.emit('stress:start', { components: Object.keys(components) });

    try {
      // Memory pressure tests
      if (components.cache) {
        results.push(await this.stressTestCacheMemory(components.cache));
        results.push(await this.stressTestCacheConcurrency(components.cache));
      }

      // Rate limiting under extreme load
      if (components.rateLimiter) {
        results.push(await this.stressTestRateLimitingFlood(components.rateLimiter));
        results.push(await this.stressTestRateLimitingMemory(components.rateLimiter));
      }

      // Logging under high volume
      if (components.logger) {
        results.push(await this.stressTestLoggingVolume(components.logger));
        results.push(await this.stressTestLoggingConcurrency(components.logger));
      }

      // System-wide stress tests
      if (Object.keys(components).length > 1) {
        results.push(await this.stressTestSystemWide(components));
      }

      const totalTime = performance.now() - startTime;
      const suite: StressTestSuite = {
        timestamp: new Date(),
        totalDurationMs: totalTime,
        results,
        summary: this.generateStressSummary(results),
        systemMetrics: this.captureSystemMetrics()
      };

      this.emit('stress:complete', suite);
      return suite;

    } catch (error) {
      this.emit('stress:error', error);
      throw error;
    }
  }

  /**
   * Stress test cache memory usage
   */
  async stressTestCacheMemory(cache: CacheService): Promise<StressTestResult> {
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();
    const memorySnapshots: MemorySnapshot[] = [];

    this.emit('stress:cache:memory:start');

    try {
      // Phase 1: Fill cache with increasing data sizes
      const phases = [
        { size: 1024, count: 10000, phase: 'small-objects' },
        { size: 10240, count: 5000, phase: 'medium-objects' },
        { size: 102400, count: 1000, phase: 'large-objects' },
        { size: 1048576, count: 100, phase: 'very-large-objects' }
      ];

      for (const { size, count, phase } of phases) {
        const phaseStart = performance.now();
        const data = 'x'.repeat(size);
        const keys: string[] = [];

        // Store objects
        const promises = [];
        for (let i = 0; i < count; i++) {
          promises.push(cache.set(`stress:memory:${phase}:${i}`, data, 3600));

          // Take memory snapshots periodically
          if (i % Math.floor(count / 10) === 0) {
            const currentMemory = process.memoryUsage();
            memorySnapshots.push({
              timestamp: Date.now(),
              phase,
              objectCount: i,
              objectSize: size,
              heapUsed: currentMemory.heapUsed,
              heapTotal: currentMemory.heapTotal,
              external: currentMemory.external,
              rss: currentMemory.rss
            });
          }
        }

        await Promise.all(promises);

        const phaseEnd = performance.now();
        this.emit('stress:cache:memory:phase', {
          phase,
          duration: phaseEnd - phaseStart,
          objectCount: count,
          objectSize: size
        });
      }

      // Phase 2: Test cache operations under memory pressure
      const operationResults = await this.testOperationsUnderMemoryPressure(cache);

      // Phase 3: Memory cleanup test
      const cleanupResults = await this.testMemoryCleanup(cache);

      const endTime = performance.now();
      const finalMemory = process.memoryUsage();

      return {
        name: 'cache:memory-stress',
        type: 'memory-stress',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success: true,
        memorySnapshots,
        operationResults,
        cleanupResults,
        memoryDelta: {
          heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
          heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
          external: finalMemory.external - initialMemory.external,
          rss: finalMemory.rss - initialMemory.rss
        }
      };

    } catch (error) {
      return {
        name: 'cache:memory-stress',
        type: 'memory-stress',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        memorySnapshots
      };
    }
  }

  /**
   * Stress test cache concurrency
   */
  async stressTestCacheConcurrency(cache: CacheService): Promise<StressTestResult> {
    const startTime = performance.now();
    this.emit('stress:cache:concurrency:start');

    try {
      const concurrencyLevels = [10, 50, 100, 200, 500];
      const results: ConcurrencyTestResult[] = [];

      for (const concurrency of concurrencyLevels) {
        const levelStart = performance.now();
        const operations = 1000;
        const operationsPerWorker = Math.floor(operations / concurrency);

        // Mixed operations: 40% reads, 40% writes, 20% deletes
        const workers = Array(concurrency).fill(null).map(async (_, workerId) => {
          const workerResults = { reads: 0, writes: 0, deletes: 0, errors: 0 };

          for (let i = 0; i < operationsPerWorker; i++) {
            const operation = Math.random();
            const key = `stress:concurrency:${workerId}:${i}`;

            try {
              if (operation < 0.4) {
                // Read operation
                await cache.get(key);
                workerResults.reads++;
              } else if (operation < 0.8) {
                // Write operation
                await cache.set(key, `data-${workerId}-${i}`, 300);
                workerResults.writes++;
              } else {
                // Delete operation
                await cache.del(key);
                workerResults.deletes++;
              }
            } catch (error) {
              workerResults.errors++;
            }
          }

          return workerResults;
        });

        const workerResults = await Promise.all(workers);
        const levelEnd = performance.now();

        const aggregated = workerResults.reduce(
          (acc, result) => ({
            reads: acc.reads + result.reads,
            writes: acc.writes + result.writes,
            deletes: acc.deletes + result.deletes,
            errors: acc.errors + result.errors
          }),
          { reads: 0, writes: 0, deletes: 0, errors: 0 }
        );

        results.push({
          concurrency,
          duration: levelEnd - levelStart,
          totalOperations: aggregated.reads + aggregated.writes + aggregated.deletes,
          operationsPerSecond: (aggregated.reads + aggregated.writes + aggregated.deletes) / ((levelEnd - levelStart) / 1000),
          errorRate: aggregated.errors / (aggregated.reads + aggregated.writes + aggregated.deletes + aggregated.errors),
          breakdown: aggregated
        });

        this.emit('stress:cache:concurrency:level', {
          concurrency,
          duration: levelEnd - levelStart,
          operationsPerSecond: results[results.length - 1].operationsPerSecond
        });
      }

      return {
        name: 'cache:concurrency-stress',
        type: 'concurrency-stress',
        startTime: new Date(Date.now() - (performance.now() - startTime)),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: true,
        concurrencyResults: results
      };

    } catch (error) {
      return {
        name: 'cache:concurrency-stress',
        type: 'concurrency-stress',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Stress test rate limiting under flood conditions
   */
  async stressTestRateLimitingFlood(rateLimiter: RateLimitStore): Promise<StressTestResult> {
    const startTime = performance.now();
    this.emit('stress:rate-limit:flood:start');

    try {
      // Simulate DDoS-like traffic patterns
      const floodPatterns = [
        { name: 'burst-flood', requests: 10000, concurrency: 100, duration: 5000 },
        { name: 'sustained-flood', requests: 50000, concurrency: 50, duration: 30000 },
        { name: 'spike-flood', requests: 5000, concurrency: 200, duration: 2000 }
      ];

      const results: FloodTestResult[] = [];

      for (const pattern of floodPatterns) {
        const patternStart = performance.now();
        const { requests, concurrency, duration } = pattern;

        const requestsPerWorker = Math.floor(requests / concurrency);
        const workers = Array(concurrency).fill(null).map(async (_, workerId) => {
          const workerResults = { allowed: 0, blocked: 0, errors: 0 };
          const userId = `flood-user-${workerId}`;

          for (let i = 0; i < requestsPerWorker; i++) {
            try {
              const result = await rateLimiter.check(userId, { windowMs: 60000, max: 100, message: 'Rate limit exceeded' });
              if (result.allowed) {
                workerResults.allowed++;
              } else {
                workerResults.blocked++;
              }
            } catch (error) {
              workerResults.errors++;
            }

            // Add small delay to simulate realistic request timing
            if (i % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }

          return workerResults;
        });

        const workerResults = await Promise.all(workers);
        const patternEnd = performance.now();

        const aggregated = workerResults.reduce(
          (acc, result) => ({
            allowed: acc.allowed + result.allowed,
            blocked: acc.blocked + result.blocked,
            errors: acc.errors + result.errors
          }),
          { allowed: 0, blocked: 0, errors: 0 }
        );

        results.push({
          pattern: pattern.name,
          duration: patternEnd - patternStart,
          totalRequests: aggregated.allowed + aggregated.blocked,
          allowedRequests: aggregated.allowed,
          blockedRequests: aggregated.blocked,
          errorCount: aggregated.errors,
          blockRate: aggregated.blocked / (aggregated.allowed + aggregated.blocked),
          requestsPerSecond: (aggregated.allowed + aggregated.blocked) / ((patternEnd - patternStart) / 1000)
        });

        this.emit('stress:rate-limit:flood:pattern', {
          pattern: pattern.name,
          blockRate: results[results.length - 1].blockRate,
          requestsPerSecond: results[results.length - 1].requestsPerSecond
        });
      }

      return {
        name: 'rate-limit:flood-stress',
        type: 'flood-stress',
        startTime: new Date(Date.now() - (performance.now() - startTime)),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: true,
        floodResults: results
      };

    } catch (error) {
      return {
        name: 'rate-limit:flood-stress',
        type: 'flood-stress',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Stress test rate limiting memory usage
   */
  async stressTestRateLimitingMemory(rateLimiter: RateLimitStore): Promise<StressTestResult> {
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();
    const memorySnapshots: MemorySnapshot[] = [];

    this.emit('stress:rate-limit:memory:start');

    try {
      // Create rate limit entries for many users
      const userCounts = [1000, 10000, 50000, 100000];

      for (const userCount of userCounts) {
        const phaseStart = performance.now();

        // Create rate limit entries in batches
        const batchSize = 1000;
        const batches = Math.ceil(userCount / batchSize);

        for (let batch = 0; batch < batches; batch++) {
          const batchPromises = [];
          const startUser = batch * batchSize;
          const endUser = Math.min(startUser + batchSize, userCount);

          for (let i = startUser; i < endUser; i++) {
            batchPromises.push(rateLimiter.check(`stress-user-${i}`, { windowMs: 60000, max: 100, message: 'Rate limit exceeded' }));
          }

          await Promise.all(batchPromises);

          // Take memory snapshot
          if (batch % 10 === 0) {
            const currentMemory = process.memoryUsage();
            memorySnapshots.push({
              timestamp: Date.now(),
              phase: `users-${userCount}`,
              objectCount: endUser,
              objectSize: 0,
              heapUsed: currentMemory.heapUsed,
              heapTotal: currentMemory.heapTotal,
              external: currentMemory.external,
              rss: currentMemory.rss
            });
          }
        }

        const phaseEnd = performance.now();
        this.emit('stress:rate-limit:memory:phase', {
          userCount,
          duration: phaseEnd - phaseStart
        });
      }

      const endTime = performance.now();
      const finalMemory = process.memoryUsage();

      return {
        name: 'rate-limit:memory-stress',
        type: 'memory-stress',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success: true,
        memorySnapshots,
        memoryDelta: {
          heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
          heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
          external: finalMemory.external - initialMemory.external,
          rss: finalMemory.rss - initialMemory.rss
        }
      };

    } catch (error) {
      return {
        name: 'rate-limit:memory-stress',
        type: 'memory-stress',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        memorySnapshots
      };
    }
  }

  /**
   * Stress test logging under high volume
   */
  async stressTestLoggingVolume(logger: UnifiedLogger): Promise<StressTestResult> {
    const startTime = performance.now();
    this.emit('stress:logging:volume:start');

    try {
      const volumeTests = [
        { name: 'high-frequency', logsPerSecond: 10000, duration: 10000 },
        { name: 'sustained-volume', logsPerSecond: 5000, duration: 30000 },
        { name: 'burst-volume', logsPerSecond: 50000, duration: 2000 }
      ];

      const results: VolumeTestResult[] = [];

      for (const test of volumeTests) {
        const testStart = performance.now();
        const { logsPerSecond, duration } = test;
        const totalLogs = Math.floor((logsPerSecond * duration) / 1000);
        const intervalMs = 1000 / logsPerSecond;

        let logsWritten = 0;
        let errors = 0;

        const logPromises: Promise<void>[] = [];
        const startLogging = performance.now();

        for (let i = 0; i < totalLogs; i++) {
          const logPromise = new Promise<void>((resolve) => {
            setTimeout(async () => {
              try {
                logger.info(`Stress test log ${i}`, {
                  test: test.name,
                  iteration: i,
                  timestamp: Date.now(),
                  data: `test-data-${i}`.repeat(10)
                });
                logsWritten++;
              } catch (error) {
                errors++;
              }
              resolve();
            }, i * intervalMs);
          });

          logPromises.push(logPromise);
        }

        await Promise.all(logPromises);
        const testEnd = performance.now();

        results.push({
          test: test.name,
          duration: testEnd - testStart,
          targetLogsPerSecond: logsPerSecond,
          actualLogsPerSecond: logsWritten / ((testEnd - startLogging) / 1000),
          totalLogs: logsWritten,
          errors,
          errorRate: errors / (logsWritten + errors)
        });

        this.emit('stress:logging:volume:test', {
          test: test.name,
          logsWritten,
          actualLogsPerSecond: results[results.length - 1].actualLogsPerSecond
        });
      }

      return {
        name: 'logging:volume-stress',
        type: 'volume-stress',
        startTime: new Date(Date.now() - (performance.now() - startTime)),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: true,
        volumeResults: results
      };

    } catch (error) {
      return {
        name: 'logging:volume-stress',
        type: 'volume-stress',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Stress test logging concurrency
   */
  async stressTestLoggingConcurrency(logger: UnifiedLogger): Promise<StressTestResult> {
    const startTime = performance.now();
    this.emit('stress:logging:concurrency:start');

    try {
      const concurrencyLevels = [10, 50, 100, 200, 500];
      const results: ConcurrencyTestResult[] = [];

      for (const concurrency of concurrencyLevels) {
        const levelStart = performance.now();
        const logsPerWorker = 1000;

        const workers = Array(concurrency).fill(null).map(async (_, workerId) => {
          const workerResults = { logs: 0, errors: 0 };

          for (let i = 0; i < logsPerWorker; i++) {
            try {
              logger.info(`Concurrent log from worker ${workerId}`, {
                workerId,
                iteration: i,
                timestamp: Date.now(),
                data: `worker-${workerId}-data-${i}`
              });
              workerResults.logs++;
            } catch (error) {
              workerResults.errors++;
            }
          }

          return workerResults;
        });

        const workerResults = await Promise.all(workers);
        const levelEnd = performance.now();

        const aggregated = workerResults.reduce(
          (acc, result) => ({
            logs: acc.logs + result.logs,
            errors: acc.errors + result.errors
          }),
          { logs: 0, errors: 0 }
        );

        results.push({
          concurrency,
          duration: levelEnd - levelStart,
          totalOperations: aggregated.logs,
          operationsPerSecond: aggregated.logs / ((levelEnd - levelStart) / 1000),
          errorRate: aggregated.errors / (aggregated.logs + aggregated.errors),
          breakdown: { ...aggregated, reads: 0, writes: aggregated.logs, deletes: 0 }
        });

        this.emit('stress:logging:concurrency:level', {
          concurrency,
          logsPerSecond: results[results.length - 1].operationsPerSecond
        });
      }

      return {
        name: 'logging:concurrency-stress',
        type: 'concurrency-stress',
        startTime: new Date(Date.now() - (performance.now() - startTime)),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: true,
        concurrencyResults: results
      };

    } catch (error) {
      return {
        name: 'logging:concurrency-stress',
        type: 'concurrency-stress',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * System-wide stress test
   */
  async stressTestSystemWide(components: StressTestComponents): Promise<StressTestResult> {
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    this.emit('stress:system:start');

    try {
      const { cache, rateLimiter, logger } = components;
      const duration = this.config.systemStressDuration || 60000; // 1 minute
      const concurrency = this.config.systemStressConcurrency || 100;

      const endTime = Date.now() + duration;
      const workers = Array(concurrency).fill(null).map(async (_, workerId) => {
        const workerStats = {
          cacheOps: 0,
          rateLimitChecks: 0,
          logEntries: 0,
          errors: 0
        };

        while (Date.now() < endTime) {
          try {
            const userId = `system-stress-user-${workerId}`;
            const operation = Math.random();

            if (operation < 0.3 && cache) {
              // Cache operations
              const key = `system-stress:${workerId}:${Date.now()}`;
              if (Math.random() < 0.5) {
                await cache.set(key, `data-${workerId}`, 300);
              } else {
                await cache.get(key);
              }
              workerStats.cacheOps++;
            } else if (operation < 0.6 && rateLimiter) {
              // Rate limiting checks
              await rateLimiter.check(userId, { windowMs: 60000, max: 100, message: 'Rate limit exceeded' });
              workerStats.rateLimitChecks++;
            } else if (logger) {
              // Logging
              logger.info(`System stress log from worker ${workerId}`, {
                workerId,
                timestamp: Date.now(),
                operation: 'system-stress'
              });
              workerStats.logEntries++;
            }

            // Small delay to prevent overwhelming the system
            if (workerStats.cacheOps + workerStats.rateLimitChecks + workerStats.logEntries % 100 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }

          } catch (error) {
            workerStats.errors++;
          }
        }

        return workerStats;
      });

      const workerResults = await Promise.all(workers);
      const finalMemory = process.memoryUsage();

      const aggregated = workerResults.reduce(
        (acc, result) => ({
          cacheOps: acc.cacheOps + result.cacheOps,
          rateLimitChecks: acc.rateLimitChecks + result.rateLimitChecks,
          logEntries: acc.logEntries + result.logEntries,
          errors: acc.errors + result.errors
        }),
        { cacheOps: 0, rateLimitChecks: 0, logEntries: 0, errors: 0 }
      );

      const totalOperations = aggregated.cacheOps + aggregated.rateLimitChecks + aggregated.logEntries;
      const actualDuration = performance.now() - startTime;

      return {
        name: 'system:wide-stress',
        type: 'system-stress',
        startTime: new Date(Date.now() - actualDuration),
        endTime: new Date(),
        durationMs: actualDuration,
        success: true,
        systemResults: {
          totalOperations,
          operationsPerSecond: totalOperations / (actualDuration / 1000),
          breakdown: aggregated,
          errorRate: aggregated.errors / (totalOperations + aggregated.errors),
          concurrency
        },
        memoryDelta: {
          heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
          heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
          external: finalMemory.external - initialMemory.external,
          rss: finalMemory.rss - initialMemory.rss
        }
      };

    } catch (error) {
      return {
        name: 'system:wide-stress',
        type: 'system-stress',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Helper methods
  private async testOperationsUnderMemoryPressure(cache: CacheService): Promise<any> {
    const operations = ['get', 'set', 'delete'];
    const results: any = {};

    for (const op of operations) {
      const times: number[] = [];
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const key = `pressure-test:${op}:${i}`;
        const start = performance.now();

        try {
          switch (op) {
            case 'get':
              await cache.get(key);
              break;
            case 'set':
              await cache.set(key, `data-${i}`, 300);
              break;
            case 'delete':
              await cache.del(key);
              break;
          }
          times.push(performance.now() - start);
        } catch (error) {
          times.push(performance.now() - start);
        }
      }

      results[op] = {
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        maxTime: Math.max(...times),
        minTime: Math.min(...times)
      };
    }

    return results;
  }

  private async testMemoryCleanup(cache: CacheService): Promise<any> {
    const beforeCleanup = process.memoryUsage();

    // Trigger cleanup if available
    if (cache.clear) {
      await cache.clear();
    } else if (cache.flush) {
      await cache.flush();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const afterCleanup = process.memoryUsage();

    return {
      memoryFreed: beforeCleanup.heapUsed - afterCleanup.heapUsed,
      heapReduction: ((beforeCleanup.heapUsed - afterCleanup.heapUsed) / beforeCleanup.heapUsed) * 100
    };
  }

  private generateStressSummary(results: StressTestResult[]): StressTestSummary {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      totalTests: results.length,
      successfulTests: successful.length,
      failedTests: failed.length,
      totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
      criticalFailures: failed.filter(r => r.type.includes('memory') || r.type.includes('system')).length
    };
  }

  private captureSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: Date.now(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      loadAverage: require('os').loadavg()
    };
  }
}

// Type definitions
export interface StressTestConfig {
  systemStressDuration?: number;
  systemStressConcurrency?: number;
  memoryPressureThreshold?: number;
  maxConcurrency?: number;
}

export interface StressTestComponents {
  cache?: CacheService;
  rateLimiter?: RateLimitStore;
  logger?: UnifiedLogger;
}

export interface StressTestResult {
  name: string;
  type: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  success: boolean;
  error?: string;
  memorySnapshots?: MemorySnapshot[];
  memoryDelta?: MemoryDelta;
  concurrencyResults?: ConcurrencyTestResult[];
  floodResults?: FloodTestResult[];
  volumeResults?: VolumeTestResult[];
  systemResults?: SystemStressResult;
  operationResults?: any;
  cleanupResults?: any;
}

export interface StressTestSuite {
  timestamp: Date;
  totalDurationMs: number;
  results: StressTestResult[];
  summary: StressTestSummary;
  systemMetrics: SystemMetrics;
}

export interface StressTestSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  totalDurationMs: number;
  criticalFailures: number;
}

export interface MemorySnapshot {
  timestamp: number;
  phase: string;
  objectCount: number;
  objectSize: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface MemoryDelta {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface ConcurrencyTestResult {
  concurrency: number;
  duration: number;
  totalOperations: number;
  operationsPerSecond: number;
  errorRate: number;
  breakdown: {
    reads: number;
    writes: number;
    deletes: number;
    errors: number;
  };
}

export interface FloodTestResult {
  pattern: string;
  duration: number;
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  errorCount: number;
  blockRate: number;
  requestsPerSecond: number;
}

export interface VolumeTestResult {
  test: string;
  duration: number;
  targetLogsPerSecond: number;
  actualLogsPerSecond: number;
  totalLogs: number;
  errors: number;
  errorRate: number;
}

export interface SystemStressResult {
  totalOperations: number;
  operationsPerSecond: number;
  breakdown: {
    cacheOps: number;
    rateLimitChecks: number;
    logEntries: number;
    errors: number;
  };
  errorRate: number;
  concurrency: number;
}

export interface SystemMetrics {
  timestamp: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  uptime: number;
  loadAverage: number[];
}