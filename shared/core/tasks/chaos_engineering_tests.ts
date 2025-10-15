// Chaos Engineering Tests - Continuation of load.test.ts
describe('Health System Chaos Tests', () => {
  let healthChecker: HealthChecker;
  let mockRedis: any;
  let mockDatabase: any;
  let app: express.Application;
  let loadTester: LoadTester;
  let resourceMonitor: ResourceMonitor;

  beforeEach(() => {
    app = express();
    loadTester = new LoadTester();
    resourceMonitor = new ResourceMonitor();
    
    // Create chaos-ready health checker with aggressive timeouts
    healthChecker = new HealthChecker({
      timeoutMs: 1000, // Shorter timeout to test failure scenarios
      parallelExecution: true,
      cacheMs: 5000,
      retryAttempts: 2 // Allow retries during chaos scenarios
    });

    // Create mocks that we can intentionally break during chaos testing
    mockRedis = HealthCheckMockFactory.createChaosRedisCluster(3);
    mockDatabase = HealthCheckMockFactory.createChaosDatabaseConnection(20);
    
    healthChecker.register(new RedisHealthCheck(mockRedis, {
      maxLatencyMs: 100,
      checkClusterNodes: true,
      name: 'redis-cluster'
    }));
    
    healthChecker.register(new DatabaseHealthCheck(mockDatabase, {
      maxLatencyMs: 300,
      minPoolConnections: 5,
      name: 'primary-database'
    }));
    
    // Add a third-party service check that we can make flaky
    healthChecker.register({
      name: 'external-api',
      check: async () => {
        // This check will be manipulated during chaos tests
        const shouldFail = Math.random() < 0.1; // 10% baseline failure rate
        if (shouldFail) {
          throw new Error('External API unavailable');
        }
        
        const latency = Math.random() * 200; // 0-200ms variable latency
        await new Promise(resolve => setTimeout(resolve, latency));
        
        return {
          status: 'healthy' as const,
          latencyMs: latency,
          timestamp: new Date().toISOString(),
          details: { endpoint: 'https://api.external-service.com/status' }
        };
      }
    });

    const endpoints = createHealthEndpoints(healthChecker, {
      maxRequestsPerMinute: 500,
      enableCors: true,
      gracefulDegradation: true // Enable graceful degradation during failures
    });

    app.get('/health', endpoints.health);
    app.get('/health/ready', endpoints.readiness);
    app.get('/health/live', endpoints.liveness);
  });

  afterEach(() => {
    // Clean up any chaos scenarios
    mockRedis.restoreNormalOperation();
    mockDatabase.restoreNormalOperation();
    resourceMonitor.reset();
    loadTester.reset();
  });

  describe('Service Failure Scenarios', () => {
    it('should maintain overall health when one service becomes intermittently unavailable', async () => {
      // This test simulates a common production scenario where one dependency
      // becomes flaky but doesn't completely fail
      logger.info('Starting intermittent failure chaos test...', { component: 'Chanuka' });
      
      // Make Redis intermittently fail (30% failure rate)
      mockRedis.injectIntermittentFailures(0.3, 'Connection timeout');
      
      const chaosResults = await loadTester.runLoad(
        async () => {
          const response = await request(app).get('/health');
          
          // We expect some degraded responses, but the endpoint should still respond
          if (response.status !== 200 && response.status !== 503) {
            throw new Error(`Unexpected status during chaos: ${response.status}`);
          }
          
          return response;
        },
        {
          concurrency: 15,
          duration: 8000, // Run longer to see failure patterns
          rampUp: 2000
        }
      );

      console.log(`Chaos test results - Success rate: ${(chaosResults.successfulRequests / (chaosResults.successfulRequests + chaosResults.failedRequests) * 100).toFixed(1)}%`);
      console.log(`Average latency: ${chaosResults.averageLatency.toFixed(1)}ms`);

      // Even with failures, most requests should still succeed due to graceful degradation
      const totalRequests = chaosResults.successfulRequests + chaosResults.failedRequests;
      const successRate = chaosResults.successfulRequests / totalRequests;
      
      expect(successRate).toBeGreaterThan(0.6); // At least 60% success rate even during chaos
      expect(chaosResults.averageLatency).toBeLessThan(2000); // Should still respond reasonably fast
      
      // Verify that failures are logged but don't bring down the whole system
      expect(chaosResults.errors.length).toBeGreaterThan(0); // Some errors expected
      console.log(`Recorded ${chaosResults.errors.length} errors during chaos scenario`);
    });

    it('should handle cascading failures gracefully', async () => {
      // Simulate a more severe scenario where multiple services fail simultaneously
      logger.info('Starting cascading failure chaos test...', { component: 'Chanuka' });
      
      resourceMonitor.start();
      
      // Introduce multiple failure modes at once
      mockRedis.injectLatencySpikes(500, 1500); // 500-1500ms latency spikes
      mockDatabase.injectConnectionPoolExhaustion(0.4); // 40% of connections fail
      
      // Also increase the external API failure rate
      const originalExternalCheck = healthChecker['checks'].find(c => c.name === 'external-api');
      if (originalExternalCheck) {
        const chaosExternalCheck = {
          name: 'external-api',
          check: async () => {
            // Increase failure rate to 50% during cascading failure test
            const shouldFail = Math.random() < 0.5;
            if (shouldFail) {
              throw new Error('External API experiencing high load');
            }
            
            // Also add more variable latency
            const latency = Math.random() * 800; // 0-800ms variable latency
            await new Promise(resolve => setTimeout(resolve, latency));
            
            return {
              status: 'healthy' as const,
              latencyMs: latency,
              timestamp: new Date().toISOString(),
              details: { endpoint: 'https://api.external-service.com/status' }
            };
          }
        };
        
        // Replace the check temporarily
        healthChecker.unregister('external-api');
        healthChecker.register(chaosExternalCheck);
      }

      const cascadingResults = await loadTester.runLoad(
        async () => {
          const response = await request(app).get('/health');
          
          // During cascading failures, we might get degraded responses
          if (![200, 503, 500].includes(response.status)) {
            throw new Error(`Unexpected status during cascading failure: ${response.status}`);
          }
          
          return response;
        },
        {
          concurrency: 10, // Reduced concurrency during severe chaos
          duration: 6000
        }
      );

      resourceMonitor.stop();
      const resourceReport = resourceMonitor.getReport();

      logger.info('Cascading failure results:', { component: 'Chanuka' });
      console.log(`Requests completed: ${cascadingResults.successfulRequests + cascadingResults.failedRequests}`);
      console.log(`Success rate: ${(cascadingResults.successfulRequests / (cascadingResults.successfulRequests + cascadingResults.failedRequests) * 100).toFixed(1)}%`);
      console.log(`Peak memory usage: ${Math.round(resourceReport.memory.peak / 1024 / 1024)}MB`);

      // Even during cascading failures, the system should:
      // 1. Continue responding (not hang indefinitely)
      // 2. Not consume excessive resources
      // 3. Provide some level of service
      
      expect(cascadingResults.successfulRequests + cascadingResults.failedRequests).toBeGreaterThan(10);
      expect(resourceReport.memory.peak).toBeLessThan(800 * 1024 * 1024); // Under 800MB even during chaos
      
      // At least some requests should succeed even in worst-case scenario
      const totalRequests = cascadingResults.successfulRequests + cascadingResults.failedRequests;
      const successRate = cascadingResults.successfulRequests / totalRequests;
      expect(successRate).toBeGreaterThan(0.2); // At least 20% success rate during cascading failure
    });
  });

  describe('Network Partition Simulation', () => {
    it('should handle network partitions between health checks and dependencies', async () => {
      // This simulates network issues that are common in distributed systems
      logger.info('Starting network partition chaos test...', { component: 'Chanuka' });
      
      // Simulate network partitions by making some requests timeout
      mockRedis.injectNetworkPartition(0.25); // 25% of requests timeout
      mockDatabase.injectNetworkPartition(0.15); // 15% of requests timeout
      
      const partitionTimer = new PerformanceTimer();
      partitionTimer.start();
      
      // Test both individual health checks and under load
      const singleCheckPromises = Array.from({ length: 20 }, async () => {
        try {
          const response = await request(app).get('/health').timeout(3000);
          return { success: true, status: response.status, duration: response.duration };
        } catch (error) {
          return { success: false, error: error.message, duration: null };
        }
      });
      
      const singleCheckResults = await Promise.allSettled(singleCheckPromises);
      const duration = partitionTimer.stop();
      
      console.log(`Network partition test completed in ${duration}ms`);
      
      // Analyze the results
      const successfulChecks = singleCheckResults.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      const timeoutErrors = singleCheckResults.filter(result =>
        result.status === 'fulfilled' && 
        result.value.success === false && 
        result.value.error?.includes('timeout')
      ).length;
      
      console.log(`Successful checks: ${successfulChecks}/20`);
      console.log(`Timeout errors: ${timeoutErrors}`);
      
      // During network partitions, we expect:
      // - Some requests to succeed (the ones that don't hit partitioned services)
      // - Some timeouts to occur
      // - The system to respond within reasonable time bounds
      expect(successfulChecks).toBeGreaterThan(5); // At least some should succeed
      expect(timeoutErrors).toBeGreaterThan(0); // Some timeouts expected due to partitions
      expect(duration).toBeLessThan(10000); // Should not hang indefinitely
    });
  });

  describe('Recovery and Resilience Testing', () => {
    it('should recover quickly when services come back online', async () => {
      // This test verifies that the health system can detect and report recovery
      logger.info('Starting recovery resilience test...', { component: 'Chanuka' });
      
      // Phase 1: Introduce failures
      mockRedis.injectTotalFailure(); // Make Redis completely unavailable
      mockDatabase.injectHighLatency(2000); // Make database very slow
      
      logger.info('Phase 1: Services degraded', { component: 'Chanuka' });
      
      // Test during degraded state
      const degradedResults = await loadTester.runLoad(
        async () => {
          const response = await request(app).get('/health');
          // During degradation, expect mostly unhealthy responses
          return response;
        },
        {
          concurrency: 5,
          duration: 3000
        }
      );
      
      loadTester.reset();
      
      // Phase 2: Restore services
      logger.info('Phase 2: Restoring services...', { component: 'Chanuka' });
      mockRedis.restoreNormalOperation();
      mockDatabase.restoreNormalOperation();
      
      // Wait a moment for caches to expire and recovery to be detected
      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for cache expiry
      
      logger.info('Phase 3: Testing recovery', { component: 'Chanuka' });
      
      // Test after recovery
      const recoveredResults = await loadTester.runLoad(
        async () => {
          const response = await request(app).get('/health');
          if (response.status !== 200) {
            throw new Error(`Expected recovery but got status: ${response.status}`);
          }
          return response;
        },
        {
          concurrency: 5,
          duration: 3000
        }
      );
      
      logger.info('Recovery test results:', { component: 'Chanuka' });
      console.log(`Degraded phase - Success rate: ${(degradedResults.successfulRequests / (degradedResults.successfulRequests + degradedResults.failedRequests) * 100).toFixed(1)}%`);
      console.log(`Recovery phase - Success rate: ${(recoveredResults.successfulRequests / (recoveredResults.successfulRequests + recoveredResults.failedRequests) * 100).toFixed(1)}%`);
      
      // Recovery should show significant improvement
      const degradedSuccessRate = degradedResults.successfulRequests / (degradedResults.successfulRequests + degradedResults.failedRequests);
      const recoveredSuccessRate = recoveredResults.successfulRequests / (recoveredResults.successfulRequests + recoveredResults.failedRequests);
      
      expect(recoveredSuccessRate).toBeGreaterThan(degradedSuccessRate + 0.3); // At least 30% improvement
      expect(recoveredSuccessRate).toBeGreaterThan(0.8); // Should achieve at least 80% success after recovery
      expect(recoveredResults.averageLatency).toBeLessThan(degradedResults.averageLatency);
    });
  });

  describe('Extreme Load with Failures', () => {
    it('should maintain some level of service even under extreme conditions', async () => {
      // This is the ultimate chaos test - high load combined with service failures
      logger.info('Starting extreme chaos load test...', { component: 'Chanuka' });
      
      resourceMonitor.start();
      
      // Create the most challenging scenario possible
      mockRedis.injectIntermittentFailures(0.4, 'High load timeout'); // 40% failure rate
      mockDatabase.injectConnectionPoolExhausion(0.3); // 30% connection failures
      mockDatabase.injectLatencySpikes(200, 1000); // Variable high latency
      
      // Run high load for an extended period
      const extremeResults = await loadTester.runLoad(
        async () => {
          const response = await request(app).get('/health');
          
          // Accept any reasonable response during extreme conditions
          if (![200, 503, 500, 429].includes(response.status)) {
            throw new Error(`Unacceptable status during extreme test: ${response.status}`);
          }
          
          return response;
        },
        {
          concurrency: 25, // High concurrency
          duration: 10000, // Extended duration
          rampUp: 3000     // Gradual ramp up
        }
      );
      
      resourceMonitor.stop();
      const resourceReport = resourceMonitor.getReport();
      
      logger.info('Extreme chaos test completed:', { component: 'Chanuka' });
      console.log(`Total requests: ${extremeResults.successfulRequests + extremeResults.failedRequests}`);
      console.log(`Success rate: ${(extremeResults.successfulRequests / (extremeResults.successfulRequests + extremeResults.failedRequests) * 100).toFixed(1)}%`);
      console.log(`Average latency: ${extremeResults.averageLatency.toFixed(1)}ms`);
      console.log(`Peak memory: ${Math.round(resourceReport.memory.peak / 1024 / 1024)}MB`);
      console.log(`Error types: ${extremeResults.errors.map(e => e.message).slice(0, 5)}`);
      
      // Even under extreme conditions, the system should:
      // 1. Process a reasonable number of requests
      // 2. Not crash or become unresponsive
      // 3. Maintain resource usage within bounds
      // 4. Provide meaningful error information
      
      const totalRequests = extremeResults.successfulRequests + extremeResults.failedRequests;
      expect(totalRequests).toBeGreaterThan(50); // Should process at least 50 requests
      expect(resourceReport.memory.peak).toBeLessThan(1024 * 1024 * 1024); // Under 1GB memory
      expect(extremeResults.averageLatency).toBeLessThan(5000); // Should not hang for more than 5 seconds
      
      // Even in extreme conditions, some level of service should be maintained
      const successRate = extremeResults.successfulRequests / totalRequests;
      expect(successRate).toBeGreaterThan(0.1); // At least 10% success rate in worst case
      
      // The system should provide useful error information rather than just timing out
      expect(extremeResults.errors.length).toBeGreaterThan(0);
      const errorMessages = extremeResults.errors.map(e => e.message);
      const timeoutErrors = errorMessages.filter(msg => msg.includes('timeout')).length;
      const totalErrors = errorMessages.length;
      
      // Most errors should be meaningful rather than just timeouts
      expect(timeoutErrors / totalErrors).toBeLessThan(0.8); // Less than 80% should be timeouts
    });
  });
});






