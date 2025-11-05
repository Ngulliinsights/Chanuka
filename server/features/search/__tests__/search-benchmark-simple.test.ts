// ============================================================================
// SIMPLE SEARCH BENCHMARK TEST
// ============================================================================
// Benchmark test to validate performance improvements in simple matching

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SimpleMatchingEngine } from '../engines/core/simple-matching.engine.js';
import { SearchQuery } from '../engines/types/search.types.js';
import { databaseService } from '../../../infrastructure/database/database-service.js';

describe('Search Performance Benchmark', () => {
  let searchEngine: SimpleMatchingEngine;

  beforeAll(async () => {
    searchEngine = new SimpleMatchingEngine();
  });

  afterAll(async () => {
    searchEngine.clearCache();
    await databaseService.close();
  });

  describe('Response Time Validation', () => {
    it('should meet <100ms response time requirement for single queries', async () => {
      const query: SearchQuery = {
        query: 'budget healthcare education',
        pagination: { limit: 20, offset: 0 }
      };

      const startTime = Date.now();
      const results = await searchEngine.search(query);
      const responseTime = Date.now() - startTime;

      expect(Array.isArray(results)).toBe(true);
      expect(responseTime).toBeLessThan(100); // <100ms requirement
      
      console.log(`Single query response time: ${responseTime}ms`);
    });

    it('should demonstrate cache performance improvement', async () => {
      searchEngine.clearCache();
      
      const query: SearchQuery = {
        query: 'performance benchmark test',
        pagination: { limit: 20, offset: 0 }
      };

      // First search (cache miss)
      const start1 = Date.now();
      const results1 = await searchEngine.search(query);
      const time1 = Date.now() - start1;

      // Second search (cache hit)
      const start2 = Date.now();
      const results2 = await searchEngine.search(query);
      const time2 = Date.now() - start2;

      // Third search (cache hit)
      const start3 = Date.now();
      const results3 = await searchEngine.search(query);
      const time3 = Date.now() - start3;

      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
      
      console.log(`Cache miss: ${time1}ms, Cache hit 1: ${time2}ms, Cache hit 2: ${time3}ms`);
      
      // Cache hits should be significantly faster
      expect(time2).toBeLessThan(time1);
      expect(time3).toBeLessThan(time1);
    });

    it('should handle concurrent searches efficiently', async () => {
      const queries = [
        'budget allocation',
        'healthcare reform',
        'education policy',
        'infrastructure development',
        'environmental protection'
      ];

      const searchPromises = queries.map(queryText => {
        const query: SearchQuery = {
          query: queryText,
          pagination: { limit: 10, offset: 0 }
        };
        
        const startTime = Date.now();
        return searchEngine.search(query).then(results => ({
          query: queryText,
          results,
          responseTime: Date.now() - startTime
        }));
      });

      const startTime = Date.now();
      const results = await Promise.all(searchPromises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      
      // All individual searches should be fast
      results.forEach(result => {
        expect(result.responseTime).toBeLessThan(100);
        expect(Array.isArray(result.results)).toBe(true);
      });

      // Total concurrent execution should be efficient
      expect(totalTime).toBeLessThan(200); // Should complete within 200ms
      
      console.log(`Concurrent searches completed in ${totalTime}ms`);
      console.log('Individual response times:', results.map(r => `${r.query}: ${r.responseTime}ms`));
    });
  });

  describe('Cache Efficiency', () => {
    it('should demonstrate cache hit rate improvement', async () => {
      searchEngine.clearCache();
      
      const queries = [
        'cache test 1',
        'cache test 2', 
        'cache test 1', // Repeat
        'cache test 3',
        'cache test 2', // Repeat
        'cache test 1'  // Repeat
      ];

      for (const queryText of queries) {
        await searchEngine.search({
          query: queryText,
          pagination: { limit: 10, offset: 0 }
        });
      }

      const stats = searchEngine.getCacheStats();
      
      expect(stats.size).toBe(3); // 3 unique queries
      expect(stats.hitRate).toBeGreaterThan(1); // Should have cache hits
      
      console.log(`Cache stats: ${stats.size} entries, ${stats.hitRate.toFixed(2)} avg hits per entry`);
    });

    it('should handle cache eviction gracefully', async () => {
      searchEngine.clearCache();
      
      // Generate many unique queries to test cache eviction
      const queries = Array.from({ length: 50 }, (_, i) => `eviction test query ${i}`);
      
      for (const queryText of queries) {
        await searchEngine.search({
          query: queryText,
          pagination: { limit: 5, offset: 0 }
        });
      }

      const stats = searchEngine.getCacheStats();
      
      // Cache should not grow indefinitely
      expect(stats.size).toBeLessThanOrEqual(50);
      expect(stats.totalEntries).toBeLessThanOrEqual(50);
      
      console.log(`Cache after eviction test: ${stats.size} entries`);
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many searches
      for (let i = 0; i < 100; i++) {
        await searchEngine.search({
          query: `memory test query ${i % 10}`, // Some repetition for caching
          pagination: { limit: 10, offset: 0 }
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncreaseMB).toBeLessThan(10);
    });
  });

  describe('Query Complexity Handling', () => {
    it('should handle simple queries efficiently', async () => {
      const simpleQueries = ['bill', 'budget', 'health', 'tax', 'law'];
      
      for (const query of simpleQueries) {
        const startTime = Date.now();
        const results = await searchEngine.search({
          query,
          pagination: { limit: 10, offset: 0 }
        });
        const responseTime = Date.now() - startTime;

        expect(Array.isArray(results)).toBe(true);
        expect(responseTime).toBeLessThan(50); // Simple queries should be very fast
      }
    });

    it('should handle complex queries within acceptable time', async () => {
      const complexQueries = [
        'comprehensive healthcare reform legislation with budget implications',
        'environmental protection and sustainable development policy framework',
        'education funding allocation and infrastructure development priorities'
      ];
      
      for (const query of complexQueries) {
        const startTime = Date.now();
        const results = await searchEngine.search({
          query,
          pagination: { limit: 20, offset: 0 }
        });
        const responseTime = Date.now() - startTime;

        expect(Array.isArray(results)).toBe(true);
        expect(responseTime).toBeLessThan(100); // Complex queries should still meet requirement
        
        console.log(`Complex query "${query.substring(0, 30)}..." took ${responseTime}ms`);
      }
    });
  });
});