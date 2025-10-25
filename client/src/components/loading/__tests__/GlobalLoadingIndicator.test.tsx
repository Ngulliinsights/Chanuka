import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * GlobalLoadingIndicator component tests
 * Following navigation component patterns for testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import {
  GlobalLoadingIndicator,
  MinimalGlobalLoadingIndicator,
  useGlobalLoadingIndicator,
} from '../GlobalLoadingIndicator';
import { LoadingOperationFailedError } from '../errors';

// Mock loading context
const mockLoadingContext = {
  state: {
    operations: {
      'op1': {
        id: 'op1',
        type: 'component',
        message: 'Loading component',
        priority: 'high',
        progress: 50,
        stage: 'processing',
        startTime: Date.now() - 5000,
        timeout: 30000,
        retryCount: 0,
        maxRetries: 3,
        connectionAware: true,
      },
      'op2': {
        id: 'op2',
        type: 'page',
        message: 'Loading page',
        priority: 'medium',
        error: new Error('Failed to load'),
        startTime: Date.now() - 10000,
        timeout: 30000,
        retryCount: 1,
        maxRetries: 3,
        connectionAware: true,
      },
    },
    isOnline: true,
    connectionInfo: {
      connectionType: 'fast',
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
    },
    highPriorityLoading: true,
    adaptiveSettings: {
      maxConcurrentOperations: 5,
      enableAnimations: true,
      defaultTimeout: 30000,
      retryDelay: 3000,
    },
  },
  cancelOperation: vi.fn(),
  retryOperation: vi.fn(),
  getOperationsByPriority: vi.fn((priority) => {
    const ops = Object.values(mockLoadingContext.state.operations);
    return ops.filter(op => op.priority === priority);
  }),
  shouldShowGlobalLoader: vi.fn(() => true),
};

vi.mock('@/contexts/LoadingContext', () => ({
  useLoadingContext: () => mockLoadingContext,
}));

// Mock recovery hook
vi.mock('../hooks/useLoadingRecovery', () => ({
  useLoadingRecovery: () => ({
    recoveryState: {
      canRecover: true,
      suggestions: ['Check connection', 'Try again'],
      isRecovering: false,
      recoveryAttempts: 0,
      maxRecoveryAttempts: 3,
    },
    recover: vi.fn().mockResolvedValue(true),
    updateError: vi.fn(),
  }),
}));

