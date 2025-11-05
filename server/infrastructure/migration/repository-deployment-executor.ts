import { 
  RepositoryDeploymentValidator, 
  createRepositoryDeploymentValidator,
  ValidationResult,
  StatisticalAnalysisResult,
  CrossPhaseValidationResult
} from './repository-deployment-validator.js';
import { 
  DeploymentOrchestrator, 
  createDeploymentOrchestrator,
  DeploymentPlan,
  DeploymentStatus
} from './deployment-orchestrator.js';
import { logger } from '@/shared/core';
import {
  AsyncServiceResult,
  withResultHandling,
  ResultAdapter
} from '../errors/result-adapter.js';

export interface RepositoryDeploymentConfig {
  rolloutPercentage: number;
  validationEnabled: boolean;
  abTestingEnabled: boolean;
  crossPhaseValidationEnabled: boolean;
  automaticRollbackEnabled: boolean;
  extendedValidationPeriod: boolean; // For larger sample sizes
}

export interface DeploymentExecutionResult {
  deploymentStatus: DeploymentStatus;
  validationResults: {
    performanceImprovement: ValidationResult;
    codeComplexityReduction: ValidationResult;
    dataConsistency: ValidationResult;
    userExperience: ValidationResult;
    crossPhaseValidation: CrossPhaseValidationResult;
  };
  statisticalAnalysis: StatisticalAnalysisResult;
  requirementCompliance: {
    requirement_4_3_performance: boolean; // 15% improvement
    requirement_4_4_complexity: boolean; // 40% reduction
    requirement_4_5_consistency: boolean; // Zero data issues
    requirement_4_6_parallel: boolean; // Cross-phase validation
  };
  recommendations: string[];
  rollbackRequired: boolean;
}

/**
 * Repository Deployment Executor
 * 
 * Orchestrates the complete deployment and validation of repository migration
 * according to task 5.6 requirements:
 * - Deploy repository changes with parallel implementation and detailed A/B testing
 * - Validate 15% performance improvement requirement with statistical analysis
 * - Monitor 40% code complexity reduction achievement with automated metrics
 * - Test comprehensive A/B testing with cohort tracking and user experience monitoring
 * - Ensure zero data consistency issues with extensive validation checkpoints
 * - Run cross-phase data validation ensuring consistency between error handling and repository layers
 */
export class RepositoryDeploymentExecutor {
  private config: RepositoryDeploymentConfig;
  private validator: RepositoryDeploymentValidator;
  private orchestrator: DeploymentOrchestrator;

  constructor(config: RepositoryDeploymentConfig) {
    this.config = config;
    this.validator = createRepositoryDeploymentValidator(config.rolloutPercentage);
    this.orchestrator = createDeploymentOrchestrator(this.createDeploymentPlan());
  }

  /**
   * Execute complete repository deployment with validation
   * This is the main entry point for task 5.6
   */
  async executeDeployment(): AsyncServiceResult<DeploymentExecutionResult> {
    return withResultHandling(async () => {
      logger.info('Starting repository deployment execution for task 5.6', {
        component: 'RepositoryDeploymentExecutor',
        config: this.config
      });

      // Step 1: Initialize validation baseline
      await this.validator.initializeValidation();

      // Step 2: Execute phased deployment with A/B testing
      const deploymentStatus = await this.executeParallelDeployment();

      // Step 3: Run comprehensive validation suite
      const validationResults = await this.runComprehensiveValidation();

      // Step 4: Perform statistical analysis
      const statisticalAnalysis = await this.performStatisticalAnalysis();

      // Step 5: Validate requirement compliance
      const requirementCompliance = await this.validateRequirementCompliance(
        validationResults, 
        statisticalAnalysis
      );

      // Step 6: Generate recommendations and determine rollback necessity
      const { recommendations, rollbackRequired } = await this.generateRecommendations(
        validationResults,
        statisticalAnalysis,
        requirementCompliance
      );

      // Step 7: Execute rollback if required
      if (rollbackRequired && this.config.automaticRollbackEnabled) {
        await this.executeRollback('Automatic rollback due to validation failures');
      }

      const result: DeploymentExecutionResult = {
        deploymentStatus,
        validationResults,
        statisticalAnalysis,
        requirementCompliance,
        recommendations,
        rollbackRequired
      };

      logger.info('Repository deployment execution completed', {
        component: 'RepositoryDeploymentExecutor',
        result: {
          success: !rollbackRequired,
          requirementCompliance,
          recommendations: recommendations.length
        }
      });

      return result;
    }, { service: 'RepositoryDeploymentExecutor', operation: 'executeDeployment' });
  }

