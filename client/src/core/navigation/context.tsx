/**
 * Unified Navigation Context - Consolidated from NavigationContext and ResponsiveNavigationContext
 * Best practices: State persistence, responsive behavior, breadcrumb generation
 */

import React, { createContext, useContext, useReducer, useEffect, useRef, useMemo, useCallback } from 'react';
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
    const lastLocationRef = useRef<string>('');
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Handle mounting and hydration
    useEffect(() => {
      isMountedRef.current = true;
      dispatch({ type: 'SET_MOUNTED', payload: true });
      
      // Load persisted navigation state on mount
      const persistedState = NavigationStatePersistence.loadNavigationState();
      if (persistedState) {
        dispatch({ type: 'LOAD_PERSISTED_STATE', payload: persistedState });
      }
      
      // Cleanup function to mark component as unmounted
      return () => {
        isMountedRef.current = false;
        
        // Clear all timers on unmount
        if (persistenceTimerRef.current) {
          clearTimeout(persistenceTimerRef.current);
        }
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    // Refs to track previous values and prevent unnecessary updates
    const prevMobileStateRef = useRef<boolean | null>(null);
    const sidebarStateInitializedRef = useRef(false);
    
    // Update mobile state when media query changes - with race condition prevention
    useEffect(() => {
      if (state.mounted && prevMobileStateRef.current !== isMobileQuery) {
        prevMobileStateRef.current = isMobileQuery;
        
        // Only dispatch if the mobile state actually changed
        if (state.isMobile !== isMobileQuery) {
          dispatch({ type: 'SET_MOBILE', payload: isMobileQuery });
        }
        
        // Initialize sidebar state only once to prevent loops
        if (!sidebarStateInitializedRef.current) {
          sidebarStateInitializedRef.current = true;
          
          if (isMobileQuery) {
            dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: true });
          } else {
            const savedSidebarState = NavigationStatePersistence.loadSidebarState();
            if (savedSidebarState === null) {
              dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: false });
            }
          }
        } else {
          // For subsequent changes, only update if transitioning between mobile/desktop
          const wasMobile = !isMobileQuery;
          const isNowMobile = isMobileQuery;
          
          if (wasMobile !== isNowMobile) {
            // Debounce sidebar state changes during responsive transitions
            setTimeout(() => {
              if (isMountedRef.current && prevMobileStateRef.current === isMobileQuery) {
                dispatch({ 
                  type: 'SET_SIDEBAR_COLLAPSED', 
                  payload: isMobileQuery 
                });
              }
            }, 100);
          }
        }
      }
    }, [isMobileQuery, state.mounted, state.isMobile]);

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
      // Only persist if component is mounted and state is stable
      if (!state.mounted || !isMountedRef.current) {
        return;
      }
      
      if (persistenceTimerRef.current) {
        clearTimeout(persistenceTimerRef.current);
        persistenceTimerRef.current = null;
      }
      
      persistenceTimerRef.current = setTimeout(() => {
        // Double-check component is still mounted before persisting
        if (isMountedRef.current) {
          try {
            NavigationStatePersistence.saveNavigationState(state);
          } catch (error) {
            console.warn('Failed to persist navigation state:', error);
          }
        }
        persistenceTimerRef.current = null;
      }, 300); // Reduced timeout for better responsiveness

      return () => {
        if (persistenceTimerRef.current) {
          clearTimeout(persistenceTimerRef.current);
          persistenceTimerRef.current = null;
        }
      };
    }, [state.preferences, state.sidebarOpen, state.sidebarCollapsed, state.mounted]);

    // Stable refs for current state values to avoid stale closures
    const stateRef = useRef(state);
    stateRef.current = state;

    // Enhanced debounced navigation update with better race condition prevention
    const debouncedNavigationUpdate = useCallback((currentPath: string) => {
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      debounceTimerRef.current = setTimeout(() => {
        // Double-check component is still mounted
        if (!isMountedRef.current) {
          return;
        }
        
        // If this path is already being processed or is the same as last processed, skip
        if (navigationUpdateRef.current === currentPath || lastLocationRef.current === currentPath) {
          return;
        }
        
        // Mark this path as being processed
        navigationUpdateRef.current = currentPath;
        
        try {
          // Get current state values from ref to avoid stale closures
          const currentState = stateRef.current;
          
          // Only proceed if state is stable (not in the middle of other updates)
          if (!currentState.mounted) {
            return;
          }
          
          // Calculate all navigation data synchronously to ensure consistency
          const section = determineNavigationSection(currentPath);
          const breadcrumbs = generateBreadcrumbs(currentPath);
          const currentUserRole = currentState.user_role;
          const currentMobileMenuOpen = currentState.mobileMenuOpen;
          const relatedPages = calculateRelatedPages(currentPath, currentUserRole);
          const pageTitle = document.title || currentPath;
          
          // Only dispatch if we have meaningful changes
          const hasChanges = (
            currentState.currentPath !== currentPath ||
            currentState.currentSection !== section ||
            currentState.breadcrumbs.length !== breadcrumbs.length
          );
          
          if (hasChanges) {
            // Dispatch a single batched update to minimize re-renders
            dispatch({ 
              type: 'BATCH_NAVIGATION_UPDATE', 
              payload: {
                currentPath,
                section,
                breadcrumbs,
                relatedPages,
                recentPage: { path: currentPath, title: pageTitle },
                closeMobileMenu: currentMobileMenuOpen
              }
            });
          }
          
          // Update last processed path
          lastLocationRef.current = currentPath;
          
        } catch (error) {
          console.warn('Navigation update error:', error);
        } finally {
          // Clear the processing flag after a brief delay
          setTimeout(() => {
            if (navigationUpdateRef.current === currentPath) {
              navigationUpdateRef.current = null;
            }
          }, 50);
        }
      }, 100); // Reduced debounce time for better responsiveness
    }, []); // Empty dependencies are safe now with stateRef

    // Update navigation state when location changes
    useEffect(() => {
      const currentPath = location.pathname;
      debouncedNavigationUpdate(currentPath);
      
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, [location.pathname, debouncedNavigationUpdate]);

    // Memoized navigation actions to prevent unnecessary re-renders
    const navigateTo = useCallback((path: string) => {
      navigate(path);
    }, [navigate]);
    
    const updateBreadcrumbs = useCallback((breadcrumbs: BreadcrumbItem[]) => {
      dispatch({ type: 'SET_BREADCRUMBS', payload: breadcrumbs });
    }, []);
    
    const updateRelatedPages = useCallback((pages: RelatedPage[]) => {
      dispatch({ type: 'SET_RELATED_PAGES', payload: pages });
    }, []);
    
    const updateUserRole = useCallback((role: UserRole) => {
      dispatch({ type: 'SET_USER_ROLE', payload: role });
    }, []);
    
    const updatePreferences = useCallback((preferences: any) => {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
    }, []);
    
    const addToRecentPages = useCallback((page: { path: string; title: string }) => {
      // Get current recent pages from ref to avoid stale closures
      const currentRecentPages = stateRef.current.preferences.recentlyVisited;
      const updatedRecentPages = NavigationStatePersistence.updateRecentPages(
        currentRecentPages, 
        page
      );
      dispatch({ 
        type: 'UPDATE_PREFERENCES', 
        payload: { recentlyVisited: updatedRecentPages } 
      });
    }, []); // Empty dependencies are safe now with stateRef
    
    const toggleSidebar = useCallback(() => {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }, []);
    
    const toggleMobileMenu = useCallback(() => {
      dispatch({ type: 'TOGGLE_MOBILE_MENU' });
    }, []);
    
    const setSidebarCollapsed = useCallback((collapsed: boolean) => {
      dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed });
    }, []);
    
    const is_active = useCallback((path: string) => {
      // Get current path from ref to avoid stale closures
      return isNavigationPathActive(path, stateRef.current.currentPath);
    }, []); // Empty dependencies are safe now with stateRef

    // Context value with all functionality - no memoization to avoid dependency issues
    const contextValue: NavigationContextValue = {
      ...state,
      
      // Navigation actions
      navigateTo,
      updateBreadcrumbs,
      updateRelatedPages,
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

