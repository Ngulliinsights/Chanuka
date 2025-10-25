import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Cache Factory Tests
 */

import { createCacheService, initializeDefaultCache, getDefaultCache, resetDefaultCache, createCacheManager } from '../factory';

describe('Cache Factory', () => {
  afterEach(() => {
    resetDefaultCache();
  });

  describe('createCacheService', () => {
    it('should create memory cache service', () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
        enableMetrics: true,
        enableCompression: false,
        compressionThreshold: 1024,
      };

      const cache = createCacheService(config);
      expect(cache).toBeDefined();
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
    });

    it('should create redis cache service', () => {
      const config = {
        provider: 'redis' as const,
        redisUrl: 'redis://localhost:6379',
        maxMemoryMB: 10,
        defaultTtlSec: 300,
        enableMetrics: true,
        enableCompression: false,
        compressionThreshold: 1024,
      };

      const cache = createCacheService(config);
      expect(cache).toBeDefined();
    });

    it('should create multi-tier cache service', () => {
      const config = {
        provider: 'multi-tier' as const,
        redisUrl: 'redis://localhost:6379',
        maxMemoryMB: 10,
        defaultTtlSec: 300,
        enableMetrics: true,
        enableCompression: false,
        compressionThreshold: 1024,
      };

      const cache = createCacheService(config);
      expect(cache).toBeDefined();
    });

    it('should throw error for unsupported provider', () => {
      const config = {
        provider: 'unsupported' as any,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
      };

      expect(() => createCacheService(config)).toThrow('Unsupported cache provider');
    });

    it('should wrap with SingleFlightCache when circuit breaker is enabled', () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 60000,
      };

      const cache = createCacheService(config);
      expect(cache).toBeDefined();
      // Should have circuit breaker methods
      expect(typeof (cache as any).getCircuitBreakerState).toBe('function');
    });
  });

  describe('Default Cache Management', () => {
    it('should initialize and get default cache', () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
      };

      const cache = initializeDefaultCache(config);
      expect(cache).toBeDefined();

      const defaultCache = getDefaultCache();
      expect(defaultCache).toBe(cache);
    });

    it('should throw error when getting uninitialized default cache', () => {
      expect(() => getDefaultCache()).toThrow('Default cache not initialized');
    });

    it('should reset default cache', () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
      };

      initializeDefaultCache(config);
      expect(() => getDefaultCache()).not.toThrow();

      resetDefaultCache();
      expect(() => getDefaultCache()).toThrow('Default cache not initialized');
    });
  });

  describe('Cache Manager', () => {
    it('should create cache manager', () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
      };

      const cache = createCacheService(config);
      const manager = createCacheManager(cache);

      expect(manager).toBeDefined();
      expect(typeof manager.warmUp).toBe('function');
      expect(typeof manager.getStats).toBe('function');
      expect(typeof manager.getHealth).toBe('function');
      expect(typeof manager.clear).toBe('function');
    });

    it('should create cache manager with default cache', () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
      };

      initializeDefaultCache(config);
      const manager = createCacheManager();

      expect(manager).toBeDefined();
    });

    it('should warm up cache', async () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
      };

      const cache = createCacheService(config);
      const manager = createCacheManager(cache);

      await manager.warmUp([
        {
          key: 'warmup1',
          factory: async () => 'warmed1',
          ttl: 60,
        },
        {
          key: 'warmup2',
          factory: async () => 'warmed2',
        },
      ]);

      expect(await cache.get('warmup1')).toBe('warmed1');
      expect(await cache.get('warmup2')).toBe('warmed2');
    });

    it('should get cache statistics', () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
      };

      const cache = createCacheService(config);
      const manager = createCacheManager(cache);

      const stats = manager.getStats();
      expect(stats).toBeDefined();
    });

    it('should get cache health', async () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
      };

      const cache = createCacheService(config);
      const manager = createCacheManager(cache);

      const health = await manager.getHealth();
      expect(health).toBeDefined();
    });

    it('should clear cache', async () => {
      const config = {
        provider: 'memory' as const,
        maxMemoryMB: 10,
        defaultTtlSec: 300,
      };

      const cache = createCacheService(config);
      const manager = createCacheManager(cache);

      await cache.set('test', 'value');
      expect(await cache.get('test')).toBe('value');

      await manager.clear();
      expect(await cache.get('test')).toBeNull();
    });
  });
});




































