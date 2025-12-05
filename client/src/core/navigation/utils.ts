/**
 * Navigation Utilities - Consolidated Helper Functions
 * 
 * Enhanced with functionality from utils/navigation.ts for comprehensive
 * navigation management with validation, access control, and search capabilities.
 */

import { NavigationItem, BreadcrumbItem, RelatedPage, NavigationSection, UserRole } from './types';
import { logger } from '../../utils/logger';

/**
 * Generate breadcrumbs from a path
 */
export function generateBreadcrumbs(path: string): BreadcrumbItem[] {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/', is_active: path === '/' }
  ];

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    breadcrumbs.push({
      label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      path: currentPath,
      is_active: isLast
    });
  });

  return breadcrumbs;
}

/**
 * Calculate related pages based on current path and user role
 */
export function calculateRelatedPages(path: string, user_role: UserRole): RelatedPage[] {
  const relatedPages: RelatedPage[] = [];

  if (path.startsWith('/bills')) {
    relatedPages.push(
      {
        pageId: 'bills-all',
        title: 'All Bills',
        path: '/bills',
        description: 'Browse all legislation',
        category: 'legislative',
        type: 'parent',
        weight: 1.0,
        relevanceScore: 0.9
      },
      {
        pageId: 'bills-analysis',
        title: 'Bill Analysis',
        path: '/bills/analysis',
        description: 'Detailed analysis tools',
        category: 'legislative',
        type: 'child',
        weight: 0.8,
        relevanceScore: 0.8
      }
    );
  }

  if (path.startsWith('/community')) {
    relatedPages.push(
      {
        pageId: 'community-input',
        title: 'Community Input',
        path: '/community-input',
        description: 'Public discussions',
        category: 'community',
        type: 'related',
        weight: 0.9,
        relevanceScore: 0.85
      },
      {
        pageId: 'expert-verification',
        title: 'Expert Verification',
        path: '/expert-verification',
        description: 'Expert opinions',
        category: 'community',
        type: 'related',
        weight: 0.7,
        relevanceScore: 0.75
      }
    );
  }

  if (user_role !== 'public') {
    relatedPages.push(
      {
        pageId: 'dashboard',
        title: 'Dashboard',
        path: '/dashboard',
        description: 'Your personal dashboard',
        category: 'user',
        type: 'related',
        weight: 0.95,
        relevanceScore: 0.9
      }
    );
  }

  if (user_role === 'admin') {
    relatedPages.push(
      {
        pageId: 'admin-panel',
        title: 'Admin Panel',
        path: '/admin',
        description: 'System administration',
        category: 'admin',
        type: 'related',
        weight: 1.0,
        relevanceScore: 0.95
      }
    );
  }

  return relatedPages;
}

/**
 * Determine navigation section from path
 */
export function determineNavigationSection(path: string): NavigationSection {
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
  return 'tools';
}

/**
 * Check if a navigation path is active
 */
export function isNavigationPathActive(path: string, currentPath: string): boolean {
  if (path === currentPath) return true;
  
  // Handle exact matches first
  if (path === '/' && currentPath === '/') return true;
  if (path === '/' && currentPath !== '/') return false;
  
  // Handle nested paths
  if (currentPath.startsWith(path + '/')) return true;
  
  // Handle query parameters and fragments
  const currentPathBase = currentPath.split('?')[0]?.split('#')[0] || currentPath;
  const pathBase = path.split('?')[0]?.split('#')[0] || path;
  
  return currentPathBase === pathBase || currentPathBase.startsWith(pathBase + '/');
}

/**
 * Normalize path for comparison
 */
export function normalizePath(path: string): string {
  // Remove trailing slash except for root
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  
  // Remove query parameters and fragments for comparison
  return path.split('?')[0].split('#')[0];
}

/**
 * Extract page title from path
 */
export function extractPageTitle(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';
  
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) return 'Home';
  
  return lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if path requires authentication
 */
export function requiresAuthentication(path: string): boolean {
  const protectedPaths = ['/dashboard', '/profile', '/admin'];
  return protectedPaths.some(protectedPath => path.startsWith(protectedPath));
}

/**
 * Check if path requires specific role
 */
