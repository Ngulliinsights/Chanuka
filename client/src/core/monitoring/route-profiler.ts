/**
 * Route Performance Profiler
 *
 * Profiles route performance and provides insights for optimization
 *
 * Requirements: 11.4, 11.5
 */

import { logger } from '@client/utils/logger';

/**
 * Route performance data
 */
export interface RoutePerformanceData {
  route: string;
  loadTime: number;
  renderTime: number;
  resourceCount: number;
  memoryUsage: number;
  timestamp: Date;
}

/**
 * Route Performance Profiler
 */
export class RouteProfiler {
  private static instance: RouteProfiler;
  private performanceData: Map<string, RoutePerformanceData[]> = new Map();

  private constructor() {}

  public static getInstance(): RouteProfiler {
    if (!RouteProfiler.instance) {
      RouteProfiler.instance = new RouteProfiler();
    }
    return RouteProfiler.instance;
  }

  /**
   * Profile a route's performance
   */
  public profileRoute(route: string): RoutePerformanceData | null {
    if (typeof window === 'undefined') return null;

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');
      const memoryInfo = (performance as any).memory;

      if (!navigation) return null;

      const data: RoutePerformanceData = {
        route,
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        renderTime: navigation.domInteractive - navigation.fetchStart,
        resourceCount: resources.length,
        memoryUsage: memoryInfo ? memoryInfo.usedJSHeapSize : 0,
        timestamp: new Date()
      };

      // Store the data
      if (!this.performanceData.has(route)) {
        this.performanceData.set(route, []);
      }
      this.performanceData.get(route)!.push(data);

      // Keep only last 10 entries per route
      const routeData = this.performanceData.get(route)!;
      if (routeData.length > 10) {
        this.performanceData.set(route, routeData.slice(-10));
      }

      logger.debug('Route performance profiled', { route, data });
      return data;
    } catch (error) {
      logger.error('Failed to profile route performance', { error, route });
      return null;
    }
  }

  /**
   * Get performance data for a route
   */
  public getRouteData(route: string): RoutePerformanceData[] {
    return this.performanceData.get(route) || [];
  }

  /**
   * Get all performance data
   */
  public getAllData(): Map<string, RoutePerformanceData[]> {
    return new Map(this.performanceData);
  }

  /**
   * Clear performance data
   */
  public clearData(): void {
    this.performanceData.clear();
    logger.info('Route performance data cleared');
  }
}

export const routeProfiler = RouteProfiler.getInstance();
export default RouteProfiler;
