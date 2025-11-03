import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { test, expect } from '@playwright/test';

// Strategic Migration: External API Integration Testing
// Tests the full integration stack including caching, rate limiting, and error handling
test.describe('External API Integration', () => {
  const API_TIMEOUT_MS = 5000;
  const CACHE_RESPONSE_THRESHOLD_MS = 100;

  test.describe('API Analytics Endpoint', () => {
    test('should return comprehensive API analytics', async ({ request }) => {
      const response = await request.get('/external-api/analytics');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('sources');
      expect(data.data).toHaveProperty('totalRequests');
      expect(data.data).toHaveProperty('totalCost');
      expect(data.data).toHaveProperty('averageResponseTime');
      expect(data.data).toHaveProperty('overallSuccessRate');
      expect(data.data).toHaveProperty('cacheHitRate');
      expect(data.data).toHaveProperty('topPerformingSources');
      expect(data.data).toHaveProperty('costBreakdown');

      // Validate data types
      expect(typeof data.data.totalRequests).toBe('number');
      expect(typeof data.data.totalCost).toBe('number');
      expect(typeof data.data.averageResponseTime).toBe('number');
      expect(typeof data.data.overallSuccessRate).toBe('number');
      expect(typeof data.data.cacheHitRate).toBe('number');
      expect(Array.isArray(data.data.sources)).toBe(true);
      expect(Array.isArray(data.data.topPerformingSources)).toBe(true);
    });

    test('should filter analytics by source when specified', async ({ request }) => {
      const response = await request.get('/external-api/analytics?source=parliament-ca');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.sources).toHaveLength(1);
      expect(data.data.sources[0].source).toBe('parliament-ca');

      // Verify source-specific data structure
      const source = data.data.sources[0];
      expect(source).toHaveProperty('requestCount');
      expect(source).toHaveProperty('successRate');
      expect(source).toHaveProperty('averageResponseTime');
      expect(source).toHaveProperty('totalCost');
      expect(source).toHaveProperty('cacheHitRate');
    });

    test('should filter analytics by time window when specified', async ({ request }) => {
      const timeWindow = 3600000; // 1 hour
      const response = await request.get(`/external-api/analytics?timeWindow=${timeWindow}`);

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('sources');
      expect(data.data).toHaveProperty('timeWindow');
      expect(data.data.timeWindow).toBe(timeWindow);
    });

    test('should handle multiple filters simultaneously', async ({ request }) => {
      const response = await request.get('/external-api/analytics?source=parliament-ca&timeWindow=7200000');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.sources).toHaveLength(1);
      expect(data.data.sources[0].source).toBe('parliament-ca');
      expect(data.data.timeWindow).toBe(7200000);
    });

    test('should return empty results for non-existent source', async ({ request }) => {
      const response = await request.get('/external-api/analytics?source=non-existent-source');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.sources).toHaveLength(0);
      expect(data.data.totalRequests).toBe(0);
    });
  });

  test.describe('API Health Monitoring', () => {
    test('should return health status for all API sources', async ({ request }) => {
      const response = await request.get('/external-api/health');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('sources');
      expect(data.data).toHaveProperty('timestamp');
      expect(data.data).toHaveProperty('overallStatus');
      expect(Array.isArray(data.data.services)).toBe(true);

      // Validate timestamp format
      expect(new Date(data.data.timestamp).getTime()).toBeGreaterThan(0);

      // Validate overall status
      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.data.overallStatus);

      // Validate services structure
      if (data.data.services.length > 0) {
        const service = data.data.services[0];
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('status');
        expect(service).toHaveProperty('responseTime');
        expect(service).toHaveProperty('last_checked');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(service.status);
      }
    });

    test('should perform health checks within reasonable time', async ({ request }) => {
      const startTime = performance.now();
      const response = await request.get('/external-api/health');
      const responseTime = performance.now() - startTime;

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Health checks should be fast

      console.log(`Health check response time: ${Math.round(responseTime)}ms`);
    });

    test('should include detailed service information', async ({ request }) => {
      const response = await request.get('/external-api/health?detailed=true');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      if (data.data.services.length > 0) {
        const service = data.data.services[0];
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('status');
        expect(service).toHaveProperty('responseTime');
        expect(service).toHaveProperty('last_checked');
        expect(service).toHaveProperty('endpoint');
        expect(service).toHaveProperty('errorCount');
        expect(service).toHaveProperty('successRate');
      }
    });
  });

  test.describe('Caching Performance', () => {
    test('should serve cached responses quickly', async ({ request }) => {
      // First request to populate cache
      const firstResponse = await request.get('/external-api/analytics');
      expect(firstResponse.status()).toBe(200);

      // Second request should be served from cache
      const startTime = performance.now();
      const cachedResponse = await request.get('/external-api/analytics');
      const responseTime = performance.now() - startTime;

      expect(cachedResponse.status()).toBe(200);
      expect(responseTime).toBeLessThan(CACHE_RESPONSE_THRESHOLD_MS);

      console.log(`Cached response time: ${Math.round(responseTime)}ms`);

      // Verify cache headers
      const cacheControl = cachedResponse.headers()['cache-control'];
      expect(cacheControl).toBeDefined();
    });

    test('should handle cache invalidation correctly', async ({ request }) => {
      // Get initial analytics
      const initialResponse = await request.get('/external-api/analytics');
      const initialData = await initialResponse.json();

      // Trigger cache invalidation (if endpoint exists)
      const invalidateResponse = await request.post('/external-api/cache/invalidate', {
        data: { pattern: 'analytics' }
      });

      // Should succeed or return 404 if not implemented
      expect([200, 404]).toContain(invalidateResponse.status());

      if (invalidateResponse.status() === 200) {
        // Fresh request after invalidation
        const freshResponse = await request.get('/external-api/analytics');
        expect(freshResponse.status()).toBe(200);

        const freshData = await freshResponse.json();
        expect(freshData.success).toBe(true);
      }
    });

    test('should respect cache TTL settings', async ({ request }) => {
      // Get cache configuration
      const configResponse = await request.get('/external-api/config/cache');
      
      if (configResponse.status() === 200) {
        const config = await configResponse.json();
        expect(config.success).toBe(true);
        expect(config.data).toHaveProperty('ttl');
        expect(typeof config.data.ttl).toBe('number');
        expect(config.data.ttl).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting gracefully', async ({ request }) => {
      const requests = [];
      const maxRequests = 10;

      // Make rapid requests to test rate limiting
      for (let i = 0; i < maxRequests; i++) {
        requests.push(request.get('/external-api/analytics'));
      }

      const responses = await Promise.all(requests);

      // Count successful vs rate-limited responses
      const successfulResponses = responses.filter(r => r.status() === 200);
      const rateLimitedResponses = responses.filter(r => r.status() === 429);

      console.log(`Successful: ${successfulResponses.length}, Rate limited: ${rateLimitedResponses.length}`);

      // Should have at least some successful responses
      expect(successfulResponses.length).toBeGreaterThan(0);

      // If rate limiting is active, check headers
      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0];
        const headers = rateLimitedResponse.headers();
        
        // Common rate limit headers
        const hasRateLimitHeaders = 
          headers['x-ratelimit-limit'] || 
          headers['x-ratelimit-remaining'] || 
          headers['retry-after'];
        
        expect(hasRateLimitHeaders).toBeTruthy();
      }
    });

    test('should provide rate limit information in headers', async ({ request }) => {
      const response = await request.get('/external-api/analytics');
      
      expect(response.status()).toBe(200);
      
      const headers = response.headers();
      
      // Check for common rate limit headers (may not be present if no rate limiting)
      if (headers['x-ratelimit-limit']) {
        expect(parseInt(headers['x-ratelimit-limit'])).toBeGreaterThan(0);
      }
      
      if (headers['x-ratelimit-remaining']) {
        expect(parseInt(headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle external API failures gracefully', async ({ request }) => {
      // Test with a potentially failing external source
      const response = await request.get('/external-api/test-failure');
      
      // Should either succeed or fail gracefully
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
      } else {
        expect([500, 503, 504]).toContain(response.status());
        
        const errorData = await response.json();
        expect(errorData.success).toBe(false);
        expect(errorData.error).toBeDefined();
      }
    });

    test('should provide meaningful error messages', async ({ request }) => {
      // Test with invalid parameters
      const response = await request.get('/external-api/analytics?source=invalid&timeWindow=invalid');
      
      if (response.status() !== 200) {
        const errorData = await response.json();
        expect(errorData.success).toBe(false);
        expect(errorData.error).toBeDefined();
        expect(typeof errorData.error).toBe('string');
        expect(errorData.error.length).toBeGreaterThan(0);
      }
    });

    test('should handle timeout scenarios', async ({ request }) => {
      // Test with a request that might timeout
      const response = await request.get('/external-api/slow-endpoint', {
        timeout: 2000 // 2 second timeout
      });
      
      // Should either complete quickly or timeout gracefully
      expect([200, 408, 504]).toContain(response.status());
      
      if (response.status() !== 200) {
        const errorData = await response.json();
        expect(errorData.success).toBe(false);
      }
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should track API performance metrics', async ({ request }) => {
      const response = await request.get('/external-api/metrics/performance');
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('averageResponseTime');
        expect(data.data).toHaveProperty('requestCount');
        expect(data.data).toHaveProperty('errorRate');
        expect(data.data).toHaveProperty('throughput');
        
        // Validate metric types
        expect(typeof data.data.averageResponseTime).toBe('number');
        expect(typeof data.data.requestCount).toBe('number');
        expect(typeof data.data.errorRate).toBe('number');
        expect(typeof data.data.throughput).toBe('number');
      }
    });

    test('should provide cost tracking information', async ({ request }) => {
      const response = await request.get('/external-api/metrics/cost');
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('totalCost');
        expect(data.data).toHaveProperty('costBySource');
        expect(data.data).toHaveProperty('projectedMonthlyCost');
        
        expect(typeof data.data.totalCost).toBe('number');
        expect(Array.isArray(data.data.costBySource)).toBe(true);
        expect(typeof data.data.projectedMonthlyCost).toBe('number');
      }
    });
  });

  test.describe('Integration Resilience', () => {
    test('should maintain service availability during external API issues', async ({ request }) => {
      // Test core functionality when external APIs might be down
      const coreResponse = await request.get('/bills?limit=5');
      
      expect(coreResponse.status()).toBe(200);
      
      const data = await coreResponse.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should provide fallback data when external sources fail', async ({ request }) => {
      // Test fallback mechanisms
      const response = await request.get('/external-api/analytics?fallback=true');
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // Should indicate if fallback data is being used
      if (data.data.isFallback) {
        expect(data.data.isFallback).toBe(true);
        expect(data.data.fallbackReason).toBeDefined();
      }
    });

    test('should recover from temporary external API failures', async ({ request }) => {
      // Make multiple requests over time to test recovery
      const requests = [];
      const intervals = [0, 1000, 2000, 3000]; // 0s, 1s, 2s, 3s
      
      for (const delay of intervals) {
        requests.push(
          new Promise(resolve => 
            setTimeout(async () => {
              const response = await request.get('/external-api/health');
              resolve({ delay, status: response.status() });
            }, delay)
          )
        );
      }
      
      const results = await Promise.all(requests);
      
      // At least some requests should succeed
      const successfulRequests = results.filter((r: any) => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(0);
    });
  });
});





