  /**
   * Execute parallel implementation deployment with detailed A/B testing
   */
  private async executeParallelDeployment(): Promise<DeploymentStatus> {
    logger.info('Executing parallel implementation deployment', {
      component: 'RepositoryDeploymentExecutor',
      rolloutPercentage: this.config.rolloutPercentage
    });

    // Configure orchestrator for parallel deployment
    this.orchestrator.onRollback(async () => {
      logger.info('Rollback callback triggered - cleaning up parallel implementation');
      await this.cleanupParallelImplementation();
    });

    // Start deployment with monitoring
    const deploymentResult = await this.orchestrator.startDeployment();
    
    if (!deploymentResult.success) {
      throw new Error('Parallel deployment failed');
    }

    return deploymentResult.data;
  }

  /**
   * Run comprehensive validation suite covering all requirements
   */
  private async runComprehensiveValidation(): Promise<DeploymentExecutionResult['validationResults']> {
    logger.info('Running comprehensive validation suite', {
      component: 'RepositoryDeploymentExecutor'
    });

    const [
      performanceImprovement,
      codeComplexityReduction,
      dataConsistency,
      userExperience,
      crossPhaseValidation
    ] = await Promise.all([
      this.validator.validatePerformanceImprovement(),
      this.validator.validateCodeComplexityReduction(),
      this.validator.validateDataConsistency(),
      this.validator.monitorUserExperience(),
      this.validator.runCrossPhaseValidation()
    ]);

    // Validate all results are successful
    const results = [
      performanceImprovement,
      codeComplexityReduction,
      dataConsistency,
      userExperience,
      crossPhaseValidation
    ];

    for (const result of results) {
      if (!result.success) {
        throw new Error(`Validation failed: ${result.error?.message || 'Unknown error'}`);
      }
    }

    return {
      performanceImprovement: performanceImprovement.data,
      codeComplexityReduction: codeComplexityReduction.data,
      dataConsistency: dataConsistency.data,
      userExperience: userExperience.data,
      crossPhaseValidation: crossPhaseValidation.data
    };
  }

  /**
   * Perform statistical analysis with extended validation periods for larger sample sizes
   */
  private async performStatisticalAnalysis(): Promise<StatisticalAnalysisResult> {
    logger.info('Performing statistical analysis with extended validation', {
      component: 'RepositoryDeploymentExecutor',
      extendedValidation: this.config.extendedValidationPeriod
    });

    if (this.config.extendedValidationPeriod) {
      // Wait for larger sample size
      logger.info('Waiting for extended validation period to gather larger sample size');
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds for testing
    }

    const statisticalResult = await this.validator.runABTesting();
    
    if (!statisticalResult.success) {
      throw new Error(`Statistical analysis failed: ${statisticalResult.error?.message || 'Unknown error'}`);
    }

    return statisticalResult.data;
  }

  /**
   * Validate compliance with specific requirements from task 5.6
   */
  private async validateRequirementCompliance(
    validationResults: DeploymentExecutionResult['validationResults'],
    statisticalAnalysis: StatisticalAnalysisResult
  ): Promise<DeploymentExecutionResult['requirementCompliance']> {
    logger.info('Validating requirement compliance', {
      component: 'RepositoryDeploymentExecutor'
    });

    // Requirement 4.3: 15% performance improvement
    const requirement_4_3_performance = 
      validationResults.performanceImprovement.passed &&
      validationResults.performanceImprovement.metrics?.overallImprovement >= 15;

    // Requirement 4.4: 40% code complexity reduction
    const requirement_4_4_complexity = 
      validationResults.codeComplexityReduction.passed &&
      validationResults.codeComplexityReduction.metrics?.complexityReduction >= 40;

    // Requirement 4.5: Zero data consistency issues
    const requirement_4_5_consistency = 
      validationResults.dataConsistency.passed &&
      (validationResults.dataConsistency.inconsistencies?.length || 0) === 0;

    // Requirement 4.6: Cross-phase validation (parallel operation support)
    const requirement_4_6_parallel = 
      validationResults.crossPhaseValidation.overallStatus === 'passed' &&
      validationResults.crossPhaseValidation.errorHandlingConsistency.passed &&
      validationResults.crossPhaseValidation.repositoryDataIntegrity.passed;

    const compliance = {
      requirement_4_3_performance,
      requirement_4_4_complexity,
      requirement_4_5_consistency,
      requirement_4_6_parallel
    };

    logger.info('Requirement compliance assessment completed', {
      component: 'RepositoryDeploymentExecutor',
      compliance
    });

    return compliance;
  }

