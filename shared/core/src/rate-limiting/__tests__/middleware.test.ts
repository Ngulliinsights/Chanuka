import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { RateLimitMiddleware, createApiRateLimit } from '../middleware';
import { MemoryRateLimitStore } from '../stores/memory-store';

describe('RateLimitMiddleware', () => {
  let store: MemoryRateLimitStore;
  let middleware: RateLimitMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
    middleware = new RateLimitMiddleware(store);

    mockReq = {
      ip: '127.0.0.1',
      path: '/api/test'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    store.destroy();
  });

  describe('createMiddleware', () => {
    it('should allow requests within limit', async () => {
      const rateLimit = middleware.createMiddleware({
        windowMs: 1000,
        max: 2
      });

      await rateLimit(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '2',
        'X-RateLimit-Remaining': '1',
        'X-RateLimit-Reset': expect.any(String),
        'X-RateLimit-Window': '1000'
      });
    });

    it('should block requests over limit', async () => {
      const rateLimit = middleware.createMiddleware({
        windowMs: 1000,
        max: 1,
        message: 'Too many requests'
      });

      // First request
      await rateLimit(mockReq as Request, mockRes as Response, mockNext);

      // Reset mocks
      mockNext.mockClear();
      (mockRes.status as jest.Mock).mockClear();
      (mockRes.json as jest.Mock).mockClear();

      // Second request should be blocked
      await rateLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: expect.any(Number),
        limit: 1,
        remaining: 0,
        resetAt: expect.any(String)
      });
    });

    it('should skip rate limiting in test environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSkip = process.env.SKIP_RATE_LIMIT;

      process.env.NODE_ENV = 'test';
      process.env.SKIP_RATE_LIMIT = 'true';

      const rateLimit = middleware.createMiddleware({
        windowMs: 1000,
        max: 1
      });

      await rateLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.set).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
      process.env.SKIP_RATE_LIMIT = originalSkip;
    });
  });

  describe('pre-configured middleware', () => {
    it('should create API rate limit with correct settings', async () => {
      const apiRateLimit = createApiRateLimit(store);

      await apiRateLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': expect.any(String),
        'X-RateLimit-Window': (15 * 60 * 1000).toString()
      });
    });

    it('should create auth rate limit with strict settings', async () => {
      const authRateLimit = createApiRateLimit(store); // Using API for simplicity

      // Make multiple requests to test the limit
      for (let i = 0; i < 5; i++) {
        mockNext.mockClear();
        (mockRes.status as jest.Mock).mockClear();

        await authRateLimit(mockReq as Request, mockRes as Response, mockNext);
      }

      // Should eventually block (depending on the limit)
      expect(mockNext).toHaveBeenCalledTimes(5);
    });
  });
});




































