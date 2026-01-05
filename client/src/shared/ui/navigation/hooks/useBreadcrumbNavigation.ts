/**
 * Breadcrumb Navigation Hook
 *
 * Provides integration between breadcrumb generation and the navigation store.
 * Automatically updates breadcrumbs when routes change and provides utilities
 * for custom breadcrumb management.
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { generateBreadcrumbs } from '@/core/navigation/breadcrumbs';
import {
  updateBreadcrumbs,
  selectBreadcrumbs,
  selectNavigationPreferences
} from '@/shared/infrastructure/store/slices/navigationSlice';
import type { BreadcrumbItem } from '@/shared/types/navigation';

interface UseBreadcrumbNavigationOptions {
  /** Whether to automatically generate breadcrumbs from the current path */
  autoGenerate?: boolean;
  /** Custom breadcrumb generation function */
  customGenerator?: (pathname: string) => BreadcrumbItem[];
  /** Whether to update breadcrumbs on route changes */
  updateOnRouteChange?: boolean;
}

interface BreadcrumbNavigationReturn {
  /** Current breadcrumbs from the store */
  breadcrumbs: BreadcrumbItem[];
  /** Function to manually update breadcrumbs */
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  /** Function to generate breadcrumbs for a given path */
  generateBreadcrumbsForPath: (path: string) => BreadcrumbItem[];
  /** Function to add a breadcrumb item */
  addBreadcrumb: (item: BreadcrumbItem) => void;
  /** Function to remove the last breadcrumb */
  popBreadcrumb: () => void;
  /** Whether breadcrumbs are enabled in user preferences */
  breadcrumbsEnabled: boolean;
}

/**
 * Hook for managing breadcrumb navigation state and integration.
 */
export function useBreadcrumbNavigation(
  options: UseBreadcrumbNavigationOptions = {}
): BreadcrumbNavigationReturn {
  const {
    autoGenerate = true,
    customGenerator,
    updateOnRouteChange = true,
  } = options;

  const location = useLocation();
  const dispatch = useDispatch();
  const breadcrumbs = useSelector(selectBreadcrumbs);
  const preferences = useSelector(selectNavigationPreferences);

  // Function to generate breadcrumbs for a given path
  const generateBreadcrumbsForPath = useCallback((path: string): BreadcrumbItem[] => {
    if (customGenerator) {
      return customGenerator(path);
    }
    return generateBreadcrumbs(path, []);
  }, [customGenerator]);

  // Function to manually set breadcrumbs
  const setBreadcrumbs = useCallback((newBreadcrumbs: BreadcrumbItem[]) => {
    dispatch(updateBreadcrumbs(newBreadcrumbs));
  }, [dispatch]);

  // Function to add a breadcrumb item
  const addBreadcrumb = useCallback((item: BreadcrumbItem) => {
    const newBreadcrumbs = [...breadcrumbs];

    // Mark previous items as not active
    newBreadcrumbs.forEach(crumb => {
      crumb.is_active = false;
    });

    // Add new item as active
    newBreadcrumbs.push({ ...item, is_active: true });

    dispatch(updateBreadcrumbs(newBreadcrumbs));
  }, [breadcrumbs, dispatch]);

  // Function to remove the last breadcrumb
  const popBreadcrumb = useCallback(() => {
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);

      // Mark the new last item as active
      if (newBreadcrumbs.length > 0) {
        newBreadcrumbs[newBreadcrumbs.length - 1].is_active = true;
      }

      dispatch(updateBreadcrumbs(newBreadcrumbs));
    }
  }, [breadcrumbs, dispatch]);

  // Auto-generate breadcrumbs when route changes
  useEffect(() => {
    if (autoGenerate && updateOnRouteChange && preferences.showBreadcrumbs) {
      const newBreadcrumbs = generateBreadcrumbsForPath(location.pathname);
      dispatch(updateBreadcrumbs(newBreadcrumbs));
    }
  }, [
    location.pathname,
    autoGenerate,
    updateOnRouteChange,
    preferences.showBreadcrumbs,
    generateBreadcrumbsForPath,
    dispatch
  ]);

  return {
    breadcrumbs,
    setBreadcrumbs,
    generateBreadcrumbsForPath,
    addBreadcrumb,
    popBreadcrumb,
    breadcrumbsEnabled: preferences.showBreadcrumbs,
  };
}