export function requiresRole(path: string, requiredRole: UserRole): boolean {
  const roleBasedPaths: Record<string, UserRole[]> = {
    '/admin': ['admin'],
    '/expert-verification': ['expert', 'admin'],
  };
  
  for (const [pathPrefix, roles] of Object.entries(roleBasedPaths)) {
    if (path.startsWith(pathPrefix)) {
      return roles.includes(requiredRole);
    }
  }
  
  return true; // Allow access by default
}

/**
 * Get navigation menu items based on user role
 */
export function getNavigationMenuItems(user_role: UserRole) {
  const baseItems = [
    { label: 'Home', path: '/', icon: 'home' },
    { label: 'Bills', path: '/bills', icon: 'document' },
    { label: 'Community', path: '/community', icon: 'users' },
  ];
  
  if (user_role !== 'public') {
    baseItems.push({ label: 'Dashboard', path: '/dashboard', icon: 'dashboard' });
    baseItems.push({ label: 'Profile', path: '/profile', icon: 'user' });
  }
  
  if (user_role === 'expert' || user_role === 'admin') {
    baseItems.push({ label: 'Expert Verification', path: '/expert-verification', icon: 'shield' });
  }
  
  if (user_role === 'admin') {
    baseItems.push({ label: 'Admin', path: '/admin', icon: 'settings' });
  }
  
  return baseItems;
}

// ============================================================================
// ENHANCED VALIDATION UTILITIES (from utils/navigation.ts)
// ============================================================================

/**
 * Validates a single navigation item for required properties
 */
