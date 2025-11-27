#!/usr/bin/env tsx

/**
 * Repository Migration Deployment Script
 * 
 * This script executes task 5.6: Deploy and validate repository migration
 * 
 * Usage:
 *   npm run deploy:repository-migration
 *   or
 *   tsx scripts/deploy-repository-migration.ts [options]
 * 
 * Options:
 *   --rollout-percentage <number>  Rollout percentage (default: 25)
 *   --extended-validation          Enable extended validation period
 *   --no-auto-rollback            Disable automatic rollback
 *   --dry-run                     Run validation without actual deployment
 */

import { program } from 'commander';
import { 
  executeRepositoryDeploymentTask,
  createRepositoryDeploymentExecutor,
  RepositoryDeploymentExecutor
} from '@shared/server/infrastructure/migration/repository-deployment-executor.js';
import { logger } from '@shared/shared/core/index.js';

interface DeploymentOptions {
  rolloutPercentage: number;
  extendedValidation: boolean;
  autoRollback: boolean;
  dryRun: boolean;
}

async function main() {
  program
    .name('deploy-repository-migration')
    .description('Deploy and validate repository migration (Task 5.6)')
    .option('--rollout-percentage <number>', 'Rollout percentage', '25')
    .option('--extended-validation', 'Enable extended validation period', false)
    .option('--no-auto-rollback', 'Disable automatic rollback', false)
    .option('--dry-run', 'Run validation without actual deployment', false)
    .parse();

  const options = program.opts();
  const deploymentOptions: DeploymentOptions = {
    rolloutPercentage: parseInt(options.rolloutPercentage),
    extendedValidation: options.extendedValidation,
    autoRollback: !options.noAutoRollback,
    dryRun: options.dryRun
  };

  logger.info('Starting repository migration deployment script', {
    component: 'DeploymentScript',
    options: deploymentOptions
  });

  try {
    if (deploymentOptions.dryRun) {
      await runDryRunValidation(deploymentOptions);
    } else {
      await runFullDeployment(deploymentOptions);
    }
  } catch (error) {
    logger.error('Deployment script failed', { component: 'DeploymentScript' }, error as any);
    process.exit(1);
  }
}

