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

describe('Slow Query Integration Tests', () => {
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

    // Create query executor with low threshold for testing
    queryExecutor = new QueryExecutor({
      slowQueryThresholdMs: 10,
      enableSlowQueryDetection: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('EXPLAIN Plan Retrieval', () => {
    it('should retrieve EXPLAIN plan for slow queries', async () => {
      // Mock the main query to be slow
      mockClient.query.mockImplementationOnce((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      // Mock the EXPLAIN query to return a plan
      mockClient.query.mockImplementationOnce((sql: string, params: any[], callback: Function) => {
        if (sql.includes('EXPLAIN')) {
          callback(null, {
            rows: [
              { 'QUERY PLAN': 'Seq Scan on users  (cost=0.00..10.00 rows=1000 width=32)' },
              { 'QUERY PLAN': '  Filter: (age > 18)' }
            ],
            rowCount: 2
          });
        }
      });

      const query = { sql: 'SELECT * FROM users WHERE age > 18' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].explainPlan).toBeDefined();
      expect(slowQueries[0].explainPlan).toContain('Seq Scan on users');
      expect(slowQueries[0].explainPlan).toContain('Filter: (age > 18)');
    });

    it('should handle EXPLAIN plan retrieval failures gracefully', async () => {
      // Mock the main query to be slow
      mockClient.query.mockImplementationOnce((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      // Mock the EXPLAIN query to fail
      mockClient.query.mockImplementationOnce((sql: string, params: any[], callback: Function) => {
        if (sql.includes('EXPLAIN')) {
          callback(new Error('EXPLAIN failed'), null);
        }
      });

      const query = { sql: 'SELECT * FROM users' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].explainPlan).toBeUndefined();
    });
  });

  describe('Parameter Sanitization in Logs', () => {
    it('should sanitize sensitive parameters in slow query logs', async () => {
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      const query = {
        sql: 'SELECT * FROM users WHERE email = $1 AND password = $2',
        params: ['user@example.com', 'secret123']
      };

      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].params).toEqual(['user@example.com', '[REDACTED]']);
    });
  });

  describe('Logging Integration', () => {
    it('should log slow queries with full details', async () => {
      const loggerWarnSpy = vi.spyOn(require('../../../../utils/logger').logger, 'warn');

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      const query = {
        sql: 'SELECT * FROM complex_table WHERE condition = $1',
        params: ['test-value'],
        context: 'user-search'
      };

      await queryExecutor.execute(query);

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
    });

    it('should include EXPLAIN plan in logs when available', async () => {
      const loggerWarnSpy = vi.spyOn(require('../../../../utils/logger').logger, 'warn');

      // Mock main query
      mockClient.query.mockImplementationOnce((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      // Mock EXPLAIN query
      mockClient.query.mockImplementationOnce((sql: string, params: any[], callback: Function) => {
        if (sql.includes('EXPLAIN')) {
          callback(null, {
            rows: [{ 'QUERY PLAN': 'Index Scan using idx_users_email on users' }],
            rowCount: 1
          });
        }
      });

      const query = { sql: 'SELECT * FROM users WHERE email = $1', params: ['test@example.com'] };
      await queryExecutor.execute(query);

      const callArgs = loggerWarnSpy.mock.calls[0][1];
      expect(callArgs.explainPlan).toContain('Index Scan using idx_users_email');
    });
  });

  describe('Transaction Context', () => {
    it('should detect slow queries in transaction context', async () => {
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      const query = { sql: 'UPDATE users SET last_login = NOW() WHERE id = $1', params: [123] };

      // Simulate transaction context
      await queryExecutor.transaction(async (txContext) => {
        return await queryExecutor['executeSingleQuery'](query, txContext);
      });

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].sql).toContain('UPDATE');
    });
  });

  describe('Retry Scenarios', () => {
    it('should detect slow queries even after retries', async () => {
      let attemptCount = 0;

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        attemptCount++;
        if (attemptCount === 1) {
          // First attempt fails
          callback(new Error('Connection timeout'), null);
        } else {
          // Second attempt succeeds but is slow
          setTimeout(() => {
            callback(null, { rows: [], rowCount: 0 });
          }, 50);
        }
      });

      const query = { sql: 'SELECT * FROM unreliable_table' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].sql).toBe(query.sql);
    });
  });

  describe('Memory Management', () => {
    it('should maintain reasonable memory usage with many slow queries', async () => {
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      // Generate many slow queries
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(queryExecutor.execute({ sql: `SELECT * FROM table_${i}` }));
      }

      await Promise.all(promises);

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(50);

      // Verify memory management - should not keep unlimited history
      // (In real implementation, this would be limited to 1000)
      expect(slowQueries.length).toBeLessThanOrEqual(1000);
    });
  });
});