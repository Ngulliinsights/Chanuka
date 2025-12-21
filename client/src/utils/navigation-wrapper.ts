/**
 * Navigation Utilities - Backward Compatibility Wrapper
 * 
 * This file maintains backward compatibility while the codebase migrates
 * to the new modular navigation system in core/navigation/
 * 
 * @deprecated Use @client/core/navigation instead
 */

// Re-export everything from the new modular system
export * from '../core/navigation';

// Legacy function aliases for backward compatibility
export {
  validateNavigationItem,
  validateNavigationItems,
  hasRouteAccess,
  filterNavigationByAccess,
  generateBreadcrumbs,
  findRelatedPages,
  findNavigationItemByPath,
  findNavigationItemById,
  getNavigationItemsBySection,
  determineCurrentSection,
  getPageTitle,
  isValidNavigationPath,
  searchNavigationItems,
  fuzzyMatchScore,
  trackNavigationEvent,
  getNavigationPreferences,
  saveNavigationPreferences
} from '../core/navigation';

// Additional legacy exports that might be expected
export type { NavigationPreferences, UserRole, BreadcrumbItem, RelatedPage } from '../core/navigation/types';

// Placeholder implementations for deprecated functions
const validateNavigationItem = () => true;
const validateNavigationItems = () => true;
const isValidNavigationPath = () => true;

/**
 * @deprecated Use core/navigation/validation instead
 */
export const validateNavigation = {
  validateNavigationItem,
  validateNavigationItems,
  isValidNavigationPath
};

// Placeholder implementations for deprecated functions
const hasRouteAccess = () => true;
const filterNavigationByAccess = (items: Array<{ id: string; path: string; label: string }>) => items;
const requiresAuthentication = () => false;
const requiresRole = () => false;

/**
 * @deprecated Use core/navigation/access-control instead
 */
export const accessControl = {
  hasRouteAccess,
  filterNavigationByAccess,
  requiresAuthentication,
  requiresRole
};

// Placeholder implementations for deprecated functions
const generateBreadcrumbs = () => [];
const findRelatedPages = () => [];
const calculateRelatedPages = () => [];

/**
 * @deprecated Use core/navigation/breadcrumbs instead
 */
export const breadcrumbUtils = {
  generateBreadcrumbs,
  findRelatedPages,
  calculateRelatedPages
};

// Placeholder implementations for deprecated functions
const searchNavigationItems = () => [];
const fuzzyMatchScore = () => 0;

/**
 * @deprecated Use core/navigation/search instead
 */
export const searchUtils = {
  searchNavigationItems,
  fuzzyMatchScore
};

// Placeholder implementations for deprecated functions
const trackNavigationEvent = () => {};
const getNavigationAnalytics = () => ({});
const clearNavigationAnalytics = () => {};

/**
 * @deprecated Use core/navigation/analytics instead
 */
export const analyticsUtils = {
  trackNavigationEvent,
  getNavigationAnalytics,
  clearNavigationAnalytics
};

// Placeholder implementations for deprecated functions
const getNavigationPreferences = () => ({});
const saveNavigationPreferences = () => {};
const addToRecentPages = () => {};
const addToFavorites = () => {};
const removeFromFavorites = () => {};
const isPageFavorite = () => false;

/**
 * @deprecated Use core/navigation/preferences instead
 */
export const preferencesUtils = {
  getNavigationPreferences,
  saveNavigationPreferences,
  addToRecentPages,
  addToFavorites,
  removeFromFavorites,
  isPageFavorite
};

// Placeholder implementations for deprecated functions
const findNavigationItemByPath = () => null;
const findNavigationItemById = () => null;
const getNavigationItemsBySection = () => [];
const determineCurrentSection = () => '';
const getPageTitle = () => '';
const determineNavigationSection = () => '';
const isNavigationPathActive = () => false;
const normalizePath = (path: string) => path;
const extractPageTitle = () => '';

/**
 * @deprecated Use core/navigation/lookup instead
 */
export const lookupUtils = {
  findNavigationItemByPath,
  findNavigationItemById,
  getNavigationItemsBySection,
  determineCurrentSection,
  getPageTitle,
  determineNavigationSection,
  isNavigationPathActive,
  normalizePath,
  extractPageTitle
};