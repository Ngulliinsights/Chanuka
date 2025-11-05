#!/usr/bin/env node

/**
 * Phase 1 Deployment Execution Script
 * 
 * This script orchestrates the complete Phase 1 utilities deployment with comprehensive
 * monitoring and validation. Key features include:
 * 
 * - Progressive A/B testing rollout (1% → 5% → 10% → 25%) with statistical validation
 * - Real-time memory usage and performance monitoring with automated alerting
 * - 10% memory improvement validation with statistical significance testing
 * - Automated rollback procedures with comprehensive testing
 * - Multi-stage data validation ensuring system integrity
 * - Detailed metrics reporting and lessons learned documentation
 */

import { Phase1DeploymentOrchestrator } from './phase1-deployment-orchestrator';

// Type definitions for better type safety and code clarity
interface ComponentProgress {
  name: string;
  status: string;
  rollout: string;
  stage: string;
}

interface TestResult {
  component: string;
  success: boolean;
  status?: string;
  error?: string;
}

interface ValidationResult {
  component: string;
  passed: boolean;
}

interface DeploymentResult {
  success: boolean;
  memoryImprovement: number;
  statisticalSignificance: boolean;
  rollbackTestResults: {
    success: boolean;
    results?: TestResult[];
    error?: string;
  };
  validationResults: {
    passed: boolean;
    results?: ValidationResult[];
  };
  lessonsLearned: string[];
}

/**
 * Formats deployment progress updates in a readable format for console output
 */
function formatProgressUpdate(progress: any): void {
  const timestamp = progress.timestamp.toISOString();
  const components: ComponentProgress[] = Object.keys(progress.components).map(comp => ({
    name: comp.replace('utilities-', ''),
    status: progress.components[comp].status,
    rollout: `${progress.components[comp].rolloutPercentage}%`,
    stage: progress.components[comp].currentStage
  }));

  console.log(`[${timestamp}] Deployment Progress:`);
  console.log(`  Active Alerts: ${progress.alerts}`);
  
  components.forEach(comp => {
    console.log(`  ${comp.name}: ${comp.status} | Rollout: ${comp.rollout} | Stage: ${comp.stage}`);
  });
  console.log();
}

/**
 * Displays comprehensive deployment results including performance metrics,
 * rollback test outcomes, validation results, and lessons learned
 */
function displayDeploymentResults(result: DeploymentResult): void {
  console.log();
  console.log('='.repeat(80));
  console.log('DEPLOYMENT RESULTS');
  console.log('='.repeat(80));
  console.log();

  if (result.success) {
    console.log('✅ Phase 1 deployment completed successfully!');
    console.log();

    // Performance metrics section with clear success indicators
    console.log('📈 Performance Metrics:');
    console.log(`   Memory Improvement: ${result.memoryImprovement.toFixed(2)}%`);
    const sigIndicator = result.statisticalSignificance ? '✅ ACHIEVED' : '❌ NOT ACHIEVED';
    console.log(`   Statistical Significance: ${sigIndicator}`);
    console.log();

    // Rollback testing results showing system reliability
    console.log('🔄 Rollback Testing:');
    const rollbackIndicator = result.rollbackTestResults.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`   Overall Status: ${rollbackIndicator}`);
    
    if (result.rollbackTestResults.results) {
      result.rollbackTestResults.results.forEach((test: TestResult) => {
        const testIndicator = test.success ? '✅' : '❌';
        const details = test.status || test.error || '';
        console.log(`   ${test.component}: ${testIndicator} ${details}`);
      });
    }
    console.log();

    // Data validation results ensuring system integrity
    console.log('✅ Data Validation:');
    const validationIndicator = result.validationResults.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`   Overall Status: ${validationIndicator}`);
    
    if (result.validationResults.results) {
      result.validationResults.results.forEach((validation: ValidationResult) => {
        const valIndicator = validation.passed ? '✅' : '❌';
        console.log(`   ${validation.component}: ${valIndicator}`);
      });
    }
    console.log();

    // Lessons learned for continuous improvement
    console.log('📚 Lessons Learned:');
    result.lessonsLearned.forEach((lesson, index) => {
      console.log(`   ${index + 1}. ${lesson}`);
    });
  } else {
    console.log('❌ Phase 1 deployment failed!');
    const rollbackStatus = result.rollbackTestResults.success ? 'Successful' : 'Failed';
    console.log(`   Rollback Status: ${rollbackStatus}`);
    
    if (result.rollbackTestResults.error) {
      console.log(`   Error Details: ${result.rollbackTestResults.error}`);
    }
  }

  console.log();
}

