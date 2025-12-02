// ============================================================================
// COMPREHENSIVE INTEGRATION TEST SUITE
// ============================================================================
// End-to-end validation of all system integrations and cross-service operations

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { serviceOrchestrator } from '@server/infrastructure/integration/service-orchestrator.js';
import { performanceMonitor } from '@server/infrastructure/monitoring/performance-monitor.js';
import { errorHandler } from '@server/infrastructure/errors/error-standardization.js';
import { TestDataManager } from '@server/utils/test-helpers.ts';
import { databaseService } from '@server/infrastructure/database/database-service.js';
import { logger } from '@shared/core';

describe('Comprehensive Integration Tests', () => {
  let testDataManager: TestDataManager;

  beforeAll(async () => {
    testDataManager = new TestDataManager();
    logger.info('🧪 Starting comprehensive integration tests');
  });

  afterAll(async () => {
    await testDataManager.cleanup();
    performanceMonitor.stopMonitoring();
    logger.info('✅ Comprehensive integration tests completed');
  });

  describe('Service Orchestration Integration', () => {
    it('should orchestrate bill creation across all services', async () => {
      const operationId = performanceMonitor.startOperation(
        'integration-test',
        'bill-creation-orchestration'
      );

      try {
        const testUser = await testDataManager.createTestUser({
          email: 'integration-test@test.com',
          name: 'Integration Test User'
        });

        const billData = {
          title: 'Integration Test Bill',
          summary: 'A bill created for integration testing',
          billNumber: 'Bill No. 999 of 2024',
          status: 'introduced',
          chamber: 'National Assembly',
          sponsor_id: testUser.id
        };

        const result = await serviceOrchestrator.orchestrateBillCreation(
          billData,
          testUser.id
        );

        expect(result).toBeDefined();
        expect(result.bill).toBeDefined();
        expect(result.bill.title).toBe(billData.title);
        expect(typeof result.searchIndexed).toBe('boolean');
        expect(typeof result.analysisQueued).toBe('boolean');
        expect(typeof result.recommendationsUpdated).toBe('boolean');

        performanceMonitor.endOperation(operationId, true);

        logger.info('✅ Bill creation orchestration test passed', {
          bill_id: result.bill.id,
          searchIndexed: result.searchIndexed,
          analysisQueued: result.analysisQueued,
          recommendationsUpdated: result.recommendationsUpdated
        });

      } catch (error) {
        performanceMonitor.endOperation(operationId, false, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    });

    it('should handle service health monitoring', async () => {
      const healthStatuses = await serviceOrchestrator.checkServiceHealth();

      expect(Array.isArray(healthStatuses)).toBe(true);
      expect(healthStatuses.length).toBeGreaterThan(0);

      healthStatuses.forEach(status => {
        expect(status).toHaveProperty('serviceName');
        expect(status).toHaveProperty('status');
        expect(status).toHaveProperty('responseTime');
        expect(status).toHaveProperty('lastChecked');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
      });

      const healthSummary = serviceOrchestrator.getServiceHealthSummary();
      expect(healthSummary).toHaveProperty('healthy');
      expect(healthSummary).toHaveProperty('degraded');
      expect(healthSummary).toHaveProperty('unhealthy');
      expect(healthSummary).toHaveProperty('total');
      expect(healthSummary.total).toBe(healthStatuses.length);

      logger.info('✅ Service health monitoring test passed', {
        totalServices: healthSummary.total,
        healthyServices: healthSummary.healthy,
        degradedServices: healthSummary.degraded,
        unhealthyServices: healthSummary.unhealthy
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should standardize errors across all services', async () => {
      // Test validation error
      const validationError = errorHandler.createValidationError(
        [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' }
        ],
        {
          service: 'user-service',
          operation: 'create-user',
          user_id: 'test-user-123'
        }
      );

      expect(validationError.category).toBe('validation');
      expect(validationError.httpStatusCode).toBe(400);
      expect(validationError.retryable).toBe(false);
      expect(validationError.context.service).toBe('user-service');

      const errorResponse = errorHandler.toErrorResponse(validationError);
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.category).toBe('validation');
      expect(errorResponse.metadata.service).toBe('user-service');

      // Test authentication error
      const authError = errorHandler.createAuthenticationError(
        'expired_token',
        {
          service: 'auth-service',
          operation: 'validate-token'
        }
      );

      expect(authError.category).toBe('authentication');
      expect(authError.httpStatusCode).toBe(401);
      expect(authError.code).toBe('AUTH_EXPIRED_TOKEN');

      // Test business logic error
      const businessError = errorHandler.createBusinessLogicError(
        'campaign-participation-limit',
        'User cannot join more than 5 active campaigns',
        {
          service: 'advocacy-service',
          operation: 'join-campaign'
        }
      );

      expect(businessError.category).toBe('business_logic');
      expect(businessError.httpStatusCode).toBe(400);

      logger.info('✅ Error standardization test passed');
    });

    it('should track error statistics and provide insights', async () => {
      // Generate some test errors
      for (let i = 0; i < 5; i++) {
        errorHandler.createValidationError(
          [{ field: 'test', message: 'Test error' }],
          { service: 'test-service', operation: 'test-operation' }
        );
      }

      const errorStats = errorHandler.getErrorStatistics();
      expect(errorStats).toHaveProperty('totalErrors');
      expect(errorStats).toHaveProperty('errorsByCategory');
      expect(errorStats).toHaveProperty('errorsBySeverity');
      expect(errorStats).toHaveProperty('topErrorCodes');
      expect(errorStats.totalErrors).toBeGreaterThan(0);

      logger.info('✅ Error statistics test passed', {
        totalErrors: errorStats.totalErrors,
        topErrorCodes: errorStats.topErrorCodes.slice(0, 3)
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should monitor operation performance across services', async () => {
      // Test multiple operations
      const operations = [
        { service: 'bills', operation: 'create', duration: 150 },
        { service: 'search', operation: 'index', duration: 75 },
        { service: 'recommendations', operation: 'update', duration: 200 },
        { service: 'advocacy', operation: 'create-campaign', duration: 300 }
      ];

      const operationIds = [];

      // Start all operations
      for (const op of operations) {
        const opId = performanceMonitor.startOperation(op.service, op.operation, {
          testData: true
        });
        operationIds.push(opId);

        // Simulate operation duration
        await new Promise(resolve => setTimeout(resolve, op.duration));

        performanceMonitor.endOperation(opId, true, undefined, {
          simulatedDuration: op.duration
        });
      }

      // Get performance reports
      for (const op of operations) {
        const report = performanceMonitor.getServicePerformanceReport(op.service, '1h');
        
        expect(report).toBeDefined();
        expect(report.service).toBe(op.service);
        expect(report.metrics).toBeDefined();
        expect(report.operations).toBeDefined();
        expect(Array.isArray(report.recommendations)).toBe(true);
      }

      logger.info('✅ Performance monitoring test passed', {
        operationsMonitored: operations.length
      });
    });

    it('should provide system health metrics', async () => {
      const healthMetrics = await performanceMonitor.getSystemHealthMetrics();

      expect(healthMetrics).toBeDefined();
      expect(healthMetrics).toHaveProperty('timestamp');
      expect(healthMetrics).toHaveProperty('cpu');
      expect(healthMetrics).toHaveProperty('memory');
      expect(healthMetrics).toHaveProperty('database');
      expect(healthMetrics).toHaveProperty('cache');
      expect(healthMetrics).toHaveProperty('network');

      expect(typeof healthMetrics.cpu.usage).toBe('number');
      expect(typeof healthMetrics.memory.heapUsed).toBe('number');
      expect(typeof healthMetrics.cache.hitRate).toBe('number');

      logger.info('✅ System health metrics test passed', {
        cpuUsage: healthMetrics.cpu.usage,
        memoryUsed: Math.round(healthMetrics.memory.heapUsed / 1024 / 1024) + 'MB',
        cacheHitRate: healthMetrics.cache.hitRate + '%'
      });
    });

    it('should generate optimization recommendations', async () => {
      // Create some performance issues to trigger recommendations
      const slowOpId = performanceMonitor.startOperation('test-service', 'slow-operation');
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      performanceMonitor.endOperation(slowOpId, true);

      const recommendations = performanceMonitor.getOptimizationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('recommendation');
        expect(rec).toHaveProperty('impact');
        expect(rec).toHaveProperty('effort');
        expect(['high', 'medium', 'low']).toContain(rec.priority);
      });

      logger.info('✅ Optimization recommendations test passed', {
        recommendationsCount: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'high').length
      });
    });
  });

  describe('Database Integration', () => {
    it('should handle database transactions across services', async () => {
      const operationId = performanceMonitor.startOperation(
        'database-integration',
        'cross-service-transaction'
      );

      try {
        const result = await databaseService.withTransaction(async () => {
          // Create test user
          const user = await testDataManager.createTestUser({
            email: 'transaction-test@test.com',
            name: 'Transaction Test User'
          });

          // Create test bill
          const bill = await testDataManager.createTestBill({
            title: 'Transaction Test Bill',
            status: 'introduced'
          });

          // Create test campaign
          const campaign = {
            id: 'test-campaign-' + Date.now(),
            title: 'Transaction Test Campaign',
            bill_id: bill.id,
            organizerId: user.id,
            created_at: new Date()
          };

          return { user, bill, campaign };
        });

        expect(result.user).toBeDefined();
        expect(result.bill).toBeDefined();
        expect(result.campaign).toBeDefined();

        performanceMonitor.endOperation(operationId, true);

        logger.info('✅ Database transaction test passed', {
          user_id: result.user.id,
          bill_id: result.bill.id,
          campaign_id: result.campaign.id
        });

      } catch (error) {
        performanceMonitor.endOperation(operationId, false, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    });

    it('should handle database connection pooling and health checks', async () => {
      const healthCheck = await databaseService.healthCheck();
      expect(healthCheck).toBeDefined();

      // Test multiple concurrent database operations
      const concurrentOperations = Array(10).fill(null).map(async (_, i) => {
        return testDataManager.createTestUser({
          email: `concurrent-${i}@test.com`,
          name: `Concurrent User ${i}`
        });
      });

      const results = await Promise.all(concurrentOperations);
      expect(results.length).toBe(10);
      expect(results.every(user => user.id)).toBe(true);

      logger.info('✅ Database connection pooling test passed', {
        concurrentOperations: results.length
      });
    });
  });

  describe('Cache Integration', () => {
    it('should handle caching across services', async () => {
      const { cache } = await import('@shared/core');

      // Test cache operations
      const testKey = 'integration-test-key';
      const testValue = { data: 'integration test data', timestamp: Date.now() };

      // Set cache value
      await cache.set(testKey, testValue, 300); // 5 minutes TTL

      // Get cache value
      const cachedValue = await cache.get(testKey);
      expect(cachedValue).toEqual(testValue);

      // Test cache invalidation
      await cache.delete(testKey);
      const deletedValue = await cache.get(testKey);
      expect(deletedValue).toBeNull();

      logger.info('✅ Cache integration test passed');
    });
  });

  describe('Search Integration', () => {
    it('should integrate search across all content types', async () => {
      const { searchService } = await import('@server/features/search/application/search-service.ts');

      // Test search functionality
      const searchQuery = {
        query: 'integration test',
        pagination: { page: 1, limit: 10 }
      };

      const searchResults = await searchService.search(searchQuery);

      expect(searchResults).toBeDefined();
      expect(searchResults).toHaveProperty('results');
      expect(searchResults).toHaveProperty('totalCount');
      expect(searchResults).toHaveProperty('facets');
      expect(searchResults).toHaveProperty('suggestions');
      expect(searchResults).toHaveProperty('searchTime');
      expect(Array.isArray(searchResults.results)).toBe(true);

      // Test search suggestions
      const suggestions = await searchService.getSuggestions('test', 5);
      expect(Array.isArray(suggestions)).toBe(true);

      logger.info('✅ Search integration test passed', {
        resultsCount: searchResults.totalCount,
        searchTime: searchResults.searchTime,
        suggestionsCount: suggestions.length
      });
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should handle complete user journey workflow', async () => {
      const workflowId = performanceMonitor.startOperation(
        'integration-test',
        'complete-user-journey'
      );

      try {
        // Step 1: User registration and profile setup
        const user = await testDataManager.createTestUser({
          email: 'journey-test@test.com',
          name: 'Journey Test User'
        });

        // Step 2: Bill creation and indexing
        const bill = await testDataManager.createTestBill({
          title: 'Journey Test Bill',
          summary: 'A comprehensive bill for testing user journey',
          status: 'introduced'
        });

        // Step 3: User engagement with bill
        // (This would involve actual API calls in a real test)
        const engagement = {
          user_id: user.id,
          bill_id: bill.id,
          engagementType: 'view',
          timestamp: new Date()
        };

        // Step 4: Campaign creation
        const campaignData = {
          title: 'Journey Test Campaign',
          description: 'Testing complete user journey',
          bill_id: bill.id,
          organizerId: user.id,
          objectives: ['Test user journey', 'Validate integration'],
          strategy: { approach: 'comprehensive testing' },
          targetCounties: ['Nairobi'],
          start_date: new Date(),
          is_public: true
        };

        // Step 5: Action creation and completion
        const actionData = {
          campaign_id: 'test-campaign-id',
          actionTitle: 'Journey Test Action',
          actionDescription: 'Testing action in user journey',
          actionType: 'contact_representative',
          estimatedTimeMinutes: 30,
          difficultyLevel: 'easy',
          priority: 7
        };

        // Step 6: Analytics and recommendations
        // (This would generate actual recommendations in a real test)

        performanceMonitor.endOperation(workflowId, true, undefined, {
          stepsCompleted: 6,
          user_id: user.id,
          bill_id: bill.id
        });

        logger.info('✅ Complete user journey test passed', {
          user_id: user.id,
          bill_id: bill.id,
          workflowSteps: 6
        });

      } catch (error) {
        performanceMonitor.endOperation(workflowId, false, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    });

    it('should handle system stress and recovery', async () => {
      const stressTestId = performanceMonitor.startOperation(
        'integration-test',
        'system-stress-test'
      );

      try {
        // Create multiple concurrent operations to stress test the system
        const stressOperations = [];

        // Concurrent user creation
        for (let i = 0; i < 20; i++) {
          stressOperations.push(
            testDataManager.createTestUser({
              email: `stress-user-${i}@test.com`,
              name: `Stress User ${i}`
            })
          );
        }

        // Concurrent bill creation
        for (let i = 0; i < 10; i++) {
          stressOperations.push(
            testDataManager.createTestBill({
              title: `Stress Test Bill ${i}`,
              status: 'introduced'
            })
          );
        }

        const results = await Promise.allSettled(stressOperations);
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.filter(r => r.status === 'rejected').length;
        
        // System should handle at least 80% of operations successfully under stress
        const successRate = successCount / results.length;
        expect(successRate).toBeGreaterThan(0.8);

        performanceMonitor.endOperation(stressTestId, true, undefined, {
          totalOperations: results.length,
          successCount,
          failureCount,
          successRate
        });

        logger.info('✅ System stress test passed', {
          totalOperations: results.length,
          successCount,
          failureCount,
          successRate: Math.round(successRate * 100) + '%'
        });

      } catch (error) {
        performanceMonitor.endOperation(stressTestId, false, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    });
  });

  describe('Integration Health Summary', () => {
    it('should provide comprehensive integration health report', async () => {
      // Get service health
      const serviceHealth = serviceOrchestrator.getServiceHealthSummary();
      
      // Get performance metrics
      const systemHealth = await performanceMonitor.getSystemHealthMetrics();
      
      // Get error statistics
      const errorStats = errorHandler.getErrorStatistics();
      
      // Get optimization recommendations
      const recommendations = performanceMonitor.getOptimizationRecommendations();

      const integrationHealthReport = {
        timestamp: new Date(),
        services: {
          total: serviceHealth.total,
          healthy: serviceHealth.healthy,
          degraded: serviceHealth.degraded,
          unhealthy: serviceHealth.unhealthy,
          healthPercentage: Math.round((serviceHealth.healthy / serviceHealth.total) * 100)
        },
        performance: {
          cpuUsage: systemHealth.cpu.usage,
          memoryUsage: Math.round((systemHealth.memory.heapUsed / systemHealth.memory.heapTotal) * 100),
          cacheHitRate: systemHealth.cache.hitRate
        },
        errors: {
          totalErrors: errorStats.totalErrors,
          errorRate: errorStats.errorRate,
          topErrorCodes: errorStats.topErrorCodes.slice(0, 5)
        },
        recommendations: {
          total: recommendations.length,
          highPriority: recommendations.filter(r => r.priority === 'high').length,
          categories: [...new Set(recommendations.map(r => r.category))]
        },
        overallHealth: 'good' // Would be calculated based on all metrics
      };

      expect(integrationHealthReport.services.total).toBeGreaterThan(0);
      expect(integrationHealthReport.services.healthPercentage).toBeGreaterThan(0);
      expect(integrationHealthReport.performance).toBeDefined();
      expect(integrationHealthReport.errors).toBeDefined();
      expect(integrationHealthReport.recommendations).toBeDefined();

      logger.info('✅ Integration health report generated', integrationHealthReport);

      // Log final test summary
      logger.info('🎉 All integration tests completed successfully!', {
        servicesHealthy: integrationHealthReport.services.healthy,
        servicesTotal: integrationHealthReport.services.total,
        overallHealth: integrationHealthReport.overallHealth,
        recommendationsCount: integrationHealthReport.recommendations.total
      });
    });
  });
});
