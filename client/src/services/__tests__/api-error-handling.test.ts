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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchWithFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return successful response', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchWithFallback('/api/test');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
    expect(result.fromCache).toBe(false);
    expect(result.fromFallback).toBe(false);
  });

  it('should use fallback data on error', async () => {
    const fallbackData = { id: 2, name: 'Fallback' };
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchWithFallback('/api/test', { fallbackData });

    expect(result.success).toBe(false);
    expect(result.data).toEqual(fallbackData);
    expect(result.fromFallback).toBe(true);
    expect(result.error).toBeDefined();
  });

  it('should retry on server errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    const result = await fetchWithFallback('/api/test', {
      retryConfig: { maxRetries: 1, baseDelay: 100 },
    });

    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  it('should handle timeout', async () => {
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(resolve, 2000))
    );

    const promise = fetchWithFallback('/api/test', { timeout: 1000 });
    
    vi.advanceTimersByTime(1000);
    
    await expect(promise).rejects.toThrow();
  });

  it('should cache GET requests', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    // First request
    await fetchWithFallback('/api/test');
    
    // Second request should use cache
    const result = await fetchWithFallback('/api/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.fromCache).toBe(true);
  });

  it('should not retry on client errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('Not found'),
    });

    await expect(
      fetchWithFallback('/api/test', {
        retryConfig: { maxRetries: 2 },
      })
    ).rejects.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    apiService = new ApiService('http://localhost:3000');
  });

  it('should make GET request', async () => {
    const mockData = { id: 1 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await apiService.get('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/test',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.data).toEqual(mockData);
  });

  it('should make POST request', async () => {
    const postData = { name: 'Test' };
    const responseData = { id: 1, ...postData };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(responseData),
    });

    const result = await apiService.post('/api/test', postData);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/test',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(postData),
      })
    );
    expect(result.data).toEqual(responseData);
  });

  it('should clear cache', () => {
    expect(() => apiService.clearCache()).not.toThrow();
  });
});

describe('FallbackDataManager', () => {
  let manager: FallbackDataManager;

  beforeEach(() => {
    manager = new FallbackDataManager();
  });

  it('should set and get fallback data', () => {
    const data = { id: 1, name: 'Test' };
    manager.setFallbackData('test-key', data);

    expect(manager.getFallbackData('test-key')).toEqual(data);
    expect(manager.hasFallbackData('test-key')).toBe(true);
  });

  it('should return undefined for non-existent keys', () => {
    expect(manager.getFallbackData('non-existent')).toBeUndefined();
    expect(manager.hasFallbackData('non-existent')).toBe(false);
  });

  it('should clear all fallback data', () => {
    manager.setFallbackData('key1', { data: 1 });
    manager.setFallbackData('key2', { data: 2 });

    manager.clearFallbackData();

    expect(manager.hasFallbackData('key1')).toBe(false);
    expect(manager.hasFallbackData('key2')).toBe(false);
  });
});

describe('Error utility functions', () => {
  it('should identify network errors', () => {
    const networkError: ApiError = {
      name: 'NetworkError',
      message: 'Network error',
      timestamp: new Date().toISOString(),
    };

    expect(isNetworkError(networkError)).toBe(true);

    const serverError: ApiError = {
      name: 'ServerError',
      message: 'Server error',
      status: 500,
      timestamp: new Date().toISOString(),
    };

    expect(isNetworkError(serverError)).toBe(false);
  });

  it('should identify server errors', () => {
    const serverError: ApiError = {
      name: 'ServerError',
      message: 'Server error',
      status: 500,
      timestamp: new Date().toISOString(),
    };

    expect(isServerError(serverError)).toBe(true);

    const clientError: ApiError = {
      name: 'ClientError',
      message: 'Client error',
      status: 404,
      timestamp: new Date().toISOString(),
    };

    expect(isServerError(clientError)).toBe(false);
  });

  it('should identify client errors', () => {
    const clientError: ApiError = {
      name: 'ClientError',
      message: 'Client error',
      status: 404,
      timestamp: new Date().toISOString(),
    };

    expect(isClientError(clientError)).toBe(true);

    const serverError: ApiError = {
      name: 'ServerError',
      message: 'Server error',
      status: 500,
      timestamp: new Date().toISOString(),
    };

    expect(isClientError(serverError)).toBe(false);
  });

  it('should return appropriate error messages', () => {
    const notFoundError: ApiError = {
      name: 'NotFoundError',
      message: 'Not found',
      status: 404,
      timestamp: new Date().toISOString(),
    };

    expect(getErrorMessage(notFoundError)).toBe('The requested resource was not found.');

    const serverError: ApiError = {
      name: 'ServerError',
      message: 'Server error',
      status: 500,
      timestamp: new Date().toISOString(),
    };

    expect(getErrorMessage(serverError)).toBe('Server error. Please try again later.');

    const networkError: ApiError = {
      name: 'NetworkError',
      message: 'Network error',
      timestamp: new Date().toISOString(),
    };

    expect(getErrorMessage(networkError)).toBe('Network error. Please check your internet connection.');
  });
});











































