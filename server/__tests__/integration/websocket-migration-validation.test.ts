/**
 * WebSocket Migration Validation Test Suite
 * 
 * Comprehensive integration tests for task 6.6:
 * - Validates >99.9% message delivery success rate with detailed A/B testing analysis
 * - Confirms 30% memory usage reduction achievement with long-term monitoring
 * - Tests instant rollback capability via load balancer with connection preservation
 * - Runs final data validation checkpoints across all migrated phases
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocketPerformanceValidator } from '../../scripts/websocket-performance-validation.js';
import { FinalMigrationValidator } from '../../scripts/final-migration-validation.js';
import { LegacyWebSocketCleanup } from '../../scripts/legacy-websocket-cleanup.js';
import { logger } from '@shared/core/src/observability/logging/index.js';

describe('WebSocket Migration Validation - Task 6.6', () => {
  let performanceValidator: WebSocketPerformanceValidator;
  let migrationValidator: FinalMigrationValidator;
  let cleanupManager: LegacyWebSocketCleanup;

  beforeAll(async () => {
    logger.info('🚀 Starting WebSocket migration validation test suite...');
    
    performanceValidator = new WebSocketPerformanceValidator();
    migrationValidator = new FinalMigrationValidator();
    cleanupManager = new LegacyWebSocketCleanup(true); // Dry run for tests
    
    await performanceValidator.initialize();
  });

  afterAll(async () => {
    await performanceValidator.cleanup();
    await migrationValidator.cleanup();
    
    logger.info('✅ WebSocket migration validation test suite completed');
  });

  describe('Message Delivery Success Rate Validation', () => {
    test('should achieve >99.9% message delivery success rate', async () => {
      const checkpoint = await performanceValidator.validateMessageDeliveryRate();
      
      expect(checkpoint.status).toBe('passed');
      expect(checkpoint.metrics.messageDeliveryRate).toBeGreaterThanOrEqual(0.999);
      expect(checkpoint.metrics.connectionStability).toBeGreaterThanOrEqual(0.95);
      
      logger.info('✅ Message delivery rate validation passed', {
        deliveryRate: `${(checkpoint.metrics.messageDeliveryRate * 100).toFixed(3)}%`,
        connectionStability: `${(checkpoint.metrics.connectionStability * 100).toFixed(1)}%`
      });
    }, 120000); // 2 minute timeout for load testing

    test('should maintain low latency under high load', async () => {
      const checkpoint = await performanceValidator.validateMessageDeliveryRate();
      
      expect(checkpoint.metrics.averageLatency).toBeLessThan(200);
      expect(checkpoint.metrics.p95Latency).toBeLessThan(400);
      expect(checkpoint.metrics.p99Latency).toBeLessThan(800);
      
      logger.info('✅ Latency requirements met', {
        averageLatency: `${checkpoint.metrics.averageLatency}ms`,
        p95Latency: `${checkpoint.metrics.p95Latency}ms`,
        p99Latency: `${checkpoint.metrics.p99Latency}ms`
      });
    }, 120000);
  });

  describe('Memory Usage Reduction Validation', () => {
    test('should achieve 30% memory usage reduction', async () => {
      const checkpoint = await performanceValidator.validateMemoryReduction();
      
      expect(checkpoint.status).toBe('passed');
      expect(checkpoint.metrics.memoryUsageReduction).toBeGreaterThanOrEqual(0.30);
      
      logger.info('✅ Memory usage reduction achieved', {
        reduction: `${(checkpoint.metrics.memoryUsageReduction * 100).toFixed(1)}%`
      });
    }, 360000); // 6 minute timeout for long-term monitoring

    test('should maintain stable memory usage over time', async () => {
      const checkpoint = await performanceValidator.validateMemoryReduction();
      
      // Memory usage should be stable (not continuously growing)
      expect(checkpoint.metrics.memoryUsageReduction).toBeGreaterThan(0);
      expect(checkpoint.details).not.toContain('memory leak');
      
      logger.info('✅ Memory stability confirmed');
    }, 360000);
  });

  describe('Rollback Capability Validation', () => {
    test('should support instant rollback with connection preservation', async () => {
      const checkpoint = await performanceValidator.validateRollbackCapability();
      
      expect(checkpoint.status).toBe('passed');
      expect(checkpoint.metrics.rollbackTime).toBeLessThan(5000); // 5 seconds
      expect(checkpoint.metrics.connectionStability).toBeGreaterThanOrEqual(0.95);
      
      logger.info('✅ Rollback capability validated', {
        rollbackTime: `${checkpoint.metrics.rollbackTime}ms`,
        connectionPreservation: `${(checkpoint.metrics.connectionStability * 100).toFixed(1)}%`
      });
    }, 180000); // 3 minute timeout for rollback testing
  });

  describe('A/B Testing Analysis', () => {
    test('should demonstrate statistical significance in improvements', async () => {
      const abResults = await performanceValidator.runABTestingAnalysis();
      
      // Treatment group should perform better than control
      expect(abResults.treatmentGroup.deliveryRate).toBeGreaterThan(abResults.controlGroup.deliveryRate);
      expect(abResults.treatmentGroup.averageLatency).toBeLessThan(abResults.controlGroup.averageLatency);
      expect(abResults.treatmentGroup.memoryUsage).toBeLessThan(abResults.controlGroup.memoryUsage);
      
      // Results should be statistically significant
      expect(abResults.statisticalSignificance.pValue).toBeLessThan(0.05);
      expect(abResults.statisticalSignificance.confidenceLevel).toBeGreaterThan(0.95);
      
      logger.info('✅ A/B testing shows significant improvements', {
        deliveryImprovement: `${((abResults.treatmentGroup.deliveryRate - abResults.controlGroup.deliveryRate) * 100).toFixed(3)}%`,
        latencyImprovement: `${(abResults.controlGroup.averageLatency - abResults.treatmentGroup.averageLatency).toFixed(1)}ms`,
        memoryImprovement: `${(abResults.controlGroup.memoryUsage - abResults.treatmentGroup.memoryUsage).toFixed(1)}MB`,
        pValue: abResults.statisticalSignificance.pValue
      });
    }, 300000); // 5 minute timeout for A/B testing
  });

  describe('Final Data Validation Checkpoints', () => {
    test('should validate all migration phases', async () => {
      const results = await migrationValidator.runAllValidations();
      
      expect(results.summary.overallStatus).not.toBe('failed');
      expect(results.summary.failed).toBe(0);
      
      // All phases should be validated
      expect(results.crossPhaseValidation.phase1_utilities).toBe(true);
      expect(results.crossPhaseValidation.phase2_search).toBe(true);
      expect(results.crossPhaseValidation.phase3_error_handling).toBe(true);
      expect(results.crossPhaseValidation.phase4_repository).toBe(true);
      expect(results.crossPhaseValidation.phase5_websocket).toBe(true);
      
      logger.info('✅ All migration phases validated', {
        totalValidations: results.summary.total,
        passed: results.summary.passed,
        warnings: results.summary.warnings
      });
    }, 180000);

    test('should validate cross-phase compatibility', async () => {
      const results = await migrationValidator.runAllValidations();
      
      expect(results.crossPhaseValidation.cross_compatibility).toBe(true);
      
      // Check for integration validations
      const integrationResults = results.results.filter(r => r.phase === 'cross_phase');
      expect(integrationResults.length).toBeGreaterThan(0);
      
      const failedIntegrations = integrationResults.filter(r => r.status === 'failed');
      expect(failedIntegrations.length).toBe(0);
      
      logger.info('✅ Cross-phase compatibility validated');
    }, 120000);
  });

  describe('Legacy WebSocket Cleanup Validation', () => {
    test('should validate cleanup readiness', async () => {
      const results = await cleanupManager.runCleanup();
      
      expect(results.summary.failed).toBe(0);
      expect(results.summary.total).toBeGreaterThan(0);
      
      logger.info('✅ Cleanup validation passed', {
        itemsToCleanup: results.summary.total,
        successful: results.summary.successful,
        skipped: results.summary.skipped
      });
    }, 60000);

    test('should generate comprehensive cleanup report', () => {
      const report = cleanupManager.generateReport();
      
      expect(report).toContain('Legacy WebSocket Cleanup Report');
      expect(report).toContain('Summary:');
      expect(report).toContain('Archive Location:');
      
      logger.info('✅ Cleanup report generated successfully');
    });
  });

  describe('Performance Requirements Validation', () => {
    test('should meet all performance requirements', async () => {
      // Generate comprehensive performance report
      const performanceReport = performanceValidator.generateValidationReport();
      
      expect(performanceReport.summary.overallStatus).not.toBe('failed');
      
      // Check specific requirements
      const deliveryCheckpoint = performanceReport.checkpoints.find(c => c.phase === 'message_delivery_validation');
      const memoryCheckpoint = performanceReport.checkpoints.find(c => c.phase === 'memory_reduction_validation');
      const rollbackCheckpoint = performanceReport.checkpoints.find(c => c.phase === 'rollback_capability_validation');
      
      if (deliveryCheckpoint) {
        expect(deliveryCheckpoint.metrics.messageDeliveryRate).toBeGreaterThanOrEqual(0.999);
      }
      
      if (memoryCheckpoint) {
        expect(memoryCheckpoint.metrics.memoryUsageReduction).toBeGreaterThanOrEqual(0.30);
      }
      
      if (rollbackCheckpoint) {
        expect(rollbackCheckpoint.metrics.rollbackTime).toBeLessThan(5000);
      }
      
      logger.info('✅ All performance requirements validated', {
        totalCheckpoints: performanceReport.summary.totalCheckpoints,
        passed: performanceReport.summary.passed,
        recommendations: performanceReport.recommendations.length
      });
    }, 600000); // 10 minute timeout for comprehensive testing
  });

  describe('Migration Completion Validation', () => {
    test('should confirm migration is ready for production', async () => {
      // Run all validations
      const performanceResults = performanceValidator.generateValidationReport();
      const migrationResults = await migrationValidator.runAllValidations();
      const cleanupResults = await cleanupManager.runCleanup();
      
      // All validations should pass
      expect(performanceResults.summary.overallStatus).not.toBe('failed');
      expect(migrationResults.summary.overallStatus).not.toBe('failed');
      expect(cleanupResults.summary.failed).toBe(0);
      
      // Cross-phase compatibility should be confirmed
      expect(migrationResults.crossPhaseValidation.cross_compatibility).toBe(true);
      
      // Performance requirements should be met
      const hasDeliveryValidation = performanceResults.checkpoints.some(c => 
        c.phase === 'message_delivery_validation' && c.status === 'passed'
      );
      const hasMemoryValidation = performanceResults.checkpoints.some(c => 
        c.phase === 'memory_reduction_validation' && c.status === 'passed'
      );
      const hasRollbackValidation = performanceResults.checkpoints.some(c => 
        c.phase === 'rollback_capability_validation' && c.status === 'passed'
      );
      
      expect(hasDeliveryValidation).toBe(true);
      expect(hasMemoryValidation).toBe(true);
      expect(hasRollbackValidation).toBe(true);
      
      logger.info('🎉 WebSocket migration is ready for production deployment!', {
        performanceValidations: performanceResults.summary.passed,
        migrationValidations: migrationResults.summary.passed,
        cleanupItems: cleanupResults.summary.total,
        overallStatus: 'READY_FOR_PRODUCTION'
      });
    }, 900000); // 15 minute timeout for complete validation
  });
});
