/**
 * Navigation Access Control Module
 *
 * Handles route access permissions and user authorization
 */

import { logger } from '@client/shared/utils/logger';

import { NavigationItem, UserRole } from '@client/shared/types/navigation';

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
          error,
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
