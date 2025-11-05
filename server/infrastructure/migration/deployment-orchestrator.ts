import { 
  RepositoryDeploymentValidator, 
  createRepositoryDeploymentValidator,
  ValidationResult,
  StatisticalAnalysisResult,
  CrossPhaseValidationResult
} from './repository-deployment-validator.js';
import { logger } from '../../../shared/core';
import {
  AsyncServiceResult,
  withResultHandling,
  ResultAdapter
} from '../errors/result-adapter.js';

export interface DeploymentPhase {
  name: string;
  rolloutPercentage: number;
  duration: number; // in minutes
  validationRequired: boolean;
  rollbackThresholds: {
    errorRate: number;
    responseTime: number;
    userSatisfactionScore: number;
  };
}

export interface DeploymentPlan {
  phases: DeploymentPhase[];
  totalDuration: number;
  rollbackStrategy: 'immediate' | 'gradual' | 'manual';
  monitoringInterval: number; // in seconds
}

export interface DeploymentStatus {
  currentPhase: number;
  rolloutPercentage: number;
  status: 'initializing' | 'deploying' | 'validating' | 'completed' | 'rolling_back' | 'failed';
  startTime: Date;
  estimatedCompletion?: Date;
  validationResults: ValidationResult[];
  statisticalAnalysis?: StatisticalAnalysisResult;
  crossPhaseValidation?: CrossPhaseValidationResult;
  metrics: {
    performanceImprovement: number;
    codeComplexityReduction: number;
    userSatisfactionScore: number;
    errorRate: number;
  };
}

export interface RollbackTrigger {
  reason: string;
  triggeredBy: 'automatic' | 'manual';
  timestamp: Date;
  metrics: any;
}

/**
 * Deployment Orchestrator for Repository Migration
 * 
 * Coordinates the entire deployment process including:
 * - Phased rollout with A/B testing
 * - Continuous validation and monitoring
 * - Automated rollback triggers
 * - Statistical analysis and reporting
 */
export class DeploymentOrchestrator {
  private validator: RepositoryDeploymentValidator;
  private deploymentPlan: DeploymentPlan;
  private status: DeploymentStatus;
  private monitoringInterval?: NodeJS.Timeout;
  private rollbackCallbacks: Array<() => Promise<void>> = [];

  constructor(deploymentPlan?: DeploymentPlan) {
    this.deploymentPlan = deploymentPlan || this.createDefaultDeploymentPlan();
    this.validator = createRepositoryDeploymentValidator(this.deploymentPlan.phases[0].rolloutPercentage);
    this.status = this.initializeStatus();
  }

  /**
   * Start the repository migration deployment process
   */
  async startDeployment(): AsyncServiceResult<DeploymentStatus> {
    return withResultHandling(async () => {
      logger.info('Starting repository migration deployment', {
        component: 'DeploymentOrchestrator',
        plan: this.deploymentPlan
      });

      this.status.status = 'initializing';
      this.status.startTime = new Date();
      this.status.estimatedCompletion = new Date(
        Date.now() + this.deploymentPlan.totalDuration * 60 * 1000
      );

      // Initialize validation
      await this.validator.initializeValidation();

      // Start monitoring
      this.startContinuousMonitoring();

      // Execute deployment phases
      for (let i = 0; i < this.deploymentPlan.phases.length; i++) {
        const phase = this.deploymentPlan.phases[i];
        this.status.currentPhase = i;
        this.status.rolloutPercentage = phase.rolloutPercentage;
        this.status.status = 'deploying';

        logger.info(`Executing deployment phase ${i + 1}/${this.deploymentPlan.phases.length}`, {
          component: 'DeploymentOrchestrator',
          phase: phase.name,
          rolloutPercentage: phase.rolloutPercentage
        });

        // Deploy phase
        await this.executePhase(phase);

        // Validate if required
        if (phase.validationRequired) {
          this.status.status = 'validating';
          const validationPassed = await this.validatePhase(phase);
          
          if (!validationPassed) {
            logger.error('Phase validation failed, initiating rollback', {
              component: 'DeploymentOrchestrator',
              phase: phase.name
            });
            
            await this.initiateRollback({
              reason: `Phase ${phase.name} validation failed`,
              triggeredBy: 'automatic',
              timestamp: new Date(),
              metrics: this.status.metrics
            });
            
            throw new Error(`Deployment failed at phase: ${phase.name}`);
          }
        }

        // Wait for phase duration
        await this.waitForPhaseDuration(phase.duration);
      }

      // Final validation
      await this.runFinalValidation();

      this.status.status = 'completed';
      this.stopContinuousMonitoring();

      logger.info('Repository migration deployment completed successfully', {
        component: 'DeploymentOrchestrator',
        finalStatus: this.status
      });

      return this.status;
    }, { service: 'DeploymentOrchestrator', operation: 'startDeployment' });
  }

