/**
 * Single Flight Cache Tests
 */

import { MemoryAdapter } from '../adapters/memory-adapter';
import { SingleFlightCache } from '../patterns/single-flight-cache';

describe('SingleFlightCache', () => {
  let baseAdapter: MemoryAdapter;
  let cache: SingleFlightCache;

  beforeEach(() => {
    baseAdapter = new MemoryAdapter({
      provider: 'memory',
      maxMemoryMB: 10,
      enableMetrics: true,
      keyPrefix: 'test',
      defaultTtlSec: 300,
      enableCompression: false,
      compressionThreshold: 1024,
    });

    cache = new SingleFlightCache(baseAdapter, {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 1000,
    });
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe('Basic Operations', () => {
    it('should delegate to base adapter', async () => {
      await cache.set('test-key', 'test-value');
      const result = await cache.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should handle single-flight requests', async () => {
      let callCount = 0;

      // Mock a slow operation
      const slowOperation = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return `result-${callCount}`;
      };

      // Start multiple concurrent requests
      const promises = [
        cache.get('slow-key').then(() => slowOperation()),
        cache.get('slow-key').then(() => slowOperation()),
        cache.get('slow-key').then(() => slowOperation()),
      ];

      const results = await Promise.all(promises);

      // All should get the same result
      expect(results).toEqual(['result-1', 'result-1', 'result-1']);
      expect(callCount).toBe(1); // Only called once due to single-flight
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after failures', async () => {
      // Mock failing operation
      const failingAdapter = {
        ...baseAdapter,
        get: jest.fn().mockRejectedValue(new Error('Service unavailable')),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
      };

      const failingCache = new SingleFlightCache(failingAdapter, {
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
        circuitBreakerTimeout: 100,
      });

      // Trigger failures
      await expect(failingCache.get('test')).rejects.toThrow();
      await expect(failingCache.get('test')).rejects.toThrow();

      // Circuit should be open, return fallback
      const result = await failingCache.get('test');
      expect(result).toBeNull(); // Fallback value
    });

    it('should close circuit breaker after timeout', async () => {
      const failingAdapter = {
        ...baseAdapter,
        get: jest.fn().mockRejectedValue(new Error('Service unavailable')),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
      };

      const failingCache = new SingleFlightCache(failingAdapter, {
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
        circuitBreakerTimeout: 100,
      });

      // Trigger failures to open circuit
      await expect(failingCache.get('test')).rejects.toThrow();
      await expect(failingCache.get('test')).rejects.toThrow();

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Mock successful operation
      failingAdapter.get.mockResolvedValue('success');

      // Should try again and succeed
      const result = await failingCache.get('test');
      expect(result).toBe('success');
    });
  });

  describe('Graceful Degradation', () => {
    it('should return fallback values when enabled', async () => {
      const degradingCache = new SingleFlightCache(baseAdapter, {
        enableGracefulDegradation: true,
        fallbackOptions: {
          enableFallback: true,
          fallbackValue: 'fallback',
          fallbackTtl: 60,
        },
      });

      // Store a fallback value
      await degradingCache.set('fallback-key', 'stored-value');
      await degradingCache.get('fallback-key'); // This creates a fallback entry

      // Mock failure
      const failingAdapter = {
        ...baseAdapter,
        get: jest.fn().mockRejectedValue(new Error('Service down')),
      };

      const failingCache = new SingleFlightCache(failingAdapter, {
        enableGracefulDegradation: true,
        fallbackOptions: {
          enableFallback: true,
          fallbackValue: 'default-fallback',
          fallbackTtl: 60,
        },
      });

      // Should return fallback value
      const result = await failingCache.get('fallback-key');
      expect(result).toBe('stored-value');
    });
  });

  describe('Batch Operations', () => {
    it('should handle mget with single-flight', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const results = await cache.mget(['key1', 'key2', 'key3']);
      expect(results).toEqual(['value1', 'value2', null]);
    });

    it('should handle mset operations', async () => {
      await cache.mset([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
    });
  });

  describe('Health Monitoring', () => {
    it('should provide health status', async () => {
      const health = await cache.getHealth();
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('latency');
      expect(health).toHaveProperty('stats');
      expect(health).toHaveProperty('circuitBreakers');
    });

    it('should track circuit breaker states', () => {
      const states = cache.getAllCircuitBreakerStates();
      expect(states).toBeInstanceOf(Map);
    });
  });

  describe('Circuit Breaker Management', () => {
    it('should allow manual circuit breaker reset', () => {
      cache.resetCircuitBreaker('test-key');
      const state = cache.getCircuitBreakerState('test-key');
      expect(state).toBeNull();
    });

    it('should allow resetting all circuit breakers', () => {
      cache.resetAllCircuitBreakers();
      const states = cache.getAllCircuitBreakerStates();
      expect(states.size).toBe(0);
    });
  });

  describe('Degradation Status', () => {
    it('should provide degradation status', () => {
      const status = cache.getDegradationStatus();
      expect(status).toHaveProperty('degradationMode');
      expect(status).toHaveProperty('fallbackCacheSize');
      expect(status).toHaveProperty('circuitBreakerCount');
      expect(status).toHaveProperty('openCircuitBreakers');
    });

    it('should allow setting degradation mode', () => {
      cache.setDegradationMode(true);
      const status = cache.getDegradationStatus();
      expect(status.degradationMode).toBe(true);
    });
  });

  describe('Circuit Breaker Statistics', () => {
    it('should provide circuit breaker statistics', () => {
      const stats = cache.getCircuitBreakerStats();
      expect(stats).toHaveProperty('totalCircuitBreakers');
      expect(stats).toHaveProperty('openCircuitBreakers');
      expect(stats).toHaveProperty('halfOpenCircuitBreakers');
      expect(stats).toHaveProperty('closedCircuitBreakers');
      expect(stats).toHaveProperty('avgResponseTime');
      expect(stats).toHaveProperty('slowCallRate');
    });
  });
});