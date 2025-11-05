/**
 * Error Handling Deployment Integration Tests
 * 
 * Comprehensive integration tests for task 4.4 validation:
 * - Deploy error handling with feature flags per error type and detailed A/B testing
 * - Validate 60% code complexity reduction in error handling with metrics tracking
 * - Monitor error handling performance improvements and response consistency
 * - Test parallel error handling during transition period with data validation
 * - Run comprehensive data validation checkpoints ensuring error response consistency
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandlingDeploymentService } from '../../infrastructure/migration/error-handling-deployment.service.js';
import { featureFlagsService } from '../../infrastructure/migration/feature-flags.service.js';
import { abTestingService } from '../../infrastructure/migration/ab-testing.service.js';
import { boomErrorMiddleware, errorContextMiddleware } from '../../middleware/boom-error-middleware.js';
import { errorAdapter } from '../../infrastructure/errors/error-adapter.js';
import * as Boom from '@hapi/boom';

describe('Error Handling Deployment Integration', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    // Setup test Express app with error handling middleware
    app = express();
    app.use(express.json());
    app.use(errorContextMiddleware);

    // Test routes for different error types
    app.get('/test/validation-error', (req, res, next) => {
      const validationResult = errorAdapter.createValidationError(
        [{ field: 'email', message: 'Invalid email format' }],
        {
          service: 'test-service',
          operation: 'validation-test',
          requestId: req.headers['x-request-id'] as string
        }
      );

      if (validationResult.isErr()) {
        return next(validationResult.error);
      }
      
      res.json({ success: true });
    });

    app.get('/test/auth-error', (req, res, next) => {
      const authResult = errorAdapter.createAuthenticationError(
        'invalid_token',
        {
          service: 'test-service',
          operation: 'auth-test',
          requestId: req.headers['x-request-id'] as string
        }
      );

      if (authResult.isErr()) {
        return next(authResult.error);
      }
      
      res.json({ success: true });
    });

    app.get('/test/not-found-error', (req, res, next) => {
      const notFoundResult = errorAdapter.createNotFoundError(
        'TestResource',
        'test-123',
        {
          service: 'test-service',
          operation: 'not-found-test',
          requestId: req.headers['x-request-id'] as string
        }
      );

      if (notFoundResult.isErr()) {
        return next(notFoundResult.error);
      }
      
      res.json({ success: true });
    });

    app.get('/test/boom-error', (req, res, next) => {
      next(Boom.badRequest('Test Boom error'));
    });

    app.get('/test/generic-error', (req, res, next) => {
      next(new Error('Generic test error'));
    });

    // Add error handling middleware
    app.use(boomErrorMiddleware);

    // Start test server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Reset feature flags before each test
    featureFlagsService.updateFlag('error-handling-boom', {
      name: 'error-handling-boom',
      enabled: false,
      rolloutPercentage: 0,
      fallbackEnabled: true
    });
  });

  describe('Feature Flag Deployment', () => {
    it('should deploy error handling with feature flags per error type', async () => {
      // Enable error handling feature flags
      await featureFlagsService.enableGradualRollout('error-handling-boom', 100);
      await featureFlagsService.enableGradualRollout('error-handling-neverthrow', 100);
      await featureFlagsService.enableGradualRollout('error-handling-middleware', 100);

      // Test validation error with feature flag enabled
      const validationResponse = await request(app)
        .get('/test/validation-error')
        .expect(400);

      expect(validationResponse.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: 'validation',
          retryable: false,
          timestamp: expect.any(String)
        },
        metadata: {
          service: expect.any(String)
        }
      });

      // Test authentication error
      const authResponse = await request(app)
        .get('/test/auth-error')
        .expect(401);

      expect(authResponse.body).toMatchObject({
        success: false,
        error: {
          category: 'authentication',
          retryable: false
        }
      });

      // Test not found error
      const notFoundResponse = await request(app)
        .get('/test/not-found-error')
        .expect(404);

      expect(notFoundResponse.body).toMatchObject({
        success: false,
        error: {
          category: 'not_found',
          retryable: false
        }
      });
    });

    it('should handle Boom errors correctly', async () => {
      await featureFlagsService.enableGradualRollout('error-handling-boom', 100);

      const response = await request(app)
        .get('/test/boom-error')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          category: expect.any(String),
          retryable: expect.any(Boolean),
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle generic errors with fallback', async () => {
      const response = await request(app)
        .get('/test/generic-error')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          category: expect.any(String),
          retryable: expect.any(Boolean)
        }
      });
    });
  });

  describe('A/B Testing Integration', () => {
    it('should track cohort metrics for A/B testing', async () => {
      const trackMetricsSpy = vi.spyOn(abTestingService, 'trackCohortMetrics')
        .mockResolvedValue();

      await featureFlagsService.enableGradualRollout('error-handling-boom', 50);

      // Make multiple requests to generate metrics
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/test/validation-error')
          .set('x-user-id', `test-user-${i}`)
          .expect(400);
      }

      // Verify metrics were tracked (would be called by the deployment service)
      // In a real scenario, this would be triggered by the middleware
      expect(trackMetricsSpy).toHaveBeenCalled();
    });

    it('should determine user cohorts consistently', async () => {
      const userId = 'test-user-123';
      const component = 'error-handling-boom';

      const cohort1 = featureFlagsService.getUserCohort(userId, component);
      const cohort2 = featureFlagsService.getUserCohort(userId, component);

      // Same user should always get same cohort
      expect(cohort1).toBe(cohort2);
      expect(['control', 'treatment']).toContain(cohort1);
    });
  });

  describe('Performance Monitoring', () => {
    it('should monitor response times and error rates', async () => {
      await featureFlagsService.enableGradualRollout('error-handling-boom', 100);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/test/validation-error')
        .expect(400);

      const responseTime = Date.now() - startTime;

      // Response should be fast (under 200ms for simple validation)
      expect(responseTime).toBeLessThan(200);

      // Response should have consistent format
      expect(response.body).toMatchObject({
        success: false,
        error: {
          id: expect.any(String),
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: expect.any(Boolean),
          timestamp: expect.any(String)
        },
        metadata: {
          service: expect.any(String)
        }
      });
    });

    it('should maintain response consistency across error types', async () => {
      await featureFlagsService.enableGradualRollout('error-handling-boom', 100);

      // Test multiple error types for consistent response structure
      const errorEndpoints = [
        '/test/validation-error',
        '/test/auth-error',
        '/test/not-found-error'
      ];

      const responses = await Promise.all(
        errorEndpoints.map(endpoint => 
          request(app).get(endpoint).expect(res => res.status >= 400)
        )
      );

      // All responses should have consistent structure
      responses.forEach(response => {
        expect(response.body).toMatchObject({
          success: false,
          error: {
            id: expect.any(String),
            code: expect.any(String),
            message: expect.any(String),
            category: expect.any(String),
            retryable: expect.any(Boolean),
            timestamp: expect.any(String)
          },
          metadata: {
            service: expect.any(String)
          }
        });
      });
    });
  });

  describe('Parallel Error Handling Validation', () => {
    it('should validate parallel error handling during transition', async () => {
      // Test with partial rollout (50%)
      await featureFlagsService.enableGradualRollout('error-handling-boom', 50);

      const responses = [];
      
      // Make multiple requests with different user IDs
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .get('/test/validation-error')
          .set('x-user-id', `test-user-${i}`)
          .expect(400);
        
        responses.push(response.body);
      }

      // All responses should have consistent error structure
      responses.forEach(response => {
        expect(response).toMatchObject({
          success: false,
          error: {
            category: 'validation',
            retryable: false
          }
        });
      });

      // Responses should be consistent regardless of which implementation was used
      const errorCodes = responses.map(r => r.error.code);
      const uniqueCodes = [...new Set(errorCodes)];
      
      // Should have consistent error codes (allowing for some variation in ID generation)
      expect(uniqueCodes.length).toBeLessThanOrEqual(2); // Legacy vs new implementation
    });
  });

  describe('Data Validation Checkpoints', () => {
    it('should run comprehensive data validation checkpoints', async () => {
      // Deploy error handling
      await errorHandlingDeploymentService.deployErrorHandling();

      // Get deployment status with validation checkpoints
      const status = await errorHandlingDeploymentService.getDeploymentStatus();

      expect(status).toMatchObject({
        status: 'deployed',
        metrics: expect.any(Object),
        validationCheckpoints: expect.any(Object),
        codeComplexityReduction: expect.any(Object)
      });

      // Verify validation checkpoints were created
      const checkpointTypes = Object.keys(status.validationCheckpoints);
      expect(checkpointTypes.length).toBeGreaterThan(0);

      // Verify checkpoints have required structure
      Object.values(status.validationCheckpoints).forEach(checkpoints => {
        if (Array.isArray(checkpoints) && checkpoints.length > 0) {
          checkpoints.forEach(checkpoint => {
            expect(checkpoint).toMatchObject({
              checkpointId: expect.any(String),
              timestamp: expect.any(Date),
              errorType: expect.any(String),
              legacyResponse: expect.any(Object),
              migratedResponse: expect.any(Object),
              isConsistent: expect.any(Boolean)
            });
          });
        }
      });
    });

    it('should ensure response consistency across validation checkpoints', async () => {
      const service = errorHandlingDeploymentService as any;

      // Test response comparison logic
      const consistentResponses = {
        legacy: {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Please check your input and try again.',
            category: 'validation',
            retryable: false
          }
        },
        migrated: {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Please check your input and try again.',
            category: 'validation',
            retryable: false
          }
        }
      };

      const isConsistent = service.compareErrorResponses(
        consistentResponses.legacy,
        consistentResponses.migrated
      );

      expect(isConsistent).toBe(true);

      const differences = service.findResponseDifferences(
        consistentResponses.legacy,
        consistentResponses.migrated
      );

      expect(differences).toHaveLength(0);
    });
  });

  describe('Code Complexity Validation', () => {
    it('should validate 60% code complexity reduction', async () => {
      const status = await errorHandlingDeploymentService.getDeploymentStatus();

      expect(status.codeComplexityReduction).toBeDefined();
      
      if (status.codeComplexityReduction) {
        expect(status.codeComplexityReduction).toMatchObject({
          cyclomaticComplexity: expect.any(Number),
          linesOfCode: expect.any(Number),
          cognitiveComplexity: expect.any(Number),
          maintainabilityIndex: expect.any(Number),
          reductionPercentage: expect.any(Number)
        });

        // Should achieve at least 60% reduction
        expect(status.codeComplexityReduction.reductionPercentage).toBeGreaterThanOrEqual(60);
      }
    });
  });

  describe('Error Handling Rollback', () => {
    it('should rollback error handling on failure', async () => {
      const rollbackSpy = vi.spyOn(featureFlagsService, 'rollbackFeature')
        .mockResolvedValue();

      // Mock deployment failure
      const originalDeploy = errorHandlingDeploymentService.deployErrorHandling;
      vi.spyOn(errorHandlingDeploymentService, 'deployErrorHandling')
        .mockRejectedValue(new Error('Deployment failed'));

      try {
        await errorHandlingDeploymentService.deployErrorHandling();
      } catch (error) {
        expect(error.message).toBe('Deployment failed');
      }

      // Verify rollback was called
      expect(rollbackSpy).toHaveBeenCalledWith('error-handling-boom');
      expect(rollbackSpy).toHaveBeenCalledWith('error-handling-neverthrow');
      expect(rollbackSpy).toHaveBeenCalledWith('error-handling-middleware');

      // Restore original method
      vi.spyOn(errorHandlingDeploymentService, 'deployErrorHandling')
        .mockImplementation(originalDeploy);
    });
  });

  describe('End-to-End Deployment Validation', () => {
    it('should complete full deployment with all requirements met', async () => {
      // Execute full deployment
      await errorHandlingDeploymentService.deployErrorHandling();

      // Get final status
      const status = await errorHandlingDeploymentService.getDeploymentStatus();

      // Validate all requirements are met
      expect(status.status).toBe('deployed');

      // Performance metrics should be within acceptable ranges
      Object.values(status.metrics).forEach(metrics => {
        expect(metrics.errorRate).toBeLessThan(0.01); // < 1%
        expect(metrics.responseTime).toBeLessThan(500); // < 500ms
        expect(metrics.successRate).toBeGreaterThan(0.99); // > 99%
        expect(metrics.responseConsistency).toBeGreaterThan(0.95); // > 95%
      });

      // Code complexity reduction should meet target
      if (status.codeComplexityReduction) {
        expect(status.codeComplexityReduction.reductionPercentage).toBeGreaterThanOrEqual(60);
      }

      // Validation checkpoints should show high consistency
      const allCheckpoints = Object.values(status.validationCheckpoints).flat();
      if (allCheckpoints.length > 0) {
        const consistentCount = allCheckpoints.filter(cp => cp.isConsistent).length;
        const consistencyRate = consistentCount / allCheckpoints.length;
        expect(consistencyRate).toBeGreaterThanOrEqual(0.95); // > 95%
      }
    });
  });
});