/**
 * Hook for pages that need custom breadcrumb logic.
 * This is a simpler version that just provides the update function.
 */
export function useCustomBreadcrumbs() {
  const dispatch = useDispatch();

  const updateBreadcrumbsForPage = useCallback((breadcrumbs: BreadcrumbItem[]) => {
    dispatch(updateBreadcrumbs(breadcrumbs));
  }, [dispatch]);

  return { updateBreadcrumbs: updateBreadcrumbsForPage };
}

/**
 * Route-specific breadcrumb configurations.
 * This can be extended to provide custom breadcrumb logic for specific routes.
 */
export const routeBreadcrumbConfig: Record<string, (pathname: string) => BreadcrumbItem[]> = {
  // Bills routes
  '/bills': () => [
    { label: 'Home', path: '/', is_active: false },
    { label: 'Bills', path: '/bills', is_active: true },
  ],

  '/bills/:id': (pathname: string) => {
    const billId = pathname.split('/')[2];
    return [
      { label: 'Home', path: '/', is_active: false },
      { label: 'Bills', path: '/bills', is_active: false },
      { label: `Bill ${billId}`, path: pathname, is_active: true },
    ];
  },

  '/bills/:id/analysis': (pathname: string) => {
    const billId = pathname.split('/')[2];
    return [
      { label: 'Home', path: '/', is_active: false },
      { label: 'Bills', path: '/bills', is_active: false },
      { label: `Bill ${billId}`, path: `/bills/${billId}`, is_active: false },
      { label: 'Analysis', path: pathname, is_active: true },
    ];
  },

  // Search routes
  '/search': () => [
    { label: 'Home', path: '/', is_active: false },
    { label: 'Search', path: '/search', is_active: true },
  ],

  '/results': () => [
    { label: 'Home', path: '/', is_active: false },
    { label: 'Search', path: '/search', is_active: false },
    { label: 'Results', path: '/results', is_active: true },
  ],

  // User routes
  '/dashboard': () => [
    { label: 'Home', path: '/', is_active: false },
    { label: 'Dashboard', path: '/dashboard', is_active: true },
  ],

  '/account': () => [
    { label: 'Home', path: '/', is_active: false },
    { label: 'Account', path: '/account', is_active: true },
  ],

  '/account/settings': () => [
    { label: 'Home', path: '/', is_active: false },
    { label: 'Account', path: '/account', is_active: false },
    { label: 'Settings', path: '/account/settings', is_active: true },
  ],

  // Community routes
  '/community': () => [
    { label: 'Home', path: '/', is_active: false },
    { label: 'Community', path: '/community', is_active: true },
  ],

  // Admin routes
  '/admin': () => [
    { label: 'Home', path: '/', is_active: false },
    { label: 'Administration', path: '/admin', is_active: true },
  ],
};

/**
 * Enhanced breadcrumb generator that uses route-specific configurations.
 */
export function generateEnhancedBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Check for exact route match first
  if (routeBreadcrumbConfig[pathname]) {
    return routeBreadcrumbConfig[pathname](pathname);
  }

  // Check for parameterized routes
  for (const [route, generator] of Object.entries(routeBreadcrumbConfig)) {
    if (route.includes(':')) {
      const routePattern = route.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      if (regex.test(pathname)) {
        return generator(pathname);
      }
    }
  }

  // Fall back to automatic generation using core logic
  return generateBreadcrumbs(pathname, []);
}
