import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PageErrorBoundary from '../PageErrorBoundary';
import { ErrorFallback } from '../ErrorFallback';
import { logger } from '../utils/logger.js';

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

describe('PageErrorBoundary', () => {
  beforeEach(() => {
    console.error = vi.fn();
    console.log = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  it('renders children when there is no error', () => {
    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={false} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error fallback when child component throws', () => {
    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('This page encountered an unexpected error and cannot be displayed.')).toBeInTheDocument();
  });

  it('logs error to console when error occurs', () => {
    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'PageErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('calls custom onError handler when provided', () => {
    const onError = vi.fn();
    
    render(
      <PageErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('uses custom fallback component when provided', () => {
    const CustomFallback = () => <div>Custom error message</div>;
    
    render(
      <PageErrorBoundary fallbackComponent={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('handles retry functionality', () => {
    let shouldThrow = true;
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    const { rerender } = render(
      <PageErrorBoundary>
        <TestComponent />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByText('Try Again');
    shouldThrow = false; // Stop throwing error
    fireEvent.click(retryButton);

    // The error boundary should reset and show the component
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('shows retry count in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Error Details:')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('handles different error contexts', () => {
    render(
      <PageErrorBoundary context="api">
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(screen.getByText('There was a problem connecting to our services.')).toBeInTheDocument();
  });

  it('persists errors to localStorage', () => {
    render(
      <PageErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PageErrorBoundary>
    );

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'errorQueue',
      expect.stringContaining('Test error')
    );
  });

  it('handles unhandled promise rejections', () => {
    render(
      <PageErrorBoundary>
        <div>Test content</div>
      </PageErrorBoundary>
    );

    // Simulate unhandled promise rejection
    const rejectionEvent = new Event('unhandledrejection') as any;
    rejectionEvent.reason = 'Test rejection';
    rejectionEvent.preventDefault = vi.fn();

    window.dispatchEvent(rejectionEvent);

    expect(console.error).toHaveBeenCalledWith(
      'Unhandled promise rejection:',
      'Test rejection'
    );
  });

  it('handles global errors', () => {
    render(
      <PageErrorBoundary>
        <div>Test content</div>
      </PageErrorBoundary>
    );

    // Simulate global error
    const errorEvent = new ErrorEvent('error', {
      error: new Error('Global test error'),
      message: 'Global test error',
      filename: 'test.js',
      lineno: 1,
      colno: 1,
    });

    window.dispatchEvent(errorEvent);

    expect(console.error).toHaveBeenCalledWith(
      'Global error:',
      expect.any(Error)
    );
  });

  it('shows max retry message when retries exceeded', () => {
    const propsWithMaxRetries = {
      error: new Error('Test error'),
      resetError: vi.fn(),
      context: 'page' as const,
      retryCount: 3,
    };

    render(<ErrorFallback {...propsWithMaxRetries} />);

    // Should not show Try Again button when max retries reached
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    // Should show max retry message
    expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
  });
});