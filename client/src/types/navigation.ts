export interface BreadcrumbItem {
  label: string;
  path: string;
  isActive: boolean;
}

export interface RelatedPage {
  pageId: string;
  title: string;
  path: string;
  description: string;
  category: 'legislative' | 'community' | 'user' | 'admin' | 'tools';
  type?: 'parent' | 'child' | 'sibling' | 'related';
  weight: number;
  context?: string;
  relevanceScore: number;
}

export type NavigationSection = 'legislative' | 'community' | 'user' | 'admin' | 'tools' | 'system';

// Include both 'citizen' and 'user' to remain compatible with different parts
// of the codebase that use either term for an authenticated regular user.
export type UserRole = 'public' | 'citizen' | 'user' | 'expert' | 'admin' | 'journalist' | 'advocate';

export interface NavigationPreferences {
  defaultLandingPage: string;
  favoritePages: string[];
  recentlyVisited: RecentPage[];
  compactMode: boolean;
  showBreadcrumbs: boolean;
  autoExpand: boolean;
}

export interface RecentPage {
  path: string;
  title: string;
  visitedAt: Date;
  visitCount: number;
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
  // Actions
  navigateTo: (path: string) => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  updateRelatedPages: (pages: RelatedPage[]) => void;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  updateUserRole: (role: UserRole) => void;
  updatePreferences: (preferences: Partial<NavigationPreferences>) => void;
  addToRecentPages: (page: { path: string; title: string }) => void;
}

// Responsive Navigation Types
export interface ResponsiveNavigationState {
  isMobile: boolean;
  sidebarCollapsed: boolean;
  mounted: boolean;
}

export interface ResponsiveNavigationContextValue extends ResponsiveNavigationState {
  toggleSidebar: () => void;
  isActive: (path: string) => boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export interface PageRelationship {
  pageId: string;
  relatedPages: {
    [key: string]: {
      type: 'parent' | 'child' | 'sibling' | 'related';
      weight: number;
      context: string;
    };
  };
}












































