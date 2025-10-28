import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Loading utilities tests
 * Following navigation component patterns for testing
 */

import {
  generateOperationId,
  createLoadingOperation,
  createLoadingStage,
  getDefaultTimeout,
  calculateRetryDelay,
  sortOperationsByPriority,
  hasOperationTimedOut,
  canRetryOperation,
  calculateProgressPercentage,
  createProgress,
} from '@/utils/loading-utils';
import { LoadingOperation, LoadingStage } from '@shared/types';
import { LOADING_TIMEOUTS, RETRY_DELAYS } from '../constants';

describe('Loading Utils', () => {
  describe('generateOperationId', () => {
    it('should generate unique operation IDs', () => {
      const id1 = generateOperationId('component');
      const id2 = generateOperationId('component');
      
      expect(id1).not.toBe(id2);
      expect(id1).toContain('COMPONENT');
      expect(id2).toContain('COMPONENT');
    });

    it('should include custom prefix when provided', () => {
      const id = generateOperationId('page', 'TEST');
      expect(id).toContain('TEST_PAGE');
    });
  });

  describe('createLoadingOperation', () => {
    it('should create operation with defaults', () => {
      const operation = createLoadingOperation('component', 'Loading test');
      
      expect(operation.type).toBe('component');
      expect(operation.message).toBe('Loading test');
      expect(operation.priority).toBe('medium');
      expect(operation.retryCount).toBe(0);
      expect(operation.maxRetries).toBe(3);
      expect(operation.connectionAware).toBe(true);
      expect(operation.startTime).toBeGreaterThan(0);
    });

    it('should override defaults with provided options', () => {
      const operation = createLoadingOperation('page', 'Loading page', {
        priority: 'high',
        maxRetries: 5,
        connectionAware: false,
      });
      
      expect(operation.priority).toBe('high');
      expect(operation.maxRetries).toBe(5);
      expect(operation.connectionAware).toBe(false);
    });
  });

  describe('createLoadingStage', () => {
    it('should create stage with defaults', () => {
      const stage = createLoadingStage('test-stage', 'Testing stage');
      
      expect(stage.id).toBe('test-stage');
      expect(stage.message).toBe('Testing stage');
      expect(stage.retryable).toBe(true);
    });

    it('should override defaults with provided options', () => {
      const stage = createLoadingStage('test-stage', 'Testing stage', {
        duration: 5000,
        retryable: false,
      });
      
      expect(stage.duration).toBe(5000);
      expect(stage.retryable).toBe(false);
    });
  });

  describe('getDefaultTimeout', () => {
    it('should return correct timeout for each loading type', () => {
      expect(getDefaultTimeout('page')).toBe(LOADING_TIMEOUTS.LONG);
      expect(getDefaultTimeout('component')).toBe(LOADING_TIMEOUTS.MEDIUM);
      expect(getDefaultTimeout('inline')).toBe(LOADING_TIMEOUTS.SHORT);
      expect(getDefaultTimeout('progressive')).toBe(LOADING_TIMEOUTS.EXTENDED);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff with jitter', () => {
      const baseDelay = 1000;
      const delay0 = calculateRetryDelay(0, baseDelay);
      const delay1 = calculateRetryDelay(1, baseDelay);
      const delay2 = calculateRetryDelay(2, baseDelay);
      
      expect(delay0).toBeGreaterThanOrEqual(baseDelay);
      expect(delay1).toBeGreaterThanOrEqual(baseDelay * 2);
      expect(delay2).toBeGreaterThanOrEqual(baseDelay * 4);
      
      // Should not exceed maximum
      expect(delay0).toBeLessThanOrEqual(RETRY_DELAYS.LONG * 2);
      expect(delay1).toBeLessThanOrEqual(RETRY_DELAYS.LONG * 2);
      expect(delay2).toBeLessThanOrEqual(RETRY_DELAYS.LONG * 2);
    });
  });

  describe('sortOperationsByPriority', () => {
    it('should sort operations by priority and start time', () => {
      const operations: LoadingOperation[] = [
        createLoadingOperation('component', 'Low priority', { priority: 'low', startTime: 1000 }),
        createLoadingOperation('component', 'High priority', { priority: 'high', startTime: 2000 }),
        createLoadingOperation('component', 'Medium priority', { priority: 'medium', startTime: 1500 }),
        createLoadingOperation('component', 'High priority old', { priority: 'high', startTime: 1000 }),
      ];
      
      const sorted = sortOperationsByPriority(operations);
      
      expect(sorted[0].message).toBe('High priority old'); // High priority, older
      expect(sorted[1].message).toBe('High priority'); // High priority, newer
      expect(sorted[2].message).toBe('Medium priority');
      expect(sorted[3].message).toBe('Low priority');
    });
  });

  describe('hasOperationTimedOut', () => {
    it('should return false if no timeout is set', () => {
      const operation = createLoadingOperation('component', 'Test', { timeout: undefined });
      expect(hasOperationTimedOut(operation)).toBe(false);
    });

    it('should return true if operation has timed out', () => {
      const operation = createLoadingOperation('component', 'Test', {
        timeout: 1000,
        startTime: Date.now() - 2000, // Started 2 seconds ago
      });
      expect(hasOperationTimedOut(operation)).toBe(true);
    });

    it('should return false if operation has not timed out', () => {
      const operation = createLoadingOperation('component', 'Test', {
        timeout: 5000,
        startTime: Date.now() - 1000, // Started 1 second ago
      });
      expect(hasOperationTimedOut(operation)).toBe(false);
    });
  });

  describe('canRetryOperation', () => {
    it('should return true if retry count is below max retries', () => {
      const operation = createLoadingOperation('component', 'Test', {
        retryCount: 1,
        maxRetries: 3,
      });
      expect(canRetryOperation(operation)).toBe(true);
    });

    it('should return false if retry count equals max retries', () => {
      const operation = createLoadingOperation('component', 'Test', {
        retryCount: 3,
        maxRetries: 3,
      });
      expect(canRetryOperation(operation)).toBe(false);
    });
  });

  describe('createProgress', () => {
    it('should create progress object with defaults', () => {
      const progress = createProgress(5, 10);
      
      expect(progress.loaded).toBe(5);
      expect(progress.total).toBe(10);
      expect(progress.phase).toBe('critical');
      expect(progress.currentAsset).toBeUndefined();
    });

    it('should clamp negative values to zero', () => {
      const progress = createProgress(-5, -10);
      
      expect(progress.loaded).toBe(0);
      expect(progress.total).toBe(0);
    });
  });

  describe('calculateProgressPercentage', () => {
    it('should calculate correct percentage', () => {
      const progress = createProgress(5, 10);
      expect(calculateProgressPercentage(progress)).toBe(50);
    });

    it('should return 0 for zero total', () => {
      const progress = createProgress(5, 0);
      expect(calculateProgressPercentage(progress)).toBe(0);
    });

    it('should clamp to 100%', () => {
      const progress = createProgress(15, 10);
      expect(calculateProgressPercentage(progress)).toBe(100);
    });
  });
});

