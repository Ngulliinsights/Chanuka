/**
 * Optimized Navigation Hook
 * 
 * Performance-optimized navigation hook with memoization,
 * lazy loading, and efficient state management.
 * 
 * Implements Phase 2 recommendations for navigation performance.
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppSelector, useAppDispatch } from '@client/hooks/redux';
import { selectNavigationState } from '@client/store/slices/navigationSlice';
import { navigationUtils } from '@client/utils/navigation';
import { logger } from '@client/utils/logger';

interface OptimizedNavigationOptions {
  enableAnalytics?: boolean;
  enablePreloading?: boolean;
  enableCaching?: boolean;
  cacheSize?: number;
}

interface NavigationCache {
  [path: string]: {
    timestamp: number;
    data: any;
  };
}

export function useOptimizedNavigation(options: OptimizedNavigationOptions = {}) {
  const {
    enableAnalytics = true,
    enablePreloading = true,
    enableCaching = true,
    cacheSize = 50
  } = options;

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const navigationState = useAppSelector(selectNavigationState);

  // Cache for navigation data
  const cacheRef = useRef<NavigationCache>({});
  const preloadedRef = useRef<Set<string>>(new Set());

  // Memoized navigation utilities
  const utils = useMemo(() => navigationUtils, []);

  // Optimized navigation function with preloading
  const navigateOptimized = useCallback((path: string, options?: { replace?: boolean; preload?: boolean }) => {
    const startTime = performance.now();

    try {
      // Track navigation event
      if (enableAnalytics) {
        utils.trackNavigationEvent('navigation_click', {
          path,
          source: 'optimized_navigation'
        });
      }

      // Preload route if enabled
      if (enablePreloading && options?.preload && !preloadedRef.current.has(path)) {
        preloadRoute(path);
        preloadedRef.current.add(path);
      }

      // Navigate
      if (options?.replace) {
        navigate(path, { replace: true });
      } else {
        navigate(path);
      }

      // Log performance
      const navigationTime = performance.now() - startTime;
      logger.debug('Navigation completed', {
        path,
        navigationTime,
        cached: cacheRef.current[path] ? true : false
      });

    } catch (error) {
      logger.error('Navigation failed', { error, path });
    }
  }, [navigate, enableAnalytics, enablePreloading, utils]);

  // Preload route data
  const preloadRoute = useCallback(async (path: string) => {
    if (!enablePreloading) return;

    try {
      // Check cache first
      const cached = cacheRef.current[path];
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
        return cached.data;
      }

      // Simulate route data preloading
      // In a real app, this would fetch route-specific data
      const routeData = {
        path,
        timestamp: Date.now(),
        metadata: {
          title: `Page ${path}`,
          description: `Content for ${path}`
        }
      };

      // Cache the data
      if (enableCaching) {
        cacheRef.current[path] = {
          timestamp: Date.now(),
          data: routeData
        };

        // Cleanup old cache entries
        const cacheKeys = Object.keys(cacheRef.current);
        if (cacheKeys.length > cacheSize) {
          const sortedKeys = cacheKeys.sort((a, b) => 
            cacheRef.current[a].timestamp - cacheRef.current[b].timestamp
          );
          const keysToRemove = sortedKeys.slice(0, cacheKeys.length - cacheSize);
          keysToRemove.forEach(key => delete cacheRef.current[key]);
        }
      }

      return routeData;
    } catch (error) {
      logger.error('Route preloading failed', { error, path });
    }
  }, [enablePreloading, enableCaching, cacheSize]);

  // Optimized breadcrumb generation
  const breadcrumbs = useMemo(() => {
    return utils.generateBreadcrumbs(location.pathname);
  }, [location.pathname, utils]);

  // Optimized related pages calculation
  const relatedPages = useMemo(() => {
    return utils.findRelatedPages(location.pathname);
  }, [location.pathname, utils]);

  // Search function with debouncing
  const searchRef = useRef<NodeJS.Timeout>();
  const searchNavigation = useCallback((query: string, callback?: (results: any[]) => void) => {
    // Clear previous search timeout
    if (searchRef.current) {
      clearTimeout(searchRef.current);
    }

    // Debounce search
    searchRef.current = setTimeout(() => {
      try {
        const results = utils.searchNavigationItems(query, []);
        
        if (enableAnalytics) {
          utils.trackNavigationEvent('search', {
            query,
            source: 'optimized_navigation'
          });
        }

        callback?.(results);
      } catch (error) {
        logger.error('Navigation search failed', { error, query });
      }
    }, 300);
  }, [utils, enableAnalytics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchRef.current) {
        clearTimeout(searchRef.current);
      }
    };
  }, []);

  // Performance monitoring
  const performanceMetrics = useMemo(() => ({
    cacheSize: Object.keys(cacheRef.current).length,
    preloadedRoutes: preloadedRef.current.size,
    currentPath: location.pathname,
    navigationState: navigationState.currentPath
  }), [location.pathname, navigationState.currentPath]);

  return {
    // Navigation state
    currentPath: location.pathname,
    navigationState,
    breadcrumbs,
    relatedPages,

    // Navigation actions
    navigate: navigateOptimized,
    preloadRoute,
    searchNavigation,

    // Utilities
    utils,

    // Performance data
    performanceMetrics,

    // Cache management
    clearCache: () => {
      cacheRef.current = {};
      preloadedRef.current.clear();
    },
    getCacheStats: () => ({
      size: Object.keys(cacheRef.current).length,
      preloaded: preloadedRef.current.size
    })
  };
}

export default useOptimizedNavigation;