import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { jest } from '@jest/globals';
import { PoolClient } from 'pg';
import { createConnectionManager, ConnectionManager } from '../connection-manager';
import { getMonitoringService, resetMonitoringService } from '../../../monitoring/monitoring';

// Mock the shared pool and its dependencies
vi.mock('../../../../../shared/database/pool', () => ({
  pool: {
    connect: vi.fn(),
    on: vi.fn(),
    getMetrics: vi.fn(),
    circuitBreaker: {
      getState: vi.fn(),
      getFailureCount: vi.fn(),
      execute: vi.fn(),
    },
    totalCount: 10,
    idleCount: 5,
    waitingCount: 2,
  },
  checkPoolHealth: vi.fn(),
}));

import { pool, checkPoolHealth } from '../../../../../shared/database/pool';

describe('ConnectionManager Performance Tests', () => {
  let manager: ConnectionManager;
  let mockClient: vi.Mocked<PoolClient>;

  beforeEach(() => {
    resetMonitoringService();
    vi.clearAllMocks();

    // Setup mock client
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    // Setup mock pool
    (pool.connect as vi.Mock).mockResolvedValue(mockClient);
    (pool.getMetrics as vi.Mock).mockResolvedValue({
      queries: 100,
      connections: 10,
      idleConnections: 5,
      totalConnections: 10,
      waitingClients: 2,
      avgQueryTime: 50,
      maxQueryTime: 100,
      minQueryTime: 10,
    });
    (pool.circuitBreaker.getState as vi.Mock).mockReturnValue('CLOSED');
    (pool.circuitBreaker.getFailureCount as vi.Mock).mockReturnValue(0);

    // Setup mock health check
    (checkPoolHealth as vi.Mock).mockResolvedValue({
      isHealthy: true,
      totalConnections: 10,
      idleConnections: 5,
      waitingClients: 2,
      circuitBreakerState: 'CLOSED',
      circuitBreakerFailures: 0,
    });

    manager = createConnectionManager({
      healthCheckIntervalMs: 60000, // Disable health checks for performance testing
    });
  });

  afterEach(async () => {
    await manager.close();
    resetMonitoringService();
  });

  describe('Metrics Collection Overhead', () => {
    it('should have minimal overhead for connection acquisition metrics', async () => {
      const iterations = 1000;
      const startTime = process.hrtime.bigint();

      // Perform many connection acquisitions
      for (let i = 0; i < iterations; i++) {
        const client = await manager.acquireConnection();
        await manager.releaseConnection(client);
      }

      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      const avgTimePerOperation = totalTimeMs / (iterations * 2); // *2 for acquire + release

      console.log(`Performance test: ${iterations} iterations, ${totalTimeMs.toFixed(2)}ms total, ${avgTimePerOperation.toFixed(4)}ms per operation`);

      // Assert that metrics collection overhead is less than 1ms per operation
      expect(avgTimePerOperation).toBeLessThan(1.0);

      // Also verify that metrics were actually collected
      const monitoring = getMonitoringService();
      const acquiredMetrics = monitoring.getMetrics('connection.acquired');
      const releasedMetrics = monitoring.getMetrics('connection.released');

      expect(acquiredMetrics.length).toBe(iterations);
      expect(releasedMetrics.length).toBe(iterations);
    });

    it('should have minimal overhead for health status metrics', async () => {
      const iterations = 100;
      const startTime = process.hrtime.bigint();

      // Perform many health status checks
      for (let i = 0; i < iterations; i++) {
        await manager.getHealthStatus();
      }

      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;
      const avgTimePerOperation = totalTimeMs / iterations;

      console.log(`Health status performance: ${iterations} iterations, ${totalTimeMs.toFixed(2)}ms total, ${avgTimePerOperation.toFixed(4)}ms per operation`);

      // Assert that health status metrics overhead is minimal
      expect(avgTimePerOperation).toBeLessThan(1.0);
    });

    it('should have minimal overhead for pool statistics metrics', async () => {
      const iterations = 100;
      const startTime = process.hrtime.bigint();

      // Perform many pool statistics calls
      for (let i = 0; i < iterations; i++) {
        await manager.getPoolStatistics();
      }

      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;
      const avgTimePerOperation = totalTimeMs / iterations;

      console.log(`Pool statistics performance: ${iterations} iterations, ${totalTimeMs.toFixed(2)}ms total, ${avgTimePerOperation.toFixed(4)}ms per operation`);

      // Assert that pool statistics metrics overhead is minimal
      expect(avgTimePerOperation).toBeLessThan(1.0);
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentOperations = 50;
      const operationsPerConcurrent = 10;
      const totalOperations = concurrentOperations * operationsPerConcurrent;

      const startTime = process.hrtime.bigint();

      // Run concurrent operations
      const promises = Array(concurrentOperations).fill(null).map(async () => {
        for (let i = 0; i < operationsPerConcurrent; i++) {
          const client = await manager.acquireConnection();
          await manager.releaseConnection(client);
        }
      });

      await Promise.all(promises);

      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;
      const avgTimePerOperation = totalTimeMs / totalOperations;

      console.log(`Concurrent performance: ${totalOperations} operations, ${totalTimeMs.toFixed(2)}ms total, ${avgTimePerOperation.toFixed(4)}ms per operation`);

      // Assert that concurrent metrics collection overhead is still minimal
      expect(avgTimePerOperation).toBeLessThan(2.0); // Slightly higher threshold for concurrent operations

      // Verify all metrics were collected
      const monitoring = getMonitoringService();
      const acquiredMetrics = monitoring.getMetrics('connection.acquired');
      const releasedMetrics = monitoring.getMetrics('connection.released');

      expect(acquiredMetrics.length).toBe(totalOperations);
      expect(releasedMetrics.length).toBe(totalOperations);
    });

    it('should not impact connection acquisition time significantly', async () => {
      // Measure time without metrics (simulate by mocking monitoring to do nothing)
      const monitoring = getMonitoringService();
      const originalRecordMetric = monitoring.recordDatabaseMetric;
      monitoring.recordDatabaseMetric = vi.fn(); // No-op

      const iterations = 100;
      let totalTimeWithoutMetrics = 0;

      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        const client = await manager.acquireConnection();
        await manager.releaseConnection(client);
        const end = process.hrtime.bigint();
        totalTimeWithoutMetrics += Number(end - start) / 1_000_000;
      }

      // Restore metrics collection
      monitoring.recordDatabaseMetric = originalRecordMetric;

      // Now measure with metrics
      let totalTimeWithMetrics = 0;

      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        const client = await manager.acquireConnection();
        await manager.releaseConnection(client);
        const end = process.hrtime.bigint();
        totalTimeWithMetrics += Number(end - start) / 1_000_000;
      }

      const avgTimeWithoutMetrics = totalTimeWithoutMetrics / iterations;
      const avgTimeWithMetrics = totalTimeWithMetrics / iterations;
      const overheadMs = avgTimeWithMetrics - avgTimeWithoutMetrics;

      console.log(`Metrics overhead: ${overheadMs.toFixed(4)}ms per operation (${((overheadMs / avgTimeWithoutMetrics) * 100).toFixed(2)}% increase)`);

      // Assert that metrics overhead is less than 0.5ms per operation
      expect(overheadMs).toBeLessThan(0.5);
    });
  });

  describe('Memory Usage', () => {
    it('should not have unbounded memory growth with metrics', async () => {
      const initialMemoryUsage = process.memoryUsage().heapUsed;

      // Perform many operations to test for memory leaks
      for (let i = 0; i < 1000; i++) {
        const client = await manager.acquireConnection();
        await manager.releaseConnection(client);

        // Periodically check health status
        if (i % 100 === 0) {
          await manager.getHealthStatus();
          await manager.getPoolStatistics();
        }
      }

      const finalMemoryUsage = process.memoryUsage().heapUsed;
      const memoryIncreaseMB = (finalMemoryUsage - initialMemoryUsage) / (1024 * 1024);

      console.log(`Memory usage: ${memoryIncreaseMB.toFixed(2)}MB increase after 1000 operations`);

      // Assert that memory increase is reasonable (less than 10MB for 1000 operations)
      expect(memoryIncreaseMB).toBeLessThan(10.0);
    });
  });
});




































