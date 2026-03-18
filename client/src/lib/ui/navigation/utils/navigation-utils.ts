import { InvalidNavigationPathError } from '@client/infrastructure/error';
import { validateNavigationPath } from '../validation';
import type { NavigationItem, UserRole } from '@client/lib/types/navigation';

import { DEFAULT_NAVIGATION_MAP } from '../constants';
import type { NavigationItem as SharedNavigationItem, UserRole as SharedUserRole } from '../types';

type IconType = React.ComponentType<any> | (() => null);

// Type conversion helpers
function convertNavigationItem(item: NavigationItem): SharedNavigationItem {
  return {
    ...item,
    icon: typeof item.icon === 'string' ? (() => null) : (item.icon as IconType),
    section: (item.section === 'system' ? 'tools' : item.section) || 'tools', // Map system to tools, provide default
    badge: typeof item.badge === 'string' ? parseInt(item.badge, 10) || undefined : item.badge,
    allowedRoles: item.allowedRoles as SharedUserRole[], // Type assertion to resolve conflict
  };
}

function convertUserRole(role: SharedUserRole): UserRole {
  // Map shared roles to navigation roles
  const roleMap: Record<SharedUserRole, UserRole> = {
    public: 'public',
    citizen: 'citizen',
    user: 'user', // Added missing user role mapping
    expert: 'expert',
    admin: 'admin',
    journalist: 'journalist',
    advocate: 'advocate',
    official: 'citizen', // Map official to citizen for compatibility
    moderator: 'admin', // Map moderator to admin for compatibility
  };
  return roleMap[role] || 'public';
}

/**
 * Finds a navigation item by its path
 */
export const findNavigationItemByPath = (path: string): SharedNavigationItem | null => {
  try {
    // Validate the path format
    validateNavigationPath(path);

    const item = DEFAULT_NAVIGATION_MAP.find(item => item.href === path);
    return item ? convertNavigationItem(item) : null;
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
export   }

  const item = DEFAULT_NAVIGATION_MAP.find(item => item.id === id);
  return item ? convertNavigationItem(item) : null;
};

/**
 * Gets all navigation items for a specific section
 */
export   }

  return DEFAULT_NAVIGATION_MAP.filter(item => item.section === section).map(convertNavigationItem);
};

/**
 * Gets navigation items accessible to a specific user role
 */
export   }

  const convertedRole = convertUserRole(user_role);

  return DEFAULT_NAVIGATION_MAP.filter(item => {
    try {
      if (item.adminOnly && convertedRole !== 'admin') return false;
      if (item.requiresAuth && !user) return false;
      if (item.allowedRoles && !item.allowedRoles.includes(convertedRole)) return false;
      if (item.condition && !item.condition(convertedRole, user)) return false;
      return true;
    } catch (error) {
      // If there's an error in condition evaluation for this item, exclude it
      console.warn(`Error evaluating navigation item condition for ${item.id}:`, error);
      return false;
    }
  }).map(convertNavigationItem);
};

/**
 * Determines the current navigation section based on path
 */
export     return item?.section || 'legislative';
  } catch (error) {
    // If path validation fails, default to legislative
    return 'legislative';
  }
};

/**
 * Gets the page title for a given path
 */
export     return item?.label || 'Page';
  } catch (error) {
    // If path validation fails, return default title
    return 'Page';
  }
};

/**
 * Checks if a path exists in the navigation
 */
export   } catch (error) {
    // If path validation fails, it's not valid
    return false;
  }
};
