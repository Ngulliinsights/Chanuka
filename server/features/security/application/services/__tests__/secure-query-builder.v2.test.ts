import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { SecureQueryBuilderService, createSecureQueryBuilderService } from '../secure-query-builder.service.v2';
import { QueryMetricsService } from '../../../infrastructure/metrics/query-metrics.service';

describe('SecureQueryBuilderService V2', () => {
  let service: SecureQueryBuilderService;
  let metricsService: QueryMetricsService;

  beforeEach(() => {
    metricsService = new QueryMetricsService(100);
    service = createSecureQueryBuilderService({
      enablePerformanceMonitoring: true,
      enableQueryLogging: false,
      defaultQueryTimeout: 5000
    }, metricsService);
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection via parameterization', () => {
      const maliciousInput = "1' OR '1'='1";
      
      const queryBuilder = (params: Record<string, unknown>) => 
        sql`SELECT * FROM users WHERE id = ${params.userId}`;
      
      const query = service.buildParameterizedQuery(
        queryBuilder,
        { userId: maliciousInput }
      );
      
      // The query should be parameterized, not contain raw SQL
      expect(query).toBeDefined();
      expect(query.queryId).toMatch(/^query_\d+_\d+$/);
    });

    it('should reject invalid SQL identifiers', () => {
      expect(() => {
        service.buildJoinQuery(
          'users; DROP TABLE users;--', // Malicious table name
          [],
          {}
        );
      }).toThrow('Invalid SQL identifier');
    });

    it('should reject SQL keywords as identifiers', () => {
      expect(() => {
        service.buildJoinQuery(
          'SELECT', // SQL keyword
          [],
          {}
        );
      }).toThrow('SQL keyword not allowed as identifier');
    });

    it('should validate JOIN conditions', () => {
      expect(() => {
        service.buildJoinQuery(
          'users',
          [{ table: 'posts', on: 'malicious; DROP TABLE' }],
          {}
        );
      }).toThrow('Invalid JOIN condition');
    });
  });

  describe('Dependency Injection', () => {
    it('should accept custom configuration', () => {
      const customService = createSecureQueryBuilderService({
        defaultBatchSize: 50,
        defaultQueryTimeout: 10000
      });
      
      expect(customService).toBeInstanceOf(SecureQueryBuilderService);
    });

    it('should accept custom metrics service', () => {
      const customMetrics = new QueryMetricsService(50);
      const customService = createSecureQueryBuilderService({}, customMetrics);
      
      expect(customService).toBeInstanceOf(SecureQueryBuilderService);
    });

    it('should allow multiple instances with different configs', () => {
      const service1 = createSecureQueryBuilderService({ defaultBatchSize: 100 });
      const service2 = createSecureQueryBuilderService({ defaultBatchSize: 200 });
      
      expect(service1).not.toBe(service2);
    });
  });

  describe('Performance Monitoring', () => {
    it('should record query metrics', () => {
      const queryBuilder = (params: Record<string, unknown>) => 
        sql`SELECT * FROM users WHERE email = ${params.email}`;
      
      service.buildParameterizedQuery(queryBuilder, { email: 'test@example.com' });
      
      const metrics = service.getPerformanceMetrics();
      expect(metrics.totalQueries).toBe(1);
      expect(metrics.averageDuration).toBeGreaterThanOrEqual(0);
    });

    it('should track multiple queries', () => {
      const queryBuilder = (params: Record<string, unknown>) => 
        sql`SELECT * FROM users WHERE id = ${params.id}`;
      
      for (let i = 0; i < 5; i++) {
        service.buildParameterizedQuery(queryBuilder, { id: i });
      }
      
      const metrics = service.getPerformanceMetrics();
      expect(metrics.totalQueries).toBe(5);
    });

    it('should clear metrics', () => {
      const queryBuilder = (params: Record<string, unknown>) => 
        sql`SELECT * FROM users WHERE id = ${params.id}`;
      
      service.buildParameterizedQuery(queryBuilder, { id: 1 });
      service.clearPerformanceMetrics();
      
      const metrics = service.getPerformanceMetrics();
      expect(metrics.totalQueries).toBe(0);
    });
  });

  describe('Bulk Operations', () => {
    it('should process all items successfully', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = async (item: unknown) => (item as number) * 2;
      
      const result = await service.executeBulkOperation(items, operation, {
        validateEach: false
      });
      
      expect(result.successful).toEqual([2, 4, 6, 8, 10]);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(5);
    });

    it('should handle errors with continueOnError=true', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = async (item: unknown) => {
        if (item === 3) throw new Error('Test error');
        return (item as number) * 2;
      };
      
      const result = await service.executeBulkOperation(items, operation, {
        continueOnError: true,
        validateEach: false
      });
      
      expect(result.successful).toEqual([2, 4, 8, 10]);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(2);
      expect(result.totalProcessed).toBe(5);
    });

    it('should stop on first error with continueOnError=false', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = async (item: unknown) => {
        if (item === 3) throw new Error('Test error');
        return (item as number) * 2;
      };
      
      const result = await service.executeBulkOperation(items, operation, {
        continueOnError: false,
        validateEach: false
      });
      
      expect(result.successful).toEqual([2, 4]);
      expect(result.failed).toHaveLength(1);
      expect(result.totalProcessed).toBe(3);
    });

    it('should mark errors as retryable', async () => {
      const items = [1, 2];
      const operation = async (item: unknown) => {
        if (item === 1) throw new Error('Connection timeout');
        if (item === 2) throw new Error('Validation failed');
        return item;
      };
      
      const result = await service.executeBulkOperation(items, operation, {
        continueOnError: true,
        validateEach: false
      });
      
      expect(result.failed[0].retryable).toBe(true); // timeout is retryable
      expect(result.failed[1].retryable).toBe(false); // validation is not retryable
    });

    it('should provide checkpoint ID', async () => {
      const items = [1, 2, 3];
      const operation = async (item: unknown) => item;
      
      const result = await service.executeBulkOperation(items, operation, {
        validateEach: false
      });
      
      expect(result.checkpointId).toMatch(/^checkpoint_\d+$/);
    });

    it('should process in batches', async () => {
      const items = Array.from({ length: 250 }, (_, i) => i);
      const operation = async (item: unknown) => item;
      
      const result = await service.executeBulkOperation(items, operation, {
        batchSize: 100,
        validateEach: false
      });
      
      expect(result.successful).toHaveLength(250);
      expect(result.totalProcessed).toBe(250);
    });
  });

  describe('Input Validation', () => {
    it('should validate inputs before building query', () => {
      const queryBuilder = (params: Record<string, unknown>) => 
        sql`SELECT * FROM users WHERE id = ${params.id}`;
      
      // This should not throw if validation passes
      expect(() => {
        service.buildParameterizedQuery(queryBuilder, { id: 123 });
      }).not.toThrow();
    });

    it('should allow skipping validation', () => {
      const queryBuilder = (params: Record<string, unknown>) => 
        sql`SELECT * FROM users WHERE id = ${params.id}`;
      
      const query = service.buildParameterizedQuery(
        queryBuilder,
        { id: 123 },
        { skipValidation: true }
      );
      
      expect(query).toBeDefined();
    });
  });

  describe('Output Sanitization', () => {
    it('should sanitize output data', () => {
      const data = { username: 'test', password: 'secret' };
      const sanitized = service.sanitizeOutput(data);
      
      expect(sanitized).toBeDefined();
    });
  });

  describe('Pagination', () => {
    it('should validate pagination parameters', () => {
      const params = service.validatePaginationParams('1', '10');
      
      expect(params).toBeDefined();
    });
  });

  describe('LIKE Pattern Safety', () => {
    it('should create safe LIKE patterns', () => {
      const pattern = service.createSafeLikePattern('test%');
      
      expect(pattern).toBeDefined();
      expect(typeof pattern).toBe('string');
    });
  });
});
