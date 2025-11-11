import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../error-boundary';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Component that throws an error
const ErrorComponent = () => {
  throw new Error('Test error');
};

// Component that doesn't throw
const SafeComponent = () => <div>Safe content</div>;

describe('ErrorBoundary', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.location.reload
    delete (window as any).location;
    window.location = { ...originalLocation, reload: jest.fn() };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('catches and displays error UI when child throws', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload application/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('calls componentDidCatch when error occurs', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockLogger = require('../../utils/logger').logger;

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error boundary caught an error:',
      expect.objectContaining({
        component: 'Chanuka',
        error: expect.any(Error),
        errorInfo: expect.any(Object),
      })
    );

    consoleSpy.mockRestore();
  });

  it('handles retry by reloading the page', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload application/i });
    fireEvent.click(reloadButton);

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('handles try again by resetting error state', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    // After clicking try again, the error state should be reset
    // Since the child still throws, it should catch again
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('handles unhandled promise rejections', () => {
    const mockLogger = require('../../utils/logger').logger;

    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    const promiseRejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      reason: 'Test promise rejection',
    });

    window.dispatchEvent(promiseRejectionEvent);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unhandled promise rejection:',
      { component: 'Chanuka' },
      'Test promise rejection'
    );
  });

  it('prevents default behavior for unhandled promise rejections', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    const promiseRejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      reason: 'Test promise rejection',
    });

    const preventDefaultSpy = jest.spyOn(promiseRejectionEvent, 'preventDefault');

    window.dispatchEvent(promiseRejectionEvent);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it('adds and removes event listeners correctly', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('displays generic error message when error has no message', () => {
    const ErrorWithoutMessage = () => {
      const error = new Error();
      error.message = '';
      throw error;
    };

    render(
      <ErrorBoundary>
        <ErrorWithoutMessage />
      </ErrorBoundary>
    );

    expect(screen.getByText('An unexpected error occurred. The application is being restored.')).toBeInTheDocument();
  });

  it('handles multiple errors gracefully', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Try to render again with error
    rerender(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders error UI with proper accessibility', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Something went wrong');

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    buttons.forEach(button => {
      expect(button).toBeEnabled();
    });
  });

  it('handles error in getDerivedStateFromError', () => {
    // getDerivedStateFromError should handle any errors thrown within it
    const result = ErrorBoundary.getDerivedStateFromError(new Error('Test error'));
    expect(result).toEqual({
      hasError: true,
      error: expect.any(Error),
    });
  });

  it('maintains error state across re-renders', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('handles nested error boundaries correctly', () => {
    const OuterErrorComponent = () => {
      throw new Error('Outer error');
    };

    const InnerErrorComponent = () => {
      throw new Error('Inner error');
    };

    const NestedContent = () => (
      <ErrorBoundary>
        <div>
          <h3>Inner Boundary</h3>
          <InnerErrorComponent />
        </div>
      </ErrorBoundary>
    );

    render(
      <ErrorBoundary>
        <OuterErrorComponent />
        <NestedContent />
      </ErrorBoundary>
    );

    // Only the outer error should be caught by the outermost boundary
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Outer error')).toBeInTheDocument();

    // Inner error should not be visible since outer caught first
    expect(screen.queryByText('Inner error')).not.toBeInTheDocument();
  });

  it('allows inner boundary to catch errors when outer boundary has no error', () => {
    const InnerErrorComponent = () => {
      throw new Error('Inner error');
    };

    const NestedContent = () => (
      <ErrorBoundary>
        <div>
          <h3>Inner Boundary</h3>
          <InnerErrorComponent />
        </div>
      </ErrorBoundary>
    );

    render(
      <ErrorBoundary>
        <SafeComponent />
        <NestedContent />
      </ErrorBoundary>
    );

    // Safe component should render
    expect(screen.getByText('Safe content')).toBeInTheDocument();

    // Inner boundary should catch its own error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Inner error')).toBeInTheDocument();
  });

  it('handles error recovery in nested boundaries', () => {
    let shouldThrow = true;

    const RecoverableErrorComponent = () => {
      if (shouldThrow) {
        throw new Error('Recoverable error');
      }
      return <div>Recovered content</div>;
    };

    const NestedContent = () => (
      <ErrorBoundary>
        <div>
          <h3>Nested Boundary</h3>
          <RecoverableErrorComponent />
          <button onClick={() => { shouldThrow = false; }}>Recover</button>
        </div>
      </ErrorBoundary>
    );

    render(
      <ErrorBoundary>
        <NestedContent />
      </ErrorBoundary>
    );

    // Initially shows error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Recoverable error')).toBeInTheDocument();

    // Click try again to reset inner boundary
    const tryAgainButton = screen.getAllByRole('button', { name: /try again/i })[0];
    fireEvent.click(tryAgainButton);

    // Should still show error since component still throws
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('maintains proper error isolation between sibling boundaries', () => {
    const ErrorComponent1 = () => {
      throw new Error('Error 1');
    };

    const ErrorComponent2 = () => {
      throw new Error('Error 2');
    };

    render(
      <ErrorBoundary>
        <ErrorBoundary>
          <ErrorComponent1 />
        </ErrorBoundary>
        <ErrorBoundary>
          <ErrorComponent2 />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    // Should show multiple error UIs
    const errorMessages = screen.getAllByText('Something went wrong');
    expect(errorMessages).toHaveLength(2);

    const errorDetails = screen.getAllByText(/Error [12]/);
    expect(errorDetails).toHaveLength(2);
  });

  it('handles deeply nested error boundaries with mixed content', () => {
    const DeepNestedContent = () => (
      <ErrorBoundary>
        <div>Level 1</div>
        <ErrorBoundary>
          <div>Level 2</div>
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>
          <div>Level 2 continued</div>
        </ErrorBoundary>
        <div>Level 1 continued</div>
      </ErrorBoundary>
    );

    render(<DeepNestedContent />);

    // Should show error UI at the deepest level
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    // Sibling content should still be visible
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('Level 1 continued')).toBeInTheDocument();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
    expect(screen.getByText('Level 2 continued')).toBeInTheDocument();
  });

  it('does not affect normal component lifecycle', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });
});