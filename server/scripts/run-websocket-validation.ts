#!/usr/bin/env tsx

/**
 * WebSocket Migration Validation Runner
 * 
 * Executes comprehensive validation for task 6.6:
 * - Message delivery success rate validation (>99.9%)
 * - Memory usage reduction validation (30%)
 * - Rollback capability testing
 * - Final data validation checkpoints
 * - Legacy cleanup validation
 */

import { WebSocketPerformanceValidator } from '@server/scripts/websocket-performance-validation.ts';
import { FinalMigrationValidator } from '../../final-migration-validation';
import { LegacyWebSocketCleanup } from '../../legacy-websocket-cleanup';
import { logger } from '@shared/core/observability/logging';

interface ValidationSummary {
  performance: {
    messageDeliveryRate: number;
    memoryReduction: number;
    rollbackTime: number;
    status: 'passed' | 'failed' | 'partial';
  };
  migration: {
    totalValidations: number;
    passed: number;
    failed: number;
    crossPhaseCompatibility: boolean;
    status: 'passed' | 'failed' | 'partial';
  };
  cleanup: {
    itemsProcessed: number;
    successful: number;
    failed: number;
    status: 'passed' | 'failed' | 'partial';
  };
  overall: {
    status: 'passed' | 'failed' | 'partial';
    readyForProduction: boolean;
    recommendations: string[];
  };
}

/**
 * Main validation runner
 */
