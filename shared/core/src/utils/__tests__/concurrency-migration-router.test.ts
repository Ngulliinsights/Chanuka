/**
 * Unit tests for ConcurrencyMigrationRouter
 * 
 * Tests the feature flag routing between legacy and new implementations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConcurrencyMigrationRouter, getConcurrencyRouter, setConcurrencyRouter } from '../concurrency-migration-router';
import type { FeatureFlagsService } from '../../../../server/infrastructure/migration/feature-flags.service';

// Mock feature flags service
const createMockFeatureFlagsService = (shouldUseMigration = false): FeatureFlagsService => ({
  shouldUseMigration: vi.fn().mockResolvedValue(shouldUseMigration),
  updateFlag: vi.fn(),
  getFlag: vi.fn(),
  getUserCohort: vi.fn().mockReturnValue('control'),
  recordMetrics: vi.fn(),
  enableGradualRollout: vi.fn(),
  rollbackFeature: vi.fn()
} as any);

describe('ConcurrencyMigrationRouter', () => {
  let router: ConcurrencyMigrationRouter;
  let mockFeatureFlagsService: FeatureFlagsService;

  beforeEach(() => {
    mockFeatureFlagsService = createMockFeatureFlagsService(false);
    router = new ConcurrencyMigrationRouter(mockFeatureFlagsService);
    router.clearMetrics();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create router without feature flags service', () => {
      const routerWithoutFlags = new ConcurrencyMigrationRouter();
      expect(routerWithoutFlags).toBeInstanceOf(ConcurrencyMigrationRouter);
    });

    it('should create router with feature flags service', () => {
      expect(router).toBeInstanceOf(ConcurrencyMigrationRouter);
    });
  });

  describe('Mutex Routing', () => {
    it('should return legacy mutex when migration is disabled', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(false);
      
      const mutex = await router.getMutex('global', 'user123');
      
      expect(mockFeatureFlagsService.shouldUseMigration).toHaveBeenCalledWith(
        'utilities-concurrency-adapter',
        'user123'
      );
      
      // Should be legacy mutex (has different internal structure)
      expect(mutex).toBeDefined();
    });

    it('should return new mutex when migration is enabled', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(true);
      
      const mutex = await router.getMutex('api', 'user123');
      
      expect(mockFeatureFlagsService.shouldUseMigration).toHaveBeenCalledWith(
        'utilities-concurrency-adapter',
        'user123'
      );
      
      expect(mutex).toBeDefined();
    });

    it('should handle different mutex types', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(true);
      
      const globalMutex = await router.getMutex('global', 'user123');
      const apiMutex = await router.getMutex('api', 'user123');
      const cacheMutex = await router.getMutex('cache', 'user123');
      
      expect(globalMutex).toBeDefined();
      expect(apiMutex).toBeDefined();
      expect(cacheMutex).toBeDefined();
    });

    it('should work without user ID', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(false);
      
      const mutex = await router.getMutex('global');
      
      expect(mockFeatureFlagsService.shouldUseMigration).toHaveBeenCalledWith(
        'utilities-concurrency-adapter',
        undefined
      );
      expect(mutex).toBeDefined();
    });
  });

  describe('Semaphore Routing', () => {
    it('should return legacy semaphore when migration is disabled', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(false);
      
      const semaphore = await router.getSemaphore('api', 'user123');
      
      expect(mockFeatureFlagsService.shouldUseMigration).toHaveBeenCalledWith(
        'utilities-concurrency-adapter',
        'user123'
      );
      expect(semaphore).toBeDefined();
    });

    it('should return new semaphore when migration is enabled', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(true);
      
      const semaphore = await router.getSemaphore('file', 'user123');
      
      expect(mockFeatureFlagsService.shouldUseMigration).toHaveBeenCalledWith(
        'utilities-concurrency-adapter',
        'user123'
      );
      expect(semaphore).toBeDefined();
    });

    it('should handle different semaphore types', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(true);
      
      const apiSemaphore = await router.getSemaphore('api', 'user123');
      const fileSemaphore = await router.getSemaphore('file', 'user123');
      
      expect(apiSemaphore).toBeDefined();
      expect(fileSemaphore).toBeDefined();
    });
  });

  describe('withMutexLock', () => {
    it('should execute function with mutex and record metrics', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(true);
      
      const testFn = vi.fn().mockResolvedValue('test-result');
      const result = await router.withMutexLock(testFn, 'global', 'user123');
      
      expect(result).toBe('test-result');
      expect(testFn).toHaveBeenCalledOnce();
      
      const metrics = router.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        success: true,
        implementation: 'new',
        operation: 'mutex-global'
      });
    });

    it('should record error metrics when function throws', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(false);
      
      const testError = new Error('Test error');
      const testFn = vi.fn().mockRejectedValue(testError);
      
      await expect(router.withMutexLock(testFn, 'api', 'user123')).rejects.toThrow('Test error');
      
      const metrics = router.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        success: false,
        implementation: 'legacy',
        operation: 'mutex-api',
        error: testError
      });
    });

    it('should handle feature flag service errors gracefully', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockRejectedValue(new Error('Flag service error'));
      
      const testFn = vi.fn().mockResolvedValue('result');
      const result = await router.withMutexLock(testFn, 'global', 'user123');
      
      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalledOnce();
      
      // Should default to legacy implementation
      const metrics = router.getMetrics();
      expect(metrics[0].implementation).toBe('legacy');
    });
  });

  describe('withSemaphorePermit', () => {
    it('should execute function with semaphore and record metrics', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(true);
      
      const testFn = vi.fn().mockResolvedValue('semaphore-result');
      const result = await router.withSemaphorePermit(testFn, 'api', 'user123');
      
      expect(result).toBe('semaphore-result');
      expect(testFn).toHaveBeenCalledOnce();
      
      const metrics = router.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        success: true,
        implementation: 'new',
        operation: 'semaphore-api'
      });
    });

    it('should record error metrics when function throws', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(false);
      
      const testError = new Error('Semaphore error');
      const testFn = vi.fn().mockRejectedValue(testError);
      
      await expect(router.withSemaphorePermit(testFn, 'file', 'user123')).rejects.toThrow('Semaphore error');
      
      const metrics = router.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        success: false,
        implementation: 'legacy',
        operation: 'semaphore-file',
        error: testError
      });
    });
  });

  describe('getConcurrencyAdapter', () => {
    it('should return new adapter when migration is enabled', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(true);
      
      const adapter = await router.getConcurrencyAdapter('user123');
      
      expect(adapter).toBeDefined();
      expect(typeof adapter.withLock).toBe('function');
      expect(typeof adapter.withLimit).toBe('function');
    });

    it('should return legacy adapter wrapper when migration is disabled', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(false);
      
      const adapter = await router.getConcurrencyAdapter('user123');
      
      expect(adapter).toBeDefined();
      expect(typeof adapter.withLock).toBe('function');
      expect(typeof adapter.withLimit).toBe('function');
      
      // Test that it works
      const result = await adapter.withLock(async () => 'legacy-test');
      expect(result).toBe('legacy-test');
    });
  });

  describe('Metrics Collection', () => {
    it('should collect and provide metrics', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      
      await router.withMutexLock(async () => 'new', 'global', 'user1');
      await router.withMutexLock(async () => 'legacy', 'api', 'user2');
      
      const metrics = router.getMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0].implementation).toBe('new');
      expect(metrics[1].implementation).toBe('legacy');
    });

    it('should provide performance summary', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      
      await router.withMutexLock(async () => 'result1', 'global', 'user1');
      await router.withMutexLock(async () => 'result2', 'api', 'user2');
      await router.withSemaphorePermit(async () => 'result3', 'api', 'user3');
      
      const summary = router.getPerformanceSummary();
      
      expect(summary.new.count).toBe(2);
      expect(summary.legacy.count).toBe(1);
      expect(summary.new.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(summary.legacy.avgResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should limit metrics collection to prevent memory leaks', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(true);
      
      // Generate more than 1000 metrics
      for (let i = 0; i < 1100; i++) {
        await router.withMutexLock(async () => `result${i}`, 'global', `user${i}`);
      }
      
      const metrics = router.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });

    it('should clear metrics', () => {
      router.clearMetrics();
      expect(router.getMetrics()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing feature flags service', async () => {
      const routerWithoutFlags = new ConcurrencyMigrationRouter();
      
      const result = await routerWithoutFlags.withMutexLock(async () => 'no-flags', 'global', 'user123');
      
      expect(result).toBe('no-flags');
      
      // Should default to legacy
      const metrics = routerWithoutFlags.getMetrics();
      expect(metrics[0].implementation).toBe('legacy');
    });

    it('should handle feature flag service exceptions', async () => {
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockRejectedValue(new Error('Service down'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await router.withMutexLock(async () => 'error-handled', 'global', 'user123');
      
      expect(result).toBe('error-handled');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking feature flag utilities-concurrency-adapter:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Global Router Functions', () => {
    it('should get and set global router', () => {
      const customRouter = new ConcurrencyMigrationRouter();
      
      setConcurrencyRouter(customRouter);
      const retrievedRouter = getConcurrencyRouter();
      
      expect(retrievedRouter).toBe(customRouter);
    });

    it('should create new router if none exists', () => {
      // Reset global router
      setConcurrencyRouter(null as any);
      
      const router1 = getConcurrencyRouter();
      const router2 = getConcurrencyRouter();
      
      expect(router1).toBeInstanceOf(ConcurrencyMigrationRouter);
      expect(router1).toBe(router2); // Should return same instance
    });

    it('should accept feature flags service in global router', () => {
      const mockService = createMockFeatureFlagsService(true);
      const routerWithService = getConcurrencyRouter(mockService);
      
      expect(routerWithService).toBeInstanceOf(ConcurrencyMigrationRouter);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with feature flag changes', async () => {
      // Start with migration disabled
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(false);
      
      let result1 = await router.withMutexLock(async () => 'legacy-result', 'global', 'user123');
      expect(result1).toBe('legacy-result');
      
      // Enable migration
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockResolvedValue(true);
      
      let result2 = await router.withMutexLock(async () => 'new-result', 'global', 'user123');
      expect(result2).toBe('new-result');
      
      const metrics = router.getMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0].implementation).toBe('legacy');
      expect(metrics[1].implementation).toBe('new');
    });

    it('should handle concurrent operations with mixed implementations', async () => {
      let callCount = 0;
      mockFeatureFlagsService.shouldUseMigration = vi.fn().mockImplementation(async () => {
        callCount++;
        return callCount % 2 === 0; // Alternate between true and false
      });
      
      const promises = Array.from({ length: 10 }, (_, i) =>
        router.withMutexLock(async () => `result-${i}`, 'global', `user${i}`)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result).toBe(`result-${i}`);
      });
      
      const metrics = router.getMetrics();
      expect(metrics).toHaveLength(10);
      
      // Should have both implementations used
      const implementations = metrics.map(m => m.implementation);
      expect(implementations).toContain('new');
      expect(implementations).toContain('legacy');
    });
  });
});