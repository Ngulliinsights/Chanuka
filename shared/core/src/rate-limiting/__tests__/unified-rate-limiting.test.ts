/**
 * Comprehensive tests for the unified rate limiting system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryAdapter } from '../adapters/memory-adapter';
import { UnifiedRateLimitService } from '../core/service';
import { createExpressRateLimitMiddleware } from '../middleware/express-middleware';
import { resetMetricsCollector } from '../metrics';

describe('Unified Rate Limiting System', () => {
  let store: any;
  let service: UnifiedRateLimitService;

  beforeEach(() => {
    store = createMemoryAdapter();
    service = UnifiedRateLimitService.getInstance(store);
    resetMetricsCollector();
  });

  afterEach(() => {
    resetMetricsCollector();
  });

  describe('Core Service', () => {
    it('should allow requests within limits', async () => {
      const config = {
        limit: 5,
        windowMs: 60000,
        algorithm: 'fixed-window' as const
      };

      for (let i = 0; i < 5; i++) {
        const result = await service.checkRateLimit('test-key', config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests over limits', async () => {
      const config = {
        limit: 2,
        windowMs: 60000,
        algorithm: 'fixed-window' as const
      };

      // Use up the limit
      for (let i = 0; i < 2; i++) {
        const result = await service.checkRateLimit('test-key', config);
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const result = await service.checkRateLimit('test-key', config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should reset limits after window expires', async () => {
      const config = {
        limit: 2,
        windowMs: 100, // Very short window for testing
        algorithm: 'fixed-window' as const
      };

      // Use up the limit
      for (let i = 0; i < 2; i++) {
        const result = await service.checkRateLimit('test-key', config);
        expect(result.allowed).toBe(true);
      }

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow again
      const result = await service.checkRateLimit('test-key', config);
      expect(result.allowed).toBe(true);
    });

    it('should isolate different keys', async () => {
      const config = {
        limit: 2,
        windowMs: 60000,
        algorithm: 'fixed-window' as const
      };

      // Use up limit for key1
      for (let i = 0; i < 2; i++) {
        const result = await service.checkRateLimit('key1', config);
        expect(result.allowed).toBe(true);
      }

      // key2 should still work
      const result = await service.checkRateLimit('key2', config);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Express Middleware', () => {
    it('should set correct headers for allowed requests', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        limit: 10,
        windowMs: 60000,
        algorithm: 'fixed-window'
      });

      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        method: 'GET'
      };

      const mockRes = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const mockNext = vi.fn();

      await middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'RateLimit-Limit': '10',
        'RateLimit-Remaining': '9',
        'RateLimit-Reset': expect.any(String),
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9',
        'X-RateLimit-Reset': expect.any(String),
        'X-RateLimit-Window': '60000'
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block requests over limit', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        limit: 1,
        windowMs: 60000,
        algorithm: 'fixed-window'
      });

      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        method: 'GET'
      };

      const mockRes = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const mockNext = vi.fn();

      // First request - allowed
      await middleware(mockReq as any, mockRes as any, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Reset mocks
      mockNext.mockClear();
      mockRes.status.mockClear();
      mockRes.json.mockClear();

      // Second request - blocked
      await middleware(mockReq as any, mockRes as any, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: expect.any(Number),
        limit: 1,
        remaining: 0,
        resetAt: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should skip rate limiting when configured', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        limit: 1,
        windowMs: 60000,
        algorithm: 'fixed-window',
        skip: () => true
      });

      const mockReq = {
        ip: '127.0.0.1',
        path: '/test',
        method: 'GET'
      };

      const mockRes = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      const mockNext = vi.fn();

      await middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.set).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Different Algorithms', () => {
    it('should work with sliding window algorithm', async () => {
      const config = {
        limit: 3,
        windowMs: 60000,
        algorithm: 'sliding-window' as const
      };

      for (let i = 0; i < 3; i++) {
        const result = await service.checkRateLimit('sliding-test', config);
        expect(result.allowed).toBe(true);
        expect(result.algorithm).toBe('sliding-window');
      }

      const result = await service.checkRateLimit('sliding-test', config);
      expect(result.allowed).toBe(false);
    });

    it('should work with token bucket algorithm', async () => {
      const config = {
        limit: 5,
        windowMs: 60000,
        algorithm: 'token-bucket' as const,
        burstAllowance: 0.2
      };

      for (let i = 0; i < 6; i++) { // 5 + 1 burst
        const result = await service.checkRateLimit('token-test', config);
        expect(result.allowed).toBe(true);
        expect(result.algorithm).toBe('token-bucket');
      }

      const result = await service.checkRateLimit('token-test', config);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Health Checks', () => {
    it('should report healthy status', async () => {
      const isHealthy = await service.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });
});




































