import { cache } from '../cache';

// Mock logger to avoid console output during tests
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Cache Utility', () => {
  beforeEach(() => {
    // Clear cache and reset metrics before each test
    cache.clear();
    cache.resetMetrics();
  });

  describe('getOrSetCache', () => {
    it('should return cached value on cache hit', async () => {
      const key = 'test-key';
      const ttl = 300; // 5 minutes
      const expectedValue = { data: 'cached-value' };

      // First call - should compute and cache
      const computeFn = jest.fn().mockResolvedValue(expectedValue);
      const result1 = await cache.getOrSetCache(key, ttl, computeFn);

      expect(result1).toEqual(expectedValue);
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Second call - should return cached value
      const result2 = await cache.getOrSetCache(key, ttl, computeFn);

      expect(result2).toEqual(expectedValue);
      expect(computeFn).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should compute value on cache miss', async () => {
      const key = 'test-key';
      const ttl = 300;
      const expectedValue = { data: 'computed-value' };

      const computeFn = jest.fn().mockResolvedValue(expectedValue);
      const result = await cache.getOrSetCache(key, ttl, computeFn);

      expect(result).toEqual(expectedValue);
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('should handle cache get failure gracefully', async () => {
      const key = 'test-key';
      const ttl = 300;
      const expectedValue = { data: 'fallback-value' };

      // Mock cache store to throw on get
      const originalGet = Map.prototype.get;
      Map.prototype.get = jest.fn().mockImplementation(() => {
        throw new Error('Cache get failed');
      });

      const computeFn = jest.fn().mockResolvedValue(expectedValue);
      const result = await cache.getOrSetCache(key, ttl, computeFn);

      expect(result).toEqual(expectedValue);
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Restore original method
      Map.prototype.get = originalGet;
    });

    it('should handle cache set failure gracefully', async () => {
      const key = 'test-key';
      const ttl = 300;
      const expectedValue = { data: 'computed-value' };

      // Mock cache store to throw on set
      const originalSet = Map.prototype.set;
      Map.prototype.set = jest.fn().mockImplementation(() => {
        throw new Error('Cache set failed');
      });

      const computeFn = jest.fn().mockResolvedValue(expectedValue);
      const result = await cache.getOrSetCache(key, ttl, computeFn);

      expect(result).toEqual(expectedValue);
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Restore original method
      Map.prototype.set = originalSet;
    });

    it('should respect TTL expiration', async () => {
      const key = 'test-key';
      const ttl = 1; // 1 second
      const value1 = { data: 'first-value' };
      const value2 = { data: 'second-value' };

      // First call
      const computeFn1 = jest.fn().mockResolvedValue(value1);
      await cache.getOrSetCache(key, ttl, computeFn1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second call should recompute
      const computeFn2 = jest.fn().mockResolvedValue(value2);
      const result = await cache.getOrSetCache(key, ttl, computeFn2);

      expect(result).toEqual(value2);
      expect(computeFn1).toHaveBeenCalledTimes(1);
      expect(computeFn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track cache hits and misses', async () => {
      const key = 'metrics-test';
      const ttl = 300;
      const expectedValue = { data: 'test' };

      // Initial metrics should be zero
      let metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);

      // First call - miss
      const computeFn = jest.fn().mockResolvedValue(expectedValue);
      await cache.getOrSetCache(key, ttl, computeFn);

      metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(1);
      expect(metrics.sets).toBe(1);

      // Second call - hit
      await cache.getOrSetCache(key, ttl, computeFn);

      metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.sets).toBe(1);
    });

    it('should track cache errors', async () => {
      const key = 'error-test';
      const ttl = 300;
      const expectedValue = { data: 'test' };

      // Mock cache get to fail
      const originalGet = Map.prototype.get;
      Map.prototype.get = jest.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });

      const computeFn = jest.fn().mockResolvedValue(expectedValue);
      await cache.getOrSetCache(key, ttl, computeFn);

      const metrics = cache.getMetrics();
      expect(metrics.errors).toBe(1);

      // Restore original method
      Map.prototype.get = originalGet;
    });

    it('should reset metrics correctly', async () => {
      const key = 'reset-test';
      const ttl = 300;
      const expectedValue = { data: 'test' };

      // Generate some metrics
      const computeFn = jest.fn().mockResolvedValue(expectedValue);
      await cache.getOrSetCache(key, ttl, computeFn);
      await cache.getOrSetCache(key, ttl, computeFn);

      let metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);

      // Reset metrics
      cache.resetMetrics();

      metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.sets).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate cache entries', async () => {
      const key = 'invalidate-test';
      const ttl = 300;
      const expectedValue = { data: 'test' };

      // Set a value in cache
      const computeFn = jest.fn().mockResolvedValue(expectedValue);
      await cache.getOrSetCache(key, ttl, computeFn);

      expect(cache.has(key)).toBe(true);

      const result = cache.invalidate(key);
      expect(result).toBe(true);
      expect(cache.has(key)).toBe(false);
    });

    it('should return false when invalidating non-existent key', () => {
      const result = cache.invalidate('non-existent-key');
      expect(result).toBe(false);
    });

    it('should clear all cache entries', async () => {
      const ttl = 300;

      // Add entries to cache
      await cache.getOrSetCache('key1', ttl, async () => 'test1');
      await cache.getOrSetCache('key2', ttl, async () => 'test2');

      expect(cache.size()).toBe(2);

      const clearedCount = cache.clear();
      expect(clearedCount).toBe(2);
      expect(cache.size()).toBe(0);
    });

    it('should report correct cache size', async () => {
      const ttl = 300;

      expect(cache.size()).toBe(0);

      await cache.getOrSetCache('key1', ttl, async () => 'test1');
      expect(cache.size()).toBe(1);

      await cache.getOrSetCache('key2', ttl, async () => 'test2');
      expect(cache.size()).toBe(2);
    });

    it('should check if key exists', async () => {
      const ttl = 300;

      expect(cache.has('non-existent')).toBe(false);

      await cache.getOrSetCache('existing-key', ttl, async () => 'test');
      expect(cache.has('existing-key')).toBe(true);
    });
  });

  describe('TTL Parameter Validation', () => {
    it('should use TTL parameter correctly', async () => {
      const key = 'ttl-test';
      const ttl = 2; // 2 seconds
      const expectedValue = { data: 'ttl-test' };

      // Set with TTL
      const computeFn = jest.fn().mockResolvedValue(expectedValue);
      await cache.getOrSetCache(key, ttl, computeFn);

      // Should be cached immediately
      const result1 = await cache.getOrSetCache(key, ttl, computeFn);
      expect(result1).toEqual(expectedValue);
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Should recompute after TTL expires
      const result2 = await cache.getOrSetCache(key, ttl, computeFn);
      expect(result2).toEqual(expectedValue);
      expect(computeFn).toHaveBeenCalledTimes(2);
    });
  });
});