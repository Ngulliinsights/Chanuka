import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { test, expect } from '@playwright/test';

// Strategic Migration: Database Performance Testing via API
// This tests real-world performance including network, serialization, and database layers
test.describe('Database Performance via API', () => {
  const PERFORMANCE_THRESHOLD_MS = 300; // Slightly higher than direct DB due to HTTP overhead
  const SLOW_QUERY_THRESHOLD_MS = 600;

  // Helper to measure API response time
  const measureAPITime = async (requestFn: () => Promise<Response>) => {
    const startTime = performance.now();
    const response = await requestFn();
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    return { response, responseTime };
  };

  test.describe('Bill Engagement API Performance', () => {
    test('should retrieve engagement stats within performance threshold', async ({ request }) => {
      const { response, responseTime } = await measureAPITime(() =>
        request.get('/bills/engagement/stats?limit=10')
      );

      console.log(`Engagement stats API: ${responseTime}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`);

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(10);

      // Verify data structure
      if (data.data.length > 0) {
        const firstItem = data.data[0];
        expect(firstItem).toHaveProperty('billId');
        expect(firstItem).toHaveProperty('totalViews');
        expect(firstItem).toHaveProperty('totalComments');
        expect(firstItem).toHaveProperty('uniqueViewers');
      }
    });

    test('should handle large dataset queries efficiently', async ({ request }) => {
      const { response, responseTime } = await measureAPITime(() =>
        request.get('/bills?limit=100&include=engagement')
      );

      console.log(`Large dataset API: ${responseTime}ms (threshold: ${SLOW_QUERY_THRESHOLD_MS}ms)`);

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(SLOW_QUERY_THRESHOLD_MS);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(100);
    });

    test('should perform concurrent requests efficiently', async ({ request }) => {
      const startTime = performance.now();

      // Make 5 concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        request.get(`/bills/engagement/stats?offset=${i * 10}&limit=10`)
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);

      console.log(`5 concurrent requests: ${totalTime}ms`);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      // Concurrent requests should be faster than sequential
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2);
    });
  });

  test.describe('Search Performance', () => {
    test('should perform full-text search within threshold', async ({ request }) => {
      const searchTerm = 'healthcare';
      const { response, responseTime } = await measureAPITime(() =>
        request.get(`/bills/search?q=${encodeURIComponent(searchTerm)}&limit=20`)
      );

      console.log(`Search API: ${responseTime}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`);

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(20);
    });

    test('should handle pagination efficiently', async ({ request }) => {
      const { response, responseTime } = await measureAPITime(() =>
        request.get('/bills?page=3&limit=50')
      );

      console.log(`Pagination API: ${responseTime}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`);

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(3);
      expect(data.pagination.limit).toBe(50);
    });

    test('should handle complex search filters efficiently', async ({ request }) => {
      const { response, responseTime } = await measureAPITime(() =>
        request.get('/bills/search?q=healthcare&status=active&sponsor=true&sort=engagement&limit=25')
      );

      console.log(`Complex search API: ${responseTime}ms (threshold: ${SLOW_QUERY_THRESHOLD_MS}ms)`);

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(SLOW_QUERY_THRESHOLD_MS);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  test.describe('Sponsor Analysis Performance', () => {
    test('should retrieve sponsor data efficiently', async ({ request }) => {
      const { response, responseTime } = await measureAPITime(() =>
        request.get('/sponsors/analysis?include=billCount&limit=25')
      );

      console.log(`Sponsor analysis API: ${responseTime}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`);

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(25);

      // Verify sponsor data structure
      if (data.data.length > 0) {
        const firstSponsor = data.data[0];
        expect(firstSponsor).toHaveProperty('id');
        expect(firstSponsor).toHaveProperty('name');
        expect(firstSponsor).toHaveProperty('billCount');
      }
    });

    test('should handle sponsor relationship queries efficiently', async ({ request }) => {
      const { response, responseTime } = await measureAPITime(() =>
        request.get('/sponsors/1/bills?include=engagement&limit=15')
      );

      console.log(`Sponsor relationships API: ${responseTime}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`);

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should track slow queries via monitoring endpoint', async ({ request }) => {
      // First, trigger some queries that might be slow
      await request.get('/bills?limit=100&include=engagement,comments,sponsors');
      await request.get('/bills/search?q=comprehensive&include=all');

      // Check the monitoring endpoint
      const { response, responseTime } = await measureAPITime(() =>
        request.get('/monitoring/database/slow-queries')
      );

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(100); // Monitoring should be fast

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('slowQueries');
      expect(Array.isArray(data.data.slowQueries)).toBe(true);

      // If there are slow queries, verify their structure
      if (data.data.slowQueries.length > 0) {
        const slowQuery = data.data.slowQueries[0];
        expect(slowQuery).toHaveProperty('queryId');
        expect(slowQuery).toHaveProperty('executionTimeMs');
        expect(slowQuery).toHaveProperty('sql');
        expect(slowQuery).toHaveProperty('timestamp');
      }
    });

    test('should provide database performance metrics', async ({ request }) => {
      const { response, responseTime } = await measureAPITime(() =>
        request.get('/monitoring/database/metrics')
      );

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(100);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('queryCount');
      expect(data.data).toHaveProperty('averageResponseTime');
      expect(data.data).toHaveProperty('slowQueryCount');
      expect(data.data).toHaveProperty('connectionPoolStatus');
    });
  });

  test.describe('Load Testing', () => {
    test('should handle burst of requests without degradation', async ({ request }) => {
      const burstSize = 20;
      const maxAcceptableTime = 1000; // 1 second for all requests

      const startTime = performance.now();

      // Create a burst of concurrent requests
      const promises = Array.from({ length: burstSize }, (_, i) => {
        const endpoint = i % 3 === 0 ? '/bills' : 
                        i % 3 === 1 ? '/bills/search?q=test' : 
                        '/sponsors/analysis';
        return request.get(`${endpoint}?limit=10`);
      });

      const responses = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      console.log(`Burst of ${burstSize} requests: ${Math.round(totalTime)}ms`);

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status()).toBe(200);
      });

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(maxAcceptableTime);

      // Calculate success rate
      const successfulResponses = responses.filter(r => r.status() === 200);
      const successRate = (successfulResponses.length / responses.length) * 100;
      expect(successRate).toBe(100);
    });

    test('should maintain performance under sustained load', async ({ request }) => {
      const iterations = 10;
      const responseTimes: number[] = [];

      // Sustained load test
      for (let i = 0; i < iterations; i++) {
        const { response, responseTime } = await measureAPITime(() =>
          request.get('/bills?limit=20&include=engagement')
        );

        expect(response.status()).toBe(200);
        responseTimes.push(responseTime);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Calculate performance metrics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      console.log(`Sustained load - Avg: ${Math.round(avgResponseTime)}ms, Max: ${maxResponseTime}ms, Min: ${minResponseTime}ms`);

      // Performance should remain consistent
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(maxResponseTime).toBeLessThan(SLOW_QUERY_THRESHOLD_MS);

      // Performance shouldn't degrade significantly over time
      const firstHalf = responseTimes.slice(0, Math.floor(iterations / 2));
      const secondHalf = responseTimes.slice(Math.floor(iterations / 2));
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Second half shouldn't be more than 50% slower than first half
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
    });
  });
});




































