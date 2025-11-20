import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
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

import { MiddlewareConfig } from '../middleware/config';
import { MiddlewareFactory } from '@shared/core/src/middleware/factory';
// import { Logger } from '@shared/core/src/observability/logging'; // Using logger instance instead
import { CacheInterface } from '../caching/core/interfaces';
import { ValidationAdapter } from '../validation/core/interfaces';
import { RateLimitStore } from '@shared/core/src/types';
import { HealthOrchestrator } from '../observability/health/health-orchestrator';
import express from 'express';
import request from 'supertest';
import { logger } from '@shared/core/src/observability/logging';

describe('Core Utilities Integration Tests', () => {
  let app: express.Application;
  let config: MiddlewareConfig;
  let factory: MiddlewareFactory;

  beforeAll(() => {
    // Setup mock dependencies
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    const cache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn().mockResolvedValue(false),
      getMetrics: vi.fn().mockResolvedValue({}),
    } as unknown as CacheService;

    const validator = {
      validate: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
      registerSchema: vi.fn().mockResolvedValue(undefined),
      getSchema: vi.fn().mockReturnValue(null),
      listSchemas: vi.fn().mockReturnValue([]),
    } as unknown as ValidationService;

    const rateLimitStore = {
      check: vi.fn().mockResolvedValue({ allowed: true, remaining: 100, resetTime: Date.now() + 60000 }),
      recordRequest: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockResolvedValue({}),
      reset: vi.fn().mockResolvedValue(undefined),
    } as unknown as RateLimitStore;

    const healthChecker = {
      check: vi.fn().mockResolvedValue({ healthy: true, details: {} }),
      getMetrics: vi.fn().mockResolvedValue({}),
    } as unknown as HealthChecker;

    config = {
      logging: { enabled: true, priority: 10 },
      auth: { enabled: true, priority: 20 },
      cache: { enabled: true, priority: 30 },
      validation: { enabled: true, priority: 40 },
      rateLimit: { enabled: true, priority: 50 },
      health: {
        enabled: true,
        priority: 60,
        config: {
          endpoint: '/health',
          includeSystemMetrics: true
        }
      },
      errorHandler: { enabled: true, priority: 90 },
      global: {
        enabled: true,
        priority: 100,
        performanceMonitoring: true,
        metricsRetentionSize: 1000,
        logMetricsInterval: 100
      }
    };

    factory = new MiddlewareFactory(config, {
      logger,
      cache,
      validator,
      rateLimitStore,
      healthChecker
    });

    app = express();
    factory.createMiddleware().forEach(middleware => middleware(app));
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 when system is healthy', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting headers', async () => {
      const response = await request(app).get('/test');
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors properly', async () => {
      app.get('/error', () => {
        throw new Error('Test error');
      });

      const response = await request(app).get('/error');
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Validation', () => {
    it('should validate request body', async () => {
      const response = await request(app)
        .post('/test')
        .send({ invalid: 'data' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  afterAll(() => {
    // Cleanup
  });
});















































