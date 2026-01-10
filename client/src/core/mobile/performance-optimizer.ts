/**
 * Mobile Performance Optimizer Module
 *
 * Utility class for mobile performance optimization including
 * frame rate monitoring, resource management, and adaptive quality settings.
 *
 * @module core/mobile/performance-optimizer
 */

import { logger } from '@client/shared/utils/logger';

import { DeviceDetector } from './device-detector';

/**
 * Utility class for mobile performance optimization including
 * frame rate monitoring, resource management, and adaptive quality settings.
 */
export class MobilePerformanceOptimizer {
  private static instance: MobilePerformanceOptimizer;
  private frameTimestamps: number[] = [];
  private readonly MAX_FRAME_SAMPLES = 60;
  private rafId: number | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  private constructor() {
    this.setupPerformanceMonitoring();
  }

  static getInstance(): MobilePerformanceOptimizer {
    if (!MobilePerformanceOptimizer.instance) {
      MobilePerformanceOptimizer.instance = new MobilePerformanceOptimizer();
    }
    return MobilePerformanceOptimizer.instance;
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor frame rate using requestAnimationFrame
    this.startFrameRateMonitoring();

    // Use PerformanceObserver for detailed metrics if available
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' || entry.entryType === 'longtask') {
              logger.debug('Performance entry', {
                name: entry.name,
                duration: entry.duration,
                type: entry.entryType,
              });
            }
          }
        });

        this.performanceObserver.observe({
          entryTypes: ['measure', 'navigation', 'resource', 'longtask'],
        });
      } catch (error) {
        logger.warn('PerformanceObserver not fully supported', { error });
      }
    }
  }

  private startFrameRateMonitoring(): void {
    const measureFrame = (timestamp: number) => {
      this.frameTimestamps.push(timestamp);

      // Keep only recent frames
      if (this.frameTimestamps.length > this.MAX_FRAME_SAMPLES) {
        this.frameTimestamps.shift();
      }

      this.rafId = requestAnimationFrame(measureFrame);
    };

    this.rafId = requestAnimationFrame(measureFrame);
  }

  /**
   * Calculate average frames per second over recent samples
   */
  getAverageFPS(): number {
    if (this.frameTimestamps.length < 2) return 60; // Assume 60 FPS if not enough data

    const first = this.frameTimestamps[0];
    const last = this.frameTimestamps[this.frameTimestamps.length - 1];
    const elapsed = last - first;
    const frameCount = this.frameTimestamps.length - 1;

    return Math.round((frameCount / elapsed) * 1000);
  }

  /**
   * Check if device is experiencing performance issues
   */
  isPerformanceDegraded(): boolean {
    const fps = this.getAverageFPS();
    return fps < 30; // Consider performance degraded below 30 FPS
  }

  /**
   * Get performance recommendations based on current metrics
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const fps = this.getAverageFPS();
    const deviceInfo = DeviceDetector.getInstance().getDeviceInfo();

    if (fps < 30) {
      recommendations.push('Reduce animation complexity');
      recommendations.push('Disable non-essential visual effects');
    }

    if (deviceInfo.pixelRatio > 2) {
      recommendations.push('Consider reducing image resolution for high-DPI displays');
    }

    if (deviceInfo.screenSize === 'xs') {
      recommendations.push('Simplify layout for small screens');
      recommendations.push('Reduce concurrent network requests');
    }

    if (
      typeof performance !== 'undefined' &&
      (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory
    ) {
      const memory = (
        performance as Performance & {
          memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      if (usagePercent > 80) {
        recommendations.push('Memory usage high - clear caches and reduce in-memory data');
      }
    }

    return recommendations;
  }

  /**
   * Apply automatic performance optimizations based on device capabilities
   */
  applyAutoOptimizations(): void {
    const deviceInfo = DeviceDetector.getInstance().getDeviceInfo();
    const fps = this.getAverageFPS();

    logger.info('Applying automatic performance optimizations', {
      fps,
      deviceInfo: {
        screenSize: deviceInfo.screenSize,
        pixelRatio: deviceInfo.pixelRatio,
        isMobile: deviceInfo.isMobile,
      },
    });

    // Reduce quality on low-end devices
    if (fps < 30 || deviceInfo.screenSize === 'xs') {
      const event = new CustomEvent('mobile:reduceQuality', {
        detail: {
          level: fps < 20 ? 'low' : 'medium',
          reason: fps < 30 ? 'low_fps' : 'small_screen',
        },
      });
      window.dispatchEvent(event);
    }

    // Optimize for high-DPI displays
    if (deviceInfo.pixelRatio > 2) {
      const event = new CustomEvent('mobile:optimizeForHighDPI', {
        detail: { pixelRatio: deviceInfo.pixelRatio },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Measure the execution time of a function
   */
  measurePerformance<T>(name: string, fn: () => T): T {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    const measureName = `${name}-measure`;

    performance.mark(startMark);
    const result = fn();
    performance.mark(endMark);

    try {
      performance.measure(measureName, startMark, endMark);
      const measure = performance.getEntriesByName(measureName)[0];

      logger.debug(`Performance: ${name}`, {
        duration: measure.duration.toFixed(2) + 'ms',
      });

      // Clean up marks and measures
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);
    } catch (error) {
      logger.warn('Performance measurement failed', { name, error });
    }

    return result;
  }

  /**
   * Clean up performance monitoring
   */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.frameTimestamps = [];
  }
}

// Singleton instance
export const mobilePerformanceOptimizer = MobilePerformanceOptimizer.getInstance();
