import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

/**
 * Single Flight Cache Integration Tests
 * 
 * Integration tests to verify SingleFlightCache works correctly with
 * existing cache adapters and provides the expected functionality
 */

import { SingleFlightCache } from '../single-flight-cache';
import { MemoryAdapter } from '../adapters/memory-adapter';
import type { CacheService } from '@shared/types';
import { logger } from '@shared/core/src/observability/logging';

describe('SingleFlightCache Integration', () => {
  let memoryAdapter: MemoryAdapter;
  let cache: SingleFlightCache;

  beforeEach(() => {
    memoryAdapter = new MemoryAdapter({
      maxMemoryMB: 10,
      enableMetrics: true,
      keyPrefix: 'test',
      defaultTtlSec: 300,
      enableCompression: false,
      compressionThreshold: 1024,
    });

    cache = new SingleFlightCache(memoryAdapter, {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 1000,
      slowCallThreshold: 100,
      slowCallRateThreshold: 0.5,
      successThreshold: 2,
      enableGracefulDegradation: true,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Cache Operations', () => {
    it('should perform basic cache operations through SingleFlightCache', async () => {
      // Set a value
      await cache.set('test-key', 'test-value', 300);
      
      // Get the value
      const result = await cache.get('test-key');
      expect(result).toBe('test-value');
      
      // Check existence
      const exists = await cache.exists?.('test-key');
      expect(exists).toBe(true);
      
      // Delete the value
      await cache.del('test-key');
      
      // Verify deletion
      const deletedResult = await cache.get('test-key');
      expect(deletedResult).toBeNull();
    });

    it('should handle batch operations', async () => {
      // Set multiple values
      await cache.mset?.([
        ['key1', 'value1', 300],
        ['key2', 'value2', 300],
        ['key3', 'value3', 300],
      ]);
      
      // Get multiple values
      const results = await cache.mget?.(['key1', 'key2', 'key3', 'key4']);
      expect(results).toEqual(['value1', 'value2', 'value3', null]);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should integrate circuit breaker with memory adapter', async () => {
      // Create a failing adapter by overriding the get method
      const originalGet = memoryAdapter.get.bind(memoryAdapter);
      let failureCount = 0;
      
      memoryAdapter.get = async (key: string) => {
        failureCount++;
        if (failureCount <= 3) {
          throw new Error(`Simulated failure ${failureCount}`);
        }
        return originalGet(key);
      };

      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await cache.get('test-key');
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should be open
      const state = cache.getCircuitBreakerState('test-key');
      expect(state?.state).toBe('open');

      // Should return fallback value
      const result = await cache.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('Graceful Degradation Integration', () => {
    it('should provide graceful degradation with memory adapter', async () => {
      // Store a value successfully
      await cache.set('test-key', 'cached-value', 300);
      const result1 = await cache.get('test-key');
      expect(result1).toBe('cached-value');

      // Now make the adapter fail
      const originalGet = memoryAdapter.get.bind(memoryAdapter);
      memoryAdapter.get = async () => {
        throw new Error('Adapter failure');
      };

      // Should return fallback value from graceful degradation
      const result2 = await cache.get('test-key');
      expect(result2).toBe('cached-value');
    });
  });

  describe('Performance and Metrics', () => {
    it('should collect metrics through SingleFlightCache', async () => {
      // Perform some operations
      await cache.set('key1', 'value1');
      await cache.get('key1'); // Hit
      await cache.get('key2'); // Miss
      
      const metrics = cache.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.hits).toBeGreaterThan(0);
      expect(metrics?.misses).toBeGreaterThan(0);
    });

    it('should provide health status', async () => {
      const health = await cache.getHealth();
      
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('latency');
      expect(health).toHaveProperty('stats');
      expect(health.connected).toBe(true);
    });
  });

  describe('Single Flight Pattern Integration', () => {
    it('should prevent duplicate requests to memory adapter', async () => {
      let getCallCount = 0;
      const originalGet = memoryAdapter.get.bind(memoryAdapter);
      
      memoryAdapter.get = async (key: string) => {
        getCallCount++;
        // Simulate some delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return originalGet(key);
      };

      await memoryAdapter.set('test-key', 'test-value');

      // Start multiple concurrent requests
      const promises = Array(5).fill(0).map(() => cache.get('test-key'));
      const results = await Promise.all(promises);

      // All should return the same value
      results.forEach(result => {
        expect(result).toBe('test-value');
      });

      // Should only make one call to the underlying adapter
      expect(getCallCount).toBe(1);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from adapter failures', async () => {
      let shouldFail = true;
      const originalGet = memoryAdapter.get.bind(memoryAdapter);
      
      memoryAdapter.get = async (key: string) => {
        if (shouldFail) {
          throw new Error('Temporary failure');
        }
        return originalGet(key);
      };

      // Trigger failures
      for (let i = 0; i < 3; i++) {
        try {
          await cache.get('test-key');
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should be open
      expect(cache.getCircuitBreakerState('test-key')?.state).toBe('open');

      // Wait for circuit breaker timeout and fix the adapter
      await new Promise(resolve => setTimeout(resolve, 1100));
      shouldFail = false;
      await memoryAdapter.set('test-key', 'recovered-value');

      // Should recover and return the value
      const result = await cache.get('test-key');
      expect(result).toBe('recovered-value');

      // Circuit should eventually close
      await cache.get('test-key'); // Second success
      const finalState = cache.getCircuitBreakerState('test-key');
      expect(finalState?.state).toBe('closed');
    });
  });

  describe('Configuration Integration', () => {
    it('should work with different configuration options', async () => {
      // Test with circuit breaker disabled
      const noCbCache = new SingleFlightCache(memoryAdapter, {
        enableCircuitBreaker: false,
      });

      await noCbCache.set('test-key', 'test-value');
      const result = await noCbCache.get('test-key');
      expect(result).toBe('test-value');

      noCbCache.destroy();
    });

    it('should work with graceful degradation disabled', async () => {
      const noGdCache = new SingleFlightCache(memoryAdapter, {
        enableGracefulDegradation: false,
      });

      await noGdCache.set('test-key', 'test-value');
      const result = await noGdCache.get('test-key');
      expect(result).toBe('test-value');

      noGdCache.destroy();
    });
  });
});












































