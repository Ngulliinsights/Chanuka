/**
 * Migration Orchestrator Service
 * 
 * Coordinates all migration infrastructure components and provides a unified
 * interface for managing the entire migration process with automated workflows.
 */

import { featureFlagsService } from './feature-flags.service';
import { abTestingService } from './ab-testing.service';
import { monitoringService } from './monitoring.service';
import { rollbackService } from './rollback.service';
import { validationService } from './validation.service';
import { dashboardService } from './dashboard.service';

export interface MigrationPlan {
  phases: MigrationPhase[];
  globalSettings: {
    rolloutStrategy: 'conservative' | 'moderate' | 'aggressive';
    validationRequired: boolean;
    autoRollbackEnabled: boolean;
    maxConcurrentPhases: number;
  };
}

export interface MigrationPhase {
  phase: number;
  name: string;
  components: MigrationComponent[];
  dependencies: number[]; // Phase numbers this phase depends on
  rolloutSchedule: RolloutSchedule;
  validationRules: string[];
}

export interface MigrationComponent {
  name: string;
  flagName: string;
  legacyImplementation: string;
  newImplementation: string;
  rolloutPercentages: number[];
  validationCheckpoints: string[];
  rollbackThresholds: {
    errorRate: number;
    responseTime: number;
    memoryUsage: number;
  };
}

export interface RolloutSchedule {
  startDelay: number; // minutes after dependencies complete
  rolloutSteps: RolloutStep[];
  validationBetweenSteps: boolean;
  autoAdvance: boolean;
}

export interface RolloutStep {
  percentage: number;
  duration: number; // minutes to stay at this percentage
  validationRequired: boolean;
  approvalRequired: boolean;
}

export interface MigrationStatus {
  currentPhase: number;
  overallProgress: number;
  phasesCompleted: number;
  componentsActive: number;
  validationsPassed: number;
  validationsFailed: number;
  rollbacksTriggered: number;
  estimatedCompletion: Date;
  status: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'failed';
}

export class MigrationOrchestrator {
  private migrationPlan: MigrationPlan | null = null;
  private migrationStatus: MigrationStatus | null = null;
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private pausedComponents: Set<string> = new Set();

  constructor() {
    this.initializeDefaultPlan();
    this.setupAutomatedWorkflows();
  }

  /**
   * Initialize default migration plan
   */
  private initializeDefaultPlan(): void {
    this.migrationPlan = {
      phases: [
        {
          phase: 1,
          name: 'Utilities Migration',
          components: [
            {
              name: 'concurrency-adapter',
              flagName: 'utilities-concurrency-adapter',
              legacyImplementation: 'shared/core/src/utils/race-condition-prevention.ts',
              newImplementation: 'server/infrastructure/concurrency/adapter.ts',
              rolloutPercentages: [1, 5, 10, 25, 50, 100],
              validationCheckpoints: ['concurrency-behavior-consistency'],
              rollbackThresholds: {
                errorRate: 0.01,
                responseTime: 500,
                memoryUsage: 0.9
              }
            },
            {
              name: 'query-builder',
              flagName: 'utilities-query-builder-migration',
              legacyImplementation: 'server/features/search/services/query-builder.service.ts',
              newImplementation: 'direct-drizzle-usage-in-services',
              rolloutPercentages: [100], // Migration completed - query builder removed
              validationCheckpoints: ['query-result-consistency'],
              rollbackThresholds: {
                errorRate: 0.01,
                responseTime: 200,
                memoryUsage: 0.85
              },
              status: 'completed'
            },
            {
              name: 'ml-service',
              flagName: 'utilities-ml-service-migration',
              legacyImplementation: 'server/features/analytics/services/ml.service.ts',
              newImplementation: 'server/infrastructure/ml/real-ml.service.ts',
              rolloutPercentages: [1, 5, 10, 25, 50, 100],
              validationCheckpoints: ['ml-output-consistency'],
              rollbackThresholds: {
                errorRate: 0.02,
                responseTime: 1000,
                memoryUsage: 0.9
              }
            }
          ],
          dependencies: [],
          rolloutSchedule: {
            startDelay: 0,
            rolloutSteps: [
              { percentage: 1, duration: 60, validationRequired: true, approvalRequired: false },
              { percentage: 5, duration: 120, validationRequired: true, approvalRequired: false },
              { percentage: 10, duration: 180, validationRequired: true, approvalRequired: true },
              { percentage: 25, duration: 240, validationRequired: true, approvalRequired: true },
              { percentage: 50, duration: 360, validationRequired: true, approvalRequired: true },
              { percentage: 100, duration: 0, validationRequired: true, approvalRequired: true }
            ],
            validationBetweenSteps: true,
            autoAdvance: false
          },
          validationRules: ['api-compatibility-check', 'performance-regression-check']
        }
        // Additional phases would be defined here
      ],
      globalSettings: {
        rolloutStrategy: 'conservative',
        validationRequired: true,
        autoRollbackEnabled: true,
        maxConcurrentPhases: 1
      }
    };

    this.migrationStatus = {
      currentPhase: 0,
      overallProgress: 0,
      phasesCompleted: 0,
      componentsActive: 0,
      validationsPassed: 0,
      validationsFailed: 0,
      rollbacksTriggered: 0,
      estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'not_started'
    };
  }

