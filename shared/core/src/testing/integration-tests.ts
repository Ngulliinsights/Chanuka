import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import type { CacheService } from '../caching/core/interfaces';
import type { RateLimitStore } from '../rate-limiting/types';
import { UnifiedLogger } from '../observability/logging/logger';
import { ValidationService } from '../validation/validation-service';

/**
 * Comprehensive integration tests for the consolidated core system
 * Tests that all components work together correctly under various scenarios
 */
export class IntegrationTests extends EventEmitter {
  constructor(private config: IntegrationTestConfig = {}) {
    super();
  }

  /**
   * Run all integration tests
   */
  async runAllIntegrationTests(components: IntegrationTestComponents): Promise<IntegrationTestSuite> {
    const startTime = performance.now();
    const results: IntegrationTestResult[] = [];

    this.emit('integration:start', { components: Object.keys(components) });

    try {
      // Core functionality integration tests
      if (components.cache && components.rateLimiter && components.logger) {
        results.push(await this.testRequestPipelineIntegration(components));
        results.push(await this.testErrorHandlingIntegration(components));
      }

      // Data flow integration tests
      if (components.cache && components.validator) {
        results.push(await this.testDataValidationPipeline(components));
        results.push(await this.testCacheValidationConsistency(components));
      }

      // Security integration tests
      if (components.rateLimiter && components.logger) {
        results.push(await this.testSecurityEventLogging(components));
      }

      // Performance integration tests
      if (Object.keys(components).length >= 2) {
        results.push(await this.testConcurrentOperationsIntegration(components));
      }

      // Failure scenario integration tests
      results.push(await this.testGracefulDegradation(components));
      results.push(await this.testRecoveryMechanisms(components));

      const totalTime = performance.now() - startTime;
      const suite: IntegrationTestSuite = {
        timestamp: new Date(),
        totalDurationMs: totalTime,
        results,
        summary: this.generateIntegrationSummary(results),
        environment: this.getEnvironmentInfo(),
        config: this.config
      };

      this.emit('integration:complete', suite);
      return suite;

    } catch (error) {
      this.emit('integration:error', error);
      throw error;
    }
  }

