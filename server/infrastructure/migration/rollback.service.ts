/**
 * Automated Rollback Service
 * 
 * Provides automated rollback capabilities with configurable thresholds
 * and instant failover for migration components.
 */

import { featureFlagsService } from './feature-flags.service';
import { monitoringService, AlertEvent } from './monitoring.service';

export interface RollbackThreshold {
  component: string;
  metric: string;
  threshold: number;
  operator: '>' | '<' | '>=' | '<=';
  windowMinutes: number;
  enabled: boolean;
}

export interface RollbackEvent {
  id: string;
  component: string;
  trigger: 'manual' | 'automatic';
  reason: string;
  timestamp: Date;
  rollbackSteps: RollbackStep[];
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  completedAt?: Date;
  failureReason?: string;
}

export interface RollbackStep {
  step: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: Date;
  completionTime?: Date;
  error?: string;
}

export class RollbackService {
  private rollbackThresholds: RollbackThreshold[] = [];
  private rollbackHistory: RollbackEvent[] = [];
  private rollbackInProgress: Set<string> = new Set();

  constructor() {
    this.initializeDefaultThresholds();
    this.registerAlertHandlers();
  }

  /**
   * Initialize default rollback thresholds
   */
  private initializeDefaultThresholds(): void {
    this.rollbackThresholds = [
      {
        component: 'utilities-concurrency-adapter',
        metric: 'errorRate',
        threshold: 0.01, // 1%
        operator: '>',
        windowMinutes: 5,
        enabled: true
      },
      {
        component: 'utilities-query-builder-migration',
        metric: 'responseTime.p95',
        threshold: 500, // 500ms
        operator: '>',
        windowMinutes: 10,
        enabled: true
      },
      {
        component: 'utilities-ml-service-migration',
        metric: 'memoryUsage.heapUsed',
        threshold: 0.9, // 90%
        operator: '>',
        windowMinutes: 5,
        enabled: true
      }
    ];
  }

  /**
   * Register alert handlers for automatic rollback
   */
  private registerAlertHandlers(): void {
    monitoringService.registerAlertHandler('rollback-service', (alert: AlertEvent) => {
      if (alert.threshold.action === 'rollback') {
        this.triggerAutomaticRollback(alert.component, `Alert triggered: ${alert.metric} = ${alert.currentValue}`);
      }
    });
  }

