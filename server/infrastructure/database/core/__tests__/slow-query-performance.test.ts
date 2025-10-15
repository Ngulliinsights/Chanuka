import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryExecutor } from '../query-executor';
import { getMonitoringService, resetMonitoringService } from '../../../monitoring/monitoring';
import { connectionManager } from '../connection-manager';

// Mock the connection manager
vi.mock('../connection-manager', () => ({
  connectionManager: {
    acquireConnection: vi.fn(),
    releaseConnection: vi.fn(),
  },
}));

// Mock the logger
vi.mock('../../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Slow Query Performance Tests', () => {
  let queryExecutor: QueryExecutor;
  let mockClient: any;
  let monitoringService: any;

  beforeEach(() => {
    // Reset monitoring service
    resetMonitoringService();
    monitoringService = getMonitoringService();

    // Create mock client
    mockClient = {
      query: vi.fn(),
    };

    // Setup connection manager mocks
    (connectionManager.acquireConnection as any).mockResolvedValue(mockClient);
    (connectionManager.releaseConnection as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Overhead Measurement', () => {
    it('should have minimal overhead when slow query detection is disabled', async () => {
      // Create executor with detection disabled
      const disabledExecutor = new QueryExecutor({
        enableSlowQueryDetection: false,
      });

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        // Immediate response
        callback(null, { rows: [], rowCount: 0 });
      });

      const query = { sql: 'SELECT 1' };

      const startTime = process.hrtime.bigint();
      await disabledExecutor.execute(query);
      const endTime = process.hrtime.bigint();

      const executionTimeMs = Number(endTime - startTime) / 1_000_000;
      expect(executionTimeMs).toBeLessThan(5); // Should be very fast
    });

    it('should have acceptable overhead when slow query detection is enabled', async () => {
      // Create executor with detection enabled but high threshold
      const enabledExecutor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 10000, // Very high threshold
      });

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        // Immediate response
        callback(null, { rows: [], rowCount: 0 });
      });

      const query = { sql: 'SELECT 1' };

      const startTime = process.hrtime.bigint();
      await enabledExecutor.execute(query);
      const endTime = process.hrtime.bigint();

      const executionTimeMs = Number(endTime - startTime) / 1_000_000;
      expect(executionTimeMs).toBeLessThan(10); // Should still be fast
    });

    it('should measure overhead of EXPLAIN plan retrieval for slow queries', async () => {
      // Create executor with low threshold
      const slowExecutor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 1, // Very low threshold
      });

      let explainCallCount = 0;

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        if (sql.includes('EXPLAIN')) {
          explainCallCount++;
          // EXPLAIN query response
          callback(null, {
            rows: [{ 'QUERY PLAN': 'Seq Scan on test_table' }],
            rowCount: 1
          });
        } else {
          // Main query - make it slow
          setTimeout(() => {
            callback(null, { rows: [], rowCount: 0 });
          }, 10);
        }
      });

      const query = { sql: 'SELECT * FROM test_table' };

      const startTime = process.hrtime.bigint();
      await slowExecutor.execute(query);
      const endTime = process.hrtime.bigint();

      const totalTimeMs = Number(endTime - startTime) / 1_000_000;

      // Should have called EXPLAIN
      expect(explainCallCount).toBe(1);

      // Total time should include main query (10ms) + EXPLAIN overhead
      // EXPLAIN overhead should be minimal (< 5ms additional)
      expect(totalTimeMs).toBeGreaterThan(10);
      expect(totalTimeMs).toBeLessThan(25); // Main query + reasonable overhead
    });
  });

  describe('Memory Usage', () => {
    it('should not accumulate excessive memory with many fast queries', async () => {
      const executor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 1000, // High threshold
      });

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        // Fast queries
        callback(null, { rows: [], rowCount: 0 });
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Execute many fast queries
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(executor.execute({ sql: 'SELECT 1' }));
      }

      await Promise.all(promises);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for 1000 queries)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      // Should not have any slow queries stored
      expect(executor.getSlowQueries().length).toBe(0);
    });

    it('should manage memory efficiently with slow query storage', async () => {
      const executor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 1,
      });

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        if (sql.includes('EXPLAIN')) {
          callback(null, {
            rows: [{ 'QUERY PLAN': 'Seq Scan' }],
            rowCount: 1
          });
        } else {
          // Make queries slow
          setTimeout(() => {
            callback(null, { rows: [], rowCount: 0 });
          }, 10);
        }
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Execute many slow queries
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(executor.execute({ sql: `SELECT * FROM table_${i}` }));
      }

      await Promise.all(promises);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable even with slow queries
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB

      // Should have stored slow queries (up to limit)
      const slowQueries = executor.getSlowQueries();
      expect(slowQueries.length).toBeGreaterThan(0);
      expect(slowQueries.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Concurrent Performance', () => {
    it('should handle concurrent queries without excessive overhead', async () => {
      const executor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 100, // Moderate threshold
      });

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        // Simulate some processing time but not slow enough to trigger detection
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 10);
      });

      const query = { sql: 'SELECT * FROM concurrent_test' };

      const startTime = process.hrtime.bigint();

      // Execute multiple queries concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(executor.execute(query));
      }

      await Promise.all(promises);

      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;

      // Concurrent execution should not take excessively long
      // With 10 concurrent queries each taking ~10ms, total should be reasonable
      expect(totalTimeMs).toBeLessThan(200); // Allow some overhead for concurrency

      // Should not have detected any slow queries (queries are 10ms, threshold is 100ms)
      expect(executor.getSlowQueries().length).toBe(0);
    });
  });

  describe('Metrics Performance', () => {
    it('should not impact performance when emitting metrics', async () => {
      const executor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 1,
      });

      const recordMetricSpy = vi.spyOn(monitoringService, 'recordDatabaseMetric');

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        if (sql.includes('EXPLAIN')) {
          callback(null, {
            rows: [{ 'QUERY PLAN': 'Seq Scan' }],
            rowCount: 1
          });
        } else {
          setTimeout(() => {
            callback(null, { rows: [], rowCount: 0 });
          }, 10);
        }
      });

      const query = { sql: 'SELECT * FROM metrics_test' };

      const startTime = process.hrtime.bigint();
      await executor.execute(query);
      const endTime = process.hrtime.bigint();

      const executionTimeMs = Number(endTime - startTime) / 1_000_000;

      // Metrics should have been recorded
      expect(recordMetricSpy).toHaveBeenCalled();

      // Execution time should still be reasonable
      expect(executionTimeMs).toBeLessThan(50);
    });
  });

  describe('Configuration Performance', () => {
    it('should handle configuration changes efficiently', async () => {
      const executor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 1000,
      });

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        callback(null, { rows: [], rowCount: 0 });
      });

      // Change configuration multiple times
      for (let i = 0; i < 10; i++) {
        executor.updateConfig({
          slowQueryThresholdMs: 100 + i * 10,
        });
        await executor.execute({ sql: 'SELECT 1' });
      }

      // Should not have detected any slow queries
      expect(executor.getSlowQueries().length).toBe(0);
    });
  });
});