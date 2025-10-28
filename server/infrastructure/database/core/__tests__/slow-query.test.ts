import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { QueryExecutor } from '../query-executor';
import { getMonitoringService, resetMonitoringService } from '../../../monitoring/monitoring';
import { connectionManager } from '../connection-manager';
import type { PoolClient } from 'pg';

vi.mock('../connection-manager', () => ({
  connectionManager: {
    acquireConnection: vi.fn(),
    releaseConnection: vi.fn(),
  },
}));

vi.mock('../../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Slow Query Detection', () => {
  const SLOW_QUERY_THRESHOLD_MS = 100;
  const FAST_QUERY_DELAY_MS = 50;
  const SLOW_QUERY_DELAY_MS = 150;
  const TEST_SQL = 'SELECT * FROM test_table';
  const TEST_CONTEXT = 'test-context';

  let queryExecutor: QueryExecutor;
  let mockClient: { query: vi.MockedFunction<(...args: any[]) => void> };
  let monitoringService: any;

  /**
   * Creates a mock query function that works with callback-style pg queries and fake timers.
   * 
   * The key to making this work with fake timers is understanding the flow:
   * 1. The query method is called with a callback as the last argument
   * 2. We schedule the callback to run after a specific delay using setTimeout
   * 3. The test controls when that setTimeout fires by advancing fake timers
   * 4. We return undefined immediately (callback-style queries don't return anything)
   * 
   * The critical difference from the previous version: we DON'T use the delayMs parameter
   * to actually delay execution. Instead, the QueryExecutor's internal timing mechanism
   * will measure how long the query takes based on when we advance the fake timers.
   */
  const createMockQuery = (delayMs: number = 0): vi.MockedFunction<(...args: any[]) => void> => {
    return vi.fn((...args: any[]): void => {
      // The last argument is always the callback in callback-style queries
      const callback = args[args.length - 1] as (err: Error | null, result: any) => void;
      
      // Schedule the callback to execute, but don't actually wait
      // The test will control when this fires by advancing timers
      setTimeout(() => {
        callback(null, { rows: [], rowCount: 0 });
      }, delayMs);
      
      // Callback-style query methods return void, not a Promise
      return undefined;
    }) as vi.MockedFunction<(...args: any[]) => void>;
  };

  /**
   * Helper function to advance time and flush all pending promises.
   * 
   * This is the secret sauce that prevents infinite timer loops:
   * - advanceTimersByTime moves the clock forward by a specific amount
   * - We then flush microtasks (promise callbacks) that were triggered
   * - Finally, we run only the timers that are currently pending (not future ones)
   * 
   * This gives us surgical control over time advancement without falling into
   * the trap of trying to exhaust all timers recursively.
   */
  const advanceTimersByTime = async (ms: number): Promise<void> => {
    // Move the fake timer clock forward
    vi.advanceTimersByTime(ms);
    
    // Flush any promise callbacks that were triggered by the timer advancement
    await Promise.resolve();
    
    // Run any timers that are now ready to fire (but not recursively)
    await vi.runOnlyPendingTimersAsync();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    resetMonitoringService();
    monitoringService = getMonitoringService();

    // Initialize the mock client with a default query implementation
    mockClient = {
      query: vi.fn(),
    };

    vi.mocked(connectionManager.acquireConnection).mockResolvedValue(mockClient as any as PoolClient);
    vi.mocked(connectionManager.releaseConnection).mockResolvedValue(undefined);

    queryExecutor = new QueryExecutor({
      slowQueryThresholdMs: SLOW_QUERY_THRESHOLD_MS,
      enableSlowQueryDetection: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Threshold Detection', () => {
    it('should detect queries exceeding the threshold', async () => {
      // Mock the query to complete after SLOW_QUERY_DELAY_MS milliseconds
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);
      const query = { sql: TEST_SQL, context: TEST_CONTEXT };

      // Start the query execution (this returns a Promise but doesn't block)
      const executionPromise = queryExecutor.execute(query);

      // Advance time past the slow query threshold
      // This allows the QueryExecutor's internal timing mechanism to detect it as slow
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      
      // Wait for the execution to complete
      await executionPromise;

      const slowQueries = queryExecutor.getSlowQueries();

      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].executionTimeMs).toBeGreaterThanOrEqual(SLOW_QUERY_THRESHOLD_MS);
      expect(slowQueries[0].sql).toBe(query.sql);
      expect(slowQueries[0].context).toBe(query.context);
    });

    it('should not detect queries below the threshold', async () => {
      // Mock the query to complete quickly
      mockClient.query = createMockQuery(FAST_QUERY_DELAY_MS);
      const query = { sql: TEST_SQL, context: TEST_CONTEXT };

      const executionPromise = queryExecutor.execute(query);
      
      // Advance time, but not enough to cross the slow query threshold
      await advanceTimersByTime(FAST_QUERY_DELAY_MS + 10);
      await executionPromise;

      expect(queryExecutor.getSlowQueries()).toHaveLength(0);
    });

    it('should respect disabled slow query detection', async () => {
      // Create an executor with detection disabled
      const disabledExecutor = new QueryExecutor({
        slowQueryThresholdMs: 10,
        enableSlowQueryDetection: false,
      });

      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);
      const executionPromise = disabledExecutor.execute({ sql: TEST_SQL, context: TEST_CONTEXT });

      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await executionPromise;

      // Even though the query was slow, it shouldn't be recorded
      expect(disabledExecutor.getSlowQueries()).toHaveLength(0);
    });
  });

  describe('Query Type Classification', () => {
    /**
     * Helper function to test that different SQL query types are classified correctly.
     * This verifies that the QueryExecutor can identify SELECT, INSERT, UPDATE, DELETE, etc.
     */
    const testQueryType = async (sql: string, expectedKeyword: string): Promise<void> => {
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      const executionPromise = queryExecutor.execute({ sql });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await executionPromise;

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].sql).toContain(expectedKeyword);
    };

    it('should classify SELECT queries correctly', async () => {
      await testQueryType('SELECT * FROM users', 'SELECT');
    });

    it('should classify INSERT queries correctly', async () => {
      await testQueryType('INSERT INTO users (name) VALUES ($1)', 'INSERT');
    });

    it('should classify UPDATE queries correctly', async () => {
      await testQueryType('UPDATE users SET name = $1 WHERE id = $2', 'UPDATE');
    });

    it('should classify DELETE queries correctly', async () => {
      await testQueryType('DELETE FROM users WHERE id = $1', 'DELETE');
    });
  });

  describe('Stack Trace Capture', () => {
    it('should capture a stack trace for slow queries', async () => {
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      const executionPromise = queryExecutor.execute({ sql: TEST_SQL });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await executionPromise;

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries).toHaveLength(1);

      // Verify that a stack trace was captured
      const { stackTrace } = slowQueries[0];
      expect(stackTrace).toBeDefined();
      expect(typeof stackTrace).toBe('string');
      expect(stackTrace!.length).toBeGreaterThan(0);
    });

    it('should not capture stack trace when detection is disabled', async () => {
      const disabledExecutor = new QueryExecutor({
        slowQueryThresholdMs: SLOW_QUERY_THRESHOLD_MS,
        enableSlowQueryDetection: false,
      });

      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      const executionPromise = disabledExecutor.execute({ sql: TEST_SQL });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await executionPromise;

      // When detection is disabled, no slow queries should be recorded at all
      expect(disabledExecutor.getSlowQueries()).toHaveLength(0);
    });
  });

  describe('Metrics Emission', () => {
    it('should emit metrics for slow queries', async () => {
      const recordMetricSpy = vi.spyOn(monitoringService, 'recordDatabaseMetric');
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      const executionPromise = queryExecutor.execute({ sql: 'SELECT * FROM users' });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await executionPromise;

      // Verify that the monitoring service was called with the correct metric
      expect(recordMetricSpy).toHaveBeenCalledWith(
        'slow_query.select',
        1,
        expect.objectContaining({
          executionTimeMs: expect.any(Number),
          threshold: SLOW_QUERY_THRESHOLD_MS,
        })
      );
    });

    it('should emit correct metric names for different query types', async () => {
      const recordMetricSpy = vi.spyOn(monitoringService, 'recordDatabaseMetric');
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      const executionPromise = queryExecutor.execute({ sql: 'INSERT INTO users (name) VALUES ($1)' });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await executionPromise;

      // Verify that INSERT queries get a different metric name than SELECT queries
      expect(recordMetricSpy).toHaveBeenCalledWith(
        'slow_query.insert',
        1,
        expect.any(Object)
      );
    });
  });

  describe('Slow Query Storage', () => {
    it('should store multiple slow queries', async () => {
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      // Execute three queries sequentially, advancing timers for each
      const p1 = queryExecutor.execute({ sql: 'SELECT * FROM table1' });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await p1;

      const p2 = queryExecutor.execute({ sql: 'SELECT * FROM table2' });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await p2;

      const p3 = queryExecutor.execute({ sql: 'SELECT * FROM table3' });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await p3;

      const slowQueries = queryExecutor.getSlowQueries();

      // All three queries should be recorded
      expect(slowQueries).toHaveLength(3);
      expect(slowQueries[0].sql).toBe('SELECT * FROM table1');
      expect(slowQueries[1].sql).toBe('SELECT * FROM table2');
      expect(slowQueries[2].sql).toBe('SELECT * FROM table3');
    });

    it('should maintain chronological order of slow queries', async () => {
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      // Execute queries in a specific order
      const p1 = queryExecutor.execute({ sql: 'SELECT 1' });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await p1;

      const p2 = queryExecutor.execute({ sql: 'SELECT 2' });
      await advanceTimersByTime(SLOW_QUERY_DELAY_MS + 10);
      await p2;

      const slowQueries = queryExecutor.getSlowQueries();

      // Verify that the queries are stored in the order they were executed
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries[0].sql).toBe('SELECT 1');
      expect(slowQueries[1].sql).toBe('SELECT 2');
    });

    it('should clear slow queries when requested', () => {
      // Directly populate the slow queries array to test the clear functionality
      // This bypasses the need to execute actual queries for this specific test
      (queryExecutor as any)['slowQueries'] = [
        {
          queryId: '1',
          sql: 'SELECT 1',
          executionTimeMs: 120,
          stackTrace: 'test stack',
          timestamp: new Date().toISOString()
        },
        {
          queryId: '2',
          sql: 'SELECT 2',
          executionTimeMs: 200,
          stackTrace: 'test stack',
          timestamp: new Date().toISOString()
        },
      ];

      expect(queryExecutor.getSlowQueries()).toHaveLength(2);

      queryExecutor.clearSlowQueries();

      expect(queryExecutor.getSlowQueries()).toHaveLength(0);
    });

    it('should handle clearing an already empty list without errors', () => {
      // Verify initial state is empty
      expect(queryExecutor.getSlowQueries()).toHaveLength(0);

      // Clearing an empty list should not throw an error
      expect(() => queryExecutor.clearSlowQueries()).not.toThrow();

      // State should remain empty
      expect(queryExecutor.getSlowQueries()).toHaveLength(0);
    });
  });
});





































