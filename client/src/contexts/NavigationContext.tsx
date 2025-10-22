import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ResponsiveNavigationProvider } from './ResponsiveNavigationContext';
import { useAuth } from '../hooks/use-auth';
import { logger } from '..\utils\browser-logger';

// Types (inline to avoid import issues)
export type NavigationSection = 'legislative' | 'community' | 'admin' | 'user' | 'system';
export type UserRole = 'public' | 'user' | 'expert' | 'admin';

export interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

export interface RelatedPage {
  title: string;
  path: string;
  description?: string;
  category?: string;
}

export interface RecentPage {
  path: string;
  title: string;
  visitedAt: Date;
  visitCount: number;
}

export interface NavigationPreferences {
  defaultLandingPage: string;
  favoritePages: string[];
  recentlyVisited: RecentPage[];
  compactMode: boolean;
}

export interface NavigationState {
  currentPath: string;
  previousPath: string;
  breadcrumbs: BreadcrumbItem[];
  relatedPages: RelatedPage[];
  currentSection: NavigationSection;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  userRole: UserRole;
  preferences: NavigationPreferences;
}

export interface NavigationContextValue extends NavigationState {
  navigateTo: (path: string) => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  updateRelatedPages: (pages: RelatedPage[]) => void;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  updateUserRole: (role: UserRole) => void;
  updatePreferences: (preferences: Partial<NavigationPreferences>) => void;
  addToRecentPages: (page: { path: string; title: string }) => void;
}

// Utility functions (inline to avoid import issues)
function generateBreadcrumbs(path: string): BreadcrumbItem[] {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/', isActive: path === '/' }
  ];

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    breadcrumbs.push({
      label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      path: currentPath,
      isActive: isLast
    });
  });

  return breadcrumbs;
}

function calculateRelatedPages(path: string, userRole: UserRole): RelatedPage[] {
  const relatedPages: RelatedPage[] = [];
  
  if (path.startsWith('/bills')) {
    relatedPages.push(
      { title: 'All Bills', path: '/bills', description: 'Browse all legislation' },
      { title: 'Bill Analysis', path: '/bills/analysis', description: 'Detailed analysis tools' }
    );
  }
  
  if (userRole !== 'public') {
    relatedPages.push(
      { title: 'Dashboard', path: '/dashboard', description: 'Your personal dashboard' }
    );
  }
  
  return relatedPages;
}

function determineNavigationSection(path: string): NavigationSection {
  if (path.startsWith('/bills') || path.startsWith('/dashboard')) {
    return 'legislative';
  }
  if (path.startsWith('/community') || path.startsWith('/expert-verification')) {
    return 'community';
  }
  if (path.startsWith('/admin')) {
    return 'admin';
  }
  if (path.startsWith('/profile') || path.startsWith('/auth') || path.startsWith('/onboarding')) {
    return 'user';
  }
  return 'system';
}

// Simple state persistence
class NavigationStatePersistence {
  private static STORAGE_KEY = 'navigation-state';

  static saveNavigationState(state: NavigationState): void {
    try {
      const persistableState = {
        preferences: state.preferences,
        sidebarOpen: state.sidebarOpen,
        userRole: state.userRole
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(persistableState));
    } catch (error) {
      console.warn('Failed to save navigation state:', error);
    }
  }

  static loadNavigationState(): Partial<NavigationState> | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load navigation state:', error);
      return null;
    }
  }

  static clearUserSpecificState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear navigation state:', error);
    }
  }
}

// Action types
type NavigationAction =
  | { type: 'SET_CURRENT_PATH'; payload: string }
  | { type: 'SET_BREADCRUMBS'; payload: BreadcrumbItem[] }
  | { type: 'SET_RELATED_PAGES'; payload: RelatedPage[] }
  | { type: 'SET_CURRENT_SECTION'; payload: NavigationSection }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_MOBILE_MENU' }
  | { type: 'SET_USER_ROLE'; payload: UserRole }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<NavigationPreferences> }
  | { type: 'LOAD_PERSISTED_STATE'; payload: Partial<NavigationState> }
  | { type: 'RESET_USER_SPECIFIC_STATE' }
  | { type: 'SYNC_AUTH_STATE'; payload: { user: any; isAuthenticated: boolean } }
  | { type: 'BATCH_NAVIGATION_UPDATE'; payload: { 
      currentPath: string; 
      section: NavigationSection; 
      breadcrumbs: BreadcrumbItem[]; 
      relatedPages: RelatedPage[]; 
      recentPage: { path: string; title: string };
      closeMobileMenu: boolean;
    } };

// Initial state
const initialState: NavigationState = {
  currentPath: '/',
  previousPath: '/',
  breadcrumbs: [],
  relatedPages: [],
  currentSection: 'legislative',
  sidebarOpen: false,
  mobileMenuOpen: false,
  userRole: 'public',
  preferences: {
    defaultLandingPage: '/',
    favoritePages: [],
    recentlyVisited: [],
    compactMode: false,
  },
};

