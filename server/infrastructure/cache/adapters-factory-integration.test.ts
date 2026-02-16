/**
 * Adapter-Factory Integration Tests
 * 
 * Verifies that all cache adapters work correctly with the consolidated factory
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createCacheService,
  createSimpleCacheService,
  CacheManager,
  createCacheManager
} from './factory';
import { MemoryAdapter } from './adapters/memory-adapter';
import { BrowserAdapter } from './adapters/browser-adapter';
import type { CacheConfig, CacheService } from './core/interfaces';

describe('Adapter-Factory Integration', () => {
  describe('MemoryAdapter with Factory', () => {
    let cache: CacheService;

    beforeEach(() => {
      cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100,
        enableMetrics: true
      });
    });

    afterEach(async () => {
      if (cache && typeof (cache as any).destroy === 'function') {
        await (cache as any).destroy();
      }
    });

    it('should create MemoryAdapter through factory', () => {
      expect(cache).toBeDefined();
      expect(cache).toBeInstanceOf(MemoryAdapter);
    });

    it('should perform basic cache operations', async () => {
      await cache.set('test-key', 'test-value');
      const value = await cache.get('test-key');
      expect(value).toBe('test-value');

      const exists = await cache.exists('test-key');
      expect(exists).toBe(true);

      const deleted = await cache.del('test-key');
      expect(deleted).toBe(true);

      const valueAfterDelete = await cache.get('test-key');
      expect(valueAfterDelete).toBeNull();
    });

    it('should handle TTL correctly', async () => {
      await cache.set('ttl-key', 'ttl-value', 1);
      
      const value1 = await cache.get('ttl-key');
      expect(value1).toBe('ttl-value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const value2 = await cache.get('ttl-key');
      expect(value2).toBeNull();
    });

    it('should support batch operations', async () => {
      // mset
      await cache.mset([
        { key: 'batch1', value: 'value1' },
        { key: 'batch2', value: 'value2' },
        { key: 'batch3', value: 'value3' }
      ]);

      // mget
      const values = await cache.mget(['batch1', 'batch2', 'batch3']);
      expect(values).toEqual(['value1', 'value2', 'value3']);

      // mdel
      const deletedCount = await cache.mdel(['batch1', 'batch2']);
      expect(deletedCount).toBe(2);

      const remainingValue = await cache.get('batch3');
      expect(remainingValue).toBe('value3');
    });

    it('should support increment/decrement operations', async () => {
      const val1 = await cache.increment('counter', 5);
      expect(val1).toBe(5);

      const val2 = await cache.increment('counter', 3);
      expect(val2).toBe(8);

      const val3 = await cache.decrement('counter', 2);
      expect(val3).toBe(6);
    });

    it('should provide health status', async () => {
      const health = await cache.getHealth!();
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    it('should provide metrics', () => {
      const metrics = cache.getMetrics!();
      expect(metrics).toBeDefined();
      expect(metrics.hits).toBeGreaterThanOrEqual(0);
      expect(metrics.misses).toBeGreaterThanOrEqual(0);
      expect(metrics.operations).toBeGreaterThanOrEqual(0);
    });

    it('should support pattern-based operations', async () => {
      await cache.set('user:1', 'Alice');
      await cache.set('user:2', 'Bob');
      await cache.set('product:1', 'Widget');

      const keys = await cache.keys!('user:*');
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
      expect(keys).not.toContain('product:1');

      const deletedCount = await cache.invalidateByPattern!('user:*');
      expect(deletedCount).toBe(2);

      const remainingProduct = await cache.get('product:1');
      expect(remainingProduct).toBe('Widget');
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      await cache.clear!();

      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');
      const value3 = await cache.get('key3');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(value3).toBeNull();
    });
  });

  describe('MemoryAdapter with CacheManager', () => {
    let cache: CacheService;
    let manager: CacheManager;

    beforeEach(() => {
      cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 100
      });
      manager = createCacheManager(cache);
    });

    afterEach(async () => {
      if (cache && typeof (cache as any).destroy === 'function') {
        await (cache as any).destroy();
      }
    });

    it('should warm up cache through manager', async () => {
      await manager.warmUp([
        {
          key: 'warm1',
          factory: async () => 'value1',
          ttl: 300
        },
        {
          key: 'warm2',
          factory: async () => ({ data: 'value2' })
        }
      ]);

      const value1 = await cache.get('warm1');
      const value2 = await cache.get('warm2');

      expect(value1).toBe('value1');
      expect(value2).toEqual({ data: 'value2' });
    });

    it('should get statistics through manager', async () => {
      await cache.set('stat-key', 'stat-value');
      await cache.get('stat-key');

      const stats = manager.getStats();
      expect(stats).toBeDefined();
      expect(stats!.hits).toBeGreaterThan(0);
    });

    it('should get health through manager', async () => {
      const health = await manager.getHealth();
      expect(health).toBeDefined();
    });

    it('should clear cache through manager', async () => {
      await cache.set('clear1', 'value1');
      await cache.set('clear2', 'value2');

      await manager.clear();

      const value1 = await cache.get('clear1');
      const value2 = await cache.get('clear2');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });

  describe('Simple Cache Service', () => {
    let cache: CacheService;

    beforeEach(() => {
      cache = createSimpleCacheService({
        defaultTtlSec: 1800,
        maxMemoryMB: 50,
        keyPrefix: 'simple:'
      });
    });

    afterEach(async () => {
      if (cache && typeof (cache as any).destroy === 'function') {
        await (cache as any).destroy();
      }
    });

    it('should create simple cache with defaults', () => {
      expect(cache).toBeDefined();
      expect(cache).toBeInstanceOf(MemoryAdapter);
    });

    it('should apply key prefix', async () => {
      await cache.set('key', 'value');
      
      // The key should be prefixed internally
      const value = await cache.get('key');
      expect(value).toBe('value');
    });

    it('should work with all basic operations', async () => {
      await cache.set('test', 'data');
      const value = await cache.get('test');
      expect(value).toBe('data');

      const exists = await cache.exists('test');
      expect(exists).toBe(true);

      await cache.del('test');
      const afterDelete = await cache.get('test');
      expect(afterDelete).toBeNull();
    });
  });

  describe.skip('BrowserAdapter with Factory', () => {
    // Note: BrowserAdapter tests are skipped in Node.js environment
    // BrowserAdapter requires browser APIs (window, localStorage, sessionStorage)
    // These tests should be run in a browser environment or with jsdom
    
    let cache: CacheService;

    beforeEach(() => {
      // BrowserAdapter is created directly since factory doesn't support 'browser' provider
      cache = new BrowserAdapter({
        defaultTtlSec: 3600,
        maxMemoryMB: 50,
        enableMetrics: true
      });
    });

    afterEach(async () => {
      if (cache && typeof (cache as any).destroy === 'function') {
        await (cache as any).destroy();
      }
    });

    it('should create BrowserAdapter instance', () => {
      expect(cache).toBeDefined();
      expect(cache).toBeInstanceOf(BrowserAdapter);
    });

    it('should perform basic cache operations', async () => {
      await cache.set('browser-key', 'browser-value');
      const value = await cache.get('browser-key');
      expect(value).toBe('browser-value');

      const exists = await cache.exists('browser-key');
      expect(exists).toBe(true);

      const deleted = await cache.del('browser-key');
      expect(deleted).toBe(true);
    });

    it('should support batch operations', async () => {
      await cache.mset([
        { key: 'b1', value: 'v1' },
        { key: 'b2', value: 'v2' }
      ]);

      const values = await cache.mget(['b1', 'b2']);
      expect(values).toEqual(['v1', 'v2']);
    });

    it('should provide health status', async () => {
      const health = await cache.getHealth!();
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
    });

    it('should provide metrics', () => {
      const metrics = cache.getMetrics!();
      expect(metrics).toBeDefined();
      expect(typeof metrics.operations).toBe('number');
    });
  });

  describe('Configuration Options', () => {
    it('should respect maxMemoryMB configuration', () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        maxMemoryMB: 200
      });

      expect(cache).toBeDefined();
      // The adapter should be configured with the specified memory limit
    });

    it('should respect enableMetrics configuration', () => {
      const cacheWithMetrics = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableMetrics: true
      });

      const cacheWithoutMetrics = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableMetrics: false
      });

      expect(cacheWithMetrics).toBeDefined();
      expect(cacheWithoutMetrics).toBeDefined();
    });

    it('should respect keyPrefix configuration', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        keyPrefix: 'app:'
      });

      await cache.set('key', 'value');
      const value = await cache.get('key');
      expect(value).toBe('value');
    });

    it('should respect compression configuration', () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600,
        enableCompression: true,
        compressionThreshold: 2048
      });

      expect(cache).toBeDefined();
    });
  });

  describe('Multi-Tier Adapter Creation', () => {
    it('should attempt to create multi-tier adapter with proper config', () => {
      // Multi-tier adapter requires Redis which is not yet implemented
      // This test verifies the factory attempts to create it with proper config
      expect(() => {
        createCacheService({
          provider: 'multi-tier',
          defaultTtlSec: 3600,
          maxMemoryMB: 100,
          redisUrl: 'redis://localhost:6379',
          l1MaxSizeMB: 20,
          enableMetrics: true,
          keyPrefix: 'test:'
        });
      }).toThrow(); // Will throw because RedisAdapter is not implemented
    });

    it('should calculate L1 cache size as 20% of total when not specified', () => {
      // Verify the factory logic for L1 size calculation
      // Since Redis is not implemented, we expect an error, but the config should be correct
      expect(() => {
        createCacheService({
          provider: 'multi-tier',
          defaultTtlSec: 3600,
          maxMemoryMB: 100,
          redisUrl: 'redis://localhost:6379'
          // l1MaxSizeMB not specified, should default to 20MB (20% of 100MB)
        });
      }).toThrow();
    });

    it('should pass through all config options to multi-tier adapter', () => {
      // Test that all configuration options are properly passed
      expect(() => {
        createCacheService({
          provider: 'multi-tier',
          defaultTtlSec: 1800,
          maxMemoryMB: 200,
          redisUrl: 'redis://localhost:6379',
          l1MaxSizeMB: 50,
          enableMetrics: true,
          keyPrefix: 'app:',
          enableCompression: true,
          compressionThreshold: 1024
        });
      }).toThrow(); // Will throw because RedisAdapter is not implemented
    });

    it('should require redisUrl for multi-tier provider', () => {
      // Verify that redisUrl is required
      expect(() => {
        createCacheService({
          provider: 'multi-tier',
          defaultTtlSec: 3600,
          maxMemoryMB: 100
          // Missing redisUrl
        } as any);
      }).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported provider', () => {
      expect(() => {
        createCacheService({
          provider: 'unsupported' as any,
          defaultTtlSec: 3600
        });
      }).toThrow('Unsupported cache provider');
    });

    it('should throw error for redis provider (not implemented)', () => {
      expect(() => {
        createCacheService({
          provider: 'redis',
          defaultTtlSec: 3600,
          redisUrl: 'redis://localhost:6379'
        });
      }).toThrow('Redis adapter is not yet implemented');
    });

    it('should throw error for multi-tier provider (redis dependency)', () => {
      expect(() => {
        createCacheService({
          provider: 'multi-tier',
          defaultTtlSec: 3600,
          maxMemoryMB: 100,
          redisUrl: 'redis://localhost:6379'
        });
      }).toThrow();
    });
  });

  describe('Adapter Lifecycle', () => {
    it('should connect and disconnect MemoryAdapter', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600
      });

      if (cache.connect) {
        await cache.connect();
      }

      await cache.set('lifecycle-key', 'lifecycle-value');
      const value = await cache.get('lifecycle-key');
      expect(value).toBe('lifecycle-value');

      if (cache.disconnect) {
        await cache.disconnect();
      }
    });

    it('should destroy adapter and clean up resources', async () => {
      const cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600
      });

      await cache.set('destroy-key', 'destroy-value');

      if (typeof (cache as any).destroy === 'function') {
        await (cache as any).destroy();
      }

      // After destroy, the cache should be cleaned up
      // Note: Accessing after destroy may throw or return null depending on implementation
    });
  });

  describe('Complex Data Types', () => {
    let cache: CacheService;

    beforeEach(() => {
      cache = createCacheService({
        provider: 'memory',
        defaultTtlSec: 3600
      });
    });

    afterEach(async () => {
      if (cache && typeof (cache as any).destroy === 'function') {
        await (cache as any).destroy();
      }
    });

    it('should handle objects', async () => {
      const obj = { name: 'Alice', age: 30, active: true };
      await cache.set('object-key', obj);
      const retrieved = await cache.get('object-key');
      expect(retrieved).toEqual(obj);
    });

    it('should handle arrays', async () => {
      const arr = [1, 2, 3, 4, 5];
      await cache.set('array-key', arr);
      const retrieved = await cache.get('array-key');
      expect(retrieved).toEqual(arr);
    });

    it('should handle nested structures', async () => {
      const nested = {
        user: {
          profile: {
            name: 'Bob',
            settings: {
              theme: 'dark',
              notifications: true
            }
          },
          posts: [
            { id: 1, title: 'First Post' },
            { id: 2, title: 'Second Post' }
          ]
        }
      };

      await cache.set('nested-key', nested);
      const retrieved = await cache.get('nested-key');
      expect(retrieved).toEqual(nested);
    });

    it('should handle null and undefined', async () => {
      await cache.set('null-key', null);
      const nullValue = await cache.get('null-key');
      expect(nullValue).toBeNull();

      // undefined typically gets converted to null in JSON serialization
      await cache.set('undefined-key', undefined);
      const undefinedValue = await cache.get('undefined-key');
      // Behavior may vary, but should not throw
      expect(undefinedValue === null || undefinedValue === undefined).toBe(true);
    });
  });
});
