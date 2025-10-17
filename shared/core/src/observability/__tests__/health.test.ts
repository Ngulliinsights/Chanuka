import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HealthCheckOrchestrator,
  createMemoryHealthCheck,
  createDiskHealthCheck,
  createExternalServiceHealthCheck,
  createProcessHealthCheck,
} from '../health';

describe('HealthCheckOrchestrator', () => {
  let orchestrator: HealthCheckOrchestrator;

  beforeEach(() => {
    orchestrator = new HealthCheckOrchestrator({
      enableCaching: false,
      enableMetrics: false,
    });
  });

  describe('Health Check Registration', () => {
    it('should register and retrieve health checks', () => {
      const check = {
        name: 'test-check',
        check: async () => ({
          status: 'healthy' as const,
          message: 'Test passed',
          timestamp: new Date(),
          duration: 10,
        }),
      };

      orchestrator.register(check);

      const retrieved = orchestrator.getCheck('test-check');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-check');
    });

    it('should list all registered checks', () => {
      orchestrator.register({
        name: 'check1',
        check: async () => ({
          status: 'healthy' as const,
          timestamp: new Date(),
          duration: 5,
        }),
      });

      orchestrator.register({
        name: 'check2',
        check: async () => ({
          status: 'healthy' as const,
          timestamp: new Date(),
          duration: 5,
        }),
      });

      const checks = orchestrator.listChecks();
      expect(checks).toHaveLength(2);
      expect(checks.map(c => c.name)).toEqual(['check1', 'check2']);
    });
  });

  describe('Health Check Execution', () => {
    it('should run individual health checks', async () => {
      orchestrator.register({
        name: 'simple-check',
        check: async () => ({
          status: 'healthy' as const,
          message: 'All good',
          timestamp: new Date(),
          duration: 10,
        }),
      });

      const result = await orchestrator.runCheck('simple-check');

      expect(result.status).toBe('healthy');
      expect(result.message).toBe('All good');
      expect(result.duration).toBe(10);
    });

    it('should run all health checks concurrently', async () => {
      orchestrator.register({
        name: 'check1',
        check: async () => ({
          status: 'healthy' as const,
          timestamp: new Date(),
          duration: 10,
        }),
      });

      orchestrator.register({
        name: 'check2',
        check: async () => ({
          status: 'unhealthy' as const,
          message: 'Failed',
          timestamp: new Date(),
          duration: 20,
        }),
      });

      const report = await orchestrator.runAllChecks();

      expect(report.checks).toHaveProperty('check1');
      expect(report.checks).toHaveProperty('check2');
      expect(report.checks.check1.status).toBe('healthy');
      expect(report.checks.check2.status).toBe('unhealthy');
      expect(report.status).toBe('unhealthy'); // Overall status should be unhealthy
    });

    it('should handle check timeouts', async () => {
      orchestrator.register({
        name: 'slow-check',
        timeout: 50,
        check: async () => {
          await new Promise(resolve => setTimeout(resolve, 100)); // Longer than timeout
          return {
            status: 'healthy' as const,
            timestamp: new Date(),
            duration: 100,
          };
        },
      });

      const result = await orchestrator.runCheck('slow-check');

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('timeout');
    });

    it('should handle check errors', async () => {
      orchestrator.register({
        name: 'error-check',
        check: async () => {
          throw new Error('Test error');
        },
      });

      const result = await orchestrator.runCheck('error-check');

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Test error');
    });
  });

  describe('Built-in Health Checks', () => {
    it('should create memory health check', () => {
      const check = createMemoryHealthCheck();

      expect(check.name).toBe('memory');
      expect(check.description).toBe('Checks system memory usage');
      expect(typeof check.check).toBe('function');
    });

    it('should create disk health check', () => {
      const check = createDiskHealthCheck();

      expect(check.name).toBe('disk');
      expect(check.description).toBe('Checks disk space availability');
      expect(typeof check.check).toBe('function');
    });

    it('should create external service health check', () => {
      const check = createExternalServiceHealthCheck({
        url: 'https://api.example.com/health',
      });

      expect(check.name).toBe('external-service:api.example.com');
      expect(typeof check.check).toBe('function');
    });

    it('should create process health check', () => {
      const check = createProcessHealthCheck();

      expect(check.name).toBe('process');
      expect(check.description).toBe('Checks current process health');
      expect(typeof check.check).toBe('function');
    });
  });

  describe('Dependency Management', () => {
    it('should handle health check dependencies', async () => {
      orchestrator.register({
        name: 'dependency-check',
        check: async () => ({
          status: 'healthy' as const,
          timestamp: new Date(),
          duration: 5,
        }),
      });

      orchestrator.register({
        name: 'dependent-check',
        dependencies: ['dependency-check'],
        check: async () => ({
          status: 'healthy' as const,
          timestamp: new Date(),
          duration: 5,
        }),
      });

      const report = await orchestrator.runAllChecks();

      expect(report.checks).toHaveProperty('dependency-check');
      expect(report.checks).toHaveProperty('dependent-check');
      expect(report.checks['dependent-check'].status).toBe('healthy');
    });

    it('should fail dependent checks when dependencies fail', async () => {
      orchestrator.register({
        name: 'failing-dependency',
        check: async () => ({
          status: 'unhealthy' as const,
          message: 'Dependency failed',
          timestamp: new Date(),
          duration: 5,
        }),
      });

      orchestrator.register({
        name: 'dependent-check',
        dependencies: ['failing-dependency'],
        check: async () => ({
          status: 'healthy' as const,
          timestamp: new Date(),
          duration: 5,
        }),
      });

      const report = await orchestrator.runAllChecks();

      expect(report.checks['dependent-check'].status).toBe('unhealthy');
      expect(report.checks['dependent-check'].message).toContain('Dependencies failed');
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track health check metrics', async () => {
      const metricsOrchestrator = new HealthCheckOrchestrator({
        enableMetrics: true,
      });

      metricsOrchestrator.register({
        name: 'metrics-test',
        check: async () => ({
          status: 'healthy' as const,
          timestamp: new Date(),
          duration: 10,
        }),
      });

      await metricsOrchestrator.runAllChecks();

      const metrics = metricsOrchestrator.getMetrics();
      expect(metrics.totalChecks).toBe(1);
      expect(metrics.successfulChecks).toBe(1);
      expect(metrics.failedChecks).toBe(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should cache health check results', async () => {
      const cachedOrchestrator = new HealthCheckOrchestrator({
        enableCaching: true,
        cacheTtl: 1000, // 1 second
      });

      let callCount = 0;

      cachedOrchestrator.register({
        name: 'cached-check',
        check: async () => {
          callCount++;
          return {
            status: 'healthy' as const,
            timestamp: new Date(),
            duration: 10,
          };
        },
      });

      // First call
      await cachedOrchestrator.runCheck('cached-check');
      expect(callCount).toBe(1);

      // Second call should use cache
      await cachedOrchestrator.runCheck('cached-check');
      expect(callCount).toBe(1); // Should not increment

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Third call should execute again
      await cachedOrchestrator.runCheck('cached-check');
      expect(callCount).toBe(2);
    });
  });
});