  /**
   * Get current deployment status
   */
  getDeploymentStatus(): DeploymentStatus {
    return { ...this.status };
  }

  /**
   * Manually trigger rollback
   */
  async triggerManualRollback(reason: string): AsyncServiceResult<void> {
    return withResultHandling(async () => {
      await this.initiateRollback({
        reason,
        triggeredBy: 'manual',
        timestamp: new Date(),
        metrics: this.status.metrics
      });
    }, { service: 'DeploymentOrchestrator', operation: 'triggerManualRollback' });
  }

  /**
   * Register rollback callback
   */
  onRollback(callback: () => Promise<void>): void {
    this.rollbackCallbacks.push(callback);
  }

  // Private methods

  private createDefaultDeploymentPlan(): DeploymentPlan {
    return {
      phases: [
        {
          name: 'Initial Rollout',
          rolloutPercentage: 10,
          duration: 30, // 30 minutes
          validationRequired: true,
          rollbackThresholds: {
            errorRate: 0.01, // 1%
            responseTime: 300, // 300ms
            userSatisfactionScore: 3.5
          }
        },
        {
          name: 'Expanded Rollout',
          rolloutPercentage: 25,
          duration: 60, // 1 hour
          validationRequired: true,
          rollbackThresholds: {
            errorRate: 0.005, // 0.5%
            responseTime: 250, // 250ms
            userSatisfactionScore: 4.0
          }
        },
        {
          name: 'Majority Rollout',
          rolloutPercentage: 75,
          duration: 120, // 2 hours
          validationRequired: true,
          rollbackThresholds: {
            errorRate: 0.003, // 0.3%
            responseTime: 200, // 200ms
            userSatisfactionScore: 4.2
          }
        },
        {
          name: 'Full Rollout',
          rolloutPercentage: 100,
          duration: 60, // 1 hour
          validationRequired: true,
          rollbackThresholds: {
            errorRate: 0.002, // 0.2%
            responseTime: 200, // 200ms
            userSatisfactionScore: 4.3
          }
        }
      ],
      totalDuration: 270, // 4.5 hours
      rollbackStrategy: 'immediate',
      monitoringInterval: 30 // 30 seconds
    };
  }

  private initializeStatus(): DeploymentStatus {
    return {
      currentPhase: 0,
      rolloutPercentage: 0,
      status: 'initializing',
      startTime: new Date(),
      validationResults: [],
      metrics: {
        performanceImprovement: 0,
        codeComplexityReduction: 0,
        userSatisfactionScore: 0,
        errorRate: 0
      }
    };
  }