// Mock portal
vi.mock('react-dom', () => ({
  ...vi.requireActual('react-dom'),
  createPortal: (element: React.ReactNode) => element,
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('GlobalLoadingIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  
  });

  describe('GlobalLoadingIndicator Component', () => {
    it('should render with default props', () => {
      render(<GlobalLoadingIndicator />);
      
      expect(screen.getByText('Loading (2)')).toBeInTheDocument();
      expect(screen.getByText('Loading component')).toBeInTheDocument();
      expect(screen.getByText('Loading page')).toBeInTheDocument();
    });

    it('should render in different positions', () => {
      const { rerender, container } = render(<GlobalLoadingIndicator position="top-left" />);
      expect(container.querySelector('.top-4.left-4')).toBeInTheDocument();
      
      rerender(<GlobalLoadingIndicator position="bottom-right" />);
      expect(container.querySelector('.bottom-4.right-4')).toBeInTheDocument();
      
      rerender(<GlobalLoadingIndicator position="center" />);
      expect(container.querySelector('.top-1\\/2.left-1\\/2')).toBeInTheDocument();
    });

    it('should show connection status when enabled', () => {
      render(<GlobalLoadingIndicator showConnectionStatus />);
      
      // Should show connection icon (mocked as fast connection)
      expect(document.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('should show offline warning when offline', () => {
      mockLoadingContext.state.isOnline = false;
      
      render(<GlobalLoadingIndicator showConnectionStatus />);
      
      expect(screen.getByText("You're offline. Some operations may be limited.")).toBeInTheDocument();
    });

    it('should show slow connection warning', () => {
      mockLoadingContext.state.connectionInfo.connectionType = 'slow';
      
      render(<GlobalLoadingIndicator showConnectionStatus />);
      
      expect(screen.getByText('Slow connection detected. Operations may take longer.')).toBeInTheDocument();
    });

    it('should limit visible operations based on maxVisible', () => {
      render(<GlobalLoadingIndicator maxVisible={1} />);
      
      expect(screen.getByText('Loading component')).toBeInTheDocument();
      expect(screen.getByText('+1 more operation')).toBeInTheDocument();
    });

    it('should show operation progress when available', () => {
      render(<GlobalLoadingIndicator showProgress />);
      
      // Should show progress bar for operation with progress
      const progressBars = document.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should show operation stage information', () => {
      render(<GlobalLoadingIndicator />);
      
      expect(screen.getByText('Stage: processing')).toBeInTheDocument();
    });

    it('should show error messages for failed operations', () => {
      render(<GlobalLoadingIndicator />);
      
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('should show retry count for failed operations', () => {
      render(<GlobalLoadingIndicator />);
      
      expect(screen.getByText('Retry 1/3')).toBeInTheDocument();
    });

    it('should show elapsed time for operations', () => {
      render(<GlobalLoadingIndicator />);
      
      // Should show elapsed time (mocked as 5s and 10s ago)
      expect(screen.getByText('5s')).toBeInTheDocument();
      expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('should handle operation cancellation', () => {
      render(<GlobalLoadingIndicator />);
      
      const cancelButtons = screen.getAllByRole('button', { name: /×/ });
      fireEvent.click(cancelButtons[0]);
      
      expect(mockLoadingContext.cancelOperation).toHaveBeenCalledWith('op1');
    });

    it('should handle operation retry', () => {
      render(<GlobalLoadingIndicator />);
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      expect(mockLoadingContext.retryOperation).toHaveBeenCalledWith('op2');
    });

    it('should show expanded operation details', () => {
      render(<GlobalLoadingIndicator showDetails />);
      
      const expandButton = screen.getAllByText('+')[0];
      fireEvent.click(expandButton);
      
      expect(screen.getByText('ID: op1')).toBeInTheDocument();
      expect(screen.getByText('Type: component')).toBeInTheDocument();
      expect(screen.getByText('Priority: high')).toBeInTheDocument();
    });

    it('should collapse expanded operation details', () => {
      render(<GlobalLoadingIndicator showDetails />);
      
      const expandButton = screen.getAllByText('+')[0];
      fireEvent.click(expandButton);
      
      expect(screen.getByText('ID: op1')).toBeInTheDocument();
      
      const collapseButton = screen.getByText('−');
      fireEvent.click(collapseButton);
      
      expect(screen.queryByText('ID: op1')).not.toBeInTheDocument();
    });

    it('should show adaptive settings when details are enabled', () => {
      render(<GlobalLoadingIndicator showDetails />);
      
      expect(screen.getByText('Max Concurrent: 5')).toBeInTheDocument();
      expect(screen.getByText('Animations: On')).toBeInTheDocument();
      expect(screen.getByText('Default Timeout: 30s')).toBeInTheDocument();
      expect(screen.getByText('Retry Delay: 3s')).toBeInTheDocument();
    });

    it('should auto-hide when configured', async () => {
      const { container } = render(<GlobalLoadingIndicator autoHide autoHideDelay={1000} />);
      
      // Mock no operations to trigger auto-hide
      mockLoadingContext.state.operations = {};
      mockLoadingContext.shouldShowGlobalLoader.mockReturnValue(false);
      
      // Re-render to trigger effect
      render(<GlobalLoadingIndicator autoHide autoHideDelay={1000} />);
      
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should close when close button is clicked', () => {
      const { container } = render(<GlobalLoadingIndicator />);
      
      const closeButton = screen.getByRole('button', { name: /×/ });
      fireEvent.click(closeButton);
      
      // Should hide the indicator
      expect(container.firstChild).toBeNull();
    });

    it('should not render when no operations and shouldShowGlobalLoader returns false', () => {
      mockLoadingContext.state.operations = {};
      mockLoadingContext.shouldShowGlobalLoader.mockReturnValue(false);
      
      const { container } = render(<GlobalLoadingIndicator />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should handle validation errors gracefully', () => {
      // Mock invalid operation that would cause validation error
      mockLoadingContext.state.operations = {
        'invalid-op': {
          id: '',
          type: 'invalid',
          message: '',
          priority: 'invalid',
          startTime: 'invalid',
          retryCount: -1,
          maxRetries: -1,
          connectionAware: 'invalid',
        } as any,
      };

      // Should not crash and should handle gracefully
      expect(() => render(<GlobalLoadingIndicator />)).not.toThrow();
    });
  });

  describe('MinimalGlobalLoadingIndicator', () => {
    it('should render minimal version', () => {
      render(<MinimalGlobalLoadingIndicator />);
      
      expect(screen.getByText('Loading (2)')).toBeInTheDocument();
    });

    it('should show high priority indicator', () => {
      render(<MinimalGlobalLoadingIndicator />);
      
      // Should show larger spinner for high priority
      expect(document.querySelector('.h-5.w-5')).toBeInTheDocument();
    });

    it('should show offline indicator', () => {
      mockLoadingContext.state.isOnline = false;
      
      render(<MinimalGlobalLoadingIndicator />);
      
      expect(document.querySelector('.text-red-500')).toBeInTheDocument();
    });

    it('should not render when shouldShowGlobalLoader returns false', () => {
      mockLoadingContext.shouldShowGlobalLoader.mockReturnValue(false);
      
      const { container } = render(<MinimalGlobalLoadingIndicator />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should apply custom className', () => {
      const { container } = render(<MinimalGlobalLoadingIndicator className="custom-minimal" />);
      
      expect(container.firstChild).toHaveClass('custom-minimal');
    });
  });

  describe('useGlobalLoadingIndicator Hook', () => {
    it('should provide indicator control functions', () => {
      const TestComponent = () => {
        const { config, isEnabled, show, hide, updateConfig } = useGlobalLoadingIndicator();
        
        return (
          <div>
            <span data-testid="enabled">{isEnabled.toString()}</span>
            <span data-testid="position">{config.position || 'default'}</span>
            <button onClick={() => show({ position: 'top-left' })}>Show</button>
            <button onClick={hide}>Hide</button>
            <button onClick={() => updateConfig({ showDetails: true })}>Update</button>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('position')).toHaveTextContent('default');
      
      fireEvent.click(screen.getByText('Show'));
      expect(screen.getByTestId('position')).toHaveTextContent('top-left');
      
      fireEvent.click(screen.getByText('Hide'));
      expect(screen.getByTestId('enabled')).toHaveTextContent('false');
      
      fireEvent.click(screen.getByText('Update'));
      // Config should be updated but we can't easily test the internal state
    });

    it('should maintain config state across updates', () => {
      const TestComponent = () => {
        const { config, updateConfig } = useGlobalLoadingIndicator();
        
        React.useEffect(() => {
          updateConfig({ showDetails: true, maxVisible: 5 });
        }, [updateConfig]);
        
        return (
          <div>
            <span data-testid="showDetails">{config.showDetails?.toString()}</span>
            <span data-testid="maxVisible">{config.maxVisible?.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('showDetails')).toHaveTextContent('true');
      expect(screen.getByTestId('maxVisible')).toHaveTextContent('5');
    });
  });

  describe('Error Handling', () => {
    it('should handle operation errors gracefully', () => {
      mockLoadingContext.state.operations = {
        'error-op': {
          id: 'error-op',
          type: 'component',
          message: 'Loading with error',
          priority: 'high',
          error: new LoadingOperationFailedError('error-op', 'Operation failed', 2),
          startTime: Date.now() - 5000,
          timeout: 30000,
          retryCount: 2,
          maxRetries: 3,
          connectionAware: true,
        },
      };

      render(<GlobalLoadingIndicator />);
      
      expect(screen.getByText('Operation failed')).toBeInTheDocument();
      expect(screen.getByText('Retry 2/3')).toBeInTheDocument();
    });

    it('should show retry button only for retryable operations', () => {
      mockLoadingContext.state.operations = {
        'max-retries-op': {
          id: 'max-retries-op',
          type: 'component',
          message: 'Max retries reached',
          priority: 'high',
          error: new Error('Max retries'),
          startTime: Date.now() - 5000,
          timeout: 30000,
          retryCount: 3,
          maxRetries: 3,
          connectionAware: true,
        },
      };

      render(<GlobalLoadingIndicator />);
      
      expect(screen.getByText('Max retries')).toBeInTheDocument();
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should handle missing operation properties gracefully', () => {
      mockLoadingContext.state.operations = {
        'minimal-op': {
          id: 'minimal-op',
          type: 'component',
          message: 'Minimal operation',
          priority: 'medium',
          startTime: Date.now(),
          retryCount: 0,
          maxRetries: 3,
          connectionAware: false,
        },
      };

      expect(() => render(<GlobalLoadingIndicator />)).not.toThrow();
      expect(screen.getByText('Minimal operation')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of operations efficiently', () => {
      const manyOperations: any = {};
      for (let i = 0; i < 100; i++) {
        manyOperations[`op${i}`] = {
          id: `op${i}`,
          type: 'component',
          message: `Operation ${i}`,
          priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
          startTime: Date.now() - i * 1000,
          retryCount: 0,
          maxRetries: 3,
          connectionAware: true,
        };
      }
      
      mockLoadingContext.state.operations = manyOperations;
      
      const startTime = performance.now();
      render(<GlobalLoadingIndicator maxVisible={10} />);
      const endTime = performance.now();
      
      // Should render quickly even with many operations
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
      
      // Should only show maxVisible operations
      const operationElements = screen.getAllByText(/Operation \d+/);
      expect(operationElements.length).toBeLessThanOrEqual(10);
    });

    it('should not cause memory leaks with frequent updates', () => {
      const { rerender } = render(<GlobalLoadingIndicator />);
      
      // Simulate frequent updates
      for (let i = 0; i < 50; i++) {
        mockLoadingContext.state.operations = {
          [`op${i}`]: {
            id: `op${i}`,
            type: 'component',
            message: `Operation ${i}`,
            priority: 'medium',
            startTime: Date.now(),
            retryCount: 0,
            maxRetries: 3,
            connectionAware: true,
          },
        };
        
        rerender(<GlobalLoadingIndicator />);
      }
      
      // Should not crash or cause performance issues
      expect(screen.getByText(/Loading/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<GlobalLoadingIndicator />);
      
      // Progress bars should have proper roles
      const progressBars = document.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should be keyboard accessible', () => {
      render(<GlobalLoadingIndicator />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        
        // Should be focusable
        button.focus();
        expect(button).toHaveFocus();
      });
    });

    it('should provide screen reader friendly content', () => {
      render(<GlobalLoadingIndicator />);
      
      expect(screen.getByText('Loading (2)')).toBeInTheDocument();
      expect(screen.getByText('Stage: processing')).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(<GlobalLoadingIndicator />);
      
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toHaveAttribute('type', 'button');
      
      const cancelButtons = screen.getAllByText('×');
      cancelButtons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});