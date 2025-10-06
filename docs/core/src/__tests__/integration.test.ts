import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MiddlewareConfig } from '../src/middleware/config';
import { MiddlewareFactory } from '../src/middleware/factory';
import { Logger } from '../src/logging';
import { CacheService } from '../src/cache';
import { ValidationService } from '../src/validation';
import { RateLimitStore } from '../src/rate-limiting/types';
import { HealthChecker } from '../src/health/health-checker';
import express from 'express';
import request from 'supertest';

describe('Core Utilities Integration Tests', () => {
  let app: express.Application;
  let config: MiddlewareConfig;
  let factory: MiddlewareFactory;

  beforeAll(() => {
    // Setup mock dependencies
    const logger = {} as Logger;
    const cache = {} as CacheService;
    const validator = {} as ValidationService;
    const rateLimitStore = {} as RateLimitStore;
    const healthChecker = {} as HealthChecker;

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
        enableLegacyMode: false,
        enableDeprecationWarnings: true,
        performanceMonitoring: true
      }
    };

    factory = new MiddlewareFactory(
      config,
      logger,
      cache,
      validator,
      rateLimitStore,
      healthChecker
    );

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
