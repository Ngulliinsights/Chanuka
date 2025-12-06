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

import { performanceOptimizer } from '@client/utils/performance';
import { logger } from '@client/utils/logger';

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

  describe('Performance Integration', () => {
    it('should work together as a complete system', async () => {
      // Test the integration of all performance components
      
      // 1. Performance optimizer should be running
      expect(performanceOptimizer).toBeDefined();
      
      // 2. Should be able to get comprehensive metrics
      const recommendations = performanceOptimizer.getOptimizationRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      
      // 3. Should be able to export a complete report
      const report = performanceOptimizer.exportPerformanceReport();
      expect(typeof report).toBe('string');
      
      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('timestamp');
    });
  });
});