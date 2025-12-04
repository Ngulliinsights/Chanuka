/**
 * Performance Monitor Hooks Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePerformanceMonitor, usePerformanceBudget, useCoreWebVitals, usePerformanceAlert, useLazyLoading } from '../use-performance-monitor';

// Mock the performance monitor
vi.mock('../../utils/performance-monitor', () => ({
  runtimePerformanceMonitor: {
    addCustomMetric: vi.fn(),
    getMetrics: vi.fn(() => ({
      coreWebVitals: { lcp: 2000, fid: 50, cls: 0.05 },
      memoryUsage: 50000000
    }))
  }
}));

vi.mock('../../utils/performance-budget-checker', () => ({
  performanceBudgetChecker: {
    checkBudgets: vi.fn(() => Promise.resolve({
      violations: [],
      warnings: [],
      overallHealth: 'good',
      score: 95
    }))
  }
}));

vi.mock('../../utils/performance-alerts', () => ({
  performanceAlerts: {
    sendAlert: vi.fn(),
    updateConfig: vi.fn(),
    getConfig: vi.fn(() => ({ slack: true, email: false, github: true }))
  }
}));

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should track component render performance', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({ componentName: 'TestComponent' })
    );

    // Initial state
    expect(result.current.metrics.renderCount).toBe(0);
    expect(result.current.metrics.averageRenderTime).toBe(0);

    // Mark render start and end
    act(() => {
      result.current.markRenderStart();
      vi.advanceTimersByTime(16); // Simulate 16ms render time
      result.current.markRenderEnd();
    });

    expect(result.current.metrics.renderCount).toBe(1);
    expect(result.current.metrics.lastRenderTime).toBe(16);
    expect(result.current.metrics.averageRenderTime).toBe(16);
  });

  it('should calculate performance statistics correctly', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({ componentName: 'TestComponent' })
    );

    // Simulate multiple renders
    const renderTimes = [10, 20, 15, 25, 12];

    renderTimes.forEach(renderTime => {
      act(() => {
        result.current.markRenderStart();
        vi.advanceTimersByTime(renderTime);
        result.current.markRenderEnd();
      });
    });

    expect(result.current.metrics.renderCount).toBe(5);
    expect(result.current.metrics.averageRenderTime).toBe(16.4); // (10+20+15+25+12)/5
    expect(result.current.metrics.maxRenderTime).toBe(25);
    expect(result.current.metrics.minRenderTime).toBe(10);
  });

  it('should reset metrics correctly', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({ componentName: 'TestComponent' })
    );

    // Add some metrics
    act(() => {
      result.current.markRenderStart();
      vi.advanceTimersByTime(20);
      result.current.markRenderEnd();
    });

    expect(result.current.metrics.renderCount).toBe(1);

    // Reset
    act(() => {
      result.current.resetMetrics();
    });

    expect(result.current.metrics.renderCount).toBe(0);
    expect(result.current.metrics.averageRenderTime).toBe(0);
  });

  it('should add custom metrics', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({ componentName: 'TestComponent' })
    );

    act(() => {
      result.current.addCustomMetric('customMetric', 42);
    });

    // Verify the mock was called
    expect(vi.mocked(require('../../utils/performance-monitor').runtimePerformanceMonitor.addCustomMetric))
      .toHaveBeenCalledWith('TestComponent_customMetric', 42);
  });
});

describe('usePerformanceBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should check budget periodically', async () => {
    const { result } = renderHook(() =>
      usePerformanceBudget({ componentName: 'TestComponent', checkInterval: 1000 })
    );

    // Initial state
    expect(result.current.isWithinBudget).toBe(true);
    expect(result.current.violations).toEqual([]);

    // Wait for budget check
    await waitFor(() => {
      expect(vi.mocked(require('../../utils/performance-budget-checker').performanceBudgetChecker.checkBudgets))
        .toHaveBeenCalled();
    });
  });

  it('should handle budget violations', async () => {
    // Mock budget check to return violations
    vi.mocked(require('../../utils/performance-budget-checker').performanceBudgetChecker.checkBudgets)
      .mockResolvedValueOnce({
        violations: [{ metric: 'LCP', actual: 3000, limit: 2500, percentage: 120, severity: 'error' }],
        warnings: [],
        overallHealth: 'error',
        score: 75
      });

    const { result } = renderHook(() =>
      usePerformanceBudget({ componentName: 'TestComponent' })
    );

    await waitFor(() => {
      expect(result.current.isWithinBudget).toBe(false);
      expect(result.current.violations).toContain('LCP Budget Violation');
    });
  });

  it('should allow manual budget checks', async () => {
    const { result } = renderHook(() =>
      usePerformanceBudget({ componentName: 'TestComponent' })
    );

    await act(async () => {
      await result.current.checkBudget();
    });

    expect(vi.mocked(require('../../utils/performance-budget-checker').performanceBudgetChecker.checkBudgets))
      .toHaveBeenCalled();
  });
});

describe('useCoreWebVitals', () => {
  it('should return Core Web Vitals metrics', () => {
    const { result } = renderHook(() => useCoreWebVitals());

    expect(result.current.lcp).toBe(2000);
    expect(result.current.fid).toBe(50);
    expect(result.current.cls).toBe(0.05);
    expect(result.current.allMetricsLoaded).toBe(true);
  });

  it('should handle missing metrics', () => {
    vi.mocked(require('../../utils/performance-monitor').runtimePerformanceMonitor.getMetrics)
      .mockReturnValueOnce({
        coreWebVitals: { lcp: undefined, fid: undefined, cls: undefined }
      });

    const { result } = renderHook(() => useCoreWebVitals());

    expect(result.current.lcp).toBeUndefined();
    expect(result.current.allMetricsLoaded).toBe(false);
  });
});

describe('usePerformanceAlert', () => {
  it('should send alerts correctly', async () => {
    const { result } = renderHook(() =>
      usePerformanceAlert({ componentName: 'TestComponent' })
    );

    await act(async () => {
      await result.current.sendAlert(
        'violation',
        'Test Alert',
        'Test description',
        { metric: 'value' }
      );
    });

    expect(vi.mocked(require('../../utils/performance-alerts').performanceAlerts.sendAlert))
      .toHaveBeenCalledWith({
        type: 'violation',
        title: 'TestComponent: Test Alert',
        description: 'Test description',
        metrics: { metric: 'value' },
        severity: 'high',
        timestamp: expect.any(Number)
      });
  });

  it('should update alert configuration', () => {
    const { result } = renderHook(() =>
      usePerformanceAlert({ componentName: 'TestComponent' })
    );

    act(() => {
      result.current.updateAlertConfig({ slack: false, email: true });
    });

    expect(vi.mocked(require('../../utils/performance-alerts').performanceAlerts.updateConfig))
      .toHaveBeenCalledWith({ slack: false, email: true });
  });
});

describe('useLazyLoading', () => {
  let mockIntersectionObserver: any;

  beforeEach(() => {
    mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));

    global.IntersectionObserver = mockIntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle lazy loading state', () => {
    const { result } = renderHook(() =>
      useLazyLoading({ threshold: 0.5, triggerOnce: true })
    );

    expect(result.current.isIntersecting).toBe(false);
    expect(result.current.hasTriggered).toBe(false);
    expect(result.current.ref.current).toBeNull();
  });

  it('should create intersection observer with correct options', () => {
    renderHook(() =>
      useLazyLoading({ threshold: 0.8, rootMargin: '100px' })
    );

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0.8,
        rootMargin: '100px'
      }
    );
  });
});