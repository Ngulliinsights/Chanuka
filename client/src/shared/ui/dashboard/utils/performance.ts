/**
 * Dashboard Performance Utilities
 *
 * Utilities for monitoring and optimizing dashboard performance
 * to meet the 3-second load requirement.
 */

import { logger } from '@client/utils/logger';

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  dataFetchTime: number;
  personaDetectionTime: number;
}

export class DashboardPerformanceMonitor {
  private startTime: number;
  private metrics: Partial<PerformanceMetrics> = {};

  constructor() {
    this.startTime = performance.now();
  }

  markDataFetchStart() {
    this.metrics.dataFetchTime = performance.now();
  }

  markDataFetchEnd() {
    if (this.metrics.dataFetchTime) {
      this.metrics.dataFetchTime = performance.now() - this.metrics.dataFetchTime;
    }
  }

  markPersonaDetectionStart() {
    this.metrics.personaDetectionTime = performance.now();
  }

  markPersonaDetectionEnd() {
    if (this.metrics.personaDetectionTime) {
      this.metrics.personaDetectionTime = performance.now() - this.metrics.personaDetectionTime;
    }
  }

  markRenderComplete() {
    this.metrics.renderTime = performance.now() - this.startTime;
    this.metrics.loadTime = this.metrics.renderTime;

    this.logPerformanceMetrics();
    this.checkPerformanceRequirements();
  }

  private logPerformanceMetrics() {
    logger.info('Dashboard performance metrics', {
      ...this.metrics,
      timestamp: new Date().toISOString(),
    });
  }

  private checkPerformanceRequirements() {
    const { loadTime } = this.metrics;

    if (loadTime && loadTime > 3000) {
      logger.warn('Dashboard load time exceeded 3 second requirement', {
        loadTimeMs: Math.round(loadTime),
        requirement: '3000ms',
        exceedsBy: Math.round(loadTime - 3000),
      });
    } else if (loadTime) {
      logger.info('Dashboard load time within requirements', {
        loadTimeMs: Math.round(loadTime),
        requirement: '3000ms',
      });
    }
  }

  getMetrics(): PerformanceMetrics {
    return {
      loadTime: this.metrics.loadTime || 0,
      renderTime: this.metrics.renderTime || 0,
      dataFetchTime: this.metrics.dataFetchTime || 0,
      personaDetectionTime: this.metrics.personaDetectionTime || 0,
    };
  }
}

/**
 * Hook for monitoring dashboard performance
 */
export function useDashboardPerformance() {
  const monitor = React.useRef<DashboardPerformanceMonitor>();

  React.useEffect(() => {
    monitor.current = new DashboardPerformanceMonitor();

    return () => {
      if (monitor.current) {
        monitor.current.markRenderComplete();
      }
    };
  }, []);

  return {
    markDataFetchStart: () => monitor.current?.markDataFetchStart(),
    markDataFetchEnd: () => monitor.current?.markDataFetchEnd(),
    markPersonaDetectionStart: () => monitor.current?.markPersonaDetectionStart(),
    markPersonaDetectionEnd: () => monitor.current?.markPersonaDetectionEnd(),
    getMetrics: () =>
      monitor.current?.getMetrics() || {
        loadTime: 0,
        renderTime: 0,
        dataFetchTime: 0,
        personaDetectionTime: 0,
      },
  };
}

/**
 * Optimize dashboard widget loading with lazy loading
 */
export function createLazyDashboardWidget<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  return React.lazy(async () => {
    const start = performance.now();

    try {
      const module = await importFn();
      const loadTime = performance.now() - start;

      logger.debug('Dashboard widget loaded', {
        loadTimeMs: Math.round(loadTime),
        componentName: module.default.name || 'Unknown',
      });

      return module;
    } catch (error) {
      logger.error('Failed to load dashboard widget', { error });

      if (fallback) {
        return { default: fallback };
      }

      throw error;
    }
  });
}

// Add React import for the hook
import React from 'react';
