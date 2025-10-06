import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import PageErrorBoundary from '../PageErrorBoundary';
import { useApiWithFallback } from '../../../hooks/use-api-with-fallback';
import * as apiErrorHandling from '../../../services/api-error-handling';

// Mock API service
vi.mock('../../../services/api-error-handling', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
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

// Test component that simulates real-world error scenarios
const ErrorProneComponent: React.FC<{
  scenario: 'network' | 'server' | 'timeout' | 'recovery' | 'none';
  onError?: (error: any) => void;
}> = ({ scenario, onError }) => {
  const [retryCount, setRetryCount] = useState(0);

  const { data, error, isLoading, refetch, fromFallback } = useApiWithFallback(
    '/api/test-endpoint',
    {
      fallbackKey: 'test-fallback',
      onError,
      retryConfig: { maxRetries: 2, baseDelay: 100 },
    }
  );

  React.useEffect(() => {
    // Simulate different error scenarios
    switch (scenario) {
      case 'network':
        mockApiService.get.mockRejectedValue({
          name: 'NetworkError',
          message: 'Network request failed',
          timestamp: new Date().toISOString(),
        });
        break;
      case 'server':
        mockApiService.get.mockRejectedValue({
          name: 'ServerError',
          message: 'Internal server error',
          status: 500,
          timestamp: new Date().toISOString(),
        });
        break;
      case 'timeout':
        mockApiService.get.mockRejectedValue({
          name: 'TimeoutError',
          message: 'Request timeout',
          timestamp: new Date().toISOString(),
        });
        break;
      case 'recovery':
        if (retryCount === 0) {
          mockApiService.get.mockRejectedValueOnce({
            name: 'NetworkError',
            message: 'Network error',
            timestamp: new Date().toISOString(),
          });
        } else {
          mockApiService.get.mockResolvedValueOnce({
            success: true,
            data: { recovered: true, retryCount },
          });
        }
        break;
      case 'none':
        mockApiService.get.mockResolvedValue({
          success: true,
          data: { message: 'Success' },
        });
        break;
    }
  }, [scenario, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (error && !fromFallback) {
    return (
      <div data-testid="error-state">
        <p>Error: {error.message}</p>
        <button onClick={handleRetry} data-testid="manual-retry">
          Retry ({retryCount})
        </button>
      </div>
    );
  }

  if (fromFallback) {
    return (
      <div data-testid="fallback-state">
        <p>Using fallback data</p>
        <button onClick={handleRetry} data-testid="retry-from-fallback">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div data-testid="success-state">
      <p>Data loaded successfully</p>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Error Recovery Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFallbackDataManager.getFallbackData.mockReturnValue({
      fallback: 'data'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Network Error Recovery', () => {
    it('should recover from network errors with manual retry', async () => {
      const onError = vi.fn();

      const { rerender } = render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="network" onError={onError} />
          </PageErrorBoundary>
        </TestWrapper>
      );

      // Should show fallback state initially
      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'NetworkError',
          message: 'Network request failed',
        })
      );

      // Change scenario to recovery and retry
      rerender(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="recovery" onError={onError} />
          </PageErrorBoundary>
        </TestWrapper>
      );

      const retryButton = screen.getByTestId('retry-from-fallback');
      fireEvent.click(retryButton);

      // Should eventually show success state
      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
      });
    });

    it('should handle progressive network recovery', async () => {
      let callCount = 0;
      mockApiService.get.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject({
            name: 'NetworkError',
            message: 'Network unstable',
            timestamp: new Date().toISOString(),
          });
        }
        return Promise.resolve({
          success: true,
          data: { recovered: true, attempts: callCount },
        });
      });

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="recovery" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      // Should show fallback initially
      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      // Retry multiple times
      const retryButton = screen.getByTestId('retry-from-fallback');
      
      fireEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      fireEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      fireEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
      });

      expect(mockApiService.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('Server Error Recovery', () => {
    it('should handle server error recovery with exponential backoff', async () => {
      let callCount = 0;
      mockApiService.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject({
            name: 'ServerError',
            message: 'Internal server error',
            status: 500,
            timestamp: new Date().toISOString(),
          });
        }
        return Promise.resolve({
          success: true,
          data: { recovered: true, serverBack: true },
        });
      });

      render(
        <TestWrapper>
          <PageErrorBoundary context="api">
            <ErrorProneComponent scenario="recovery" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      // Should show fallback state
      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      // Retry should succeed
      const retryButton = screen.getByTestId('retry-from-fallback');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/"serverBack": true/)).toBeInTheDocument();
    });

    it('should handle server maintenance scenarios', async () => {
      mockApiService.get.mockRejectedValue({
        name: 'ServerError',
        message: 'Service temporarily unavailable',
        status: 503,
        timestamp: new Date().toISOString(),
      });

      render(
        <TestWrapper>
          <PageErrorBoundary context="api">
            <ErrorProneComponent scenario="server" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      expect(screen.getByText('Using fallback data')).toBeInTheDocument();
      expect(screen.getByTestId('retry-from-fallback')).toBeInTheDocument();
    });
  });

  describe('Timeout Error Recovery', () => {
    it('should handle timeout recovery with adjusted timeout values', async () => {
      let callCount = 0;
      mockApiService.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject({
            name: 'TimeoutError',
            message: 'Request timeout',
            timestamp: new Date().toISOString(),
          });
        }
        return Promise.resolve({
          success: true,
          data: { recovered: true, timeoutResolved: true },
        });
      });

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="recovery" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-from-fallback');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/"timeoutResolved": true/)).toBeInTheDocument();
    });
  });

  describe('Complex Recovery Scenarios', () => {
    it('should handle cascading failures and recovery', async () => {
      const errorSequence = [
        { name: 'NetworkError', message: 'Network failed' },
        { name: 'ServerError', message: 'Server error', status: 500 },
        { name: 'TimeoutError', message: 'Timeout' },
      ];

      let callCount = 0;
      mockApiService.get.mockImplementation(() => {
        if (callCount < errorSequence.length) {
          const error = { ...errorSequence[callCount], timestamp: new Date().toISOString() };
          callCount++;
          return Promise.reject(error);
        }
        return Promise.resolve({
          success: true,
          data: { recovered: true, attempts: callCount },
        });
      });

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="recovery" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      // Should show fallback initially
      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-from-fallback');

      // Retry through each error type
      for (let i = 0; i < errorSequence.length; i++) {
        fireEvent.click(retryButton);
        await waitFor(() => {
          expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
        });
      }

      // Final retry should succeed
      fireEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
      });

      expect(mockApiService.get).toHaveBeenCalledTimes(4);
    });

    it('should handle partial recovery with degraded functionality', async () => {
      const partialData = { 
        partial: true, 
        message: 'Limited functionality available',
        features: ['basic', 'read-only']
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: partialData,
        degraded: true,
      });

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="none" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/"partial": true/)).toBeInTheDocument();
      expect(screen.getByText(/"read-only"/)).toBeInTheDocument();
    });
  });

  describe('User Experience During Recovery', () => {
    it('should provide clear feedback during recovery attempts', async () => {
      let callCount = 0;
      mockApiService.get.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject({
            name: 'NetworkError',
            message: 'Connection unstable',
            timestamp: new Date().toISOString(),
          });
        }
        return Promise.resolve({
          success: true,
          data: { recovered: true },
        });
      });

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="recovery" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-from-fallback');

      // First retry
      fireEvent.click(retryButton);
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      // Second retry
      fireEvent.click(retryButton);
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      // Third retry should succeed
      fireEvent.click(retryButton);
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
      });
    });

    it('should handle user cancellation during recovery', async () => {
      const controller = new AbortController();
      
      mockApiService.get.mockImplementation(() => 
        new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject({ name: 'AbortError', message: 'Request cancelled' });
          });
          // Simulate long request
          setTimeout(() => reject({ name: 'TimeoutError', message: 'Timeout' }), 5000);
        })
      );

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="timeout" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-from-fallback');
      fireEvent.click(retryButton);

      // Simulate user cancellation
      act(() => {
        controller.abort();
      });

      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });
    });
  });

  describe('Recovery State Persistence', () => {
    it('should persist recovery state across component remounts', async () => {
      const { unmount, rerender } = render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="network" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback-state')).toBeInTheDocument();
      });

      // Unmount and remount
      unmount();

      mockApiService.get.mockResolvedValue({
        success: true,
        data: { recovered: true, persisted: true },
      });

      rerender(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="none" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/"persisted": true/)).toBeInTheDocument();
    });

    it('should clear recovery state after successful recovery', async () => {
      mockApiService.get.mockResolvedValue({
        success: true,
        data: { message: 'Fully recovered' },
      });

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorProneComponent scenario="none" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/"Fully recovered"/)).toBeInTheDocument();
      
      // Verify fallback data manager was not called for successful request
      expect(mockFallbackDataManager.getFallbackData).not.toHaveBeenCalled();
    });
  });
});