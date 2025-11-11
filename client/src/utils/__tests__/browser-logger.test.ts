import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, type RenderTrackingData, type ComponentLifecycleData, type PerformanceImpactData } from '../logger';

// Mock console methods
const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Browser Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Logger Interface', () => {
    it('should have all required methods', () => {
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should have render tracking methods', () => {
      expect(logger).toHaveProperty('trackRender');
      expect(logger).toHaveProperty('trackLifecycle');
      expect(logger).toHaveProperty('trackPerformanceImpact');
      expect(logger).toHaveProperty('detectInfiniteRender');
      expect(logger).toHaveProperty('getRenderStats');
      expect(logger).toHaveProperty('clearRenderStats');
      expect(typeof logger.trackRender).toBe('function');
      expect(typeof logger.trackLifecycle).toBe('function');
      expect(typeof logger.trackPerformanceImpact).toBe('function');
      expect(typeof logger.detectInfiniteRender).toBe('function');
      expect(typeof logger.getRenderStats).toBe('function');
      expect(typeof logger.clearRenderStats).toBe('function');
    });
  });

  describe('Debug Logging', () => {
    it('should log debug messages in development', () => {
      // Mock NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logger.debug('Test debug message', { component: 'Test' });

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', 'Test debug message', { component: 'Test' });

      // Restore
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logger.debug('Test debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();

      // Restore
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle debug without context', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logger.debug('Simple message');

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', 'Simple message');

      // Restore
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Info Logging', () => {
    it('should log info messages', () => {
      logger.info('Test info message', { component: 'Test' });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'Test info message', { component: 'Test' });
    });

    it('should handle info without context', () => {
      logger.info('Simple info');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'Simple info');
    });
  });

  describe('Warning Logging', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning message', { component: 'Test' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'Test warning message', { component: 'Test' });
    });

    it('should handle warn without context', () => {
      logger.warn('Simple warning');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'Simple warning');
    });
  });

  describe('Error Logging', () => {
    it('should log error messages with context', () => {
      const error = new Error('Test error');
      logger.error('Test error message', { component: 'Test' }, error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Test error message', { component: 'Test' }, error);
    });

    it('should handle error without context', () => {
      logger.error('Simple error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Simple error');
    });

    it('should handle error with only error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', undefined, error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Error occurred', undefined, error);
    });
  });

  describe('Message Formatting', () => {
    it('should prefix all messages correctly', () => {
      logger.info('test');
      logger.warn('test');
      logger.error('test');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'test');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'test');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'test');
    });

    it('should handle complex context objects', () => {
      const context = {
        component: 'TestComponent',
        userId: 123,
        metadata: { key: 'value' },
        timestamp: new Date(),
      };

      logger.info('Complex context test', context);

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'Complex context test', context);
    });
  });

  describe('Environment Handling', () => {
    it('should work in different environments', () => {
      const environments = ['development', 'production', 'test', undefined];

      environments.forEach(env => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = env;

        // Should not throw in any environment
        expect(() => {
          logger.info('Environment test');
          logger.warn('Environment test');
          logger.error('Environment test');
        }).not.toThrow();

        // Restore
        process.env.NODE_ENV = originalEnv;
      });
    });

    it('should handle missing process.env', () => {
      const originalProcess = global.process;
      delete (global as any).process;

      expect(() => {
        logger.info('No process test');
      }).not.toThrow();

      // Restore
      global.process = originalProcess;
    });
  });

  describe('Browser Compatibility', () => {
    it('should work without console methods', () => {
      const originalConsole = global.console;
      global.console = {} as any;

      expect(() => {
        logger.info('No console test');
        logger.warn('No console test');
        logger.error('No console test');
      }).not.toThrow();

      // Restore
      global.console = originalConsole;
    });

    it('should handle console method overrides', () => {
      const originalInfo = console.info;
      console.info = vi.fn(() => {
        throw new Error('Console override error');
      });

      expect(() => {
        logger.info('Override test');
      }).not.toThrow();

      // Restore
      console.info = originalInfo;
    });
  });

  describe('Render Tracking', () => {
    beforeEach(() => {
      // Clear render stats before each test
      logger.clearRenderStats();
    });

    describe('trackRender', () => {
      it('should track render data', () => {
        const renderData: RenderTrackingData = {
          component: 'TestComponent',
          renderCount: 1,
          timestamp: Date.now(),
          trigger: 'props-change',
          props: { id: 1 }
        };

        expect(() => {
          logger.trackRender(renderData);
        }).not.toThrow();

        const stats = logger.getRenderStats('TestComponent');
        expect(stats.totalRenders).toBe(1);
      });

      it('should handle multiple renders for same component', () => {
        const baseTime = Date.now();
        
        for (let i = 1; i <= 3; i++) {
          logger.trackRender({
            component: 'TestComponent',
            renderCount: i,
            timestamp: baseTime + i * 100,
            trigger: 'state-change'
          });
        }

        const stats = logger.getRenderStats('TestComponent');
        expect(stats.totalRenders).toBe(3);
        expect(stats.lastRenderTime).toBe(baseTime + 300);
      });

      it('should log debug message in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        logger.trackRender({
          component: 'TestComponent',
          renderCount: 1,
          timestamp: Date.now(),
          trigger: 'initial-render'
        });

        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[DEBUG]',
          '[RENDER_TRACK]',
          expect.objectContaining({
            component: 'TestComponent',
            renderCount: 1,
            trigger: 'initial-render'
          })
        );

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('trackLifecycle', () => {
      it('should track component lifecycle events', () => {
        const lifecycleData: ComponentLifecycleData = {
          component: 'TestComponent',
          action: 'mount',
          timestamp: Date.now(),
          props: { id: 1 }
        };

        expect(() => {
          logger.trackLifecycle(lifecycleData);
        }).not.toThrow();

        const stats = logger.getRenderStats('TestComponent');
        expect(stats.mountCount).toBe(1);
      });

      it('should track mount and unmount events', () => {
        const baseTime = Date.now();

        logger.trackLifecycle({
          component: 'TestComponent',
          action: 'mount',
          timestamp: baseTime
        });

        logger.trackLifecycle({
          component: 'TestComponent',
          action: 'unmount',
          timestamp: baseTime + 1000
        });

        const stats = logger.getRenderStats('TestComponent');
        expect(stats.mountCount).toBe(1);
        expect(stats.unmountCount).toBe(1);
      });
    });

    describe('trackPerformanceImpact', () => {
      it('should track performance data', () => {
        const performanceData: PerformanceImpactData = {
          component: 'TestComponent',
          renderDuration: 5.5,
          timestamp: Date.now(),
          memoryUsage: 1024 * 1024 * 10 // 10MB
        };

        expect(() => {
          logger.trackPerformanceImpact(performanceData);
        }).not.toThrow();
      });

      it('should warn about slow renders', () => {
        logger.trackPerformanceImpact({
          component: 'SlowComponent',
          renderDuration: 20, // > 16ms threshold
          timestamp: Date.now()
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARN]',
          '[SLOW_RENDER]',
          expect.objectContaining({
            component: 'SlowComponent',
            duration: '20.00ms',
            threshold: '16ms'
          })
        );
      });

      it('should not warn about fast renders', () => {
        logger.trackPerformanceImpact({
          component: 'FastComponent',
          renderDuration: 5, // < 16ms threshold
          timestamp: Date.now()
        });

        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          '[WARN]',
          '[SLOW_RENDER]',
          expect.anything()
        );
      });
    });

    describe('detectInfiniteRender', () => {
      it('should detect infinite renders when threshold exceeded', () => {
        const baseTime = Date.now();
        
        // Simulate 60 renders in 1 second (exceeds default threshold of 50)
        for (let i = 0; i < 60; i++) {
          logger.trackRender({
            component: 'InfiniteComponent',
            renderCount: i + 1,
            timestamp: baseTime + i * 16, // ~60fps
            trigger: 'infinite-loop'
          });
        }

        const hasInfiniteRender = logger.detectInfiniteRender('InfiniteComponent');
        expect(hasInfiniteRender).toBe(true);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[ERROR]',
          '[INFINITE_RENDER_DETECTED]',
          expect.objectContaining({
            component: 'InfiniteComponent',
            rendersPerSecond: expect.any(Number)
          })
        );
      });

      it('should not detect infinite renders when under threshold', () => {
        const baseTime = Date.now();
        
        // Simulate 30 renders in 1 second (under threshold)
        for (let i = 0; i < 30; i++) {
          logger.trackRender({
            component: 'NormalComponent',
            renderCount: i + 1,
            timestamp: baseTime + i * 33, // ~30fps
            trigger: 'normal-render'
          });
        }

        const hasInfiniteRender = logger.detectInfiniteRender('NormalComponent');
        expect(hasInfiniteRender).toBe(false);
      });

      it('should use custom threshold', () => {
        const baseTime = Date.now();
        
        // Simulate 15 renders in 1 second
        for (let i = 0; i < 15; i++) {
          logger.trackRender({
            component: 'CustomThresholdComponent',
            renderCount: i + 1,
            timestamp: baseTime + i * 66,
            trigger: 'custom-test'
          });
        }

        // Should not trigger with default threshold (50)
        expect(logger.detectInfiniteRender('CustomThresholdComponent')).toBe(false);
        
        // Should trigger with custom threshold (10)
        expect(logger.detectInfiniteRender('CustomThresholdComponent', 10)).toBe(true);
      });
    });

    describe('getRenderStats', () => {
      it('should return stats for specific component', () => {
        logger.trackRender({
          component: 'StatsComponent',
          renderCount: 1,
          timestamp: Date.now(),
          trigger: 'test'
        });

        logger.trackLifecycle({
          component: 'StatsComponent',
          action: 'mount',
          timestamp: Date.now()
        });

        const stats = logger.getRenderStats('StatsComponent');
        expect(stats).toEqual({
          totalRenders: 1,
          averageRenderTime: 0, // No performance data tracked
          lastRenderTime: expect.any(Number),
          infiniteRenderAlerts: 0,
          mountCount: 1,
          unmountCount: 0
        });
      });

      it('should return aggregated stats for all components', () => {
        logger.trackRender({
          component: 'Component1',
          renderCount: 1,
          timestamp: Date.now(),
          trigger: 'test'
        });

        logger.trackRender({
          component: 'Component2',
          renderCount: 1,
          timestamp: Date.now(),
          trigger: 'test'
        });

        const stats = logger.getRenderStats();
        expect(stats.totalRenders).toBe(2);
      });

      it('should calculate average render time correctly', () => {
        logger.trackRender({
          component: 'PerfComponent',
          renderCount: 1,
          timestamp: Date.now(),
          trigger: 'test'
        });

        logger.trackPerformanceImpact({
          component: 'PerfComponent',
          renderDuration: 10,
          timestamp: Date.now()
        });

        logger.trackRender({
          component: 'PerfComponent',
          renderCount: 2,
          timestamp: Date.now(),
          trigger: 'test'
        });

        logger.trackPerformanceImpact({
          component: 'PerfComponent',
          renderDuration: 20,
          timestamp: Date.now()
        });

        const stats = logger.getRenderStats('PerfComponent');
        expect(stats.averageRenderTime).toBe(15); // (10 + 20) / 2
      });
    });

    describe('clearRenderStats', () => {
      it('should clear stats for specific component', () => {
        logger.trackRender({
          component: 'ClearTestComponent',
          renderCount: 1,
          timestamp: Date.now(),
          trigger: 'test'
        });

        expect(logger.getRenderStats('ClearTestComponent').totalRenders).toBe(1);

        logger.clearRenderStats('ClearTestComponent');

        expect(logger.getRenderStats('ClearTestComponent').totalRenders).toBe(0);
      });

      it('should clear stats for all components', () => {
        logger.trackRender({
          component: 'Component1',
          renderCount: 1,
          timestamp: Date.now(),
          trigger: 'test'
        });

        logger.trackRender({
          component: 'Component2',
          renderCount: 1,
          timestamp: Date.now(),
          trigger: 'test'
        });

        expect(logger.getRenderStats().totalRenders).toBe(2);

        logger.clearRenderStats();

        expect(logger.getRenderStats().totalRenders).toBe(0);
      });
    });

    describe('Error Handling', () => {
      it('should handle errors gracefully in trackRender', () => {
        // Test with invalid data
        expect(() => {
          logger.trackRender(null as any);
        }).not.toThrow();

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[WARN]',
          'Failed to track render',
          expect.anything(),
          expect.any(Error)
        );
      });

      it('should handle errors gracefully in detectInfiniteRender', () => {
        // Should not throw even with invalid component name
        expect(() => {
          logger.detectInfiniteRender('');
        }).not.toThrow();
      });

      it('should return default stats on error', () => {
        // Mock an error in the render tracker
        const originalGetRenderStats = logger.getRenderStats;
        (logger as any).getRenderStats = () => {
          throw new Error('Test error');
        };

        const stats = logger.getRenderStats('ErrorComponent');
        expect(stats).toEqual({
          totalRenders: 0,
          averageRenderTime: 0,
          lastRenderTime: 0,
          infiniteRenderAlerts: 0,
          mountCount: 0,
          unmountCount: 0
        });

        // Restore
        (logger as any).getRenderStats = originalGetRenderStats;
      });
    });

    describe('Memory Management', () => {
      it('should limit history size to prevent memory leaks', () => {
        // Track more than the max history size (1000)
        for (let i = 0; i < 1200; i++) {
          logger.trackRender({
            component: 'MemoryTestComponent',
            renderCount: i + 1,
            timestamp: Date.now() + i,
            trigger: 'memory-test'
          });
        }

        const stats = logger.getRenderStats('MemoryTestComponent');
        // Should be limited to max history size
        expect(stats.totalRenders).toBeLessThanOrEqual(1000);
      });
    });
  });
});