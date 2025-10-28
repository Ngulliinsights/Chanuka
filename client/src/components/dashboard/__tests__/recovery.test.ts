import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Dashboard recovery tests
 * Following navigation component recovery testing patterns
 */

import {
  getRecoveryStrategy,
  executeRecovery,
  formatRecoverySuggestions
} from '../recovery';
import {
  DashboardError,
  DashboardDataFetchError,
  DashboardValidationError,
  DashboardConfigurationError,
  DashboardActionError,
  DashboardTopicError,
  DashboardErrorType
} from '../errors';
import type { DashboardData, DashboardConfig } from '@shared/types';

describe('Dashboard Recovery', () => {
  const mockData: Partial<DashboardData> = {
    summary: {
      billsTracked: 5,
      actionsNeeded: 3,
      topicsCount: 8,
      recentActivity: 12,
      completedActions: 7,
      pendingActions: 3,
      lastUpdated: new Date()
    },
    actionItems: [],
    trackedTopics: []
  };

  const mockConfig: Partial<DashboardConfig> = {
    refreshInterval: 30000,
    maxActionItems: 10,
    maxTrackedTopics: 20
  };

  describe('getRecoveryStrategy', () => {
    describe('Data fetch errors', () => {
      it('should provide retry strategy for fetch errors with low retry count', () => {
        const error = new DashboardDataFetchError('/api/dashboard/summary', 'Network timeout');
        const strategy = getRecoveryStrategy({
          error,
          data: mockData,
          config: mockConfig,
          retryCount: 1
        });

        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Retrying data fetch automatically');
        expect(strategy.autoRecover).toBeDefined();
      });

      it('should provide fallback strategy for fetch errors with high retry count', () => {
        const error = new DashboardDataFetchError('/api/dashboard/summary', 'Network timeout');
        const strategy = getRecoveryStrategy({
          error,
          data: mockData,
          config: mockConfig,
          retryCount: 5
        });

        expect(strategy.canRecover).toBe(false);
        expect(strategy.suggestions).toContain('Unable to fetch fresh data');
        expect(strategy.manualSteps).toBeDefined();
      });

      it('should provide cached data strategy when recent data is available', () => {
        const error = new DashboardDataFetchError('/api/dashboard/summary', 'Network timeout');
        const recentDate = new Date(Date.now() - 60000); // 1 minute ago
        
        const strategy = getRecoveryStrategy({
          error,
          data: mockData,
          config: mockConfig,
          retryCount: 5,
          lastSuccessfulFetch: recentDate
        });

        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Using cached data from recent fetch');
      });
    });

    describe('Validation errors', () => {
      it('should provide auto-recovery for validation errors', () => {
        const error = new DashboardValidationError('Invalid priority', 'priority', 'Invalid');
        const strategy = getRecoveryStrategy({
          error,
          data: mockData,
          config: mockConfig
        });

        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Validation failed for field: priority');
        expect(strategy.autoRecover).toBeDefined();
      });
    });

    describe('Configuration errors', () => {
      it('should provide default config recovery for configuration errors', () => {
        const error = new DashboardConfigurationError('Invalid refresh interval');
        const strategy = getRecoveryStrategy({
          error,
          data: mockData,
          config: mockConfig
        });

        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Using default configuration');
        expect(strategy.autoRecover).toBeDefined();
      });
    });

    describe('Action errors', () => {
      it('should provide retry strategy for action errors with low retry count', () => {
        const error = new DashboardActionError('complete', 'Network error');
        const strategy = getRecoveryStrategy({
          error,
          data: mockData,
          config: mockConfig,
          retryCount: 1
        });

        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Retrying action: complete');
        expect(strategy.autoRecover).toBeDefined();
      });

      it('should require manual retry for action errors with high retry count', () => {
        const error = new DashboardActionError('complete', 'Network error');
        const strategy = getRecoveryStrategy({
          error,
          data: mockData,
          config: mockConfig,
          retryCount: 3
        });

        expect(strategy.canRecover).toBe(false);
        expect(strategy.suggestions).toContain('Action failed: complete');
        expect(strategy.manualSteps).toBeDefined();
      });
    });

    describe('Topic errors', () => {
      it('should provide refresh strategy for topic errors', () => {
        const error = new DashboardTopicError('add', 'topic-123', 'Duplicate name');
        const strategy = getRecoveryStrategy({
          error,
          data: mockData,
          config: mockConfig
        });

        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('Topic add failed for topic topic-123');
        expect(strategy.autoRecover).toBeDefined();
      });
    });

    describe('Generic errors', () => {
      it('should provide generic recovery for unknown error types', () => {
        const error = new DashboardError('Unknown error', DashboardErrorType.DASHBOARD_ERROR);
        const strategy = getRecoveryStrategy({
          error,
          data: mockData,
          config: mockConfig
        });

        expect(strategy.canRecover).toBe(true);
        expect(strategy.suggestions).toContain('An unexpected error occurred');
        expect(strategy.autoRecover).toBeDefined();
      });
    });
  });

  describe('executeRecovery', () => {
    it('should return false for non-recoverable strategies', async () => {
      const strategy = {
        canRecover: false,
        suggestions: ['Manual intervention required']
      };

      const result = await executeRecovery(strategy, {
        error: new DashboardError('Test error'),
        data: mockData,
        config: mockConfig
      });

      expect(result).toBe(false);
    });

    it('should execute auto-recovery function when available', async () => {
      const mockAutoRecover = vi.fn().mockResolvedValue(true);
      const strategy = {
        canRecover: true,
        suggestions: ['Auto-recovering'],
        autoRecover: mockAutoRecover
      };

      const result = await executeRecovery(strategy, {
        error: new DashboardError('Test error'),
        data: mockData,
        config: mockConfig
      });

      expect(mockAutoRecover).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle auto-recovery failures gracefully', async () => {
      const mockAutoRecover = vi.fn().mockRejectedValue(new Error('Recovery failed'));
      const strategy = {
        canRecover: true,
        suggestions: ['Auto-recovering'],
        autoRecover: mockAutoRecover
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      const result = await executeRecovery(strategy, {
        error: new DashboardError('Test error'),
        data: mockData,
        config: mockConfig
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Auto-recovery failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should return true for manual recovery strategies', async () => {
      const strategy = {
        canRecover: true,
        suggestions: ['Manual recovery available'],
        manualSteps: ['Step 1', 'Step 2']
      };

      const result = await executeRecovery(strategy, {
        error: new DashboardError('Test error'),
        data: mockData,
        config: mockConfig
      });

      expect(result).toBe(true);
    });
  });

  describe('formatRecoverySuggestions', () => {
    it('should format suggestions with primary and secondary categories', () => {
      const strategy = {
        canRecover: true,
        suggestions: ['Primary suggestion 1', 'Primary suggestion 2'],
        manualSteps: ['Manual step 1', 'Manual step 2']
      };

      const formatted = formatRecoverySuggestions(strategy);

      expect(formatted.primary).toEqual(['Primary suggestion 1', 'Primary suggestion 2']);
      expect(formatted.secondary).toEqual(['Manual step 1', 'Manual step 2']);
    });

    it('should handle missing manual steps', () => {
      const strategy = {
        canRecover: true,
        suggestions: ['Primary suggestion']
      };

      const formatted = formatRecoverySuggestions(strategy);

      expect(formatted.primary).toEqual(['Primary suggestion']);
      expect(formatted.secondary).toEqual([]);
    });

    it('should handle empty suggestions', () => {
      const strategy = {
        canRecover: false,
        suggestions: []
      };

      const formatted = formatRecoverySuggestions(strategy);

      expect(formatted.primary).toEqual([]);
      expect(formatted.secondary).toEqual([]);
    });
  });

  describe('Recovery context handling', () => {
    it('should handle missing optional context properties', () => {
      const error = new DashboardDataFetchError('/api/test');
      const strategy = getRecoveryStrategy({ error });

      expect(strategy).toBeDefined();
      expect(strategy.canRecover).toBeDefined();
      expect(strategy.suggestions).toBeDefined();
    });

    it('should use retry count in recovery decisions', () => {
      const error = new DashboardActionError('test');
      
      const lowRetryStrategy = getRecoveryStrategy({ error, retryCount: 0 });
      const highRetryStrategy = getRecoveryStrategy({ error, retryCount: 5 });

      expect(lowRetryStrategy.canRecover).toBe(true);
      expect(highRetryStrategy.canRecover).toBe(false);
    });

    it('should consider last successful fetch in recovery decisions', () => {
      const error = new DashboardDataFetchError('/api/test');
      const recentFetch = new Date(Date.now() - 60000); // 1 minute ago
      const oldFetch = new Date(Date.now() - 600000); // 10 minutes ago

      const recentStrategy = getRecoveryStrategy({ 
        error, 
        retryCount: 5, 
        lastSuccessfulFetch: recentFetch 
      });
      const oldStrategy = getRecoveryStrategy({ 
        error, 
        retryCount: 5, 
        lastSuccessfulFetch: oldFetch 
      });

      expect(recentStrategy.canRecover).toBe(true);
      expect(oldStrategy.canRecover).toBe(false);
    });
  });
});

