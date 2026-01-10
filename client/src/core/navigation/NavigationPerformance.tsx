/**
 * NavigationPerformance Component
 *
 * Optimizes navigation performance with preloading and caching
 * Requirements: 5.3, 5.4, 5.5
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, NavigateOptions } from 'react-router-dom';

import { logger } from '@client/shared/utils/logger';

interface NavigationPerformanceProps {
  children: React.ReactNode;
}

type RoutePriority = 'low' | 'medium' | 'high';

interface RoutePreloadConfig {
  route: string;
  priority: RoutePriority;
  preloadDelay: number;
  dependencies?: string[];
}

type RouteModule = Record<string, unknown>;

/**
 * Route preloading configuration
 */
const PRELOAD_CONFIG: RoutePreloadConfig[] = [
  {
    route: '/bills',
    priority: 'high',
    preloadDelay: 1000,
    dependencies: ['/search'],
  },
  {
    route: '/search',
    priority: 'high',
    preloadDelay: 1500,
  },
  {
    route: '/dashboard',
    priority: 'medium',
    preloadDelay: 2000,
  },
  {
    route: '/community',
    priority: 'medium',
    preloadDelay: 2500,
  },
  {
    route: '/account',
    priority: 'low',
    preloadDelay: 3000,
  },
];

/**
 * Route import map for dynamic imports
 */
const ROUTE_IMPORTS: Record<string, () => Promise<RouteModule>> = {
  '/': () => import('../../pages/StrategicHomePage'),
  '/bills': () => import('../../pages/bills/bills-dashboard-page'),
  '/search': () => import('../../pages/UniversalSearchPage'),
  '/dashboard': () => import('../../pages/UserAccountPage'),
  '/community': () => import('../../pages/community-input'),
  '/account': () => import('../../pages/UserAccountPage'),
  '/auth': () => import('../../pages/auth/auth-page'),
};

/**
 * Navigation performance metrics
 */
interface NavigationMetrics {
  routeLoadTime: number;
  preloadSuccess: boolean;
  cacheHit: boolean;
  timestamp: number;
}

/**
 * Optimized navigate function type
 */
interface OptimizedNavigateFunction {
  (to: string, options?: NavigateOptions): void;
}

/**
 * Extended window interface for global navigation function
 */
declare global {
  interface Window {
    __optimizedNavigate?: OptimizedNavigateFunction;
  }
}

class NavigationPerformanceManager {
  private preloadedRoutes = new Set<string>();
  private preloadPromises = new Map<string, Promise<RouteModule>>();
  private navigationMetrics = new Map<string, NavigationMetrics>();
  private intersectionObserver?: IntersectionObserver;
  private performanceObserver?: PerformanceObserver;

  /**
   * Initialize performance optimizations
   */
  initialize() {
    this.setupLinkPreloading();
    this.setupRoutePreloading();
    this.setupNavigationMetrics();
  }

  /**
   * Setup intersection observer for link preloading
   */
  private setupLinkPreloading() {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            const href = link.getAttribute('href');

            if (href && href.startsWith('/') && ROUTE_IMPORTS[href]) {
              this.preloadRoute(href);
            }
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    // Observe all internal links
    this.observeLinks();
  }

  /**
   * Observe all internal navigation links
   */
  observeLinks() {
    if (!this.intersectionObserver) return;

    const links = document.querySelectorAll('a[href^="/"]');
    links.forEach(link => {
      this.intersectionObserver!.observe(link);
    });
  }

  /**
   * Setup automatic route preloading based on configuration
   */
  private setupRoutePreloading() {
    PRELOAD_CONFIG.forEach(config => {
      setTimeout(() => {
        this.preloadRoute(config.route);

        // Preload dependencies
        if (config.dependencies) {
          config.dependencies.forEach(dep => {
            setTimeout(() => this.preloadRoute(dep), 500);
          });
        }
      }, config.preloadDelay);
    });
  }

