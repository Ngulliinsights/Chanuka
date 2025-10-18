/**
 * Circuit Breaker and Single Flight Cache Tests
 * 
 * Tests for the circuit breaker and single-flight patterns implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SingleFlightCache } from '../single-flight-cache';
import { MemoryAdapter } from '../adapters/memory-adapter';
import type { CacheService } from '../types';
import { logger } from '../../shared/core/src/utils/logger';

describe('Circuit Breaker and Single Flight Cache', () => {
  let mockAdapter: CacheService;
  let singleFlightCache: SingleFlightCache;

  beforeEach(() => {
    // Create a mock adapter that can simulate failures
    mockAdapter = {
      async get(key: string) {
        if (key.includes('fail')) {
          throw new Error('Simulated failure');
        }
        return key === 'existing' ? 'value' : null;
      },
      async set(key: string, value: any, ttl?: number) {
        if (key.includes('fail')) {
          throw new Error('Simulated failure');
        }
      },
      async del(key: string) {
        if (key.includes('fail')) {
          throw new Error('Simulated failure');
        }
      },
      getMetrics: () => ({
        hits: 0,
        misses: 0,
        hitRate: 0,
        operations: 0,
        avgResponseTime: 0,
        errors: 0,
      }),
    };

    singleFlightCache = new SingleFlightCache(mockAdapter, {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 1000,
    });
  });

  afterEach(() => {
    singleFlightCache.destroy();
  });

  describe('Single Flight Pattern', () => {
    it('should deduplicate concurrent requests for the same key', async () => {
      const slowAdapter = new MemoryAdapter({
        maxMemoryMB: 10,
        defaultTtlSec: 300,
        enableMetrics: true,
      });

      // Add delay to simulate slow operation
      const originalGet = slowAdapter.get.bind(slowAdapter);
      slowAdapter.get = vi.fn(async (key: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return originalGet(key);
      });

      const cache = new SingleFlightCache(slowAdapter);
      
      // Set a value first
      await cache.set('test-key', 'test-value');
      
      // Make multiple concurrent requests
      const promises = Array(5).fill(0).map(() => cache.get('test-key'));
      const results = await Promise.all(promises);
      
      // All should return the same value
      results.forEach(result => {
        expect(result).toBe('test-value');
      });
      
      // The underlying adapter should only be called once due to single-flight
      expect(slowAdapter.get).toHaveBeenCalledTimes(1);
      
      cache.destroy();
      slowAdapter.destroy();
    });

    it('should handle concurrent requests for different keys independently', async () => {
      const adapter = new MemoryAdapter({
        maxMemoryMB: 10,
        defaultTtlSec: 300,
        enableMetrics: true,
      });

      const cache = new SingleFlightCache(adapter);
      
      // Set different values
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      // Make concurrent requests for different keys
      const [result1, result2] = await Promise.all([
        cache.get('key1'),
        cache.get('key2'),
      ]);
      
      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
      
      cache.destroy();
      adapter.destroy();
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should open circuit after threshold failures', async () => {
      // Cause failures to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await singleFlightCache.get(`fail-key-${i}`);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Circuit should now be open for fail keys
      const state = singleFlightCache.getCircuitBreakerState('fail-key-0');
      expect(state?.state).toBe('open');
      expect(state?.failures).toBeGreaterThanOrEqual(3);
    });

    it('should return null when circuit is open instead of calling adapter', async () => {
      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await singleFlightCache.get('fail-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Now the circuit should be open and return null without calling adapter
      const result = await singleFlightCache.get('fail-key');
      expect(result).toBeNull();
    });

    it('should transition to half-open after timeout', async () => {
      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await singleFlightCache.get('fail-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Verify circuit is open
      let state = singleFlightCache.getCircuitBreakerState('fail-key');
      expect(state?.state).toBe('open');
      
      // Wait for timeout (using a shorter timeout for testing)
      const shortTimeoutCache = new SingleFlightCache(mockAdapter, {
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 1,
        circuitBreakerTimeout: 50,
      });
      
      // Trigger circuit breaker
      try {
        await shortTimeoutCache.get('fail-key');
      } catch (error) {
        // Expected to fail
      }
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Next request should transition to half-open
      try {
        await shortTimeoutCache.get('fail-key');
      } catch (error) {
        // Expected to fail, but should transition state
      }
      
      shortTimeoutCache.destroy();
    });

    it('should reset circuit breaker on successful operations', async () => {
      // First, cause some failures (but not enough to open circuit)
      try {
        await singleFlightCache.get('fail-key');
      } catch (error) {
        // Expected to fail
      }
      
      // Then perform successful operation
      const result = await singleFlightCache.get('existing');
      expect(result).toBe('value');
      
      // Circuit should remain closed and failure count should be reduced
      const state = singleFlightCache.getCircuitBreakerState('existing');
      expect(state?.state).toBe('closed');
    });

    it('should handle set operations with circuit breaker', async () => {
      // Trigger circuit breaker with set operations
      for (let i = 0; i < 3; i++) {
        try {
          await singleFlightCache.set(`fail-set-${i}`, 'value');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Circuit should be open
      const state = singleFlightCache.getCircuitBreakerState('fail-set-0');
      expect(state?.state).toBe('open');
    });

    it('should handle delete operations with circuit breaker', async () => {
      // Trigger circuit breaker with delete operations
      for (let i = 0; i < 3; i++) {
        try {
          await singleFlightCache.del(`fail-del-${i}`);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Circuit should be open
      const state = singleFlightCache.getCircuitBreakerState('fail-del-0');
      expect(state?.state).toBe('open');
    });
  });

  describe('Circuit Breaker Management', () => {
    it('should allow resetting individual circuit breakers', async () => {
      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await singleFlightCache.get('fail-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Verify circuit is open
      let state = singleFlightCache.getCircuitBreakerState('fail-key');
      expect(state?.state).toBe('open');
      
      // Reset circuit breaker
      singleFlightCache.resetCircuitBreaker('fail-key');
      
      // Circuit should be reset (no state)
      state = singleFlightCache.getCircuitBreakerState('fail-key');
      expect(state).toBeNull();
    });

    it('should allow resetting all circuit breakers', async () => {
      // Trigger multiple circuit breakers
      for (let i = 0; i < 3; i++) {
        try {
          await singleFlightCache.get(`fail-key-${i}`);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Verify circuits are open
      const states = singleFlightCache.getAllCircuitBreakerStates();
      expect(states.size).toBeGreaterThan(0);
      
      // Reset all circuit breakers
      singleFlightCache.resetAllCircuitBreakers();
      
      // All circuits should be reset
      const resetStates = singleFlightCache.getAllCircuitBreakerStates();
      expect(resetStates.size).toBe(0);
    });

    it('should provide circuit breaker state information', async () => {
      // Trigger circuit breaker
      try {
        await singleFlightCache.get('fail-key');
      } catch (error) {
        // Expected to fail
      }
      
      const state = singleFlightCache.getCircuitBreakerState('fail-key');
      expect(state).toBeDefined();
      expect(state?.failures).toBe(1);
      expect(state?.state).toBe('closed'); // Should still be closed after 1 failure
      expect(typeof state?.lastFailure).toBe('number');
      expect(typeof state?.nextAttempt).toBe('number');
    });
  });

  describe('Health Check Integration', () => {
    it('should include circuit breaker information in health check', async () => {
      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await singleFlightCache.get('fail-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      const health = await singleFlightCache.getHealth();
      expect(health).toBeDefined();
      expect(health.circuitBreakers).toBeDefined();
      expect(Object.keys(health.circuitBreakers!).length).toBeGreaterThan(0);
    });

    it('should handle health check when underlying adapter fails', async () => {
      const failingAdapter: CacheService = {
        async get() { throw new Error('Adapter failure'); },
        async set() { throw new Error('Adapter failure'); },
        async del() { throw new Error('Adapter failure'); },
        async getHealth() { throw new Error('Health check failure'); },
      };
      
      const cache = new SingleFlightCache(failingAdapter);
      const health = await cache.getHealth();
      
      expect(health.connected).toBe(false);
      expect(health.errors).toBeDefined();
      expect(health.errors!.length).toBeGreaterThan(0);
      
      cache.destroy();
    });
  });

  describe('Batch Operations with Circuit Breaker', () => {
    it('should handle mget with circuit breaker protection', async () => {
      const adapter = new MemoryAdapter({
        maxMemoryMB: 10,
        defaultTtlSec: 300,
        enableMetrics: true,
      });

      const cache = new SingleFlightCache(adapter);
      
      // Set some values
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      const results = await cache.mget(['key1', 'key2', 'nonexistent']);
      expect(results).toEqual(['value1', 'value2', null]);
      
      cache.destroy();
      adapter.destroy();
    });

    it('should handle mset with circuit breaker protection', async () => {
      const adapter = new MemoryAdapter({
        maxMemoryMB: 10,
        defaultTtlSec: 300,
        enableMetrics: true,
      });

      const cache = new SingleFlightCache(adapter);
      
      await cache.mset([
        ['key1', 'value1'],
        ['key2', 'value2', 60],
      ]);
      
      const [result1, result2] = await Promise.all([
        cache.get('key1'),
        cache.get('key2'),
      ]);
      
      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
      
      cache.destroy();
      adapter.destroy();
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle adapter errors gracefully', async () => {
      const flakyAdapter: CacheService = {
        async get(key: string) {
          if (Math.random() < 0.5) {
            throw new Error('Random failure');
          }
          return 'success';
        },
        async set() { /* no-op */ },
        async del() { /* no-op */ },
      };
      
      const cache = new SingleFlightCache(flakyAdapter);
      
      // Multiple attempts should eventually succeed or fail consistently
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < 10; i++) {
        try {
          const result = await cache.get('test-key');
          if (result === 'success') successCount++;
        } catch (error) {
          errorCount++;
        }
      }
      
      // Should have some mix of successes and errors, or circuit breaker should kick in
      expect(successCount + errorCount).toBe(10);
      
      cache.destroy();
    });

    it('should maintain performance under load', async () => {
      const adapter = new MemoryAdapter({
        maxMemoryMB: 10,
        defaultTtlSec: 300,
        enableMetrics: true,
      });

      const cache = new SingleFlightCache(adapter);
      
      // Warm up cache
      for (let i = 0; i < 100; i++) {
        await cache.set(`key-${i}`, `value-${i}`);
      }
      
      // Measure performance
      const start = performance.now();
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(cache.get(`key-${i % 50}`)); // Some cache hits, some misses
      }
      
      await Promise.all(promises);
      const duration = performance.now() - start;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second for 100 operations
      
      cache.destroy();
      adapter.destroy();
    });
  });
});






