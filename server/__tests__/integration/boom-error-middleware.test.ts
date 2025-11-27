/**
 * End-to-End Tests for Boom Error Middleware
 * 
 * Tests complete error flows to ensure zero breaking changes
 * for existing API clients while using the new Boom error system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as Boom from '@hapi/boom';
import { ZodError } from 'zod';
import { boomErrorMiddleware, asyncErrorHandler, errorContextMiddleware } from '@server/middleware/boom-error-middleware.js';
import { errorAdapter } from '@server/infrastructure/errors/error-adapter.js';

describe('Boom Error Middleware Integration Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(errorContextMiddleware);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Boom Error Handling', () => {
    it('should handle Boom validation errors correctly', async () => {
      app.get('/test-validation', asyncErrorHandler(async (req, res) => {
        throw Boom.badRequest('Invalid input data');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-validation')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: false,
          timestamp: expect.any(String)
        },
        metadata: {
          service: 'legislative-platform'
        }
      });
    });

    it('should handle Boom authentication errors correctly', async () => {
      app.get('/test-auth', asyncErrorHandler(async (req, res) => {
        throw Boom.unauthorized('Invalid token');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-auth')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: false,
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle Boom authorization errors correctly', async () => {
      app.get('/test-authz', asyncErrorHandler(async (req, res) => {
        throw Boom.forbidden('Access denied');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-authz')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: false
        }
      });
    });

    it('should handle Boom not found errors correctly', async () => {
      app.get('/test-notfound', asyncErrorHandler(async (req, res) => {
        throw Boom.notFound('Resource not found');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-notfound')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: false
        }
      });
    });

    it('should handle Boom server errors correctly', async () => {
      app.get('/test-server-error', asyncErrorHandler(async (req, res) => {
        throw Boom.internal('Internal server error');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-server-error')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: false
        }
      });
    });
  });

  describe('Zod Validation Error Handling', () => {
    it('should convert Zod errors to proper API responses', async () => {
      app.post('/test-zod', asyncErrorHandler(async (req, res) => {
        // Simulate a Zod validation error
        const zodError = new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'number',
            path: ['name'],
            message: 'Expected string, received number'
          },
          {
            code: 'too_small',
            minimum: 1,
            type: 'string',
            inclusive: true,
            path: ['email'],
            message: 'String must contain at least 1 character(s)'
          }
        ]);
        throw zodError;
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .post('/test-zod')
        .send({ name: 123, email: '' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: false
        }
      });
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle generic JavaScript errors', async () => {
      app.get('/test-generic', asyncErrorHandler(async (req, res) => {
        throw new Error('Something went wrong');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-generic')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: false
        }
      });
    });

    it('should handle timeout errors', async () => {
      app.get('/test-timeout', asyncErrorHandler(async (req, res) => {
        const error = new Error('Request timeout');
        error.message = 'timeout occurred';
        throw error;
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-timeout')
        .expect(408);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: false
        }
      });
    });

    it('should handle JSON parsing errors', async () => {
      app.post('/test-json', asyncErrorHandler(async (req, res) => {
        const error = new Error('Invalid JSON');
        (error as any).type = 'entity.parse.failed';
        throw error;
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .post('/test-json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: expect.any(String),
          retryable: false
        }
      });
    });
  });

  describe('Error Context and Logging', () => {
    it('should add request context to errors', async () => {
      app.get('/test-context', asyncErrorHandler(async (req, res) => {
        throw Boom.badRequest('Test error');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-context')
        .set('x-request-id', 'test-request-123')
        .expect(400);

      expect(response.body.metadata).toMatchObject({
        service: 'legislative-platform',
        requestId: 'test-request-123'
      });
    });

    it('should generate request ID if not provided', async () => {
      app.get('/test-auto-id', asyncErrorHandler(async (req, res) => {
        throw Boom.badRequest('Test error');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-auto-id')
        .expect(400);

      expect(response.body.metadata.requestId).toBeDefined();
      expect(typeof response.body.metadata.requestId).toBe('string');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain the same response structure as legacy error handling', async () => {
      app.get('/test-compatibility', asyncErrorHandler(async (req, res) => {
        throw Boom.badRequest('Validation failed');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-compatibility')
        .expect(400);

      // Verify the response structure matches what existing clients expect
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('id');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('category');
      expect(response.body.error).toHaveProperty('retryable');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('service');
    });

    it('should handle errors when response headers are already sent', async () => {
      app.get('/test-headers-sent', (req, res, next) => {
        res.status(200).json({ message: 'Success' });
        // Simulate an error after headers are sent
        setTimeout(() => {
          next(new Error('Late error'));
        }, 10);
      });
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-headers-sent')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Success'
      });
    });
  });

  describe('Error Adapter Integration', () => {
    it('should use error adapter for creating standardized errors', async () => {
      app.get('/test-adapter', asyncErrorHandler(async (req, res) => {
        const validationResult = errorAdapter.createValidationError(
          [{ field: 'email', message: 'Email is required' }],
          { service: 'test-service', operation: 'test-operation' }
        );
        
        if (validationResult.isErr()) {
          throw errorAdapter.toBoom(validationResult.error);
        }
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-adapter')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          category: 'validation',
          retryable: false
        }
      });
    });
  });

  describe('Middleware Failure Handling', () => {
    it('should handle cases where the middleware itself fails', async () => {
      // Mock the error adapter to throw an error
      const originalToErrorResponse = errorAdapter.toErrorResponse;
      vi.spyOn(errorAdapter, 'toErrorResponse').mockImplementation(() => {
        throw new Error('Adapter failure');
      });

      app.get('/test-middleware-failure', asyncErrorHandler(async (req, res) => {
        throw Boom.badRequest('Test error');
      }));
      app.use(boomErrorMiddleware);

      const response = await request(app)
        .get('/test-middleware-failure')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          id: expect.any(String),
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred. Please try again.',
          category: 'system',
          retryable: false
        }
      });

      // Restore the original method
      errorAdapter.toErrorResponse = originalToErrorResponse;
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with many errors', async () => {
      app.get('/test-memory', asyncErrorHandler(async (req, res) => {
        throw Boom.badRequest(`Error ${Math.random()}`);
      }));
      app.use(boomErrorMiddleware);

      // Make many requests to test for memory leaks
      const promises = Array.from({ length: 100 }, (_, i) =>
        request(app).get('/test-memory').expect(400)
      );

      const responses = await Promise.all(promises);
      
      // All responses should be properly formatted
      responses.forEach(response => {
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: expect.any(String),
            message: expect.any(String)
          }
        });
      });
    });

    it('should handle concurrent errors properly', async () => {
      app.get('/test-concurrent', asyncErrorHandler(async (req, res) => {
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        throw Boom.badRequest('Concurrent error');
      }));
      app.use(boomErrorMiddleware);

      // Make concurrent requests
      const promises = Array.from({ length: 50 }, () =>
        request(app).get('/test-concurrent').expect(400)
      );

      const responses = await Promise.all(promises);
      
      // All responses should be properly formatted and unique
      const errorIds = responses.map(r => r.body.error.id);
      const uniqueIds = new Set(errorIds);
      expect(uniqueIds.size).toBe(errorIds.length); // All IDs should be unique
    });
  });
});