  /**
   * Setup navigation performance metrics
   */
  private setupNavigationMetrics() {
    // Monitor navigation timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      this.performanceObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;

            // Use fetchStart as the reference point instead of deprecated navigationStart
            const loadTime = navEntry.loadEventEnd - navEntry.fetchStart;

            this.recordNavigationMetrics(window.location.pathname, {
              routeLoadTime: loadTime,
              preloadSuccess: this.preloadedRoutes.has(window.location.pathname),
              cacheHit: navEntry.transferSize === 0,
              timestamp: Date.now(),
            });
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['navigation'] });
    }
  }

  /**
   * Preload a specific route
   */
  async preloadRoute(route: string): Promise<void> {
    if (this.preloadedRoutes.has(route) || this.preloadPromises.has(route)) {
      return;
    }

    const importFn = ROUTE_IMPORTS[route];
    if (!importFn) {
      return;
    }

    const startTime = performance.now();
    const preloadPromise = importFn()
      .then(module => {
        const endTime = performance.now();
        this.preloadedRoutes.add(route);

        logger.info('Route preloaded successfully', {
          component: 'NavigationPerformance',
          route,
          loadTime: endTime - startTime,
        });

        return module;
      })
      .catch((error: Error) => {
        logger.warn('Route preload failed', {
          component: 'NavigationPerformance',
          route,
          error: error.message,
        });

        // Remove from promises map so it can be retried
        this.preloadPromises.delete(route);
        throw error;
      });

    this.preloadPromises.set(route, preloadPromise);

    try {
      await preloadPromise;
    } catch (error) {
      // Error already logged above
    }
  }

  /**
   * Record navigation metrics
   */
  private recordNavigationMetrics(route: string, metrics: NavigationMetrics) {
    this.navigationMetrics.set(route, metrics);

    logger.info('Navigation metrics recorded', {
      component: 'NavigationPerformance',
      route,
      metrics,
    });
  }

  /**
   * Get navigation metrics for a route
   */
  getMetrics(route: string): NavigationMetrics | undefined {
    return this.navigationMetrics.get(route);
  }

  /**
   * Get all navigation metrics
   */
  getAllMetrics(): Map<string, NavigationMetrics> {
    return new Map(this.navigationMetrics);
  }

  /**
   * Check if route is preloaded
   */
  isPreloaded(route: string): boolean {
    return this.preloadedRoutes.has(route);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.preloadedRoutes.clear();
    this.preloadPromises.clear();
    this.navigationMetrics.clear();
  }
}

// Singleton instance
const performanceManager = new NavigationPerformanceManager();

/**
 * NavigationPerformance component optimizes navigation performance
 */
export const NavigationPerformance: React.FC<NavigationPerformanceProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const initializeRef = useRef(false);

  /**
   * Initialize performance manager
   */
  useEffect(() => {
    if (!initializeRef.current) {
      performanceManager.initialize();
      initializeRef.current = true;
    }

    return () => {
      performanceManager.cleanup();
    };
  }, []);

  /**
   * Handle route changes for performance tracking
   */
  useEffect(() => {
    const currentRoute = location.pathname;

    // Check if route was preloaded
    const wasPreloaded = performanceManager.isPreloaded(currentRoute);

    logger.info('Navigation performance check', {
      component: 'NavigationPerformance',
      route: currentRoute,
      wasPreloaded,
    });

    // Preload likely next routes based on current route
    const preloadNext = () => {
      switch (currentRoute) {
        case '/':
          performanceManager.preloadRoute('/bills');
          performanceManager.preloadRoute('/search');
          break;
        case '/bills':
          performanceManager.preloadRoute('/search');
          break;
        case '/search':
          performanceManager.preloadRoute('/bills');
          break;
        case '/auth':
          performanceManager.preloadRoute('/dashboard');
          break;
      }
    };

    // Preload after a short delay
    const timeoutId = setTimeout(preloadNext, 1000);
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  /**
   * Enhanced navigation function with performance optimizations
   */
  const optimizedNavigate = useCallback<OptimizedNavigateFunction>(
    (to: string, options?: NavigateOptions) => {
      const startTime = performance.now();

      // Check if route is already preloaded
      const isPreloaded = performanceManager.isPreloaded(to);

      logger.info('Optimized navigation initiated', {
        component: 'NavigationPerformance',
        to,
        isPreloaded,
        from: location.pathname,
      });

      // If not preloaded, try to preload before navigation
      if (!isPreloaded && ROUTE_IMPORTS[to]) {
        performanceManager.preloadRoute(to).finally(() => {
          const endTime = performance.now();
          logger.info('Navigation completed', {
            component: 'NavigationPerformance',
            to,
            totalTime: endTime - startTime,
          });
        });
      }

      // Perform navigation
      navigate(to, options);
    },
    [navigate, location.pathname]
  );

  /**
   * Expose optimized navigate function to child components
   */
  useEffect(() => {
    // Store optimized navigate function globally for use by other components
    window.__optimizedNavigate = optimizedNavigate;

    return () => {
      delete window.__optimizedNavigate;
    };
  }, [optimizedNavigate]);

  /**
   * Update link observers when DOM changes
   */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Re-observe links when DOM changes
      setTimeout(() => {
        performanceManager.observeLinks();
      }, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
};

export default NavigationPerformance;
