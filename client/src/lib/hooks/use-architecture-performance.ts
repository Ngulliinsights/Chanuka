/**
 * Architecture Performance Hooks
 *
 * React hooks for integrating with the architecture performance monitoring system.
 */

import { useCallback, useEffect, useRef } from 'react';

import { architecturePerformanceMonitor } from '@client/core/performance/architecture-performance-monitor';

interface UseArchitecturePerformanceOptions {
  componentName?: string;
  trackLoad?: boolean;
  trackRender?: boolean;
  enableJourneyTracking?: boolean;
}

interface UseArchitecturePerformanceReturn {
  markComponentStart: () => void;
  markComponentEnd: () => void;
  startJourney: (journeyId: string, userPersona?: 'novice' | 'intermediate' | 'expert') => void;
  addJourneyStep: (stepName: string, success?: boolean) => void;
  completeJourney: () => void;
  recordSearchPerformance: (
    query: string,
    responseTime: number,
    resultCount: number,
    searchType?: 'unified' | 'intelligent' | 'legacy'
  ) => void;
  recordDashboardPerformance: (
    dashboardType: 'adaptive' | 'legacy',
    loadTime: number,
    widgetCount: number,
    personaDetected?: 'novice' | 'intermediate' | 'expert'
  ) => void;
}

/**
 * Hook for component-level architecture performance monitoring
 */
export function useArchitecturePerformance(
  options: UseArchitecturePerformanceOptions = {}
): UseArchitecturePerformanceReturn {
  const {
    componentName = 'UnknownComponent',
    trackLoad = true,
    trackRender = false,
    enableJourneyTracking = false,
  } = options;

  const mountTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  /**
   * Mark component load start
   */
  const markComponentStart = useCallback(() => {
    architecturePerformanceMonitor.markComponentStart(componentName);
    mountTimeRef.current = performance.now();
  }, [componentName]);

  /**
   * Mark component load end
   */
  const markComponentEnd = useCallback(() => {
    architecturePerformanceMonitor.markComponentEnd(componentName);
  }, [componentName]);

  /**
   * Start user journey tracking
   */
  const startJourney = useCallback(
    (journeyId: string, userPersona?: 'novice' | 'intermediate' | 'expert') => {
      architecturePerformanceMonitor.startUserJourney(journeyId, userPersona);
    },
    []
  );

  /**
   * Add step to current journey
   */
  const addJourneyStep = useCallback((stepName: string, success: boolean = true) => {
    architecturePerformanceMonitor.addJourneyStep(stepName, success);
  }, []);

  /**
   * Complete current journey
   */
  const completeJourney = useCallback(() => {
    architecturePerformanceMonitor.completeUserJourney();
  }, []);

  /**
   * Record search performance
   */
  const recordSearchPerformance = useCallback(
    (
      query: string,
      responseTime: number,
      resultCount: number,
      searchType: 'unified' | 'intelligent' | 'legacy' = 'unified'
    ) => {
      architecturePerformanceMonitor.recordSearchPerformance(
        query,
        responseTime,
        resultCount,
        searchType
      );
    },
    []
  );

  /**
   * Record dashboard performance
   */
  const recordDashboardPerformance = useCallback(
    (
      dashboardType: 'adaptive' | 'legacy',
      loadTime: number,
      widgetCount: number,
      personaDetected?: 'novice' | 'intermediate' | 'expert'
    ) => {
      architecturePerformanceMonitor.recordDashboardPerformance(
        dashboardType,
        loadTime,
        widgetCount,
        personaDetected
      );
    },
    []
  );

  // Auto-track component lifecycle
  useEffect(() => {
    if (trackLoad) {
      markComponentStart();

      return () => {
        markComponentEnd();
      };
    }
  }, [trackLoad, markComponentStart, markComponentEnd]);

  // Track renders if enabled
  useEffect(() => {
    if (trackRender) {
      renderCountRef.current += 1;

      // Record render performance after paint
      const rafId = requestAnimationFrame(() => {
        const renderTime = performance.now() - mountTimeRef.current;
        architecturePerformanceMonitor.recordComponentLoad(
          `${componentName}-render-${renderCountRef.current}`,
          renderTime
        );
      });

      return () => {
        cancelAnimationFrame(rafId);
      };
    }
  });

  return {
    markComponentStart,
    markComponentEnd,
    startJourney,
    addJourneyStep,
    completeJourney,
    recordSearchPerformance,
    recordDashboardPerformance,
  };
}

/**
 * Hook for route-level performance monitoring
 */