  /**
   * Setup automated workflows and monitoring
   */
  private setupAutomatedWorkflows(): void {
    // Register rollback handler for automatic rollbacks
    monitoringService.registerAlertHandler('orchestrator', async (alert) => {
      if (alert.threshold.action === 'rollback') {
        await this.handleAutomaticRollback(alert.component, alert);
      }
    });

    // Start periodic status updates
    setInterval(() => {
      this.updateMigrationStatus();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Start migration process
   */
  async startMigration(): Promise<void> {
    if (!this.migrationPlan) {
      throw new Error('No migration plan defined');
    }

    console.log('[Migration Orchestrator] Starting migration process...');
    
    this.migrationStatus!.status = 'in_progress';
    this.migrationStatus!.currentPhase = 1;

    // Start first phase
    await this.startPhase(1);
  }

  /**
   * Start specific migration phase
   */
  async startPhase(phaseNumber: number): Promise<void> {
    const phase = this.migrationPlan?.phases.find(p => p.phase === phaseNumber);
    if (!phase) {
      throw new Error(`Phase ${phaseNumber} not found in migration plan`);
    }

    console.log(`[Migration Orchestrator] Starting Phase ${phaseNumber}: ${phase.name}`);

    // Check dependencies
    for (const depPhase of phase.dependencies) {
      if (!await this.isPhaseCompleted(depPhase)) {
        throw new Error(`Phase ${phaseNumber} depends on Phase ${depPhase} which is not completed`);
      }
    }

    // Initialize components for this phase
    for (const component of phase.components) {
      await this.initializeComponent(component);
    }

    // Start rollout schedule
    await this.executeRolloutSchedule(phase);
  }

  /**
   * Initialize component for migration
   */
  private async initializeComponent(component: MigrationComponent): Promise<void> {
    console.log(`[Migration Orchestrator] Initializing component: ${component.name}`);

    // Create feature flag
    featureFlagsService.updateFlag(component.flagName, {
      name: component.flagName,
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true
    });

    // Setup rollback thresholds
    rollbackService.updateThreshold(component.name, 'errorRate', {
      component: component.name,
      metric: 'errorRate',
      threshold: component.rollbackThresholds.errorRate,
      operator: '>',
      windowMinutes: 5,
      enabled: true
    });

    rollbackService.updateThreshold(component.name, 'responseTime', {
      component: component.name,
      metric: 'responseTime.p95',
      threshold: component.rollbackThresholds.responseTime,
      operator: '>',
      windowMinutes: 10,
      enabled: true
    });

    console.log(`[Migration Orchestrator] Component ${component.name} initialized`);
  }

  /**
   * Execute rollout schedule for a phase
   */
  private async executeRolloutSchedule(phase: MigrationPhase): Promise<void> {
    console.log(`[Migration Orchestrator] Executing rollout schedule for Phase ${phase.phase}`);

    // Wait for start delay
    if (phase.rolloutSchedule.startDelay > 0) {
      console.log(`[Migration Orchestrator] Waiting ${phase.rolloutSchedule.startDelay} minutes before starting rollout`);
      await this.delay(phase.rolloutSchedule.startDelay * 60 * 1000);
    }

    // Execute each rollout step
    for (const [stepIndex, step] of phase.rolloutSchedule.rolloutSteps.entries()) {
      console.log(`[Migration Orchestrator] Executing rollout step ${stepIndex + 1}: ${step.percentage}%`);

      // Update all components to this percentage
      for (const component of phase.components) {
        if (!this.pausedComponents.has(component.name)) {
          await featureFlagsService.enableGradualRollout(component.flagName, step.percentage);
        }
      }

      // Run validation if required
      if (step.validationRequired) {
        const validationPassed = await this.runPhaseValidation(phase);
        if (!validationPassed) {
          console.error(`[Migration Orchestrator] Validation failed at ${step.percentage}% rollout`);
          await this.pausePhase(phase.phase);
          return;
        }
      }

      // Wait for approval if required
      if (step.approvalRequired && !phase.rolloutSchedule.autoAdvance) {
        console.log(`[Migration Orchestrator] Waiting for manual approval at ${step.percentage}% rollout`);
        await this.waitForApproval(phase.phase, step.percentage);
      }

      // Wait for step duration
      if (step.duration > 0) {
        console.log(`[Migration Orchestrator] Monitoring for ${step.duration} minutes at ${step.percentage}% rollout`);
        await this.monitorStep(phase, step);
      }
    }

    console.log(`[Migration Orchestrator] Phase ${phase.phase} rollout completed`);
    await this.completePhase(phase.phase);
  }

  /**
   * Monitor rollout step for issues
   */
  private async monitorStep(phase: MigrationPhase, step: RolloutStep): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + (step.duration * 60 * 1000);

    while (Date.now() < endTime) {
      // Check for critical alerts
      const activeAlerts = monitoringService.getActiveAlerts();
      const criticalAlerts = activeAlerts.filter(a => 
        a.threshold.severity === 'critical' && 
        phase.components.some(c => c.name === a.component)
      );

      if (criticalAlerts.length > 0) {
        console.error(`[Migration Orchestrator] Critical alerts detected during monitoring`);
        for (const alert of criticalAlerts) {
          await this.handleAutomaticRollback(alert.component, alert);
        }
        return;
      }

      // Wait 30 seconds before next check
      await this.delay(30000);
    }
  }

  /**
   * Run validation for entire phase
   */
  private async runPhaseValidation(phase: MigrationPhase): Promise<boolean> {
    console.log(`[Migration Orchestrator] Running validation for Phase ${phase.phase}`);

    let allValidationsPassed = true;

    // Run component-specific validations
    for (const component of phase.components) {
      for (const checkpointName of component.validationCheckpoints) {
        const context = {
          component: component.name,
          phase: phase.phase,
          sampleSize: 1000,
          timeWindow: 60
        };

        const results = await validationService.runValidationCheckpoint(component.name, context);
        const passed = results.every(r => r.passed);

        if (passed) {
          this.migrationStatus!.validationsPassed++;
        } else {
          this.migrationStatus!.validationsFailed++;
          allValidationsPassed = false;
          console.error(`[Migration Orchestrator] Validation failed for ${component.name}: ${checkpointName}`);
        }
      }
    }

    // Run phase-level validations
    for (const validationRule of phase.validationRules) {
      const context = {
        component: 'inter-phase',
        phase: phase.phase
      };

      const results = await validationService.runValidationCheckpoint('inter-phase', context);
      const passed = results.every(r => r.passed);

      if (passed) {
        this.migrationStatus!.validationsPassed++;
      } else {
        this.migrationStatus!.validationsFailed++;
        allValidationsPassed = false;
        console.error(`[Migration Orchestrator] Phase validation failed: ${validationRule}`);
      }
    }

    return allValidationsPassed;
  }

  /**
   * Handle automatic rollback
   */
  private async handleAutomaticRollback(componentName: string, alert: any): Promise<void> {
    console.error(`[Migration Orchestrator] Triggering automatic rollback for ${componentName}`);
    
    try {
      await rollbackService.triggerAutomaticRollback(
        componentName, 
        `Automatic rollback triggered by alert: ${alert.metric} = ${alert.currentValue}`
      );
      
      this.migrationStatus!.rollbacksTriggered++;
      
      // Pause the component
      this.pausedComponents.add(componentName);
      
      console.log(`[Migration Orchestrator] Automatic rollback completed for ${componentName}`);
    } catch (error) {
      console.error(`[Migration Orchestrator] Automatic rollback failed for ${componentName}:`, error);
    }
  }

  /**
   * Wait for manual approval
   */
  private async waitForApproval(phase: number, percentage: number): Promise<void> {
    // In a real implementation, this would integrate with an approval system
    // For now, we'll simulate approval after a short delay
    console.log(`[Migration Orchestrator] Simulating approval for Phase ${phase} at ${percentage}%`);
    await this.delay(5000); // 5 second delay for testing
  }

  /**
   * Pause migration phase
   */
  async pausePhase(phaseNumber: number): Promise<void> {
    console.log(`[Migration Orchestrator] Pausing Phase ${phaseNumber}`);
    
    const phase = this.migrationPlan?.phases.find(p => p.phase === phaseNumber);
    if (phase) {
      for (const component of phase.components) {
        this.pausedComponents.add(component.name);
      }
    }
    
    this.migrationStatus!.status = 'paused';
  }

  /**
   * Resume migration phase
   */
  async resumePhase(phaseNumber: number): Promise<void> {
    console.log(`[Migration Orchestrator] Resuming Phase ${phaseNumber}`);
    
    const phase = this.migrationPlan?.phases.find(p => p.phase === phaseNumber);
    if (phase) {
      for (const component of phase.components) {
        this.pausedComponents.delete(component.name);
      }
    }
    
    this.migrationStatus!.status = 'in_progress';
  }

  /**
   * Complete migration phase
   */
  private async completePhase(phaseNumber: number): Promise<void> {
    console.log(`[Migration Orchestrator] Completing Phase ${phaseNumber}`);
    
    this.migrationStatus!.phasesCompleted++;
    
    // Check if all phases are completed
    if (this.migrationStatus!.phasesCompleted === this.migrationPlan!.phases.length) {
      await this.completeMigration();
    } else {
      // Start next phase if dependencies are met
      const nextPhase = this.migrationPlan!.phases.find(p => 
        p.phase > phaseNumber && 
        p.dependencies.every(dep => dep <= phaseNumber)
      );
      
      if (nextPhase) {
        this.migrationStatus!.currentPhase = nextPhase.phase;
        await this.startPhase(nextPhase.phase);
      }
    }
  }

  /**
   * Complete entire migration
   */
  private async completeMigration(): Promise<void> {
    console.log('[Migration Orchestrator] Migration process completed successfully!');
    
    this.migrationStatus!.status = 'completed';
    this.migrationStatus!.overallProgress = 100;
    
    // Clean up timers
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  /**
   * Check if phase is completed
   */
  private async isPhaseCompleted(phaseNumber: number): Promise<boolean> {
    const phase = this.migrationPlan?.phases.find(p => p.phase === phaseNumber);
    if (!phase) return false;

    // Check if all components are at 100% rollout
    for (const component of phase.components) {
      const flag = featureFlagsService.getFlag(component.flagName);
      if (!flag || flag.rolloutPercentage < 100) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update migration status
   */
  private updateMigrationStatus(): void {
    if (!this.migrationStatus || !this.migrationPlan) return;

    // Calculate overall progress
    let totalProgress = 0;
    let activeComponents = 0;

    for (const phase of this.migrationPlan.phases) {
      for (const component of phase.components) {
        const flag = featureFlagsService.getFlag(component.flagName);
        if (flag) {
          totalProgress += flag.rolloutPercentage;
          if (flag.rolloutPercentage > 0 && flag.rolloutPercentage < 100) {
            activeComponents++;
          }
        }
      }
    }

    const totalComponents = this.migrationPlan.phases.reduce((sum, phase) => sum + phase.components.length, 0);
    this.migrationStatus.overallProgress = Math.round(totalProgress / totalComponents);
    this.migrationStatus.componentsActive = activeComponents;
  }

  /**
   * Get current migration status
   */
  getMigrationStatus(): MigrationStatus | null {
    return this.migrationStatus;
  }

  /**
   * Get migration plan
   */
  getMigrationPlan(): MigrationPlan | null {
    return this.migrationPlan;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Emergency stop - rollback all active migrations
   */
  async emergencyStop(): Promise<void> {
    console.error('[Migration Orchestrator] EMERGENCY STOP - Rolling back all active migrations');
    
    this.migrationStatus!.status = 'failed';
    
    // Rollback all active components
    if (this.migrationPlan) {
      for (const phase of this.migrationPlan.phases) {
        for (const component of phase.components) {
          const flag = featureFlagsService.getFlag(component.flagName);
          if (flag && flag.rolloutPercentage > 0) {
            try {
              await rollbackService.triggerManualRollback(component.name, 'Emergency stop triggered');
            } catch (error) {
              console.error(`Failed to rollback ${component.name}:`, error);
            }
          }
        }
      }
    }
    
    // Clear all timers
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }
}

// Global instance
export const migrationOrchestrator = new MigrationOrchestrator();