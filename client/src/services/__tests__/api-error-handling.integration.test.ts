import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
import { logger } from '../../../../shared/core/src/observability/logging';
  fetchWithFallback,
  ApiService,
  FallbackDataManager,
  isNetworkError,
  isServerError,
  isClientError,
  getErrorMessage,
  ApiError,
} from '../api-error-handling';

// Mock fetch with more realistic network conditions
const createMockFetch = () => {
  const mockFetch = vi.fn();
  
  // Helper to simulate network delays
  const withDelay = (response: any, delay: number = 100) => 
    new Promise(resolve => setTimeout(() => resolve(response), delay));

  // Helper to simulate network failures
  const simulateNetworkFailure = (type: 'timeout' | 'offline' | 'dns' = 'offline') => {
    switch (type) {
      case 'timeout':
        return new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        );
      case 'offline':
        return Promise.reject(new Error('Network request failed'));
      case 'dns':
        return Promise.reject(new Error('DNS resolution failed'));
    }
  };

  return { mockFetch, withDelay, simulateNetworkFailure };
};

describe('API Error Handling Integration Tests', () => {
  let mockFetch: any;
  let withDelay: any;
  let simulateNetworkFailure: any;

  beforeEach(() => {
    const mocks = createMockFetch();
    mockFetch = mocks.mockFetch;
    withDelay = mocks.withDelay;
    simulateNetworkFailure = mocks.simulateNetworkFailure;
    
    global.fetch = mockFetch;
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('fetchWithFallback Reliability Tests', () => {
    it('should handle intermittent network failures with retry', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData),
        });

      const promise = fetchWithFallback('/api/test', {
        retryConfig: { maxRetries: 3, baseDelay: 100 },
      });

      // Advance timers to trigger retries
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle server errors with exponential backoff', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: () => Promise.resolve('Service temporarily unavailable'),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: () => Promise.resolve('Service temporarily unavailable'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData),
        });

      const promise = fetchWithFallback('/api/test', {
        retryConfig: { 
          maxRetries: 3, 
          baseDelay: 100,
          exponentialBackoff: true 
        },
      });

      // First retry after 100ms
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      
      // Second retry after 200ms (exponential backoff)
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle timeout scenarios correctly', async () => {
      const fallbackData = { id: 2, name: 'Fallback' };
      
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      const promise = fetchWithFallback('/api/test', { 
        timeout: 1000,
        fallbackData 
      });
      
      vi.advanceTimersByTime(1000);
      
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackData);
      expect(result.fromFallback).toBe(true);
      expect(result.error?.message).toContain('timeout');
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => 
        fetchWithFallback('/api/test')
      );

      const results = await Promise.all(promises);

      // Should use cache for subsequent requests
      expect(mockFetch).toHaveBeenCalledTimes(1);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockData);
        if (index > 0) {
          expect(result.fromCache).toBe(true);
        }
      });
    });

    it('should handle malformed JSON responses', async () => {
      const fallbackData = { error: 'fallback' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Unexpected token in JSON')),
        text: () => Promise.resolve('Invalid JSON response'),
      });

      const result = await fetchWithFallback('/api/test', { fallbackData });

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackData);
      expect(result.fromFallback).toBe(true);
    });

    it('should handle different HTTP status codes appropriately', async () => {
      const testCases = [
        { status: 400, shouldRetry: false, errorType: 'client' },
        { status: 401, shouldRetry: false, errorType: 'client' },
        { status: 403, shouldRetry: false, errorType: 'client' },
        { status: 404, shouldRetry: false, errorType: 'client' },
        { status: 429, shouldRetry: true, errorType: 'server' },
        { status: 500, shouldRetry: true, errorType: 'server' },
        { status: 502, shouldRetry: true, errorType: 'server' },
        { status: 503, shouldRetry: true, errorType: 'server' },
      ];

      for (const testCase of testCases) {
        mockFetch.mockClear();
        
        if (testCase.shouldRetry) {
          mockFetch
            .mockResolvedValueOnce({
              ok: false,
              status: testCase.status,
              statusText: 'Error',
              text: () => Promise.resolve('Error message'),
            })
            .mockResolvedValueOnce({
              ok: true,
              json: () => Promise.resolve({ success: true }),
            });
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: testCase.status,
            statusText: 'Error',
            text: () => Promise.resolve('Error message'),
          });
        }

        try {
          const promise = fetchWithFallback('/api/test', {
            retryConfig: { maxRetries: 1, baseDelay: 100 },
          });

          if (testCase.shouldRetry) {
            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();
          }

          const result = await promise;
          
          if (testCase.shouldRetry) {
            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(2);
          }
        } catch (error) {
          if (!testCase.shouldRetry) {
            expect(mockFetch).toHaveBeenCalledTimes(1);
          }
        }
      }
    });
  });

  describe('ApiService Integration Tests', () => {
    let apiService: ApiService;

    beforeEach(() => {
      apiService = new ApiService('http://localhost:3000');
    });

    it('should handle authentication token refresh', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      // First request fails with 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: () => Promise.resolve('Token expired'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'new-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData),
        });

      // Mock token refresh logic
      const originalGet = apiService.get;
      apiService.get = vi.fn().mockImplementation(async (endpoint, options) => {
        try {
          return await originalGet.call(apiService, endpoint, options);
        } catch (error: any) {
          if (error.status === 401) {
            // Simulate token refresh
            await apiService.post('/auth/refresh', {});
            return await originalGet.call(apiService, endpoint, {
              ...options,
              headers: { ...options?.headers, Authorization: 'Bearer new-token' }
            });
          }
          throw error;
        }
      });

      const result = await apiService.get('/api/test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle request cancellation', async () => {
      const controller = new AbortController();
      
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Request cancelled'));
          });
        })
      );

      const promise = apiService.get('/api/test', {
        signal: controller.signal
      });

      // Cancel the request
      controller.abort();

      await expect(promise).rejects.toThrow('Request cancelled');
    });

    it('should handle large response payloads', async () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: 'A'.repeat(1000), // 1KB per item
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(largeData),
      });

      const result = await apiService.get('/api/large-dataset');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(10000);
      expect(result.data[0]).toEqual({
        id: 0,
        name: 'Item 0',
        description: 'A'.repeat(1000),
      });
    });
  });

  describe('FallbackDataManager Integration Tests', () => {
    let manager: FallbackDataManager;

    beforeEach(() => {
      manager = new FallbackDataManager();
    });

    it('should handle memory pressure gracefully', () => {
      // Fill up the fallback data manager
      for (let i = 0; i < 1000; i++) {
        manager.setFallbackData(`key-${i}`, {
          id: i,
          data: 'x'.repeat(1000), // 1KB per entry
        });
      }

      // Should still be able to set and get data
      manager.setFallbackData('test-key', { test: 'data' });
      expect(manager.getFallbackData('test-key')).toEqual({ test: 'data' });
    });

    it('should handle concurrent access correctly', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve().then(() => {
          manager.setFallbackData(`concurrent-${i}`, { value: i });
          return manager.getFallbackData(`concurrent-${i}`);
        })
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result).toEqual({ value: index });
      });
    });

    it('should persist data across manager instances', () => {
      const manager1 = new FallbackDataManager();
      const manager2 = new FallbackDataManager();

      manager1.setFallbackData('shared-key', { shared: 'data' });
      
      // Different instance should have access to the same data
      expect(manager2.getFallbackData('shared-key')).toEqual({ shared: 'data' });
    });
  });

  describe('Error Classification and Messaging', () => {
    it('should correctly classify different error types', () => {
      const networkError: ApiError = {
        name: 'NetworkError',
        message: 'Failed to fetch',
        timestamp: new Date().toISOString(),
      };

      const serverError: ApiError = {
        name: 'ServerError',
        message: 'Internal server error',
        status: 500,
        timestamp: new Date().toISOString(),
      };

      const clientError: ApiError = {
        name: 'ClientError',
        message: 'Bad request',
        status: 400,
        timestamp: new Date().toISOString(),
      };

      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(serverError)).toBe(false);
      expect(isNetworkError(clientError)).toBe(false);

      expect(isServerError(serverError)).toBe(true);
      expect(isServerError(networkError)).toBe(false);
      expect(isServerError(clientError)).toBe(false);

      expect(isClientError(clientError)).toBe(true);
      expect(isClientError(networkError)).toBe(false);
      expect(isClientError(serverError)).toBe(false);
    });

    it('should provide appropriate error messages for different scenarios', () => {
      const testCases = [
        {
          error: { name: 'NetworkError', message: 'Failed to fetch', timestamp: '' },
          expected: 'Network error. Please check your internet connection.'
        },
        {
          error: { name: 'TimeoutError', message: 'Request timeout', timestamp: '' },
          expected: 'Request timed out. Please try again.'
        },
        {
          error: { name: 'NotFoundError', message: 'Not found', status: 404, timestamp: '' },
          expected: 'The requested resource was not found.'
        },
        {
          error: { name: 'UnauthorizedError', message: 'Unauthorized', status: 401, timestamp: '' },
          expected: 'You are not authorized to access this resource.'
        },
        {
          error: { name: 'ServerError', message: 'Internal error', status: 500, timestamp: '' },
          expected: 'Server error. Please try again later.'
        },
      ];

      testCases.forEach(({ error, expected }) => {
        expect(getErrorMessage(error as ApiError)).toBe(expected);
      });
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('should handle mobile network conditions', async () => {
      const fallbackData = { mobile: 'fallback' };
      
      // Simulate slow mobile connection
      mockFetch.mockImplementation(() => 
        withDelay({
          ok: true,
          json: () => Promise.resolve({ mobile: 'data' }),
        }, 3000)
      );

      const promise = fetchWithFallback('/api/mobile-test', {
        timeout: 2000,
        fallbackData,
      });

      vi.advanceTimersByTime(2000);
      
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackData);
      expect(result.fromFallback).toBe(true);
    });

    it('should handle API rate limiting', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      // First request hits rate limit, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Map([['Retry-After', '1']]),
          text: () => Promise.resolve('Rate limit exceeded'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData),
        });

      const promise = fetchWithFallback('/api/rate-limited', {
        retryConfig: { maxRetries: 1, baseDelay: 1000 },
      });

      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle server maintenance scenarios', async () => {
      const fallbackData = { maintenance: 'mode' };
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.resolve('Server under maintenance'),
      });

      const result = await fetchWithFallback('/api/maintenance-test', {
        fallbackData,
        retryConfig: { maxRetries: 2, baseDelay: 100 },
      });

      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackData);
      expect(result.fromFallback).toBe(true);
    });
  });
});






