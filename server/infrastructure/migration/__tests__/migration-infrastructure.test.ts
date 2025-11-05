/**
 * Migration Infrastructure Tests
 * 
 * Tests for the migration infrastructure components including feature flags,
 * A/B testing, monitoring, rollback, and validation services.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  featureFlagsService, 
  abTestingService, 
  monitoringService, 
  rollbackService
} from '../index';

describe('Migration Infrastructure', () => {
  beforeEach(() => {
    // Reset services to clean state
    vi.clearAllMocks();
  });

  describe('Feature Flags Service', () => {
    it('should initialize with default flags', () => {
      const flag = featureFlagsService.getFlag('utilities-concurrency-adapter');
      expect(flag).toBeDefined();
      expect(flag?.enabled).toBe(false);
      expect(flag?.rolloutPercentage).toBe(0);
      expect(flag?.fallbackEnabled).toBe(true);
    });

    it('should determine migration usage based on rollout percentage', async () => {
      // Enable flag with 50% rollout
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 50
      });

      // Test with consistent user ID (should always return same result)
      const userId = 'test-user-123';
      const result1 = await featureFlagsService.shouldUseMigration('utilities-concurrency-adapter', userId);
      const result2 = await featureFlagsService.shouldUseMigration('utilities-concurrency-adapter', userId);
      
      expect(result1).toBe(result2); // Should be consistent
    });

    it('should support gradual rollout', async () => {
      await featureFlagsService.enableGradualRollout('utilities-concurrency-adapter', 25);
      
      const flag = featureFlagsService.getFlag('utilities-concurrency-adapter');
      expect(flag?.enabled).toBe(true);
      expect(flag?.rolloutPercentage).toBe(25);
    });

    it('should support rollback', async () => {
      // First enable the flag
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 50
      });

      // Then rollback
      await featureFlagsService.rollbackFeature('utilities-concurrency-adapter');
      
      const flag = featureFlagsService.getFlag('utilities-concurrency-adapter');
      expect(flag?.enabled).toBe(false);
      expect(flag?.rolloutPercentage).toBe(0);
    });
  });

  describe('A/B Testing Service', () => {
    it('should assign users to consistent cohorts', () => {
      const userId = 'test-user-456';
      const component = 'concurrency-adapter';
      
      const cohort1 = featureFlagsService.getUserCohort(userId, component);
      const cohort2 = featureFlagsService.getUserCohort(userId, component);
      
      expect(cohort1).toBe(cohort2);
      expect(['control', 'treatment']).toContain(cohort1);
    });

    it('should track cohort metrics', async () => {
      const metrics = {
        component: 'concurrency-adapter',
        userId: 'test-user-789',
        cohort: 'treatment' as const,
        metrics: {
          responseTime: 150,
          errorRate: 0.01,
          successRate: 0.99
        },
        timestamp: new Date()
      };

      // Should not throw
      await expect(abTestingService.trackCohortMetrics(
        metrics.component, 
        metrics.userId, 
        metrics.metrics
      )).resolves.not.toThrow();
    });

    it('should calculate statistical significance', async () => {
      // Add some mock metrics first
      await abTestingService.trackCohortMetrics('test-component', 'user1', {
        responseTime: 100,
        errorRate: 0.01,
        successRate: 0.99
      });

      const results = await abTestingService.calculateStatisticalSignificance('test-component');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Monitoring Service', () => {
    it('should record and retrieve metrics', async () => {
      const metrics = {
        component: 'test-component',
        phase: 1,
        timestamp: new Date(),
        performance: {
          responseTime: { p50: 100, p95: 200, p99: 300 },
          errorRate: 0.01,
          throughput: 1000,
          memoryUsage: { heapUsed: 100000000, heapTotal: 200000000, external: 50000000 }
        },
        migrationState: {
          rolloutPercentage: 25,
          status: 'in_progress' as const,
          dataValidationStatus: 'passed' as const
        }
      };

      await monitoringService.recordMetrics(metrics);
      
      const currentMetrics = monitoringService.getCurrentMetrics('test-component');
      expect(currentMetrics).toBeDefined();
      expect(currentMetrics?.component).toBe('test-component');
    });

    it('should provide dashboard data', () => {
      const dashboardData = monitoringService.getDashboardData();
      
      expect(dashboardData).toBeDefined();
      expect(dashboardData.timestamp).toBeInstanceOf(Date);
      expect(dashboardData.components).toBeDefined();
      expect(dashboardData.alerts).toBeDefined();
      expect(dashboardData.systemHealth).toBeDefined();
    });

    it('should register and trigger alert handlers', async () => {
      const mockHandler = vi.fn();
      monitoringService.registerAlertHandler('test-handler', mockHandler);

      // Record metrics that should trigger an alert (high error rate)
      const metrics = {
        component: 'test-component',
        phase: 1,
        timestamp: new Date(),
        performance: {
          responseTime: { p50: 100, p95: 200, p99: 300 },
          errorRate: 0.02, // Above 1% threshold
          throughput: 1000,
          memoryUsage: { heapUsed: 100000000, heapTotal: 200000000, external: 50000000 }
        },
        migrationState: {
          rolloutPercentage: 25,
          status: 'in_progress' as const,
          dataValidationStatus: 'passed' as const
        }
      };

      await monitoringService.recordMetrics(metrics);
      
      // Alert handler should have been called
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Rollback Service', () => {
    it('should trigger manual rollback', async () => {
      const rollbackId = await rollbackService.triggerManualRollback(
        'test-component-manual', 
        'Manual rollback for testing'
      );
      
      expect(rollbackId).toBeDefined();
      expect(rollbackId).toContain('rollback-test-component-manual-');
      
      const rollbackStatus = rollbackService.getRollbackStatus('test-component-manual');
      expect(rollbackStatus).toBeDefined();
      expect(rollbackStatus?.trigger).toBe('manual');
      expect(rollbackStatus?.status).toBe('completed');
    });

    it('should prevent concurrent rollbacks', async () => {
      // Start first rollback
      const promise1 = rollbackService.triggerManualRollback('test-component-2', 'First rollback');
      
      // Try to start second rollback immediately
      await expect(
        rollbackService.triggerManualRollback('test-component-2', 'Second rollback')
      ).rejects.toThrow('Rollback already in progress');
      
      // Wait for first rollback to complete
      await promise1;
    });

    it('should track rollback history', async () => {
      await rollbackService.triggerManualRollback('test-component-3', 'Test rollback');
      
      const history = rollbackService.getRollbackHistory(10);
      expect(history.length).toBeGreaterThan(0);
      
      const lastRollback = history[history.length - 1];
      expect(lastRollback.component).toBe('test-component-3');
      expect(lastRollback.reason).toBe('Test rollback');
    });
  });

  describe('Core Services Integration', () => {
    it('should work together for basic migration flow', async () => {
      // 1. Enable feature flag
      featureFlagsService.updateFlag('test-integration', {
        name: 'test-integration',
        enabled: true,
        rolloutPercentage: 50,
        fallbackEnabled: true
      });

      // 2. Check if user should use migration
      const shouldUse = await featureFlagsService.shouldUseMigration('test-integration', 'test-user');
      expect(typeof shouldUse).toBe('boolean');

      // 3. Record some metrics
      const metrics = {
        component: 'test-integration',
        phase: 1,
        timestamp: new Date(),
        performance: {
          responseTime: { p50: 100, p95: 200, p99: 300 },
          errorRate: 0.005,
          throughput: 1000,
          memoryUsage: { heapUsed: 100000000, heapTotal: 200000000, external: 50000000 }
        },
        migrationState: {
          rolloutPercentage: 50,
          status: 'in_progress' as const,
          dataValidationStatus: 'passed' as const
        }
      };

      await monitoringService.recordMetrics(metrics);

      // 4. Check dashboard data
      const dashboardData = monitoringService.getDashboardData();
      expect(dashboardData.components['test-integration']).toBeDefined();

      // 5. Test rollback capability (with shorter timeout)
      const rollbackId = await rollbackService.triggerManualRollback('test-integration', 'Integration test');
      expect(rollbackId).toContain('rollback-test-integration-');

      // 6. Verify flag was disabled
      const flag = featureFlagsService.getFlag('test-integration');
      expect(flag?.enabled).toBe(false);
    });
  });
});