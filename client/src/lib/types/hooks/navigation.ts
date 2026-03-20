/**
 * Navigation Hook Types - STANDARDIZED
 *
 * Standardized navigation hook return types following the exemplary patterns
 * Key improvements:
 * - Consistent naming conventions
 * - Proper type safety
 * - Comprehensive documentation
 */

import type { NavigationItem, BreadcrumbItem, UserRole } from '../navigation';

// ============================================================================
// Navigation Hook Return Types
// ============================================================================

/**
 * Result type for useNavigation hook
 * Comprehensive navigation state and actions
 */
export interface UseNavigationResult {
  // Navigation state
  items: NavigationItem[];
  currentPath: string;
  previousPath: string;
  currentSection: 'legislative' | 'community' | 'user' | 'admin' | 'tools' | 'system';
  userRole: UserRole;
  isMobile: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  mounted: boolean;

  // Breadcrumb state
  breadcrumbs: BreadcrumbItem[];

  // Navigation actions
  navigateTo: (path: string) => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  updateUserRole: (role: UserRole) => void;
  addToRecentPages: (page: { path: string; title: string }) => void;

  // UI actions
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isActive: (path: string) => boolean;

  // Utility functions
  canAccessItem: (item: NavigationItem) => boolean;
  getAccessibleItems: () => NavigationItem[];
  findItemByPath: (path: string) => NavigationItem | undefined;
}

/**
 * Result type for useResponsiveNavigation hook
 * Mobile/responsive-specific navigation
 */
export interface UseResponsiveNavigationResult {
  isMobile: boolean;
  sidebarCollapsed: boolean;
  mounted: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isActive: (path: string) => boolean;

  // Breakpoint detection
  isBreakpoint: (breakpoint: 'sm' | 'md' | 'lg' | 'xl') => boolean;
  currentBreakpoint: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

/**
 * Result type for useBreadcrumbs hook
 * Breadcrumb-specific functionality
 */
export interface UseBreadcrumbsResult {
  breadcrumbs: BreadcrumbItem[];

  // Actions
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  addBreadcrumb: (breadcrumb: Omit<BreadcrumbItem, 'isActive'>) => void;
  removeBreadcrumb: (index: number) => void;
  clearBreadcrumbs: () => void;

  // Utility
  getBreadcrumbPath: () => string;
  findBreadcrumbByPath: (path: string) => BreadcrumbItem | undefined;
}

/**
 * Result type for useRouteAccess hook
 * Route access control
 */
export interface UseRouteAccessResult {
  userRole: UserRole;

  // Access control
  canAccess: (item: NavigationItem) => boolean;
  canAccessPath: (path: string) => boolean;
  requiresAuthentication: (item: NavigationItem) => boolean;

  // Role management
  setUserRole: (role: UserRole) => void;
  hasRole: (requiredRole: UserRole | UserRole[]) => boolean;

  // Access denial handling
  getAccessDenialReason: (item: NavigationItem) => {
    canAccess: boolean;
    reason?: 'unauthenticated' | 'insufficient_role' | 'admin_required' | 'custom_condition';
    requiredRole?: UserRole;
  };
}

/**
 * Options for useNavigation hook
 * Configuration interface
 */
export interface UseNavigationOptions {
  initialItems?: NavigationItem[];
  initialPath?: string;
  initialUserRole?: UserRole;
  initialSidebarState?: {
    open?: boolean;
    collapsed?: boolean;
  };
  onNavigate?: (path: string) => void;
  onAccessDenied?: (path: string, reason: string) => void;
}

/**
 * Options for useResponsiveNavigation hook
 * Responsive configuration
 */
export interface UseResponsiveNavigationOptions {
  initialCollapsed?: boolean;
  breakpoints?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  onBreakpointChange?: (breakpoint: string) => void;
}

/**
 * Options for useBreadcrumbs hook
 * Breadcrumb configuration
 */
export interface UseBreadcrumbsOptions {
  initialBreadcrumbs?: BreadcrumbItem[];
  maxBreadcrumbs?: number;
  showHome?: boolean;
  homePath?: string;
  homeLabel?: string;
}