  /**
   * Generate recommendations and determine if rollback is required
   */
  private async generateRecommendations(
    validationResults: DeploymentExecutionResult['validationResults'],
    statisticalAnalysis: StatisticalAnalysisResult,
    requirementCompliance: DeploymentExecutionResult['requirementCompliance']
  ): Promise<{ recommendations: string[]; rollbackRequired: boolean }> {
    const recommendations: string[] = [];
    let rollbackRequired = false;

    // Check statistical analysis recommendation
    if (statisticalAnalysis.recommendation === 'rollback') {
      recommendations.push('Statistical analysis recommends rollback due to performance degradation');
      rollbackRequired = true;
    } else if (statisticalAnalysis.recommendation === 'extend_test') {
      recommendations.push('Statistical analysis recommends extending test period for larger sample size');
      if (!this.config.extendedValidationPeriod) {
        recommendations.push('Consider enabling extended validation period for future deployments');
      }
    }

    // Check requirement compliance
    if (!requirementCompliance.requirement_4_3_performance) {
      recommendations.push('Performance improvement requirement (15%) not met - consider optimization');
      rollbackRequired = true;
    }

    if (!requirementCompliance.requirement_4_4_complexity) {
      recommendations.push('Code complexity reduction requirement (40%) not met - review implementation');
      rollbackRequired = true;
    }

    if (!requirementCompliance.requirement_4_5_consistency) {
      recommendations.push('Data consistency issues detected - immediate investigation required');
      rollbackRequired = true;
    }

    if (!requirementCompliance.requirement_4_6_parallel) {
      recommendations.push('Cross-phase validation failed - check error handling and data integrity');
      rollbackRequired = true;
    }

    // Check user experience
    if (!validationResults.userExperience.passed) {
      recommendations.push('User experience metrics below acceptable thresholds');
      rollbackRequired = true;
    }

    // Positive recommendations
    if (!rollbackRequired) {
      recommendations.push('All validation requirements met - deployment can proceed');
      recommendations.push('Consider monitoring performance metrics for sustained improvements');
      recommendations.push('Document lessons learned for future migrations');
    }

    // Risk mitigation recommendations
    if (statisticalAnalysis.pValue > 0.01 && statisticalAnalysis.pValue < 0.05) {
      recommendations.push('Statistical significance is marginal - consider extended monitoring');
    }

    if (validationResults.performanceImprovement.metrics?.overallImprovement < 20) {
      recommendations.push('Performance improvement is modest - monitor for regression');
    }

    return { recommendations, rollbackRequired };
  }

  /**
   * Execute rollback procedure
   */
  private async executeRollback(reason: string): Promise<void> {
    logger.error('Executing deployment rollback', {
      component: 'RepositoryDeploymentExecutor',
      reason
    });

    await this.orchestrator.triggerManualRollback(reason);
    await this.cleanupParallelImplementation();
  }

  /**
   * Cleanup parallel implementation resources
   */
  private async cleanupParallelImplementation(): Promise<void> {
    logger.info('Cleaning up parallel implementation resources', {
      component: 'RepositoryDeploymentExecutor'
    });

    // In real implementation, this would:
    // - Reset feature flags to 0%
    // - Clean up any temporary resources
    // - Restore original implementation
    // - Clear caches
    // - Update monitoring dashboards

    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate cleanup time
  }