async function runWebSocketValidation(): Promise<ValidationSummary> {
  logger.info('🚀 Starting comprehensive WebSocket migration validation...');
  
  const performanceValidator = new WebSocketPerformanceValidator();
  const migrationValidator = new FinalMigrationValidator();
  const cleanupManager = new LegacyWebSocketCleanup(true); // Dry run by default
  
  const summary: ValidationSummary = {
    performance: {
      messageDeliveryRate: 0,
      memoryReduction: 0,
      rollbackTime: 0,
      status: 'failed'
    },
    migration: {
      totalValidations: 0,
      passed: 0,
      failed: 0,
      crossPhaseCompatibility: false,
      status: 'failed'
    },
    cleanup: {
      itemsProcessed: 0,
      successful: 0,
      failed: 0,
      status: 'failed'
    },
    overall: {
      status: 'failed',
      readyForProduction: false,
      recommendations: []
    }
  };

  try {
    // Initialize performance validator
    await performanceValidator.initialize();

    // Step 1: Performance Validation
    logger.info('📊 Step 1: Running performance validations...');
    
    try {
      const deliveryCheckpoint = await performanceValidator.validateMessageDeliveryRate();
      const memoryCheckpoint = await performanceValidator.validateMemoryReduction();
      const rollbackCheckpoint = await performanceValidator.validateRollbackCapability();
      
      summary.performance.messageDeliveryRate = deliveryCheckpoint.metrics.messageDeliveryRate;
      summary.performance.memoryReduction = memoryCheckpoint.metrics.memoryUsageReduction;
      summary.performance.rollbackTime = rollbackCheckpoint.metrics.rollbackTime;
      
      const performancePassed = 
        deliveryCheckpoint.status === 'passed' &&
        memoryCheckpoint.status === 'passed' &&
        rollbackCheckpoint.status === 'passed';
      
      summary.performance.status = performancePassed ? 'passed' : 'failed';
      
      logger.info('✅ Performance validation completed', {
        deliveryRate: `${(summary.performance.messageDeliveryRate * 100).toFixed(3)}%`,
        memoryReduction: `${(summary.performance.memoryReduction * 100).toFixed(1)}%`,
        rollbackTime: `${summary.performance.rollbackTime}ms`,
        status: summary.performance.status
      });
      
    } catch (error) {
      logger.error('❌ Performance validation failed', {}, error instanceof Error ? error : new Error(String(error)));
      summary.overall.recommendations.push('Performance validation failed - review WebSocket implementation');
    }

    // Step 2: A/B Testing Analysis
    logger.info('🧪 Step 2: Running A/B testing analysis...');
    
    try {
      const abResults = await performanceValidator.runABTestingAnalysis();
      
      const improvementSignificant = 
        abResults.statisticalSignificance.pValue < 0.05 &&
        abResults.treatmentGroup.deliveryRate > abResults.controlGroup.deliveryRate;
      
      if (improvementSignificant) {
        logger.info('✅ A/B testing shows significant improvements', {
          pValue: abResults.statisticalSignificance.pValue,
          deliveryImprovement: `${((abResults.treatmentGroup.deliveryRate - abResults.controlGroup.deliveryRate) * 100).toFixed(3)}%`
        });
      } else {
        summary.overall.recommendations.push('A/B testing results not statistically significant');
      }
      
    } catch (error) {
      logger.error('❌ A/B testing analysis failed', {}, error instanceof Error ? error : new Error(String(error)));
      summary.overall.recommendations.push('A/B testing analysis failed - review testing methodology');
    }

    // Step 3: Migration Validation
    logger.info('🔍 Step 3: Running migration validations...');
    
    try {
      const migrationResults = await migrationValidator.runAllValidations();
      
      summary.migration.totalValidations = migrationResults.summary.total;
      summary.migration.passed = migrationResults.summary.passed;
      summary.migration.failed = migrationResults.summary.failed;
      summary.migration.crossPhaseCompatibility = migrationResults.crossPhaseValidation.cross_compatibility;
      summary.migration.status = migrationResults.summary.overallStatus;
      
      logger.info('✅ Migration validation completed', {
        total: summary.migration.totalValidations,
        passed: summary.migration.passed,
        failed: summary.migration.failed,
        crossPhaseCompatibility: summary.migration.crossPhaseCompatibility,
        status: summary.migration.status
      });
      
      if (summary.migration.failed > 0) {
        summary.overall.recommendations.push(`${summary.migration.failed} migration validations failed - review migration implementation`);
      }
      
    } catch (error) {
      logger.error('❌ Migration validation failed', {}, error instanceof Error ? error : new Error(String(error)));
      summary.overall.recommendations.push('Migration validation failed - review migration state');
    }

    // Step 4: Cleanup Validation
    logger.info('🧹 Step 4: Running cleanup validation...');
    
    try {
      const cleanupResults = await cleanupManager.runCleanup();
      
      summary.cleanup.itemsProcessed = cleanupResults.summary.total;
      summary.cleanup.successful = cleanupResults.summary.successful;
      summary.cleanup.failed = cleanupResults.summary.failed;
      summary.cleanup.status = cleanupResults.summary.failed === 0 ? 'passed' : 'failed';
      
      logger.info('✅ Cleanup validation completed', {
        itemsProcessed: summary.cleanup.itemsProcessed,
        successful: summary.cleanup.successful,
        failed: summary.cleanup.failed,
        status: summary.cleanup.status
      });
      
      if (summary.cleanup.failed > 0) {
        summary.overall.recommendations.push(`${summary.cleanup.failed} cleanup items failed - review cleanup procedures`);
      }
      
    } catch (error) {
      logger.error('❌ Cleanup validation failed', {}, error instanceof Error ? error : new Error(String(error)));
      summary.overall.recommendations.push('Cleanup validation failed - review cleanup configuration');
    }

    // Step 5: Overall Assessment
    logger.info('📋 Step 5: Generating overall assessment...');
    
    const allValidationsPassed = 
      summary.performance.status === 'passed' &&
      summary.migration.status === 'passed' &&
      summary.cleanup.status === 'passed';
    
    const criticalRequirementsMet = 
      summary.performance.messageDeliveryRate >= 0.999 &&
      summary.performance.memoryReduction >= 0.30 &&
      summary.performance.rollbackTime <= 5000 &&
      summary.migration.crossPhaseCompatibility;
    
    if (allValidationsPassed && criticalRequirementsMet) {
      summary.overall.status = 'passed';
      summary.overall.readyForProduction = true;
      summary.overall.recommendations.push('All validations passed - WebSocket migration is ready for production deployment');
    } else if (criticalRequirementsMet) {
      summary.overall.status = 'partial';
      summary.overall.readyForProduction = false;
      summary.overall.recommendations.push('Critical requirements met but some validations failed - review before production deployment');
    } else {
      summary.overall.status = 'failed';
      summary.overall.readyForProduction = false;
      summary.overall.recommendations.push('Critical requirements not met - migration not ready for production');
    }

    // Cleanup
    await performanceValidator.cleanup();
    await migrationValidator.cleanup();

    return summary;

  } catch (error) {
    logger.error('❌ WebSocket validation failed', {}, error instanceof Error ? error : new Error(String(error)));
    
    // Ensure cleanup even on failure
    try {
      await performanceValidator.cleanup();
      await migrationValidator.cleanup();
    } catch (cleanupError) {
      logger.error('Failed to cleanup after validation failure', {}, cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)));
    }
    
    throw error;
  }
}

