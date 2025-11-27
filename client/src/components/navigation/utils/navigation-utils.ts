import type { NavigationItem, UserRole } from '@client/types';
import { DEFAULT_NAVIGATION_MAP } from '@client/constants';
import { validateNavigationPath } from '@client/validation';
import { InvalidNavigationPathError } from '@client/errors';

/**
 * Finds a navigation item by its path
 */
export const findNavigationItemByPath = (path: string): NavigationItem | null => {
  try {
    // Validate the path format
    validateNavigationPath(path);

    const item = DEFAULT_NAVIGATION_MAP.find(item => item.href === path);
    return item || null;
  } catch (error) {
    // For validation errors, return null (invalid path)
    if (error instanceof InvalidNavigationPathError) {
      return null;
    }
    // Re-throw other errors
    throw error;
  }
};

/**
 * Finds a navigation item by its ID
 */
export const findNavigationItemById = (id: string): NavigationItem | null => {
  if (!id || typeof id !== 'string') {
    return null;
  }

  return DEFAULT_NAVIGATION_MAP.find(item => item.id === id) || null;
};

/**
 * Gets all navigation items for a specific section
 */
export const getNavigationItemsBySection = (section: NavigationItem['section']): NavigationItem[] => {
  if (!section) {
    return [];
  }

  return DEFAULT_NAVIGATION_MAP.filter(item => item.section === section);
};

/**
 * Gets navigation items accessible to a specific user role
 */
export const getAccessibleNavigationItems = (
  user_role: UserRole,
  user: any | null
): NavigationItem[] => {
  if (!user_role) {
    return [];
  }

  return DEFAULT_NAVIGATION_MAP.filter(item => {
    try {
      if (item.adminOnly && user_role !== 'admin') return false;
      if (item.requiresAuth && !user) return false;
      if (item.allowedRoles && !item.allowedRoles.includes(user_role)) return false;
      if (item.condition && !item.condition(user_role, user)) return false;
      return true;
    } catch (error) {
      // If there's an error in condition evaluation for this item, exclude it
      console.warn(`Error evaluating navigation item condition for ${item.id}:`, error);
      return false;
    }
  });
};

/**
 * Determines the current navigation section based on path
 */
export const determineCurrentSection = (path: string): NavigationItem['section'] => {
  try {
    const item = findNavigationItemByPath(path);
    return item?.section || 'legislative';
  } catch (error) {
    // If path validation fails, default to legislative
    return 'legislative';
  }
};

/**
 * Gets the page title for a given path
 */
export const getPageTitle = (path: string): string => {
  try {
    const item = findNavigationItemByPath(path);
    return item?.label || 'Page';
  } catch (error) {
    // If path validation fails, return default title
    return 'Page';
  }
};

/**
 * Checks if a path exists in the navigation
 */
export const isValidNavigationPath = (path: string): boolean => {
  try {
    return findNavigationItemByPath(path) !== null;
  } catch (error) {
    // If path validation fails, it's not valid
    return false;
  }
};

