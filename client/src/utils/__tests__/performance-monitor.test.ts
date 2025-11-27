import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  PerformanceMonitor,
  performanceMonitor,
  initPerformanceMonitoring,
} from '@client/performance-monitor';
import { logger } from '@client/utils/logger';

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn();
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

global.PerformanceObserver = mockPerformanceObserver as any;
mockPerformanceObserver.mockImplementation((callback) => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
}));

// Mock performance API
const mockGetEntriesByType = vi.fn();
const mockNow = vi.fn();

mockNow.mockReturnValue(100);

Object.defineProperty(window, 'performance', {
  value: {
    getEntriesByType: mockGetEntriesByType,
    now: mockNow,
    timing: {
      loadEventEnd: 1000,
      navigationStart: 0,
      domContentLoadedEventEnd: 500,
      domContentLoadedEventStart: 200,
    },
  },
  writable: true,
});

// Mock memory API
Object.defineProperty(window.performance, 'memory', {
  value: {
    usedJSHeapSize: 1024 * 1024 * 50, // 50MB
  },
  writable: true,
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    (PerformanceMonitor as any).instance = null;
    monitor = PerformanceMonitor.getInstance();
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(performanceMonitor).toBeInstanceOf(PerformanceMonitor);
    });
  });

  describe('startMonitoring', () => {
    it('should start monitoring successfully', () => {
      const mockEntry = { entryType: 'navigation', duration: 1000 };
      mockGetEntriesByType.mockReturnValue([mockEntry]);

      monitor.startMonitoring();

      expect(mockPerformanceObserver).toHaveBeenCalledWith(expect.any(Function));
      expect(mockObserve).toHaveBeenCalledWith({ entryTypes: ['navigation'] });
      expect(logger.info).toHaveBeenCalledWith(
        'Initial performance metrics collected',
        { component: 'PerformanceMonitor' },
        expect.any(Object)
      );
    });

    it('should not start monitoring if already monitoring', () => {
      monitor.startMonitoring();
      vi.clearAllMocks();

      monitor.startMonitoring();

      expect(mockPerformanceObserver).not.toHaveBeenCalled();
    });

    it('should handle PerformanceObserver not supported', () => {
      delete (global as any).PerformanceObserver;

      monitor.startMonitoring();

      expect(logger.warn).toHaveBeenCalledWith(
        'PerformanceObserver not supported',
        { component: 'PerformanceMonitor' }
      );

      // Restore
      global.PerformanceObserver = mockPerformanceObserver as any;
    });

    it('should handle observer setup errors', () => {
      mockPerformanceObserver.mockImplementationOnce(() => {
        throw new Error('Observer error');
      });

      monitor.startMonitoring();

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to setup navigation observer',
        { component: 'PerformanceMonitor' },
        expect.any(Error)
      );
    });

    it('should collect initial metrics with modern API', () => {
      const mockNavigation = {
        loadEventEnd: 1500,
        fetchStart: 100,
        domContentLoadedEventEnd: 800,
        domContentLoadedEventStart: 300,
        duration: 1400,
      };
      mockGetEntriesByType.mockReturnValue([mockNavigation]);

      monitor.startMonitoring();

      const metrics = monitor.getMetrics();
      expect(metrics.loadTime).toBe(1400);
      expect(metrics.renderTime).toBe(500);
      expect(metrics.navigationTime).toBe(1400);
      expect(metrics.memoryUsage).toBe(1024 * 1024 * 50);
    });

    it('should fallback to deprecated timing API when modern API returns empty', () => {
      mockGetEntriesByType.mockReturnValue([]);

      monitor.startMonitoring();

      const metrics = monitor.getMetrics();
      expect(metrics.loadTime).toBe(1000);
      expect(metrics.renderTime).toBe(300);
    });

    it('should handle performance API not available', () => {
      delete (window as any).performance;

      monitor.startMonitoring();

      expect(logger.warn).toHaveBeenCalledWith(
        'Performance API not available',
        { component: 'PerformanceMonitor' }
      );

      // Restore
      Object.defineProperty(window, 'performance', {
        value: { getEntriesByType: mockGetEntriesByType, now: mockNow },
        writable: true,
      });
    });

    it('should handle memory API not available', () => {
      delete (window.performance as any).memory;
      mockGetEntriesByType.mockReturnValue([]);

      monitor.startMonitoring();

      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBeUndefined();
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toEqual({
        loadTime: 0,
        renderTime: 0,
        navigationTime: 0,
        resourceLoadTime: 0,
      });
    });

    it('should return a copy, not reference', () => {
      const metrics1 = monitor.getMetrics();
      const metrics2 = monitor.getMetrics();
      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('measureFunction', () => {
    it('should measure synchronous function execution time', () => {
      const result = monitor.measureFunction('test', () => 'result');

      expect(result).toBe('result');
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/^Function test took \d+\.\d+ms$/),
        { component: 'PerformanceMonitor' }
      );
    });

    it('should handle function throwing error', () => {
      expect(() => {
        monitor.measureFunction('test', () => {
          throw new Error('test error');
        });
      }).toThrow('test error');

      // Logger should still be called even when function throws
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/^Function test took \d+\.\d+ms$/),
        { component: 'PerformanceMonitor' }
      );
    });
  });

  describe('measureAsyncFunction', () => {
    it('should measure asynchronous function execution time', async () => {
      const result = await monitor.measureAsyncFunction('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      expect(result).toBe('result');
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/^Async function test took \d+\.\d+ms$/),
        { component: 'PerformanceMonitor' }
      );
    });

    it('should handle async function rejecting', async () => {
      await expect(
        monitor.measureAsyncFunction('test', async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');

      // Logger should still be called even when async function rejects
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/^Async function test took \d+\.\d+ms$/),
        { component: 'PerformanceMonitor' }
      );
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring and disconnect observers', () => {
      monitor.startMonitoring();
      monitor.stopMonitoring();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(monitor['isMonitoring']).toBe(false);
    });

    it('should handle stop when not monitoring', () => {
      monitor.stopMonitoring();
      expect(mockDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('initPerformanceMonitoring', () => {
    it('should initialize performance monitoring successfully', () => {
      initPerformanceMonitoring();

      expect(logger.info).toHaveBeenCalledWith(
        'Performance monitoring initialized',
        { component: 'PerformanceMonitor' }
      );
    });

    it('should handle initialization errors', () => {
      const originalStartMonitoring = monitor.startMonitoring;
      monitor.startMonitoring = vi.fn(() => {
        throw new Error('Init error');
      });

      expect(() => initPerformanceMonitoring()).not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to initialize performance monitoring',
        { component: 'PerformanceMonitor' },
        expect.any(Error)
      );

      // Restore
      monitor.startMonitoring = originalStartMonitoring;
    });
  });

  describe('Cross-browser compatibility', () => {
    it('should work in browsers without PerformanceObserver', () => {
      delete (global as any).PerformanceObserver;

      expect(() => {
        monitor.startMonitoring();
      }).not.toThrow();

      // Restore
      global.PerformanceObserver = mockPerformanceObserver as any;
    });

    it('should work in browsers without performance API', () => {
      const originalPerformance = window.performance;
      Object.defineProperty(window, 'performance', {
        value: undefined,
        writable: true,
      });

      expect(() => {
        monitor.startMonitoring();
      }).not.toThrow();

      // Restore
      Object.defineProperty(window, 'performance', {
        value: originalPerformance,
        writable: true,
      });
    });

    it('should handle browsers without memory API', () => {
      delete (window.performance as any).memory;

      monitor.startMonitoring();

      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty navigation entries', () => {
      mockGetEntriesByType.mockReturnValue([]);

      monitor.startMonitoring();

      const metrics = monitor.getMetrics();
      expect(metrics.loadTime).toBe(0); // No navigation entries, so loadTime remains 0
    });

    it('should handle observer callback with no entries', () => {
      monitor.startMonitoring();
      const observerCallback = mockPerformanceObserver.mock.calls[0][0];
      observerCallback({ getEntries: () => [] });

      // Should not throw
      expect(() => observerCallback({ getEntries: () => [] })).not.toThrow();
    });

    it('should handle observer callback with navigation entry', () => {
      monitor.startMonitoring();
      const observerCallback = mockPerformanceObserver.mock.calls[0][0];
      const mockEntry = { entryType: 'navigation', duration: 2000 };
      observerCallback({ getEntries: () => [mockEntry] });

      const metrics = monitor.getMetrics();
      expect(metrics.navigationTime).toBe(2000);
    });
  });
});