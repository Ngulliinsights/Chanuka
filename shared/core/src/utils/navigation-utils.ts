/**
 * Cross-cutting Navigation Utilities
 * Platform-agnostic utilities for navigation operations
 */

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
  const currentPathBase = currentPath.split('?')[0].split('#')[0];
  const pathBase = path.split('?')[0].split('#')[0];
  
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
  return lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate breadcrumbs from a path
 */
export function generateBreadcrumbs(path: string): Array<{label: string; path: string; isActive?: boolean}> {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'Home', path: '/', isActive: path === '/' }
  ];

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    breadcrumbs.push({
      label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      path: currentPath,
      isActive: isLast
    });
  });

  return breadcrumbs;
}