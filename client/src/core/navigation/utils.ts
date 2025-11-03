/**
 * Navigation Utilities - Helper functions for navigation operations
 */

import { BreadcrumbItem, RelatedPage, NavigationSection, UserRole } from './types';

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

