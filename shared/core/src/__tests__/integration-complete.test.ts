import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { createCacheService } from '../cache';
import { createRateLimitFactory } from '../rate-limiting';
// import { Logger } from '@shared/core/src/observability/logging'; // Using logger instance instead
import { ValidationAdapter } from '../validation/core/interfaces';
import { HealthOrchestrator } from '../observability/health/health-orchestrator';
import { configManager } from '../config';
import { logger } from '@shared/core/src/observability/logging';

describe('Core Utilities Integration Tests', () => {
  let cache: any;
  let rateLimiter: any;
  let logger: Logger;
  let validator: ValidationService;
  let healthChecker: HealthChecker;

  beforeAll(async () => {
    // Initialize all core components
    cache = createCacheService({
      provider: 'memory',
      maxMemoryMB: 50,
      enableMetrics: true,
      keyPrefix: 'integration-test:',
      defaultTtlSec: 300,
      enableCompression: false,
      compressionThreshold: 1024
    });

    const rateLimitFactory = createRateLimitFactory();
    rateLimiter = rateLimitFactory.createStore('sliding-window');

    logger = new Logger({
      level: 'info',
      pretty: false,
      enableMetrics: true
    });

    validator = new ValidationService();
    await validator.registerSchema('user', {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
        age: { type: 'number', minimum: 0, maximum: 150 }
      },
      required: ['name', 'email', 'age']
    });

    healthChecker = new HealthChecker();
  });

  afterAll(async () => {
    if (cache && typeof cache.destroy === 'function') {
      await cache.destroy();
    }
  });

  describe('Cross-Module Integration', () => { it('should handle complete request pipeline', async () => {
      const user_id = 'integration-test-user';
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        age: 25
       };

      // 1. Rate limiting check
      const rateLimitResult = await rateLimiter.hit(user_id, 100, 60000);
      expect(rateLimitResult.allowed).toBe(true);
      expect(rateLimitResult.remaining).toBeLessThanOrEqual(100);

      // 2. Data validation
      const validatedData = await validator.validate('user', userData);
      expect(validatedData).toEqual(userData);

      // 3. Cache operations
      const cacheKey = `user:${ user_id }`;
      await cache.set(cacheKey, validatedData, 300);
      
      const cachedData = await cache.get(cacheKey);
      expect(cachedData).toEqual(validatedData);

      // 4. Logging
      logger.info('Integration test completed', { user_id,
        rateLimitRemaining: rateLimitResult.remaining,
        cached: true
       });

      // 5. Verify metrics are collected
      const cacheMetrics = cache.getMetrics?.();
      if (cacheMetrics) {
        expect(cacheMetrics.operations).toBeGreaterThan(0);
      }

      const logMetrics = logger.getMetrics?.();
      if (logMetrics) {
        expect(logMetrics.totalLogs).toBeGreaterThan(0);
      }
    });

    it('should handle error scenarios gracefully', async () => {
      // Test validation error handling
      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: -5
      };

      await expect(validator.validate('user', invalidData)).rejects.toThrow();

      // Test cache error handling
      try {
        await cache.get('non-existent-key');
        // Should not throw, should return null
      } catch (error) {
        // If it throws, that's also acceptable
      }

      // Test rate limiting under load
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(rateLimiter.hit('load-test-user', 100, 60000));
      }

      const results = await Promise.all(promises);
      const blockedRequests = results.filter(r => !r.allowed);
      expect(blockedRequests.length).toBeGreaterThan(0);
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrency = 50;
      const operationsPerWorker = 20;

      const workers = Array(concurrency).fill(null).map(async (_, workerId) => {
        const results = [];
        
        for (let i = 0; i < operationsPerWorker; i++) {
          const key = `concurrent:${workerId}:${i}`;
          const data = { workerId, iteration: i, timestamp: Date.now() };

          // Validate data
          await validator.validate('user', {
            name: `Worker ${workerId}`,
            email: `worker${workerId}@test.com`,
            age: 25
          });

          // Cache operations
          await cache.set(key, data, 60);
          const retrieved = await cache.get(key);
          
          // Rate limiting
          await rateLimiter.hit(`worker:${workerId}`, 50, 60000);

          results.push({ key, data, retrieved });
        }

        return results;
      });

      const allResults = await Promise.all(workers);
      const totalOperations = allResults.flat().length;
      
      expect(totalOperations).toBe(concurrency * operationsPerWorker);
      
      // Verify data integrity
      for (const workerResults of allResults) {
        for (const { data, retrieved } of workerResults) {
          expect(retrieved).toEqual(data);
        }
      }
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should register and execute health checks', async () => {
      // Register health checks for all components
      healthChecker.register({
        name: 'cache',
        check: async () => {
          try {
            await cache.set('health-check', 'ok', 10);
            await cache.get('health-check');
            return { status: 'healthy' as const };
          } catch (error) {
            return { status: 'unhealthy' as const, details: String(error) };
          }
        }
      });

      healthChecker.register({
        name: 'rate-limiter',
        check: async () => {
          try {
            await rateLimiter.hit('health-check', 1, 60000);
            return { status: 'healthy' as const };
          } catch (error) {
            return { status: 'unhealthy' as const, details: String(error) };
          }
        }
      });

      healthChecker.register({
        name: 'validator',
        check: async () => {
          try {
            await validator.validate('user', {
              name: 'Health Check',
              email: 'health@test.com',
              age: 30
            });
            return { status: 'healthy' as const };
          } catch (error) {
            return { status: 'unhealthy' as const, details: String(error) };
          }
        }
      });

      const healthResult = await healthChecker.runChecks();
      
      expect(healthResult.status).toBe('healthy');
      expect(healthResult.checks.cache.status).toBe('healthy');
      expect(healthResult.checks['rate-limiter'].status).toBe('healthy');
      expect(healthResult.checks.validator.status).toBe('healthy');
    });
  });

  describe('Configuration Integration', () => {
    it('should load and validate configuration', async () => {
      const config = await configManager.load();
      
      expect(config).toBeDefined();
      expect(config.app).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.log).toBeDefined();
    });

    it('should support feature flags', async () => {
      const config = await configManager.load();
      
      // Test feature flag functionality
      const isEnabled = configManager.isFeatureEnabled('test-feature', 'test-user');
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('Migration Validation', () => {
    it('should validate migration completeness', async () => {
      // Test that all core utilities are accessible
      expect(cache).toBeDefined();
      expect(rateLimiter).toBeDefined();
      expect(logger).toBeDefined();
      expect(validator).toBeDefined();
      expect(healthChecker).toBeDefined();

      // Test that they work together
      const testKey = 'migration-validation';
      const testData = { test: 'migration', timestamp: Date.now() };

      await cache.set(testKey, testData, 60);
      const retrieved = await cache.get(testKey);
      expect(retrieved).toEqual(testData);

      logger.info('Migration validation test', { testKey, testData });
      
      const rateLimitResult = await rateLimiter.hit('migration-test', 10, 60000);
      expect(rateLimitResult.allowed).toBe(true);
    });

    it('should handle legacy adapter compatibility', async () => {
      // Legacy adapters have been removed - this test now verifies clean removal
      try {
        await import('../caching/legacy-adapters/cache-service-adapter');
        fail('Legacy adapters should not be importable');
      } catch (error) {
        // Expected - legacy adapters have been removed
        expect(error.message).toContain('Cannot find module');
      }
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain acceptable performance thresholds', async () => {
      const iterations = 1000;
      const startTime = performance.now();

      // Run a mix of operations
      for (let i = 0; i < iterations; i++) {
        const key = `perf-test:${i}`;
        const data = { iteration: i, timestamp: Date.now() };

        await cache.set(key, data, 60);
        await cache.get(key);
        
        if (i % 10 === 0) {
          await rateLimiter.hit(`perf-user:${i % 10}`, 100, 60000);
        }
        
        if (i % 50 === 0) {
          await validator.validate('user', {
            name: `User ${i}`,
            email: `user${i}@test.com`,
            age: 25
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const operationsPerSecond = (iterations / duration) * 1000;

      // Should handle at least 1000 operations per second
      expect(operationsPerSecond).toBeGreaterThan(1000);
      
      logger.info('Performance regression test completed', {
        iterations,
        duration,
        operationsPerSecond
      });
    });

    it('should handle memory usage efficiently', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create a lot of cache entries
      const entries = 10000;
      for (let i = 0; i < entries; i++) {
        await cache.set(`memory-test:${i}`, {
          id: i,
          data: `test-data-${i}`,
          timestamp: Date.now()
        }, 300);
      }

      const afterMemory = process.memoryUsage();
      const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB for 10k entries)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      // Clean up
      for (let i = 0; i < entries; i++) {
        await cache.del(`memory-test:${i}`);
      }
    });
  });
});














































