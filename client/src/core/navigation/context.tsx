/**
 * Unified Navigation Context - Now uses Redux for state management
 * Maintains backward compatibility while migrating to Redux-based navigation state
 */

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { RootState } from '@client/store';
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
} from '@client/store/slices/navigationSlice';

import { NavigationContextValue, UserRole, BreadcrumbItem, RelatedPage } from './types';
import { generateBreadcrumbs, calculateRelatedPages, determineNavigationSection, isNavigationPathActive } from './utils';
// navigationPersistenceUtils intentionally unused here

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function createNavigationProvider(
  useLocation: () => { pathname: string },
  useNavigate: () => (path: string) => void,
  useAuth: () => { user: any; isAuthenticated: boolean },
  useMediaQuery: (query: string) => boolean
) {
  return function NavigationProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const isMobileQuery = useMediaQuery('(max-width: 767px)');

    // Select navigation state from Redux store
    const state = useSelector((state: RootState) => state.navigation);

    // Handle mounting
    useEffect(() => {
      dispatch(setMounted(true));
    }, [dispatch]);

    // Coordinated state updates to prevent race conditions
    useEffect(() => {
      let hasUpdates = false;
      const updates: Array<() => void> = [];

      // Check mobile state
      if (state.isMobile !== isMobileQuery) {
        updates.push(() => {
          dispatch(setMobile(isMobileQuery));
          if (isMobileQuery) {
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
          dispatch(setCurrentSection(determineNavigationSection(currentPath)) as any);
          dispatch(updateBreadcrumbs(generateBreadcrumbs(currentPath) as any));
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
      isMobileQuery, 
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
      dispatch(updateBreadcrumbs(breadcrumbs as any));
    }, [dispatch]);

    const updateRelatedPagesAction = useCallback((pages: RelatedPage[]) => {
      dispatch(updateRelatedPages(pages as any));
    }, [dispatch]);

    const updateUserRole = useCallback((role: UserRole) => {
      dispatch(setUserRole(role));
    }, [dispatch]);

    const updatePreferencesAction = useCallback((preferences: Partial<any>) => {
      dispatch(updatePreferences(preferences));
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

