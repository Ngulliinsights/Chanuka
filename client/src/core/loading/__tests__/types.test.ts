/**
 * Loading Types Tests
 * Tests for type definitions and interfaces
 */

import { describe, it, expect } from 'vitest';
import {
  LoadingType,
  LoadingPriority,
  LoadingState,
  ConnectionType,
  RetryStrategy,
  LoadingOperation,
  LoadingStateData,
  LoadingOptions,
  ProgressiveStage,
  LoadingScenario,
  LoadingResult,
  ProgressiveLoadingResult,
  TimeoutAwareLoadingResult,
  LoadingContextValue,
  LoadingError,
  LoadingTimeoutError,
  LoadingRetryError,
  LoadingConnectionError,
  LoadingHookOptions,
  LoadingComponentProps,
} from '@client/types';

describe('Loading Types', () => {
  describe('Type Definitions', () => {
    it('should define LoadingType correctly', () => {
      const loadingTypes: LoadingType[] = [
        'page', 'component', 'api', 'asset', 'progressive',
        'form', 'navigation'
      ];
      expect(loadingTypes).toHaveLength(7);
    });

    it('should define LoadingPriority correctly', () => {
      const priorities: LoadingPriority[] = ['high', 'medium', 'low'];
      expect(priorities).toHaveLength(3);
    });

    it('should define LoadingState correctly', () => {
      const states: LoadingState[] = [
        'idle', 'loading', 'success', 'error', 'timeout', 'cancelled'
      ];
      expect(states).toHaveLength(6);
    });

    it('should define ConnectionType correctly', () => {
      const connectionTypes: ConnectionType[] = [
        'fast', 'slow', 'offline', 'unknown'
      ];
      expect(connectionTypes).toHaveLength(4);
    });

    it('should define RetryStrategy correctly', () => {
      const strategies: RetryStrategy[] = ['exponential', 'linear', 'none'];
      expect(strategies).toHaveLength(3);
    });
  });

  describe('Interface Validation', () => {
    it('should validate LoadingOperation interface', () => {
      const operation: LoadingOperation = {
        id: 'test-operation',
        type: 'api',
        message: 'Loading data...',
        priority: 'medium',
        timeout: 30000,
        retryCount: 0,
        maxRetries: 3,
        startTime: Date.now(),
        connectionAware: true,
        retryStrategy: 'exponential',
        retryDelay: 1000,
      };

      expect(operation.id).toBe('test-operation');
      expect(operation.type).toBe('api');
      expect(operation.priority).toBe('medium');
    });

    it('should validate LoadingOptions interface', () => {
      const options: LoadingOptions = {
        timeout: 5000,
        retryLimit: 2,
        retryDelay: 1000,
        retryStrategy: 'linear',
        connectionAware: true,
        showTimeoutWarning: true,
        timeoutWarningThreshold: 0.8,
        priority: 'high',
        type: 'api',
        message: 'Custom message',
      };

      expect(options.timeout).toBe(5000);
      expect(options.retryLimit).toBe(2);
      expect(options.priority).toBe('high');
    });

    it('should validate ProgressiveStage interface', () => {
      const stage: ProgressiveStage = {
        id: 'stage-1',
        message: 'Processing...',
        duration: 2000,
        progress: 50,
        retryable: true,
      };

      expect(stage.id).toBe('stage-1');
      expect(stage.message).toBe('Processing...');
      expect(stage.duration).toBe(2000);
    });

    it('should validate LoadingScenario interface', () => {
      const scenario: LoadingScenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'A test loading scenario',
        defaultTimeout: 10000,
        retryStrategy: 'exponential',
        maxRetries: 3,
        priority: 'high',
        connectionAware: true,
        progressTracking: true,
        stages: [
          { id: 'step1', message: 'Step 1', duration: 1000 },
          { id: 'step2', message: 'Step 2', duration: 2000 },
        ],
      };

      expect(scenario.id).toBe('test-scenario');
      expect(scenario.stages).toHaveLength(2);
    });
  });

  describe('Result Interfaces', () => {
    it('should validate LoadingResult interface', () => {
      const result: LoadingResult = {
        data: { test: 'data' },
        error: null,
        isLoading: false,
        isTimeout: false,
        isCancelled: false,
        retryCount: 0,
        timeElapsed: 1500,
        estimatedTimeRemaining: null,
        progress: null,
        execute: async () => null,
        retry: async () => null,
        cancel: () => {},
        reset: () => {},
      };

      expect(result.data).toEqual({ test: 'data' });
      expect(result.isLoading).toBe(false);
      expect(typeof result.execute).toBe('function');
    });

    it('should validate ProgressiveLoadingResult interface', () => {
      const result: ProgressiveLoadingResult = {
        currentStage: { id: 'stage1', message: 'Stage 1' },
        currentStageIndex: 0,
        progress: 25,
        stageProgress: 50,
        state: 'loading',
        error: null,
        completedStages: [],
        failedStages: [],
        skippedStages: [],
        canGoNext: true,
        canGoPrevious: false,
        canRetry: false,
        canSkip: true,
        isComplete: false,
        isFirstStage: true,
        isLastStage: false,
        start: () => {},
        nextStage: () => {},
        previousStage: () => {},
        goToStage: () => {},
        setStageProgress: () => {},
        completeCurrentStage: () => {},
        failCurrentStage: () => {},
        skipCurrentStage: () => {},
        retryCurrentStage: () => {},
        reset: () => {},
      };

      expect(result.currentStageIndex).toBe(0);
      expect(result.progress).toBe(25);
      expect(result.canGoNext).toBe(true);
    });

    it('should validate TimeoutAwareLoadingResult interface', () => {
      const result: TimeoutAwareLoadingResult = {
        state: 'loading',
        isLoading: true,
        isTimeout: false,
        isWarning: false,
        error: null,
        elapsedTime: 1000,
        remainingTime: 4000,
        timeoutDuration: 5000,
        warningThreshold: 4000,
        elapsedTimeFormatted: '1s',
        remainingTimeFormatted: '4s',
        retryCount: 0,
        maxRetries: 3,
        canRetry: true,
        start: () => {},
        stop: () => {},
        reset: () => {},
        retry: () => {},
        extendTimeout: () => {},
        withTimeout: async <T>() => null as T,
      };

      expect(result.isLoading).toBe(true);
      expect(result.elapsedTime).toBe(1000);
      expect(result.canRetry).toBe(true);
    });
  });

  describe('Error Classes', () => {
    it('should create LoadingError correctly', () => {
      const error = new LoadingError('test-op', 'Test error', 'TEST_ERROR', { extra: 'data' });

      expect(error.operationId).toBe('test-op');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.metadata).toEqual({ extra: 'data' });
    });

    it('should create LoadingTimeoutError correctly', () => {
      const error = new LoadingTimeoutError('test-op', 5000, { url: '/api/test' });

      expect(error.operationId).toBe('test-op');
      expect(error.timeout).toBe(5000);
      expect(error.code).toBe('TIMEOUT');
    });

    it('should create LoadingRetryError correctly', () => {
      const error = new LoadingRetryError('test-op', 2, 3, { attempts: [100, 200, 300] });

      expect(error.operationId).toBe('test-op');
      expect(error.retryCount).toBe(2);
      expect(error.maxRetries).toBe(3);
      expect(error.code).toBe('MAX_RETRIES');
    });

    it('should create LoadingConnectionError correctly', () => {
      const error = new LoadingConnectionError('test-op', 'offline', { lastAttempt: Date.now() });

      expect(error.operationId).toBe('test-op');
      expect(error.connectionType).toBe('offline');
      expect(error.code).toBe('CONNECTION');
    });
  });

  describe('Hook Options', () => {
    it('should validate LoadingHookOptions interface', () => {
      const options: LoadingHookOptions = {
        timeout: 10000,
        retryLimit: 2,
        retryDelay: 500,
        retryStrategy: 'linear',
        connectionAware: true,
        showTimeoutWarning: true,
        timeoutWarningThreshold: 0.7,
        priority: 'high',
        type: 'api',
        message: 'Loading data...',
        onError: (error) => console.error(error),
        onSuccess: () => console.log('Success'),
        onStateChange: (state) => console.log('State:', state),
      };

      expect(options.timeout).toBe(10000);
      expect(options.onError).toBeDefined();
      expect(options.onSuccess).toBeDefined();
    });
  });

  describe('Component Props', () => {
    it('should validate LoadingComponentProps interface', () => {
      const props: LoadingComponentProps = {
        size: 'lg',
        message: 'Loading...',
        showMessage: true,
        className: 'custom-loading',
        'aria-label': 'Loading content',
      };

      expect(props.size).toBe('lg');
      expect(props.message).toBe('Loading...');
      expect(props['aria-label']).toBe('Loading content');
    });
  });
});