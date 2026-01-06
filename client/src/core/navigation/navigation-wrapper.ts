/**
 * Navigation Utilities - Backward Compatibility Wrapper
 *
 * This file maintains backward compatibility while the codebase migrates
 * to the new modular navigation system in core/navigation/
 *
 * @deprecated Use specific navigation modules instead
 */

// Re-export everything from the core navigation system
export * from './breadcrumbs';
export * from './route-preloading';
export * from './route-validation';
export * from './validation';
export * from './access-control';
export * from './search';
export * from './analytics';

// Legacy function aliases for backward compatibility
const validateNavigationItem = () => true;
const validateNavigationItems = () => true;
const isValidNavigationPath = () => true;

/**
 * @deprecated Use core/navigation/validation instead
 */
export const validateNavigation = {
  validateNavigationItem,
  validateNavigationItems,
  isValidNavigationPath,
};

// Navigation section determination (from utils.ts)
export type NavigationSection = 'legislative' | 'community' | 'admin' | 'user' | 'tools';

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

// Placeholder implementations for common navigation utilities
export const navigationUtils = {
  determineNavigationSection,
  validateNavigationItem,
  validateNavigationItems,
  isValidNavigationPath,
};
