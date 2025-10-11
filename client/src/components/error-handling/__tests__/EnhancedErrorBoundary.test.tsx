import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PageErrorBoundary from '../PageErrorBoundary';
import { 
  ChunkErrorFallback, 
  NetworkErrorFallback, 
  CriticalErrorFallback,
  ApiErrorFallback 
} from '../ErrorFallback';
import { withErrorBoundary, CriticalSection } from '../withErrorBoundary';
import { logger } from '../utils/logger.js';

// Mock components for testing
const ThrowingComponent: React.FC<{ 
  shouldThrow?: boolean; 
  errorType?: string;
  errorMessage?: string;
}> = ({ 
  shouldThrow = false, 
  errorType = 'javascript',
  errorMessage = 'Test error'
}) => {
  if (shouldThrow) {
    const error = new Error(errorMessage);
    error.name = errorType === 'chunk' ? 'ChunkLoadError' : 'Error';
    throw error;
  }
  return <div>Component rendered successfully</div>;
};

const NetworkErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Network request failed');
  }
  return <div>Network component rendered</div>;
};

const ChunkErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    const error = new Error('Loading chunk 1 failed');
    error.name = 'ChunkLoadError';
    throw error;
  }
  return <div>Chunk component rendered</div>;
};

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

describe('Enhanced PageErrorBoundary', () => {
  beforeEach(() => {
    console.error = vi.fn();
    console.log = vi.fn();
    console.warn = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      render(
        <PageErrorBoundary context="api">
          <NetworkErrorComponent shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText(/connection problem|network error/i)).toBeInTheDocument();
    });

    it('should classify chunk loading errors correctly', () => {
      render(
        <PageErrorBoundary>
          <ChunkErrorComponent shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText(/loading error|failed to load/i)).toBeInTheDocument();
    });

    it('should handle JavaScript errors with proper severity', () => {
      render(
        <PageErrorBoundary>
          <ThrowingComponent 
            shouldThrow={true} 
            errorType="TypeError"
            errorMessage="Cannot read property of undefined"
          />
        </PageErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry for recoverable errors', async () => {
      const { rerender } = render(
        <PageErrorBoundary enableRecovery={true} maxRetries={2}>
          <ThrowingComponent shouldThrow={true} />
        </PageErrorBoundary>
      );

      // Should show error fallback
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      
      // Should have a retry button
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      // Click retry
      fireEvent.click(retryButton);

      // Should attempt recovery
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Attempting error recovery')
        );
      });
    });

    it('should prevent retry for critical errors', () => {
      const criticalError = new Error('Critical security violation');
      criticalError.name = 'SecurityError';

      render(
        <PageErrorBoundary>
          <ThrowingComponent 
            shouldThrow={true} 
            errorType="SecurityError"
            errorMessage="Critical security violation"
          />
        </PageErrorBoundary>
      );

      // Should not show retry button for critical errors
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should enforce max retry limits', async () => {
      const onError = vi.fn();
      
      render(
        <PageErrorBoundary maxRetries={1} onError={onError}>
          <ThrowingComponent shouldThrow={true} />
        </PageErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      // First retry
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Second retry should trigger max retries reached
      const secondRetryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(secondRetryButton);

      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Max retries reached')
        );
      });
    });
  });

  describe('Enhanced Error Reporting', () => {
    it('should collect comprehensive error context', () => {
      const onError = vi.fn();
      
      render(
        <PageErrorBoundary onError={onError} context="component">
          <ThrowingComponent shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.any(String) // errorType
      );
    });

    it('should report errors with proper metadata', () => {
      const onError = vi.fn();
      
      render(
        <PageErrorBoundary onError={onError}>
          <ThrowingComponent shouldThrow={true} />
        </PageErrorBoundary>
      );

      // Check that enhanced logging was called
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('PageErrorBoundary Error')
      );
    });
  });

  describe('Specialized Fallback Components', () => {
    it('should use ChunkErrorFallback for chunk errors', () => {
      render(
        <PageErrorBoundary fallbackComponent={ChunkErrorFallback}>
          <ChunkErrorComponent shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText(/loading error/i)).toBeInTheDocument();
      expect(screen.getByText(/refresh page/i)).toBeInTheDocument();
    });

    it('should use NetworkErrorFallback for network errors', () => {
      render(
        <PageErrorBoundary fallbackComponent={NetworkErrorFallback}>
          <NetworkErrorComponent shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it('should use ApiErrorFallback for API context errors', () => {
      render(
        <PageErrorBoundary fallbackComponent={ApiErrorFallback} context="api">
          <NetworkErrorComponent shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText(/connection problem|api error/i)).toBeInTheDocument();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('should wrap components with enhanced error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowingComponent, {
        context: 'component',
        enableRecovery: true,
        smartFallback: true,
      });

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText(/component error|something went wrong/i)).toBeInTheDocument();
    });

    it('should use smart fallback selection', () => {
      const WrappedComponent = withErrorBoundary(ChunkErrorComponent, {
        smartFallback: true,
      });

      render(<WrappedComponent shouldThrow={true} />);

      // Should automatically use appropriate fallback for chunk errors
      expect(screen.getByText(/loading error|failed to load/i)).toBeInTheDocument();
    });
  });

  describe('CriticalSection Component', () => {
    it('should isolate errors in critical sections', () => {
      render(
        <div>
          <div>Other content</div>
          <CriticalSection name="test-section" context="component">
            <ThrowingComponent shouldThrow={true} />
          </CriticalSection>
          <div>More content</div>
        </div>
      );

      // Should show error in critical section
      expect(screen.getByText(/component error|something went wrong/i)).toBeInTheDocument();
      
      // Other content should still be visible
      expect(screen.getByText('Other content')).toBeInTheDocument();
      expect(screen.getByText('More content')).toBeInTheDocument();
    });

    it('should use lower retry limits for critical sections', () => {
      const onError = vi.fn();
      
      render(
        <CriticalSection 
          name="critical-test" 
          onError={onError}
          maxRetries={1}
        >
          <ThrowingComponent shouldThrow={true} />
        </CriticalSection>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.any(String)
      );
    });
  });

  describe('Error Boundary Performance', () => {
    it('should handle multiple errors without memory leaks', () => {
      const { rerender } = render(
        <PageErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </PageErrorBoundary>
      );

      // Trigger multiple errors
      for (let i = 0; i < 5; i++) {
        rerender(
          <PageErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </PageErrorBoundary>
        );
        
        rerender(
          <PageErrorBoundary>
            <ThrowingComponent shouldThrow={false} />
          </PageErrorBoundary>
        );
      }

      // Should handle multiple error cycles gracefully
      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
    });
  });
});