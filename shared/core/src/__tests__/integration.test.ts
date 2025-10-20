import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MiddlewareConfig } from '../middleware/config';
import { MiddlewareFactory } from '../middleware/factory';
import { Logger } from '../logging/logger';
import { CacheService } from '../caching/core/interfaces';
import { ValidationService } from '../validation/validation-service';
import { RateLimitStore } from '../rate-limiting/types';
import { HealthChecker } from '../health/health-checker';
import express from 'express';
import request from 'supertest';
import { logger } from '../observability/logging';

describe('Core Utilities Integration Tests', () => {
  let app: express.Application;
  let config: MiddlewareConfig;
  let factory: MiddlewareFactory;

  beforeAll(() => {
    // Setup mock dependencies
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;

    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      has: jest.fn().mockResolvedValue(false),
      getMetrics: jest.fn().mockResolvedValue({}),
    } as unknown as CacheService;

    const validator = {
      validate: jest.fn().mockResolvedValue({ isValid: true, errors: [] }),
      registerSchema: jest.fn().mockResolvedValue(undefined),
      getSchema: jest.fn().mockReturnValue(null),
      listSchemas: jest.fn().mockReturnValue([]),
    } as unknown as ValidationService;

    const rateLimitStore = {
      check: jest.fn().mockResolvedValue({ allowed: true, remaining: 100, resetTime: Date.now() + 60000 }),
      recordRequest: jest.fn().mockResolvedValue(undefined),
      getState: jest.fn().mockResolvedValue({}),
      reset: jest.fn().mockResolvedValue(undefined),
    } as unknown as RateLimitStore;

    const healthChecker = {
      check: jest.fn().mockResolvedValue({ healthy: true, details: {} }),
      getMetrics: jest.fn().mockResolvedValue({}),
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












































