import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../../../shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { UnifiedExternalAPIManagementService as ExternalAPIManagementService } from '../../infrastructure/external-data/external-api-manager.js';
import { logger  } from '../../../shared/core/src/index.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('ExternalAPIManagementService', () => {
  let apiManager: ExternalAPIManagementService;
  let mockFetch: any;

  beforeAll(() => {
    mockFetch = global.fetch as any;
  });

  beforeEach(() => {
    apiManager = new ExternalAPIManagementService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    apiManager.shutdown();

    // Force cleanup of any remaining timers to prevent hanging
    if ((apiManager as any).forceCleanupTimers) {
      (apiManager as any).forceCleanupTimers();
    }
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per minute', async () => {
      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      const source = 'parliament-ca';
      const endpoint = '/test';

  // Make requests up to the limit (60 per minute for parliament-ca)
  const requests: Array<Promise<any>> = [];
      for (let i = 0; i < 60; i++) {
        requests.push(apiManager.makeRequest(source, endpoint));
      }

      const results = await Promise.all(requests);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Next request should be rate limited
      const rateLimitedResult = await apiManager.makeRequest(source, endpoint);
      expect(rateLimitedResult.success).toBe(false);
      expect(rateLimitedResult.error?.type).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should track quota utilization correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      const source = 'parliament-ca';
      const endpoint = '/test';

      // Make some requests
      await apiManager.makeRequest(source, endpoint);
      await apiManager.makeRequest(source, endpoint);
      await apiManager.makeRequest(source, endpoint);

      const analytics = apiManager.getAPIAnalytics(source);
      const sourceMetrics = analytics.sources.find(s => s.source === source);

      expect(sourceMetrics).toBeDefined();
      expect(sourceMetrics!.totalRequests).toBe(3);
      expect(sourceMetrics!.quotaUtilization.minute).toBeGreaterThan(0);
    });
  });

  describe('Health Monitoring', () => {
    it('should track API health status', async () => {
      const healthStatuses = apiManager.getHealthStatus();
      
      expect(healthStatuses.length).toBeGreaterThan(0);
      
      const parliamentStatus = healthStatuses.find(h => h.source === 'parliament-ca');
      expect(parliamentStatus).toBeDefined();
      expect(parliamentStatus!.status).toMatch(/healthy|degraded|down/);
    });

    it('should update health status based on response success', async () => {
      const source = 'parliament-ca';
      
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'success' })
      });

      await apiManager.makeRequest(source, '/test');
      
      let healthStatus = apiManager.getHealthStatus(source)[0];
      expect(healthStatus.successRate).toBeGreaterThan(0);

      // Mock failed response
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await apiManager.makeRequest(source, '/test');
      } catch (error) {
        // Expected to fail
      }

      healthStatus = apiManager.getHealthStatus(source)[0];
      expect(healthStatus.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Response Caching', () => {
    it('should cache successful responses', async () => {
      const testData = { data: 'cached response' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(testData)
      });

      const source = 'parliament-ca';
      const endpoint = '/test';

      // First request should hit the API
      const firstResult = await apiManager.makeRequest(source, endpoint);
      expect(firstResult.success).toBe(true);
      expect(firstResult.cached).toBe(false);
      expect(firstResult.data).toEqual(testData);

      // Second request should use cache
      const secondResult = await apiManager.makeRequest(source, endpoint);
      expect(secondResult.success).toBe(true);
      expect(secondResult.cached).toBe(true);
      expect(secondResult.data).toEqual(testData);

      // Verify fetch was only called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when requested', async () => {
      const testData = { data: 'fresh response' };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testData)
      });

      const source = 'parliament-ca';
      const endpoint = '/test';

      // First request
      await apiManager.makeRequest(source, endpoint);

      // Second request with cache bypass
      const result = await apiManager.makeRequest(source, endpoint, {
        bypassCache: true
      });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      // Make some cached requests
      await apiManager.makeRequest('parliament-ca', '/test1');
      await apiManager.makeRequest('parliament-ca', '/test2');
      await apiManager.makeRequest('parliament-ca', '/test1'); // Should hit cache

      const cacheStats = apiManager.getCacheStatistics();
      
      expect(cacheStats.totalEntries).toBe(2);
      expect(cacheStats.hitRate).toBeGreaterThan(0);
      expect(cacheStats.topCachedEndpoints.length).toBeGreaterThan(0);
    });
  });

  describe('Usage Analytics', () => {
    it('should track comprehensive usage metrics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      const source = 'parliament-ca';
      
      // Make several requests
      await apiManager.makeRequest(source, '/bills');
      await apiManager.makeRequest(source, '/sponsors');
      await apiManager.makeRequest(source, '/bills');

      const analytics = apiManager.getAPIAnalytics(source);
      
      expect(analytics.totalRequests).toBe(3);
      expect(analytics.sources.length).toBe(1);
      
      const sourceMetrics = analytics.sources[0];
      expect(sourceMetrics.source).toBe(source);
      expect(sourceMetrics.totalRequests).toBe(3);
      expect(sourceMetrics.successfulRequests).toBe(3);
      expect(sourceMetrics.failedRequests).toBe(0);
      expect(sourceMetrics.topEndpoints.length).toBeGreaterThan(0);
    });

    it('should calculate cost metrics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      const source = 'parliament-ca'; // Has costPerRequest: 0.001
      
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await apiManager.makeRequest(source, '/test');
      }

      const analytics = apiManager.getAPIAnalytics(source);
      const sourceMetrics = analytics.sources[0];
      
      expect(sourceMetrics.totalCost).toBe(0.01); // 10 * 0.001
      expect(analytics.totalCost).toBe(0.01);
    });
  });

  describe('Concurrent Request Limiting', () => {
    it('should enforce concurrent request limits', async () => {
      // Mock slow responses
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: 'slow response' })
          }), 100)
        )
      );

      const source = 'parliament-ca'; // Has maxConcurrentRequests: 5
      const endpoint = '/test';

      // Start 6 concurrent requests (exceeds limit of 5)
  const requests: Array<Promise<any>> = [];
      for (let i = 0; i < 6; i++) {
        requests.push(apiManager.makeRequest(source, endpoint));
      }

      const results = await Promise.all(requests);
      
      // At least one should fail due to concurrent limit
      const failedResults = results.filter(r => !r.success);
      const concurrentLimitErrors = failedResults.filter(r => 
        r.error?.type === 'CONCURRENT_LIMIT_EXCEEDED'
      );
      
      expect(concurrentLimitErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await apiManager.makeRequest('parliament-ca', '/test');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await apiManager.makeRequest('parliament-ca', '/test');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache for specific source', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      // Create cache entries for different sources
      await apiManager.makeRequest('parliament-ca', '/test');
      await apiManager.makeRequest('openparliament', '/test');

      let cacheStats = apiManager.getCacheStatistics();
      expect(cacheStats.totalEntries).toBe(2);

      // Clear cache for one source
      const clearedCount = apiManager.clearCache('parliament-ca');
      expect(clearedCount).toBe(1);

      cacheStats = apiManager.getCacheStatistics();
      expect(cacheStats.totalEntries).toBe(1);
    });

    it('should clear all cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      // Create cache entries
      await apiManager.makeRequest('parliament-ca', '/test1');
      await apiManager.makeRequest('parliament-ca', '/test2');
      await apiManager.makeRequest('openparliament', '/test');

      let cacheStats = apiManager.getCacheStatistics();
      expect(cacheStats.totalEntries).toBe(3);

      // Clear all cache
      const clearedCount = apiManager.clearCache();
      expect(clearedCount).toBe(3);

      cacheStats = apiManager.getCacheStatistics();
      expect(cacheStats.totalEntries).toBe(0);
    });
  });

  describe('Service Lifecycle', () => {
    it('should initialize with default configurations', () => {
      const healthStatuses = apiManager.getHealthStatus();
      
      // Should have default API sources configured
      expect(healthStatuses.length).toBeGreaterThan(0);
      
      const sources = healthStatuses.map(h => h.source);
      expect(sources).toContain('parliament-ca');
      expect(sources).toContain('openparliament');
      expect(sources).toContain('ontario-legislature');
    });

    it('should clean up resources on shutdown', () => {
      const initialHealthStatuses = apiManager.getHealthStatus();
      expect(initialHealthStatuses.length).toBeGreaterThan(0);

      apiManager.shutdown();

      // After shutdown, service should be cleaned up
      // Note: In a real implementation, you might want to verify
      // that intervals are cleared and resources are freed
    });
  });
});












































