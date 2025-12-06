/**
 * Navigation Configuration
 * 
 * Single source of truth for navigation structure and menu items.
 * Used across all navigation components to ensure consistency.
 * 
 * @module config/navigation
 */

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  badge?: number;
  disabled?: boolean;
  children?: NavigationItem[];
}

/**
 * Main navigation items
 * Used by desktop sidebar, mobile drawer, and bottom navigation
 */
export const MAIN_NAVIGATION: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: 'home',
  },
  {
    id: 'bills',
    label: 'Bills',
    href: '/bills',
    icon: 'document-text',
  },
  {
    id: 'tracking',
    label: 'Tracking',
    href: '/tracking',
    icon: 'bell',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'chart-bar',
  },
  {
    id: 'community',
    label: 'Community',
    href: '/community',
    icon: 'users',
  },
];

/**
 * Secondary navigation items (footer, settings, etc)
 */
export const SECONDARY_NAVIGATION: NavigationItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: 'cog',
  },
  {
    id: 'help',
    label: 'Help & Support',
    href: '/help',
    icon: 'question-mark',
  },
  {
    id: 'about',
    label: 'About',
    href: '/about',
    icon: 'information',
  },
];

/**
 * Get navigation items for a specific context
 */
export function getNavigationItems(context: 'mobile' | 'desktop' | 'all'): NavigationItem[] {
  if (context === 'all') {
    return [...MAIN_NAVIGATION];
  }
  
  // For mobile, you might want to subset navigation
  return MAIN_NAVIGATION;
}

/**
 * Mobile-specific bottom navigation items
 * Limited to 4-5 items for mobile UX
 */
export const MOBILE_BOTTOM_NAVIGATION: NavigationItem[] = [
  MAIN_NAVIGATION[0], // Home
  MAIN_NAVIGATION[1], // Bills
  MAIN_NAVIGATION[3], // Dashboard
  MAIN_NAVIGATION[4], // Community
];

/**
 * Find navigation item by id
 */
export function findNavigationItem(id: string): NavigationItem | undefined {
  const allItems = [...MAIN_NAVIGATION, ...SECONDARY_NAVIGATION];
  return allItems.find(item => item.id === id);
}

/**
 * Check if a route is in the main navigation
 */
export function isMainNavigationRoute(href: string): boolean {
  return MAIN_NAVIGATION.some(item => item.href === href);
}
