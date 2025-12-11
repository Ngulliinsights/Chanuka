/**
 * Navigation Breadcrumbs Module
 * 
 * Handles breadcrumb generation and related page discovery
 */

import { NavigationItem, BreadcrumbItem, RelatedPage, UserRole } from './types';

/**
 * Generates breadcrumbs from a path and navigation items
 */
export function generateBreadcrumbs(
  path: string,
  navigationItems: NavigationItem[] = []
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];
  const pathSegments = path.split('/').filter(Boolean);

  // Always add home
  breadcrumbs.push({
    label: 'Home',
    path: '/',
    is_active: path === '/'
  });

  // Build breadcrumbs from path segments
  let currentPath = '';
  for (const segment of pathSegments) {
    currentPath += `/${segment}`;

    // Find matching navigation item
    const navItem = navigationItems.find(item => item.href === currentPath);

    if (navItem) {
      breadcrumbs.push({
        label: navItem.label,
        path: navItem.href,
        is_active: currentPath === path
      });
    } else {
      // Generate breadcrumb from segment
      breadcrumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
        path: currentPath,
        is_active: currentPath === path
      });
    }
  }

  return breadcrumbs;
}

/**
 * Finds related pages based on current page
 */
export function findRelatedPages(
  currentPath: string,
  navigationItems: NavigationItem[] = [],
  maxResults: number = 5
): RelatedPage[] {
  const currentItem = navigationItems.find(item => item.href === currentPath);
  if (!currentItem) return [];

  const related: RelatedPage[] = [];

  // Find pages with similar paths (same parent directory)
  const currentDir = currentPath.split('/').slice(0, -1).join('/');
  const siblingPages = navigationItems.filter(item =>
    item.href !== currentPath &&
    item.href.startsWith(currentDir) &&
    item.href.split('/').length === currentPath.split('/').length
  );

  // Add sibling pages
  siblingPages.slice(0, maxResults).forEach(item => {
    related.push({
      pageId: item.id,
      title: item.label,
      path: item.href,
      description: `Related to ${currentItem.label}`,
      category: item.section || 'legislative',
      type: 'sibling',
      weight: 1,
      relevanceScore: 0.8
    });
  });

  // If we need more results, add pages from the same category
  if (related.length < maxResults) {
    const categoryPages = navigationItems.filter(item =>
      item.href !== currentPath &&
      !siblingPages.includes(item) &&
      item.section === currentItem.section
    );

    categoryPages.slice(0, maxResults - related.length).forEach(item => {
      related.push({
        pageId: item.id,
        title: item.label,
        path: item.href,
        description: `More ${item.section || 'related'} content`,
        category: item.section || 'legislative',
        type: 'related',
        weight: 0.5,
        relevanceScore: 0.6
      });
    });
  }

  return related;
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