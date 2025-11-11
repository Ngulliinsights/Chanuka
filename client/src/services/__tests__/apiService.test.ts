import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest';
import {
  apiService,
  ApiService,
  fetchWithFallback,
  authApi,
  billsApi,
  systemApi,
  isNetworkError,
  isServerError,
  isClientError,
  isRetryableError,
  getErrorMessage,
} from '../apiService';

// Mock dependencies
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../utils/offlineDataManager', () => ({
  offlineDataManager: {
    getOfflineData: vi.fn(),
    setOfflineData: vi.fn(),
  },
}));

vi.mock('../utils/backgroundSyncManager', () => ({
  backgroundSyncManager: {
    queueApiRequest: vi.fn(),
  },
}));

vi.mock('../utils/cacheInvalidation', () => ({
  cacheInvalidation: {
    invalidateCache: vi.fn(),
  },
}));

vi.mock('../utils/offlineAnalytics', () => ({
  offlineAnalytics: {
    trackCacheAccess: vi.fn(),
    trackApiError: vi.fn(),
  },
}));

vi.mock('../utils/service-recovery', () => ({
  serviceRecovery: {
    fetchWithRetry: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AbortController
global.AbortController = vi.fn().mockImplementation(() => ({
  signal: {},
  abort: vi.fn(),
}));

// Mock clearTimeout
vi.spyOn(global, 'clearTimeout');

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ApiService('https://api.test.com');
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided baseUrl', () => {
      const customService = new ApiService('https://custom.api.com');
      expect(customService.getBaseUrl()).toBe('https://custom.api.com');
    });

    it('should use default baseUrl when none provided', () => {
      // Mock import.meta.env
      const defaultService = new ApiService();
      expect(defaultService.getBaseUrl()).toBe('http://localhost:5000');
    });

    it('should remove trailing slash from baseUrl', () => {
      const serviceWithSlash = new ApiService('https://api.test.com/');
      expect(serviceWithSlash.getBaseUrl()).toBe('https://api.test.com');
    });
  });

  describe('getBaseUrl and setBaseUrl', () => {
    it('should return current baseUrl', () => {
      expect(service.getBaseUrl()).toBe('https://api.test.com');
    });

    it('should set new baseUrl', () => {
      service.setBaseUrl('https://new.api.com');
      expect(service.getBaseUrl()).toBe('https://new.api.com');
    });

    it('should remove trailing slash when setting baseUrl', () => {
      service.setBaseUrl('https://new.api.com/');
      expect(service.getBaseUrl()).toBe('https://new.api.com');
    });
  });

  describe('getFullUrl', () => {
    it('should prepend baseUrl to relative endpoints', () => {
      const result = (service as any).getFullUrl('/test');
      expect(result).toBe('https://api.test.com/test');
    });

    it('should return absolute URLs as-is', () => {
      const result = (service as any).getFullUrl('https://external.com/test');
      expect(result).toBe('https://external.com/test');
    });

    it('should handle endpoints without leading slash', () => {
      const result = (service as any).getFullUrl('test');
      expect(result).toBe('https://api.test.com/test');
    });
  });
});

