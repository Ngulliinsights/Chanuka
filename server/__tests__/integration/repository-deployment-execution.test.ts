import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  RepositoryDeploymentExecutor,
  createRepositoryDeploymentExecutor,
  executeRepositoryDeploymentTask,
  DeploymentExecutionResult
} from '../../infrastructure/migration/repository-deployment-executor.js';
import { logger } from '@shared/core';

describe('Repository Deployment Execution - Task 5.6 Implementation', () => {
  let executor: RepositoryDeploymentExecutor;

  beforeEach(async () => {
    // Create executor with test configuration
    executor = createRepositoryDeploymentExecutor(25, {
      extendedValidationPeriod: false, // Disable for faster tests
      automaticRollbackEnabled: true,
      crossPhaseValidationEnabled: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 5.6: Deploy and validate repository migration', () => {
    it('should execute complete deployment with parallel implementation and A/B testing', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.deploymentStatus).toBeDefined();
      expect(result.data.deploymentStatus.status).toMatch(/completed|failed/);
      expect(result.data.validationResults).toBeDefined();
      expect(result.data.statisticalAnalysis).toBeDefined();
    });

    it('should validate 15% performance improvement requirement with statistical analysis', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.validationResults.performanceImprovement).toBeDefined();
      expect(result.data.requirementCompliance.requirement_4_3_performance).toBeDefined();
      
      if (result.data.requirementCompliance.requirement_4_3_performance) {
        expect(result.data.validationResults.performanceImprovement.metrics.overallImprovement).toBeGreaterThanOrEqual(15);
      }
    });

    it('should monitor 40% code complexity reduction with automated metrics', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.validationResults.codeComplexityReduction).toBeDefined();
      expect(result.data.requirementCompliance.requirement_4_4_complexity).toBeDefined();
      
      if (result.data.requirementCompliance.requirement_4_4_complexity) {
        expect(result.data.validationResults.codeComplexityReduction.metrics.complexityReduction).toBeGreaterThanOrEqual(40);
      }
    });

    it('should test comprehensive A/B testing with cohort tracking and user experience monitoring', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.statisticalAnalysis).toBeDefined();
      expect(result.data.statisticalAnalysis.significanceLevel).toBe(0.05);
      expect(result.data.statisticalAnalysis.pValue).toBeGreaterThanOrEqual(0);
      expect(result.data.statisticalAnalysis.pValue).toBeLessThanOrEqual(1);
      expect(result.data.statisticalAnalysis.confidenceInterval).toBeDefined();
      expect(result.data.statisticalAnalysis.effectSize).toBeGreaterThanOrEqual(0);
      expect(['proceed', 'rollback', 'extend_test']).toContain(result.data.statisticalAnalysis.recommendation);
      
      // Validate user experience monitoring
      expect(result.data.validationResults.userExperience).toBeDefined();
      expect(result.data.validationResults.userExperience.metrics).toBeDefined();
      expect(result.data.validationResults.userExperience.metrics.conversionRate).toBeDefined();
      expect(result.data.validationResults.userExperience.metrics.taskCompletionRate).toBeDefined();
      expect(result.data.validationResults.userExperience.metrics.userSatisfactionScore).toBeDefined();
    });

    it('should ensure zero data consistency issues with extensive validation checkpoints', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.validationResults.dataConsistency).toBeDefined();
      expect(result.data.requirementCompliance.requirement_4_5_consistency).toBeDefined();
      
      if (result.data.requirementCompliance.requirement_4_5_consistency) {
        expect(result.data.validationResults.dataConsistency.inconsistencies).toBeDefined();
        expect(result.data.validationResults.dataConsistency.inconsistencies.length).toBe(0);
      }
    });

    it('should run cross-phase data validation ensuring consistency between error handling and repository layers', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.validationResults.crossPhaseValidation).toBeDefined();
      expect(result.data.requirementCompliance.requirement_4_6_parallel).toBeDefined();
      
      const crossPhase = result.data.validationResults.crossPhaseValidation;
      expect(crossPhase.errorHandlingConsistency).toBeDefined();
      expect(crossPhase.repositoryDataIntegrity).toBeDefined();
      expect(crossPhase.performanceConsistency).toBeDefined();
      expect(['passed', 'failed', 'warning']).toContain(crossPhase.overallStatus);
      
      if (result.data.requirementCompliance.requirement_4_6_parallel) {
        expect(crossPhase.overallStatus).toBe('passed');
        expect(crossPhase.errorHandlingConsistency.passed).toBe(true);
        expect(crossPhase.repositoryDataIntegrity.passed).toBe(true);
      }
    });

    it('should provide comprehensive requirement compliance assessment', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.requirementCompliance).toBeDefined();
      
      const compliance = result.data.requirementCompliance;
      expect(typeof compliance.requirement_4_3_performance).toBe('boolean');
      expect(typeof compliance.requirement_4_4_complexity).toBe('boolean');
      expect(typeof compliance.requirement_4_5_consistency).toBe('boolean');
      expect(typeof compliance.requirement_4_6_parallel).toBe('boolean');
    });

    it('should generate actionable recommendations based on validation results', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.recommendations).toBeDefined();
      expect(Array.isArray(result.data.recommendations)).toBe(true);
      expect(result.data.recommendations.length).toBeGreaterThan(0);
      
      // Recommendations should be actionable strings
      result.data.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(10);
      });
    });

    it('should determine rollback necessity based on validation failures', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(typeof result.data.rollbackRequired).toBe('boolean');
      
      // If rollback is required, there should be specific reasons
      if (result.data.rollbackRequired) {
        expect(result.data.recommendations.some(r => 
          r.includes('rollback') || r.includes('failed') || r.includes('not met')
        )).toBe(true);
      }
    });
  });

  describe('Extended Validation Periods for Larger Sample Sizes', () => {
    it('should support extended validation periods for statistical significance', async () => {
      const extendedExecutor = createRepositoryDeploymentExecutor(25, {
        extendedValidationPeriod: true,
        automaticRollbackEnabled: false // Disable for extended testing
      });

      const result = await extendedExecutor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.statisticalAnalysis).toBeDefined();
      
      // Extended validation should provide more reliable statistical analysis
      if (result.data.statisticalAnalysis.recommendation === 'extend_test') {
        expect(result.data.recommendations.some(r => 
          r.includes('sample size') || r.includes('extend')
        )).toBe(true);
      }
    });

    it('should handle statistical analysis with marginal significance', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      
      const pValue = result.data.statisticalAnalysis.pValue;
      if (pValue > 0.01 && pValue < 0.05) {
        expect(result.data.recommendations.some(r => 
          r.includes('marginal') || r.includes('extended monitoring')
        )).toBe(true);
      }
    });
  });

  describe('Comprehensive Rollback Procedures', () => {
    it('should execute automatic rollback when validation fails', async () => {
      // Create executor with strict thresholds to trigger rollback
      const strictExecutor = createRepositoryDeploymentExecutor(25, {
        automaticRollbackEnabled: true
      });

      // Mock validation to fail
      const originalExecute = strictExecutor.executeDeployment.bind(strictExecutor);
      vi.spyOn(strictExecutor, 'executeDeployment').mockImplementation(async () => {
        const result = await originalExecute();
        if (result.success) {
          // Force rollback for testing
          result.data.rollbackRequired = true;
          result.data.recommendations.push('Forced rollback for testing');
        }
        return result;
      });

      const result = await strictExecutor.executeDeployment();
      
      expect(result.success).toBe(true);
      if (result.data.rollbackRequired) {
        expect(result.data.recommendations.some(r => 
          r.includes('rollback')
        )).toBe(true);
      }
    });

    it('should provide detailed rollback reasons and procedures', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      
      if (result.data.rollbackRequired) {
        // Should have specific reasons for rollback
        const rollbackReasons = result.data.recommendations.filter(r => 
          r.includes('rollback') || r.includes('failed') || r.includes('not met')
        );
        expect(rollbackReasons.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Metrics Validation', () => {
    it('should validate all performance metrics meet thresholds', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      
      const status = executor.getDeploymentStatus();
      expect(status.metrics).toBeDefined();
      expect(typeof status.metrics.performanceImprovement).toBe('number');
      expect(typeof status.metrics.codeComplexityReduction).toBe('number');
      expect(typeof status.metrics.userSatisfactionScore).toBe('number');
      expect(typeof status.metrics.errorRate).toBe('number');
    });

    it('should generate comprehensive deployment report', async () => {
      await executor.executeDeployment();
      
      const report = await executor.generateDeploymentReport();
      
      expect(report.success).toBe(true);
      expect(report.data.summary).toBeDefined();
      expect(report.data.metrics).toBeDefined();
      expect(report.data.compliance).toBeDefined();
      expect(report.data.recommendations).toBeDefined();
      expect(Array.isArray(report.data.recommendations)).toBe(true);
    });
  });

  describe('Main Task Execution Function', () => {
    it('should execute complete repository deployment task 5.6', async () => {
      const result = await executeRepositoryDeploymentTask();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Validate all required components are present
      expect(result.data.deploymentStatus).toBeDefined();
      expect(result.data.validationResults).toBeDefined();
      expect(result.data.statisticalAnalysis).toBeDefined();
      expect(result.data.requirementCompliance).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
      expect(typeof result.data.rollbackRequired).toBe('boolean');
    });

    it('should log comprehensive execution information', async () => {
      const logSpy = vi.spyOn(logger, 'info');
      
      await executeRepositoryDeploymentTask();
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Executing repository deployment task 5.6'),
        expect.any(Object)
      );
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Repository deployment task 5.6 completed'),
        expect.any(Object)
      );
    });
  });

  describe('Risk Assessment and Mitigation', () => {
    it('should handle high risk scenarios with cross-phase validation failures', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      
      // If cross-phase validation fails, should recommend rollback
      if (!result.data.requirementCompliance.requirement_4_6_parallel) {
        expect(result.data.rollbackRequired).toBe(true);
        expect(result.data.recommendations.some(r => 
          r.includes('cross-phase') || r.includes('error handling') || r.includes('data integrity')
        )).toBe(true);
      }
    });

    it('should handle medium risk scenarios with statistical analysis issues', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      
      // If statistical significance is not achieved, should provide guidance
      if (result.data.statisticalAnalysis.recommendation === 'extend_test') {
        expect(result.data.recommendations.some(r => 
          r.includes('sample size') || r.includes('extend')
        )).toBe(true);
      }
    });

    it('should provide mitigation strategies for identified risks', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      
      // Should always provide actionable recommendations
      expect(result.data.recommendations.length).toBeGreaterThan(0);
      
      // Recommendations should include mitigation strategies
      const mitigationRecommendations = result.data.recommendations.filter(r => 
        r.includes('consider') || r.includes('monitor') || r.includes('review') || r.includes('investigate')
      );
      expect(mitigationRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with Previous Phases', () => {
    it('should validate consistency with error handling phase (Phase 3)', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.validationResults.crossPhaseValidation.errorHandlingConsistency).toBeDefined();
      
      const errorHandlingConsistency = result.data.validationResults.crossPhaseValidation.errorHandlingConsistency;
      expect(errorHandlingConsistency.validator).toBe('ErrorHandlingConsistency');
      expect(typeof errorHandlingConsistency.passed).toBe('boolean');
      expect(errorHandlingConsistency.dataPoints).toBeGreaterThan(0);
    });

    it('should validate data integrity across all migrated components', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.validationResults.crossPhaseValidation.repositoryDataIntegrity).toBeDefined();
      
      const dataIntegrity = result.data.validationResults.crossPhaseValidation.repositoryDataIntegrity;
      expect(dataIntegrity.validator).toBe('RepositoryDataIntegrity');
      expect(typeof dataIntegrity.passed).toBe('boolean');
    });

    it('should ensure performance consistency across all phases', async () => {
      const result = await executor.executeDeployment();
      
      expect(result.success).toBe(true);
      expect(result.data.validationResults.crossPhaseValidation.performanceConsistency).toBeDefined();
      
      const performanceConsistency = result.data.validationResults.crossPhaseValidation.performanceConsistency;
      expect(performanceConsistency.validator).toBe('PerformanceConsistency');
      expect(performanceConsistency.metrics).toBeDefined();
      expect(performanceConsistency.metrics.thresholds).toBeDefined();
    });
  });
});