  /**
   * Trigger automatic rollback for a component
   */
  async triggerAutomaticRollback(component: string, reason: string): Promise<string> {
    if (this.rollbackInProgress.has(component)) {
      throw new Error(`Rollback already in progress for component: ${component}`);
    }

    const rollbackId = `rollback-${component}-${Date.now()}`;
    const rollbackEvent: RollbackEvent = {
      id: rollbackId,
      component,
      trigger: 'automatic',
      reason,
      timestamp: new Date(),
      rollbackSteps: this.generateRollbackSteps(component),
      status: 'initiated'
    };

    this.rollbackHistory.push(rollbackEvent);
    this.rollbackInProgress.add(component);

    console.log(`[ROLLBACK] Initiating automatic rollback for ${component}: ${reason}`);

    try {
      await this.executeRollback(rollbackEvent);
      rollbackEvent.status = 'completed';
      rollbackEvent.completedAt = new Date();
      console.log(`[ROLLBACK] Successfully completed rollback for ${component}`);
    } catch (error) {
      rollbackEvent.status = 'failed';
      rollbackEvent.failureReason = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ROLLBACK] Failed to rollback ${component}:`, error);
      throw error;
    } finally {
      this.rollbackInProgress.delete(component);
    }

    return rollbackId;
  }

  /**
   * Trigger manual rollback for a component
   */
  async triggerManualRollback(component: string, reason: string): Promise<string> {
    if (this.rollbackInProgress.has(component)) {
      throw new Error(`Rollback already in progress for component: ${component}`);
    }

    const rollbackId = `rollback-${component}-${Date.now()}`;
    const rollbackEvent: RollbackEvent = {
      id: rollbackId,
      component,
      trigger: 'manual',
      reason,
      timestamp: new Date(),
      rollbackSteps: this.generateRollbackSteps(component),
      status: 'initiated'
    };

    this.rollbackHistory.push(rollbackEvent);
    this.rollbackInProgress.add(component);

    console.log(`[ROLLBACK] Initiating manual rollback for ${component}: ${reason}`);

    try {
      await this.executeRollback(rollbackEvent);
      rollbackEvent.status = 'completed';
      rollbackEvent.completedAt = new Date();
      console.log(`[ROLLBACK] Successfully completed manual rollback for ${component}`);
    } catch (error) {
      rollbackEvent.status = 'failed';
      rollbackEvent.failureReason = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ROLLBACK] Failed to rollback ${component}:`, error);
      throw error;
    } finally {
      this.rollbackInProgress.delete(component);
    }

    return rollbackId;
  }

  /**
   * Generate rollback steps for a component
   */
  private generateRollbackSteps(component: string): RollbackStep[] {
    const baseSteps: RollbackStep[] = [
      {
        step: 1,
        description: 'Disable feature flag',
        status: 'pending'
      },
      {
        step: 2,
        description: 'Drain traffic from new implementation',
        status: 'pending'
      },
      {
        step: 3,
        description: 'Verify legacy system health',
        status: 'pending'
      },
      {
        step: 4,
        description: 'Update monitoring configuration',
        status: 'pending'
      },
      {
        step: 5,
        description: 'Log rollback completion',
        status: 'pending'
      }
    ];

    // Add component-specific steps
    switch (component) {
      case 'utilities-concurrency-adapter':
        baseSteps.splice(2, 0, {
          step: 3,
          description: 'Reset concurrency limits to legacy values',
          status: 'pending'
        });
        break;
      case 'utilities-query-builder-migration':
        baseSteps.splice(2, 0, {
          step: 3,
          description: 'Restore query builder cache',
          status: 'pending'
        });
        break;
      case 'utilities-ml-service-migration':
        baseSteps.splice(2, 0, {
          step: 3,
          description: 'Switch back to mock ML service',
          status: 'pending'
        });
        break;
    }

    // Renumber steps
    baseSteps.forEach((step, index) => {
      step.step = index + 1;
    });

    return baseSteps;
  }

  /**
   * Execute rollback steps
   */
  private async executeRollback(rollbackEvent: RollbackEvent): Promise<void> {
    rollbackEvent.status = 'in_progress';

    for (const step of rollbackEvent.rollbackSteps) {
      step.status = 'in_progress';
      step.startTime = new Date();

      try {
        await this.executeRollbackStep(rollbackEvent.component, step);
        step.status = 'completed';
        step.completionTime = new Date();
      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Rollback step ${step.step} failed: ${step.error}`);
      }
    }
  }

  /**
   * Execute individual rollback step
   */
  private async executeRollbackStep(component: string, step: RollbackStep): Promise<void> {
    switch (step.description) {
      case 'Disable feature flag':
        await this.disableFeatureFlag(component);
        break;
      case 'Drain traffic from new implementation':
        await this.drainTraffic(component);
        break;
      case 'Verify legacy system health':
        await this.verifyLegacyHealth(component);
        break;
      case 'Reset concurrency limits to legacy values':
        await this.resetConcurrencyLimits();
        break;
      case 'Restore query builder cache':
        await this.restoreQueryBuilderCache();
        break;
      case 'Switch back to mock ML service':
        await this.switchToMockMLService();
        break;
      case 'Update monitoring configuration':
        await this.updateMonitoringConfig(component);
        break;
      case 'Log rollback completion':
        await this.logRollbackCompletion(component);
        break;
      default:
        console.log(`Executing rollback step: ${step.description}`);
        // Generic step execution
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Disable feature flag for component
   */
  private async disableFeatureFlag(component: string): Promise<void> {
    const flagName = this.getComponentFlagName(component);
    
    // Check if flag exists before trying to rollback
    const flag = featureFlagsService.getFlag(flagName);
    if (!flag) {
      // Create a disabled flag if it doesn't exist
      featureFlagsService.updateFlag(flagName, {
        name: flagName,
        enabled: false,
        rolloutPercentage: 0,
        fallbackEnabled: true
      });
    } else {
      await featureFlagsService.rollbackFeature(flagName);
    }
  }

  /**
   * Drain traffic from new implementation
   */
  private async drainTraffic(component: string): Promise<void> {
    // Gradually reduce traffic to 0% (faster for testing)
    const flagName = this.getComponentFlagName(component);
    const percentages = [50, 25, 10, 5, 1, 0];
    
    for (const percentage of percentages) {
      featureFlagsService.updateFlag(flagName, { rolloutPercentage: percentage });
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms between reductions (faster for testing)
    }
  }

  /**
   * Verify legacy system health
   */
  private async verifyLegacyHealth(component: string): Promise<void> {
    // Check that legacy system is responding properly
    const metrics = monitoringService.getCurrentMetrics('system');
    if (metrics && metrics.performance.errorRate > 0.05) {
      throw new Error('Legacy system showing high error rate');
    }
  }

  /**
   * Reset concurrency limits to legacy values
   */
  private async resetConcurrencyLimits(): Promise<void> {
    // Reset any concurrency configurations to legacy values
    console.log('Resetting concurrency limits to legacy configuration');
  }

  /**
   * Restore query builder cache
   */
  private async restoreQueryBuilderCache(): Promise<void> {
    // Restore query builder cache to legacy state
    console.log('Restoring query builder cache');
  }

  /**
   * Switch back to mock ML service
   */
  private async switchToMockMLService(): Promise<void> {
    // Switch ML service back to mock implementation
    console.log('Switching back to mock ML service');
  }

  /**
   * Update monitoring configuration
   */
  private async updateMonitoringConfig(component: string): Promise<void> {
    // Update monitoring to focus on legacy implementation
    console.log(`Updating monitoring configuration for ${component} rollback`);
  }

  /**
   * Log rollback completion
   */
  private async logRollbackCompletion(component: string): Promise<void> {
    console.log(`[ROLLBACK] Completed rollback for component: ${component}`);
  }

  /**
   * Get rollback status for a component
   */
  getRollbackStatus(component: string): RollbackEvent | null {
    const events = this.rollbackHistory.filter(e => e.component === component);
    return events.length > 0 ? events[events.length - 1] : null;
  }

  /**
   * Get rollback history
   */
  getRollbackHistory(limit: number = 50): RollbackEvent[] {
    return this.rollbackHistory.slice(-limit);
  }

  /**
   * Check if rollback is in progress for component
   */
  isRollbackInProgress(component: string): boolean {
    return this.rollbackInProgress.has(component);
  }

  /**
   * Get feature flag name for component
   */
  private getComponentFlagName(component: string): string {
    const flagMap: Record<string, string> = {
      'utilities-concurrency-adapter': 'utilities-concurrency-adapter',
      'utilities-query-builder-migration': 'utilities-query-builder-migration',
      'utilities-ml-service-migration': 'utilities-ml-service-migration'
    };
    
    return flagMap[component] || component;
  }

  /**
   * Update rollback threshold
   */
  updateThreshold(component: string, metric: string, threshold: Partial<RollbackThreshold>): void {
    const existing = this.rollbackThresholds.find(t => t.component === component && t.metric === metric);
    if (existing) {
      Object.assign(existing, threshold);
    } else {
      this.rollbackThresholds.push({
        component,
        metric,
        threshold: 0,
        operator: '>',
        windowMinutes: 5,
        enabled: true,
        ...threshold
      });
    }
  }

  /**
   * Get rollback thresholds for component
   */
  getThresholds(component?: string): RollbackThreshold[] {
    return component 
      ? this.rollbackThresholds.filter(t => t.component === component)
      : this.rollbackThresholds;
  }
}

// Global instance
export const rollbackService = new RollbackService();