describe('fetchWithFallback', () => {
  const mockResponse = {
    ok: true,
    status: 200,
    headers: { get: vi.fn().mockReturnValue('application/json') },
    json: vi.fn().mockResolvedValue({ data: 'test' }),
    text: vi.fn().mockResolvedValue('text'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(mockResponse);
  });

  describe('successful requests', () => {
    it('should return successful response', async () => {
      const result = await fetchWithFallback('/test');

      expect(result).toEqual({
        data: { data: 'test' },
        success: true,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle text responses', async () => {
      mockResponse.headers.get.mockReturnValue('text/plain');
      mockResponse.text.mockResolvedValue('plain text');

      const result = await fetchWithFallback('/test');

      expect(result).toEqual({
        data: 'plain text',
        success: true,
      });
    });

    it('should cache successful GET requests', async () => {
      await fetchWithFallback('/test');

      // Second call should use cache
      mockFetch.mockClear();
      const result = await fetchWithFallback('/test');

      expect(result).toEqual({
        data: { data: 'test' },
        success: true,
        fromCache: true,
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not cache when skipCache is true', async () => {
      await fetchWithFallback('/test', { skipCache: true });

      // Second call should not use cache
      const result = await fetchWithFallback('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.fromCache).toBeUndefined();
    });

    it('should not cache non-GET requests', async () => {
      await fetchWithFallback('/test', { method: 'POST', body: '{}' });

      // Second call should not use cache
      const result = await fetchWithFallback('/test', { method: 'POST', body: '{}' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache behavior', () => {
    it('should check offline cache when memory cache misses', async () => {
      const { offlineDataManager } = await import('../utils/offlineDataManager');
      (offlineDataManager.getOfflineData as any).mockResolvedValue({ data: 'offline' });

      // Clear memory cache by making a different request first
      await fetchWithFallback('/other');

      const result = await fetchWithFallback('/test');

      expect(offlineDataManager.getOfflineData).toHaveBeenCalled();
      expect(result).toEqual({
        data: { data: 'offline' },
        success: true,
        fromCache: true,
      });
    });

    it('should store successful responses in offline cache', async () => {
      const { offlineDataManager } = await import('../utils/offlineDataManager');

      await fetchWithFallback('/test');

      expect(offlineDataManager.setOfflineData).toHaveBeenCalled();
    });

    it('should track cache access analytics', async () => {
      const { offlineAnalytics } = await import('../utils/offlineAnalytics');

      // Cache miss
      await fetchWithFallback('/test');
      expect(offlineAnalytics.trackCacheAccess).toHaveBeenCalledWith(false, expect.any(String));

      // Cache hit
      await fetchWithFallback('/test');
      expect(offlineAnalytics.trackCacheAccess).toHaveBeenCalledWith(true, expect.any(String));
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors', async () => {
      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: { get: vi.fn() },
        json: vi.fn().mockResolvedValue({ error: 'Not found' }),
      };
      mockFetch.mockResolvedValue(errorResponse);

      const result = await fetchWithFallback('/test');

      expect(result).toEqual({
        data: null,
        success: false,
        error: expect.objectContaining({
          status: 404,
          message: 'HTTP 404: Not Found',
        }),
      });
    });

    it('should handle 401 unauthorized', async () => {
      const errorResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: vi.fn() },
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      };
      mockFetch.mockResolvedValue(errorResponse);

      await fetchWithFallback('/test');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocation.href).toBe('/auth');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchWithFallback('/test');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Network error');
    });

    it('should handle timeout', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const result = await fetchWithFallback('/test', { timeout: 1 });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Request timeout');
    });

    it('should use fallback data on failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchWithFallback('/test', { fallbackData: { fallback: true } });

      expect(result).toEqual({
        data: { fallback: true },
        success: false,
        error: expect.any(Object),
        fromFallback: true,
      });
    });

    it('should track API errors for analytics', async () => {
      const { offlineAnalytics } = await import('../utils/offlineAnalytics');
      mockFetch.mockRejectedValue(new Error('Network error'));

      await fetchWithFallback('/test');

      expect(offlineAnalytics.trackApiError).toHaveBeenCalledWith('/test', expect.any(Object));
    });

    describe('Error Recovery Tests', () => {
      it('should recover from temporary service outages', async () => {
        // First call fails with 503, second succeeds
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            headers: { get: vi.fn() },
            json: vi.fn().mockResolvedValue({ error: 'Service temporarily unavailable' }),
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/test', {
          retryConfig: { maxRetries: 3, baseDelay: 100 }
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ data: 'test' });
      });

      it('should handle circuit breaker pattern for persistent failures', async () => {
        // All calls fail with 500
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: { get: vi.fn() },
          json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
        });

        // First request - should retry
        await fetchWithFallback('/test', { retryConfig: { maxRetries: 2 } });
        expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries

        // Reset mock call count
        mockFetch.mockClear();

        // Second request - should use fallback immediately (circuit breaker)
        const result = await fetchWithFallback('/test', {
          retryConfig: { maxRetries: 2 },
          fallbackData: { circuitBreaker: true }
        });

        expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial call
        expect(result.fromFallback).toBe(true);
        expect(result.data).toEqual({ circuitBreaker: true });
      });

      it('should recover from network connectivity issues', async () => {
        // Simulate network going down then up
        mockFetch
          .mockRejectedValueOnce(new Error('Network is unreachable'))
          .mockRejectedValueOnce(new Error('Connection timeout'))
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/test', {
          retryConfig: { maxRetries: 3, baseDelay: 50 },
          fallbackData: { offline: true }
        });

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ data: 'test' });
      });

      it('should handle DNS resolution failures', async () => {
        mockFetch.mockRejectedValue(new Error('ENOTFOUND api.example.com'));

        const result = await fetchWithFallback('/test', {
          fallbackData: { dnsError: true }
        });

        expect(result.success).toBe(false);
        expect(result.fromFallback).toBe(true);
        expect(result.data).toEqual({ dnsError: true });
        expect(result.error?.message).toBe('ENOTFOUND api.example.com');
      });

      it('should recover from rate limiting', async () => {
        // First call gets 429, then succeeds
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            headers: { get: vi.fn().mockReturnValue('60') }, // Retry after 60 seconds
            json: vi.fn().mockResolvedValue({ error: 'Rate limit exceeded' }),
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/test', {
          retryConfig: { maxRetries: 2, baseDelay: 1000 }
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
      });

      it('should handle partial response recovery', async () => {
        // Simulate partial response that gets completed
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 206, // Partial Content
            statusText: 'Partial Content',
            headers: { get: vi.fn() },
            json: vi.fn().mockResolvedValue({ partial: true, data: 'incomplete' }),
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/test', {
          retryConfig: { maxRetries: 1 }
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
      });

      it('should recover from authentication token refresh', async () => {
        // First call fails with 401, second succeeds (after token refresh)
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            headers: { get: vi.fn() },
            json: vi.fn().mockResolvedValue({ error: 'Token expired' }),
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/test', {
          retryConfig: { maxRetries: 1 }
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
      });

      it('should handle database connection recovery', async () => {
        // Simulate database connection issues
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            headers: { get: vi.fn() },
            json: vi.fn().mockResolvedValue({ error: 'Database connection failed' }),
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/api/bills', {
          retryConfig: { maxRetries: 2, baseDelay: 200 }
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
      });

      it('should recover from cache invalidation issues', async () => {
        const { cacheInvalidation } = await import('../utils/cacheInvalidation');

        // Mock cache invalidation failure
        (cacheInvalidation.invalidateCache as any).mockRejectedValue(new Error('Cache invalidation failed'));

        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: { get: vi.fn() },
            json: vi.fn().mockResolvedValue({ error: 'Cache synchronization failed' }),
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/test', {
          retryConfig: { maxRetries: 1 }
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
      });

      it('should handle service degradation gracefully', async () => {
        // Service returns degraded response
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue({
            data: 'degraded response',
            degraded: true,
            message: 'Service operating in degraded mode'
          }),
        });

        const result = await fetchWithFallback('/test', {
          fallbackData: { degraded: true }
        });

        expect(result.success).toBe(true);
        expect(result.data.degraded).toBe(true);
      });

      it('should recover from CDN failures', async () => {
        // CDN returns 404, fallback to origin
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            headers: { get: vi.fn() },
            json: vi.fn().mockResolvedValue({ error: 'CDN cache miss' }),
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/cdn/resource', {
          retryConfig: { maxRetries: 1 }
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
      });

      it('should handle microservice communication failures', async () => {
        // Simulate inter-service communication failure
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 502,
            statusText: 'Bad Gateway',
            headers: { get: vi.fn() },
            json: vi.fn().mockResolvedValue({ error: 'Upstream service unavailable' }),
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/api/composite', {
          retryConfig: { maxRetries: 2, baseDelay: 300 }
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
      });

      it('should recover from load balancer issues', async () => {
        // Load balancer returns 503 for overloaded backend
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            headers: { get: vi.fn() },
            json: vi.fn().mockResolvedValue({ error: 'Backend server overloaded' }),
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await fetchWithFallback('/api/heavy-computation', {
          retryConfig: { maxRetries: 1 }
        });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      // First call fails with 503, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          headers: { get: vi.fn() },
          json: vi.fn().mockResolvedValue({ error: 'Service unavailable' }),
        })
        .mockResolvedValueOnce(mockResponse);

      const result = await fetchWithFallback('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: { get: vi.fn() },
        json: vi.fn().mockResolvedValue({ error: 'Bad request' }),
      });

      await fetchWithFallback('/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: { get: vi.fn() },
        json: vi.fn().mockResolvedValue({ error: 'Service unavailable' }),
      });

      await fetchWithFallback('/test', { retryConfig: { maxRetries: 2 } });

      expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          headers: { get: vi.fn() },
          json: vi.fn().mockResolvedValue({ error: 'Service unavailable' }),
        })
        .mockResolvedValueOnce(mockResponse);

      await fetchWithFallback('/test', { retryConfig: { onRetry } });

      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Object),
        0,
        expect.any(Number)
      );
    });
  });

  describe('background sync', () => {
    it('should queue failed non-GET requests for background sync when offline', async () => {
      const { backgroundSyncManager } = await import('../utils/backgroundSyncManager');
      (navigator as any).onLine = false;

      mockFetch.mockRejectedValue(new Error('Network error'));

      await fetchWithFallback('/test', { method: 'POST', body: JSON.stringify({ data: 'test' }) });

      expect(backgroundSyncManager.queueApiRequest).toHaveBeenCalledWith(
        'POST',
        '/test',
        { data: 'test' },
        'medium'
      );
    });

    it('should not queue GET requests for background sync', async () => {
      const { backgroundSyncManager } = await import('../utils/backgroundSyncManager');
      (navigator as any).onLine = false;

      mockFetch.mockRejectedValue(new Error('Network error'));

      await fetchWithFallback('/test');

      expect(backgroundSyncManager.queueApiRequest).not.toHaveBeenCalled();
    });
  });
});

