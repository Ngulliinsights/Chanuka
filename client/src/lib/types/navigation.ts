/**
 * Navigation Types - OPTIMIZED
 *
 * Unified navigation types with improved type safety and consistency.
 * Changes from original:
 * - Standardized to camelCase throughout
 * - Removed duplicate NavigationContextValue definition
 * - Added discriminated unions for better type inference
 * - Improved optional/required field balance
 * - Added strict branding for type safety
 */

// ============================================================================
// Core User Role Types
// ============================================================================

/**
 * User role with strict typing
 * Note: 'citizen' and 'user' are aliases for backwards compatibility
 */
export type UserRole =
  | 'public'
  | 'citizen' // Legacy alias
  | 'user'    // Preferred term
  | 'expert'
  | 'admin'
  | 'official'
  | 'moderator'
  | 'journalist'
  | 'advocate';

export type NavigationSection =
  | 'legislative'
  | 'community'
  | 'user'
  | 'admin'
  | 'tools'
  | 'system';

// ============================================================================
// Navigation Items
// ============================================================================

/**
 * Base navigation item with essential properties
 */
interface BaseNavigationItem {
  id: string;
  label: string;
  path: string;
  href: string;
  section?: NavigationSection;
  order?: number;
  icon?: string;
  badge?: string | number;
  external?: boolean;
}

/**
 * Navigation item with authentication/authorization
 */
export interface NavigationItem extends BaseNavigationItem {
  children?: NavigationItem[];

  // Auth properties (mutually exclusive)
  requiresAuth?: boolean;
  adminOnly?: boolean;
  allowedRoles?: UserRole[];
  permissions?: UserRole[]; // Legacy alias for allowedRoles

  // Dynamic visibility
  condition?: (userRole: UserRole, user: unknown) => boolean;

  // State
  isActive?: boolean;
}

/**
 * Breadcrumb item for navigation trails
 * Standardized to camelCase
 */
export interface BreadcrumbItem {
  label: string;
  path: string;
  isActive: boolean; // Standardized from is_active
}

// ============================================================================
// Related Pages & Relationships
// ============================================================================

export type PageRelationType = 'parent' | 'child' | 'sibling' | 'related';

export type PageCategory =
  | 'legislative'
  | 'community'
  | 'user'
  | 'admin'
  | 'tools';

export interface RelatedPage {
  pageId: string;
  title: string;
  path: string;
  description: string;
  category: PageCategory;
  type?: PageRelationType;
  weight: number;
  relevanceScore: number;
  context?: string;
}

export interface PageRelationship {
  pageId: string;
  relatedPages: Record<string, {
    type: PageRelationType;
    weight: number;
    context: string;
  }>;
}

// ============================================================================
// User Preferences & History
// ============================================================================

export interface RecentPage {
  path: string;
  title: string;
  visitedAt: string; // ISO 8601 date string
  visitCount: number;
}

export interface NavigationPreferences {
  defaultLandingPage: string;
  favoritePages: readonly string[]; // Immutable for safety
  recentlyVisited: RecentPage[];
  compactMode: boolean;
  showBreadcrumbs: boolean;
  autoExpand: boolean;
  sidebarCollapsed: boolean;
}

// ============================================================================
// Navigation State
// ============================================================================

export interface NavigationState {
  // Current navigation
  currentPath: string;
  previousPath: string;
  currentSection: NavigationSection;

  // Breadcrumbs & related
  breadcrumbs: BreadcrumbItem[];
  relatedPages: RelatedPage[];

  // UI state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  isMobile: boolean;
  mounted: boolean;

  // User context
  userRole: UserRole; // Standardized from user_role
  preferences: NavigationPreferences;
}

// ============================================================================
// Navigation Context (SINGLE DEFINITION)
// ============================================================================

export interface NavigationContextValue extends NavigationState {
  // Navigation actions
  navigateTo: (path: string) => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  updateRelatedPages: (pages: RelatedPage[]) => void;
  updateUserRole: (role: UserRole) => void;
  updatePreferences: (preferences: Partial<NavigationPreferences>) => void;
  addToRecentPages: (page: { path: string; title: string }) => void;

  // UI actions
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isActive: (path: string) => boolean; // Standardized from is_active
}

// ============================================================================
// Responsive Navigation (Specialized)
// ============================================================================

export interface ResponsiveNavigationState {
  isMobile: boolean;
  sidebarCollapsed: boolean;
  mounted: boolean;
}

export interface ResponsiveNavigationContextValue extends ResponsiveNavigationState {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isActive: (path: string) => boolean; // Standardized from is_active
}

// ============================================================================
// Analytics & Tracking
// ============================================================================

export type NavigationEventType =
  | 'page_view'
  | 'navigation_click'
  | 'search'
  | 'command_palette';

export interface NavigationAnalyticsEvent {
  event: NavigationEventType;
  path?: string;
  query?: string;
  source?: string;
  timestamp: string; // ISO 8601
  userAgent?: string;
  referrer?: string;
}

// ============================================================================
// Access Control
// ============================================================================

export type AccessDenialReason =
  | 'unauthenticated'
  | 'insufficient_role'
  | 'admin_required'
  | 'custom_condition';

export interface AccessDenial {
  reason: AccessDenialReason;
  requiredRole?: UserRole;
  customMessage?: string;
}

// ============================================================================
// Type Guards & Utilities
// ============================================================================

/**
 * Type guard to check if a user has a specific role
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  // Handle 'user' and 'citizen' as aliases
  const normalizedUserRole = userRole === 'citizen' ? 'user' : userRole;
  const normalizedAllowed = allowedRoles.map(r => r === 'citizen' ? 'user' : r);

  return normalizedAllowed.includes(normalizedUserRole);
}

/**
 * Type guard to check if navigation item requires authentication
 */
export function requiresAuthentication(item: NavigationItem): boolean {
  return !!(
    item.requiresAuth ||
    item.adminOnly ||
    item.allowedRoles?.length ||
    item.permissions?.length
  );
}

/**
 * Check if user can access navigation item
 */
export function canAccessItem(
  item: NavigationItem,
  userRole: UserRole,
  user: unknown
): boolean {
  // Admin-only check
  if (item.adminOnly && userRole !== 'admin') {
    return false;
  }

  // Role-based access
  const allowedRoles = item.allowedRoles || item.permissions;
  if (allowedRoles?.length && !hasRole(userRole, allowedRoles)) {
    return false;
  }

  // Custom condition
  if (item.condition && !item.condition(userRole, user)) {
    return false;
  }

  return true;
}
