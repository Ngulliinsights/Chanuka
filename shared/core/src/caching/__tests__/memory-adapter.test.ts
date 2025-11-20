import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Memory Adapter Tests
 */

import { MemoryAdapter } from '../adapters/memory-adapter';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter({
      provider: 'memory',
      maxMemoryMB: 10,
      enableMetrics: true,
      keyPrefix: 'test',
      defaultTtlSec: 300,
      enableCompression: false,
      compressionThreshold: 1024,
    });
  });

  afterEach(async () => {
    await adapter.clear();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await adapter.set('test-key', 'test-value');
      const result = await adapter.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const result = await adapter.get('non-existent');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      await adapter.set('test-key', 'test-value');
      await adapter.del('test-key');
      const result = await adapter.get('test-key');
      expect(result).toBeNull();
    });

    it('should check existence', async () => {
      await adapter.set('test-key', 'test-value');
      expect(await adapter.exists('test-key')).toBe(true);
      expect(await adapter.exists('non-existent')).toBe(false);
    });
  });

  describe('TTL Operations', () => {
    it('should respect TTL', async () => {
      await adapter.set('ttl-key', 'ttl-value', 1);
      expect(await adapter.get('ttl-key')).toBe('ttl-value');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(await adapter.get('ttl-key')).toBeNull();
    });

    it('should get TTL for keys', async () => {
      await adapter.set('ttl-key', 'ttl-value', 10);
      const ttl = await adapter.ttl('ttl-key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });
  });

  describe('Batch Operations', () => {
    it('should handle mget operations', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const results = await adapter.mget(['key1', 'key2', 'key3']);
      expect(results).toEqual(['value1', 'value2', null]);
    });

    it('should handle mset operations', async () => {
      await adapter.mset([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3', 60]
      ]);

      expect(await adapter.get('key1')).toBe('value1');
      expect(await adapter.get('key2')).toBe('value2');
      expect(await adapter.get('key3')).toBe('value3');
    });
  });

  describe('Tag-based Operations', () => {
    it('should invalidate by tags', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      await adapter.addToTags('key1', ['tag1']);
      await adapter.addToTags('key2', ['tag1', 'tag2']);

      await adapter.invalidateByTags(['tag1']);

      expect(await adapter.get('key1')).toBeNull();
      expect(await adapter.get('key2')).toBeNull();
    });

    it('should get entries by tag', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      await adapter.addToTags('key1', ['tag1']);
      await adapter.addToTags('key2', ['tag2']);

      const tag1Entries = await adapter.getByTag('tag1');
      const tag2Entries = await adapter.getByTag('tag2');

      expect(tag1Entries).toHaveLength(1);
      expect(tag1Entries[0].key).toBe('test:key1');
      expect(tag1Entries[0].data).toBe('value1');

      expect(tag2Entries).toHaveLength(1);
      expect(tag2Entries[0].key).toBe('test:key2');
      expect(tag2Entries[0].data).toBe('value2');
    });
  });

  describe('Pattern-based Operations', () => {
    it('should invalidate by pattern', async () => {
      await adapter.set('user:1', 'user1');
      await adapter.set('user:2', 'user2');
      await adapter.set('post:1', 'post1');

      await adapter.invalidateByPattern('user:*');

      expect(await adapter.get('user:1')).toBeNull();
      expect(await adapter.get('user:2')).toBeNull();
      expect(await adapter.get('post:1')).toBe('post1');
    });
  });

  describe('Metrics', () => {
    it('should track metrics', async () => {
      await adapter.set('key1', 'value1');
      await adapter.get('key1'); // hit
      await adapter.get('key2'); // miss

      const metrics = adapter.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.operations).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const health = await adapter.getHealth();
      expect(health.connected).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.stats).toBeDefined();
    });
  });

  describe('Preload', () => {
    it('should preload data', async () => {
      await adapter.preload([
        {
          key: 'preload1',
          factory: async () => 'preloaded1'
        },
        {
          key: 'preload2',
          factory: async () => 'preloaded2'
        }
      ]);

      expect(await adapter.get('preload1')).toBe('preloaded1');
      expect(await adapter.get('preload2')).toBe('preloaded2');
    });
  });

  describe('Export/Import', () => {
    it('should export and import data', async () => {
      await adapter.set('export1', 'value1');
      await adapter.set('export2', 'value2');

      const exported = adapter.export();
      await adapter.clear();

      expect(await adapter.get('export1')).toBeNull();

      await adapter.import(exported);

      expect(await adapter.get('export1')).toBe('value1');
      expect(await adapter.get('export2')).toBe('value2');
    });
  });
});








































