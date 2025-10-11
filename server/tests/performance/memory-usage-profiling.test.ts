import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { logger } from '../utils/logger';

describe('Memory Usage Profiling for Caching Layer', () => {
  const MEMORY_THRESHOLDS = {
    heapUsedMB: 100,      // Max 100MB heap usage increase
    rssUsedMB: 150,       // Max 150MB RSS increase
    cacheItemsMB: 50,     // Max 50MB for cache items
  };

  let initialMemory: NodeJS.MemoryUsage;
  let mockCache: Map<string, any>;

  beforeAll(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Record initial memory usage
    initialMemory = process.memoryUsage();
    logger.info('Initial memory usage:', { component: 'SimpleTool' }, formatMemoryUsage(initialMemory));
  });

  beforeEach(() => {
    // Create fresh cache for each test
    mockCache = new Map();
  });

  afterAll(() => {
    // Final memory check
    const finalMemory = process.memoryUsage();
    logger.info('Final memory usage:', { component: 'SimpleTool' }, formatMemoryUsage(finalMemory));
    
    const heapIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    console.log(`Heap usage increase: ${heapIncrease.toFixed(2)}MB`);
  });

  describe('Cache Memory Management', () => {
    it('should not exceed memory thresholds when caching data', () => {
      const beforeMemory = process.memoryUsage();
      
      // Simulate caching large amounts of data
      const cacheSize = 1000;
      const largeObject = {
        id: 1,
        data: 'x'.repeat(1000), // 1KB string
        metadata: {
          timestamp: new Date(),
          source: 'database',
          tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`)
        }
      };

      // Fill cache with test data
      for (let i = 0; i < cacheSize; i++) {
        mockCache.set(`key-${i}`, { ...largeObject, id: i });
      }

      const afterMemory = process.memoryUsage();
      const heapIncrease = (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024;
      const rssIncrease = (afterMemory.rss - beforeMemory.rss) / 1024 / 1024;

      console.log(`Cache filled with ${cacheSize} items:`);
      console.log(`  Heap increase: ${heapIncrease.toFixed(2)}MB`);
      console.log(`  RSS increase: ${rssIncrease.toFixed(2)}MB`);
      console.log(`  Cache size: ${mockCache.size} items`);

      expect(heapIncrease).toBeLessThan(MEMORY_THRESHOLDS.heapUsedMB);
      expect(rssIncrease).toBeLessThan(MEMORY_THRESHOLDS.rssUsedMB);
      expect(mockCache.size).toBe(cacheSize);
    });

    it('should properly clean up memory when cache is cleared', () => {
      const beforeMemory = process.memoryUsage();
      
      // Fill cache
      for (let i = 0; i < 500; i++) {
        mockCache.set(`temp-${i}`, {
          data: 'x'.repeat(2000), // 2KB per item
          timestamp: new Date(),
          metadata: { index: i }
        });
      }

      const filledMemory = process.memoryUsage();
      
      // Clear cache
      mockCache.clear();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const clearedMemory = process.memoryUsage();
      
      const fillIncrease = (filledMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024;
      const clearDecrease = (filledMemory.heapUsed - clearedMemory.heapUsed) / 1024 / 1024;
      
      console.log(`Memory after cache fill: ${fillIncrease.toFixed(2)}MB increase`);
      console.log(`Memory after cache clear: ${clearDecrease.toFixed(2)}MB decrease`);
      
      expect(mockCache.size).toBe(0);
      expect(clearDecrease).toBeGreaterThan(fillIncrease * 0.5); // At least 50% should be freed
    });

    it('should handle cache eviction without memory leaks', () => {
      const maxCacheSize = 100;
      const beforeMemory = process.memoryUsage();
      
      // Simulate LRU cache with eviction
      const lruCache = new Map();
      
      // Add more items than cache size to trigger eviction
      for (let i = 0; i < maxCacheSize * 2; i++) {
        const key = `item-${i}`;
        const value = {
          id: i,
          data: 'x'.repeat(1000),
          timestamp: Date.now()
        };
        
        lruCache.set(key, value);
        
        // Simulate LRU eviction
        if (lruCache.size > maxCacheSize) {
          const firstKey = lruCache.keys().next().value;
          lruCache.delete(firstKey);
        }
      }
      
      const afterMemory = process.memoryUsage();
      const heapIncrease = (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024;
      
      console.log(`LRU cache with eviction:`);
      console.log(`  Final cache size: ${lruCache.size}`);
      console.log(`  Heap increase: ${heapIncrease.toFixed(2)}MB`);
      
      expect(lruCache.size).toBeLessThanOrEqual(maxCacheSize);
      expect(heapIncrease).toBeLessThan(MEMORY_THRESHOLDS.cacheItemsMB);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated cache operations', async () => {
      const iterations = 100;
      const memorySnapshots: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        // Simulate cache operations
        const tempCache = new Map();
        
        // Fill cache
        for (let j = 0; j < 50; j++) {
          tempCache.set(`key-${j}`, {
            data: 'x'.repeat(500),
            iteration: i,
            index: j
          });
        }
        
        // Use cache (simulate reads)
        for (let j = 0; j < 25; j++) {
          tempCache.get(`key-${j}`);
        }
        
        // Clear cache
        tempCache.clear();
        
        // Record memory usage every 10 iterations
        if (i % 10 === 0) {
          if (global.gc) global.gc();
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }
      
      // Analyze memory trend
      if (memorySnapshots.length >= 3) {
        const firstThird = memorySnapshots.slice(0, Math.floor(memorySnapshots.length / 3));
        const lastThird = memorySnapshots.slice(-Math.floor(memorySnapshots.length / 3));
        
        const avgFirst = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
        const avgLast = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
        
        const memoryGrowth = (avgLast - avgFirst) / 1024 / 1024;
        
        console.log(`Memory growth over ${iterations} iterations: ${memoryGrowth.toFixed(2)}MB`);
        
        // Memory should not grow significantly (allow for some variance)
        expect(memoryGrowth).toBeLessThan(20); // Less than 20MB growth
      }
    });

    it('should handle concurrent cache access without memory issues', async () => {
      const beforeMemory = process.memoryUsage();
      const concurrentOperations = 50;
      
      const promises = Array.from({ length: concurrentOperations }, async (_, i) => {
        const localCache = new Map();
        
        // Each concurrent operation manages its own cache
        for (let j = 0; j < 20; j++) {
          localCache.set(`concurrent-${i}-${j}`, {
            threadId: i,
            data: 'x'.repeat(200),
            timestamp: Date.now()
          });
        }
        
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        
        // Read from cache
        for (let j = 0; j < 10; j++) {
          localCache.get(`concurrent-${i}-${j}`);
        }
        
        localCache.clear();
        return i;
      });
      
      const results = await Promise.all(promises);
      
      const afterMemory = process.memoryUsage();
      const heapIncrease = (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024;
      
      console.log(`Concurrent cache operations completed: ${results.length}`);
      console.log(`Heap increase: ${heapIncrease.toFixed(2)}MB`);
      
      expect(results.length).toBe(concurrentOperations);
      expect(heapIncrease).toBeLessThan(MEMORY_THRESHOLDS.heapUsedMB);
    });
  });

  describe('Cache Size Monitoring', () => {
    it('should accurately report cache memory usage', () => {
      const cache = new Map();
      const itemSize = 1000; // Approximate size per item
      const itemCount = 100;
      
      const beforeMemory = process.memoryUsage();
      
      // Add items of known size
      for (let i = 0; i < itemCount; i++) {
        cache.set(`sized-item-${i}`, {
          id: i,
          payload: 'x'.repeat(itemSize),
          metadata: { created: new Date() }
        });
      }
      
      const afterMemory = process.memoryUsage();
      const actualIncrease = (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024;
      const expectedSize = (itemSize * itemCount) / 1024; // Convert to KB
      
      console.log(`Cache size analysis:`);
      console.log(`  Items: ${cache.size}`);
      console.log(`  Expected size: ${expectedSize.toFixed(2)}KB`);
      console.log(`  Actual heap increase: ${actualIncrease.toFixed(2)}KB`);
      console.log(`  Overhead ratio: ${(actualIncrease / expectedSize).toFixed(2)}x`);
      
      expect(cache.size).toBe(itemCount);
      expect(actualIncrease).toBeGreaterThan(expectedSize * 0.5); // At least 50% of expected
      expect(actualIncrease).toBeLessThan(expectedSize * 5); // No more than 5x overhead
    });
  });

  function formatMemoryUsage(memUsage: NodeJS.MemoryUsage) {
    return {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    };
  }
});






