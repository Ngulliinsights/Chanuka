// ============================================================================
// POSTGRESQL FULL-TEXT SEARCH PERFORMANCE TESTS
// ============================================================================
// Task 3.2: Performance tests ensuring <100ms response time

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSQLFullTextEngine } from '../engines/core/postgresql-fulltext.engine.js';
import { SearchQuery } from '../engines/types/search.types.js';
import { databaseService } from '../../../infrastructure/database/database-service.js';

describe('PostgreSQL Full-Text Search Performance Tests', () => {
  let searchEngine: PostgreSQLFullTextEngine;
  const PERFORMANCE_THRESHOLD_MS = 100;
  const LOAD_TEST_ITERATIONS = 50;

  beforeAll(async () => {
    // Ensure database connection is established
    await databaseService.getHealthStatus();
    searchEngine = new PostgreSQLFullTextEngine();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  beforeEach(async () => {
    // Ensure indexes are in place by running the migration
    await databaseService.executeRawQuery(
      `
      -- Ensure GIN indexes exist for performance tests
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bills_fulltext_gin_test" 
      ON "bills" USING gin(to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(full_text, '')));
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sponsors_fulltext_gin_test" 
      ON "sponsors" USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')));
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comments_fulltext_gin_test" 
      ON "comments" USING gin(to_tsvector('english', content));
      `,
      [],
      [],
      'setupPerformanceIndexes'
    );
  });

  describe('Single Query Performance', () => {
    it('should complete simple bill search under 100ms', async () => {
      const query: SearchQuery = {
        query: 'budget allocation',
        pagination: { limit: 20 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should complete complex multi-term search under 100ms', async () => {
      const query: SearchQuery = {
        query: 'healthcare infrastructure development county government',
        filters: {
          type: ['bills', 'sponsors'],
          status: ['active', 'passed'],
          chamber: ['national_assembly']
        },
        pagination: { limit: 50 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
    });

    it('should complete sponsor search under 100ms', async () => {
      const query: SearchQuery = {
        query: 'john smith parliament',
        filters: {
          type: ['sponsors'],
          chamber: ['senate']
        },
        pagination: { limit: 30 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
    });

    it('should complete comment search under 100ms', async () => {
      const query: SearchQuery = {
        query: 'corruption transparency accountability',
        filters: {
          type: ['comments'],
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31')
          }
        },
        pagination: { limit: 25 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
    });
  });

  describe('Query Complexity Performance', () => {
    it('should handle long queries under 100ms', async () => {
      const query: SearchQuery = {
        query: 'national budget allocation healthcare infrastructure development education agriculture transport water sanitation environment',
        pagination: { limit: 40 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
    });

    it('should handle queries with special characters under 100ms', async () => {
      const query: SearchQuery = {
        query: 'budget-2024 "healthcare allocation" (infrastructure) development',
        pagination: { limit: 30 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
    });

    it('should handle queries with multiple filters under 100ms', async () => {
      const query: SearchQuery = {
        query: 'education policy',
        filters: {
          type: ['bills', 'sponsors', 'comments'],
          status: ['active', 'passed', 'pending'],
          chamber: ['national_assembly', 'senate'],
          county: ['nairobi', 'mombasa', 'kisumu'],
          dateRange: {
            start: new Date('2023-01-01'),
            end: new Date('2024-12-31')
          }
        },
        pagination: { limit: 60 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under concurrent load', async () => {
      const queries: SearchQuery[] = [
        { query: 'budget', pagination: { limit: 20 } },
        { query: 'healthcare', pagination: { limit: 20 } },
        { query: 'education policy', pagination: { limit: 20 } },
        { query: 'infrastructure development', pagination: { limit: 20 } },
        { query: 'agriculture farming', pagination: { limit: 20 } }
      ];

      const promises = queries.map(async (query) => {
        const startTime = Date.now();
        const results = await searchEngine.search(query);
        const executionTime = Date.now() - startTime;
        return { results, executionTime };
      });

      const results = await Promise.all(promises);

      // All concurrent queries should complete under threshold
      results.forEach(({ executionTime }, index) => {
        expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      });

      // Calculate average performance
      const avgExecutionTime = results.reduce((sum, { executionTime }) => sum + executionTime, 0) / results.length;
      expect(avgExecutionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 0.8); // 80% of threshold for concurrent load
    });

    it('should handle repeated queries efficiently (caching test)', async () => {
      const query: SearchQuery = {
        query: 'budget allocation healthcare',
        pagination: { limit: 30 }
      };

      const executionTimes: number[] = [];

      // Run the same query multiple times
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await searchEngine.search(query);
        const executionTime = Date.now() - startTime;
        executionTimes.push(executionTime);
      }

      // All executions should be under threshold
      executionTimes.forEach((time, index) => {
        expect(time).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      });

      // Later executions should be faster (due to caching/warm indexes)
      const firstHalf = executionTimes.slice(0, 5);
      const secondHalf = executionTimes.slice(5);
      const avgFirstHalf = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

      expect(avgSecondHalf).toBeLessThanOrEqual(avgFirstHalf * 1.2); // Allow 20% variance
    });
  });

  describe('Edge Cases Performance', () => {
    it('should handle empty query gracefully under 100ms', async () => {
      const query: SearchQuery = {
        query: '',
        pagination: { limit: 20 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very short queries under 100ms', async () => {
      const query: SearchQuery = {
        query: 'a',
        pagination: { limit: 20 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
    });

    it('should handle queries with no results under 100ms', async () => {
      const query: SearchQuery = {
        query: 'xyznonexistentterm123456789',
        pagination: { limit: 20 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const query: SearchQuery = {
        query: 'performance monitoring test',
        pagination: { limit: 20 }
      };

      await searchEngine.search(query);

      // Check if performance stats are being tracked
      const stats = await searchEngine.getPerformanceStats(1);
      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
    });

    it('should provide performance statistics', async () => {
      // Run several searches to generate data
      const queries = [
        'budget allocation',
        'healthcare policy',
        'education reform',
        'infrastructure development'
      ];

      for (const queryText of queries) {
        await searchEngine.search({
          query: queryText,
          pagination: { limit: 20 }
        });
      }

      const stats = await searchEngine.getPerformanceStats(1);
      
      if (stats.length > 0) {
        const fullTextStats = stats.find(stat => stat.search_type === 'fulltext');
        if (fullTextStats) {
          expect(Number(fullTextStats.avg_execution_time_ms)).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
          expect(Number(fullTextStats.p95_execution_time_ms)).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 1.5);
        }
      }
    });
  });

  describe('Index Usage Verification', () => {
    it('should verify GIN indexes are being used', async () => {
      // Test that our queries are using the GIN indexes
      const explainResult = await databaseService.executeRawQuery(
        `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT id, title, summary,
               ts_rank_cd(
                 to_tsvector('english', title || ' ' || COALESCE(summary, '')),
                 to_tsquery('english', 'budget:* & allocation:*')
               ) as rank
        FROM bills
        WHERE to_tsvector('english', title || ' ' || COALESCE(summary, '')) 
              @@ to_tsquery('english', 'budget:* & allocation:*')
        ORDER BY rank DESC
        LIMIT 20
        `,
        [],
        [],
        'explainGinUsage'
      );

      const plan = explainResult.data[0]['QUERY PLAN'][0];
      const planText = JSON.stringify(plan);
      
      // Should use GIN index (look for "Bitmap Index Scan" or "Index Scan" with GIN)
      expect(planText.toLowerCase()).toMatch(/(gin|bitmap|index)/);
      
      // Execution time should be reasonable
      expect(plan['Execution Time']).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });

  describe('Stress Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const testQueries = [
        'budget allocation healthcare',
        'education policy reform',
        'infrastructure development transport',
        'agriculture farming rural',
        'corruption transparency governance',
        'environment climate change',
        'water sanitation services',
        'energy renewable power',
        'tourism hospitality industry',
        'technology digital innovation'
      ];

      const results: number[] = [];

      // Run sustained load test
      for (let i = 0; i < LOAD_TEST_ITERATIONS; i++) {
        const query = testQueries[i % testQueries.length];
        const startTime = Date.now();
        
        await searchEngine.search({
          query,
          pagination: { limit: 25 }
        });
        
        const executionTime = Date.now() - startTime;
        results.push(executionTime);
      }

      // Calculate statistics
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);
      const p95Time = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

      // Performance assertions
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(p95Time).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 1.2); // Allow 20% variance for P95
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2); // Max should not exceed 2x threshold

      // Log performance summary
      console.log(`Performance Summary (${LOAD_TEST_ITERATIONS} iterations):`);
      console.log(`Average: ${avgTime.toFixed(2)}ms`);
      console.log(`P95: ${p95Time.toFixed(2)}ms`);
      console.log(`Max: ${maxTime.toFixed(2)}ms`);
      console.log(`Threshold: ${PERFORMANCE_THRESHOLD_MS}ms`);
    });
  });
});
