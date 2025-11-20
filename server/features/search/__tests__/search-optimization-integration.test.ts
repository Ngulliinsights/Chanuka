// ============================================================================
// SEARCH OPTIMIZATION INTEGRATION TEST
// ============================================================================
// Integration test to validate the optimized simple matching implementation

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SimpleMatchingEngine } from '../engines/core/simple-matching.engine.js';
import { SearchQuery } from '../engines/types/search.types.js';
import { databaseService } from '../../../infrastructure/database/database-service.js';

describe('Search Optimization Integration', () => {
  let searchEngine: SimpleMatchingEngine;

  beforeAll(async () => {
    // Initialize search engine
    searchEngine = new SimpleMatchingEngine();
  });

  afterAll(async () => {
    // Clean up
    searchEngine.clearCache();
    await databaseService.close();
  });

  describe('Basic Functionality', () => {
    it('should create search engine instance', () => {
      expect(searchEngine).toBeDefined();
      expect(typeof searchEngine.search).toBe('function');
      expect(typeof searchEngine.clearCache).toBe('function');
      expect(typeof searchEngine.getCacheStats).toBe('function');
    });

    it('should handle search queries without errors', async () => {
      const query: SearchQuery = {
        query: 'budget bill',
        pagination: { limit: 10, offset: 0 }
      };

      // Should not throw an error
      const results = await searchEngine.search(query);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return consistent results for identical queries', async () => {
      const query: SearchQuery = {
        query: 'healthcare reform',
        pagination: { limit: 5, offset: 0 }
      };

      const results1 = await searchEngine.search(query);
      const results2 = await searchEngine.search(query);

      expect(results1).toEqual(results2);
    });
  });

  describe('Cache Management', () => {
    it('should initialize with empty cache', () => {
      searchEngine.clearCache();
      const stats = searchEngine.getCacheStats();
      
      expect(stats.size).toBe(0);
      expect(stats.totalEntries).toBe(0);
    });

    it('should populate cache after searches', async () => {
      searchEngine.clearCache();
      
      const query: SearchQuery = {
        query: 'education funding',
        pagination: { limit: 10, offset: 0 }
      };

      await searchEngine.search(query);
      
      const stats = searchEngine.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should clear cache when requested', async () => {
      const query: SearchQuery = {
        query: 'infrastructure development',
        pagination: { limit: 10, offset: 0 }
      };

      await searchEngine.search(query);
      
      let stats = searchEngine.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      searchEngine.clearCache();
      
      stats = searchEngine.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle multiple concurrent searches', async () => {
      const queries = [
        'budget bill',
        'healthcare reform', 
        'education funding',
        'infrastructure development',
        'tax policy'
      ].map(query => ({
        query,
        pagination: { limit: 5, offset: 0 }
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        queries.map(query => searchEngine.search(query))
      );

      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      // All results should be arrays
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should demonstrate cache performance improvement', async () => {
      searchEngine.clearCache();
      
      const query: SearchQuery = {
        query: 'performance test query',
        pagination: { limit: 10, offset: 0 }
      };

      // First search (cache miss)
      const start1 = Date.now();
      await searchEngine.search(query);
      const duration1 = Date.now() - start1;

      // Second search (should be cache hit)
      const start2 = Date.now();
      await searchEngine.search(query);
      const duration2 = Date.now() - start2;

      // Cache hit should be faster (or at least not significantly slower)
      expect(duration2).toBeLessThanOrEqual(duration1 + 5); // Allow 5ms tolerance
    });
  });

  describe('Query Variations', () => {
    it('should handle different query types', async () => {
      const queries: SearchQuery[] = [
        { query: 'simple query', pagination: { limit: 10, offset: 0 } },
        { query: 'query with multiple words', pagination: { limit: 10, offset: 0 } },
        { query: 'UPPERCASE QUERY', pagination: { limit: 10, offset: 0 } },
        { query: '  query with spaces  ', pagination: { limit: 10, offset: 0 } },
        { query: 'query-with-dashes', pagination: { limit: 10, offset: 0 } }
      ];

      for (const query of queries) {
        const results = await searchEngine.search(query);
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should handle queries with filters', async () => {
      const query: SearchQuery = {
        query: 'filtered query',
        filters: {
          status: ['active'],
          chamber: ['national_assembly']
        },
        pagination: { limit: 10, offset: 0 }
      };

      const results = await searchEngine.search(query);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle different pagination settings', async () => {
      const baseQuery = { query: 'pagination test' };
      
      const queries: SearchQuery[] = [
        { ...baseQuery, pagination: { limit: 5, offset: 0 } },
        { ...baseQuery, pagination: { limit: 10, offset: 0 } },
        { ...baseQuery, pagination: { limit: 20, offset: 0 } },
        { ...baseQuery, pagination: { limit: 10, offset: 10 } }
      ];

      for (const query of queries) {
        const results = await searchEngine.search(query);
        expect(Array.isArray(results)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty queries gracefully', async () => {
      const query: SearchQuery = {
        query: '',
        pagination: { limit: 10, offset: 0 }
      };

      const results = await searchEngine.search(query);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle queries with special characters', async () => {
      const query: SearchQuery = {
        query: 'query with @#$%^&*() special chars',
        pagination: { limit: 10, offset: 0 }
      };

      const results = await searchEngine.search(query);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'very '.repeat(100) + 'long query';
      
      const query: SearchQuery = {
        query: longQuery,
        pagination: { limit: 10, offset: 0 }
      };

      const results = await searchEngine.search(query);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Cache Statistics Validation', () => {
    it('should provide meaningful cache statistics', async () => {
      searchEngine.clearCache();
      
      // Perform some searches
      const queries = ['stats test 1', 'stats test 2', 'stats test 1']; // Repeat first query
      
      for (const queryText of queries) {
        await searchEngine.search({
          query: queryText,
          pagination: { limit: 10, offset: 0 }
        });
      }

      const stats = searchEngine.getCacheStats();
      
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
      expect(typeof stats.totalEntries).toBe('number');
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
    });
  });
});
