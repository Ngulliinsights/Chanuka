/**
 * Migration Infrastructure Index
 * 
 * Exports all migration infrastructure services and types for easy importing.
 */

// Feature Flags Service
export { 
  FeatureFlagsService, 
  featureFlagsService,
  type FeatureFlag,
  type ABTestingMetrics 
} from './feature-flags.service';

// A/B Testing Service
export { 
  ABTestingService, 
  abTestingService,
  type CohortMetrics,
  type StatisticalSignificanceResult,
  type BehaviorAnalysis 
} from './ab-testing.service';

// Monitoring Service
export { 
  MonitoringService, 
  monitoringService,
  type MigrationMetrics,
  type AlertThreshold,
  type AlertEvent 
} from './monitoring.service';

// Rollback Service
export { 
  RollbackService, 
  rollbackService,
  type RollbackThreshold,
  type RollbackEvent,
  type RollbackStep 
} from './rollback.service';

// Validation Service
export { 
  ValidationService, 
  validationService,
  type ValidationRule,
  type ValidationContext,
  type ValidationResult,
  type ValidationDetail 
} from './validation.service';

// Import services for internal use
import { dashboardService } from './dashboard.service';
import { migrationOrchestrator } from './orchestrator.service';

// Dashboard Service
export { 
  DashboardService, 
  dashboardService,
  type DashboardMetrics,
  type PhaseStatus,
  type ComponentStatus,
  type AlertSummary,
  type PerformanceSummary,
  type ABTestingSummary,
  type RollbackSummary 
} from './dashboard.service';

// Migration Orchestrator
export { 
  MigrationOrchestrator, 
  migrationOrchestrator,
  type MigrationPlan,
  type MigrationPhase,
  type MigrationComponent,
  type MigrationStatus 
} from './orchestrator.service';

// Migration API
export { migrationApiRouter } from './migration-api';

// Database Schema
export { 
  migrationTables,
  migrationPhases,
  migrationComponents,
  dataValidationCheckpoints,
  migrationMetrics,
  abTestingCohorts,
  statisticalResults,
  rollbackEvents,
  alertEvents,
  interPhaseValidation,
  userBehaviorTracking 
} from './migration-state.schema';

/**
 * Migration Infrastructure Manager
 * 
 * Provides a unified interface for managing all migration infrastructure components.
 */
export class MigrationInfrastructure {
  constructor() {
    this.initializeServices();
  }

  /**
   * Initialize all migration services
   */
  private initializeServices(): void {
    console.log('[Migration Infrastructure] Initializing migration infrastructure services...');
    
    // Services are initialized via their global instances
    // Additional initialization logic can be added here
    
    console.log('[Migration Infrastructure] All services initialized successfully');
    console.log('[Migration Infrastructure] Dashboard service started with real-time updates');
    console.log('[Migration Infrastructure] Migration orchestrator ready for automated workflows');
  }

  /**
   * Start a new migration phase
   */
  async startMigrationPhase(phase: number, components: string[]): Promise<void> {
    console.log(`[Migration Infrastructure] Starting migration phase ${phase} with components:`, components);
    
    // Initialize feature flags for components
    for (const component of components) {
      const flagName = `phase-${phase}-${component}`;
      featureFlagsService.updateFlag(flagName, {
        name: flagName,
        enabled: false,
        rolloutPercentage: 0,
        fallbackEnabled: true
      });
    }
    
    console.log(`[Migration Infrastructure] Phase ${phase} initialized`);
  }

  /**
   * Enable gradual rollout for a component
   */
  async enableGradualRollout(component: string, targetPercentage: number): Promise<void> {
    console.log(`[Migration Infrastructure] Enabling gradual rollout for ${component}: ${targetPercentage}%`);
    
    await featureFlagsService.enableGradualRollout(component, targetPercentage);
    
    // Start monitoring for the component
    const metrics = monitoringService.getCurrentMetrics(component);
    if (metrics) {
      console.log(`[Migration Infrastructure] Current metrics for ${component}:`, {
        errorRate: metrics.performance.errorRate,
        responseTime: metrics.performance.responseTime.p95,
        memoryUsage: metrics.performance.memoryUsage.heapUsed
      });
    }
  }

  /**
   * Run validation checkpoint for a component
   */
  async runValidationCheckpoint(component: string, phase: number): Promise<boolean> {
    console.log(`[Migration Infrastructure] Running validation checkpoint for ${component} (Phase ${phase})`);
    
    const context = {
      component,
      phase,
      sampleSize: 1000,
      timeWindow: 60
    };
    
    const results = await validationService.runValidationCheckpoint(component, context);
    const allPassed = results.every(r => r.passed);
    
    console.log(`[Migration Infrastructure] Validation checkpoint ${allPassed ? 'PASSED' : 'FAILED'} for ${component}`);
    
    if (!allPassed) {
      const criticalIssues = results.reduce((sum, r) => sum + r.criticalIssues, 0);
      console.error(`[Migration Infrastructure] Found ${criticalIssues} critical issues in validation`);
    }
    
    return allPassed;
  }

  /**
   * Trigger rollback for a component
   */
  async triggerRollback(component: string, reason: string): Promise<string> {
    console.log(`[Migration Infrastructure] Triggering rollback for ${component}: ${reason}`);
    
    const rollbackId = await rollbackService.triggerManualRollback(component, reason);
    
    console.log(`[Migration Infrastructure] Rollback initiated with ID: ${rollbackId}`);
    
    return rollbackId;
  }

  /**
   * Get migration dashboard data
   */
  async getDashboardData(): Promise<any> {
    const dashboardData = await dashboardService.getDashboardData();
    return {
      dashboard: dashboardData,
      monitoring: monitoringService.getDashboardData(),
      rollbacks: rollbackService.getRollbackHistory(10),
      orchestrator: migrationOrchestrator.getMigrationStatus(),
      featureFlags: {
        // Get current feature flag states
        'utilities-concurrency-adapter': featureFlagsService.getFlag('utilities-concurrency-adapter'),
        'utilities-query-builder-migration': featureFlagsService.getFlag('utilities-query-builder-migration'),
        'utilities-ml-service-migration': featureFlagsService.getFlag('utilities-ml-service-migration')
      }
    };
  }

  /**
   * Start automated migration process
   */
  async startMigration(): Promise<void> {
    console.log('[Migration Infrastructure] Starting automated migration process...');
    await migrationOrchestrator.startMigration();
  }

  /**
   * Subscribe to real-time dashboard updates
   */
  subscribeToDashboard(callback: (data: any) => void): () => void {
    return dashboardService.subscribe(callback);
  }

  /**
   * Health check for migration infrastructure
   */
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check monitoring service
    try {
      const dashboardData = monitoringService.getDashboardData();
      if (dashboardData.systemHealth === 'critical') {
        issues.push('Critical system health alerts detected');
      }
    } catch (error) {
      issues.push('Monitoring service health check failed');
    }
    
    // Check for active rollbacks
    const activeRollbacks = rollbackService.getRollbackHistory(5)
      .filter(r => r.status === 'in_progress');
    
    if (activeRollbacks.length > 0) {
      issues.push(`${activeRollbacks.length} rollbacks currently in progress`);
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }
}

// Global migration infrastructure instance
export const migrationInfrastructure = new MigrationInfrastructure();