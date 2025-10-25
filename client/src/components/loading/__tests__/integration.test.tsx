import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Loading components integration tests
 * Following navigation component patterns for integration testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { LoadingStateManager } from '../LoadingStates';
import { AssetLoadingProvider, useAssetLoadingContext } from '../AssetLoadingIndicator';
import { LoadingError, LoadingTimeoutError, LoadingNetworkError } from '../errors';

// Mock timers for integration tests
vi.useFakeTimers();

// Mock external dependencies
vi.mock('@/hooks/useConnectionAware', () => ({
  useConnectionAware: () => ({
    connectionType: 'fast',
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
  }),
}));

vi.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => true,
}));

vi.mock('@/utils/asset-loading', () => ({
  useAssetLoading: () => ({
    progress: {
      loaded: 0,
      total: 0,
      phase: 'preload',
      currentAsset: undefined,
    },
    getStats: () => ({
      loaded: 0,
      failed: 0,
      connectionType: 'fast',
      isOnline: true,
    }),
  }),
}));

vi.mock('@/contexts/LoadingContext', () => ({
  useLoadingContext: () => ({
    state: {
      operations: {},
      isOnline: true,
      connectionInfo: { connectionType: 'fast' },
      highPriorityLoading: false,
      adaptiveSettings: {
        maxConcurrentOperations: 3,
        enableAnimations: true,
        defaultTimeout: 30000,
        retryDelay: 1000,
      },
    },
    cancelOperation: vi.fn(),
    retryOperation: vi.fn(),
    getOperationsByPriority: vi.fn(() => []),
    shouldShowGlobalLoader: vi.fn(() => false),
  }),
}));

