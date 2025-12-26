import { beforeEach,describe, expect, it } from 'vitest';

import { LRUCache } from './lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  describe('constructor', () => {
    it('should create a cache with the specified max size', () => {
      expect(cache.getMaxSize()).toBe(3);
      expect(cache.size()).toBe(0);
      expect(cache.isEmpty()).toBe(true);
    });

    it('should throw error for invalid max size', () => {
      expect(() => new LRUCache<string, number>(0)).toThrow('Max size must be greater than 0');
      expect(() => new LRUCache<string, number>(-1)).toThrow('Max size must be greater than 0');
    });
  });

  describe('set and get', () => {
    it('should set and get values correctly', () => {
      expect(cache.set('a', 1)).toBe(true);
      expect(cache.set('b', 2)).toBe(true);
      expect(cache.set('c', 3)).toBe(true);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.size()).toBe(3);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing values', () => {
      cache.set('a', 1);
      cache.set('a', 10);
      
      expect(cache.get('a')).toBe(10);
      expect(cache.size()).toBe(1);
    });

    it('should move accessed items to front', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to move it to front
      cache.get('a');

      const keys = cache.keys();
      expect(keys[0]).toBe('a'); // Should be most recently used
    });
  });

  describe('eviction', () => {
    it('should evict least recently used item when full', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      // Cache is now full, adding 'd' should evict 'a'
      cache.set('d', 4);

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
      expect(cache.size()).toBe(3);
    });

    it('should evict correctly after access pattern', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to make it most recently used
      cache.get('a');

      // Add 'd', should evict 'b' (least recently used)
      cache.set('d', 4);

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should handle complex access patterns', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access pattern: c, a, b
      cache.get('c');
      cache.get('a');
      cache.get('b');

      // Order should now be: b (MRU), a, c (LRU)
      const keys = cache.keys();
      expect(keys).toEqual(['b', 'a', 'c']);

      // Add 'd', should evict 'c'
      cache.set('d', 4);
      expect(cache.has('c')).toBe(false);
      expect(cache.keys()).toEqual(['d', 'b', 'a']);
    });
  });

  describe('has', () => {
    it('should check existence without affecting order', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const keysBefore = cache.keys();
      
      expect(cache.has('b')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);

      const keysAfter = cache.keys();
      expect(keysBefore).toEqual(keysAfter); // Order should not change
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.delete('b')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.size()).toBe(2);
      expect(cache.keys()).toEqual(['c', 'a']);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should handle deleting head node', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      
      expect(cache.delete('b')).toBe(true); // Delete head
      expect(cache.keys()).toEqual(['a']);
    });

    it('should handle deleting tail node', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      
      expect(cache.delete('a')).toBe(true); // Delete tail
      expect(cache.keys()).toEqual(['b']);
    });
  });

  describe('clear', () => {
    it('should remove all items', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.isEmpty()).toBe(true);
      expect(cache.keys()).toEqual([]);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('size and capacity', () => {
    it('should track size correctly', () => {
      expect(cache.size()).toBe(0);
      expect(cache.isEmpty()).toBe(true);
      expect(cache.isFull()).toBe(false);

      cache.set('a', 1);
      expect(cache.size()).toBe(1);
      expect(cache.isEmpty()).toBe(false);
      expect(cache.isFull()).toBe(false);

      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.size()).toBe(3);
      expect(cache.isFull()).toBe(true);

      cache.delete('a');
      expect(cache.size()).toBe(2);
      expect(cache.isFull()).toBe(false);
    });
  });

  describe('keys, values, and entries', () => {
    it('should return keys in MRU to LRU order', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.keys()).toEqual(['c', 'b', 'a']);
    });

    it('should return values in MRU to LRU order', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.values()).toEqual([3, 2, 1]);
    });

    it('should return entries in MRU to LRU order', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.entries()).toEqual([['c', 3], ['b', 2], ['a', 1]]);
    });

    it('should return empty arrays when cache is empty', () => {
      expect(cache.keys()).toEqual([]);
      expect(cache.values()).toEqual([]);
      expect(cache.entries()).toEqual([]);
    });
  });

  describe('peek operations', () => {
    it('should peek at MRU and LRU items', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.peekMRU()).toEqual(['c', 3]);
      expect(cache.peekLRU()).toEqual(['a', 1]);
    });

    it('should return undefined when cache is empty', () => {
      expect(cache.peekMRU()).toBeUndefined();
      expect(cache.peekLRU()).toBeUndefined();
    });

    it('should not affect order when peeking', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      const keysBefore = cache.keys();
      cache.peekMRU();
      cache.peekLRU();
      const keysAfter = cache.keys();

      expect(keysBefore).toEqual(keysAfter);
    });
  });

  describe('statistics', () => {
    it('should provide accurate statistics', () => {
      const beforeTime = Date.now();
      
      cache.set('a', 1);
      cache.set('b', 2);

      const afterTime = Date.now();
      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.utilizationPercent).toBeCloseTo(66.67, 1);
      expect(stats.oldestTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.oldestTimestamp).toBeLessThanOrEqual(afterTime);
      expect(stats.newestTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.newestTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle empty cache statistics', () => {
      const stats = cache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(3);
      expect(stats.utilizationPercent).toBe(0);
      expect(stats.oldestTimestamp).toBeNull();
      expect(stats.newestTimestamp).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle single item cache', () => {
      const singleCache = new LRUCache<string, number>(1);

      singleCache.set('a', 1);
      expect(singleCache.get('a')).toBe(1);
      expect(singleCache.isFull()).toBe(true);

      singleCache.set('b', 2);
      expect(singleCache.has('a')).toBe(false);
      expect(singleCache.get('b')).toBe(2);
    });

    it('should handle updating values in full cache', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Update existing value should not cause eviction
      cache.set('a', 10);
      
      expect(cache.size()).toBe(3);
      expect(cache.get('a')).toBe(10);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
    });

    it('should handle rapid set/get operations', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i % 5}`, i);
        cache.get(`key${(i + 1) % 5}`);
      }

      expect(cache.size()).toBeLessThanOrEqual(3);
    });

    it('should maintain consistency after many operations', () => {
      const operations = [
        () => cache.set('a', 1),
        () => cache.set('b', 2),
        () => cache.get('a'),
        () => cache.set('c', 3),
        () => cache.delete('b'),
        () => cache.set('d', 4),
        () => cache.get('c'),
        () => cache.set('e', 5),
      ];

      operations.forEach(op => op());

      // Verify internal consistency
      const keys = cache.keys();
      const values = cache.values();
      const entries = cache.entries();

      expect(keys.length).toBe(values.length);
      expect(keys.length).toBe(entries.length);
      expect(cache.size()).toBe(keys.length);

      // Verify each key can be retrieved
      keys.forEach((key, index) => {
        expect(cache.has(key)).toBe(true);
        expect(cache.get(key)).toBe(values[index]);
      });
    });
  });

  describe('type safety', () => {
    it('should work with different key and value types', () => {
      const numberCache = new LRUCache<number, string>(2);
      const objectCache = new LRUCache<string, { id: number; name: string }>(2);

      numberCache.set(1, 'one');
      numberCache.set(2, 'two');
      expect(numberCache.get(1)).toBe('one');

      objectCache.set('user1', { id: 1, name: 'Alice' });
      objectCache.set('user2', { id: 2, name: 'Bob' });
      expect(objectCache.get('user1')).toEqual({ id: 1, name: 'Alice' });
    });
  });
});