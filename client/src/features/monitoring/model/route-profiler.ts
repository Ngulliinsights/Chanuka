/**
 * Route Performance Profiler
 *
 * Tracks and profiles route performance metrics for optimization
 */

import { logger } from '@client/lib/utils/logger';

interface RouteMetrics {
  path: string;
  loadTime: number;
  renderTime: number;
  timestamp: number;
}

class RouteProfiler {
  private static instance: RouteProfiler;
  private metrics: RouteMetrics[] = [];

  static getInstance(): RouteProfiler {
    if (!RouteProfiler.instance) {
      RouteProfiler.instance = new RouteProfiler();
    }
    return RouteProfiler.instance;
  }

  profileRoute(path: string, loadTime: number, renderTime: number): void {
    const metric: RouteMetrics = {
      path,
      loadTime,
      renderTime,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50);
    }

    logger.debug('Route profiled', { metric });
  }

  getMetrics(): RouteMetrics[] {
    return [...this.metrics];
  }

  getMetricsForRoute(path: string): RouteMetrics[] {
    return this.metrics.filter(m => m.path === path);
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const routeProfiler = RouteProfiler.getInstance();

export type { RouteMetrics };
