import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { QueryExecutor } from '../query-executor';
import { getMonitoringService, resetMonitoringService } from '../../../monitoring/monitoring';
import { connectionManager } from '../connection-manager';
import type { PoolClient } from 'pg';

// Mock the connection manager with explicit typing for better type safety
jest.mock('../connection-manager', () => ({
  connectionManager: {
    acquireConnection: jest.fn(),
    releaseConnection: jest.fn(),
  },
}));

// Mock the logger to prevent console noise during tests
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Slow Query Detection', () => {
  // Constants improve readability and make threshold adjustments easier across all tests
  const SLOW_QUERY_THRESHOLD_MS = 100;
  const FAST_QUERY_DELAY_MS = 50;
  const SLOW_QUERY_DELAY_MS = 150;
  const TEST_SQL = 'SELECT * FROM test_table';
  const TEST_CONTEXT = 'test-context';

  // FIX 1: Ensure queryExecutor is declared here in the outer scope
  // so it's accessible within all `it` blocks. The "Cannot find name"
  // error suggests this was either deleted or moved by accident.
  let queryExecutor: QueryExecutor;
  let mockClient: { query: jest.MockedFunction<(...args: any[]) => void> };
  let monitoringService: any;

  /**
   * Creates a mock query function that simulates async database operations.
   * With fake timers, the callback is scheduled but won't execute until we advance time.
   * This gives us precise control over timing in tests.
   */
  // FIX 2: Changed the function signature to use rest parameters (...args).
  // This makes the mock's type generic enough to be compatible with Jest's
  // internal 'UnknownFunction' type, resolving the type mismatch error.
  const createMockQuery = (delayMs: number = 0) => {
    return jest.fn((...args: any[]) => {
      // The callback is always the last argument for this pg.Client.query overload
      const callback = args[args.length - 1] as (err: Error | null, result: any) => void;
      setTimeout(() => {
        callback(null, { rows: [], rowCount: 0 });
      }, delayMs);
    });
  };

  beforeEach(() => {
    // Fake timers make tests deterministic, fast, and eliminate flakiness from real time delays
    jest.useFakeTimers();

    // Reset services to ensure complete test isolation
    resetMonitoringService();
    monitoringService = getMonitoringService();

    /**
     * Create a fresh mock client for each test to prevent cross-test contamination.
     * We use Pick<PoolClient, 'query'> to tell TypeScript we're only mocking the 'query' method,
     * which is all our tests need. The type assertion 'as any as PoolClient' tells the connection
     * manager mock that our partial mock is acceptable as a full PoolClient for testing purposes.
     * This is a common pattern in testing where we don't need to mock every property of a complex type.
     */
    mockClient = {
      query: jest.fn(),
    };

    // Setup connection manager mocks with proper typing
    jest.mocked(connectionManager.acquireConnection).mockResolvedValue(mockClient as any as PoolClient);
    jest.mocked(connectionManager.releaseConnection).mockResolvedValue(undefined);

    // Initialize QueryExecutor with consistent test configuration
    queryExecutor = new QueryExecutor({
      slowQueryThresholdMs: SLOW_QUERY_THRESHOLD_MS,
      enableSlowQueryDetection: true,
    });
  });

  afterEach(() => {
    // Restore real timers and clear all mocks to prevent test pollution
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Threshold Detection', () => {
    it('should detect queries exceeding the threshold', async () => {
      // Setup a query that takes 150ms, which exceeds our 100ms threshold
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);
      const query = { sql: TEST_SQL, context: TEST_CONTEXT };

      const executionPromise = queryExecutor.execute(query);

      // Advance fake timers to simulate the passage of time and trigger query completion
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await executionPromise;

      const slowQueries = queryExecutor.getSlowQueries();

      // Verify exactly one slow query was detected with correct attributes
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].executionTimeMs).toBeGreaterThanOrEqual(SLOW_QUERY_THRESHOLD_MS);
      expect(slowQueries[0].sql).toBe(query.sql);
      expect(slowQueries[0].context).toBe(query.context);
    });

    it('should not detect queries below the threshold', async () => {
      // Setup a query that takes 50ms, staying well below our 100ms threshold
      mockClient.query = createMockQuery(FAST_QUERY_DELAY_MS);
      const query = { sql: TEST_SQL, context: TEST_CONTEXT };

      const executionPromise = queryExecutor.execute(query);

      // Advance timers to complete the fast query
      await jest.advanceTimersByTimeAsync(FAST_QUERY_DELAY_MS);
      await executionPromise;

      // No slow queries should be recorded for fast queries
      expect(queryExecutor.getSlowQueries()).toHaveLength(0);
    });

    it('should respect disabled slow query detection', async () => {
      // Create executor with detection disabled and a very low threshold that would normally trigger
      // The low threshold proves the feature is truly disabled, not just having a high threshold
      const disabledExecutor = new QueryExecutor({
        slowQueryThresholdMs: 10,
        enableSlowQueryDetection: false,
      });

      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);
      const executionPromise = disabledExecutor.execute({ sql: TEST_SQL, context: TEST_CONTEXT });

      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await executionPromise;

      // Even with a query far exceeding the threshold, detection should be bypassed
      expect(disabledExecutor.getSlowQueries()).toHaveLength(0);
    });
  });

  describe('Query Type Classification', () => {
    /**
     * Helper function to test query type detection with minimal code duplication.
     * This pattern keeps our tests DRY while maintaining clarity about what each test verifies.
     */
    const testQueryType = async (sql: string, expectedKeyword: string) => {
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      const executionPromise = queryExecutor.execute({ sql });
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
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
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await executionPromise;

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries).toHaveLength(1);

      // Verify stack trace is captured and contains meaningful debugging information
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
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await executionPromise;

      // No slow queries should be recorded when detection is disabled
      expect(disabledExecutor.getSlowQueries()).toHaveLength(0);
    });
  });

  describe('Metrics Emission', () => {
    it('should emit metrics for slow queries', async () => {
      const recordMetricSpy = jest.spyOn(monitoringService, 'recordDatabaseMetric');
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      const executionPromise = queryExecutor.execute({ sql: 'SELECT * FROM users' });
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await executionPromise;

      // Verify metrics were recorded with correct structure and values
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
      const recordMetricSpy = jest.spyOn(monitoringService, 'recordDatabaseMetric');
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      const executionPromise = queryExecutor.execute({ sql: 'INSERT INTO users (name) VALUES ($1)' });
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await executionPromise;

      // Verify metric name correctly reflects the query type for proper categorization
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

      // Execute multiple slow queries sequentially
      const p1 = queryExecutor.execute({ sql: 'SELECT * FROM table1' });
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await p1;

      const p2 = queryExecutor.execute({ sql: 'SELECT * FROM table2' });
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await p2;

      const p3 = queryExecutor.execute({ sql: 'SELECT * FROM table3' });
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await p3;

      const slowQueries = queryExecutor.getSlowQueries();

      // Verify all three queries were captured and stored with correct SQL
      expect(slowQueries).toHaveLength(3);
      expect(slowQueries[0].sql).toBe('SELECT * FROM table1');
      expect(slowQueries[1].sql).toBe('SELECT * FROM table2');
      expect(slowQueries[2].sql).toBe('SELECT * FROM table3');
    });

    it('should maintain chronological order of slow queries', async () => {
      mockClient.query = createMockQuery(SLOW_QUERY_DELAY_MS);

      // Execute queries and verify they are stored in execution order
      const p1 = queryExecutor.execute({ sql: 'SELECT 1' });
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await p1;

      const p2 = queryExecutor.execute({ sql: 'SELECT 2' });
      await jest.advanceTimersByTimeAsync(SLOW_QUERY_DELAY_MS);
      await p2;

      const slowQueries = queryExecutor.getSlowQueries();

      // Chronological ordering is important for debugging query patterns over time
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries[0].sql).toBe('SELECT 1');
      expect(slowQueries[1].sql).toBe('SELECT 2');
    });

    it('should clear slow queries when requested', () => {
      // Manually populate slow queries to test the clearing mechanism
      // Use `as any` to access the private property for testing purposes
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

      // Verify queries exist before clearing
      expect(queryExecutor.getSlowQueries()).toHaveLength(2);

      queryExecutor.clearSlowQueries();

      // Verify all queries were removed
      expect(queryExecutor.getSlowQueries()).toHaveLength(0);
    });

    it('should handle clearing an already empty list without errors', () => {
      // Ensure list starts empty
      expect(queryExecutor.getSlowQueries()).toHaveLength(0);

      // Clearing an empty list should be a safe no-op operation
      expect(() => queryExecutor.clearSlowQueries()).not.toThrow();

      expect(queryExecutor.getSlowQueries()).toHaveLength(0);
    });
  });
});