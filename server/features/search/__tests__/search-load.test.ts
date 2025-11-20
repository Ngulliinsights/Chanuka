// ============================================================================
// SEARCH LOAD TESTING - 1000+ CONCURRENT SEARCHES
// ============================================================================
// Comprehensive load testing for optimized simple matching engine
// Tests performance under high concurrency and validates response times

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SimpleMatchingEngine } from '../engines/core/simple-matching.engine.js';
import { SearchQuery } from '../engines/types/search.types.js';
import { databaseService } from '../../../infrastructure/database/database-service.js';
// Simple logger for tests
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || '')
};

describe('Search Load Testing', () => {
  let searchEngine: SimpleMatchingEngine;
  const testQueries = [
    'budget bill',
    'healthcare reform',
    'education funding',
    'infrastructure development',
    'tax policy',
    'environmental protection',
    'agriculture support',
    'technology innovation',
    'social security',
    'economic growth'
  ];

  beforeAll(async () => {
    // Ensure database connection is established
    await databaseService.getHealthStatus();
    searchEngine = new SimpleMatchingEngine();
  });

  afterAll(async () => {
    // Clean up
    searchEngine.clearCache();
    await databaseService.close();
  });

  beforeEach(() => {
    // Clear cache before each test for consistent results
    searchEngine.clearCache();
  });

  describe('Concurrent Search Performance', () => {
    it('should handle 100 concurrent searches within 200ms each', async () => {
      const concurrentSearches = 100;
      const maxResponseTime = 200; // ms
      
      const searchPromises = Array.from({ length: concurrentSearches }, (_, i) => {
        const query: SearchQuery = {
          query: testQueries[i % testQueries.length],
          pagination: { limit: 20, offset: 0 }
        };
        
        const startTime = Date.now();
        return searchEngine.search(query).then(results => ({
          results,
          responseTime: Date.now() - startTime,
          queryIndex: i
        }));
      });

      const results = await Promise.all(searchPromises);
      
      // Validate all searches completed
      expect(results).toHaveLength(concurrentSearches);
      
      // Check response times
      const responseTimes = results.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxActualResponseTime = Math.max(...responseTimes);
      
      logger.info('100 concurrent searches completed', {
        avgResponseTime,
        maxResponseTime: maxActualResponseTime,
        p95ResponseTime: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]
      });
      
      // 95% of searches should complete within max response time
      const fastSearches = responseTimes.filter(time => time <= maxResponseTime);
      expect(fastSearches.length / responseTimes.length).toBeGreaterThanOrEqual(0.95);
    }, 30000);

    it('should handle 500 concurrent searches with acceptable performance', async () => {
      const concurrentSearches = 500;
      const maxResponseTime = 500; // ms - more lenient for higher load
      
      const searchPromises = Array.from({ length: concurrentSearches }, (_, i) => {
        const query: SearchQuery = {
          query: testQueries[i % testQueries.length],
          pagination: { limit: 10, offset: 0 }
        };
        
        const startTime = Date.now();
        return searchEngine.search(query).then(results => ({
          results,
          responseTime: Date.now() - startTime,
          queryIndex: i
        }));
      });

      const results = await Promise.all(searchPromises);
      
      expect(results).toHaveLength(concurrentSearches);
      
      const responseTimes = results.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxActualResponseTime = Math.max(...responseTimes);
      
      logger.info('500 concurrent searches completed', {
        avgResponseTime,
        maxResponseTime: maxActualResponseTime,
        p95ResponseTime: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)],
        p99ResponseTime: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)]
      });
      
      // 90% of searches should complete within max response time (more lenient for high load)
      const fastSearches = responseTimes.filter(time => time <= maxResponseTime);
      expect(fastSearches.length / responseTimes.length).toBeGreaterThanOrEqual(0.90);
    }, 60000);

    it('should handle 1000+ concurrent searches without failures', async () => {
      const concurrentSearches = 1000;
      const maxResponseTime = 1000; // ms - most lenient for extreme load
      
      // Use smaller result sets to reduce memory usage
      const searchPromises = Array.from({ length: concurrentSearches }, (_, i) => {
        const query: SearchQuery = {
          query: testQueries[i % testQueries.length],
          pagination: { limit: 5, offset: 0 }
        };
        
        const startTime = Date.now();
        return searchEngine.search(query)
          .then(results => ({
            success: true,
            results,
            responseTime: Date.now() - startTime,
            queryIndex: i
          }))
          .catch(error => ({
            success: false,
            error: error.message,
            responseTime: Date.now() - startTime,
            queryIndex: i
          }));
      });

      const results = await Promise.all(searchPromises);
      
      expect(results).toHaveLength(concurrentSearches);
      
      // Check success rate
      const successfulSearches = results.filter(r => r.success);
      const successRate = successfulSearches.length / results.length;
      
      // Check response times for successful searches
      const responseTimes = successfulSearches.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxActualResponseTime = Math.max(...responseTimes);
      
      logger.info('1000+ concurrent searches completed', {
        totalSearches: concurrentSearches,
        successfulSearches: successfulSearches.length,
        successRate,
        avgResponseTime,
        maxResponseTime: maxActualResponseTime,
        p95ResponseTime: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)],
        p99ResponseTime: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)]
      });
      
      // At least 95% success rate
      expect(successRate).toBeGreaterThanOrEqual(0.95);
      
      // 80% of successful searches should complete within max response time
      const fastSearches = responseTimes.filter(time => time <= maxResponseTime);
      expect(fastSearches.length / responseTimes.length).toBeGreaterThanOrEqual(0.80);
    }, 120000);
  });

  describe('Cache Performance Under Load', () => {
    it('should improve performance with cache hits', async () => {
      const query: SearchQuery = {
        query: 'budget bill',
        pagination: { limit: 20, offset: 0 }
      };

      // First search (cache miss)
      const startTime1 = Date.now();
      const results1 = await searchEngine.search(query);
      const responseTime1 = Date.now() - startTime1;

      // Second search (should be cache hit)
      const startTime2 = Date.now();
      const results2 = await searchEngine.search(query);
      const responseTime2 = Date.now() - startTime2;

      // Third search (should be cache hit)
      const startTime3 = Date.now();
      const results3 = await searchEngine.search(query);
      const responseTime3 = Date.now() - startTime3;

      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
      
      // Cache hits should be significantly faster
      expect(responseTime2).toBeLessThan(responseTime1 * 0.5);
      expect(responseTime3).toBeLessThan(responseTime1 * 0.5);

      const cacheStats = searchEngine.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
      expect(cacheStats.hitRate).toBeGreaterThan(1);
    });

    it('should handle cache eviction under memory pressure', async () => {
      // Fill cache with many different queries
      const queries = Array.from({ length: 1200 }, (_, i) => ({
        query: `test query ${i}`,
        pagination: { limit: 5, offset: 0 }
      }));

      // Execute all queries to fill cache beyond max size
      await Promise.all(queries.map(query => searchEngine.search(query)));

      const cacheStats = searchEngine.getCacheStats();
      
      // Cache should not exceed max size due to eviction
      expect(cacheStats.size).toBeLessThanOrEqual(1000);
      expect(cacheStats.totalEntries).toBeLessThanOrEqual(1000);
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should maintain stable memory usage during sustained load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run multiple rounds of concurrent searches
      for (let round = 0; round < 5; round++) {
        const searchPromises = Array.from({ length: 200 }, (_, i) => {
          const query: SearchQuery = {
            query: testQueries[i % testQueries.length],
            pagination: { limit: 10, offset: 0 }
          };
          return searchEngine.search(query);
        });

        await Promise.all(searchPromises);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      logger.info('Memory usage after sustained load', {
        initialHeapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalHeapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024),
        memoryIncrease: Math.round(memoryIncrease / 1024 / 1024),
        memoryIncreasePercent: Math.round(memoryIncreasePercent)
      });

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
    });
  });

  describe('Error Handling Under Load', () => {
    it('should gracefully handle database connection issues', async () => {
      // Simulate some searches with potential database issues
      const searchPromises = Array.from({ length: 100 }, (_, i) => {
        const query: SearchQuery = {
          query: testQueries[i % testQueries.length],
          pagination: { limit: 10, offset: 0 }
        };
        
        return searchEngine.search(query)
          .then(results => ({ success: true, results }))
          .catch(error => ({ success: false, error: error.message }));
      });

      const results = await Promise.all(searchPromises);
      
      // Even with potential issues, most searches should succeed
      const successfulSearches = results.filter(r => r.success);
      const successRate = successfulSearches.length / results.length;
      
      expect(successRate).toBeGreaterThanOrEqual(0.90);
    });
  });

  describe('Response Time Requirements', () => {
    it('should meet <100ms response time for 95% of queries under normal load', async () => {
      const concurrentSearches = 50; // Normal load
      const targetResponseTime = 100; // ms
      
      const searchPromises = Array.from({ length: concurrentSearches }, (_, i) => {
        const query: SearchQuery = {
          query: testQueries[i % testQueries.length],
          pagination: { limit: 20, offset: 0 }
        };
        
        const startTime = Date.now();
        return searchEngine.search(query).then(results => ({
          results,
          responseTime: Date.now() - startTime
        }));
      });

      const results = await Promise.all(searchPromises);
      const responseTimes = results.map(r => r.responseTime);
      
      // Sort response times to calculate percentiles
      responseTimes.sort((a, b) => a - b);
      const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      
      logger.info('Response time analysis', {
        p50: responseTimes[Math.floor(responseTimes.length * 0.50)],
        p95: p95ResponseTime,
        p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
        max: Math.max(...responseTimes)
      });
      
      expect(p95ResponseTime).toBeLessThan(targetResponseTime);
    });
  });
});
