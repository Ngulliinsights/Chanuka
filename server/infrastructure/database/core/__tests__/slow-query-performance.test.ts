import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { QueryExecutor, QueryResult } from '../query-executor';
import { getMonitoringService, resetMonitoringService } from '../../../monitoring/monitoring';
import { connectionManager } from '../connection-manager';
import type { PoolClient } from 'pg';

// Mock the connection manager
jest.mock('../connection-manager', () => ({
  connectionManager: {
    acquireConnection: jest.fn(),
    releaseConnection: jest.fn(),
  },
}));

// Mock the logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// --- Performance & Test Constants ---
const PERF_OVERHEAD_THRESHOLD_DISABLED_MS = 5;
const PERF_OVERHEAD_THRESHOLD_ENABLED_MS = 10;
const MOCK_QUERY_DELAY_MS = 10;
const NUM_FAST_QUERIES = 1000;
const NUM_SLOW_QUERIES = 100;
const NUM_CONCURRENT_QUERIES = 10;
const MEMORY_LIMIT_MB_FAST_QUERIES = 10;
const MEMORY_LIMIT_MB_SLOW_QUERIES = 50;

/**
 * Helper to create a versatile mock query implementation for testing various scenarios.
 * @param options - Configuration for the mock query's behavior.
 * @returns A Jest mock function simulating `pg.Client.query`.
 */
const createMockQuery = (options: { delayMs?: number; withExplain?: boolean } = {}) => {
  const { delayMs = 0, withExplain = false } = options;
  return jest.fn((sql: string, params: any[], callback: (err: Error | null, result: any) => void) => {
    if (withExplain && sql.toUpperCase().startsWith('EXPLAIN')) {
      return callback(null, { rows: [{ 'QUERY PLAN': 'Seq Scan' }], rowCount: 1 });
    }

    if (delayMs > 0) {
      setTimeout(() => callback(null, { rows: [], rowCount: 0 }), delayMs);
    } else {
      // Use setImmediate to simulate async I/O without a real-time delay.
      setImmediate(() => callback(null, { rows: [], rowCount: 0 }));
    }
  });
};

/**
 * Helper to measure the execution time of an async action.
 * @param action - The async function to measure.
 * @returns The execution time in milliseconds.
 */
const measureExecutionTime = async (action: () => Promise<any>): Promise<number> => {
  const startTime = process.hrtime.bigint();
  await action();
  const endTime = process.hrtime.bigint();
  return Number(endTime - startTime) / 1_000_000;
};

// Define the specific type for the mock query function to resolve type errors.
type MockQueryFn = (
  sql: string,
  params: any[],
  callback: (err: Error | null, result: any) => void
) => void;