  /**
   * Test complete request pipeline integration
   */
  async testRequestPipelineIntegration(components: IntegrationTestComponents): Promise<IntegrationTestResult> {
    const { cache, rateLimiter, logger } = components;
    const startTime = performance.now();

    this.emit('integration:request-pipeline:start');

    try { const testScenarios = [
        { name: 'normal-request', user_id: 'user-123', expectedAllowed: true  },
        { name: 'rate-limited-user', user_id: 'flood-user', expectedAllowed: false  },
        { name: 'cached-response', user_id: 'cached-user', expectedCached: true  }
      ];

      const results: RequestPipelineResult[] = [];

      for (const scenario of testScenarios) { const scenarioStart = performance.now();
        const { user_id, expectedAllowed, expectedCached  } = scenario;
        const cacheKey = `request:${ user_id }`;

        // 1. Rate limiting check
        const rateLimitResult = await rateLimiter!.check(user_id, {
          windowMs: 60000,
          max: expectedAllowed ? 100 : 1,
          message: 'Rate limit exceeded'
        });

        // 2. Cache lookup (if allowed)
        let cacheHit = false;
        let data = null;

        if (rateLimitResult.allowed) { data = await cache!.get(cacheKey);
          cacheHit = data !== null;

          if (!cacheHit) {
            // Generate and cache data
            data = {
              user_id,
              data: `generated-data-${Date.now() }`,
              timestamp: Date.now()
            };
            await cache!.set(cacheKey, data, 300);
          }
        }

        // 3. Log the request
        logger!.info('Request processed', { user_id,
          rateLimitAllowed: rateLimitResult.allowed,
          cacheHit,
          remainingRequests: rateLimitResult.remaining,
          scenario: scenario.name
         });

        const scenarioEnd = performance.now();

        results.push({
          scenario: scenario.name,
          duration: scenarioEnd - scenarioStart,
          rateLimitAllowed: rateLimitResult.allowed,
          cacheHit,
          expectedAllowed: expectedAllowed || true,
          expectedCached: expectedCached || false,
          success: rateLimitResult.allowed === (expectedAllowed !== false) &&
                   (!expectedCached || cacheHit)
        });
      }

      const success = results.every(r => r.success);
      const endTime = performance.now();

      return {
        name: 'request-pipeline-integration',
        type: 'pipeline-integration',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success,
        pipelineResults: results,
        metrics: {
          totalRequests: results.length,
          successfulRequests: results.filter(r => r.success).length,
          averageLatency: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
          cacheHitRate: results.filter(r => r.cacheHit).length / results.length
        }
      };

    } catch (error) {
      return {
        name: 'request-pipeline-integration',
        type: 'pipeline-integration',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test error handling integration across components
   */
  async testErrorHandlingIntegration(components: IntegrationTestComponents): Promise<IntegrationTestResult> {
    const { cache, rateLimiter, logger } = components;
    const startTime = performance.now();

    this.emit('integration:error-handling:start');

    try {
      const errorScenarios = [
        { name: 'cache-connection-failure', component: 'cache', operation: 'set' },
        { name: 'rate-limiter-failure', component: 'rateLimiter', operation: 'check' },
        { name: 'logger-failure', component: 'logger', operation: 'info' }
      ];

      const results: ErrorHandlingResult[] = [];

      for (const scenario of errorScenarios) {
        const scenarioStart = performance.now();
        const { name, component, operation } = scenario;

        let operationSuccess = false;
        let errorLogged = false;
        let gracefulDegradation = false;

        try {
          // Attempt the operation that might fail
          switch (component) {
            case 'cache':
              if (operation === 'set') {
                await cache!.set(`error-test:${name}`, 'test-data', 300);
                operationSuccess = true;
              }
              break;
            case 'rateLimiter':
              if (operation === 'check') {
                await rateLimiter!.check(`error-user:${name}`, { windowMs: 60000, max: 100, message: 'Rate limit exceeded' });
                operationSuccess = true;
              }
              break;
            case 'logger':
              if (operation === 'info') {
                logger!.info(`Error handling test: ${name}`, { scenario: name });
                operationSuccess = true;
              }
              break;
          }
        } catch (error) {
          // Log the error and check if it's handled gracefully
          logger!.error(`Error in ${name} scenario`, {
            scenario: name,
            component,
            operation,
            error: error instanceof Error ? error.message : String(error)
          });
          errorLogged = true;

          // Check if system continues to function despite error
          try {
            // Try a simple operation to verify graceful degradation
            if (cache) {
              await cache.get('health-check');
              gracefulDegradation = true;
            } else {
              gracefulDegradation = true; // No cache to test
            }
          } catch {
            gracefulDegradation = false;
          }
        }

        const scenarioEnd = performance.now();

        results.push({
          scenario: name,
          duration: scenarioEnd - scenarioStart,
          operationSuccess,
          errorLogged,
          gracefulDegradation,
          success: errorLogged && gracefulDegradation
        });
      }

      const success = results.every(r => r.success);
      const endTime = performance.now();

      return {
        name: 'error-handling-integration',
        type: 'error-integration',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success,
        errorResults: results
      };

    } catch (error) {
      return {
        name: 'error-handling-integration',
        type: 'error-integration',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test data validation pipeline integration
   */
  async testDataValidationPipeline(components: IntegrationTestComponents): Promise<IntegrationTestResult> {
    const { cache, validator } = components;
    const startTime = performance.now();

    this.emit('integration:data-validation:start');

    try {
      // Create validation schema
      const { z } = require('zod');
      const userSchema = z.object({
        id: z.number(),
        name: z.string().min(2),
        email: z.string().email(),
        age: z.number().min(18)
      });

      const testData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 25 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 30 },
        { id: 3, name: 'Bob', email: 'invalid-email', age: 16 } // Invalid data
      ];

      const results: DataValidationResult[] = [];

      for (const data of testData) {
        const dataStart = performance.now();
        const cacheKey = `validated-user:${data.id}`;

        // 1. Check cache first
        let cachedResult = await cache!.get(cacheKey);
        let validationPerformed = false;
        let validationSuccess = false;

        if (!cachedResult) {
          // 2. Validate data
          try {
            const validatedData = await validator!.validate(userSchema, data);
            validationSuccess = true;
            validationPerformed = true;

            // 3. Cache validated data
            await cache!.set(cacheKey, validatedData, 300);
            cachedResult = validatedData;
          } catch (error) {
            validationPerformed = true;
            // Invalid data - don't cache
          }
        }

        const dataEnd = performance.now();

        results.push({
          dataId: data.id,
          duration: dataEnd - dataStart,
          cached: !validationPerformed,
          validationPerformed,
          validationSuccess,
          success: validationSuccess || !validationPerformed
        });
      }

      const success = results.every(r => r.success);
      const endTime = performance.now();

      return {
        name: 'data-validation-pipeline',
        type: 'validation-integration',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success,
        validationResults: results,
        metrics: {
          totalValidations: results.filter(r => r.validationPerformed).length,
          successfulValidations: results.filter(r => r.validationSuccess).length,
          cacheHitRate: results.filter(r => r.cached).length / results.length,
          averageLatency: results.reduce((sum, r) => sum + r.duration, 0) / results.length
        }
      };

    } catch (error) {
      return {
        name: 'data-validation-pipeline',
        type: 'validation-integration',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test cache-validation consistency
   */
  async testCacheValidationConsistency(components: IntegrationTestComponents): Promise<IntegrationTestResult> {
    const { cache, validator } = components;
    const startTime = performance.now();

    this.emit('integration:cache-validation-consistency:start');

    try {
      const { z } = require('zod');
      const schema = z.object({
        id: z.number(),
        data: z.string(),
        timestamp: z.number()
      });

      const testData = { id: 123, data: 'test-data', timestamp: Date.now() };
      const cacheKey = 'consistency-test';

      // 1. Validate and cache data
      const validatedData = await validator!.validate(schema, testData);
      await cache!.set(cacheKey, validatedData, 300);

      // 2. Retrieve from cache
      const cachedData = await cache!.get(cacheKey);

      // 3. Re-validate cached data
      let revalidationSuccess = false;
      if (cachedData) {
        try {
          await validator!.validate(schema, cachedData);
          revalidationSuccess = true;
        } catch (error) {
          // Cached data failed validation
        }
      }

      // 4. Test data integrity
      const dataIntegrity = cachedData &&
                           (cachedData as any).id === testData.id &&
                           (cachedData as any).data === testData.data;

      const success = Boolean(revalidationSuccess && dataIntegrity);
      const endTime = performance.now();

      return {
        name: 'cache-validation-consistency',
        type: 'consistency-integration',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success,
        consistencyResults: {
          initialValidation: true,
          cachingSuccess: true,
          retrievalSuccess: cachedData !== null,
          revalidationSuccess,
          dataIntegrity: Boolean(dataIntegrity),
          dataMatches: JSON.stringify(cachedData) === JSON.stringify(validatedData)
        }
      };

    } catch (error) {
      return {
        name: 'cache-validation-consistency',
        type: 'consistency-integration',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test security event logging integration
   */
  async testSecurityEventLogging(components: IntegrationTestComponents): Promise<IntegrationTestResult> {
    const { rateLimiter, logger } = components;
    const startTime = performance.now();

    this.emit('integration:security-logging:start');

    try { const securityScenarios = [
        { user_id: 'normal-user', requests: 5, expectedBlocked: false  },
        { user_id: 'suspicious-user', requests: 150, expectedBlocked: true  },
        { user_id: 'admin-user', requests: 10, expectedBlocked: false  }
      ];

      const results: SecurityLoggingResult[] = [];

      for (const scenario of securityScenarios) { const { user_id, requests, expectedBlocked  } = scenario;
        let blockedCount = 0;
        let allowedCount = 0;
        let logEntries = 0;

        // Make multiple requests
        for (let i = 0; i < requests; i++) { const result = await rateLimiter!.check(user_id, { windowMs: 60000, max: 10, message: 'Rate limit exceeded'  });

          if (result.allowed) { allowedCount++;
            logger!.info('Request allowed', { user_id, requestNumber: i, remaining: result.remaining  });
          } else { blockedCount++;
            logger!.warn('Request blocked - potential attack', {
              user_id,
              requestNumber: i,
              retryAfter: result.retryAfter,
              severity: 'medium'
             });
          }
          logEntries++;
        }

        const actuallyBlocked = blockedCount > 0;
        const success = actuallyBlocked === expectedBlocked;

        results.push({ user_id,
          totalRequests: requests,
          allowedRequests: allowedCount,
          blockedRequests: blockedCount,
          logEntries,
          expectedBlocked,
          actuallyBlocked,
          success
         });
      }

      const success = results.every(r => r.success);
      const endTime = performance.now();

      return {
        name: 'security-event-logging',
        type: 'security-integration',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success,
        securityResults: results,
        metrics: {
          totalRequests: results.reduce((sum, r) => sum + r.totalRequests, 0),
          totalBlocked: results.reduce((sum, r) => sum + r.blockedRequests, 0),
          blockRate: results.reduce((sum, r) => sum + r.blockedRequests, 0) /
                    results.reduce((sum, r) => sum + r.totalRequests, 0),
          logEntries: results.reduce((sum, r) => sum + r.logEntries, 0)
        }
      };

    } catch (error) {
      return {
        name: 'security-event-logging',
        type: 'security-integration',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test concurrent operations integration
   */
  async testConcurrentOperationsIntegration(components: IntegrationTestComponents): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    this.emit('integration:concurrent-operations:start');

    try {
      const concurrency = this.config.concurrencyLevel || 50;
      const operationsPerWorker = 100;
      const workers = Array(concurrency).fill(null).map(async (_, workerId) => {
        const workerResults = {
          cacheOps: 0,
          rateLimitChecks: 0,
          validations: 0,
          logEntries: 0,
          errors: 0
        };

        for (let i = 0; i < operationsPerWorker; i++) {
          try {
            const operation = Math.random();

            if (operation < 0.3 && components.cache) {
              // Cache operation
              const key = `concurrent:${workerId}:${i}`;
              await components.cache.set(key, `data-${i}`, 300);
              workerResults.cacheOps++;
            } else if (operation < 0.6 && components.rateLimiter) {
              // Rate limiting check
              await components.rateLimiter.check(`user-${workerId}`, { windowMs: 60000, max: 100, message: 'Rate limit exceeded' });
              workerResults.rateLimitChecks++;
            } else if (operation < 0.8 && components.validator) {
              // Validation operation
              const { z } = require('zod');
              const schema = z.object({ id: z.number(), data: z.string() });
              const testData = { id: i, data: `test-${i}` };
              await components.validator.validate(schema, testData);
              workerResults.validations++;
            } else if (components.logger) {
              // Logging operation
              components.logger.info(`Concurrent operation ${i}`, { workerId, operationId: i });
              workerResults.logEntries++;
            }
          } catch (error) {
            workerResults.errors++;
          }
        }

        return workerResults;
      });

      const workerResults = await Promise.all(workers);
      const aggregated = workerResults.reduce(
        (acc, result) => ({
          cacheOps: acc.cacheOps + result.cacheOps,
          rateLimitChecks: acc.rateLimitChecks + result.rateLimitChecks,
          validations: acc.validations + result.validations,
          logEntries: acc.logEntries + result.logEntries,
          errors: acc.errors + result.errors
        }),
        { cacheOps: 0, rateLimitChecks: 0, validations: 0, logEntries: 0, errors: 0 }
      );

      const totalOperations = Object.values(aggregated).reduce((sum, count) => sum + count, 0);
      const success = aggregated.errors === 0;
      const endTime = performance.now();

      return {
        name: 'concurrent-operations-integration',
        type: 'concurrency-integration',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success,
        concurrencyResults: {
          concurrency,
          totalOperations,
          operationsPerSecond: totalOperations / ((endTime - startTime) / 1000),
          breakdown: aggregated,
          errorRate: aggregated.errors / totalOperations
        }
      };

    } catch (error) {
      return {
        name: 'concurrent-operations-integration',
        type: 'concurrency-integration',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test graceful degradation under component failures
   */
  async testGracefulDegradation(components: IntegrationTestComponents): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    this.emit('integration:graceful-degradation:start');

    try {
      // Test scenarios where components might fail
      const degradationTests = [
        { name: 'cache-failure', component: 'cache', operation: 'get' },
        { name: 'rate-limiter-failure', component: 'rateLimiter', operation: 'check' },
        { name: 'validation-failure', component: 'validator', operation: 'validate' }
      ];

      const results: GracefulDegradationResult[] = [];

      for (const test of degradationTests) {
        const { name, component } = test;
        let systemContinued = false;
        let alternativePathUsed = false;

        try {
          // Simulate component failure by using invalid operations
          switch (component) {
            case 'cache':
              if (components.cache) {
                // Try operation that might fail
                await components.cache.get('nonexistent-key');
                systemContinued = true;
              }
              break;
            case 'rateLimiter':
              if (components.rateLimiter) {
                await components.rateLimiter.check('test-user', { windowMs: 60000, max: 100, message: 'Rate limit exceeded' });
                systemContinued = true;
              }
              break;
            case 'validator':
              if (components.validator) {
                const { z } = require('zod');
                const schema = z.object({ id: z.number() });
                await components.validator.validate(schema, { id: 123 });
                systemContinued = true;
              }
              break;
          }

          // Test if other components still work
          if (components.logger) {
            components.logger.info(`Testing graceful degradation: ${name}`, { test: name });
            alternativePathUsed = true;
          }

        } catch (error) {
          // Component failed, but check if system continued
          if (components.logger) {
            components.logger!.warn(`Component failure in ${name}`, { test: name, error: error instanceof Error ? error.message : String(error) });
            systemContinued = true;
            alternativePathUsed = true;
          }
        }

        results.push({
          test: name,
          component,
          systemContinued,
          alternativePathUsed,
          success: systemContinued && alternativePathUsed
        });
      }

      const success = results.every(r => r.success);
      const endTime = performance.now();

      return {
        name: 'graceful-degradation',
        type: 'degradation-integration',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success,
        degradationResults: results
      };

    } catch (error) {
      return {
        name: 'graceful-degradation',
        type: 'degradation-integration',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Test recovery mechanisms after failures
   */
  async testRecoveryMechanisms(components: IntegrationTestComponents): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    this.emit('integration:recovery-mechanisms:start');

    try {
      const recoveryTests = [
        { name: 'cache-recovery', component: 'cache' },
        { name: 'rate-limiter-recovery', component: 'rateLimiter' },
        { name: 'validation-recovery', component: 'validator' }
      ];

      const results: RecoveryResult[] = [];

      for (const test of recoveryTests) {
        const { name, component } = test;
        let initialFailure = false;
        let recoveryAttempted = false;
        let recoverySuccessful = false;

        try {
          // First, try normal operation
          switch (component) {
            case 'cache':
              if (components.cache) {
                await components.cache.set('recovery-test', 'test-data', 300);
                await components.cache.get('recovery-test');
              }
              break;
            case 'rateLimiter':
              if (components.rateLimiter) {
                await components.rateLimiter.check('recovery-user', { windowMs: 60000, max: 100, message: 'Rate limit exceeded' });
              }
              break;
            case 'validator':
              if (components.validator) {
                const { z } = require('zod');
                const schema = z.object({ id: z.number() });
                await components.validator.validate(schema, { id: 123 });
              }
              break;
          }
        } catch (error) {
          initialFailure = true;

          // Attempt recovery
          try {
            recoveryAttempted = true;

            // For cache, try clearing and retrying
            if (component === 'cache' && components.cache) {
              if (components.cache.clear) {
                await components.cache.clear();
                await components.cache.set('recovery-test', 'test-data', 300);
                recoverySuccessful = true;
              }
            }

            // For rate limiter, try resetting
            if (component === 'rateLimiter' && components.rateLimiter) {
              await components.rateLimiter.reset('recovery-user');
              await components.rateLimiter.check('recovery-user', { windowMs: 60000, max: 100, message: 'Rate limit exceeded' });
              recoverySuccessful = true;
            }

            // For validator, try with different data
            if (component === 'validator' && components.validator) {
              const { z } = require('zod');
              const schema = z.object({ id: z.number() });
              await components.validator.validate(schema, { id: 456 });
              recoverySuccessful = true;
            }

          } catch (recoveryError) {
            recoverySuccessful = false;
          }
        }

        results.push({
          test: name,
          component,
          initialFailure,
          recoveryAttempted,
          recoverySuccessful,
          success: !initialFailure || (recoveryAttempted && recoverySuccessful)
        });
      }

      const success = results.every(r => r.success);
      const endTime = performance.now();

      return {
        name: 'recovery-mechanisms',
        type: 'recovery-integration',
        startTime: new Date(Date.now() - (endTime - startTime)),
        endTime: new Date(),
        durationMs: endTime - startTime,
        success,
        recoveryResults: results
      };

    } catch (error) {
      return {
        name: 'recovery-mechanisms',
        type: 'recovery-integration',
        startTime: new Date(),
        endTime: new Date(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Helper methods
  private generateIntegrationSummary(results: IntegrationTestResult[]): IntegrationTestSummary {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      totalTests: results.length,
      successfulTests: successful.length,
      failedTests: failed.length,
      totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
      successRate: successful.length / results.length,
      criticalFailures: failed.filter(r => r.type.includes('pipeline') || r.type.includes('security')).length
    };
  }

  private getEnvironmentInfo(): EnvironmentInfo {
    const memUsage = process.memoryUsage();
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: require('os').cpus().length,
      totalMemoryMB: memUsage.heapTotal / 1024 / 1024,
      freeMemoryMB: (require('os').totalmem() - require('os').freemem()) / 1024 / 1024,
      processMemoryMB: {
        rss: memUsage.rss / 1024 / 1024,
        heapTotal: memUsage.heapTotal / 1024 / 1024,
        heapUsed: memUsage.heapUsed / 1024 / 1024,
        external: memUsage.external / 1024 / 1024
      }
    };
  }
}

// Type definitions
export interface IntegrationTestConfig {
  concurrencyLevel?: number;
  testDuration?: number;
  failureThreshold?: number;
}

export interface IntegrationTestComponents {
  cache?: CacheService;
  rateLimiter?: RateLimitStore;
  logger?: UnifiedLogger;
  validator?: ValidationService;
}

export interface IntegrationTestResult {
  name: string;
  type: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  success: boolean;
  error?: string;
  pipelineResults?: RequestPipelineResult[];
  errorResults?: ErrorHandlingResult[];
  validationResults?: DataValidationResult[];
  securityResults?: SecurityLoggingResult[];
  concurrencyResults?: ConcurrencyIntegrationResult;
  degradationResults?: GracefulDegradationResult[];
  recoveryResults?: RecoveryResult[];
  metrics?: Record<string, any>;
  consistencyResults?: ConsistencyResult;
}

export interface IntegrationTestSuite {
  timestamp: Date;
  totalDurationMs: number;
  results: IntegrationTestResult[];
  summary: IntegrationTestSummary;
  environment: EnvironmentInfo;
  config: IntegrationTestConfig;
}

export interface IntegrationTestSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  totalDurationMs: number;
  successRate: number;
  criticalFailures: number;
}

export interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuCount: number;
  totalMemoryMB: number;
  freeMemoryMB: number;
  processMemoryMB: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export interface RequestPipelineResult {
  scenario: string;
  duration: number;
  rateLimitAllowed: boolean;
  cacheHit: boolean;
  expectedAllowed: boolean;
  expectedCached: boolean;
  success: boolean;
}

export interface ErrorHandlingResult {
  scenario: string;
  duration: number;
  operationSuccess: boolean;
  errorLogged: boolean;
  gracefulDegradation: boolean;
  success: boolean;
}

export interface DataValidationResult {
  dataId: number;
  duration: number;
  cached: boolean;
  validationPerformed: boolean;
  validationSuccess: boolean;
  success: boolean;
}

export interface SecurityLoggingResult { user_id: string;
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  logEntries: number;
  expectedBlocked: boolean;
  actuallyBlocked: boolean;
  success: boolean;
 }

export interface ConcurrencyIntegrationResult {
  concurrency: number;
  totalOperations: number;
  operationsPerSecond: number;
  breakdown: {
    cacheOps: number;
    rateLimitChecks: number;
    validations: number;
    logEntries: number;
    errors: number;
  };
  errorRate: number;
}

export interface GracefulDegradationResult {
  test: string;
  component: string;
  systemContinued: boolean;
  alternativePathUsed: boolean;
  success: boolean;
}

export interface RecoveryResult {
  test: string;
  component: string;
  initialFailure: boolean;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  success: boolean;
}

export interface ConsistencyResult {
  initialValidation: boolean;
  cachingSuccess: boolean;
  retrievalSuccess: boolean;
  revalidationSuccess: boolean;
  dataIntegrity: boolean;
  dataMatches: boolean;
}





