export function useRoutePerformance(routeName: string) {
  const routeStartTime = useRef<number>(0);

  useEffect(() => {
    // Mark route start
    routeStartTime.current = performance.now();

    // Track route transition when component mounts
    const fromRoute = document.referrer ? new URL(document.referrer).pathname : '';
    const toRoute = window.location.pathname;

    if (fromRoute && fromRoute !== toRoute) {
      architecturePerformanceMonitor.trackRouteTransition(fromRoute, toRoute);
    }

    return () => {
      // Route is unmounting, could track exit time here
      const routeTime = performance.now() - routeStartTime.current;
      console.debug(`Route ${routeName} active for ${routeTime}ms`);
    };
  }, [routeName]);

  return {
    routeStartTime: routeStartTime.current,
  };
}

/**
 * Hook for search performance monitoring
 */
export function useSearchPerformance() {
  const searchStartTime = useRef<number>(0);

  const startSearch = useCallback((query: string) => {
    searchStartTime.current = performance.now();
    performance.mark(`search-${query}-start`);
  }, []);

  const endSearch = useCallback(
    (
      query: string,
      resultCount: number,
      searchType: 'unified' | 'intelligent' | 'legacy' = 'unified'
    ) => {
      const responseTime = performance.now() - searchStartTime.current;
      performance.mark(`search-${query}-end`);
      performance.measure(`search-${query}`, `search-${query}-start`, `search-${query}-end`);

      architecturePerformanceMonitor.recordSearchPerformance(
        query,
        responseTime,
        resultCount,
        searchType
      );

      return responseTime;
    },
    []
  );

  return {
    startSearch,
    endSearch,
  };
}

/**
 * Hook for dashboard performance monitoring
 */
export function useDashboardPerformance(dashboardType: 'adaptive' | 'legacy' = 'adaptive') {
  const loadStartTime = useRef<number>(0);
  const widgetCount = useRef<number>(0);

  const startDashboardLoad = useCallback(() => {
    loadStartTime.current = performance.now();
    performance.mark(`dashboard-${dashboardType}-start`);
  }, [dashboardType]);

  const endDashboardLoad = useCallback(
    (personaDetected?: 'novice' | 'intermediate' | 'expert', customizationLevel: number = 0) => {
      const loadTime = performance.now() - loadStartTime.current;
      performance.mark(`dashboard-${dashboardType}-end`);
      performance.measure(
        `dashboard-${dashboardType}`,
        `dashboard-${dashboardType}-start`,
        `dashboard-${dashboardType}-end`
      );

      architecturePerformanceMonitor.recordDashboardPerformance(
        dashboardType,
        loadTime,
        widgetCount.current,
        personaDetected,
        customizationLevel
      );

      return loadTime;
    },
    [dashboardType]
  );

  const setWidgetCount = useCallback((count: number) => {
    widgetCount.current = count;
  }, []);

  // Auto-start timing on mount
  useEffect(() => {
    startDashboardLoad();
  }, [startDashboardLoad]);

  return {
    startDashboardLoad,
    endDashboardLoad,
    setWidgetCount,
  };
}

/**
 * Hook for user journey tracking
 */
export function useUserJourney(
  journeyId: string,
  userPersona?: 'novice' | 'intermediate' | 'expert'
) {
  const journeyStarted = useRef<boolean>(false);

  const startJourney = useCallback(() => {
    if (!journeyStarted.current) {
      architecturePerformanceMonitor.startUserJourney(journeyId, userPersona);
      journeyStarted.current = true;
    }
  }, [journeyId, userPersona]);

  const addStep = useCallback((stepName: string, success: boolean = true) => {
    if (journeyStarted.current) {
      architecturePerformanceMonitor.addJourneyStep(stepName, success);
    }
  }, []);

  const completeJourney = useCallback(() => {
    if (journeyStarted.current) {
      architecturePerformanceMonitor.completeUserJourney();
      journeyStarted.current = false;
    }
  }, []);

  // Auto-start journey on mount
  useEffect(() => {
    startJourney();

    return () => {
      // Auto-complete journey on unmount if still active
      if (journeyStarted.current) {
        completeJourney();
      }
    };
  }, [startJourney, completeJourney]);

  return {
    addStep,
    completeJourney,
    isActive: journeyStarted.current,
  };
}

/**
 * Hook for navigation performance monitoring
 */
export function useNavigationPerformance() {
  const navigationStartTime = useRef<number>(0);

  const startNavigation = useCallback(
    (navigationType: 'breadcrumb' | 'menu' | 'command-palette' | 'direct') => {
      navigationStartTime.current = performance.now();
    },
    []
  );

  const endNavigation = useCallback(
    (
      navigationType: 'breadcrumb' | 'menu' | 'command-palette' | 'direct',
      clicksToDestination: number,
      destinationReached: boolean = true
    ) => {
      const timeToDestination = performance.now() - navigationStartTime.current;

      // This would be recorded by the main monitor
      // For now, just log the navigation performance
      console.debug('Navigation completed', {
        navigationType,
        clicksToDestination,
        timeToDestination,
        destinationReached,
      });

      return timeToDestination;
    },
    []
  );

  return {
    startNavigation,
    endNavigation,
  };
}
