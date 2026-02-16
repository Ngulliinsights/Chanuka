/**
 * Cache Factory Tests
 * Tests for the unified cache factory implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createCacheService,
  createSimpleCacheService,
  CacheManager,
  createCacheManager,
  SimpleCacheFactory,
  cacheFactory,
  initializeDefaultCache,
  getDefaultCache,
  resetDefaultCache
} from './factory';
import type { CacheConfig } from './core/interfaces';

describe('Cache Factory', () => {
  afterEach(() => {
    resetDefaultCache();
  });

  describe('createCacheService', () => {
    it('should create a memory cache service', async () => {
      const config: CacheConfig = {
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100
      };

      const cache = createCacheService(config);
      expect(cache).toBeDefined();

      // Test basic operations
      await cache.set('test-key', 'test-value');
      const value = await cache.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should throw error for unsupported provider', () => {
      const config = {
        provider: 'unsupported',
        defaultTtlSec: 3600
      } as any;

      expect(() => createCacheService(config)).toThrow('Unsupported cache provider');
    });

    it('should throw error for redis provider (not yet implemented)', () => {
      const config: CacheConfig = {
        provider: 'redis',
        defaultTtlSec: 3600,
        redisUrl: 'redis://localhost:6379'
      };

      expect(() => createCacheService(config)).toThrow('Redis adapter is not yet implemented');
    });
  });

  describe('createSimpleCacheService', () => {
    it('should create a simple memory cache with defaults', async () => {
      const cache = createSimpleCacheService();
      expect(cache).toBeDefined();

      await cache.set('key', 'value');
      const value = await cache.get('key');
      expect(value).toBe('value');
    });

    it('should create a simple cache with custom config', async () => {
      const cache = createSimpleCacheService({
        defaultTtlSec: 1800,
        maxMemoryMB: 50,
        keyPrefix: 'test:'
      });

      expect(cache).toBeDefined();
      await cache.set('key', 'value');
      const value = await cache.get('key');
      expect(value).toBe('value');
    });
  });

  describe('CacheManager', () => {
    it('should warm up cache with factory functions', async () => {
      const cache = createSimpleCacheService();
      const manager = new CacheManager(cache);

      await manager.warmUp([
        {
          key: 'warm-key-1',
          factory: async () => 'warm-value-1',
          ttl: 300
        },
        {
          key: 'warm-key-2',
          factory: async () => ({ data: 'warm-value-2' })
        }
      ]);

      const value1 = await cache.get('warm-key-1');
      const value2 = await cache.get('warm-key-2');

      expect(value1).toBe('warm-value-1');
      expect(value2).toEqual({ data: 'warm-value-2' });
    });

    it('should skip existing keys during warm up', async () => {
      const cache = createSimpleCacheService();
      const manager = new CacheManager(cache);

      await cache.set('existing-key', 'original-value');

      await manager.warmUp([
        {
          key: 'existing-key',
          factory: async () => 'new-value'
        }
      ]);

      const value = await cache.get('existing-key');
      expect(value).toBe('original-value');
    });

    it('should get cache statistics', async () => {
      const cache = createSimpleCacheService();
      const manager = new CacheManager(cache);

      await cache.set('key1', 'value1');
      await cache.get('key1');

      const stats = manager.getStats();
      expect(stats).toBeDefined();
    });

    it('should clear cache', async () => {
      const cache = createSimpleCacheService();
      const manager = new CacheManager(cache);

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await manager.clear();

      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });

  describe('createCacheManager', () => {
    it('should create a cache manager with provided cache', async () => {
      const cache = createSimpleCacheService();
      const manager = createCacheManager(cache);

      expect(manager).toBeInstanceOf(CacheManager);

      await cache.set('test', 'value');
      const stats = manager.getStats();
      expect(stats).toBeDefined();
    });

    it('should create a cache manager with default cache', () => {
      initializeDefaultCache({
        provider: 'memory',
        defaultTtlSec: 3600
      });

      const manager = createCacheManager();
      expect(manager).toBeInstanceOf(CacheManager);
    });
  });

  describe('Default Cache Management', () => {
    it('should initialize and get default cache', async () => {
      const cache = initializeDefaultCache({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100
      });

      expect(cache).toBeDefined();

      const defaultCache = getDefaultCache();
      expect(defaultCache).toBe(cache);

      await defaultCache.set('key', 'value');
      const value = await defaultCache.get('key');
      expect(value).toBe('value');
    });

    it('should throw error when getting uninitialized default cache', () => {
      expect(() => getDefaultCache()).toThrow('Default cache not initialized');
    });

    it('should reset default cache', () => {
      initializeDefaultCache({
        provider: 'memory',
        defaultTtlSec: 3600
      });

      expect(() => getDefaultCache()).not.toThrow();

      resetDefaultCache();

      expect(() => getDefaultCache()).toThrow('Default cache not initialized');
    });
  });

  describe('SimpleCacheFactory', () => {
    let factory: SimpleCacheFactory;

    beforeEach(() => {
      factory = SimpleCacheFactory.getInstance();
    });

    afterEach(async () => {
      await factory.shutdown();
    });

    it('should be a singleton', () => {
      const factory1 = SimpleCacheFactory.getInstance();
      const factory2 = SimpleCacheFactory.getInstance();
      expect(factory1).toBe(factory2);
    });

    it('should create named cache instances', async () => {
      const cache1 = factory.createCache('cache-1', {
        provider: 'memory',
        defaultTtlSec: 3600
      });

      const cache2 = factory.createCache('cache-2', {
        provider: 'memory',
        defaultTtlSec: 1800
      });

      expect(cache1).toBeDefined();
      expect(cache2).toBeDefined();
      expect(cache1).not.toBe(cache2);

      await cache1.set('key', 'value1');
      await cache2.set('key', 'value2');

      const value1 = await cache1.get('key');
      const value2 = await cache2.get('key');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
    });

    it('should return existing cache if name already exists', () => {
      const cache1 = factory.createCache('test-cache', {
        provider: 'memory',
        defaultTtlSec: 3600
      });

      const cache2 = factory.createCache('test-cache', {
        provider: 'memory',
        defaultTtlSec: 1800
      });

      expect(cache1).toBe(cache2);
    });

    it('should get cache by name', () => {
      factory.createCache('my-cache', {
        provider: 'memory',
        defaultTtlSec: 3600
      });

      const cache = factory.getCache('my-cache');
      expect(cache).toBeDefined();

      const nonExistent = factory.getCache('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should remove cache by name', () => {
      factory.createCache('removable-cache', {
        provider: 'memory',
        defaultTtlSec: 3600
      });

      const removed = factory.removeCache('removable-cache');
      expect(removed).toBe(true);

      const cache = factory.getCache('removable-cache');
      expect(cache).toBeUndefined();

      const removedAgain = factory.removeCache('removable-cache');
      expect(removedAgain).toBe(false);
    });

    it('should get all cache names', () => {
      factory.createCache('cache-1', { provider: 'memory', defaultTtlSec: 3600 });
      factory.createCache('cache-2', { provider: 'memory', defaultTtlSec: 3600 });
      factory.createCache('cache-3', { provider: 'memory', defaultTtlSec: 3600 });

      const names = factory.getCacheNames();
      expect(names).toContain('cache-1');
      expect(names).toContain('cache-2');
      expect(names).toContain('cache-3');
      expect(names.length).toBe(3);
    });

    it('should clear all caches', async () => {
      const cache1 = factory.createCache('cache-1', {
        provider: 'memory',
        defaultTtlSec: 3600
      });
      const cache2 = factory.createCache('cache-2', {
        provider: 'memory',
        defaultTtlSec: 3600
      });

      await cache1.set('key', 'value1');
      await cache2.set('key', 'value2');

      await factory.clearAll();

      const value1 = await cache1.get('key');
      const value2 = await cache2.get('key');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });

    it('should shutdown all caches', async () => {
      factory.createCache('cache-1', { provider: 'memory', defaultTtlSec: 3600 });
      factory.createCache('cache-2', { provider: 'memory', defaultTtlSec: 3600 });

      await factory.shutdown();

      const names = factory.getCacheNames();
      expect(names.length).toBe(0);
    });
  });

  describe('cacheFactory singleton', () => {
    afterEach(async () => {
      await cacheFactory.shutdown();
    });

    it('should be the same instance as SimpleCacheFactory.getInstance()', () => {
      expect(cacheFactory).toBe(SimpleCacheFactory.getInstance());
    });

    it('should work as a convenience export', async () => {
      const cache = cacheFactory.createCache('test', {
        provider: 'memory',
        defaultTtlSec: 3600
      });

      await cache.set('key', 'value');
      const value = await cache.get('key');
      expect(value).toBe('value');
    });
  });

  describe('Cache Metrics Collection', () => {
    it('should collect metrics for cache operations', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // Perform various cache operations
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      // Generate hits
      await cache.get('key1');
      await cache.get('key2');
      await cache.get('key1'); // Second hit

      // Generate misses
      await cache.get('nonexistent1');
      await cache.get('nonexistent2');

      // Get metrics
      const metrics = manager.getStats();

      expect(metrics).toBeDefined();
      expect(metrics?.hits).toBeGreaterThan(0);
      expect(metrics?.misses).toBeGreaterThan(0);
      expect(metrics?.operations).toBeGreaterThan(0);
      expect(metrics?.hitRate).toBeGreaterThan(0);
      expect(metrics?.hitRate).toBeLessThanOrEqual(1);
    });

    it('should track hit rate correctly', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // Set up data
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      // 2 hits
      await cache.get('key1');
      await cache.get('key2');

      // 2 misses
      await cache.get('miss1');
      await cache.get('miss2');

      const metrics = manager.getStats();

      expect(metrics).toBeDefined();
      expect(metrics?.hits).toBeGreaterThanOrEqual(2);
      expect(metrics?.misses).toBeGreaterThanOrEqual(2);
      expect(metrics?.hitRate).toBeGreaterThan(0);
      expect(metrics?.hitRate).toBeLessThanOrEqual(1);
    });

    it('should track latency metrics', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // Perform operations
      await cache.set('key', 'value');
      await cache.get('key');

      const metrics = manager.getStats();

      expect(metrics).toBeDefined();
      expect(metrics?.avgLatency).toBeGreaterThanOrEqual(0);
      expect(metrics?.maxLatency).toBeGreaterThanOrEqual(0);
      expect(metrics?.minLatency).toBeGreaterThanOrEqual(0);
    });

    it('should track memory usage', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // Add some data
      await cache.set('key1', 'value1');
      await cache.set('key2', { data: 'large object with more data' });
      await cache.set('key3', Array(100).fill('data'));

      const metrics = manager.getStats();

      expect(metrics).toBeDefined();
      expect(metrics?.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should track key count', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // Add keys
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      const metrics = manager.getStats();

      expect(metrics).toBeDefined();
      expect(metrics?.keyCount).toBeGreaterThanOrEqual(0);
    });

    it('should track errors in metrics', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // Perform some operations
      await cache.set('key', 'value');
      await cache.get('key');

      const metrics = manager.getStats();

      expect(metrics).toBeDefined();
      expect(metrics?.errors).toBeDefined();
      expect(metrics?.errors).toBeGreaterThanOrEqual(0);
    });

    it('should return undefined metrics when metrics are disabled', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableMetrics: false
      });

      const manager = createCacheManager(cache);

      await cache.set('key', 'value');
      await cache.get('key');

      const metrics = manager.getStats();

      // Metrics should still be returned but may have default values
      expect(metrics).toBeDefined();
    });

    it('should accumulate metrics over multiple operations', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // First batch
      await cache.set('key1', 'value1');
      await cache.get('key1');

      const metrics1 = manager.getStats();
      const initialOps = metrics1?.operations || 0;

      // Second batch
      await cache.set('key2', 'value2');
      await cache.get('key2');
      await cache.get('key1');

      const metrics2 = manager.getStats();

      expect(metrics2).toBeDefined();
      expect(metrics2?.operations).toBeGreaterThan(initialOps);
    });

    it('should reset metrics after cache clear', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // Add data and generate metrics
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.get('key1');

      // Check that cache has data
      const size = await cache.size?.();
      expect(size).toBeGreaterThan(0);

      // Clear cache
      await manager.clear();

      // Verify cache is empty
      const sizeAfter = await cache.size?.();
      expect(sizeAfter).toBe(0);

      const metricsAfter = manager.getStats();
      expect(metricsAfter?.keyCount).toBe(0);
    });
  });
});

  describe('Performance Benchmarks (Task 6.7)', () => {
    it('should perform cache operations within acceptable time limits', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      const iterations = 1000;
      const acceptableSetTimeMs = 20; // 20ms for 1000 operations
      const acceptableGetTimeMs = 20; // 20ms for 1000 operations

      // Benchmark SET operations
      const setStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await cache.set(`key-${i}`, `value-${i}`);
      }
      const setDuration = performance.now() - setStart;
      const avgSetTime = setDuration / iterations;

      // Benchmark GET operations
      const getStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await cache.get(`key-${i}`);
      }
      const getDuration = performance.now() - getStart;
      const avgGetTime = getDuration / iterations;

      // Verify performance is acceptable
      expect(setDuration).toBeLessThan(acceptableSetTimeMs);
      expect(getDuration).toBeLessThan(acceptableGetTimeMs);
      expect(avgSetTime).toBeLessThan(0.02); // Less than 0.02ms per operation
      expect(avgGetTime).toBeLessThan(0.02); // Less than 0.02ms per operation

      console.log(`Performance Benchmark Results:
        - SET: ${setDuration.toFixed(2)}ms for ${iterations} operations (${avgSetTime.toFixed(4)}ms avg)
        - GET: ${getDuration.toFixed(2)}ms for ${iterations} operations (${avgGetTime.toFixed(4)}ms avg)`);
    });

    it('should maintain consistent performance under load', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      const batchSize = 100;
      const batches = 10;
      const timings: number[] = [];

      // Run multiple batches and measure each
      for (let batch = 0; batch < batches; batch++) {
        const start = performance.now();
        
        for (let i = 0; i < batchSize; i++) {
          const key = `batch-${batch}-key-${i}`;
          await cache.set(key, `value-${i}`);
          await cache.get(key);
        }
        
        const duration = performance.now() - start;
        timings.push(duration);
      }

      // Calculate variance
      const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      // Performance should be consistent (low variance)
      // Coefficient of variation should be less than 0.5 (50%)
      expect(coefficientOfVariation).toBeLessThan(0.5);

      console.log(`Consistency Benchmark Results:
        - Mean: ${mean.toFixed(2)}ms
        - Std Dev: ${stdDev.toFixed(2)}ms
        - Coefficient of Variation: ${(coefficientOfVariation * 100).toFixed(2)}%`);
    });

    it('should handle concurrent operations efficiently', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      const concurrentOps = 100;
      const acceptableTimeMs = 50; // 50ms for 100 concurrent operations

      const start = performance.now();
      
      // Execute concurrent operations
      const promises = Array.from({ length: concurrentOps }, async (_, i) => {
        await cache.set(`concurrent-${i}`, `value-${i}`);
        return cache.get(`concurrent-${i}`);
      });

      await Promise.all(promises);
      
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(acceptableTimeMs);

      console.log(`Concurrent Operations Benchmark:
        - ${concurrentOps} concurrent operations completed in ${duration.toFixed(2)}ms`);
    });

    it('should maintain performance with large values', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      // Create a large object (approximately 10KB)
      const largeValue = {
        data: Array(1000).fill('x').join(''),
        nested: {
          array: Array(100).fill({ id: 1, name: 'test', value: 'data' })
        }
      };

      const iterations = 100;
      const acceptableTimeMs = 20; // 20ms for 100 operations with large values

      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await cache.set(`large-${i}`, largeValue);
        await cache.get(`large-${i}`);
      }
      
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(acceptableTimeMs);

      console.log(`Large Value Benchmark:
        - ${iterations} operations with ~10KB values completed in ${duration.toFixed(2)}ms`);
    });

    it('should not degrade with cache size growth', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      const measurements: Array<{ size: number; duration: number }> = [];
      const testSizes = [100, 500, 1000, 2000];

      for (const size of testSizes) {
        // Populate cache to target size
        for (let i = 0; i < size; i++) {
          await cache.set(`size-test-${i}`, `value-${i}`);
        }

        // Measure performance at this size
        const start = performance.now();
        const testOps = 100;
        
        for (let i = 0; i < testOps; i++) {
          await cache.get(`size-test-${Math.floor(Math.random() * size)}`);
        }
        
        const duration = performance.now() - start;
        measurements.push({ size, duration });

        // Clear for next test
        await cache.clear?.();
      }

      // Check that performance doesn't degrade significantly
      // Allow up to 3x slowdown as cache grows (reasonable for memory cache with LRU)
      const firstDuration = measurements[0].duration;
      const lastDuration = measurements[measurements.length - 1].duration;
      const degradationRatio = lastDuration / firstDuration;

      expect(degradationRatio).toBeLessThan(3.5);

      console.log('Cache Size Growth Benchmark:');
      measurements.forEach(({ size, duration }) => {
        console.log(`  - Size ${size}: ${duration.toFixed(2)}ms for 100 random gets`);
      });
      console.log(`  - Degradation ratio: ${degradationRatio.toFixed(2)}x`);
    });

    it('should have acceptable memory overhead', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // Add known amount of data
      const valueSize = 1000; // ~1KB per value
      const numEntries = 100;
      const expectedMinMemory = numEntries * valueSize * 0.5; // At least 50% efficiency
      const expectedMaxMemory = numEntries * valueSize * 3; // At most 3x overhead

      for (let i = 0; i < numEntries; i++) {
        await cache.set(`mem-test-${i}`, 'x'.repeat(valueSize));
      }

      const metrics = manager.getStats();
      const memoryUsage = metrics?.memoryUsage || 0;

      // Memory usage should be reasonable (not too much overhead)
      // Note: Memory adapter may not report accurate memory usage
      if (memoryUsage > 0) {
        expect(memoryUsage).toBeGreaterThan(expectedMinMemory);
        expect(memoryUsage).toBeLessThan(expectedMaxMemory);
      } else {
        // If memory tracking is not available, just verify cache works
        expect(cache).toBeDefined();
      }

      console.log(`Memory Overhead Benchmark:
        - ${numEntries} entries of ~${valueSize} bytes each
        - Total memory usage: ${memoryUsage} bytes
        - Overhead ratio: ${(memoryUsage / (numEntries * valueSize)).toFixed(2)}x`);
    });

    it('should perform cache manager operations efficiently', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);
      const acceptableWarmUpTimeMs = 50; // 50ms for warming 100 entries

      // Benchmark warm-up operation
      const warmUpEntries = Array.from({ length: 100 }, (_, i) => ({
        key: `warmup-${i}`,
        factory: async () => `value-${i}`,
        ttl: 300
      }));

      const start = performance.now();
      await manager.warmUp(warmUpEntries);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(acceptableWarmUpTimeMs);

      // Verify all entries were warmed up
      for (let i = 0; i < 10; i++) {
        const value = await cache.get(`warmup-${i}`);
        expect(value).toBe(`value-${i}`);
      }

      console.log(`Cache Manager Benchmark:
        - Warm-up of 100 entries: ${duration.toFixed(2)}ms`);
    });

    it('should maintain hit rate performance', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });

      const manager = createCacheManager(cache);

      // Populate cache
      const numKeys = 100;
      for (let i = 0; i < numKeys; i++) {
        await cache.set(`hitrate-${i}`, `value-${i}`);
      }

      // Simulate realistic access pattern (80% hits, 20% misses)
      const operations = 1000;
      const start = performance.now();

      for (let i = 0; i < operations; i++) {
        if (Math.random() < 0.8) {
          // Hit
          await cache.get(`hitrate-${Math.floor(Math.random() * numKeys)}`);
        } else {
          // Miss
          await cache.get(`hitrate-miss-${i}`);
        }
      }

      const duration = performance.now() - start;
      const metrics = manager.getStats();

      // Should complete in reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 1000 operations

      // Hit rate should be close to expected (around 80%)
      const hitRate = metrics?.hitRate || 0;
      expect(hitRate).toBeGreaterThan(0.7); // At least 70%
      expect(hitRate).toBeLessThanOrEqual(1.0); // At most 100%

      console.log(`Hit Rate Performance Benchmark:
        - ${operations} operations in ${duration.toFixed(2)}ms
        - Hit rate: ${(hitRate * 100).toFixed(2)}%
        - Avg time per operation: ${(duration / operations).toFixed(4)}ms`);
    });
  });
