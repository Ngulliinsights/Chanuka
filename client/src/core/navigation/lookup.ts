/**
 * Navigation Lookup Module
 *
 * Handles navigation item lookup and path utilities
 */

import { logger } from '@client/shared/utils/logger';

import { NavigationItem, NavigationSection } from './types';

/**
 * Finds a navigation item by its path
 */
export function findNavigationItemByPath(
  path: string,
  navigationItems: NavigationItem[]
): NavigationItem | null {
  try {
    if (!path || typeof path !== 'string') {
      return null;
    }
    const item = navigationItems.find(item => item.href === path);
    return item || null;
  } catch (error) {
    logger.error('Error finding navigation item by path', { error, path });
    return null;
  }
}

/**
 * Finds a navigation item by its ID
 */
export function findNavigationItemById(
  id: string,
  navigationItems: NavigationItem[]
): NavigationItem | null {
  try {
    if (!id || typeof id !== 'string') {
      return null;
    }
    return navigationItems.find(item => item.id === id) || null;
  } catch (error) {
    logger.error('Error finding navigation item by ID', { error, id });
    return null;
  }
}

/**
 * Gets all navigation items for a specific section
 */
export function getNavigationItemsBySection(
  section: NavigationItem['section'],
  navigationItems: NavigationItem[]
): NavigationItem[] {
  try {
    if (!section) {
      return [];
    }
    return navigationItems.filter(item => item.section === section);
  } catch (error) {
    logger.error('Error getting navigation items by section', { error, section });
    return [];
  }
}

/**
 * Determines the current navigation section based on path
 */
export function determineCurrentSection(
  path: string,
  navigationItems: NavigationItem[]
): NavigationItem['section'] {
  try {
    const item = findNavigationItemByPath(path, navigationItems);
    return item?.section || 'legislative';
  } catch (error) {
    logger.error('Error determining current section', { error, path });
    return 'legislative';
  }
}

/**
 * Gets the page title for a given path
 */
export function getPageTitle(path: string, navigationItems: NavigationItem[]): string {
  try {
    const item = findNavigationItemByPath(path, navigationItems);
    return item?.label || 'Page';
  } catch (error) {
    logger.error('Error getting page title', { error, path });
    return 'Page';
  }
}

/**
 * Determines navigation section based on path
 */
export function determineNavigationSection(path: string): NavigationSection {
  if (path.startsWith('/bills') || path.startsWith('/legislation')) {
    return 'legislative';
  }
  if (path.startsWith('/community') || path.startsWith('/discussions')) {
    return 'community';
  }
  if (path.startsWith('/admin')) {
    return 'admin';
  }
  if (path.startsWith('/profile') || path.startsWith('/dashboard')) {
    return 'user';
  }
  if (path.startsWith('/tools') || path.startsWith('/analysis')) {
    return 'tools';
  }
  return 'legislative'; // Default
}

/**
 * Checks if a navigation path is currently active
 */
export function isNavigationPathActive(currentPath: string, targetPath: string): boolean {
  if (targetPath === '/') {
    return currentPath === '/';
  }
  return currentPath.startsWith(targetPath);
}

/**
 * Normalizes a path for consistent comparison
 */
export function normalizePath(path: string): string {
  if (!path) return '/';

  // Remove trailing slash except for root
  const normalized = path === '/' ? '/' : path.replace(/\/$/, '');

  // Ensure leading slash
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

/**
 * Extracts page title from path segments
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
