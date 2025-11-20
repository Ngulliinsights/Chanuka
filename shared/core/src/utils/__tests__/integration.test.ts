/**
 * Integration tests for concurrency utilities migration
 * 
 * Tests the complete integration between feature flags, migration router,
 * and the new concurrency adapters.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConcurrencyMigrationRouter } from '../concurrency-migration-router';

// Mock FeatureFlagsService interface
interface FeatureFlagsService {
  shouldUseMigration(flagName: string, user_id?: string): Promise<boolean>;
  updateFlag(flagName: string, updates: any): void;
  getFlag(flagName: string): any;
  getUserCohort(user_id: string, component: string): 'control' | 'treatment';
  recordMetrics(metrics: any): Promise<void>;
  enableGradualRollout(flagName: string, targetPercentage: number): Promise<void>;
  rollbackFeature(flagName: string): Promise<void>;
}

// Mock implementation
class MockFeatureFlagsService implements FeatureFlagsService {
  private flags: Map<string, any> = new Map();

  constructor() {
    this.flags.set('utilities-concurrency-adapter', {
      name: 'utilities-concurrency-adapter',
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true
    });
  }

  async shouldUseMigration(flagName: string, user_id?: string): Promise<boolean> {
    const flag = this.flags.get(flagName);
    if (!flag || !flag.enabled) {
      return false;
    }

    if (user_id) {
      const userHash = this.hashUser(user_id);
      return userHash % 100 < flag.rolloutPercentage;
    }

    return Math.random() * 100 < flag.rolloutPercentage;
  }

  updateFlag(flagName: string, updates: any): void {
    const existingFlag = this.flags.get(flagName) || {};
    this.flags.set(flagName, { ...existingFlag, ...updates });
  }

  getFlag(flagName: string): any {
    return this.flags.get(flagName);
  }

  getUserCohort(user_id: string, component: string): 'control' | 'treatment' {
    return this.hashUser(user_id) % 2 === 0 ? 'control' : 'treatment';
  }

  async recordMetrics(metrics: any): Promise<void> {
    // Mock implementation
  }

  async enableGradualRollout(flagName: string, targetPercentage: number): Promise<void> {
    this.updateFlag(flagName, {
      enabled: true,
      rolloutPercentage: Math.min(100, Math.max(0, targetPercentage))
    });
  }

  async rollbackFeature(flagName: string): Promise<void> {
    this.updateFlag(flagName, {
      enabled: false,
      rolloutPercentage: 0
    });
  }

  private hashUser(user_id: string): number {
    let hash = 0;
    for (let i = 0; i < user_id.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

describe('Concurrency Migration Integration', () => {
  let featureFlagsService: MockFeatureFlagsService;
  let router: ConcurrencyMigrationRouter;

  beforeEach(() => {
    featureFlagsService = new MockFeatureFlagsService();
    router = new ConcurrencyMigrationRouter(featureFlagsService as any);
    router.clearMetrics();
  });

  describe('Feature Flag Integration', () => {
    it('should route to legacy implementation when feature is disabled', async () => {
      // Ensure feature is disabled
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: false,
        rolloutPercentage: 0
      });

      const result = await router.withMutexLock(async () => {
        return 'legacy-execution';
      }, 'global', 'test-user');

      expect(result).toBe('legacy-execution');
      
      const metrics = router.getMetrics();
      expect(metrics[0].implementation).toBe('legacy');
    });

    it('should route to new implementation when feature is enabled', async () => {
      // Enable feature for all users
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 100
      });

      const result = await router.withMutexLock(async () => {
        return 'new-execution';
      }, 'global', 'test-user');

      expect(result).toBe('new-execution');
      
      const metrics = router.getMetrics();
      expect(metrics[0].implementation).toBe('new');
    });

    it('should handle gradual rollout correctly', async () => {
      // Enable for 50% of users
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 50
      });

      const results: string[] = [];
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);

      for (const user_id of userIds) {
        const result = await router.withMutexLock(async () => {
          return 'test-result';
        }, 'global', userId);
        results.push(result);
      }

      const metrics = router.getMetrics();
      const newImplementationCount = metrics.filter(m => m.implementation === 'new').length;
      const legacyImplementationCount = metrics.filter(m => m.implementation === 'legacy').length;

      // Should have both implementations used
      expect(newImplementationCount).toBeGreaterThan(0);
      expect(legacyImplementationCount).toBeGreaterThan(0);
      expect(newImplementationCount + legacyImplementationCount).toBe(100);

      // The split should be roughly 50/50 (allowing for some variance due to hashing)
      expect(newImplementationCount).toBeGreaterThan(30);
      expect(newImplementationCount).toBeLessThan(70);
    });

    it('should maintain consistent routing for same user', async () => {
      // Enable for 50% of users
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 50
      });

      const user_id = 'consistent-user';
      const implementations: string[] = [];

      // Make multiple calls with same user
      for (let i = 0; i < 10; i++) {
        await router.withMutexLock(async () => {
          return `call-${i}`;
        }, 'global', userId);
      }

      const metrics = router.getMetrics();
      const userMetrics = metrics.filter(m => m.operation === 'mutex-global');
      const implementations_used = [...new Set(userMetrics.map(m => m.implementation))];

      // Should consistently use the same implementation for the same user
      expect(implementations_used).toHaveLength(1);
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect performance metrics for both implementations', async () => {
      // Test with legacy implementation
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: false,
        rolloutPercentage: 0
      });

      await router.withMutexLock(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'legacy-perf';
      }, 'global', 'perf-user-1');

      // Test with new implementation
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 100
      });

      await router.withMutexLock(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'new-perf';
      }, 'global', 'perf-user-2');

      const summary = router.getPerformanceSummary();
      
      expect(summary.legacy.count).toBe(1);
      expect(summary.new.count).toBe(1);
      expect(summary.legacy.avgResponseTime).toBeGreaterThan(0);
      expect(summary.new.avgResponseTime).toBeGreaterThan(0);
    });

    it('should track error rates correctly', async () => {
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 100
      });

      // Successful operation
      await router.withMutexLock(async () => 'success', 'global', 'user1');

      // Failed operation
      try {
        await router.withMutexLock(async () => {
          throw new Error('Test error');
        }, 'global', 'user2');
      } catch (error) {
        // Expected error
      }

      const summary = router.getPerformanceSummary();
      expect(summary.new.count).toBe(1); // Only successful operations counted in performance summary
      expect(summary.new.errorRate).toBe(50); // 1 error out of 2 total operations
    });
  });

  describe('Rollback Scenarios', () => {
    it('should handle rollback from new to legacy implementation', async () => {
      // Start with new implementation
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 100
      });

      await router.withMutexLock(async () => 'new-before-rollback', 'global', 'rollback-user');

      // Rollback to legacy
      await featureFlagsService.rollbackFeature('utilities-concurrency-adapter');

      await router.withMutexLock(async () => 'legacy-after-rollback', 'global', 'rollback-user');

      const metrics = router.getMetrics();
      expect(metrics[0].implementation).toBe('new');
      expect(metrics[1].implementation).toBe('legacy');
    });

    it('should handle gradual rollout increase', async () => {
      const user_id = 'gradual-user';

      // Start with 0% rollout
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 0
      });

      await router.withMutexLock(async () => 'phase-0', 'global', userId);

      // Increase to 100% rollout
      await featureFlagsService.enableGradualRollout('utilities-concurrency-adapter', 100);

      await router.withMutexLock(async () => 'phase-100', 'global', userId);

      const metrics = router.getMetrics();
      expect(metrics[0].implementation).toBe('legacy');
      expect(metrics[1].implementation).toBe('new');
    });
  });

  describe('Concurrency Adapter Integration', () => {
    it('should provide working concurrency adapter based on feature flags', async () => {
      // Test with new implementation
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 100
      });

      const adapter = await router.getConcurrencyAdapter('adapter-user');
      
      const lockResult = await adapter.withLock(async () => 'adapter-lock-test');
      const limitResult = await adapter.withLimit(async () => 'adapter-limit-test');

      expect(lockResult).toBe('adapter-lock-test');
      expect(limitResult).toBe('adapter-limit-test');

      const stats = adapter.getStats();
      expect(stats).toHaveProperty('isLocked');
      expect(stats).toHaveProperty('waitingCount');
      expect(stats).toHaveProperty('pendingCount');
      expect(stats).toHaveProperty('activeCount');
    });

    it('should handle concurrent operations through adapter', async () => {
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 100
      });

      const adapter = await router.getConcurrencyAdapter('concurrent-user');
      const results: number[] = [];

      const promises = Array.from({ length: 10 }, (_, i) =>
        adapter.withLock(async () => {
          const currentLength = results.length;
          await new Promise(resolve => setTimeout(resolve, 5));
          results.push(currentLength);
          return currentLength;
        })
      );

      await Promise.all(promises);

      // Results should be sequential if mutex works correctly
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should gracefully handle feature flag service failures', async () => {
      // Create a router with a failing feature flag service
      const failingService = {
        shouldUseMigration: vi.fn().mockRejectedValue(new Error('Service unavailable')),
        updateFlag: vi.fn(),
        getFlag: vi.fn(),
        getUserCohort: vi.fn(),
        recordMetrics: vi.fn(),
        enableGradualRollout: vi.fn(),
        rollbackFeature: vi.fn()
      } as any;

      const resilientRouter = new ConcurrencyMigrationRouter(failingService);

      // Should default to legacy implementation and not throw
      const result = await resilientRouter.withMutexLock(async () => {
        return 'resilient-result';
      }, 'global', 'resilient-user');

      expect(result).toBe('resilient-result');
      
      const metrics = resilientRouter.getMetrics();
      expect(metrics[0].implementation).toBe('legacy');
    });

    it('should handle operations without user context', async () => {
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 50
      });

      // Should work without user ID
      const result = await router.withMutexLock(async () => {
        return 'no-user-context';
      }, 'global');

      expect(result).toBe('no-user-context');
      
      const metrics = router.getMetrics();
      expect(metrics[0]).toHaveProperty('implementation');
    });
  });
});

