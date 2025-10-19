/**
 * AI Cache Tests
 * 
 * Tests for intelligent AI caching including:
 * - Content-aware caching
 * - Cost-aware cache policies
 * - Adaptive TTL calculation
 * - Cache warming
 * - Metrics and monitoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AICache,
  createAICache,
  getDefaultAICache,
  setDefaultAICache,
  AICacheOptions,
  AICacheEntry
} from '../ai-cache';
import { CacheService } from '../types';
import { logger } from '../../observability/logging';

describe('AI Cache', () => {
  let mockBaseCache: CacheService;
  let aiCache: AICache;

  beforeEach(() => {
    // Mock base cache
    mockBaseCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      has: vi.fn(),
      clear: vi.fn(),
      keys: vi.fn(),
      size: vi.fn(),
      getHealth: vi.fn(),
      invalidateByPattern: vi.fn()
    };

    // Create AI cache instance
    aiCache = new AICache({
      baseCache: mockBaseCache,
      enableCostAwareCaching: true,
      enableAdaptiveTTL: true,
      enableCacheWarming: true,
      defaultTTL: 300,
      maxTTL: 3600,
      minTTL: 60
    });

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Cache Operations', () => {
    it('should get cached AI response', async () => {
      const cacheEntry: AICacheEntry = {
        data: { value: 1000000, confidence: 0.85 },
        timestamp: Date.now(),
        cost: 5,
        hitCount: 0,
        lastAccessed: Date.now(),
        ttl: 300,
        service: 'property-analysis',
        operation: 'valuation',
        inputHash: 'test-hash'
      };

      mockBaseCache.get = vi.fn().mockResolvedValue(cacheEntry);
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      const result = await aiCache.get(
        'test-key',
        'property-analysis',
        'valuation'
      );

      expect(result).toEqual(cacheEntry.data);
      expect(mockBaseCache.get).toHaveBeenCalled();
      expect(mockBaseCache.set).toHaveBeenCalled(); // Should update hit count
      expect(cacheEntry.hitCount).toBe(1);
    });

    it('should return null when no cache hit', async () => {
      mockBaseCache.get = vi.fn().mockResolvedValue(null);

      const result = await aiCache.get(
        'test-key',
        'property-analysis',
        'valuation'
      );

      expect(result).toBeNull();
      expect(mockBaseCache.get).toHaveBeenCalled();
    });

    it('should set AI response in cache', async () => {
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      await aiCache.set(
        'test-key',
        { value: 1000000, confidence: 0.85 },
        'property-analysis',
        'valuation',
        {
          cost: 5,
          accuracy: 0.85,
          inputData: { propertyId: '123' }
        }
      );

      expect(mockBaseCache.set).toHaveBeenCalledWith(
        expect.stringContaining('ai_cache:property-analysis:valuation:'),
        expect.objectContaining({
          data: { value: 1000000, confidence: 0.85 },
          cost: 5,
          accuracy: 0.85,
          service: 'property-analysis',
          operation: 'valuation'
        }),
        expect.any(Number)
      );
    });

    it('should handle cache errors gracefully', async () => {
      mockBaseCache.get = vi.fn().mockRejectedValue(new Error('Cache error'));

      const result = await aiCache.get(
        'test-key',
        'property-analysis',
        'valuation'
      );

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'AI cache get error:',
        expect.any(Error)
      );
    });
  });

  describe('TTL Calculation', () => {
    it('should calculate cost-aware TTL', async () => {
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      // High cost operation should get longer TTL
      await aiCache.set(
        'expensive-key',
        { result: 'expensive-analysis' },
        'property-analysis',
        'valuation',
        { cost: 100 }
      );

      const expensiveCall = mockBaseCache.set.mock.calls[0];
      const expensiveTTL = expensiveCall[2];

      // Low cost operation should get shorter TTL
      await aiCache.set(
        'cheap-key',
        { result: 'cheap-analysis' },
        'property-analysis',
        'valuation',
        { cost: 1 }
      );

      const cheapCall = mockBaseCache.set.mock.calls[1];
      const cheapTTL = cheapCall[2];

      expect(expensiveTTL).toBeGreaterThan(cheapTTL);
    });

    it('should calculate accuracy-aware TTL', async () => {
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      // High accuracy result should get longer TTL
      await aiCache.set(
        'accurate-key',
        { result: 'accurate-analysis' },
        'property-analysis',
        'valuation',
        { accuracy: 0.95 }
      );

      const accurateCall = mockBaseCache.set.mock.calls[0];
      const accurateTTL = accurateCall[2];

      // Low accuracy result should get shorter TTL
      await aiCache.set(
        'inaccurate-key',
        { result: 'inaccurate-analysis' },
        'property-analysis',
        'valuation',
        { accuracy: 0.5 }
      );

      const inaccurateCall = mockBaseCache.set.mock.calls[1];
      const inaccurateTTL = inaccurateCall[2];

      expect(accurateTTL).toBeGreaterThan(inaccurateTTL);
    });

    it('should apply service-specific TTL multipliers', async () => {
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      // Document processing should get longer TTL (multiplier: 3)
      await aiCache.set(
        'doc-key',
        { result: 'document-analysis' },
        'document-processing',
        'ocr'
      );

      const docCall = mockBaseCache.set.mock.calls[0];
      const docTTL = docCall[2];

      // Fraud detection should get shorter TTL (multiplier: 0.5)
      await aiCache.set(
        'fraud-key',
        { result: 'fraud-analysis' },
        'fraud-detection',
        'check'
      );

      const fraudCall = mockBaseCache.set.mock.calls[1];
      const fraudTTL = fraudCall[2];

      expect(docTTL).toBeGreaterThan(fraudTTL);
    });

    it('should respect min and max TTL limits', async () => {
      const cacheWithLimits = new AICache({
        baseCache: mockBaseCache,
        minTTL: 60,
        maxTTL: 3600,
        defaultTTL: 300
      });

      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      // Very expensive operation should not exceed maxTTL
      await cacheWithLimits.set(
        'very-expensive-key',
        { result: 'very-expensive' },
        'property-analysis',
        'valuation',
        { cost: 10000 }
      );

      const expensiveCall = mockBaseCache.set.mock.calls[0];
      const expensiveTTL = expensiveCall[2];

      expect(expensiveTTL).toBeLessThanOrEqual(3600);
      expect(expensiveTTL).toBeGreaterThanOrEqual(60);
    });

    it('should use forced TTL when provided', async () => {
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      await aiCache.set(
        'forced-ttl-key',
        { result: 'forced-ttl' },
        'property-analysis',
        'valuation',
        { forceTTL: 1800 }
      );

      const call = mockBaseCache.set.mock.calls[0];
      const ttl = call[2];

      expect(ttl).toBe(1800);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with predicted requests', async () => {
      mockBaseCache.get = vi.fn().mockResolvedValue(null);
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      const entries = [
        {
          key: 'warm-key-1',
          service: 'property-analysis',
          operation: 'valuation',
          factory: vi.fn().mockResolvedValue({ value: 1000000 }),
          priority: 1
        },
        {
          key: 'warm-key-2',
          service: 'property-analysis',
          operation: 'market-analysis',
          factory: vi.fn().mockResolvedValue({ trend: 'up' }),
          priority: 2
        }
      ];

      await aiCache.warmCache(entries);

      expect(entries[0].factory).toHaveBeenCalled();
      expect(entries[1].factory).toHaveBeenCalled();
      expect(mockBaseCache.set).toHaveBeenCalledTimes(2);
    });

    it('should skip warming for already cached entries', async () => {
      mockBaseCache.get = vi.fn().mockResolvedValue({ existing: 'data' });
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      const entries = [
        {
          key: 'existing-key',
          service: 'property-analysis',
          operation: 'valuation',
          factory: vi.fn().mockResolvedValue({ value: 1000000 })
        }
      ];

      await aiCache.warmCache(entries);

      expect(entries[0].factory).not.toHaveBeenCalled();
      expect(mockBaseCache.set).not.toHaveBeenCalled();
    });

    it('should handle warming failures gracefully', async () => {
      mockBaseCache.get = vi.fn().mockResolvedValue(null);
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      const entries = [
        {
          key: 'failing-key',
          service: 'property-analysis',
          operation: 'valuation',
          factory: vi.fn().mockRejectedValue(new Error('Factory failed'))
        }
      ];

      await aiCache.warmCache(entries);

      expect(console.warn).toHaveBeenCalledWith(
        'Cache warming failed for',
        'failing-key',
        expect.any(Error)
      );
    });

    it('should prioritize warming entries by priority', async () => {
      mockBaseCache.get = vi.fn().mockResolvedValue(null);
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      const callOrder: number[] = [];
      
      const entries = [
        {
          key: 'low-priority',
          service: 'property-analysis',
          operation: 'valuation',
          factory: vi.fn().mockImplementation(async () => {
            callOrder.push(1);
            return { value: 1000000 };
          }),
          priority: 1
        },
        {
          key: 'high-priority',
          service: 'property-analysis',
          operation: 'valuation',
          factory: vi.fn().mockImplementation(async () => {
            callOrder.push(2);
            return { value: 2000000 };
          }),
          priority: 2
        }
      ];

      await aiCache.warmCache(entries);

      // High priority should be called first
      expect(callOrder[0]).toBe(2);
      expect(callOrder[1]).toBe(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate by pattern when supported', async () => {
      mockBaseCache.invalidateByPattern = vi.fn().mockResolvedValue(undefined);

      const count = await aiCache.invalidate({
        pattern: 'ai_cache:property-analysis:*'
      });

      expect(mockBaseCache.invalidateByPattern).toHaveBeenCalledWith(
        'ai_cache:property-analysis:*'
      );
      expect(count).toBe(1);
    });

    it('should handle invalidation when pattern not supported', async () => {
      // Remove invalidateByPattern method
      delete (mockBaseCache as any).invalidateByPattern;

      const count = await aiCache.invalidate({
        service: 'property-analysis'
      });

      expect(console.log).toHaveBeenCalledWith(
        'AI cache invalidation requested',
        { service: 'property-analysis' }
      );
    });

    it('should handle invalidation errors gracefully', async () => {
      mockBaseCache.invalidateByPattern = vi.fn().mockRejectedValue(
        new Error('Invalidation failed')
      );

      const count = await aiCache.invalidate({
        pattern: 'ai_cache:*'
      });

      expect(count).toBe(0);
      expect(console.error).toHaveBeenCalledWith(
        'AI cache invalidation error:',
        expect.any(Error)
      );
    });
  });

  describe('Metrics', () => {
    it('should track cache hit metrics', async () => {
      const cacheEntry: AICacheEntry = {
        data: { value: 1000000 },
        timestamp: Date.now(),
        cost: 5,
        hitCount: 0,
        lastAccessed: Date.now(),
        ttl: 300,
        service: 'property-analysis',
        operation: 'valuation',
        inputHash: 'test-hash'
      };

      mockBaseCache.get = vi.fn().mockResolvedValue(cacheEntry);
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      await aiCache.get('test-key', 'property-analysis', 'valuation');

      const metrics = aiCache.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.hitRate).toBe(1);
      expect(metrics.costSavings).toBe(5);
    });

    it('should track cache miss metrics', async () => {
      mockBaseCache.get = vi.fn().mockResolvedValue(null);

      await aiCache.get('test-key', 'property-analysis', 'valuation');

      const metrics = aiCache.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.hitRate).toBe(0);
    });

    it('should track service-specific metrics', async () => {
      const cacheEntry: AICacheEntry = {
        data: { value: 1000000 },
        timestamp: Date.now(),
        cost: 10,
        hitCount: 0,
        lastAccessed: Date.now(),
        ttl: 300,
        service: 'property-analysis',
        operation: 'valuation',
        inputHash: 'test-hash'
      };

      mockBaseCache.get = vi.fn().mockResolvedValue(cacheEntry);
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      await aiCache.get('test-key', 'property-analysis', 'valuation');

      const metrics = aiCache.getMetrics();
      expect(metrics.serviceBreakdown['property-analysis']).toEqual({
        requests: 1,
        hits: 1,
        hitRate: 1,
        costSaved: 10
      });
    });

    it('should calculate average response time', async () => {
      mockBaseCache.get = vi.fn().mockResolvedValue(null);

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 10));
      await aiCache.get('test-key', 'property-analysis', 'valuation');

      const metrics = aiCache.getMetrics();
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    it('should report healthy when base cache is healthy', async () => {
      mockBaseCache.getHealth = vi.fn().mockResolvedValue({ healthy: true });
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);
      mockBaseCache.get = vi.fn().mockResolvedValue('test');
      mockBaseCache.del = vi.fn().mockResolvedValue(undefined);

      const health = await aiCache.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.baseCache).toBe(true);
      expect(health.metrics).toBeDefined();
      expect(health.warmingQueueSize).toBe(0);
    });

    it('should report unhealthy when base cache is unhealthy', async () => {
      mockBaseCache.getHealth = vi.fn().mockResolvedValue({ healthy: false });

      const health = await aiCache.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.baseCache).toBe(false);
    });

    it('should handle health check errors', async () => {
      mockBaseCache.getHealth = vi.fn().mockRejectedValue(new Error('Health check failed'));

      const health = await aiCache.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.baseCache).toBe(false);
    });
  });

  describe('Clear Cache', () => {
    it('should clear all AI cache entries', async () => {
      mockBaseCache.invalidateByPattern = vi.fn().mockResolvedValue(undefined);

      await aiCache.clear();

      expect(mockBaseCache.invalidateByPattern).toHaveBeenCalledWith('ai_cache:*');
    });

    it('should clear service-specific cache entries', async () => {
      mockBaseCache.invalidateByPattern = vi.fn().mockResolvedValue(undefined);

      await aiCache.clear('property-analysis');

      expect(mockBaseCache.invalidateByPattern).toHaveBeenCalledWith(
        'ai_cache:property-analysis:*'
      );
    });
  });

  describe('Factory Functions', () => {
    it('should create AI cache with options', () => {
      const options: AICacheOptions = {
        defaultTTL: 600,
        enableCostAwareCaching: false
      };

      const cache = createAICache(options);
      expect(cache).toBeInstanceOf(AICache);
    });

    it('should provide default AI cache singleton', () => {
      const cache1 = getDefaultAICache();
      const cache2 = getDefaultAICache();

      expect(cache1).toBe(cache2);
      expect(cache1).toBeInstanceOf(AICache);
    });

    it('should allow setting default AI cache', () => {
      const customCache = createAICache();
      setDefaultAICache(customCache);

      const defaultCache = getDefaultAICache();
      expect(defaultCache).toBe(customCache);
    });
  });

  describe('Input Hashing', () => {
    it('should generate consistent hashes for identical inputs', async () => {
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      const inputData = { propertyId: '123', location: 'Nairobi' };

      await aiCache.set('key1', { result: 'test' }, 'service', 'op', { inputData });
      await aiCache.set('key2', { result: 'test' }, 'service', 'op', { inputData });

      const calls = mockBaseCache.set.mock.calls;
      const entry1 = calls[0][1] as AICacheEntry;
      const entry2 = calls[1][1] as AICacheEntry;

      expect(entry1.inputHash).toBe(entry2.inputHash);
    });

    it('should generate different hashes for different inputs', async () => {
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      const inputData1 = { propertyId: '123', location: 'Nairobi' };
      const inputData2 = { propertyId: '456', location: 'Mombasa' };

      await aiCache.set('key1', { result: 'test' }, 'service', 'op', { inputData: inputData1 });
      await aiCache.set('key2', { result: 'test' }, 'service', 'op', { inputData: inputData2 });

      const calls = mockBaseCache.set.mock.calls;
      const entry1 = calls[0][1] as AICacheEntry;
      const entry2 = calls[1][1] as AICacheEntry;

      expect(entry1.inputHash).not.toBe(entry2.inputHash);
    });

    it('should handle null input data', async () => {
      mockBaseCache.set = vi.fn().mockResolvedValue(undefined);

      await aiCache.set('key', { result: 'test' }, 'service', 'op', {});

      const call = mockBaseCache.set.mock.calls[0];
      const entry = call[1] as AICacheEntry;

      expect(entry.inputHash).toBe('no-input');
    });
  });
});











