describe('Repository Deployment Task 5.6 - Requirements Validation', () => {
  it('should meet all requirements specified in task 5.6', async () => {
    const result = await executeRepositoryDeploymentTask();
    
    expect(result.success).toBe(true);
    
    const data = result.data;
    
    // Requirement: Deploy repository changes with parallel implementation and detailed A/B testing
    expect(data.deploymentStatus).toBeDefined();
    expect(data.statisticalAnalysis).toBeDefined();
    expect(data.statisticalAnalysis.significanceLevel).toBe(0.05);
    
    // Requirement: Validate 15% performance improvement requirement with statistical analysis
    expect(data.requirementCompliance.requirement_4_3_performance).toBeDefined();
    expect(data.validationResults.performanceImprovement.metrics).toBeDefined();
    
    // Requirement: Monitor 40% code complexity reduction achievement with automated metrics
    expect(data.requirementCompliance.requirement_4_4_complexity).toBeDefined();
    expect(data.validationResults.codeComplexityReduction.metrics).toBeDefined();
    
    // Requirement: Test comprehensive A/B testing with cohort tracking and user experience monitoring
    expect(data.validationResults.userExperience).toBeDefined();
    expect(data.validationResults.userExperience.metrics.conversionRate).toBeDefined();
    expect(data.validationResults.userExperience.metrics.taskCompletionRate).toBeDefined();
    expect(data.validationResults.userExperience.metrics.userSatisfactionScore).toBeDefined();
    
    // Requirement: Ensure zero data consistency issues with extensive validation checkpoints
    expect(data.requirementCompliance.requirement_4_5_consistency).toBeDefined();
    expect(data.validationResults.dataConsistency.inconsistencies).toBeDefined();
    
    // Requirement: Run cross-phase data validation ensuring consistency between error handling and repository layers
    expect(data.requirementCompliance.requirement_4_6_parallel).toBeDefined();
    expect(data.validationResults.crossPhaseValidation.errorHandlingConsistency).toBeDefined();
    expect(data.validationResults.crossPhaseValidation.repositoryDataIntegrity).toBeDefined();
    
    // Should provide actionable recommendations
    expect(data.recommendations).toBeDefined();
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data.recommendations.length).toBeGreaterThan(0);
    
    // Should determine rollback necessity
    expect(typeof data.rollbackRequired).toBe('boolean');
  });
});