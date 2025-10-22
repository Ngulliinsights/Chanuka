import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useMediaQuery } from '../hooks/use-mobile';
import { 
  ResponsiveNavigationState, 
  ResponsiveNavigationContextValue 
} from '..\types\navigation';
import { isNavigationPathActive } from '..\utils\navigation\active-state';
import { NavigationStatePersistence } from '..\utils\navigation\state-persistence';
import { logger } from '..\utils\browser-logger';

// Action types
type ResponsiveNavigationAction =
  | { type: 'SET_MOBILE'; payload: boolean }
  | { type: 'SET_MOUNTED'; payload: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'LOAD_SIDEBAR_STATE'; payload: boolean }
  | { type: 'SYNC_WITH_NAVIGATION_STATE'; payload: { sidebarOpen: boolean } };

// Initial state - sidebar should be open by default on desktop
const initialState: ResponsiveNavigationState = {
  isMobile: false,
  sidebarCollapsed: false, // false means sidebar is OPEN (expanded)
  mounted: false,
};

// Reducer
function responsiveNavigationReducer(
  state: ResponsiveNavigationState, 
  action: ResponsiveNavigationAction
): ResponsiveNavigationState {
  switch (action.type) {
    case 'SET_MOBILE':
      return {
        ...state,
        isMobile: action.payload,
      };
    case 'SET_MOUNTED':
      return {
        ...state,
        mounted: action.payload,
      };
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      };
    case 'SET_SIDEBAR_COLLAPSED':
      return {
        ...state,
        sidebarCollapsed: action.payload,
      };
    case 'LOAD_SIDEBAR_STATE':
      return {
        ...state,
        sidebarCollapsed: action.payload,
      };
    case 'SYNC_WITH_NAVIGATION_STATE':
      return {
        ...state,
        sidebarCollapsed: !action.payload.sidebarOpen, // Inverse relationship
      };
    default:
      return state;
  }
}

// Context
const ResponsiveNavigationContext = createContext<ResponsiveNavigationContextValue | undefined>(undefined);

// Provider component
interface ResponsiveNavigationProviderProps {
  children: ReactNode;
}

export function ResponsiveNavigationProvider({ children }: ResponsiveNavigationProviderProps) {
  const [state, dispatch] = useReducer(responsiveNavigationReducer, initialState);
  const location = useLocation();
  
  // Use media query hook with SSR support
  const isMobileQuery = useMediaQuery('(max-width: 767px)');

  // Handle mounting and hydration
  useEffect(() => {
    dispatch({ type: 'SET_MOUNTED', payload: true });
    
    // Load sidebar state from localStorage after mounting with error handling
    const savedSidebarState = NavigationStatePersistence.loadSidebarState();
    if (savedSidebarState !== null) {
      dispatch({ 
        type: 'LOAD_SIDEBAR_STATE', 
        payload: savedSidebarState 
      });
    } else {
      // If no saved state, ensure sidebar is open by default on desktop
      // We'll check if it's mobile in the next useEffect
      dispatch({ 
        type: 'SET_SIDEBAR_COLLAPSED', 
        payload: false // false = open/expanded
      });
    }
  }, []);

  // Update mobile state when media query changes
  useEffect(() => {
    if (state.mounted) {
      dispatch({ type: 'SET_MOBILE', payload: isMobileQuery });
      
      // On mobile, sidebar should be collapsed by default
      // On desktop, sidebar should be open by default (unless user has saved preference)
      if (isMobileQuery) {
        // Mobile: always collapse sidebar
        dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: true });
      } else {
        // Desktop: check if we have a saved preference, otherwise default to open
        const savedSidebarState = NavigationStatePersistence.loadSidebarState();
        if (savedSidebarState === null) {
          // No saved preference, default to open on desktop
          dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: false });
        }
      }
    }
  }, [isMobileQuery, state.mounted]);

  // Save sidebar state to localStorage with error handling and debouncing
  useEffect(() => {
    if (state.mounted) {
      NavigationStatePersistence.saveSidebarState(state.sidebarCollapsed);
    }
  }, [state.sidebarCollapsed, state.mounted]);

  // Enhanced helper function to check if a path is active with immediate updates
  const isActive = (path: string): boolean => {
    return isNavigationPathActive(path, location.pathname);
  };

  // Toggle sidebar function
  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  // Set sidebar collapsed function
  const setSidebarCollapsed = (collapsed: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed });
  };

  // Context value
  const contextValue: ResponsiveNavigationContextValue = {
    ...state,
    toggleSidebar,
    isActive,
    setSidebarCollapsed,
  };

  return (
    <ResponsiveNavigationContext.Provider value={contextValue}>
      {children}
    </ResponsiveNavigationContext.Provider>
  );
}

// Hook to use responsive navigation context
export function useResponsiveNavigation(): ResponsiveNavigationContextValue {
  const context = useContext(ResponsiveNavigationContext);
  if (context === undefined) {
    throw new Error('useResponsiveNavigation must be used within a ResponsiveNavigationProvider');
  }
  return context;
}