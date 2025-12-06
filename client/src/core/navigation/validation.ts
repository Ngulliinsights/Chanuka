/**
 * Navigation Validation Module
 * 
 * Handles validation of navigation items and structures
 */

import { logger } from '../../utils/logger';

import { NavigationItem } from './types';

/**
 * Validates a single navigation item for required properties
 */
export function validateNavigationItem(item: NavigationItem): boolean {
  try {
    if (!item.id || typeof item.id !== 'string') {
      logger.warn('Navigation item missing or invalid id', { item });
      return false;
    }

    if (!item.label || typeof item.label !== 'string') {
      logger.warn('Navigation item missing or invalid label', { item });
      return false;
    }

    if (!item.href || typeof item.href !== 'string') {
      logger.warn('Navigation item missing or invalid href', { item });
      return false;
    }

    if (!item.icon) {
      logger.warn('Navigation item missing icon', { item });
      return false;
    }

    if (!item.section) {
      logger.warn('Navigation item missing section', { item });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error validating navigation item', { error, item });
    return false;
  }
}

/**
 * Validates and filters an array of navigation items
 */
export function validateNavigationItems(items: NavigationItem[]): NavigationItem[] {
  return items.filter(item => {
    const isValid = validateNavigationItem(item);
    if (!isValid) {
      logger.warn('Filtering out invalid navigation item', { item });
    }
    return isValid;
  });
}

/**
 * Checks if a path is valid for navigation
 */
export function isValidNavigationPath(
  path: string,
  navigationItems: NavigationItem[]
): boolean {
  try {
    if (!path || typeof path !== 'string') {
      return false;
    }

    return navigationItems.some(item => item.href === path);
  } catch (error) {
    logger.error('Error validating navigation path', { error, path });
    return false;
  }
}