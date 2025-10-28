import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createExpressRateLimitMiddleware, createApiRateLimitMiddleware, createAuthRateLimitMiddleware, createSearchRateLimitMiddleware } from '../middleware/express-middleware';
import { MemoryRateLimitStore } from '../stores/memory-store';
import { ok, err } from '../../primitives/types/result';

// Mock the logger
vi.mock('../../logging/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the metrics collector
vi.mock('../metrics', () => ({
  getMetricsCollector: vi.fn(() => ({
    recordEvent: vi.fn(),
    recordError: vi.fn(),
  })),
}));

describe('Express Rate Limit Middleware', () => {
  let store: MemoryRateLimitStore;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
    vi.useFakeTimers();

    mockReq = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      ip: '127.0.0.1',
      headers: {},
      get: vi.fn((header: string) => mockReq.headers[header.toLowerCase()]),
    };

    mockRes = {
      statusCode: 200,
      headersSent: false,
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    store.destroy();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic Middleware Functionality', () => {
    it('should allow requests within limits', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 5,
      });

      // Make 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        await middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(i + 1);
        expect(mockRes.status).not.toHaveBeenCalled();
        vi.clearAllMocks();
      }
    });

    it('should block requests exceeding limits', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 2,
      });

      // Make requests up to the limit
      for (let i = 0; i < 2; i++) {
        await middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(i + 1);
        vi.clearAllMocks();
      }

      // Next request should be blocked
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
      }));
    });

    it('should set rate limit headers', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: true,
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'RateLimit-Limit': '10',
        'RateLimit-Remaining': '9',
        'RateLimit-Reset': expect.any(String),
      });

      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9',
        'X-RateLimit-Reset': expect.any(String),
        'X-RateLimit-Window': '60000',
      });
    });

    it('should set Retry-After header when blocked', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 1,
      });

      // First request - allowed
      await middleware(mockReq, mockRes, mockNext);
      vi.clearAllMocks();

      // Second request - blocked
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.set).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });
  });

  describe('Key Generation', () => {
    it('should use default key generator for IP-based limiting', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 5,
      });

      await middleware(mockReq, mockRes, mockNext);

      // Verify the key was generated correctly
      const storedData = await store.get('ip:127.0.0.1');
      expect(storedData.unwrap()).not.toBe(null);
    });

    it('should use custom key generator', async () => {
      const customKeyGen = vi.fn((req) => `custom:${req.ip}`);
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 5,
        keyGenerator: customKeyGen,
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(customKeyGen).toHaveBeenCalledWith(mockReq);
      const storedData = await store.get('custom:127.0.0.1');
      expect(storedData.unwrap()).not.toBe(null);
    });

    it('should use user ID when available', async () => {
      mockReq.user = { id: 'user123' };
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 5,
      });

      await middleware(mockReq, mockRes, mockNext);

      const storedData = await store.get('user:user123');
      expect(storedData.unwrap()).not.toBe(null);
    });
  });

  describe('Skip Conditions', () => {
    it('should skip rate limiting when skip function returns true', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 1,
        skip: () => true,
      });

      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should not skip when skip function returns false', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 1,
        skip: () => false,
      });

      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      // Should have stored data
      const storedData = await store.get('ip:127.0.0.1');
      expect(storedData.unwrap()).not.toBe(null);
    });

    it('should skip successful requests when configured', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 1,
        skipSuccessfulRequests: true,
      });

      // Simulate successful response (status < 400)
      mockRes.statusCode = 200;

      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      // Should not have stored data
      const storedData = await store.get('ip:127.0.0.1');
      expect(storedData.unwrap()).toBe(null);
    });

    it('should skip failed requests when configured', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 1,
        skipFailedRequests: true,
      });

      // Simulate failed response (status >= 400)
      mockRes.statusCode = 404;

      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      // Should not have stored data
      const storedData = await store.get('ip:127.0.0.1');
      expect(storedData.unwrap()).toBe(null);
    });
  });

  describe('Error Handling', () => {
    it('should fail open on store errors', async () => {
      // Mock store to throw error
      const mockStore = {
        get: vi.fn().mockRejectedValue(new Error('Store error')),
        set: vi.fn().mockRejectedValue(new Error('Store error')),
      };

      const middleware = createExpressRateLimitMiddleware({
        store: mockStore as any,
        windowMs: 60000,
        max: 5,
      });

      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle custom onLimitReached callback', async () => {
      const onLimitReached = vi.fn();
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 1,
        onLimitReached,
      });

      // First request - allowed
      await middleware(mockReq, mockRes, mockNext);
      expect(onLimitReached).not.toHaveBeenCalled();
      vi.clearAllMocks();

      // Second request - blocked
      await middleware(mockReq, mockRes, mockNext);
      expect(onLimitReached).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });

  describe('Window Management', () => {
    it('should reset limits after window expires', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 1000, // 1 second window
        max: 1,
      });

      // First request - allowed
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      vi.clearAllMocks();

      // Second request - blocked
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      vi.clearAllMocks();

      // Advance time past window
      vi.advanceTimersByTime(1001);

      // Third request - should be allowed again
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Pre-configured Middleware Factories', () => {
    describe('API Rate Limit Middleware', () => {
      it('should create middleware with API defaults', async () => {
        const middleware = createApiRateLimitMiddleware(store);

        await middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();

        // Check that it uses 15 minute window and 100 requests
        const storedData = await store.get('ip:127.0.0.1');
        expect(storedData.unwrap()).not.toBe(null);
      });
    });

    describe('Auth Rate Limit Middleware', () => {
      it('should create middleware with strict auth limits', async () => {
        const middleware = createAuthRateLimitMiddleware(store);

        // Should allow only 5 requests in 15 minutes
        for (let i = 0; i < 5; i++) {
          await middleware(mockReq, mockRes, mockNext);
          expect(mockNext).toHaveBeenCalledTimes(i + 1);
          vi.clearAllMocks();
        }

        // Sixth request should be blocked
        await middleware(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(429);
      });
    });

    describe('Search Rate Limit Middleware', () => {
      it('should create middleware with search-specific limits', async () => {
        const middleware = createSearchRateLimitMiddleware(store);

        await middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();

        // Should use 5 minute window and 50 requests
        const storedData = await store.get('ip:127.0.0.1');
        expect(storedData.unwrap()).not.toBe(null);
      });
    });
  });

  describe('Observability Integration', () => {
    it('should record metrics for allowed requests', async () => {
      const { getMetricsCollector } = await import('../metrics');
      const mockMetrics = getMetricsCollector();

      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 5,
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockMetrics.recordEvent).toHaveBeenCalledWith({
        allowed: true,
        key: 'ip:127.0.0.1',
        algorithm: 'express-middleware',
        remaining: 4,
        processingTime: expect.any(Number),
        ip: '127.0.0.1',
        userAgent: undefined,
        path: '/api/test',
        method: 'GET',
      });
    });

    it('should record metrics for blocked requests', async () => {
      const { getMetricsCollector } = await import('../metrics');
      const mockMetrics = getMetricsCollector();

      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 1,
      });

      // First request - allowed
      await middleware(mockReq, mockRes, mockNext);
      vi.clearAllMocks();

      // Second request - blocked
      await middleware(mockReq, mockRes, mockNext);

      expect(mockMetrics.recordEvent).toHaveBeenCalledWith({
        allowed: false,
        key: 'ip:127.0.0.1',
        algorithm: 'express-middleware',
        remaining: 0,
        processingTime: expect.any(Number),
        ip: '127.0.0.1',
        userAgent: undefined,
        path: '/api/test',
        method: 'GET',
      });
    });

    it('should record error metrics on failures', async () => {
      const { getMetricsCollector } = await import('../metrics');
      const mockMetrics = getMetricsCollector();

      const mockStore = {
        get: vi.fn().mockRejectedValue(new Error('Store error')),
        set: vi.fn().mockRejectedValue(new Error('Store error')),
      };

      const middleware = createExpressRateLimitMiddleware({
        store: mockStore as any,
        windowMs: 60000,
        max: 5,
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockMetrics.recordError).toHaveBeenCalledWith('Store error');
    });
  });

  describe('Header Configuration', () => {
    it('should include standard headers when enabled', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'RateLimit-Limit': '10',
        'RateLimit-Remaining': '9',
        'RateLimit-Reset': expect.any(String),
      });

      // Should not include legacy headers
      expect(mockRes.set).not.toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': expect.any(String),
        })
      );
    });

    it('should include legacy headers when enabled', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 10,
        standardHeaders: false,
        legacyHeaders: true,
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9',
        'X-RateLimit-Reset': expect.any(String),
        'X-RateLimit-Window': '60000',
      });

      // Should not include standard headers
      expect(mockRes.set).not.toHaveBeenCalledWith(
        expect.objectContaining({
          'RateLimit-Limit': expect.any(String),
        })
      );
    });

    it('should support both header types', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: true,
      });

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'RateLimit-Limit': '10',
        'RateLimit-Remaining': '9',
        'RateLimit-Reset': expect.any(String),
      });

      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9',
        'X-RateLimit-Reset': expect.any(String),
        'X-RateLimit-Window': '60000',
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle high request volumes efficiently', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 100,
      });

      const startTime = Date.now();
      const promises = Array.from({ length: 50 }, () =>
        middleware({ ...mockReq }, { ...mockRes, set: vi.fn() }, mockNext)
      );

      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should maintain performance under load', async () => {
      const middleware = createExpressRateLimitMiddleware({
        store,
        windowMs: 60000,
        max: 10,
      });

      // Simulate concurrent requests
      const concurrentRequests = 20;
      const promises = Array.from({ length: concurrentRequests }, (_, i) => {
        const req = { ...mockReq, ip: `192.168.1.${i}` };
        const res = { ...mockRes, set: vi.fn() };
        const next = vi.fn();
        return middleware(req, res, next);
      });

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});

