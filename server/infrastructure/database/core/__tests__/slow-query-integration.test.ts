import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryExecutor } from '../query-executor';
import { getMonitoringService, resetMonitoringService } from '../../../monitoring/monitoring';
import { connectionManager } from '../connection-manager';
import { logger } from '@shared/core';

// Mock the connection manager with explicit typing for better type safety
vi.mock('../connection-manager', () => ({
  connectionManager: {
    acquireConnection: vi.fn(),
    releaseConnection: vi.fn(),
  },
}));

// Mock the logger to prevent console noise and enable verification
vi.mock('../../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Slow Query Integration Tests', () => {
  let queryExecutor: QueryExecutor;
  let mockClient: any;
  let monitoringService: any;

  // Helper function to create a slow query mock with configurable delay
  // This standardizes how we simulate database query execution across tests
  const createSlowQueryMock = (delayMs: number = 50) => {
    return vi.fn((sql: string, params: any[], callback: Function) => {
      setTimeout(() => {
        callback(null, { rows: [], rowCount: 0 });
      }, delayMs);
    });
  };

  // Helper to create an EXPLAIN plan mock that returns realistic query plan data
  // This simulates PostgreSQL's EXPLAIN output structure
  const createExplainPlanMock = (planLines: string[]) => {
    return vi.fn((sql: string, params: any[], callback: Function) => {
      if (sql.includes('EXPLAIN')) {
        callback(null, {
          rows: planLines.map(line => ({ 'QUERY PLAN': line })),
          rowCount: planLines.length
        });
      } else {
        callback(new Error('Unexpected query'), null);
      }
    });
  };

  beforeEach(() => {
    // Reset monitoring service to ensure complete test isolation
    // This prevents state leakage between test cases
    resetMonitoringService();
    monitoringService = getMonitoringService();

    // Create a fresh mock client for each test to avoid pollution
    mockClient = {
      query: vi.fn(),
    };

    // Setup connection manager mocks with proper type safety
    vi.mocked(connectionManager.acquireConnection).mockResolvedValue(mockClient);
    vi.mocked(connectionManager.releaseConnection).mockResolvedValue(undefined);

    // Create query executor with a low threshold to make tests fast and reliable
    // The 10ms threshold ensures we can easily trigger slow query detection
    queryExecutor = new QueryExecutor({
      slowQueryThresholdMs: 10,
      enableSlowQueryDetection: true,
    });
  });

  afterEach(() => {
    // Clear all mocks to ensure no state carries over between tests
    vi.clearAllMocks();
  });

  describe('EXPLAIN Plan Retrieval', () => {
    it('should retrieve EXPLAIN plan for slow queries', async () => {
      // Setup a sequence of mock responses: first the slow query, then the EXPLAIN
      // This simulates the real behavior where we execute the query then fetch its plan
      mockClient.query
        .mockImplementationOnce(createSlowQueryMock(50))
        .mockImplementationOnce(createExplainPlanMock([
          'Seq Scan on users  (cost=0.00..10.00 rows=1000 width=32)',
          '  Filter: (age > 18)'
        ]));

      const query = { sql: 'SELECT * FROM users WHERE age > 18' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      
      // Verify the EXPLAIN plan was captured and contains expected details
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].explainPlan).toBeDefined();
      expect(slowQueries[0].explainPlan).toContain('Seq Scan on users');
      expect(slowQueries[0].explainPlan).toContain('Filter: (age > 18)');
    });

    it('should handle EXPLAIN plan retrieval failures gracefully', async () => {
      // Test resilience: the main query succeeds but EXPLAIN fails
      // The system should still record the slow query without the plan
      mockClient.query
        .mockImplementationOnce(createSlowQueryMock(50))
        .mockImplementationOnce((sql: string, params: any[], callback: Function) => {
          if (sql.includes('EXPLAIN')) {
            callback(new Error('EXPLAIN failed'), null);
          }
        });

      const query = { sql: 'SELECT * FROM users' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      
      // Verify the slow query was recorded despite EXPLAIN failure
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].explainPlan).toBeUndefined();
      expect(slowQueries[0].sql).toBe(query.sql);
    });

    it('should handle complex multi-line EXPLAIN plans', async () => {
      // Test with a realistic, complex query plan to ensure proper handling
      const complexPlan = [
        'Hash Join  (cost=10.00..100.00 rows=500 width=64)',
        '  Hash Cond: (users.id = orders.user_id)',
        '  ->  Seq Scan on users  (cost=0.00..10.00 rows=1000 width=32)',
        '  ->  Hash  (cost=20.00..20.00 rows=100 width=32)',
        '        ->  Index Scan using orders_date_idx on orders  (cost=0.00..20.00 rows=100 width=32)'
      ];

      mockClient.query
        .mockImplementationOnce(createSlowQueryMock(50))
        .mockImplementationOnce(createExplainPlanMock(complexPlan));

      const query = { sql: 'SELECT * FROM users JOIN orders ON users.id = orders.user_id' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries[0].explainPlan).toContain('Hash Join');
      expect(slowQueries[0].explainPlan).toContain('Index Scan using orders_date_idx');
    });
  });

  describe('Parameter Sanitization in Logs', () => {
    it('should sanitize sensitive parameters in slow query logs', async () => {
      mockClient.query = createSlowQueryMock(50);

      const query = {
        sql: 'SELECT * FROM users WHERE email = $1 AND password = $2',
        params: ['user@example.com', 'secret123']
      };

      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      
      // Verify that sensitive parameters are redacted while safe ones remain visible
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].params).toEqual(['user@example.com', '[REDACTED]']);
    });

    it('should handle queries with no parameters', async () => {
      mockClient.query = createSlowQueryMock(50);

      const query = { sql: 'SELECT * FROM users' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      
      // Verify the system handles missing parameters gracefully
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].params).toBeUndefined();
    });

    it('should sanitize multiple sensitive parameters', async () => {
      mockClient.query = createSlowQueryMock(50);

      const query = {
        sql: 'UPDATE users SET password = $1, token = $2, api_key = $3 WHERE id = $4',
        params: ['new_pass_123', 'bearer-token-xyz', 'sk-abc123', 42]
      };

      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      
      // All sensitive fields should be redacted, only the ID should remain visible
      expect(slowQueries[0].params).toEqual(['[REDACTED]', '[REDACTED]', '[REDACTED]', 42]);
    });
  });

  describe('Logging Integration', () => {
    it('should log slow queries with full details', async () => {
      const loggerWarnSpy = vi.spyOn(logger, 'warn');

      mockClient.query = createSlowQueryMock(50);

      const query = {
        sql: 'SELECT * FROM complex_table WHERE condition = $1',
        params: ['test-value'],
        context: 'user-search'
      };

      await queryExecutor.execute(query);

      // Verify comprehensive logging with all relevant diagnostic information
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Slow query detected',
        expect.objectContaining({
          component: 'query-executor',
          operation: 'slow-query',
          sql: query.sql,
          sanitizedParams: ['test-value'],
          executionTimeMs: expect.any(Number),
          threshold: 10,
          stackTrace: expect.any(String),
          context: 'user-search',
          queryType: 'select',
        })
      );
      
      // Verify the spy was called at least once before accessing call arguments
      expect(loggerWarnSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should include EXPLAIN plan in logs when available', async () => {
      const loggerWarnSpy = vi.spyOn(logger, 'warn');

      const explainPlan = 'Index Scan using idx_users_email on users  (cost=0.00..8.27 rows=1 width=32)';

      mockClient.query
        .mockImplementationOnce(createSlowQueryMock(50))
        .mockImplementationOnce(createExplainPlanMock([explainPlan]));

      const query = { 
        sql: 'SELECT * FROM users WHERE email = $1', 
        params: ['test@example.com'] 
      };
      
      await queryExecutor.execute(query);

      // Verify that EXPLAIN plan is included in log output for debugging
      // First ensure the logger was called, then safely access the arguments
      expect(loggerWarnSpy).toHaveBeenCalled();
      const logCallArgs = loggerWarnSpy.mock.calls[0]?.[1];
      expect(logCallArgs).toBeDefined();
      expect(logCallArgs?.explainPlan).toContain('Index Scan using idx_users_email');
    });

    it('should log query execution without EXPLAIN when retrieval fails', async () => {
      const loggerWarnSpy = vi.spyOn(logger, 'warn');

      mockClient.query
        .mockImplementationOnce(createSlowQueryMock(50))
        .mockImplementationOnce((sql: string, params: any[], callback: Function) => {
          callback(new Error('EXPLAIN not supported'), null);
        });

      const query = { sql: 'SELECT * FROM users' };
      await queryExecutor.execute(query);

      // Verify logging continues even when EXPLAIN fails
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Slow query detected',
        expect.objectContaining({
          sql: query.sql,
        })
      );
      
      // Safely check that explainPlan is undefined when EXPLAIN fails
      expect(loggerWarnSpy).toHaveBeenCalled();
      const logCallArgs = loggerWarnSpy.mock.calls[0]?.[1];
      expect(logCallArgs).toBeDefined();
      expect(logCallArgs?.explainPlan).toBeUndefined();
    });
  });

  describe('Transaction Context', () => {
    it('should detect slow queries in transaction context', async () => {
      mockClient.query = createSlowQueryMock(50);

      const query = { 
        sql: 'UPDATE users SET last_login = NOW() WHERE id = $1', 
        params: [123] 
      };

      // Simulate executing a query within a transaction boundary
      // This tests that slow query detection works correctly in transaction contexts
      await queryExecutor.transaction(async (txContext) => {
        return await queryExecutor['executeSingleQuery'](query, txContext);
      });

      const slowQueries = queryExecutor.getSlowQueries();
      
      // Verify transaction queries are monitored the same as standalone queries
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].sql).toContain('UPDATE');
      expect(slowQueries[0].params).toEqual([123]);
    });

    it('should track multiple slow queries within a single transaction', async () => {
      mockClient.query = createSlowQueryMock(50);

      // Execute multiple queries in the same transaction to verify all are tracked
      await queryExecutor.transaction(async (txContext) => {
        await queryExecutor['executeSingleQuery']({ sql: 'UPDATE users SET active = true' }, txContext);
        await queryExecutor['executeSingleQuery']({ sql: 'INSERT INTO audit_log (action) VALUES ($1)' }, txContext);
        return { success: true };
      });

      const slowQueries = queryExecutor.getSlowQueries();
      
      // Both queries should be independently tracked as slow
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries[0].sql).toContain('UPDATE');
      expect(slowQueries[1].sql).toContain('INSERT');
    });
  });

  describe('Retry Scenarios', () => {
    it('should detect slow queries even after retries', async () => {
      let attemptCount = 0;

      // Simulate a flaky connection that fails first, then succeeds slowly
      // This tests resilience and ensures slow query detection works after retries
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        attemptCount++;
        if (attemptCount === 1) {
          callback(new Error('Connection timeout'), null);
        } else {
          setTimeout(() => {
            callback(null, { rows: [], rowCount: 0 });
          }, 50);
        }
      });

      const query = { sql: 'SELECT * FROM unreliable_table' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      
      // Only the successful (slow) execution should be recorded
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].sql).toBe(query.sql);
      expect(slowQueries[0].executionTimeMs).toBeGreaterThanOrEqual(10);
    });

    it('should track correct execution time on retry success', async () => {
      let attemptCount = 0;

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        attemptCount++;
        if (attemptCount < 3) {
          // First two attempts fail quickly
          callback(new Error('Transient error'), null);
        } else {
          // Third attempt succeeds but is slow
          setTimeout(() => {
            callback(null, { rows: [], rowCount: 0 });
          }, 50);
        }
      });

      const query = { sql: 'SELECT * FROM retry_test' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      
      // Verify timing reflects the successful attempt, not the failed ones
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].executionTimeMs).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Memory Management', () => {
    it('should maintain reasonable memory usage with many slow queries', async () => {
      mockClient.query = createSlowQueryMock(50);

      // Generate a substantial number of slow queries to test memory handling
      // This simulates a high-load scenario where many queries exceed thresholds
      const queryPromises = Array.from({ length: 50 }, (_, i) => 
        queryExecutor.execute({ sql: `SELECT * FROM table_${i}` })
      );

      await Promise.all(queryPromises);

      const slowQueries = queryExecutor.getSlowQueries();
      
      // All queries should be captured (within the storage limit)
      expect(slowQueries).toHaveLength(50);
      
      // Verify memory management constraints are respected
      // The system should not grow unbounded - 1000 is a reasonable limit
      expect(slowQueries.length).toBeLessThanOrEqual(1000);
    });

    it('should handle rapid concurrent slow queries efficiently', async () => {
      mockClient.query = createSlowQueryMock(50);

      // Fire off many concurrent queries to test race conditions and memory pressure
      const concurrentQueries = Array.from({ length: 100 }, (_, i) => 
        queryExecutor.execute({ 
          sql: `SELECT * FROM concurrent_test_${i}`,
          context: `concurrent-${i}` 
        })
      );

      await Promise.all(concurrentQueries);

      const slowQueries = queryExecutor.getSlowQueries();
      
      // All concurrent queries should be properly tracked
      expect(slowQueries).toHaveLength(100);
      
      // Verify each query has the correct metadata
      slowQueries.forEach((query, index) => {
        expect(query.sql).toContain('concurrent_test_');
        expect(query.executionTimeMs).toBeGreaterThanOrEqual(10);
      });
    });

    it('should clear slow queries without affecting ongoing detection', async () => {
      mockClient.query = createSlowQueryMock(50);

      // Execute some queries, clear history, then execute more
      await queryExecutor.execute({ sql: 'SELECT 1' });
      await queryExecutor.execute({ sql: 'SELECT 2' });
      
      expect(queryExecutor.getSlowQueries()).toHaveLength(2);
      
      queryExecutor.clearSlowQueries();
      
      // After clearing, new slow queries should still be detected
      await queryExecutor.execute({ sql: 'SELECT 3' });
      
      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].sql).toBe('SELECT 3');
    });
  });
});







































