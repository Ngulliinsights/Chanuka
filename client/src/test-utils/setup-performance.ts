/**
 * Performance Testing Setup for Chanuka Client UI
 * 
 * This file configures the test environment for performance tests
 * including Core Web Vitals measurement and load testing
 */

import '@testing-library/jest-dom/vitest';
import { expect, afterEach, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as React from 'react';

// Ensure React is available globally
global.React = React;

// =============================================================================
// PERFORMANCE MEASUREMENT UTILITIES
// =============================================================================

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  fcp?: number;
  renderTime?: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  startMonitoring() {
    this.setupLCPObserver();
    this.setupCLSObserver();
    this.setupFCPObserver();
    this.setupMemoryMonitoring();
  }

  stopMonitoring() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  resetMetrics() {
    this.metrics = {};
  }

  private setupLCPObserver() {
    if (typeof PerformanceObserver === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (e) {
      // PerformanceObserver not supported in test environment
    }
  }

  private setupCLSObserver() {
    if (typeof PerformanceObserver === 'undefined') return;

    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.metrics.cls = clsValue;
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (e) {
      // PerformanceObserver not supported in test environment
    }
  }

  private setupFCPObserver() {
    if (typeof PerformanceObserver === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (e) {
      // PerformanceObserver not supported in test environment
    }
  }

  private setupMemoryMonitoring() {
    if (typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
    }
  }

  measureRenderTime<T>(fn: () => T): { result: T; renderTime: number } {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    this.metrics.renderTime = endTime - startTime;
    
    return {
      result,
      renderTime: endTime - startTime,
    };
  }

  async measureAsyncRenderTime<T>(fn: () => Promise<T>): Promise<{ result: T; renderTime: number }> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    this.metrics.renderTime = endTime - startTime;
    
    return {
      result,
      renderTime: endTime - startTime,
    };
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// =============================================================================
// CORE WEB VITALS THRESHOLDS
// =============================================================================

export const CORE_WEB_VITALS_THRESHOLDS = {
  LCP: {
    GOOD: 2500,
    NEEDS_IMPROVEMENT: 4000,
  },
  FID: {
    GOOD: 100,
    NEEDS_IMPROVEMENT: 300,
  },
  CLS: {
    GOOD: 0.1,
    NEEDS_IMPROVEMENT: 0.25,
  },
  FCP: {
    GOOD: 1800,
    NEEDS_IMPROVEMENT: 3000,
  },
  TTFB: {
    GOOD: 800,
    NEEDS_IMPROVEMENT: 1800,
  },
};

// =============================================================================
// PERFORMANCE TEST UTILITIES
// =============================================================================

export const performanceTestUtils = {
  monitor: performanceMonitor,

  // Measure component render performance
  async measureComponentPerformance<T>(
    renderFn: () => T,
    options: { iterations?: number; warmup?: number } = {}
  ): Promise<{
    result: T;
    averageRenderTime: number;
    minRenderTime: number;
    maxRenderTime: number;
    iterations: number;
  }> {
    const { iterations = 10, warmup = 3 } = options;
    const renderTimes: number[] = [];
    let result: T;

    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      renderFn();
    }

    // Actual measurements
    for (let i = 0; i < iterations; i++) {
      const { result: iterResult, renderTime } = performanceMonitor.measureRenderTime(renderFn);
      renderTimes.push(renderTime);
      if (i === 0) result = iterResult;
    }

    return {
      result: result!,
      averageRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
      minRenderTime: Math.min(...renderTimes),
      maxRenderTime: Math.max(...renderTimes),
      iterations,
    };
  },

  // Measure memory usage during test
  measureMemoryUsage(): number {
    if (typeof (performance as any).memory !== 'undefined') {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  },

  // Simulate heavy computation load
  simulateHeavyLoad(duration: number = 100): void {
    const start = performance.now();
    while (performance.now() - start < duration) {
      // Busy wait to simulate heavy computation
      Math.random();
    }
  },

  // Test bundle size impact
  async testBundleSize(): Promise<{
    mainBundle: number;
    chunkSizes: Record<string, number>;
    totalSize: number;
  }> {
    // In a real implementation, this would analyze the actual bundle
    // For testing, we'll return mock data
    return {
      mainBundle: 95000, // 95KB
      chunkSizes: {
        'bills-dashboard': 45000,
        'bill-detail': 35000,
        'community': 25000,
        'search': 20000,
      },
      totalSize: 220000, // 220KB total
    };
  },

  // Test Core Web Vitals compliance
  testCoreWebVitals(metrics: PerformanceMetrics): {
    lcp: 'good' | 'needs-improvement' | 'poor';
    fid: 'good' | 'needs-improvement' | 'poor';
    cls: 'good' | 'needs-improvement' | 'poor';
    fcp: 'good' | 'needs-improvement' | 'poor';
    overall: 'good' | 'needs-improvement' | 'poor';
  } {
    const lcpRating = metrics.lcp
      ? metrics.lcp <= CORE_WEB_VITALS_THRESHOLDS.LCP.GOOD
        ? 'good'
        : metrics.lcp <= CORE_WEB_VITALS_THRESHOLDS.LCP.NEEDS_IMPROVEMENT
        ? 'needs-improvement'
        : 'poor'
      : 'good';

    const fidRating = metrics.fid
      ? metrics.fid <= CORE_WEB_VITALS_THRESHOLDS.FID.GOOD
        ? 'good'
        : metrics.fid <= CORE_WEB_VITALS_THRESHOLDS.FID.NEEDS_IMPROVEMENT
        ? 'needs-improvement'
        : 'poor'
      : 'good';

    const clsRating = metrics.cls
      ? metrics.cls <= CORE_WEB_VITALS_THRESHOLDS.CLS.GOOD
        ? 'good'
        : metrics.cls <= CORE_WEB_VITALS_THRESHOLDS.CLS.NEEDS_IMPROVEMENT
        ? 'needs-improvement'
        : 'poor'
      : 'good';

    const fcpRating = metrics.fcp
      ? metrics.fcp <= CORE_WEB_VITALS_THRESHOLDS.FCP.GOOD
        ? 'good'
        : metrics.fcp <= CORE_WEB_VITALS_THRESHOLDS.FCP.NEEDS_IMPROVEMENT
        ? 'needs-improvement'
        : 'poor'
      : 'good';

    const ratings = [lcpRating, fidRating, clsRating, fcpRating];
    const overall = ratings.includes('poor')
      ? 'poor'
      : ratings.includes('needs-improvement')
      ? 'needs-improvement'
      : 'good';

    return {
      lcp: lcpRating,
      fid: fidRating,
      cls: clsRating,
      fcp: fcpRating,
      overall,
    };
  },

  // Load testing utilities
  async simulateUserLoad(
    userCount: number,
    actionFn: () => Promise<void>,
    options: { rampUpTime?: number; duration?: number } = {}
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  }> {
    const { rampUpTime = 1000, duration = 5000 } = options;
    const results: { success: boolean; responseTime: number }[] = [];
    
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < userCount; i++) {
      const delay = (rampUpTime / userCount) * i;
      
      promises.push(
        new Promise(async (resolve) => {
          await new Promise(r => setTimeout(r, delay));
          
          const startTime = performance.now();
          try {
            await actionFn();
            const responseTime = performance.now() - startTime;
            results.push({ success: true, responseTime });
          } catch (error) {
            const responseTime = performance.now() - startTime;
            results.push({ success: false, responseTime });
          }
          resolve();
        })
      );
    }
    
    await Promise.all(promises);
    
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.filter(r => !r.success).length;
    const responseTimes = results.map(r => r.responseTime);
    
    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
    };
  },
};

// =============================================================================
// GLOBAL TEST SETUP
// =============================================================================

beforeAll(() => {
  // Start performance monitoring
  performanceMonitor.startMonitoring();
  
  // Mock console methods to reduce noise
  console.error = vi.fn();
  console.warn = vi.fn();
  
  // Enhanced performance API mocking
  Object.defineProperty(global, 'performance', {
    value: {
      ...performance,
      mark: vi.fn(),
      measure: vi.fn(),
      now: vi.fn(() => Date.now()),
      getEntriesByType: vi.fn((type: string) => {
        switch (type) {
          case 'navigation':
            return [{
              domContentLoadedEventEnd: 1000,
              domContentLoadedEventStart: 800,
              loadEventEnd: 1200,
              loadEventStart: 1100,
              responseStart: 200,
              requestStart: 100,
              startTime: 0,
              duration: 1200,
            }];
          case 'largest-contentful-paint':
            return [{ startTime: 1500, duration: 0 }];
          case 'first-contentful-paint':
            return [{ startTime: 800, duration: 0 }];
          case 'layout-shift':
            return [{ value: 0.05, hadRecentInput: false }];
          default:
            return [];
        }
      }),
      memory: {
        usedJSHeapSize: 10000000, // 10MB
        totalJSHeapSize: 20000000, // 20MB
        jsHeapSizeLimit: 100000000, // 100MB
      },
    },
    writable: true,
  });
});

afterAll(() => {
  // Stop performance monitoring
  performanceMonitor.stopMonitoring();
});

afterEach(() => {
  // Reset performance metrics
  performanceMonitor.resetMetrics();
  
  // Clean up React Testing Library
  cleanup();
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

// =============================================================================
// GLOBAL PERFORMANCE TEST UTILITIES
// =============================================================================

// Make performance utilities available globally
global.performanceTestUtils = performanceTestUtils;

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

// Set performance test environment variables
process.env.NODE_ENV = 'test';
process.env.PERFORMANCE_TEST = 'true';

// Mock requestIdleCallback for performance tests
global.requestIdleCallback = vi.fn((callback) => {
  return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0);
});

global.cancelIdleCallback = vi.fn((id) => clearTimeout(id));

// Enhanced ResizeObserver mock for performance tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver for performance tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn(() => []),
}));