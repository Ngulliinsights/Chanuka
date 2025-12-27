/**
 * Unified Navigation Context - Now uses Redux for state management
 * Maintains backward compatibility while migrating to Redux-based navigation state
 */

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { RootState } from '../../shared/infrastructure/store';
import {
  setCurrentPath,
  updateBreadcrumbs,
  updateRelatedPages,
  setCurrentSection,
  toggleSidebar,
  toggleMobileMenu,
  setMobile,
  setSidebarCollapsed,
  setMounted,
  setUserRole,
  updatePreferences,
  addToRecentPages,
  clearPersistedState,
} from '../../shared/infrastructure/store/slices/navigationSlice';
import { UserRole } from '../../shared/types/navigation';

import { NavigationContextValue, BreadcrumbItem, RelatedPage } from './types';
import { generateBreadcrumbs, calculateRelatedPages, determineNavigationSection, isNavigationPathActive } from './utils';
// navigationPersistenceUtils intentionally unused here

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function createNavigationProvider(
  useLocation: () => { pathname: string },
  useNavigate: () => (path: string) => void,
  useAuth: () => { user: { role?: UserRole } | null; isAuthenticated: boolean },
  useDeviceInfo: () => { isMobile: boolean; isTablet: boolean; isDesktop: boolean }
) {
  return function NavigationProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { isMobile } = useDeviceInfo();

    // Select navigation state from Redux store
    const state = useSelector((state: RootState) => (state as any).navigation);

    // Handle mounting
    useEffect(() => {
      dispatch(setMounted(true));
    }, [dispatch]);

    // Coordinated state updates to prevent race conditions
    useEffect(() => {
      let hasUpdates = false;
      const updates: Array<() => void> = [];

      // Check mobile state
      if (state.isMobile !== isMobile) {
        updates.push(() => {
          dispatch(setMobile(isMobile));
          if (isMobile) {
            dispatch(setSidebarCollapsed(true));
          }
        });
        hasUpdates = true;
      }

      // Check user role
      const newUserRole = isAuthenticated && user?.role
        ? (user.role as UserRole)
        : 'public';

      if (state.user_role !== newUserRole) {
        updates.push(() => dispatch(setUserRole(newUserRole)));
        hasUpdates = true;
      }

      // Check authentication state
      if (!isAuthenticated && state.user_role !== 'public') {
        updates.push(() => dispatch(clearPersistedState()));
        hasUpdates = true;
      }

      // Check current path
      const currentPath = location.pathname;
      if (state.currentPath !== currentPath) {
        updates.push(() => {
          dispatch(setCurrentPath(currentPath));
          dispatch(setCurrentSection(determineNavigationSection(currentPath)));
          dispatch(updateBreadcrumbs(generateBreadcrumbs(currentPath)));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatch(updateRelatedPages(calculateRelatedPages(currentPath, state.user_role) as any));
          dispatch(addToRecentPages({ path: currentPath, title: document.title || currentPath }));
        });
        hasUpdates = true;
      }

      // Apply all updates atomically in a single batch
      if (hasUpdates) {
        // Execute all updates in sequence to maintain consistency
        updates.forEach(update => update());
      }
    }, [
      state.isMobile,
      isMobile,
      state.user_role,
      isAuthenticated,
      user?.role,
      state.currentPath,
      location.pathname,
      dispatch
    ]);

    // Navigation actions
    const navigateTo = useCallback((path: string) => {
      navigate(path);
    }, [navigate]);

    const updateBreadcrumbsAction = useCallback((breadcrumbs: BreadcrumbItem[]) => {
      dispatch(updateBreadcrumbs(breadcrumbs));
    }, [dispatch]);

    const updateRelatedPagesAction = useCallback((pages: RelatedPage[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(updateRelatedPages(pages as any));
    }, [dispatch]);

    const updateUserRole = useCallback((role: UserRole) => {
      dispatch(setUserRole(role));
    }, [dispatch]);

    const updatePreferencesAction = useCallback((preferences: Partial<{ defaultLandingPage: string; favoritePages: string[]; compactMode: boolean; showBreadcrumbs: boolean; autoExpand: boolean }>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(updatePreferences(preferences as any));
    }, [dispatch]);

    const addToRecentPagesAction = useCallback((page: { path: string; title: string }) => {
      dispatch(addToRecentPages(page));
    }, [dispatch]);

    const toggleSidebarAction = useCallback(() => {
      dispatch(toggleSidebar());
    }, [dispatch]);

    const toggleMobileMenuAction = useCallback(() => {
      dispatch(toggleMobileMenu());
    }, [dispatch]);

    const setSidebarCollapsedAction = useCallback((collapsed: boolean) => {
      dispatch(setSidebarCollapsed(collapsed));
    }, [dispatch]);

    const is_active = useCallback((path: string) => {
      return isNavigationPathActive(path, state.currentPath);
    }, [state.currentPath]);

    // Context value with all functionality - no memoization to avoid dependency issues
    // Use `any` here to bridge type differences between core and shared navigation types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contextValue: any = {
      ...state,
      
      // Navigation actions
      navigateTo,
      updateBreadcrumbs: updateBreadcrumbsAction,
      updateRelatedPages: updateRelatedPagesAction,
      updateUserRole,
      updatePreferences: updatePreferencesAction,
      addToRecentPages: addToRecentPagesAction,
      
      // UI actions (merged from ResponsiveNavigationContext)
      toggleSidebar: toggleSidebarAction,
      toggleMobileMenu: toggleMobileMenuAction,
      setSidebarCollapsed: setSidebarCollapsedAction,
      is_active,
    };

    return (
      <NavigationContext.Provider value={contextValue}>
        {children}
      </NavigationContext.Provider>
    );
  };
}

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

