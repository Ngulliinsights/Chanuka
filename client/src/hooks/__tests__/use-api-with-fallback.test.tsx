import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as Response)
);

import { renderHook, waitFor, act } from '@testing-library/react';
import { useApiWithFallback, useMutation, useApiPost } from '../use-api-with-fallback';
// Note: api-error-handling was intentionally removed - using built-in error handling
import { logger } from '@shared/core';

// Mock the API service
vi.mock('@/services/api-error-handling', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  fallbackDataManager: {
    getFallbackData: vi.fn(),
    setFallbackData: vi.fn(),
    hasFallbackData: vi.fn(),
    clearFallbackData: vi.fn(),
  },
  getErrorMessage: vi.fn(),
}));

const mockApiService = apiErrorHandling.apiService as any;
const mockFallbackDataManager = apiErrorHandling.fallbackDataManager as any;

describe('useApiWithFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockApiService.get.mockResolvedValueOnce({
      success: true,
      data: mockData,
      fromCache: false,
      fromFallback: false,
    });

    const { result } = renderHook(() => 
      useApiWithFallback('/api/test')
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.fromCache).toBe(false);
    expect(result.current.fromFallback).toBe(false);
  });

  it('should handle errors', async () => {
    const mockError = {
      name: 'ApiError',
      message: 'Test error',
      status: 500,
      timestamp: new Date().toISOString(),
    };

    mockApiService.get.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => 
      useApiWithFallback('/api/test')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.isError).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should use fallback data', async () => {
    const fallbackData = { id: 2, name: 'Fallback' };
    const mockError = {
      name: 'ApiError',
      message: 'Network error',
      timestamp: new Date().toISOString(),
    };

    mockFallbackDataManager.getFallbackData.mockReturnValueOnce(fallbackData);
    mockApiService.get.mockResolvedValueOnce({
      success: false,
      data: fallbackData,
      error: mockError,
      fromFallback: true,
    });

    const { result } = renderHook(() => 
      useApiWithFallback('/api/test', { fallbackKey: 'test-fallback' })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(fallbackData);
    expect(result.current.fromFallback).toBe(true);
    expect(result.current.error).toEqual(mockError);
  });

  it('should use cached data', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockApiService.get.mockResolvedValueOnce({
      success: true,
      data: mockData,
      fromCache: true,
    });

    const { result } = renderHook(() => 
      useApiWithFallback('/api/test')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.fromCache).toBe(true);
  });

  it('should refetch data', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockApiService.get.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() => 
      useApiWithFallback('/api/test')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(() => {
      result.current.refetch();
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockApiService.get).toHaveBeenCalledTimes(2);
  });

  it('should clear error', async () => {
    const mockError = {
      name: 'ApiError',
      message: 'Test error',
      timestamp: new Date().toISOString(),
    };

    mockApiService.get.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => 
      useApiWithFallback('/api/test')
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
    });

    await act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should not fetch when disabled', () => {
    const { result } = renderHook(() => 
      useApiWithFallback('/api/test', { enabled: false })
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockApiService.get).not.toHaveBeenCalled();
  });

  it('should call success callback', async () => {
    const mockData = { id: 1, name: 'Test' };
    const onSuccess = vi.fn();

    mockApiService.get.mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    renderHook(() => 
      useApiWithFallback('/api/test', { onSuccess })
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it('should call error callback', async () => {
    const mockError = {
      name: 'ApiError',
      message: 'Test error',
      timestamp: new Date().toISOString(),
    };
    const onError = vi.fn();

    mockApiService.get.mockRejectedValueOnce(mockError);

    renderHook(() => 
      useApiWithFallback('/api/test', { onError })
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });
});

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute mutation successfully', async () => {
    const mockData = { id: 1, name: 'Created' };
    const mutationFn = vi.fn().mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() => 
      useMutation(mutationFn)
    );

    const variables = { name: 'Test' };

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(mutationFn).toHaveBeenCalledWith(variables);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('should handle mutation errors', async () => {
    const mockError = {
      name: 'ApiError',
      message: 'Mutation failed',
      timestamp: new Date().toISOString(),
    };
    const mutationFn = vi.fn().mockResolvedValueOnce({
      success: false,
      error: mockError,
    });

    const { result } = renderHook(() => 
      useMutation(mutationFn)
    );

    const variables = { name: 'Test' };

    await act(async () => {
      try {
        await result.current.mutateAsync(variables);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.isError).toBe(true);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should call success callback', async () => {
    const mockData = { id: 1, name: 'Created' };
    const onSuccess = vi.fn();
    const mutationFn = vi.fn().mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() => 
      useMutation(mutationFn, { onSuccess })
    );

    const variables = { name: 'Test' };

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData, variables);
  });

  it('should reset mutation state', async () => {
    const mockData = { id: 1, name: 'Created' };
    const mutationFn = vi.fn().mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() => 
      useMutation(mutationFn)
    );

    await act(async () => {
      await result.current.mutateAsync({ name: 'Test' });
    });

    expect(result.current.data).toEqual(mockData);

    await act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useApiPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should make POST request', async () => {
    const mockData = { id: 1, name: 'Created' };
    mockApiService.post.mockResolvedValueOnce({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() => 
      useApiPost('/api/test')
    );

    const variables = { name: 'Test' };

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(mockApiService.post).toHaveBeenCalledWith('/api/test', variables);
    expect(result.current.data).toEqual(mockData);
  });
});