/**
 * Generate comprehensive validation report
 */
function generateValidationReport(summary: ValidationSummary): string {
  let report = '\n🎯 WebSocket Migration Validation Report - Task 6.6\n';
  report += '=====================================================\n\n';
  
  // Overall Status
  const statusIcon = summary.overall.status === 'passed' ? '✅' : 
                    summary.overall.status === 'partial' ? '⚠️' : '❌';
  report += `${statusIcon} Overall Status: ${summary.overall.status.toUpperCase()}\n`;
  report += `🚀 Ready for Production: ${summary.overall.readyForProduction ? 'YES' : 'NO'}\n\n`;
  
  // Performance Metrics
  report += '📊 Performance Validation:\n';
  report += '==========================\n';
  report += `Message Delivery Rate: ${(summary.performance.messageDeliveryRate * 100).toFixed(3)}% (Required: >99.9%)\n`;
  report += `Memory Usage Reduction: ${(summary.performance.memoryReduction * 100).toFixed(1)}% (Required: >30%)\n`;
  report += `Rollback Time: ${summary.performance.rollbackTime}ms (Required: <5000ms)\n`;
  report += `Status: ${summary.performance.status.toUpperCase()}\n\n`;
  
  // Migration Validation
  report += '🔍 Migration Validation:\n';
  report += '========================\n';
  report += `Total Validations: ${summary.migration.totalValidations}\n`;
  report += `Passed: ${summary.migration.passed}\n`;
  report += `Failed: ${summary.migration.failed}\n`;
  report += `Cross-Phase Compatibility: ${summary.migration.crossPhaseCompatibility ? 'YES' : 'NO'}\n`;
  report += `Status: ${summary.migration.status.toUpperCase()}\n\n`;
  
  // Cleanup Validation
  report += '🧹 Cleanup Validation:\n';
  report += '======================\n';
  report += `Items Processed: ${summary.cleanup.itemsProcessed}\n`;
  report += `Successful: ${summary.cleanup.successful}\n`;
  report += `Failed: ${summary.cleanup.failed}\n`;
  report += `Status: ${summary.cleanup.status.toUpperCase()}\n\n`;
  
  // Recommendations
  report += '💡 Recommendations:\n';
  report += '===================\n';
  summary.overall.recommendations.forEach((rec, index) => {
    report += `${index + 1}. ${rec}\n`;
  });
  
  report += `\n📅 Validation Date: ${new Date().toISOString()}\n`;
  report += '=====================================================\n';
  
  return report;
}

// Main execution
async function main(): Promise<void> {
  try {
    const summary = await runWebSocketValidation();
    const report = generateValidationReport(summary);
    
    console.log(report);
    
    // Exit with appropriate code
    if (summary.overall.status === 'failed') {
      process.exit(1);
    } else if (summary.overall.status === 'partial') {
      process.exit(2); // Partial success
    } else {
      process.exit(0); // Full success
    }
    
  } catch (error) {
    logger.error('WebSocket validation runner failed', {}, error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runWebSocketValidation, generateValidationReport, ValidationSummary };