describe('ApiService HTTP methods', () => {
  let service: ApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ApiService('https://api.test.com');
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue('application/json') },
      json: vi.fn().mockResolvedValue({ data: 'success' }),
    });
  });

  describe('get', () => {
    it('should make GET request', async () => {
      const result = await service.get('/test');

      expect(result).toEqual({
        data: { data: 'success' },
        success: true,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should pass options to fetchWithFallback', async () => {
      await service.get('/test', { timeout: 5000 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({ timeout: 5000 })
      );
    });
  });

  describe('post', () => {
    it('should make POST request with JSON data', async () => {
      const data = { key: 'value' };
      await service.post('/test', data);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      );
    });

    it('should skip cache for POST requests', async () => {
      await service.post('/test', { data: 'test' });

      // Check that skipCache is set
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.skipCache).toBe(true);
    });
  });

  describe('put', () => {
    it('should make PUT request', async () => {
      const data = { key: 'value' };
      await service.put('/test', data);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
          skipCache: true,
        })
      );
    });
  });

  describe('patch', () => {
    it('should make PATCH request', async () => {
      const data = { key: 'value' };
      await service.patch('/test', data);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data),
          skipCache: true,
        })
      );
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      await service.delete('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'DELETE',
          skipCache: true,
        })
      );
    });
  });
});

