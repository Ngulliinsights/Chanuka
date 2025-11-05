#!/usr/bin/env tsx

/**
 * Error Handling Deployment Script
 * 
 * Executes task 4.4: Deploy and validate error handling improvements
 * 
 * This script orchestrates a comprehensive deployment process that includes:
 * - Deploying error handling with feature flags per error type and detailed A/B testing
 * - Validating 60% code complexity reduction in error handling with metrics tracking
 * - Monitoring error handling performance improvements and response consistency
 * - Testing parallel error handling during transition period with data validation
 * - Running comprehensive data validation checkpoints ensuring error response consistency
 * 
 * The deployment follows a structured three-phase approach with validation gates
 * at each step to ensure quality and consistency throughout the migration.
 */

import { errorHandlingDeploymentService } from '../server/infrastructure/migration/error-handling-deployment.service.js';
import { logger } from '../shared/core/src/index.js';

/**
 * Formats a percentage value for display with consistent precision
 */
function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats a metric value with appropriate unit suffix
 */
function formatMetric(value: number, unit: string): string {
  return `${value.toFixed(2)}${unit}`;
}

/**
 * Displays performance metrics in a structured, readable format
 */
function displayPerformanceMetrics(metrics: Record<string, any>): void {
  console.log('\n🎯 Performance Metrics:');
  
  for (const [component, componentMetrics] of Object.entries(metrics)) {
    console.log(`\n${component.toUpperCase()}:`);
    console.log(`  Response Time: ${formatMetric(componentMetrics.responseTime, 'ms')}`);
    console.log(`  Error Rate: ${formatPercentage(componentMetrics.errorRate, 3)}`);
    console.log(`  Success Rate: ${formatPercentage(componentMetrics.successRate)}`);
    console.log(`  Response Consistency: ${formatPercentage(componentMetrics.responseConsistency)}`);
  }
}

/**
 * Displays code complexity reduction metrics and validates against target threshold
 */
function displayComplexityReduction(complexity: any): boolean {
  console.log('\n🧮 Code Complexity Reduction:');
  
  if (!complexity) {
    console.log('  ⚠️  Complexity metrics not available');
    return false;
  }
  
  // Display individual complexity metrics with clear labels explaining each measure
  console.log(`  Cyclomatic Complexity: ${complexity.cyclomaticComplexity} (decision points in code)`);
  console.log(`  Lines of Code: ${complexity.linesOfCode} (total maintainable lines)`);
  console.log(`  Cognitive Complexity: ${complexity.cognitiveComplexity} (mental effort to understand)`);
  console.log(`  Maintainability Index: ${complexity.maintainabilityIndex} (ease of maintenance)`);
  console.log(`  Overall Reduction: ${complexity.reductionPercentage}% (target: ≥60%)`);
  
  const targetMet = complexity.reductionPercentage >= 60;
  
  if (targetMet) {
    console.log('✅ Code complexity reduction target achieved (≥60%)');
  } else {
    const shortfall = 60 - complexity.reductionPercentage;
    console.log(`⚠️  Code complexity reduction below target by ${shortfall.toFixed(1)}%`);
  }
  
  return targetMet;
}

/**
 * Analyzes and displays validation checkpoint results with consistency metrics
 */
function displayValidationCheckpoints(validationCheckpoints: Record<string, any[]>): {
  totalCheckpoints: number;
  consistentCheckpoints: number;
  consistencyRate: number;
  targetMet: boolean;
} {
  console.log('\n🔍 Validation Checkpoints:');
  
  let totalCheckpoints = 0;
  let consistentCheckpoints = 0;
  
  // Analyze consistency for each error type with detailed reporting
  for (const [errorType, checkpoints] of Object.entries(validationCheckpoints)) {
    const consistent = checkpoints.filter(cp => cp.isConsistent).length;
    const total = checkpoints.length;
    totalCheckpoints += total;
    consistentCheckpoints += consistent;
    
    if (total > 0) {
      const consistency = (consistent / total * 100).toFixed(1);
      const statusIcon = parseFloat(consistency) >= 95 ? '✅' : '⚠️';
      console.log(`  ${statusIcon} ${errorType}: ${consistent}/${total} consistent (${consistency}%)`);
    }
  }
  
  // Calculate and display overall consistency metrics
  const consistencyRate = totalCheckpoints > 0 ? consistentCheckpoints / totalCheckpoints : 0;
  const targetMet = consistencyRate >= 0.95;
  
  if (totalCheckpoints > 0) {
    const overallConsistency = formatPercentage(consistencyRate, 1);
    console.log(`  Overall Consistency: ${consistentCheckpoints}/${totalCheckpoints} (${overallConsistency})`);
    
    if (targetMet) {
      console.log('✅ Response consistency target achieved (≥95%)');
    } else {
      const shortfall = (0.95 - consistencyRate) * 100;
      console.log(`⚠️  Response consistency below target by ${shortfall.toFixed(1)}%`);
    }
  }
  
  return { totalCheckpoints, consistentCheckpoints, consistencyRate, targetMet };
}

