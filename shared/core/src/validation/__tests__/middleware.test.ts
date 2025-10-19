/**
 * Validation Middleware Tests
 *
 * Tests for Express middleware validation functionality
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../types';
import {
  validateRequest,
  ValidationMiddleware,
  validateBatch,
  validateFileUpload,
  validationErrorHandler,
  getValidatedData,
  getBatchValidationResult,
} from '../middleware';

// Mock Express types
const mockRequest = (body?: any, query?: any, params?: any, headers?: any): Partial<Request> => ({
  body,
  query,
  params,
  headers: headers || {},
  path: '/test',
  method: 'POST',
  ip: '127.0.0.1',
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    const userSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
    });

    it('should validate request body successfully', async () => {
      const req = mockRequest({
        name: 'John Doe',
        email: 'john@example.com',
      });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateRequest({ body: userSchema });

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect((req as any).validated.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should return validation error for invalid body', async () => {
      const req = mockRequest({
        name: 'J', // too short
        email: 'invalid-email',
      });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateRequest({ body: userSchema });

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          message: expect.stringContaining('Validation failed'),
          details: expect.any(Array),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate query parameters', async () => {
      const req = mockRequest(undefined, {
        page: '1',
        limit: '10',
      });
      const res = mockResponse();
      const next = mockNext;

      const querySchema = z.object({
        page: z.string().transform(Number),
        limit: z.string().transform(Number),
      });

      const middleware = validateRequest({ query: querySchema });

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect((req as any).validated.query).toEqual({
        page: 1,
        limit: 10,
      });
    });

    it('should skip validation when skipIf returns true', async () => {
      const req = mockRequest({ name: 'John' });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateRequest({
        body: userSchema,
        skipIf: (req) => req.method === 'GET',
      });

      // Simulate GET request
      (req as any).method = 'GET';

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect((req as any).validated).toBeUndefined();
    });
  });

  describe('ValidationMiddleware static methods', () => {
    const userSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
    });

    it('should create body validation middleware', async () => {
      const req = mockRequest({ name: 'John Doe', email: 'john@example.com' });
      const res = mockResponse();
      const next = mockNext;

      const middleware = ValidationMiddleware.body(userSchema);

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should create query validation middleware', async () => {
      const req = mockRequest(undefined, { search: 'test' });
      const res = mockResponse();
      const next = mockNext;

      const querySchema = z.object({
        search: z.string(),
      });

      const middleware = ValidationMiddleware.query(querySchema);

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should create params validation middleware', async () => {
      const req = mockRequest(undefined, undefined, { id: '123' });
      const res = mockResponse();
      const next = mockNext;

      const paramsSchema = z.object({
        id: z.string().regex(/^\d+$/),
      });

      const middleware = ValidationMiddleware.params(paramsSchema);

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateBatch', () => {
    const itemSchema = z.object({
      id: z.number(),
      name: z.string().min(1),
    });

    it('should validate batch data successfully', async () => {
      const batchData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const req = mockRequest(batchData);
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateBatch(itemSchema);

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual(batchData);
      expect((req as any).batchValidation).toBeDefined();
    });

    it('should return batch validation error for invalid items', async () => {
      const batchData = [
        { id: 1, name: 'Valid Item' },
        { id: 'invalid', name: '' }, // invalid
      ];

      const req = mockRequest(batchData);
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateBatch(itemSchema);

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Batch Validation Error',
          message: expect.stringContaining('failed validation'),
          valid: expect.any(Array),
          invalid: expect.any(Array),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject non-array body', async () => {
      const req = mockRequest({ not: 'an array' });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateBatch(itemSchema);

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad Request',
          message: 'Request body must be an array for batch validation',
        })
      );
    });
  });

  describe('validateFileUpload', () => {
    const fileSchema = z.object({
      filename: z.string(),
      mimetype: z.string(),
      size: z.number().max(1024 * 1024), // 1MB
    });

    it('should validate file upload successfully', async () => {
      const req = mockRequest(
        { metadata: 'test' },
        undefined,
        undefined,
        undefined
      );
      (req as any).file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 50000,
      };

      const res = mockResponse();
      const next = mockNext;

      const middleware = validateFileUpload(fileSchema);

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });

    it('should validate multiple files', async () => {
      const req = mockRequest();
      (req as any).files = [
        { originalname: 'file1.jpg', mimetype: 'image/jpeg', size: 50000 },
        { originalname: 'file2.png', mimetype: 'image/png', size: 30000 },
      ];

      const res = mockResponse();
      const next = mockNext;

      const middleware = validateFileUpload(fileSchema);

      await middleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validationErrorHandler', () => {
    it('should handle ValidationError', () => {
      const error = new ValidationError('Test validation error');
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      const middleware = validationErrorHandler();

      middleware(error, req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          message: 'Test validation error',
          details: expect.any(Array),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass through non-validation errors', () => {
      const error = new Error('Regular error');
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      const middleware = validationErrorHandler();

      middleware(error, req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Utility functions', () => {
    it('should extract validated data', () => {
      const req = mockRequest();
      (req as any).validated = {
        body: { name: 'John' },
        query: { page: 1 },
      };

      const result = getValidatedData(req as Request);

      expect(result).toEqual({
        body: { name: 'John' },
        query: { page: 1 },
      });
    });

    it('should extract batch validation result', () => {
      const req = mockRequest();
      const batchResult = {
        valid: [{ id: 1 }],
        invalid: [],
        totalCount: 1,
        validCount: 1,
        invalidCount: 0,
      };
      (req as any).batchValidation = batchResult;

      const result = getBatchValidationResult(req as Request);

      expect(result).toEqual(batchResult);
    });
  });
});





































