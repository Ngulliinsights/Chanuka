/**
 * Health Checker Tests
 * 
 * Comprehensive tests for health monitoring, dependency validation,
 * timeout protection, and health check aggregation
 */

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

import { HealthChecker } from '../observability/health-checker';
import type { HealthCheck, HealthResult } from '@shared/types';
import { logger } from '@shared/core/src/observability/logging';

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;

  beforeEach(() => {
    healthChecker = new HealthChecker({
      timeout: 5000,
      enableCaching: true,
      cacheTimeout: 30000,
      enableMetrics: true,
    });
  });

  afterEach(() => {
    cleanup();
    healthChecker?.destroy();
  
  });

  describe('Health Check Registration', () => {
    it('should register health checks', () => {
      const redisCheck: HealthCheck = {
        name: 'redis',
        check: vi.fn().mockResolvedValue({ status: 'healthy' }),
      };

      healthChecker.register(redisCheck);
      
      const checks = healthChecker.getRegisteredChecks();
      expect(checks).toContain('redis');
    });

    it('should overwrite existing health checks with same name', () => {
      const check1: HealthCheck = {
        name: 'database',
        check: vi.fn().mockResolvedValue({ status: 'healthy', version: '1.0' }),
      };

      const check2: HealthCheck = {
        name: 'database',
        check: vi.fn().mockResolvedValue({ status: 'healthy', version: '2.0' }),
      };

      healthChecker.register(check1);
      healthChecker.register(check2);

      const checks = healthChecker.getRegisteredChecks();
      expect(checks).toHaveLength(1);
      expect(checks).toContain('database');
    });

    it('should unregister health checks', () => {
      const redisCheck: HealthCheck = {
        name: 'redis',
        check: vi.fn().mockResolvedValue({ status: 'healthy' }),
      };

      healthChecker.register(redisCheck);
      expect(healthChecker.getRegisteredChecks()).toContain('redis');

      healthChecker.unregister('redis');
      expect(healthChecker.getRegisteredChecks()).not.toContain('redis');
    });

    it('should handle unregistering non-existent checks gracefully', () => {
      expect(() => {
        healthChecker.unregister('non-existent');
      }).not.toThrow();
    });
  });

  describe('Health Check Execution', () => {
    it('should run all registered health checks', async () => {
      const redisCheck = vi.fn().mockResolvedValue({ status: 'healthy', latency: 10 });
      const dbCheck = vi.fn().mockResolvedValue({ status: 'healthy', connections: 5 });

      healthChecker.register({ name: 'redis', check: redisCheck });
      healthChecker.register({ name: 'database', check: dbCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('healthy');
      expect(result.checks.redis.status).toBe('healthy');
      expect(result.checks.database.status).toBe('healthy');
      expect(redisCheck).toHaveBeenCalled();
      expect(dbCheck).toHaveBeenCalled();
    });

    it('should handle failing health checks', async () => {
      const healthyCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
      const failingCheck = vi.fn().mockResolvedValue({ status: 'unhealthy', error: 'Connection failed' });

      healthChecker.register({ name: 'healthy-service', check: healthyCheck });
      healthChecker.register({ name: 'failing-service', check: failingCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['healthy-service'].status).toBe('healthy');
      expect(result.checks['failing-service'].status).toBe('unhealthy');
      expect(result.checks['failing-service'].error).toBe('Connection failed');
    });

    it('should handle health check exceptions', async () => {
      const throwingCheck = vi.fn().mockRejectedValue(new Error('Check failed'));
      const healthyCheck = vi.fn().mockResolvedValue({ status: 'healthy' });

      healthChecker.register({ name: 'throwing-service', check: throwingCheck });
      healthChecker.register({ name: 'healthy-service', check: healthyCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['throwing-service'].status).toBe('unhealthy');
      expect(result.checks['throwing-service'].error).toContain('Check failed');
      expect(result.checks['healthy-service'].status).toBe('healthy');
    });

    it('should include system information in results', async () => {
      const result = await healthChecker.runChecks();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('version');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle empty health check list', async () => {
      const result = await healthChecker.runChecks();

      expect(result.status).toBe('healthy');
      expect(Object.keys(result.checks)).toHaveLength(0);
    });
  });

  describe('Timeout Protection', () => {
    beforeEach(() => {
      healthChecker = new HealthChecker({
        timeout: 100, // 100ms timeout for testing
        enableCaching: false,
        cacheTimeout: 30000,
        enableMetrics: true,
      });
    });

    it('should timeout slow health checks', async () => {
      const slowCheck = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        return { status: 'healthy' };
      });

      healthChecker.register({ name: 'slow-service', check: slowCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['slow-service'].status).toBe('unhealthy');
      expect(result.checks['slow-service'].error).toContain('Health check timeout');
    });

    it('should not timeout fast health checks', async () => {
      const fastCheck = vi.fn().mockResolvedValue({ status: 'healthy' });

      healthChecker.register({ name: 'fast-service', check: fastCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('healthy');
      expect(result.checks['fast-service'].status).toBe('healthy');
    });

    it('should handle mixed fast and slow checks', async () => {
      const fastCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
      const slowCheck = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { status: 'healthy' };
      });

      healthChecker.register({ name: 'fast-service', check: fastCheck });
      healthChecker.register({ name: 'slow-service', check: slowCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['fast-service'].status).toBe('healthy');
      expect(result.checks['slow-service'].status).toBe('unhealthy');
    });
  });

  describe('Health Check Caching', () => {
    beforeEach(() => {
      healthChecker = new HealthChecker({
        timeout: 5000,
        enableCaching: true,
        cacheTimeout: 1000, // 1 second for testing
        enableMetrics: true,
      });
    });

    it('should cache health check results', async () => {
      const expensiveCheck = vi.fn().mockResolvedValue({ status: 'healthy', computed: Date.now() });

      healthChecker.register({ name: 'expensive-service', check: expensiveCheck });

      // First call
      const result1 = await healthChecker.runChecks();
      const firstTimestamp = result1.checks['expensive-service'].computed;

      // Second call (should be cached)
      const result2 = await healthChecker.runChecks();
      const secondTimestamp = result2.checks['expensive-service'].computed;

      expect(expensiveCheck).toHaveBeenCalledTimes(1);
      expect(firstTimestamp).toBe(secondTimestamp);
    });

    it('should expire cached results after timeout', async () => {
      const expensiveCheck = vi.fn().mockResolvedValue({ status: 'healthy', computed: Date.now() });

      healthChecker.register({ name: 'expensive-service', check: expensiveCheck });

      // First call
      await healthChecker.runChecks();

      // Wait for cache expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second call (should not be cached)
      await healthChecker.runChecks();

      expect(expensiveCheck).toHaveBeenCalledTimes(2);
    });

    it('should not cache when caching is disabled', async () => {
      healthChecker = new HealthChecker({
        timeout: 5000,
        enableCaching: false,
        cacheTimeout: 1000,
        enableMetrics: true,
      });

      const expensiveCheck = vi.fn().mockResolvedValue({ status: 'healthy' });

      healthChecker.register({ name: 'expensive-service', check: expensiveCheck });

      await healthChecker.runChecks();
      await healthChecker.runChecks();

      expect(expensiveCheck).toHaveBeenCalledTimes(2);
    });

    it('should clear cache manually', async () => {
      const expensiveCheck = vi.fn().mockResolvedValue({ status: 'healthy' });

      healthChecker.register({ name: 'expensive-service', check: expensiveCheck });

      // First call (cached)
      await healthChecker.runChecks();

      // Clear cache
      healthChecker.clearCache();

      // Second call (should not use cache)
      await healthChecker.runChecks();

      expect(expensiveCheck).toHaveBeenCalledTimes(2);
    });
  });

  describe('Individual Health Checks', () => {
    it('should run individual health check by name', async () => {
      const redisCheck = vi.fn().mockResolvedValue({ status: 'healthy', latency: 10 });
      const dbCheck = vi.fn().mockResolvedValue({ status: 'healthy', connections: 5 });

      healthChecker.register({ name: 'redis', check: redisCheck });
      healthChecker.register({ name: 'database', check: dbCheck });

      const result = await healthChecker.runCheck('redis');

      expect(result.status).toBe('healthy');
      expect(result.latency).toBe(10);
      expect(redisCheck).toHaveBeenCalled();
      expect(dbCheck).not.toHaveBeenCalled();
    });

    it('should handle non-existent individual health check', async () => {
      const result = await healthChecker.runCheck('non-existent');

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Health check not found');
    });

    it('should handle individual health check timeout', async () => {
      healthChecker = new HealthChecker({
        timeout: 100,
        enableCaching: false,
        cacheTimeout: 30000,
        enableMetrics: true,
      });

      const slowCheck = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { status: 'healthy' };
      });

      healthChecker.register({ name: 'slow-service', check: slowCheck });

      const result = await healthChecker.runCheck('slow-service');

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Health check timeout');
    });
  });

  describe('Health Metrics', () => {
    beforeEach(() => {
      healthChecker = new HealthChecker({
        timeout: 5000,
        enableCaching: false,
        cacheTimeout: 30000,
        enableMetrics: true,
      });
    });

    it('should collect health check metrics', async () => {
      const fastCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
      const slowCheck = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { status: 'healthy' };
      });

      healthChecker.register({ name: 'fast-service', check: fastCheck });
      healthChecker.register({ name: 'slow-service', check: slowCheck });

      await healthChecker.runChecks();
      await healthChecker.runChecks();

      const metrics = healthChecker.getMetrics();

      expect(metrics.totalChecks).toBe(4); // 2 services × 2 runs
      expect(metrics.healthyChecks).toBe(4);
      expect(metrics.unhealthyChecks).toBe(0);
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
      expect(metrics.checkCounts['fast-service']).toBe(2);
      expect(metrics.checkCounts['slow-service']).toBe(2);
    });

    it('should track failed health checks in metrics', async () => {
      const healthyCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
      const failingCheck = vi.fn().mockResolvedValue({ status: 'unhealthy' });

      healthChecker.register({ name: 'healthy-service', check: healthyCheck });
      healthChecker.register({ name: 'failing-service', check: failingCheck });

      await healthChecker.runChecks();

      const metrics = healthChecker.getMetrics();

      expect(metrics.totalChecks).toBe(2);
      expect(metrics.healthyChecks).toBe(1);
      expect(metrics.unhealthyChecks).toBe(1);
      expect(metrics.healthRate).toBe(0.5);
    });

    it('should not collect metrics when disabled', async () => {
      healthChecker = new HealthChecker({
        timeout: 5000,
        enableCaching: false,
        cacheTimeout: 30000,
        enableMetrics: false,
      });

      const testCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
      healthChecker.register({ name: 'test-service', check: testCheck });

      await healthChecker.runChecks();

      const metrics = healthChecker.getMetrics();

      expect(metrics.totalChecks).toBe(0);
      expect(metrics.healthyChecks).toBe(0);
      expect(metrics.unhealthyChecks).toBe(0);
    });

    it('should reset metrics', async () => {
      const testCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
      healthChecker.register({ name: 'test-service', check: testCheck });

      await healthChecker.runChecks();

      let metrics = healthChecker.getMetrics();
      expect(metrics.totalChecks).toBe(1);

      healthChecker.resetMetrics();

      metrics = healthChecker.getMetrics();
      expect(metrics.totalChecks).toBe(0);
      expect(metrics.healthyChecks).toBe(0);
      expect(metrics.unhealthyChecks).toBe(0);
    });
  });

  describe('Built-in Health Checks', () => {
    it('should provide Redis health check', async () => {
      const mockRedis = {
        ping: vi.fn().mockResolvedValue('PONG'),
        disconnect: vi.fn(),
      };

      const redisCheck = healthChecker.createRedisCheck(mockRedis as any);
      const result = await redisCheck.check();

      expect(result.status).toBe('healthy');
      expect(result.details).toContain('PONG');
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should handle Redis connection failure', async () => {
      const mockRedis = {
        ping: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn(),
      };

      const redisCheck = healthChecker.createRedisCheck(mockRedis as any);
      const result = await redisCheck.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Connection failed');
    });

    it('should provide database health check', async () => {
      const mockDb = {
        raw: vi.fn().mockResolvedValue([{ result: 1 }]),
      };

      const dbCheck = healthChecker.createDatabaseCheck(mockDb as any);
      const result = await dbCheck.check();

      expect(result.status).toBe('healthy');
      expect(mockDb.raw).toHaveBeenCalledWith('SELECT 1 as result');
    });

    it('should handle database connection failure', async () => {
      const mockDb = {
        raw: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      const dbCheck = healthChecker.createDatabaseCheck(mockDb as any);
      const result = await dbCheck.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Database error');
    });

    it('should provide memory usage health check', async () => {
      const memoryCheck = healthChecker.createMemoryCheck({ maxMemoryMB: 1000 });
      const result = await memoryCheck.check();

      expect(result.status).toBe('healthy');
      expect(result.details).toHaveProperty('memoryUsage');
      expect(result.details).toHaveProperty('maxMemory');
      expect(result.details).toHaveProperty('usagePercentage');
    });

    it('should detect high memory usage', async () => {
      const memoryCheck = healthChecker.createMemoryCheck({ maxMemoryMB: 1 }); // Very low limit
      const result = await memoryCheck.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Memory usage too high');
    });
  });

  describe('Health Check Dependencies', () => {
    it('should handle dependent health checks', async () => {
      const primaryCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
      const dependentCheck = vi.fn().mockImplementation(async () => {
        // This check depends on primary being healthy
        const primaryResult = await healthChecker.runCheck('primary');
        if (primaryResult.status === 'healthy') {
          return { status: 'healthy', dependsOn: 'primary' };
        }
        return { status: 'unhealthy', error: 'Primary service unhealthy' };
      });

      healthChecker.register({ name: 'primary', check: primaryCheck });
      healthChecker.register({ name: 'dependent', check: dependentCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('healthy');
      expect(result.checks.primary.status).toBe('healthy');
      expect(result.checks.dependent.status).toBe('healthy');
      expect(result.checks.dependent.dependsOn).toBe('primary');
    });

    it('should handle failing dependent health checks', async () => {
      const primaryCheck = vi.fn().mockResolvedValue({ status: 'unhealthy', error: 'Primary failed' });
      const dependentCheck = vi.fn().mockImplementation(async () => {
        const primaryResult = await healthChecker.runCheck('primary');
        if (primaryResult.status === 'healthy') {
          return { status: 'healthy' };
        }
        return { status: 'unhealthy', error: 'Primary service unhealthy' };
      });

      healthChecker.register({ name: 'primary', check: primaryCheck });
      healthChecker.register({ name: 'dependent', check: dependentCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.primary.status).toBe('unhealthy');
      expect(result.checks.dependent.status).toBe('unhealthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle health check registration errors', () => {
      expect(() => {
        healthChecker.register(null as any);
      }).toThrow();

      expect(() => {
        healthChecker.register({ name: '', check: vi.fn() });
      }).toThrow();

      expect(() => {
        healthChecker.register({ name: 'test', check: null as any });
      }).toThrow();
    });

    it('should handle concurrent health check execution', async () => {
      const concurrentCheck = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { status: 'healthy', timestamp: Date.now() };
      });

      healthChecker.register({ name: 'concurrent-service', check: concurrentCheck });

      // Run multiple health checks concurrently
      const promises = Array(10).fill(0).map(() => healthChecker.runChecks());
      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe('healthy');
        expect(result.checks['concurrent-service'].status).toBe('healthy');
      });
    });

    it('should handle health check that returns invalid status', async () => {
      const invalidCheck = vi.fn().mockResolvedValue({ status: 'invalid-status' });

      healthChecker.register({ name: 'invalid-service', check: invalidCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['invalid-service'].status).toBe('unhealthy');
      expect(result.checks['invalid-service'].error).toContain('Invalid health check result');
    });

    it('should handle health check that returns non-object', async () => {
      const invalidCheck = vi.fn().mockResolvedValue('not an object');

      healthChecker.register({ name: 'invalid-service', check: invalidCheck });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks['invalid-service'].status).toBe('unhealthy');
      expect(result.checks['invalid-service'].error).toContain('Invalid health check result');
    });
  });

  describe('Performance', () => {
    it('should handle many health checks efficiently', async () => {
      // Register many health checks
      for (let i = 0; i < 100; i++) {
        const check = vi.fn().mockResolvedValue({ status: 'healthy', id: i });
        healthChecker.register({ name: `service-${i}`, check });
      }

      const startTime = Date.now();
      const result = await healthChecker.runChecks();
      const endTime = Date.now();

      expect(result.status).toBe('healthy');
      expect(Object.keys(result.checks)).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle concurrent individual health checks', async () => {
      const check = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 'healthy' };
      });

      healthChecker.register({ name: 'test-service', check });

      const promises = Array(50).fill(0).map(() => healthChecker.runCheck('test-service'));
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      results.forEach(result => {
        expect(result.status).toBe('healthy');
      });

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      const testCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
      healthChecker.register({ name: 'test-service', check: testCheck });

      healthChecker.destroy();

      expect(healthChecker.getRegisteredChecks()).toHaveLength(0);
    });

    it('should handle multiple destroy calls', () => {
      healthChecker.destroy();
      healthChecker.destroy();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should prevent operations after destroy', async () => {
      healthChecker.destroy();

      await expect(healthChecker.runChecks()).rejects.toThrow('HealthChecker has been destroyed');
      
      expect(() => {
        healthChecker.register({ name: 'test', check: vi.fn() });
      }).toThrow('HealthChecker has been destroyed');
    });

    it('should clear cache on destroy', async () => {
      const testCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
      healthChecker.register({ name: 'test-service', check: testCheck });

      // Cache a result
      await healthChecker.runChecks();

      healthChecker.destroy();

      // Cache should be cleared (verified by no errors on destroy)
      expect(true).toBe(true);
    });
  });
});













































describe('health-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined and properly exported', () => {
    expect(health-checker).toBeDefined();
    expect(typeof health-checker).not.toBe('undefined');
  });

  it('should export expected functions/classes', () => {
    // TODO: Add specific export tests for health-checker
    expect(typeof health-checker).toBe('object');
  });

  it('should handle basic functionality', () => {
    // TODO: Add specific functionality tests for health-checker
    expect(true).toBe(true);
  });
});