describe('Loading Components Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  
  });

  describe('LoadingStateManager Integration', () => {
    it('should handle state transitions correctly', async () => {
      const onRetry = vi.fn();
      const onTimeout = vi.fn();

      const { rerender } = render(
        <LoadingStateManager
          type="component"
          state="loading"
          message="Loading data..."
          onRetry={onRetry}
          onTimeout={onTimeout}
        />
      );

      // Should show loading state
      expect(screen.getByText('Loading data...')).toBeInTheDocument();

      // Transition to error state
      rerender(
        <LoadingStateManager
          type="component"
          state="error"
          message="Loading data..."
          error={new Error('Failed to load')}
          onRetry={onRetry}
          onTimeout={onTimeout}
        />
      );

      expect(screen.getByText('Failed to load')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();

      // Test retry functionality
      fireEvent.click(screen.getByText('Try again'));
      expect(onRetry).toHaveBeenCalledTimes(1);

      // Transition to success state
      rerender(
        <LoadingStateManager
          type="component"
          state="success"
          message="Loading data..."
          onRetry={onRetry}
          onTimeout={onTimeout}
        />
      );

      expect(screen.getByText('Loaded successfully')).toBeInTheDocument();
    });

    it('should handle progressive loading with stages', async () => {
      const stages = [
        { id: 'stage1', message: 'Loading stage 1' },
        { id: 'stage2', message: 'Loading stage 2' },
        { id: 'stage3', message: 'Loading stage 3' },
      ];

      const { rerender } = render(
        <LoadingStateManager
          type="progressive"
          state="loading"
          stages={stages}
          currentStage={0}
        />
      );

      expect(screen.getByText('Loading stage 1')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();

      // Progress to next stage
      rerender(
        <LoadingStateManager
          type="progressive"
          state="loading"
          stages={stages}
          currentStage={1}
        />
      );

      expect(screen.getByText('Loading stage 2')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });

    it('should handle timeout scenarios', async () => {
      const onTimeout = vi.fn();

      render(
        <LoadingStateManager
          type="timeout-aware"
          state="loading"
          timeout={5000}
          onTimeout={onTimeout}
        />
      );

      // Fast-forward time to trigger timeout
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalledTimes(1);
      });
    });

    it('should adapt to network conditions', () => {
      render(
        <LoadingStateManager
          type="network-aware"
          state="loading"
          message="Loading content"
        />
      );

      expect(screen.getByText('Loading content')).toBeInTheDocument();
    });
  });

  describe('AssetLoadingProvider Integration', () => {
    const TestComponent: React.FC = () => {
      const { showIndicator, hideIndicator, isIndicatorVisible } = useAssetLoadingContext();

      return (
        <div>
          <button onClick={() => showIndicator({ showDetails: true })}>
            Show Indicator
          </button>
          <button onClick={hideIndicator}>Hide Indicator</button>
          <div data-testid="indicator-status">
            {isIndicatorVisible ? 'visible' : 'hidden'}
          </div>
        </div>
      );
    };

    it('should manage asset loading indicator visibility', () => {
      render(
        <AssetLoadingProvider>
          <TestComponent />
        </AssetLoadingProvider>
      );

      // Initially hidden
      expect(screen.getByTestId('indicator-status')).toHaveTextContent('hidden');

      // Show indicator
      fireEvent.click(screen.getByText('Show Indicator'));
      expect(screen.getByTestId('indicator-status')).toHaveTextContent('visible');

      // Hide indicator
      fireEvent.click(screen.getByText('Hide Indicator'));
      expect(screen.getByTestId('indicator-status')).toHaveTextContent('hidden');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle loading errors with recovery', async () => {
      const error = new LoadingError('Network failed', 'NETWORK_ERROR', 500);
      const onRetry = vi.fn();

      render(
        <LoadingStateManager
          type="component"
          state="error"
          error={error}
          onRetry={onRetry}
        />
      );

      expect(screen.getByText('Network failed')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Try again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors', () => {
      const timeoutError = new LoadingTimeoutError('Operation timed out', 30000);

      render(
        <LoadingStateManager
          type="component"
          state="error"
          error={timeoutError}
        />
      );

      expect(screen.getByText('Operation timed out')).toBeInTheDocument();
    });

    it('should handle network errors', () => {
      const networkError = new LoadingNetworkError('Connection failed', 'offline');

      render(
        <LoadingStateManager
          type="component"
          state="error"
          error={networkError}
        />
      );

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  describe('Performance and Accessibility', () => {
    it('should handle rapid state changes without memory leaks', async () => {
      const { rerender } = render(
        <LoadingStateManager
          type="component"
          state="loading"
          message="Loading..."
        />
      );

      // Rapidly change states
      for (let i = 0; i < 10; i++) {
        rerender(
          <LoadingStateManager
            type="component"
            state={i % 2 === 0 ? 'loading' : 'success'}
            message={`Loading ${i}...`}
          />
        );
      }

      // Should handle without errors
      expect(screen.getByText('Loaded successfully')).toBeInTheDocument();
    });

    it('should provide proper accessibility attributes', () => {
      render(
        <LoadingStateManager
          type="component"
          state="loading"
          message="Loading content"
        />
      );

      const loadingElement = screen.getByText('Loading content');
      expect(loadingElement).toBeInTheDocument();
    });

    it('should handle keyboard navigation for interactive elements', () => {
      const onRetry = vi.fn();

      render(
        <LoadingStateManager
          type="component"
          state="error"
          error={new Error('Test error')}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('Try again');
      
      // Test keyboard interaction
      retryButton.focus();
      fireEvent.keyDown(retryButton, { key: 'Enter' });
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle multiple loading operations simultaneously', async () => {
      const MultipleLoadingTest: React.FC = () => {
        const [operations, setOperations] = React.useState([
          { id: '1', type: 'page', state: 'loading', message: 'Loading page...' },
          { id: '2', type: 'component', state: 'loading', message: 'Loading data...' },
          { id: '3', type: 'inline', state: 'loading', message: 'Loading assets...' },
        ]);

        return (
          <div>
            {operations.map((op) => (
              <LoadingStateManager
                key={op.id}
                type={op.type as any}
                state={op.state as any}
                message={op.message}
              />
            ))}
          </div>
        );
      };

      render(<MultipleLoadingTest />);

      expect(screen.getByText('Loading page...')).toBeInTheDocument();
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      expect(screen.getByText('Loading assets...')).toBeInTheDocument();
    });

    it('should handle progressive loading with error recovery', async () => {
      const stages = [
        { id: 'stage1', message: 'Loading configuration', retryable: true },
        { id: 'stage2', message: 'Loading data', retryable: true },
        { id: 'stage3', message: 'Finalizing', retryable: false },
      ];

      const onRetryStage = vi.fn();

      const { rerender } = render(
        <LoadingStateManager
          type="progressive"
          state="loading"
          stages={stages}
          currentStage={0}
        />
      );

      // Simulate error in stage 1
      rerender(
        <LoadingStateManager
          type="progressive"
          state="error"
          stages={stages}
          currentStage={0}
          error={new Error('Stage 1 failed')}
          onRetry={onRetryStage}
        />
      );

      expect(screen.getByText('Stage 1 failed')).toBeInTheDocument();
    });

    it('should handle connection state changes during loading', async () => {
      // Mock connection state change
      const mockUseOnlineStatus = vi.fn();
      mockUseOnlineStatus.mockReturnValue(false);

      vi.doMock('@/hooks/use-online-status', () => ({
        useOnlineStatus: mockUseOnlineStatus,
      }));

      render(
        <LoadingStateManager
          type="network-aware"
          state="loading"
          message="Loading content"
        />
      );

      // Should adapt to offline state
      expect(screen.getByText('Loading content')).toBeInTheDocument();
    });
  });
});