  /**
   * Create deployment plan optimized for repository migration
   */
  private createDeploymentPlan(): DeploymentPlan {
    const baseRollout = this.config.rolloutPercentage;
    
    return {
      phases: [
        {
          name: 'Repository Migration Initial',
          rolloutPercentage: Math.min(baseRollout, 10),
          duration: this.config.extendedValidationPeriod ? 60 : 30,
          validationRequired: true,
          rollbackThresholds: {
            errorRate: 0.005, // 0.5%
            responseTime: 200,
            userSatisfactionScore: 4.0
          }
        },
        {
          name: 'Repository Migration Expanded',
          rolloutPercentage: baseRollout,
          duration: this.config.extendedValidationPeriod ? 120 : 60,
          validationRequired: true,
          rollbackThresholds: {
            errorRate: 0.003, // 0.3%
            responseTime: 180,
            userSatisfactionScore: 4.2
          }
        }
      ],
      totalDuration: this.config.extendedValidationPeriod ? 180 : 90,
      rollbackStrategy: this.config.automaticRollbackEnabled ? 'immediate' : 'manual',
      monitoringInterval: 15 // 15 seconds for more frequent monitoring
    };
  }

  /**
   * Get current deployment status
   */
  getDeploymentStatus(): DeploymentStatus {
    return this.orchestrator.getDeploymentStatus();
  }

  /**
   * Generate deployment report
   */
  async generateDeploymentReport(): AsyncServiceResult<{
    summary: string;
    metrics: any;
    compliance: any;
    recommendations: string[];
  }> {
    return withResultHandling(async () => {
      const status = this.getDeploymentStatus();
      
      return {
        summary: `Repository deployment ${status.status} with ${status.rolloutPercentage}% rollout`,
        metrics: status.metrics,
        compliance: {
          performanceImprovement: status.metrics.performanceImprovement >= 15,
          codeComplexityReduction: status.metrics.codeComplexityReduction >= 40,
          userSatisfaction: status.metrics.userSatisfactionScore >= 4.0,
          errorRate: status.metrics.errorRate < 0.005
        },
        recommendations: [
          'Monitor sustained performance improvements',
          'Continue cross-phase validation monitoring',
          'Document migration patterns for future use',
          'Plan for legacy code cleanup'
        ]
      };
    }, { service: 'RepositoryDeploymentExecutor', operation: 'generateDeploymentReport' });
  }
}

/**
 * Factory function for creating deployment executor with recommended configuration
 */
export function createRepositoryDeploymentExecutor(
  rolloutPercentage: number = 25,
  options: Partial<RepositoryDeploymentConfig> = {}
): RepositoryDeploymentExecutor {
  const config: RepositoryDeploymentConfig = {
    rolloutPercentage,
    validationEnabled: true,
    abTestingEnabled: true,
    crossPhaseValidationEnabled: true,
    automaticRollbackEnabled: true,
    extendedValidationPeriod: true, // Enable for larger sample sizes
    ...options
  };

  return new RepositoryDeploymentExecutor(config);
}

/**
 * Main execution function for task 5.6
 * This function implements all the requirements from the task description
 */
export async function executeRepositoryDeploymentTask(): AsyncServiceResult<DeploymentExecutionResult> {
  return withResultHandling(async () => {
    logger.info('Executing repository deployment task 5.6', {
      component: 'RepositoryDeploymentTask'
    });

    // Create executor with configuration optimized for task requirements
    const executor = createRepositoryDeploymentExecutor(25, {
      extendedValidationPeriod: true, // For larger sample sizes
      automaticRollbackEnabled: true, // For comprehensive rollback procedures
      crossPhaseValidationEnabled: true // For cross-phase data validation
    });

    // Execute the complete deployment process
    const result = await executor.executeDeployment();

    // Generate final report
    const report = await executor.generateDeploymentReport();
    
    logger.info('Repository deployment task 5.6 completed', {
      component: 'RepositoryDeploymentTask',
      success: !result.rollbackRequired,
      report: report.success ? report.data : null
    });

    return result;
  }, { service: 'RepositoryDeploymentTask', operation: 'executeRepositoryDeploymentTask' });
}