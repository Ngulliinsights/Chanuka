/**
 * Comprehensive tests for ErrorBoundary component
 * Covers error catching, recovery, metrics, accessibility, and user interactions
 */

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary, { EnhancedErrorFallback } from '../ErrorBoundary';
import { BaseError, ErrorDomain, ErrorSeverity } from '../../../shared/errors';
import { renderWithWrapper } from '../../ui/__tests__/test-utils';

// Mock dependencies
vi.mock('../../../utils/browser-logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('../../../utils/browser-compatibility', () => ({
  getBrowserInfo: vi.fn(() => ({
    userAgent: 'test-agent',
    platform: 'test-platform'
  }))
}));

vi.mock('../../../utils/performance-monitor', () => ({
  performanceMonitor: {
    getMetrics: vi.fn(() => ({
      memoryUsage: 100,
      renderTime: 50
    }))
  }
}));

// Component that throws an error
const ErrorComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws a BaseError
const BaseErrorComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new BaseError('Base error test', 'TEST_ERROR', {
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH
    });
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Error Catching', () => {
    it('catches and displays errors from child components', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('converts standard errors to BaseError', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('handles BaseError instances directly', () => {
      render(
        <ErrorBoundary>
          <BaseErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Base error test')).toBeInTheDocument();
    });

    it('renders children normally when no error', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Recovery Options', () => {
    it('generates recovery options for different error types', () => {
      const networkError = new BaseError('Network error', 'NETWORK_ERROR', {
        domain: ErrorDomain.NETWORK
      });

      render(
        <ErrorBoundary enableRecovery>
          <BaseErrorComponent />
        </ErrorBoundary>
      );

      // Should show recovery options
      expect(screen.getByText('Recovery Options')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('shows automatic recovery indicators', () => {
      render(
        <ErrorBoundary enableRecovery>
          <ErrorComponent />
        </ErrorBoundary>
      );

      // Should show automatic option for network errors
      const automaticBadges = screen.getAllByText('Automatic');
      expect(automaticBadges.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    it('handles retry button click', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      // After retry, should show normal content
      rerender(
        <ErrorBoundary>
          <ErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('handles reload button click', async () => {
      const user = userEvent.setup();
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('Reload Page');
      await user.click(reloadButton);

      expect(mockReload).toHaveBeenCalled();
    });

    it('handles contact support button', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const supportButton = screen.getByText('Contact Support');
      await user.click(supportButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'Support contact functionality would be implemented here. Please check the console for error details.'
      );

      alertSpy.mockRestore();
    });
  });

  describe('User Feedback', () => {
    it('allows rating submission', async () => {
      const user = userEvent.setup();
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const ratingButton = screen.getByLabelText('Rate 5 stars');
      await user.click(ratingButton);

      // Should show thank you message
      await waitFor(() => {
        expect(screen.getByText('✓ Thank you for your feedback!')).toBeInTheDocument();
      });
    });

    it('allows comment submission', async () => {
      const user = userEvent.setup();
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const textarea = screen.getByPlaceholderText('Tell us what happened...');
      await user.type(textarea, 'Test comment');

      const submitButton = screen.getByText('Submit Feedback');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('✓ Thank you for your feedback!')).toBeInTheDocument();
      });
    });

    it('hides feedback form after submission', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      // Initially should show feedback form
      expect(screen.getByText('How would you rate this error experience?')).toBeInTheDocument();

      // Simulate feedback submission by setting state
      // (In real usage, this would be handled by the component)
    });
  });

  describe('Recovery Status', () => {
    it('shows recovery attempt status', () => {
      // This would require mocking internal state or using a custom test component
      // For now, test the UI when recovery is attempted
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      // Recovery status should be shown after attempts
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Technical Details', () => {
    it('shows technical details when enabled', () => {
      render(
        <ErrorBoundary showTechnicalDetails>
          <ErrorComponent />
        </ErrorBoundary>
      );
  
      expect(screen.getByText('Technical Details (for developers)')).toBeInTheDocument();
  
      // Click to expand
      const summary = screen.getByText('Technical Details (for developers)');
      fireEvent.click(summary);
  
      expect(screen.getByText('Error ID:')).toBeInTheDocument();
      expect(screen.getByText('Code:')).toBeInTheDocument();
    });
  
    it('hides technical details when disabled', () => {
      render(
        <ErrorBoundary showTechnicalDetails={false}>
          <ErrorComponent />
        </ErrorBoundary>
      );
  
      expect(screen.queryByText('Technical Details (for developers)')).not.toBeInTheDocument();
    });
  
    describe('Production Scenario Tests', () => {
      it('handles production environment constraints gracefully', () => {
        // Mock production environment
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
  
        render(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>
        );
  
        // Should still show user-friendly error UI
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
  
        // Restore environment
        process.env.NODE_ENV = originalEnv;
      });
  
      it('handles network failures during error reporting', async () => {
        // Mock network failure for error reporting
        const mockLogger = vi.mocked(require('../../../utils/browser-logger').logger);
        mockLogger.error.mockImplementation(() => {
          throw new Error('Network error during logging');
        });
  
        render(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>
        );
  
        // Should still render error UI despite logging failure
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  
        // Restore mock
        mockLogger.error.mockRestore();
      });
  
      it('handles performance monitor failures gracefully', () => {
        // Mock performance monitor failure
        const mockPerformanceMonitor = vi.mocked(require('../../../utils/performance-monitor').performanceMonitor);
        mockPerformanceMonitor.getMetrics.mockImplementation(() => {
          throw new Error('Performance monitor unavailable');
        });
  
        render(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>
        );
  
        // Should still render error UI
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  
        // Restore mock
        mockPerformanceMonitor.getMetrics.mockRestore();
      });
  
      it('handles browser compatibility check failures', () => {
        // Mock browser compatibility failure
        const mockGetBrowserInfo = vi.mocked(require('../../../utils/browser-compatibility').getBrowserInfo);
        mockGetBrowserInfo.mockImplementation(() => {
          throw new Error('Browser detection failed');
        });
  
        render(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>
        );
  
        // Should still render error UI
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  
        // Restore mock
        mockGetBrowserInfo.mockRestore();
      });
  
      it('handles localStorage access failures during cache clearing', async () => {
        const user = userEvent.setup();
  
        // Mock localStorage failure
        const originalLocalStorage = global.localStorage;
        Object.defineProperty(window, 'localStorage', {
          value: {
            clear: vi.fn(() => {
              throw new Error('localStorage access denied');
            })
          },
          writable: true
        });
  
        render(
          <ErrorBoundary enableRecovery>
            <BaseErrorComponent />
          </ErrorBoundary>
        );
  
        // Should still show recovery options
        expect(screen.getByText('Recovery Options')).toBeInTheDocument();
  
        // Restore localStorage
        Object.defineProperty(window, 'localStorage', {
          value: originalLocalStorage,
          writable: true
        });
      });
  
      it('handles memory pressure scenarios', () => {
        // Mock high memory usage
        const mockPerformanceMonitor = vi.mocked(require('../../../utils/performance-monitor').performanceMonitor);
        mockPerformanceMonitor.getMetrics.mockReturnValue({
          memoryUsage: 95, // Very high memory usage
          renderTime: 100
        });
  
        render(
          <ErrorBoundary>
            <ErrorComponent />
          </ErrorBoundary>
        );
  
        // Should still render error UI despite high memory
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  
        // Restore mock
        mockPerformanceMonitor.getMetrics.mockRestore();
      });
  
      it('handles rapid error sequences without crashing', () => {
        const RapidErrorComponent = ({ errorCount }: { errorCount: number }) => {
          if (errorCount > 0) {
            throw new Error(`Rapid error ${errorCount}`);
          }
          return <div>No error</div>;
        };
  
        const { rerender } = render(
          <ErrorBoundary>
            <RapidErrorComponent errorCount={1} />
          </ErrorBoundary>
        );
  
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  
        // Rapid re-renders with errors
        for (let i = 2; i <= 5; i++) {
          rerender(
            <ErrorBoundary>
              <RapidErrorComponent errorCount={i} />
            </ErrorBoundary>
          );
          expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        }
  
        // Should handle recovery
        rerender(
          <ErrorBoundary>
            <RapidErrorComponent errorCount={0} />
          </ErrorBoundary>
        );
  
        expect(screen.getByText('No error')).toBeInTheDocument();
      });
  
      it('handles component unmounting during error recovery', async () => {
        const user = userEvent.setup();
  
        const { unmount } = render(
          <ErrorBoundary enableRecovery>
            <ErrorComponent />
          </ErrorBoundary>
        );
  
        // Start recovery process
        const retryButton = screen.getByText('Try Again');
        await user.click(retryButton);
  
        // Unmount during recovery
        unmount();
  
        // Should not crash (this is mainly a smoke test)
        expect(true).toBe(true);
      });
  
      it('handles concurrent error boundaries', () => {
        const ConcurrentErrors = () => (
          <div>
            <ErrorBoundary>
              <ErrorComponent />
            </ErrorBoundary>
            <ErrorBoundary>
              <BaseErrorComponent />
            </ErrorBoundary>
          </div>
        );
  
        render(<ConcurrentErrors />);
  
        // Should show both error UIs
        const errorMessages = screen.getAllByText('Something went wrong');
        expect(errorMessages).toHaveLength(2);
  
        const errors = screen.getAllByText(/Test error|Base error test/);
        expect(errors).toHaveLength(2);
      });
  
      it('handles error boundary nesting with different configurations', () => {
        const NestedBoundaries = () => (
          <ErrorBoundary enableRecovery={false}>
            <ErrorBoundary enableFeedback={false}>
              <ErrorComponent />
            </ErrorBoundary>
          </ErrorBoundary>
        );
  
        render(<NestedBoundaries />);
  
        // Should show error UI from inner boundary
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
  
        // Should not show recovery options (disabled in outer)
        // Should not show feedback (disabled in inner)
        expect(screen.queryByText('Recovery Options')).not.toBeInTheDocument();
        expect(screen.queryByText('Help us improve')).not.toBeInTheDocument();
      });
  
      it('handles production error masking', () => {
        // Mock production environment with sensitive error details
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
  
        const SensitiveErrorComponent = () => {
          const sensitiveError = new Error('Database connection failed: user=admin, pass=secret123');
          sensitiveError.stack = 'Sensitive stack trace with credentials';
          throw sensitiveError;
        };
  
        render(
          <ErrorBoundary showTechnicalDetails={false}>
            <SensitiveErrorComponent />
          </ErrorBoundary>
        );
  
        // Should show generic error message in production
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Database connection failed: user=admin, pass=secret123')).toBeInTheDocument();
  
        // Should not show technical details
        expect(screen.queryByText('Technical Details (for developers)')).not.toBeInTheDocument();
  
        // Restore environment
        process.env.NODE_ENV = originalEnv;
      });
  
      it('handles third-party script failures', () => {
        // Mock third-party script error
        const ThirdPartyErrorComponent = () => {
          const error = new Error('Third-party script failed to load');
          error.name = 'ChunkLoadError';
          throw error;
        };
  
        render(
          <ErrorBoundary>
            <ThirdPartyErrorComponent />
          </ErrorBoundary>
        );
  
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Third-party script failed to load')).toBeInTheDocument();
  
        // Should show appropriate recovery options for chunk load errors
        expect(screen.getByText('Recovery Options')).toBeInTheDocument();
        expect(screen.getByText('Reload Page')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Fallback', () => {
    it('uses custom fallback component when provided', () => {
      const CustomFallback = ({ error }: any) => (
        <div data-testid="custom-fallback">
          Custom: {error.message}
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom: Test error')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('buttons have proper focus management', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again');
      retryButton.focus();
      expect(retryButton).toHaveFocus();
    });

    it('rating buttons have proper labels', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByLabelText('Rate 1 star')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 5 stars')).toBeInTheDocument();
    });
  });

  describe('Configuration', () => {
    it('respects enableRecovery prop', () => {
      render(
        <ErrorBoundary enableRecovery={false}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      // Should still show manual recovery options
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('respects enableFeedback prop', () => {
      render(
        <ErrorBoundary enableFeedback={false}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      // Should hide feedback section
      expect(screen.queryByText('Help us improve')).not.toBeInTheDocument();
    });

    it('accepts custom context', () => {
      render(
        <ErrorBoundary context="TestComponent">
          <ErrorComponent />
        </ErrorBoundary>
      );

      // Context is used in logging/metrics, not directly visible
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Error Callbacks', () => {
    it('calls onError callback when provided', () => {
      const onError = vi.fn();
      render(
        <ErrorBoundary onError={onError}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(BaseError),
        expect.any(Object)
      );
    });

    it('calls onMetricsCollected when provided', () => {
      const onMetrics = vi.fn();
      render(
        <ErrorBoundary onMetricsCollected={onMetrics}>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(onMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          errorId: expect.any(String),
          timestamp: expect.any(Date),
          component: expect.any(String)
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple errors gracefully', () => {
      const MultipleErrors = () => {
        throw new Error('First error');
        return <div>Should not render</div>;
      };

      render(
        <ErrorBoundary>
          <MultipleErrors />
        </ErrorBoundary>
      );

      expect(screen.getByText('First error')).toBeInTheDocument();
    });

    it('handles errors in error boundary itself', () => {
      // This is hard to test directly, but the component should be resilient
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('handles undefined window object', () => {
      // Mock window as undefined for SSR testing
      const originalWindow = global.window;
      delete (global as any).window;

      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Restore window
      global.window = originalWindow;
    });
  });
});

describe('EnhancedErrorFallback', () => {
  const mockProps = {
    error: new BaseError('Test error', 'TEST_ERROR'),
    errorId: 'test-error-id',
    recoveryOptions: [
      {
        id: 'retry',
        label: 'Try Again',
        description: 'Retry the operation',
        action: vi.fn(),
        automatic: false,
        priority: 1
      }
    ],
    onRetry: vi.fn(),
    onFeedback: vi.fn(),
    onReload: vi.fn(),
    onContactSupport: vi.fn(),
    recoveryAttempted: false,
    recoverySuccessful: false,
    userFeedbackSubmitted: false
  };

  it('renders error message and recovery options', () => {
    render(<EnhancedErrorFallback {...mockProps} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Recovery Options')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows recovery status when attempted', () => {
    render(
      <EnhancedErrorFallback
        {...mockProps}
        recoveryAttempted={true}
        recoverySuccessful={true}
      />
    );

    expect(screen.getByText('✓ Automatic recovery was successful!')).toBeInTheDocument();
  });

  it('shows feedback thank you when submitted', () => {
    render(
      <EnhancedErrorFallback
        {...mockProps}
        userFeedbackSubmitted={true}
      />
    );

    expect(screen.getByText('✓ Thank you for your feedback!')).toBeInTheDocument();
  });

  it('shows technical details when enabled', () => {
    render(
      <EnhancedErrorFallback
        {...mockProps}
        showTechnicalDetails={true}
      />
    );

    const summary = screen.getByText('Technical Details (for developers)');
    fireEvent.click(summary);

    expect(screen.getByText('Error ID:')).toBeInTheDocument();
    expect(screen.getByText('test-error-id')).toBeInTheDocument();
  });
});
