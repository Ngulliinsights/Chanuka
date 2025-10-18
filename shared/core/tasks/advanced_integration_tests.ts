// core/src/health/__tests__/load.test.ts

/**
 * Load testing and performance validation for the health monitoring system.
 * These tests ensure the system can handle production-level loads and
 * maintain performance under stress.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { HealthChecker, createHealthEndpoints } from '../HealthChecker';
import { RedisHealthCheck } from '../checks/redis.check';
import { DatabaseHealthCheck } from '../checks/database.check';
import { MemoryHealthCheck } from '../checks/memory.check';
import { 
import { logger } from '../../shared/core/src/utils/logger';
  LoadTester, 
  PerformanceTimer, 
  ResourceMonitor, 
  HealthCheckMockFactory 
} from './setup';

describe('Health System Load Tests', () => {
  let app: express.Application;
  let healthChecker: HealthChecker;
  let loadTester: LoadTester;
  let resourceMonitor: ResourceMonitor;

  beforeEach(() => {
    app = express();
    loadTester = new LoadTester();
    resourceMonitor = new ResourceMonitor();
    
    // Create a realistic production-like health checker
    healthChecker = new HealthChecker({
      timeoutMs: 2000,
      parallelExecution: true,
      cacheMs: 30000 // 30 second cache for load testing
    });

    // Register multiple checks to simulate a real system
    const mockRedis = HealthCheckMockFactory.createRedisCluster(3);
    const mockDatabase = HealthCheckMockFactory.createDatabaseConnection(20);
    
    healthChecker.register(new RedisHealthCheck(mockRedis as any, {
      maxLatencyMs: 50,
      checkClusterNodes: true
    }));
    
    healthChecker.register(new DatabaseHealthCheck(mockDatabase as any, {
      maxLatencyMs: 200,
      minPoolConnections: 5
    }));
    
    healthChecker.register(new MemoryHealthCheck({
      maxRssBytes: 2 * 1024 * 1024 * 1024,
      warnRssBytes: 1.5 * 1024 * 1024 * 1024
    }));

    const endpoints = createHealthEndpoints(healthChecker, {
      maxRequestsPerMinute: 1000, // High limit for load testing
      enableCors: true
    });

    app.get('/health', endpoints.health);
    app.get('/health/ready', endpoints.readiness);
    app.get('/health/live', endpoints.liveness);
  });

  afterEach(() => {
    resourceMonitor.reset();
    loadTester.reset();
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 100 concurrent requests efficiently', async () => {
      resourceMonitor.start();
      const timer = new PerformanceTimer();
      
      timer.start();
      
      const promises = Array.from({ length: 100 }, () =>
        request(app).get('/health').expect(200)
      );
      
      const responses = await Promise.all(promises);
      const duration = timer.stop();
      
      resourceMonitor.stop();
      const resourceReport = resourceMonitor.getReport();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
        expect(response.body.summary.total).toBe(3);
      });

      // Performance assertions
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`100 concurrent requests completed in ${duration}ms`);
      console.log(`Resource usage - Peak memory: ${Math.round(resourceReport.memory.peak / 1024 / 1024)}MB`);
      
      // Memory shouldn't grow excessively
      expect(resourceReport.memory.peak).toBeLessThan(500 * 1024 * 1024); // 500MB limit
    });

    it('should maintain performance with sustained load', async () => {
      const loadResults = await loadTester.runLoad(
        async () => {
          const response = await request(app).get('/health');
          if (response.status !== 200) {
            throw new Error(`Unexpected status: ${response.status}`);
          }
          return response;
        },
        {
          concurrency: 10,
          duration: 5000, // 5 seconds
          rampUp: 1000    // 1 second ramp up
        }
      );

      logger.info('Load test results:', { component: 'Chanuka' }, loadResults);

      // Performance expectations
      expect(loadResults.successfulRequests).toBeGreaterThan(0);
      expect(loadResults.failedRequests).toBe(0);
      expect(loadResults.averageLatency).toBeLessThan(100); // Should average under 100ms
      expect(loadResults.requestsPerSecond).toBeGreaterThan(50); // Should handle at least 50 RPS
      
      // No errors should occur under normal load
      expect(loadResults.errors).toHaveLength(0);
    });

    it('should handle burst traffic gracefully', async () => {
      // Simulate a burst of traffic followed by normal load
      const burstResults = await loadTester.runLoad(
        async () => {
          const response = await request(app).get('/health');
          if (response.status !== 200) {
            throw new Error(`Burst request failed: ${response.status}`);
          }
          return response;
        },
        {
          concurrency: 50, // High concurrency burst
          duration: 2000   // Short duration
        }
      );

      // Reset and test normal load
      loadTester.reset();
      
      const normalResults = await loadTester.runLoad(
        async () => {
          const response = await request(app).get('/health');
          if (response.status !== 200) {
            throw new Error(`Normal request failed: ${response.status}`);
          }
          return response;
        },
        {
          concurrency: 5,  // Normal concurrency
          duration: 3000   // Longer duration
        }
      );

      // Both should succeed, but normal load should have better performance
      expect(burstResults.successfulRequests).toBeGreaterThan(0);
      expect(normalResults.successfulRequests).toBeGreaterThan(0);
      expect(normalResults.averageLatency).toBeLessThan(burstResults.averageLatency);
      
      console.log(`Burst: ${burstResults.averageLatency}ms avg, Normal: ${normalResults.averageLatency}ms avg`);
    });
  });

  describe('Cache Performance Under Load', () => {
    it('should demonstrate caching benefits under high load', async () => {
      // First test without caching
      const noCacheChecker = new HealthChecker({
        timeoutMs: 2000,
        parallelExecution: true,
        cacheMs: 0 // No caching
      });

      // Add a slow check to demonstrate caching benefits
      const slowCheck = {
        name: 'slow-external-service',
        check: async () => {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
          return {
            status: 'healthy' as const,
            latencyMs: 100,
            timestamp: new Date().toISOString()
          };
        }
      };

      noCacheChecker.register(slowCheck);
      
      const noCacheApp = express();
      const noCacheEndpoints = createHealthEndpoints(noCacheChecker);
      noCacheApp.get('/health', noCacheEndpoints.health);

      // Test without caching
      const noCacheResults = await loadTester.runLoad(
        async () => {
          const response = await request(noCacheApp).get('/health');
          if (response.status !== 200) {
            throw new Error(`No cache request failed: ${response.status}`);
          }
          return response;
        },
        {
          concurrency: 10,
          duration: 2000
        }
      );

      loadTester.reset();

      // Now test with caching
      const cachedChecker = new HealthChecker({
        timeoutMs: 2000,
        parallelExecution: true,
        cacheMs: 5000 // 5 second cache
      });

      cachedChecker.register(slowCheck);
      
      const cachedApp = express();
      const cachedEndpoints = createHealthEndpoints(cachedChecker);
      cachedApp.get('/health', cachedEndpoints.health);

      const cachedResults = await loadTester.runLoad(
        async () => {
          const response = await request(cachedApp).get('/health');
          if (response.status !== 200) {
            throw new Error(`Cached request failed: ${response.status}`);
          }
          return response;
        },
        {
          concurrency: 10,
          duration: 2000
        }
      );

      console.log(`No cache - RPS: ${noCacheResults.requestsPerSecond}, Avg latency: ${noCacheResults.averageLatency}ms`);
      console.log(`With cache - RPS: ${cachedResults.requestsPerSecond}, Avg latency: ${cachedResults.averageLatency}ms`);

      // Caching should significantly improve performance
      expect(cachedResults.requestsPerSecond).toBeGreaterThan(noCacheResults.requestsPerSecond);
      expect(cachedResults.averageLatency).toBeLessThan(noCacheResults.averageLatency);
    });
  });

  describe('Resource Usage Under Load', () => {
    it('should not leak memory under sustained load', async () => {
      resourceMonitor.start();
      
      // Run sustained load for longer period
      await loadTester.runLoad(
        async () => {
          const response = await request(app).get('/health');
          if (response.status !== 200) {
            throw new Error(`Memory test request failed`);
          }
          return response;
        },
        {
          concurrency: 5,
          duration: 10000, // 10 seconds
        }
      );

      resourceMonitor.stop();
      const resourceReport = resourceMonitor.getReport();

      console.log(`Memory usage over ${resourceReport.duration}ms:`);
      console.log(`Peak: ${Math.round(resourceReport.memory.peak / 1024 / 1024)}MB`);
      console.log(`Average: ${Math.round(resourceReport.memory.average / 1024 / 1024)}MB`);
      console.log(`Final: ${Math.round(resourceReport.memory.final / 1024 / 1024)}MB`);

      // Memory should not grow excessively
      const memoryGrowth = resourceReport.memory.final - resourceReport.memory.average;
      const growthPercent = (memoryGrowth / resourceReport.memory.average) * 100;
      
      expect(growthPercent).toBeLessThan(50); // Memory growth should be less than 50%
      expect(resourceReport.memory.peak).toBeLessThan(1024 * 1024 * 1024); // Under 1GB
    });
  });

  describe('Different Endpoint Performance', () => {
    it('should show performance differences between endpoint types', async () => {
      const endpoints = ['health', 'ready', 'live'];
      const results: Record<string, any> = {};

      for (const endpoint of endpoints) {
        const endpointResults = await loadTester.runLoad(
          async () => {
            const response = await request(app).get(`/health/${endpoint === 'health' ? '' : endpoint}`);
            if (response.status !== 200) {
              throw new Error(`${endpoint} endpoint failed`);
            }
            return response;
          },
          {
            concurrency: 20,
            duration: 3000
          }
        );

        results[endpoint] = endpointResults;
        loadTester.reset();
      }

      logger.info('Endpoint performance comparison:', { component: 'Chanuka' });
      endpoints.forEach(endpoint => {
        const result = results[endpoint];
        console.log(`${endpoint}: ${result.requestsPerSecond.toFixed(1)} RPS, ${result.averageLatency.toFixed(1)}ms avg`);
      });

      // Liveness should be fastest (no checks), readiness should be faster than full health
      expect(results.live.averageLatency).toBeLessThan(results.ready.averageLatency);
      expect(results.ready.averageLatency).toBeLessThan(results.health.averageLatency);
      expect(results.live.requestsPerSecond).toBeGreaterThan(results.health.requestsPerSecond);
    });
  });
});

// Chaos Engineering Tests
describe('Health System Chaos Tests', () => {
  let healthChecker: HealthChecker;
  let mock






