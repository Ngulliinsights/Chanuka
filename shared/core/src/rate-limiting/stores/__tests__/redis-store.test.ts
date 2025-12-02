/**
 * Redis Rate Limiting Store Tests
 * 
 * Comprehensive tests for Redis-based rate limiting with Lua script support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../../observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { Redis } from 'ioredis';
import { RedisRateLimitStore } from '../redis-store';
import { MemoryRateLimitStore } from '../memory-store';
import { RateLimitConfig } from '../../types';
// import { logger } from '../observability/logging'; // Unused import

// Mock Redis for testing
const mockRedis = {
  eval: vi.fn(),
  ping: vi.fn(),
  keys: vi.fn(),
  del: vi.fn(),
  pipeline: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  hmget: vi.fn(),
  zcard: vi.fn(),
  status: 'ready',
  options: { host: 'localhost', port: 6379 }
} as unknown as Redis;

describe('RedisRateLimitStore', () => {
  let store: RedisRateLimitStore;
  let fallbackStore: MemoryRateLimitStore;

  beforeEach(() => {
    vi.clearAllMocks();
    fallbackStore = new MemoryRateLimitStore();
    store = new RedisRateLimitStore(mockRedis, {
      keyPrefix: 'test:rl',
      enableMetrics: true,
      fallbackStore
    });
  });

  afterEach(() => {
    fallbackStore.destroy();
  });

  describe('Sliding Window Algorithm', () => {
    const config: RateLimitConfig = {
      limit: 10,
      windowMs: 60000,
      algorithm: 'sliding-window',
      burstAllowance: 0.2
    };

    it('should allow requests within limit', async () => {
      // Mock Redis response: [allowed, remaining, resetTime, totalHits, windowStart]
      (mockRedis.eval as any).mockResolvedValue([1, 9, Date.now() + 60000, 1, Date.now() - 60000]);

      const result = await store.check('user:123', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.algorithm).toBe('sliding-window');
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('ZREMRANGEBYSCORE'),
        1,
        'test:rl:user:123',
        expect.any(Number),
        60000,
        10,
        2 // burst allowance: 10 * 0.2 = 2
      );
    });

    it('should block requests when limit exceeded', async () => {
      const now = Date.now();
      (mockRedis.eval as any).mockResolvedValue([0, 0, now + 60000, 12, now - 60000]);

      const result = await store.check('user:123', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should handle burst allowance correctly', async () => {
      const now = Date.now();
      // 11 requests (within burst limit of 12)
      (mockRedis.eval as any).mockResolvedValue([1, 1, now + 60000, 11, now - 60000]);

      const result = await store.check('user:123', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('Token Bucket Algorithm', () => {
    const config: RateLimitConfig = {
      limit: 10,
      windowMs: 60000,
      algorithm: 'token-bucket',
      burstAllowance: 0.3
    };

    it('should allow requests when tokens available', async () => {
      const now = Date.now();
      // Mock Redis response: [allowed, remaining, resetTime, totalHits, windowStart]
      (mockRedis.eval as any).mockResolvedValue([1, 12, now, 1, now]);

      const result = await store.check('user:456', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(12);
      expect(result.algorithm).toBe('token-bucket');

      // Verify capacity calculation: 10 * (1 + 0.3) = 13
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('HMGET'),
        1,
        'test:rl:user:456',
        expect.any(Number),
        13, // capacity
        expect.any(Number), // refill rate
        1 // tokens requested
      );
    });

    it('should block requests when no tokens available', async () => {
      const now = Date.now();
      (mockRedis.eval as any).mockResolvedValue([0, 0, now + 5000, 13, now]);

      const result = await store.check('user:456', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(5);
    });
  });

  describe('Fixed Window Algorithm', () => {
    const config: RateLimitConfig = {
      limit: 5,
      windowMs: 60000,
      algorithm: 'fixed-window'
    };

    it('should allow requests within window limit', async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;
      (mockRedis.eval as any).mockResolvedValue([1, 4, windowStart + 60000, 1, windowStart]);

      const result = await store.check('user:789', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.algorithm).toBe('fixed-window');
    });

    it('should block requests when window limit exceeded', async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;
      (mockRedis.eval as any).mockResolvedValue([0, 0, windowStart + 60000, 5, windowStart]);

      const result = await store.check('user:789', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to memory store when Redis fails', async () => {
      (mockRedis.eval as any).mockRejectedValue(new Error('Redis connection failed'));

      const config: RateLimitConfig = {
        limit: 5,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      const result = await store.check('user:fallback', config);

      // Should succeed using fallback store
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // Memory store allows and decrements
    });

    it('should fail open when no fallback available', async () => {
      const storeWithoutFallback = new RedisRateLimitStore(mockRedis, {
        keyPrefix: 'test:rl',
        enableMetrics: false
      });

      (mockRedis.eval as any).mockRejectedValue(new Error('Redis connection failed'));

      const config: RateLimitConfig = {
        limit: 5,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      const result = await storeWithoutFallback.check('user:failopen', config);

      // Should fail open (allow request)
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });
  });

  describe('Metrics Collection', () => {
    it('should collect comprehensive metrics', async () => {
      const now = Date.now();
      // Add small delays to simulate processing time
      (mockRedis.eval as any)
        .mockImplementationOnce(() => new Promise(resolve =>
          setTimeout(() => resolve([1, 4, now + 60000, 1, now]), 1)
        ))
        .mockImplementationOnce(() => new Promise(resolve =>
          setTimeout(() => resolve([1, 3, now + 60000, 2, now]), 1)
        ))
        .mockImplementationOnce(() => new Promise(resolve =>
          setTimeout(() => resolve([0, 0, now + 60000, 5, now]), 1)
        ));

      const config: RateLimitConfig = {
        limit: 5,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      await store.check('user:metrics1', config);
      await store.check('user:metrics2', config);
      await store.check('user:metrics3', config);

      const metrics = store.getMetrics();

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.blockedRequests).toBe(1);
      expect(metrics.blockRate).toBeCloseTo(1 / 3);
      expect(metrics.avgProcessingTime).toBeGreaterThan(0);
    });

    it('should reset metrics correctly', async () => {
      const now = Date.now();
      (mockRedis.eval as any).mockResolvedValue([1, 4, now + 60000, 1, now]);

      const config: RateLimitConfig = {
        limit: 5,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      await store.check('user:reset', config);

      let metrics = store.getMetrics();
      expect(metrics.totalRequests).toBe(1);

      store.resetMetrics();

      metrics = store.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.blockedRequests).toBe(0);
      expect(metrics.blockRate).toBe(0);
      expect(metrics.avgProcessingTime).toBe(0);
    });
  });

  describe('Health Check', () => {
    it('should return true when Redis is healthy', async () => {
      (mockRedis.ping as any).mockResolvedValue('PONG');

      const isHealthy = await store.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should return false when Redis is unhealthy', async () => {
      (mockRedis.ping as any).mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await store.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup expired keys', async () => {
      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([])
      };

      (mockRedis.keys as any).mockResolvedValue(['test:rl:user:1', 'test:rl:user:2']);
      (mockRedis.pipeline as any).mockReturnValue(mockPipeline);

      await store.cleanup();

      expect(mockRedis.keys).toHaveBeenCalledWith('test:rl:*');
      expect(mockPipeline.del).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should handle cleanup with custom pattern', async () => {
      (mockRedis.keys as any).mockResolvedValue([]);

      await store.cleanup('custom:pattern:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('custom:pattern:*');
    });
  });

  describe('Administrative Operations', () => {
    it('should manually set rate limit', async () => {
      (mockRedis.set as any).mockResolvedValue('OK');

      await store.setRateLimit('admin:user', 10, 60000);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('test:rl:admin:user'),
        10,
        'PX',
        60000
      );
    });

    it('should get rate limit status for fixed window', async () => {
      (mockRedis.get as any).mockResolvedValue('3');

      const status = await store.getRateLimitStatus('status:user', 'fixed-window');

      expect(status.currentCount).toBe(3);
      expect(status.algorithm).toBe('fixed-window');
      expect(typeof status.windowStart).toBe('number');
    });

    it('should get rate limit status for sliding window', async () => {
      (mockRedis.zcard as any).mockResolvedValue(7);

      const status = await store.getRateLimitStatus('status:user', 'sliding-window');

      expect(status.currentCount).toBe(7);
      expect(status.algorithm).toBe('sliding-window');
    });

    it('should get rate limit status for token bucket', async () => {
      (mockRedis.hmget as any).mockResolvedValue(['5.5', '1234567890']);

      const status = await store.getRateLimitStatus('status:user', 'token-bucket');

      expect(status.currentCount).toBe(5);
      expect(status.algorithm).toBe('token-bucket');
      expect(status.windowStart).toBe(1234567890);
    });
  });

  describe('Connection Info', () => {
    it('should return connection information', () => {
      const info = store.getConnectionInfo();

      expect(info.status).toBe('ready');
      expect(info.host).toBe('localhost');
      expect(info.port).toBe(6379);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported algorithm', async () => {
      const config = {
        limit: 5,
        windowMs: 60000,
        algorithm: 'unsupported' as any
      };

      await expect(store.check('user:error', config)).rejects.toThrow('Unsupported algorithm: unsupported');
    });
  });
});















