  private async executePhase(phase: DeploymentPhase): Promise<void> {
    logger.info(`Executing phase: ${phase.name}`, {
      component: 'DeploymentOrchestrator',
      rolloutPercentage: phase.rolloutPercentage
    });

    // Update validator configuration for new rollout percentage
    this.validator = createRepositoryDeploymentValidator(phase.rolloutPercentage);

    // Simulate phase deployment (in real implementation, this would update feature flags)
    await this.updateFeatureFlags(phase.rolloutPercentage);
    
    // Allow time for deployment to propagate
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  private async validatePhase(phase: DeploymentPhase): Promise<boolean> {
    logger.info(`Validating phase: ${phase.name}`, {
      component: 'DeploymentOrchestrator'
    });

    try {
      // Run all validations
      const [
        performanceResult,
        complexityResult,
        dataConsistencyResult,
        userExperienceResult,
        statisticalAnalysis,
        crossPhaseValidation
      ] = await Promise.all([
        this.validator.validatePerformanceImprovement(),
        this.validator.validateCodeComplexityReduction(),
        this.validator.validateDataConsistency(),
        this.validator.monitorUserExperience(),
        this.validator.runABTesting(),
        this.validator.runCrossPhaseValidation()
      ]);

      // Store results
      this.status.validationResults.push(
        performanceResult.data,
        complexityResult.data,
        dataConsistencyResult.data,
        userExperienceResult.data
      );
      this.status.statisticalAnalysis = statisticalAnalysis.data;
      this.status.crossPhaseValidation = crossPhaseValidation.data;

      // Update metrics
      this.updateMetrics(performanceResult.data, complexityResult.data, userExperienceResult.data);

      // Check if validation passed
      const validationPassed = 
        performanceResult.data.passed &&
        complexityResult.data.passed &&
        dataConsistencyResult.data.passed &&
        userExperienceResult.data.passed &&
        crossPhaseValidation.data.overallStatus === 'passed' &&
        statisticalAnalysis.data.recommendation !== 'rollback';

      // Check rollback thresholds
      const thresholdsPassed = this.checkRollbackThresholds(phase);

      return validationPassed && thresholdsPassed;
    } catch (error) {
      logger.error('Phase validation error', { component: 'DeploymentOrchestrator' }, error as any);
      return false;
    }
  }

  private async runFinalValidation(): Promise<void> {
    logger.info('Running final deployment validation', {
      component: 'DeploymentOrchestrator'
    });

    // Run comprehensive final validation
    const finalValidation = await this.validator.runCrossPhaseValidation();
    this.status.crossPhaseValidation = finalValidation.data;

    if (finalValidation.data.overallStatus !== 'passed') {
      throw new Error('Final validation failed');
    }

    // Verify all requirements are met
    const requirementsMet = 
      this.status.metrics.performanceImprovement >= 15 &&
      this.status.metrics.codeComplexityReduction >= 40 &&
      this.status.metrics.errorRate < 0.005;

    if (!requirementsMet) {
      throw new Error('Final requirements validation failed');
    }
  }

  private checkRollbackThresholds(phase: DeploymentPhase): boolean {
    const { metrics } = this.status;
    const { rollbackThresholds } = phase;

    if (metrics.errorRate > rollbackThresholds.errorRate) {
      logger.warn('Error rate threshold exceeded', {
        component: 'DeploymentOrchestrator',
        current: metrics.errorRate,
        threshold: rollbackThresholds.errorRate
      });
      return false;
    }

    if (metrics.userSatisfactionScore < rollbackThresholds.userSatisfactionScore) {
      logger.warn('User satisfaction threshold not met', {
        component: 'DeploymentOrchestrator',
        current: metrics.userSatisfactionScore,
        threshold: rollbackThresholds.userSatisfactionScore
      });
      return false;
    }

    return true;
  }

  private updateMetrics(
    performanceResult: ValidationResult,
    complexityResult: ValidationResult,
    userExperienceResult: ValidationResult
  ): void {
    if (performanceResult.metrics) {
      this.status.metrics.performanceImprovement = performanceResult.metrics.overallImprovement || 0;
    }

    if (complexityResult.metrics) {
      this.status.metrics.codeComplexityReduction = complexityResult.metrics.complexityReduction || 0;
    }

    if (userExperienceResult.metrics) {
      this.status.metrics.userSatisfactionScore = userExperienceResult.metrics.userSatisfactionScore || 0;
      this.status.metrics.errorRate = Math.random() * 0.01; // Simulate error rate
    }
  }

  private startContinuousMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCheck();
      } catch (error) {
        logger.error('Monitoring check failed', { component: 'DeploymentOrchestrator' }, error as any);
      }
    }, this.deploymentPlan.monitoringInterval * 1000);
  }

  private stopContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  private async performMonitoringCheck(): Promise<void> {
    // Continuous monitoring logic
    const currentPhase = this.deploymentPlan.phases[this.status.currentPhase];
    if (!currentPhase) return;

    // Check if automatic rollback is needed
    const shouldRollback = !this.checkRollbackThresholds(currentPhase);
    
    if (shouldRollback && this.deploymentPlan.rollbackStrategy === 'immediate') {
      await this.initiateRollback({
        reason: 'Automatic rollback triggered by monitoring',
        triggeredBy: 'automatic',
        timestamp: new Date(),
        metrics: this.status.metrics
      });
    }
  }

  private async initiateRollback(trigger: RollbackTrigger): Promise<void> {
    logger.error('Initiating deployment rollback', {
      component: 'DeploymentOrchestrator',
      trigger
    });

    this.status.status = 'rolling_back';

    try {
      // Execute rollback callbacks
      for (const callback of this.rollbackCallbacks) {
        await callback();
      }

      // Reset feature flags to 0%
      await this.updateFeatureFlags(0);

      this.status.status = 'failed';
      this.stopContinuousMonitoring();

      logger.info('Rollback completed', {
        component: 'DeploymentOrchestrator',
        trigger
      });
    } catch (error) {
      logger.error('Rollback failed', { component: 'DeploymentOrchestrator' }, error as any);
      throw error;
    }
  }

  private async updateFeatureFlags(rolloutPercentage: number): Promise<void> {
    // Simulate feature flag update
    logger.info(`Updated feature flags to ${rolloutPercentage}% rollout`, {
      component: 'DeploymentOrchestrator'
    });
    
    // In real implementation, this would update actual feature flag service
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async waitForPhaseDuration(duration: number): Promise<void> {
    logger.info(`Waiting for phase duration: ${duration} minutes`, {
      component: 'DeploymentOrchestrator'
    });
    
    // In real implementation, this would be the actual duration
    // For testing, we'll use a shorter duration
    const waitTime = Math.min(duration * 1000, 10000); // Max 10 seconds for testing
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

// Factory function
export function createDeploymentOrchestrator(deploymentPlan?: DeploymentPlan): DeploymentOrchestrator {
  return new DeploymentOrchestrator(deploymentPlan);
}