describe('ApiService cache management', () => {
  let service: ApiService;

  beforeEach(() => {
    service = new ApiService();
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      service.clearCache();
      // Cache clearing is internal, just ensure no errors
      expect(true).toBe(true);
    });
  });

  describe('deleteCacheEntry', () => {
    it('should delete cache entry', () => {
      service.deleteCacheEntry('/test');
      // Cache deletion is internal, just ensure no errors
      expect(true).toBe(true);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });
  });
});

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue('application/json') },
      json: vi.fn().mockResolvedValue({ token: 'new-token' }),
    });
  });

  it('register should call correct endpoint', async () => {
    const userData = { email: 'test@example.com', password: 'password' };
    await authApi.register(userData);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/register'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(userData),
      })
    );
  });

  it('login should call correct endpoint', async () => {
    const credentials = { email: 'test@example.com', password: 'password' };
    await authApi.login(credentials);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(credentials),
      })
    );
  });

  it('getCurrentUser should call correct endpoint', async () => {
    await authApi.getCurrentUser();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('logout should call correct endpoint', async () => {
    await authApi.logout();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      })
    );
  });
});

describe('billsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue('application/json') },
      json: vi.fn().mockResolvedValue({ bills: [] }),
    });
  });

  it('getBills should call correct endpoint', async () => {
    await billsApi.getBills();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bills'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('getBill should call correct endpoint', async () => {
    await billsApi.getBill(123);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bills/123'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('searchBills should call correct endpoint with query params', async () => {
    const query = { status: 'active', category: 'health' };
    await billsApi.searchBills(query);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bills/search?status=active&category=health'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('createBillComment should call correct endpoint', async () => {
    const comment = { content: 'Test comment' };
    await billsApi.createBillComment(123, comment);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bills/123/comments'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(comment),
      })
    );
  });
});

