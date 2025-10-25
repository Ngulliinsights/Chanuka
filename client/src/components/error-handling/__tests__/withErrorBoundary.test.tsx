import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { logger } from '../../../utils/browser-logger';
import {
  withErrorBoundary,
  CriticalSection,
  useErrorState,
  ErrorState,
} from '../withErrorBoundary';

// Test component that throws an error
const ThrowingComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test component error');
  }
  return <div>Component rendered successfully</div>;
};

// Test component that uses error state hook
const ComponentWithErrorState = () => {
  const { error, hasError, handleError, clearError } = useErrorState();

  const triggerError = () => {
    handleError(new Error('Manual error'));
  };

  if (hasError && error) {
    return (
      <ErrorState
        error={error}
        onRetry={clearError}
        onDismiss={clearError}
      />
    );
  }

  return (
    <div>
      <span>No error</span>
      <button onClick={triggerError}>Trigger Error</button>
    </div>
  );
};

describe('withErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render component normally when no error occurs', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent);
    
    render(<WrappedComponent shouldThrow={false} />);
    
    expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
  });

  it('should catch and display error when component throws', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent);
    
    render(<WrappedComponent shouldThrow={true} />);
    
    expect(screen.getByText('This component failed to load.')).toBeInTheDocument();
  });

  it('should call custom error handler when provided', () => {
    const onError = vi.fn();
    const WrappedComponent = withErrorBoundary(ThrowingComponent, { onError });
    
    render(<WrappedComponent shouldThrow={true} />);
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should use custom fallback component when provided', () => {
    const CustomFallback = () => <div>Custom error fallback</div>;
    const WrappedComponent = withErrorBoundary(ThrowingComponent, {
      fallbackComponent: CustomFallback,
    });
    
    render(<WrappedComponent shouldThrow={true} />);
    
    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
  });
});

describe('CriticalSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when no error occurs', () => {
    render(
      <CriticalSection name="test-section">
        <div>Critical content</div>
      </CriticalSection>
    );
    
    expect(screen.getByText('Critical content')).toBeInTheDocument();
  });

  it('should catch errors in critical section', () => {
    render(
      <CriticalSection name="test-section">
        <ThrowingComponent shouldThrow={true} />
      </CriticalSection>
    );
    
    expect(screen.getByText('This component failed to load.')).toBeInTheDocument();
  });

  it('should call custom error handler with section name', () => {
    const onError = vi.fn();
    
    render(
      <CriticalSection name="test-section" onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </CriticalSection>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });
});

describe('useErrorState', () => {
  it('should manage error state correctly', () => {
    render(<ComponentWithErrorState />);
    
    // Initially no error
    expect(screen.getByText('No error')).toBeInTheDocument();
    
    // Trigger error
    fireEvent.click(screen.getByText('Trigger Error'));
    
    // Should show error state
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Manual error')).toBeInTheDocument();
  });

  it('should clear error when retry is clicked', () => {
    render(<ComponentWithErrorState />);
    
    // Trigger error
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Click retry
    fireEvent.click(screen.getByText('Try again'));
    
    // Should clear error
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should clear error when dismiss is clicked', () => {
    render(<ComponentWithErrorState />);
    
    // Trigger error
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Click dismiss
    fireEvent.click(screen.getByText('Dismiss'));
    
    // Should clear error
    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  const mockError = new Error('Test error message');

  it('should display error message', () => {
    render(<ErrorState error={mockError} />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    
    render(<ErrorState error={mockError} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    
    render(<ErrorState error={mockError} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ErrorState error={mockError} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show both retry and dismiss buttons when both handlers provided', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    
    render(
      <ErrorState 
        error={mockError} 
        onRetry={onRetry} 
        onDismiss={onDismiss} 
      />
    );
    
    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });
});