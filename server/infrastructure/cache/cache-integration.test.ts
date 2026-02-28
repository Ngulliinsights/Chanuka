/**
 * Cache Integration Tests
 * End-to-end tests for cache functionality with real cache service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MockCacheService,
  SpyCacheService,
  CacheTestDataGenerator,
  CacheTestAssertions,
  CachePerformanceTest,
  createPopulatedCache,
  waitForCache,
} from './test-utilities';
import { cacheKeys } from './key-generator';
import { invalidationManager } from './patterns/invalidation';
import { warmingManager } from './warming/strategies';
import { CacheMetricsCollector } from './monitoring/metrics-collector';

describe('Cache Integration Tests', () => {
  let cache: MockCacheService;

  beforeEach(() => {
    cache = new MockCacheService();
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get values', async () => {
      const key = 'test:key';
      const value = { data: 'test value' };

      await cache.set(key, value);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non:existent');
      expect(result).toBeNull();
    });

    it('should delete keys', async () => {
      const key = 'test:key';
      await cache.set(key, 'value');
      await cache.del(key);

      const result = await cache.get(key);
      expect(result).toBeNull();
    });

    it('should check key existence', async () => {
      const key = 'test:key';
      await cache.set(key, 'value');

      expect(await cache.has(key)).toBe(true);
      expect(await cache.has('non:existent')).toBe(false);
    });

    it('should clear all keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();

      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire keys after TTL', async () => {
      const key = 'test:expiring';
      await cache.set(key, 'value', 1); // 1 second TTL

      // Should exist immediately
      expect(await cache.has(key)).toBe(true);

      // Wait for expiration
      await waitForCache(1100);

      // Should be expired
      expect(await cache.get(key)).toBeNull();
    });

    it('should not expire keys without TTL', async () => {
      const key = 'test:permanent';
      await cache.set(key, 'value');

      await waitForCache(100);

      expect(await cache.get(key)).toBe('value');
    });
  });

  describe('Cache Metrics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'value1');

      // Hit
      await cache.get('key1');

      // Miss
      await cache.get('key2');

      const metrics = await cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(50);
    });

    it('should track operations count', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.del('key1');

      const metrics = await cache.getMetrics();
      expect(metrics.operations).toBeGreaterThanOrEqual(3);
    });

    it('should track key count', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const metrics = await cache.getMetrics();
      expect(metrics.keyCount).toBe(2);

      await cache.del('key1');
      const metricsAfter = await cache.getMetrics();
      expect(metricsAfter.keyCount).toBe(1);
    });
  });

  describe('Pattern-Based Invalidation', () => {
    it('should invalidate keys by pattern', async () => {
      await cache.set('user:1:profile', 'data1');
      await cache.set('user:2:profile', 'data2');
      await cache.set('property:1', 'data3');

      await cache.invalidateByPattern('user:*');

      expect(await cache.has('user:1:profile')).toBe(false);
      expect(await cache.has('user:2:profile')).toBe(false);
      expect(await cache.has('property:1')).toBe(true);
    });

    it('should invalidate keys by tags', async () => {
      await cache.set('item:tag1:1', 'data1');
      await cache.set('item:tag1:2', 'data2');
      await cache.set('item:tag2:3', 'data3');

      await cache.invalidateByTags(['tag1']);

      expect(await cache.has('item:tag1:1')).toBe(false);
      expect(await cache.has('item:tag1:2')).toBe(false);
      expect(await cache.has('item:tag2:3')).toBe(true);
    });
  });

  describe('Key Generation Integration', () => {
    it('should use generated keys consistently', async () => {
      const propertyId = 123;
      const key = cacheKeys.property(propertyId);

      await cache.set(key, { id: propertyId, name: 'Test Property' });

      const retrieved = await cache.get(key);
      expect(retrieved).toEqual({ id: propertyId, name: 'Test Property' });
    });

    it('should generate unique keys for different entities', async () => {
      const key1 = cacheKeys.property(1);
      const key2 = cacheKeys.property(2);

      await cache.set(key1, 'value1');
      await cache.set(key2, 'value2');

      expect(await cache.get(key1)).toBe('value1');
      expect(await cache.get(key2)).toBe('value2');
    });
  });

  describe('Invalidation Strategy Integration', () => {
    it('should invalidate using write-through strategy', async () => {
      const propertyKey = cacheKeys.property(123);
      await cache.set(propertyKey, { id: 123 });

      const keys = await invalidationManager.invalidate({
        feature: 'property',
        entity: 'listing',
        id: 123,
      });

      // Verify keys were identified for invalidation
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should invalidate using tag-based strategy', async () => {
      const keys = await invalidationManager.invalidate(
        {
          feature: 'property',
          entity: 'listing',
          tags: ['featured'],
        },
        'tag-based'
      );

      expect(Array.isArray(keys)).toBe(true);
    });
  });

  describe('Warming Strategy Integration', () => {
    it('should warm cache with eager strategy', async () => {
      const dataLoader = async () => [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const result = await warmingManager.warm(
        {
          feature: 'property',
          entity: 'listing',
          dataLoader,
        },
        'eager'
      );

      expect(result.success).toBe(true);
      expect(result.itemsWarmed).toBe(2);
    });

    it('should warm cache with lazy strategy', async () => {
      const dataLoader = async () => [{ id: 1 }];

      const result = await warmingManager.warm({
        feature: 'property',
        entity: 'listing',
        dataLoader,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Spy Cache Integration', () => {
    it('should track all cache operations', async () => {
      const spy = new SpyCacheService(cache);

      await spy.set('key1', 'value1');
      await spy.get('key1');
      await spy.del('key1');

      expect(spy.setCalls).toHaveLength(1);
      expect(spy.getCalls).toHaveLength(1);
      expect(spy.delCalls).toHaveLength(1);
    });
  });

  describe('Test Data Generator Integration', () => {
    it('should generate and cache test data', async () => {
      const entries = CacheTestDataGenerator.generateEntries(5);

      for (const entry of entries) {
        await cache.set(entry.key, entry.value);
      }

      const metrics = await cache.getMetrics();
      expect(metrics.keyCount).toBe(5);
    });

    it('should generate data of different sizes', async () => {
      const smallData = CacheTestDataGenerator.generateData('small');
      const mediumData = CacheTestDataGenerator.generateData('medium');
      const largeData = CacheTestDataGenerator.generateData('large');

      expect(smallData.data.length).toBe(10);
      expect(mediumData.data.length).toBe(100);
      expect(largeData.data.length).toBe(1000);
    });
  });

  describe('Cache Assertions Integration', () => {
    it('should assert hit rate', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1'); // Hit
      await cache.get('key1'); // Hit

      await expect(
        CacheTestAssertions.assertHitRate(cache, 50)
      ).resolves.not.toThrow();
    });

    it('should assert key existence', async () => {
      await cache.set('key1', 'value1');

      await expect(
        CacheTestAssertions.assertHasKey(cache, 'key1')
      ).resolves.not.toThrow();

      await expect(
        CacheTestAssertions.assertNotHasKey(cache, 'key2')
      ).resolves.not.toThrow();
    });

    it('should assert cache value', async () => {
      const value = { id: 1, name: 'Test' };
      await cache.set('key1', value);

      await expect(
        CacheTestAssertions.assertValue(cache, 'key1', value)
      ).resolves.not.toThrow();
    });
  });

  describe('Performance Testing Integration', () => {
    it('should measure operation latency', async () => {
      const latency = await CachePerformanceTest.measureLatency(async () => {
        await cache.set('key1', 'value1');
      });

      expect(latency).toBeGreaterThanOrEqual(0);
      expect(latency).toBeLessThan(100); // Should be fast
    });

    it('should run performance benchmark', async () => {
      const results = await CachePerformanceTest.benchmark(cache, 100);

      expect(results.avgSetLatency).toBeGreaterThanOrEqual(0);
      expect(results.avgGetLatency).toBeGreaterThanOrEqual(0);
      expect(results.avgDelLatency).toBeGreaterThanOrEqual(0);

      // All operations should be fast
      expect(results.avgSetLatency).toBeLessThan(10);
      expect(results.avgGetLatency).toBeLessThan(10);
      expect(results.avgDelLatency).toBeLessThan(10);
    });
  });

  describe('Metrics Collector Integration', () => {
    it('should collect metrics from cache', async () => {
      const collector = new CacheMetricsCollector();
      const metrics = await cache.getMetrics();

      collector.registerCache('test-cache', metrics);

      const aggregated = collector.getAggregatedMetrics();
      expect(aggregated).toBeDefined();
      expect(aggregated.hits).toBeGreaterThanOrEqual(0);
    });

    it('should aggregate metrics from multiple caches', async () => {
      const collector = new CacheMetricsCollector();
      const cache1 = new MockCacheService();
      const cache2 = new MockCacheService();

      await cache1.set('key1', 'value1');
      await cache1.get('key1');

      await cache2.set('key2', 'value2');
      await cache2.get('key2');

      collector.registerCache('cache1', await cache1.getMetrics());
      collector.registerCache('cache2', await cache2.getMetrics());

      const aggregated = collector.getAggregatedMetrics();
      expect(aggregated.hits).toBe(2);
      expect(aggregated.keyCount).toBe(2);
    });
  });

  describe('Pre-populated Cache Integration', () => {
    it('should create cache with pre-populated data', async () => {
      const entries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2', ttl: 60 },
      ];

      const populated = await createPopulatedCache(cache, entries);

      expect(await populated.get('key1')).toBe('value1');
      expect(await populated.get('key2')).toBe('value2');

      const metrics = await populated.getMetrics();
      expect(metrics.keyCount).toBe(2);
    });
  });

  describe('High-Load Scenarios', () => {
    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) =>
        cache.set(`key:${i}`, `value:${i}`)
      );

      await Promise.all(operations);

      const metrics = await cache.getMetrics();
      expect(metrics.keyCount).toBe(100);
    });

    it('should maintain hit rate under load', async () => {
      // Populate cache
      for (let i = 0; i < 50; i++) {
        await cache.set(`key:${i}`, `value:${i}`);
      }

      // Mix of hits and misses
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(cache.get(`key:${i % 75}`)); // Some hits, some misses
      }

      await Promise.all(operations);

      const metrics = await cache.getMetrics();
      expect(metrics.hitRate).toBeGreaterThan(0);
      expect(metrics.hitRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid keys gracefully', async () => {
      await expect(cache.get('')).resolves.toBeNull();
    });

    it('should handle null values', async () => {
      await cache.set('key1', null);
      const result = await cache.get('key1');
      expect(result).toBeNull();
    });
  });
});
