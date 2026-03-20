/**
 * Navigation Context Types - STANDARDIZED with DISCRIMINATED UNIONS
 *
 * Standardized navigation context types using discriminated unions
 * Following the exemplary pattern from LoadingAction in loading.ts
 *
 * Key improvements:
 * - Discriminated unions for action types
 * - Consistent naming conventions
 * - Comprehensive documentation
 * - Type-safe navigation state management
 */

import type { NavigationItem, BreadcrumbItem, UserRole, NavigationPreferences, RecentPage } from '../navigation';

// ============================================================================
// Navigation Context Value (Standardized)
// ============================================================================

export interface NavigationContextValue {
  // Current navigation state
  currentPath: string;
  previousPath: string;
  currentSection: 'legislative' | 'community' | 'user' | 'admin' | 'tools' | 'system';

  // Breadcrumbs & related pages
  breadcrumbs: BreadcrumbItem[];

  // UI state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  isMobile: boolean;
  mounted: boolean;

  // User context
  userRole: UserRole;
  preferences: NavigationPreferences;

  // Navigation actions
  navigateTo: (path: string) => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  updateRelatedPages: (pages: Array<{
    pageId: string;
    title: string;
    path: string;
    description: string;
    category: 'legislative' | 'community' | 'user' | 'admin' | 'tools';
    type?: 'parent' | 'child' | 'sibling' | 'related';
    weight: number;
    relevanceScore: number;
    context?: string;
  }>) => void;
  updateUserRole: (role: UserRole) => void;
  updatePreferences: (preferences: Partial<NavigationPreferences>) => void;
  addToRecentPages: (page: { path: string; title: string }) => void;

  // UI actions
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isActive: (path: string) => boolean;

  // Access control
  canAccessItem: (item: NavigationItem) => boolean;
  requiresAuthentication: (item: NavigationItem) => boolean;
  getAccessibleItems: () => NavigationItem[];
  findItemByPath: (path: string) => NavigationItem | undefined;
}

// ============================================================================
// Navigation Context Actions (DISCRIMINATED UNION)
// ============================================================================
// Following the exact pattern from LoadingAction in loading.ts

export type NavigationContextAction =
  | {
      type: 'NAVIGATE';
      payload: { path: string; replace?: boolean };
    }
  | {
      type: 'UPDATE_BREADCRUMBS';
      payload: { breadcrumbs: BreadcrumbItem[] };
    }
  | {
      type: 'UPDATE_RELATED_PAGES';
      payload: {
        pages: Array<{
          pageId: string;
          title: string;
          path: string;
          description: string;
          category: 'legislative' | 'community' | 'user' | 'admin' | 'tools';
          type?: 'parent' | 'child' | 'sibling' | 'related';
          weight: number;
          relevanceScore: number;
          context?: string;
        }>;
      };
    }
  | {
      type: 'UPDATE_USER_ROLE';
      payload: { role: UserRole };
    }
  | {
      type: 'UPDATE_PREFERENCES';
      payload: { preferences: Partial<NavigationPreferences> };
    }
  | {
      type: 'ADD_RECENT_PAGE';
      payload: { page: RecentPage };
    }
  | {
      type: 'TOGGLE_SIDEBAR';
      payload?: { open?: boolean };
    }
  | {
      type: 'TOGGLE_MOBILE_MENU';
      payload?: { open?: boolean };
    }
  | {
      type: 'SET_SIDEBAR_COLLAPSED';
      payload: { collapsed: boolean };
    }
  | {
      type: 'UPDATE_IS_MOBILE';
      payload: { isMobile: boolean };
    }
  | {
      type: 'UPDATE_IS_MOUNTED';
      payload: { mounted: boolean };
    };

// ============================================================================
// Navigation Context State (Standardized)
// ============================================================================

export interface NavigationContextState {
  currentPath: string;
  previousPath: string;
  currentSection: 'legislative' | 'community' | 'user' | 'admin' | 'tools' | 'system';
  breadcrumbs: BreadcrumbItem[];
  relatedPages: Array<{
    pageId: string;
    title: string;
    path: string;
    description: string;
    category: 'legislative' | 'community' | 'user' | 'admin' | 'tools';
    type?: 'parent' | 'child' | 'sibling' | 'related';
    weight: number;
    relevanceScore: number;
    context?: string;
  }>;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  isMobile: boolean;
  mounted: boolean;
  userRole: UserRole;
  preferences: NavigationPreferences;
}

// ============================================================================
// Navigation Context Provider Props
// ============================================================================

export interface NavigationContextProviderProps {
  children: React.ReactNode;
  initialState?: Partial<NavigationContextState>;
  initialItems?: NavigationItem[];
  onNavigate?: (path: string) => void;
  onAccessDenied?: (path: string, reason: string) => void;
}

// ============================================================================
// Responsive Navigation Context (Specialized)
// ============================================================================

export interface ResponsiveNavigationContextValue {
  isMobile: boolean;
  sidebarCollapsed: boolean;
  mounted: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isActive: (path: string) => boolean;

  // Breakpoint detection
  currentBreakpoint: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  isBreakpoint: (breakpoint: 'sm' | 'md' | 'lg' | 'xl') => boolean;
}

// ============================================================================
// Responsive Navigation Context Actions (DISCRIMINATED UNION)
// ============================================================================

export type ResponsiveNavigationContextAction =
  | {
      type: 'TOGGLE_SIDEBAR';
      payload?: { open?: boolean };
    }
  | {
      type: 'SET_SIDEBAR_COLLAPSED';
      payload: { collapsed: boolean };
    }
  | {
      type: 'UPDATE_IS_MOBILE';
      payload: { isMobile: boolean };
    }
  | {
      type: 'UPDATE_BREAKPOINT';
      payload: { breakpoint: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' };
    }
  | {
      type: 'UPDATE_IS_MOUNTED';
      payload: { mounted: boolean };
    };

// ============================================================================
// Type Guards for Navigation Context Actions
// ============================================================================

export function isNavigateAction(action: NavigationContextAction): action is Extract<NavigationContextAction, { type: 'NAVIGATE' }> {
  return action.type === 'NAVIGATE';
}

export function isUpdateBreadcrumbsAction(action: NavigationContextAction): action is Extract<NavigationContextAction, { type: 'UPDATE_BREADCRUMBS' }> {
  return action.type === 'UPDATE_BREADCRUMBS';
}

export function isUpdateUserRoleAction(action: NavigationContextAction): action is Extract<NavigationContextAction, { type: 'UPDATE_USER_ROLE' }> {
  return action.type === 'UPDATE_USER_ROLE';
}

export function isToggleSidebarAction(action: NavigationContextAction): action is Extract<NavigationContextAction, { type: 'TOGGLE_SIDEBAR' }> {
  return action.type === 'TOGGLE_SIDEBAR';
}

export function isUpdatePreferencesAction(action: NavigationContextAction): action is Extract<NavigationContextAction, { type: 'UPDATE_PREFERENCES' }> {
  return action.type === 'UPDATE_PREFERENCES';
}