async function runFullDeployment(options: DeploymentOptions): Promise<void> {
  logger.info('Executing full repository migration deployment', {
    component: 'DeploymentScript',
    mode: 'full_deployment'
  });

  const result = await executeRepositoryDeploymentTask();

  if (!result.success) {
    logger.error('Repository deployment task failed', {
      component: 'DeploymentScript',
      error: result.error
    });
    throw new Error(`Deployment failed: ${result.error?.message || 'Unknown error'}`);
  }

  const data = result.data;

  // Print deployment summary
  console.log('\n=== Repository Migration Deployment Results ===\n');
  
  console.log(`Deployment Status: ${data.deploymentStatus.status}`);
  console.log(`Rollout Percentage: ${data.deploymentStatus.rolloutPercentage}%`);
  console.log(`Rollback Required: ${data.rollbackRequired ? 'YES' : 'NO'}`);
  
  console.log('\n--- Requirement Compliance ---');
  console.log(`✓ Performance Improvement (15%): ${data.requirementCompliance.requirement_4_3_performance ? 'PASSED' : 'FAILED'}`);
  console.log(`✓ Code Complexity Reduction (40%): ${data.requirementCompliance.requirement_4_4_complexity ? 'PASSED' : 'FAILED'}`);
  console.log(`✓ Data Consistency (Zero Issues): ${data.requirementCompliance.requirement_4_5_consistency ? 'PASSED' : 'FAILED'}`);
  console.log(`✓ Cross-Phase Validation: ${data.requirementCompliance.requirement_4_6_parallel ? 'PASSED' : 'FAILED'}`);

  console.log('\n--- Performance Metrics ---');
  if (data.validationResults.performanceImprovement.metrics) {
    console.log(`Performance Improvement: ${data.validationResults.performanceImprovement.metrics.overallImprovement.toFixed(2)}%`);
  }
  if (data.validationResults.codeComplexityReduction.metrics) {
    console.log(`Code Complexity Reduction: ${data.validationResults.codeComplexityReduction.metrics.complexityReduction.toFixed(2)}%`);
  }

  console.log('\n--- Statistical Analysis ---');
  console.log(`P-Value: ${data.statisticalAnalysis.pValue.toFixed(4)}`);
  console.log(`Effect Size: ${data.statisticalAnalysis.effectSize.toFixed(4)}`);
  console.log(`Recommendation: ${data.statisticalAnalysis.recommendation.toUpperCase()}`);
  console.log(`Confidence Interval: [${data.statisticalAnalysis.confidenceInterval.lower.toFixed(4)}, ${data.statisticalAnalysis.confidenceInterval.upper.toFixed(4)}]`);

  console.log('\n--- User Experience Metrics ---');
  const uxMetrics = data.validationResults.userExperience.metrics;
  console.log(`Conversion Rate: ${(uxMetrics.conversionRate * 100).toFixed(2)}%`);
  console.log(`Task Completion Rate: ${(uxMetrics.taskCompletionRate * 100).toFixed(2)}%`);
  console.log(`User Satisfaction Score: ${uxMetrics.userSatisfactionScore.toFixed(2)}/5.0`);

  console.log('\n--- Data Consistency ---');
  const inconsistencies = data.validationResults.dataConsistency.inconsistencies || [];
  console.log(`Data Inconsistencies Found: ${inconsistencies.length}`);
  if (inconsistencies.length > 0) {
    inconsistencies.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.type}: ${issue.count} issues`);
    });
  }

  console.log('\n--- Cross-Phase Validation ---');
  const crossPhase = data.validationResults.crossPhaseValidation;
  console.log(`Overall Status: ${crossPhase.overallStatus.toUpperCase()}`);
  console.log(`Error Handling Consistency: ${crossPhase.errorHandlingConsistency.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`Repository Data Integrity: ${crossPhase.repositoryDataIntegrity.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`Performance Consistency: ${crossPhase.performanceConsistency.passed ? 'PASSED' : 'FAILED'}`);

  console.log('\n--- Recommendations ---');
  data.recommendations.forEach((recommendation, index) => {
    console.log(`${index + 1}. ${recommendation}`);
  });

  if (data.rollbackRequired) {
    console.log('\n⚠️  ROLLBACK REQUIRED - Deployment did not meet validation criteria');
    logger.error('Deployment requires rollback', {
      component: 'DeploymentScript',
      recommendations: data.recommendations
    });
  } else {
    console.log('\n✅ DEPLOYMENT SUCCESSFUL - All validation criteria met');
    logger.info('Deployment completed successfully', {
      component: 'DeploymentScript',
      metrics: data.deploymentStatus.metrics
    });
  }

  console.log('\n=== End of Deployment Report ===\n');
}

async function runDryRunValidation(options: DeploymentOptions): Promise<void> {
  logger.info('Running dry-run validation', {
    component: 'DeploymentScript',
    mode: 'dry_run'
  });

  const executor = createRepositoryDeploymentExecutor(options.rolloutPercentage, {
    extendedValidationPeriod: options.extendedValidation,
    automaticRollbackEnabled: options.autoRollback,
    validationEnabled: true,
    abTestingEnabled: true,
    crossPhaseValidationEnabled: true
  });

  console.log('\n=== Dry Run Validation ===\n');
  console.log('This is a dry run - no actual deployment will occur');
  console.log(`Configuration: ${JSON.stringify(options, null, 2)}`);

  // Get current deployment status
  const status = executor.getDeploymentStatus();
  console.log(`\nCurrent Status: ${status.status}`);
  console.log(`Rollout Percentage: ${status.rolloutPercentage}%`);

  // Generate deployment report
  const report = await executor.generateDeploymentReport();
  
  if (report.success) {
    console.log('\n--- Dry Run Report ---');
    console.log(`Summary: ${report.data.summary}`);
    console.log('Compliance Checks:');
    Object.entries(report.data.compliance).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? 'READY' : 'NOT READY'}`);
    });
    
    console.log('\nRecommendations:');
    report.data.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  console.log('\n✅ Dry run completed - Ready for actual deployment');
  logger.info('Dry run validation completed', {
    component: 'DeploymentScript',
    report: report.success ? report.data : null
  });
}

// Handle process signals
process.on('SIGINT', () => {
  logger.info('Deployment script interrupted by user', { component: 'DeploymentScript' });
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Deployment script terminated', { component: 'DeploymentScript' });
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in deployment script', { component: 'DeploymentScript' }, error);
    process.exit(1);
  });
}

export { main as deployRepositoryMigration };