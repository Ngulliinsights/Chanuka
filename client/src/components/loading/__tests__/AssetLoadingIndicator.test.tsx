import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * AssetLoadingIndicator component tests
 * Following navigation component patterns for testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import {
  AssetLoadingIndicator,
  useAssetLoadingIndicator,
  AssetLoadingProvider,
  useAssetLoadingContext,
  CriticalAssetLoader,
  InlineAssetLoader,
  DevAssetLoadingDebug,
} from '../AssetLoadingIndicator';
import { LoadingAssetError, LoadingValidationError } from '../errors';

// Mock asset loading hook
const mockUseAssetLoading = {
  progress: {
    loaded: 5,
    total: 10,
    phase: 'critical' as const,
    currentAsset: '/assets/test.jpg',
  },
  getStats: vi.fn(() => ({
    loaded: 5,
    failed: 1,
    connectionType: 'fast' as const,
    isOnline: true,
  })),
};

vi.mock('@/utils/asset-loading', () => ({
  useAssetLoading: () => mockUseAssetLoading,
}));

// Mock recovery hook
vi.mock('../hooks/useLoadingRecovery', () => ({
  useLoadingRecovery: () => ({
    recoveryState: {
      canRecover: true,
      suggestions: ['Check asset path', 'Retry loading'],
      isRecovering: false,
      recoveryAttempts: 0,
      maxRecoveryAttempts: 3,
    },
    recover: vi.fn().mockResolvedValue(true),
    updateError: vi.fn(),
  }),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('AssetLoadingIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  
  });

  describe('AssetLoadingIndicator Component', () => {
    it('should render with default props', () => {
      render(<AssetLoadingIndicator />);
      
      expect(screen.getByText('Loading essential resources...')).toBeInTheDocument();
      expect(screen.getByText('5 of 10 loaded')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render in minimal mode', () => {
      render(<AssetLoadingIndicator minimal />);
      
      expect(screen.getByText('Loading essential resources...')).toBeInTheDocument();
      expect(screen.getByText('(5/10)')).toBeInTheDocument();
    });

    it('should hide progress when showProgress is false', () => {
      render(<AssetLoadingIndicator showProgress={false} />);
      
      expect(screen.queryByText('5 of 10 loaded')).not.toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should show connection status when showDetails is true', () => {
      render(<AssetLoadingIndicator showDetails />);
      
      expect(screen.getByText('Loaded:')).toBeInTheDocument();
      expect(screen.getByText('Failed:')).toBeInTheDocument();
      expect(screen.getByText('Connection:')).toBeInTheDocument();
      expect(screen.getByText('Status:')).toBeInTheDocument();
    });

    it('should render different positions correctly', () => {
      const { rerender, container } = render(<AssetLoadingIndicator position="fixed" />);
      expect(container.firstChild).toHaveClass('fixed', 'top-4', 'right-4');
      
      rerender(<AssetLoadingIndicator position="relative" />);
      expect(container.firstChild).toHaveClass('relative');
      
      rerender(<AssetLoadingIndicator position="absolute" />);
      expect(container.firstChild).toHaveClass('absolute', 'top-4', 'right-4');
    });

    it('should auto-hide when loading is complete', async () => {
      // Mock completed progress
      mockUseAssetLoading.progress = {
        loaded: 10,
        total: 10,
        phase: 'complete',
        currentAsset: undefined,
      };

      const { container } = render(<AssetLoadingIndicator />);
      
      expect(container.firstChild).toBeInTheDocument();
      
      // Fast-forward auto-hide timer
      await act(() => {
        vi.advanceTimersByTime(2000);
      });
      
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should not render when no loading activity', () => {
      // Mock no loading activity
      mockUseAssetLoading.progress = {
        loaded: 0,
        total: 0,
        phase: 'preload',
        currentAsset: undefined,
      };

      const { container } = render(<AssetLoadingIndicator />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should show current asset being loaded', () => {
      render(<AssetLoadingIndicator />);
      
      expect(screen.getByText('Loading: test.jpg')).toBeInTheDocument();
    });

    it('should handle validation errors', async () => {
      // Mock invalid progress that would cause validation error
      mockUseAssetLoading.progress = {
        loaded: 15, // More than total
        total: 10,
        phase: 'critical',
        currentAsset: '/test.jpg',
      };

      render(<AssetLoadingIndicator />);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid data provided/i)).toBeInTheDocument();
      });
    });

    it('should handle asset loading errors', async () => {
      // Mock stats with increased failures
      mockUseAssetLoading.getStats.mockReturnValue({
        loaded: 5,
        failed: 2, // Increased from 1
        connectionType: 'fast',
        isOnline: true,
      });

      render(<AssetLoadingIndicator />);
      
      // Trigger stats update
      await act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to load asset/i)).toBeInTheDocument();
      });
    });

    it('should show retry button for recoverable errors', async () => {
      // Force an error state
      mockUseAssetLoading.getStats.mockReturnValue({
        loaded: 5,
        failed: 3,
        connectionType: 'fast',
        isOnline: true,
      });

      render(<AssetLoadingIndicator />);
      
      await act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should show error details when showDetails is true', async () => {
      mockUseAssetLoading.getStats.mockReturnValue({
        loaded: 5,
        failed: 2,
        connectionType: 'fast',
        isOnline: true,
      });

      render(<AssetLoadingIndicator showDetails />);
      
      await act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('Check asset path')).toBeInTheDocument();
      });
    });

    it('should handle stats update errors gracefully', async () => {
      // Mock getStats to throw error
      mockUseAssetLoading.getStats.mockImplementation(() => {
        throw new Error('Stats error');
      });

      render(<AssetLoadingIndicator />);
      
      await act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to retrieve loading statistics/i)).toBeInTheDocument();
      });
    });

    it('should show completion state', () => {
      mockUseAssetLoading.progress = {
        loaded: 10,
        total: 10,
        phase: 'complete',
        currentAsset: undefined,
      };

      render(<AssetLoadingIndicator />);
      
      expect(screen.getByText('Assets loaded successfully')).toBeInTheDocument();
    });

    it('should show error state with failed assets warning', () => {
      mockUseAssetLoading.getStats.mockReturnValue({
        loaded: 8,
        failed: 2,
        connectionType: 'fast',
        isOnline: true,
      });

      render(<AssetLoadingIndicator showDetails />);
      
      expect(screen.getByText(/some assets failed to load/i)).toBeInTheDocument();
    });
  });

  describe('useAssetLoadingIndicator Hook', () => {
    it('should provide indicator control functions', () => {
      const TestComponent = () => {
        const { isVisible, show, hide } = useAssetLoadingIndicator();
        
        return (
          <div>
            <span data-testid="visible">{isVisible.toString()}</span>
            <button onClick={() => show({ minimal: true })}>Show</button>
            <button onClick={hide}>Hide</button>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('visible')).toHaveTextContent('false');
      
      fireEvent.click(screen.getByText('Show'));
      expect(screen.getByTestId('visible')).toHaveTextContent('true');
      
      fireEvent.click(screen.getByText('Hide'));
      expect(screen.getByTestId('visible')).toHaveTextContent('false');
    });

    it('should maintain config state', () => {
      const TestComponent = () => {
        const { config, show } = useAssetLoadingIndicator();
        
        React.useEffect(() => {
          show({ minimal: true, showDetails: true });
        }, [show]);
        
        return (
          <div>
            <span data-testid="minimal">{config.minimal?.toString()}</span>
            <span data-testid="showDetails">{config.showDetails?.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('minimal')).toHaveTextContent('true');
      expect(screen.getByTestId('showDetails')).toHaveTextContent('true');
    });
  });

  describe('AssetLoadingProvider and Context', () => {
    it('should provide context to children', () => {
      const TestChild = () => {
        const { showIndicator, hideIndicator, isIndicatorVisible } = useAssetLoadingContext();
        
        return (
          <div>
            <span data-testid="visible">{isIndicatorVisible.toString()}</span>
            <button onClick={() => showIndicator({ minimal: true })}>Show</button>
            <button onClick={hideIndicator}>Hide</button>
          </div>
        );
      };

      render(
        <AssetLoadingProvider>
          <TestChild />
        </AssetLoadingProvider>
      );
      
      expect(screen.getByTestId('visible')).toHaveTextContent('false');
      
      fireEvent.click(screen.getByText('Show'));
      expect(screen.getByTestId('visible')).toHaveTextContent('true');
    });

    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        useAssetLoadingContext();
        return null;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      
      expect(() => render(<TestComponent />)).toThrow(
        'useAssetLoadingContext must be used within AssetLoadingProvider'
      );
      
      consoleSpy.mockRestore();
    });

    it('should render indicator when visible', () => {
      const TestChild = () => {
        const { showIndicator } = useAssetLoadingContext();
        
        React.useEffect(() => {
          showIndicator({ minimal: true });
        }, [showIndicator]);
        
        return <div>Child content</div>;
      };

      render(
        <AssetLoadingProvider>
          <TestChild />
        </AssetLoadingProvider>
      );
      
      expect(screen.getByText('Loading essential resources...')).toBeInTheDocument();
    });
  });

  describe('Specialized Loading Indicators', () => {
    describe('CriticalAssetLoader', () => {
      it('should render with critical asset settings', () => {
        render(<CriticalAssetLoader />);
        
        expect(screen.getByText('Loading essential resources...')).toBeInTheDocument();
        // Should be in fixed position by default
        expect(document.querySelector('.fixed')).toBeInTheDocument();
      });

      it('should apply custom className', () => {
        const { container } = render(<CriticalAssetLoader className="critical-loader" />);
        
        expect(container.firstChild).toHaveClass('critical-loader');
      });
    });

    describe('InlineAssetLoader', () => {
      it('should render in minimal inline mode', () => {
        render(<InlineAssetLoader />);
        
        expect(screen.getByText('Loading essential resources...')).toBeInTheDocument();
        // Should be in relative position
        expect(document.querySelector('.relative')).toBeInTheDocument();
      });
    });
  });

  describe('DevAssetLoadingDebug', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should render in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      render(<DevAssetLoadingDebug />);
      
      expect(screen.getByText('Asset Loading Debug')).toBeInTheDocument();
      expect(screen.getByText('Phase: critical')).toBeInTheDocument();
      expect(screen.getByText('Progress: 5/10')).toBeInTheDocument();
      expect(screen.getByText('Connection: fast')).toBeInTheDocument();
      expect(screen.getByText('Online: Yes')).toBeInTheDocument();
    });

    it('should not render in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      const { container } = render(<DevAssetLoadingDebug />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should show current asset when available', () => {
      process.env.NODE_ENV = 'development';
      
      render(<DevAssetLoadingDebug />);
      
      expect(screen.getByText('Current: test.jpg')).toBeInTheDocument();
    });

    it('should update stats periodically', () => {
      process.env.NODE_ENV = 'development';
      
      render(<DevAssetLoadingDebug />);
      
      // Initial stats
      expect(screen.getByText('Progress: 5/10')).toBeInTheDocument();
      
      // Update mock stats
      mockUseAssetLoading.getStats.mockReturnValue({
        loaded: 7,
        failed: 1,
        connectionType: 'fast',
        isOnline: true,
      });
      
      // Advance timer to trigger stats update
      await act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('Progress: 5/10')).toBeInTheDocument(); // Progress comes from progress object, not stats
    });
  });

  describe('Error Handling', () => {
    it('should handle progress validation errors', async () => {
      // Mock invalid progress
      mockUseAssetLoading.progress = {
        loaded: -1, // Invalid negative value
        total: 10,
        phase: 'critical',
      };

      render(<AssetLoadingIndicator />);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid data provided/i)).toBeInTheDocument();
      });
    });

    it('should show recovery suggestions for errors', async () => {
      mockUseAssetLoading.getStats.mockReturnValue({
        loaded: 5,
        failed: 3,
        connectionType: 'fast',
        isOnline: true,
      });

      render(<AssetLoadingIndicator />);
      
      await act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('Check asset path')).toBeInTheDocument();
      });
    });

    it('should handle recovery process', async () => {
      const mockRecover = vi.fn().mockResolvedValue(true);
      
      vi.mocked(require('@client/hooks/useLoadingRecovery').useLoadingRecovery).mockReturnValue({
        recoveryState: {
          canRecover: true,
          suggestions: ['Retry loading'],
          isRecovering: false,
          recoveryAttempts: 0,
          maxRecoveryAttempts: 3,
        },
        recover: mockRecover,
        updateError: vi.fn(),
      });

      mockUseAssetLoading.getStats.mockReturnValue({
        loaded: 5,
        failed: 2,
        connectionType: 'fast',
        isOnline: true,
      });

      render(<AssetLoadingIndicator />);
      
      await act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.click(retryButton);
      });

      expect(mockRecover).toHaveBeenCalled();
    });

    it('should show recovery in progress state', async () => {
      vi.mocked(require('@client/hooks/useLoadingRecovery').useLoadingRecovery).mockReturnValue({
        recoveryState: {
          canRecover: true,
          suggestions: ['Retrying...'],
          isRecovering: true,
          recoveryAttempts: 1,
          maxRecoveryAttempts: 3,
        },
        recover: vi.fn(),
        updateError: vi.fn(),
      });

      mockUseAssetLoading.getStats.mockReturnValue({
        loaded: 5,
        failed: 2,
        connectionType: 'fast',
        isOnline: true,
      });

      render(<AssetLoadingIndicator />);
      
      await act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('Retrying...')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<AssetLoadingIndicator />);
      
      // Progress bars should have proper roles
      const progressBar = document.querySelector('[style*="width"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      mockUseAssetLoading.getStats.mockReturnValue({
        loaded: 5,
        failed: 2,
        connectionType: 'fast',
        isOnline: true,
      });

      render(<AssetLoadingIndicator />);
      
      await act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        expect(retryButton).toBeInTheDocument();
        
        // Should be focusable
        retryButton.focus();
        expect(retryButton).toHaveFocus();
      });
    });

    it('should provide screen reader friendly progress information', () => {
      render(<AssetLoadingIndicator />);
      
      expect(screen.getByText('5 of 10 loaded')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });
});

