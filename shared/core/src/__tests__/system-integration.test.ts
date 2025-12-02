import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { LoadTester } from '../testing/load-tester';
import { HealthChecker } from '../observability/health/health-checker';
import { SlidingWindowStore } from '../rate-limiting/algorithms/sliding-window';
import { MiddlewareFactory } from '../middleware/factory';
import express from 'express';
import request from 'supertest';
import Redis from 'ioredis';
import { Logger } from '../observability/logging';
// import { logger } from '../observability/logging'; // Unused import

describe('Core System Integration Tests', () => {
  let app: express.Application;
  let loadTester: LoadTester;
  let healthChecker: HealthChecker;
  let rateLimiter: SlidingWindowStore;
  let redis: Redis;
  let middlewareFactory: MiddlewareFactory;

  beforeEach(async () => {
    // Setup dependencies
    redis = new Redis({ host: 'localhost', port: 6379 });
    loadTester = new LoadTester();
    healthChecker = new HealthChecker({
      timeoutMs: 1000,
      parallelExecution: true,
      cacheMs: 1000
    });

    rateLimiter = new SlidingWindowStore(redis);

    middlewareFactory = new MiddlewareFactory(
      {
        validation: { enabled: false, priority: 5 },
        auth: { enabled: false, priority: 8 },
        logging: { enabled: true, priority: 10 },
        rateLimit: { enabled: true, priority: 20 },
        health: { 
          enabled: true, 
          priority: 30,
          config: { endpoint: '/health', includeSystemMetrics: true }
        },
        cache: { enabled: false, priority: 40 },
        errorHandler: { enabled: true, priority: 90 },
        global: {
          performanceMonitoring: true,
          enableDeprecationWarnings: true,
          enableLegacyMode: false
        }
      },
      {
        logger: new Logger(),
        cache: {} as any,
        validator: {} as any,
        rateLimitStore: rateLimiter,
        healthChecker
      }
    );

    // Setup express app
    app = express();
    middlewareFactory.createMiddleware().forEach(middleware => middleware(app));

    // Add test endpoints
    app.get('/test', (req, res) => res.json({ success: true }));
    app.get('/error', () => { throw new Error('Test error'); });
  });

  afterEach(async () => {
    await redis.quit();
  });

  describe('Load Testing', () => {
    it('should handle concurrent requests within performance thresholds', async () => {
      const results = await loadTester.simulateLoad({
        totalRequests: 1000,
        concurrency: 50,
        requestFn: () => request(app).get('/test')
      });

      expect(results.successRate).toBeGreaterThan(95);
      expect(results.averageResponseTime).toBeLessThan(100);
      expect(results.percentiles.p95).toBeLessThan(200);
    });

    it('should maintain rate limits under load', async () => {
      const results = await loadTester.simulateLoad({
        totalRequests: 200,
        concurrency: 10,
        requestFn: () => request(app).get('/test')
      });

      const metrics = middlewareFactory.getPerformanceMetrics();
      expect(metrics.rateLimit.count).toBe(200);
      expect(results.failedRequests).toBeGreaterThan(0); // Some requests should be rate limited
    });
  });

  describe('Chaos Testing', () => {
    it('should degrade gracefully under network latency', async () => {
      await loadTester.injectFailures({
        networkLatency: {
          latencyMs: 100,
          duration: 1000
        }
      });

      const results = await loadTester.simulateLoad({
        totalRequests: 100,
        concurrency: 5,
        requestFn: () => request(app).get('/test')
      });

      expect(results.successRate).toBeGreaterThan(90);
    });

    it('should handle redis failures gracefully', async () => {
      await loadTester.injectFailures({
        errorRate: {
          percentage: 0.2,
          duration: 1000
        }
      });

      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
    });

    it('should recover from resource exhaustion', async () => {
      await loadTester.injectFailures({
        resourceExhaustion: {
          resource: 'memory',
          percentage: 80,
          duration: 1000
        }
      });

      const results = await loadTester.simulateLoad({
        totalRequests: 50,
        concurrency: 2,
        requestFn: () => request(app).get('/test')
      });

      expect(results.successRate).toBeGreaterThan(80);
    });
  });

  describe('Middleware Integration', () => {
    it('should apply middleware in correct order', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-correlation-id', 'test-123');

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-correlation-id']).toBe('test-123');
    });

    it('should collect performance metrics', async () => {
      await loadTester.simulateLoad({
        totalRequests: 100,
        concurrency: 5,
        requestFn: () => request(app).get('/test')
      });

      const metrics = middlewareFactory.getPerformanceMetrics();
      expect(metrics.logging).toBeDefined();
      expect(metrics.rateLimit).toBeDefined();
      expect(metrics.logging.count).toBe(100);
    });
  });
});
















































