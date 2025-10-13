/**
 * Validation Middleware Tests
 * 
 * Tests for validation middleware functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validateRequest,
  ValidationMiddleware,
  validate,
  validateBatch,
  validateFileUpload,
  validationErrorHandler,
  getValidatedData,
  getBatchValidationResult,
  commonValidation,
} from '../middleware';
import { ValidationError } from '../types';
import { logger } from '../utils/logger';

// Mock Express request/response objects
const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  method: 'GET',
  path: '/test',
  ip: '127.0.0.1',
  ...overrides,
} as Request);

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe('Validation Middleware', () => {
  describe('validateRequest', () => {
    it('should validate request body successfully', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const middleware = validateRequest({ body: schema });
      const req = createMockRequest({
        body: { name: 'John', age: 30 },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({ name: 'John', age: 30 });
    });

    it('should validate query parameters successfully', async () => {
      const schema = z.object({
        page: z.coerce.number().min(1),
        limit: z.coerce.number().min(1).max(100),
      });

      const middleware = validateRequest({ query: schema });
      const req = createMockRequest({
        query: { page: '2', limit: '10' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query).toEqual({ page: 2, limit: 10 });
    });

    it('should validate URL parameters successfully', async () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      const middleware = validateRequest({ params: schema });
      const req = createMockRequest({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.params.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return validation error for invalid data', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const middleware = validateRequest({ body: schema });
      const req = createMockRequest({
        body: { name: 123, age: 'invalid' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'body.name' }),
            expect.objectContaining({ field: 'body.age' }),
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should skip validation when skipIf condition is true', async () => {
      const schema = z.object({
        name: z.string(),
      });

      const middleware = validateRequest({
        body: schema,
        skipIf: (req) => req.headers['x-skip-validation'] === 'true',
      });

      const req = createMockRequest({
        body: { name: 123 }, // Invalid data
        headers: { 'x-skip-validation': 'true' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should use custom error handler when provided', async () => {
      const schema = z.object({
        name: z.string(),
      });

      const customErrorHandler = vi.fn();
      const middleware = validateRequest({
        body: schema,
        onError: customErrorHandler,
      });

      const req = createMockRequest({
        body: { name: 123 },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(customErrorHandler).toHaveBeenCalledWith(
        expect.any(ValidationError),
        req,
        res,
        next
      );
    });

    it('should store validated data in request object', async () => {
      const bodySchema = z.object({ name: z.string() });
      const querySchema = z.object({ page: z.coerce.number() });

      const middleware = validateRequest({
        body: bodySchema,
        query: querySchema,
      });

      const req = createMockRequest({
        body: { name: 'John' },
        query: { page: '1' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      const validatedData = getValidatedData(req);
      expect(validatedData.body).toEqual({ name: 'John' });
      expect(validatedData.query).toEqual({ page: 1 });
    });
  });

  describe('ValidationMiddleware factory methods', () => {
    it('should create body validation middleware', async () => {
      const schema = z.object({ name: z.string() });
      const middleware = ValidationMiddleware.body(schema);

      const req = createMockRequest({
        body: { name: 'John' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should create query validation middleware', async () => {
      const schema = z.object({ page: z.coerce.number() });
      const middleware = ValidationMiddleware.query(schema);

      const req = createMockRequest({
        query: { page: '1' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query).toEqual({ page: 1 });
    });

    it('should create conditional validation middleware', async () => {
      const schema = z.object({ name: z.string() });
      const middleware = ValidationMiddleware.conditional(
        (req) => req.method === 'POST',
        { body: schema }
      );

      // Should validate for POST request
      const postReq = createMockRequest({
        method: 'POST',
        body: { name: 'John' },
      });
      const res1 = createMockResponse();
      const next1 = createMockNext();

      await middleware(postReq, res1, next1);
      expect(next1).toHaveBeenCalledWith();

      // Should skip validation for GET request
      const getReq = createMockRequest({
        method: 'GET',
        body: { name: 123 }, // Invalid data
      });
      const res2 = createMockResponse();
      const next2 = createMockNext();

      await middleware(getReq, res2, next2);
      expect(next2).toHaveBeenCalledWith();
      expect(res2.status).not.toHaveBeenCalled();
    });
  });

  describe('validate decorator', () => {
    it('should validate method parameters', async () => {
      class TestController {
        @validate({
          schema: z.object({ name: z.string(), age: z.number() }),
        })
        async createUser(userData: any) {
          return { id: 1, ...userData };
        }
      }

      const controller = new TestController();
      const result = await controller.createUser({ name: 'John', age: 30 });

      expect(result).toEqual({ id: 1, name: 'John', age: 30 });
    });

    it('should throw validation error for invalid parameters', async () => {
      class TestController {
        @validate({
          schema: z.object({ name: z.string(), age: z.number() }),
        })
        async createUser(userData: any) {
          return { id: 1, ...userData };
        }
      }

      const controller = new TestController();

      await expect(
        controller.createUser({ name: 123, age: 'invalid' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('validateBatch middleware', () => {
    it('should validate array of valid items', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const middleware = validateBatch(schema);
      const req = createMockRequest({
        body: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ]);
    });

    it('should return error for mixed valid/invalid items', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const middleware = validateBatch(schema);
      const req = createMockRequest({
        body: [
          { name: 'John', age: 30 },
          { name: 123, age: 'invalid' },
          { name: 'Jane', age: 25 },
        ],
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Batch Validation Error',
          valid: [
            { name: 'John', age: 30 },
            { name: 'Jane', age: 25 },
          ],
          invalid: expect.arrayContaining([
            expect.objectContaining({
              index: 1,
              errors: expect.any(Array),
            }),
          ]),
          summary: {
            total: 3,
            valid: 2,
            invalid: 1,
          },
        })
      );
    });

    it('should return error for non-array body', async () => {
      const schema = z.object({ name: z.string() });
      const middleware = validateBatch(schema);

      const req = createMockRequest({
        body: { name: 'John' }, // Not an array
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
          message: 'Request body must be an array for batch validation',
        })
      );
    });
  });

  describe('validateFileUpload middleware', () => {
    it('should validate single file upload', async () => {
      const fileSchema = z.object({
        filename: z.string(),
        mimetype: z.string(),
        size: z.number().max(1024 * 1024), // 1MB
      });

      const middleware = validateFileUpload(fileSchema);
      const req = createMockRequest({
        file: {
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          size: 500000,
        },
      } as any);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should validate multiple file uploads', async () => {
      const fileSchema = z.object({
        filename: z.string(),
        mimetype: z.string(),
        size: z.number().max(1024 * 1024),
      });

      const middleware = validateFileUpload(fileSchema);
      const req = createMockRequest({
        files: [
          {
            originalname: 'test1.jpg',
            mimetype: 'image/jpeg',
            size: 500000,
          },
          {
            originalname: 'test2.jpg',
            mimetype: 'image/jpeg',
            size: 600000,
          },
        ],
      } as any);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should return error for invalid file', async () => {
      const fileSchema = z.object({
        filename: z.string(),
        mimetype: z.string(),
        size: z.number().max(1024), // Very small limit
      });

      const middleware = validateFileUpload(fileSchema);
      const req = createMockRequest({
        file: {
          originalname: 'large.jpg',
          mimetype: 'image/jpeg',
          size: 2048, // Too large
        },
      } as any);
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File Validation Error',
        })
      );
    });
  });

  describe('validationErrorHandler', () => {
    it('should handle ValidationError', () => {
      const errorHandler = validationErrorHandler();
      const error = new ValidationError(new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ]));

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.any(Array),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle ZodError', () => {
      const errorHandler = validationErrorHandler();
      const error = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ]);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.any(Array),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass non-validation errors to next handler', () => {
      const errorHandler = validationErrorHandler();
      const error = new Error('Some other error');

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      errorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Common validation presets', () => {
    it('should create pagination validation middleware', async () => {
      const middleware = await commonValidation.pagination();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create UUID parameter validation middleware', () => {
      const middleware = commonValidation.uuidParam('userId');
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create search query validation middleware', async () => {
      const middleware = await commonValidation.searchQuery();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create file upload validation middleware', async () => {
      const middleware = await commonValidation.fileUpload();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Utility functions', () => {
    it('should extract validated data from request', () => {
      const req = createMockRequest();
      (req as any).validated = { body: { name: 'John' } };

      const validatedData = getValidatedData(req);
      expect(validatedData).toEqual({ body: { name: 'John' } });
    });

    it('should extract batch validation result from request', () => {
      const req = createMockRequest();
      const batchResult = {
        valid: [{ name: 'John' }],
        invalid: [],
        totalCount: 1,
        validCount: 1,
        invalidCount: 0,
      };
      (req as any).batchValidation = batchResult;

      const result = getBatchValidationResult(req);
      expect(result).toEqual(batchResult);
    });
  });
});






