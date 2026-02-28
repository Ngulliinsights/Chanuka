import { describe, it, expect, beforeEach } from 'vitest';
import { secureQueryBuilderService } from '../application/services/secure-query-builder.service';
import {
  testSQLInjection,
  testQueryParameterization,
  SQL_INJECTION_PATTERNS,
  generateSecurityTestData
} from './test-utilities';

describe('SecureQueryBuilderService', () => {
  beforeEach(() => {
    secureQueryBuilderService.clearPerformanceMetrics();
  });

  describe('buildParameterizedQuery', () => {
    it('should build a valid parameterized query', () => {
      const template = 'SELECT * FROM users WHERE id = ${id}';
      const params = { id: 123 };

      const query = secureQueryBuilderService.buildParameterizedQuery(template, params);

      expect(query).toBeDefined();
      expect(query.queryId).toMatch(/^query_\d+_\d+$/);
    });

    it('should validate inputs before building query', () => {
      const template = 'SELECT * FROM users WHERE name = ${name}';
      const params = { name: "'; DROP TABLE users;--" };

      // Should not throw - sanitization happens in validation
      const query = secureQueryBuilderService.buildParameterizedQuery(template, params);
      expect(query).toBeDefined();
    });

    it('should throw error for missing parameters', () => {
      const template = 'SELECT * FROM users WHERE id = ${id} AND name = ${name}';
      const params = { id: 123 }; // missing 'name'

      expect(() => {
        secureQueryBuilderService.buildParameterizedQuery(template, params);
      }).toThrow('Missing parameter');
    });

    it('should record performance metrics', () => {
      const template = 'SELECT * FROM users WHERE id = ${id}';
      const params = { id: 123 };

      secureQueryBuilderService.buildParameterizedQuery(template, params);

      const metrics = secureQueryBuilderService.getPerformanceMetrics();
      expect(metrics.totalQueries).toBeGreaterThan(0);
      expect(metrics.averageDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('buildJoinQuery', () => {
    it('should build a query with INNER JOIN', () => {
      const query = secureQueryBuilderService.buildJoinQuery(
        'users',
        [{ table: 'profiles', on: 'users.id = profiles.user_id', type: 'INNER' }],
        { 'users.id': 123 },
        ['users.name', 'profiles.bio']
      );

      expect(query).toBeDefined();
      expect(query.queryId).toMatch(/^query_\d+_\d+$/);
    });

    it('should build a query with LEFT JOIN', () => {
      const query = secureQueryBuilderService.buildJoinQuery(
        'users',
        [{ table: 'profiles', on: 'users.id = profiles.user_id', type: 'LEFT' }],
        { 'users.active': true }
      );

      expect(query).toBeDefined();
    });

    it('should validate table names', () => {
      expect(() => {
        secureQueryBuilderService.buildJoinQuery(
          'users; DROP TABLE users;--',
          [],
          {}
        );
      }).toThrow('Invalid SQL identifier');
    });

    it('should validate JOIN conditions', () => {
      expect(() => {
        secureQueryBuilderService.buildJoinQuery(
          'users',
          [{ table: 'profiles', on: 'invalid condition', type: 'INNER' }],
          {}
        );
      }).toThrow('Invalid JOIN condition');
    });
  });

  describe('buildSubquery', () => {
    it('should build a query with subquery', () => {
      const outerQuery = 'SELECT * FROM users WHERE id IN {{SUBQUERY}}';
      const subquery = 'SELECT user_id FROM orders WHERE total > 100';
      const params = {};

      const query = secureQueryBuilderService.buildSubquery(outerQuery, subquery, params);

      expect(query).toBeDefined();
      expect(query.queryId).toMatch(/^query_\d+_\d+$/);
    });
  });

  describe('buildCTEQuery', () => {
    it('should build a query with CTE', () => {
      const ctes = [
        { name: 'active_users', query: 'SELECT * FROM users WHERE active = true' }
      ];
      const mainQuery = 'SELECT * FROM active_users WHERE created_at > ${date}';
      const params = { date: '2024-01-01' };

      const query = secureQueryBuilderService.buildCTEQuery(ctes, mainQuery, params);

      expect(query).toBeDefined();
      expect(query.queryId).toMatch(/^query_\d+_\d+$/);
    });

    it('should validate CTE names', () => {
      const ctes = [
        { name: 'invalid; DROP TABLE users;--', query: 'SELECT * FROM users' }
      ];
      const mainQuery = 'SELECT * FROM invalid';
      const params = {};

      expect(() => {
        secureQueryBuilderService.buildCTEQuery(ctes, mainQuery, params);
      }).toThrow('Invalid SQL identifier');
    });
  });

  describe('executeBulkOperation', () => {
    it('should execute bulk operations successfully', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = async (item: unknown) => {
        return (item as number) * 2;
      };

      const result = await secureQueryBuilderService.executeBulkOperation(
        items,
        operation
      );

      expect(result.successful).toEqual([2, 4, 6, 8, 10]);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(5);
    });

    it('should handle failures with continueOnError', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = async (item: unknown) => {
        if ((item as number) === 3) {
          throw new Error('Failed on 3');
        }
        return (item as number) * 2;
      };

      const result = await secureQueryBuilderService.executeBulkOperation(
        items,
        operation,
        { continueOnError: true }
      );

      expect(result.successful).toEqual([2, 4, 8, 10]);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(2);
      expect(result.totalProcessed).toBe(5);
    });

    it('should stop on first error without continueOnError', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = async (item: unknown) => {
        if ((item as number) === 3) {
          throw new Error('Failed on 3');
        }
        return (item as number) * 2;
      };

      const result = await secureQueryBuilderService.executeBulkOperation(
        items,
        operation,
        { continueOnError: false }
      );

      expect(result.successful).toEqual([2, 4]);
      expect(result.failed).toHaveLength(1);
      expect(result.totalProcessed).toBe(3);
    });

    it('should process in batches', async () => {
      const items = Array.from({ length: 250 }, (_, i) => i);
      const operation = async (item: unknown) => item;

      const result = await secureQueryBuilderService.executeBulkOperation(
        items,
        operation,
        { batchSize: 100 }
      );

      expect(result.successful).toHaveLength(250);
      expect(result.totalProcessed).toBe(250);
    });
  });

  describe('SQL Injection Protection', () => {
    it('should use parameterized queries to prevent SQL injection', () => {
      // The key protection is parameterized queries, not removing SQL keywords
      // Sanitization removes dangerous characters, but SQL keywords in data are safe when parameterized
      for (const testCase of SQL_INJECTION_PATTERNS) {
        // Test that we can build a parameterized query with the input
        const result = testQueryParameterization(
          'SELECT * FROM users WHERE name = ${name}',
          { name: testCase.input }
        );
        
        // Should successfully build parameterized query
        expect(result.passed).toBe(true);
      }
    });

    it('should sanitize inputs when building queries', () => {
      const dangerousInputs = [
        'SELECT * FROM users',
        'DROP TABLE users',
        'INSERT INTO users',
        'UPDATE users SET',
        'DELETE FROM users'
      ];

      for (const input of dangerousInputs) {
        // Test that parameterized queries handle these safely
        const result = testQueryParameterization(
          'SELECT * FROM users WHERE name = ${name}',
          { name: input }
        );
        expect(result.passed).toBe(true);
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should track query performance', () => {
      secureQueryBuilderService.clearPerformanceMetrics();
      const template = 'SELECT * FROM users WHERE id = ${id}';
      
      for (let i = 0; i < 5; i++) {
        secureQueryBuilderService.buildParameterizedQuery(template, { id: i });
      }

      const metrics = secureQueryBuilderService.getPerformanceMetrics();
      
      expect(metrics.totalQueries).toBeGreaterThan(0);
      expect(metrics.averageDuration).toBeGreaterThanOrEqual(0);
      expect(metrics.maxDuration).toBeGreaterThanOrEqual(metrics.minDuration);
      expect(metrics.recentMetrics.length).toBeGreaterThanOrEqual(5);
    });

    it('should limit metrics history', () => {
      const template = 'SELECT * FROM users WHERE id = ${id}';
      
      // Build more queries than MAX_METRICS_HISTORY
      for (let i = 0; i < 1100; i++) {
        secureQueryBuilderService.buildParameterizedQuery(template, { id: i });
      }

      const metrics = secureQueryBuilderService.getPerformanceMetrics();
      
      // Should keep only last 1000 metrics
      expect(metrics.recentMetrics.length).toBeLessThanOrEqual(1000);
    });

    it('should clear metrics', () => {
      const template = 'SELECT * FROM users WHERE id = ${id}';
      secureQueryBuilderService.buildParameterizedQuery(template, { id: 1 });

      const beforeClear = secureQueryBuilderService.getPerformanceMetrics();
      secureQueryBuilderService.clearPerformanceMetrics();

      const metrics = secureQueryBuilderService.getPerformanceMetrics();
      expect(beforeClear.recentMetrics.length).toBeGreaterThan(0);
      expect(metrics.recentMetrics).toHaveLength(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate string inputs', () => {
      const inputs = ['test', 'another test'];
      const result = secureQueryBuilderService.validateInputs(inputs);

      expect(result.isValid).toBe(true);
      expect(result.hasErrors()).toBe(false);
    });

    it('should validate numeric inputs', () => {
      const inputs = [123, 456.78];
      const result = secureQueryBuilderService.validateInputs(inputs);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid numbers', () => {
      const inputs = [NaN, Infinity];
      const result = secureQueryBuilderService.validateInputs(inputs);

      expect(result.isValid).toBe(false);
      expect(result.hasErrors()).toBe(true);
    });

    it('should validate arrays', () => {
      const inputs = [[1, 2, 3], ['a', 'b', 'c']];
      const result = secureQueryBuilderService.validateInputs(inputs);

      expect(result.isValid).toBe(true);
    });

    it('should reject oversized arrays', () => {
      const inputs = [Array(1001).fill(1)];
      const result = secureQueryBuilderService.validateInputs(inputs);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Output Sanitization', () => {
    it('should sanitize output data', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        password: 'secret123'
      };

      const sanitized = secureQueryBuilderService.sanitizeOutput(data);

      expect(sanitized).toBeDefined();
      expect((sanitized as any).password).toBeUndefined();
    });

    it('should sanitize nested objects', () => {
      const data = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret'
          }
        }
      };

      const sanitized = secureQueryBuilderService.sanitizeOutput(data);

      expect(sanitized).toBeDefined();
    });

    it('should sanitize arrays', () => {
      const data = [
        { name: 'John', password: 'secret1' },
        { name: 'Jane', password: 'secret2' }
      ];

      const sanitized = secureQueryBuilderService.sanitizeOutput(data);

      expect(Array.isArray(sanitized)).toBe(true);
    });
  });

  describe('LIKE Pattern Safety', () => {
    it('should create safe LIKE patterns', () => {
      const searchTerm = 'test%_search';
      const pattern = secureQueryBuilderService.createSafeLikePattern(searchTerm);

      expect(pattern).toBeDefined();
      // The pattern should escape special characters but still contain % for LIKE
      expect(pattern).toContain('%');
    });

    it('should handle special characters', () => {
      const searchTerm = "test'; DROP TABLE users;--";
      const pattern = secureQueryBuilderService.createSafeLikePattern(searchTerm);

      expect(pattern).toBeDefined();
      // The pattern wraps the search term with % for LIKE matching
      expect(pattern).toContain('%');
    });
  });

  describe('Pagination Validation', () => {
    it('should validate pagination parameters', () => {
      const params = secureQueryBuilderService.validatePaginationParams('1', '20');

      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
      expect(params.offset).toBe(0);
    });

    it('should handle invalid page numbers', () => {
      const params = secureQueryBuilderService.validatePaginationParams('-1', '20');

      expect(params.page).toBeGreaterThanOrEqual(1);
    });

    it('should limit maximum page size', () => {
      const params = secureQueryBuilderService.validatePaginationParams('1', '1000');

      expect(params.limit).toBeLessThanOrEqual(100);
    });

    it('should use defaults for missing parameters', () => {
      const params = secureQueryBuilderService.validatePaginationParams();

      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined', () => {
      const inputs = [null, undefined];
      const result = secureQueryBuilderService.validateInputs(inputs);

      expect(result.isValid).toBe(true);
    });

    it('should handle empty strings', () => {
      const inputs = ['', '   '];
      const result = secureQueryBuilderService.validateInputs(inputs);

      expect(result.isValid).toBe(true);
    });

    it('should handle unicode characters', () => {
      const inputs = ['🔥', '你好', 'مرحبا'];
      const result = secureQueryBuilderService.validateInputs(inputs);

      expect(result.isValid).toBe(true);
    });

    it('should handle very long strings', () => {
      const inputs = ['a'.repeat(10001)];
      const result = secureQueryBuilderService.validateInputs(inputs);

      expect(result.isValid).toBe(false);
    });
  });
});
