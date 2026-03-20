/**
 * Unit Tests for UnifiedApiClientImpl
 * 
 * Tests HTTP client methods, interceptors, retry logic, circuit breaker,
 * caching, timeout handling, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedApiClientImpl } from '../client';
import type { ClientConfig } from '../types';

// Mock dependencies
vi.mock('@client/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../cache-manager', () => ({
  globalCache: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  CacheKeyGenerator: {
    generate: vi.fn((url: string) => `cache_${url}`),
  },
}));

vi.mock('../config', () => ({
  globalConfig: {
    get: vi.fn((key: string) => {
      if (key === 'api') {
        return {
          baseUrl: 'https://api.example.com',
          timeout: 5000,
          retry: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
          },
          cache: {
            defaultTTL: 300000,
          },
        };
      }
      if (key === 'websocket') {
        return {
          url: 'wss://api.example.com/ws',
        };
      }
      return {};
    }),
  },
}));

vi.mock('../error', () => ({
  ErrorFactory: {
    createNetworkError: vi.fn((message: string) => new Error(message)),
  },
  ErrorDomain: {
    NETWORK: 'NETWORK',
  },
}));

vi.mock('../../error', () => ({
  default: {
    handleError: vi.fn(),
  },
}));

vi.mock('../../auth', () => ({
  createAuthApiService: vi.fn(() => ({})),
}));

describe('UnifiedApiClientImpl', () => {
  let client: UnifiedApiClientImpl;
  let fetchMock: ReturnType<typeof vi.fn>;

  const defaultConfig: ClientConfig = {
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    retry: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    },
    cache: {
      defaultTTL: 300000,
      maxSize: 100,
      storage: 'memory' as const,
      compression: false,
      encryption: false,
      evictionPolicy: 'lru' as const,
    },
    websocket: {
      url: 'wss://api.example.com/ws',
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
      },
      message: {
        compression: false,
        batching: false,
        batchSize: 10,
        batchInterval: 100,
        maxMessageSize: 1048576,
      },
      authentication: {
        type: 'token' as const,
      },
    },
    headers: {
      'Content-Type': 'application/json',
    },
  };

  beforeEach(() => {
    // Setup fetch mock
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Create client instance
    client = new UnifiedApiClientImpl(defaultConfig);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HTTP Methods', () => {
    it('should make GET request successfully', async () => {
      const mockData = { id: 1, name: 'Test' };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => mockData,
        text: async () => JSON.stringify(mockData),
      });

      const response = await client.get<typeof mockData>('/test');

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: undefined })
      );
    });

    it('should make POST request with data', async () => {
      const requestData = { name: 'New Item' };
      const responseData = { id: 1, ...requestData };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Headers(),
        json: async () => responseData,
        text: async () => JSON.stringify(responseData),
      });

      const response = await client.post<typeof responseData>('/items', requestData);

      expect(response.status).toBe(201);
      expect(response.data).toEqual(responseData);
    });

    it('should make PUT request with data', async () => {
      const requestData = { name: 'Updated Item' };
      const responseData = { id: 1, ...requestData };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => responseData,
        text: async () => JSON.stringify(responseData),
      });

      const response = await client.put<typeof responseData>('/items/1', requestData);

      expect(response.status).toBe(200);
      expect(response.data).toEqual(responseData);
    });

    it('should make PATCH request with data', async () => {
      const requestData = { name: 'Patched Item' };
      const responseData = { id: 1, ...requestData };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => responseData,
        text: async () => JSON.stringify(responseData),
      });

      const response = await client.patch<typeof responseData>('/items/1', requestData);

      expect(response.status).toBe(200);
      expect(response.data).toEqual(responseData);
    });

    it('should make DELETE request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: async () => null,
        text: async () => '',
      });

      const response = await client.delete('/items/1');

      expect(response.status).toBe(204);
    });
  });

  describe('Request Interceptors', () => {
    it('should apply request interceptors', async () => {
      const interceptor = vi.fn((config) => ({
        ...config,
        headers: { ...config.headers, 'X-Custom': 'test' },
      }));

      client.addRequestInterceptor(interceptor);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({}),
        text: async () => '{}',
      });

      await client.get('/test');

      expect(interceptor).toHaveBeenCalled();
    });
  });

  describe('Response Interceptors', () => {
    it('should apply response interceptors', async () => {
      const interceptor = vi.fn((response) => response);

      client.addResponseInterceptor(interceptor);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({ data: 'test' }),
        text: async () => '{"data":"test"}',
      });

      await client.get('/test');

      expect(interceptor).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow();
    });

    it('should handle HTTP error responses', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: async () => ({ error: 'Not found' }),
        text: async () => '{"error":"Not found"}',
      });

      await expect(client.get('/test')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      fetchMock.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const shortTimeoutClient = new UnifiedApiClientImpl({
        ...defaultConfig,
        timeout: 100,
      });

      await expect(shortTimeoutClient.get('/test')).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({ success: true }),
          text: async () => '{"success":true}',
        });

      const response = await client.get('/test');

      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should respect max retries', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow();

      expect(fetchMock).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('Caching', () => {
    it('should cache GET requests', async () => {
      const mockData = { id: 1, name: 'Test' };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => mockData,
        text: async () => JSON.stringify(mockData),
      });

      // First request
      await client.get('/test', { cache: { ttl: 300000 } });

      // Second request should use cache
      await client.get('/test', { cache: { ttl: 300000 } });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should not cache non-GET requests', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({}),
        text: async () => '{}',
      });

      await client.post('/test', {}, { cache: { ttl: 300000 } });
      await client.post('/test', {}, { cache: { ttl: 300000 } });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after consecutive failures', async () => {
      fetchMock.mockRejectedValue(new Error('Service unavailable'));

      // Trigger multiple failures
      for (let i = 0; i < 5; i++) {
        try {
          await client.get('/test');
        } catch {
          // Expected to fail
        }
      }

      // Circuit should be open now
      await expect(client.get('/test')).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use custom base URL', async () => {
      const customClient = new UnifiedApiClientImpl({
        ...defaultConfig,
        baseUrl: 'https://custom.api.com',
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({}),
        text: async () => '{}',
      });

      await customClient.get('/test');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('https://custom.api.com'),
        expect.any(Object)
      );
    });

    it('should merge custom headers', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({}),
        text: async () => '{}',
      });

      await client.get('/test', {
        headers: { 'X-Custom': 'value' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        })
      );
    });
  });

  describe('Request Cancellation', () => {
    it('should support AbortController', async () => {
      const controller = new AbortController();

      fetchMock.mockImplementationOnce(
        () => new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Request aborted'));
          });
        })
      );

      const requestPromise = client.get('/test', { signal: controller.signal });

      controller.abort();

      await expect(requestPromise).rejects.toThrow();
    });
  });
});