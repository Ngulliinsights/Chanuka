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
export { NavigationPreferences, UserRole, BreadcrumbItem, RelatedPage } from '../core/navigation/types';

/**
 * @deprecated Use core/navigation/validation instead
 */
export const validateNavigation = {
  validateNavigationItem,
  validateNavigationItems,
  isValidNavigationPath
};

/**
 * @deprecated Use core/navigation/access-control instead
 */
export const accessControl = {
  hasRouteAccess,
  filterNavigationByAccess,
  requiresAuthentication,
  requiresRole
};

/**
 * @deprecated Use core/navigation/breadcrumbs instead
 */
export const breadcrumbUtils = {
  generateBreadcrumbs,
  findRelatedPages,
  calculateRelatedPages
};

/**
 * @deprecated Use core/navigation/search instead
 */
export const searchUtils = {
  searchNavigationItems,
  fuzzyMatchScore
};

/**
 * @deprecated Use core/navigation/analytics instead
 */
export const analyticsUtils = {
  trackNavigationEvent,
  getNavigationAnalytics,
  clearNavigationAnalytics
};

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