// Helper function to update recent pages (extracted to avoid duplication)
function updateRecentPages(
  recentlyVisited: RecentPage[], 
  newPage: { path: string; title: string }
): RecentPage[] {
  const existingPageIndex = recentlyVisited.findIndex(
    page => page.path === newPage.path
  );
  
  if (existingPageIndex >= 0) {
    // Update existing page by moving it to the front and incrementing count
    const updatedRecentPages = [...recentlyVisited];
    const existingPage = updatedRecentPages[existingPageIndex];
    updatedRecentPages.splice(existingPageIndex, 1);
    updatedRecentPages.unshift({
      ...existingPage,
      visitedAt: new Date(),
      visitCount: existingPage.visitCount + 1,
    });
    return updatedRecentPages;
  } else {
    // Add new page at the front and limit to 10 items
    const newRecentPage: RecentPage = {
      path: newPage.path,
      title: newPage.title,
      visitedAt: new Date(),
      visitCount: 1,
    };
    return [newRecentPage, ...recentlyVisited].slice(0, 10);
  }
}

// Reducer with optimized logic
function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
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
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };
      
    case 'TOGGLE_MOBILE_MENU':
      return {
        ...state,
        mobileMenuOpen: !state.mobileMenuOpen,
      };
      
    case 'SET_USER_ROLE':
      // Avoid unnecessary updates if role hasn't changed
      if (state.userRole === action.payload) {
        return state;
      }
      return {
        ...state,
        userRole: action.payload,
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
        userRole: 'public',
        preferences: {
          defaultLandingPage: '/',
          favoritePages: [],
          recentlyVisited: [],
          compactMode: false,
        },
        sidebarOpen: false,
        mobileMenuOpen: false,
      };
      
    case 'SYNC_AUTH_STATE': {
      const { user, isAuthenticated } = action.payload;
      const newUserRole: UserRole = isAuthenticated && user?.role 
        ? (user.role as UserRole) 
        : 'public';
      
      // Avoid unnecessary updates if role hasn't changed
      if (state.userRole === newUserRole) {
        return state;
      }
      
      return {
        ...state,
        userRole: newUserRole,
      };
    }
    
    case 'BATCH_NAVIGATION_UPDATE': {
      const { currentPath, section, breadcrumbs, relatedPages, recentPage, closeMobileMenu } = action.payload;
      
      // Use the extracted helper function for consistency
      const updatedRecentPages = updateRecentPages(
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

// Context
const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

// Provider component
interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [state, dispatch] = useReducer(navigationReducer, initialState);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Use refs to track ongoing navigation updates and prevent race conditions
  const navigationUpdateRef = useRef<string | null>(null);
  const persistenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted navigation state on mount (only once)
  useEffect(() => {
    const persistedState = NavigationStatePersistence.loadNavigationState();
    if (persistedState) {
      dispatch({ type: 'LOAD_PERSISTED_STATE', payload: persistedState });
    }
  }, []);

  // Sync navigation state with authentication changes
  useEffect(() => {
    dispatch({ 
      type: 'SYNC_AUTH_STATE', 
      payload: { user, isAuthenticated } 
    });
    
    // Reset user-specific state when user logs out
    if (!isAuthenticated && state.userRole !== 'public') {
      dispatch({ type: 'RESET_USER_SPECIFIC_STATE' });
      NavigationStatePersistence.clearUserSpecificState();
    }
  }, [user, isAuthenticated, state.userRole]);

  // Debounced persistence to avoid excessive localStorage writes
  useEffect(() => {
    // Clear any existing timer
    if (persistenceTimerRef.current) {
      clearTimeout(persistenceTimerRef.current);
    }
    
    // Set a new timer to persist state after 500ms of inactivity
    persistenceTimerRef.current = setTimeout(() => {
      NavigationStatePersistence.saveNavigationState(state);
    }, 500);

    // Cleanup function
    return () => {
      if (persistenceTimerRef.current) {
        clearTimeout(persistenceTimerRef.current);
      }
    };
  }, [state.preferences, state.sidebarOpen]);

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
    const relatedPages = calculateRelatedPages(currentPath, state.userRole);
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
        closeMobileMenu: state.mobileMenuOpen // Read current state, don't depend on it
      }
    });
    
    // Clear the processing flag after a brief delay to allow for rapid navigation
    const timeoutId = setTimeout(() => {
      navigationUpdateRef.current = null;
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [location.pathname, state.userRole]); // Removed state.mobileMenuOpen from dependencies

  // Memoized context value to prevent unnecessary re-renders in consumers
  const contextValue: NavigationContextValue = React.useMemo(() => ({
    ...state,
    navigateTo: (path: string) => {
      navigate(path);
    },
    updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => {
      dispatch({ type: 'SET_BREADCRUMBS', payload: breadcrumbs });
    },
    updateRelatedPages: (pages: RelatedPage[]) => {
      dispatch({ type: 'SET_RELATED_PAGES', payload: pages });
    },
    toggleSidebar: () => {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    },
    toggleMobileMenu: () => {
      dispatch({ type: 'TOGGLE_MOBILE_MENU' });
    },
    updateUserRole: (role: UserRole) => {
      dispatch({ type: 'SET_USER_ROLE', payload: role });
    },
    updatePreferences: (preferences: Partial<NavigationPreferences>) => {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
    },
    addToRecentPages: (page: { path: string; title: string }) => {
      // If adding a recent page manually, we can just update preferences
      const updatedRecentPages = updateRecentPages(state.preferences.recentlyVisited, page);
      dispatch({ 
        type: 'UPDATE_PREFERENCES', 
        payload: { recentlyVisited: updatedRecentPages } 
      });
    },
  }), [state, navigate]); // Only recreate when state or navigate changes

  return (
    <ResponsiveNavigationProvider>
      <NavigationContext.Provider value={contextValue}>
        {children}
      </NavigationContext.Provider>
    </ResponsiveNavigationProvider>
  );
}

// Hook to use navigation context
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}