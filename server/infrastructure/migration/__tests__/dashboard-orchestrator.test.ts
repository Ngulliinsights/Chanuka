/**
 * Dashboard and Orchestrator Tests
 * 
 * Tests for the dashboard service and migration orchestrator components.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  dashboardService,
  migrationOrchestrator,
  featureFlagsService,
  monitoringService
} from '../index';

describe('Dashboard and Orchestrator Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard Service', () => {
    it('should generate comprehensive dashboard data', async () => {
      const dashboardData = await dashboardService.getDashboardData();
      
      expect(dashboardData).toBeDefined();
      expect(dashboardData.timestamp).toBeInstanceOf(Date);
      expect(dashboardData.systemHealth).toMatch(/healthy|warning|critical/);
      expect(Array.isArray(dashboardData.phases)).toBe(true);
      expect(Array.isArray(dashboardData.components)).toBe(true);
      expect(dashboardData.alerts).toBeDefined();
      expect(dashboardData.performance).toBeDefined();
      expect(dashboardData.abTesting).toBeDefined();
      expect(dashboardData.rollbacks).toBeDefined();
    });

    it('should provide phase status information', async () => {
      const dashboardData = await dashboardService.getDashboardData();
      
      expect(dashboardData.phases).toHaveLength(5);
      
      const phase1 = dashboardData.phases.find(p => p.phase === 1);
      expect(phase1).toBeDefined();
      expect(phase1?.name).toBe('Utilities Migration');
      expect(phase1?.componentsTotal).toBe(3);
      expect(phase1?.status).toMatch(/not_started|in_progress|testing|rolled_out|completed/);
    });

    it('should provide component status information', async () => {
      const dashboardData = await dashboardService.getDashboardData();
      
      expect(dashboardData.components.length).toBeGreaterThan(0);
      
      const component = dashboardData.components[0];
      expect(component.name).toBeDefined();
      expect(component.phase).toBeDefined();
      expect(component.status).toMatch(/not_started|in_progress|testing|rolled_out|completed/);
      expect(component.featureFlagName).toBeDefined();
      expect(component.metrics).toBeDefined();
      expect(component.validation).toBeDefined();
      expect(component.abTesting).toBeDefined();
    });

    it('should calculate performance summary', async () => {
      const dashboardData = await dashboardService.getDashboardData();
      
      expect(dashboardData.performance.overallHealth).toBeGreaterThanOrEqual(0);
      expect(dashboardData.performance.overallHealth).toBeLessThanOrEqual(100);
      expect(dashboardData.performance.responseTime).toBeDefined();
      expect(dashboardData.performance.errorRate).toBeDefined();
      expect(dashboardData.performance.memoryUsage).toBeDefined();
      expect(dashboardData.performance.throughput).toBeDefined();
    });

    it('should support real-time subscriptions', async () => {
      const mockCallback = vi.fn();
      
      const unsubscribe = dashboardService.subscribe(mockCallback);
      
      // Should call callback immediately with current data
      expect(mockCallback).toHaveBeenCalledTimes(1);
      
      // Refresh dashboard to trigger update
      await dashboardService.refreshDashboard();
      
      // Should call callback again with updated data
      expect(mockCallback).toHaveBeenCalledTimes(2);
      
      unsubscribe();
    });

    it('should provide component-specific dashboard data', async () => {
      const componentDashboard = await dashboardService.getComponentDashboard('concurrency-adapter');
      
      if (componentDashboard) {
        expect(componentDashboard.name).toBe('concurrency-adapter');
        expect(componentDashboard.phase).toBe(1);
        expect(componentDashboard.metrics).toBeDefined();
        expect(componentDashboard.validation).toBeDefined();
      }
    });

    it('should provide phase-specific dashboard data', async () => {
      const phaseDashboard = await dashboardService.getPhaseDashboard(1);
      
      expect(phaseDashboard).toBeDefined();
      expect(phaseDashboard?.phase).toBe(1);
      expect(phaseDashboard?.name).toBe('Utilities Migration');
      expect(phaseDashboard?.componentsTotal).toBe(3);
    });
  });

  describe('Migration Orchestrator', () => {
    it('should initialize with default migration plan', () => {
      const migrationPlan = migrationOrchestrator.getMigrationPlan();
      
      expect(migrationPlan).toBeDefined();
      expect(migrationPlan?.phases).toHaveLength(1); // Only Phase 1 is defined in the default plan
      expect(migrationPlan?.globalSettings).toBeDefined();
      expect(migrationPlan?.globalSettings.rolloutStrategy).toBe('conservative');
      expect(migrationPlan?.globalSettings.validationRequired).toBe(true);
      expect(migrationPlan?.globalSettings.autoRollbackEnabled).toBe(true);
    });

    it('should provide migration status', () => {
      const migrationStatus = migrationOrchestrator.getMigrationStatus();
      
      expect(migrationStatus).toBeDefined();
      expect(migrationStatus?.status).toMatch(/not_started|in_progress|paused|completed|failed/);
      expect(migrationStatus?.currentPhase).toBeGreaterThanOrEqual(0);
      expect(migrationStatus?.overallProgress).toBeGreaterThanOrEqual(0);
      expect(migrationStatus?.overallProgress).toBeLessThanOrEqual(100);
    });

    it('should handle phase management', async () => {
      const initialStatus = migrationOrchestrator.getMigrationStatus();
      expect(initialStatus?.status).toBe('not_started');
      
      // Test pause functionality
      await migrationOrchestrator.pausePhase(1);
      const pausedStatus = migrationOrchestrator.getMigrationStatus();
      expect(pausedStatus?.status).toBe('paused');
      
      // Test resume functionality
      await migrationOrchestrator.resumePhase(1);
      const resumedStatus = migrationOrchestrator.getMigrationStatus();
      expect(resumedStatus?.status).toBe('in_progress');
    });

    it('should handle emergency stop', async () => {
      // First enable some feature flags
      featureFlagsService.updateFlag('test-emergency', {
        name: 'test-emergency',
        enabled: true,
        rolloutPercentage: 50,
        fallbackEnabled: true
      });
      
      // Trigger emergency stop
      await migrationOrchestrator.emergencyStop();
      
      const status = migrationOrchestrator.getMigrationStatus();
      expect(status?.status).toBe('failed');
    });
  });

  describe('Integration Tests', () => {
    it('should coordinate dashboard and orchestrator data', async () => {
      // Get data from both services
      const dashboardData = await dashboardService.getDashboardData();
      const migrationStatus = migrationOrchestrator.getMigrationStatus();
      
      // Verify data consistency
      expect(dashboardData.timestamp).toBeInstanceOf(Date);
      expect(migrationStatus?.status).toBeDefined();
      
      // Both should report on the same phases
      expect(dashboardData.phases.length).toBeGreaterThan(0);
      expect(migrationStatus?.currentPhase).toBeGreaterThanOrEqual(0);
    });

    it('should handle feature flag updates in dashboard', async () => {
      // Update a feature flag
      featureFlagsService.updateFlag('utilities-concurrency-adapter', {
        enabled: true,
        rolloutPercentage: 25
      });
      
      // Refresh dashboard
      const dashboardData = await dashboardService.refreshDashboard();
      
      // Find the component in dashboard data
      const component = dashboardData.components.find(c => 
        c.featureFlagName === 'utilities-concurrency-adapter'
      );
      
      expect(component).toBeDefined();
      expect(component?.rolloutPercentage).toBe(25);
      expect(component?.status).toMatch(/in_progress|testing/);
    });

    it('should reflect monitoring alerts in dashboard', async () => {
      // Record metrics that should trigger alerts
      const metrics = {
        component: 'test-dashboard-integration',
        phase: 1,
        timestamp: new Date(),
        performance: {
          responseTime: { p50: 100, p95: 600, p99: 800 }, // High response time
          errorRate: 0.02, // High error rate
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
      
      // Wait a moment for alerts to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get dashboard data
      const dashboardData = await dashboardService.refreshDashboard();
      
      // Should show alerts in dashboard
      expect(dashboardData.alerts.total).toBeGreaterThan(0);
      expect(dashboardData.systemHealth).toMatch(/warning|critical/);
    });

    it('should stop real-time updates when requested', () => {
      // Stop dashboard updates
      dashboardService.stopRealTimeUpdates();
      
      // This should not throw an error
      expect(() => dashboardService.stopRealTimeUpdates()).not.toThrow();
    });
  });
});
