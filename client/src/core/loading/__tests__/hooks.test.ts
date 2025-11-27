/**
 * Loading Hooks Tests
 * Tests for loading hooks functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { LoadingProvider } from '@client/context';
import { useLoadingOperation } from '@client/hooks';
import { useProgressiveLoading } from '@client/hooks';
import { useTimeoutAwareLoading } from '@client/hooks';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LoadingProvider>{children}</LoadingProvider>
);

describe('Loading Hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('useLoadingOperation', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useLoadingOperation('test-operation'), { wrapper });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isTimeout).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });

    it('should handle successful operation', async () => {
      const { result } = renderHook(() => useLoadingOperation('test-operation'), { wrapper });

      const mockData = { id: 1, name: 'Test' };
      const mockOperation = vi.fn().mockResolvedValue(mockData);

      let executeResult: any = null;

      act(() => {
        result.current.execute(mockOperation).then(result => {
          executeResult = result;
        });
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(executeResult).toEqual(mockData);
    });

    it('should handle operation error', async () => {
      const { result } = renderHook(() => useLoadingOperation('test-operation'), { wrapper });

      const mockError = new Error('Test error');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      act(() => {
        result.current.execute(mockOperation);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(mockError);
    });

    it('should handle retry functionality', async () => {
      const { result } = renderHook(() => useLoadingOperation('test-operation'), { wrapper });

      const mockError = new Error('Test error');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ success: true });

      // First attempt (should fail)
      act(() => {
        result.current.execute(mockOperation);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.retryCount).toBe(0);

      // Retry (should succeed)
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({ success: true });
      expect(result.current.error).toBeNull();
      expect(result.current.retryCount).toBe(1);
    });

    it('should handle cancel operation', async () => {
      const { result } = renderHook(() => useLoadingOperation('test-operation'), { wrapper });

      const mockOperation = vi.fn().mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve('data'), 1000);
      }));

      act(() => {
        result.current.execute(mockOperation);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it('should handle reset functionality', () => {
      const { result } = renderHook(() => useLoadingOperation('test-operation'), { wrapper });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('useProgressiveLoading', () => {
    const mockStages = [
      { id: 'stage1', message: 'Stage 1', duration: 1000 },
      { id: 'stage2', message: 'Stage 2', duration: 1000 },
      { id: 'stage3', message: 'Stage 3', duration: 1000 },
    ];

    it('should initialize with correct state', () => {
      const { result } = renderHook(() => useProgressiveLoading(mockStages), { wrapper });

      expect(result.current.currentStage).toBeNull();
      expect(result.current.currentStageIndex).toBe(-1);
      expect(result.current.progress).toBe(0);
      expect(result.current.state).toBe('idle');
      expect(result.current.stages).toEqual(mockStages);
    });

    it('should start progressive loading', () => {
      const { result } = renderHook(() => useProgressiveLoading(mockStages), { wrapper });

      act(() => {
        result.current.start();
      });

      expect(result.current.currentStageIndex).toBe(0);
      expect(result.current.currentStage?.id).toBe('stage1');
      expect(result.current.state).toBe('loading');
      expect(result.current.isFirstStage).toBe(true);
      expect(result.current.isLastStage).toBe(false);
    });

    it('should advance to next stage', () => {
      const { result } = renderHook(() => useProgressiveLoading(mockStages), { wrapper });

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.nextStage();
      });

      expect(result.current.currentStageIndex).toBe(1);
      expect(result.current.currentStage?.id).toBe('stage2');
      expect(result.current.isFirstStage).toBe(false);
      expect(result.current.isLastStage).toBe(false);
    });

    it('should complete all stages', () => {
      const { result } = renderHook(() => useProgressiveLoading(mockStages), { wrapper });

      act(() => {
        result.current.start();
      });

      // Complete all stages
      act(() => {
        result.current.completeCurrentStage();
        result.current.completeCurrentStage();
        result.current.completeCurrentStage();
      });

      expect(result.current.currentStageIndex).toBe(2);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.state).toBe('success');
    });

    it('should handle stage failure', () => {
      const { result } = renderHook(() => useProgressiveLoading(mockStages), { wrapper });

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.failCurrentStage(new Error('Stage failed'));
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.message).toBe('Stage failed');
      expect(result.current.failedStages).toContain('stage1');
    });

    it('should handle stage skipping', () => {
      const { result } = renderHook(() => useProgressiveLoading(mockStages), { wrapper });

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.skipCurrentStage('Not needed');
      });

      expect(result.current.skippedStages).toContain('stage1');
      expect(result.current.currentStageIndex).toBe(1);
    });

    it('should go to specific stage', () => {
      const { result } = renderHook(() => useProgressiveLoading(mockStages), { wrapper });

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.goToStage(2);
      });

      expect(result.current.currentStageIndex).toBe(2);
      expect(result.current.currentStage?.id).toBe('stage3');
    });

    it('should reset loading state', () => {
      const { result } = renderHook(() => useProgressiveLoading(mockStages), { wrapper });

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.currentStageIndex).toBe(-1);
      expect(result.current.state).toBe('idle');
      expect(result.current.completedStages).toEqual([]);
      expect(result.current.failedStages).toEqual([]);
      expect(result.current.skippedStages).toEqual([]);
    });
  });

  describe('useTimeoutAwareLoading', () => {
    it('should initialize with correct state', () => {
      const { result } = renderHook(() => useTimeoutAwareLoading(), { wrapper });

      expect(result.current.state).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isTimeout).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.canRetry).toBe(true);
    });

    it('should handle successful operation within timeout', async () => {
      const { result } = renderHook(() => useTimeoutAwareLoading({ timeout: 5000 }), { wrapper });

      const mockOperation = vi.fn().mockResolvedValue('success');

      act(() => {
        result.current.start(mockOperation);
      });

      expect(result.current.isLoading).toBe(true);

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.state).toBe('success');
      expect(result.current.elapsedTime).toBeGreaterThan(0);
    });

    it('should handle timeout', async () => {
      const { result } = renderHook(() => useTimeoutAwareLoading({ timeout: 1000 }), { wrapper });

      const mockOperation = vi.fn().mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve('late'), 2000);
      }));

      act(() => {
        result.current.start(mockOperation);
      });

      // Fast-forward past timeout
      vi.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(result.current.isTimeout).toBe(true);
      });

      expect(result.current.state).toBe('timeout');
      expect(result.current.error?.message).toContain('timed out');
    });

    it('should handle retry functionality', async () => {
      const { result } = renderHook(() => useTimeoutAwareLoading({ timeout: 1000 }), { wrapper });

      let callCount = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return new Promise((_, reject) => setTimeout(() => reject(new Error('Fail')), 500));
        }
        return Promise.resolve('success');
      });

      // First attempt (fail)
      act(() => {
        result.current.start(mockOperation);
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
      });

      // Retry (success)
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('success');
      });

      expect(callCount).toBe(2);
    });

    it('should extend timeout', () => {
      const { result } = renderHook(() => useTimeoutAwareLoading({ timeout: 1000 }), { wrapper });

      const mockOperation = vi.fn().mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve('success'), 1500);
      }));

      act(() => {
        result.current.start(mockOperation);
      });

      // Extend timeout before it expires
      vi.advanceTimersByTime(500);
      act(() => {
        result.current.extendTimeout(1000);
      });

      // Should not timeout
      vi.advanceTimersByTime(800);

      expect(result.current.isTimeout).toBe(false);
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useTimeoutAwareLoading(), { wrapper });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });
});