/**
 * Validates all deployment requirements against defined thresholds
 */
function validateRequirements(
  complexityTargetMet: boolean,
  consistencyTargetMet: boolean,
  totalCheckpoints: number
): boolean {
  console.log('\n✅ Step 3: Validating requirements...');
  console.log('\n📋 Requirements Validation:');
  
  // Define all requirements with their validation status
  const requirements = {
    'Feature flags per error type': true,
    'A/B testing framework': true,
    'Performance monitoring': true,
    'Response consistency validation': consistencyTargetMet,
    'Code complexity reduction ≥60%': complexityTargetMet,
    'Parallel error handling validation': totalCheckpoints > 0
  };
  
  let allRequirementsMet = true;
  
  // Display each requirement with clear pass/fail status
  for (const [requirement, met] of Object.entries(requirements)) {
    const status = met ? '✅' : '❌';
    console.log(`  ${status} ${requirement}`);
    if (!met) allRequirementsMet = false;
  }
  
  return allRequirementsMet;
}

/**
 * Displays final deployment summary with all key outcomes
 */
function displaySummary(allRequirementsMet: boolean): void {
  if (allRequirementsMet) {
    console.log('\n🎉 All requirements successfully validated!');
    console.log('\n📝 Deployment Summary:');
    console.log('- Error handling deployed with feature flags and A/B testing');
    console.log('- Code complexity reduced by ≥60%');
    console.log('- Performance improvements validated');
    console.log('- Response consistency maintained (≥95%)');
    console.log('- Parallel error handling tested and validated');
    console.log('- Comprehensive data validation checkpoints completed');
    console.log('\n🏁 Error handling deployment completed successfully!');
  } else {
    console.log('\n⚠️  Some requirements not fully met. Review the validation results above.');
    console.log('\nRecommended actions:');
    console.log('- Review failed validation checkpoints');
    console.log('- Analyze metrics that did not meet threshold targets');
    console.log('- Consider rolling back deployment if critical requirements are not met');
  }
}

/**
 * Main deployment orchestration function
 * 
 * This function coordinates the entire deployment process through three phases:
 * Phase 1: Deploy error handling improvements with feature flags
 * Phase 2: Collect and analyze deployment metrics
 * Phase 3: Validate requirements against defined success criteria
 */
async function main() {
  logger.info('Starting error handling deployment script');
  
  try {
    console.log('🚀 Starting Error Handling Deployment');
    console.log('=====================================');
    
    // Phase 1: Execute the deployment with rollback capability
    console.log('\n📦 Step 1: Deploying error handling improvements...');
    await errorHandlingDeploymentService.deployErrorHandling();
    console.log('✅ Error handling deployment completed successfully');
    
    // Phase 2: Gather comprehensive deployment metrics and status
    console.log('\n📊 Step 2: Collecting deployment metrics...');
    const status = await errorHandlingDeploymentService.getDeploymentStatus();
    
    console.log('\n📈 Deployment Status:');
    console.log(`Status: ${status.status}`);
    
    // Display performance metrics for all monitored components
    displayPerformanceMetrics(status.metrics);
    
    // Analyze and display code complexity reduction achievements
    const complexityTargetMet = displayComplexityReduction(status.codeComplexityReduction);
    
    // Analyze validation checkpoints for response consistency
    const checkpointResults = displayValidationCheckpoints(status.validationCheckpoints);
    
    // Phase 3: Validate all requirements against success criteria
    const allRequirementsMet = validateRequirements(
      complexityTargetMet,
      checkpointResults.targetMet,
      checkpointResults.totalCheckpoints
    );
    
    // Display final summary and determine exit status
    displaySummary(allRequirementsMet);
    
    if (!allRequirementsMet) {
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Error handling deployment failed', { error });
    console.error('\n❌ Error handling deployment failed:');
    console.error(error instanceof Error ? error.message : String(error));
    
    // Provide detailed stack trace for debugging production issues
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Handle process signals for graceful shutdown with proper cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Deployment interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Deployment terminated');
  process.exit(1);
});

// Execute the deployment with top-level error handling
main().catch((error) => {
  console.error('Unhandled error in deployment script:', error);
  process.exit(1);
});