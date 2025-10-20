/**
 * Loading hooks tests
 * Following navigation component patterns for testing
 */

import { renderHook, act } from '@testing-library/react';
import { useLoading, useLoadingState, useProgressiveLoading } from '../hooks';
import { LoadingError } from '../errors';
import { createCommonStages } from '../utils/loading-utils';

// Mock timers for testing
jest.useFakeTimers();

describe('Loading Hooks', () => {
  describe('useLoading', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useLoading());
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.stats.loaded).toBe(0);
      expect(result.current.stats.failed).toBe(0);
    });

    it('should start and complete operations', () => {
      const { result } = renderHook(() => useLoading());
      
      let operationId: string;
      
      act(() => {
        operationId = result.current.actions.start({
          type: 'component',
          message: 'Loading test',
        });
      });
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.progress?.total).toBe(1);
      expect(result.current.progress?.loaded).toBe(0);
      
      act(() => {
        result.current.actions.complete(operationId);
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats.loaded).toBe(0); // Operation is removed when completed
    });

    it('should handle operation failures', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useLoading({ onError }));
      
      let operationId: string;
      
      act(() => {
        operationId = result.current.actions.start({
          type: 'component',
          message: 'Loading test',
        });
      });
      
      const testError = new Error('Test error');
      
      act(() => {
        result.current.actions.fail(operationId, testError);
      });
      
      expect(result.current.error).toBeTruthy();
      expect(result.current.stats.failed).toBe(1);
      expect(onError).toHaveBeenCalled();
    });

    it('should reset all operations', () => {
      const { result } = renderHook(() => useLoading());
      
      act(() => {
        result.current.actions.start({
          type: 'component',
          message: 'Loading test 1',
        });
        result.current.actions.start({
          type: 'page',
          message: 'Loading test 2',
        });
      });
      
      expect(result.current.isLoading).toBe(true);
      
      act(() => {
        result.current.actions.reset();
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats.loaded).toBe(0);
      expect(result.current.stats.failed).toBe(0);
    });
  });

  describe('useLoadingState', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useLoadingState());
      
      expect(result.current.state).toBe('loading');
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should transition between states', () => {
      const { result } = renderHook(() => useLoadingState());
      
      act(() => {
        result.current.setSuccess();
      });
      
      expect(result.current.state).toBe('success');
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isLoading).toBe(false);
      
      act(() => {
        result.current.setError('Test error');
      });
      
      expect(result.current.state).toBe('error');
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Test error');
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.state).toBe('loading');
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should auto-reset after success when configured', () => {
      const { result } = renderHook(() => 
        useLoadingState({ autoReset: true, autoResetDelay: 1000 })
      );
      
      act(() => {
        result.current.setSuccess();
      });
      
      expect(result.current.isSuccess).toBe(true);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(result.current.state).toBe('loading');
    });

    it('should wrap async functions with loading state', async () => {
      const { result } = renderHook(() => useLoadingState());
      
      const asyncFn = jest.fn().mockResolvedValue('success');
      
      await act(async () => {
        const returnValue = await result.current.withLoading(asyncFn);
        expect(returnValue).toBe('success');
      });
      
      expect(result.current.isSuccess).toBe(true);
      expect(asyncFn).toHaveBeenCalled();
    });

    it('should handle async function errors', async () => {
      const { result } = renderHook(() => useLoadingState());
      
      const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
      
      await act(async () => {
        try {
          await result.current.withLoading(asyncFn);
        } catch (error) {
          expect(error.message).toBe('Async error');
        }
      });
      
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Async error');
    });
  });

  describe('useProgressiveLoading', () => {
    const testStages = createCommonStages('page-load');

    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => 
        useProgressiveLoading({ stages: testStages })
      );
      
      expect(result.current.currentStageIndex).toBe(-1);
      expect(result.current.currentStage).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.state).toBe('loading');
      expect(result.current.isComplete).toBe(false);
    });

    it('should start and progress through stages', () => {
      const onStageComplete = jest.fn();
      const { result } = renderHook(() => 
        useProgressiveLoading({ 
          stages: testStages,
          onStageComplete,
        })
      );
      
      act(() => {
        result.current.start();
      });
      
      expect(result.current.currentStageIndex).toBe(0);
      expect(result.current.currentStage?.id).toBe(testStages[0].id);
      expect(result.current.isFirstStage).toBe(true);
      expect(result.current.canGoNext).toBe(true);
      
      act(() => {
        result.current.completeCurrentStage();
      });
      
      expect(result.current.currentStageIndex).toBe(1);
      expect(result.current.completedStages).toContain(testStages[0].id);
      expect(onStageComplete).toHaveBeenCalledWith(testStages[0].id, 0);
    });

    it('should handle stage failures', () => {
      const onStageError = jest.fn();
      const { result } = renderHook(() => 
        useProgressiveLoading({ 
          stages: testStages,
          onStageError,
        })
      );
      
      act(() => {
        result.current.start();
      });
      
      const testError = new Error('Stage failed');
      
      act(() => {
        result.current.failCurrentStage(testError);
      });
      
      expect(result.current.state).toBe('error');
      expect(result.current.error).toBeTruthy();
      expect(result.current.failedStages).toContain(testStages[0].id);
      expect(onStageError).toHaveBeenCalled();
    });

    it('should allow skipping stages', () => {
      const { result } = renderHook(() => 
        useProgressiveLoading({ stages: testStages })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        result.current.skipCurrentStage('Testing skip');
      });
      
      expect(result.current.currentStageIndex).toBe(1);
      expect(result.current.skippedStages).toContain(testStages[0].id);
    });

    it('should complete when all stages are done', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() => 
        useProgressiveLoading({ 
          stages: testStages,
          onComplete,
        })
      );
      
      act(() => {
        result.current.start();
      });
      
      // Complete all stages
      testStages.forEach(() => {
        act(() => {
          result.current.completeCurrentStage();
        });
      });
      
      expect(result.current.isComplete).toBe(true);
      expect(result.current.state).toBe('success');
      expect(onComplete).toHaveBeenCalled();
    });

    it('should update progress correctly', () => {
      const { result } = renderHook(() => 
        useProgressiveLoading({ stages: testStages })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        result.current.setStageProgress(50);
      });
      
      expect(result.current.stageProgress).toBe(50);
      expect(result.current.progress).toBeGreaterThan(0);
      expect(result.current.progress).toBeLessThan(25); // First stage is 25% of total
    });

    it('should allow navigation between stages', () => {
      const { result } = renderHook(() => 
        useProgressiveLoading({ stages: testStages })
      );
      
      act(() => {
        result.current.start();
        result.current.nextStage();
      });
      
      expect(result.current.currentStageIndex).toBe(1);
      expect(result.current.canGoPrevious).toBe(true);
      
      act(() => {
        result.current.previousStage();
      });
      
      expect(result.current.currentStageIndex).toBe(0);
      
      act(() => {
        result.current.goToStage(2);
      });
      
      expect(result.current.currentStageIndex).toBe(2);
    });

    it('should retry failed stages', () => {
      const { result } = renderHook(() => 
        useProgressiveLoading({ stages: testStages, retryable: true })
      );
      
      act(() => {
        result.current.start();
        result.current.failCurrentStage('Test failure');
      });
      
      expect(result.current.state).toBe('error');
      expect(result.current.canRetry).toBe(true);
      
      act(() => {
        result.current.retryCurrentStage();
      });
      
      expect(result.current.state).toBe('loading');
      expect(result.current.error).toBeNull();
      expect(result.current.failedStages).not.toContain(testStages[0].id);
    });
  });
});

afterEach(() => {
  jest.clearAllTimers();
});