describe('Slow Query Performance Tests', () => {
  // Use the specific mock function type for mockClient.query.
  let mockClient: { query: jest.Mock<MockQueryFn> };
  let monitoringService: any;

  beforeEach(() => {
    resetMonitoringService();
    monitoringService = getMonitoringService();

    mockClient = {
      query: jest.fn(),
    };

    // Use jest.mocked for type-safe mock resolution
    jest.mocked(connectionManager.acquireConnection).mockResolvedValue(mockClient as any as PoolClient);
    jest.mocked(connectionManager.releaseConnection).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Ensures timers from mock implementations are cleared to prevent open handles.
    jest.clearAllTimers();
  });

  describe('Overhead Measurement', () => {
    it('should have minimal overhead when slow query detection is disabled', async () => {
      const disabledExecutor = new QueryExecutor({ enableSlowQueryDetection: false });
      mockClient.query = createMockQuery();

      const executionTimeMs = await measureExecutionTime(() =>
        disabledExecutor.execute({ sql: 'SELECT 1' })
      );

      expect(executionTimeMs).toBeLessThan(PERF_OVERHEAD_THRESHOLD_DISABLED_MS);
    });

    it('should have acceptable overhead when slow query detection is enabled for fast queries', async () => {
      const enabledExecutor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 10000, // High threshold ensures no detection
      });
      mockClient.query = createMockQuery();

      const executionTimeMs = await measureExecutionTime(() =>
        enabledExecutor.execute({ sql: 'SELECT 1' })
      );

      expect(executionTimeMs).toBeLessThan(PERF_OVERHEAD_THRESHOLD_ENABLED_MS);
    });

    it('should measure the overhead of running EXPLAIN for a slow query', async () => {
      const slowExecutor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 1, // Low threshold to trigger detection
      });
      mockClient.query = createMockQuery({ delayMs: MOCK_QUERY_DELAY_MS, withExplain: true });

      const totalTimeMs = await measureExecutionTime(() =>
        slowExecutor.execute({ sql: 'SELECT * FROM test_table' })
      );

      // Verify EXPLAIN was called as part of the slow query logic
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(/^EXPLAIN/i),
        expect.any(Array),
        expect.any(Function)
      );

      // Total time should include the original query delay plus minimal overhead for EXPLAIN
      expect(totalTimeMs).toBeGreaterThan(MOCK_QUERY_DELAY_MS);
      expect(totalTimeMs).toBeLessThan(MOCK_QUERY_DELAY_MS + 20); // Allow reasonable overhead
    });
  });

  describe('Memory Usage', () => {
    it('should not accumulate excessive memory with many fast queries', async () => {
      const executor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 1000,
      });
      mockClient.query = createMockQuery();

      const initialMemory = process.memoryUsage().heapUsed;

      const promises = Array.from({ length: NUM_FAST_QUERIES }, () =>
        executor.execute({ sql: 'SELECT 1' })
      );
      await Promise.all(promises);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(MEMORY_LIMIT_MB_FAST_QUERIES * 1024 * 1024);
      expect(executor.getSlowQueries()).toHaveLength(0);
    });

    it('should manage memory efficiently when storing many slow queries', async () => {
      const executor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 1,
      });
      mockClient.query = createMockQuery({ delayMs: MOCK_QUERY_DELAY_MS, withExplain: true });

      const initialMemory = process.memoryUsage().heapUsed;

      const promises = Array.from({ length: NUM_SLOW_QUERIES }, (_, i) =>
        executor.execute({ sql: `SELECT * FROM table_${i}` })
      );
      await Promise.all(promises);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(MEMORY_LIMIT_MB_SLOW_QUERIES * 1024 * 1024);
      // The number of stored queries should match the number executed (up to the internal limit)
      expect(executor.getSlowQueries()).toHaveLength(NUM_SLOW_QUERIES);
    });
  });

  describe('Concurrent Performance', () => {
    it('should handle concurrent queries without excessive overhead', async () => {
      const executor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 100,
      });
      mockClient.query = createMockQuery({ delayMs: MOCK_QUERY_DELAY_MS });

      const promises = Array.from({ length: NUM_CONCURRENT_QUERIES }, () =>
        executor.execute({ sql: 'SELECT * FROM concurrent_test' })
      );

      const totalTimeMs = await measureExecutionTime(() => Promise.all(promises));

      // 10 concurrent queries each taking ~10ms should complete quickly.
      expect(totalTimeMs).toBeLessThan(200);
      expect(executor.getSlowQueries()).toHaveLength(0);
    });
  });

  describe('Metrics Performance', () => {
    it('should not add significant overhead when emitting metrics', async () => {
      const executor = new QueryExecutor({
        enableSlowQueryDetection: true,
        slowQueryThresholdMs: 1,
      });
      const recordMetricSpy = jest.spyOn(monitoringService, 'recordDatabaseMetric');
      mockClient.query = createMockQuery({ delayMs: MOCK_QUERY_DELAY_MS, withExplain: true });

      const executionTimeMs = await measureExecutionTime(() =>
        executor.execute({ sql: 'SELECT * FROM metrics_test' })
      );

      expect(recordMetricSpy).toHaveBeenCalled();
      expect(executionTimeMs).toBeLessThan(50); // Should remain fast
    });
  });

  describe('Configuration Performance', () => {
    it('should handle dynamic configuration updates efficiently', async () => {
        const executor = new QueryExecutor({
            enableSlowQueryDetection: true,
            slowQueryThresholdMs: 1000,
        });
        mockClient.query = createMockQuery();

        const action = async () => {
            for (let i = 0; i < 10; i++) {
                executor.updateConfig({ slowQueryThresholdMs: 100 + i * 10 });
                await executor.execute({ sql: 'SELECT 1' });
            }
        };

        // We measure the total time to ensure it's not prohibitively slow.
        const totalTimeMs = await measureExecutionTime(action);
        
        expect(totalTimeMs).toBeLessThan(100);
        expect(executor.getSlowQueries()).toHaveLength(0);
    });
  });
});