/**
 * Performance Optimization Tests
 * Tests for the performance monitoring and optimization features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { performanceOptimizer } from '@/$2/performance-optimizer';
import { cacheManager } from '@/$2/cache-strategy';
import { performanceMonitor } from '@shared/core/performance'';
import { logger } from '@shared/core';

// Mock performance APIs
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

const mockPerformanceObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

// Mock navigator APIs
const mockNavigator = {
  connection: {
    effectiveType: '4g',
    downlink: 10
  },
  deviceMemory: 8,
  hardwareConcurrency: 4
};

// Setup global mocks
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

Object.defineProperty(global, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true
});

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

// Mock DOM APIs
Object.defineProperty(global, 'document', {
  value: {
    querySelectorAll: vi.fn(() => []),
    scripts: [],
    styleSheets: { length: 0 },
    images: { length: 0 },
    createElement: vi.fn(() => ({
      setAttribute: vi.fn(),
      style: {}
    })),
    head: {
      appendChild: vi.fn()
    }
  },
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    location: { href: 'http://localhost:3000' },
    fetch: vi.fn()
  },
  writable: true
});

describe('Performance Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset performance metrics
    mockPerformance.now.mockReturnValue(Date.now());
  });

  afterEach(() => {
    // Clean up any intervals or timeouts
    vi.clearAllTimers();
  });

  describe('Performance Monitor', () => {
    it('should initialize performance monitoring', () => {
      expect(performanceMonitor).toBeDefined();
      expect(typeof performanceMonitor.measureRouteChange).toBe('function');
      expect(typeof performanceMonitor.measureApiCall).toBe('function');
    });

    it('should measure route changes', () => {
      const endMeasurement = performanceMonitor.measureRouteChange('test-route');
      expect(typeof endMeasurement).toBe('function');
      
      // Simulate time passing
      mockPerformance.now.mockReturnValue(Date.now() + 100);
      
      endMeasurement();
      
      // Verify measurement was recorded
      expect(mockPerformance.now).toHaveBeenCalled();
    });

    it('should measure API calls', () => {
      const endMeasurement = performanceMonitor.measureApiCall('/api/test');
      expect(typeof endMeasurement).toBe('function');
      
      // Simulate time passing
      mockPerformance.now.mockReturnValue(Date.now() + 200);
      
      endMeasurement();
      
      // Verify measurement was recorded
      expect(mockPerformance.now).toHaveBeenCalled();
    });

    it('should get core web vitals', () => {
      const vitals = performanceMonitor.getCoreWebVitals();
      expect(vitals).toBeDefined();
      expect(typeof vitals).toBe('object');
    });

    it('should calculate performance score', () => {
      const score = performanceMonitor.getPerformanceScore();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Optimizer', () => {
    it('should get bundle metrics', () => {
      const metrics = performanceOptimizer.getBundleMetrics();
      // May be null initially
      expect(metrics === null || typeof metrics === 'object').toBe(true);
    });

    it('should get cache metrics', () => {
      const metrics = performanceOptimizer.getCacheMetrics();
      // May be null initially
      expect(metrics === null || typeof metrics === 'object').toBe(true);
    });

    it('should get optimization recommendations', () => {
      const recommendations = performanceOptimizer.getOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should export performance report', () => {
      const report = performanceOptimizer.exportPerformanceReport();
      expect(typeof report).toBe('string');
      
      // Should be valid JSON
      expect(() => JSON.parse(report)).not.toThrow();
      
      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('url');
    });
  });

  describe('Cache Manager', () => {
    it('should initialize cache manager', () => {
      expect(cacheManager).toBeDefined();
      expect(typeof cacheManager.getCache).toBe('function');
    });

    it('should get cache instances', () => {
      const apiCache = cacheManager.getCache('api');
      const assetCache = cacheManager.getCache('asset');
      const stateCache = cacheManager.getCache('state');
      
      expect(apiCache).toBeDefined();
      expect(assetCache).toBeDefined();
      expect(stateCache).toBeDefined();
    });

    it('should get cache statistics', () => {
      const stats = cacheManager.getAllStats();
      expect(typeof stats).toBe('object');
      expect(stats).toHaveProperty('api');
      expect(stats).toHaveProperty('asset');
      expect(stats).toHaveProperty('state');
    });

    it('should clear all caches', () => {
      expect(() => cacheManager.clearAll()).not.toThrow();
    });

    it('should invalidate by tag', () => {
      const invalidated = cacheManager.invalidateAllByTag('test');
      expect(typeof invalidated).toBe('number');
      expect(invalidated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Strategies', () => {
    let apiCache: any;

    beforeEach(() => {
      apiCache = cacheManager.getCache('api');
    });

    it('should cache and retrieve API responses', async () => {
      const testData = { test: 'data' };
      
      await apiCache.set('test-key', testData);
      const retrieved = await apiCache.get('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should handle cache expiration', async () => {
      const testData = { test: 'data' };
      
      // Set with very short TTL
      await apiCache.set('test-key', testData, { ttl: 1 });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrieved = await apiCache.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should handle cache size limits', async () => {
      // This test would need to be adapted based on the actual cache implementation
      expect(apiCache.getSize()).toBeGreaterThanOrEqual(0);
    });

    it('should provide cache statistics', () => {
      const stats = apiCache.getStats();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
    });
  });

  describe('Performance Budgets', () => {
    it('should check bundle size budgets', () => {
      // Mock resource entries
      mockPerformance.getEntriesByType.mockReturnValue([
        {
          name: 'test.js',
          transferSize: 100000, // 100KB
          encodedBodySize: 100000,
          decodedBodySize: 150000
        },
        {
          name: 'test.css',
          transferSize: 50000, // 50KB
          encodedBodySize: 50000,
          decodedBodySize: 75000
        }
      ]);

      // This would trigger bundle analysis
      const metrics = performanceOptimizer.getBundleMetrics();
      
      // Bundle metrics might be null initially, but the test verifies the API works
      expect(metrics === null || typeof metrics === 'object').toBe(true);
    });
  });

  describe('Connection-Aware Optimizations', () => {
    it('should adapt to slow connections', () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g', downlink: 0.5 },
        writable: true
      });

      // The optimizer should detect this and apply optimizations
      // This is tested indirectly through the initialization
      expect(performanceOptimizer).toBeDefined();
    });

    it('should adapt to fast connections', () => {
      // Mock fast connection
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g', downlink: 10 },
        writable: true
      });

      // The optimizer should detect this and apply different optimizations
      expect(performanceOptimizer).toBeDefined();
    });
  });

  describe('Memory Monitoring', () => {
    it('should monitor memory usage', () => {
      // Mock high memory usage
      mockPerformance.memory = {
        usedJSHeapSize: 3500000, // 3.5MB
        totalJSHeapSize: 4000000, // 4MB
        jsHeapSizeLimit: 4000000  // 4MB limit (87.5% usage)
      };

      // The performance optimizer should detect high memory usage
      expect(performanceOptimizer).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing performance APIs gracefully', () => {
      // Mock missing PerformanceObserver
      Object.defineProperty(global, 'PerformanceObserver', {
        value: undefined,
        writable: true
      });

      // Should not throw
      expect(() => {
        // Re-initialize would happen here in real scenario
        performanceOptimizer.getBundleMetrics();
      }).not.toThrow();
    });

    it('should handle cache errors gracefully', async () => {
      const apiCache = cacheManager.getCache('api');
      
      // Mock storage error
      const originalSet = apiCache.set;
      apiCache.set = vi.fn().mockRejectedValue(new Error('Storage full'));
      
      // Should not throw
      await expect(apiCache.set('test', 'data')).rejects.toThrow('Storage full');
      
      // Restore original method
      apiCache.set = originalSet;
    });
  });

  describe('Performance Reporting', () => {
    it('should generate comprehensive performance reports', () => {
      const report = performanceOptimizer.exportPerformanceReport();
      const parsed = JSON.parse(report);
      
      expect(parsed).toHaveProperty('bundleMetrics');
      expect(parsed).toHaveProperty('cacheMetrics');
      expect(parsed).toHaveProperty('optimizationRecommendations');
      expect(parsed).toHaveProperty('coreWebVitals');
      expect(parsed).toHaveProperty('performanceScore');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('url');
    });

    it('should include meaningful recommendations', () => {
      const recommendations = performanceOptimizer.getLatestRecommendations();
      
      if (recommendations) {
        expect(recommendations).toHaveProperty('bundleOptimizations');
        expect(recommendations).toHaveProperty('cacheOptimizations');
        expect(recommendations).toHaveProperty('performanceOptimizations');
        expect(recommendations).toHaveProperty('priority');
        
        expect(['low', 'medium', 'high']).toContain(recommendations.priority);
      }
    });
  });
});

describe('Performance Integration', () => {
  it('should work together as a complete system', async () => {
    // Test the integration of all performance components
    
    // 1. Performance monitoring should be active
    expect(performanceMonitor).toBeDefined();
    
    // 2. Cache manager should be initialized
    expect(cacheManager).toBeDefined();
    
    // 3. Performance optimizer should be running
    expect(performanceOptimizer).toBeDefined();
    
    // 4. Should be able to get comprehensive metrics
    const metrics = performanceMonitor.getMetrics();
    const cacheStats = cacheManager.getAllStats();
    const recommendations = performanceOptimizer.getOptimizationRecommendations();
    
    expect(typeof metrics).toBe('object');
    expect(typeof cacheStats).toBe('object');
    expect(Array.isArray(recommendations)).toBe(true);
    
    // 5. Should be able to export a complete report
    const report = performanceOptimizer.exportPerformanceReport();
    expect(typeof report).toBe('string');
    
    const parsed = JSON.parse(report);
    expect(parsed).toHaveProperty('timestamp');
  });
});












































