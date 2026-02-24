// ============================================================================
// ARGUMENT INTELLIGENCE - NLP Cache Tests
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NLPCache, NLPCacheManager } from '../infrastructure/cache/nlp-cache';

describe('NLPCache', () => {
  let cache: NLPCache<string>;

  beforeEach(() => {
    cache = new NLPCache<string>({
      ttl: 60, // 1 minute for testing
      maxSize: 5,
      enabled: true
    });
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      const value = cache.get('key1');

      expect(value).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      const value = cache.get('nonexistent');
      expect(value).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete values', () => {
      cache.set('key1', 'value1');
      const deleted = cache.delete('key1');

      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new NLPCache<string>({
        ttl: 0.1, // 100ms
        maxSize: 10,
        enabled: true
      });

      shortCache.set('key1', 'value1');
      expect(shortCache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(shortCache.get('key1')).toBeNull();
    });

    it('should prune expired entries', async () => {
      const shortCache = new NLPCache<string>({
        ttl: 0.1,
        maxSize: 10,
        enabled: true
      });

      shortCache.set('key1', 'value1');
      shortCache.set('key2', 'value2');

      await new Promise(resolve => setTimeout(resolve, 150));

      const pruned = shortCache.pruneExpired();
      expect(pruned).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entry when full', () => {
      // Fill cache to max size
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');

      // Access key1 to make it recently used
      cache.get('key1');

      // Add new entry, should evict key2 (least recently used)
      cache.set('key6', 'value6');

      expect(cache.get('key1')).toBe('value1'); // Still exists
      expect(cache.get('key2')).toBeNull(); // Evicted
      expect(cache.get('key6')).toBe('value6'); // New entry
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // Hit
      cache.get('key2'); // Miss
      cache.get('key1'); // Hit

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should track cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.itemCount).toBe(2);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('getOrCompute', () => {
    it('should return cached value if exists', async () => {
      cache.set('key1', 'cached');

      const computeFn = vi.fn().mockResolvedValue('computed');
      const result = await cache.getOrCompute('key1', computeFn);

      expect(result).toBe('cached');
      expect(computeFn).not.toHaveBeenCalled();
    });

    it('should compute and cache value if not exists', async () => {
      const computeFn = vi.fn().mockResolvedValue('computed');
      const result = await cache.getOrCompute('key1', computeFn);

      expect(result).toBe('computed');
      expect(computeFn).toHaveBeenCalledOnce();
      expect(cache.get('key1')).toBe('computed');
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = NLPCache.generateKey('sentiment', 'test text');
      const key2 = NLPCache.generateKey('sentiment', 'test text');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different input', () => {
      const key1 = NLPCache.generateKey('sentiment', 'text1');
      const key2 = NLPCache.generateKey('sentiment', 'text2');

      expect(key1).not.toBe(key2);
    });

    it('should include parameters in key', () => {
      const key1 = NLPCache.generateKey('sentiment', 'text', { param: 1 });
      const key2 = NLPCache.generateKey('sentiment', 'text', { param: 2 });

      expect(key1).not.toBe(key2);
    });
  });

  describe('configuration', () => {
    it('should respect enabled flag', () => {
      const disabledCache = new NLPCache<string>({
        enabled: false
      });

      disabledCache.set('key1', 'value1');
      const value = disabledCache.get('key1');

      expect(value).toBeNull();
    });

    it('should update configuration', () => {
      cache.updateConfig({ ttl: 120 });
      const config = cache.getConfig();

      expect(config.ttl).toBe(120);
    });

    it('should clear cache when disabled', () => {
      cache.set('key1', 'value1');
      cache.updateConfig({ enabled: false });

      expect(cache.get('key1')).toBeNull();
    });
  });
});

describe('NLPCacheManager', () => {
  let manager: NLPCacheManager;

  beforeEach(() => {
    manager = new NLPCacheManager({
      ttl: 60,
      maxSize: 10,
      enabled: true
    });
  });

  describe('cache access', () => {
    it('should provide access to sentiment cache', () => {
      const cache = manager.getSentimentCache();
      expect(cache).toBeDefined();

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should provide access to clustering cache', () => {
      const cache = manager.getClusteringCache();
      expect(cache).toBeDefined();
    });

    it('should provide access to quality cache', () => {
      const cache = manager.getQualityCache();
      expect(cache).toBeDefined();
    });

    it('should provide access to similarity cache', () => {
      const cache = manager.getSimilarityCache();
      expect(cache).toBeDefined();
    });

    it('should provide access to entity cache', () => {
      const cache = manager.getEntityCache();
      expect(cache).toBeDefined();
    });
  });

  describe('clearAll', () => {
    it('should clear all caches', () => {
      manager.getSentimentCache().set('key1', 'value1');
      manager.getClusteringCache().set('key2', 'value2');

      manager.clearAll();

      expect(manager.getSentimentCache().get('key1')).toBeNull();
      expect(manager.getClusteringCache().get('key2')).toBeNull();
    });
  });

  describe('getAllStats', () => {
    it('should return combined statistics', () => {
      manager.getSentimentCache().set('key1', 'value1');
      manager.getClusteringCache().set('key2', 'value2');

      manager.getSentimentCache().get('key1'); // Hit
      manager.getClusteringCache().get('key3'); // Miss

      const stats = manager.getAllStats();

      expect(stats.total.hits).toBe(1);
      expect(stats.total.misses).toBe(1);
      expect(stats.total.totalItems).toBe(2);
    });
  });

  describe('pruneAllExpired', () => {
    it('should prune expired entries from all caches', async () => {
      const shortManager = new NLPCacheManager({
        ttl: 0.1,
        maxSize: 10,
        enabled: true
      });

      shortManager.getSentimentCache().set('key1', 'value1');
      shortManager.getClusteringCache().set('key2', 'value2');

      await new Promise(resolve => setTimeout(resolve, 150));

      const pruned = shortManager.pruneAllExpired();
      expect(pruned).toBe(2);
    });
  });
});
