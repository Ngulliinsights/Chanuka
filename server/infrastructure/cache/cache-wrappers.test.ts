/**
 * Cache Wrappers Tests
 * Tests for cache warming and advanced caching services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheWarmingService, cacheWarmingService } from './cache-wrappers';
import { createSimpleCacheService } from './factory';
import type { CacheService } from './core/interfaces';

describe('CacheWarmingService', () => {
  let cache: CacheService;
  let warmingService: CacheWarmingService;

  beforeEach(() => {
    cache = createSimpleCacheService({
      defaultTtlSec: 3600,
      maxMemoryMB: 100
    });
    warmingService = new CacheWarmingService(cache);
  });

  afterEach(async () => {
    if (cache.clear) {
      await cache.clear();
    }
  });

  describe('warmCache', () => {
    it('should warm cache with factory functions', async () => {
      const entries = [
        {
          key: 'user:1',
          factory: async () => ({ id: 1, name: 'Alice' }),
          ttl: 300
        },
        {
          key: 'user:2',
          factory: async () => ({ id: 2, name: 'Bob' })
        },
        {
          key: 'config:app',
          factory: async () => ({ theme: 'dark', language: 'en' }),
          ttl: 600
        }
      ];

      await warmingService.warmCache(entries);

      // Verify all entries were cached
      const user1 = await cache.get('user:1');
      const user2 = await cache.get('user:2');
      const config = await cache.get('config:app');

      expect(user1).toEqual({ id: 1, name: 'Alice' });
      expect(user2).toEqual({ id: 2, name: 'Bob' });
      expect(config).toEqual({ theme: 'dark', language: 'en' });
    });

    it('should skip existing keys during warm up', async () => {
      // Pre-populate cache
      await cache.set('existing-key', 'original-value');

      const factoryCalled = vi.fn().mockResolvedValue('new-value');

      await warmingService.warmCache([
        {
          key: 'existing-key',
          factory: factoryCalled
        }
      ]);

      // Factory should not be called for existing key
      expect(factoryCalled).not.toHaveBeenCalled();

      // Original value should remain
      const value = await cache.get('existing-key');
      expect(value).toBe('original-value');
    });

    it('should handle factory errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const entries = [
        {
          key: 'success-key',
          factory: async () => 'success-value'
        },
        {
          key: 'error-key',
          factory: async () => {
            throw new Error('Factory failed');
          }
        },
        {
          key: 'another-success-key',
          factory: async () => 'another-success'
        }
      ];

      // Should not throw, but continue warming other entries
      await warmingService.warmCache(entries);

      // Successful entries should be cached
      const successValue = await cache.get('success-key');
      const anotherSuccessValue = await cache.get('another-success-key');
      const errorValue = await cache.get('error-key');

      expect(successValue).toBe('success-value');
      expect(anotherSuccessValue).toBe('another-success');
      expect(errorValue).toBeNull();

      // Warning should be logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to warm up cache key error-key'),
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should warm cache with different data types', async () => {
      const entries = [
        {
          key: 'string-value',
          factory: async () => 'simple string'
        },
        {
          key: 'number-value',
          factory: async () => 42
        },
        {
          key: 'boolean-value',
          factory: async () => true
        },
        {
          key: 'array-value',
          factory: async () => [1, 2, 3, 4, 5]
        },
        {
          key: 'object-value',
          factory: async () => ({ nested: { data: 'value' } })
        },
        {
          key: 'null-value',
          factory: async () => null
        }
      ];

      await warmingService.warmCache(entries);

      expect(await cache.get('string-value')).toBe('simple string');
      expect(await cache.get('number-value')).toBe(42);
      expect(await cache.get('boolean-value')).toBe(true);
      expect(await cache.get('array-value')).toEqual([1, 2, 3, 4, 5]);
      expect(await cache.get('object-value')).toEqual({ nested: { data: 'value' } });
      expect(await cache.get('null-value')).toBeNull();
    });

    it('should handle empty entries array', async () => {
      await warmingService.warmCache([]);

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should warm cache with custom TTL values', async () => {
      const entries = [
        {
          key: 'short-ttl',
          factory: async () => 'expires-soon',
          ttl: 1 // 1 second
        },
        {
          key: 'long-ttl',
          factory: async () => 'expires-later',
          ttl: 3600 // 1 hour
        }
      ];

      await warmingService.warmCache(entries);

      // Both should be cached initially
      expect(await cache.get('short-ttl')).toBe('expires-soon');
      expect(await cache.get('long-ttl')).toBe('expires-later');

      // Wait for short TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Short TTL should be expired, long TTL should remain
      expect(await cache.get('short-ttl')).toBeNull();
      expect(await cache.get('long-ttl')).toBe('expires-later');
    });

    it('should handle async factory functions with delays', async () => {
      const entries = [
        {
          key: 'delayed-1',
          factory: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'delayed-value-1';
          }
        },
        {
          key: 'delayed-2',
          factory: async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'delayed-value-2';
          }
        }
      ];

      const startTime = Date.now();
      await warmingService.warmCache(entries);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (sequential execution)
      expect(duration).toBeGreaterThanOrEqual(150);
      expect(duration).toBeLessThan(300);

      expect(await cache.get('delayed-1')).toBe('delayed-value-1');
      expect(await cache.get('delayed-2')).toBe('delayed-value-2');
    });

    it('should handle cache without exists method', async () => {
      // Create a cache without exists method
      const minimalCache = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined)
      } as any;

      const service = new CacheWarmingService(minimalCache);

      await service.warmCache([
        {
          key: 'test-key',
          factory: async () => 'test-value'
        }
      ]);

      // Should still call set since exists is optional
      expect(minimalCache.set).toHaveBeenCalledWith('test-key', 'test-value', undefined);
    });
  });

  describe('cacheWarmingService singleton', () => {
    it('should be a pre-configured instance', () => {
      expect(cacheWarmingService).toBeInstanceOf(CacheWarmingService);
    });

    it('should work with default cache', async () => {
      const entries = [
        {
          key: 'singleton-test',
          factory: async () => 'singleton-value'
        }
      ];

      await cacheWarmingService.warmCache(entries);

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should warm cache on application startup', async () => {
      // Simulate application startup cache warming
      const startupData = [
        {
          key: 'config:database',
          factory: async () => ({
            host: 'localhost',
            port: 5432,
            database: 'myapp'
          })
        },
        {
          key: 'config:redis',
          factory: async () => ({
            host: 'localhost',
            port: 6379
          })
        },
        {
          key: 'feature-flags',
          factory: async () => ({
            newFeature: true,
            betaFeature: false
          })
        }
      ];

      await warmingService.warmCache(startupData);

      // Verify all startup data is cached
      const dbConfig = await cache.get('config:database');
      const redisConfig = await cache.get('config:redis');
      const featureFlags = await cache.get('feature-flags');

      expect(dbConfig).toBeDefined();
      expect(redisConfig).toBeDefined();
      expect(featureFlags).toBeDefined();
    });

    it('should handle large batch warming', async () => {
      // Generate 100 entries
      const entries = Array.from({ length: 100 }, (_, i) => ({
        key: `batch-key-${i}`,
        factory: async () => ({ index: i, data: `value-${i}` })
      }));

      await warmingService.warmCache(entries);

      // Spot check some entries
      const first = await cache.get('batch-key-0');
      const middle = await cache.get('batch-key-50');
      const last = await cache.get('batch-key-99');

      expect(first).toEqual({ index: 0, data: 'value-0' });
      expect(middle).toEqual({ index: 50, data: 'value-50' });
      expect(last).toEqual({ index: 99, data: 'value-99' });
    });
  });
});
