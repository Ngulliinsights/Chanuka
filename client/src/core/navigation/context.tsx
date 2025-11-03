/**
 * Unified Navigation Context - Consolidated from NavigationContext and ResponsiveNavigationContext
 * Best practices: State persistence, responsive behavior, breadcrumb generation
 */

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { NavigationState, NavigationContextValue, UserRole, BreadcrumbItem, RelatedPage } from './types';
import { navigationReducer } from './reducer';
import { generateBreadcrumbs, calculateRelatedPages, determineNavigationSection, isNavigationPathActive } from './utils';
import { NavigationStatePersistence } from './persistence';

const initialState: NavigationState = {
  currentPath: '/',
  previousPath: '/',
  breadcrumbs: [],
  relatedPages: [],
  currentSection: 'legislative',
  sidebarOpen: false,
  mobileMenuOpen: false,
  isMobile: false,
  sidebarCollapsed: false,
  mounted: false,
  user_role: 'public',
  preferences: {
    defaultLandingPage: '/',
    favoritePages: [],
    recentlyVisited: [],
    compactMode: false,
    showBreadcrumbs: true,
    autoExpand: false,
  },
};

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function createNavigationProvider(
  useLocation: () => { pathname: string },
  useNavigate: () => (path: string) => void,
  useAuth: () => { user: any; isAuthenticated: boolean },
  useMediaQuery: (query: string) => boolean
) {
  return function NavigationProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(navigationReducer, initialState);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const isMobileQuery = useMediaQuery('(max-width: 767px)');
    
    // Use refs to track ongoing navigation updates and prevent race conditions
    const navigationUpdateRef = useRef<string | null>(null);
    const persistenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Handle mounting and hydration
    useEffect(() => {
      dispatch({ type: 'SET_MOUNTED', payload: true });
      
      // Load persisted navigation state on mount
      const persistedState = NavigationStatePersistence.loadNavigationState();
      if (persistedState) {
        dispatch({ type: 'LOAD_PERSISTED_STATE', payload: persistedState });
      }
    }, []);

    // Update mobile state when media query changes
    useEffect(() => {
      if (state.mounted) {
        dispatch({ type: 'SET_MOBILE', payload: isMobileQuery });
        
        // On mobile, sidebar should be collapsed by default
        // On desktop, sidebar should be open by default (unless user has saved preference)
        if (isMobileQuery) {
          dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: true });
        } else {
          const savedSidebarState = NavigationStatePersistence.loadSidebarState();
          if (savedSidebarState === null) {
            dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: false });
          }
        }
      }
    }, [isMobileQuery, state.mounted]);

    // Sync navigation state with authentication changes
    useEffect(() => {
      dispatch({ 
        type: 'SYNC_AUTH_STATE', 
        payload: { user, isAuthenticated } 
      });
      
      // Reset user-specific state when user logs out
      if (!isAuthenticated && state.user_role !== 'public') {
        dispatch({ type: 'RESET_USER_SPECIFIC_STATE' });
        NavigationStatePersistence.clearUserSpecificState();
      }
    }, [user, isAuthenticated, state.user_role]);

    // Debounced persistence to avoid excessive localStorage writes
    useEffect(() => {
      if (persistenceTimerRef.current) {
        clearTimeout(persistenceTimerRef.current);
      }
      
      persistenceTimerRef.current = setTimeout(() => {
        NavigationStatePersistence.saveNavigationState(state);
      }, 500);

      return () => {
        if (persistenceTimerRef.current) {
          clearTimeout(persistenceTimerRef.current);
        }
      };
    }, [state.preferences, state.sidebarOpen, state.sidebarCollapsed]);

    // Update navigation state when location changes
    useEffect(() => {
      const currentPath = location.pathname;
      
      // If this path is already being processed, skip to avoid race conditions
      if (navigationUpdateRef.current === currentPath) {
        return;
      }
      
      // Mark this path as being processed
      navigationUpdateRef.current = currentPath;
      
      // Calculate all navigation data synchronously to ensure consistency
      const section = determineNavigationSection(currentPath);
      const breadcrumbs = generateBreadcrumbs(currentPath);
      const relatedPages = calculateRelatedPages(currentPath, state.user_role);
      const pageTitle = document.title || currentPath;
      
      // Dispatch a single batched update to minimize re-renders
      dispatch({ 
        type: 'BATCH_NAVIGATION_UPDATE', 
        payload: {
          currentPath,
          section,
          breadcrumbs,
          relatedPages,
          recentPage: { path: currentPath, title: pageTitle },
          closeMobileMenu: state.mobileMenuOpen
        }
      });
      
      // Clear the processing flag after a brief delay
      const timeoutId = setTimeout(() => {
        navigationUpdateRef.current = null;
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }, [location.pathname, state.user_role]);

    // Context value with all functionality
    const contextValue: NavigationContextValue = {
      ...state,
      
      // Navigation actions
      navigateTo: (path: string) => {
        navigate(path);
      },
      
      updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => {
        dispatch({ type: 'SET_BREADCRUMBS', payload: breadcrumbs });
      },
      
      updateRelatedPages: (pages: RelatedPage[]) => {
        dispatch({ type: 'SET_RELATED_PAGES', payload: pages });
      },
      
      updateUserRole: (role: UserRole) => {
        dispatch({ type: 'SET_USER_ROLE', payload: role });
      },
      
      updatePreferences: (preferences) => {
        dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
      },
      
      addToRecentPages: (page: { path: string; title: string }) => {
        // Update recent pages manually
        const updatedRecentPages = NavigationStatePersistence.updateRecentPages(
          state.preferences.recentlyVisited, 
          page
        );
        dispatch({ 
          type: 'UPDATE_PREFERENCES', 
          payload: { recentlyVisited: updatedRecentPages } 
        });
      },
      
      // UI actions (merged from ResponsiveNavigationContext)
      toggleSidebar: () => {
        dispatch({ type: 'TOGGLE_SIDEBAR' });
      },
      
      toggleMobileMenu: () => {
        dispatch({ type: 'TOGGLE_MOBILE_MENU' });
      },
      
      setSidebarCollapsed: (collapsed: boolean) => {
        dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed });
      },
      
      is_active: (path: string) => {
        return isNavigationPathActive(path, state.currentPath);
      },
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

