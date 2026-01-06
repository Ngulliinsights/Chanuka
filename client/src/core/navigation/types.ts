/**
 * Navigation System Types - Consolidated from multiple implementations
 * Platform-agnostic types for cross-cutting navigation concerns
 */

export type NavigationSection = 'legislative' | 'community' | 'tools' | 'user' | 'admin' | 'system';
export type UserRole =
  | 'public'
  | 'citizen'
  | 'user'
  | 'expert'
  | 'admin'
  | 'journalist'
  | 'advocate';

/**
 * Navigation item interface
 */
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }> | string;
  section: NavigationSection;
  description?: string;
  badge?: number;
  allowedRoles?: UserRole[];
  requiresAuth?: boolean;
  adminOnly?: boolean;
  condition?: (role: UserRole, user: any) => boolean;
  priority?: number;
}

export interface BreadcrumbItem {
  label: string;
  path: string;
  is_active: boolean;
}

export interface RelatedPage {
  pageId: string;
  title: string;
  path: string;
  description: string;
  category: NavigationSection;
  type?: 'parent' | 'child' | 'sibling' | 'related';
  weight: number;
  context?: string;
  relevanceScore: number;
}

export interface RecentPage {
  path: string;
  title: string;
  visitedAt: Date;
  visitCount: number;
}

export interface NavigationPreferences {
  sidebarCollapsed: boolean;
  recentPages: string[];
  favoritePages: string[];
  defaultLandingPage?: string;
  compactMode?: boolean;
  showBreadcrumbs?: boolean;
  autoExpand?: boolean;
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
  user_role: UserRole;
  preferences: NavigationPreferences;
}

// Legacy action types removed - navigation now uses Redux Toolkit actions exclusively
// All navigation actions are handled through Redux Toolkit slice actions

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
  is_active: (path: string) => boolean;
}

/**
 * Navigation analytics event
 */
export interface NavigationAnalyticsEvent {
  event: 'page_view' | 'navigation_click' | 'search' | 'command_palette';
  path?: string;
  query?: string;
  source?: string;
  timestamp: string;
  userAgent?: string;
  referrer?: string;
}