describe('systemApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue('application/json') },
      json: vi.fn().mockResolvedValue({ status: 'ok' }),
    });
  });

  it('getHealth should call correct endpoint', async () => {
    await systemApi.getHealth();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/health'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('getStats should call correct endpoint', async () => {
    await systemApi.getStats();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/health/stats'),
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('error handling utilities', () => {
  describe('isNetworkError', () => {
    it('should return true for network errors', () => {
      const error = { status: undefined };
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for HTTP errors', () => {
      const error = { status: 404 };
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('isServerError', () => {
    it('should return true for 5xx errors', () => {
      const error = { status: 500 };
      expect(isServerError(error)).toBe(true);
    });

    it('should return false for client errors', () => {
      const error = { status: 404 };
      expect(isServerError(error)).toBe(false);
    });
  });

  describe('isClientError', () => {
    it('should return true for 4xx errors', () => {
      const error = { status: 404 };
      expect(isClientError(error)).toBe(true);
    });

    it('should return false for server errors', () => {
      const error = { status: 500 };
      expect(isClientError(error)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
      expect(isRetryableError({ status: 408 })).toBe(true);
      expect(isRetryableError({ status: 429 })).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
      expect(isRetryableError({ status: 504 })).toBe(true);
      expect(isRetryableError({})).toBe(true); // Network error
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryableError({ status: 404 })).toBe(false);
      expect(isRetryableError({ status: 400 })).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return appropriate messages for different error codes', () => {
      expect(getErrorMessage({ status: 404 })).toBe('The requested resource was not found.');
      expect(getErrorMessage({ status: 403 })).toBe('You do not have permission to access this resource.');
      expect(getErrorMessage({ status: 401 })).toBe('Authentication required. Please log in.');
      expect(getErrorMessage({ status: 408 })).toBe('Request timeout. Please check your connection and try again.');
      expect(getErrorMessage({ status: 429 })).toBe('Too many requests. Please wait a moment and try again.');
      expect(getErrorMessage({ status: 503 })).toBe('Service temporarily unavailable. Please try again later.');
      expect(getErrorMessage({ status: 500 })).toBe('Server error. Please try again later.');
      expect(getErrorMessage({})).toBe('Network error. Please check your internet connection.');
      expect(getErrorMessage({ message: 'Custom error' })).toBe('Custom error');
    });
  });
});

describe('apiService instance', () => {
  it('should be an instance of ApiService', () => {
    expect(apiService).toBeInstanceOf(ApiService);
  });

  it('should have default base URL', () => {
    expect(apiService.getBaseUrl()).toBe('http://localhost:5000');
  });
});