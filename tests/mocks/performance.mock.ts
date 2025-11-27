/**
 * Performance API Mock Implementation for Testing
 * Provides consistent Performance API mocking across all test environments
 */

import { vi } from 'vitest';

export interface PerformanceMockInstance {
  now: ReturnType<typeof vi.fn>;
  mark: ReturnType<typeof vi.fn>;
  measure: ReturnType<typeof vi.fn>;
  clearMarks: ReturnType<typeof vi.fn>;
  clearMeasures: ReturnType<typeof vi.fn>;
  getEntries: ReturnType<typeof vi.fn>;
  getEntriesByType: ReturnType<typeof vi.fn>;
  getEntriesByName: ReturnType<typeof vi.fn>;
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  navigation: {
    type: number;
    redirectCount: number;
  };
  timing: PerformanceTiming;
}

export interface PerformanceObserverMock {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  takeRecords: ReturnType<typeof vi.fn>;
}

export const createPerformanceMock = (): PerformanceMockInstance => ({
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntries: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
  navigation: {
    type: 0,
    redirectCount: 0,
  },
  timing: {
    navigationStart: Date.now() - 1000,
    loadEventEnd: Date.now(),
    domContentLoadedEventEnd: Date.now() - 500,
    connectEnd: Date.now() - 900,
    connectStart: Date.now() - 950,
    domComplete: Date.now() - 100,
    domContentLoadedEventStart: Date.now() - 600,
    domInteractive: Date.now() - 700,
    domLoading: Date.now() - 800,
    domainLookupEnd: Date.now() - 980,
    domainLookupStart: Date.now() - 990,
    fetchStart: Date.now() - 1000,
    loadEventStart: Date.now() - 50,
    redirectEnd: 0,
    redirectStart: 0,
    requestStart: Date.now() - 850,
    responseEnd: Date.now() - 750,
    responseStart: Date.now() - 800,
    secureConnectionStart: Date.now() - 900,
    unloadEventEnd: 0,
    unloadEventStart: 0,
  } as PerformanceTiming,
});

export const createPerformanceObserverMock = (): PerformanceObserverMock => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
});

/**
 * Performance Mock Utilities
 */
export const performanceMockUtils = {
  /**
   * Create a fresh Performance mock instance
   */
  create: createPerformanceMock,
  
  /**
   * Create a fresh PerformanceObserver mock
   */
  createObserver: createPerformanceObserverMock,
  
  /**
   * Mock performance timing with custom values
   */
  mockTiming: (overrides: Partial<PerformanceTiming> = {}) => {
    const baseTime = Date.now();
    return {
      navigationStart: baseTime - 1000,
      loadEventEnd: baseTime,
      domContentLoadedEventEnd: baseTime - 500,
      connectEnd: baseTime - 900,
      connectStart: baseTime - 950,
      domComplete: baseTime - 100,
      domContentLoadedEventStart: baseTime - 600,
      domInteractive: baseTime - 700,
      domLoading: baseTime - 800,
      domainLookupEnd: baseTime - 980,
      domainLookupStart: baseTime - 990,
      fetchStart: baseTime - 1000,
      loadEventStart: baseTime - 50,
      redirectEnd: 0,
      redirectStart: 0,
      requestStart: baseTime - 850,
      responseEnd: baseTime - 750,
      responseStart: baseTime - 800,
      secureConnectionStart: baseTime - 900,
      unloadEventEnd: 0,
      unloadEventStart: 0,
      ...overrides,
    } as PerformanceTiming;
  },
  
  /**
   * Mock performance entries
   */
  mockEntries: (type: string, count = 3) => {
    return Array.from({ length: count }, (_, i) => ({
      name: `${type}-entry-${i}`,
      entryType: type,
      startTime: Date.now() - (count - i) * 100,
      duration: 50 + i * 10,
    }));
  },
  
  /**
   * Mock memory usage scenario
   */
  mockMemoryUsage: (used: number, total: number, limit: number) => ({
    usedJSHeapSize: used,
    totalJSHeapSize: total,
    jsHeapSizeLimit: limit,
  }),
  
  /**
   * Mock slow performance scenario
   */
  mockSlowPerformance: (mockInstance: PerformanceMockInstance) => {
    mockInstance.now.mockImplementation(() => Date.now() + Math.random() * 1000);
    mockInstance.timing = performanceMockUtils.mockTiming({
      loadEventEnd: Date.now() + 5000, // 5 second load time
      domContentLoadedEventEnd: Date.now() + 3000, // 3 second DOM ready
    });
  },
  
  /**
   * Mock fast performance scenario
   */
  mockFastPerformance: (mockInstance: PerformanceMockInstance) => {
    mockInstance.now.mockImplementation(() => Date.now() + Math.random() * 10);
    mockInstance.timing = performanceMockUtils.mockTiming({
      loadEventEnd: Date.now() + 200, // 200ms load time
      domContentLoadedEventEnd: Date.now() + 100, // 100ms DOM ready
    });
  },
  
  /**
   * Reset all performance mocks
   */
  reset: (mockInstance: PerformanceMockInstance) => {
    mockInstance.now.mockClear();
    mockInstance.mark.mockClear();
    mockInstance.measure.mockClear();
    mockInstance.clearMarks.mockClear();
    mockInstance.clearMeasures.mockClear();
    mockInstance.getEntries.mockClear();
    mockInstance.getEntriesByType.mockClear();
    mockInstance.getEntriesByName.mockClear();
  },
};

/**
 * Global Performance API mock setup
 */
export const setupPerformanceMock = () => {
  const performanceMock = createPerformanceMock();
  
  Object.defineProperty(global, 'performance', {
    value: performanceMock,
    writable: true,
    configurable: true,
  });
  
  global.PerformanceObserver = vi.fn().mockImplementation((callback) => 
    createPerformanceObserverMock()
  );
  
  return performanceMock;
};