/**
 * Navigation System Types - Consolidated from multiple implementations
 * Platform-agnostic types for cross-cutting navigation concerns
 */

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
  showBreadcrumbs: boolean;
  autoExpand: boolean;
}

export interface NavigationState {
  // Core navigation
  currentPath: string;
  previousPath: string;
  breadcrumbs: BreadcrumbItem[];
  relatedPages: RelatedPage[];
  currentSection: NavigationSection;
  
  // UI state (merged from ResponsiveNavigationContext)
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  isMobile: boolean;
  sidebarCollapsed: boolean;
  mounted: boolean;
  
  // User state
  userRole: UserRole;
  preferences: NavigationPreferences;
}

// Action types for reducer
export type NavigationAction =
  | { type: 'SET_CURRENT_PATH'; payload: string }
  | { type: 'SET_BREADCRUMBS'; payload: BreadcrumbItem[] }
  | { type: 'SET_RELATED_PAGES'; payload: RelatedPage[] }
  | { type: 'SET_CURRENT_SECTION'; payload: NavigationSection }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_MOBILE_MENU' }
  | { type: 'SET_MOBILE'; payload: boolean }
  | { type: 'SET_MOUNTED'; payload: boolean }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
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

export interface NavigationContextValue extends NavigationState {
  // Navigation actions
  navigateTo: (path: string) => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  updateRelatedPages: (pages: RelatedPage[]) => void;
  updateUserRole: (role: UserRole) => void;
  updatePreferences: (preferences: Partial<NavigationPreferences>) => void;
  addToRecentPages: (page: { path: string; title: string }) => void;
  
  // UI actions (merged from ResponsiveNavigationContext)
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isActive: (path: string) => boolean;
}