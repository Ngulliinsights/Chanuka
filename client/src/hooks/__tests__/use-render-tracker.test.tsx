import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRenderTracker } from '../use-render-tracker';
import { logger } from '../../utils/browser-logger';

// Mock the logger
vi.mock('../../utils/browser-logger', () => ({
  logger: {
    trackRender: vi.fn(),
    trackLifecycle: vi.fn(),
    trackPerformanceImpact: vi.fn(),
    detectInfiniteRender: vi.fn(),
    getRenderStats: vi.fn(() => ({
      totalRenders: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      infiniteRenderAlerts: 0,
      mountCount: 0,
      unmountCount: 0
    })),
    clearRenderStats: vi.fn(),
    warn: vi.fn()
  }
}));

describe('useRenderTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track component mount on initial render', () => {
    renderHook(() => useRenderTracker({ componentName: 'TestComponent' }));

    expect(logger.trackLifecycle).toHaveBeenCalledWith({
      component: 'TestComponent',
      action: 'mount',
      timestamp: expect.any(Number)
    });
  });

  it('should track component unmount on cleanup', () => {
    const { unmount } = renderHook(() => 
      useRenderTracker({ componentName: 'TestComponent' })
    );

    unmount();

    expect(logger.trackLifecycle).toHaveBeenCalledWith({
      component: 'TestComponent',
      action: 'unmount',
      timestamp: expect.any(Number)
    });
  });

  it('should track renders automatically', () => {
    renderHook(() => useRenderTracker({ componentName: 'TestComponent' }));

    expect(logger.trackRender).toHaveBeenCalledWith({
      component: 'TestComponent',
      renderCount: 1,
      timestamp: expect.any(Number),
      trigger: 'useEffect-render-tracking'
    });
  });

  it('should provide trackRender function', () => {
    const { result } = renderHook(() => 
      useRenderTracker({ componentName: 'TestComponent' })
    );

    act(() => {
      result.current.trackRender('manual-trigger', { test: 'data' });
    });

    expect(logger.trackRender).toHaveBeenCalledWith({
      component: 'TestComponent',
      renderCount: expect.any(Number),
      timestamp: expect.any(Number),
      trigger: 'manual-trigger',
      props: undefined,
      state: undefined
    });
  });

  it('should track props and state when enabled', () => {
    const { result } = renderHook(() => 
      useRenderTracker({ 
        componentName: 'TestComponent',
        trackProps: true,
        trackState: true
      })
    );

    act(() => {
      result.current.trackRender('test-trigger', { 
        props: { id: 1 },
        state: { count: 5 }
      });
    });

    expect(logger.trackRender).toHaveBeenCalledWith({
      component: 'TestComponent',
      renderCount: expect.any(Number),
      timestamp: expect.any(Number),
      trigger: 'test-trigger',
      props: { id: 1 },
      state: { count: 5 }
    });
  });

  it('should provide trackPerformance function', () => {
    const { result } = renderHook(() => 
      useRenderTracker({ componentName: 'TestComponent' })
    );

    act(() => {
      result.current.trackPerformance(25.5);
    });

    expect(logger.trackPerformanceImpact).toHaveBeenCalledWith({
      component: 'TestComponent',
      renderDuration: 25.5,
      timestamp: expect.any(Number),
      memoryUsage: undefined
    });
  });

  it('should warn about slow renders', () => {
    const { result } = renderHook(() => 
      useRenderTracker({ 
        componentName: 'TestComponent',
        performanceThreshold: 10
      })
    );

    act(() => {
      result.current.trackPerformance(20); // > 10ms threshold
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'Slow render detected in TestComponent',
      {
        duration: '20.00ms',
        threshold: '10ms'
      }
    );
  });

  it('should not warn about fast renders', () => {
    const { result } = renderHook(() => 
      useRenderTracker({ 
        componentName: 'TestComponent',
        performanceThreshold: 10
      })
    );

    act(() => {
      result.current.trackPerformance(5); // < 10ms threshold
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should provide getRenderStats function', () => {
    const mockStats = {
      totalRenders: 5,
      averageRenderTime: 12.5,
      lastRenderTime: Date.now(),
      infiniteRenderAlerts: 0,
      mountCount: 1,
      unmountCount: 0
    };

    (logger.getRenderStats as any).mockReturnValue(mockStats);

    const { result } = renderHook(() => 
      useRenderTracker({ componentName: 'TestComponent' })
    );

    const stats = result.current.getRenderStats();

    expect(logger.getRenderStats).toHaveBeenCalledWith('TestComponent');
    expect(stats).toEqual(mockStats);
  });

  it('should provide clearStats function', () => {
    const { result } = renderHook(() => 
      useRenderTracker({ componentName: 'TestComponent' })
    );

    act(() => {
      result.current.clearStats();
    });

    expect(logger.clearRenderStats).toHaveBeenCalledWith('TestComponent');
  });

  it('should detect infinite renders', () => {
    renderHook(() => useRenderTracker({ 
      componentName: 'TestComponent',
      infiniteRenderThreshold: 25
    }));

    expect(logger.detectInfiniteRender).toHaveBeenCalledWith('TestComponent', 25);
  });

  it('should use default infinite render threshold', () => {
    renderHook(() => useRenderTracker({ componentName: 'TestComponent' }));

    expect(logger.detectInfiniteRender).toHaveBeenCalledWith('TestComponent', 50);
  });
});