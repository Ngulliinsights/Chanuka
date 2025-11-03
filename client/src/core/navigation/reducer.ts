/**
 * Navigation State Reducer - Consolidated from multiple implementations
 * Handles all navigation state transitions with optimized logic
 */

import { NavigationState, NavigationAction, RecentPage } from './types';
import { NavigationStatePersistence } from './persistence';

export function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'SET_CURRENT_PATH':
      // Avoid unnecessary updates if path hasn't changed
      if (state.currentPath === action.payload) {
        return state;
      }
      return {
        ...state,
        previousPath: state.currentPath,
        currentPath: action.payload,
      };
      
    case 'SET_BREADCRUMBS':
      return {
        ...state,
        breadcrumbs: action.payload,
      };
      
    case 'SET_RELATED_PAGES':
      return {
        ...state,
        relatedPages: action.payload,
      };
      
    case 'SET_CURRENT_SECTION':
      return {
        ...state,
        currentSection: action.payload,
      };
      
    case 'TOGGLE_SIDEBAR':
      const newSidebarOpen = !state.sidebarOpen;
      return {
        ...state,
        sidebarOpen: newSidebarOpen,
        sidebarCollapsed: !newSidebarOpen, // Keep inverse relationship
      };
      
    case 'TOGGLE_MOBILE_MENU':
      return {
        ...state,
        mobileMenuOpen: !state.mobileMenuOpen,
      };

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

    case 'SET_SIDEBAR_COLLAPSED':
      return {
        ...state,
        sidebarCollapsed: action.payload,
        sidebarOpen: !action.payload, // Keep inverse relationship
      };
      
    case 'SET_USER_ROLE':
      // Avoid unnecessary updates if role hasn't changed
      if (state.user_role === action.payload) {
        return state;
      }
      return {
        ...state,
        user_role: action.payload,
      };
      
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };
      
    case 'LOAD_PERSISTED_STATE':
      return {
        ...state,
        ...action.payload,
        // Ensure certain runtime fields are not overridden by persisted state
        currentPath: state.currentPath,
        previousPath: state.previousPath,
        breadcrumbs: state.breadcrumbs,
        relatedPages: state.relatedPages,
      };
      
    case 'RESET_USER_SPECIFIC_STATE':
      return {
        ...state,
        user_role: 'public',
        preferences: {
          defaultLandingPage: '/',
          favoritePages: [],
          recentlyVisited: [],
          compactMode: false,
          showBreadcrumbs: true,
          autoExpand: false,
        },
        sidebarOpen: false,
        sidebarCollapsed: true,
        mobileMenuOpen: false,
      };
      
    case 'SYNC_AUTH_STATE': {
      const { user, isAuthenticated } = action.payload;
      const newUserRole = isAuthenticated && user?.role 
        ? (users.role as any) 
        : 'public';
      
      // Avoid unnecessary updates if role hasn't changed
      if (state.user_role === newUserRole) {
        return state;
      }
      
      return {
        ...state,
        user_role: newUserRole,
      };
    }
    
    case 'BATCH_NAVIGATION_UPDATE': {
      const { currentPath, section, breadcrumbs, relatedPages, recentPage, closeMobileMenu } = action.payload;
      
      // Update recent pages using the utility function
      const updatedRecentPages = NavigationStatePersistence.updateRecentPages(
        state.preferences.recentlyVisited, 
        recentPage
      );
      
      return {
        ...state,
        previousPath: state.currentPath,
        currentPath,
        currentSection: section,
        breadcrumbs,
        relatedPages,
        mobileMenuOpen: closeMobileMenu ? false : state.mobileMenuOpen,
        preferences: {
          ...state.preferences,
          recentlyVisited: updatedRecentPages,
        },
      };
    }
    
    default:
      return state;
  }
}

