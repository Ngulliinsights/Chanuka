/**
 * Navigation core module - Modular navigation system
 * 
 * This module provides comprehensive navigation functionality including:
 * - Validation and access control
 * - Breadcrumb generation and related pages
 * - Search and fuzzy matching
 * - Analytics and event tracking
 * - User preferences and settings
 * - Path lookup and utilities
 */

// Core types and interfaces
export * from './types';

// Validation functionality
export * from './validation';

// Access control and permissions
export * from './access-control';

// Breadcrumbs and related pages
export * from './breadcrumbs';

// Search functionality
export * from './search';

// Analytics and tracking
export * from './analytics';

// User preferences
export {
  getNavigationPreferences,
  saveNavigationPreferences,
  addToRecentPages,
  addToFavorites,
  removeFromFavorites,
  isPageFavorite
} from './preferences';

// Lookup utilities
export * from './lookup';

// Legacy exports for backward compatibility (excluding utils to avoid duplicates)
export * from './context';
export * from './hooks';
export * from './persistence';

// Convenience re-exports for common use cases
export {
  validateNavigationItem,
  validateNavigationItems,
  isValidNavigationPath
} from './validation';

export {
  hasRouteAccess,
  filterNavigationByAccess,
  requiresAuthentication,
  requiresRole,
  getNavigationMenuItems
} from './access-control';

export {
  generateBreadcrumbs,
  findRelatedPages,
  calculateRelatedPages
} from './breadcrumbs';

export {
  searchNavigationItems,
  fuzzyMatchScore
} from './search';

export {
  trackNavigationEvent,
  getNavigationAnalytics,
  clearNavigationAnalytics
} from './analytics';

export {
  findNavigationItemByPath,
  findNavigationItemById,
  getNavigationItemsBySection,
  determineCurrentSection,
  getPageTitle,
  determineNavigationSection,
  isNavigationPathActive,
  normalizePath,
  extractPageTitle
} from './lookup';

