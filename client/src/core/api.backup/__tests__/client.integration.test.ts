/**
 * API Client Integration Tests
 *
 * Tests the UnifiedApiClientImpl with real HTTP calls (mocked) to ensure
 * proper integration of caching, retry logic, circuit breaker, and WebSocket functionality.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { UnifiedApiClientImpl, globalApiClient } from '../client';
import { ApiResponse } from '@client/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock WebSocket
class MockWebSocket {
  onopen: any;
  onmessage: any;
  onclose: any;
  onerror: any;
  readyState = 1; // OPEN

  constructor() {}
  send() {}
  close() {}
}

(global as any).WebSocket = MockWebSocket;

describe('UnifiedApiClientImpl Integration', () => {
  let client: UnifiedApiClientImpl;

  const mockConfig = {
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    retry: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000, backoffMultiplier: 2 },
    cache: { defaultTTL: 300000, maxSize: 100, storage: 'memory' },
    websocket: { url: 'ws://localhost:3000', reconnect: { enabled: true } },
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token123' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new UnifiedApiClientImpl(mockConfig);
  });

  afterEach(() => {
    client.cleanup();
  });

  describe('HTTP Methods Integration', () => {
    const mockApiResponse = {
      id: 'test-123',
      name: 'Test Item',
      createdAt: '2024-01-01T00:00:00Z'
    };

    const mockFetchResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: jest.fn((key: string) => {
          const headers: Record<string, string> = {
            'content-type': 'application/json',
            'x-request-id': 'req-123'
          };
          return headers[key.toLowerCase()];
        })
      },
      json: jest.fn().mockResolvedValue(mockApiResponse),
      text: jest.fn().mockResolvedValue(JSON.stringify(mockApiResponse))
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue(mockFetchResponse);
    });

    it('should make GET request with proper headers and caching', async () => {
      const endpoint = '/users/123';

      const result = await client.get(endpoint);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123'
          })
        })
      );

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockApiResponse);
      expect(result.cached).toBe(false);
      expect(result.fromFallback).toBe(false);
    });

    it('should make POST request with data', async () => {
      const endpoint = '/users';
      const data = { name: 'New User', email: 'user@example.com' };

      const result = await client.post(endpoint, data);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123'
          })
        })
      );

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockApiResponse);
    });

    it('should make PUT request with data', async () => {
      const endpoint = '/users/123';
      const data = { name: 'Updated User' };

      const result = await client.put(endpoint, data);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );

      expect(result.status).toBe(200);
    });

    it('should make PATCH request with data', async () => {
      const endpoint = '/users/123';
      const data = { email: 'newemail@example.com' };

      const result = await client.patch(endpoint, data);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data)
        })
      );

      expect(result.status).toBe(200);
    });

    it('should make DELETE request', async () => {
      const endpoint = '/users/123';

      const result = await client.delete(endpoint);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );

      expect(result.status).toBe(200);
    });
  });

  describe('Caching Integration', () => {
    it('should cache GET responses and return cached data on subsequent calls', async () => {
      const endpoint = '/users/profile';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn((key: string) => {
            const headers: Record<string, string> = {
              'content-type': 'application/json'
            };
            return headers[key.toLowerCase()];
          })
        },
        json: jest.fn().mockResolvedValue({ id: 123, name: 'Test User' }),
        text: jest.fn()
      };

      mockFetch.mockResolvedValue(mockResponse);

      // First call - should hit API
      const result1 = await client.get(endpoint);
      expect(result1.cached).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should return cached data
      const result2 = await client.get(endpoint);
      expect(result2.cached).toBe(true);
      expect(result2.data).toEqual(result1.data);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 API call
    });

    it('should respect cache TTL options', async () => {
      const endpoint = '/users/profile';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn((key: string) => 'application/json')
        },
        json: jest.fn().mockResolvedValue({ id: 123, name: 'Test User' }),
        text: jest.fn()
      };

      mockFetch.mockResolvedValue(mockResponse);

      // Call with custom cache TTL
      await client.get(endpoint, { cache: { ttl: 1000 } });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry Logic Integration', () => {
    it('should retry on server errors (5xx)', async () => {
      const endpoint = '/users/123';

      // First two calls fail with 500, third succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: { get: jest.fn() },
          json: jest.fn().mockResolvedValue({ error: 'Server error' }),
          text: jest.fn()
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          headers: { get: jest.fn() },
          json: jest.fn().mockResolvedValue({ error: 'Bad gateway' }),
          text: jest.fn()
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: jest.fn((key: string) => 'application/json') },
          json: jest.fn().mockResolvedValue({ id: 123, name: 'Test User' }),
          text: jest.fn()
        });

      const result = await client.get(endpoint);

      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ id: 123, name: 'Test User' });
    });

    it('should retry on rate limiting (429)', async () => {
      const endpoint = '/users/123';

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: { get: jest.fn() },
          json: jest.fn().mockResolvedValue({ error: 'Rate limited' }),
          text: jest.fn()
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: jest.fn((key: string) => 'application/json') },
          json: jest.fn().mockResolvedValue({ id: 123, name: 'Test User' }),
          text: jest.fn()
        });

      const result = await client.get(endpoint);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(200);
    });

    it('should not retry on client errors (4xx)', async () => {
      const endpoint = '/users/999';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: { get: jest.fn() },
        json: jest.fn().mockResolvedValue({ error: 'User not found' }),
        text: jest.fn()
      });

      const result = await client.get(endpoint);

      expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial call
      expect(result.status).toBe(404);
    });

    it('should respect custom retry configuration', async () => {
      const endpoint = '/users/123';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: jest.fn() },
        json: jest.fn().mockResolvedValue({ error: 'Server error' }),
        text: jest.fn()
      });

      const customRetry = { maxRetries: 1, baseDelay: 500 };

      await client.get(endpoint, { retry: customRetry });

      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit after consecutive failures', async () => {
      const endpoint = '/unstable-endpoint';

      // Mock 5 consecutive failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: { get: jest.fn() },
          json: jest.fn().mockResolvedValue({ error: 'Server error' }),
          text: jest.fn()
        });
      }

      // Make 5 failing requests
      for (let i = 0; i < 5; i++) {
        try {
          await client.get(endpoint);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next request should be blocked by circuit breaker
      await expect(client.get(endpoint)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should allow requests through half-open circuit after timeout', async () => {
      const endpoint = '/unstable-endpoint';

      // Force circuit to open
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: { get: jest.fn() },
          json: jest.fn().mockResolvedValue({ error: 'Server error' }),
          text: jest.fn()
        });
      }

      for (let i = 0; i < 5; i++) {
        try {
          await client.get(endpoint);
        } catch (error) {
          // Expected to fail
        }
      }

      // Mock successful response for half-open test
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: jest.fn((key: string) => 'application/json') },
        json: jest.fn().mockResolvedValue({ success: true }),
        text: jest.fn()
      });

      // Fast-forward time to simulate recovery timeout
      jest.advanceTimersByTime(65000);

      const result = await client.get(endpoint);

      expect(result.status).toBe(200);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout requests that exceed configured timeout', async () => {
      const endpoint = '/slow-endpoint';

      // Mock a slow response that doesn't resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const timeoutPromise = client.get(endpoint, { timeout: 100 });

      await expect(timeoutPromise).rejects.toThrow('Request timeout');
    });
  });

  describe('Request Interceptors', () => {
    it('should apply request interceptors', async () => {
      const endpoint = '/users/123';

      // Add a request interceptor that adds a custom header
      client.addRequestInterceptor({
        intercept: async (request) => {
          return {
            ...request,
            headers: {
              ...request.headers,
              'X-Custom-Header': 'test-value'
            }
          };
        }
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: jest.fn((key: string) => 'application/json') },
        json: jest.fn().mockResolvedValue({ id: 123 }),
        text: jest.fn()
      });

      await client.get(endpoint);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value'
          })
        })
      );
    });
  });

  describe('Response Interceptors', () => {
    it('should apply response interceptors', async () => {
      const endpoint = '/users/123';

      // Add a response interceptor that modifies the response
      client.addResponseInterceptor({
        intercept: async (response) => {
          return {
            ...response,
            data: { ...response.data, intercepted: true }
          };
        }
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: jest.fn((key: string) => 'application/json') },
        json: jest.fn().mockResolvedValue({ id: 123, name: 'Test' }),
        text: jest.fn()
      });

      const result = await client.get(endpoint);

      expect(result.data).toEqual({
        id: 123,
        name: 'Test',
        intercepted: true
      });
    });
  });

  describe('Query Parameters', () => {
    it('should append query parameters to URL', async () => {
      const endpoint = '/users';
      const params = { page: 2, limit: 10, sort: 'name' };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: jest.fn((key: string) => 'application/json') },
        json: jest.fn().mockResolvedValue([]),
        text: jest.fn()
      });

      await client.get(endpoint, { params });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users?page=2&limit=10&sort=name',
        expect.any(Object)
      );
    });

    it('should handle array parameters', async () => {
      const endpoint = '/users';
      const params = { ids: [1, 2, 3], status: 'active' };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: jest.fn((key: string) => 'application/json') },
        json: jest.fn().mockResolvedValue([]),
        text: jest.fn()
      });

      await client.get(endpoint, { params });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users?ids=1%2C2%2C3&status=active',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const endpoint = '/users/123';

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.get(endpoint)).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      const endpoint = '/users/123';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: jest.fn((key: string) => 'application/json') },
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: jest.fn().mockResolvedValue('invalid json')
      });

      const result = await client.get(endpoint);

      expect(result.status).toBe(200);
      expect(result.data).toBe('invalid json');
    });
  });

  describe('Lifecycle Management', () => {
    it('should initialize properly', async () => {
      await client.initialize();

      // Should have default interceptors
      expect(client).toBeDefined();
    });

    it('should cleanup resources', () => {
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

      client.cleanup();

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('Global API Client', () => {
    it('should have properly configured global client', () => {
      expect(globalApiClient).toBeDefined();
      expect(globalApiClient.getConfig().baseUrl).toBeDefined();
      expect(globalApiClient.getConfig().timeout).toBeGreaterThan(0);
    });
  });
});