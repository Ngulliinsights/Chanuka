/**
 * Navigation Configuration
 */

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  href?: string; // Alias for path
  icon?: string;
  children?: NavigationItem[];
  requiresAuth?: boolean;
  roles?: string[];
  disabled?: boolean;
  badge?: string | number;
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: 'home'
  },
  {
    id: 'bills',
    label: 'Bills',
    path: '/bills',
    icon: 'file-text'
  },
  {
    id: 'community',
    label: 'Community',
    path: '/community',
    icon: 'users'
  },
  {
    id: 'search',
    label: 'Search',
    path: '/search',
    icon: 'search'
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: 'user',
    requiresAuth: true
  },
  {
    id: 'admin',
    label: 'Admin',
    path: '/admin',
    icon: 'settings',
    requiresAuth: true,
    roles: ['admin']
  }
];

export const getNavigationForUser = (userRole?: string): NavigationItem[] => {
  return navigationItems.filter(item => {
    if (item.requiresAuth && !userRole) return false;
    if (item.roles && !item.roles.includes(userRole || '')) return false;
    return true;
  });
};
