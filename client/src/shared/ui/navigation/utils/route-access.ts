import { InvalidNavigationPathError } from '@/core/error';
import type { NavigationItem, UserRole } from '@/shared/types';
import { validateNavigationPath, validateUserRole } from '@/validation';

import { findNavigationItemByPath } from './navigation-utils';

/**
 * Reason why access to a route was denied
 */
export type AccessDenialReason =
  | 'unauthenticated'
  | 'admin_required'
  | 'insufficient_role'
  | 'custom_condition';

/**
 * User object interface
 */
interface User {
  id: string;
  role: UserRole;
  [key: string]: unknown;
}

/**
 * Result of a route access check
 */
interface RouteAccessResult {
  canAccess: boolean;
  denialReason: AccessDenialReason | null;
  requiredRole?: UserRole[];
}

/**
 * Extended navigation item with access control properties
 */
interface NavigationItemWithAccess extends NavigationItem {
  requiresAuth?: boolean;
  adminOnly?: boolean;
  allowedRoles?: UserRole[];
  condition?: (userRole: UserRole, user: User | null) => boolean;
}

/**
 * Checks if a user can access a specific route
 */
export const checkRouteAccess = (
  path: string,
  userRole: UserRole,
  user: User | null
): RouteAccessResult => {
  try {
    // Validate inputs
    validateNavigationPath(path);
    validateUserRole(userRole);

    const navigationItem = findNavigationItemByPath(path) as NavigationItemWithAccess | null;

    // Public routes (no navigation item) are always accessible
    if (!navigationItem) {
      return { canAccess: true, denialReason: null };
    }

    // Check authentication requirement
    if (navigationItem.requiresAuth && !user) {
      return {
        canAccess: false,
        denialReason: 'unauthenticated',
        requiredRole: navigationItem.allowedRoles,
      };
    }

    // Check admin requirement
    if (navigationItem.adminOnly && userRole !== 'admin') {
      return {
        canAccess: false,
        denialReason: 'admin_required',
        requiredRole: ['admin'],
      };
    }

    // Check role requirements
    if (navigationItem.allowedRoles && !navigationItem.allowedRoles.includes(userRole)) {
      return {
        canAccess: false,
        denialReason: 'insufficient_role',
        requiredRole: navigationItem.allowedRoles,
      };
    }

    // Check custom conditions
    if (navigationItem.condition && !navigationItem.condition(userRole, user)) {
      return {
        canAccess: false,
        denialReason: 'custom_condition',
        requiredRole: navigationItem.allowedRoles,
      };
    }

    return { canAccess: true, denialReason: null };
  } catch (error) {
    // Handle validation errors
    if (error instanceof InvalidNavigationPathError) {
      return { canAccess: false, denialReason: 'custom_condition' };
    }

    // For other errors, deny access and log
    console.error('Error checking route access:', error);
    return { canAccess: false, denialReason: 'custom_condition' };
  }
};

/**
 * Gets the access denial reason for a navigation item
 */
export const getAccessDenialReason = (
  item: NavigationItemWithAccess | null,
  userRole: UserRole,
  user: User | null
): AccessDenialReason | null => {
  if (!item) return null;

  try {
    if (item.requiresAuth && !user) return 'unauthenticated';
    if (item.adminOnly && userRole !== 'admin') return 'admin_required';
    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) return 'insufficient_role';
    if (item.condition && !item.condition(userRole, user)) return 'custom_condition';

    return null;
  } catch (error) {
    // If condition evaluation fails, deny access
    console.warn('Error evaluating access denial reason:', error);
    return 'custom_condition';
  }
};

/**
 * Determines if a user needs to upgrade their role to access a route
 */
export const getRequiredRoleForAccess = (
  path: string,
  currentRole: UserRole
): UserRole[] | null => {
  try {
    // Validate inputs
    validateNavigationPath(path);
    validateUserRole(currentRole);

    const item = findNavigationItemByPath(path) as NavigationItemWithAccess | null;
    if (!item?.allowedRoles) return null;

    // If current role is not in allowed roles, return required roles
    if (!item.allowedRoles.includes(currentRole)) {
      return item.allowedRoles;
    }

    return null;
  } catch (error) {
    // If validation fails, return null (no specific role requirements)
    return null;
  }
};