/**
 * Generates and displays a comprehensive metrics report including component status,
 * A/B testing results, and system-wide validation outcomes
 */
async function displayDetailedMetricsReport(orchestrator: Phase1DeploymentOrchestrator): Promise<void> {
  console.log('📊 Generating detailed metrics report...');
  const report = await orchestrator.generateDetailedMetricsReport();

  console.log('='.repeat(80));
  console.log('DETAILED METRICS REPORT');
  console.log('='.repeat(80));
  console.log(`Deployment ID: ${report.deploymentId}`);
  console.log(`Total Execution Time: ${(report.executionTime / 1000).toFixed(2)} seconds`);
  console.log(`Report Generated: ${report.timestamp.toISOString()}`);
  console.log();

  // Component-by-component status breakdown
  console.log('Component Status Overview:');
  Object.entries(report.components).forEach(([component, data]: [string, any]) => {
    console.log(`  ${component}:`);
    console.log(`    Deployment Status: ${data.deploymentStatus}`);
    console.log(`    Current Rollout: ${data.rolloutPercentage}%`);
    console.log(`    Memory Improvement: ${data.metrics.memoryImprovement?.toFixed(2) || 0}%`);
    console.log(`    Error Rate: ${data.metrics.errorRate?.toFixed(4) || 0}`);
    console.log(`    Avg Response Time: ${data.metrics.responseTime?.toFixed(2) || 0}ms`);
  });
  console.log();

  // System-wide health indicators
  console.log('System Health Metrics:');
  console.log(`  Active Alerts: ${report.systemMetrics.alerts}`);
  console.log(`  Overall System Health: ${report.systemMetrics.overallHealth}`);
  console.log();

  // A/B testing statistical analysis results
  console.log('A/B Testing Statistical Analysis:');
  Object.entries(report.abTestingResults).forEach(([component, data]: [string, any]) => {
    if (data.error) {
      console.log(`  ${component}: Error - ${data.error}`);
    } else {
      console.log(`  ${component}:`);
      const sigIndicator = data.hasSignificantResults ? '✅ Significant' : '❌ Not Significant';
      console.log(`    Statistical Significance: ${sigIndicator}`);
      console.log(`    Conversion Rate: ${(data.behaviorAnalysis.conversionRate * 100).toFixed(2)}%`);
      console.log(`    Task Completion: ${(data.behaviorAnalysis.taskCompletionRate * 100).toFixed(2)}%`);
    }
  });
  console.log();

  // Final validation summary showing data integrity
  console.log('Validation Summary:');
  const overallIndicator = report.validationSummary.overallPassed ? '✅ PASSED' : '❌ FAILED';
  console.log(`  Overall Status: ${overallIndicator}`);
  console.log(`  Total Checkpoints: ${report.validationSummary.totalCheckpoints}`);
  console.log(`  Passed Checkpoints: ${report.validationSummary.passedCheckpoints}`);
  console.log(`  Failed Checkpoints: ${report.validationSummary.failedCheckpoints}`);
  console.log();
}

/**
 * Main execution function that orchestrates the entire Phase 1 deployment process.
 * Handles initialization, monitoring, execution, and comprehensive result reporting.
 */
async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('PHASE 1 UTILITIES DEPLOYMENT EXECUTION');
  console.log('='.repeat(80));
  console.log();

  const orchestrator = new Phase1DeploymentOrchestrator();

  try {
    // Initialize real-time monitoring of deployment progress
    console.log('📊 Starting deployment progress monitoring...');
    orchestrator.monitorDeploymentProgress(formatProgressUpdate);

    // Execute the complete deployment pipeline
    console.log('🚀 Executing Phase 1 deployment...');
    const result = await orchestrator.executePhase1Deployment();

    // Display comprehensive results
    displayDeploymentResults(result);

    // Generate and display detailed metrics analysis
    await displayDetailedMetricsReport(orchestrator);

    console.log('='.repeat(80));
    console.log('PHASE 1 DEPLOYMENT EXECUTION COMPLETED');
    console.log('='.repeat(80));

    // Exit with appropriate status code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    // Comprehensive error handling with detailed diagnostic information
    console.error();
    console.error('❌ DEPLOYMENT EXECUTION FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error();

    if (error instanceof Error && error.stack) {
      console.error('Stack Trace:');
      console.error(error.stack);
    }

    console.error();
    console.error('Please review the error details above and check system logs for more information.');
    console.error('='.repeat(80));

    process.exit(1);
  }
}

// Execute main function if this script is run directly (not imported as a module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unhandled error during deployment execution:', error);
    process.exit(1);
  });
}

export { main as executePhase1Deployment };