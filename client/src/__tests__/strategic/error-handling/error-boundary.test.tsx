/**
 * Error Boundary Component Tests
 * Tests for error boundary components and error recovery
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { ErrorBoundary } from '../../../core/error/components/ErrorBoundary';
import { RecoveryUI } from '../../../core/error/components/RecoveryUI';
import { ServiceUnavailable } from '../../../core/error/components/ServiceUnavailable';
import { UnifiedErrorBoundary } from '../../../core/error/components/UnifiedErrorBoundary';

// Mock the error handler
vi.mock('../../../core/error/handler', () => ({
  coreErrorHandler: {
    handleError: vi.fn(),
    addReporter: vi.fn(),
  },
}));

// Mock the error recovery manager
vi.mock('../../../core/error/recovery', () => ({
  ErrorRecoveryManager: {
    getInstance: vi.fn(() => ({
      handleRecovery: vi.fn(),
      getRecoveryOptions: vi.fn(() => []),
      isRecovering: vi.fn(() => false),
    })),
  },
}));

// Mock the error reporting
vi.mock('../../../core/error/reporting', () => ({
  ErrorReporter: vi.fn(),
}));

describe('ErrorBoundary', () => {
  const TestComponent = ({ shouldThrow }: { shouldThrow?: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Test Component</div>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('should display error fallback when error occurs', () => {
    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it('should call error handler when error occurs', () => {
    const mockErrorHandler = vi.fn();
    vi.mocked(
      require('../../../core/error/handler').coreErrorHandler.handleError
    ).mockImplementation(mockErrorHandler);

    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockErrorHandler).toHaveBeenCalled();
  });

  it('should provide error details in fallback', () => {
    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText(/Please try refreshing the page/)).toBeInTheDocument();
  });

  it('should allow user to retry after error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();

    // Simulate retry by re-rendering without error
    rerender(
      <ErrorBoundary>
        <TestComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});

describe('UnifiedErrorBoundary', () => {
  const TestComponent = ({ shouldThrow }: { shouldThrow?: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Test Component</div>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle multiple error types', () => {
    render(
      <UnifiedErrorBoundary>
        <TestComponent />
      </UnifiedErrorBoundary>
    );

    expect(screen.getByTestId('unified-error-boundary')).toBeInTheDocument();
  });

  it('should provide context-aware error messages', () => {
    render(
      <UnifiedErrorBoundary>
        <TestComponent shouldThrow={true} />
      </UnifiedErrorBoundary>
    );

    expect(screen.getByText(/An error occurred/)).toBeInTheDocument();
  });

  it('should support custom error handling', () => {
    const customErrorHandler = vi.fn();

    render(
      <UnifiedErrorBoundary onError={customErrorHandler}>
        <TestComponent shouldThrow={true} />
      </UnifiedErrorBoundary>
    );

    expect(customErrorHandler).toHaveBeenCalled();
  });
});

describe('RecoveryUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display recovery options', () => {
    render(<RecoveryUI />);

    expect(screen.getByText(/Recovery Options/)).toBeInTheDocument();
  });

  it('should handle retry action', async () => {
    const mockRetry = vi.fn();

    render(<RecoveryUI onRetry={mockRetry} />);

    const retryButton = screen.getByText(/Try Again/);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRetry).toHaveBeenCalled();
    });
  });

  it('should handle refresh action', async () => {
    const mockRefresh = vi.fn();

    render(<RecoveryUI onRefresh={mockRefresh} />);

    const refreshButton = screen.getByText(/Refresh Page/);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should handle contact support action', async () => {
    const mockContact = vi.fn();

    render(<RecoveryUI onContactSupport={mockContact} />);

    const contactButton = screen.getByText(/Contact Support/);
    fireEvent.click(contactButton);

    await waitFor(() => {
      expect(mockContact).toHaveBeenCalled();
    });
  });

  it('should display error details', () => {
    const errorDetails = {
      message: 'Test error',
      stack: 'Error stack trace',
      componentStack: 'Component stack',
    };

    render(<RecoveryUI error={errorDetails} />);

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});

describe('ServiceUnavailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display service unavailable message', () => {
    render(<ServiceUnavailable />);

    expect(screen.getByText(/Service Temporarily Unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/We're experiencing technical difficulties/)).toBeInTheDocument();
  });

  it('should provide estimated downtime', () => {
    render(<ServiceUnavailable estimatedDowntime="5 minutes" />);

    expect(screen.getByText(/Estimated downtime: 5 minutes/)).toBeInTheDocument();
  });

  it('should handle retry action', async () => {
    const mockOnRetry = vi.fn();

    render(<ServiceUnavailable onRetry={mockOnRetry} />);

    const retryButton = screen.getByText(/Try Again/);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  it('should handle refresh action', async () => {
    const mockOnRefresh = vi.fn();

    render(<ServiceUnavailable onRefresh={mockOnRefresh} />);

    const refreshButton = screen.getByText(/Refresh Page/);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('should display maintenance information', () => {
    render(
      <ServiceUnavailable
        maintenanceInfo={{
          startTime: '2023-01-01T10:00:00Z',
          endTime: '2023-01-01T12:00:00Z',
          description: 'Scheduled maintenance',
        }}
      />
    );

    expect(screen.getByText(/Scheduled maintenance/)).toBeInTheDocument();
  });
});

describe('Error Boundary Integration', () => {
  const ErrorThrowingComponent = () => {
    throw new Error('Integration test error');
  };

  const FallbackComponent = ({ error }: { error: Error }) => (
    <div data-testid="custom-fallback">Custom fallback: {error.message}</div>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should work with custom fallback components', () => {
    render(
      <ErrorBoundary fallback={FallbackComponent}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Custom fallback: Integration test error/)).toBeInTheDocument();
  });

  it('should handle nested error boundaries', () => {
    render(
      <ErrorBoundary>
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it('should preserve error context', () => {
    const mockErrorHandler = vi.fn();
    vi.mocked(
      require('../../../core/error/handler').coreErrorHandler.handleError
    ).mockImplementation(mockErrorHandler);

    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(mockErrorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Integration test error',
        name: 'Error',
      })
    );
  });
});

describe('Error Recovery Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle recovery from different error states', async () => {
    const { rerender } = render(<RecoveryUI />);

    // Initial state
    expect(screen.getByText(/Recovery Options/)).toBeInTheDocument();

    // Simulate recovery in progress
    rerender(<RecoveryUI isRecovering={true} />);

    expect(screen.getByText(/Recovering/)).toBeInTheDocument();

    // Simulate recovery complete
    rerender(<RecoveryUI isRecovering={false} />);

    expect(screen.getByText(/Recovery Options/)).toBeInTheDocument();
  });

  it('should handle error escalation', () => {
    render(
      <RecoveryUI
        error={{ message: 'Critical error', stack: 'Stack trace' }}
        onEscalate={() => {}}
      />
    );

    expect(screen.getByText(/Critical error/)).toBeInTheDocument();
  });

  it('should provide context-specific recovery options', () => {
    render(<RecoveryUI context="network" error={{ message: 'Network error' }} />);

    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });
});
