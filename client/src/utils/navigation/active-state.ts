/**
 * Centralized active state utility for consistent navigation highlighting
 * across all navigation components (desktop sidebar, mobile navigation, etc.)
 */

/**
 * Check if a navigation path is currently active
 * @param path - The navigation path to check
 * @param currentPath - The current route path
 * @returns boolean indicating if the path is active
 */
export function isNavigationPathActive(path: string, currentPath: string): boolean {
  // Exact match for home page
  if (path === '/') {
    return currentPath === '/';
  }
  
  // Handle exact matches for specific paths to prevent false positives
  const exactMatchPaths = [
    '/bills',
    '/search', 
    '/dashboard',
    '/profile',
    '/community',
    '/expert-verification',
    '/bill-sponsorship-analysis',
    '/bill-tracking',
    '/notifications',
    '/user-profile',
    '/database-manager',
    '/comments'
  ];
  
  if (exactMatchPaths.includes(path)) {
    return currentPath === path;
  }
  
  // Handle path prefixes for nested routes (but not for root)
  // Allow /admin to match /admin/users, etc.
  return currentPath.startsWith(path) && currentPath !== '/';
}

/**
 * Get consistent active state styling classes for navigation items
 * @param isActive - Whether the item is currently active
 * @param variant - The styling variant to use
 * @returns CSS classes string
 */
export function getActiveStateClasses(
  isActive: boolean, 
  variant: 'desktop' | 'mobile-drawer' | 'mobile-bottom' = 'desktop'
): string {
  const baseClasses = 'transition-all duration-200';
  
  if (isActive) {
    const activeClasses = 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm font-semibold';
    
    switch (variant) {
      case 'desktop':
        return `${baseClasses} ${activeClasses} scale-[1.02]`;
      case 'mobile-drawer':
        return `${baseClasses} ${activeClasses} scale-[1.02]`;
      case 'mobile-bottom':
        return `${baseClasses} ${activeClasses} scale-105`;
      default:
        return `${baseClasses} ${activeClasses}`;
    }
  }
  
  // Inactive state classes
  const inactiveClasses = 'text-gray-700 hover:bg-gray-50 hover:border hover:border-gray-200';
  
  switch (variant) {
    case 'desktop':
      return `${baseClasses} ${inactiveClasses} active:scale-[0.98]`;
    case 'mobile-drawer':
      return `${baseClasses} ${inactiveClasses} active:bg-gray-100 active:scale-[0.98] touch-manipulation`;
    case 'mobile-bottom':
      return `${baseClasses} text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border hover:border-gray-200 active:scale-95 touch-manipulation`;
    default:
      return `${baseClasses} ${inactiveClasses}`;
  }
}

/**
 * Get icon styling classes based on active state
 * @param isActive - Whether the item is currently active
 * @returns CSS classes string for icon styling
 */
export function getActiveIconClasses(isActive: boolean): string {
  const baseClasses = 'transition-transform duration-200';
  
  if (isActive) {
    return `${baseClasses} scale-110 text-blue-600`;
  }
  
  return baseClasses;
}

/**
 * Get text styling classes based on active state
 * @param isActive - Whether the item is currently active
 * @returns CSS classes string for text styling
 */
export function getActiveTextClasses(isActive: boolean): string {
  const baseClasses = 'transition-all duration-200';
  
  if (isActive) {
    return `${baseClasses} font-semibold`;
  }
  
  return `${baseClasses} font-medium`;
}

/**
 * Get role-specific styling for admin and expert items
 * @param isActive - Whether the item is currently active
 * @param isAdminOnly - Whether the item is admin-only
 * @param isExpertItem - Whether the item is expert-specific
 * @returns CSS classes string
 */
export function getRoleBasedActiveClasses(
  isActive: boolean,
  isAdminOnly: boolean = false,
  isExpertItem: boolean = false
): string {
  const baseClasses = 'transition-all duration-200 text-left group';
  
  if (isActive) {
    return `${baseClasses} bg-blue-50 text-blue-700 border border-blue-200 shadow-sm scale-[1.02] font-semibold`;
  }
  
  // Role-specific styling with consistent hover states
  if (isAdminOnly) {
    return `${baseClasses} text-red-700 hover:bg-red-50 hover:border hover:border-red-200 active:scale-[0.98]`;
  }
  
  if (isExpertItem) {
    return `${baseClasses} text-purple-700 hover:bg-purple-50 hover:border hover:border-purple-200 active:scale-[0.98]`;
  }
  
  return `${baseClasses} text-gray-700 hover:bg-gray-50 hover:border hover:border-gray-200 active:scale-[0.98]`;
}












































