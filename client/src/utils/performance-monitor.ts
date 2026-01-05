/**
 * Performance Monitoring Utilities
 *
 * Utilities for monitoring and optimizing page performance
 * Requirements: 9.1, 9.2
 */

import { logger } from './logger';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime?: number;
  memoryUsage?: number;
}

interface WebVitals {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private startTime: number = 0;
  private metrics: Map<string, PerformanceMetrics> = new Map();

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start monitoring a page or component
   */
  startMonitoring(pageName: string): void {
    this.startTime = performance.now();

    // Mark the start of monitoring
    if (performance.mark) {
      performance.mark(`${pageName}-start`);
    }
  }

  /**
   * End monitoring and record metrics
   */
  endMonitoring(pageName: string): PerformanceMetrics {
    const endTime = performance.now();
    const loadTime = endTime - this.startTime;

    // Mark the end of monitoring
    if (performance.mark) {
      performance.mark(`${pageName}-end`);
    }

    // Measure the duration
    if (performance.measure) {
      try {
        performance.measure(`${pageName}-duration`, `${pageName}-start`, `${pageName}-end`);
      } catch (error) {
        // Ignore measurement errors
      }
    }

    const metrics: PerformanceMetrics = {
      loadTime,
      renderTime: loadTime, // For now, same as load time
      memoryUsage: this.getMemoryUsage()
    };

    this.metrics.set(pageName, metrics);

    // Log performance metrics
    logger.info(`Performance metrics for ${pageName}`, {
      component: 'PerformanceMonitor',
      metrics
    });

    return metrics;
  }

  /**
   * Get memory usage if available
   */
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorWebVitals(callback?: (vitals: WebVitals) => void): void {
    const vitals: WebVitals = {};

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;

          if (callback) {
            callback(vitals);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            vitals.fid = (entry as any).processingStart - entry.startTime;

            if (callback) {
              callback(vitals);
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();

          entries.forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });

          vitals.cls = clsValue;

          if (callback) {
            callback(vitals);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        logger.warn('Failed to set up Web Vitals monitoring', { error });
      }
    }
  }

  /**
   * Get stored metrics for a page
   */
  getMetrics(pageName: string): PerformanceMetrics | undefined {
    return this.metrics.get(pageName);
  }

  /**
   * Check if page meets performance thresholds
   */
  checkPerformanceThresholds(pageName: string, thresholds: {
    maxLoadTime?: number;
    maxMemoryUsage?: number;
  }): boolean {
    const metrics = this.metrics.get(pageName);
    if (!metrics) return false;

    let passes = true;

    if (thresholds.maxLoadTime && metrics.loadTime > thresholds.maxLoadTime) {
      logger.warn(`${pageName} exceeded load time threshold`, {
        actual: metrics.loadTime,
        threshold: thresholds.maxLoadTime
      });
      passes = false;
    }

    if (thresholds.maxMemoryUsage && metrics.memoryUsage && metrics.memoryUsage > thresholds.maxMemoryUsage) {
      logger.warn(`${pageName} exceeded memory usage threshold`, {
        actual: metrics.memoryUsage,
        threshold: thresholds.maxMemoryUsage
      });
      passes = false;
    }

    return passes;
  }

  /**
   * Preload critical resources
   */
  preloadResource(href: string, as: string, crossorigin?: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;

    if (crossorigin) {
      link.crossOrigin = crossorigin;
    }

    document.head.appendChild(link);
  }

  /**
   * Lazy load images with intersection observer
   */
  lazyLoadImages(selector: string = 'img[data-src]'): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;

            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll(selector).forEach((img) => {
        imageObserver.observe(img);
      });
    } else {
      // Fallback for browsers without IntersectionObserver
      document.querySelectorAll(selector).forEach((img) => {
        const element = img as HTMLImageElement;
        const src = element.dataset.src;
        if (src) {
          element.src = src;
          element.removeAttribute('data-src');
        }
      });
    }
  }

  /**
   * Optimize bundle loading with dynamic imports
   */
  async loadComponentWhenVisible(
    selector: string,
    importFn: () => Promise<any>
  ): Promise<void> {
    const element = document.querySelector(selector);
    if (!element) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(async (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
            try {
              await importFn();
              observer.unobserve(entry.target);
            } catch (error) {
              logger.error('Failed to load component', { error, selector });
            }
          }
        });
      });

      observer.observe(element);
    } else {
      // Load immediately if IntersectionObserver is not available
      try {
        await importFn();
      } catch (error) {
        logger.error('Failed to load component', { error, selector });
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for performance monitoring
export function usePerformanceMonitoring(pageName: string) {
  React.useEffect(() => {
    performanceMonitor.startMonitoring(pageName);

    return () => {
      const _metrics = performanceMonitor.endMonitoring(pageName);

      // Check against home page thresholds
      if (pageName === 'home') {
        performanceMonitor.checkPerformanceThresholds(pageName, {
          maxLoadTime: 2000, // 2 seconds as per requirements
          maxMemoryUsage: 50 * 1024 * 1024 // 50MB
        });
      }
    };
  }, [pageName]);

  React.useEffect(() => {
    // Monitor Web Vitals
    performanceMonitor.monitorWebVitals((vitals) => {
      logger.info(`Web Vitals for ${pageName}`, { vitals });
    });
  }, [pageName]);
}

// Import React for the hook
import React from 'react';
