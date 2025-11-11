import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderTrackingIntegration, trackRender, trackLifecycle, measurePerformance } from '../render-tracking-integration';
import { logger } from '../logger';

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    trackRender: vi.fn(),
    trackLifecycle: vi.fn(),
    trackPerformanceImpact: vi.fn(),
    detectInfiniteRender: vi.fn(),
    getRenderStats: vi.fn(() => ({
      totalRenders: 10,
      averageRenderTime: 8.5,
      lastRenderTime: Date.now(),
      infiniteRenderAlerts: 0,
      mountCount: 2,
      unmountCount: 1
    })),
    clearRenderStats: vi.fn()
  }
}));

describe('RenderTrackingIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackComponentRender', () => {
    it('should track component renders with incrementing count', () => {
      RenderTrackingIntegration.trackComponentRender('TestComponent', 'test-trigger');
      
      expect(logger.trackRender).toHaveBeenCalledWith({
        component: 'TestComponent',
        renderCount: 1,
        timestamp: expect.any(Number),
        trigger: 'test-trigger'
      });

      RenderTrackingIntegration.trackComponentRender('TestComponent', 'another-trigger');
      
      expect(logger.trackRender).toHaveBeenCalledWith({
        component: 'TestComponent',
        renderCount: 2,
        timestamp: expect.any(Number),
        trigger: 'another-trigger'
      });
    });

    it('should detect infinite renders', () => {
      RenderTrackingIntegration.trackComponentRender('TestComponent');
      
      expect(logger.detectInfiniteRender).toHaveBeenCalledWith('TestComponent');
    });

    it('should include additional data', () => {
      const additionalData = { props: { id: 1 }, state: { count: 5 } };
      RenderTrackingIntegration.trackComponentRender('TestComponent', 'test', additionalData);
      
      expect(logger.trackRender).toHaveBeenCalledWith({
        component: 'TestComponent',
        renderCount: 1,
        timestamp: expect.any(Number),
        trigger: 'test',
        props: { id: 1 },
        state: { count: 5 }
      });
    });
  });

  describe('trackComponentLifecycle', () => {
    it('should track lifecycle events', () => {
      RenderTrackingIntegration.trackComponentLifecycle('TestComponent', 'mount');
      
      expect(logger.trackLifecycle).toHaveBeenCalledWith({
        component: 'TestComponent',
        action: 'mount',
        timestamp: expect.any(Number)
      });
    });

    it('should include additional data in lifecycle tracking', () => {
      const additionalData = { props: { initialValue: 0 } };
      RenderTrackingIntegration.trackComponentLifecycle('TestComponent', 'mount', additionalData);
      
      expect(logger.trackLifecycle).toHaveBeenCalledWith({
        component: 'TestComponent',
        action: 'mount',
        timestamp: expect.any(Number),
        props: { initialValue: 0 }
      });
    });
  });

  describe('measurePerformance', () => {
    it('should measure and track synchronous function performance', () => {
      const testFunction = vi.fn(() => 'result');
      
      const result = RenderTrackingIntegration.measurePerformance(
        'TestComponent',
        'test-operation',
        testFunction
      );
      
      expect(result).toBe('result');
      expect(testFunction).toHaveBeenCalled();
      expect(logger.trackPerformanceImpact).toHaveBeenCalledWith({
        component: 'TestComponent.test-operation',
        renderDuration: expect.any(Number),
        timestamp: expect.any(Number),
        memoryUsage: undefined
      });
    });

    it('should track performance even when function throws', () => {
      const testFunction = vi.fn(() => {
        throw new Error('Test error');
      });
      
      expect(() => {
        RenderTrackingIntegration.measurePerformance(
          'TestComponent',
          'failing-operation',
          testFunction
        );
      }).toThrow('Test error');
      
      expect(logger.trackPerformanceImpact).toHaveBeenCalledWith({
        component: 'TestComponent.failing-operation',
        renderDuration: expect.any(Number),
        timestamp: expect.any(Number),
        memoryUsage: undefined
      });
    });
  });

  describe('measureAsyncPerformance', () => {
    it('should measure and track asynchronous function performance', async () => {
      const testFunction = vi.fn(async () => 'async-result');
      
      const result = await RenderTrackingIntegration.measureAsyncPerformance(
        'TestComponent',
        'async-operation',
        testFunction
      );
      
      expect(result).toBe('async-result');
      expect(testFunction).toHaveBeenCalled();
      expect(logger.trackPerformanceImpact).toHaveBeenCalledWith({
        component: 'TestComponent.async-operation',
        renderDuration: expect.any(Number),
        timestamp: expect.any(Number),
        memoryUsage: undefined
      });
    });

    it('should track performance even when async function rejects', async () => {
      const testFunction = vi.fn(async () => {
        throw new Error('Async error');
      });
      
      await expect(
        RenderTrackingIntegration.measureAsyncPerformance(
          'TestComponent',
          'failing-async-operation',
          testFunction
        )
      ).rejects.toThrow('Async error');
      
      expect(logger.trackPerformanceImpact).toHaveBeenCalledWith({
        component: 'TestComponent.failing-async-operation',
        renderDuration: expect.any(Number),
        timestamp: expect.any(Number),
        memoryUsage: undefined
      });
    });
  });

  describe('getComponentStats', () => {
    it('should return component statistics', () => {
      const stats = RenderTrackingIntegration.getComponentStats('TestComponent');
      
      expect(logger.getRenderStats).toHaveBeenCalledWith('TestComponent');
      expect(stats).toEqual({
        totalRenders: 10,
        averageRenderTime: 8.5,
        lastRenderTime: expect.any(Number),
        infiniteRenderAlerts: 0,
        mountCount: 2,
        unmountCount: 1
      });
    });

    it('should return global statistics when no component specified', () => {
      RenderTrackingIntegration.getComponentStats();
      
      expect(logger.getRenderStats).toHaveBeenCalledWith(undefined);
    });
  });

  describe('clearStats', () => {
    it('should clear component statistics', () => {
      // First track some renders to set up counters
      RenderTrackingIntegration.trackComponentRender('TestComponent');
      RenderTrackingIntegration.trackComponentRender('TestComponent');
      
      RenderTrackingIntegration.clearStats('TestComponent');
      
      expect(logger.clearRenderStats).toHaveBeenCalledWith('TestComponent');
      
      // Verify counter is reset
      RenderTrackingIntegration.trackComponentRender('TestComponent');
      expect(logger.trackRender).toHaveBeenLastCalledWith({
        component: 'TestComponent',
        renderCount: 1, // Should start from 1 again
        timestamp: expect.any(Number),
        trigger: 'component-render'
      });
    });

    it('should clear all statistics when no component specified', () => {
      RenderTrackingIntegration.clearStats();
      
      expect(logger.clearRenderStats).toHaveBeenCalledWith(undefined);
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive report', () => {
      const report = RenderTrackingIntegration.generateReport();
      
      expect(report).toContain('Render Tracking Report');
      expect(report).toContain('Total Renders: 10');
      expect(report).toContain('Average Render Time: 8.50ms');
      expect(report).toContain('Infinite Render Alerts: 0');
      expect(report).toContain('Component Mounts: 2');
      expect(report).toContain('Component Unmounts: 1');
      expect(report).toContain('✅ Average render time is acceptable');
      expect(report).toContain('✅ No infinite render loops detected');
    });

    it('should show warnings for performance issues', () => {
      // Mock stats with performance issues
      (logger.getRenderStats as any).mockReturnValue({
        totalRenders: 1500,
        averageRenderTime: 25.5, // > 16ms
        lastRenderTime: Date.now(),
        infiniteRenderAlerts: 3, // > 0
        mountCount: 5,
        unmountCount: 2
      });

      const report = RenderTrackingIntegration.generateReport();
      
      expect(report).toContain('⚠️ Average render time exceeds 16ms');
      expect(report).toContain('🚨 Infinite render loops detected!');
      expect(report).toContain('- High render count detected');
      expect(report).toContain('- Fix infinite render loops immediately');
      expect(report).toContain('- Optimize slow rendering components');
    });
  });

  describe('convenience functions', () => {
    it('should export convenience functions that work correctly', () => {
      trackRender('TestComponent', 'convenience-test');
      expect(logger.trackRender).toHaveBeenCalled();

      trackLifecycle('TestComponent', 'mount');
      expect(logger.trackLifecycle).toHaveBeenCalled();

      const result = measurePerformance('TestComponent', 'test', () => 'test-result');
      expect(result).toBe('test-result');
      expect(logger.trackPerformanceImpact).toHaveBeenCalled();
    });
  });
});