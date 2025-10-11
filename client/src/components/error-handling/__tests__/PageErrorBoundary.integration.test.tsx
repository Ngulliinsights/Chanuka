import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import PageErrorBoundary from '../PageErrorBoundary';
import { logger } from '../utils/logger.js';

// Mock component that can throw different types of errors
const ErrorThrowingComponent = ({ 
  errorType = 'none',
  delay = 0 
}: { 
  errorType?: 'none' | 'sync' | 'async' | 'network' | 'timeout' | 'memory';
  delay?: number;
}) => {
  React.useEffect(() => {
    if (errorType === 'async' && delay > 0) {
      setTimeout(() => {
        throw new Error('Async error after delay');
      }, delay);
    }
  }, [errorType, delay]);

  if (errorType === 'sync') {
    throw new Error('Synchronous error');
  }

  if (errorType === 'network') {
    throw new Error('Network request failed');
  }

  if (errorType === 'timeout') {
    throw new Error('Request timeout');
  }

  if (errorType === 'memory') {
    throw new Error('Out of memory');
  }

  return <div data-testid="success-component">Component rendered successfully</div>;
};

// Test wrapper component
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

describe('PageErrorBoundary Integration Tests', () => {
  beforeEach(() => {
    // Mock console methods
    console.error = vi.fn();
    console.warn = vi.fn();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    // Mock global error handlers
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Error Boundary Behavior', () => {
    it('should catch and handle synchronous errors', () => {
      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorThrowingComponent errorType="sync" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByTestId('success-component')).not.toBeInTheDocument();
    });

    it('should handle retry functionality correctly', async () => {
      let shouldThrow = true;
      const RetryComponent = () => {
        if (shouldThrow) {
          throw new Error('Retry test error');
        }
        return <div data-testid="retry-success">Retry successful</div>;
      };

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <RetryComponent />
          </PageErrorBoundary>
        </TestWrapper>
      );

      // Error should be displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click retry button
      const retryButton = screen.getByText('Try Again');
      shouldThrow = false; // Stop throwing error
      
      fireEvent.click(retryButton);

      // Component should render successfully after retry
      await waitFor(() => {
        expect(screen.getByTestId('retry-success')).toBeInTheDocument();
      });
    });

    it('should limit retry attempts', () => {
      const AlwaysFailingComponent = () => {
        throw new Error('Always fails');
      };

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <AlwaysFailingComponent />
          </PageErrorBoundary>
        </TestWrapper>
      );

      // Click retry button multiple times
      const retryButton = screen.getByText('Try Again');
      
      // First retry
      fireEvent.click(retryButton);
      expect(screen.getByText('Try Again')).toBeInTheDocument();

      // Second retry
      fireEvent.click(retryButton);
      expect(screen.getByText('Try Again')).toBeInTheDocument();

      // Third retry - should reach max retries
      fireEvent.click(retryButton);
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
    });
  });

  describe('Context-Specific Error Handling', () => {
    it('should show appropriate message for API context', () => {
      render(
        <TestWrapper>
          <PageErrorBoundary context="api">
            <ErrorThrowingComponent errorType="network" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('There was a problem connecting to our services.')).toBeInTheDocument();
    });

    it('should show appropriate message for page context', () => {
      render(
        <TestWrapper>
          <PageErrorBoundary context="page">
            <ErrorThrowingComponent errorType="sync" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('This page encountered an unexpected error and cannot be displayed.')).toBeInTheDocument();
    });

    it('should show appropriate message for component context', () => {
      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorThrowingComponent errorType="sync" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('This section is temporarily unavailable.')).toBeInTheDocument();
    });
  });

  describe('Error Persistence and Recovery', () => {
    it('should persist errors to localStorage', () => {
      const mockSetItem = vi.fn();
      Object.defineProperty(window, 'localStorage', {
        value: { 
          getItem: vi.fn(),
          setItem: mockSetItem,
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      });

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorThrowingComponent errorType="sync" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      expect(mockSetItem).toHaveBeenCalledWith(
        'errorQueue',
        expect.stringContaining('Synchronous error')
      );
    });

    it('should handle localStorage errors gracefully', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new Error('localStorage is full');
      });
      
      Object.defineProperty(window, 'localStorage', {
        value: { 
          getItem: vi.fn(),
          setItem: mockSetItem,
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      });

      expect(() => {
        render(
          <TestWrapper>
            <PageErrorBoundary context="component">
              <ErrorThrowingComponent errorType="sync" />
            </PageErrorBoundary>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Global Error Handling', () => {
    it('should handle unhandled promise rejections', async () => {
      render(
        <TestWrapper>
          <PageErrorBoundary context="page">
            <div>Test content</div>
          </PageErrorBoundary>
        </TestWrapper>
      );

      // Simulate unhandled promise rejection
      const rejectionEvent = new Event('unhandledrejection') as any;
      rejectionEvent.reason = new Error('Unhandled promise rejection');
      rejectionEvent.preventDefault = vi.fn();

      act(() => {
        window.dispatchEvent(rejectionEvent);
      });

      expect(console.error).toHaveBeenCalledWith(
        'Unhandled promise rejection:',
        expect.any(Error)
      );
      expect(rejectionEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle global JavaScript errors', () => {
      render(
        <TestWrapper>
          <PageErrorBoundary context="page">
            <div>Test content</div>
          </PageErrorBoundary>
        </TestWrapper>
      );

      // Simulate global error
      const errorEvent = new ErrorEvent('error', {
        error: new Error('Global JavaScript error'),
        message: 'Global JavaScript error',
        filename: 'test.js',
        lineno: 1,
        colno: 1,
      });

      act(() => {
        window.dispatchEvent(errorEvent);
      });

      expect(console.error).toHaveBeenCalledWith(
        'Global error:',
        expect.any(Error)
      );
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with multiple error boundaries', () => {
      const { unmount } = render(
        <TestWrapper>
          <PageErrorBoundary context="page">
            <PageErrorBoundary context="component">
              <PageErrorBoundary context="api">
                <div>Nested boundaries</div>
              </PageErrorBoundary>
            </PageErrorBoundary>
          </PageErrorBoundary>
        </TestWrapper>
      );

      // Should render without issues
      expect(screen.getByText('Nested boundaries')).toBeInTheDocument();

      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid error occurrences', () => {
      const RapidErrorComponent = () => {
        // Simulate rapid errors
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            if (i === 5) throw new Error(`Rapid error ${i}`);
          }, i * 10);
        }
        throw new Error('Initial rapid error');
      };

      expect(() => {
        render(
          <TestWrapper>
            <PageErrorBoundary context="component">
              <RapidErrorComponent />
            </PageErrorBoundary>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Development vs Production Behavior', () => {
    it('should show detailed error info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorThrowingComponent errorType="sync" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Error Details:')).toBeInTheDocument();
      expect(screen.getByText('Synchronous error')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide detailed error info in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <TestWrapper>
          <PageErrorBoundary context="component">
            <ErrorThrowingComponent errorType="sync" />
          </PageErrorBoundary>
        </TestWrapper>
      );

      expect(screen.queryByText('Error Details:')).not.toBeInTheDocument();
      expect(screen.queryByText('Synchronous error')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });
});