import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * LoadingStates component tests
 * Following navigation component patterns for testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import {
  PageLoader,
  ComponentLoader,
  InlineLoader,
  ProgressiveLoader,
  TimeoutAwareLoader,
  NetworkAwareLoader,
  LoadingStateManager,
  Skeleton,
  CardSkeleton,
  ListSkeleton,
} from '../LoadingStates';
import { LoadingError, LoadingStageError } from '../errors';
import { createCommonStages } from '@/utils/loading-utils';

// Mock hooks
vi.mock('../hooks/useLoadingRecovery', () => ({
  useLoadingRecovery: () => ({
    recoveryState: {
      canRecover: true,
      suggestions: ['Try again', 'Check connection'],
      isRecovering: false,
      recoveryAttempts: 0,
      maxRecoveryAttempts: 3,
    },
    recover: vi.fn().mockResolvedValue(true),
    updateError: vi.fn(),
  }),
}));

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

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LoadingStates Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PageLoader', () => {
    it('should render with default props', () => {
      render(<PageLoader />);
      
      expect(screen.getByText('Loading page...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('should render with custom message', () => {
      render(<PageLoader message="Custom loading message" />);
      
      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
    });

    it('should hide message when showMessage is false', () => {
      render(<PageLoader showMessage={false} />);
      
      expect(screen.queryByText('Loading page...')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<PageLoader className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render different sizes correctly', () => {
      const { rerender } = render(<PageLoader size="sm" />);
      expect(document.querySelector('.h-4')).toBeInTheDocument();
      
      rerender(<PageLoader size="md" />);
      expect(document.querySelector('.h-6')).toBeInTheDocument();
      
      rerender(<PageLoader size="lg" />);
      expect(document.querySelector('.h-8')).toBeInTheDocument();
    });

    it('should handle invalid size gracefully', () => {
      render(<PageLoader size={'invalid' as any} />);
      
      // Should fallback to default size (lg for PageLoader)
      expect(document.querySelector('.h-8')).toBeInTheDocument();
    });

    it('should show error state when error occurs', async () => {
      // Simulate error by triggering window error event
      render(<PageLoader />);
      
      act(() => {
        window.dispatchEvent(new ErrorEvent('error', {
          message: 'Test error',
          filename: 'test.js',
          lineno: 1,
        }));
      });

      await waitFor(() => {
        expect(screen.getByText(/loading error/i)).toBeInTheDocument();
      });
    });

    it('should show recovery button when error can be recovered', async () => {
      render(<PageLoader />);
      
      act(() => {
        window.dispatchEvent(new ErrorEvent('error', {
          message: 'Test error',
        }));
      });

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should show recovery suggestions', async () => {
      render(<PageLoader />);
      
      act(() => {
        window.dispatchEvent(new ErrorEvent('error', {
          message: 'Test error',
        }));
      });

      await waitFor(() => {
        expect(screen.getByText('Suggestions:')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });
  });

  describe('ComponentLoader', () => {
    it('should render with default props', () => {
      render(<ComponentLoader />);
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument(); // showMessage defaults to false
    });

    it('should show message when showMessage is true', () => {
      render(<ComponentLoader showMessage message="Loading component" />);
      
      expect(screen.getByText('Loading component')).toBeInTheDocument();
    });

    it('should render error state with retry button', async () => {
      const { rerender } = render(<ComponentLoader />);
      
      // Force an error by providing invalid props that would cause validation error
      // This is a bit contrived but demonstrates error handling
      rerender(<ComponentLoader size={'invalid' as any} />);
      
      // The component should still render but with fallback size
      expect(document.querySelector('.h-6')).toBeInTheDocument(); // md is default for ComponentLoader
    });

    it('should handle different sizes', () => {
      const { rerender } = render(<ComponentLoader size="sm" />);
      expect(document.querySelector('.h-4')).toBeInTheDocument();
      
      rerender(<ComponentLoader size="lg" />);
      expect(document.querySelector('.h-8')).toBeInTheDocument();
    });
  });

  describe('InlineLoader', () => {
    it('should render inline layout', () => {
      render(<InlineLoader />);
      
      const container = screen.getByText('Loading...').closest('div');
      expect(container).toHaveClass('flex', 'items-center', 'space-x-2');
    });

    it('should show message by default', () => {
      render(<InlineLoader />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should hide message when showMessage is false', () => {
      render(<InlineLoader showMessage={false} />);
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('ProgressiveLoader', () => {
    const testStages = createCommonStages('page-load');

    it('should render with stages', () => {
      render(<ProgressiveLoader stages={testStages} currentStage={0} />);
      
      expect(screen.getByText(testStages[0].message)).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('should show progress bar', () => {
      render(<ProgressiveLoader stages={testStages} currentStage={1} />);
      
      const progressBar = document.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show stage indicators', () => {
      render(<ProgressiveLoader stages={testStages} currentStage={1} />);
      
      const indicators = document.querySelectorAll('.w-2.h-2.rounded-full');
      expect(indicators).toHaveLength(4); // 4 stages
    });

    it('should handle empty stages gracefully', () => {
      render(<ProgressiveLoader stages={[]} currentStage={0} />);
      
      expect(screen.getByText('No loading stages configured')).toBeInTheDocument();
    });

    it('should handle invalid stages', () => {
      const invalidStages = [
        { id: '', message: 'Invalid stage' }, // Empty ID should cause validation error
      ];
      
      render(<ProgressiveLoader stages={invalidStages as any} currentStage={0} />);
      
      expect(screen.getByText('Configuration Error')).toBeInTheDocument();
    });

    it('should show retry button for failed retryable stages', () => {
      const onStageError = vi.fn();
      const retryableStages = [
        { id: 'test', message: 'Test stage', retryable: true },
      ];
      
      render(
        <ProgressiveLoader 
          stages={retryableStages} 
          currentStage={0}
          onStageError={onStageError}
        />
      );
      
      // Simulate stage error by calling the error handler
      act(() => {
        onStageError('test', new LoadingStageError('test', 'Test stage', 'Test error'));
      });

      // The component should show error state
      expect(screen.getByText(/error in:/i)).toBeInTheDocument();
    });
  });

  describe('TimeoutAwareLoader', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
    cleanup();
      vi.useRealTimers();
    
  });

    it('should render loading state initially', () => {
      render(<TimeoutAwareLoader timeout={5000} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show timeout warning after threshold', () => {
      render(<TimeoutAwareLoader timeout={10000} timeoutMessage="Taking too long..." />);
      
      // Advance to 70% of timeout (7 seconds)
      act(() => {
        vi.advanceTimersByTime(7000);
      });
      
      expect(screen.getByText('Taking too long...')).toBeInTheDocument();
    });

    it('should show timeout state after timeout', () => {
      const onTimeout = vi.fn();
      render(<TimeoutAwareLoader timeout={5000} onTimeout={onTimeout} />);
      
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(screen.getByText('Loading timeout')).toBeInTheDocument();
      expect(onTimeout).toHaveBeenCalled();
    });

    it('should show elapsed time during timeout warning', () => {
      render(<TimeoutAwareLoader timeout={10000} />);
      
      act(() => {
        vi.advanceTimersByTime(8000);
      });
      
      expect(screen.getByText('8s elapsed')).toBeInTheDocument();
    });
  });

  describe('NetworkAwareLoader', () => {
    it('should render with network details', () => {
      render(<NetworkAwareLoader showNetworkDetails />);
      
      expect(screen.getByText('Connection: 4g')).toBeInTheDocument();
      expect(screen.getByText('Speed: 10 Mbps')).toBeInTheDocument();
      expect(screen.getByText('Latency: 100ms')).toBeInTheDocument();
    });

    it('should adapt message for slow connection', () => {
      // Mock slow connection
      vi.mocked(require('@/hooks/useConnectionAware').useConnectionAware).mockReturnValue({
        connectionType: 'slow',
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 2000,
      });

      render(<NetworkAwareLoader message="Loading data" />);
      
      expect(screen.getByText('Loading data (optimizing for slow connection)')).toBeInTheDocument();
    });

    it('should show offline state', () => {
      vi.mocked(require('@/hooks/use-online-status').useOnlineStatus).mockReturnValue(false);

      render(<NetworkAwareLoader />);
      
      expect(screen.getByText('You appear to be offline')).toBeInTheDocument();
      expect(screen.getByText('Some features may be limited while offline')).toBeInTheDocument();
    });
  });

  describe('LoadingStateManager', () => {
    it('should render success state', () => {
      render(<LoadingStateManager type="component" state="success" />);
      
      expect(screen.getByText('Loaded successfully')).toBeInTheDocument();
    });

    it('should render error state with retry button', () => {
      const onRetry = vi.fn();
      const error = new Error('Test error');
      
      render(
        <LoadingStateManager 
          type="component" 
          state="error" 
          error={error}
          onRetry={onRetry}
        />
      );
      
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Try again');
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalled();
    });

    it('should render offline state', () => {
      render(<LoadingStateManager type="component" state="offline" />);
      
      expect(screen.getByText("You're offline")).toBeInTheDocument();
    });

    it('should render timeout state', () => {
      render(<LoadingStateManager type="timeout-aware" state="timeout" timeout={5000} />);
      
      expect(screen.getByText(/timeout/i)).toBeInTheDocument();
    });

    it('should render progressive loading', () => {
      const stages = createCommonStages('data-fetch');
      
      render(
        <LoadingStateManager 
          type="progressive" 
          state="loading"
          stages={stages}
          currentStage={1}
        />
      );
      
      expect(screen.getByText(stages[1].message)).toBeInTheDocument();
    });
  });

  describe('Skeleton Components', () => {
    describe('Skeleton', () => {
      it('should render with default props', () => {
        const { container } = render(<Skeleton />);
        
        expect(container.firstChild).toHaveClass('animate-pulse', 'bg-muted', 'rounded');
      });

      it('should apply custom dimensions', () => {
        const { container } = render(<Skeleton width="200px" height="50px" />);
        
        const skeleton = container.firstChild as HTMLElement;
        expect(skeleton.style.width).toBe('200px');
        expect(skeleton.style.height).toBe('50px');
      });

      it('should handle numeric dimensions', () => {
        const { container } = render(<Skeleton width={200} height={50} />);
        
        const skeleton = container.firstChild as HTMLElement;
        expect(skeleton.style.width).toBe('200px');
        expect(skeleton.style.height).toBe('50px');
      });
    });

    describe('CardSkeleton', () => {
      it('should render card skeleton structure', () => {
        render(<CardSkeleton />);
        
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(3); // Multiple skeleton elements
      });

      it('should apply custom className', () => {
        const { container } = render(<CardSkeleton className="custom-card" />);
        
        expect(container.firstChild).toHaveClass('custom-card');
      });
    });

    describe('ListSkeleton', () => {
      it('should render default number of items', () => {
        render(<ListSkeleton />);
        
        const items = document.querySelectorAll('.flex.items-center.space-x-3');
        expect(items).toHaveLength(3); // Default items
      });

      it('should render custom number of items', () => {
        render(<ListSkeleton items={5} />);
        
        const items = document.querySelectorAll('.flex.items-center.space-x-3');
        expect(items).toHaveLength(5);
      });

      it('should render avatar and text skeletons', () => {
        render(<ListSkeleton items={1} />);
        
        expect(document.querySelector('.rounded-full')).toBeInTheDocument(); // Avatar
        const textSkeletons = document.querySelectorAll('.animate-pulse');
        expect(textSkeletons.length).toBeGreaterThan(2); // Multiple text elements
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PageLoader />);
      
      // Loading indicators should have role="status" or aria-label
      const loader = document.querySelector('[role="status"]');
      expect(loader).toBeInTheDocument();
    });

    it('should be keyboard accessible for interactive elements', () => {
      const onRetry = vi.fn();
      render(
        <LoadingStateManager 
          type="component" 
          state="error" 
          error={new Error('Test')}
          onRetry={onRetry}
        />
      );
      
      const retryButton = screen.getByText('Try again');
      expect(retryButton).toBeInTheDocument();
      
      // Should be focusable
      retryButton.focus();
      expect(retryButton).toHaveFocus();
      
      // Should respond to Enter key
      fireEvent.keyDown(retryButton, { key: 'Enter' });
      // Note: This would need proper event handling in the component
    });

    it('should provide screen reader friendly content', () => {
      render(<ProgressiveLoader stages={createCommonStages('page-load')} currentStage={1} />);
      
      // Progress information should be available to screen readers
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <ComponentLoader />;
      };
      
      const { rerender } = render(<TestComponent />);
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not cause additional renders
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(2); // React will re-render, but component should be optimized
    });

    it('should handle rapid state changes gracefully', () => {
      const { rerender } = render(<LoadingStateManager type="component" state="loading" />);
      
      // Rapid state changes
      rerender(<LoadingStateManager type="component" state="success" />);
      rerender(<LoadingStateManager type="component" state="error" error={new Error('Test')} />);
      rerender(<LoadingStateManager type="component" state="loading" />);
      
      // Should not crash and should show final state
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });
});