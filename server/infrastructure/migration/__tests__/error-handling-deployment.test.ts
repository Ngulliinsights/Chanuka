/**
 * Error Handling Deployment Tests
 * 
 * Comprehensive test suite for validating error handling deployment
 * and validation functionality as required by task 4.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { errorHandlingDeploymentService } from '../error-handling-deployment.service.js';
import { featureFlagsService } from '../feature-flags.service.js';
import { abTestingService } from '../ab-testing.service.js';
import { errorAdapter } from '../../errors/error-adapter.js';
import * as Boom from '@hapi/boom';

// Mock dependencies
vi.mock('../feature-flags.service.js', () => ({
  featureFlagsService: {
    updateFlag: vi.fn(),
    enableGradualRollout: vi.fn(),
    rollbackFeature: vi.fn(),
    getUserCohort: vi.fn(() => 'control'),
    shouldUseMigration: vi.fn(() => Promise.resolve(true))
  }
}));

vi.mock('../ab-testing.service.js', () => ({
  abTestingService: {
    trackCohortMetrics: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('../../errors/error-adapter.js', () => ({
  errorAdapter: {
    createValidationError: vi.fn(),
    createAuthenticationError: vi.fn(),
    toErrorResponse: vi.fn()
  }
}));

describe('ErrorHandlingDeploymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Flag Initialization', () => {
    it('should initialize error handling feature flags', async () => {
      const updateFlagSpy = vi.spyOn(featureFlagsService, 'updateFlag');

      // Create a new instance to trigger constructor
      const { ErrorHandlingDeploymentService } = await import('../error-handling-deployment.service.js');
      new ErrorHandlingDeploymentService();

      expect(updateFlagSpy).toHaveBeenCalledWith('error-handling-boom', {
        name: 'error-handling-boom',
        enabled: false,
        rolloutPercentage: 0,
        fallbackEnabled: true
      });

      expect(updateFlagSpy).toHaveBeenCalledWith('error-handling-neverthrow', {
        name: 'error-handling-neverthrow',
        enabled: false,
        rolloutPercentage: 0,
        fallbackEnabled: true
      });

      expect(updateFlagSpy).toHaveBeenCalledWith('error-handling-middleware', {
        name: 'error-handling-middleware',
        enabled: false,
        rolloutPercentage: 0,
        fallbackEnabled: true
      });
    });
  });

  describe('Deployment Process', () => {
    it('should deploy error handling with gradual rollout', async () => {
      const enableGradualRolloutSpy = vi.spyOn(featureFlagsService, 'enableGradualRollout')
        .mockResolvedValue();
      const trackCohortMetricsSpy = vi.spyOn(abTestingService, 'trackCohortMetrics')
        .mockResolvedValue();

      // Mock successful deployment
      vi.spyOn(errorHandlingDeploymentService as any, 'validateDeploymentPhase')
        .mockResolvedValue();
      vi.spyOn(errorHandlingDeploymentService as any, 'monitorInitialDeployment')
        .mockResolvedValue();
      vi.spyOn(errorHandlingDeploymentService as any, 'executeGradualRollout')
        .mockResolvedValue();

      await errorHandlingDeploymentService.deployErrorHandling();

      // Verify gradual rollout was called for each component
      expect(enableGradualRolloutSpy).toHaveBeenCalledWith('error-handling-boom', 1);
      expect(enableGradualRolloutSpy).toHaveBeenCalledWith('error-handling-neverthrow', 1);
      expect(enableGradualRolloutSpy).toHaveBeenCalledWith('error-handling-middleware', 1);

      // Verify metrics tracking
      expect(trackCohortMetricsSpy).toHaveBeenCalled();
    });

    it('should rollback on deployment failure', async () => {
      const rollbackFeatureSpy = vi.spyOn(featureFlagsService, 'rollbackFeature')
        .mockResolvedValue();

      // Mock deployment failure
      vi.spyOn(errorHandlingDeploymentService as any, 'validateDeploymentPhase')
        .mockRejectedValue(new Error('Validation failed'));

      await expect(errorHandlingDeploymentService.deployErrorHandling())
        .rejects.toThrow('Validation failed');

      // Verify rollback was called
      expect(rollbackFeatureSpy).toHaveBeenCalledWith('error-handling-boom');
      expect(rollbackFeatureSpy).toHaveBeenCalledWith('error-handling-neverthrow');
      expect(rollbackFeatureSpy).toHaveBeenCalledWith('error-handling-middleware');
    });
  });

  describe('Validation Checkpoints', () => {
    it('should validate response consistency', async () => {
      // Mock error adapter responses
      const mockValidationError = vi.spyOn(errorAdapter, 'createValidationError')
        .mockReturnValue({
          isErr: () => true,
          error: Boom.badRequest('Validation failed')
        } as any);

      const mockToErrorResponse = vi.spyOn(errorAdapter, 'toErrorResponse')
        .mockReturnValue({
          success: false,
          error: {
            id: 'err_123',
            code: 'VALIDATION_FAILED',
            message: 'Please check your input and try again.',
            category: 'validation',
            retryable: false,
            timestamp: new Date().toISOString()
          },
          metadata: {
            service: 'legislative-platform'
          }
        });

      // Test parallel error handling validation
      const service = errorHandlingDeploymentService as any;
      await service.testParallelErrorHandling('validation', {
        field: 'email',
        message: 'Invalid email format'
      });

      expect(mockValidationError).toHaveBeenCalled();
      expect(mockToErrorResponse).toHaveBeenCalled();
    });

    it('should detect response inconsistencies', async () => {
      const service = errorHandlingDeploymentService as any;

      const legacyResponse = {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Legacy message',
          category: 'validation'
        }
      };

      const migratedResponse = {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'New message', // Different message
          category: 'validation'
        }
      };

      const isConsistent = service.compareErrorResponses(legacyResponse, migratedResponse);
      expect(isConsistent).toBe(false);

      const differences = service.findResponseDifferences(legacyResponse, migratedResponse);
      expect(differences).toContain('error.message: legacy="Legacy message" vs migrated="New message"');
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect and track performance metrics', async () => {
      const service = errorHandlingDeploymentService as any;
      const trackCohortMetricsSpy = vi.spyOn(abTestingService, 'trackCohortMetrics')
        .mockResolvedValue();

      const metrics = {
        responseTime: 150,
        errorRate: 0.005,
        successRate: 0.995,
        responseConsistency: 0.98
      };

      await service.trackDeploymentMetrics('boom', metrics);

      expect(trackCohortMetricsSpy).toHaveBeenCalledWith('boom', 'system', {
        responseTime: 150,
        errorRate: 0.005,
        successRate: 0.995
      });
    });

    it('should validate performance thresholds', async () => {
      const service = errorHandlingDeploymentService as any;

      // Mock data validation checkpoints to avoid undefined errors
      vi.spyOn(service, 'runDataValidationCheckpoints').mockResolvedValue();

      // Mock metrics collection
      vi.spyOn(service, 'collectPerformanceMetrics').mockResolvedValue({
        responseTime: 600, // Above 500ms threshold
        errorRate: 0.005,
        successRate: 0.995,
        responseConsistency: 0.98
      });

      await expect(service.validateDeploymentPhase('boom', 10))
        .rejects.toThrow('Response time too high for boom: 600ms');
    });

    it('should validate error rate thresholds', async () => {
      const service = errorHandlingDeploymentService as any;

      // Mock data validation checkpoints to avoid undefined errors
      vi.spyOn(service, 'runDataValidationCheckpoints').mockResolvedValue();

      // Mock metrics collection
      vi.spyOn(service, 'collectPerformanceMetrics').mockResolvedValue({
        responseTime: 150,
        errorRate: 0.015, // Above 1% threshold
        successRate: 0.985,
        responseConsistency: 0.98
      });

      await expect(service.validateDeploymentPhase('boom', 10))
        .rejects.toThrow('Error rate too high for boom: 0.015');
    });
  });

  describe('Code Complexity Validation', () => {
    it('should validate 60% code complexity reduction', async () => {
      const service = errorHandlingDeploymentService as any;

      const complexityMetrics = await service.validateCodeComplexityReduction();

      expect(complexityMetrics).toMatchObject({
        cyclomaticComplexity: expect.any(Number),
        linesOfCode: expect.any(Number),
        cognitiveComplexity: expect.any(Number),
        maintainabilityIndex: expect.any(Number),
        reductionPercentage: expect.any(Number)
      });

      // Should achieve at least 60% reduction
      expect(complexityMetrics.reductionPercentage).toBeGreaterThanOrEqual(60);
    });
  });

  describe('A/B Testing Integration', () => {
    it('should track cohort metrics for A/B testing', async () => {
      const trackCohortMetricsSpy = vi.spyOn(abTestingService, 'trackCohortMetrics')
        .mockResolvedValue();

      const service = errorHandlingDeploymentService as any;
      await service.trackDeploymentMetrics('boom', {
        responseTime: 120,
        errorRate: 0.002,
        successRate: 0.998,
        responseConsistency: 0.99
      });

      expect(trackCohortMetricsSpy).toHaveBeenCalledWith('boom', 'system', {
        responseTime: 120,
        errorRate: 0.002,
        successRate: 0.998
      });
    });
  });

  describe('Error Response Comparison', () => {
    it('should compare legacy and migrated error responses', async () => {
      const service = errorHandlingDeploymentService as any;

      const legacyResponse = {
        success: false,
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: 'Please log in to continue.',
          category: 'authentication',
          retryable: false
        }
      };

      const migratedResponse = {
        success: false,
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: 'Please log in to continue.',
          category: 'authentication',
          retryable: false
        }
      };

      const isConsistent = service.compareErrorResponses(legacyResponse, migratedResponse);
      expect(isConsistent).toBe(true);

      const differences = service.findResponseDifferences(legacyResponse, migratedResponse);
      expect(differences).toHaveLength(0);
    });
  });

  describe('Deployment Status', () => {
    it('should provide comprehensive deployment status', async () => {
      const service = errorHandlingDeploymentService as any;

      // Mock metrics collection
      vi.spyOn(service, 'collectPerformanceMetrics').mockResolvedValue({
        responseTime: 150,
        errorRate: 0.005,
        successRate: 0.995,
        responseConsistency: 0.98
      });

      vi.spyOn(service, 'validateCodeComplexityReduction').mockResolvedValue({
        cyclomaticComplexity: 15,
        linesOfCode: 200,
        cognitiveComplexity: 12,
        maintainabilityIndex: 85,
        reductionPercentage: 65
      });

      const status = await errorHandlingDeploymentService.getDeploymentStatus();

      expect(status).toMatchObject({
        status: 'deployed',
        metrics: {
          boom: expect.any(Object),
          neverthrow: expect.any(Object),
          middleware: expect.any(Object)
        },
        validationCheckpoints: expect.any(Object),
        codeComplexityReduction: expect.any(Object)
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle validation checkpoint failures gracefully', async () => {
      const service = errorHandlingDeploymentService as any;

      // Mock error adapter to throw
      vi.spyOn(errorAdapter, 'createValidationError')
        .mockImplementation(() => {
          throw new Error('Adapter error');
        });

      await expect(service.testParallelErrorHandling('validation', { field: 'test' }))
        .rejects.toThrow('Adapter error');
    });

    it('should handle performance monitoring errors', async () => {
      const service = errorHandlingDeploymentService as any;

      // Mock data validation checkpoints to avoid undefined errors
      vi.spyOn(service, 'runDataValidationCheckpoints').mockResolvedValue();

      // Mock metrics collection to throw
      vi.spyOn(service, 'collectPerformanceMetrics')
        .mockRejectedValue(new Error('Metrics collection failed'));

      await expect(service.validateDeploymentPhase('boom', 10))
        .rejects.toThrow('Metrics collection failed');
    });
  });

  describe('Gradual Rollout', () => {
    it('should execute gradual rollout with proper validation', async () => {
      const service = errorHandlingDeploymentService as any;
      const enableGradualRolloutSpy = vi.spyOn(featureFlagsService, 'enableGradualRollout')
        .mockResolvedValue();

      // Mock validation to pass quickly
      vi.spyOn(service, 'validateDeploymentPhase').mockResolvedValue();
      vi.spyOn(service, 'runComprehensiveValidation').mockResolvedValue();

      // Mock the setTimeout to resolve immediately for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback: any) => {
        callback();
        return 1 as any;
      });

      try {
        await service.executeGradualRollout();

        // Should call rollout for each percentage step
        const expectedPercentages = [5, 10, 25, 50, 100];
        for (const percentage of expectedPercentages) {
          expect(enableGradualRolloutSpy).toHaveBeenCalledWith('error-handling-boom', percentage);
          expect(enableGradualRolloutSpy).toHaveBeenCalledWith('error-handling-neverthrow', percentage);
          expect(enableGradualRolloutSpy).toHaveBeenCalledWith('error-handling-middleware', percentage);
        }
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    }, 15000); // Increase timeout for this test
  });
});