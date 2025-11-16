/**
 * Unified Navigation Context - Now uses Redux for state management
 * Maintains backward compatibility while migrating to Redux-based navigation state
 */

import React, { createContext, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import {
  setCurrentPath,
  updateBreadcrumbs,
  updateRelatedPages,
  setCurrentSection,
  toggleSidebar,
  setSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  setMobile,
  setSidebarCollapsed,
  setMounted,
  setUserRole,
  updatePreferences,
  addToRecentPages,
  loadPersistedState,
  clearPersistedState,
  updateRecentPages
} from '../../store/slices/navigationSlice';
import { NavigationContextValue, UserRole, BreadcrumbItem, RelatedPage } from './types';
import { generateBreadcrumbs, calculateRelatedPages, determineNavigationSection, isNavigationPathActive } from './utils';
import { navigationPersistenceUtils } from '../../store/middleware/navigationPersistenceMiddleware';

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

    // Update mobile state when media query changes
    useEffect(() => {
      if (state.isMobile !== isMobileQuery) {
        dispatch(setMobile(isMobileQuery));
        if (isMobileQuery) {
          dispatch(setSidebarCollapsed(true));
        }
      }
    }, [isMobileQuery, state.isMobile, dispatch]);

    // Sync navigation state with authentication changes
    useEffect(() => {
      const newUserRole = isAuthenticated && user?.role
        ? (user.role as UserRole)
        : 'public';

      if (state.user_role !== newUserRole) {
        dispatch(setUserRole(newUserRole));
      }

      if (!isAuthenticated && state.user_role !== 'public') {
        dispatch(clearPersistedState());
      }
    }, [user, isAuthenticated, state.user_role, dispatch]);

    // Update navigation on location change
    useEffect(() => {
      const currentPath = location.pathname;
      if (state.currentPath !== currentPath) {
        dispatch(setCurrentPath(currentPath));
        dispatch(setCurrentSection(determineNavigationSection(currentPath)));
        dispatch(updateBreadcrumbs(generateBreadcrumbs(currentPath)));
        dispatch(updateRelatedPages(calculateRelatedPages(currentPath, state.user_role)));
        dispatch(addToRecentPages({ path: currentPath, title: document.title || currentPath }));
      }
    }, [location.pathname, state.currentPath, state.user_role, dispatch]);

    // Navigation actions
    const navigateTo = useCallback((path: string) => {
      navigate(path);
    }, [navigate]);

    const updateBreadcrumbsAction = useCallback((breadcrumbs: BreadcrumbItem[]) => {
      dispatch(updateBreadcrumbs(breadcrumbs));
    }, [dispatch]);

    const updateRelatedPagesAction = useCallback((pages: RelatedPage[]) => {
      dispatch(updateRelatedPages(pages));
    }, [dispatch]);

    const updateUserRole = useCallback((role: UserRole) => {
      dispatch(setUserRole(role));
    }, [dispatch]);

    const updatePreferences = useCallback((preferences: Partial<any>) => {
      dispatch(updatePreferences(preferences));
    }, [dispatch]);

    const addToRecentPages = useCallback((page: { path: string; title: string }) => {
      dispatch(addToRecentPages(page));
    }, [dispatch]);

    const toggleSidebar = useCallback(() => {
      dispatch(toggleSidebar());
    }, [dispatch]);

    const toggleMobileMenu = useCallback(() => {
      dispatch(toggleMobileMenu());
    }, [dispatch]);

    const setSidebarCollapsed = useCallback((collapsed: boolean) => {
      dispatch(setSidebarCollapsed(collapsed));
    }, [dispatch]);

    const is_active = useCallback((path: string) => {
      return isNavigationPathActive(path, state.currentPath);
    }, [state.currentPath]);

    // Context value with all functionality - no memoization to avoid dependency issues
    const contextValue: NavigationContextValue = {
      ...state,
      
      // Navigation actions
      navigateTo,
      updateBreadcrumbs: updateBreadcrumbsAction,
      updateRelatedPages: updateRelatedPagesAction,
      updateUserRole,
      updatePreferences,
      addToRecentPages,
      
      // UI actions (merged from ResponsiveNavigationContext)
      toggleSidebar,
      toggleMobileMenu,
      setSidebarCollapsed,
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