export function validateNavigationItem(item: NavigationItem): boolean {
  try {
    if (!item.id || typeof item.id !== 'string') {
      logger.warn('Navigation item missing or invalid id', { item });
      return false;
    }

    if (!item.label || typeof item.label !== 'string') {
      logger.warn('Navigation item missing or invalid label', { item });
      return false;
    }

    if (!item.href || typeof item.href !== 'string') {
      logger.warn('Navigation item missing or invalid href', { item });
      return false;
    }

    if (!item.section) {
      logger.warn('Navigation item missing section', { item });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error validating navigation item', { error, item });
    return false;
  }
}

/**
 * Validates and filters an array of navigation items
 */
export function validateNavigationItems(items: NavigationItem[]): NavigationItem[] {
  return items.filter(item => {
    const isValid = validateNavigationItem(item);
    if (!isValid) {
      logger.warn('Filtering out invalid navigation item', { item });
    }
    return isValid;
  });
}

// ============================================================================
// ENHANCED ACCESS CONTROL UTILITIES
// ============================================================================

/**
 * Checks if a user has access to a specific navigation item
 */
export function hasRouteAccess(
  item: NavigationItem,
  userRole?: UserRole,
  isAuthenticated: boolean = false,
  user?: unknown
): boolean {
  try {
    // Public routes are always accessible
    if (!item.requiresAuth && !item.adminOnly && !item.allowedRoles && !item.condition) {
      return true;
    }

    // Authentication required routes
    if (item.requiresAuth && !isAuthenticated) {
      return false;
    }

    // Admin-only routes
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }

    // Role-based access control
    if (item.allowedRoles && userRole && !item.allowedRoles.includes(userRole)) {
      return false;
    }

    // Custom condition evaluation
    if (item.condition && userRole) {
      try {
        return item.condition(userRole, user);
      } catch (error) {
        logger.warn('Error evaluating navigation item condition', {
          itemId: item.id,
          error
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error checking route access', { error, item, userRole });
    return false;
  }
}

/**
 * Filters navigation items based on user access permissions
 */
export function filterNavigationByAccess(
  items: NavigationItem[],
  userRole?: UserRole,
  isAuthenticated: boolean = false,
  user?: unknown
): NavigationItem[] {
  return items.filter(item => hasRouteAccess(item, userRole, isAuthenticated, user));
}

// ============================================================================
// ENHANCED SEARCH UTILITIES
// ============================================================================

/**
 * Searches navigation items with fuzzy matching
 */
export function searchNavigationItems(
  query: string,
  navigationItems: NavigationItem[],
  options: {
    maxResults?: number;
    includeDescription?: boolean;
    fuzzyMatch?: boolean;
  } = {}
): NavigationItem[] {
  const { maxResults = 10, includeDescription = true, fuzzyMatch = false } = options;

  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase().trim();
  const results: Array<{ item: NavigationItem; score: number }> = [];

  navigationItems.forEach(item => {
    let score = 0;
    const label = item.label.toLowerCase();
    const description = item.description?.toLowerCase() || '';

    // Exact label match gets highest score
    if (label === searchTerm) {
      score = 100;
    }
    // Label starts with query
    else if (label.startsWith(searchTerm)) {
      score = 80;
    }
    // Label contains query
    else if (label.includes(searchTerm)) {
      score = 60;
    }
    // Description contains query (if enabled)
    else if (includeDescription && description.includes(searchTerm)) {
      score = 40;
    }
    // Fuzzy match (if enabled)
    else if (fuzzyMatch && fuzzyMatchScore(searchTerm, label) > 0.6) {
      score = 20;
    }

    if (score > 0) {
      results.push({ item, score });
    }
  });

  // Sort by score and return items
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(result => result.item);
}

/**
 * Calculates fuzzy match score between two strings
 */
function fuzzyMatchScore(query: string, target: string): number {
  if (query.length === 0) return 1;
  if (target.length === 0) return 0;

  let queryIndex = 0;
  let targetIndex = 0;
  let matches = 0;

  while (queryIndex < query.length && targetIndex < target.length) {
    if (query[queryIndex] === target[targetIndex]) {
      matches++;
      queryIndex++;
    }
    targetIndex++;
  }

  return matches / query.length;
}

// ============================================================================
// ENHANCED LOOKUP UTILITIES
// ============================================================================

/**
 * Finds a navigation item by its path
 */
export function findNavigationItemByPath(
  path: string,
  navigationItems: NavigationItem[]
): NavigationItem | null {
  try {
    if (!path || typeof path !== 'string') {
      return null;
    }

    const item = navigationItems.find(item => item.href === path);
    return item || null;
  } catch (error) {
    logger.error('Error finding navigation item by path', { error, path });
    return null;
  }
}

/**
 * Finds a navigation item by its ID
 */
export function findNavigationItemById(
  id: string,
  navigationItems: NavigationItem[]
): NavigationItem | null {
  try {
    if (!id || typeof id !== 'string') {
      return null;
    }

    return navigationItems.find(item => item.id === id) || null;
  } catch (error) {
    logger.error('Error finding navigation item by ID', { error, id });
    return null;
  }
}

/**
 * Gets all navigation items for a specific section
 */
export function getNavigationItemsBySection(
  section: NavigationSection,
  navigationItems: NavigationItem[]
): NavigationItem[] {
  try {
    if (!section) {
      return [];
    }

    return navigationItems.filter(item => item.section === section);
  } catch (error) {
    logger.error('Error getting navigation items by section', { error, section });
    return [];
  }
}

// ============================================================================
// ANALYTICS AND PREFERENCES
// ============================================================================

/**
 * Tracks navigation events for analytics
 */
export function trackNavigationEvent(
  event: 'page_view' | 'navigation_click' | 'search' | 'command_palette',
  data: {
    path?: string;
    item?: NavigationItem;
    query?: string;
    source?: string;
  }
): void {
  try {
    logger.info('Navigation event', {
      event,
      ...data,
      timestamp: new Date().toISOString()
    });

    // Here you could integrate with analytics services
    // Example: analytics.track(event, data);
  } catch (error) {
    logger.error('Failed to track navigation event', { error, event, data });
  }
}

/**
 * Gets user navigation preferences from localStorage
 */
export function getNavigationPreferences(): {
  sidebarCollapsed: boolean;
  recentPages: string[];
  favoritePages: string[];
} {
  try {
    const stored = localStorage.getItem('navigation-preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.warn('Failed to load navigation preferences', { error });
  }

  // Default preferences
  return {
    sidebarCollapsed: false,
    recentPages: [],
    favoritePages: []
  };
}

/**
 * Saves user navigation preferences to localStorage
 */
export function saveNavigationPreferences(preferences: {
  sidebarCollapsed?: boolean;
  recentPages?: string[];
  favoritePages?: string[];
}): void {
  try {
    const current = getNavigationPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem('navigation-preferences', JSON.stringify(updated));
  } catch (error) {
    logger.error('Failed to save navigation preferences', { error, preferences });
  }
}

