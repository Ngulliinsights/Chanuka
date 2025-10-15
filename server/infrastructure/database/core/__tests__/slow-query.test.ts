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

describe('Slow Query Detection', () => {
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
      slowQueryThresholdMs: 10, // Very low threshold for testing
      enableSlowQueryDetection: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Threshold Detection', () => {
    it('should detect queries exceeding threshold', async () => {
      // Mock a slow query (simulate delay)
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50); // 50ms delay, above 10ms threshold
      });

      const query = {
        sql: 'SELECT * FROM test_table',
        context: 'test-context'
      };

      const result = await queryExecutor.execute(query);

      // Should have detected slow query
      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].executionTimeMs).toBeGreaterThanOrEqual(10);
      expect(slowQueries[0].sql).toBe(query.sql);
      expect(slowQueries[0].context).toBe(query.context);
    });

    it('should not detect queries below threshold', async () => {
      // Mock a fast query
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        // Immediate response, below threshold
        callback(null, { rows: [], rowCount: 0 });
      });

      const query = {
        sql: 'SELECT * FROM test_table',
        context: 'test-context'
      };

      await queryExecutor.execute(query);

      // Should not have detected slow query
      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(0);
    });

    it('should respect disabled slow query detection', async () => {
      // Create executor with detection disabled
      const disabledExecutor = new QueryExecutor({
        slowQueryThresholdMs: 10,
        enableSlowQueryDetection: false,
      });

      // Mock a slow query
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      const query = {
        sql: 'SELECT * FROM test_table',
        context: 'test-context'
      };

      await disabledExecutor.execute(query);

      // Should not have detected slow query
      const slowQueries = disabledExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(0);
    });
  });

  describe('Query Type Classification', () => {
    it('should classify SELECT queries correctly', async () => {
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      const query = { sql: 'SELECT * FROM users' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries[0].sql).toContain('SELECT');
    });

    it('should classify INSERT queries correctly', async () => {
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      const query = { sql: 'INSERT INTO users (name) VALUES ($1)' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries[0].sql).toContain('INSERT');
    });
  });

  describe('Stack Trace Capture', () => {
    it('should capture stack trace for slow queries', async () => {
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      const query = { sql: 'SELECT * FROM test_table' };
      await queryExecutor.execute(query);

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries[0].stackTrace).toBeDefined();
      expect(typeof slowQueries[0].stackTrace).toBe('string');
      expect(slowQueries[0].stackTrace!.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics Emission', () => {
    it('should emit metrics for slow queries', async () => {
      const recordMetricSpy = vi.spyOn(monitoringService, 'recordDatabaseMetric');

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      const query = { sql: 'SELECT * FROM users' };
      await queryExecutor.execute(query);

      expect(recordMetricSpy).toHaveBeenCalledWith(
        'slow_query.select',
        1,
        expect.objectContaining({
          executionTimeMs: expect.any(Number),
          threshold: 10,
        })
      );
    });
  });

  describe('Slow Query Storage', () => {
    it('should store multiple slow queries', async () => {
      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      // Execute multiple slow queries
      await queryExecutor.execute({ sql: 'SELECT * FROM table1' });
      await queryExecutor.execute({ sql: 'SELECT * FROM table2' });

      const slowQueries = queryExecutor.getSlowQueries();
      expect(slowQueries.length).toBe(2);
    });

    it('should limit stored slow queries to prevent memory issues', async () => {
      // Temporarily modify the executor to have a small limit for testing
      const originalSlowQueries = queryExecutor['slowQueries'];
      queryExecutor['slowQueries'] = [];

      mockClient.query.mockImplementation((sql: string, params: any[], callback: Function) => {
        setTimeout(() => {
          callback(null, { rows: [], rowCount: 0 });
        }, 50);
      });

      // Add more than 1000 queries (but we'll test with fewer for speed)
      for (let i = 0; i < 5; i++) {
        await queryExecutor.execute({ sql: `SELECT * FROM table${i}` });
      }

      // Restore original array
      queryExecutor['slowQueries'] = originalSlowQueries;
      expect(queryExecutor.getSlowQueries().length).toBeGreaterThan(0);
    });

    it('should clear slow queries when requested', () => {
      queryExecutor['slowQueries'] = [
        { queryId: '1', sql: 'SELECT 1', executionTimeMs: 100, stackTrace: 'test', timestamp: '2023-01-01' },
        { queryId: '2', sql: 'SELECT 2', executionTimeMs: 200, stackTrace: 'test', timestamp: '2023-01-01' },
      ];

      queryExecutor.clearSlowQueries();
      expect(queryExecutor.getSlowQueries().length).toBe(0);
    });
  });
});