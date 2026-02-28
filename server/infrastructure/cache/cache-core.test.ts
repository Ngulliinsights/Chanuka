/**
 * Cache Core Unit Tests
 * Tests for cache key generation, invalidation, and warming strategies
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { cacheKeys } from './key-generator';
import {
  invalidationManager,
  WriteThroughInvalidation,
  TagBasedInvalidation,
  CascadeInvalidation,
  LazyInvalidation,
  BatchInvalidation,
  TTL,
} from './patterns/invalidation';
import {
  warmingManager,
  EagerWarming,
  LazyWarming,
  ScheduledWarming,
  PredictiveWarming,
  PriorityWarming,
} from './warming/strategies';
import type { InvalidationContext, WarmingContext } from './patterns/invalidation';

describe('Cache Key Generator', () => {
  describe('Entity Keys', () => {
    it('should generate property key', () => {
      const key = cacheKeys.property(123);
      expect(key).toContain('property');
      expect(key).toContain('123');
    });

    it('should generate user key', () => {
      const key = cacheKeys.user(456);
      expect(key).toContain('user');
      expect(key).toContain('456');
    });

    it('should generate unique keys for different entities', () => {
      const key1 = cacheKeys.property(1);
      const key2 = cacheKeys.property(2);
      expect(key1).not.toBe(key2);
    });
  });

  describe('List Keys', () => {
    it('should generate properties list key', () => {
      const key = cacheKeys.properties('filter1');
      expect(key).toContain('properties');
    });

    it('should generate different keys for different filters', () => {
      const key1 = cacheKeys.properties('filter1');
      const key2 = cacheKeys.properties('filter2');
      expect(key1).not.toBe(key2);
    });
  });

  describe('Search Keys', () => {
    it('should generate search results key', () => {
      const key = cacheKeys.searchResults('test query');
      expect(key).toContain('search');
    });

    it('should generate search suggestions key', () => {
      const key = cacheKeys.searchSuggestions('test');
      expect(key).toContain('suggestions');
    });
  });

  describe('User-Specific Keys', () => {
    it('should generate user session key', () => {
      const key = cacheKeys.userSession('session-123');
      expect(key).toContain('session');
      expect(key).toContain('session-123');
    });

    it('should generate user permissions key', () => {
      const key = cacheKeys.userPermissions(789);
      expect(key).toContain('permissions');
      expect(key).toContain('789');
    });
  });

  describe('Key Utilities', () => {
    it('should generate key with tags', () => {
      const result = cacheKeys.withTags('base:key', ['tag1', 'tag2']);
      expect(result.key).toBe('base:key');
      expect(result.tags).toHaveLength(2);
    });

    it('should generate time-based key', () => {
      const key1 = cacheKeys.withTimestamp('base:key', 5);
      const key2 = cacheKeys.withTimestamp('base:key', 5);
      expect(key1).toBe(key2); // Same interval
    });

    it('should generate user-specific key', () => {
      const key = cacheKeys.withUser('base:key', 123);
      expect(key).toContain('user');
      expect(key).toContain('123');
    });

    it('should generate versioned key', () => {
      const key = cacheKeys.withVersion('base:key', '1.0');
      expect(key).toContain('v1.0');
    });
  });

  describe('Key Validation', () => {
    it('should validate correct key format', () => {
      const key = 'app:feature:entity:123';
      expect(cacheKeys.validateKey(key)).toBe(true);
    });

    it('should reject keys with invalid characters', () => {
      const key = 'app:feature\n:entity';
      expect(cacheKeys.validateKey(key)).toBe(false);
    });

    it('should reject keys that are too long', () => {
      const key = 'a'.repeat(300);
      expect(cacheKeys.validateKey(key)).toBe(false);
    });

    it('should reject keys with insufficient structure', () => {
      const key = 'single';
      expect(cacheKeys.validateKey(key)).toBe(false);
    });
  });

  describe('Key Parsing', () => {
    it('should parse key components', () => {
      const key = 'app:property:123';
      const parsed = cacheKeys.parseKey(key);
      expect(parsed.type).toBe('property');
      expect(parsed.identifier).toBe('123');
    });
  });

  describe('Pattern Generation', () => {
    it('should generate wildcard pattern', () => {
      const pattern = cacheKeys.pattern('property');
      expect(pattern).toContain('property');
      expect(pattern).toContain('*');
    });
  });
});

describe('Cache Invalidation Strategies', () => {
  describe('WriteThroughInvalidation', () => {
    it('should invalidate entity and related lists', async () => {
      const strategy = new WriteThroughInvalidation();
      const context: InvalidationContext = {
        feature: 'property',
        entity: 'listing',
        id: 123,
      };

      const keys = await strategy.execute(context);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.some((k) => k.includes('123'))).toBe(true);
    });

    it('should invalidate related entities', async () => {
      const strategy = new WriteThroughInvalidation();
      const context: InvalidationContext = {
        feature: 'property',
        entity: 'listing',
        id: 123,
        relatedEntities: [
          { feature: 'user', entity: 'profile', id: 456 },
        ],
      };

      const keys = await strategy.execute(context);
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('TagBasedInvalidation', () => {
    it('should invalidate by tags', async () => {
      const strategy = new TagBasedInvalidation();
      const context: InvalidationContext = {
        feature: 'property',
        entity: 'listing',
        tags: ['featured', 'verified'],
      };

      const keys = await strategy.execute(context);
      expect(keys.length).toBe(2);
    });

    it('should return empty array when no tags', async () => {
      const strategy = new TagBasedInvalidation();
      const context: InvalidationContext = {
        feature: 'property',
        entity: 'listing',
      };

      const keys = await strategy.execute(context);
      expect(keys).toHaveLength(0);
    });
  });

  describe('CascadeInvalidation', () => {
    it('should invalidate entity and dependencies', async () => {
      const dependencyMap = new Map([
        ['property:listing', ['user:profile', 'review:summary']],
      ]);
      const strategy = new CascadeInvalidation(dependencyMap);
      const context: InvalidationContext = {
        feature: 'property',
        entity: 'listing',
        id: 123,
      };

      const keys = await strategy.execute(context);
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('LazyInvalidation', () => {
    it('should mark keys as stale', async () => {
      const strategy = new LazyInvalidation();
      const context: InvalidationContext = {
        feature: 'property',
        entity: 'listing',
        id: 123,
      };

      const keys = await strategy.execute(context);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys[0]).toContain('stale');
    });
  });

  describe('BatchInvalidation', () => {
    it('should batch multiple invalidations', async () => {
      const strategy = new BatchInvalidation();
      const context: InvalidationContext = {
        feature: 'property',
        entity: 'listing',
        id: 123,
      };

      const keys = await strategy.execute(context);
      expect(Array.isArray(keys)).toBe(true);
    });
  });

  describe('InvalidationManager', () => {
    it('should use default strategy when none specified', async () => {
      const context: InvalidationContext = {
        feature: 'property',
        entity: 'listing',
        id: 123,
      };

      const keys = await invalidationManager.invalidate(context);
      expect(Array.isArray(keys)).toBe(true);
    });

    it('should use specified strategy', async () => {
      const context: InvalidationContext = {
        feature: 'property',
        entity: 'listing',
        tags: ['test'],
      };

      const keys = await invalidationManager.invalidate(context, 'tag-based');
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('TTL Constants', () => {
    it('should provide standard TTL values', () => {
      expect(TTL.FIVE_MINUTES).toBe(300);
      expect(TTL.ONE_HOUR).toBe(3600);
      expect(TTL.ONE_DAY).toBe(86400);
    });
  });
});

describe('Cache Warming Strategies', () => {
  const mockDataLoader = async () => [{ id: 1 }, { id: 2 }, { id: 3 }];

  describe('EagerWarming', () => {
    it('should warm cache immediately', async () => {
      const strategy = new EagerWarming();
      const context: WarmingContext = {
        feature: 'property',
        entity: 'listing',
        dataLoader: mockDataLoader,
      };

      const result = await strategy.execute(context);
      expect(result.success).toBe(true);
      expect(result.itemsWarmed).toBe(3);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', async () => {
      const strategy = new EagerWarming();
      const context: WarmingContext = {
        feature: 'property',
        entity: 'listing',
        dataLoader: async () => {
          throw new Error('Load failed');
        },
      };

      const result = await strategy.execute(context);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('LazyWarming', () => {
    it('should warm cache on first access', async () => {
      const strategy = new LazyWarming();
      const context: WarmingContext = {
        feature: 'property',
        entity: 'listing',
        dataLoader: mockDataLoader,
      };

      const result1 = await strategy.execute(context);
      expect(result1.success).toBe(true);
      expect(result1.itemsWarmed).toBe(3);

      // Second call should skip warming
      const result2 = await strategy.execute(context);
      expect(result2.itemsWarmed).toBe(0);
    });
  });

  describe('ScheduledWarming', () => {
    it('should execute warming immediately', async () => {
      const strategy = new ScheduledWarming();
      const context: WarmingContext = {
        feature: 'property',
        entity: 'listing',
        dataLoader: mockDataLoader,
        schedule: '*/5 * * * *',
      };

      const result = await strategy.execute(context);
      expect(result.success).toBe(true);
      expect(result.itemsWarmed).toBe(3);

      // Clean up
      strategy.stopAll();
    });
  });

  describe('PredictiveWarming', () => {
    it('should warm based on access patterns', async () => {
      const strategy = new PredictiveWarming();
      const context: WarmingContext = {
        feature: 'property',
        entity: 'listing',
        dataLoader: mockDataLoader,
      };

      const result = await strategy.execute(context);
      expect(result.success).toBe(true);
    });

    it('should record access patterns', () => {
      const strategy = new PredictiveWarming();
      strategy.recordAccess('property', 'listing');
      strategy.recordAccess('property', 'listing');
      // No assertion needed, just verify it doesn't throw
    });
  });

  describe('PriorityWarming', () => {
    it('should warm high priority items first', async () => {
      const strategy = new PriorityWarming();
      const context: WarmingContext = {
        feature: 'property',
        entity: 'listing',
        dataLoader: mockDataLoader,
        priority: 'high',
      };

      const result = await strategy.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('WarmingManager', () => {
    it('should use default strategy when none specified', async () => {
      const context: WarmingContext = {
        feature: 'property',
        entity: 'listing',
        dataLoader: mockDataLoader,
      };

      const result = await warmingManager.warm(context);
      expect(result.success).toBe(true);
    });

    it('should use specified strategy', async () => {
      const context: WarmingContext = {
        feature: 'property',
        entity: 'listing',
        dataLoader: mockDataLoader,
      };

      const result = await warmingManager.warm(context, 'eager');
      expect(result.success).toBe(true);
      expect(result.itemsWarmed).toBe(3);
    });
  });
});
