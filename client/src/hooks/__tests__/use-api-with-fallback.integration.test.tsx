import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiWithFallback, useMutation, useApiPost } from '../use-api-with-fallback';
import * as apiErrorHandling from '@/services/api-error-handling';
import { logger } from '../utils/logger.js';

// Mock the API service with more realistic behavior
vi.mock('@/services/api-error-handling', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    clearCache: vi.fn(),
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
const mockGetErrorMessage = apiErrorHandling.getErrorMessage as any;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useApiWithFallback Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetErrorMessage.mockImplementation((error: any) => error.message || 'Unknown error');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should handle successful API calls', async () => {
      const mockData = { id: 1, name: 'Test User' };
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockData,
        fromCache: false,
        fromFallback: false,
      });

      const { result } = renderHook(
        () => useApiWithFallback('/api/users/1'),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.fromCache).toBe(false);
      expect(result.current.fromFallback).toBe(false);
    });

    it('should handle API errors with fallback data', async () => {
      const fallbackData = { id: 1, name: 'Fallback User' };
      const mockError = {
        name: 'NetworkError',
        message: 'Network request failed',
        timestamp: new Date().toISOString(),
      };

      mockFallbackDataManager.getFallbackData.mockReturnValueOnce(fallbackData);
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        data: fallbackData,
        error: mockError,
        fromFallback: true,
      });

      const { result } = renderHook(
        () => useApiWithFallback('/api/users/1', { 
          fallbackKey: 'user-1-fallback' 
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(fallbackData);
      expect(result.current.fromFallback).toBe(true);
      expect(result.current.error).toEqual(mockError);
      expect(result.current.isError).toBe(true);
    });

    it('should handle cached responses', async () => {
      const mockData = { id: 1, name: 'Cached User' };
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockData,
        fromCache: true,
      });

      const { result } = renderHook(
        () => useApiWithFallback('/api/users/1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.fromCache).toBe(true);
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should retry failed requests automatically', async () => {
      const mockData = { id: 1, name: 'Test User' };
      const mockError = {
        name: 'ServerError',
        message: 'Internal server error',
        status: 500,
        timestamp: new Date().toISOString(),
      };

      // First call fails, second succeeds
      mockApiService.get
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          success: true,
          data: mockData,
        });

      const { result } = renderHook(
        () => useApiWithFallback('/api/users/1', {
          retryConfig: { maxRetries: 1, baseDelay: 100 }
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should handle network connectivity issues', async () => {
      const fallbackData = { id: 1, name: 'Offline User' };
      const networkError = {
        name: 'NetworkError',
        message: 'Failed to fetch',
        timestamp: new Date().toISOString(),
      };

      mockFallbackDataManager.getFallbackData.mockReturnValueOnce(fallbackData);
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        data: fallbackData,
        error: networkError,
        fromFallback: true,
      });

      const { result } = renderHook(
        () => useApiWithFallback('/api/users/1', {
          fallbackKey: 'offline-user',
          networkAware: true,
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(fallbackData);
      expect(result.current.fromFallback).toBe(true);
      expect(result.current.error).toEqual(networkError);
    });

    it('should handle timeout scenarios', async () => {
      const fallbackData = { id: 1, name: 'Timeout Fallback' };
      const timeoutError = {
        name: 'TimeoutError',
        message: 'Request timeout',
        timestamp: new Date().toISOString(),
      };

      mockFallbackDataManager.getFallbackData.mockReturnValueOnce(fallbackData);
      mockApiService.get.mockResolvedValueOnce({
        success: false,
        data: fallbackData,
        error: timeoutError,
        fromFallback: true,
      });

      const { result } = renderHook(
        () => useApiWithFallback('/api/slow-endpoint', {
          timeout: 1000,
          fallbackKey: 'timeout-fallback',
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(fallbackData);
      expect(result.current.fromFallback).toBe(true);
      expect(result.current.error).toEqual(timeoutError);
    });
  });

  describe('Advanced Features', () => {
    it('should handle conditional fetching', () => {
      const { result } = renderHook(
        () => useApiWithFallback('/api/users/1', { enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(mockApiService.get).not.toHaveBeenCalled();
    });

    it('should handle dynamic endpoint changes', async () => {
      const mockData1 = { id: 1, name: 'User 1' };
      const mockData2 = { id: 2, name: 'User 2' };

      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: mockData1,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockData2,
        });

      let endpoint = '/api/users/1';
      const { result, rerender } = renderHook(
        () => useApiWithFallback(endpoint),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      // Change endpoint
      endpoint = '/api/users/2';
      rerender();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle background refetching', async () => {
      const initialData = { id: 1, name: 'Initial User' };
      const updatedData = { id: 1, name: 'Updated User' };

      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: initialData,
        })
        .mockResolvedValueOnce({
          success: true,
          data: updatedData,
        });

      const { result } = renderHook(
        () => useApiWithFallback('/api/users/1', {
          refetchInterval: 1000,
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(initialData);
      });

      // Wait for background refetch
      await waitFor(() => {
        expect(result.current.data).toEqual(updatedData);
      }, { timeout: 2000 });

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle manual refetch operations', async () => {
      const initialData = { id: 1, name: 'Initial User' };
      const refetchedData = { id: 1, name: 'Refetched User' };

      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: initialData,
        })
        .mockResolvedValueOnce({
          success: true,
          data: refetchedData,
        });

      const { result } = renderHook(
        () => useApiWithFallback('/api/users/1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(initialData);
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(refetchedData);
      });

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Callback Handling', () => {
    it('should call success callbacks', async () => {
      const mockData = { id: 1, name: 'Test User' };
      const onSuccess = vi.fn();

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockData,
      });

      renderHook(
        () => useApiWithFallback('/api/users/1', { onSuccess }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockData);
      });
    });

    it('should call error callbacks', async () => {
      const mockError = {
        name: 'ApiError',
        message: 'Test error',
        timestamp: new Date().toISOString(),
      };
      const onError = vi.fn();

      mockApiService.get.mockRejectedValueOnce(mockError);

      renderHook(
        () => useApiWithFallback('/api/users/1', { onError }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError);
      });
    });

    it('should call loading state callbacks', async () => {
      const mockData = { id: 1, name: 'Test User' };
      const onLoadingChange = vi.fn();

      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockData,
      });

      renderHook(
        () => useApiWithFallback('/api/users/1', { onLoadingChange }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith(true);
      });

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Memory and Performance', () => {
    it('should cleanup resources on unmount', async () => {
      const mockData = { id: 1, name: 'Test User' };
      mockApiService.get.mockResolvedValueOnce({
        success: true,
        data: mockData,
      });

      const { result, unmount } = renderHook(
        () => useApiWithFallback('/api/users/1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid component remounts', async () => {
      const mockData = { id: 1, name: 'Test User' };
      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Mount and unmount rapidly
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(
          () => useApiWithFallback('/api/users/1'),
          { wrapper: createWrapper() }
        );
        unmount();
      }

      // Should not cause memory leaks or errors
      expect(mockApiService.get).toHaveBeenCalled();
    });

    it('should handle concurrent hook instances', async () => {
      const mockData1 = { id: 1, name: 'User 1' };
      const mockData2 = { id: 2, name: 'User 2' };

      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: mockData1,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockData2,
        });

      const { result: result1 } = renderHook(
        () => useApiWithFallback('/api/users/1'),
        { wrapper: createWrapper() }
      );

      const { result: result2 } = renderHook(
        () => useApiWithFallback('/api/users/2'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockData1);
        expect(result2.current.data).toEqual(mockData2);
      });

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useMutation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Mutation Operations', () => {
    it('should handle successful mutations', async () => {
      const mockData = { id: 1, name: 'Created User' };
      const mutationFn = vi.fn().mockResolvedValueOnce({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(
        () => useMutation(mutationFn),
        { wrapper: createWrapper() }
      );

      const variables = { name: 'Test User' };

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
        name: 'ValidationError',
        message: 'Invalid input data',
        status: 400,
        timestamp: new Date().toISOString(),
      };

      const mutationFn = vi.fn().mockResolvedValueOnce({
        success: false,
        error: mockError,
      });

      const { result } = renderHook(
        () => useMutation(mutationFn),
        { wrapper: createWrapper() }
      );

      const variables = { name: '' }; // Invalid data

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

    it('should handle optimistic updates', async () => {
      const initialData = { id: 1, name: 'Original User' };
      const optimisticData = { id: 1, name: 'Optimistic User' };
      const finalData = { id: 1, name: 'Final User' };

      const mutationFn = vi.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ success: true, data: finalData }), 100)
        )
      );

      const onMutate = vi.fn().mockReturnValue(optimisticData);
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(
        () => useMutation(mutationFn, {
          onMutate,
          onSuccess,
          onError,
        }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.mutate({ name: 'Updated User' });
      });

      expect(onMutate).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(finalData, { name: 'Updated User' });
      expect(result.current.data).toEqual(finalData);
    });
  });

  describe('useApiPost Integration', () => {
    it('should make POST requests correctly', async () => {
      const mockData = { id: 1, name: 'Created User' };
      mockApiService.post.mockResolvedValueOnce({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(
        () => useApiPost('/api/users'),
        { wrapper: createWrapper() }
      );

      const variables = { name: 'Test User', email: 'test@example.com' };

      await act(async () => {
        await result.current.mutateAsync(variables);
      });

      expect(mockApiService.post).toHaveBeenCalledWith('/api/users', variables);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should handle POST request failures', async () => {
      const mockError = {
        name: 'ValidationError',
        message: 'Email already exists',
        status: 409,
        timestamp: new Date().toISOString(),
      };

      mockApiService.post.mockResolvedValueOnce({
        success: false,
        error: mockError,
      });

      const { result } = renderHook(
        () => useApiPost('/api/users'),
        { wrapper: createWrapper() }
      );

      const variables = { name: 'Test User', email: 'existing@example.com' };

      await act(async () => {
        try {
          await result.current.mutateAsync(variables);
        } catch (error) {
          expect(error).toEqual(mockError);
        }
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.isError).toBe(true);
    });
  });
});